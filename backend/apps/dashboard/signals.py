from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from django.db import transaction
from apps.lr.models import LorryReceipt
from apps.hpa.models import HirePaymentAdvice
from apps.masters.models import Truck, Consignor, Party
from .models import DashboardStats


def _calculate_and_save_stats(stats, branch, user=None):
    """Helper function to calculate and save statistics"""
    # Update LR statistics
    lr_queryset = LorryReceipt.objects.filter(is_deleted=False)
    if branch:
        lr_queryset = lr_queryset.filter(branch=branch)
    
    stats.total_lrs = lr_queryset.count()
    # Pending LRs = LRs without HPA (awaiting HPA creation)
    stats.pending_lrs = lr_queryset.filter(hpa__isnull=True).exclude(status='CANCELLED').count()
    stats.in_transit_lrs = lr_queryset.filter(status='IN_TRANSIT').count()
    stats.delivered_lrs = lr_queryset.filter(status='DELIVERED').count()
    stats.cancelled_lrs = lr_queryset.filter(status='CANCELLED').count()
    
    # Update HPA statistics
    hpa_queryset = HirePaymentAdvice.objects.filter(is_deleted=False)
    if branch:
        hpa_queryset = hpa_queryset.filter(branch=branch)
    
    stats.total_hpas = hpa_queryset.count()
    stats.pending_hpas = hpa_queryset.filter(payment_status='PENDING').count()
    stats.partial_hpas = hpa_queryset.filter(payment_status='PARTIAL').count()
    stats.paid_hpas = hpa_queryset.filter(payment_status='PAID').count()
    
    # POD component removed; set POD stats to zero
    stats.total_pods = 0
    stats.pending_pods = 0
    stats.delivered_pods = 0
    
    # Billing removed; set Bill stats to zero
    stats.total_bills = 0
    stats.pending_bills = 0
    stats.paid_bills = 0
    
    # Update Financial statistics
    from django.db.models import Sum
    
    # Total revenue set to zero (billing removed)
    stats.total_revenue = 0
    
    # Pending payments (from HPAs)
    stats.pending_payments = hpa_queryset.filter(
        payment_status__in=['PENDING', 'PARTIAL']
    ).aggregate(
        total=Sum('balance_rs')
    )['total'] or 0
    
    # Total freight (from HPAs) - LR doesn't have freight_amount anymore
    # Financial amounts are only in HPA, so calculate from HPAs
    stats.total_freight = hpa_queryset.aggregate(
        total=Sum('lorry_hire_rs')
    )['total'] or 0
    
    # Update Truck statistics
    truck_queryset = Truck.objects.filter(is_deleted=False)
    stats.total_trucks = truck_queryset.count()
    stats.active_trucks = truck_queryset.filter(is_active=True).count()
    
    # Update Consignor/Party statistics
    stats.total_consignors = Consignor.objects.filter(is_deleted=False).count()
    stats.total_parties = Party.objects.filter(is_deleted=False).count()
    
    # Update user fields if provided
    if user:
        stats.updated_by = user
        if not stats.created_by_id:
            stats.created_by = user
    
    stats.save()


def update_dashboard_stats(branch=None, date_obj=None, user=None):
    """
    Update dashboard statistics for a given branch and date
    This function is called whenever data changes
    Updates both branch-specific and all-branches stats
    """
    if date_obj is None:
        date_obj = timezone.now().date()
    
    # Update branch-specific stats if branch is provided
    if branch:
        stats, created = DashboardStats.objects.get_or_create(
            branch=branch,
            date=date_obj,
            stats_type='DAILY',
            defaults={
                'created_by': user,
                'updated_by': user,
            } if user else {}
        )
        _calculate_and_save_stats(stats, branch, user)
    
    # Always update all-branches stats (for SUPER_ADMIN view)
    all_branches_stats, created = DashboardStats.objects.get_or_create(
        branch=None,
        date=date_obj,
        stats_type='DAILY',
        defaults={
            'created_by': user,
            'updated_by': user,
        } if user else {}
    )
    _calculate_and_save_stats(all_branches_stats, None, user)


# LR Signals
@receiver(post_save, sender=LorryReceipt)
def update_stats_on_lr_save(sender, instance, **kwargs):
    """Update dashboard stats when LR is created or updated"""
    if not instance.is_deleted:
        user = getattr(instance, '_current_user', None) or instance.updated_by
        transaction.on_commit(
            lambda: update_dashboard_stats(
                branch=instance.branch,
                date_obj=timezone.now().date(),
                user=user
            )
        )


@receiver(post_delete, sender=LorryReceipt)
def update_stats_on_lr_delete(sender, instance, **kwargs):
    """Update dashboard stats when LR is deleted"""
    user = getattr(instance, '_current_user', None) or instance.updated_by
    transaction.on_commit(
        lambda: update_dashboard_stats(
            branch=instance.branch,
            date_obj=timezone.now().date(),
            user=user
        )
    )


# HPA Signals
@receiver(post_save, sender=HirePaymentAdvice)
def update_stats_on_hpa_save(sender, instance, **kwargs):
    """Update dashboard stats when HPA is created or updated"""
    if not instance.is_deleted:
        user = getattr(instance, '_current_user', None) or instance.updated_by
        transaction.on_commit(
            lambda: update_dashboard_stats(
                branch=instance.branch,
                date_obj=timezone.now().date(),
                user=user
            )
        )


@receiver(post_delete, sender=HirePaymentAdvice)
def update_stats_on_hpa_delete(sender, instance, **kwargs):
    """Update dashboard stats when HPA is deleted"""
    user = getattr(instance, '_current_user', None) or instance.updated_by
    transaction.on_commit(
        lambda: update_dashboard_stats(
            branch=instance.branch,
            date_obj=timezone.now().date(),
            user=user
        )
    )


# POD component removed; no POD signals

# Billing removed; no Bill signals
