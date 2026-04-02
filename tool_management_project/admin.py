from django.contrib import admin

from .models import Tool


@admin.register(Tool)
class ToolAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "version", "uploaded_by", "uploaded_at")
    search_fields = ("name", "version", "description", "uploaded_by__username")
    list_filter = ("uploaded_at",)
    ordering = ("-uploaded_at",)
