from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentTransactionViewSet, HPALRLinkViewSet

router = DefaultRouter()
router.register(r'payments', PaymentTransactionViewSet, basename='payment-transaction')
router.register(r'hpa-lr-links', HPALRLinkViewSet, basename='hpa-lr-link')

urlpatterns = [
    path('', include(router.urls)),
]
