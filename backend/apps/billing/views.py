from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, MethodNotAllowed
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.http import HttpResponse
from .models import Bill, BillItem
from .serializers import BillSerializer, BillItemSerializer, BillCreateSerializer, BillUpdateSerializer
from .pdf_generator import generate_bill_pdf
from apps.common.pagination import StandardResultsSetPagination


class BillViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Bills/Invoices to consignors
    Supports: Create, Read, Update (SUPER_ADMIN only)
    Features: Filtering, Search, Pagination, Branch Isolation, Nested Bill Items
    Note: Only SUPER_ADMIN can update records. Delete functionality is disabled.
    """
    queryset = Bill.objects.filter(is_deleted=False)
    serializer_class = BillSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'status', 'consignor']
    search_fields = ['bill_number', 'consignor__name', 'consignor__gstin']
    ordering_fields = ['bill_date', 'created_at', 'grand_total']
    ordering = ['-bill_date']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BillCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return BillUpdateSerializer
        return BillSerializer
    
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
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Delete functionality is disabled.")
    
    @action(detail=True, methods=['GET'])
    def download_pdf(self, request, pk=None):
        """Download bill as PDF"""
        bill = self.get_object()
        
        try:
            pdf = generate_bill_pdf(bill)
            response = HttpResponse(pdf, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="BILL_{bill.bill_number}.pdf"'
            return response
        except Exception as e:
            return Response(
                {'error': f'Error generating PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['GET'])
    def hpa_details_for_billing(self, request):
        """
        Get HPA details with all transactions for bill creation
        Query params: hpa_id (required)
        """
        hpa_id = request.query_params.get('hpa_id')
        
        if not hpa_id:
            return Response(
                {'error': 'hpa_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from apps.hpa.models import HirePaymentAdvice
            from apps.hpa.transactions import HPATransaction
            from apps.hpa.serializers import HirePaymentAdviceSerializer, HPATransactionSerializer
            
            hpa = HirePaymentAdvice.objects.get(id=hpa_id, is_deleted=False)
            
            # Check permissions
            user = request.user
            if not user.can_access_all_branches:
                if not user.branch or hpa.branch != user.branch:
                    return Response(
                        {'error': 'You do not have permission to access this HPA'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Get all transactions for this HPA
            transactions = HPATransaction.objects.filter(
                hpa=hpa,
                is_deleted=False
            ).order_by('-transaction_date', '-created_at')
            
            hpa_data = HirePaymentAdviceSerializer(hpa).data
            transaction_data = HPATransactionSerializer(transactions, many=True).data
            
            # Calculate transaction totals
            totals = {
                'advance_total': sum(t.amount for t in transactions if t.transaction_type == 'ADVANCE'),
                'diesel_total': sum(t.amount for t in transactions if t.transaction_type == 'DIESEL'),
                'bank_total': sum(t.amount for t in transactions if t.transaction_type == 'BANK'),
                'extra_total': sum(t.amount for t in transactions if t.transaction_type == 'EXTRA'),
                'other_total': sum(t.amount for t in transactions if t.transaction_type == 'OTHER'),
                'total_deductions': hpa.total_deductions,
            }
            
            return Response({
                'hpa': hpa_data,
                'transactions': transaction_data,
                'totals': totals,
                'lr': {
                    'lr_number': hpa.lr.lr_number,
                    'lr_date': hpa.lr.lr_date,
                    'consignor': hpa.lr.consignor.name if hpa.lr.consignor else None,
                    'consignee': hpa.lr.consignee.name if hpa.lr.consignee else None,
                    'from_location': hpa.lr.from_location,
                    'to_location': hpa.lr.to_location,
                    'quantity_mt': hpa.lr.quantity_mt,
                }
            })
        except HirePaymentAdvice.DoesNotExist:
            return Response(
                {'error': 'HPA not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class BillItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Bill line items
    Note: Only SUPER_ADMIN can update records. Delete functionality is disabled.
    """
    queryset = BillItem.objects.filter(is_deleted=False)
    serializer_class = BillItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['bill', 'lr']
    search_fields = ['bill__bill_number', 'lr__lr_number', 'destination']
    ordering_fields = ['id', 'quantity_mt', 'total_amount']
    ordering = ['id']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        # Only SUPER_ADMIN can update
        if not self.request.user.can_edit:
            raise PermissionDenied("Only SUPER_ADMIN can update records.")
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Delete functionality is disabled.")

