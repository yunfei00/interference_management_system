from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import Department
from apps.projects.models import Milestone, Project, Task
from apps.projects.selectors import approved_user_queryset
from apps.projects.services import create_project, create_task


PROJECT_SEEDS = [
    {
        "name": "Enterprise Knowledge Base Platform",
        "description": "Build an internal knowledge platform for engineering documentation, templates, and reusable playbooks.",
        "status": Project.STATUS_IN_PROGRESS,
        "priority": Project.PRIORITY_HIGH,
    },
    {
        "name": "Lab Device Scheduling Upgrade",
        "description": "Unify device booking, usage tracking, and reminder flows for lab resources.",
        "status": Project.STATUS_NOT_STARTED,
        "priority": Project.PRIORITY_MEDIUM,
    },
    {
        "name": "Secure File Transfer Revamp",
        "description": "Improve large file transfer reliability, approval, and auditability across departments.",
        "status": Project.STATUS_ON_HOLD,
        "priority": Project.PRIORITY_CRITICAL,
    },
]

TASK_BLUEPRINTS = [
    ("Scope alignment", Task.STATUS_TODO, Task.PRIORITY_MEDIUM),
    ("Backend API design", Task.STATUS_IN_PROGRESS, Task.PRIORITY_HIGH),
    ("Frontend workflow pages", Task.STATUS_IN_PROGRESS, Task.PRIORITY_HIGH),
    ("Permission review", Task.STATUS_BLOCKED, Task.PRIORITY_URGENT),
    ("Integration testing", Task.STATUS_TODO, Task.PRIORITY_MEDIUM),
    ("Pilot launch", Task.STATUS_DONE, Task.PRIORITY_HIGH),
]


class Command(BaseCommand):
    help = "Seed project management demo data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete seeded demo projects before recreating them.",
        )

    def handle(self, *args, **options):
        user_model = get_user_model()
        users = list(approved_user_queryset().order_by("id")[:6])
        if len(users) < 3:
            dept = Department.objects.filter(is_active=True).order_by("id").first()
            for index in range(3 - len(users)):
                username = f"demo_project_user_{index + 1}"
                user, _ = user_model.objects.get_or_create(
                    username=username,
                    defaults={"email": f"{username}@example.com"},
                )
                user.real_name = f"Demo Project User {index + 1}"
                user.role = user_model.ROLE_USER
                user.approve_status = user_model.STATUS_APPROVED
                user.is_active = True
                user.department = dept
                user.must_change_password = False
                user.set_password("Demo123456!")
                user.save()
                users.append(user)

        if options["reset"]:
            Project.objects.filter(name__in=[item["name"] for item in PROJECT_SEEDS]).delete()

        today = timezone.localdate()
        for index, seed in enumerate(PROJECT_SEEDS):
            owner = users[index % len(users)]
            member_pool = [user for user in users if user.id != owner.id][:3]
            project = Project.objects.filter(name=seed["name"]).first()
            if project is None:
                project = create_project(
                    operator=owner,
                    data={
                        "name": seed["name"],
                        "description": seed["description"],
                        "status": seed["status"],
                        "priority": seed["priority"],
                        "owner": owner,
                        "members": member_pool,
                        "start_date": today - timedelta(days=7 * (index + 1)),
                        "end_date": today + timedelta(days=21 + index * 10),
                        "tags": ["demo", "project-management", seed["priority"]],
                    },
                    request=None,
                )
                self.stdout.write(self.style.SUCCESS(f"Created project: {project.name}"))
            else:
                project.owner = owner
                project.status = seed["status"]
                project.priority = seed["priority"]
                project.description = seed["description"]
                project.start_date = today - timedelta(days=7 * (index + 1))
                project.end_date = today + timedelta(days=21 + index * 10)
                project.is_archived = False
                project.save()
                project.members.set(member_pool)
                self.stdout.write(self.style.SUCCESS(f"Updated project: {project.name}"))

            milestone_names = ["Planning", "Delivery", "Rollout"]
            milestones: list[Milestone] = []
            for milestone_index, milestone_name in enumerate(milestone_names):
                milestone, _ = Milestone.objects.update_or_create(
                    project=project,
                    name=milestone_name,
                    defaults={
                        "description": f"{milestone_name} phase for {project.name}.",
                        "due_date": today + timedelta(days=7 * (milestone_index + 1)),
                        "status": [
                            Milestone.STATUS_IN_PROGRESS,
                            Milestone.STATUS_PENDING,
                            Milestone.STATUS_PENDING,
                        ][milestone_index],
                        "sort_order": milestone_index,
                    },
                )
                milestones.append(milestone)

            if project.tasks.filter(is_deleted=False).count() >= 6:
                continue

            for task_index, blueprint in enumerate(TASK_BLUEPRINTS):
                title, status_value, priority_value = blueprint
                assignee = users[(task_index + index) % len(users)]
                existing = project.tasks.filter(title=f"{title} - {project.name}", is_deleted=False).first()
                if existing:
                    continue
                create_task(
                    project=project,
                    operator=owner,
                    data={
                        "title": f"{title} - {project.name}",
                        "description": f"Seeded task for {project.name}.",
                        "status": status_value,
                        "priority": priority_value,
                        "assignee": assignee,
                        "collaborators": member_pool[:2],
                        "start_date": today - timedelta(days=max(0, 5 - task_index)),
                        "due_date": today + timedelta(days=task_index + 3),
                        "estimated_hours": Decimal("8.0") + task_index,
                        "actual_hours": Decimal("2.0") if status_value != Task.STATUS_TODO else Decimal("0.0"),
                        "progress": 100 if status_value == Task.STATUS_DONE else min(90, task_index * 15),
                        "milestone": milestones[task_index % len(milestones)],
                        "subtasks": [
                            {"title": "Prepare requirements", "is_done": status_value in {Task.STATUS_IN_PROGRESS, Task.STATUS_DONE}, "sort_order": 0},
                            {"title": "Review output", "is_done": status_value == Task.STATUS_DONE, "sort_order": 1},
                        ],
                    },
                    request=None,
                )

        self.stdout.write(self.style.SUCCESS("Project management demo data is ready."))
