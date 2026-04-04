
from django.http import FileResponse
from django.shortcuts import redirect, render

from rest_framework import viewsets

from .models import Tool
from .serializers import ToolListSerializer as ToolSerializer


def upload_tool(request):
    return redirect("/dashboard/electromagnetic/interference/tools/upload")

def tool_list(request):
    tools = Tool.objects.all()
    return render(request, 'tool_list.html', {'tools': tools})

def download_tool(request, tool_id):
    tool = Tool.objects.get(id=tool_id)
    ver = tool.versions.order_by("-created_at", "-id").first()
    if ver is None or not ver.file:
        from django.http import Http404

        raise Http404("无可下载版本")
    response = FileResponse(ver.file.open("rb"))
    response["Content-Disposition"] = f"attachment; filename={ver.file_name or ver.file.name}"
    return response

class ToolViewSet(viewsets.ModelViewSet):
    queryset = Tool.objects.all()
    serializer_class = ToolSerializer
