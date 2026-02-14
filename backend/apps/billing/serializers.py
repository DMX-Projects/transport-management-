from rest_framework import serializers
from decimal import Decimal
from .models import Bill, BillItem


class BillItemSerializer(serializers.ModelSerializer):
    """Serializer for Bill line items"""
    lr_number = serializers.CharField(source='lr.lr_number', read_only=True)
    destination_display = serializers.CharField(source='destination', read_only=True)
    
    class Meta:
        model = BillItem
        fields = '__all__'
        read_only_fields = ['total_amount', 'created_at', 'updated_at']


class BillSerializer(serializers.ModelSerializer):
    """Serializer for Bills/Invoices"""
    bill_items = BillItemSerializer(many=True, read_only=True)
    consignor_name = serializers.CharField(source='consignor.name', read_only=True)
    consignor_gstin_display = serializers.CharField(source='consignor.gstin', read_only=True)
    
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
            'created_at', 
            'updated_at'
        ]


class BillItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating bill items (write only, no read fields)"""
    class Meta:
        model = BillItem
        fields = ['lr', 'destination', 'quantity_mt', 'freight_rate', 'total_amount', 'remarks']
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
    """
    bill_items = BillItemCreateSerializer(many=True, required=False)
    consignor_name = serializers.CharField(source='consignor.name', read_only=True)
    
    class Meta:
        model = Bill
        fields = [
            'branch',  # SuperAdmin selects; Branch users don't provide this
            'consignor', 'consignor_name', 'bill_date', 'from_date', 'to_date',
            'hsn_sac_code', 'vendor_code', 'gstin', 'consignor_gstin', 'consignor_pan',
            'state_code', 'gst_payable_by', 'status',
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

