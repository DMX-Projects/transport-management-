from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LorryReceiptViewSet

router = DefaultRouter()
router.register(r'lorry-receipts', LorryReceiptViewSet, basename='lorry-receipt')

urlpatterns = [
    path('', include(router.urls)),
]
