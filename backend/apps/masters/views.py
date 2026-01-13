from rest_framework import viewsets, filters
from rest_framework.exceptions import PermissionDenied, MethodNotAllowed
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import Company, Branch, Consignor, Party, Truck, ChartOfAccounts, GSTConfig, TDSConfig
from .serializers import (
    CompanySerializer, BranchSerializer, ConsignorSerializer, PartySerializer, TruckSerializer,
    ChartOfAccountsSerializer, GSTConfigSerializer, TDSConfigSerializer
)


class CompanyViewSet(viewsets.ModelViewSet):
    """ViewSet for Company. SUPER_ADMIN only. Delete disabled."""
    queryset = Company.objects.filter(is_deleted=False)
    serializer_class = CompanySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'gstin']
    ordering = ['name']

    def get_queryset(self):
        if not self.request.user.can_access_all_branches:
            raise PermissionDenied("Only SUPER_ADMIN can access companies.")
        return super().get_queryset()
    
    def perform_create(self, serializer):
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can create companies.")
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        # Only SUPER_ADMIN can update
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can update records.")
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Delete functionality is disabled.")


class BranchViewSet(viewsets.ModelViewSet):
    """ViewSet for Branch. Only SUPER_ADMIN can create/update. Delete disabled."""
    queryset = Branch.objects.filter(is_deleted=False)
    serializer_class = BranchSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['company']
    search_fields = ['name', 'code']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter branches based on user permissions"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # SUPER_ADMIN can see all branches
        if user.can_access_all_branches:
            return queryset
        
        # BRANCH_MANAGER can only see their own branch
        if user.branch:
            return queryset.filter(id=user.branch.id)
        
        # No branch assigned - return empty
        return queryset.none()
    
    def perform_create(self, serializer):
        # Only SUPER_ADMIN can create branches
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can create branches.")
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        # Only SUPER_ADMIN can update
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can update records.")
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Delete functionality is disabled.")


class ConsignorViewSet(viewsets.ModelViewSet):
    """ViewSet for Consignor (Companies sending goods). Only SUPER_ADMIN can create/update. Delete disabled."""
    queryset = Consignor.objects.filter(is_deleted=False)
    serializer_class = ConsignorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'gstin', 'pan']
    ordering = ['name']
    
    def perform_create(self, serializer):
        # Only SUPER_ADMIN can create consignors
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can create consignors.")
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        # Only SUPER_ADMIN can update
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can update records.")
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Delete functionality is disabled.")


class PartyViewSet(viewsets.ModelViewSet):
    """ViewSet for Party/Consignee (Destination parties receiving goods). Only SUPER_ADMIN can create/update. Delete disabled."""
    queryset = Party.objects.filter(is_deleted=False)
    serializer_class = PartySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'gstin']
    ordering = ['name']
    
    def perform_create(self, serializer):
        # Only SUPER_ADMIN can create parties
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can create parties/consignees.")
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        # Only SUPER_ADMIN can update
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can update records.")
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Delete functionality is disabled.")


class TruckViewSet(viewsets.ModelViewSet):
    """ViewSet for Truck. Only SUPER_ADMIN can create/update. Delete disabled."""
    queryset = Truck.objects.filter(is_deleted=False)
    serializer_class = TruckSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['truck_type']
    search_fields = ['truck_number', 'owner_name']
    ordering = ['truck_number']
    
    def get_queryset(self):
        """
        Filter trucks based on user branch permissions.
        Note: Trucks don't have a direct branch field, so they are shared across branches.
        Branch isolation is enforced at the LR level (when creating LRs, branch is set).
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        # SUPER_ADMIN can see all trucks
        if user.can_access_all_branches:
            return queryset
        
        # BRANCH_MANAGER can see all trucks (trucks are shared resources)
        # Branch isolation is enforced when creating LRs (LRs are branch-specific)
        # If you want strict isolation, filter by trucks used in this branch's LRs:
        if user.branch:
            # Option 1: Show all trucks (recommended - trucks are shared)
            return queryset
            
            # Option 2: Show only trucks used in this branch's LRs (uncomment to enable)
            # from apps.lr.models import LorryReceipt
            # lr_truck_ids = LorryReceipt.objects.filter(
            #     branch=user.branch,
            #     is_deleted=False
            # ).exclude(truck__isnull=True).values_list('truck_id', flat=True).distinct()
            # if lr_truck_ids:
            #     return queryset.filter(id__in=lr_truck_ids)
            # else:
            #     return queryset.none()
        
        # No branch assigned - return empty
        return queryset.none()
    
    def perform_create(self, serializer):
        # Only SUPER_ADMIN can create trucks
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can create trucks.")
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        # Only SUPER_ADMIN can update
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can update records.")
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Delete functionality is disabled.")


class ChartOfAccountsViewSet(viewsets.ModelViewSet):
    """ViewSet for Chart of Accounts. Only SUPER_ADMIN can create/update. Delete disabled."""
    queryset = ChartOfAccounts.objects.filter(is_deleted=False)
    serializer_class = ChartOfAccountsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['account_type']
    search_fields = ['account_code', 'account_name']
    ordering = ['account_code']
    
    def perform_create(self, serializer):
        # Only SUPER_ADMIN can create chart of accounts
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can create chart of accounts.")
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        # Only SUPER_ADMIN can update
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can update records.")
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Delete functionality is disabled.")


class GSTConfigViewSet(viewsets.ModelViewSet):
    """ViewSet for GST Config. Only SUPER_ADMIN can create/update. Delete disabled."""
    queryset = GSTConfig.objects.filter(is_deleted=False)
    serializer_class = GSTConfigSerializer
    
    def perform_create(self, serializer):
        # Only SUPER_ADMIN can create GST config
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can create GST configuration.")
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        # Only SUPER_ADMIN can update
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can update records.")
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Delete functionality is disabled.")


class TDSConfigViewSet(viewsets.ModelViewSet):
    """ViewSet for TDS Config. Only SUPER_ADMIN can create/update. Delete disabled."""
    queryset = TDSConfig.objects.filter(is_deleted=False)
    serializer_class = TDSConfigSerializer
    
    def perform_create(self, serializer):
        # Only SUPER_ADMIN can create TDS config
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can create TDS configuration.")
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        # Only SUPER_ADMIN can update
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can update records.")
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Delete functionality is disabled.")
