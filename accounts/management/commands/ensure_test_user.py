"""创建或更新联调账号 test（干扰 / 普通用户，密码 test）。"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import Department


class Command(BaseCommand):
    help = (
        "Ensure user 'test' exists: department 干扰 (interference), "
        "role 普通用户, approve_status approved, password 'test'."
    )

    def handle(self, *args, **options):
        user_model = get_user_model()
        dept = Department.objects.filter(
            code="interference",
            is_active=True,
        ).first()
        if dept is None:
            self.stderr.write(
                self.style.ERROR(
                    "未找到 code=interference 的部门。请先运行：python manage.py bootstrap_system",
                ),
            )
            return

        user, created = user_model.objects.get_or_create(
            username="test",
            defaults={"email": ""},
        )
        user.is_superuser = False
        user.is_staff = False
        user.is_active = True
        user.approve_status = user_model.APPROVE_APPROVED
        user.department = dept
        user.first_name = user.first_name or "测试用户"
        user.set_password("test")
        user.save()

        action = "created" if created else "updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"User '{user.username}' {action}. "
                f"Department: {dept.full_name}. Login: test / test",
            ),
        )
