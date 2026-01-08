from rest_framework import serializers
from django.utils import timezone
from .models import LorryReceipt
from apps.masters.serializers import BranchSerializer, TruckSerializer, PartySerializer


class LorryReceiptSerializer(serializers.ModelSerializer):
    # Nested serializers for display
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    truck_number = serializers.CharField(source='truck.truck_number', read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)
    
    # Audit trail fields (read-only)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True)
    
    class Meta:
        model = LorryReceipt
        fields = [
            'id', 'lr_number', 'branch', 'branch_name', 'truck', 'truck_number',
            'party', 'party_name', 'invoice_number', 'invoice_date',
            'from_location', 'to_location', 'material_description',
            'quantity', 'weight_in_tons', 'freight_amount', 'status',
            'lr_date', 'delivery_date', 'remarks',
            'invoice_edited_at', 'invoice_edited_by',
            'created_at', 'created_by', 'created_by_name',
            'updated_at', 'updated_by', 'updated_by_name',
            'is_deleted'
        ]
        read_only_fields = [
            'lr_number', 'lr_date', 'created_at', 'created_by',
            'updated_at', 'updated_by', 'is_deleted',
            'invoice_edited_at', 'invoice_edited_by'
        ]


class LorryReceiptCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating LRs"""
    
    class Meta:
        model = LorryReceipt
        fields = [
            'branch', 'truck', 'party', 'invoice_number', 'invoice_date',
            'from_location', 'to_location', 'material_description', 
            'quantity', 'weight_in_tons', 'freight_amount', 'status',
            'delivery_date', 'remarks'
        ]
    
    def validate_freight_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Freight amount must be greater than 0")
        return value
    
    def validate_weight_in_tons(self, value):
        if value <= 0:
            raise serializers.ValidationError("Weight must be greater than 0")
        return value
    
    def validate_delivery_date(self, value):
        if value and value < timezone.now().date():
            raise serializers.ValidationError("Delivery date cannot be in the past")
        return value
    
    def validate(self, data):
        # Ensure delivery date is after lr_date if provided
        if data.get('delivery_date'):
            from datetime import date
            if data['delivery_date'] < date.today():
                raise serializers.ValidationError({
                    'delivery_date': 'Delivery date cannot be in the past'
                })
        return data


class LorryReceiptUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating LR with invoice edit tracking"""
    
    class Meta:
        model = LorryReceipt
        fields = [
            'truck', 'party', 'invoice_number', 'invoice_date',
            'from_location', 'to_location', 'material_description',
            'quantity', 'weight_in_tons', 'freight_amount',
            'status', 'delivery_date', 'remarks'
        ]
    
    def update(self, instance, validated_data):
        # Track invoice number changes
        if 'invoice_number' in validated_data:
            if instance.invoice_number != validated_data['invoice_number']:
                from django.utils import timezone
                instance.invoice_edited_at = timezone.now()
                if hasattr(self.context.get('request'), 'user'):
                    instance.invoice_edited_by = self.context['request'].user
        
        return super().update(instance, validated_data)
