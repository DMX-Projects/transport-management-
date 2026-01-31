from django.contrib import admin
from .models import ProofOfDelivery


@admin.register(ProofOfDelivery)
class ProofOfDeliveryAdmin(admin.ModelAdmin):
    list_display = ['pod_number', 'lr', 'delivery_date', 'status', 'branch', 'created_at']
    list_filter = ['status', 'branch', 'delivery_date']
    search_fields = ['pod_number', 'lr__lr_number', 'delivered_to']
    readonly_fields = ['pod_number', 'created_at', 'updated_at']



