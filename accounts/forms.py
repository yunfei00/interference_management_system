# accounts/forms.py
from django import forms
from .models import User
from django.contrib.auth.forms import AuthenticationForm

class RegisterForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput, label='密码')
    confirm_password = forms.CharField(widget=forms.PasswordInput, label='确认密码')

    class Meta:
        model = User
        fields = ['username', 'email', 'company', 'phone', 'password', 'confirm_password']

    def clean(self):
        cleaned = super().clean()
        if cleaned.get('password') != cleaned.get('confirm_password'):
            self.add_error('confirm_password', '两次密码不一致')
        return cleaned

class LoginForm(AuthenticationForm):
    def confirm_login_allowed(self, user):
        if user.approve_status != 'approved':
            raise forms.ValidationError('账号未通过审批，请联系管理员。', code='not_approved')
