from rest_framework import serializers
from .models import DashboardStats
from apps.masters.serializers import BranchSerializer


class DashboardStatsSerializer(serializers.ModelSerializer):
    """Serializer for Dashboard Statistics"""
    branch = BranchSerializer(read_only=True)
    branch_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_username = serializers.CharField(source='updated_by.username', read_only=True)
    
    class Meta:
        model = DashboardStats
        fields = [
            'id', 'branch', 'branch_id', 'date', 'stats_type',
            'total_lrs', 'pending_lrs', 'in_transit_lrs', 'delivered_lrs', 'cancelled_lrs',
            'total_hpas', 'pending_hpas', 'partial_hpas', 'paid_hpas',
            'total_pods', 'pending_pods', 'delivered_pods',
            'total_bills', 'pending_bills', 'paid_bills',
            'total_revenue', 'pending_payments', 'total_freight',
            'active_trucks', 'total_trucks',
            'total_consignors', 'total_parties',
            'last_updated', 'created_at', 'updated_at',
            'created_by_username', 'updated_by_username',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'last_updated',
            'created_by_username', 'updated_by_username',
        ]



