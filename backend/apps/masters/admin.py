from django.contrib import admin
from .models import Company, Branch, Party, Truck, ChartOfAccounts, GSTConfig, TDSConfig


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'gstin', 'city', 'state', 'is_deleted']
    search_fields = ['name', 'gstin']


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'code', 'city', 'state', 'is_deleted']
    list_filter = ['company', 'state']
    search_fields = ['name', 'code']


@admin.register(Party)
class PartyAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'gstin', 'city', 'state', 'is_deleted']
    list_filter = ['state']
    search_fields = ['name', 'code', 'gstin']


@admin.register(Truck)
class TruckAdmin(admin.ModelAdmin):
    list_display = ['truck_number', 'truck_type', 'owner_name', 'capacity_tons', 'is_deleted']
    list_filter = ['truck_type']
    search_fields = ['truck_number', 'owner_name']


@admin.register(ChartOfAccounts)
class ChartOfAccountsAdmin(admin.ModelAdmin):
    list_display = ['account_code', 'account_name', 'account_type', 'is_deleted']
    list_filter = ['account_type']
    search_fields = ['account_code', 'account_name']


@admin.register(GSTConfig)
class GSTConfigAdmin(admin.ModelAdmin):
    list_display = ['rate', 'description', 'is_deleted']


@admin.register(TDSConfig)
class TDSConfigAdmin(admin.ModelAdmin):
    list_display = ['rate', 'description', 'is_deleted']
