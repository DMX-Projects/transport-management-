from django.contrib import admin
from .models import Bill, BillItem


class BillItemInline(admin.TabularInline):
    model = BillItem
    extra = 0
    readonly_fields = ['total_amount']


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ['bill_number', 'consignor', 'bill_date', 'total_amount', 'grand_total', 'status', 'branch']
    list_filter = ['status', 'branch', 'bill_date']
    search_fields = ['bill_number', 'consignor__name', 'consignor__gstin']
    readonly_fields = ['bill_number', 'total_quantity_mt', 'total_amount', 'sgst_amount', 'cgst_amount', 'grand_total', 'created_at', 'updated_at']
    inlines = [BillItemInline]


@admin.register(BillItem)
class BillItemAdmin(admin.ModelAdmin):
    list_display = ['bill', 'lr', 'destination', 'quantity_mt', 'freight_rate', 'total_amount']
    list_filter = ['bill__branch', 'bill__bill_date']
    search_fields = ['bill__bill_number', 'lr__lr_number', 'destination']



