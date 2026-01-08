from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import LorryReceipt
from .serializers import (
    LorryReceiptSerializer,
    LorryReceiptCreateSerializer,
    LorryReceiptUpdateSerializer
)


class LorryReceiptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for LR Management
    Supports: Create, Read, Update, Soft Delete
    Features: Filtering, Search, Pagination, Audit Trail
    """
    queryset = LorryReceipt.objects.filter(is_deleted=False)
    serializer_class = LorryReceiptSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'status', 'party', 'truck']
    search_fields = ['lr_number', 'invoice_number', 'truck__truck_number']
    ordering_fields = ['lr_date', 'created_at', 'freight_amount']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return LorryReceiptCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return LorryReceiptUpdateSerializer
        return LorryReceiptSerializer
    
    def perform_create(self, serializer):
        # Set both created_by and updated_by to current user
        serializer.save(
            created_by=self.request.user,
            updated_by=self.request.user
        )
    
    def perform_update(self, serializer):
        # Update the updated_by field
        serializer.save(updated_by=self.request.user)
    
    def perform_destroy(self, instance):
        # Soft delete
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save()
    
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
            'invoice_edited_at': lr.invoice_edited_at,
            'invoice_edited_by': lr.invoice_edited_by.username if lr.invoice_edited_by else None,
        }
        
        return Response(history)
