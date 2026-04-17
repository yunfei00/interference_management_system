"""Shared Django settings for the interference management system."""

import os
from datetime import timedelta
from pathlib import Path

import environ
from corsheaders.defaults import default_headers
from django.utils.translation import gettext_lazy as _

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
)

env_file = BASE_DIR / ".env"
if env_file.exists():
    env.read_env(env_file)


SECRET_KEY = env("SECRET_KEY", default="django-insecure-dev-only-change-me")
DEBUG = env.bool("DEBUG", default=False)

ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=["127.0.0.1", "localhost", "testserver"],
)
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)
CORS_ALLOW_CREDENTIALS = env.bool("CORS_ALLOW_CREDENTIALS", default=True)
CORS_URLS_REGEX = r"^/api/.*$"
CORS_ALLOW_HEADERS = [*default_headers, "x-request-id"]


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "corsheaders",
    "whitenoise.runserver_nostatic",
    "django.contrib.staticfiles",
    "drf_spectacular",
    "apps.common.apps.CommonConfig",
    "apps.projects.apps.ProjectsConfig",
    "accounts.apps.AccountsConfig",
    "datahub.apps.DatahubConfig",
    "tool_management_project.apps.ToolManagementProjectConfig",
    "ops.apps.OpsConfig",
    "django_filters",
    "rest_framework",
]


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "accounts.middleware.login_required_middleware.LoginRequiredMiddleware",
    "accounts.middleware.permission_middleware.PermissionMiddleware",
]


ROOT_URLCONF = "config.urls"


TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default=f"sqlite:///{(BASE_DIR / 'db.sqlite3').as_posix()}",
    )
}
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)
if DATABASES["default"]["ENGINE"] == "django.db.backends.sqlite3":
    DATABASES["default"].setdefault("OPTIONS", {})
    DATABASES["default"]["OPTIONS"].setdefault(
        "timeout",
        env.int("SQLITE_TIMEOUT_SECONDS", default=30),
    )


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


LANGUAGE_CODE = "zh-hans"
LANGUAGES = [
    ("zh-hans", _("Simplified Chinese")),
    ("en", _("English")),
]
TIME_ZONE = "Asia/Shanghai"
USE_I18N = True
USE_TZ = True
LOCALE_PATHS = [BASE_DIR / "locale"]


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

LOGIN_URL = "/accounts/login/"
LOGIN_REDIRECT_URL = "/admin/"
LOGOUT_REDIRECT_URL = "/accounts/login/"
SUPPORTED_FRONTEND_MODES = ("django_templates", "separated_frontend")
API_PREFIX = "/api/"
API_V1_PREFIX = "/api/v1/"
LOGIN_WHITELIST_PATHS = ["/healthz/", "/api/"]
INGEST_API_KEY = env("INGEST_API_KEY", default="local-dev-ingest-key")

FIXTURE_DIRS = [BASE_DIR / "fixtures"]

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = Path(env("STATIC_ROOT", default=str(BASE_DIR / "staticfiles")))

MEDIA_URL = "/media/"
MEDIA_ROOT = Path(env("MEDIA_ROOT", default=str(BASE_DIR / "media")))
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

LOG_DIR = Path(env("LOG_DIR", default=str(BASE_DIR / "logs")))
LOG_DIR.mkdir(parents=True, exist_ok=True)

FRONTEND_APP_URL = env("FRONTEND_APP_URL", default="http://localhost:3000")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@interference.local")
PASSWORD_RESET_TOKEN_TTL_HOURS = env.int(
    "PASSWORD_RESET_TOKEN_TTL_HOURS",
    default=2,
)

if DEBUG:
    staticfiles_backend = "django.contrib.staticfiles.storage.StaticFilesStorage"
else:
    staticfiles_backend = "whitenoise.storage.CompressedManifestStaticFilesStorage"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": staticfiles_backend,
    },
}


DEFAULT_API_RENDERER_CLASSES: tuple[str, ...] = (
    "apps.common.api_contract.BaselineJSONRenderer",
)

if DEBUG:
    DEFAULT_API_RENDERER_CLASSES = (
        *DEFAULT_API_RENDERER_CLASSES,
        "rest_framework.renderers.BrowsableAPIRenderer",
    )


REST_FRAMEWORK = {
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.common.api_contract.BaselinePageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.BasicAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.common.api_contract.baseline_exception_handler",
    "DEFAULT_RENDERER_CLASSES": DEFAULT_API_RENDERER_CLASSES,
}


SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_ACCESS_LIFETIME_MINUTES", default=60)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=env.int("JWT_REFRESH_LIFETIME_DAYS", default=7)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Interference Management System API",
    "DESCRIPTION": "Backend API contract for the interference management system.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "TAGS": [
        {
            "name": "Authentication",
            "description": "JWT login, current-user, and menu endpoints.",
        },
        {
            "name": "Projects",
            "description": "Project management, tasks, milestones, attachments, and activity APIs.",
        },
        {
            "name": "Datahub",
            "description": "Datasets, measurements, uploads, and heatmaps.",
        },
        {
            "name": "Tools",
            "description": "Tool repository upload, listing, and download APIs.",
        },
        {
            "name": "Ops",
            "description": "Host inventory, metrics, and command execution APIs.",
        },
    ],
}


DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024 * 128
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024 * 128

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"


def build_file_logging_handler(
    filename: str,
    *,
    level: str,
    backup_count: int,
) -> dict[str, str | int]:
    handler: dict[str, str | int] = {
        "class": (
            "logging.FileHandler"
            if os.name == "nt"
            else "logging.handlers.TimedRotatingFileHandler"
        ),
        "filename": str(LOG_DIR / filename),
        "encoding": "utf-8",
        "formatter": "verbose",
        "level": level,
    }
    if handler["class"] == "logging.handlers.TimedRotatingFileHandler":
        handler["when"] = "midnight"
        handler["backupCount"] = backup_count
    return handler


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "%(asctime)s [%(levelname)s] %(name)s %(message)s",
        },
        "simple": {
            "format": "%(levelname)s %(name)s %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
            "level": "DEBUG" if DEBUG else "INFO",
        },
        "application_file": {
            **build_file_logging_handler(
                "application.log",
                level="INFO",
                backup_count=14,
            ),
        },
        "error_file": {
            **build_file_logging_handler(
                "error.log",
                level="ERROR",
                backup_count=30,
            ),
        },
        "security_file": {
            **build_file_logging_handler(
                "security.log",
                level="INFO",
                backup_count=30,
            ),
        },
    },
    "root": {
        "handlers": ["console", "application_file"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console", "application_file"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["error_file"],
            "level": "ERROR",
            "propagate": False,
        },
        "accounts": {
            "handlers": ["console", "application_file"],
            "level": "DEBUG" if DEBUG else "INFO",
            "propagate": False,
        },
        "apps.projects": {
            "handlers": ["console", "application_file"],
            "level": "DEBUG" if DEBUG else "INFO",
            "propagate": False,
        },
        "datahub": {
            "handlers": ["console", "application_file"],
            "level": "DEBUG" if DEBUG else "INFO",
            "propagate": False,
        },
        "tool_management_project": {
            "handlers": ["console", "application_file"],
            "level": "DEBUG" if DEBUG else "INFO",
            "propagate": False,
        },
        "ops": {
            "handlers": ["console", "application_file"],
            "level": "DEBUG" if DEBUG else "INFO",
            "propagate": False,
        },
        "security": {
            "handlers": ["console", "security_file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
