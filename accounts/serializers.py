from __future__ import annotations

from rest_framework import serializers

from .models import User


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
