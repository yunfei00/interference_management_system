from django.shortcuts import render

# Create your views here.
# datahub/views.py
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import json

from .forms import DatasetForm, UploadForm
from .models import Dataset, DataFile, Measurement
from .utils import parse_file_to_rows, rows_to_measurements, heatmap_svg_from_queryset

@login_required
def dataset_list(request):
    q = Dataset.objects.all().order_by('-id')
    if not request.user.is_staff:
        q = q.filter(owner=request.user)
    return render(request, 'datahub/dataset_list.html', {'datasets': q})

@login_required
def dataset_create(request):
    if request.method == 'POST':
        form = DatasetForm(request.POST)
        if form.is_valid():
            ds = form.save(commit=False)
            ds.owner = request.user
            ds.save()
            return redirect('datahub:dataset_detail', pk=ds.id)
    else:
        form = DatasetForm()
    return render(request, 'datahub/upload.html', {'form': form, 'mode': 'create'})

@login_required
def upload_file(request):
    if request.method == 'POST':
        form = UploadForm(request.POST, request.FILES)
        if form.is_valid():
            dataset = form.cleaned_data['dataset']
            f = form.cleaned_data['file']
            df = DataFile.objects.create(
                dataset=dataset, file=f, original_name=f.name
            )
            # 解析并入库
            count = rows_to_measurements(dataset, parse_file_to_rows(df.file.file, df.original_name))
            return redirect('datahub:dataset_detail', pk=dataset.id)
    else:
        form = UploadForm()
        if not request.user.is_staff:
            form.fields['dataset'].queryset = Dataset.objects.filter(owner=request.user)
    return render(request, 'datahub/upload.html', {'form': form, 'mode': 'upload'})

@login_required
def dataset_detail(request, pk):
    ds = get_object_or_404(Dataset, pk=pk)
    if (not request.user.is_staff) and ds.owner_id != request.user.id:
        return HttpResponse('无权限', status=403)
    measurements = Measurement.objects.filter(dataset=ds)[:2000]  # 首屏限制
    return render(request, 'datahub/dataset_detail.html', {'dataset': ds, 'measurements': measurements})

@login_required
def heatmap_svg(request, pk):
    ds = get_object_or_404(Dataset, pk=pk)
    if (not request.user.is_staff) and ds.owner_id != request.user.id:
        return HttpResponse('无权限', status=403)
    svg = heatmap_svg_from_queryset(Measurement.objects.filter(dataset=ds))
    return HttpResponse(svg, content_type='image/svg+xml')

# —— 设备/工具 直接上传 JSON 到数据库（MVP：简单 API Key）——
@csrf_exempt
def api_ingest(request):
    if request.method != 'POST':
        return HttpResponseBadRequest('POST only')

    api_key = request.headers.get('X-API-Key')
    if api_key != settings.INGEST_API_KEY:
        return HttpResponse('认证失败', status=401)

    try:
        payload = json.loads(request.body.decode('utf-8'))
        dataset_id = payload['dataset_id']
        rows = payload['rows']           # list of {x, y, value, device_id?, timestamp?}
    except Exception as e:
        return HttpResponseBadRequest(f'格式错误: {e}')

    ds = get_object_or_404(Dataset, pk=dataset_id)
    count = rows_to_measurements(ds, rows)
    return JsonResponse({'ok': True, 'inserted': count})
