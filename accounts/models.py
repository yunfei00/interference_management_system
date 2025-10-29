from django.db import models

# Create your models here.
# accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    APPROVE_CHOICES = (
        ('pending', '待审批'),
        ('approved', '已通过'),
        ('rejected', '已拒绝'),
    )
    approve_status = models.CharField(
        max_length=20, choices=APPROVE_CHOICES, default='pending', verbose_name='审批状态'
    )
    company = models.CharField(max_length=200, blank=True, null=True, verbose_name='公司')
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='手机号')

    class Meta:
        verbose_name = '用户'
        verbose_name_plural = '用户'
