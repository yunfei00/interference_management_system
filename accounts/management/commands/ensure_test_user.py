from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import Department


class Command(BaseCommand):
    help = "Ensure the local integration account `test` exists."

    def handle(self, *args, **options):
        user_model = get_user_model()
        dept = Department.objects.filter(code="interference", is_active=True).first()
        if dept is None:
            self.stderr.write(
                self.style.ERROR(
                    "Department code=interference was not found. Run `python manage.py bootstrap_system` first."
                )
            )
            return

        user, created = user_model.objects.get_or_create(
            username="test",
            defaults={"email": None},
        )
        user.role = user_model.ROLE_USER
        user.is_active = True
        user.approve_status = user_model.STATUS_APPROVED
        user.department = dept
        user.real_name = user.real_name or "Test User"
        user.must_change_password = False
        user.set_password("test")
        user.save()

        action = "created" if created else "updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"User '{user.username}' {action}. Department: {dept.full_name}. Login: test / test"
            )
        )
