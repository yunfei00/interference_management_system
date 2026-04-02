from __future__ import annotations

from typing import Iterable

from .models import User

DEPARTMENT_PERMISSIONS = {
    "department.electromagnetic.view",
    "department.interference.view",
    "department.rse.view",
    "department.emc.view",
    "department.rf.view",
}

INTERFERENCE_WORKSPACE_PERMISSIONS = {
    "datahub.view",
    "datahub.create",
    "datahub.upload",
    "tools.view",
    "tools.upload",
    "tools.download",
}

BASE_PERMISSIONS = {
    "overview.view",
    *DEPARTMENT_PERMISSIONS,
}

STAFF_PERMISSIONS = {
    "ops.host.view",
    "ops.host.manage",
    "ops.command.view",
    "ops.command.run",
}


def is_user_approved(user) -> bool:
    if not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    return getattr(user, "approve_status", User.APPROVE_APPROVED) == User.APPROVE_APPROVED


def get_user_department_codes(user) -> set[str]:
    department = getattr(user, "department", None)
    codes: set[str] = set()
    while department is not None:
        codes.add(department.code)
        department = department.parent
    return codes


def get_user_perm_keys(user) -> set[str]:
    if not is_user_approved(user):
        return set()

    permissions = {"overview.view"}

    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        permissions.update(DEPARTMENT_PERMISSIONS)
        permissions.update(INTERFERENCE_WORKSPACE_PERMISSIONS)
        permissions.update(STAFF_PERMISSIONS)
        return permissions

    department_codes = get_user_department_codes(user)

    if "electromagnetic" in department_codes:
        permissions.add("department.electromagnetic.view")
    if "interference" in department_codes:
        permissions.add("department.interference.view")
        permissions.update(INTERFERENCE_WORKSPACE_PERMISSIONS)
    if "rse" in department_codes:
        permissions.add("department.rse.view")
    if "emc" in department_codes:
        permissions.add("department.emc.view")
    if "rf" in department_codes:
        permissions.add("department.rf.view")

    return permissions


def user_has_permission(user, permission: str | Iterable[str]) -> bool:
    if getattr(user, "is_superuser", False):
        return True

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
            "name": "工作台",
            "path": "/dashboard",
            "icon": "gauge",
            "sort": 10,
            "status": 1,
            "visible": True,
            "is_external": False,
            "permission_key": "overview.view",
            "children": [],
        },
        {
            "id": 2,
            "code": "electromagnetic",
            "name": "电磁",
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
                    "name": "干扰",
                    "path": "/dashboard/electromagnetic/interference",
                    "icon": "radar",
                    "sort": 10,
                    "status": 1,
                    "visible": visible("department.interference.view"),
                    "is_external": False,
                    "permission_key": "department.interference.view",
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
                    "visible": visible("department.rse.view"),
                    "is_external": False,
                    "permission_key": "department.rse.view",
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
                    "visible": visible("department.emc.view"),
                    "is_external": False,
                    "permission_key": "department.emc.view",
                    "children": [],
                },
            ],
        },
        {
            "id": 3,
            "code": "rf",
            "name": "射频",
            "path": "/dashboard/rf",
            "icon": "radio",
            "sort": 30,
            "status": 1,
            "visible": visible("department.rf.view"),
            "is_external": False,
            "permission_key": "department.rf.view",
            "children": [],
        },
    ]

    visible_menu_items: list[dict] = []
    for item in menu_items:
        item["children"] = [child for child in item["children"] if child["visible"]]
        if item["visible"]:
            visible_menu_items.append(item)
    return visible_menu_items
