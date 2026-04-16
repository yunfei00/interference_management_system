from __future__ import annotations

import logging
from typing import Iterable

from django.db import transaction
from django.db.models import Max, Q
from rest_framework.exceptions import ValidationError

from accounts.models import User
from accounts.services import get_request_ip

from .models import (
    Milestone,
    Project,
    ProjectActivityLog,
    ProjectAttachment,
    SubTask,
    Task,
    TaskDependency,
)
from .permissions import (
    can_delete_attachment,
    can_upload_attachment,
    ensure_project_manageable,
    ensure_project_members_manageable,
    ensure_project_visibility,
    ensure_task_creatable,
    ensure_task_deletable,
    ensure_task_manageable,
)

logger = logging.getLogger("apps.projects")


def choice_label(choices, value: str) -> str:
    return dict(choices).get(value, value)


def actor_name(user) -> str:
    if not user:
        return "System"
    return user.display_name or user.username


def normalize_tags(tags) -> list[str]:
    if tags is None:
        return []
    if isinstance(tags, str):
        parts = [part.strip() for part in tags.split(",")]
        return [part for part in parts if part]
    if isinstance(tags, (list, tuple)):
        return [str(part).strip() for part in tags if str(part).strip()]
    return []


def build_project_snapshot(project: Project) -> dict:
    return {
        "id": project.id,
        "name": project.name,
        "code": project.code,
        "status": project.status,
        "priority": project.priority,
        "owner_id": project.owner_id,
        "member_ids": list(project.members.order_by("id").values_list("id", flat=True)),
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "progress": project.progress,
        "tags": project.tags or [],
        "is_archived": project.is_archived,
    }


def build_task_snapshot(task: Task) -> dict:
    return {
        "id": task.id,
        "title": task.title,
        "status": task.status,
        "priority": task.priority,
        "assignee_id": task.assignee_id,
        "collaborator_ids": list(task.collaborators.order_by("id").values_list("id", flat=True)),
        "start_date": task.start_date.isoformat() if task.start_date else None,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "progress": task.progress,
        "estimated_hours": str(task.estimated_hours) if task.estimated_hours is not None else None,
        "actual_hours": str(task.actual_hours) if task.actual_hours is not None else None,
        "milestone_id": task.milestone_id,
        "parent_task_id": task.parent_task_id,
        "order_index": task.order_index,
        "is_deleted": task.is_deleted,
    }


def log_project_activity(
    project: Project,
    operator,
    action_type: str,
    message: str,
    *,
    task: Task | None = None,
    metadata: dict | None = None,
) -> ProjectActivityLog:
    entry = ProjectActivityLog.objects.create(
        project=project,
        task=task,
        operator=operator,
        action_type=action_type,
        message=message,
        metadata=metadata or {},
    )
    logger.info(
        "project_activity action=%s project_id=%s task_id=%s operator_id=%s message=%s",
        action_type,
        project.id,
        task.id if task else None,
        getattr(operator, "id", None),
        message,
    )
    return entry


def recalculate_project_progress(project: Project) -> int:
    task_queryset = project.tasks.filter(is_deleted=False)
    total = task_queryset.count()
    progress = 0 if total == 0 else round(task_queryset.filter(status=Task.STATUS_DONE).count() * 100 / total)
    if project.progress != progress:
        project.progress = progress
        project.save(update_fields=["progress", "updated_at"])
    return progress


def get_project_participants(project: Project) -> set[int]:
    ids = set(project.members.values_list("id", flat=True))
    if project.owner_id:
        ids.add(project.owner_id)
    return ids


def validate_project_team_users(
    project: Project,
    *,
    assignee: User | None,
    collaborators: Iterable[User],
) -> None:
    team_ids = get_project_participants(project)
    if assignee and assignee.id not in team_ids:
        raise ValidationError({"assignee": ["Assignee must be the owner or a project member."]})
    invalid_collaborators = [
        collaborator.display_name or collaborator.username
        for collaborator in collaborators
        if collaborator.id not in team_ids
    ]
    if invalid_collaborators:
        raise ValidationError(
            {
                "collaborators": [
                    f"Collaborators must belong to the project team: {', '.join(invalid_collaborators)}."
                ]
            }
        )


