from __future__ import annotations

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from apps.common.api import BaselineAPIView, build_frontend_modes
from apps.common.api_contract import build_api_envelope
from apps.common.api_contract import BaselineJSONRenderer

from .models import Department
from .permissions import get_user_perm_keys
from .selectors import build_current_user_menu_tree
from .serializers import (
    ChangePasswordSerializer,
    DepartmentRegistrationOptionSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    PublicRegisterSerializer,
    ResetPasswordConfirmSerializer,
    UserSerializer,
)
from .services import (
    authenticate_user_for_login,
    change_own_password,
    update_login_metadata,
)


class BaselineTokenRefreshView(TokenRefreshView):
    serializer_class = TokenRefreshSerializer

    def get_permissions(self):
        return [AllowAny()]

    def get_renderers(self):
        return [BaselineJSONRenderer()]

    @extend_schema(
        tags=["Authentication"],
        summary="Refresh JWT access token",
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class LoginAPIView(BaselineAPIView):
    permission_classes = (AllowAny,)

    @extend_schema(
        tags=["Authentication"],
        summary="Login with username or email and password",
        request=LoginSerializer,
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        identifier = serializer.validated_data["identifier"]
        password = serializer.validated_data["password"]
        try:
            user = authenticate_user_for_login(identifier, password)
        except AuthenticationFailed as exc:
            code = exc.get_codes()
            if isinstance(code, list) and code:
                code = code[0]
            return Response(
                build_api_envelope(
                    data=None,
                    success=False,
                    code=str(code),
                    message=str(exc.detail),
                ),
                status=status.HTTP_401_UNAUTHORIZED,
            )
        refresh = RefreshToken.for_user(user)
        update_login_metadata(user, request)

        return self.success_response(
            data={
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
                "permissions": sorted(get_user_perm_keys(user)),
                "frontend_modes": build_frontend_modes(),
            },
            message="Login successful.",
        )


class LogoutAPIView(BaselineAPIView):
    permission_classes = (AllowAny,)

    @extend_schema(
        tags=["Authentication"],
        summary="Logout current session",
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request):
        return self.success_response(message="Logout successful.")


class CurrentUserAPIView(BaselineAPIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        tags=["Authentication"],
        summary="Get current user session",
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
        summary="Get current user navigation menus",
        responses=OpenApiTypes.OBJECT,
    )
    def get(self, request):
        return self.success_response(data=build_current_user_menu_tree(request.user))


class RegistrationDepartmentListView(BaselineAPIView):
    permission_classes = (AllowAny,)

    @extend_schema(
        tags=["Authentication"],
        summary="Get available departments for self registration",
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
        summary="Self registration",
        request=PublicRegisterSerializer,
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request):
        serializer = PublicRegisterSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return self.success_response(
            data={"username": user.username},
            code="created",
            message="Registration submitted successfully. Please wait for administrator approval.",
            status_code=status.HTTP_201_CREATED,
        )


class ChangePasswordAPIView(BaselineAPIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        tags=["Authentication"],
        summary="Change current user password",
        request=ChangePasswordSerializer,
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        change_own_password(
            user=request.user,
            current_password=serializer.validated_data["current_password"],
            new_password=serializer.validated_data["new_password"],
            request=request,
        )
        return self.success_response(message="Password updated successfully.")


class ForgotPasswordAPIView(BaselineAPIView):
    permission_classes = (AllowAny,)

    @extend_schema(
        tags=["Authentication"],
        summary="Request password reset email",
        request=ForgotPasswordSerializer,
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return self.success_response(
            message="If the account exists, a password reset email has been sent."
        )


class ResetPasswordConfirmAPIView(BaselineAPIView):
    permission_classes = (AllowAny,)

    @extend_schema(
        tags=["Authentication"],
        summary="Confirm password reset token",
        request=ResetPasswordConfirmSerializer,
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request):
        serializer = ResetPasswordConfirmSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return self.success_response(message="Password reset successfully.")
