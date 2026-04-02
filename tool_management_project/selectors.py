from __future__ import annotations

from .models import Tool


def get_tool_queryset():
    return Tool.objects.select_related("uploaded_by").order_by("-uploaded_at")