def validate_member_removal(project: Project, removed_user_ids: set[int], *, new_owner_id: int | None = None) -> None:
    removed_user_ids = {
        user_id
        for user_id in removed_user_ids
        if user_id and user_id != new_owner_id
    }
    if not removed_user_ids:
        return

    if project.tasks.filter(is_deleted=False, assignee_id__in=removed_user_ids).exists():
        raise ValidationError(
            {
                "members": [
                    "Remove or reassign active task assignees before removing them from the project."
                ]
            }
        )

    if project.tasks.filter(is_deleted=False, collaborators__in=removed_user_ids).exists():
        raise ValidationError(
            {
                "members": [
                    "Remove users from task collaborators before removing them from the project."
                ]
            }
        )


def ensure_same_project_relation(project: Project, *, milestone=None, parent_task=None) -> None:
    if milestone and milestone.project_id != project.id:
        raise ValidationError({"milestone": ["Selected milestone does not belong to this project."]})
    if parent_task and parent_task.project_id != project.id:
        raise ValidationError({"parent_task": ["Selected parent task does not belong to this project."]})


def dependency_would_create_cycle(task: Task, depends_on: Task) -> bool:
    if task.id == depends_on.id:
        return True

    visited: set[int] = set()
    stack = [depends_on.id]
    while stack:
        current_id = stack.pop()
        if current_id == task.id:
            return True
        if current_id in visited:
            continue
        visited.add(current_id)
        stack.extend(
            TaskDependency.objects.filter(task_id=current_id).values_list(
                "depends_on_id",
                flat=True,
            )
        )
    return False


def validate_dependency_target(task: Task, depends_on: Task) -> None:
    if depends_on.project_id != task.project_id:
        raise ValidationError({"depends_on": ["Dependency must belong to the same project."]})
    if depends_on.is_deleted:
        raise ValidationError({"depends_on": ["Deleted tasks cannot be used as dependencies."]})
    if dependency_would_create_cycle(task, depends_on):
        raise ValidationError({"depends_on": ["This dependency would create a circular dependency."]})


def sync_task_subtasks(task: Task, subtasks_data: list[dict]) -> None:
    existing = {row.id: row for row in task.subtasks.all()}
    keep_ids: set[int] = set()

    for index, item in enumerate(subtasks_data):
        row_id = item.get("id")
        payload = {
            "title": item["title"].strip(),
            "is_done": bool(item.get("is_done", False)),
            "sort_order": item.get("sort_order", index),
        }
        if row_id and row_id in existing:
            row = existing[row_id]
            row.title = payload["title"]
            row.is_done = payload["is_done"]
            row.sort_order = payload["sort_order"]
            row.save(update_fields=["title", "is_done", "sort_order", "updated_at"])
            keep_ids.add(row.id)
        else:
            row = SubTask.objects.create(task=task, **payload)
            keep_ids.add(row.id)

    task.subtasks.exclude(id__in=keep_ids).delete()


def sync_task_dependencies(task: Task, dependency_tasks: list[Task]) -> None:
    target_ids = {row.id for row in dependency_tasks}
    existing = {
        row.depends_on_id: row
        for row in TaskDependency.objects.filter(task=task).select_related("depends_on")
    }

    for dependency_task in dependency_tasks:
        validate_dependency_target(task, dependency_task)
        if dependency_task.id not in existing:
            TaskDependency.objects.create(task=task, depends_on=dependency_task)

    TaskDependency.objects.filter(task=task).exclude(depends_on_id__in=target_ids).delete()


def resequence_task_column(project: Project, status_value: str) -> None:
    rows = list(
        Task.objects.filter(
            project=project,
            status=status_value,
            is_deleted=False,
        )
        .order_by("order_index", "id")
    )
    changed: list[Task] = []
    for index, row in enumerate(rows):
        if row.order_index != index:
            row.order_index = index
            changed.append(row)
    if changed:
        Task.objects.bulk_update(changed, ["order_index", "updated_at"])


