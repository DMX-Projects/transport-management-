from django.contrib import admin
from .models import HirePaymentAdvice
from .transactions import HPATransaction


@admin.register(HPATransaction)
class HPATransactionAdmin(admin.ModelAdmin):
    list_display = [
        'transaction_number', 'transaction_date', 'hpa',
        'transaction_type', 'amount', 'payment_mode', 'created_by'
    ]
    list_filter = ['transaction_type', 'payment_mode', 'transaction_date', 'branch']
    search_fields = [
        'transaction_number', 'hpa__hpa_number', 'description',
        'pump_name', 'cheque_number', 'reference_number'
    ]
    readonly_fields = [
        'transaction_number', 'branch',
        'created_at', 'created_by', 'updated_at', 'updated_by'
    ]
    fieldsets = (
        ('Basic Information', {
            'fields': ('transaction_number', 'transaction_date', 'hpa', 'branch')
        }),
        ('Transaction Details', {
            'fields': ('transaction_type', 'amount', 'payment_mode', 'description')
        }),
        ('Additional Information', {
            'fields': (
                'pump_name', 'cheque_number', 'bank_name',
                'upi_transaction_id', 'reference_number', 'remarks'
            )
        }),
        ('Attachment', {
            'fields': ('attachment',)
        }),
        ('Audit Trail', {
            'fields': ('created_at', 'created_by', 'updated_at', 'updated_by')
        }),
    )


@admin.register(HirePaymentAdvice)
class HirePaymentAdviceAdmin(admin.ModelAdmin):
    list_display = [
        'hpa_number', 'hpa_date', 'lr', 'truck',
        'lorry_hire_rs', 'total_deductions', 'balance_rs',
        'payment_status', 'paid_amount'
    ]
    list_filter = ['payment_status', 'hpa_date', 'payment_mode', 'branch']
    search_fields = ['hpa_number', 'invoice_number', 'lr__lr_number', 'truck__truck_number', 'driver_name', 'driver_mob']
    readonly_fields = [
        'hpa_number', 'total_deductions', 'balance_rs',
        'created_at', 'created_by', 'updated_at', 'updated_by',
        'deleted_at', 'deleted_by'
    ]
    fieldsets = (
        ('Basic Information', {
            'fields': ('hpa_number', 'invoice_number', 'hpa_date', 'branch', 'lr', 'truck')
        }),
        ('Location Details', {
            'fields': ('from_location', 'to_location')
        }),
        ('Owner & Driver Details', {
            'fields': ('owner_name', 'owner_mob', 'driver_name', 'driver_mob', 'lr_reference')
        }),
        ('Quantity & Rate', {
            'fields': ('tons', 'rate_per_tonne', 'lorry_hire_rs')
        }),
        ('Payment Breakdown', {
            'fields': (
                'advance_paid_rs', 'diesel_amount', 'pump_name',
                'bank_amount', 'other_deductions', 'other_deductions_description',
                'total_deductions', 'balance_rs'
            )
        }),
        ('Payment Status', {
            'fields': (
                'payment_status', 'paid_amount',
                'payment_date', 'payment_mode'
            )
        }),
        ('Notes', {
            'fields': ('note', 'remarks')
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
