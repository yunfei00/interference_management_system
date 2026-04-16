from __future__ import annotations

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class Project(models.Model):
    STATUS_NOT_STARTED = "not_started"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_ON_HOLD = "on_hold"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = (
        (STATUS_NOT_STARTED, "Not Started"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_ON_HOLD, "On Hold"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
    )

    PRIORITY_LOW = "low"
    PRIORITY_MEDIUM = "medium"
    PRIORITY_HIGH = "high"
    PRIORITY_CRITICAL = "critical"
    PRIORITY_CHOICES = (
        (PRIORITY_LOW, "Low"),
        (PRIORITY_MEDIUM, "Medium"),
        (PRIORITY_HIGH, "High"),
        (PRIORITY_CRITICAL, "Critical"),
    )

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=32, unique=True, db_index=True, blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_NOT_STARTED,
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default=PRIORITY_MEDIUM,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_projects",
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="projects",
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    progress = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    tags = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="projects_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_archived = models.BooleanField(default=False)

    class Meta:
        ordering = ["-updated_at", "-id"]
        indexes = [
            models.Index(fields=["is_archived", "status"]),
            models.Index(fields=["priority", "updated_at"]),
            models.Index(fields=["owner", "updated_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.code} {self.name}".strip()

    @classmethod
    def generate_code(cls, *, current_date=None) -> str:
        current_date = current_date or timezone.localdate()
        prefix = f"PRJ-{current_date.strftime('%Y%m%d')}-"
        existing_codes = cls.objects.filter(code__startswith=prefix).values_list(
            "code", flat=True
        )
        max_sequence = 0
        for code in existing_codes:
            try:
                max_sequence = max(max_sequence, int(code.rsplit("-", 1)[-1]))
            except (TypeError, ValueError):
                continue
        return f"{prefix}{max_sequence + 1:03d}"

    @property
    def participant_ids(self) -> set[int]:
        ids = set(self.members.values_list("id", flat=True))
        if self.owner_id:
            ids.add(self.owner_id)
        return ids

    def save(self, *args, **kwargs):
        self.name = (self.name or "").strip()
        self.description = (self.description or "").strip()
        if not self.code:
            self.code = self.generate_code()
        if self.status not in {choice[0] for choice in self.STATUS_CHOICES}:
            self.status = self.STATUS_NOT_STARTED
        if self.priority not in {choice[0] for choice in self.PRIORITY_CHOICES}:
            self.priority = self.PRIORITY_MEDIUM
        if self.tags is None:
            self.tags = []
        super().save(*args, **kwargs)


class Milestone(models.Model):
    STATUS_PENDING = "pending"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_DELAYED = "delayed"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_DELAYED, "Delayed"),
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="milestones",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "due_date", "id"]
        indexes = [models.Index(fields=["project", "status", "sort_order"])]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        self.name = (self.name or "").strip()
        self.description = (self.description or "").strip()
        super().save(*args, **kwargs)


class Task(models.Model):
    STATUS_TODO = "todo"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_BLOCKED = "blocked"
    STATUS_DONE = "done"
    STATUS_CHOICES = (
        (STATUS_TODO, "Todo"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_BLOCKED, "Blocked"),
        (STATUS_DONE, "Done"),
    )
    KANBAN_STATUS_ORDER = (
        STATUS_TODO,
        STATUS_IN_PROGRESS,
        STATUS_BLOCKED,
        STATUS_DONE,
    )

    PRIORITY_LOW = "low"
    PRIORITY_MEDIUM = "medium"
    PRIORITY_HIGH = "high"
    PRIORITY_URGENT = "urgent"
    PRIORITY_CHOICES = (
        (PRIORITY_LOW, "Low"),
        (PRIORITY_MEDIUM, "Medium"),
        (PRIORITY_HIGH, "High"),
        (PRIORITY_URGENT, "Urgent"),
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_TODO,
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default=PRIORITY_MEDIUM,
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_project_tasks",
    )
    collaborators = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="collaborated_project_tasks",
    )
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    estimated_hours = models.DecimalField(
        max_digits=6,
        decimal_places=1,
        null=True,
        blank=True,
    )
    actual_hours = models.DecimalField(
        max_digits=6,
        decimal_places=1,
        null=True,
        blank=True,
    )
    progress = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    parent_task = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="child_tasks",
    )
    milestone = models.ForeignKey(
        Milestone,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tasks",
    )
    order_index = models.PositiveIntegerField(default=0)
    is_deleted = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_project_tasks",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "order_index", "-updated_at", "-id"]
        indexes = [
            models.Index(fields=["project", "status", "order_index"]),
            models.Index(fields=["project", "assignee", "due_date"]),
            models.Index(fields=["project", "is_deleted", "updated_at"]),
        ]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        self.title = (self.title or "").strip()
        self.description = (self.description or "").strip()
        if self.status not in {choice[0] for choice in self.STATUS_CHOICES}:
            self.status = self.STATUS_TODO
        if self.priority not in {choice[0] for choice in self.PRIORITY_CHOICES}:
            self.priority = self.PRIORITY_MEDIUM
        if self.status == self.STATUS_DONE and self.progress < 100:
            self.progress = 100
        super().save(*args, **kwargs)


