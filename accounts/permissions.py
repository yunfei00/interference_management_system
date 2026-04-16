from __future__ import annotations

from typing import Iterable

from .models import User
from .services import get_user_role

DEPARTMENT_PERMISSIONS = {
    "department.electromagnetic.view",
    "department.interference.view",
    "department.rse.view",
    "department.emc.view",
    "department.rf.view",
}

INTERFERENCE_FEATURE_PERMISSIONS = {
    "interference.dashboard.view",
    "interference.datahub.view",
    "interference.tools.view",
    "interference.hosts.view",
    "interference.commands.view",
}

TOOLS_MANAGE_KEY = "tools.manage"

RSE_PORTAL_PERMISSIONS = frozenset({"rse.dashboard.view"})
EMC_PORTAL_PERMISSIONS = frozenset({"emc.dashboard.view"})
RF_PORTAL_PERMISSIONS = frozenset({"rf.dashboard.view"})
PROJECTS_PORTAL_PERMISSIONS = frozenset({"projects.module.view"})

STAFF_PERMISSIONS = {
    "ops.host.view",
    "ops.host.manage",
    "ops.command.view",
    "ops.command.run",
    "admin.users.view",
    "admin.users.manage",
    "admin.audit.view",
}

SUPER_ADMIN_PERMISSIONS = {
    "admin.users.delete",
    "admin.users.manage_super_admin",
}


def is_user_approved(user) -> bool:
    if not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_deleted", False):
        return False
    return getattr(user, "approve_status", User.STATUS_PENDING) == User.STATUS_APPROVED


def is_user_admin(user) -> bool:
    if not is_user_approved(user):
        return False
    return get_user_role(user) in {User.ROLE_SUPER_ADMIN, User.ROLE_ADMIN}


def get_user_department_codes(user) -> set[str]:
    department = getattr(user, "department", None)
    codes: set[str] = set()
    while department is not None:
        codes.add(department.code)
        department = department.parent
    return codes


def _add_interference_bundle(target: set[str], *, staff: bool) -> None:
    target.update(INTERFERENCE_FEATURE_PERMISSIONS)
    target.update(
        {
            "datahub.view",
            "datahub.create",
            "datahub.upload",
        }
    )
    target.add("tools.view")
    target.add("tools.download")
    if staff:
        target.add("tools.upload")
        target.add(TOOLS_MANAGE_KEY)
        target.update(STAFF_PERMISSIONS)


def get_user_perm_keys(user) -> set[str]:
    if not is_user_approved(user):
        return set()

    permissions: set[str] = set()
    role = get_user_role(user)
    permissions.update(PROJECTS_PORTAL_PERMISSIONS)

    if role in {User.ROLE_ADMIN, User.ROLE_SUPER_ADMIN}:
        permissions.add("overview.view")
        permissions.update(DEPARTMENT_PERMISSIONS)
        _add_interference_bundle(permissions, staff=True)
        permissions.update(RSE_PORTAL_PERMISSIONS)
        permissions.update(EMC_PORTAL_PERMISSIONS)
        permissions.update(RF_PORTAL_PERMISSIONS)
        if role == User.ROLE_SUPER_ADMIN:
            permissions.update(SUPER_ADMIN_PERMISSIONS)
        return permissions

    department_codes = get_user_department_codes(user)

    if "electromagnetic" in department_codes:
        permissions.add("department.electromagnetic.view")
    if "interference" in department_codes:
        permissions.add("department.interference.view")
        _add_interference_bundle(permissions, staff=False)
    if "rse" in department_codes:
        permissions.add("department.rse.view")
        permissions.update(RSE_PORTAL_PERMISSIONS)
    if "emc" in department_codes:
        permissions.add("department.emc.view")
        permissions.update(EMC_PORTAL_PERMISSIONS)
    if "rf" in department_codes:
        permissions.add("department.rf.view")
        permissions.update(RF_PORTAL_PERMISSIONS)

    return permissions


def user_has_permission(user, permission: str | Iterable[str]) -> bool:
    if not is_user_approved(user):
        return False

    if isinstance(permission, str):
        permission_list = [permission]
    else:
        permission_list = list(permission)

    user_permissions = get_user_perm_keys(user)
    return all(item in user_permissions for item in permission_list)


