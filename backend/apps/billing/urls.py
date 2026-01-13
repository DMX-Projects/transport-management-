from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BillViewSet, BillItemViewSet

router = DefaultRouter()
router.register(r'bills', BillViewSet, basename='bill')
router.register(r'bill-items', BillItemViewSet, basename='bill-item')

urlpatterns = [
    path('', include(router.urls)),
]

