from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.http import HttpResponse
from django.db.models import Q, Sum, Avg, Count, Exists, OuterRef
from decimal import Decimal
from .models import HirePaymentAdvice, HPAInvoice
from .transactions import HPATransaction
from .serializers import (
    HirePaymentAdviceSerializer,
    HirePaymentAdviceCreateSerializer,
    HirePaymentAdviceUpdateSerializer,
    HPATransactionSerializer,
    HPATransactionCreateSerializer,
    HPAInvoiceSerializer,
    HPAInvoiceCreateSerializer
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
    search_fields = ['hpa_number', 'invoice_number', 'invoices__invoice_number', 'lr__lr_number', 'additional_lrs__lr_number', 'truck__truck_number', 'driver_name']
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
        """Get all HPAs that don't have bills created yet - filtered by branch.
        An HPA is considered 'billed' if any of its linked LRs (primary or additional) appear in a BillItem.
        """
        from apps.billing.models import BillItem
        from django.db.models import Q
        
        # LRs that appear in any bill item (via lr FK or lr_item -> lr)
        billed_lr_ids = set()
        billed_lr_ids.update(
            BillItem.objects.filter(is_deleted=False, lr__isnull=False).values_list('lr_id', flat=True).distinct()
        )
        billed_lr_ids.update(
            BillItem.objects.filter(is_deleted=False, lr_item__isnull=False).values_list('lr_item__lr_id', flat=True).distinct()
        )
        
        # HPAs without bills = no linked LR (primary or additional) is in billed_lr_ids
        queryset = self.get_queryset()
        if billed_lr_ids:
            queryset = queryset.exclude(
                Q(lr_id__in=billed_lr_ids) | Q(additional_lrs__id__in=billed_lr_ids)
            ).distinct()
        
        # Filter by branch if provided (normalize to int for FK)
        branch_id = request.query_params.get('branch')
        if branch_id:
            try:
                branch_id = int(branch_id)
                queryset = queryset.filter(branch_id=branch_id)
            except (ValueError, TypeError):
                pass
        
        # Search by HPA number, invoice number, LR number
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(hpa_number__icontains=search)
                | Q(invoice_number__icontains=search)
                | Q(lr__lr_number__icontains=search)
                | Q(additional_lrs__lr_number__icontains=search)
            ).distinct()
        
        # Apply date filters if provided
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        if from_date:
            queryset = queryset.filter(hpa_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(hpa_date__lte=to_date)
        
        # Order and paginate
        queryset = queryset.order_by('-hpa_date', '-created_at')
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'count': queryset.count()
        })
    
    # ============================================================
    # PHASE 1: Multiple Invoice Numbers per HPA
    # ============================================================
    
    @action(detail=True, methods=['GET'])
    def invoices(self, request, pk=None):
        """
        GET: Get all invoices for this HPA
        Returns list of invoices with summary
        """
        hpa = self.get_object()
        
        invoices = HPAInvoice.objects.filter(
            hpa=hpa,
            is_deleted=False
        ).order_by('-invoice_date', 'invoice_number')
        
        serializer = HPAInvoiceSerializer(invoices, many=True)
        
        # Calculate totals
        total_amount = sum(inv.amount for inv in invoices)
        
        return Response({
            'invoices': serializer.data,
            'count': invoices.count(),
            'total_amount': total_amount,
            'hpa_summary': {
                'hpa_number': hpa.hpa_number,
                'invoice_list': hpa.invoice_list,
            }
        })
    
    @action(detail=True, methods=['POST'])
    def add_invoice(self, request, pk=None):
        """
        POST: Add a new invoice to this HPA
        Required: invoice_number
        Optional: invoice_date, amount, remarks
        """
        hpa = self.get_object()
        
        # Only SUPER_ADMIN can add invoices
        if not request.user.can_edit:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only SUPER_ADMIN can add invoices.")
        
        serializer = HPAInvoiceCreateSerializer(
            data=request.data,
            context={'request': request, 'hpa': hpa}
        )
        
        if serializer.is_valid():
            invoice = HPAInvoice.objects.create(
                hpa=hpa,
                created_by=request.user,
                updated_by=request.user,
                **serializer.validated_data
            )
            
            # Return the created invoice
            response_serializer = HPAInvoiceSerializer(invoice)
            return Response({
                'message': 'Invoice added successfully',
                'invoice': response_serializer.data,
                'invoice_list': hpa.invoice_list,
                'invoice_count': hpa.invoice_count
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['DELETE'], url_path='invoices/(?P<invoice_id>[^/.]+)')
    def delete_invoice(self, request, pk=None, invoice_id=None):
        """
        DELETE: Remove an invoice from this HPA
        URL: /api/v1/hpa/hire-payment-advices/{hpa_id}/invoices/{invoice_id}/
        """
        hpa = self.get_object()
        
        # Only SUPER_ADMIN can delete invoices
        if not request.user.can_edit:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only SUPER_ADMIN can delete invoices.")
        
        try:
            invoice = HPAInvoice.objects.get(id=invoice_id, hpa=hpa, is_deleted=False)
        except HPAInvoice.DoesNotExist:
            return Response(
                {'error': 'Invoice not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Soft delete
        invoice.is_deleted = True
        invoice.updated_by = request.user
        invoice.save()
        
        return Response({
            'message': f'Invoice {invoice.invoice_number} deleted successfully',
            'invoice_list': hpa.invoice_list,
            'invoice_count': hpa.invoice_count
        })


# ============================================================
# PHASE 2: Active HPA Tracking Dashboard
# ============================================================

class ActiveHPAViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Active HPA Tracking Dashboard
    
    An HPA is considered 'active' until delivery acknowledgement (POD) is received.
    
    Features:
    - List all active HPAs (no POD or POD not received)
    - Multi-field search (HPA#, LR#, Invoice#, Truck#, Driver)
    - Date range filtering
    - Payment status filtering
    - Branch filtering (for non-admin users)
    - Statistics endpoint for dashboard metrics
    """
    
    serializer_class = HirePaymentAdviceSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['hpa_number', 'invoice_number', 'invoices__invoice_number', 'lr__lr_number', 
                     'additional_lrs__lr_number', 'truck__truck_number', 'driver_name']
    ordering_fields = ['hpa_date', 'created_at', 'balance_rs', 'lorry_hire_rs']
    ordering = ['-hpa_date', '-created_at']
    
    def get_queryset(self):
        """
        Return only active HPAs (no POD or POD not received).
        Uses Exists subquery for efficient POD check.
        """
        from apps.pod.models import ProofOfDelivery
        
        # Subquery to check if POD exists and is received
        pod_received_subquery = ProofOfDelivery.objects.filter(
            hpa=OuterRef('pk'),
            is_deleted=False,
            status='RECEIVED'
        )
        
        # Base queryset: Active HPAs = No POD received
        queryset = HirePaymentAdvice.objects.filter(
            is_deleted=False
        ).annotate(
            has_pod_received=Exists(pod_received_subquery)
        ).filter(
            has_pod_received=False
        )
        
        user = self.request.user
        
        # Branch filtering for non-admin users
        if not user.can_access_all_branches:
            if user.branch:
                queryset = queryset.filter(branch=user.branch)
            else:
                return queryset.none()
        
        # Apply additional filters from query params
        queryset = self._apply_filters(queryset)
        
        return queryset.distinct()
    
    def _apply_filters(self, queryset):
        """Apply additional filters from query params"""
        params = self.request.query_params
        
        # Search filter (multi-field)
        search = params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(hpa_number__icontains=search) |
                Q(invoice_number__icontains=search) |
                Q(invoices__invoice_number__icontains=search) |
                Q(lr__lr_number__icontains=search) |
                Q(additional_lrs__lr_number__icontains=search) |
                Q(truck__truck_number__icontains=search) |
                Q(driver_name__icontains=search)
            )
        
        # Date range filters
        from_date = params.get('from_date')
        to_date = params.get('to_date')
        if from_date:
            queryset = queryset.filter(hpa_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(hpa_date__lte=to_date)
        
        # Payment status filter
        payment_status = params.get('payment_status')
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)
        
        # Branch filter (for admins)
        branch_id = params.get('branch')
        if branch_id:
            try:
                queryset = queryset.filter(branch_id=int(branch_id))
            except (ValueError, TypeError):
                pass
        
        # Overdue filter
        overdue_only = params.get('overdue_only', '').lower() == 'true'
        if overdue_only:
            threshold_days = int(params.get('overdue_days', 7))
            threshold_date = timezone.now().date() - timezone.timedelta(days=threshold_days)
            queryset = queryset.filter(hpa_date__lte=threshold_date)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Override list to add computed fields to response"""
        response = super().list(request, *args, **kwargs)
        
        # Add computed fields to each HPA in results
        if 'results' in response.data:
            for hpa_data in response.data['results']:
                hpa_id = hpa_data.get('id')
                try:
                    hpa = HirePaymentAdvice.objects.get(id=hpa_id)
                    hpa_data['is_active'] = hpa.is_active
                    hpa_data['has_pod'] = hpa.has_pod
                    hpa_data['pod_status'] = hpa.pod_status
                    hpa_data['days_active'] = hpa.days_active
                    hpa_data['is_overdue'] = hpa.is_overdue
                    hpa_data['days_active_category'] = hpa.days_active_category
                except HirePaymentAdvice.DoesNotExist:
                    pass
        
        return response
    
    @action(detail=False, methods=['GET'])
    def statistics(self, request):
        """
        Get dashboard statistics for active HPAs.
        
        Returns:
        - total_active: Count of active HPAs
        - total_lorry_hire: Sum of lorry hire amounts
        - total_balance: Sum of balance due amounts
        - average_days_active: Average days since HPA creation
        - overdue_count: Count of HPAs active > 7 days
        - by_payment_status: Breakdown by payment status
        - by_branch: Breakdown by branch (if admin)
        - recent_active: Most recent 5 active HPAs
        """
        queryset = self.get_queryset()
        
        # Basic aggregations
        total_active = queryset.count()
        aggregates = queryset.aggregate(
            total_lorry_hire=Sum('lorry_hire_rs'),
            total_balance=Sum('balance_rs'),
        )
        
        # Calculate average days active
        today = timezone.now().date()
        total_days = sum((today - hpa.hpa_date).days for hpa in queryset.only('hpa_date') if hpa.hpa_date)
        avg_days_active = total_days / total_active if total_active > 0 else 0
        
        # Overdue count (>7 days)
        overdue_threshold = today - timezone.timedelta(days=7)
        overdue_count = queryset.filter(hpa_date__lte=overdue_threshold).count()
        
        # Breakdown by payment status
        by_payment_status = list(queryset.values('payment_status').annotate(
            count=Count('id'),
            total_balance=Sum('balance_rs')
        ).order_by('payment_status'))
        
        # Breakdown by branch (for admins)
        by_branch = []
        if request.user.can_access_all_branches:
            by_branch = list(queryset.values('branch__name', 'branch_id').annotate(
                count=Count('id'),
                total_balance=Sum('balance_rs')
            ).order_by('-count'))
        
        # Days active breakdown
        days_breakdown = {
            'on_track': queryset.filter(hpa_date__gte=today - timezone.timedelta(days=3)).count(),
            'warning': queryset.filter(
                hpa_date__lt=today - timezone.timedelta(days=3),
                hpa_date__gte=today - timezone.timedelta(days=7)
            ).count(),
            'overdue': overdue_count
        }
        
        # Recent active HPAs (for quick reference)
        recent_hpas = queryset.order_by('-hpa_date')[:5]
        recent_active = [{
            'id': hpa.id,
            'hpa_number': hpa.hpa_number,
            'hpa_date': hpa.hpa_date,
            'truck_number': hpa.truck.truck_number if hpa.truck else None,
            'driver_name': hpa.driver_name,
            'balance_rs': float(hpa.balance_rs),
            'days_active': hpa.days_active,
            'is_overdue': hpa.is_overdue,
        } for hpa in recent_hpas]
        
        return Response({
            'total_active': total_active,
            'total_lorry_hire': float(aggregates['total_lorry_hire'] or 0),
            'total_balance': float(aggregates['total_balance'] or 0),
            'average_days_active': round(avg_days_active, 1),
            'overdue_count': overdue_count,
            'days_breakdown': days_breakdown,
            'by_payment_status': by_payment_status,
            'by_branch': by_branch,
            'recent_active': recent_active,
        })
    
    @action(detail=True, methods=['GET'])
    def details(self, request, pk=None):
        """
        Get detailed information for a specific active HPA including
        all computed fields and related data.
        """
        try:
            hpa = self.get_queryset().get(pk=pk)
        except HirePaymentAdvice.DoesNotExist:
            return Response(
                {'error': 'Active HPA not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(hpa)
        data = serializer.data
        
        # Add computed fields
        data['is_active'] = hpa.is_active
        data['has_pod'] = hpa.has_pod
        data['pod_status'] = hpa.pod_status
        data['days_active'] = hpa.days_active
        data['is_overdue'] = hpa.is_overdue
        data['days_active_category'] = hpa.days_active_category
        
        # Add POD details if exists
        if hpa.has_pod:
            pod_obj = hpa.pod_record
            if pod_obj:
                data['pod_details'] = {
                    'id': pod_obj.id,
                    'status': pod_obj.status,
                    'received_date': pod_obj.received_date,
                    'receiver_name': pod_obj.receiver_name,
                }
        
        return Response(data)


class HPATransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for HPA Transaction Management
    Provides full CRUD operations for payment transactions
    Replaces the old PaymentTransaction model
    """
    queryset = HPATransaction.objects.filter(is_deleted=False)
    serializer_class = HPATransactionSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'hpa', 'transaction_type', 'payment_mode', 'transaction_date']
    search_fields = ['transaction_number', 'hpa__hpa_number', 'pump_name', 'reference_number', 'description', 'remarks']
    ordering_fields = ['transaction_date', 'amount', 'created_at']
    ordering = ['-transaction_date', '-created_at']
    
    def get_queryset(self):
        """Filter by branch based on user permissions"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # SUPER_ADMIN can see all branches
        if user.can_access_all_branches:
            return queryset
        
        # BRANCH_MANAGER can only see their branch data
        if user.branch:
            return queryset.filter(branch=user.branch)
        
        # No branch assigned - return empty
        return queryset.none()
    
    def get_serializer_class(self):
        """Use different serializer for create"""
        if self.action == 'create':
            return HPATransactionCreateSerializer
        return HPATransactionSerializer
    
    def perform_create(self, serializer):
        """Create transaction with user context"""
        hpa = serializer.validated_data['hpa']
        serializer.save(
            branch=hpa.branch,
            created_by=self.request.user,
            updated_by=self.request.user
        )
    
    def perform_update(self, serializer):
        """Update transaction with user context"""
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['GET'])
    def summary(self, request):
        """Get transaction summary statistics"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Calculate totals by transaction type
        summary = {}
        for txn_type, txn_label in HPATransaction.TRANSACTION_TYPE_CHOICES:
            total = queryset.filter(transaction_type=txn_type).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            summary[txn_type] = {
                'label': txn_label,
                'total': float(total),
                'count': queryset.filter(transaction_type=txn_type).count()
            }
        
        # Grand totals
        grand_total = queryset.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_count = queryset.count()
        
        return Response({
            'by_type': summary,
            'grand_total': float(grand_total),
            'total_count': total_count
        })
    
    @action(detail=False, methods=['GET'])
    def by_hpa(self, request):
        """Get all transactions for a specific HPA"""
        hpa_id = request.query_params.get('hpa_id')
        if not hpa_id:
            return Response(
                {'error': 'hpa_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.filter_queryset(self.get_queryset()).filter(hpa_id=hpa_id)
        serializer = self.get_serializer(queryset, many=True)
        
        # Calculate totals for this HPA
        totals = {
            'advance_total': sum(t.amount for t in queryset if t.transaction_type == 'ADVANCE'),
            'diesel_total': sum(t.amount for t in queryset if t.transaction_type == 'DIESEL'),
            'bank_total': sum(t.amount for t in queryset if t.transaction_type == 'BANK'),
            'extra_total': sum(t.amount for t in queryset if t.transaction_type == 'EXTRA'),
            'other_total': sum(t.amount for t in queryset if t.transaction_type == 'OTHER'),
            'total': sum(t.amount for t in queryset),
        }
        
        return Response({
            'transactions': serializer.data,
            'totals': totals
        })

