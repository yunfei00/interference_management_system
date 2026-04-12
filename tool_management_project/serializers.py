from __future__ import annotations

from django.db import transaction
from rest_framework import serializers

from .models import Tool, ToolUploadSession, ToolVersion
from .services import (
    bind_upload_to_tool_version,
    build_upload_progress,
    create_tool_version_from_upload,
    sync_tool_latest,
)


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
    upload_id = serializers.CharField(required=False, allow_blank=True, default="")

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
        upload_id = (validated_data.pop("upload_id", "") or "").strip()
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

            version = ToolVersion.objects.create(
                tool=tool,
                version=initial_version,
                release_notes=release_notes or f"{initial_version} initial release",
                changelog=changelog or f"- {initial_version} initial release",
                file=file_obj,
                file_name=file_name,
                file_size=file_size,
                created_by=user,
            )
            if upload_id:
                upload = ToolUploadSession.objects.filter(
                    upload_id=upload_id,
                    user=user,
                    consumed_at__isnull=True,
                ).first()
                if upload is None:
                    raise serializers.ValidationError({"upload_id": "Upload session is invalid."})
                try:
                    bind_upload_to_tool_version(upload=upload, version=version)
                except ValueError as exc:
                    raise serializers.ValidationError({"upload_id": str(exc)}) from exc
            sync_tool_latest(tool.id)
            tool.refresh_from_db()
        return tool


class ToolVersionCreateSerializer(serializers.ModelSerializer):
    file = serializers.FileField(required=False, allow_null=True)
    upload_id = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model = ToolVersion
        fields = [
            "version",
            "release_notes",
            "changelog",
            "file",
            "file_name",
            "checksum",
            "upload_id",
        ]

    def validate_version(self, value: str) -> str:
        tool: Tool = self.context["tool"]
        if tool.versions.filter(version=value).exists():
            raise serializers.ValidationError("Version already exists.")
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        tool: Tool = self.context["tool"]
        file_obj = validated_data.get("file")
        upload_id = (validated_data.pop("upload_id", "") or "").strip()
        file_name = validated_data.pop("file_name", "") or ""
        file_size = 0

        if file_obj is not None:
            file_name = file_name or getattr(file_obj, "name", "") or "upload.bin"
            try:
                file_size = file_obj.size
            except (OSError, AttributeError):
                file_size = 0

        with transaction.atomic():
            row = ToolVersion.objects.create(
                tool=tool,
                created_by=user,
                file_size=file_size,
                file_name=file_name,
                **validated_data,
            )
            if upload_id:
                upload = ToolUploadSession.objects.filter(
                    upload_id=upload_id,
                    user=user,
                    consumed_at__isnull=True,
                ).first()
                if upload is None:
                    raise serializers.ValidationError({"upload_id": "Upload session is invalid."})
                try:
                    bind_upload_to_tool_version(upload=upload, version=row)
                except ValueError as exc:
                    raise serializers.ValidationError({"upload_id": str(exc)}) from exc
            sync_tool_latest(tool.id)
            row.refresh_from_db()
        return row


class ToolVersionBindUploadSerializer(serializers.Serializer):
    upload_id = serializers.CharField(max_length=64)
    version = serializers.CharField(max_length=50)
    release_notes = serializers.CharField(required=False, allow_blank=True, default="")
    changelog = serializers.CharField(required=False, allow_blank=True, default="")

    def save(self, **kwargs):
        user = self.context["request"].user
        tool: Tool = self.context["tool"]
        try:
            row, created = create_tool_version_from_upload(
                tool=tool,
                user=user,
                upload_id=(self.validated_data["upload_id"] or "").strip(),
                version=(self.validated_data["version"] or "").strip(),
                release_notes=self.validated_data.get("release_notes", ""),
                changelog=self.validated_data.get("changelog", ""),
            )
        except ValueError as exc:
            message = str(exc)
            if "Version already exists" in message:
                raise serializers.ValidationError({"version": message}) from exc
            raise serializers.ValidationError({"upload_id": message}) from exc
        self.was_created = created
        row.refresh_from_db()
        return row


class ToolUploadInitSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=255)
    file_size = serializers.IntegerField(min_value=1)
    chunk_size = serializers.IntegerField(min_value=256 * 1024, max_value=20 * 1024 * 1024)
    total_chunks = serializers.IntegerField(min_value=1)
    checksum = serializers.CharField(required=False, allow_blank=True, max_length=128, default="")
    target = serializers.ChoiceField(choices=ToolUploadSession.TARGET_CHOICES)
    tool_id = serializers.IntegerField(required=False)

    def validate(self, attrs: dict) -> dict:
        if (
            attrs.get("target") == ToolUploadSession.TARGET_TOOL_VERSION
            and not attrs.get("tool_id")
        ):
            raise serializers.ValidationError({"tool_id": "tool_id is required for tool_version."})
        return attrs


class ToolUploadSessionSerializer(serializers.ModelSerializer):
    uploaded_chunks = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    missing_chunks = serializers.SerializerMethodField()

    class Meta:
        model = ToolUploadSession
        fields = [
            "upload_id",
            "status",
            "filename",
            "file_size",
            "chunk_size",
            "total_chunks",
            "uploaded_chunks_count",
            "uploaded_chunks",
            "missing_chunks",
            "progress",
            "error_message",
            "merged_file_path",
            "created_at",
            "updated_at",
            "completed_at",
        ]

    def get_uploaded_chunks(self, obj: ToolUploadSession):
        return build_upload_progress(obj)["uploaded_chunks"]

    def get_progress(self, obj: ToolUploadSession):
        return build_upload_progress(obj)["progress"]

    def get_missing_chunks(self, obj: ToolUploadSession):
        return build_upload_progress(obj)["missing_chunks"]
