from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.crypto import get_random_string


class Tool(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_TESTING = "testing"
    STATUS_DEPRECATED = "deprecated"
    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_TESTING, "Testing"),
        (STATUS_DEPRECATED, "Deprecated"),
    )

    name = models.CharField(max_length=200)
    code = models.SlugField(max_length=100, unique=True)
    category = models.CharField(max_length=100)
    department = models.CharField(max_length=100, default="电磁 / 干扰")
    summary = models.TextField(blank=True)
    detail = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )
    tags = models.CharField(max_length=200, blank=True, default="")
    latest_version = models.CharField(max_length=50, blank=True, default="")
    icon = models.CharField(max_length=500, blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="tools_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def __str__(self) -> str:
        return self.name

    @property
    def tag_list(self) -> list[str]:
        return [part.strip() for part in self.tags.split(",") if part.strip()]


class ToolVersion(models.Model):
    tool = models.ForeignKey(
        Tool,
        on_delete=models.CASCADE,
        related_name="versions",
    )
    version = models.CharField(max_length=50)
    release_notes = models.TextField(blank=True, default="")
    changelog = models.TextField(blank=True, default="")
    file = models.FileField(
        upload_to="tools/versions/%Y/%m/",
        blank=True,
        null=True,
    )
    file_name = models.CharField(max_length=255, blank=True, default="")
    file_size = models.BigIntegerField(default=0)
    checksum = models.CharField(max_length=128, blank=True, default="")
    is_latest = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="tool_versions_created",
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["tool", "version"],
                name="uniq_tool_version_per_tool",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.tool.name} {self.version}"


class ToolUploadSession(models.Model):
    STATUS_WAITING = "waiting"
    STATUS_UPLOADING = "uploading"
    STATUS_MERGING = "merging"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = (
        (STATUS_WAITING, "Waiting"),
        (STATUS_UPLOADING, "Uploading"),
        (STATUS_MERGING, "Merging"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
    )
    TARGET_TOOL_CREATE = "tool_create"
    TARGET_TOOL_VERSION = "tool_version"
    TARGET_CHOICES = (
        (TARGET_TOOL_CREATE, "Tool Create"),
        (TARGET_TOOL_VERSION, "Tool Version"),
    )

    upload_id = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tool_upload_sessions",
    )
    tool = models.ForeignKey(
        Tool,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="upload_sessions",
    )
    target = models.CharField(max_length=32, choices=TARGET_CHOICES, default=TARGET_TOOL_CREATE)
    filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)
    chunk_size = models.IntegerField(default=5 * 1024 * 1024)
    total_chunks = models.IntegerField(default=1)
    uploaded_chunks = models.JSONField(default=list, blank=True)
    uploaded_chunks_count = models.IntegerField(default=0)
    checksum = models.CharField(max_length=128, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_WAITING)
    temp_dir = models.CharField(max_length=500, blank=True, default="")
    merged_file_path = models.CharField(max_length=500, blank=True, default="")
    error_message = models.TextField(blank=True, default="")
    consumed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def __str__(self) -> str:
        return f"{self.upload_id} ({self.status})"

    @staticmethod
    def generate_upload_id() -> str:
        return f"upl_{timezone.now().strftime('%Y%m%d%H%M%S')}_{get_random_string(16)}"
