from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.http import HttpResponse
from .models import HirePaymentAdvice
from .transactions import HPATransaction
from .serializers import (
    HirePaymentAdviceSerializer,
    HirePaymentAdviceCreateSerializer,
    HirePaymentAdviceUpdateSerializer,
    HPATransactionSerializer,
    HPATransactionCreateSerializer
)
from .pdf_generator import generate_hpa_pdf
from apps.common.pagination import StandardResultsSetPagination


class HirePaymentAdviceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for HPA Management
    Supports: Create, Read, Update (SUPER_ADMIN only)
    Features: Filtering, Search, Pagination, Payment Tracking, Branch Isolation
    Note: Only SUPER_ADMIN can update records. Delete functionality is disabled.
    """
    queryset = HirePaymentAdvice.objects.filter(is_deleted=False)
    serializer_class = HirePaymentAdviceSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'truck', 'lr', 'payment_status']
    search_fields = ['hpa_number', 'invoice_number', 'lr__lr_number', 'truck__truck_number', 'driver_name']
    ordering_fields = ['hpa_date', 'created_at', 'balance_rs', 'lorry_hire_rs']
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
            return HirePaymentAdviceCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return HirePaymentAdviceUpdateSerializer
        return HirePaymentAdviceSerializer
    
    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            updated_by=self.request.user
        )
    
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
    def pending_payments(self, request):
        """Get all HPAs with pending payments"""
        hpas = self.queryset.filter(payment_status__in=['PENDING', 'PARTIAL'])
        serializer = self.get_serializer(hpas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['GET'])
    def by_truck(self, request):
        """Get all HPAs for a specific truck"""
        truck_id = request.query_params.get('truck_id')
        if not truck_id:
            return Response(
                {'error': 'truck_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        hpas = self.queryset.filter(truck_id=truck_id)
        serializer = self.get_serializer(hpas, many=True)
        
        # Calculate totals
        total_freight = sum(hpa.lorry_hire_rs for hpa in hpas)
        total_paid = sum(hpa.paid_amount for hpa in hpas)
        total_balance = sum(hpa.balance_rs for hpa in hpas)
        
        return Response({
            'hpas': serializer.data,
            'summary': {
                'total_freight': total_freight,
                'total_paid': total_paid,
                'total_balance': total_balance
            }
        })
    
    @action(detail=False, methods=['GET'])
    def by_date_range(self, request):
        """Filter HPAs by date range"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'Both start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        hpas = self.queryset.filter(
            hpa_date__range=[start_date, end_date]
        )
        
        serializer = self.get_serializer(hpas, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['POST'])
    def mark_as_paid(self, request, pk=None):
        """Mark HPA as fully paid"""
        hpa = self.get_object()
        
        payment_date = request.data.get('payment_date')
        payment_mode = request.data.get('payment_mode')
        
        if not payment_date or not payment_mode:
            return Response(
                {'error': 'payment_date and payment_mode are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        hpa.paid_amount = hpa.balance_rs
        hpa.payment_date = payment_date
        hpa.payment_mode = payment_mode
        hpa.payment_status = 'PAID'
        hpa.updated_by = request.user
        hpa.save()
        
        serializer = self.get_serializer(hpa)
        return Response(serializer.data)
    
    @action(detail=True, methods=['GET'])
    def download_pdf(self, request, pk=None):
        """Download HPA as PDF matching the exact form format"""
        hpa = self.get_object()
        
        try:
            pdf = generate_hpa_pdf(hpa)
            response = HttpResponse(pdf, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="HPA_{hpa.hpa_number}.pdf"'
            return response
        except Exception as e:
            return Response(
                {'error': f'Error generating PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['GET', 'POST'])
    def transactions(self, request, pk=None):
        """
        GET: Get all transactions for this HPA
        POST: Add a new transaction to this HPA
        """
        hpa = self.get_object()
        
        if request.method == 'GET':
            # Get all transactions for this HPA
            transactions = HPATransaction.objects.filter(
                hpa=hpa,
                is_deleted=False
            ).order_by('-transaction_date', '-created_at')
            
            serializer = HPATransactionSerializer(transactions, many=True)
            
            # Calculate totals by type
            totals = {
                'advance_total': sum(t.amount for t in transactions if t.transaction_type == 'ADVANCE'),
                'diesel_total': sum(t.amount for t in transactions if t.transaction_type == 'DIESEL'),
                'bank_total': sum(t.amount for t in transactions if t.transaction_type == 'BANK'),
                'extra_total': sum(t.amount for t in transactions if t.transaction_type == 'EXTRA'),
                'other_total': sum(t.amount for t in transactions if t.transaction_type == 'OTHER'),
                'total_deductions': hpa.total_deductions,
            }
            
            return Response({
                'transactions': serializer.data,
                'totals': totals,
                'hpa_summary': {
                    'hpa_number': hpa.hpa_number,
                    'lorry_hire_rs': hpa.lorry_hire_rs,
                    'total_deductions': hpa.total_deductions,
                    'balance_rs': hpa.balance_rs,
                }
            })
        
        elif request.method == 'POST':
            # Add new transaction
            data = request.data.copy()
            data['hpa'] = hpa.id
            
            serializer = HPATransactionCreateSerializer(data=data, context={'request': request})
            if serializer.is_valid():
                serializer.save(
                    created_by=request.user,
                    updated_by=request.user
                )
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['GET'])
    def without_bills(self, request):
        """Get all HPAs that don't have bills created yet"""
        from apps.billing.models import BillLineItem
        
        # Get all HPA IDs that are in bills
        billed_hpa_ids = BillLineItem.objects.filter(
            is_deleted=False
        ).values_list('hpa_id', flat=True).distinct()
        
        # Get HPAs without bills
        queryset = self.get_queryset().exclude(id__in=billed_hpa_ids)
        
        # Apply date filters if provided
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if from_date:
            queryset = queryset.filter(hpa_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(hpa_date__lte=to_date)
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'results': serializer.data,
            'count': queryset.count()
        })

