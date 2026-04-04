from rest_framework.permissions import SAFE_METHODS, BasePermission

from accounts.permissions import is_user_approved, user_has_permission


class ApprovedUserPermission(BasePermission):
    message = "Approved authentication is required."

    def has_permission(self, request, _view):
        return is_user_approved(request.user)


class StaffPermission(BasePermission):
    message = "Staff access is required."

    def has_permission(self, request, _view):
        user = request.user
        return is_user_approved(user) and (
            getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)
        )


class MappedPermission(BasePermission):
    message = "Permission denied."

    def has_permission(self, request, view):
        user = request.user
        if not is_user_approved(user):
            return False

        required_permissions = self._get_required_permissions(request, view)
        if not required_permissions:
            return True

        return user_has_permission(user, required_permissions)

    def _get_required_permissions(self, request, view):
        permission_map = getattr(view, "permission_map", {})
        action = getattr(view, "action", None) or request.method.lower()
        required = permission_map.get(action) or permission_map.get(
            request.method.lower()
        )
        if not required:
            return []
        if isinstance(required, str):
            return [required]
        return list(required)


class HostWorkspacePermission(BasePermission):
    message = "主机管理接口需要干扰子部门主机权限，或管理员权限。"

    def has_permission(self, request, view):
        if not is_user_approved(request.user):
            return False
        user = request.user
        if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
            return True
        if getattr(view, "action", None) == "run_command":
            return False
        if request.method in SAFE_METHODS:
            return user_has_permission(
                user,
                ["department.interference.view", "interference.hosts.view"],
            )
        return False


class CommandAuditPermission(BasePermission):
    message = "命令审计查询需要干扰子部门审计权限，或管理员权限。"

    def has_permission(self, request, view):
        if not is_user_approved(request.user):
            return False
        user = request.user
        if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
            return True
        return user_has_permission(
            user,
            ["department.interference.view", "interference.commands.view"],
        )
