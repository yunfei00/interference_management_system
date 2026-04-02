from django.contrib import admin

from .models import DataFile, Dataset, Measurement


@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "owner", "created_at")
    search_fields = ("name", "owner__username", "description")
    list_filter = ("created_at",)
    ordering = ("-created_at",)


@admin.register(DataFile)
class DataFileAdmin(admin.ModelAdmin):
    list_display = ("id", "original_name", "dataset", "uploaded_at")
    search_fields = ("original_name", "dataset__name")
    list_filter = ("uploaded_at",)
    ordering = ("-uploaded_at",)


@admin.register(Measurement)
class MeasurementAdmin(admin.ModelAdmin):
    list_display = ("id", "dataset", "device_id", "timestamp", "x", "y", "value")
    search_fields = ("dataset__name", "device_id")
    list_filter = ("dataset",)
    ordering = ("-id",)
