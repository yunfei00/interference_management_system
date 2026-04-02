from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import Department


DEPARTMENT_SEEDS = [
    {
        "name": "电磁",
        "code": "electromagnetic",
        "department_type": Department.TYPE_DIVISION,
        "page_path": "/dashboard/electromagnetic",
        "sort": 10,
        "parent_code": None,
    },
    {
        "name": "射频",
        "code": "rf",
        "department_type": Department.TYPE_DIVISION,
        "page_path": "/dashboard/rf",
        "sort": 20,
        "parent_code": None,
    },
    {
        "name": "干扰",
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


class Command(BaseCommand):
    help = "Create default departments and the initial admin account."

    def add_arguments(self, parser):
        parser.add_argument("--admin-username", default="admin")
        parser.add_argument("--admin-password", default="admin123")
        parser.add_argument("--company-name", default="公司管理系统")

    def handle(self, *args, **options):
        department_map = self._bootstrap_departments()
        admin_user = self._bootstrap_admin_user(
            username=options["admin_username"],
            password=options["admin_password"],
            company_name=options["company_name"],
            department=department_map["interference"],
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Initialization completed. Admin user: {admin_user.username}"
            )
        )

    def _bootstrap_departments(self):
        department_map: dict[str, Department] = {}
        for seed in DEPARTMENT_SEEDS:
            parent = None
            parent_code = seed["parent_code"]
            if parent_code:
                parent = department_map[parent_code]

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
            defaults={
                "email": "",
            },
        )

        admin_user.is_superuser = True
        admin_user.is_staff = True
        admin_user.is_active = True
        admin_user.company = company_name
        admin_user.approve_status = user_model.APPROVE_APPROVED
        admin_user.department = department
        admin_user.set_password(password)
        admin_user.save()

        action = "created" if created else "updated"
        self.stdout.write(self.style.SUCCESS(f"Admin user {action}: {username}"))
        return admin_user
