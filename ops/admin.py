from django.contrib import admin
from .models import Host, HostMetric, CommandTask

@admin.register(Host)
class HostAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "ip", "port", "is_online", "last_heartbeat")
    list_filter = ("is_online",)
    search_fields = ("name", "ip")

@admin.register(HostMetric)
class HostMetricAdmin(admin.ModelAdmin):
    list_display = ("id", "host", "ts", "mem_total", "mem_used")
    list_filter = ("host",)
    search_fields = ("host__name", "host__ip")

@admin.register(CommandTask)
class CommandTaskAdmin(admin.ModelAdmin):
    list_display = ("id", "host", "command", "status", "operator", "created_at", "finished_at")
    list_filter = ("command", "status")
    search_fields = ("host__name", "operator")
