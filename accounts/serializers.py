from __future__ import annotations

from django.db.models import Q
from rest_framework import serializers

from .models import Department, User
from .services import confirm_password_reset, register_user, request_password_reset


def active_registration_departments():
    return Department.objects.filter(
        is_active=True,
        department_type=Department.TYPE_DEPARTMENT,
    ).select_related("parent")


class UserSerializer(serializers.ModelSerializer):
    department = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    department_code = serializers.SerializerMethodField()
    department_full_name = serializers.SerializerMethodField()
    department_page_path = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()
    status = serializers.CharField(source="approve_status", read_only=True)
    status_name = serializers.SerializerMethodField()
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    approved_by = serializers.PrimaryKeyRelatedField(read_only=True)
    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "real_name",
            "display_name",
            "phone",
            "company",
            "title",
            "department",
            "department_name",
            "department_code",
            "department_full_name",
            "department_page_path",
            "role",
            "role_name",
            "status",
            "status_name",
            "approve_status",
            "must_change_password",
            "rejection_reason",
            "is_active",
            "is_staff",
            "is_superuser",
            "last_login",
            "last_login_ip",
            "last_login_user_agent",
            "approved_by",
            "approved_at",
            "created_by",
            "is_deleted",
            "created_at",
            "updated_at",
            "date_joined",
        ]
        read_only_fields = fields

    def get_department(self, obj: User) -> int | None:
        return obj.department_id

    def get_department_name(self, obj: User) -> str | None:
        return obj.department.name if obj.department else None

    def get_department_code(self, obj: User) -> str | None:
        return obj.department.code if obj.department else None

    def get_department_full_name(self, obj: User) -> str | None:
        return obj.department.full_name if obj.department else None

    def get_department_page_path(self, obj: User) -> str | None:
        return obj.department.page_path if obj.department else None

    def get_role_name(self, obj: User) -> str:
        if obj.role == User.ROLE_SUPER_ADMIN:
            return "Super Admin"
        if obj.role == User.ROLE_ADMIN:
            return "Admin"
        return "User"

    def get_status_name(self, obj: User) -> str:
        return dict(User.STATUS_CHOICES).get(obj.status, obj.status)


class DepartmentRegistrationOptionSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ["id", "code", "full_name"]

    def get_full_name(self, obj: Department) -> str:
        return obj.full_name


class PublicRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    real_name = serializers.CharField(max_length=150)
    company = serializers.CharField(max_length=200, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    title = serializers.CharField(max_length=120, required=False, allow_blank=True)
    department = serializers.PrimaryKeyRelatedField(
        queryset=active_registration_departments(),
        required=False,
        allow_null=True,
    )
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Username cannot be empty.")
        if User.objects.filter(username__iexact=cleaned).exists():
            raise serializers.ValidationError("This username is already in use.")
        return cleaned

    def validate_email(self, value: str) -> str:
        cleaned = value.strip().lower()
        if User.objects.filter(email__iexact=cleaned).exists():
            raise serializers.ValidationError("This email is already in use.")
        return cleaned

    def validate_real_name(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Real name is required.")
        return cleaned

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": ["The two password entries do not match."]}
            )
        return attrs

    def create(self, validated_data: dict) -> User:
        validated_data.pop("confirm_password")
        request = self.context.get("request")
        return register_user(data=validated_data, request=request)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, allow_blank=True)
    identifier = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, allow_blank=False)

    def validate(self, attrs: dict) -> dict:
        identifier = (attrs.get("identifier") or attrs.get("username") or "").strip()
        password = attrs.get("password") or ""
        if not identifier or not password:
            raise serializers.ValidationError("Username and password are required.")
        attrs["identifier"] = identifier
        attrs["password"] = password
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs: dict) -> dict:
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": ["The two password entries do not match."]}
            )
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def create(self, validated_data: dict) -> dict:
        request_password_reset(email=validated_data["email"], request=self.context.get("request"))
        return {"message": "If the email exists, a reset link has been sent."}


class ResetPasswordConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs: dict) -> dict:
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": ["The two password entries do not match."]}
            )
        return attrs

    def save(self, **kwargs):
        return confirm_password_reset(
            uid=self.validated_data["uid"],
            token=self.validated_data["token"],
            new_password=self.validated_data["new_password"],
            request=self.context.get("request"),
        )


class DepartmentQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=True)

    def filter_queryset(self):
        queryset = active_registration_departments()
        q = (self.validated_data.get("q") or "").strip()
        if q:
            queryset = queryset.filter(Q(name__icontains=q) | Q(code__icontains=q))
        return queryset
