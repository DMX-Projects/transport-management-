from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardStatsViewSet

router = DefaultRouter()
router.register(r'stats', DashboardStatsViewSet, basename='dashboard-stats')

urlpatterns = [
    path('', include(router.urls)),
]

