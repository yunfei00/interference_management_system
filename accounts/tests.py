from django.core import mail
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Department, PasswordResetToken, User, UserAuditLog


@override_settings(FRONTEND_APP_URL="http://localhost:3000")
class AuthAndAdminApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(
            name="Interference",
            code="interference",
            department_type=Department.TYPE_DEPARTMENT,
            page_path="/dashboard/electromagnetic/interference",
            is_active=True,
        )
        self.super_admin = self._create_user(
            username="root",
            email="root@example.com",
            role=User.ROLE_SUPER_ADMIN,
            status=User.STATUS_APPROVED,
            password="RootPass123!",
        )
        self.admin = self._create_user(
            username="admin",
            email="admin@example.com",
            role=User.ROLE_ADMIN,
            status=User.STATUS_APPROVED,
            password="AdminPass123!",
        )
        self.approved_user = self._create_user(
            username="approved_user",
            email="approved@example.com",
            role=User.ROLE_USER,
            status=User.STATUS_APPROVED,
            password="ApprovedPass123!",
        )
        self.rejected_user = self._create_user(
            username="rejected_user",
            email="rejected@example.com",
            role=User.ROLE_USER,
            status=User.STATUS_REJECTED,
            password="RejectedPass123!",
            rejection_reason="Missing information",
        )

    def _create_user(
        self,
        *,
        username: str,
        email: str,
        role: str,
        status: str,
        password: str,
        rejection_reason: str = "",
    ) -> User:
        user = User.objects.create(
            username=username,
            email=email,
            real_name=username.replace("_", " ").title(),
            role=role,
            approve_status=status,
            department=self.department,
            rejection_reason=rejection_reason,
            is_active=status != User.STATUS_DISABLED,
        )
        user.set_password(password)
        user.save()
        return user

    def _auth_headers_for(self, user: User) -> dict[str, str]:
        refresh = RefreshToken.for_user(user)
        return {"HTTP_AUTHORIZATION": f"Bearer {refresh.access_token}"}

    def test_register_user_is_pending_and_cannot_login(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "new_pending",
                "email": "new_pending@example.com",
                "real_name": "New Pending",
                "password": "PendingPass123!",
                "confirm_password": "PendingPass123!",
                "department": self.department.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(username="new_pending")
        self.assertEqual(user.status, User.STATUS_PENDING)
        self.assertTrue(
            UserAuditLog.objects.filter(user=user, action=UserAuditLog.ACTION_REGISTER).exists()
        )

        login_response = self.client.post(
            "/api/auth/login/",
            {"username": "new_pending", "password": "PendingPass123!"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(login_response.json()["code"], "account_pending")

    def test_approved_user_can_login_after_admin_approval(self):
        pending_user = self._create_user(
            username="waiting_user",
            email="waiting@example.com",
            role=User.ROLE_USER,
            status=User.STATUS_PENDING,
            password="WaitingPass123!",
        )

        login_before = self.client.post(
            "/api/auth/login/",
            {"username": "waiting_user", "password": "WaitingPass123!"},
            format="json",
        )
        self.assertEqual(login_before.status_code, status.HTTP_401_UNAUTHORIZED)

        approve_response = self.client.post(
            f"/api/admin/users/{pending_user.id}/approve/",
            {},
            format="json",
            **self._auth_headers_for(self.admin),
        )
        self.assertEqual(approve_response.status_code, status.HTTP_200_OK)

        pending_user.refresh_from_db()
        self.assertEqual(pending_user.status, User.STATUS_APPROVED)

        login_after = self.client.post(
            "/api/auth/login/",
            {"username": "waiting_user", "password": "WaitingPass123!"},
            format="json",
        )
        self.assertEqual(login_after.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_after.json()["data"])

    def test_rejected_user_cannot_login(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": self.rejected_user.username, "password": "RejectedPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.json()["code"], "account_rejected")

    def test_admin_can_reset_password_and_force_password_change(self):
        response = self.client.post(
            f"/api/admin/users/{self.approved_user.id}/reset-password/",
            {},
            format="json",
            **self._auth_headers_for(self.admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        temporary_password = response.json()["data"]["temporary_password"]
        self.assertTrue(temporary_password)

        self.approved_user.refresh_from_db()
        self.assertTrue(self.approved_user.must_change_password)
        self.assertTrue(
            UserAuditLog.objects.filter(
                user=self.approved_user,
                action=UserAuditLog.ACTION_RESET_PASSWORD,
            ).exists()
        )

        login_response = self.client.post(
            "/api/auth/login/",
            {"username": self.approved_user.username, "password": temporary_password},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertTrue(login_response.json()["data"]["user"]["must_change_password"])

    def test_regular_user_cannot_access_admin_endpoints(self):
        response = self.client.get(
            "/api/admin/users/",
            format="json",
            **self._auth_headers_for(self.approved_user),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_manage_departments(self):
        create_response = self.client.post(
            "/api/admin/departments/",
            {
                "name": "Radar",
                "code": "radar",
                "department_type": Department.TYPE_DEPARTMENT,
                "page_path": "/dashboard/rf/radar",
                "sort": 20,
                "is_active": True,
            },
            format="json",
            **self._auth_headers_for(self.admin),
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        department_id = create_response.json()["data"]["id"]
        list_response = self.client.get(
            "/api/admin/departments/",
            format="json",
            **self._auth_headers_for(self.admin),
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            any(
                item["id"] == department_id
                for item in list_response.json()["data"]["items"]
            )
        )

        disable_response = self.client.patch(
            f"/api/admin/departments/{department_id}/",
            {"is_active": False},
            format="json",
            **self._auth_headers_for(self.admin),
        )
        self.assertEqual(disable_response.status_code, status.HTTP_200_OK)

        options_response = self.client.get(
            "/api/admin/users/department-options/",
            format="json",
            **self._auth_headers_for(self.admin),
        )
        self.assertEqual(options_response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            any(item["code"] == "radar" for item in options_response.json()["data"])
        )

    def test_forgot_password_and_confirm_reset_do_not_leak_account_existence(self):
        forgot_response = self.client.post(
            "/api/auth/forgot-password/",
            {"email": self.approved_user.email},
            format="json",
        )
        self.assertEqual(forgot_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("reset-password", mail.outbox[0].body)

        token_obj = PasswordResetToken.objects.get(user=self.approved_user)
        raw_link = mail.outbox[0].body.split("Reset link: ", 1)[1].splitlines()[0]
        self.assertIn("uid=", raw_link)
        self.assertIn("token=", raw_link)
        uid = raw_link.split("uid=", 1)[1].split("&", 1)[0]
        token = raw_link.split("token=", 1)[1]

        confirm_response = self.client.post(
            "/api/auth/reset-password/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password": "BrandNewPass123!",
                "confirm_password": "BrandNewPass123!",
            },
            format="json",
        )
        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)

        token_obj.refresh_from_db()
        self.assertIsNotNone(token_obj.used_at)

        reused_response = self.client.post(
            "/api/auth/reset-password/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password": "AnotherPass123!",
                "confirm_password": "AnotherPass123!",
            },
            format="json",
        )
        self.assertEqual(reused_response.status_code, status.HTTP_400_BAD_REQUEST)
