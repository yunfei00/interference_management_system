from __future__ import annotations

from rest_framework import serializers

from accounts.models import User

from .models import (
    Milestone,
    Project,
    ProjectActivityLog,
    ProjectAttachment,
    SubTask,
    Task,
    TaskDependency,
)
from .permissions import can_delete_task, can_manage_project, can_manage_task
from .selectors import approved_user_queryset


class UserBriefSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    department_full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "display_name",
            "email",
            "department_full_name",
            "role",
        ]

    def get_department_full_name(self, obj: User) -> str | None:
        return obj.department.full_name if obj.department else None


class ProjectMemberOptionSerializer(UserBriefSerializer):
    pass


class ProjectListSerializer(serializers.ModelSerializer):
    owner = UserBriefSerializer(read_only=True)
    members = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    task_total = serializers.IntegerField(read_only=True)
    task_done = serializers.IntegerField(read_only=True)
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "code",
            "description",
            "status",
            "priority",
            "owner",
            "members",
            "member_count",
            "task_total",
            "task_done",
            "start_date",
            "end_date",
            "progress",
            "tags",
            "updated_at",
            "created_at",
            "is_archived",
            "can_edit",
        ]

    def get_members(self, obj: Project):
        rows = list(obj.members.all()[:5])
        return UserBriefSerializer(rows, many=True).data

    def get_member_count(self, obj: Project) -> int:
        base_count = getattr(obj, "member_count", None)
        if base_count is None:
            base_count = obj.members.count()
        return base_count + (1 if obj.owner_id else 0)

    def get_can_edit(self, obj: Project) -> bool:
        request = self.context.get("request")
        return bool(request and can_manage_project(request.user, obj))


class ProjectDetailSerializer(ProjectListSerializer):
    created_by = UserBriefSerializer(read_only=True)

    class Meta(ProjectListSerializer.Meta):
        fields = ProjectListSerializer.Meta.fields + ["created_by"]

    def get_members(self, obj: Project):
        return UserBriefSerializer(obj.members.all(), many=True).data


class ProjectWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=Project.STATUS_CHOICES,
        required=False,
        default=Project.STATUS_NOT_STARTED,
    )
    priority = serializers.ChoiceField(
        choices=Project.PRIORITY_CHOICES,
        required=False,
        default=Project.PRIORITY_MEDIUM,
    )
    owner = serializers.PrimaryKeyRelatedField(
        queryset=approved_user_queryset(),
        required=False,
        allow_null=True,
    )
    members = serializers.PrimaryKeyRelatedField(
        queryset=approved_user_queryset(),
        many=True,
        required=False,
    )
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True,
    )

    def validate_name(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Project name is required.")
        return cleaned

    def validate(self, attrs: dict) -> dict:
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": ["End date cannot be earlier than start date."]})
        attrs["owner"] = attrs.get("owner") or self.context["request"].user
        return attrs


class ProjectMemberUpdateSerializer(serializers.Serializer):
    user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )

    def validate_user_ids(self, value: list[int]) -> list[int]:
        unique_ids = sorted(set(value))
        if not unique_ids:
            raise serializers.ValidationError("At least one user is required.")
        users = list(approved_user_queryset().filter(id__in=unique_ids))
        if len(users) != len(unique_ids):
            raise serializers.ValidationError("Some selected users are invalid.")
        self._validated_users = users
        return unique_ids

    @property
    def validated_users(self) -> list[User]:
        return getattr(self, "_validated_users", [])


class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = [
            "id",
            "project",
            "name",
            "description",
            "due_date",
            "status",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "project", "created_at", "updated_at"]


class MilestoneWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=Milestone.STATUS_CHOICES,
        required=False,
        default=Milestone.STATUS_PENDING,
    )
    sort_order = serializers.IntegerField(required=False, min_value=0, default=0)

    def validate_name(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Milestone name is required.")
        return cleaned


class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTask
        fields = ["id", "title", "is_done", "sort_order", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class SubTaskWriteSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False, min_value=1)
    title = serializers.CharField(max_length=200)
    is_done = serializers.BooleanField(required=False, default=False)
    sort_order = serializers.IntegerField(required=False, min_value=0)

    def validate_title(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Subtask title is required.")
        return cleaned


class TaskBriefSerializer(serializers.ModelSerializer):
    assignee = UserBriefSerializer(read_only=True)
    milestone_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "status",
            "priority",
            "assignee",
            "progress",
            "due_date",
            "order_index",
            "milestone_name",
        ]

    def get_milestone_name(self, obj: Task) -> str | None:
        return obj.milestone.name if obj.milestone else None


class TaskDependencySerializer(serializers.ModelSerializer):
    depends_on = TaskBriefSerializer(read_only=True)

    class Meta:
        model = TaskDependency
        fields = ["id", "depends_on"]


class ProjectAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserBriefSerializer(read_only=True)
    task_title = serializers.SerializerMethodField()

    class Meta:
        model = ProjectAttachment
        fields = [
            "id",
            "project",
            "task",
            "task_title",
            "file_name",
            "file_size",
            "uploaded_by",
            "created_at",
        ]

    def get_task_title(self, obj: ProjectAttachment) -> str | None:
        return obj.task.title if obj.task else None


class TaskListSerializer(serializers.ModelSerializer):
    assignee = UserBriefSerializer(read_only=True)
    collaborators = UserBriefSerializer(read_only=True, many=True)
    milestone_name = serializers.SerializerMethodField()
    subtask_total = serializers.SerializerMethodField()
    subtask_done = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "title",
            "description",
            "status",
            "priority",
            "assignee",
            "collaborators",
            "start_date",
            "due_date",
            "estimated_hours",
            "actual_hours",
            "progress",
            "milestone",
            "milestone_name",
            "order_index",
            "created_at",
            "updated_at",
            "subtask_total",
            "subtask_done",
            "can_edit",
            "can_delete",
        ]

    def get_milestone_name(self, obj: Task) -> str | None:
        return obj.milestone.name if obj.milestone else None

    def get_subtask_total(self, obj: Task) -> int:
        return obj.subtasks.count()

    def get_subtask_done(self, obj: Task) -> int:
        return obj.subtasks.filter(is_done=True).count()

    def get_can_edit(self, obj: Task) -> bool:
        request = self.context.get("request")
        return bool(request and can_manage_task(request.user, obj))

    def get_can_delete(self, obj: Task) -> bool:
        request = self.context.get("request")
        return bool(request and can_delete_task(request.user, obj))


