from django.contrib import admin

from .models import Tool, ToolVersion


class ToolVersionInline(admin.TabularInline):
    model = ToolVersion
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Tool)
class ToolAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "category",
        "department",
        "status",
        "latest_version",
        "updated_at",
    )
    list_filter = ("status", "category", "department")
    search_fields = ("name", "code", "summary", "detail", "department", "tags")
    ordering = ("-updated_at",)
    inlines = [ToolVersionInline]


@admin.register(ToolVersion)
class ToolVersionAdmin(admin.ModelAdmin):
    list_display = ("tool", "version", "is_latest", "file_size", "created_at")
    list_filter = ("is_latest",)
    search_fields = ("tool__name", "version", "file_name")