def append_task_to_status_end(task: Task, status_value: str) -> None:
    max_order = (
        Task.objects.filter(
            project=task.project,
            status=status_value,
            is_deleted=False,
        )
        .exclude(pk=task.pk)
        .aggregate(max_order=Max("order_index"))
        .get("max_order")
    )
    task.order_index = 0 if max_order is None else max_order + 1
    task.status = status_value


@transaction.atomic
def create_project(*, operator, data: dict, request) -> Project:
    owner = data.get("owner") or operator
    members = list(data.get("members") or [])
    project = Project(
        name=data["name"],
        description=data.get("description", ""),
        status=data.get("status", Project.STATUS_NOT_STARTED),
        priority=data.get("priority", Project.PRIORITY_MEDIUM),
        owner=owner,
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
        tags=normalize_tags(data.get("tags")),
        created_by=operator,
    )
    project.save()
    member_ids = {member.id for member in members if member.id != owner.id}
    if member_ids:
        project.members.set(member_ids)

    log_project_activity(
        project,
        operator,
        ProjectActivityLog.ACTION_PROJECT_CREATED,
        f"{actor_name(operator)} created project [{project.name}]",
        metadata={"after": build_project_snapshot(project), "ip": get_request_ip(request)},
    )
    if member_ids:
        names = ", ".join(
            approved_user.display_name or approved_user.username
            for approved_user in User.objects.filter(id__in=member_ids)
        )
        log_project_activity(
            project,
            operator,
            ProjectActivityLog.ACTION_MEMBER_ADDED,
            f"{actor_name(operator)} added members to project [{project.name}]: {names}",
            metadata={"member_ids": sorted(member_ids), "ip": get_request_ip(request)},
        )
    return project


@transaction.atomic
def update_project(*, project: Project, operator, data: dict, request) -> Project:
    ensure_project_manageable(operator, project)
    before = build_project_snapshot(project)

    if "name" in data:
        project.name = data["name"]
    if "description" in data:
        project.description = data.get("description", "")
    if "status" in data:
        project.status = data["status"]
    if "priority" in data:
        project.priority = data["priority"]
    if "owner" in data:
        project.owner = data["owner"]
    if "start_date" in data:
        project.start_date = data.get("start_date")
    if "end_date" in data:
        project.end_date = data.get("end_date")
    if "tags" in data:
        project.tags = normalize_tags(data.get("tags"))
    project.save()

    added_member_ids: set[int] = set()
    removed_member_ids: set[int] = set()
    if "members" in data:
        current_ids = set(project.members.values_list("id", flat=True))
        target_ids = {
            member.id
            for member in (data.get("members") or [])
            if member.id != project.owner_id
        }
        removed_member_ids = current_ids - target_ids
        validate_member_removal(project, removed_member_ids, new_owner_id=project.owner_id)
        added_member_ids = target_ids - current_ids
        project.members.set(target_ids)

    log_project_activity(
        project,
        operator,
        ProjectActivityLog.ACTION_PROJECT_UPDATED,
        f"{actor_name(operator)} updated project [{project.name}]",
        metadata={
            "before": before,
            "after": build_project_snapshot(project),
            "ip": get_request_ip(request),
        },
    )

    if added_member_ids:
        added_names = ", ".join(
            row.display_name or row.username
            for row in User.objects.filter(id__in=added_member_ids).order_by("id")
        )
        log_project_activity(
            project,
            operator,
            ProjectActivityLog.ACTION_MEMBER_ADDED,
            f"{actor_name(operator)} added members to project [{project.name}]: {added_names}",
            metadata={"member_ids": sorted(added_member_ids), "ip": get_request_ip(request)},
        )

    if removed_member_ids:
        removed_names = ", ".join(
            row.display_name or row.username
            for row in User.objects.filter(id__in=removed_member_ids).order_by("id")
        )
        log_project_activity(
            project,
            operator,
            ProjectActivityLog.ACTION_MEMBER_REMOVED,
            f"{actor_name(operator)} removed members from project [{project.name}]: {removed_names}",
            metadata={"member_ids": sorted(removed_member_ids), "ip": get_request_ip(request)},
        )

    return project


