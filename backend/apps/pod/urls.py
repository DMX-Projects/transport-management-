from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProofOfDeliveryViewSet

router = DefaultRouter()
router.register(r'proof-of-deliveries', ProofOfDeliveryViewSet, basename='proof-of-delivery')

urlpatterns = [
    path('', include(router.urls)),
]

