from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.api import BaselineAPIView, BaselineGenericViewSet, BaselineModelViewSet
from apps.common.api_contract import build_api_envelope
from apps.common.permissions import StaffPermission

from .models import Host
from .selectors import get_command_task_queryset, get_host_queryset
from .serializers import CommandTaskSerializer, HostSerializer
from .services import execute_batch_command, execute_command_for_host


@extend_schema(tags=["Ops"])
class HostViewSet(BaselineModelViewSet):
    serializer_class = HostSerializer
    permission_classes = [IsAuthenticated, StaffPermission]

    def get_queryset(self):
        return get_host_queryset(
            q=self.request.GET.get("q", "").strip(),
            online=self.request.GET.get("online", "").strip(),
        )

    @action(detail=True, methods=["post"], url_path="commands")
    def run_command(self, request, pk=None):
        host = self.get_object()
        command = request.data.get("command")
        service_name = request.data.get("service_name") or None
        if not command:
            raise ValidationError({"command": ["请选择要执行的命令。"]})

        task = execute_command_for_host(
            host,
            command=command,
            operator=request.user,
            service_name=service_name,
        )
        return self.success_response(
            data=CommandTaskSerializer(task).data,
            code="command_sent",
            message="命令已经提交执行。",
            status_code=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Ops"])
class CommandTaskViewSet(BaselineGenericViewSet, viewsets.ReadOnlyModelViewSet):
    serializer_class = CommandTaskSerializer
    permission_classes = [IsAuthenticated, StaffPermission]

    def get_queryset(self):
        return get_command_task_queryset()


class BatchCommandAPIView(BaselineAPIView):
    permission_classes = [IsAuthenticated, StaffPermission]

    @extend_schema(tags=["Ops"])
    def post(self, request):
        host_ids = request.data.get("host_ids") or []
        command = request.data.get("command")
        service_name = request.data.get("service_name") or None
        if not host_ids:
            raise ValidationError({"host_ids": ["请先选择要操作的主机。"]})
        if not command:
            raise ValidationError({"command": ["请选择要执行的命令。"]})

        hosts = list(Host.objects.filter(pk__in=host_ids))
        tasks = execute_batch_command(
            hosts,
            command=command,
            operator=request.user,
            service_name=service_name,
        )
        return Response(
            build_api_envelope(
                data={
                    "items": CommandTaskSerializer(tasks, many=True).data,
                    "task_ids": [task.id for task in tasks],
                },
                code="command_sent",
                message="批量命令已经提交执行。",
            ),
            status=status.HTTP_201_CREATED,
        )
