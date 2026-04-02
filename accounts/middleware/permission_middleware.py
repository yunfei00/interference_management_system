from django.utils.functional import SimpleLazyObject

from accounts.permissions import get_user_perm_keys


class PermissionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.perm_keys = SimpleLazyObject(lambda: get_user_perm_keys(request.user))
        return self.get_response(request)
