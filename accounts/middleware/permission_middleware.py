# system/middleware/permission_middleware.py
from django.utils.functional import SimpleLazyObject

def _get_perm_set(user):
    if not getattr(user, "is_authenticated", False):
        return set()
    if getattr(user, "is_superuser", False):
        return {"*"}  # 超管全权

    # --- 兼容两种模型结构 ---
    if hasattr(user, "roles"):  # M2M: User.roles -> Role.permissions
        qs = (user.roles
                  .prefetch_related("permissions")
                  .values_list("permissions__key", flat=True))
        return set(k for k in qs if k)

    if hasattr(user, "role") and getattr(user, "role", None):  # FK: User.role -> Role.permissions
        qs = user.role.permissions.values_list("key", flat=True)
        return set(k for k in qs if k)

    # 没配角色
    return set()

class PermissionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    def __call__(self, request):
        request.perm_keys = SimpleLazyObject(lambda: _get_perm_set(request.user))
        return self.get_response(request)
