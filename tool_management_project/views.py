
from django.shortcuts import render, redirect
from django.http import FileResponse
from .models import Tool
from .forms import ToolForm
from rest_framework import viewsets
from .serializers import ToolSerializer

def upload_tool(request):
    if request.method == "POST":
        form = ToolForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect('tool_list')
    else:
        form = ToolForm()
    return render(request, 'upload_tool.html', {'form': form})

def tool_list(request):
    tools = Tool.objects.all()
    return render(request, 'tool_list.html', {'tools': tools})

def download_tool(request, tool_id):
    tool = Tool.objects.get(id=tool_id)
    file_path = tool.file.path
    response = FileResponse(open(file_path, 'rb'))
    response['Content-Disposition'] = f'attachment; filename={tool.name}'
    return response

class ToolViewSet(viewsets.ModelViewSet):
    queryset = Tool.objects.all()
    serializer_class = ToolSerializer
