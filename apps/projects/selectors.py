from __future__ import annotations

from datetime import timedelta

from django.db.models import Case, Count, IntegerField, Q, Value, When
from django.utils import timezone

from accounts.models import User

from .models import Milestone, Project, ProjectActivityLog, ProjectAttachment, Task
from .permissions import is_system_project_admin


PROJECT_PRIORITY_ORDER = {
    Project.PRIORITY_LOW: 1,
    Project.PRIORITY_MEDIUM: 2,
    Project.PRIORITY_HIGH: 3,
    Project.PRIORITY_CRITICAL: 4,
}

TASK_PRIORITY_ORDER = {
    Task.PRIORITY_LOW: 1,
    Task.PRIORITY_MEDIUM: 2,
    Task.PRIORITY_HIGH: 3,
    Task.PRIORITY_URGENT: 4,
}


def approved_user_queryset():
    return User.objects.filter(
        approve_status=User.STATUS_APPROVED,
        is_deleted=False,
        is_active=True,
    ).select_related("department")


def get_member_options_queryset(user, keyword: str = ""):
    if not user or not getattr(user, "is_authenticated", False):
        return approved_user_queryset().none()
    queryset = approved_user_queryset().order_by("real_name", "username", "id")
    if keyword:
        queryset = queryset.filter(
            Q(username__icontains=keyword)
            | Q(real_name__icontains=keyword)
            | Q(email__icontains=keyword)
        )
    return queryset


def get_accessible_projects_queryset(user, *, include_archived: bool = False):
    queryset = (
        Project.objects.select_related("owner", "created_by")
        .prefetch_related("members")
        .annotate(
            member_count=Count("members", distinct=True),
            task_total=Count(
                "tasks",
                filter=Q(tasks__is_deleted=False),
                distinct=True,
            ),
            task_done=Count(
                "tasks",
                filter=Q(tasks__is_deleted=False, tasks__status=Task.STATUS_DONE),
                distinct=True,
            ),
        )
        .distinct()
    )
    if not include_archived:
        queryset = queryset.filter(is_archived=False)
    if is_system_project_admin(user):
        return queryset
    return queryset.filter(Q(owner=user) | Q(members=user))


def get_project_list_queryset(user, params):
    queryset = get_accessible_projects_queryset(
        user,
        include_archived=(params.get("include_archived", "").strip().lower() in {"1", "true", "yes"}),
    )

    keyword = (params.get("keyword") or params.get("q") or "").strip()
    if keyword:
        queryset = queryset.filter(Q(name__icontains=keyword) | Q(code__icontains=keyword))

    status_value = (params.get("status") or "").strip()
    if status_value:
        queryset = queryset.filter(status=status_value)

    priority = (params.get("priority") or "").strip()
    if priority:
        queryset = queryset.filter(priority=priority)

    owner = (params.get("owner") or "").strip()
    if owner.isdigit():
        queryset = queryset.filter(owner_id=int(owner))

    mine = (params.get("mine") or "").strip().lower()
    if mine in {"1", "true", "yes"}:
        queryset = queryset.filter(Q(owner=user) | Q(members=user))

    order = (params.get("ordering") or params.get("order") or "-updated_at").strip()
    descending = order.startswith("-")
    field = order[1:] if descending else order
    direction = "-" if descending else ""

    if field == "priority":
        queryset = queryset.annotate(
            priority_rank=Case(
                *[
                    When(priority=key, then=Value(value))
                    for key, value in PROJECT_PRIORITY_ORDER.items()
                ],
                default=Value(0),
                output_field=IntegerField(),
            )
        ).order_by(f"{direction}priority_rank", "-updated_at", "-id")
    elif field in {"updated_at", "start_date", "end_date", "created_at"}:
        queryset = queryset.order_by(f"{direction}{field}", "-id")
    else:
        queryset = queryset.order_by("-updated_at", "-id")

    return queryset


