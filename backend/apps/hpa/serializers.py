from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal
from .models import HirePaymentAdvice, HPAInvoice
from .transactions import HPATransaction
from apps.lr.models import LorryReceipt
from apps.masters.models import Truck


class HPAInvoiceSerializer(serializers.ModelSerializer):
    """Serializer for HPA Invoices - Read operations with LR and location tracking"""
    
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    lr_numbers = serializers.CharField(read_only=True)  # Property from model
    lr_count = serializers.IntegerField(read_only=True)  # Property from model
    lr_ids = serializers.SerializerMethodField()
    
    class Meta:
        model = HPAInvoice
        fields = [
            'id', 'sequence_number', 'invoice_number', 'invoice_date',
            'lrs', 'lr_ids', 'lr_numbers', 'lr_count',
            'from_location', 'to_location', 'destination',
            'quantity_mt', 'number_of_bags', 'material_description',
            'remarks',
            'created_at', 'created_by', 'created_by_name',
            'updated_at', 'updated_by'
        ]
        read_only_fields = ['created_at', 'created_by', 'updated_at', 'updated_by', 'sequence_number']
    
    def get_lr_ids(self, obj):
        """Get list of LR IDs for this invoice"""
        return list(obj.lrs.values_list('id', flat=True)) if obj.pk else []


class HPAInvoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating HPA Invoices with LR associations"""
    
    lr_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text='List of LR IDs to associate with this invoice'
    )
    
    class Meta:
        model = HPAInvoice
        fields = [
            'invoice_number', 'invoice_date',
            'lr_ids', 'from_location', 'to_location', 'destination',
            'quantity_mt', 'number_of_bags', 'material_description',
            'remarks'
        ]
    
    def validate_invoice_number(self, value):
        """Ensure invoice number is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Invoice number is required")
        return value.strip()
    
    def validate_lr_ids(self, value):
        """Validate that all LR IDs exist and are accessible"""
        if value:
            lr_count = LorryReceipt.objects.filter(id__in=value, is_deleted=False).count()
            if lr_count != len(value):
                raise serializers.ValidationError("Some LR IDs are invalid or deleted")
        return value
    
    def validate(self, data):
        """Validate uniqueness of invoice number per HPA and populate location from LRs"""
        hpa = self.context.get('hpa')
        invoice_number = data.get('invoice_number', '').strip()
        
        if hpa and invoice_number:
            # Check if invoice already exists for this HPA
            if HPAInvoice.objects.filter(hpa=hpa, invoice_number=invoice_number, is_deleted=False).exists():
                raise serializers.ValidationError({
                    'invoice_number': f'Invoice number {invoice_number} already exists for this HPA'
                })
        
        # Auto-populate location from first LR if not provided
        lr_ids = data.get('lr_ids', [])
        if lr_ids and not data.get('from_location'):
            first_lr = LorryReceipt.objects.filter(id=lr_ids[0], is_deleted=False).first()
            if first_lr:
                data['from_location'] = first_lr.from_location
                if not data.get('to_location'):
                    data['to_location'] = first_lr.to_location
                if not data.get('destination'):
                    data['destination'] = first_lr.destination
        
        return data


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
    
    # Payment field mapping - map model field to API field name for consistency
    advance_paid_rs = serializers.DecimalField(source='less_advance', max_digits=12, decimal_places=2, read_only=True)
    
    # Invoice fields - Phase 1: Multiple Invoice Support
    invoices = HPAInvoiceSerializer(many=True, read_only=True)
    invoice_list = serializers.CharField(read_only=True)
    invoice_count = serializers.IntegerField(read_only=True)
    delivery_locations_summary = serializers.CharField(read_only=True)
    
    # Phase 2: Active HPA Tracking Fields
    is_active = serializers.BooleanField(read_only=True)
    has_pod = serializers.BooleanField(read_only=True)
    pod_status = serializers.CharField(read_only=True)
    days_active = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    days_active_category = serializers.CharField(read_only=True)
    
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
            'bank_amount', 'bank_name', 'other_deductions', 'other_deductions_description',
            'total_deductions', 'balance_rs',
            'payment_status', 'paid_amount', 'payment_date', 'payment_mode',
            'note', 'remarks',
            # Invoice fields
            'invoices', 'invoice_list', 'invoice_count', 'delivery_locations_summary',
            # Active tracking fields
            'is_active', 'has_pod', 'pod_status', 'days_active', 'is_overdue', 'days_active_category',
            'created_at', 'created_by', 'created_by_name',
            'updated_at', 'updated_by', 'updated_by_name',
            'is_deleted'
        ]
        read_only_fields = [
            'hpa_number', 'total_deductions', 'balance_rs', 'payment_status',
            'created_at', 'created_by', 'updated_at', 'updated_by', 'is_deleted',
            'lrs', 'lr_count', 'invoices', 'invoice_list', 'invoice_count', 'delivery_locations_summary',
            'is_active', 'has_pod', 'pod_status', 'days_active', 'is_overdue', 'days_active_category'
        ]
    
    def get_lr_number(self, obj):
        """Get primary LR number"""
        return obj.lr.lr_number if obj.lr else None
    
    def get_lrs(self, obj):
        """Get all linked LRs"""
        from apps.lr.serializers import LorryReceiptSerializer
        # Get all LRs using the property method from the model
        lrs = obj.all_lrs
        return LorryReceiptSerializer(lrs, many=True).data if lrs else []
    
    def get_lr_count(self, obj):
        """Get count of linked LRs"""
        # Count primary + additional LRs
        count = 0
        if obj.lr:
            count += 1
        count += obj.additional_lrs.count()
        return count


class HirePaymentAdviceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating HPAs
    - Branch users: auto-assign branch from user
    - SuperAdmin: must select branch manually
    - All deduction fields are optional (default to 0)
    - Supports single LR (lr field) or multiple LRs (lrs field)
    - Supports multiple invoices via invoices array
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
    
    # Phase 1: Support multiple invoices during creation
    invoices = HPAInvoiceCreateSerializer(many=True, required=False)
    
    # Make truck optional since it will be auto-populated from LR if not provided
    truck = serializers.PrimaryKeyRelatedField(
        queryset=Truck.objects.filter(is_deleted=False),
        required=False,
        allow_null=True,
        help_text='Truck (auto-populated from LR if not provided)'
    )
    
    # Make deduction fields optional - they default to 0 in the model
    # Use source='less_advance' to map API field name to model field
    advance_paid_rs = serializers.DecimalField(
        source='less_advance',
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
    
    # Make location and driver fields optional - auto-populated from LR
    from_location = serializers.CharField(required=False, allow_blank=True)
    to_location = serializers.CharField(required=False, allow_blank=True)
    driver_name = serializers.CharField(required=False, allow_blank=True)
    driver_mob = serializers.CharField(required=False, allow_blank=True)
    tons = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    rate_per_tonne = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = HirePaymentAdvice
        fields = [
            'branch',  # SuperAdmin selects; Branch users don't provide this
            'lr', 'lrs', 'invoice_number', 'invoices', 'hpa_date',
            'truck', 'from_location', 'to_location',
            'owner_name', 'owner_mob',
            'driver_name', 'driver_mob', 'lr_reference',
            'tons', 'rate_per_tonne',
            'advance_paid_rs', 'diesel_amount', 'pump_name',
            'bank_amount', 'bank_name', 'other_deductions', 'other_deductions_description',
            'paid_amount', 'payment_date', 'payment_mode',
            'note', 'remarks'
        ]
    
    def validate_lr(self, value):
        """Ensure LR exists, is not deleted, and doesn't already have HPA (unless editing)"""
        if value:
            if value.is_deleted:
                raise serializers.ValidationError("Cannot create HPA for deleted LR")
            
            # When editing, allow the same LR (it's already linked to this HPA)
            # When creating, check if LR already has HPA
            instance = self.instance  # Current HPA being edited (None if creating)
            
            if not instance:  # Creating new HPA
                # Check if LR already has HPA (either as primary or additional)
                has_primary_hpa = HirePaymentAdvice.objects.filter(
                    lr=value, is_deleted=False
                ).exists()
                has_additional_hpa = HirePaymentAdvice.objects.filter(
                    additional_lrs=value, is_deleted=False
                ).exists()
                
                if has_primary_hpa or has_additional_hpa:
                    raise serializers.ValidationError(
                        f"LR {value.lr_number} already has an HPA created. Cannot create duplicate HPA."
                    )
            else:  # Editing existing HPA
                # Allow if it's the same LR (already linked to this HPA)
                if instance.lr_id != value.id:
                    # Changing to a different LR - check if that LR already has HPA
                    has_primary_hpa = HirePaymentAdvice.objects.filter(
                        lr=value, is_deleted=False
                    ).exclude(id=instance.id).exists()
                    has_additional_hpa = HirePaymentAdvice.objects.filter(
                        additional_lrs=value, is_deleted=False
                    ).exclude(id=instance.id).exists()
                    
                    if has_primary_hpa or has_additional_hpa:
                        raise serializers.ValidationError(
                            f"LR {value.lr_number} already has an HPA created. Cannot link to this HPA."
                        )
        
        return value
    
    def validate_lrs(self, value):
        """Ensure all LRs exist, are not deleted, and don't already have HPA (unless editing)"""
        if value:
            instance = self.instance  # Current HPA being edited (None if creating)
            current_lr_ids = set()
            
            if instance:
                # Get current LRs linked to this HPA
                current_lr_ids.add(instance.lr_id)
                current_lr_ids.update(instance.additional_lrs.values_list('id', flat=True))
            
            for lr in value:
                if lr.is_deleted:
                    raise serializers.ValidationError(f"Cannot create HPA for deleted LR: {lr.lr_number}")
                
                # If editing and this LR is already linked to this HPA, allow it
                if instance and lr.id in current_lr_ids:
                    continue
                
                # Check if LR already has HPA (either as primary or additional)
                has_primary_hpa = HirePaymentAdvice.objects.filter(
                    lr=lr, is_deleted=False
                ).exclude(id=instance.id if instance else None).exists()
                has_additional_hpa = HirePaymentAdvice.objects.filter(
                    additional_lrs=lr, is_deleted=False
                ).exclude(id=instance.id if instance else None).exists()
                
                if has_primary_hpa or has_additional_hpa:
                    raise serializers.ValidationError(
                        f"LR {lr.lr_number} already has an HPA created. Cannot create duplicate HPA."
                    )
        
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
            # Note: less_advance is the model field name (mapped from advance_paid_rs in API)
            total_deductions = (
                float(data.get('less_advance') or 0) +
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
        # Get LRs list and invoices
        lrs = validated_data.pop('lrs', [])
        invoices_data = validated_data.pop('invoices', [])
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
        # Auto-populate from_location and to_location from first invoice or primary LR
        if 'from_location' not in validated_data or not validated_data.get('from_location'):
            # Try to get from first invoice
            if invoices_data and len(invoices_data) > 0:
                first_invoice = invoices_data[0]
                if first_invoice.get('from_location'):
                    validated_data['from_location'] = first_invoice['from_location']
                elif first_invoice.get('to_location'):
                    # Fallback to primary LR
                    validated_data['from_location'] = primary_lr.from_location or primary_lr.primary_from_location or ''
                else:
                    validated_data['from_location'] = primary_lr.from_location or primary_lr.primary_from_location or ''
            else:
                validated_data['from_location'] = primary_lr.from_location or primary_lr.primary_from_location or ''
        if 'to_location' not in validated_data or not validated_data.get('to_location'):
            # Try to get from first invoice
            if invoices_data and len(invoices_data) > 0:
                first_invoice = invoices_data[0]
                if first_invoice.get('to_location'):
                    validated_data['to_location'] = first_invoice['to_location']
                else:
                    validated_data['to_location'] = primary_lr.to_location or primary_lr.primary_to_location or ''
            else:
                validated_data['to_location'] = primary_lr.to_location or primary_lr.primary_to_location or ''
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
        
        # Always recalculate lorry_hire_rs from tons × rate_per_tonne (matches physical form)
        # Formula: Lorry Hire = Tons × Rate per Tonne
        tons = validated_data.get('tons', 0)
        rate = validated_data.get('rate_per_tonne')
        if tons and rate:
            # Always recalculate to ensure accuracy (matches physical HPA form)
            validated_data['lorry_hire_rs'] = Decimal(str(tons)) * Decimal(str(rate))
        elif 'lorry_hire_rs' not in validated_data:
            # If rate not provided, default to 0 (user must provide rate)
            validated_data['lorry_hire_rs'] = Decimal('0')
        
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
        
        # Phase 1: Create invoices with LR associations if provided
        if invoices_data:
            for invoice_data in invoices_data:
                # Extract LR IDs for many-to-many relationship
                lr_ids = invoice_data.pop('lr_ids', [])
                
                # Create the invoice
                invoice = HPAInvoice.objects.create(
                    hpa=hpa,
                    created_by=user,
                    updated_by=user,
                    **invoice_data
                )
                
                # Associate LRs with this invoice if provided
                if lr_ids:
                    invoice.lrs.set(LorryReceipt.objects.filter(id__in=lr_ids, is_deleted=False))
        
        return hpa


class HirePaymentAdviceUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating HPAs - branch users can only update status"""
    
    # Use source='less_advance' to map API field name to model field
    advance_paid_rs = serializers.DecimalField(
        source='less_advance',
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = HirePaymentAdvice
        fields = [
            'invoice_number', 'hpa_date',
            'truck', 'from_location', 'to_location',
            'owner_name', 'owner_mob',
            'driver_name', 'driver_mob',
            'tons', 'rate_per_tonne',
            'advance_paid_rs', 'diesel_amount', 'pump_name',
            'bank_amount', 'bank_name', 'other_deductions', 'other_deductions_description',
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
        
        # Always recalculate lorry_hire_rs from tons × rate_per_tonne (matches physical form)
        # Formula: Lorry Hire = Tons × Rate per Tonne
        tons = data.get('tons', instance.tons)
        rate = data.get('rate_per_tonne', instance.rate_per_tonne)
        if tons and rate:
            # Always recalculate to ensure accuracy (matches physical HPA form)
            lorry_hire = Decimal(str(tons)) * Decimal(str(rate))
            data['lorry_hire_rs'] = lorry_hire
        else:
            lorry_hire = data.get('lorry_hire_rs', instance.lorry_hire_rs)
        
        # Note: less_advance is the model field name (mapped from advance_paid_rs in API)
        total_deductions = (
            data.get('less_advance', instance.less_advance) +
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