def build_menu_tree_for_user(user) -> list[dict]:
    permissions = get_user_perm_keys(user)

    def visible(required_permission: str | None) -> bool:
        return required_permission is None or required_permission in permissions

    menu_items = [
        {
            "id": 1,
            "code": "overview",
            "name": "Workspace",
            "path": "/dashboard",
            "icon": "gauge",
            "sort": 10,
            "status": 1,
            "visible": visible("overview.view"),
            "is_external": False,
            "permission_key": "overview.view",
            "children": [],
        },
        {
            "id": 88,
            "code": "system_admin",
            "name": "System Management",
            "path": "/dashboard/admin/users",
            "icon": "settings",
            "sort": 15,
            "status": 1,
            "visible": visible("admin.users.view"),
            "is_external": False,
            "permission_key": "admin.users.view",
            "children": [
                {
                    "id": 89,
                    "code": "admin_users",
                    "name": "User Management",
                    "path": "/dashboard/admin/users",
                    "icon": "users",
                    "sort": 10,
                    "status": 1,
                    "visible": visible("admin.users.view"),
                    "is_external": False,
                    "permission_key": "admin.users.view",
                    "children": [],
                }
            ],
        },
        {
            "id": 4,
            "code": "projects",
            "name": "Project Management",
            "path": "/dashboard/projects",
            "icon": "folder-kanban",
            "sort": 18,
            "status": 1,
            "visible": visible("projects.module.view"),
            "is_external": False,
            "permission_key": "projects.module.view",
            "children": [],
        },
        {
            "id": 2,
            "code": "electromagnetic",
            "name": "Electromagnetic",
            "path": "/dashboard/electromagnetic",
            "icon": "zap",
            "sort": 20,
            "status": 1,
            "visible": visible("department.electromagnetic.view"),
            "is_external": False,
            "permission_key": "department.electromagnetic.view",
            "children": [
                {
                    "id": 21,
                    "code": "interference",
                    "name": "Interference",
                    "path": "/dashboard/electromagnetic/interference",
                    "icon": "radar",
                    "sort": 10,
                    "status": 1,
                    "visible": visible("department.interference.view")
                    and visible("interference.dashboard.view"),
                    "is_external": False,
                    "permission_key": "interference.dashboard.view",
                    "children": [],
                },
                {
                    "id": 211,
                    "code": "interference_datasets",
                    "name": "Datasets",
                    "path": "/dashboard/electromagnetic/interference/datasets",
                    "icon": "database",
                    "sort": 11,
                    "status": 1,
                    "visible": visible("interference.datahub.view"),
                    "is_external": False,
                    "permission_key": "interference.datahub.view",
                    "children": [],
                },
                {
                    "id": 212,
                    "code": "interference_tools",
                    "name": "Tools",
                    "path": "/dashboard/electromagnetic/interference/tools",
                    "icon": "box",
                    "sort": 12,
                    "status": 1,
                    "visible": visible("interference.tools.view"),
                    "is_external": False,
                    "permission_key": "interference.tools.view",
                    "children": [],
                },
                {
                    "id": 213,
                    "code": "interference_hosts",
                    "name": "Hosts",
                    "path": "/dashboard/electromagnetic/interference/hosts",
                    "icon": "server",
                    "sort": 13,
                    "status": 1,
                    "visible": visible("interference.hosts.view"),
                    "is_external": False,
                    "permission_key": "interference.hosts.view",
                    "children": [],
                },
                {
                    "id": 214,
                    "code": "interference_commands",
                    "name": "Command Audit",
                    "path": "/dashboard/electromagnetic/interference/commands",
                    "icon": "terminal",
                    "sort": 14,
                    "status": 1,
                    "visible": visible("interference.commands.view"),
                    "is_external": False,
                    "permission_key": "interference.commands.view",
                    "children": [],
                },
                {
                    "id": 22,
                    "code": "rse",
                    "name": "RSE",
                    "path": "/dashboard/electromagnetic/rse",
                    "icon": "beaker",
                    "sort": 20,
                    "status": 1,
                    "visible": visible("department.rse.view")
                    and visible("rse.dashboard.view"),
                    "is_external": False,
                    "permission_key": "rse.dashboard.view",
                    "children": [],
                },
                {
                    "id": 23,
                    "code": "emc",
                    "name": "EMC",
                    "path": "/dashboard/electromagnetic/emc",
                    "icon": "wave-square",
                    "sort": 30,
                    "status": 1,
                    "visible": visible("department.emc.view")
                    and visible("emc.dashboard.view"),
                    "is_external": False,
                    "permission_key": "emc.dashboard.view",
                    "children": [],
                },
            ],
        },
        {
            "id": 3,
            "code": "rf",
            "name": "RF",
            "path": "/dashboard/rf",
            "icon": "radio",
            "sort": 30,
            "status": 1,
            "visible": visible("department.rf.view")
            and visible("rf.dashboard.view"),
            "is_external": False,
            "permission_key": "rf.dashboard.view",
            "children": [],
        },
    ]

    visible_menu_items: list[dict] = []
    for item in menu_items:
        item["children"] = [child for child in item["children"] if child["visible"]]
        if item["visible"]:
            visible_menu_items.append(item)
    return visible_menu_items
