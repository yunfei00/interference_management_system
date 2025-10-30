# Celery 定时任务：拉取指标 + 更新在线状态
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Host, HostMetric
from .services import call_metrics

@shared_task
def pull_metrics_task():
    now = timezone.now()
    for host in Host.objects.all():
        try:
            data = call_metrics(host)
            HostMetric.objects.create(
                host=host,
                mem_total=data.get("mem_total", 0),
                mem_used=data.get("mem_used", 0),
                gpu=data.get("gpu", []),
            )
            host.last_heartbeat = now
            host.is_online = True
            host.save(update_fields=["last_heartbeat", "is_online"])
        except Exception:
            # 失败：标记可能离线（超过 90 秒未心跳）
            if host.last_heartbeat and now - host.last_heartbeat > timedelta(seconds=90):
                host.is_online = False
                host.save(update_fields=["is_online"])
