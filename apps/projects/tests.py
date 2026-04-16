from __future__ import annotations

from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Department, User

from .models import Project, Task


class ProjectManagementApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(
            name="Interference",
            code="interference_test_projects",
            department_type=Department.TYPE_DEPARTMENT,
            page_path="/dashboard/projects",
            is_active=True,
        )
        self.admin = self.create_user(
            username="project_admin",
            email="project_admin@example.com",
            role=User.ROLE_ADMIN,
        )
        self.owner = self.create_user(
            username="project_owner",
            email="project_owner@example.com",
        )
        self.member = self.create_user(
            username="project_member",
            email="project_member@example.com",
        )
        self.outsider = self.create_user(
            username="project_outsider",
            email="project_outsider@example.com",
        )

        self.project = Project.objects.create(
            name="Alpha Project",
            description="Primary project",
            status=Project.STATUS_IN_PROGRESS,
            priority=Project.PRIORITY_HIGH,
            owner=self.owner,
            created_by=self.owner,
        )
        self.project.members.add(self.member)

        self.other_project = Project.objects.create(
            name="Beta Project",
            description="Private project",
            status=Project.STATUS_NOT_STARTED,
            priority=Project.PRIORITY_MEDIUM,
            owner=self.outsider,
            created_by=self.outsider,
        )

    def create_user(self, *, username: str, email: str, role: str = User.ROLE_USER) -> User:
        user = User.objects.create(
            username=username,
            email=email,
            real_name=username.replace("_", " ").title(),
            role=role,
            approve_status=User.STATUS_APPROVED,
            department=self.department,
            is_active=True,
        )
        user.set_password("Password123!")
        user.save()
        return user

    def auth_headers(self, user: User) -> dict[str, str]:
        refresh = RefreshToken.for_user(user)
        return {"HTTP_AUTHORIZATION": f"Bearer {refresh.access_token}"}

    def test_project_list_is_scoped_by_membership(self):
        response = self.client.get("/api/projects/", **self.auth_headers(self.member))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.json()["data"]["items"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["name"], "Alpha Project")

        outsider_response = self.client.get("/api/projects/", **self.auth_headers(self.outsider))
        self.assertEqual(outsider_response.status_code, status.HTTP_200_OK)
        outsider_items = outsider_response.json()["data"]["items"]
        self.assertEqual(len(outsider_items), 1)
        self.assertEqual(outsider_items[0]["name"], "Beta Project")

    def test_project_create_endpoint(self):
        response = self.client.post(
            "/api/projects/",
            {
                "name": "Gamma Launch",
                "description": "Create a new internal project",
                "status": Project.STATUS_NOT_STARTED,
                "priority": Project.PRIORITY_CRITICAL,
                "owner": self.owner.id,
                "members": [self.member.id],
            },
            format="json",
            **self.auth_headers(self.owner),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        project = Project.objects.get(name="Gamma Launch")
        self.assertTrue(project.code.startswith("PRJ-"))
        self.assertEqual(project.owner_id, self.owner.id)
        self.assertTrue(project.members.filter(pk=self.member.pk).exists())

    def test_task_create_endpoint(self):
        response = self.client.post(
            f"/api/projects/{self.project.id}/tasks/",
            {
                "title": "Build backend APIs",
                "description": "Implement project APIs",
                "status": Task.STATUS_TODO,
                "priority": Task.PRIORITY_HIGH,
                "assignee": self.member.id,
                "collaborators": [self.owner.id],
                "progress": 10,
            },
            format="json",
            **self.auth_headers(self.owner),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task = Task.objects.get(title="Build backend APIs")
        self.assertEqual(task.project_id, self.project.id)
        self.assertEqual(task.assignee_id, self.member.id)

    def test_task_move_updates_status_and_order(self):
        task_a = Task.objects.create(
            project=self.project,
            title="Task A",
            status=Task.STATUS_TODO,
            priority=Task.PRIORITY_MEDIUM,
            assignee=self.member,
            created_by=self.owner,
            order_index=0,
        )
        Task.objects.create(
            project=self.project,
            title="Task B",
            status=Task.STATUS_TODO,
            priority=Task.PRIORITY_MEDIUM,
            assignee=self.member,
            created_by=self.owner,
            order_index=1,
        )

        response = self.client.post(
            f"/api/tasks/{task_a.id}/move/",
            {
                "status": Task.STATUS_IN_PROGRESS,
                "order_index": 0,
            },
            format="json",
            **self.auth_headers(self.member),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        task_a.refresh_from_db()
        self.assertEqual(task_a.status, Task.STATUS_IN_PROGRESS)
        self.assertEqual(task_a.order_index, 0)
        self.assertEqual(
            response.json()["data"]["column_orders"][Task.STATUS_IN_PROGRESS],
            [task_a.id],
        )

    def test_member_cannot_edit_project_members(self):
        response = self.client.post(
            f"/api/projects/{self.project.id}/members/",
            {"user_ids": [self.outsider.id]},
            format="json",
            **self.auth_headers(self.member),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_outsider_cannot_create_task_in_unrelated_project(self):
        response = self.client.post(
            f"/api/projects/{self.project.id}/tasks/",
            {
                "title": "Unauthorized task",
                "status": Task.STATUS_TODO,
                "priority": Task.PRIORITY_LOW,
            },
            format="json",
            **self.auth_headers(self.outsider),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
