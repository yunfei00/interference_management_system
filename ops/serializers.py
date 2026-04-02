from __future__ import annotations

from rest_framework import serializers

from .models import CommandTask, Host, HostMetric


class HostMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostMetric
        fields = ["id", "ts", "mem_total", "mem_used", "gpu"]


class HostSerializer(serializers.ModelSerializer):
    latest_metric = serializers.SerializerMethodField()

    class Meta:
        model = Host
        fields = [
            "id",
            "name",
            "ip",
            "port",
            "token",
            "is_online",
            "last_heartbeat",
            "note",
            "latest_metric",
        ]

    def get_latest_metric(self, obj):
        metric = obj.metrics.order_by("-ts").first()
        if metric is None:
            return None
        return HostMetricSerializer(metric).data


class CommandTaskSerializer(serializers.ModelSerializer):
    host_name = serializers.CharField(source="host.name", read_only=True)

    class Meta:
        model = CommandTask
        fields = [
            "id",
            "host",
            "host_name",
            "command",
            "payload",
            "status",
            "result",
            "created_at",
            "finished_at",
            "operator",
        ]