class SubTask(models.Model):
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="subtasks",
    )
    title = models.CharField(max_length=200)
    is_done = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]
        indexes = [models.Index(fields=["task", "sort_order"])]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        self.title = (self.title or "").strip()
        super().save(*args, **kwargs)


class TaskDependency(models.Model):
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="dependencies",
    )
    depends_on = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="dependent_tasks",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["task", "depends_on"],
                name="uniq_task_dependency_pair",
            )
        ]

    def clean(self):
        if self.task_id and self.task_id == self.depends_on_id:
            raise ValueError("A task cannot depend on itself.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


def attachment_upload_to(instance: "ProjectAttachment", filename: str) -> str:
    return f"projects/attachments/{timezone.now().strftime('%Y/%m')}/{filename}"


class ProjectAttachment(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    task = models.ForeignKey(
        Task,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="attachments",
    )
    file = models.FileField(upload_to=attachment_upload_to)
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="uploaded_project_attachments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["project", "task", "created_at"])]

    def __str__(self) -> str:
        return self.file_name


class ProjectActivityLog(models.Model):
    ACTION_PROJECT_CREATED = "project_created"
    ACTION_PROJECT_UPDATED = "project_updated"
    ACTION_PROJECT_DELETED = "project_deleted"
    ACTION_MEMBER_ADDED = "member_added"
    ACTION_MEMBER_REMOVED = "member_removed"
    ACTION_TASK_CREATED = "task_created"
    ACTION_TASK_UPDATED = "task_updated"
    ACTION_TASK_DELETED = "task_deleted"
    ACTION_TASK_STATUS_CHANGED = "task_status_changed"
    ACTION_TASK_MOVED = "task_moved"
    ACTION_MILESTONE_CREATED = "milestone_created"
    ACTION_MILESTONE_UPDATED = "milestone_updated"
    ACTION_MILESTONE_DELETED = "milestone_deleted"
    ACTION_ATTACHMENT_UPLOADED = "attachment_uploaded"
    ACTION_ATTACHMENT_DELETED = "attachment_deleted"
    ACTION_CHOICES = (
        (ACTION_PROJECT_CREATED, "Project Created"),
        (ACTION_PROJECT_UPDATED, "Project Updated"),
        (ACTION_PROJECT_DELETED, "Project Deleted"),
        (ACTION_MEMBER_ADDED, "Member Added"),
        (ACTION_MEMBER_REMOVED, "Member Removed"),
        (ACTION_TASK_CREATED, "Task Created"),
        (ACTION_TASK_UPDATED, "Task Updated"),
        (ACTION_TASK_DELETED, "Task Deleted"),
        (ACTION_TASK_STATUS_CHANGED, "Task Status Changed"),
        (ACTION_TASK_MOVED, "Task Moved"),
        (ACTION_MILESTONE_CREATED, "Milestone Created"),
        (ACTION_MILESTONE_UPDATED, "Milestone Updated"),
        (ACTION_MILESTONE_DELETED, "Milestone Deleted"),
        (ACTION_ATTACHMENT_UPLOADED, "Attachment Uploaded"),
        (ACTION_ATTACHMENT_DELETED, "Attachment Deleted"),
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="activity_logs",
    )
    task = models.ForeignKey(
        Task,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="activity_logs",
    )
    operator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="project_activity_logs",
    )
    action_type = models.CharField(max_length=50, choices=ACTION_CHOICES)
    message = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["project", "created_at"])]

    def __str__(self) -> str:
        return self.message

