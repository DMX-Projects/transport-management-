from rest_framework import serializers
from django.utils import timezone
from .models import HirePaymentAdvice
from apps.lr.models import LorryReceipt


class HirePaymentAdviceSerializer(serializers.ModelSerializer):
    """Serializer for displaying HPAs"""
    
    # Display fields from related models
    lr_number = serializers.CharField(source='lr.lr_number', read_only=True)
    truck_number = serializers.CharField(source='truck.truck_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True)
    
    class Meta:
        model = HirePaymentAdvice
        fields = [
            'id', 'hpa_number', 'hpa_date',
            'lr', 'lr_number', 'truck', 'truck_number',
            'freight_amount', 'advance_paid', 'diesel_amount',
            'loading_charges', 'unloading_charges',
            'other_deductions', 'other_deductions_description',
            'total_deductions', 'balance_amount',
            'payment_status', 'paid_amount', 'payment_date', 'payment_mode',
            'remarks',
            'created_at', 'created_by', 'created_by_name',
            'updated_at', 'updated_by', 'updated_by_name',
            'is_deleted'
        ]
        read_only_fields = [
            'hpa_number', 'total_deductions', 'balance_amount',
            'created_at', 'created_by', 'updated_at', 'updated_by', 'is_deleted'
        ]


class HirePaymentAdviceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating HPAs"""
    
    class Meta:
        model = HirePaymentAdvice
        fields = [
            'lr', 'advance_paid', 'diesel_amount',
            'loading_charges', 'unloading_charges',
            'other_deductions', 'other_deductions_description',
            'paid_amount', 'payment_date', 'payment_mode',
            'remarks'
        ]
    
    def validate_lr(self, value):
        """Ensure LR exists and is not deleted"""
        if value.is_deleted:
            raise serializers.ValidationError("Cannot create HPA for deleted LR")
        return value
    
    def validate(self, data):
        """Validate payment amounts"""
        # Get freight amount from LR
        lr = data.get('lr')
        if lr:
            freight = lr.freight_amount
            total_deductions = (
                data.get('advance_paid', 0) +
                data.get('diesel_amount', 0) +
                data.get('loading_charges', 0) +
                data.get('unloading_charges', 0) +
                data.get('other_deductions', 0)
            )
            
            if total_deductions > freight:
                raise serializers.ValidationError({
                    'advance_paid': 'Total deductions cannot exceed freight amount'
                })
            
            paid_amount = data.get('paid_amount', 0)
            balance = freight - total_deductions
            
            if paid_amount > balance:
                raise serializers.ValidationError({
                    'paid_amount': f'Paid amount cannot exceed balance amount (₹{balance})'
                })
        
        return data
    
    def create(self, validated_data):
        """Auto-populate truck and freight from LR"""
        lr = validated_data['lr']
        validated_data['truck'] = lr.truck
        validated_data['freight_amount'] = lr.freight_amount
        return super().create(validated_data)


class HirePaymentAdviceUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating HPAs"""
    
    class Meta:
        model = HirePaymentAdvice
        fields = [
            'advance_paid', 'diesel_amount',
            'loading_charges', 'unloading_charges',
            'other_deductions', 'other_deductions_description',
            'paid_amount', 'payment_date', 'payment_mode',
            'remarks'
        ]
    
    def validate(self, data):
        """Validate payment amounts against freight"""
        instance = self.instance
        freight = instance.freight_amount
        
        total_deductions = (
            data.get('advance_paid', instance.advance_paid) +
            data.get('diesel_amount', instance.diesel_amount) +
            data.get('loading_charges', instance.loading_charges) +
            data.get('unloading_charges', instance.unloading_charges) +
            data.get('other_deductions', instance.other_deductions)
        )
        
        if total_deductions > freight:
            raise serializers.ValidationError(
                'Total deductions cannot exceed freight amount'
            )
        
        paid_amount = data.get('paid_amount', instance.paid_amount)
        balance = freight - total_deductions
        
        if paid_amount > balance:
            raise serializers.ValidationError({
                'paid_amount': f'Paid amount cannot exceed balance (₹{balance})'
            })
        
        return data
