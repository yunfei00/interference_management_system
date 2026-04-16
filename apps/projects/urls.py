from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AttachmentViewSet, MilestoneViewSet, ProjectViewSet, TaskViewSet

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")
router.register("tasks", TaskViewSet, basename="task")
router.register("milestones", MilestoneViewSet, basename="milestone")
router.register("attachments", AttachmentViewSet, basename="attachment")

urlpatterns = [path("", include(router.urls))]
