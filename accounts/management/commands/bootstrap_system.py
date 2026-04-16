from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import Department
from apps.projects.management.commands.seed_project_demo import Command as SeedProjectDemoCommand


DEPARTMENT_SEEDS = [
    {
        "name": "Electromagnetic",
        "code": "electromagnetic",
        "department_type": Department.TYPE_DIVISION,
        "page_path": "/dashboard/electromagnetic",
        "sort": 10,
        "parent_code": None,
    },
    {
        "name": "RF",
        "code": "rf",
        "department_type": Department.TYPE_DIVISION,
        "page_path": "/dashboard/rf",
        "sort": 20,
        "parent_code": None,
    },
    {
        "name": "Interference",
        "code": "interference",
        "department_type": Department.TYPE_DEPARTMENT,
        "page_path": "/dashboard/electromagnetic/interference",
        "sort": 10,
        "parent_code": "electromagnetic",
    },
    {
        "name": "RSE",
        "code": "rse",
        "department_type": Department.TYPE_DEPARTMENT,
        "page_path": "/dashboard/electromagnetic/rse",
        "sort": 20,
        "parent_code": "electromagnetic",
    },
    {
        "name": "EMC",
        "code": "emc",
        "department_type": Department.TYPE_DEPARTMENT,
        "page_path": "/dashboard/electromagnetic/emc",
        "sort": 30,
        "parent_code": "electromagnetic",
    },
]

DEPARTMENT_DEMO_USERS = [
    {"username": "interference", "department_code": "interference", "note": "Electromagnetic / Interference"},
    {"username": "rse_user", "department_code": "rse", "note": "Electromagnetic / RSE"},
    {"username": "emc_user", "department_code": "emc", "note": "Electromagnetic / EMC"},
    {"username": "rf_user", "department_code": "rf", "note": "RF"},
]


class Command(BaseCommand):
    help = "Create default departments, admin account, demo users, and project demo data."

    def add_arguments(self, parser):
        parser.add_argument("--admin-username", default="admin")
        parser.add_argument("--admin-password", default="admin123")
        parser.add_argument("--company-name", default="Interference Management System")
        parser.add_argument(
            "--demo-user-password",
            default="Demo123456",
            help="Shared password for department demo users.",
        )
        parser.add_argument(
            "--skip-demo-users",
            action="store_true",
            help="Skip creating or updating department demo users.",
        )
        parser.add_argument(
            "--skip-project-demo",
            action="store_true",
            help="Skip seeding the project management demo data.",
        )

    def handle(self, *args, **options):
        department_map = self._bootstrap_departments()
        admin_user = self._bootstrap_admin_user(
            username=options["admin_username"],
            password=options["admin_password"],
            company_name=options["company_name"],
            department=department_map["interference"],
        )

        if not options["skip_demo_users"]:
            self._bootstrap_department_demo_users(
                department_map=department_map,
                company_name=options["company_name"],
                password=options["demo_user_password"],
            )

        if not options["skip_project_demo"]:
            SeedProjectDemoCommand().handle(reset=False)

        self.stdout.write(
            self.style.SUCCESS(
                f"Initialization completed. Admin user: {admin_user.username}"
            )
        )
        if not options["skip_demo_users"]:
            pwd = options["demo_user_password"]
            self.stdout.write("Department demo users:")
            for row in DEPARTMENT_DEMO_USERS:
                self.stdout.write(f"  - {row['username']:12} -> {row['note']} (password: {pwd})")

    def _bootstrap_departments(self) -> dict[str, Department]:
        department_map: dict[str, Department] = {}
        for seed in DEPARTMENT_SEEDS:
            parent = department_map.get(seed["parent_code"]) if seed["parent_code"] else None
            department, _ = Department.objects.update_or_create(
                code=seed["code"],
                defaults={
                    "name": seed["name"],
                    "department_type": seed["department_type"],
                    "page_path": seed["page_path"],
                    "sort": seed["sort"],
                    "parent": parent,
                    "is_active": True,
                },
            )
            department_map[seed["code"]] = department
        return department_map

    def _bootstrap_admin_user(self, *, username, password, company_name, department):
        user_model = get_user_model()
        admin_user, created = user_model.objects.get_or_create(
            username=username,
            defaults={"email": None},
        )
        admin_user.role = user_model.ROLE_SUPER_ADMIN
        admin_user.is_active = True
        admin_user.company = company_name
        admin_user.approve_status = user_model.STATUS_APPROVED
        admin_user.department = department
        admin_user.real_name = admin_user.real_name or "System Administrator"
        admin_user.must_change_password = False
        admin_user.set_password(password)
        admin_user.save()

        action = "created" if created else "updated"
        self.stdout.write(self.style.SUCCESS(f"Admin user {action}: {username}"))
        return admin_user

    def _bootstrap_department_demo_users(
        self,
        *,
        department_map: dict[str, Department],
        company_name: str,
        password: str,
    ) -> None:
        user_model = get_user_model()
        if len(password) < 8:
            self.stdout.write(
                self.style.WARNING(
                    "Demo user password must be at least 8 characters long. Skipping demo users."
                )
            )
            return

        for row in DEPARTMENT_DEMO_USERS:
            dept = department_map.get(row["department_code"])
            if dept is None:
                continue
            user, created = user_model.objects.get_or_create(
                username=row["username"],
                defaults={"email": None},
            )
            user.role = user_model.ROLE_USER
            user.is_active = True
            user.company = company_name
            user.approve_status = user_model.STATUS_APPROVED
            user.department = dept
            user.real_name = user.real_name or row["username"]
            user.must_change_password = False
            user.set_password(password)
            user.save()

            action = "created" if created else "updated"
            self.stdout.write(self.style.SUCCESS(f"Dept demo user {action}: {row['username']} -> {dept.name}"))
