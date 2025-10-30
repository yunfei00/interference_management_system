from django.db import models

# 主机资产表：登记每台 Windows 电脑
class Host(models.Model):
    name = models.CharField("主机编号/名称", max_length=50, unique=True)
    ip = models.GenericIPAddressField("IP地址")
    port = models.IntegerField("Agent端口", default=8686)
    token = models.CharField("鉴权Token", max_length=128)
    is_online = models.BooleanField("在线", default=False)
    last_heartbeat = models.DateTimeField("最近心跳", null=True, blank=True)
    note = models.CharField("备注", max_length=200, blank=True, null=True)

    class Meta:
        db_table = "ops_host"
        verbose_name = "主机资产"
        verbose_name_plural = "主机资产"

    def __str__(self):
        return f"{self.name}({self.ip})"

# 主机指标快照（按时间序列存储）
class HostMetric(models.Model):
    host = models.ForeignKey(Host, on_delete=models.CASCADE, related_name="metrics", verbose_name="主机")
    ts = models.DateTimeField("采集时间", auto_now_add=True)
    mem_total = models.BigIntegerField("内存总量MB")
    mem_used = models.BigIntegerField("内存使用MB")
    gpu = models.JSONField("GPU指标JSON", default=list)  # 形如 [{index, name, util, mem_used, mem_total, temp}, ...]

    class Meta:
        db_table = "ops_host_metric"
        verbose_name = "主机指标"
        verbose_name_plural = "主机指标"
        indexes = [
            models.Index(fields=["host", "-ts"], name="idx_metric_host_ts"),
        ]

# 命令任务与执行审计
class CommandTask(models.Model):
    COMMAND_CHOICES = [
        ("shutdown", "关机"),
        ("reboot", "重启"),
        ("service_start", "启动服务"),
        ("service_stop", "停止服务"),
        ("service_restart", "重启服务"),
    ]
    STATUS_CHOICES = [
        ("PENDING", "排队中"),
        ("RUNNING", "执行中"),
        ("SUCCESS", "成功"),
        ("FAILED", "失败"),
    ]
    host = models.ForeignKey(Host, on_delete=models.CASCADE, related_name="commands", verbose_name="主机")
    command = models.CharField("命令", max_length=20, choices=COMMAND_CHOICES)
    payload = models.JSONField("载荷参数", default=dict)  # 例如 {"service_name": "Spooler"}
    status = models.CharField("状态", max_length=20, choices=STATUS_CHOICES, default="PENDING")
    result = models.TextField("结果", blank=True, null=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    finished_at = models.DateTimeField("完成时间", null=True, blank=True)
    operator = models.CharField("操作人", max_length=50, blank=True, null=True)  # 可与登录用户关联

    class Meta:
        db_table = "ops_command_task"
        verbose_name = "命令任务"
        verbose_name_plural = "命令任务"
        ordering = ["-created_at"]
