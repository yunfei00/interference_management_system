from __future__ import annotations

from django.db.models import Count, Prefetch

from .models import Tool, ToolVersion


def get_tool_list_queryset():
    return (
        Tool.objects.select_related("created_by")
        .annotate(versions_count=Count("versions", distinct=True))
        .order_by("-updated_at", "-id")
    )


def get_tool_detail_queryset():
    ver_qs = ToolVersion.objects.select_related("created_by").order_by(
        "-created_at",
        "-id",
    )
    return Tool.objects.select_related("created_by").prefetch_related(
        Prefetch("versions", queryset=ver_qs),
    )


def get_tool_queryset():
    """兼容旧名：列表用 queryset。"""
    return get_tool_list_queryset()
