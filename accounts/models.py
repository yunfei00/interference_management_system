from __future__ import annotations

import hashlib

from django.contrib.auth.models import AbstractUser
from django.db import models


class Department(models.Model):
    TYPE_DIVISION = "division"
    TYPE_DEPARTMENT = "department"
    TYPE_CHOICES = (
        (TYPE_DIVISION, "Division"),
        (TYPE_DEPARTMENT, "Department"),
    )

    name = models.CharField(max_length=100)
    code = models.SlugField(max_length=50, unique=True)
    department_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default=TYPE_DEPARTMENT,
    )
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children",
    )
    page_path = models.CharField(max_length=200, blank=True)
    sort = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort", "id"]
        verbose_name = "Department"
        verbose_name_plural = "Departments"

    def __str__(self) -> str:
        return self.full_name

    @property
    def full_name(self) -> str:
        nodes = [self.name]
        parent = self.parent
        while parent is not None:
            nodes.append(parent.name)
            parent = parent.parent
        return " / ".join(reversed(nodes))


class User(AbstractUser):
    ROLE_SUPER_ADMIN = "super_admin"
    ROLE_ADMIN = "admin"
    ROLE_USER = "user"
    ROLE_CHOICES = (
        (ROLE_SUPER_ADMIN, "Super Admin"),
        (ROLE_ADMIN, "Admin"),
        (ROLE_USER, "User"),
    )

    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_DISABLED = "disabled"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_DISABLED, "Disabled"),
    )
    APPROVE_PENDING = STATUS_PENDING
    APPROVE_APPROVED = STATUS_APPROVED
    APPROVE_REJECTED = STATUS_REJECTED
    APPROVE_DISABLED = STATUS_DISABLED

    email = models.EmailField(unique=True, null=True, blank=True)
    real_name = models.CharField(max_length=150, blank=True)
    company = models.CharField(max_length=200, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    title = models.CharField(max_length=120, blank=True)
    department = models.ForeignKey(
        Department,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="users",
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_USER,
    )
    approve_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    must_change_password = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_users",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_users",
    )
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_user_agent = models.TextField(blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self) -> str:
        return self.username

    @property
    def status(self) -> str:
        return self.approve_status

    @status.setter
    def status(self, value: str) -> None:
        self.approve_status = (value or self.STATUS_PENDING).lower()

    @property
    def display_name(self) -> str:
        return (self.real_name or self.first_name or self.username).strip()

    def sync_role_flags(self) -> None:
        if self.role == self.ROLE_SUPER_ADMIN:
            self.is_superuser = True
            self.is_staff = True
            return
        if self.role == self.ROLE_ADMIN:
            self.is_superuser = False
            self.is_staff = True
            return
        self.is_superuser = False
        self.is_staff = False

    def save(self, *args, **kwargs):
        self.username = (self.username or "").strip()

        cleaned_email = (self.email or "").strip().lower()
        self.email = cleaned_email or None

        self.real_name = (self.real_name or self.first_name or "").strip()
        self.first_name = self.real_name

        self.company = (self.company or "").strip() or None
        self.phone = (self.phone or "").strip() or None
        self.title = (self.title or "").strip()
        self.rejection_reason = (self.rejection_reason or "").strip()

        if self.role not in {self.ROLE_SUPER_ADMIN, self.ROLE_ADMIN, self.ROLE_USER}:
            if self.is_superuser:
                self.role = self.ROLE_SUPER_ADMIN
            elif self.is_staff:
                self.role = self.ROLE_ADMIN
            else:
                self.role = self.ROLE_USER

        if self.approve_status not in {
            self.STATUS_PENDING,
            self.STATUS_APPROVED,
            self.STATUS_REJECTED,
            self.STATUS_DISABLED,
        }:
            self.approve_status = self.STATUS_PENDING

        if self.is_deleted:
            self.approve_status = self.STATUS_DISABLED
            self.is_active = False

        self.sync_role_flags()
        super().save(*args, **kwargs)


class UserAuditLog(models.Model):
    ACTION_REGISTER = "register"
    ACTION_CREATE_USER = "create_user"
    ACTION_APPROVE = "approve"
    ACTION_REJECT = "reject"
    ACTION_RESET_PASSWORD = "reset_password"
    ACTION_CHANGE_PASSWORD = "change_password"
    ACTION_FORGOT_PASSWORD = "forgot_password"
    ACTION_UPDATE_USER = "update_user"
    ACTION_ENABLE = "enable"
    ACTION_DISABLE = "disable"
    ACTION_DELETE = "delete_user"

    ACTION_CHOICES = (
        (ACTION_REGISTER, "Register"),
        (ACTION_CREATE_USER, "Create User"),
        (ACTION_APPROVE, "Approve"),
        (ACTION_REJECT, "Reject"),
        (ACTION_RESET_PASSWORD, "Reset Password"),
        (ACTION_CHANGE_PASSWORD, "Change Password"),
        (ACTION_FORGOT_PASSWORD, "Forgot Password"),
        (ACTION_UPDATE_USER, "Update User"),
        (ACTION_ENABLE, "Enable"),
        (ACTION_DISABLE, "Disable"),
        (ACTION_DELETE, "Delete User"),
    )

    user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    operator = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="operated_audit_logs",
    )
    detail = models.JSONField(default=dict, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "User Audit Log"
        verbose_name_plural = "User Audit Logs"

    def __str__(self) -> str:
        username = self.user.username if self.user else "unknown"
        return f"{self.action}:{username}"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "Password Reset Token"
        verbose_name_plural = "Password Reset Tokens"

    def __str__(self) -> str:
        return f"reset:{self.user_id}:{self.created_at.isoformat()}"

    @staticmethod
    def build_token_hash(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
