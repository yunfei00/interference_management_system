from __future__ import annotations

import secrets
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied, ValidationError

from .models import PasswordResetToken, User, UserAuditLog


PASSWORD_RESET_TOKEN_TTL_HOURS = 2


def get_request_ip(request) -> str | None:
    if request is None:
        return None

    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "").strip()
    if forwarded_for:
        return forwarded_for.split(",")[0].strip() or None
    return request.META.get("REMOTE_ADDR") or None


def get_request_user_agent(request) -> str:
    if request is None:
        return ""
    return (request.META.get("HTTP_USER_AGENT") or "")[:1000]


def validate_new_password(password: str, *, user: User | None = None) -> str:
    try:
        validate_password(password, user=user)
    except Exception as exc:
        if hasattr(exc, "messages"):
            raise ValidationError({"new_password": list(exc.messages)}) from exc
        raise
    return password


def get_user_role(user: User) -> str:
    if user.role in {User.ROLE_SUPER_ADMIN, User.ROLE_ADMIN, User.ROLE_USER}:
        return user.role
    if user.is_superuser:
        return User.ROLE_SUPER_ADMIN
    if user.is_staff:
        return User.ROLE_ADMIN
    return User.ROLE_USER


def ensure_admin_operator(user: User) -> None:
    if not user.is_authenticated:
        raise PermissionDenied("Authentication is required.")
    if get_user_role(user) not in {User.ROLE_SUPER_ADMIN, User.ROLE_ADMIN}:
        raise PermissionDenied("Administrator access is required.")


def ensure_can_manage_target(
    operator: User,
    target: User,
    *,
    allow_delete: bool = False,
) -> None:
    ensure_admin_operator(operator)

    operator_role = get_user_role(operator)
    target_role = get_user_role(target)

    if operator_role != User.ROLE_SUPER_ADMIN and target_role == User.ROLE_SUPER_ADMIN:
        raise PermissionDenied("Only super administrators can manage super administrators.")

    if allow_delete and operator_role != User.ROLE_SUPER_ADMIN:
        raise PermissionDenied("Only super administrators can delete users.")

    if allow_delete and target.pk == operator.pk:
        raise PermissionDenied("You cannot delete your own account.")

    if target.pk == operator.pk and target_role == User.ROLE_SUPER_ADMIN:
        raise PermissionDenied("Use a different super administrator account to manage this account.")


def ensure_can_assign_role(operator: User, role: str) -> None:
    if role == User.ROLE_SUPER_ADMIN and get_user_role(operator) != User.ROLE_SUPER_ADMIN:
        raise PermissionDenied("Only super administrators can assign the super administrator role.")


def generate_temporary_password(length: int = 12) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def log_user_action(
    *,
    action: str,
    user: User | None,
    operator: User | None = None,
    request=None,
    detail: dict[str, Any] | None = None,
) -> UserAuditLog:
    return UserAuditLog.objects.create(
        user=user,
        action=action,
        operator=operator,
        detail=detail or {},
        ip=get_request_ip(request),
    )


def build_user_snapshot(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "real_name": user.real_name,
        "phone": user.phone,
        "title": user.title,
        "department_id": user.department_id,
        "role": get_user_role(user),
        "status": user.status,
        "must_change_password": user.must_change_password,
        "is_deleted": user.is_deleted,
    }


def authenticate_user_for_login(identifier: str, password: str) -> User:
    identifier = (identifier or "").strip()
    password = password or ""
    if not identifier or not password:
        raise AuthenticationFailed("Username and password are required.", code="missing_credentials")

    queryset = User.objects.filter(is_deleted=False)
    if "@" in identifier:
        user = queryset.filter(email__iexact=identifier).first()
    else:
        user = queryset.filter(username__iexact=identifier).first()

    if user is None or not user.check_password(password):
        raise AuthenticationFailed("Invalid username or password.", code="authentication_failed")

    if user.status == User.STATUS_PENDING:
        raise AuthenticationFailed("Your account is awaiting approval.", code="account_pending")
    if user.status == User.STATUS_REJECTED:
        raise AuthenticationFailed("Your account was rejected. Please contact an administrator.", code="account_rejected")
    if user.status == User.STATUS_DISABLED or user.is_deleted or not user.is_active:
        raise AuthenticationFailed("Your account has been disabled. Please contact an administrator.", code="account_disabled")

    return user


