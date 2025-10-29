from django.db import models

# Create your models here.
# datahub/models.py
from django.db import models
from django.conf import settings

class Dataset(models.Model):
    name = models.CharField(max_length=200, verbose_name='数据集名称')
    description = models.TextField(blank=True, null=True, verbose_name='描述')
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name='所属用户')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = '数据集'
        verbose_name_plural = '数据集'

    def __str__(self):
        return self.name

class DataFile(models.Model):
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='files', verbose_name='数据集')
    file = models.FileField(upload_to='uploads/%Y/%m/%d/', verbose_name='数据文件')
    original_name = models.CharField(max_length=255, verbose_name='原文件名')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = '数据文件'
        verbose_name_plural = '数据文件'

class Measurement(models.Model):
    """
    通用的仪表测试点位数据：支持热力图
    例如：x/y 可是物理坐标或网格索引，value 为测量值
    """
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='measurements', verbose_name='数据集')
    device_id = models.CharField(max_length=100, blank=True, null=True, verbose_name='设备ID')
    timestamp = models.DateTimeField(blank=True, null=True, verbose_name='时间')
    x = models.FloatField(verbose_name='X')
    y = models.FloatField(verbose_name='Y')
    value = models.FloatField(verbose_name='值')

    class Meta:
        verbose_name = '测量数据'
        verbose_name_plural = '测量数据'
        indexes = [models.Index(fields=['dataset', 'x', 'y'])]
