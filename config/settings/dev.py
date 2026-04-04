"""Development settings."""

from .base import *  # noqa: F403,F401

DEBUG = True

# HTTP 局域网下的 cookie / CSRF（勿用于生产）
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

# 合并局域网调试主机：在 .env 中设置 EXTRA_ALLOWED_HOSTS=192.168.x.x（逗号分隔）
_extra_hosts = env.list("EXTRA_ALLOWED_HOSTS", default=[])  # noqa: F405
ALLOWED_HOSTS = list(
    dict.fromkeys([*ALLOWED_HOSTS, *_extra_hosts, "127.0.0.1", "localhost"]),
)

# 浏览器从 http://<LAN_IP>:3000 访问 Next 再代理到 Django时使用（仅开发默认值 + .env 合并）
_default_fe_origins = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://192.168.3.90:3000",
    "http://192.168.186.1:3000",
]
_lan_origins = env.list("LAN_FRONTEND_ORIGINS", default=[])  # noqa: F405
CSRF_TRUSTED_ORIGINS = list(
    dict.fromkeys([*_default_fe_origins, *CSRF_TRUSTED_ORIGINS, *_lan_origins]),
)
CORS_ALLOWED_ORIGINS = list(
    dict.fromkeys([*_default_fe_origins, *CORS_ALLOWED_ORIGINS, *_lan_origins]),
)

INSTALLED_APPS = [*INSTALLED_APPS, "django_extensions"]  # noqa: F405

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
