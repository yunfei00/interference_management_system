from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create or update a default super administrator account."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin")
        parser.add_argument("--password", required=True)
        parser.add_argument("--email", default="")
        parser.add_argument("--real-name", default="System Administrator")

    def handle(self, *args, **options):
        password = options["password"]
        if len(password) < 8:
            raise CommandError("Password must be at least 8 characters long.")

        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(
            username=options["username"],
            defaults={"email": (options["email"] or "").strip().lower() or None},
        )
        user.email = (options["email"] or "").strip().lower() or None
        user.real_name = options["real_name"].strip()
        user.role = user_model.ROLE_SUPER_ADMIN
        user.approve_status = user_model.STATUS_APPROVED
        user.is_active = True
        user.must_change_password = False
        user.set_password(password)
        user.save()

        action = "created" if created else "updated"
        self.stdout.write(
            self.style.SUCCESS(f"Super administrator {action}: {user.username}")
        )
