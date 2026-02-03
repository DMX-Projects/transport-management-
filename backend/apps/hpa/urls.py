from rest_framework.routers import DefaultRouter
from .views import HirePaymentAdviceViewSet, ActiveHPAViewSet, HPATransactionViewSet

router = DefaultRouter()
router.register(r'hire-payment-advices', HirePaymentAdviceViewSet, basename='hire-payment-advice')
router.register(r'active-hpas', ActiveHPAViewSet, basename='active-hpa')
router.register(r'transactions', HPATransactionViewSet, basename='hpa-transaction')

urlpatterns = router.urls
