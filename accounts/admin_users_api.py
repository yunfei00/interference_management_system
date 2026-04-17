from __future__ import annotations

from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.common.api import BaselineAPIView, BaselineModelViewSet
from apps.common.api_contract import BaselinePageNumberPagination

from .admin_users_serializers import (
    AdminDepartmentSerializer,
    AdminDepartmentOptionSerializer,
    AdminPasswordResetSerializer,
    AdminRejectSerializer,
    AdminUserCreateSerializer,
    AdminUserDetailSerializer,
    AdminUserListSerializer,
    AdminUserUpdateSerializer,
    UserAuditLogSerializer,
    managed_department_queryset,
)
from .models import Department, User, UserAuditLog
from .permissions import is_user_admin
from .services import (
    admin_reset_password,
    approve_user,
    create_user_by_admin,
    disable_user,
    enable_user,
    reject_user,
    soft_delete_user,
    update_user_from_admin,
)


class AdminUserPermissionMixin:
    permission_classes = [IsAuthenticated]

    def check_permissions(self, request):
        super().check_permissions(request)
        if not is_user_admin(request.user):
            self.permission_denied(request, message="Administrator access is required.")


@extend_schema(tags=["Admin Users"])
class AdminUserViewSet(AdminUserPermissionMixin, BaselineModelViewSet):
    pagination_class = BaselinePageNumberPagination
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = User.objects.filter(is_deleted=False).select_related(
            "department",
            "approved_by",
            "created_by",
        )
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(username__icontains=q)
                | Q(real_name__icontains=q)
                | Q(email__icontains=q)
                | Q(phone__icontains=q)
            )

        status_value = self.request.query_params.get("status", "").strip().lower()
        if status_value:
            qs = qs.filter(approve_status=status_value)

        role = self.request.query_params.get("role", "").strip().lower()
        if role:
            qs = qs.filter(role=role)

        department_code = self.request.query_params.get("department", "").strip()
        if department_code:
            qs = qs.filter(department__code=department_code)

        pending_only = self.request.query_params.get("pending", "").strip().lower()
        if pending_only in {"1", "true", "yes"}:
            qs = qs.filter(approve_status=User.STATUS_PENDING)

        return qs.order_by("-created_at", "-id")

    def get_object(self):
        obj = super().get_object()
        if obj.is_deleted:
            self.permission_denied(self.request, message="This user has been deleted.")
        return obj

    def get_serializer_class(self):
        if self.action == "create":
            return AdminUserCreateSerializer
        if self.action in {"partial_update", "update"}:
            return AdminUserUpdateSerializer
        if self.action == "retrieve":
            return AdminUserDetailSerializer
        return AdminUserListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user, temporary_password = create_user_by_admin(
            operator=request.user,
            data=serializer.validated_data,
            request=request,
        )
        data = AdminUserDetailSerializer(user).data
        if temporary_password:
            data = {**data, "temporary_password": temporary_password}
        return self.success_response(
            data=data,
            code="created",
            message="User created successfully.",
            status_code=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(
            data=request.data,
            partial=True,
            context={"request": request, "instance": instance},
        )
        serializer.is_valid(raise_exception=True)
        user = update_user_from_admin(
            target=instance,
            operator=request.user,
            data=serializer.validated_data,
            request=request,
        )
        return self.success_response(
            data=AdminUserDetailSerializer(user).data,
            code="updated",
            message="User updated successfully.",
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        soft_delete_user(target=instance, operator=request.user, request=request)
        return self.success_response(code="deleted", message="User deleted successfully.")

    @action(detail=False, methods=["get"], url_path="department-options")
    def department_options(self, request):
        qs = managed_department_queryset()
        return self.success_response(
            data=AdminDepartmentOptionSerializer(qs, many=True).data
        )

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        user = approve_user(target=self.get_object(), operator=request.user, request=request)
        return self.success_response(
            data=AdminUserDetailSerializer(user).data,
            message="User approved successfully.",
        )

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        serializer = AdminRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = reject_user(
            target=self.get_object(),
            operator=request.user,
            reason=serializer.validated_data["reason"],
            request=request,
        )
        return self.success_response(
            data=AdminUserDetailSerializer(user).data,
            message="User rejected successfully.",
        )

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        serializer = AdminPasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        temporary_password = admin_reset_password(
            target=self.get_object(),
            operator=request.user,
            request=request,
            new_password=serializer.validated_data.get("new_password") or None,
        )
        return self.success_response(
            data={"temporary_password": temporary_password},
            message="Password reset successfully.",
        )

    @action(detail=True, methods=["post"], url_path="enable")
    def enable(self, request, pk=None):
        user = enable_user(target=self.get_object(), operator=request.user, request=request)
        return self.success_response(
            data=AdminUserDetailSerializer(user).data,
            message="User enabled successfully.",
        )

    @action(detail=True, methods=["post"], url_path="disable")
    def disable(self, request, pk=None):
        user = disable_user(target=self.get_object(), operator=request.user, request=request)
        return self.success_response(
            data=AdminUserDetailSerializer(user).data,
            message="User disabled successfully.",
        )


class UserAuditLogListAPIView(AdminUserPermissionMixin, BaselineAPIView):
    pagination_class = BaselinePageNumberPagination

    @extend_schema(tags=["Admin Users"])
    def get(self, request):
        queryset = UserAuditLog.objects.select_related("user", "operator").all()
        action = request.query_params.get("action", "").strip()
        if action:
            queryset = queryset.filter(action=action)

        user_id = request.query_params.get("user", "").strip()
        if user_id.isdigit():
            queryset = queryset.filter(user_id=int(user_id))

        operator_id = request.query_params.get("operator", "").strip()
        if operator_id.isdigit():
            queryset = queryset.filter(operator_id=int(operator_id))

        keyword = request.query_params.get("q", "").strip()
        if keyword:
            queryset = queryset.filter(
                Q(user__username__icontains=keyword)
                | Q(operator__username__icontains=keyword)
                | Q(action__icontains=keyword)
            )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset.order_by("-created_at", "-id"), request)
        serializer = UserAuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


@extend_schema(tags=["Admin Users"])
class AdminDepartmentViewSet(AdminUserPermissionMixin, BaselineModelViewSet):
    pagination_class = BaselinePageNumberPagination
    queryset = Department.objects.select_related("parent").all().order_by("sort", "id")
    serializer_class = AdminDepartmentSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        keyword = self.request.query_params.get("q", "").strip()
        if keyword:
            qs = qs.filter(Q(name__icontains=keyword) | Q(code__icontains=keyword))
        active = self.request.query_params.get("active", "").strip().lower()
        if active in {"1", "true", "yes"}:
            qs = qs.filter(is_active=True)
        if active in {"0", "false", "no"}:
            qs = qs.filter(is_active=False)
        return qs
