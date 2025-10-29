from django.contrib import admin

# Register your models here.
# accounts/admin.py
from django.contrib import admin
from .models import User

@admin.action(description='审批通过所选用户')
def approve_users(modeladmin, request, queryset):
    queryset.update(approve_status='approved')

@admin.action(description='拒绝所选用户')
def reject_users(modeladmin, request, queryset):
    queryset.update(approve_status='rejected')

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'approve_status', 'is_staff', 'date_joined')
    list_filter = ('approve_status', 'is_staff')
    search_fields = ('username', 'email', 'company', 'phone')
    actions = [approve_users, reject_users]
