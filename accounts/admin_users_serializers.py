from __future__ import annotations

from rest_framework import serializers

from .models import Department, User, UserAuditLog
from .serializers import UserSerializer
from .services import get_user_role, validate_new_password

MANAGED_DEPARTMENT_CODES = ("interference", "rse", "emc", "rf")


def managed_department_queryset():
    return Department.objects.filter(
        code__in=MANAGED_DEPARTMENT_CODES,
        is_active=True,
        department_type=Department.TYPE_DEPARTMENT,
    ).order_by("sort", "id")


class AdminDepartmentOptionSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ["id", "code", "full_name"]

    def get_full_name(self, obj: Department) -> str:
        return obj.full_name


class AdminUserListSerializer(UserSerializer):
    class Meta(UserSerializer.Meta):
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
            "approved_by",
            "approved_at",
            "last_login",
            "last_login_ip",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AdminUserDetailSerializer(UserSerializer):
    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields
        read_only_fields = fields


class AdminUserCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    real_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    company = serializers.CharField(max_length=200, required=False, allow_blank=True)
    title = serializers.CharField(max_length=120, required=False, allow_blank=True)
    department = serializers.PrimaryKeyRelatedField(
        queryset=managed_department_queryset(),
        required=False,
        allow_null=True,
    )
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, default=User.ROLE_USER)
    status = serializers.ChoiceField(choices=User.STATUS_CHOICES, default=User.STATUS_APPROVED)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    must_change_password = serializers.BooleanField(required=False, default=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

    def validate_username(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Username cannot be empty.")
        if User.objects.filter(username__iexact=cleaned).exists():
            raise serializers.ValidationError("This username is already in use.")
        return cleaned

    def validate_email(self, value: str | None) -> str | None:
        cleaned = (value or "").strip().lower() or None
        if cleaned and User.objects.filter(email__iexact=cleaned).exists():
            raise serializers.ValidationError("This email is already in use.")
        return cleaned

    def validate(self, attrs: dict) -> dict:
        operator = self.context["request"].user
        role = attrs.get("role", User.ROLE_USER)
        if role == User.ROLE_SUPER_ADMIN and get_user_role(operator) != User.ROLE_SUPER_ADMIN:
            raise serializers.ValidationError({"role": ["Only super administrators can assign this role."]})

        password = (attrs.get("password") or "").strip()
        if password:
            validate_new_password(password)

        if attrs.get("status") == User.STATUS_REJECTED and not (attrs.get("rejection_reason") or "").strip():
            raise serializers.ValidationError({"rejection_reason": ["Rejection reason is required for rejected users."]})
        return attrs


class AdminUserUpdateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    real_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    company = serializers.CharField(max_length=200, required=False, allow_blank=True)
    title = serializers.CharField(max_length=120, required=False, allow_blank=True)
    department = serializers.PrimaryKeyRelatedField(
        queryset=managed_department_queryset(),
        required=False,
        allow_null=True,
    )
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False)
    status = serializers.ChoiceField(choices=User.STATUS_CHOICES, required=False)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value: str | None) -> str | None:
        cleaned = (value or "").strip().lower() or None
        instance: User = self.context["instance"]
        if cleaned and User.objects.filter(email__iexact=cleaned).exclude(pk=instance.pk).exists():
            raise serializers.ValidationError("This email is already in use.")
        return cleaned

    def validate(self, attrs: dict) -> dict:
        request = self.context["request"]
        instance: User = self.context["instance"]

        if instance.pk == request.user.pk and attrs.get("status") == User.STATUS_DISABLED:
            raise serializers.ValidationError({"status": ["You cannot disable your own account."]})

        role = attrs.get("role")
        if role == User.ROLE_SUPER_ADMIN and get_user_role(request.user) != User.ROLE_SUPER_ADMIN:
            raise serializers.ValidationError({"role": ["Only super administrators can assign this role."]})

        if attrs.get("status") == User.STATUS_REJECTED and "rejection_reason" in attrs and not attrs["rejection_reason"].strip():
            raise serializers.ValidationError({"rejection_reason": ["Rejection reason is required for rejected users."]})
        return attrs


class AdminRejectSerializer(serializers.Serializer):
    reason = serializers.CharField()

    def validate_reason(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Rejection reason is required.")
        return cleaned


class AdminPasswordResetSerializer(serializers.Serializer):
    new_password = serializers.CharField(required=False, allow_blank=True, write_only=True)

    def validate_new_password(self, value: str) -> str:
        cleaned = value.strip()
        if cleaned:
            validate_new_password(cleaned)
        return cleaned


class UserAuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    operator_username = serializers.CharField(source="operator.username", read_only=True)

    class Meta:
        model = UserAuditLog
        fields = [
            "id",
            "user",
            "username",
            "action",
            "operator",
            "operator_username",
            "detail",
            "ip",
            "created_at",
        ]
