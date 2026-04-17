from __future__ import annotations

from rest_framework.exceptions import PermissionDenied

from accounts.permissions import is_user_approved
from accounts.services import get_user_role
from accounts.models import User

from .models import Project, Task


def is_system_project_admin(user) -> bool:
    if not is_user_approved(user):
        return False
    return get_user_role(user) in {User.ROLE_ADMIN, User.ROLE_SUPER_ADMIN}


def can_view_project(user, project: Project) -> bool:
    if not is_user_approved(user):
        return False
    if is_system_project_admin(user):
        return True
    if project.owner_id == user.id:
        return True
    return project.members.filter(pk=user.pk).exists()


def can_create_project(user) -> bool:
    return is_user_approved(user)


def can_manage_project(user, project: Project) -> bool:
    if not is_user_approved(user):
        return False
    if is_system_project_admin(user):
        return True
    return project.owner_id == user.id


def can_manage_project_members(user, project: Project) -> bool:
    return can_manage_project(user, project)


def can_create_task(user, project: Project) -> bool:
    return can_view_project(user, project)


def can_manage_task(user, task: Task) -> bool:
    if not is_user_approved(user):
        return False
    if is_system_project_admin(user):
        return True
    if task.project.owner_id == user.id:
        return True
    if task.assignee_id == user.id:
        return True
    if task.created_by_id == user.id:
        return True
    return task.collaborators.filter(pk=user.pk).exists()


def can_delete_task(user, task: Task) -> bool:
    if not is_user_approved(user):
        return False
    if is_system_project_admin(user):
        return True
    return task.project.owner_id == user.id


def can_manage_milestones(user, project: Project) -> bool:
    return can_manage_project(user, project)


def can_upload_attachment(user, project: Project) -> bool:
    return can_view_project(user, project)


def can_delete_attachment(user, attachment) -> bool:
    if not is_user_approved(user):
        return False
    if is_system_project_admin(user):
        return True
    if attachment.project.owner_id == user.id:
        return True
    return attachment.uploaded_by_id == user.id


def ensure_project_visibility(user, project: Project) -> None:
    if not can_view_project(user, project):
        raise PermissionDenied("You do not have access to this project.")


def ensure_project_manageable(user, project: Project) -> None:
    if not can_manage_project(user, project):
        raise PermissionDenied("You do not have permission to manage this project.")


def ensure_project_members_manageable(user, project: Project) -> None:
    if not can_manage_project_members(user, project):
        raise PermissionDenied("You do not have permission to manage project members.")


def ensure_task_creatable(user, project: Project) -> None:
    if not can_create_task(user, project):
        raise PermissionDenied("You do not have permission to create tasks in this project.")


def ensure_task_manageable(user, task: Task) -> None:
    if not can_manage_task(user, task):
        raise PermissionDenied("You do not have permission to edit this task.")


def ensure_task_deletable(user, task: Task) -> None:
    if not can_delete_task(user, task):
        raise PermissionDenied("You do not have permission to delete this task.")

