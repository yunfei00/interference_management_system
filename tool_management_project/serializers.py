from __future__ import annotations

from pathlib import Path

from rest_framework import serializers

from .models import Tool


class ToolSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(
        source="uploaded_by.username",
        read_only=True,
    )
    filename = serializers.SerializerMethodField()
    download_path = serializers.SerializerMethodField()

    class Meta:
        model = Tool
        fields = [
            "id",
            "name",
            "version",
            "description",
            "file",
            "filename",
            "download_path",
            "uploaded_by",
            "uploaded_by_username",
            "uploaded_at",
        ]
        read_only_fields = [
            "uploaded_by",
            "uploaded_by_username",
            "uploaded_at",
            "filename",
            "download_path",
        ]

    def get_filename(self, obj):
        return Path(obj.file.name).name

    def get_download_path(self, obj):
        return f"/api/v1/tools/{obj.id}/download/"
