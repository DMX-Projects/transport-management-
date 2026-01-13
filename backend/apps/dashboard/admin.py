from django.contrib import admin
from .models import DashboardStats


@admin.register(DashboardStats)
class DashboardStatsAdmin(admin.ModelAdmin):
    list_display = [
        'branch', 'date', 'stats_type', 'total_lrs', 'pending_lrs',
        'total_hpas', 'pending_hpas', 'total_revenue', 'last_updated'
    ]
    list_filter = ['stats_type', 'date', 'branch', 'last_updated']
    search_fields = ['branch__name', 'branch__code']
    readonly_fields = ['last_updated', 'created_at', 'updated_at']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('branch', 'date', 'stats_type')
        }),
        ('LR Statistics', {
            'fields': ('total_lrs', 'pending_lrs', 'in_transit_lrs', 'delivered_lrs', 'cancelled_lrs')
        }),
        ('HPA Statistics', {
            'fields': ('total_hpas', 'pending_hpas', 'partial_hpas', 'paid_hpas')
        }),
        ('POD Statistics', {
            'fields': ('total_pods', 'pending_pods', 'delivered_pods')
        }),
        ('Bill Statistics', {
            'fields': ('total_bills', 'pending_bills', 'paid_bills')
        }),
        ('Financial Statistics', {
            'fields': ('total_revenue', 'pending_payments', 'total_freight')
        }),
        ('Master Data Statistics', {
            'fields': ('active_trucks', 'total_trucks', 'total_consignors', 'total_parties')
        }),
        ('Metadata', {
            'fields': ('last_updated', 'created_at', 'updated_at', 'created_by', 'updated_by')
        }),
    )

