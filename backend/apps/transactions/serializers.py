from rest_framework import serializers
from decimal import Decimal
from .models import PaymentTransaction, HPALRLink
from apps.hpa.models import HirePaymentAdvice
from apps.lr.models import LorryReceipt


class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Serializer for displaying Payment Transactions"""
    
    hpa_number = serializers.CharField(source='hpa.hpa_number', read_only=True)
    truck_number = serializers.CharField(source='hpa.truck.truck_number', read_only=True)
    driver_name = serializers.CharField(source='hpa.driver_name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'branch', 'branch_name',
            'hpa', 'hpa_number', 'truck_number', 'driver_name',
            'payment_type', 'payment_type_display',
            'amount', 'payment_date',
            'payment_method', 'payment_method_display',
            'reference_number', 'pump_name', 'bank_name',
            'remarks', 'attachment',
            'created_at', 'created_by', 'created_by_name',
            'updated_at'
        ]
        read_only_fields = ['created_at', 'created_by', 'updated_at']


class PaymentTransactionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating Payment Transactions"""
    
    class Meta:
        model = PaymentTransaction
        fields = [
            'branch', 'hpa', 'payment_type', 'amount', 'payment_date',
            'payment_method', 'reference_number', 'pump_name', 'bank_name',
            'remarks', 'attachment'
        ]
    
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        return value
    
    def validate(self, data):
        """Validate payment data"""
        payment_type = data.get('payment_type')
        
        # Require pump_name for diesel payments
        if payment_type == 'DIESEL' and not data.get('pump_name'):
            raise serializers.ValidationError({
                'pump_name': 'Pump name is required for diesel payments'
            })
        
        # Require bank_name for bank transfers
        if payment_type == 'BANK' and not data.get('bank_name'):
            raise serializers.ValidationError({
                'bank_name': 'Bank name is required for bank transfers'
            })
        
        return data
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        validated_data['updated_by'] = user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        validated_data['updated_by'] = self.context['request'].user
        return super().update(instance, validated_data)


class HPALRLinkSerializer(serializers.ModelSerializer):
    """Serializer for displaying HPA-LR Links"""
    
    hpa_number = serializers.CharField(source='hpa.hpa_number', read_only=True)
    lr_number = serializers.CharField(source='lr.lr_number', read_only=True)
    lr_date = serializers.DateField(source='lr.lr_date', read_only=True)
    consignor_name = serializers.SerializerMethodField()
    consignee_name = serializers.SerializerMethodField()
    from_location = serializers.SerializerMethodField()
    to_location = serializers.SerializerMethodField()
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    
    class Meta:
        model = HPALRLink
        fields = [
            'id', 'branch', 'branch_name',
            'hpa', 'hpa_number',
            'lr', 'lr_number', 'lr_date',
            'consignor_name', 'consignee_name',
            'from_location', 'to_location',
            'tonnage', 'rate_per_tonne', 'amount',
            'special_rate_reason',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'amount']
    
    def get_consignor_name(self, obj):
        if obj.lr.consignor:
            return obj.lr.consignor.name
        # Fallback to first LR item
        first_item = obj.lr.lr_items.filter(is_deleted=False).first()
        return first_item.consignor.name if first_item else None
    
    def get_consignee_name(self, obj):
        if obj.lr.consignee:
            return obj.lr.consignee.name
        # Fallback to first LR item
        first_item = obj.lr.lr_items.filter(is_deleted=False).first()
        return first_item.consignee.name if first_item else None
    
    def get_from_location(self, obj):
        return obj.lr.from_location or obj.lr.primary_from_location
    
    def get_to_location(self, obj):
        return obj.lr.to_location or obj.lr.primary_to_location


class HPALRLinkCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating HPA-LR Links"""
    
    class Meta:
        model = HPALRLink
        fields = [
            'branch', 'hpa', 'lr', 'tonnage', 'rate_per_tonne', 'special_rate_reason'
        ]
    
    def validate(self, data):
        # Check if link already exists
        if HPALRLink.objects.filter(hpa=data['hpa'], lr=data['lr']).exists():
            raise serializers.ValidationError({
                'lr': 'This LR is already linked to this HPA'
            })
        
        # Validate LR is not already in another HPA
        existing_link = HPALRLink.objects.filter(lr=data['lr']).exclude(hpa=data['hpa']).first()
        if existing_link:
            raise serializers.ValidationError({
                'lr': f'This LR is already linked to HPA {existing_link.hpa.hpa_number}'
            })
        
        return data
    
    def create(self, validated_data):
        user = self.context['request'].user
        
        # Auto-calculate amount
        tonnage = validated_data.get('tonnage', Decimal('0'))
        rate = validated_data.get('rate_per_tonne', Decimal('0'))
        validated_data['amount'] = tonnage * rate
        
        validated_data['created_by'] = user
        validated_data['updated_by'] = user
        return super().create(validated_data)


# Summary serializers for dashboard and reports
class PaymentSummarySerializer(serializers.Serializer):
    """Summary of payments for an HPA"""
    hpa_id = serializers.IntegerField()
    hpa_number = serializers.CharField()
    total_lorry_hire = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_advance = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_diesel = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_bank = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_other = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)
