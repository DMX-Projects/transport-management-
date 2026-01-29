from django.contrib import admin
from .models import LorryReceipt


@admin.register(LorryReceipt)
class LorryReceiptAdmin(admin.ModelAdmin):
    list_display = ['lr_number', 'branch', 'truck', 'party', 'status', 'freight_amount', 'lr_date']
    list_filter = ['status', 'branch', 'lr_date']
    search_fields = ['lr_number', 'invoice_number', 'truck__truck_number', 'party__name']
    readonly_fields = ['lr_number', 'lr_date', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('lr_number', 'branch', 'truck', 'party', 'status')
        }),
        ('Invoice Details', {
            'fields': ('invoice_number', 'invoice_date')
        }),
        ('Location & Material', {
            'fields': ('from_location', 'to_location', 'material_description', 'quantity', 'weight_in_tons')
        }),
        ('Financial', {
            'fields': ('freight_amount',)
        }),
        ('Dates', {
            'fields': ('lr_date', 'delivery_date')
        }),
        ('Additional', {
            'fields': ('remarks',)
        }),
        ('Audit Trail', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
