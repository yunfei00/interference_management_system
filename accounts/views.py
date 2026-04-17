from django.contrib import messages
from django.contrib.auth.views import LoginView
from django.shortcuts import redirect, render
from django.urls import reverse

from .forms import LoginForm, RegisterForm
from .models import User


def register_view(request):
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user: User = form.save(commit=False)
            user.real_name = form.cleaned_data["real_name"]
            user.title = form.cleaned_data.get("title", "")
            user.set_password(form.cleaned_data["password"])
            user.approve_status = User.STATUS_PENDING
            user.role = User.ROLE_USER
            user.save()
            messages.success(
                request,
                "Registration submitted successfully. Please wait for administrator approval.",
            )
            return redirect("accounts:login")
    else:
        form = RegisterForm()
    return render(request, "accounts/register.html", {"form": form})


class LoginApprovedView(LoginView):
    authentication_form = LoginForm
    redirect_authenticated_user = True
    template_name = "accounts/login.html"

    def get_success_url(self):
        redirect_to = self.get_redirect_url()
        if redirect_to and redirect_to != "/":
            return redirect_to
        return reverse("admin:index")
