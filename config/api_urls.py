"""API routing for the Next.js frontend and external clients."""

from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework import routers

from accounts.api_auth import (
    BaselineTokenObtainPairView,
    BaselineTokenRefreshView,
    CurrentUserAPIView,
    CurrentUserMenuAPIView,
    RegisterAPIView,
    RegistrationDepartmentListView,
)
from datahub.api import DatasetViewSet
from ops.api import BatchCommandAPIView, CommandTaskViewSet, HostViewSet
from tool_management_project.api import ToolViewSet


def build_api_router():
    router = routers.DefaultRouter()
    router.register("datasets", DatasetViewSet, basename="dataset")
    router.register("tools", ToolViewSet, basename="tool")
    router.register("hosts", HostViewSet, basename="host")
    router.register("commands", CommandTaskViewSet, basename="command")
    return router


v1_router = build_api_router()


urlpatterns = [
    path("schema/", SpectacularAPIView.as_view(), name="api_schema"),
    path(
        "docs/",
        SpectacularSwaggerView.as_view(url_name="api_schema"),
        name="api_docs",
    ),
    path(
        "redoc/",
        SpectacularRedocView.as_view(url_name="api_schema"),
        name="api_redoc",
    ),
    path(
        "v1/auth/register/departments/",
        RegistrationDepartmentListView.as_view(),
        name="api_v1_auth_register_departments",
    ),
    path(
        "v1/auth/register/",
        RegisterAPIView.as_view(),
        name="api_v1_auth_register",
    ),
    path("v1/auth/token/", BaselineTokenObtainPairView.as_view(), name="api_v1_token"),
    path(
        "v1/auth/token/refresh/",
        BaselineTokenRefreshView.as_view(),
        name="api_v1_token_refresh",
    ),
    path("v1/auth/me/", CurrentUserAPIView.as_view(), name="api_v1_auth_me"),
    path("v1/auth/menus/", CurrentUserMenuAPIView.as_view(), name="api_v1_auth_menus"),
    path(
        "v1/commands/batch/",
        BatchCommandAPIView.as_view(),
        name="api_v1_batch_commands",
    ),
    path("v1/", include(v1_router.urls)),
]