def update_login_metadata(user: User, request) -> None:
    user.last_login = timezone.now()
    user.last_login_ip = get_request_ip(request)
    user.last_login_user_agent = get_request_user_agent(request)
    user.save(update_fields=["last_login", "last_login_ip", "last_login_user_agent", "updated_at"])


@transaction.atomic
def register_user(*, data: dict[str, Any], request) -> User:
    password = data.pop("password")
    user = User(
        username=data["username"],
        email=data["email"],
        real_name=data["real_name"],
        phone=data.get("phone"),
        company=data.get("company"),
        title=data.get("title", ""),
        department=data.get("department"),
        role=User.ROLE_USER,
        approve_status=User.STATUS_PENDING,
        is_active=True,
    )
    user.set_password(password)
    user.save()

    log_user_action(
        action=UserAuditLog.ACTION_REGISTER,
        user=user,
        operator=user,
        request=request,
        detail={"status": user.status},
    )
    return user


@transaction.atomic
def create_user_by_admin(*, operator: User, data: dict[str, Any], request) -> tuple[User, str | None]:
    ensure_admin_operator(operator)
    role = data.get("role", User.ROLE_USER)
    ensure_can_assign_role(operator, role)

    provided_password = (data.get("password") or "").strip()
    temporary_password = None
    if provided_password:
        validate_new_password(provided_password)
    else:
        temporary_password = generate_temporary_password()
        provided_password = temporary_password

    status = data.get("status", User.STATUS_APPROVED)
    now = timezone.now()

    user = User(
        username=data["username"],
        email=data.get("email"),
        real_name=data.get("real_name", ""),
        phone=data.get("phone"),
        company=data.get("company"),
        title=data.get("title", ""),
        department=data.get("department"),
        role=role,
        approve_status=status,
        approved_by=operator if status == User.STATUS_APPROVED else None,
        approved_at=now if status == User.STATUS_APPROVED else None,
        rejection_reason=data.get("rejection_reason", "") if status == User.STATUS_REJECTED else "",
        created_by=operator,
        must_change_password=bool(data.get("must_change_password", True)),
        is_active=status != User.STATUS_DISABLED,
    )
    user.set_password(provided_password)
    user.save()

    log_user_action(
        action=UserAuditLog.ACTION_CREATE_USER,
        user=user,
        operator=operator,
        request=request,
        detail={"created": build_user_snapshot(user)},
    )
    return user, temporary_password


@transaction.atomic
def update_user_from_admin(
    *,
    target: User,
    operator: User,
    data: dict[str, Any],
    request,
) -> User:
    ensure_can_manage_target(operator, target)

    before = build_user_snapshot(target)
    role = data.get("role")
    if role is not None:
        ensure_can_assign_role(operator, role)
        target.role = role

    for field in ("email", "real_name", "phone", "company", "title", "department"):
        if field in data:
            setattr(target, field, data[field])

    if "status" in data:
        status_value = data["status"]
        if status_value == User.STATUS_DISABLED:
            target.approve_status = User.STATUS_DISABLED
            target.is_active = False
        elif status_value == User.STATUS_APPROVED:
            target.approve_status = User.STATUS_APPROVED
            target.approved_by = operator
            target.approved_at = timezone.now()
            target.rejection_reason = ""
            target.is_active = True
        elif status_value == User.STATUS_REJECTED:
            target.approve_status = User.STATUS_REJECTED
            target.rejection_reason = data.get("rejection_reason", target.rejection_reason)
            target.approved_by = None
            target.approved_at = None
            target.is_active = True
        elif status_value == User.STATUS_PENDING:
            target.approve_status = User.STATUS_PENDING
            target.approved_by = None
            target.approved_at = None
            target.rejection_reason = ""
            target.is_active = True

    target.save()

    log_user_action(
        action=UserAuditLog.ACTION_UPDATE_USER,
        user=target,
        operator=operator,
        request=request,
        detail={"before": before, "after": build_user_snapshot(target)},
    )
    return target


