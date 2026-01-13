from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompanyViewSet, BranchViewSet, ConsignorViewSet, PartyViewSet, TruckViewSet,
    ChartOfAccountsViewSet, GSTConfigViewSet, TDSConfigViewSet
)

router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'branches', BranchViewSet)
router.register(r'consignors', ConsignorViewSet)
router.register(r'parties', PartyViewSet)
router.register(r'trucks', TruckViewSet)
router.register(r'chart-of-accounts', ChartOfAccountsViewSet)
router.register(r'gst-config', GSTConfigViewSet)
router.register(r'tds-config', TDSConfigViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
