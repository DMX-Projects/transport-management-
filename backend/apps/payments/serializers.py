from rest_framework import serializers
from .models import Payment
from apps.hpa.serializers import HirePaymentAdviceSerializer


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment records"""
    hpa = HirePaymentAdviceSerializer(read_only=True)
    hpa_id = serializers.IntegerField(write_only=True)
    hpa_number = serializers.CharField(source='hpa.hpa_number', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    branch_code = serializers.CharField(source='branch.code', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True)
    reconciled_by_name = serializers.CharField(source='reconciled_by.username', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number', 'payment_date', 'branch', 'branch_name', 'branch_code',
            'hpa', 'hpa_id', 'hpa_number', 'payment_method', 'amount', 'status',
            'cheque_number', 'cheque_date', 'bank_name', 'clearing_date',
            'upi_transaction_id', 'upi_id',
            'transaction_reference', 'account_number', 'ifsc_code',
            'received_by', 'cash_receipt_number',
            'remarks', 'attachment',
            'reconciled', 'reconciled_date', 'reconciled_by', 'reconciled_by_name',
            'created_at', 'updated_at', 'created_by', 'created_by_name',
            'updated_by', 'updated_by_name',
        ]
        read_only_fields = [
            'id', 'payment_number', 'created_at', 'updated_at',
            'created_by', 'updated_by', 'created_by_name', 'updated_by_name',
        ]
    
    def validate(self, data):
        """Validate payment method specific fields"""
        payment_method = data.get('payment_method')
        
        if payment_method == 'CHEQUE':
            if not data.get('cheque_number'):
                raise serializers.ValidationError({
                    'cheque_number': 'Cheque number is required for cheque payments.'
                })
        
        elif payment_method == 'UPI':
            if not data.get('upi_transaction_id'):
                raise serializers.ValidationError({
                    'upi_transaction_id': 'UPI Transaction ID is required for UPI payments.'
                })
        
        elif payment_method in ['BANK_TRANSFER', 'NEFT', 'RTGS', 'IMPS']:
            if not data.get('transaction_reference'):
                raise serializers.ValidationError({
                    'transaction_reference': 'Transaction reference is required for bank transfers.'
                })
        
        return data


class PaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Payment records"""
    hpa_id = serializers.IntegerField()
    
    class Meta:
        model = Payment
        fields = [
            'payment_date', 'hpa_id', 'payment_method', 'amount', 'status',
            'cheque_number', 'cheque_date', 'bank_name', 'clearing_date',
            'upi_transaction_id', 'upi_id',
            'transaction_reference', 'account_number', 'ifsc_code',
            'received_by', 'cash_receipt_number',
            'remarks', 'attachment',
        ]
    
    def validate(self, data):
        """Validate payment method specific fields"""
        payment_method = data.get('payment_method')
        
        if payment_method == 'CHEQUE':
            if not data.get('cheque_number'):
                raise serializers.ValidationError({
                    'cheque_number': 'Cheque number is required for cheque payments.'
                })
        
        elif payment_method == 'UPI':
            if not data.get('upi_transaction_id'):
                raise serializers.ValidationError({
                    'upi_transaction_id': 'UPI Transaction ID is required for UPI payments.'
                })
        
        elif payment_method in ['BANK_TRANSFER', 'NEFT', 'RTGS', 'IMPS']:
            if not data.get('transaction_reference'):
                raise serializers.ValidationError({
                    'transaction_reference': 'Transaction reference is required for bank transfers.'
                })
        
        return data

