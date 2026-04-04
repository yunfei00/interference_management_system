from __future__ import annotations

from django.utils import timezone

from .models import Tool, ToolVersion


def sync_tool_latest(tool_id: int) -> None:
    """根据版本记录重算 is_latest 与 Tool.latest_version。"""
    qs = ToolVersion.objects.filter(tool_id=tool_id).order_by("-created_at", "-id")
    latest = qs.first()
    ToolVersion.objects.filter(tool_id=tool_id).update(is_latest=False)
    if latest is None:
        Tool.objects.filter(pk=tool_id).update(latest_version="", updated_at=timezone.now())
        return
    ToolVersion.objects.filter(pk=latest.pk).update(is_latest=True)
    Tool.objects.filter(pk=tool_id).update(
        latest_version=latest.version,
        updated_at=timezone.now(),
    )
