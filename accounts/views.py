from django.shortcuts import render

# Create your views here.
# accounts/views.py
from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.views import LoginView
from django.shortcuts import render, redirect
from .forms import RegisterForm, LoginForm
from .models import User

def register_view(request):
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user: User = form.save(commit=False)
            user.set_password(form.cleaned_data['password'])
            user.approve_status = 'pending'
            user.save()
            messages.success(request, '注册成功，等待管理员审批。')
            return redirect('accounts:login')
    else:
        form = RegisterForm()
    return render(request, 'accounts/register.html', {'form': form})

class LoginApprovedView(LoginView):
    authentication_form = LoginForm
