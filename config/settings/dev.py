"""Development settings."""

from .base import *  # noqa: F403,F401

DEBUG = True

# 合并局域网调试主机：在 .env 中设置 EXTRA_ALLOWED_HOSTS=192.168.x.x（逗号分隔）
_extra_hosts = env.list("EXTRA_ALLOWED_HOSTS", default=[])  # noqa: F405
ALLOWED_HOSTS = list(
    dict.fromkeys([*ALLOWED_HOSTS, *_extra_hosts, "127.0.0.1", "localhost"]),
)

# 浏览器从 http://<LAN_IP>:3000 访问 Next 再代理到 Django 时，按需信任来源（仅开发）
_lan_origins = env.list("LAN_FRONTEND_ORIGINS", default=[])  # noqa: F405
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys([*CSRF_TRUSTED_ORIGINS, *_lan_origins]))
CORS_ALLOWED_ORIGINS = list(dict.fromkeys([*CORS_ALLOWED_ORIGINS, *_lan_origins]))

INSTALLED_APPS = [*INSTALLED_APPS, "django_extensions"]  # noqa: F405

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
