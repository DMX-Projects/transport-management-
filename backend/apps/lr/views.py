from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.http import HttpResponse
from django.db.models import Q
from .models import LorryReceipt, LRItem
from .serializers import (
    LorryReceiptSerializer,
    LorryReceiptCreateSerializer,
    LorryReceiptUpdateSerializer,
    LRItemSerializer,
    LRItemCreateSerializer,
    LRItemUpdateSerializer
)
from .pdf_generator import generate_lr_pdf
from apps.common.pagination import StandardResultsSetPagination


class LorryReceiptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for LR Management
    Supports: Create, Read, Update (SUPER_ADMIN only)
    Features: Filtering, Search, Pagination, Audit Trail, Branch Isolation
    Note: Only SUPER_ADMIN can update records. Delete functionality is disabled.
    """
    queryset = LorryReceipt.objects.filter(is_deleted=False)
    serializer_class = LorryReceiptSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'status', 'consignee', 'truck', 'consignor', 'payment_term']
    search_fields = ['lr_number', 'sap_number', 'truck__truck_number', 'consignor__name', 'consignee__name', 'driver_name', 'from_location', 'to_location']
    ordering_fields = ['lr_date', 'created_at', 'quantity_mt']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter by branch based on user permissions"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # Admin and auditor can see all branches
        if user.can_access_all_branches:
            return queryset
        
        # Other users only see their branch data
        if user.branch:
            return queryset.filter(branch=user.branch)
        
        # No branch assigned - return empty
        return queryset.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return LorryReceiptCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return LorryReceiptUpdateSerializer
        return LorryReceiptSerializer
    
    def perform_create(self, serializer):
        # Serializer's create() method already handles created_by and updated_by
        serializer.save()
    
    def perform_update(self, serializer):
        # Only SUPER_ADMIN can update
        if not self.request.user.can_edit:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only SUPER_ADMIN can update records.")
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        # Delete functionality is disabled
        from rest_framework.exceptions import MethodNotAllowed
        raise MethodNotAllowed("DELETE", detail="Delete functionality is disabled.")
    
    @action(detail=False, methods=['GET'])
    def without_hpa(self, request):
        """
        Get LRs that don't have HPA created yet
        Shows ALL LRs without HPA regardless of status
        Filters by branch if provided
        """
        queryset = self.get_queryset()
        
        # Filter by branch if provided
        branch_id = request.query_params.get('branch')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        # Filter out LRs that already have any HPA linked
        # HPA can be linked either as primary (primary_hpas) or additional (additional_hpas)
        lrs_with_hpa_ids = queryset.filter(
            Q(primary_hpas__isnull=False) | Q(additional_hpas__isnull=False)
        ).values_list('id', flat=True).distinct()
        queryset = queryset.exclude(id__in=lrs_with_hpa_ids)
        
        # No status filter - show ALL LRs without HPA regardless of status
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['GET'])
    def by_date_range(self, request):
        """Filter LRs by date range"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'Both start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        lrs = self.queryset.filter(
            lr_date__range=[start_date, end_date]
        )
        
        serializer = self.get_serializer(lrs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['GET'])
    def audit_history(self, request, pk=None):
        """Get audit history for a specific LR"""
        lr = self.get_object()
        
        history = {
            'lr_number': lr.lr_number,
            'created_at': lr.created_at,
            'created_by': lr.created_by.username if lr.created_by else None,
            'updated_at': lr.updated_at,
            'updated_by': lr.updated_by.username if lr.updated_by else None,
        }
        
        return Response(history)
    
    @action(detail=True, methods=['GET'])
    def download_pdf(self, request, pk=None):
        """Download LR as PDF matching the exact form format"""
        lr = self.get_object()
        
        try:
            pdf = generate_lr_pdf(lr)
            response = HttpResponse(pdf, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="LR_{lr.lr_number}.pdf"'
            return response
        except Exception as e:
            return Response(
                {'error': f'Error generating PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LRItemViewSet(viewsets.ModelViewSet):
    """ViewSet for managing LRItems"""
    queryset = LRItem.objects.filter(is_deleted=False)
    serializer_class = LRItemSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['lr', 'consignor', 'consignee']
    search_fields = ['consignor__name', 'consignee__name', 'sap_number', 'lr__lr_number']
    ordering_fields = ['sequence_number', 'quantity_mt', 'created_at']
    ordering = ['lr', 'sequence_number', 'id']
    
    def get_queryset(self):
        """Filter by branch based on user permissions"""
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.can_access_all_branches:
            return queryset
        if user.branch:
            return queryset.filter(lr__branch=user.branch)
        return queryset.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return LRItemCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return LRItemUpdateSerializer
        return LRItemSerializer
    
    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            updated_by=self.request.user
        )
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete - ensure at least one item remains"""
        lr_item = self.get_object()
        lr = lr_item.lr
        
        # Check if can edit
        if not lr.can_edit_items:
            return Response(
                {'error': f'Cannot delete items from LR {lr.lr_number}. Status must be DRAFT or PENDING_HPA.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if last item
        remaining = LRItem.objects.filter(
            lr=lr,
            is_deleted=False
        ).exclude(id=lr_item.id)
        
        if not remaining.exists():
            return Response(
                {'error': 'Cannot delete last item. LR must have at least one item.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Soft delete
        lr_item.is_deleted = True
        lr_item.deleted_at = timezone.now()
        lr_item.deleted_by = request.user
        lr_item.save()
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['GET'])
    def by_lr(self, request):
        """Get all items for a specific LR"""
        lr_id = request.query_params.get('lr')
        if not lr_id:
            return Response({'error': 'lr parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        items = self.get_queryset().filter(lr_id=lr_id)
        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)
