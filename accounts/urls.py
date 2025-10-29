# accounts/urls.py
from django.urls import path
from .views import register_view, LoginApprovedView
from django.contrib.auth.views import LogoutView

app_name = 'accounts'
urlpatterns = [
    path('register/', register_view, name='register'),
    path('login/', LoginApprovedView.as_view(template_name='accounts/login.html'), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
]
