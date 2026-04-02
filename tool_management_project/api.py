from __future__ import annotations

from pathlib import Path

from django.http import FileResponse
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from apps.common.api import BaselineModelViewSet
from apps.common.permissions import ApprovedUserPermission

from .selectors import get_tool_queryset
from .serializers import ToolSerializer
from .services import save_tool_upload


@extend_schema(tags=["Tools"])
class ToolViewSet(BaselineModelViewSet):
    serializer_class = ToolSerializer
    permission_classes = [IsAuthenticated, ApprovedUserPermission]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return get_tool_queryset()

    def perform_create(self, serializer):
        save_tool_upload(serializer, self.request.user)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        tool = self.get_object()
        response = FileResponse(
            tool.file.open("rb"),
            as_attachment=True,
            filename=Path(tool.file.name).name,
        )
        return response
