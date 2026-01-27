from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal
from .models import HirePaymentAdvice
from .transactions import HPATransaction
from apps.lr.models import LorryReceipt
from apps.masters.models import Truck


class HPATransactionSerializer(serializers.ModelSerializer):
    """Serializer for HPA Transactions"""
    
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    payment_mode_display = serializers.CharField(source='get_payment_mode_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = HPATransaction
        fields = [
            'id', 'transaction_number', 'transaction_date',
            'hpa', 'branch',
            'transaction_type', 'transaction_type_display',
            'amount', 'payment_mode', 'payment_mode_display',
            'pump_name', 'cheque_number', 'bank_name',
            'upi_transaction_id', 'reference_number',
            'description', 'remarks', 'attachment',
            'created_at', 'created_by', 'created_by_name',
            'updated_at', 'updated_by',
        ]
        read_only_fields = [
            'transaction_number', 'branch',
            'created_at', 'created_by', 'updated_at', 'updated_by'
        ]


class HPATransactionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating HPA Transactions"""
    
    class Meta:
        model = HPATransaction
        fields = [
            'hpa', 'transaction_date', 'transaction_type', 'amount',
            'payment_mode', 'pump_name', 'cheque_number', 'bank_name',
            'upi_transaction_id', 'reference_number',
            'description', 'remarks', 'attachment'
        ]
    
    def validate_hpa(self, value):
        """Ensure HPA exists and is not deleted"""
        if value.is_deleted:
            raise serializers.ValidationError("Cannot create transaction for deleted HPA")
        return value
    
    def validate(self, data):
        """Validate transaction based on type"""
        transaction_type = data.get('transaction_type')
        
        # Validate diesel transactions
        if transaction_type == 'DIESEL' and not data.get('pump_name'):
            raise serializers.ValidationError({
                'pump_name': 'Pump name is required for diesel transactions'
            })
        
        return data


class HirePaymentAdviceSerializer(serializers.ModelSerializer):
    """Serializer for displaying HPAs"""
    
    # Display fields from related models
    lr_number = serializers.SerializerMethodField()
    lrs = serializers.SerializerMethodField()
    lr_count = serializers.SerializerMethodField()
    truck_number = serializers.CharField(source='truck.truck_number', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True)
    
    class Meta:
        model = HirePaymentAdvice
        fields = [
            'id', 'hpa_number', 'invoice_number', 'hpa_date',
            'branch', 'branch_name',
            'lr', 'lr_number', 'lrs', 'lr_count', 'lr_reference',
            'truck', 'truck_number',
            'from_location', 'to_location',
            'owner_name', 'owner_mob',
            'driver_name', 'driver_mob',
            'tons', 'rate_per_tonne',
            'lorry_hire_rs', 'advance_paid_rs', 'diesel_amount', 'pump_name',
            'bank_amount', 'other_deductions', 'other_deductions_description',
            'total_deductions', 'balance_rs',
            'payment_status', 'paid_amount', 'payment_date', 'payment_mode',
            'note', 'remarks',
            'created_at', 'created_by', 'created_by_name',
            'updated_at', 'updated_by', 'updated_by_name',
            'is_deleted'
        ]
        read_only_fields = [
            'hpa_number', 'total_deductions', 'balance_rs', 'payment_status',
            'created_at', 'created_by', 'updated_at', 'updated_by', 'is_deleted',
            'lrs', 'lr_count'
        ]
    
    def get_lr_number(self, obj):
        """Get primary LR number"""
        return obj.lr.lr_number if obj.lr else None
    
    def get_lrs(self, obj):
        """Get all linked LRs"""
        from apps.lr.serializers import LorryReceiptSerializer
        lrs = obj.lrs
        return LorryReceiptSerializer(lrs, many=True).data if lrs.exists() else []
    
    def get_lr_count(self, obj):
        """Get count of linked LRs"""
        return obj.lrs.count()


class HirePaymentAdviceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating HPAs
    - Branch users: auto-assign branch from user
    - SuperAdmin: must select branch manually
    - All deduction fields are optional (default to 0)
    - Supports single LR (lr field) or multiple LRs (lrs field)
    """
    
    # Support both single LR (backward compatible) and multiple LRs
    lr = serializers.PrimaryKeyRelatedField(
        queryset=LorryReceipt.objects.filter(is_deleted=False),
        required=False,
        allow_null=True,
        help_text='Primary Lorry Receipt (for backward compatibility)'
    )
    lrs = serializers.PrimaryKeyRelatedField(
        queryset=LorryReceipt.objects.filter(is_deleted=False),
        many=True,
        required=False,
        help_text='List of Lorry Receipts to link to this HPA'
    )
    
    # Make truck optional since it will be auto-populated from LR if not provided
    truck = serializers.PrimaryKeyRelatedField(
        queryset=Truck.objects.filter(is_deleted=False),
        required=False,
        allow_null=True,
        help_text='Truck (auto-populated from LR if not provided)'
    )
    
    # Make deduction fields optional - they default to 0 in the model
    advance_paid_rs = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
        default=0
    )
    diesel_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
        default=0
    )
    bank_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
        default=0
    )
    other_deductions = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
        default=0
    )
    
    class Meta:
        model = HirePaymentAdvice
        fields = [
            'branch',  # SuperAdmin selects; Branch users don't provide this
            'lr', 'lrs', 'invoice_number', 'hpa_date',
            'truck', 'from_location', 'to_location',
            'owner_name', 'owner_mob',
            'driver_name', 'driver_mob', 'lr_reference',
            'tons', 'rate_per_tonne',
            'advance_paid_rs', 'diesel_amount', 'pump_name',
            'bank_amount', 'other_deductions', 'other_deductions_description',
            'paid_amount', 'payment_date', 'payment_mode',
            'note', 'remarks'
        ]
    
    def validate_lr(self, value):
        """Ensure LR exists and is not deleted (backward compatibility)"""
        if value and value.is_deleted:
            raise serializers.ValidationError("Cannot create HPA for deleted LR")
        return value
    
    def validate_lrs(self, value):
        """Ensure all LRs exist and are not deleted"""
        if value:
            for lr in value:
                if lr.is_deleted:
                    raise serializers.ValidationError(f"Cannot create HPA for deleted LR: {lr.lr_number}")
        return value
    
    def validate(self, data):
        """Validate that either lr or lrs is provided"""
        lr = data.get('lr')
        lrs = data.get('lrs', [])
        
        if not lr and not lrs:
            raise serializers.ValidationError({
                'lr': 'Either lr or lrs must be provided',
                'lrs': 'Either lr or lrs must be provided'
            })
        
        # If both provided, use lrs (prefer multiple)
        if lr and lrs:
            if lr not in lrs:
                lrs.append(lr)
            data['lrs'] = lrs
            data['lr'] = lrs[0]  # Set first as primary
        
        # If only lr provided, convert to lrs list
        if lr and not lrs:
            data['lrs'] = [lr]
        
        return data
    
    def validate_branch(self, value):
        """Validate branch assignment based on user role"""
        user = self.context.get('request').user if self.context.get('request') else None
        
        if user and user.is_admin:
            # SuperAdmin must provide branch
            if not value:
                raise serializers.ValidationError('SuperAdmin must select a branch')
        
        return value
    
    def validate(self, data):
        """Validate HPA creation rules"""
        user = self.context['request'].user
        
        # Branch users shouldn't provide branch (we auto-assign)
        if not user.is_admin and 'branch' in data:
            raise serializers.ValidationError({'branch': 'Branch users cannot select branch (auto-assigned)'})
        
        # Get LRs (from lrs list or single lr)
        lrs = data.get('lrs', [])
        primary_lr = data.get('lr') or (lrs[0] if lrs else None)
        
        if primary_lr:
            # Calculate total tons from all LRs
            total_tons = Decimal('0')
            for lr in lrs:
                total_tons += lr.total_quantity_mt if hasattr(lr, 'total_quantity_mt') else (lr.quantity_mt or Decimal('0'))
            
            # Use provided tons or calculate from LRs
            tons = data.get('tons')
            if not tons or tons == 0:
                data['tons'] = total_tons
            
            # Use lorry_hire_rs if provided, otherwise calculate from tons and rate
            lorry_hire = data.get('lorry_hire_rs')
            if not lorry_hire:
                tons_value = data.get('tons', total_tons)
                rate = data.get('rate_per_tonne')
                if tons_value and rate:
                    lorry_hire = float(tons_value) * float(rate)
                else:
                    lorry_hire = 0
            
            # Convert deductions to float, using 0 if not provided
            total_deductions = (
                float(data.get('advance_paid_rs') or 0) +
                float(data.get('diesel_amount') or 0) +
                float(data.get('bank_amount') or 0) +
                float(data.get('other_deductions') or 0)
            )
            
            if total_deductions > float(lorry_hire):
                raise serializers.ValidationError({
                    'advance_paid_rs': 'Total deductions cannot exceed lorry hire amount'
                })
            
            balance = float(lorry_hire) - total_deductions
            paid_amount = data.get('paid_amount', 0)
            
            if paid_amount and float(paid_amount) > balance:
                raise serializers.ValidationError({
                    'paid_amount': f'Paid amount cannot exceed balance amount (₹{balance:.2f})'
                })
        
        return data
    
    def create(self, validated_data):
        """Auto-populate from LRs, auto-assign branch, and set created_by"""
        # Get LRs list
        lrs = validated_data.pop('lrs', [])
        primary_lr = validated_data.get('lr') or (lrs[0] if lrs else None)
        
        if not primary_lr:
            raise serializers.ValidationError({'lr': 'At least one LR must be provided'})
        
        user = self.context['request'].user
        
        # Auto-assign branch from user (no manual input) - but allow override if SuperAdmin
        if user.is_admin:
            # SuperAdmin can override
            if 'branch' not in validated_data:
                validated_data['branch'] = primary_lr.branch
        else:
            # Branch users: auto-assign to their branch
            validated_data['branch'] = user.branch
        
        # Auto-populate from primary LR if not provided
        if 'truck' not in validated_data or validated_data['truck'] is None:
            validated_data['truck'] = primary_lr.truck
        if 'from_location' not in validated_data:
            validated_data['from_location'] = primary_lr.from_location or primary_lr.primary_from_location
        if 'to_location' not in validated_data:
            validated_data['to_location'] = primary_lr.to_location or primary_lr.primary_to_location
        if 'driver_name' not in validated_data:
            validated_data['driver_name'] = primary_lr.driver_name
        if 'driver_mob' not in validated_data:
            validated_data['driver_mob'] = primary_lr.driver_phone
        if 'lr_reference' not in validated_data:
            # For multiple LRs, show first LR number or combined
            if len(lrs) > 1:
                lr_numbers = [lr.lr_number for lr in lrs[:3]]
                validated_data['lr_reference'] = f"{lr_numbers[0]} (+{len(lrs)-1} more)" if len(lrs) > 1 else lr_numbers[0]
            else:
                validated_data['lr_reference'] = primary_lr.lr_number
        
        # Calculate total tons from all LRs
        if 'tons' not in validated_data or validated_data['tons'] == 0:
            total_tons = Decimal('0')
            for lr in lrs:
                total_tons += lr.total_quantity_mt if hasattr(lr, 'total_quantity_mt') else (lr.quantity_mt or Decimal('0'))
            validated_data['tons'] = total_tons
        
        # Note: rate_per_tonne is not in LR - it's set when creating HPA
        
        # Calculate lorry_hire_rs if tons and rate provided
        # Note: LR doesn't have financial fields - rate_per_tonne must be provided when creating HPA
        if 'lorry_hire_rs' not in validated_data:
            tons = validated_data.get('tons', 0)
            rate = validated_data.get('rate_per_tonne')
            if tons and rate:
                validated_data['lorry_hire_rs'] = tons * rate
            else:
                # If rate not provided, default to 0 (user must provide rate)
                validated_data['lorry_hire_rs'] = 0
        
        # Set audit fields
        validated_data['created_by'] = user
        validated_data['updated_by'] = user
        
        # Create HPA
        hpa = super().create(validated_data)
        
        # Link additional LRs via ManyToMany (skip primary LR as it's already linked via lr field)
        if len(lrs) > 1:
            additional_lrs = [lr for lr in lrs if lr.id != primary_lr.id]
            if additional_lrs:
                hpa.additional_lrs.set(additional_lrs)
        
        return hpa


class HirePaymentAdviceUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating HPAs - branch users can only update status"""
    
    class Meta:
        model = HirePaymentAdvice
        fields = [
            'invoice_number', 'hpa_date',
            'truck', 'from_location', 'to_location',
            'owner_name', 'owner_mob',
            'driver_name', 'driver_mob',
            'tons', 'rate_per_tonne',
            'advance_paid_rs', 'diesel_amount', 'pump_name',
            'bank_amount', 'other_deductions', 'other_deductions_description',
            'paid_amount', 'payment_date', 'payment_mode',
            'payment_status', 'note', 'remarks'
        ]
    
    def validate(self, data):
        """Validate payment amounts"""
        user = self.context['request'].user
        instance = self.instance
        
        # Branch users: only allow status changes
        if not user.is_admin:
            allowed_fields = {'payment_status'}
            provided_fields = set(data.keys())
            disallowed = provided_fields - allowed_fields
            
            if disallowed:
                raise serializers.ValidationError(
                    f"Branch users can only update 'payment_status'. Cannot edit: {', '.join(disallowed)}"
                )
        
        # Validate financial amounts
        lorry_hire = data.get('lorry_hire_rs', instance.lorry_hire_rs)
        
        # Recalculate if tons or rate changed
        if 'tons' in data or 'rate_per_tonne' in data:
            tons = data.get('tons', instance.tons)
            rate = data.get('rate_per_tonne', instance.rate_per_tonne)
            if tons and rate:
                lorry_hire = tons * rate
                data['lorry_hire_rs'] = lorry_hire
        
        total_deductions = (
            data.get('advance_paid_rs', instance.advance_paid_rs) +
            data.get('diesel_amount', instance.diesel_amount) +
            data.get('bank_amount', instance.bank_amount) +
            data.get('other_deductions', instance.other_deductions)
        )
        
        if total_deductions > lorry_hire:
            raise serializers.ValidationError({
                'advance_paid_rs': 'Total deductions cannot exceed lorry hire amount'
            })
        
        return data
    
    def update(self, instance, validated_data):
        """Set updated_by from request user"""
        validated_data['updated_by'] = self.context['request'].user
        return super().update(instance, validated_data)
