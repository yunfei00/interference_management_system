from django.contrib import admin

from .models import Department, User


@admin.action(description="审批通过所选用户")
def approve_users(_modeladmin, _request, queryset):
    queryset.update(approve_status=User.APPROVE_APPROVED)


@admin.action(description="拒绝所选用户")
def reject_users(_modeladmin, _request, queryset):
    queryset.update(approve_status=User.APPROVE_REJECTED)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "department_type", "parent", "page_path", "sort")
    list_filter = ("department_type", "is_active")
    search_fields = ("name", "code", "page_path")
    ordering = ("sort", "id")


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = (
        "username",
        "department",
        "email",
        "approve_status",
        "is_staff",
        "is_superuser",
        "date_joined",
    )
    list_filter = ("approve_status", "is_staff", "is_superuser", "department")
    search_fields = ("username", "email", "company", "phone")
    actions = [approve_users, reject_users]
