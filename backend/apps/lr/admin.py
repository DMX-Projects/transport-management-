from django.contrib import admin
from .models import LorryReceipt


@admin.register(LorryReceipt)
class LorryReceiptAdmin(admin.ModelAdmin):
    list_display = ['lr_number', 'branch', 'truck', 'consignor', 'consignee', 'status', 'quantity_mt', 'lr_date']
    list_filter = ['status', 'branch', 'lr_date', 'payment_term', 'grade']
    search_fields = ['lr_number', 'sap_number', 'truck__truck_number', 'consignor__name', 'consignee__name', 'driver_name', 'driver_phone']
    readonly_fields = ['lr_number', 'created_at', 'updated_at', 'created_by', 'updated_by']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('lr_number', 'lr_date', 'branch', 'consignor', 'consignee', 'status')
        }),
        ('SAP Details', {
            'fields': ('sap_number', 'lr_submitted_time')
        }),
        ('Location Details', {
            'fields': ('from_location', 'to_location', 'destination', 'delivery_at')
        }),
        ('Material Details', {
            'fields': (
                'material_description', 'quantity_mt', 'number_of_bags',
                'grade', 'grade_quantity', 'grade_type_of_pkg'
            )
        }),
        ('Loading Details', {
            'fields': ('loading_from_department', 'please_load', 'number_of_loads')
        }),
        ('Vehicle & Driver Details', {
            'fields': ('truck', 'driver_name', 'driver_phone', 'driver_license_no')
        }),
        ('Payment Terms & GST', {
            'fields': ('payment_term', 'gst_payable_by'),
            'description': 'Note: Financial amounts (rate, freight) are managed in HPA only'
        }),
        ('Dates', {
            'fields': ('expected_loading_date', 'actual_loading_date', 'expected_delivery_date', 'actual_delivery_date')
        }),
        ('Notes', {
            'fields': ('note', 'remarks')
        }),
        ('Audit Trail', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
