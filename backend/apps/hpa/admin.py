from django.contrib import admin
from .models import HirePaymentAdvice


@admin.register(HirePaymentAdvice)
class HirePaymentAdviceAdmin(admin.ModelAdmin):
    list_display = [
        'hpa_number', 'hpa_date', 'lr', 'truck',
        'freight_amount', 'total_deductions', 'balance_amount',
        'payment_status', 'paid_amount'
    ]
    list_filter = ['payment_status', 'hpa_date', 'payment_mode']
    search_fields = ['hpa_number', 'lr__lr_number', 'truck__truck_number']
    readonly_fields = [
        'hpa_number', 'total_deductions', 'balance_amount',
        'created_at', 'created_by', 'updated_at', 'updated_by',
        'deleted_at', 'deleted_by'
    ]
    fieldsets = (
        ('Basic Information', {
            'fields': ('hpa_number', 'hpa_date', 'lr', 'truck')
        }),
        ('Payment Breakdown', {
            'fields': (
                'freight_amount',
                'advance_paid', 'diesel_amount',
                'loading_charges', 'unloading_charges',
                'other_deductions', 'other_deductions_description',
                'total_deductions', 'balance_amount'
            )
        }),
        ('Payment Status', {
            'fields': (
                'payment_status', 'paid_amount',
                'payment_date', 'payment_mode'
            )
        }),
        ('Additional', {
            'fields': ('remarks',)
        }),
        ('Audit Trail', {
            'fields': (
                'created_at', 'created_by',
                'updated_at', 'updated_by',
                'is_deleted', 'deleted_at', 'deleted_by'
            ),
            'classes': ('collapse',)
        }),
    )
