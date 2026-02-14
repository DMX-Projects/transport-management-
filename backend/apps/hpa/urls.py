from rest_framework.routers import DefaultRouter
from .views import HirePaymentAdviceViewSet

router = DefaultRouter()
router.register(r'hire-payment-advices', HirePaymentAdviceViewSet, basename='hire-payment-advice')

urlpatterns = router.urls