@transaction.atomic
def archive_project(*, project: Project, operator, request) -> Project:
    ensure_project_manageable(operator, project)
    if project.is_archived:
        return project
    project.is_archived = True
    project.save(update_fields=["is_archived", "updated_at"])
    log_project_activity(
        project,
        operator,
        ProjectActivityLog.ACTION_PROJECT_DELETED,
        f"{actor_name(operator)} archived project [{project.name}]",
        metadata={"after": build_project_snapshot(project), "ip": get_request_ip(request)},
    )
    return project


@transaction.atomic
def add_project_members(*, project: Project, operator, users: list[User], request) -> Project:
    ensure_project_members_manageable(operator, project)
    member_ids = {
        user.id
        for user in users
        if user.id and user.id != project.owner_id
    }
    if not member_ids:
        return project
    existing_ids = set(project.members.values_list("id", flat=True))
    new_ids = member_ids - existing_ids
    if not new_ids:
        return project
    project.members.add(*new_ids)
    added_names = ", ".join(
        row.display_name or row.username
        for row in User.objects.filter(id__in=new_ids).order_by("id")
    )
    log_project_activity(
        project,
        operator,
        ProjectActivityLog.ACTION_MEMBER_ADDED,
        f"{actor_name(operator)} added members to project [{project.name}]: {added_names}",
        metadata={"member_ids": sorted(new_ids), "ip": get_request_ip(request)},
    )
    return project


@transaction.atomic
def remove_project_member(*, project: Project, operator, member: User, request) -> Project:
    ensure_project_members_manageable(operator, project)
    if project.owner_id == member.id:
        raise ValidationError({"member": ["Project owner cannot be removed from members."]})
    if not project.members.filter(pk=member.pk).exists():
        return project
    validate_member_removal(project, {member.id}, new_owner_id=project.owner_id)
    project.members.remove(member)
    log_project_activity(
        project,
        operator,
        ProjectActivityLog.ACTION_MEMBER_REMOVED,
        f"{actor_name(operator)} removed member [{member.display_name or member.username}] from project [{project.name}]",
        metadata={"member_id": member.id, "ip": get_request_ip(request)},
    )
    return project


@transaction.atomic
def create_task(*, project: Project, operator, data: dict, request) -> Task:
    ensure_project_visibility(operator, project)
    ensure_task_creatable(operator, project)
    assignee = data.get("assignee")
    collaborators = list(data.get("collaborators") or [])
    validate_project_team_users(project, assignee=assignee, collaborators=collaborators)
    ensure_same_project_relation(
        project,
        milestone=data.get("milestone"),
        parent_task=data.get("parent_task"),
    )

    task = Task(
        project=project,
        title=data["title"],
        description=data.get("description", ""),
        status=data.get("status", Task.STATUS_TODO),
        priority=data.get("priority", Task.PRIORITY_MEDIUM),
        assignee=assignee,
        start_date=data.get("start_date"),
        due_date=data.get("due_date"),
        estimated_hours=data.get("estimated_hours"),
        actual_hours=data.get("actual_hours"),
        progress=data.get("progress", 0),
        parent_task=data.get("parent_task"),
        milestone=data.get("milestone"),
        created_by=operator,
    )
    append_task_to_status_end(task, task.status)
    task.save()
    if collaborators:
        task.collaborators.set({row.id for row in collaborators})

    if "subtasks" in data:
        sync_task_subtasks(task, data.get("subtasks") or [])

    if "dependencies" in data:
        sync_task_dependencies(task, list(data.get("dependencies") or []))

    recalculate_project_progress(project)
    log_project_activity(
        project,
        operator,
        ProjectActivityLog.ACTION_TASK_CREATED,
        f"{actor_name(operator)} created task [{task.title}]",
        task=task,
        metadata={"after": build_task_snapshot(task), "ip": get_request_ip(request)},
    )
    return task


