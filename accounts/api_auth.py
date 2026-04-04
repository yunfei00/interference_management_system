from __future__ import annotations

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.common.api import BaselineAPIView, build_frontend_modes
from apps.common.api_contract import BaselineJSONRenderer

from .models import Department
from .permissions import get_user_perm_keys, is_user_approved
from .selectors import build_current_user_menu_tree
from .serializers import (
    DepartmentRegistrationOptionSerializer,
    PublicRegisterSerializer,
    UserSerializer,
)


class BaselineTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.get_username()
        token["is_staff"] = user.is_staff
        token["is_superuser"] = user.is_superuser
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        if not getattr(self.user, "is_active", True):
            raise AuthenticationFailed("账号已被禁用，请联系管理员。", code="account_disabled")
        if not is_user_approved(self.user):
            raise AuthenticationFailed("账号尚未审批通过。", code="not_approved")

        data["user"] = UserSerializer(self.user).data
        data["permissions"] = sorted(get_user_perm_keys(self.user))
        data["frontend_modes"] = build_frontend_modes()
        return data


class BaselineTokenObtainPairView(TokenObtainPairView):
    serializer_class = BaselineTokenObtainPairSerializer

    def get_permissions(self):
        return [AllowAny()]

    def get_renderers(self):
        return [BaselineJSONRenderer()]

    @extend_schema(
        tags=["Authentication"],
        summary="使用用户名和密码换取 JWT",
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class BaselineTokenRefreshView(TokenRefreshView):
    def get_permissions(self):
        return [AllowAny()]

    def get_renderers(self):
        return [BaselineJSONRenderer()]

    @extend_schema(
        tags=["Authentication"],
        summary="刷新访问令牌",
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class CurrentUserAPIView(BaselineAPIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        tags=["Authentication"],
        summary="获取当前登录用户会话",
        responses=OpenApiTypes.OBJECT,
    )
    def get(self, request):
        return self.success_response(
            data={
                "user": UserSerializer(request.user).data,
                "permissions": sorted(get_user_perm_keys(request.user)),
                "frontend_modes": build_frontend_modes(),
            }
        )


class CurrentUserMenuAPIView(BaselineAPIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        tags=["Authentication"],
        summary="获取当前用户可见导航菜单",
        responses=OpenApiTypes.OBJECT,
    )
    def get(self, request):
        return self.success_response(data=build_current_user_menu_tree(request.user))


class RegistrationDepartmentListView(BaselineAPIView):
    permission_classes = (AllowAny,)

    @extend_schema(
        tags=["Authentication"],
        summary="注册页可选部门列表",
        responses=OpenApiTypes.OBJECT,
    )
    def get(self, request):
        qs = (
            Department.objects.filter(
                is_active=True,
                department_type=Department.TYPE_DEPARTMENT,
            )
            .select_related("parent")
            .order_by("sort", "id")
        )
        data = DepartmentRegistrationOptionSerializer(qs, many=True).data
        return self.success_response(data=data)


class RegisterAPIView(BaselineAPIView):
    permission_classes = (AllowAny,)

    @extend_schema(
        tags=["Authentication"],
        summary="自助注册",
        request=PublicRegisterSerializer,
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request):
        serializer = PublicRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return self.success_response(
            data={"username": user.username},
            code="created",
            message="注册成功，请等待管理员审批后再登录。",
            status_code=status.HTTP_201_CREATED,
        )
