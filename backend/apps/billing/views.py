from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, MethodNotAllowed
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.http import HttpResponse
from django.db import models
from django.db.models import Sum, Count, Q, F
from decimal import Decimal
from .models import Bill, BillItem, BillingTemplate, ClientPayment
from .serializers import (
    BillSerializer, BillItemSerializer, BillCreateSerializer, BillUpdateSerializer,
    BillingTemplateSerializer, BillingTemplateCreateSerializer, BillingTemplateListSerializer,
    ClientPaymentSerializer, ClientPaymentCreateSerializer
)
from .pdf_generator import generate_bill_pdf
from apps.common.pagination import StandardResultsSetPagination
from apps.masters.models import Consignor


class BillingTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Billing Templates
    Supports: Create, Read, Update, Soft Delete
    Features: Filtering, Search, Pagination
    
    Permissions:
    - List/Retrieve: All authenticated users
    - Create/Update/Delete: SUPER_ADMIN only
    """
    queryset = BillingTemplate.objects.filter(is_deleted=False)
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['template_type', 'consignor', 'is_default', 'is_active']
    search_fields = ['name', 'code', 'description', 'consignor__name']
    ordering_fields = ['name', 'created_at', 'template_type']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            # Use lightweight serializer for list view
            return BillingTemplateListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return BillingTemplateCreateSerializer
        return BillingTemplateSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by active only if requested
        active_only = self.request.query_params.get('active_only', '').lower() == 'true'
        if active_only:
            queryset = queryset.filter(is_active=True)
        
        return queryset
    
    def perform_create(self, serializer):
        # Only SUPER_ADMIN can create templates
        if not self.request.user.is_admin:
            raise PermissionDenied("Only SUPER_ADMIN can create billing templates.")
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        # Only SUPER_ADMIN can update templates
        if not self.request.user.is_admin:
            raise PermissionDenied("Only SUPER_ADMIN can update billing templates.")
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete template"""
        if not request.user.is_admin:
            raise PermissionDenied("Only SUPER_ADMIN can delete billing templates.")
        
        template = self.get_object()
        
        # Check if template is in use
        bills_count = template.bills.filter(is_deleted=False).count()
        if bills_count > 0:
            # Don't delete, just deactivate
            template.is_active = False
            template.updated_by = request.user
            template.save()
            return Response({
                'message': f'Template deactivated (has {bills_count} associated bills)',
                'deactivated': True
            })
        
        # Soft delete
        template.is_deleted = True
        template.updated_by = request.user
        template.save()
        return Response({'message': 'Template deleted', 'deleted': True})
    
    @action(detail=False, methods=['GET'])
    def for_consignor(self, request):
        """
        Get templates available for a specific consignor.
        Returns consignor-specific templates plus global templates.
        Query params: consignor_id (required)
        """
        consignor_id = request.query_params.get('consignor_id')
        
        if not consignor_id:
            return Response(
                {'error': 'consignor_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get consignor-specific templates
        templates = BillingTemplate.objects.filter(
            is_deleted=False,
            is_active=True
        ).filter(
            # Consignor-specific OR global templates
            models.Q(consignor_id=consignor_id) | models.Q(consignor__isnull=True)
        ).order_by('-is_default', 'name')
        
        serializer = BillingTemplateListSerializer(templates, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['GET'])
    def defaults(self, request):
        """Get default templates (global templates)"""
        templates = BillingTemplate.objects.filter(
            is_deleted=False,
            is_active=True,
            consignor__isnull=True
        ).order_by('-is_default', 'name')
        
        serializer = BillingTemplateListSerializer(templates, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['POST'])
    def set_default(self, request, pk=None):
        """Set this template as default for its consignor (or global)"""
        if not request.user.is_admin:
            raise PermissionDenied("Only SUPER_ADMIN can set default templates.")
        
        template = self.get_object()
        template.is_default = True
        template.save()  # This will unset other defaults automatically
        
        return Response({
            'message': f'Template "{template.name}" set as default',
            'template': BillingTemplateSerializer(template).data
        })
    
    @action(detail=True, methods=['POST'])
    def duplicate(self, request, pk=None):
        """Create a copy of this template with a new name/code"""
        if not request.user.is_admin:
            raise PermissionDenied("Only SUPER_ADMIN can duplicate templates.")
        
        template = self.get_object()
        
        # Get new name/code from request or generate
        new_name = request.data.get('name', f"{template.name} (Copy)")
        new_code = request.data.get('code', f"{template.code}_COPY")
        
        # Check code uniqueness
        if BillingTemplate.objects.filter(code=new_code, is_deleted=False).exists():
            return Response(
                {'error': f'Template with code "{new_code}" already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create duplicate
        new_template = BillingTemplate.objects.create(
            name=new_name,
            code=new_code,
            description=f"Copy of {template.name}",
            template_type=template.template_type,
            consignor=request.data.get('consignor_id', template.consignor_id),
            is_default=False,
            is_active=True,
            field_mapping=template.field_mapping,
            calculation_rules=template.calculation_rules,
            grouping_rules=template.grouping_rules,
            tax_configuration=template.tax_configuration,
            display_options=template.display_options,
            pdf_template_name=template.pdf_template_name,
            header_config=template.header_config,
            footer_config=template.footer_config,
            page_settings=template.page_settings,
            created_by=request.user,
            updated_by=request.user
        )
        
        return Response({
            'message': f'Template duplicated as "{new_name}"',
            'template': BillingTemplateSerializer(new_template).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['GET'])
    def preview(self, request, pk=None):
        """Preview template with sample data"""
        template = self.get_object()
        
        # Generate sample preview data
        sample_data = {
            'template': BillingTemplateSerializer(template).data,
            'sample_bill': {
                'bill_number': 'SAMPLE-001',
                'bill_date': timezone.now().date().isoformat(),
                'consignor_name': template.consignor.name if template.consignor else 'Sample Consignor',
                'from_date': (timezone.now().date() - timezone.timedelta(days=30)).isoformat(),
                'to_date': timezone.now().date().isoformat(),
            },
            'sample_items': [
                {
                    'lr_number': 'LR-001',
                    'destination': 'Chennai',
                    'quantity_mt': 25.5,
                    'freight_rate': 1500,
                    'total_amount': 38250
                },
                {
                    'lr_number': 'LR-002',
                    'destination': 'Mumbai',
                    'quantity_mt': 30.0,
                    'freight_rate': 1800,
                    'total_amount': 54000
                },
            ],
            'sample_totals': {
                'total_quantity_mt': 55.5,
                'total_amount': 92250,
                'sgst_amount': 8302.50,
                'cgst_amount': 8302.50,
                'grand_total': 108855
            },
            'fields_visible': template.field_mapping,
            'tax_config': template.tax_configuration,
            'display_options': template.display_options
        }
        
        return Response(sample_data)


class BillViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Bills/Invoices to consignors
    Supports: Create, Read, Update (SUPER_ADMIN only)
    Features: Filtering, Search, Pagination, Branch Isolation, Nested Bill Items
    
    Phase 4 Enhancements:
    - Enhanced search by HPA#, Invoice#, Truck#
    - Payment recording actions
    - Outstanding bills filtering
    
    Note: Only SUPER_ADMIN can update records. Delete functionality is disabled.
    """
    queryset = Bill.objects.filter(is_deleted=False)
    serializer_class = BillSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'status', 'consignor', 'payment_status']
    search_fields = [
        'bill_number', 'consignor__name', 'consignor__gstin',
        # Phase 4: Enhanced search fields via related models
        'bill_items__lr__lr_number',  # Search by LR number
    ]
    ordering_fields = ['bill_date', 'created_at', 'grand_total', 'due_date', 'payment_status']
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
    def unbilled_invoices(self, request):
        """
        Get HPAInvoices that don't have bills yet.
        Query params: consignor_id (optional - filter by consignor)
        """
        from apps.hpa.models import HPAInvoice
        from apps.hpa.serializers import HPAInvoiceSerializer
        
        consignor_id = request.query_params.get('consignor_id')
        
        # Get all invoices that have been billed (have BillItems linked)
        billed_invoice_ids = BillItem.objects.filter(
            hpa_invoice__isnull=False,
            bill__is_deleted=False
        ).values_list('hpa_invoice_id', flat=True).distinct()
        
        # Get unbilled invoices
        queryset = HPAInvoice.objects.filter(
            is_deleted=False
        ).exclude(
            id__in=billed_invoice_ids
        ).select_related('hpa', 'hpa__branch', 'hpa__consignor')
        
        # Filter by consignor if provided
        if consignor_id:
            queryset = queryset.filter(hpa__consignor_id=consignor_id)
        
        # Filter by branch if user is not admin
        user = request.user
        if not user.can_access_all_branches and user.branch:
            queryset = queryset.filter(hpa__branch=user.branch)
        
        # Order by invoice date (newest first)
        queryset = queryset.order_by('-invoice_date', '-created_at')
        
        serializer = HPAInvoiceSerializer(queryset, many=True)
        return Response(serializer.data)
    
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
                    'lr_number': hpa.lr.lr_number if hpa.lr else None,
                    'lr_date': hpa.lr.lr_date if hpa.lr else None,
                    'consignor': hpa.lr.consignor.name if hpa.lr and hpa.lr.consignor else None,
                    'consignee': hpa.lr.consignee.name if hpa.lr and hpa.lr.consignee else None,
                    'from_location': hpa.lr.from_location if hpa.lr else hpa.from_location,
                    'to_location': hpa.lr.to_location if hpa.lr else hpa.to_location,
                    'quantity_mt': hpa.lr.quantity_mt if hpa.lr else hpa.tons,
                    'lr_count': hpa.lrs.count() if hasattr(hpa, 'lrs') else 1,
                }
            })
        except HirePaymentAdvice.DoesNotExist:
            return Response(
                {'error': 'HPA not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    # ============================================================
    # PHASE 4: Payment Management Actions
    # ============================================================
    
    @action(detail=True, methods=['GET'])
    def payments(self, request, pk=None):
        """Get all payments for a bill"""
        bill = self.get_object()
        payments = bill.client_payments.filter(is_deleted=False).order_by('-payment_date')
        serializer = ClientPaymentSerializer(payments, many=True)
        return Response({
            'bill_number': bill.bill_number,
            'grand_total': bill.grand_total,
            'total_payments': bill.total_payments_received,
            'outstanding': bill.outstanding_amount,
            'payment_status': bill.payment_status,
            'payments': serializer.data
        })
    
    @action(detail=True, methods=['POST'])
    def add_payment(self, request, pk=None):
        """Record a payment against a bill"""
        bill = self.get_object()
        
        # Add bill to the request data
        data = request.data.copy()
        data['bill'] = bill.id
        
        serializer = ClientPaymentCreateSerializer(data=data, context={'request': request})
        
        if serializer.is_valid():
            payment = serializer.save()
            return Response({
                'message': 'Payment recorded successfully',
                'payment': ClientPaymentSerializer(payment).data,
                'bill_outstanding': bill.outstanding_amount,
                'bill_payment_status': bill.payment_status
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['GET'])
    def outstanding(self, request):
        """Get all bills with outstanding amounts"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Filter for bills with outstanding amounts
        queryset = queryset.exclude(payment_status='PAID')
        
        # Optional filters
        overdue_only = request.query_params.get('overdue_only', 'false').lower() == 'true'
        if overdue_only:
            queryset = queryset.filter(payment_status='OVERDUE')
        
        consignor_id = request.query_params.get('consignor')
        if consignor_id:
            queryset = queryset.filter(consignor_id=consignor_id)
        
        # Ordering
        queryset = queryset.order_by('-due_date', '-bill_date')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['GET'])
    def summary(self, request):
        """Get billing summary with totals"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Calculate totals
        totals = queryset.aggregate(
            total_billed=Sum('grand_total'),
            total_count=Count('id')
        )
        
        # Calculate payment status breakdown
        status_breakdown = {}
        for status_choice in Bill.PAYMENT_STATUS_CHOICES:
            status_code = status_choice[0]
            status_queryset = queryset.filter(payment_status=status_code)
            status_breakdown[status_code] = {
                'count': status_queryset.count(),
                'total': status_queryset.aggregate(total=Sum('grand_total'))['total'] or Decimal('0')
            }
        
        return Response({
            'total_billed': totals['total_billed'] or Decimal('0'),
            'total_bills': totals['total_count'] or 0,
            'status_breakdown': status_breakdown
        })


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


# ============================================================
# PHASE 4: Client Payment Tracking ViewSets
# ============================================================

class ClientPaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Client Payments
    Supports: Create, Read, Update, Soft Delete
    """
    queryset = ClientPayment.objects.filter(is_deleted=False)
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['bill', 'bill__consignor', 'payment_method']
    search_fields = ['bill__bill_number', 'reference_number', 'bill__consignor__name']
    ordering_fields = ['payment_date', 'amount', 'created_at']
    ordering = ['-payment_date']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ClientPaymentCreateSerializer
        return ClientPaymentSerializer
    
    def get_queryset(self):
        """Filter by branch based on user permissions"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # Admin can see all payments
        if user.can_access_all_branches:
            return queryset
        
        # Other users only see payments for bills in their branch
        if user.branch:
            return queryset.filter(bill__branch=user.branch)
        
        return queryset.none()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete payment"""
        payment = self.get_object()
        bill = payment.bill
        payment.is_deleted = True
        payment.updated_by = request.user
        payment.save()
        # Update bill status after deleting payment
        bill.update_payment_status()
        return Response({'message': 'Payment deleted'})


class ClientAccountViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing Client (Consignor) Account information
    Provides aggregated billing and payment data per consignor
    
    Read-only - aggregated views for reporting
    """
    queryset = Consignor.objects.filter(is_deleted=False)
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'gstin', 'city']
    ordering_fields = ['name']
    ordering = ['name']
    
    def list(self, request, *args, **kwargs):
        """List all consignors with their account summaries"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Get user's branch filter
        user = request.user
        if not user.can_access_all_branches and user.branch:
            # Only show consignors with bills in user's branch
            consignor_ids = Bill.objects.filter(
                branch=user.branch,
                is_deleted=False
            ).values_list('consignor_id', flat=True).distinct()
            queryset = queryset.filter(id__in=consignor_ids)
        
        # Build account data for each consignor
        accounts = []
        for consignor in queryset:
            bills = Bill.objects.filter(consignor=consignor, is_deleted=False)
            
            totals = bills.aggregate(
                total_billed=Sum('grand_total'),
                total_bills=Count('id')
            )
            
            # Calculate payments
            payments = ClientPayment.objects.filter(
                bill__consignor=consignor,
                is_deleted=False
            ).aggregate(total_paid=Sum('amount'))
            
            total_billed = totals['total_billed'] or Decimal('0')
            total_paid = payments['total_paid'] or Decimal('0')
            outstanding = total_billed - total_paid
            
            # Get last payment date
            last_payment = ClientPayment.objects.filter(
                bill__consignor=consignor,
                is_deleted=False
            ).order_by('-payment_date').first()
            
            # Count overdue bills
            overdue_count = bills.filter(payment_status='OVERDUE').count()
            
            accounts.append({
                'id': consignor.id,
                'name': consignor.name,
                'gstin': consignor.gstin,
                'city': consignor.city,
                'total_billed': total_billed,
                'total_paid': total_paid,
                'outstanding': outstanding,
                'total_bills': totals['total_bills'] or 0,
                'overdue_count': overdue_count,
                'last_payment_date': last_payment.payment_date if last_payment else None,
            })
        
        # Sort by outstanding (descending)
        accounts.sort(key=lambda x: x['outstanding'], reverse=True)
        
        # Paginate manually
        page_size = int(request.query_params.get('page_size', 25))
        page = int(request.query_params.get('page', 1))
        start = (page - 1) * page_size
        end = start + page_size
        
        return Response({
            'count': len(accounts),
            'results': accounts[start:end]
        })
    
    def retrieve(self, request, pk=None, *args, **kwargs):
        """Get detailed account information for a consignor"""
        try:
            consignor = Consignor.objects.get(pk=pk, is_deleted=False)
        except Consignor.DoesNotExist:
            return Response({'error': 'Consignor not found'}, status=status.HTTP_404_NOT_FOUND)
        
        bills = Bill.objects.filter(consignor=consignor, is_deleted=False)
        
        # Calculate totals
        totals = bills.aggregate(
            total_billed=Sum('grand_total'),
            total_bills=Count('id')
        )
        
        payments = ClientPayment.objects.filter(
            bill__consignor=consignor,
            is_deleted=False
        ).aggregate(total_paid=Sum('amount'))
        
        total_billed = totals['total_billed'] or Decimal('0')
        total_paid = payments['total_paid'] or Decimal('0')
        outstanding = total_billed - total_paid
        
        # Aging analysis
        aging = {
            'current': Decimal('0'),
            '0-30': Decimal('0'),
            '31-60': Decimal('0'),
            '61-90': Decimal('0'),
            '90+': Decimal('0'),
        }
        
        for bill in bills.exclude(payment_status='PAID'):
            bucket = bill.aging_bucket
            if bucket in aging:
                aging[bucket] += bill.outstanding_amount
        
        # Status breakdown
        status_breakdown = {}
        for status_choice in Bill.PAYMENT_STATUS_CHOICES:
            status_code = status_choice[0]
            status_bills = bills.filter(payment_status=status_code)
            status_breakdown[status_code] = {
                'count': status_bills.count(),
                'total': status_bills.aggregate(total=Sum('grand_total'))['total'] or Decimal('0')
            }
        
        # Get recent payments
        recent_payments = ClientPayment.objects.filter(
            bill__consignor=consignor,
            is_deleted=False
        ).order_by('-payment_date')[:10]
        
        # Calculate average payment days
        paid_bills = bills.filter(payment_status='PAID')
        avg_payment_days = 0
        if paid_bills.exists():
            payment_days_sum = 0
            count = 0
            for bill in paid_bills:
                if bill.payment_date and bill.bill_date:
                    days = (bill.payment_date - bill.bill_date).days
                    payment_days_sum += days
                    count += 1
            if count > 0:
                avg_payment_days = payment_days_sum / count
        
        return Response({
            'consignor': {
                'id': consignor.id,
                'name': consignor.name,
                'gstin': consignor.gstin,
                'pan': consignor.pan,
                'address': consignor.address,
                'city': consignor.city,
                'state': consignor.state,
                'phone': consignor.phone,
                'email': consignor.email,
            },
            'summary': {
                'total_billed': total_billed,
                'total_paid': total_paid,
                'outstanding': outstanding,
                'total_bills': totals['total_bills'] or 0,
                'avg_payment_days': round(avg_payment_days, 1),
            },
            'aging': aging,
            'status_breakdown': status_breakdown,
            'recent_payments': ClientPaymentSerializer(recent_payments, many=True).data,
        })
    
    @action(detail=True, methods=['GET'])
    def bills(self, request, pk=None):
        """Get all bills for a consignor"""
        try:
            consignor = Consignor.objects.get(pk=pk, is_deleted=False)
        except Consignor.DoesNotExist:
            return Response({'error': 'Consignor not found'}, status=status.HTTP_404_NOT_FOUND)
        
        bills = Bill.objects.filter(consignor=consignor, is_deleted=False)
        
        # Optional status filter
        status_filter = request.query_params.get('payment_status')
        if status_filter:
            bills = bills.filter(payment_status=status_filter)
        
        # Ordering
        bills = bills.order_by('-bill_date')
        
        serializer = BillSerializer(bills, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['GET'])
    def payments(self, request, pk=None):
        """Get all payments for a consignor"""
        try:
            consignor = Consignor.objects.get(pk=pk, is_deleted=False)
        except Consignor.DoesNotExist:
            return Response({'error': 'Consignor not found'}, status=status.HTTP_404_NOT_FOUND)
        
        payments = ClientPayment.objects.filter(
            bill__consignor=consignor,
            is_deleted=False
        ).order_by('-payment_date')
        
        serializer = ClientPaymentSerializer(payments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['GET'])
    def summary(self, request):
        """Get overall client accounts summary"""
        user = request.user
        
        # Build base queryset
        bills_queryset = Bill.objects.filter(is_deleted=False)
        payments_queryset = ClientPayment.objects.filter(is_deleted=False)
        
        if not user.can_access_all_branches and user.branch:
            bills_queryset = bills_queryset.filter(branch=user.branch)
            payments_queryset = payments_queryset.filter(bill__branch=user.branch)
        
        # Calculate totals
        totals = bills_queryset.aggregate(
            total_billed=Sum('grand_total'),
            total_bills=Count('id')
        )
        
        payments_total = payments_queryset.aggregate(
            total_paid=Sum('amount')
        )
        
        total_billed = totals['total_billed'] or Decimal('0')
        total_paid = payments_total['total_paid'] or Decimal('0')
        total_outstanding = total_billed - total_paid
        
        # Overdue count
        overdue_bills = bills_queryset.filter(payment_status='OVERDUE')
        
        # Top 5 consignors by outstanding
        consignor_outstanding = {}
        for bill in bills_queryset.exclude(payment_status='PAID'):
            c_id = bill.consignor_id
            if c_id not in consignor_outstanding:
                consignor_outstanding[c_id] = {
                    'consignor_id': c_id,
                    'consignor_name': bill.consignor.name if bill.consignor else 'Unknown',
                    'outstanding': Decimal('0')
                }
            consignor_outstanding[c_id]['outstanding'] += bill.outstanding_amount
        
        top_consignors = sorted(
            consignor_outstanding.values(),
            key=lambda x: x['outstanding'],
            reverse=True
        )[:5]
        
        return Response({
            'total_billed': total_billed,
            'total_paid': total_paid,
            'total_outstanding': total_outstanding,
            'total_bills': totals['total_bills'] or 0,
            'overdue_count': overdue_bills.count(),
            'overdue_amount': overdue_bills.aggregate(total=Sum('grand_total'))['total'] or Decimal('0'),
            'top_consignors_by_outstanding': top_consignors,
        })

