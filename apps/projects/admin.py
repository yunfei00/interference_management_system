from django.contrib import admin

from .models import (
    Milestone,
    Project,
    ProjectActivityLog,
    ProjectAttachment,
    SubTask,
    Task,
    TaskDependency,
)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "status", "priority", "owner", "progress", "is_archived")
    search_fields = ("code", "name", "description")
    list_filter = ("status", "priority", "is_archived")


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "status", "priority", "assignee", "order_index", "is_deleted")
    search_fields = ("title", "description", "project__name")
    list_filter = ("status", "priority", "is_deleted")


admin.site.register(Milestone)
admin.site.register(SubTask)
admin.site.register(TaskDependency)
admin.site.register(ProjectAttachment)
admin.site.register(ProjectActivityLog)