@transaction.atomic
def approve_user(*, target: User, operator: User, request) -> User:
    ensure_can_manage_target(operator, target)

    target.approve_status = User.STATUS_APPROVED
    target.approved_by = operator
    target.approved_at = timezone.now()
    target.rejection_reason = ""
    target.is_active = True
    target.save(update_fields=["approve_status", "approved_by", "approved_at", "rejection_reason", "is_active", "updated_at"])

    log_user_action(
        action=UserAuditLog.ACTION_APPROVE,
        user=target,
        operator=operator,
        request=request,
        detail={"status": target.status},
    )
    return target


@transaction.atomic
def reject_user(*, target: User, operator: User, reason: str, request) -> User:
    ensure_can_manage_target(operator, target)

    target.approve_status = User.STATUS_REJECTED
    target.approved_by = None
    target.approved_at = None
    target.rejection_reason = reason.strip()
    target.is_active = True
    target.save(update_fields=["approve_status", "approved_by", "approved_at", "rejection_reason", "is_active", "updated_at"])

    log_user_action(
        action=UserAuditLog.ACTION_REJECT,
        user=target,
        operator=operator,
        request=request,
        detail={"reason": target.rejection_reason},
    )
    return target


@transaction.atomic
def disable_user(*, target: User, operator: User, request) -> User:
    ensure_can_manage_target(operator, target)
    if target.pk == operator.pk:
        raise PermissionDenied("You cannot disable your own account.")

    target.approve_status = User.STATUS_DISABLED
    target.is_active = False
    target.save(update_fields=["approve_status", "is_active", "updated_at"])

    log_user_action(
        action=UserAuditLog.ACTION_DISABLE,
        user=target,
        operator=operator,
        request=request,
        detail={"status": target.status},
    )
    return target


@transaction.atomic
def enable_user(*, target: User, operator: User, request) -> User:
    ensure_can_manage_target(operator, target)

    target.approve_status = User.STATUS_APPROVED
    target.approved_by = operator
    target.approved_at = timezone.now()
    target.is_active = True
    target.save(update_fields=["approve_status", "approved_by", "approved_at", "is_active", "updated_at"])

    log_user_action(
        action=UserAuditLog.ACTION_ENABLE,
        user=target,
        operator=operator,
        request=request,
        detail={"status": target.status},
    )
    return target


@transaction.atomic
def admin_reset_password(
    *,
    target: User,
    operator: User,
    request,
    new_password: str | None = None,
) -> str:
    ensure_can_manage_target(operator, target)

    if new_password:
        validate_new_password(new_password, user=target)
    else:
        new_password = generate_temporary_password()

    target.set_password(new_password)
    target.must_change_password = True
    target.save(update_fields=["password", "must_change_password", "updated_at"])

    log_user_action(
        action=UserAuditLog.ACTION_RESET_PASSWORD,
        user=target,
        operator=operator,
        request=request,
        detail={"must_change_password": True, "source": "admin"},
    )
    return new_password


@transaction.atomic
def change_own_password(
    *,
    user: User,
    current_password: str,
    new_password: str,
    request,
) -> None:
    if not user.check_password(current_password):
        raise ValidationError({"current_password": ["Current password is incorrect."]})

    validate_new_password(new_password, user=user)
    user.set_password(new_password)
    user.must_change_password = False
    user.save(update_fields=["password", "must_change_password", "updated_at"])

    PasswordResetToken.objects.filter(user=user, used_at__isnull=True).update(
        used_at=timezone.now()
    )

    log_user_action(
        action=UserAuditLog.ACTION_CHANGE_PASSWORD,
        user=user,
        operator=user,
        request=request,
        detail={"must_change_password": False},
    )


