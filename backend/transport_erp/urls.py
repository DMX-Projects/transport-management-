"""
URL configuration for transport_erp project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API v1
    path('api/v1/accounts/', include('apps.accounts.urls')),
    path('api/v1/masters/', include('apps.masters.urls')),
    path('api/v1/lr/', include('apps.lr.urls')),
    path('api/v1/hpa/', include('apps.hpa.urls')),
    # path('api/v1/payments/', include('apps.payments.urls')),  # To be added
    # path('api/v1/pod/', include('apps.pod.urls')),  # To be added
    # path('api/v1/billing/', include('apps.billing.urls')),  # To be added
    # path('api/v1/receipts/', include('apps.receipts.urls')),  # To be added
    # path('api/v1/accounting/', include('apps.accounting.urls')),  # To be added
    # path('api/v1/reports/', include('apps.reports.urls')),  # To be added
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Media files (for development)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
