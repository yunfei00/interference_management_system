from pathlib import Path

from django.conf import settings
from django.db import connections
from django.db.utils import OperationalError


def _database_health():
    try:
        with connections["default"].cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except OperationalError as exc:
        return {"ok": False, "detail": str(exc)}
    return {"ok": True, "detail": "database ok"}


def _path_health(path):
    target = Path(path)
    return {
        "ok": target.exists(),
        "detail": str(target),
    }


def build_liveness_payload():
    return {
        "status": "ok",
        "service": "django-next-baseline",
    }


def build_readiness_payload():
    checks = {
        "database": _database_health(),
        "media_root": _path_health(settings.MEDIA_ROOT),
        "log_dir": _path_health(settings.LOG_DIR),
    }
    overall_ok = all(item["ok"] for item in checks.values())
    return {
        "status": "ok" if overall_ok else "error",
        "service": "django-next-baseline",
        "checks": checks,
    }
