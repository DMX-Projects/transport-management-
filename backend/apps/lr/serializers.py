from rest_framework import serializers
from django.utils import timezone
from .models import LorryReceipt
from apps.masters.serializers import BranchSerializer, TruckSerializer, ConsignorSerializer, PartySerializer


class LorryReceiptSerializer(serializers.ModelSerializer):
    """Serializer for displaying LRs"""
    # Nested serializers for display
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    branch_code = serializers.CharField(source='branch.code', read_only=True)
    truck_number = serializers.CharField(source='truck.truck_number', read_only=True)
    consignor_name = serializers.CharField(source='consignor.name', read_only=True)
    consignor_gstin = serializers.CharField(source='consignor.gstin', read_only=True)
    consignee_name = serializers.CharField(source='consignee.name', read_only=True)
    
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
            'created_at', 'created_by', 'created_by_name',
            'updated_at', 'updated_by', 'updated_by_name',
            'is_deleted'
        ]
        read_only_fields = [
            'lr_number', 'created_at', 'created_by',
            'updated_at', 'updated_by', 'is_deleted'
        ]


class LorryReceiptCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating LRs
    - Branch users: auto-assign branch from user (branch field not in request)
    - SuperAdmin: must select branch manually (branch field required)
    """
    
    class Meta:
        model = LorryReceipt
        fields = [
            'branch',  # SuperAdmin selects; Branch users don't provide this
            'consignor', 'consignee', 'delivery_at',
            'from_location', 'to_location', 'destination',
            'material_description', 'quantity_mt', 'number_of_bags',
            'grade', 'grade_quantity',
            'loading_from_department', 'please_load', 'number_of_loads', 'grade_type_of_pkg',
            'truck', 'driver_name', 'driver_phone', 'driver_license_no',
            'payment_term', 'gst_payable_by',
            'status', 'lr_date', 'sap_number', 'lr_submitted_time',
            'expected_loading_date', 'expected_delivery_date',
            'remarks', 'note'
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
        """Auto-assign branch for non-admin users, use provided branch for superadmin"""
        user = self.context['request'].user
        
        # If not provided (branch user), auto-assign from user
        if 'branch' not in validated_data or not validated_data['branch']:
            validated_data['branch'] = user.branch
        
        validated_data['created_by'] = user
        validated_data['updated_by'] = user
        return super().create(validated_data)


class LorryReceiptUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating LRs - branch users can only update status"""
    
    class Meta:
        model = LorryReceipt
        fields = [
            'consignor', 'consignee', 'delivery_at',
            'from_location', 'to_location', 'destination',
            'material_description', 'quantity_mt', 'number_of_bags',
            'grade', 'grade_quantity',
            'loading_from_department', 'please_load', 'number_of_loads', 'grade_type_of_pkg',
            'truck', 'driver_name', 'driver_phone', 'driver_license_no',
            'payment_term', 'gst_payable_by',
            'status', 'lr_date', 'sap_number', 'lr_submitted_time',
            'expected_loading_date', 'actual_loading_date',
            'expected_delivery_date', 'actual_delivery_date',
            'remarks', 'note'
        ]
    
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
