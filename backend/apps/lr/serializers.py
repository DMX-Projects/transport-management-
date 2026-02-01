from rest_framework import serializers
from django.utils import timezone
from .models import LorryReceipt, LRItem
from apps.masters.serializers import BranchSerializer, TruckSerializer, ConsignorSerializer, PartySerializer


# LRItem Serializers (defined first since LorryReceiptSerializer references them)
class LRItemSerializer(serializers.ModelSerializer):
    """Serializer for displaying LRItems"""
    consignor_name = serializers.CharField(source='consignor.name', read_only=True)
    consignee_name = serializers.CharField(source='consignee.name', read_only=True)
    lr_number = serializers.CharField(source='lr.lr_number', read_only=True)
    
    class Meta:
        model = LRItem
        fields = [
            'id', 'lr', 'lr_number', 'sequence_number',
            'consignor', 'consignor_name',
            'consignee', 'consignee_name',
            'delivery_at',
            'from_location', 'to_location', 'destination',
            'material_description',
            'quantity_mt', 'number_of_bags',
            'grade', 'grade_quantity',
            'loading_from_department', 'please_load',
            'number_of_loads', 'grade_type_of_pkg',
            'sap_number',
            'payment_term', 'gst_payable_by',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LRItemNestedCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating LRItems in nested context (lr field excluded)"""
    
    # Make sequence_number optional - it will be auto-assigned
    sequence_number = serializers.IntegerField(required=False, default=1)
    
    class Meta:
        model = LRItem
        fields = [
            'sequence_number',
            'consignor', 'consignee', 'delivery_at',
            'from_location', 'to_location', 'destination',
            'material_description',
            'quantity_mt', 'number_of_bags',
            'grade', 'grade_quantity',
            'loading_from_department', 'please_load',
            'number_of_loads', 'grade_type_of_pkg',
            'sap_number',
            'payment_term', 'gst_payable_by',
        ]
        # Note: lr field is excluded - parent serializer will set it


class LRItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating LRItems with validation (standalone use)"""
    lr = serializers.PrimaryKeyRelatedField(
        required=True,
        queryset=LorryReceipt.objects.filter(is_deleted=False)
    )

    class Meta:
        model = LRItem
        fields = [
            'lr', 'sequence_number',
            'consignor', 'consignee', 'delivery_at',
            'from_location', 'to_location', 'destination',
            'material_description',
            'quantity_mt', 'number_of_bags',
            'grade', 'grade_quantity',
            'loading_from_department', 'please_load',
            'number_of_loads', 'grade_type_of_pkg',
            'sap_number',
            'payment_term', 'gst_payable_by',
        ]
    
    def validate(self, data):
        """Validate LR can be edited"""
        lr = data.get('lr')
        if lr and not lr.can_edit_items:
            raise serializers.ValidationError({
                'lr': f'Cannot add items to LR {lr.lr_number}. Status must be DRAFT or PENDING_HPA.'
            })
        return data
    
    def create(self, validated_data):
        """Create with auto-assigned sequence if not provided"""
        user = self.context['request'].user
        return LRItem.objects.create(
            **validated_data,
            created_by=user,
            updated_by=user
        )


class LRItemUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating LRItems"""
    
    class Meta:
        model = LRItem
        fields = [
            'sequence_number',
            'consignor', 'consignee', 'delivery_at',
            'from_location', 'to_location', 'destination',
            'material_description',
            'quantity_mt', 'number_of_bags',
            'grade', 'grade_quantity',
            'loading_from_department', 'please_load',
            'number_of_loads', 'grade_type_of_pkg',
            'sap_number',
            'payment_term', 'gst_payable_by',
        ]
        read_only_fields = ['lr']
    
    def validate(self, data):
        """Validate LR can be edited"""
        if self.instance and not self.instance.lr.can_edit_items:
            raise serializers.ValidationError(
                'Cannot edit items. LR status must be DRAFT or PENDING_HPA.'
            )
        return data
    
    def update(self, instance, validated_data):
        """Update with user tracking"""
        validated_data['updated_by'] = self.context['request'].user
        return super().update(instance, validated_data)


# LorryReceipt Serializers
class LorryReceiptSerializer(serializers.ModelSerializer):
    """Serializer for displaying LRs with nested items"""
    # Nested serializers for display
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    branch_code = serializers.CharField(source='branch.code', read_only=True)
    truck_number = serializers.CharField(source='truck.truck_number', read_only=True)
    
    # Fields with fallback to primary_* values for multi-item LRs
    consignor_name = serializers.SerializerMethodField()
    consignor_gstin = serializers.SerializerMethodField()
    consignee_name = serializers.SerializerMethodField()
    from_location = serializers.SerializerMethodField()
    to_location = serializers.SerializerMethodField()
    quantity_mt = serializers.SerializerMethodField()
    grade = serializers.SerializerMethodField()
    
    # Nested items
    lr_items = LRItemSerializer(many=True, read_only=True)
    
    # Computed properties
    total_quantity_mt = serializers.DecimalField(read_only=True, max_digits=10, decimal_places=2)
    total_bags = serializers.IntegerField(read_only=True)
    can_edit_items = serializers.BooleanField(read_only=True)
    
    # Primary fields (from first item for backward compatibility)
    primary_consignor_name = serializers.SerializerMethodField()
    primary_consignee_name = serializers.SerializerMethodField()
    primary_from_location = serializers.SerializerMethodField()
    primary_to_location = serializers.SerializerMethodField()
    
    # Audit trail fields (read-only)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True)
    
    class Meta:
        model = LorryReceipt
        fields = [
            'id', 'lr_number', 'lr_date', 'sap_number', 'lr_submitted_time',
            'branch', 'branch_name', 'branch_code',
            'consignor', 'consignor_name', 'consignor_gstin',
            'consignee', 'consignee_name', 'delivery_at',
            'from_location', 'to_location', 'destination',
            'material_description', 'quantity_mt', 'number_of_bags',
            'grade', 'grade_quantity',
            'loading_from_department', 'please_load', 'number_of_loads', 'grade_type_of_pkg',
            'truck', 'truck_number', 'driver_name', 'driver_phone', 'driver_license_no',
            'payment_term', 'gst_payable_by',
            'status', 'expected_loading_date', 'actual_loading_date',
            'expected_delivery_date', 'actual_delivery_date',
            'remarks', 'note',
            # New fields
            'lr_items',  # Nested items
            'total_quantity_mt', 'total_bags',
            'can_edit_items',
            'primary_consignor_name', 'primary_consignee_name',
            'primary_from_location', 'primary_to_location',
            'created_at', 'created_by', 'created_by_name',
            'updated_at', 'updated_by', 'updated_by_name',
            'is_deleted'
        ]
        read_only_fields = [
            'lr_number', 'created_at', 'created_by',
            'updated_at', 'updated_by', 'is_deleted',
            'total_quantity_mt', 'total_bags', 'can_edit_items'
        ]
    
    def get_consignor_name(self, obj):
        """Fallback to primary_consignor_name if consignor is None"""
        if obj.consignor:
            return obj.consignor.name
        return self.get_primary_consignor_name(obj)
    
    def get_consignor_gstin(self, obj):
        """Fallback to first item's consignor GSTIN if consignor is None"""
        if obj.consignor:
            return obj.consignor.gstin
        # Get from first item's consignor
        primary_consignor = obj.primary_consignor
        return primary_consignor.gstin if primary_consignor else None
    
    def get_consignee_name(self, obj):
        """Fallback to primary_consignee_name if consignee is None"""
        if obj.consignee:
            return obj.consignee.name
        return self.get_primary_consignee_name(obj)
    
    def get_from_location(self, obj):
        """Fallback to primary_from_location if from_location is empty"""
        if obj.from_location:
            return obj.from_location
        return self.get_primary_from_location(obj)
    
    def get_to_location(self, obj):
        """Fallback to primary_to_location if to_location is empty"""
        if obj.to_location:
            return obj.to_location
        return self.get_primary_to_location(obj)
    
    def get_quantity_mt(self, obj):
        """Fallback to total_quantity_mt if quantity_mt is 0 or None"""
        if obj.quantity_mt and obj.quantity_mt > 0:
            return obj.quantity_mt
        # Use total_quantity_mt from items, or 0 if no items
        total = obj.total_quantity_mt
        return total if total else 0
    
    def get_grade(self, obj):
        """Fallback to first item's grade, or combine all unique grades"""
        if obj.grade:
            return obj.grade
        
        # Get grades from all items
        items = obj.lr_items.filter(is_deleted=False)
        if not items.exists():
            return ''
        
        grades = [item.grade for item in items if item.grade]
        if not grades:
            return ''
        
        # Return unique grades combined, or first grade if single
        unique_grades = list(set(grades))
        if len(unique_grades) == 1:
            return unique_grades[0]
        return ', '.join(unique_grades)
    
    def get_primary_consignor_name(self, obj):
        return obj.primary_consignor.name if obj.primary_consignor else None
    
    def get_primary_consignee_name(self, obj):
        return obj.primary_consignee.name if obj.primary_consignee else None
    
    def get_primary_from_location(self, obj):
        return obj.primary_from_location
    
    def get_primary_to_location(self, obj):
        return obj.primary_to_location


class LorryReceiptCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating LRs with nested items
    - Branch users: auto-assign branch from user (branch field not in request)
    - SuperAdmin: must select branch manually (branch field required)
    """
    lr_items = LRItemNestedCreateSerializer(many=True, write_only=True)
    
    class Meta:
        model = LorryReceipt
        fields = [
            'branch',  # SuperAdmin selects; Branch users don't provide this
            'truck', 'driver_name', 'driver_phone', 'driver_license_no',
            'status', 'lr_date', 'lr_submitted_time',
            'expected_loading_date', 'expected_delivery_date',
            'remarks', 'note',
            'lr_items',  # Nested items array
        ]
    
    def validate(self, data):
        """Validate branch assignment and items"""
        user = self.context['request'].user
        lr_items = data.get('lr_items', [])
        
        # Branch validation
        if user.is_admin:
            # SuperAdmin must provide branch
            if 'branch' not in data or not data['branch']:
                raise serializers.ValidationError({'branch': 'SuperAdmin must select a branch'})
        else:
            # Branch users: use their branch (ignore any provided branch)
            # We'll override in create method
            pass
        
        # Items validation
        if not lr_items or len(lr_items) == 0:
            raise serializers.ValidationError({
                'lr_items': 'At least one LR item is required'
            })
        
        return data
    
    def create(self, validated_data):
        """Create LR with nested items"""
        lr_items_data = validated_data.pop('lr_items')
        user = self.context['request'].user
        
        # Auto-assign branch for non-admin users
        if 'branch' not in validated_data or not validated_data['branch']:
            validated_data['branch'] = user.branch
        
        # Remove created_by and updated_by from validated_data if present
        # (they will be set via perform_create or explicitly here)
        validated_data.pop('created_by', None)
        validated_data.pop('updated_by', None)
        
        # Create LR
        lr = LorryReceipt.objects.create(
            **validated_data,
            created_by=user,
            updated_by=user
        )
        
        # Create items with sequence numbers
        for idx, item_data in enumerate(lr_items_data, 1):
            # Remove sequence_number from item_data if present (we'll set it explicitly)
            item_data_copy = dict(item_data)
            item_data_copy.pop('sequence_number', None)
            
            LRItem.objects.create(
                lr=lr,
                sequence_number=idx,
                created_by=user,
                updated_by=user,
                **item_data_copy
            )
        
        return lr


class LorryReceiptUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating LRs - only container fields (not items)
    Items are managed via LRItem endpoints
    """
    
    class Meta:
        model = LorryReceipt
        fields = [
            'truck', 'driver_name', 'driver_phone', 'driver_license_no',
            'status', 'lr_date', 'lr_submitted_time',
            'expected_loading_date', 'actual_loading_date',
            'expected_delivery_date', 'actual_delivery_date',
            'remarks', 'note'
        ]
        # Note: Items are managed via LRItem endpoints
    
    def update(self, instance, validated_data):
        """Branch users can only update status. SuperAdmin can update all fields."""
        user = self.context['request'].user
        
        if not user.is_admin:
            # Branch users: only allow status changes
            allowed_fields = {'status'}
            provided_fields = set(validated_data.keys())
            disallowed = provided_fields - allowed_fields
            
            if disallowed:
                raise serializers.ValidationError(
                    f"Branch users can only update 'status'. Cannot edit: {', '.join(disallowed)}"
                )
        
        validated_data['updated_by'] = user
        return super().update(instance, validated_data)
