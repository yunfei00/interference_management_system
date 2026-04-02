from django.contrib.auth.models import AbstractUser
from django.db import models


class Department(models.Model):
    TYPE_DIVISION = "division"
    TYPE_DEPARTMENT = "department"
    TYPE_CHOICES = (
        (TYPE_DIVISION, "事业部"),
        (TYPE_DEPARTMENT, "部门"),
    )

    name = models.CharField(max_length=100, verbose_name="部门名称")
    code = models.SlugField(max_length=50, unique=True, verbose_name="部门编码")
    department_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default=TYPE_DEPARTMENT,
        verbose_name="部门类型",
    )
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children",
        verbose_name="上级部门",
    )
    page_path = models.CharField(max_length=200, blank=True, verbose_name="页面路径")
    sort = models.PositiveIntegerField(default=0, verbose_name="排序")
    is_active = models.BooleanField(default=True, verbose_name="启用状态")

    class Meta:
        ordering = ["sort", "id"]
        verbose_name = "部门"
        verbose_name_plural = "部门"

    def __str__(self):
        return self.full_name

    @property
    def full_name(self) -> str:
        nodes = [self.name]
        parent = self.parent
        while parent is not None:
            nodes.append(parent.name)
            parent = parent.parent
        return " / ".join(reversed(nodes))


class User(AbstractUser):
    APPROVE_PENDING = "pending"
    APPROVE_APPROVED = "approved"
    APPROVE_REJECTED = "rejected"
    APPROVE_CHOICES = (
        (APPROVE_PENDING, "待审批"),
        (APPROVE_APPROVED, "已通过"),
        (APPROVE_REJECTED, "已拒绝"),
    )

    approve_status = models.CharField(
        max_length=20,
        choices=APPROVE_CHOICES,
        default=APPROVE_PENDING,
        verbose_name="审批状态",
    )
    company = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="公司",
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="手机号",
    )
    department = models.ForeignKey(
        Department,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="users",
        verbose_name="所属部门",
    )

    class Meta:
        verbose_name = "用户"
        verbose_name_plural = "用户"