class TaskDetailSerializer(TaskListSerializer):
    project = ProjectListSerializer(read_only=True)
    parent_task = TaskBriefSerializer(read_only=True)
    milestone = MilestoneSerializer(read_only=True)
    subtasks = SubTaskSerializer(many=True, read_only=True)
    dependencies = TaskDependencySerializer(many=True, read_only=True)
    attachments = serializers.SerializerMethodField()

    class Meta(TaskListSerializer.Meta):
        fields = TaskListSerializer.Meta.fields + [
            "project",
            "parent_task",
            "milestone",
            "subtasks",
            "dependencies",
            "attachments",
        ]

    def get_attachments(self, obj: Task):
        rows = obj.attachments.select_related("uploaded_by", "task").all()
        return ProjectAttachmentSerializer(rows, many=True).data


class TaskWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=Task.STATUS_CHOICES,
        required=False,
        default=Task.STATUS_TODO,
    )
    priority = serializers.ChoiceField(
        choices=Task.PRIORITY_CHOICES,
        required=False,
        default=Task.PRIORITY_MEDIUM,
    )
    assignee = serializers.PrimaryKeyRelatedField(
        queryset=approved_user_queryset(),
        required=False,
        allow_null=True,
    )
    collaborators = serializers.PrimaryKeyRelatedField(
        queryset=approved_user_queryset(),
        many=True,
        required=False,
    )
    start_date = serializers.DateField(required=False, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    estimated_hours = serializers.DecimalField(
        max_digits=6,
        decimal_places=1,
        required=False,
        allow_null=True,
    )
    actual_hours = serializers.DecimalField(
        max_digits=6,
        decimal_places=1,
        required=False,
        allow_null=True,
    )
    progress = serializers.IntegerField(required=False, min_value=0, max_value=100, default=0)
    parent_task = serializers.PrimaryKeyRelatedField(
        queryset=Task.objects.filter(is_deleted=False),
        required=False,
        allow_null=True,
    )
    milestone = serializers.PrimaryKeyRelatedField(
        queryset=Milestone.objects.all(),
        required=False,
        allow_null=True,
    )
    order_index = serializers.IntegerField(required=False, min_value=0)
    subtasks = SubTaskWriteSerializer(many=True, required=False)
    dependencies = serializers.PrimaryKeyRelatedField(
        queryset=Task.objects.filter(is_deleted=False),
        many=True,
        required=False,
    )

    def validate_title(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Task title is required.")
        return cleaned

    def validate(self, attrs: dict) -> dict:
        start_date = attrs.get("start_date")
        due_date = attrs.get("due_date")
        if start_date and due_date and due_date < start_date:
            raise serializers.ValidationError({"due_date": ["Due date cannot be earlier than start date."]})
        return attrs


class TaskMoveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Task.STATUS_CHOICES)
    order_index = serializers.IntegerField(min_value=0)


class TaskProgressSerializer(serializers.Serializer):
    progress = serializers.IntegerField(min_value=0, max_value=100)


class TaskDependencyCreateSerializer(serializers.Serializer):
    depends_on = serializers.PrimaryKeyRelatedField(queryset=Task.objects.filter(is_deleted=False))


class AttachmentCreateSerializer(serializers.Serializer):
    task = serializers.PrimaryKeyRelatedField(
        queryset=Task.objects.filter(is_deleted=False),
        required=False,
        allow_null=True,
    )
    file = serializers.FileField()


class ProjectActivitySerializer(serializers.ModelSerializer):
    operator = UserBriefSerializer(read_only=True)
    task_title = serializers.SerializerMethodField()

    class Meta:
        model = ProjectActivityLog
        fields = [
            "id",
            "project",
            "task",
            "task_title",
            "operator",
            "action_type",
            "message",
            "metadata",
            "created_at",
        ]

    def get_task_title(self, obj: ProjectActivityLog) -> str | None:
        return obj.task.title if obj.task else None
