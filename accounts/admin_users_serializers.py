from __future__ import annotations

from rest_framework import serializers

from .models import Department, User

MANAGED_DEPARTMENT_CODES = ("interference", "rse", "emc", "rf")


def managed_department_queryset():
    return Department.objects.filter(
        code__in=MANAGED_DEPARTMENT_CODES,
        is_active=True,
        department_type=Department.TYPE_DEPARTMENT,
    ).order_by("sort", "id")


class AdminUserRowSerializer(serializers.ModelSerializer):
    """管理员用户列表 / 详情行。"""

    display_name = serializers.CharField(source="first_name", read_only=True)
    department_full_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "display_name",
            "department",
            "department_full_name",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
            "approve_status",
            "last_login",
            "date_joined",
        ]

    def get_department_full_name(self, obj: User) -> str | None:
        return obj.department.full_name if obj.department else None

    def get_role(self, obj: User) -> str:
        if obj.is_superuser:
            return "superuser"
        if obj.is_staff:
            return "admin"
        return "user"


class AdminUserCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=1)
    display_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        default="",
    )
    department = serializers.PrimaryKeyRelatedField(
        queryset=managed_department_queryset(),
        required=False,
        allow_null=True,
    )
    role = serializers.ChoiceField(choices=["user", "admin"])
    is_active = serializers.BooleanField(default=True)

    def validate_username(self, value: str) -> str:
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("用户名不能为空。")
        if User.objects.filter(username=cleaned).exists():
            raise serializers.ValidationError("该用户名已存在。")
        return cleaned


class AdminUserUpdateSerializer(serializers.Serializer):
    display_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
    )
    department = serializers.PrimaryKeyRelatedField(
        queryset=managed_department_queryset(),
        required=False,
        allow_null=True,
    )
    role = serializers.ChoiceField(choices=["user", "admin"], required=False)
    is_active = serializers.BooleanField(required=False)

    def validate(self, attrs: dict) -> dict:
        request = self.context.get("request")
        instance: User | None = self.context.get("instance")
        if not request or not instance:
            return attrs

        if instance.pk == request.user.pk:
            if attrs.get("is_active") is False:
                raise serializers.ValidationError("不能禁用当前登录账号。")
            if attrs.get("role") == "user" and instance.is_staff:
                raise serializers.ValidationError("不能取消自己的管理员角色。")

        return attrs

    def update(self, instance: User, validated_data: dict) -> User:
        display_name = validated_data.get("display_name")
        if display_name is not None:
            instance.first_name = display_name.strip()
        if "department" in validated_data:
            instance.department = validated_data.get("department")
        if "is_active" in validated_data:
            instance.is_active = validated_data["is_active"]

        role = validated_data.get("role")
        if role is not None:
            if instance.is_superuser:
                raise serializers.ValidationError(
                    {"role": "不能通过此接口修改超级管理员的角色。"}
                )
            instance.is_staff = role == "admin"

        instance.save()
        return instance


class AdminPasswordResetSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=1)
    confirm_password = serializers.CharField(write_only=True, min_length=1)

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "两次输入的密码不一致。"})
        return attrs


class AdminDepartmentOptionSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ["id", "code", "full_name"]

    def get_full_name(self, obj: Department) -> str:
        return obj.full_name
