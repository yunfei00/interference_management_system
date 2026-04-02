from __future__ import annotations

from django.db.models import Count

from .models import Dataset, Measurement


def get_dataset_queryset(user):
    queryset = Dataset.objects.select_related("owner").annotate(
        file_count=Count("files", distinct=True),
        measurement_count=Count("measurements", distinct=True),
    )
    if not getattr(user, "is_staff", False) and not getattr(user, "is_superuser", False):
        queryset = queryset.filter(owner=user)
    return queryset.order_by("-id")


def get_measurement_queryset(dataset):
    return Measurement.objects.filter(dataset=dataset).order_by("-id")
