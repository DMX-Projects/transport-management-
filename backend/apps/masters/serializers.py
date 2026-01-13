from rest_framework import serializers
from apps.accounts.models import User
from .models import Company, Branch, Consignor, Party, Truck, ChartOfAccounts, GSTConfig, TDSConfig


class CompanySerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Company
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'is_deleted']


class BranchSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    # Auto-create a branch user during branch creation (REQUIRED)
    manager_username = serializers.CharField(write_only=True, required=True, allow_blank=False)
    manager_password = serializers.CharField(write_only=True, required=True, allow_blank=False, style={'input_type': 'password'})
    manager_email = serializers.EmailField(write_only=True, required=True, allow_blank=False)
    manager_phone = serializers.CharField(write_only=True, required=True, allow_blank=False)
    
    class Meta:
        model = Branch
        fields = [
            'id', 'company', 'company_name', 'name', 'code', 'address', 'city', 'state', 'pincode',
            'phone', 'email', 'gstin', 'hsn_sac_code', 'lr_prefix', 'invoice_prefix', 'bill_prefix',
            'is_active',
            # Audit
            'created_at', 'updated_at', 'created_by', 'updated_by', 'created_by_name', 'is_deleted',
            # Virtual/write-only manager fields
            'manager_username', 'manager_password', 'manager_email', 'manager_phone'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'is_deleted', 'company', 'company_name', 'created_by_name']

    def validate(self, attrs):
        username = attrs.get('manager_username', '').strip()
        password = attrs.get('manager_password', '').strip()
        email = attrs.get('manager_email', '').strip()
        phone = attrs.get('manager_phone', '').strip()

        # All manager fields are required
        if not username:
            raise serializers.ValidationError("manager_username is required")
        if not password:
            raise serializers.ValidationError("manager_password is required")
        if not email:
            raise serializers.ValidationError("manager_email is required")
        if not phone:
            raise serializers.ValidationError("manager_phone is required")
            
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"manager_username": "Username already exists"})
        return attrs

    def create(self, validated_data):
        # Pop manager fields before creating the branch
        manager_username = validated_data.pop('manager_username', '').strip()
        manager_password = validated_data.pop('manager_password', '').strip()
        manager_email = validated_data.pop('manager_email', '').strip()
        manager_phone = validated_data.pop('manager_phone', '').strip()

        # Single-company mode: auto-assign the active company
        company = Company.objects.filter(is_deleted=False, is_active=True).order_by('id').first()
        if not company:
            raise serializers.ValidationError("No active company configured. Please create a company (superadmin only) before creating branches.")
        validated_data['company'] = company

        branch = super().create(validated_data)

        # Create Branch Manager user (now REQUIRED)
        if manager_username and manager_password:
            user = User(
                username=manager_username,
                email=manager_email or '',
                phone=manager_phone or '',
                role='BRANCH_MANAGER',
                branch=branch,
                is_active=True,
                is_active_branch=True,
            )
            user.set_password(manager_password)
            user.save()
        return branch


class ConsignorSerializer(serializers.ModelSerializer):
    """Serializer for Consignor (Companies sending goods)"""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Consignor
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'is_deleted']


class PartySerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Party
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'is_deleted']


class TruckSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Truck
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'is_deleted']


class ChartOfAccountsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChartOfAccounts
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'is_deleted']


class GSTConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = GSTConfig
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'is_deleted']


class TDSConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TDSConfig
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'is_deleted']
