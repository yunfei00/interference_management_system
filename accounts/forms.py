# accounts/forms.py
from django import forms
from django.contrib.auth.forms import AuthenticationForm

from .models import Department, User


class RegisterForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput, label="密码")
    confirm_password = forms.CharField(
        widget=forms.PasswordInput,
        label="确认密码",
    )
    department = forms.ModelChoiceField(
        queryset=Department.objects.none(),
        required=False,
        label="所属部门",
        empty_label="请选择部门",
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "company",
            "phone",
            "department",
            "password",
            "confirm_password",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["department"].queryset = Department.objects.filter(
            is_active=True,
            department_type=Department.TYPE_DEPARTMENT,
        ).select_related("parent")

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("password") != cleaned.get("confirm_password"):
            self.add_error("confirm_password", "两次密码不一致")
        return cleaned


class LoginForm(AuthenticationForm):
    def confirm_login_allowed(self, user):
        if user.approve_status != User.APPROVE_APPROVED and not user.is_superuser:
            raise forms.ValidationError(
                "账号未通过审批，请联系管理员。",
                code="not_approved",
            )
