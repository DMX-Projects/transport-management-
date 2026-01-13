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
    
    # PDF async endpoints
    path('request-bill-pdf/', ReportsViewSet.as_view({'post': 'request_bill_pdf'}), name='request-bill-pdf'),
    path('request-lr-pdf/', ReportsViewSet.as_view({'post': 'request_lr_pdf'}), name='request-lr-pdf'),
    path('request-hpa-pdf/', ReportsViewSet.as_view({'post': 'request_hpa_pdf'}), name='request-hpa-pdf'),
    path('task-status/', ReportsViewSet.as_view({'get': 'task_status'}), name='task-status'),
    path('download-bill/', ReportsViewSet.as_view({'get': 'download_bill'}), name='download-bill'),
    path('download-bill-sync/', ReportsViewSet.as_view({'get': 'download_bill_sync'}), name='download-bill-sync'),
    path('download-lr/', ReportsViewSet.as_view({'get': 'download_lr'}), name='download-lr'),
    path('download-hpa/', ReportsViewSet.as_view({'get': 'download_hpa'}), name='download-hpa'),
]