@transaction.atomic
def update_task(*, task: Task, operator, data: dict, request) -> Task:
    ensure_project_visibility(operator, task.project)
    ensure_task_manageable(operator, task)
    before = build_task_snapshot(task)
    previous_status = task.status

    assignee = data.get("assignee", task.assignee)
    collaborators = list(data.get("collaborators", task.collaborators.all()))
    validate_project_team_users(task.project, assignee=assignee, collaborators=collaborators)
    ensure_same_project_relation(
        task.project,
        milestone=data.get("milestone", task.milestone),
        parent_task=data.get("parent_task", task.parent_task),
    )

    for field in (
        "title",
        "description",
        "status",
        "priority",
        "assignee",
        "start_date",
        "due_date",
        "estimated_hours",
        "actual_hours",
        "progress",
        "parent_task",
        "milestone",
    ):
        if field in data:
            setattr(task, field, data.get(field))

    if "status" in data and data["status"] != previous_status and "order_index" not in data:
        append_task_to_status_end(task, data["status"])
    elif "order_index" in data:
        task.order_index = max(0, int(data["order_index"]))

    task.save()
    if "collaborators" in data:
        task.collaborators.set({row.id for row in collaborators})

    if "subtasks" in data:
        sync_task_subtasks(task, data.get("subtasks") or [])

    if "dependencies" in data:
        sync_task_dependencies(task, list(data.get("dependencies") or []))

    resequence_task_column(task.project, previous_status)
    resequence_task_column(task.project, task.status)
    recalculate_project_progress(task.project)

    log_project_activity(
        task.project,
        operator,
        ProjectActivityLog.ACTION_TASK_UPDATED,
        f"{actor_name(operator)} updated task [{task.title}]",
        task=task,
        metadata={
            "before": before,
            "after": build_task_snapshot(task),
            "ip": get_request_ip(request),
        },
    )

    if previous_status != task.status:
        log_project_activity(
            task.project,
            operator,
            ProjectActivityLog.ACTION_TASK_STATUS_CHANGED,
            (
                f"{actor_name(operator)} changed task [{task.title}] status from "
                f"{choice_label(Task.STATUS_CHOICES, previous_status)} to "
                f"{choice_label(Task.STATUS_CHOICES, task.status)}"
            ),
            task=task,
            metadata={
                "from": previous_status,
                "to": task.status,
                "ip": get_request_ip(request),
            },
        )
    return task


@transaction.atomic
def delete_task(*, task: Task, operator, request) -> Task:
    ensure_project_visibility(operator, task.project)
    ensure_task_deletable(operator, task)
    if task.is_deleted:
        return task

    task.is_deleted = True
    task.save(update_fields=["is_deleted", "updated_at"])
    TaskDependency.objects.filter(Q(task=task) | Q(depends_on=task)).delete()
    resequence_task_column(task.project, task.status)
    recalculate_project_progress(task.project)
    log_project_activity(
        task.project,
        operator,
        ProjectActivityLog.ACTION_TASK_DELETED,
        f"{actor_name(operator)} deleted task [{task.title}]",
        task=task,
        metadata={"task_id": task.id, "ip": get_request_ip(request)},
    )
    return task


@transaction.atomic
def move_task(*, task: Task, operator, target_status: str, target_order_index: int, request) -> dict:
    ensure_project_visibility(operator, task.project)
    ensure_task_manageable(operator, task)

    previous_status = task.status
    project = task.project

    source_rows = list(
        Task.objects.select_for_update()
        .filter(project=project, status=previous_status, is_deleted=False)
        .order_by("order_index", "id")
    )
    destination_rows = source_rows if previous_status == target_status else list(
        Task.objects.select_for_update()
        .filter(project=project, status=target_status, is_deleted=False)
        .order_by("order_index", "id")
    )

    source_rows = [row for row in source_rows if row.id != task.id]
    if previous_status == target_status:
        destination_rows = source_rows
    target_order_index = max(0, min(int(target_order_index), len(destination_rows)))
    task.status = target_status
    if target_status == Task.STATUS_DONE:
        task.progress = 100
    destination_rows.insert(target_order_index, task)

    changed_rows: list[Task] = []
    for index, row in enumerate(destination_rows):
        if (
            row.order_index != index
            or row.status != target_status
            or (row.pk == task.pk and previous_status != target_status)
        ):
            row.order_index = index
            row.status = target_status
            changed_rows.append(row)

    if previous_status != target_status:
        for index, row in enumerate(source_rows):
            if row.order_index != index:
                row.order_index = index
                changed_rows.append(row)

    if changed_rows:
        Task.objects.bulk_update(changed_rows, ["status", "order_index", "progress", "updated_at"])

    task.refresh_from_db()
    recalculate_project_progress(project)

    if previous_status != target_status:
        log_project_activity(
            project,
            operator,
            ProjectActivityLog.ACTION_TASK_STATUS_CHANGED,
            (
                f"{actor_name(operator)} changed task [{task.title}] status from "
                f"{choice_label(Task.STATUS_CHOICES, previous_status)} to "
                f"{choice_label(Task.STATUS_CHOICES, target_status)}"
            ),
            task=task,
            metadata={
                "from": previous_status,
                "to": target_status,
                "ip": get_request_ip(request),
            },
        )

    log_project_activity(
        project,
        operator,
        ProjectActivityLog.ACTION_TASK_MOVED,
        f"{actor_name(operator)} moved task [{task.title}] to column [{choice_label(Task.STATUS_CHOICES, target_status)}]",
        task=task,
        metadata={
            "from_status": previous_status,
            "to_status": target_status,
            "order_index": task.order_index,
            "ip": get_request_ip(request),
        },
    )

    return {
        "task": task,
        "column_orders": {
            status_value: list(
                Task.objects.filter(
                    project=project,
                    status=status_value,
                    is_deleted=False,
                )
                .order_by("order_index", "id")
                .values_list("id", flat=True)
            )
            for status_value in Task.KANBAN_STATUS_ORDER
        },
    }


