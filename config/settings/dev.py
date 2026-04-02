"""Development settings."""

from .base import *  # noqa: F403,F401

DEBUG = True

if not globals().get("ALLOWED_HOSTS"):  # noqa: F405
    ALLOWED_HOSTS = ["127.0.0.1", "localhost"]  # noqa: F405

INSTALLED_APPS = [*INSTALLED_APPS, "django_extensions"]  # noqa: F405

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
