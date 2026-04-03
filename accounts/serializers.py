from __future__ import annotations

from rest_framework import serializers

from .models import Department, User


class UserSerializer(serializers.ModelSerializer):
    department = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    department_code = serializers.SerializerMethodField()
    department_full_name = serializers.SerializerMethodField()
    department_page_path = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()
    position = serializers.SerializerMethodField()
    position_name = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "company",
            "department",
            "department_name",
            "department_code",
            "department_full_name",
            "department_page_path",
            "role",
            "role_name",
            "position",
            "position_name",
            "approve_status",
            "is_active",
            "is_staff",
            "is_superuser",
            "date_joined",
            "last_login",
            "created_at",
            "updated_at",
        ]

    def get_department(self, obj):
        return obj.department_id

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

    def get_department_code(self, obj):
        return obj.department.code if obj.department else None

    def get_department_full_name(self, obj):
        return obj.department.full_name if obj.department else None

    def get_department_page_path(self, obj):
        return obj.department.page_path if obj.department else None

    def get_role(self, _obj):
        return None

    def get_role_name(self, obj):
        if obj.is_superuser:
            return "超级管理员"
        if obj.is_staff:
            return "管理员"
        return "业务用户"

    def get_position(self, _obj):
        return None

    def get_position_name(self, _obj):
        return None

    def get_created_at(self, obj):
        return obj.date_joined

    def get_updated_at(self, obj):
        return obj.last_login or obj.date_joined


class DepartmentRegistrationOptionSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ["id", "code", "full_name"]

    def get_full_name(self, obj: Department) -> str:
        return obj.full_name


class PublicRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    company = serializers.CharField(max_length=200, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.filter(
            is_active=True,
            department_type=Department.TYPE_DEPARTMENT,
        ).select_related("parent"),
        required=False,
        allow_null=True,
    )
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("用户名不能为空。")
        if User.objects.filter(username=cleaned).exists():
            raise serializers.ValidationError("该用户名已被注册。")
        return cleaned

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "两次密码不一致。"})
        return attrs

    def create(self, validated_data: dict) -> User:
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")
        department = validated_data.pop("department", None)
        user = User.objects.create_user(
            username=validated_data["username"],
            email=(validated_data.get("email") or "").strip() or "",
            password=password,
        )
        user.company = (validated_data.get("company") or "").strip() or ""
        user.phone = (validated_data.get("phone") or "").strip() or ""
        user.department = department
        user.approve_status = User.APPROVE_PENDING
        user.save(
            update_fields=["company", "phone", "department", "approve_status"],
        )
        return user
