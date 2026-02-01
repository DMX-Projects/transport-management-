from rest_framework.routers import DefaultRouter
from .views import HirePaymentAdviceViewSet, ActiveHPAViewSet

router = DefaultRouter()
router.register(r'hire-payment-advices', HirePaymentAdviceViewSet, basename='hire-payment-advice')
router.register(r'active-hpas', ActiveHPAViewSet, basename='active-hpa')

urlpatterns = router.urls
