from __future__ import annotations

from django.db.models import Q

from .models import CommandTask, Host


def get_host_queryset(*, q: str = "", online: str = ""):
    queryset = Host.objects.all().order_by("name")
    if q:
        queryset = queryset.filter(Q(name__icontains=q) | Q(ip__icontains=q))
    if online in {"0", "1"}:
        queryset = queryset.filter(is_online=bool(int(online)))
    return queryset


def get_command_task_queryset():
    return CommandTask.objects.select_related("host").all()
