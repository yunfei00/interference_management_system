from __future__ import annotations


def save_tool_upload(serializer, uploaded_by):
    return serializer.save(uploaded_by=uploaded_by)
