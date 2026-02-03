from django.urls import path
from .views import ReportsViewSet

# Explicit paths for all report actions
urlpatterns = [
    # Report endpoints
    path('summary/', ReportsViewSet.as_view({'get': 'summary'}), name='summary'),
    path('lr-report/', ReportsViewSet.as_view({'get': 'lr_report'}), name='lr-report'),
    path('hpa-report/', ReportsViewSet.as_view({'get': 'hpa_report'}), name='hpa-report'),
    path('payment-report/', ReportsViewSet.as_view({'get': 'payment_report'}), name='payment-report'),
    path('bill-report/', ReportsViewSet.as_view({'get': 'bill_report'}), name='bill-report'),
    
    # Phase 5: Outstanding Reports
    path('outstanding_summary/', ReportsViewSet.as_view({'get': 'outstanding_summary'}), name='outstanding-summary'),
    path('outstanding_detailed/', ReportsViewSet.as_view({'get': 'outstanding_detailed'}), name='outstanding-detailed'),
    path('aging_analysis/', ReportsViewSet.as_view({'get': 'aging_analysis'}), name='aging-analysis'),
    path('settlement_report/', ReportsViewSet.as_view({'get': 'settlement_report'}), name='settlement-report'),
    path('client-statement/<int:consignor_id>/', ReportsViewSet.as_view({'get': 'client_statement'}), name='client-statement'),
    
    # Excel Export Endpoints
    path('export-outstanding/', ReportsViewSet.as_view({'get': 'export_outstanding'}), name='export-outstanding'),
    path('export-aging/', ReportsViewSet.as_view({'get': 'export_aging'}), name='export-aging'),
    path('export-settlement/', ReportsViewSet.as_view({'get': 'export_settlement'}), name='export-settlement'),
    path('export-client-statement/<int:consignor_id>/', ReportsViewSet.as_view({'get': 'export_client_statement'}), name='export-client-statement'),
    
    # PDF async endpoints
    path('request-bill-pdf/', ReportsViewSet.as_view({'post': 'request_bill_pdf'}), name='request-bill-pdf'),
    path('request-lr-pdf/', ReportsViewSet.as_view({'post': 'request_lr_pdf'}), name='request-lr-pdf'),
    path('request-hpa-pdf/', ReportsViewSet.as_view({'post': 'request_hpa_pdf'}), name='request-hpa-pdf'),
    path('task-status/', ReportsViewSet.as_view({'get': 'task_status'}), name='task-status'),
    path('download-bill/', ReportsViewSet.as_view({'get': 'download_bill'}), name='download-bill'),
    path('download-bill-sync/', ReportsViewSet.as_view({'get': 'download_bill_sync'}), name='download-bill-sync'),
    path('download-lr/', ReportsViewSet.as_view({'get': 'download_lr'}), name='download-lr'),
    path('download-hpa/', ReportsViewSet.as_view({'get': 'download_hpa'}), name='download-hpa'),
    
    # Phase 5 Additions: Truck Statement & LR-HPA Mapping
    path('truck-statement/<int:truck_id>/', ReportsViewSet.as_view({'get': 'truck_statement'}), name='truck-statement'),
    path('lr-hpa-mapping/', ReportsViewSet.as_view({'get': 'lr_hpa_mapping'}), name='lr-hpa-mapping'),
    path('pending-truck-payments/', ReportsViewSet.as_view({'get': 'pending_truck_payments'}), name='pending-truck-payments'),
]