def build_password_reset_link(user: User, raw_token: str) -> str:
    frontend_base = getattr(settings, "FRONTEND_APP_URL", "http://localhost:3000").rstrip("/")
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    return f"{frontend_base}/reset-password?uid={uid}&token={raw_token}"


@transaction.atomic
def request_password_reset(*, email: str, request) -> None:
    normalized_email = (email or "").strip().lower()
    if normalized_email:
        validate_email(normalized_email)

    user = (
        User.objects.filter(email__iexact=normalized_email, is_deleted=False)
        .order_by("id")
        .first()
    )
    if user is None or not user.email:
        return

    now = timezone.now()
    PasswordResetToken.objects.filter(
        user=user,
        used_at__isnull=True,
    ).update(used_at=now)

    raw_token = secrets.token_urlsafe(32)
    token_hash = PasswordResetToken.build_token_hash(raw_token)
    ttl_hours = int(getattr(settings, "PASSWORD_RESET_TOKEN_TTL_HOURS", PASSWORD_RESET_TOKEN_TTL_HOURS))
    PasswordResetToken.objects.create(
        user=user,
        token_hash=token_hash,
        expires_at=now + timedelta(hours=ttl_hours),
    )

    reset_link = build_password_reset_link(user, raw_token)
    message = (
        "A password reset request was received for your account.\n\n"
        f"Username: {user.username}\n"
        f"Reset link: {reset_link}\n\n"
        f"This link expires in {ttl_hours} hour(s). If you did not request it, you can ignore this email."
    )
    send_mail(
        subject="Password reset request",
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"),
        recipient_list=[user.email],
        fail_silently=False,
    )

    log_user_action(
        action=UserAuditLog.ACTION_FORGOT_PASSWORD,
        user=user,
        operator=None,
        request=request,
        detail={"email": user.email},
    )


@transaction.atomic
def confirm_password_reset(
    *,
    uid: str,
    token: str,
    new_password: str,
    request,
) -> User:
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
    except Exception as exc:
        raise ValidationError({"token": ["Reset link is invalid or expired."]}) from exc

    user = User.objects.filter(pk=user_id, is_deleted=False).first()
    if user is None:
        raise ValidationError({"token": ["Reset link is invalid or expired."]})

    validate_new_password(new_password, user=user)

    token_hash = PasswordResetToken.build_token_hash(token)
    token_obj = PasswordResetToken.objects.filter(
        user=user,
        token_hash=token_hash,
    ).first()

    now = timezone.now()
    if token_obj is None or token_obj.used_at is not None or token_obj.expires_at <= now:
        raise ValidationError({"token": ["Reset link is invalid or expired."]})

    user.set_password(new_password)
    user.must_change_password = False
    user.save(update_fields=["password", "must_change_password", "updated_at"])

    token_obj.used_at = now
    token_obj.save(update_fields=["used_at"])
    PasswordResetToken.objects.filter(user=user, used_at__isnull=True).exclude(
        pk=token_obj.pk
    ).update(used_at=now)

    log_user_action(
        action=UserAuditLog.ACTION_RESET_PASSWORD,
        user=user,
        operator=None,
        request=request,
        detail={"source": "forgot_password"},
    )
    return user


@transaction.atomic
def soft_delete_user(*, target: User, operator: User, request) -> User:
    ensure_can_manage_target(operator, target, allow_delete=True)

    if target.is_deleted:
        return target

    target.is_deleted = True
    target.is_active = False
    target.approve_status = User.STATUS_DISABLED
    target.save(update_fields=["is_deleted", "is_active", "approve_status", "updated_at"])

    log_user_action(
        action=UserAuditLog.ACTION_DELETE,
        user=target,
        operator=operator,
        request=request,
        detail={"deleted": True},
    )
    return target
