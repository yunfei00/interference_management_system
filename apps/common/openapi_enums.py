ENABLED_DISABLED_STATUS_CHOICES = (
    (1, "启用"),
    (0, "禁用"),
)

DISABLED_ENABLED_STATUS_CHOICES = (
    (0, "禁用"),
    (1, "启用"),
)

REGISTER_REQUEST_STATUS_CHOICES = (
    ("pending", "Pending"),
    ("approved", "Approved"),
    ("rejected", "Rejected"),
)

APPROVAL_INSTANCE_STATUS_CHOICES = (
    (1, "审批中"),
    (2, "已通过"),
    (3, "已驳回"),
    (4, "已取消"),
)

APPROVAL_NODE_STATUS_CHOICES = (
    (1, "未开始"),
    (2, "进行中"),
    (3, "已通过"),
    (4, "已驳回"),
    (5, "已跳过"),
)
