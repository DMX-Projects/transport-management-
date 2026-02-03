from django.contrib import admin
from .models import PaymentTransaction, HPALRLink


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'hpa', 'payment_type', 'amount', 'payment_date', 'payment_method', 'created_at']
    list_filter = ['payment_type', 'payment_method', 'payment_date', 'branch']
    search_fields = ['hpa__hpa_number', 'reference_number', 'remarks']
    date_hierarchy = 'payment_date'
    ordering = ['-payment_date', '-created_at']


@admin.register(HPALRLink)
class HPALRLinkAdmin(admin.ModelAdmin):
    list_display = ['id', 'hpa', 'lr', 'tonnage', 'rate_per_tonne', 'amount', 'created_at']
    list_filter = ['created_at', 'branch']
    search_fields = ['hpa__hpa_number', 'lr__lr_number']
    ordering = ['-created_at']
