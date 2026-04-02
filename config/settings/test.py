"""Test settings."""

from . import base as base_settings
from .base import *  # noqa: F403,F401

DEBUG = False
SECRET_KEY = "test-secret-key-should-be-at-least-thirty-two-bytes"
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]

test_database_url = base_settings.env("TEST_DATABASE_URL", default="")
if test_database_url:
    DATABASES = {"default": base_settings.env.db("TEST_DATABASE_URL")}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": base_settings.BASE_DIR / "test_db.sqlite3",
        }
    }

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

STORAGES = {
    **base_settings.STORAGES,
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}
