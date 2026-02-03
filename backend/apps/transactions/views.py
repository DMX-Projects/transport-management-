from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Q
from decimal import Decimal

from .models import PaymentTransaction, HPALRLink
from .serializers import (
    PaymentTransactionSerializer, PaymentTransactionCreateSerializer,
    HPALRLinkSerializer, HPALRLinkCreateSerializer,
    PaymentSummarySerializer
)
from apps.common.pagination import StandardResultsSetPagination


class PaymentTransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Payment Transactions
    
    Provides CRUD operations for tracking payments to trucks:
    - Advance payments
    - Diesel payments (with pump name)
    - Bank transfers (with bank name)
    - Balance payments
    - Deductions, tolls, commissions, etc.
    """
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'hpa', 'payment_type', 'payment_method', 'payment_date']
    search_fields = ['hpa__hpa_number', 'reference_number', 'pump_name', 'bank_name', 'remarks']
    ordering_fields = ['payment_date', 'created_at', 'amount']
    ordering = ['-payment_date', '-created_at']
    
    def get_queryset(self):
        user = self.request.user
        queryset = PaymentTransaction.objects.select_related(
            'branch', 'hpa', 'hpa__truck', 'created_by'
        )
        
        # Branch isolation for non-superusers
        if not user.is_superuser:
            queryset = queryset.filter(branch=user.branch)
        
        # Filter by HPA if provided
        hpa_id = self.request.query_params.get('hpa_id')
        if hpa_id:
            queryset = queryset.filter(hpa_id=hpa_id)
        
        # Date range filter
        from_date = self.request.query_params.get('from_date')
        to_date = self.request.query_params.get('to_date')
        if from_date:
            queryset = queryset.filter(payment_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(payment_date__lte=to_date)
        
        return queryset
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PaymentTransactionCreateSerializer
        return PaymentTransactionSerializer
    
    @action(detail=False, methods=['get'])
    def by_hpa(self, request):
        """Get all payments grouped by HPA"""
        hpa_id = request.query_params.get('hpa_id')
        if not hpa_id:
            return Response(
                {'error': 'hpa_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payments = self.get_queryset().filter(hpa_id=hpa_id)
        
        # Group by payment type
        summary = {
            'ADVANCE': Decimal('0'),
            'DIESEL': Decimal('0'),
            'BANK': Decimal('0'),
            'BALANCE': Decimal('0'),
            'DEDUCTION': Decimal('0'),
            'TOLL': Decimal('0'),
            'COMMISSION': Decimal('0'),
            'OTHER': Decimal('0'),
        }
        
        for payment in payments:
            summary[payment.payment_type] += payment.amount
        
        serializer = PaymentTransactionSerializer(payments, many=True)
        
        return Response({
            'payments': serializer.data,
            'summary': summary,
            'total_paid': sum(summary.values())
        })
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get payment summary for dashboard"""
        queryset = self.get_queryset()
        
        total_by_type = queryset.values('payment_type').annotate(
            total=Sum('amount')
        ).order_by('payment_type')
        
        return Response({
            'by_type': list(total_by_type),
            'grand_total': queryset.aggregate(total=Sum('amount'))['total'] or 0
        })


class HPALRLinkViewSet(viewsets.ModelViewSet):
    """
    ViewSet for HPA-LR Links
    
    Manages the many-to-many relationship between HPAs and LRs
    with individual tonnage and rate per LR.
    """
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'hpa', 'lr']
    search_fields = ['hpa__hpa_number', 'lr__lr_number']
    ordering_fields = ['created_at', 'amount']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        queryset = HPALRLink.objects.select_related(
            'branch', 'hpa', 'lr', 'lr__consignor', 'lr__consignee'
        ).prefetch_related('lr__lr_items')
        
        # Branch isolation for non-superusers
        if not user.is_superuser:
            queryset = queryset.filter(branch=user.branch)
        
        # Filter by HPA if provided
        hpa_id = self.request.query_params.get('hpa_id')
        if hpa_id:
            queryset = queryset.filter(hpa_id=hpa_id)
        
        # Filter by LR if provided
        lr_id = self.request.query_params.get('lr_id')
        if lr_id:
            queryset = queryset.filter(lr_id=lr_id)
        
        return queryset
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return HPALRLinkCreateSerializer
        return HPALRLinkSerializer
    
    @action(detail=False, methods=['get'])
    def by_hpa(self, request):
        """Get all LR links for an HPA with totals"""
        hpa_id = request.query_params.get('hpa_id')
        if not hpa_id:
            return Response(
                {'error': 'hpa_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        links = self.get_queryset().filter(hpa_id=hpa_id)
        serializer = HPALRLinkSerializer(links, many=True)
        
        totals = links.aggregate(
            total_tonnage=Sum('tonnage'),
            total_amount=Sum('amount')
        )
        
        return Response({
            'lr_links': serializer.data,
            'total_tonnage': totals['total_tonnage'] or 0,
            'total_amount': totals['total_amount'] or 0,
            'lr_count': links.count()
        })
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Create multiple LR links at once for an HPA"""
        hpa_id = request.data.get('hpa_id')
        links_data = request.data.get('links', [])
        
        if not hpa_id:
            return Response(
                {'error': 'hpa_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not links_data:
            return Response(
                {'error': 'links array is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_links = []
        errors = []
        
        for idx, link_data in enumerate(links_data):
            link_data['hpa'] = hpa_id
            serializer = HPALRLinkCreateSerializer(
                data=link_data,
                context={'request': request}
            )
            
            if serializer.is_valid():
                link = serializer.save()
                created_links.append(link)
            else:
                errors.append({
                    'index': idx,
                    'errors': serializer.errors
                })
        
        if errors and not created_links:
            return Response(
                {'errors': errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'created': len(created_links),
            'errors': errors if errors else None
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def available_lrs(self, request):
        """Get LRs that are not yet linked to any HPA"""
        from apps.lr.models import LorryReceipt
        from apps.lr.serializers import LorryReceiptSerializer
        
        user = request.user
        
        # Get LRs not linked to any HPA
        linked_lr_ids = HPALRLink.objects.values_list('lr_id', flat=True)
        
        queryset = LorryReceipt.objects.filter(
            is_deleted=False
        ).exclude(id__in=linked_lr_ids)
        
        # Branch isolation
        if not user.is_superuser:
            queryset = queryset.filter(branch=user.branch)
        
        # Optional filters
        truck_id = request.query_params.get('truck_id')
        if truck_id:
            queryset = queryset.filter(truck_id=truck_id)
        
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        if from_date:
            queryset = queryset.filter(lr_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(lr_date__lte=to_date)
        
        serializer = LorryReceiptSerializer(queryset[:50], many=True)
        return Response(serializer.data)
