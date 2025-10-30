
from django.urls import path, include
from .views import upload_tool, tool_list, download_tool, ToolViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'tools', ToolViewSet)

urlpatterns = [
    path('tools/', tool_list, name='tool_list'),
    path('tools/upload/', upload_tool, name='upload_tool'),
    path('tools/<int:tool_id>/download/', download_tool, name='download_tool'),
    path('api/', include(router.urls)),
]