@transaction.atomic
def update_task_progress(*, task: Task, operator, progress: int, request) -> Task:
    ensure_project_visibility(operator, task.project)
    ensure_task_manageable(operator, task)
    before = build_task_snapshot(task)
    previous_status = task.status

    task.progress = progress
    if progress >= 100:
        task.status = Task.STATUS_DONE
    elif task.status == Task.STATUS_DONE and progress < 100:
        task.status = Task.STATUS_IN_PROGRESS
    task.save(update_fields=["progress", "status", "updated_at"])
    recalculate_project_progress(task.project)

    log_project_activity(
        task.project,
        operator,
        ProjectActivityLog.ACTION_TASK_UPDATED,
        f"{actor_name(operator)} updated task [{task.title}] progress to {task.progress}%",
        task=task,
        metadata={
            "before": before,
            "after": build_task_snapshot(task),
            "ip": get_request_ip(request),
        },
    )

    if previous_status != task.status:
        log_project_activity(
            task.project,
            operator,
            ProjectActivityLog.ACTION_TASK_STATUS_CHANGED,
            (
                f"{actor_name(operator)} changed task [{task.title}] status from "
                f"{choice_label(Task.STATUS_CHOICES, previous_status)} to "
                f"{choice_label(Task.STATUS_CHOICES, task.status)}"
            ),
            task=task,
            metadata={
                "from": previous_status,
                "to": task.status,
                "ip": get_request_ip(request),
            },
        )
    return task


@transaction.atomic
def create_subtask(*, task: Task, operator, data: dict, request) -> SubTask:
    ensure_project_visibility(operator, task.project)
    ensure_task_manageable(operator, task)
    subtask = SubTask.objects.create(
        task=task,
        title=data["title"],
        is_done=bool(data.get("is_done", False)),
        sort_order=data.get("sort_order", task.subtasks.count()),
    )
    log_project_activity(
        task.project,
        operator,
        ProjectActivityLog.ACTION_TASK_UPDATED,
        f"{actor_name(operator)} added subtask [{subtask.title}] to task [{task.title}]",
        task=task,
        metadata={"subtask_id": subtask.id, "ip": get_request_ip(request)},
    )
    return subtask


@transaction.atomic
def add_task_dependency(*, task: Task, depends_on: Task, operator, request) -> TaskDependency:
    ensure_project_visibility(operator, task.project)
    ensure_task_manageable(operator, task)
    validate_dependency_target(task, depends_on)
    dependency, _ = TaskDependency.objects.get_or_create(task=task, depends_on=depends_on)
    log_project_activity(
        task.project,
        operator,
        ProjectActivityLog.ACTION_TASK_UPDATED,
        f"{actor_name(operator)} added dependency [{depends_on.title}] to task [{task.title}]",
        task=task,
        metadata={"dependency_id": dependency.id, "ip": get_request_ip(request)},
    )
    return dependency


