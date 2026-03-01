from django.urls import path
from . import views

urlpatterns = [
    path('device-token/', views.DeviceTokenView.as_view(), name='device-token'),
    path('', views.NotificationListView.as_view(), name='list'),
    path('mark-read/', views.mark_all_read, name='mark-read'),
]
