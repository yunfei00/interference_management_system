from __future__ import annotations

import logging
from datetime import timedelta
from pathlib import Path

from django.db.models import Max
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.api import BaselineGenericViewSet, BaselineModelViewSet
from apps.common.api_contract import build_api_envelope
from apps.common.permissions import MappedPermission

from .models import Tool, ToolUploadSession, ToolVersion
from .selectors import get_tool_detail_queryset, get_tool_list_queryset
from .serializers import (
    ToolCreateSerializer,
    ToolDetailSerializer,
    ToolUploadInitSerializer,
    ToolUploadSessionSerializer,
    ToolListSerializer,
    ToolUpdateSerializer,
    ToolVersionBindUploadSerializer,
    ToolVersionCreateSerializer,
    ToolVersionSerializer,
)
from .services import (
    build_upload_progress,
    create_upload_session,
    merge_upload_chunks,
    save_upload_chunk,
    sync_tool_latest,
)

logger = logging.getLogger(__name__)


def delete_version_file(version: ToolVersion) -> None:
    if version.file:
        version.file.delete(save=False)


@extend_schema(tags=["Tools"])
class ToolViewSet(BaselineModelViewSet):
    permission_classes = [IsAuthenticated, MappedPermission]
    permission_map = {
        "get": ["department.interference.view", "interference.tools.view"],
        "post": [
            "department.interference.view",
            "interference.tools.view",
            "tools.manage",
        ],
        "list": ["department.interference.view", "interference.tools.view"],
        "retrieve": ["department.interference.view", "interference.tools.view"],
        "download": ["department.interference.view", "interference.tools.view"],
        "version_download": ["department.interference.view", "interference.tools.view"],
        "create": [
            "department.interference.view",
            "interference.tools.view",
            "tools.manage",
        ],
        "update": [
            "department.interference.view",
            "interference.tools.view",
            "tools.manage",
        ],
        "partial_update": [
            "department.interference.view",
            "interference.tools.view",
            "tools.manage",
        ],
        "destroy": [
            "department.interference.view",
            "interference.tools.view",
            "tools.manage",
        ],
        "delete_version": [
            "department.interference.view",
            "interference.tools.view",
            "tools.manage",
        ],
        "set_version_latest": [
            "department.interference.view",
            "interference.tools.view",
            "tools.manage",
        ],
        "bind_upload": [
            "department.interference.view",
            "interference.tools.view",
            "tools.manage",
        ],
        "upload_init": [
            "department.interference.view",
            "interference.tools.view",
            "tools.manage",
        ],
        "upload_chunk": [
            "department.interference.view",
            "interference.tools.view",
            "tools.manage",
        ],
        "upload_status": [
            "department.interference.view",
            "interference.tools.view",
            "tools.manage",
        ],
        "upload_merge": [
            "department.interference.view",
            "interference.tools.view",
            "tools.manage",
        ],
    }
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        if self.action == "retrieve":
            return get_tool_detail_queryset()
        return get_tool_list_queryset()

    def get_serializer_class(self):
        if self.action == "list":
            return ToolListSerializer
        if self.action == "retrieve":
            return ToolDetailSerializer
        if self.action in ("update", "partial_update"):
            return ToolUpdateSerializer
        if self.action == "create":
            return ToolCreateSerializer
        return ToolListSerializer

    def create(self, request, *args, **kwargs):
        serializer = ToolCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        tool = serializer.save()
        data = ToolDetailSerializer(tool, context={"request": request}).data
        return Response(
            build_api_envelope(
                data=data,
                code="created",
                message="Tool created successfully.",
            ),
            status=status.HTTP_201_CREATED,
        )

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        for version in instance.versions.all():
            delete_version_file(version)
        instance.delete()

    @extend_schema(tags=["Tools"])
    @action(
        detail=True,
        methods=["get", "post"],
        url_path="versions",
        parser_classes=[MultiPartParser, FormParser],
    )
    def add_version(self, request, pk=None):
        tool = self.get_object()
        if request.method.lower() == "get":
            versions = tool.versions.order_by("-created_at", "-id")
            return self.success_response(
                data=ToolVersionSerializer(
                    versions,
                    many=True,
                    context={"request": request},
                ).data
            )

        logger.info(
            "tool version add request tool_id=%s bind_content_type=%s",
            tool.id,
            request.content_type,
        )
        serializer = ToolVersionCreateSerializer(
            data=request.data,
            context={"request": request, "tool": tool},
        )
        serializer.is_valid(raise_exception=True)
        row = serializer.save()
        return self.success_response(
            data=ToolVersionSerializer(row, context={"request": request}).data,
            code="created",
            message="Version created successfully.",
            status_code=status.HTTP_201_CREATED,
        )

    @extend_schema(tags=["Tools"])
    @action(
        detail=True,
        methods=["post"],
        url_path="versions/bind-upload",
        parser_classes=[JSONParser],
    )
    def bind_upload(self, request, pk=None):
        tool = self.get_object()
        serializer = ToolVersionBindUploadSerializer(
            data=request.data,
            context={"request": request, "tool": tool},
        )
        serializer.is_valid(raise_exception=True)
        upload_id = serializer.validated_data.get("upload_id", "")
        logger.info(
            "tool version bind request tool_id=%s upload_id=%s bind_content_type=%s",
            tool.id,
            upload_id,
            request.content_type,
        )
        row = serializer.save()
        upload = ToolUploadSession.objects.filter(
            upload_id=upload_id,
            user=request.user,
        ).first()
        progress = build_upload_progress(upload) if upload else None
        logger.info(
            "tool version bind finished tool_id=%s upload_id=%s total_chunks=%s confirmed_chunk_count=%s missing_chunks=%s bind_content_type=%s",
            tool.id,
            upload_id,
            progress["total_chunks"] if progress else None,
            progress["uploaded_chunks_count"] if progress else None,
            progress["missing_chunks"] if progress else None,
            request.content_type,
        )
        created = getattr(serializer, "was_created", True)
        return self.success_response(
            data=ToolVersionSerializer(row, context={"request": request}).data,
            code="created" if created else "ok",
            message=(
                "Version created successfully."
                if created
                else "Upload already bound to this version."
            ),
            status_code=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @extend_schema(tags=["Tools"])
    @action(detail=True, methods=["post"], url_path=r"versions/(?P<version_id>\d+)/set_latest")
    def set_version_latest(self, request, pk=None, version_id=None):
        tool = self.get_object()
        version = get_object_or_404(tool.versions, pk=version_id)
        max_created_at = tool.versions.aggregate(max_created_at=Max("created_at"))[
            "max_created_at"
        ]
        base_created_at = max_created_at or version.created_at
        version.created_at = base_created_at + timedelta(microseconds=1)
        version.save(update_fields=["created_at"])
        sync_tool_latest(tool.id)
        version.refresh_from_db()
        return self.success_response(
            data=ToolVersionSerializer(version, context={"request": request}).data,
            code="updated",
            message="Version promoted successfully.",
        )

    @extend_schema(tags=["Tools"])
    @action(detail=True, methods=["delete"], url_path=r"versions/(?P<version_id>\d+)")
    def delete_version(self, request, pk=None, version_id=None):
        tool = self.get_object()
        version = get_object_or_404(tool.versions, pk=version_id)
        delete_version_file(version)
        version.delete()
        sync_tool_latest(tool.id)
        return self.success_response(code="deleted", message="Version deleted successfully.")

    @extend_schema(tags=["Tools"])
    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        tool = self.get_object()
        version = tool.versions.order_by("-created_at", "-id").first()
        if version is None or not version.file:
            return self.success_response(
                data=None,
                code="not_found",
                message="No downloadable file was found for this tool.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return FileResponse(
            version.file.open("rb"),
            as_attachment=True,
            filename=version.file_name or Path(version.file.name).name,
        )

    @extend_schema(tags=["Tools"])
    @action(
        detail=True,
        methods=["get"],
        url_path=r"versions/(?P<version_id>\d+)/download",
    )
    def version_download(self, request, pk=None, version_id=None):
        tool = self.get_object()
        version = get_object_or_404(tool.versions, pk=version_id)
        if not version.file:
            return self.success_response(
                data=None,
                code="not_found",
                message="No downloadable file was found for this version.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return FileResponse(
            version.file.open("rb"),
            as_attachment=True,
            filename=version.file_name or Path(version.file.name).name,
        )

    @extend_schema(tags=["Tools"])
    @action(detail=False, methods=["post"], url_path="uploads/init", parser_classes=[JSONParser])
    def upload_init(self, request):
        serializer = ToolUploadInitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        tool = None
        if data["target"] == ToolUploadSession.TARGET_TOOL_VERSION:
            tool = get_object_or_404(Tool.objects.all(), pk=data.get("tool_id"))

        upload = create_upload_session(
            user=request.user,
            filename=data["filename"],
            file_size=data["file_size"],
            chunk_size=data["chunk_size"],
            total_chunks=data["total_chunks"],
            checksum=data.get("checksum") or "",
            target=data["target"],
            tool=tool,
        )
        return self.success_response(
            data={
                **ToolUploadSessionSerializer(upload).data,
                "uploaded_chunks": [],
                "recommended_chunk_size": upload.chunk_size,
            },
            code="created",
            message="Upload session created successfully.",
            status_code=status.HTTP_201_CREATED,
        )

    def _get_upload(self, request, upload_id: str) -> ToolUploadSession:
        return get_object_or_404(
            ToolUploadSession.objects.select_related("tool"),
            upload_id=upload_id,
            user=request.user,
        )

    @extend_schema(tags=["Tools"])
    @action(
        detail=False,
        methods=["post"],
        url_path=r"uploads/(?P<upload_id>[^/.]+)/chunks/(?P<chunk_index>\d+)",
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_chunk(self, request, upload_id=None, chunk_index=None):
        upload = self._get_upload(request, upload_id)
        chunk_file = request.FILES.get("chunk")
        if chunk_file is None:
            return self.success_response(
                code="invalid_chunk",
                message="Chunk file is required.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        try:
            upload = save_upload_chunk(upload, int(chunk_index), chunk_file)
        except ValueError as exc:
            return self.success_response(
                data=None,
                code="invalid_chunk",
                message=str(exc),
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        upload.refresh_from_db()
        progress = build_upload_progress(upload)
        logger.info(
            "tool upload chunk response upload_id=%s chunk_index=%s total_chunks=%s confirmed_chunk_count=%s missing_chunks=%s complete_called=%s",
            upload.upload_id,
            int(chunk_index),
            progress["total_chunks"],
            progress["uploaded_chunks_count"],
            progress["missing_chunks"],
            False,
        )
        return self.success_response(data=progress, message="Chunk uploaded.")

    @extend_schema(tags=["Tools"])
    @action(
        detail=False,
        methods=["get"],
        url_path=r"uploads/(?P<upload_id>[^/.]+)/status",
    )
    def upload_status(self, request, upload_id=None):
        upload = self._get_upload(request, upload_id)
        return self.success_response(data=build_upload_progress(upload))

    @extend_schema(tags=["Tools"])
    @action(
        detail=False,
        methods=["post"],
        url_path=r"uploads/(?P<upload_id>[^/.]+)/merge",
    )
    def upload_merge(self, request, upload_id=None):
        upload = self._get_upload(request, upload_id)
        before_progress = build_upload_progress(upload)
        logger.info(
            "tool upload merge request upload_id=%s total_chunks=%s confirmed_chunk_count=%s missing_chunks=%s complete_called=%s",
            upload.upload_id,
            before_progress["total_chunks"],
            before_progress["uploaded_chunks_count"],
            before_progress["missing_chunks"],
            True,
        )
        try:
            merge_upload_chunks(upload)
        except ValueError as exc:
            upload.refresh_from_db()
            failed_progress = build_upload_progress(upload)
            logger.warning(
                "tool upload merge failed upload_id=%s total_chunks=%s confirmed_chunk_count=%s missing_chunks=%s complete_called=%s",
                upload.upload_id,
                failed_progress["total_chunks"],
                failed_progress["uploaded_chunks_count"],
                failed_progress["missing_chunks"],
                True,
            )
            return self.success_response(
                data=failed_progress,
                code="merge_failed",
                message=str(exc),
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        upload.refresh_from_db()
        progress = build_upload_progress(upload)
        logger.info(
            "tool upload merge response upload_id=%s total_chunks=%s confirmed_chunk_count=%s missing_chunks=%s complete_called=%s",
            upload.upload_id,
            progress["total_chunks"],
            progress["uploaded_chunks_count"],
            progress["missing_chunks"],
            True,
        )
        return self.success_response(
            data=progress,
            code="merged",
            message="Upload merged successfully.",
        )


@extend_schema(tags=["Tools"])
class ToolVersionViewSet(BaselineGenericViewSet):
    permission_classes = [IsAuthenticated, MappedPermission]
    permission_map = {
        "destroy": [
            "department.interference.view",
            "interference.tools.view",
            "tools.manage",
        ],
        "set_current": [
            "department.interference.view",
            "interference.tools.view",
            "tools.manage",
        ],
    }
    queryset = ToolVersion.objects.select_related("tool", "created_by").all()
    serializer_class = ToolVersionSerializer
    http_method_names = ["delete", "post", "head", "options"]

    def perform_destroy(self, instance):
        tool_id = instance.tool_id
        delete_version_file(instance)
        instance.delete()
        sync_tool_latest(tool_id)

    @extend_schema(tags=["Tools"])
    @action(detail=True, methods=["post"], url_path="set_current")
    def set_current(self, request, pk=None):
        version = self.get_object()
        tool = version.tool
        max_created_at = tool.versions.aggregate(max_created_at=Max("created_at"))[
            "max_created_at"
        ]
        base_created_at = max_created_at or version.created_at
        version.created_at = base_created_at + timedelta(microseconds=1)
        version.save(update_fields=["created_at"])
        sync_tool_latest(tool.id)
        version.refresh_from_db()
        return self.success_response(
            data=ToolVersionSerializer(version, context={"request": request}).data,
            code="updated",
            message="Version promoted successfully.",
        )
