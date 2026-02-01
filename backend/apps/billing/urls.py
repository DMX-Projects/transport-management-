from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BillViewSet, BillItemViewSet, BillingTemplateViewSet,
    ClientPaymentViewSet, ClientAccountViewSet
)

router = DefaultRouter()
router.register(r'bills', BillViewSet, basename='bill')
router.register(r'bill-items', BillItemViewSet, basename='bill-item')
router.register(r'templates', BillingTemplateViewSet, basename='billing-template')
router.register(r'client-payments', ClientPaymentViewSet, basename='client-payment')
router.register(r'client-accounts', ClientAccountViewSet, basename='client-account')

urlpatterns = [
    path('', include(router.urls)),
]

