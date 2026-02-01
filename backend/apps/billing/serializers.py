from rest_framework import serializers
from decimal import Decimal
from .models import Bill, BillItem, BillingTemplate, ClientPayment


class BillingTemplateSerializer(serializers.ModelSerializer):
    """Serializer for displaying Billing Templates"""
    
    consignor_name = serializers.CharField(source='consignor.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True)
    template_type_display = serializers.CharField(source='get_template_type_display', read_only=True)
    bills_count = serializers.SerializerMethodField()
    
    class Meta:
        model = BillingTemplate
        fields = [
            'id', 'name', 'code', 'description',
            'template_type', 'template_type_display',
            'consignor', 'consignor_name',
            'is_default', 'is_active',
            'field_mapping', 'calculation_rules', 'grouping_rules',
            'tax_configuration', 'display_options',
            'pdf_template_name', 'header_config', 'footer_config', 'page_settings',
            'bills_count',
            'created_at', 'created_by', 'created_by_name',
            'updated_at', 'updated_by', 'updated_by_name'
        ]
        read_only_fields = ['created_at', 'created_by', 'updated_at', 'updated_by', 'bills_count']
    
    def get_bills_count(self, obj):
        """Count of bills using this template"""
        return obj.bills.filter(is_deleted=False).count()


class BillingTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating Billing Templates"""
    
    class Meta:
        model = BillingTemplate
        fields = [
            'id',  # Include id in response
            'name', 'code', 'description',
            'template_type', 'consignor',
            'is_default', 'is_active',
            'field_mapping', 'calculation_rules', 'grouping_rules',
            'tax_configuration', 'display_options',
            'pdf_template_name', 'header_config', 'footer_config', 'page_settings'
        ]
        read_only_fields = ['id']
    
    def validate_code(self, value):
        """Ensure code is uppercase and alphanumeric with underscores"""
        import re
        if not re.match(r'^[A-Z0-9_]+$', value.upper()):
            raise serializers.ValidationError(
                "Code must contain only letters, numbers, and underscores"
            )
        return value.upper()
    
    def validate(self, data):
        """Custom validation for template creation"""
        # Validate JSON fields structure if provided
        if 'field_mapping' in data and data['field_mapping']:
            if not isinstance(data['field_mapping'], dict):
                raise serializers.ValidationError({'field_mapping': 'Must be a valid JSON object'})
        
        if 'calculation_rules' in data and data['calculation_rules']:
            if not isinstance(data['calculation_rules'], dict):
                raise serializers.ValidationError({'calculation_rules': 'Must be a valid JSON object'})
        
        if 'tax_configuration' in data and data['tax_configuration']:
            tax_config = data['tax_configuration']
            if not isinstance(tax_config, dict):
                raise serializers.ValidationError({'tax_configuration': 'Must be a valid JSON object'})
            
            # Validate tax rates if provided
            for rate_field in ['sgst_rate', 'cgst_rate', 'igst_rate', 'tds_rate']:
                if rate_field in tax_config:
                    rate = tax_config[rate_field]
                    if not isinstance(rate, (int, float)) or rate < 0 or rate > 100:
                        raise serializers.ValidationError({
                            'tax_configuration': f'{rate_field} must be a number between 0 and 100'
                        })
        
        return data
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        validated_data['updated_by'] = user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        user = self.context['request'].user
        validated_data['updated_by'] = user
        return super().update(instance, validated_data)


class BillingTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for template dropdowns/lists"""
    
    consignor_name = serializers.CharField(source='consignor.name', read_only=True)
    template_type_display = serializers.CharField(source='get_template_type_display', read_only=True)
    
    class Meta:
        model = BillingTemplate
        fields = [
            'id', 'name', 'code', 'template_type', 'template_type_display',
            'consignor', 'consignor_name', 'is_default', 'is_active'
        ]


class BillItemSerializer(serializers.ModelSerializer):
    """Serializer for Bill line items"""
    lr_number = serializers.CharField(source='lr.lr_number', read_only=True)
    destination_display = serializers.CharField(source='destination', read_only=True)
    
    class Meta:
        model = BillItem
        fields = '__all__'
        read_only_fields = ['total_amount', 'created_at', 'updated_at']


class ClientPaymentSerializer(serializers.ModelSerializer):
    """Serializer for Client Payments"""
    
    bill_number = serializers.CharField(source='bill.bill_number', read_only=True)
    consignor_name = serializers.CharField(source='bill.consignor.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    class Meta:
        model = ClientPayment
        fields = [
            'id', 'bill', 'bill_number', 'consignor_name',
            'payment_date', 'amount',
            'payment_method', 'payment_method_display',
            'reference_number', 'bank_name', 'remarks',
            'created_at', 'created_by', 'created_by_name',
            'updated_at'
        ]
        read_only_fields = ['created_at', 'created_by', 'updated_at']


class ClientPaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Client Payments"""
    
    class Meta:
        model = ClientPayment
        fields = [
            'bill', 'payment_date', 'amount',
            'payment_method', 'reference_number', 'bank_name', 'remarks'
        ]
    
    def validate_amount(self, value):
        """Ensure payment amount is positive"""
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than 0")
        return value
    
    def validate(self, data):
        """Validate payment doesn't exceed outstanding"""
        bill = data.get('bill')
        amount = data.get('amount')
        
        if bill and amount:
            outstanding = bill.outstanding_amount
            if amount > outstanding:
                raise serializers.ValidationError({
                    'amount': f"Payment amount ({amount}) exceeds outstanding balance ({outstanding})"
                })
        
        return data
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        validated_data['updated_by'] = user
        return super().create(validated_data)


class BillSerializer(serializers.ModelSerializer):
    """Serializer for Bills/Invoices"""
    bill_items = BillItemSerializer(many=True, read_only=True)
    consignor_name = serializers.CharField(source='consignor.name', read_only=True)
    consignor_gstin_display = serializers.CharField(source='consignor.gstin', read_only=True)
    
    # Template fields (Phase 3)
    billing_template_name = serializers.CharField(source='billing_template.name', read_only=True)
    billing_template_code = serializers.CharField(source='billing_template.code', read_only=True)
    billing_template_type = serializers.CharField(source='billing_template.template_type', read_only=True)
    
    # Phase 4: Payment tracking fields
    client_payments = ClientPaymentSerializer(many=True, read_only=True)
    outstanding_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_payments_received = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    aging_days = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    aging_bucket = serializers.CharField(read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    
    class Meta:
        model = Bill
        fields = '__all__'
        read_only_fields = [
            'bill_number', 
            'total_quantity_mt', 
            'total_amount', 
            'sgst_amount', 
            'cgst_amount', 
            'grand_total',
            'outstanding_amount',
            'total_payments_received',
            'aging_days',
            'is_overdue',
            'aging_bucket',
            'created_at', 
            'updated_at'
        ]


class BillItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating bill items (write only, no read fields)"""
    class Meta:
        model = BillItem
        fields = ['lr', 'lr_item', 'hpa_invoice', 'destination', 'quantity_mt', 'freight_rate', 'total_amount', 'remarks']
        read_only_fields = ['total_amount']
    
    def validate(self, data):
        """Calculate total_amount if quantity and rate provided"""
        if data.get('quantity_mt') and data.get('freight_rate'):
            data['total_amount'] = Decimal(str(data['quantity_mt'])) * Decimal(str(data['freight_rate']))
        return data


class BillUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating Bills - branch users can only update status"""
    
    class Meta:
        model = Bill
        fields = [
            'status', 'payment_received', 'payment_date', 'payment_mode',
            'remarks', 'consignor_note'
        ]
    
    def update(self, instance, validated_data):
        """Branch users can only update status and payment details. SuperAdmin can update all fields."""
        user = self.context['request'].user
        
        if not user.is_admin:
            # Branch users: only allow status and payment field changes
            allowed_fields = {'status', 'payment_received', 'payment_date', 'payment_mode'}
            provided_fields = set(validated_data.keys())
            disallowed = provided_fields - allowed_fields
            
            if disallowed:
                raise serializers.ValidationError(
                    f"Branch users can only update 'status', 'payment_received', 'payment_date', 'payment_mode'. Cannot edit: {', '.join(disallowed)}"
                )
        
        validated_data['updated_by'] = user
        return super().update(instance, validated_data)


class BillCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Bills with nested bill items
    - Branch users: auto-assign branch from user
    - SuperAdmin: must select branch manually
    - Template can be specified or auto-selected based on consignor
    """
    bill_items = BillItemCreateSerializer(many=True, required=False)
    consignor_name = serializers.CharField(source='consignor.name', read_only=True)
    
    class Meta:
        model = Bill
        fields = [
            'branch',  # SuperAdmin selects; Branch users don't provide this
            'consignor', 'consignor_name', 'bill_date', 'from_date', 'to_date',
            'billing_template',  # NEW: Template selection
            'hsn_sac_code', 'vendor_code', 'gstin', 'consignor_gstin', 'consignor_pan',
            'state_code', 'gst_payable_by', 'status',
            'sgst_rate', 'cgst_rate',  # Allow overriding from template
            'payment_received', 'payment_date', 'payment_mode',
            'remarks', 'consignor_note', 'bill_items'
        ]
        read_only_fields = [
            'bill_number', 'total_quantity_mt', 'total_amount', 
            'sgst_amount', 'cgst_amount', 'grand_total', 'consignor_name'
        ]
    
    def validate(self, data):
        """Validate branch assignment based on user role"""
        user = self.context['request'].user
        
        if user.is_admin:
            # SuperAdmin must provide branch
            if 'branch' not in data or not data['branch']:
                raise serializers.ValidationError({'branch': 'SuperAdmin must select a branch'})
        else:
            # Branch users shouldn't provide branch (we auto-assign)
            if 'branch' in data:
                raise serializers.ValidationError({'branch': 'Branch users cannot select branch (auto-assigned)'})
        
        return data
    
    def create(self, validated_data):
        bill_items_data = validated_data.pop('bill_items', [])
        
        if not bill_items_data:
            raise serializers.ValidationError({'bill_items': 'At least one bill item is required'})
        
        user = self.context['request'].user
        
        # If not provided (branch user), auto-assign from user
        if 'branch' not in validated_data or not validated_data['branch']:
            validated_data['branch'] = user.branch
        
        # Auto-select billing template if not provided (Phase 3)
        if 'billing_template' not in validated_data or not validated_data['billing_template']:
            consignor = validated_data.get('consignor')
            if consignor:
                template = BillingTemplate.get_template_for_consignor(consignor.id)
                if template:
                    validated_data['billing_template'] = template
        
        # Apply template settings if template is set and rates not explicitly provided
        template = validated_data.get('billing_template')
        if template:
            tax_config = template.tax_configuration or {}
            
            # Apply GST rates from template if not provided
            if 'sgst_rate' not in validated_data or validated_data.get('sgst_rate') is None:
                validated_data['sgst_rate'] = Decimal(str(tax_config.get('sgst_rate', 9.0)))
            if 'cgst_rate' not in validated_data or validated_data.get('cgst_rate') is None:
                validated_data['cgst_rate'] = Decimal(str(tax_config.get('cgst_rate', 9.0)))
            
            # Apply HSN/SAC code from template if not provided
            if 'hsn_sac_code' not in validated_data or not validated_data.get('hsn_sac_code'):
                validated_data['hsn_sac_code'] = tax_config.get('hsn_sac_code', '996791')
        
        # Set audit fields
        validated_data['created_by'] = user
        validated_data['updated_by'] = user
        
        # Create bill first (without items)
        bill = Bill.objects.create(**validated_data)
        
        # Create bill items
        for item_data in bill_items_data:
            # Calculate total if not set
            if 'total_amount' not in item_data or not item_data['total_amount']:
                if item_data.get('quantity_mt') and item_data.get('freight_rate'):
                    item_data['total_amount'] = Decimal(str(item_data['quantity_mt'])) * Decimal(str(item_data['freight_rate']))
            
            item_data['created_by'] = user
            item_data['updated_by'] = user
            BillItem.objects.create(bill=bill, **item_data)
        
        # Refresh from DB and recalculate totals
        bill.refresh_from_db()
        bill.save()  # This will trigger recalculation
        return bill

