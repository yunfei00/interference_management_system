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


# 与部门 code 对应的演示业务用户（已审批，非 staff，用于按部门登录联调）
DEPARTMENT_DEMO_USERS = [
    {"username": "interference", "department_code": "interference", "note": "电磁 / 干扰"},
    {"username": "rse_user", "department_code": "rse", "note": "电磁 / RSE"},
    {"username": "emc_user", "department_code": "emc", "note": "电磁 / EMC"},
    {"username": "rf_user", "department_code": "rf", "note": "射频"},
]


class Command(BaseCommand):
    help = "Create default departments, admin, and per-department demo users."

    def add_arguments(self, parser):
        parser.add_argument("--admin-username", default="admin")
        parser.add_argument("--admin-password", default="admin123")
        parser.add_argument("--company-name", default="公司管理系统")
        parser.add_argument(
            "--demo-user-password",
            default="Demo123456",
            help="演示业务用户统一登录密码（不少于 8 位）。",
        )
        parser.add_argument(
            "--skip-demo-users",
            action="store_true",
            help="不创建/更新各部门演示用户。",
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

        self.stdout.write(
            self.style.SUCCESS(
                f"Initialization completed. Admin user: {admin_user.username}"
            )
        )
        if not options["skip_demo_users"]:
            pwd = options["demo_user_password"]
            self.stdout.write("各部门演示用户（密码相同）:")
            for row in DEPARTMENT_DEMO_USERS:
                self.stdout.write(
                    f"  - {row['username']:12} → {row['note']} （密码 {pwd}）"
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

    def _bootstrap_department_demo_users(
        self,
        *,
        department_map: dict[str, Department],
        company_name: str,
        password: str,
    ):
        user_model = get_user_model()
        if len(password) < 8:
            self.stdout.write(
                self.style.WARNING(
                    "演示用户密码不足 8 位，已跳过创建。请使用 --demo-user-password 指定更长密码。"
                )
            )
            return

        for row in DEPARTMENT_DEMO_USERS:
            dept = department_map.get(row["department_code"])
            if dept is None:
                continue
            user, created = user_model.objects.get_or_create(
                username=row["username"],
                defaults={"email": ""},
            )
            user.is_superuser = False
            user.is_staff = False
            user.is_active = True
            user.company = company_name
            user.approve_status = user_model.APPROVE_APPROVED
            user.department = dept
            user.set_password(password)
            user.save()

            action = "created" if created else "updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"Dept demo user {action}: {row['username']} → {dept.name}"
                )
            )
