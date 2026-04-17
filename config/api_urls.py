"""API routing for the Next.js frontend and external clients."""

from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework import routers

from accounts.admin_users_api import (
    AdminDepartmentViewSet,
    AdminUserViewSet,
    UserAuditLogListAPIView,
)
from accounts.api_auth import (
    BaselineTokenRefreshView,
    ChangePasswordAPIView,
    CurrentUserAPIView,
    CurrentUserMenuAPIView,
    ForgotPasswordAPIView,
    LoginAPIView,
    LogoutAPIView,
    RegisterAPIView,
    RegistrationDepartmentListView,
    ResetPasswordConfirmAPIView,
)
from apps.projects.urls import urlpatterns as project_urlpatterns
from datahub.api import DatasetViewSet
from ops.api import BatchCommandAPIView, CommandTaskViewSet, HostViewSet
from tool_management_project.api import ToolVersionViewSet, ToolViewSet


def build_v1_router():
    router = routers.DefaultRouter()
    router.register("datasets", DatasetViewSet, basename="dataset")
    router.register("tools", ToolViewSet, basename="tool")
    router.register("versions", ToolVersionViewSet, basename="version")
    router.register("hosts", HostViewSet, basename="host")
    router.register("commands", CommandTaskViewSet, basename="command")
    router.register("admin/users", AdminUserViewSet, basename="admin_user_v1")
    router.register("admin/departments", AdminDepartmentViewSet, basename="admin_department_v1")
    return router


def build_unversioned_router():
    router = routers.DefaultRouter()
    router.register("admin/users", AdminUserViewSet, basename="admin_user")
    router.register("admin/departments", AdminDepartmentViewSet, basename="admin_department")
    return router


v1_router = build_v1_router()
unversioned_router = build_unversioned_router()


def build_legacy_tools_router():
    router = routers.DefaultRouter()
    router.register("tools", ToolViewSet, basename="legacy_tool")
    return router


legacy_tools_router = build_legacy_tools_router()


auth_patterns = [
    path("auth/register/departments/", RegistrationDepartmentListView.as_view(), name="api_auth_register_departments"),
    path("auth/register/", RegisterAPIView.as_view(), name="api_auth_register"),
    path("auth/login/", LoginAPIView.as_view(), name="api_auth_login"),
    path("auth/token/", LoginAPIView.as_view(), name="api_auth_token_login"),
    path("auth/logout/", LogoutAPIView.as_view(), name="api_auth_logout"),
    path("auth/me/", CurrentUserAPIView.as_view(), name="api_auth_me"),
    path("auth/menus/", CurrentUserMenuAPIView.as_view(), name="api_auth_menus"),
    path("auth/change-password/", ChangePasswordAPIView.as_view(), name="api_auth_change_password"),
    path("auth/forgot-password/", ForgotPasswordAPIView.as_view(), name="api_auth_forgot_password"),
    path(
        "auth/reset-password/confirm/",
        ResetPasswordConfirmAPIView.as_view(),
        name="api_auth_reset_password_confirm",
    ),
    path(
        "auth/token/refresh/",
        BaselineTokenRefreshView.as_view(),
        name="api_auth_token_refresh",
    ),
    path(
        "admin/user-audit-logs/",
        UserAuditLogListAPIView.as_view(),
        name="api_admin_user_audit_logs",
    ),
]

v1_auth_patterns = [
    path("v1/auth/register/departments/", RegistrationDepartmentListView.as_view(), name="api_v1_auth_register_departments"),
    path("v1/auth/register/", RegisterAPIView.as_view(), name="api_v1_auth_register"),
    path("v1/auth/login/", LoginAPIView.as_view(), name="api_v1_auth_login"),
    path("v1/auth/token/", LoginAPIView.as_view(), name="api_v1_auth_token_login"),
    path("v1/auth/logout/", LogoutAPIView.as_view(), name="api_v1_auth_logout"),
    path("v1/auth/me/", CurrentUserAPIView.as_view(), name="api_v1_auth_me"),
    path("v1/auth/menus/", CurrentUserMenuAPIView.as_view(), name="api_v1_auth_menus"),
    path("v1/auth/change-password/", ChangePasswordAPIView.as_view(), name="api_v1_auth_change_password"),
    path("v1/auth/forgot-password/", ForgotPasswordAPIView.as_view(), name="api_v1_auth_forgot_password"),
    path(
        "v1/auth/reset-password/confirm/",
        ResetPasswordConfirmAPIView.as_view(),
        name="api_v1_auth_reset_password_confirm",
    ),
    path(
        "v1/auth/token/refresh/",
        BaselineTokenRefreshView.as_view(),
        name="api_v1_auth_token_refresh",
    ),
    path(
        "v1/admin/user-audit-logs/",
        UserAuditLogListAPIView.as_view(),
        name="api_v1_admin_user_audit_logs",
    ),
]


urlpatterns = [
    path("schema/", SpectacularAPIView.as_view(), name="api_schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="api_schema"), name="api_docs"),
    path("redoc/", SpectacularRedocView.as_view(url_name="api_schema"), name="api_redoc"),
    *auth_patterns,
    *v1_auth_patterns,
    path("v1/commands/batch/", BatchCommandAPIView.as_view(), name="api_v1_batch_commands"),
    path("", include((project_urlpatterns, "projects"), namespace="projects")),
    path("v1/", include((project_urlpatterns, "projects"), namespace="projects_v1")),
    path("", include(legacy_tools_router.urls)),
    path("", include(unversioned_router.urls)),
    path("v1/", include(v1_router.urls)),
]
