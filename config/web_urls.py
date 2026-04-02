"""Web routing for Django-rendered fallback pages and probes."""

from django.contrib import admin
from django.http import HttpResponse, JsonResponse
from django.urls import include, path
from django.views.generic import RedirectView

from apps.common.services.health import build_liveness_payload, build_readiness_payload

admin.site.site_header = "公司管理系统后台"
admin.site.site_title = "公司管理系统后台"
admin.site.index_title = "系统数据与初始化管理"


def healthz(_request):
    return HttpResponse("ok", content_type="text/plain")


def livez(_request):
    return JsonResponse(build_liveness_payload())


def readyz(_request):
    payload = build_readiness_payload()
    status = 200 if payload["status"] == "ok" else 503
    return JsonResponse(payload, status=status)


urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz/", healthz, name="healthz"),
    path("healthz/live/", livez, name="livez"),
    path("healthz/ready/", readyz, name="readyz"),
    path("accounts/", include("accounts.urls")),
    path("", RedirectView.as_view(url="/admin/", permanent=False)),
]