@transaction.atomic
def remove_task_dependency(*, task: Task, dependency: TaskDependency, operator, request) -> None:
    ensure_project_visibility(operator, task.project)
    ensure_task_manageable(operator, task)
    depends_on_title = dependency.depends_on.title
    dependency.delete()
    log_project_activity(
        task.project,
        operator,
        ProjectActivityLog.ACTION_TASK_UPDATED,
        f"{actor_name(operator)} removed dependency [{depends_on_title}] from task [{task.title}]",
        task=task,
        metadata={"dependency_title": depends_on_title, "ip": get_request_ip(request)},
    )


@transaction.atomic
def create_milestone(*, project: Project, operator, data: dict, request) -> Milestone:
    ensure_project_manageable(operator, project)
    milestone = Milestone.objects.create(project=project, **data)
    log_project_activity(
        project,
        operator,
        ProjectActivityLog.ACTION_MILESTONE_CREATED,
        f"{actor_name(operator)} created milestone [{milestone.name}]",
        metadata={"milestone_id": milestone.id, "ip": get_request_ip(request)},
    )
    return milestone


@transaction.atomic
def update_milestone(*, milestone: Milestone, operator, data: dict, request) -> Milestone:
    ensure_project_manageable(operator, milestone.project)
    for field, value in data.items():
        setattr(milestone, field, value)
    milestone.save()
    log_project_activity(
        milestone.project,
        operator,
        ProjectActivityLog.ACTION_MILESTONE_UPDATED,
        f"{actor_name(operator)} updated milestone [{milestone.name}]",
        metadata={"milestone_id": milestone.id, "ip": get_request_ip(request)},
    )
    return milestone


@transaction.atomic
def delete_milestone(*, milestone: Milestone, operator, request) -> None:
    ensure_project_manageable(operator, milestone.project)
    project = milestone.project
    name = milestone.name
    milestone.delete()
    log_project_activity(
        project,
        operator,
        ProjectActivityLog.ACTION_MILESTONE_DELETED,
        f"{actor_name(operator)} deleted milestone [{name}]",
        metadata={"ip": get_request_ip(request)},
    )


@transaction.atomic
def create_attachment(*, project: Project, operator, upload, request, task: Task | None = None) -> ProjectAttachment:
    ensure_project_visibility(operator, project)
    if not can_upload_attachment(operator, project):
        raise ValidationError({"file": ["You do not have permission to upload attachments."]})
    if task and task.project_id != project.id:
        raise ValidationError({"task": ["Selected task does not belong to this project."]})

    attachment = ProjectAttachment.objects.create(
        project=project,
        task=task,
        file=upload,
        file_name=getattr(upload, "name", ""),
        file_size=getattr(upload, "size", 0) or 0,
        uploaded_by=operator,
    )
    target = f"task [{task.title}]" if task else f"project [{project.name}]"
    log_project_activity(
        project,
        operator,
        ProjectActivityLog.ACTION_ATTACHMENT_UPLOADED,
        f"{actor_name(operator)} uploaded attachment [{attachment.file_name}] to {target}",
        task=task,
        metadata={"attachment_id": attachment.id, "ip": get_request_ip(request)},
    )
    return attachment


@transaction.atomic
def delete_attachment(*, attachment: ProjectAttachment, operator, request) -> None:
    ensure_project_visibility(operator, attachment.project)
    if not can_delete_attachment(operator, attachment):
        raise ValidationError({"attachment": ["You do not have permission to delete this attachment."]})
    file_name = attachment.file_name
    project = attachment.project
    task = attachment.task
    if attachment.file:
        attachment.file.delete(save=False)
    attachment.delete()
    target = f"task [{task.title}]" if task else f"project [{project.name}]"
    log_project_activity(
        project,
        operator,
        ProjectActivityLog.ACTION_ATTACHMENT_DELETED,
        f"{actor_name(operator)} deleted attachment [{file_name}] from {target}",
        task=task,
        metadata={"file_name": file_name, "ip": get_request_ip(request)},
    )
