from django.contrib import admin

from .models import Department, PasswordResetToken, User, UserAuditLog


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "department_type", "parent", "page_path", "sort", "is_active")
    list_filter = ("department_type", "is_active")
    search_fields = ("name", "code", "page_path")
    ordering = ("sort", "id")


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = (
        "username",
        "real_name",
        "email",
        "role",
        "approve_status",
        "must_change_password",
        "department",
        "is_active",
        "is_deleted",
    )
    list_filter = ("role", "approve_status", "department", "must_change_password", "is_deleted")
    search_fields = ("username", "real_name", "email", "company", "phone")
    readonly_fields = ("approved_by", "approved_at", "created_by", "created_at", "updated_at")


@admin.register(UserAuditLog)
class UserAuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "user", "operator", "ip", "created_at")
    list_filter = ("action",)
    search_fields = ("user__username", "operator__username")
    readonly_fields = ("user", "action", "operator", "detail", "ip", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "expires_at", "used_at", "created_at")
    search_fields = ("user__username", "user__email")
    readonly_fields = ("user", "token_hash", "expires_at", "used_at", "created_at")

    def has_add_permission(self, request):
        return False
