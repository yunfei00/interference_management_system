# datahub/urls.py
from django.urls import path
from . import views

app_name = 'datahub'
urlpatterns = [
    path('', views.dataset_list, name='dataset_list'),
    path('dataset/create/', views.dataset_create, name='dataset_create'),
    path('upload/', views.upload_file, name='upload'),
    path('dataset/<int:pk>/', views.dataset_detail, name='dataset_detail'),
    path('dataset/<int:pk>/heatmap.svg', views.heatmap_svg, name='heatmap_svg'),
    path('api/ingest', views.api_ingest, name='api_ingest'),
]
