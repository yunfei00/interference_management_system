"""Production settings."""

from .base import *  # noqa: F403,F401

DEBUG = False

if not ALLOWED_HOSTS:  # noqa: F405
    raise RuntimeError("ALLOWED_HOSTS is required for production settings")
if SECRET_KEY == "django-insecure-dev-only-change-me":  # noqa: F405
    raise RuntimeError("Please set a secure SECRET_KEY for production settings")

STATICFILES_DIRS = []  # noqa: F405

USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=True)  # noqa: F405
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=True)  # noqa: F405
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)  # noqa: F405
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool(  # noqa: F405
    "SECURE_HSTS_INCLUDE_SUBDOMAINS",
    default=True,
)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=True)  # noqa: F405
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"
