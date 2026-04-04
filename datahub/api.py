from __future__ import annotations

from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework.exceptions import ValidationError

from apps.common.api import BaselineModelViewSet
from apps.common.permissions import MappedPermission

from .selectors import get_dataset_queryset, get_measurement_queryset
from .serializers import (
    DataFileSerializer,
    DatasetDetailSerializer,
    DatasetSerializer,
    MeasurementSerializer,
)
from .services import ingest_uploaded_file
from .utils import heatmap_svg_from_queryset


@extend_schema(tags=["Datahub"])
class DatasetViewSet(BaselineModelViewSet):
    serializer_class = DatasetSerializer
    permission_classes = [IsAuthenticated, MappedPermission]
    permission_map = {
        "list": ["department.interference.view", "interference.datahub.view"],
        "retrieve": ["department.interference.view", "interference.datahub.view"],
        "measurements": ["department.interference.view", "interference.datahub.view"],
        "heatmap": ["department.interference.view", "interference.datahub.view"],
        "create": [
            "department.interference.view",
            "interference.datahub.view",
            "datahub.create",
        ],
        "update": [
            "department.interference.view",
            "interference.datahub.view",
            "datahub.create",
        ],
        "partial_update": [
            "department.interference.view",
            "interference.datahub.view",
            "datahub.create",
        ],
        "destroy": [
            "department.interference.view",
            "interference.datahub.view",
            "datahub.create",
        ],
        "upload": [
            "department.interference.view",
            "interference.datahub.view",
            "datahub.upload",
        ],
    }

    def get_queryset(self):
        return get_dataset_queryset(self.request.user)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DatasetDetailSerializer
        return DatasetSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["get"])
    def measurements(self, request, pk=None):
        dataset = self.get_object()
        queryset = get_measurement_queryset(dataset)
        page = self.paginate_queryset(queryset)
        serializer = MeasurementSerializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return self.success_response(data=serializer.data)

    @action(
        detail=True,
        methods=["post"],
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload(self, request, pk=None):
        dataset = self.get_object()
        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            raise ValidationError({"file": ["请先选择待上传的数据文件。"]})

        data_file, inserted = ingest_uploaded_file(dataset, uploaded_file)
        return self.success_response(
            data={
                "file": DataFileSerializer(data_file).data,
                "inserted": inserted,
            },
            code="uploaded",
            message="数据文件导入成功。",
            status_code=201,
        )

    @action(detail=True, methods=["get"])
    def heatmap(self, request, pk=None):
        dataset = self.get_object()
        svg = heatmap_svg_from_queryset(get_measurement_queryset(dataset))
        return HttpResponse(svg, content_type="image/svg+xml")
