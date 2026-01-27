from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LorryReceiptViewSet, LRItemViewSet

router = DefaultRouter()
router.register(r'lorry-receipts', LorryReceiptViewSet, basename='lorry-receipt')
router.register(r'lr-items', LRItemViewSet, basename='lr-item')

urlpatterns = [
    path('', include(router.urls)),
]
