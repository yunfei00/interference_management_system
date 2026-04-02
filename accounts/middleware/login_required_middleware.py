from django.conf import settings
from django.shortcuts import redirect
from django.urls import NoReverseMatch, reverse

DEFAULT_WHITELIST_PREFIXES = [
    "/static",
    "/media",
    "/admin",
    "/favicon.ico",
    "/healthz",
    "/api",
    "/accounts",
]


class LoginRequiredMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.whitelist = list(DEFAULT_WHITELIST_PREFIXES)
        self.api_prefixes = [
            prefix
            for prefix in {
                getattr(settings, "API_PREFIX", "/api/"),
                getattr(settings, "API_V1_PREFIX", "/api/v1/"),
            }
            if prefix
        ]

        for name in getattr(
            settings,
            "LOGIN_WHITELIST_NAMES",
            ["login", "logout", "register", "password_reset"],
        ):
            try:
                url = reverse(name)
            except NoReverseMatch:
                continue
            if not url.endswith("/"):
                url = f"{url}/"
            self.whitelist.append(url)

        self.whitelist.extend(getattr(settings, "LOGIN_WHITELIST_PATHS", []))

    def __call__(self, request):
        path = request.path
        if any(path.startswith(prefix) for prefix in self.api_prefixes):
            return self.get_response(request)
        if any(path.startswith(prefix) for prefix in self.whitelist):
            return self.get_response(request)

        if not request.user.is_authenticated:
            login_url = getattr(settings, "LOGIN_URL", "/accounts/login/")
            return redirect(f"{login_url}?next={request.path}")

        return self.get_response(request)
