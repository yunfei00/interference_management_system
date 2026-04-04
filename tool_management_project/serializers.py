from __future__ import annotations

from django.db import transaction
from rest_framework import serializers

from .models import Tool, ToolVersion
from .services import sync_tool_latest


def normalize_tags(raw_value) -> str:
    if raw_value in (None, ""):
        return ""

    if isinstance(raw_value, (list, tuple)):
        parts = [str(item).strip() for item in raw_value if str(item).strip()]
    else:
        parts = [item.strip() for item in str(raw_value).split(",") if item.strip()]

    unique_parts: list[str] = []
    for part in parts:
        if part not in unique_parts:
            unique_parts.append(part)

    normalized = ", ".join(unique_parts)
    return normalized[:200]


class ToolVersionSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
        allow_null=True,
    )
    download_path = serializers.SerializerMethodField()
    file = serializers.FileField(read_only=True, required=False, allow_null=True)

    class Meta:
        model = ToolVersion
        fields = [
            "id",
            "version",
            "release_notes",
            "changelog",
            "file_name",
            "file_size",
            "checksum",
            "is_latest",
            "created_at",
            "created_by",
            "created_by_username",
            "download_path",
            "file",
        ]
        read_only_fields = fields

    def get_download_path(self, obj: ToolVersion) -> str:
        return f"/api/v1/tools/{obj.tool_id}/versions/{obj.id}/download/"


class ToolListSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
        allow_null=True,
    )
    versions_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tool
        fields = [
            "id",
            "name",
            "code",
            "category",
            "department",
            "summary",
            "detail",
            "status",
            "tags",
            "latest_version",
            "icon",
            "created_by_username",
            "created_at",
            "updated_at",
            "versions_count",
        ]


class ToolDetailSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
        allow_null=True,
    )
    versions = ToolVersionSerializer(many=True, read_only=True)
    versions_count = serializers.SerializerMethodField()

    class Meta:
        model = Tool
        fields = [
            "id",
            "name",
            "code",
            "category",
            "department",
            "summary",
            "detail",
            "status",
            "tags",
            "latest_version",
            "icon",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
            "versions",
            "versions_count",
        ]

    def get_versions_count(self, obj: Tool) -> int:
        return obj.versions.count()


class ToolUpdateSerializer(serializers.ModelSerializer):
    tags = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Tool
        fields = [
            "name",
            "code",
            "category",
            "department",
            "summary",
            "detail",
            "status",
            "icon",
            "tags",
        ]

    def validate_code(self, value: str) -> str:
        queryset = Tool.objects.exclude(pk=self.instance.pk if self.instance else None)
        if queryset.filter(code=value).exists():
            raise serializers.ValidationError("Tool code already exists.")
        return value

    def validate_tags(self, value: str) -> str:
        return normalize_tags(value)


class ToolCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    code = serializers.SlugField(max_length=100)
    category = serializers.CharField(max_length=100)
    department = serializers.CharField(max_length=100, required=False, allow_blank=True)
    summary = serializers.CharField(required=False, allow_blank=True, default="")
    detail = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.ChoiceField(choices=Tool.STATUS_CHOICES, default=Tool.STATUS_ACTIVE)
    tags = serializers.CharField(required=False, allow_blank=True, default="")
    icon = serializers.CharField(required=False, allow_blank=True, default="")
    initial_version = serializers.CharField(max_length=50)
    release_notes = serializers.CharField(required=False, allow_blank=True, default="")
    changelog = serializers.CharField(required=False, allow_blank=True, default="")
    file = serializers.FileField(required=False, allow_null=True)
    file_name = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_code(self, value: str) -> str:
        if Tool.objects.filter(code=value).exists():
            raise serializers.ValidationError("Tool code already exists.")
        return value

    def validate(self, attrs: dict) -> dict:
        raw = getattr(self, "initial_data", {}) or {}

        if not attrs.get("department"):
            attrs["department"] = (
                str(raw.get("owner_department") or "").strip() or "电磁 / 干扰"
            )

        if not attrs.get("detail"):
            attrs["detail"] = str(raw.get("description") or "").strip()

        if not attrs.get("summary"):
            attrs["summary"] = attrs["detail"][:200]

        attrs["tags"] = normalize_tags(raw.get("tags_input") or attrs.get("tags"))
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        file_obj = validated_data.pop("file", None)
        file_name_hint = validated_data.pop("file_name", "") or ""
        initial_version = validated_data.pop("initial_version")
        release_notes = validated_data.pop("release_notes", "")
        changelog = validated_data.pop("changelog", "")

        with transaction.atomic():
            tool = Tool.objects.create(created_by=user, **validated_data)

            file_size = 0
            file_name = file_name_hint
            if file_obj is not None:
                file_name = file_name or getattr(file_obj, "name", "") or "upload.bin"
                try:
                    file_size = file_obj.size
                except (OSError, AttributeError):
                    file_size = 0

            ToolVersion.objects.create(
                tool=tool,
                version=initial_version,
                release_notes=release_notes or f"{initial_version} initial release",
                changelog=changelog or f"- {initial_version} initial release",
                file=file_obj,
                file_name=file_name,
                file_size=file_size,
                created_by=user,
            )
            sync_tool_latest(tool.id)
        return tool


class ToolVersionCreateSerializer(serializers.ModelSerializer):
    file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = ToolVersion
        fields = ["version", "release_notes", "changelog", "file", "file_name", "checksum"]

    def validate_version(self, value: str) -> str:
        tool: Tool = self.context["tool"]
        if tool.versions.filter(version=value).exists():
            raise serializers.ValidationError("Version already exists.")
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        tool: Tool = self.context["tool"]
        file_obj = validated_data.get("file")
        file_name = validated_data.pop("file_name", "") or ""
        file_size = 0

        if file_obj is not None:
            file_name = file_name or getattr(file_obj, "name", "") or "upload.bin"
            try:
                file_size = file_obj.size
            except (OSError, AttributeError):
                file_size = 0

        row = ToolVersion.objects.create(
            tool=tool,
            created_by=user,
            file_size=file_size,
            file_name=file_name,
            **validated_data,
        )
        sync_tool_latest(tool.id)
        return row
