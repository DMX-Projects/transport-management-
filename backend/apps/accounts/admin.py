from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User Admin with role and branch fields"""
    
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'branch', 'is_active', 'is_staff', 'date_joined']
    list_filter = ['role', 'branch', 'is_active', 'is_staff', 'is_superuser', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone']
    ordering = ['-date_joined']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Information', {
            'fields': ('role', 'branch', 'phone', 'is_active_branch')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Information', {
            'fields': ('role', 'branch', 'phone', 'is_active_branch')
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Override save to automatically set SUPER_ADMIN role for superusers"""
        # If user is a superuser, automatically set role to SUPER_ADMIN
        if obj.is_superuser:
            obj.role = 'SUPER_ADMIN'
            obj.branch = None  # Super admins don't have a branch
        # If creating a new user and role is not set, use default
        elif not change and not obj.role:
            obj.role = 'BRANCH_MANAGER'
        super().save_model(request, obj, form, change)
