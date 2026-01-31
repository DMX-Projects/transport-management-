from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'payment_number', 'payment_date', 'hpa', 'payment_method',
        'amount', 'status', 'branch', 'created_at'
    ]
    list_filter = ['payment_method', 'status', 'payment_date', 'branch', 'reconciled']
    search_fields = ['payment_number', 'hpa__hpa_number', 'cheque_number', 'upi_transaction_id', 'transaction_reference']
    readonly_fields = ['payment_number', 'created_at', 'updated_at']
    date_hierarchy = 'payment_date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('payment_number', 'payment_date', 'branch', 'hpa')
        }),
        ('Payment Details', {
            'fields': ('payment_method', 'amount', 'status')
        }),
        ('Cheque Details', {
            'fields': ('cheque_number', 'cheque_date', 'bank_name', 'clearing_date'),
            'classes': ('collapse',)
        }),
        ('UPI Details', {
            'fields': ('upi_transaction_id', 'upi_id'),
            'classes': ('collapse',)
        }),
        ('Bank Transfer Details', {
            'fields': ('transaction_reference', 'account_number', 'ifsc_code'),
            'classes': ('collapse',)
        }),
        ('Cash Details', {
            'fields': ('received_by', 'cash_receipt_number'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('remarks', 'attachment')
        }),
        ('Reconciliation', {
            'fields': ('reconciled', 'reconciled_date', 'reconciled_by')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by')
        }),
    )



