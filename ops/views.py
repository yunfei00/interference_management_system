from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.http import require_POST
from django.http import JsonResponse, HttpResponseBadRequest
from django.db.models import Q
from .models import Host, HostMetric, CommandTask
from .forms import HostForm
from .services import call_control

@login_required
def host_list(request):
    q = request.GET.get("q", "").strip()
    online = request.GET.get("online", "")
    qs = Host.objects.all()
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(ip__icontains=q))
    if online in ("0", "1"):
        qs = qs.filter(is_online=bool(int(online)))
    qs = qs.order_by("name")
    # 预取最近一条指标
    hosts = list(qs)
    last_metrics = {}
    for h in hosts:
        lm = HostMetric.objects.filter(host=h).order_by("-ts").first()
        last_metrics[h.id] = lm
    return render(request, "ops/hosts/list.html", {"hosts": hosts, "last_metrics": last_metrics, "q": q, "online": online})

@login_required
def host_create(request):
    if request.method == "POST":
        form = HostForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect("ops:host_list")
    else:
        form = HostForm()
    return render(request, "ops/hosts/form.html", {"form": form, "title": "新增主机"})

@login_required
def host_edit(request, pk):
    obj = get_object_or_404(Host, pk=pk)
    if request.method == "POST":
        form = HostForm(request.POST, instance=obj)
        if form.is_valid():
            form.save()
            return redirect("ops:host_list")
    else:
        form = HostForm(instance=obj)
    return render(request, "ops/hosts/form.html", {"form": form, "title": f"编辑主机：{obj.name}"})

@login_required
def command_list(request):
    qs = CommandTask.objects.select_related("host").all()
    return render(request, "ops/commands/list.html", {"tasks": qs})

@login_required
@require_POST
def command_single(request, pk):
    host = get_object_or_404(Host, pk=pk)
    cmd = request.POST.get("command")
    service_name = request.POST.get("service_name")
    if not cmd:
        return HttpResponseBadRequest("missing command")
    task = CommandTask.objects.create(host=host, command=cmd, payload={"service_name": service_name or ""},
                                      status="RUNNING", operator=str(request.user))
    try:
        res = call_control(host, cmd, service_name=service_name or None)
        task.status = "SUCCESS"
        task.result = str(res)
    except Exception as e:
        task.status = "FAILED"
        task.result = str(e)
    finally:
        from django.utils import timezone
        task.finished_at = timezone.now()
        task.save()
    return redirect("ops:command_list")

@login_required
@require_POST
def command_batch(request):
    ids = request.POST.getlist("host_ids[]") or request.POST.getlist("host_ids")
    cmd = request.POST.get("command")
    service_name = request.POST.get("service_name") or None
    if not ids or not cmd:
        return HttpResponseBadRequest("missing params")
    # 创建任务并串行执行（可改为 Celery 异步）
    created = []
    for pk in ids:
        try:
            host = Host.objects.get(pk=pk)
        except Host.DoesNotExist:
            continue
        task = CommandTask.objects.create(host=host, command=cmd, payload={"service_name": service_name or ""},
                                          status="RUNNING", operator=str(request.user))
        try:
            res = call_control(host, cmd, service_name=service_name)
            task.status = "SUCCESS"; task.result = str(res)
        except Exception as e:
            task.status = "FAILED"; task.result = str(e)
        from django.utils import timezone
        task.finished_at = timezone.now(); task.save()
        created.append(task.id)
    return JsonResponse({"ok": True, "task_ids": created})
