from __future__ import annotations

from rest_framework import serializers

from .models import DataFile, Dataset, Measurement


class DataFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataFile
        fields = ["id", "original_name", "uploaded_at"]


class MeasurementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Measurement
        fields = ["id", "device_id", "timestamp", "x", "y", "value"]


class DatasetSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    file_count = serializers.IntegerField(read_only=True)
    measurement_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Dataset
        fields = [
            "id",
            "name",
            "description",
            "owner",
            "owner_username",
            "created_at",
            "file_count",
            "measurement_count",
        ]
        read_only_fields = ["owner", "owner_username", "created_at"]


class DatasetDetailSerializer(DatasetSerializer):
    files = DataFileSerializer(source="files", many=True, read_only=True)

    class Meta(DatasetSerializer.Meta):
        fields = [*DatasetSerializer.Meta.fields, "files"]
