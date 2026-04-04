from __future__ import annotations

from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.api import BaselineModelViewSet
from apps.common.api_contract import BaselinePageNumberPagination, build_api_envelope
from apps.common.permissions import StaffPermission

from .admin_users_serializers import (
    AdminDepartmentOptionSerializer,
    AdminPasswordResetSerializer,
    AdminUserCreateSerializer,
    AdminUserRowSerializer,
    AdminUserUpdateSerializer,
    managed_department_queryset,
)
from .models import User


@extend_schema(tags=["Admin Users"])
class AdminUserViewSet(BaselineModelViewSet):
    """
    企业用户管理（仅工作人员 / 管理员可访问）。
    不提供物理删除，以禁用账号为主。
    """

    permission_classes = [IsAuthenticated, StaffPermission]
    pagination_class = BaselinePageNumberPagination
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = User.objects.all().select_related("department").order_by("-date_joined")
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(username__icontains=q) | Q(first_name__icontains=q))
        dept = self.request.query_params.get("department", "").strip()
        if dept:
            qs = qs.filter(department__code=dept)
        active = self.request.query_params.get("is_active", "").strip().lower()
        if active in ("true", "false", "1", "0"):
            qs = qs.filter(is_active=active in ("true", "1"))
        role = self.request.query_params.get("role", "").strip().lower()
        if role == "admin":
            qs = qs.filter(is_staff=True).exclude(is_superuser=True)
        elif role == "user":
            qs = qs.filter(is_staff=False, is_superuser=False)
        elif role == "superuser":
            qs = qs.filter(is_superuser=True)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return AdminUserCreateSerializer
        if self.action in ("partial_update", "update"):
            return AdminUserUpdateSerializer
        return AdminUserRowSerializer

    def get_object(self):
        obj = super().get_object()
        if obj.is_superuser and not self.request.user.is_superuser:
            raise PermissionDenied("无权管理超级管理员账号。")
        return obj

    def create(self, request, *args, **kwargs):
        ser = AdminUserCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        user = User(
            username=data["username"],
            first_name=(data.get("display_name") or "").strip(),
            email="",
            approve_status=User.APPROVE_APPROVED,
            is_active=data.get("is_active", True),
            is_staff=data["role"] == "admin",
            is_superuser=False,
            department=data.get("department"),
        )
        user.set_password(data["password"])
        user.save()
        return Response(
            build_api_envelope(
                data=AdminUserRowSerializer(user).data,
                code="created",
                message="用户已创建。",
            ),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        ser = AdminUserUpdateSerializer(
            data=request.data,
            partial=True,
            context={"request": request, "instance": instance},
        )
        ser.is_valid(raise_exception=True)
        ser.update(instance, ser.validated_data)
        instance.refresh_from_db()
        return self.success_response(
            data=AdminUserRowSerializer(instance).data,
            code="updated",
            message="用户信息已更新。",
        )

    @extend_schema(tags=["Admin Users"])
    @action(detail=False, methods=["get"], url_path="department_options")
    def department_options(self, request):
        qs = managed_department_queryset()
        return self.success_response(
            data=AdminDepartmentOptionSerializer(qs, many=True).data,
        )

    @extend_schema(tags=["Admin Users"])
    @action(detail=True, methods=["post"], url_path="reset_password")
    def reset_password(self, request, pk=None):
        user = self.get_object()
        ser = AdminPasswordResetSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user.set_password(ser.validated_data["password"])
        user.save(update_fields=["password"])
        return self.success_response(
            code="updated",
            message="密码已重置。",
        )
