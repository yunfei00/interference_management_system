from django import forms
from django.contrib.auth.forms import AuthenticationForm

from .models import Department, User


class RegisterForm(forms.ModelForm):
    real_name = forms.CharField(label="Real name")
    title = forms.CharField(required=False, label="Title")
    password = forms.CharField(widget=forms.PasswordInput, label="Password")
    confirm_password = forms.CharField(
        widget=forms.PasswordInput,
        label="Confirm password",
    )
    department = forms.ModelChoiceField(
        queryset=Department.objects.none(),
        required=False,
        label="Department",
        empty_label="Select a department",
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "real_name",
            "company",
            "phone",
            "title",
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
            self.add_error("confirm_password", "The two password entries do not match.")
        return cleaned


class LoginForm(AuthenticationForm):
    def confirm_login_allowed(self, user):
        if user.is_deleted or user.status == User.STATUS_DISABLED:
            raise forms.ValidationError(
                "This account has been disabled. Please contact an administrator.",
                code="account_disabled",
            )
        if user.status == User.STATUS_PENDING:
            raise forms.ValidationError(
                "This account is still pending approval.",
                code="account_pending",
            )
        if user.status == User.STATUS_REJECTED:
            raise forms.ValidationError(
                "This account has been rejected. Please contact an administrator.",
                code="account_rejected",
            )
