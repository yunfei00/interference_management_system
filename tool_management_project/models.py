
from django.db import models
from django.contrib.auth.models import User

class Tool(models.Model):
    name = models.CharField(max_length=200, verbose_name="工具名称")
    description = models.TextField(verbose_name="工具描述")
    file = models.FileField(upload_to='tools/', verbose_name="工具文件")
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="上传者")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="上传时间")

    def __str__(self):
        return self.name
