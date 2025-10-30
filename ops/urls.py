from django.urls import path
from . import views

app_name = "ops"

urlpatterns = [
    path("hosts/", views.host_list, name="host_list"),
    path("hosts/create/", views.host_create, name="host_create"),
    path("hosts/<int:pk>/edit/", views.host_edit, name="host_edit"),
    path("commands/", views.command_list, name="command_list"),
    path("hosts/<int:pk>/command/", views.command_single, name="command_single"),
    path("commands/batch/", views.command_batch, name="command_batch"),
]