def get_project_tasks_queryset(user, *, project=None, params=None):
    params = params or {}
    queryset = (
        Task.objects.filter(is_deleted=False)
        .select_related("project", "assignee", "created_by", "milestone", "parent_task")
        .prefetch_related("collaborators", "subtasks")
        .distinct()
    )

    if project is not None:
        queryset = queryset.filter(project=project)
    else:
        accessible_projects = get_accessible_projects_queryset(user).values_list("id", flat=True)
        queryset = queryset.filter(project_id__in=accessible_projects)

    keyword = (params.get("keyword") or params.get("q") or "").strip()
    if keyword:
        queryset = queryset.filter(
            Q(title__icontains=keyword)
            | Q(description__icontains=keyword)
            | Q(project__name__icontains=keyword)
        )

    status_value = (params.get("status") or "").strip()
    if status_value:
        queryset = queryset.filter(status=status_value)

    priority = (params.get("priority") or "").strip()
    if priority:
        queryset = queryset.filter(priority=priority)

    assignee = (params.get("assignee") or "").strip()
    if assignee.isdigit():
        queryset = queryset.filter(assignee_id=int(assignee))

    milestone = (params.get("milestone") or "").strip()
    if milestone.isdigit():
        queryset = queryset.filter(milestone_id=int(milestone))

    mine = (params.get("mine") or params.get("my_tasks") or "").strip().lower()
    if mine in {"1", "true", "yes"}:
        queryset = queryset.filter(
            Q(assignee=user) | Q(created_by=user) | Q(collaborators=user)
        )

    due_from = (params.get("due_date_from") or "").strip()
    if due_from:
        queryset = queryset.filter(due_date__gte=due_from)

    due_to = (params.get("due_date_to") or "").strip()
    if due_to:
        queryset = queryset.filter(due_date__lte=due_to)

    order = (params.get("ordering") or params.get("order") or "status,order_index").strip()
    if order in {"priority", "-priority"}:
        descending = order.startswith("-")
        queryset = queryset.annotate(
            priority_rank=Case(
                *[
                    When(priority=key, then=Value(value))
                    for key, value in TASK_PRIORITY_ORDER.items()
                ],
                default=Value(0),
                output_field=IntegerField(),
            )
        ).order_by(
            f"{'-' if descending else ''}priority_rank",
            "status",
            "order_index",
            "-updated_at",
        )
    elif order in {"due_date", "-due_date", "updated_at", "-updated_at"}:
        queryset = queryset.order_by(order, "status", "order_index", "-id")
    else:
        queryset = queryset.order_by("status", "order_index", "-updated_at", "-id")

    return queryset


def get_project_milestones_queryset(user, *, project):
    accessible_ids = get_accessible_projects_queryset(user).values_list("id", flat=True)
    return (
        Milestone.objects.filter(project=project, project_id__in=accessible_ids)
        .select_related("project")
        .order_by("sort_order", "due_date", "id")
    )


def get_project_attachments_queryset(user, *, project):
    accessible_ids = get_accessible_projects_queryset(user).values_list("id", flat=True)
    return (
        ProjectAttachment.objects.filter(project=project, project_id__in=accessible_ids)
        .select_related("project", "task", "uploaded_by")
        .order_by("-created_at", "-id")
    )


def get_project_activity_queryset(user, *, project, task=None):
    accessible_ids = get_accessible_projects_queryset(user).values_list("id", flat=True)
    queryset = (
        ProjectActivityLog.objects.filter(project=project, project_id__in=accessible_ids)
        .select_related("project", "task", "operator")
        .order_by("-created_at", "-id")
    )
    if task is not None:
        queryset = queryset.filter(task=task)
    return queryset


def build_projects_summary(user) -> dict[str, int]:
    project_queryset = get_accessible_projects_queryset(user)
    task_queryset = get_project_tasks_queryset(user)
    today = timezone.localdate()
    upcoming_deadline = today + timedelta(days=7)

    return {
        "total_projects": project_queryset.count(),
        "in_progress_projects": project_queryset.filter(
            status=Project.STATUS_IN_PROGRESS
        ).count(),
        "completed_projects": project_queryset.filter(
            status=Project.STATUS_COMPLETED
        ).count(),
        "my_projects": project_queryset.filter(Q(owner=user) | Q(members=user)).distinct().count(),
        "my_pending_tasks": task_queryset.filter(
            Q(assignee=user) | Q(created_by=user) | Q(collaborators=user)
        )
        .exclude(status=Task.STATUS_DONE)
        .distinct()
        .count(),
        "upcoming_tasks": task_queryset.filter(
            due_date__isnull=False,
            due_date__gte=today,
            due_date__lte=upcoming_deadline,
        )
        .exclude(status=Task.STATUS_DONE)
        .count(),
        "blocked_tasks": task_queryset.filter(status=Task.STATUS_BLOCKED).count(),
    }
