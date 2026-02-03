from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from apps.lr.models import LorryReceipt
from apps.hpa.models import HirePaymentAdvice
from apps.payments.models import Payment
from apps.billing.models import Bill
from apps.billing.models import BillItem
from apps.billing.pdf_generator import generate_bill_pdf
from django.db.models import Q
from apps.common.pagination import StandardResultsSetPagination
from .tasks import (
    generate_bill_pdf_async,
    generate_lr_pdf_async,
    generate_hpa_pdf_async,
    check_task_status
)
from .pdf_utils import PDFCacheManager
from django.http import FileResponse, JsonResponse, HttpResponse
import logging
import io
from decimal import Decimal

logger = logging.getLogger(__name__)

class ReportsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['GET'])
    def summary(self, request):
        """Get overall summary report"""
        user = request.user
        
        # Base queryset filters
        lr_qs = LorryReceipt.objects.filter(is_deleted=False)
        hpa_qs = HirePaymentAdvice.objects.all()
        payment_qs = Payment.objects.all()
        bill_qs = Bill.objects.all()
        
        if not user.can_access_all_branches and user.branch:
            lr_qs = lr_qs.filter(branch=user.branch)
            hpa_qs = hpa_qs.filter(branch=user.branch)
            bill_qs = bill_qs.filter(branch=user.branch)
            payment_qs = payment_qs.filter(branch=user.branch)
        
        # Date range
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if from_date:
            lr_qs = lr_qs.filter(lr_date__gte=from_date)
            hpa_qs = hpa_qs.filter(hpa_date__gte=from_date)
            payment_qs = payment_qs.filter(payment_date__gte=from_date)
            bill_qs = bill_qs.filter(bill_date__gte=from_date)
        
        if to_date:
            lr_qs = lr_qs.filter(lr_date__lte=to_date)
            hpa_qs = hpa_qs.filter(hpa_date__lte=to_date)
            payment_qs = payment_qs.filter(payment_date__lte=to_date)
            bill_qs = bill_qs.filter(bill_date__lte=to_date)
        
        # Calculate totals
        total_lrs = lr_qs.count()
        total_hpas = hpa_qs.count()
        total_payments = payment_qs.count()
        total_bills = bill_qs.count()
        
        # Calculate revenue and financial totals
        # Total freight = sum of bill line totals (before GST)
        total_freight = sum([b.total_amount or 0 for b in bill_qs])
        # Total lorry hire from HPAs
        total_hired = sum([hpa.lorry_hire_rs or 0 for hpa in hpa_qs])
        # Total amount billed = sum of bill grand totals (including GST)
        total_billed = sum([b.grand_total or 0 for b in bill_qs])
        # Total amount collected = sum of bill payment_received
        total_collected = sum([b.payment_received or 0 for b in bill_qs])
        # Total payments cleared (optional metric)
        total_paid = sum([p.amount or 0 for p in payment_qs if p.status == 'CLEARED'])
        
        # Status breakdowns
        lr_status_breakdown = {}
        for lr in lr_qs:
            status = lr.status or 'UNKNOWN'
            lr_status_breakdown[status] = lr_status_breakdown.get(status, 0) + 1
        
        hpa_status_breakdown = {}
        for hpa in hpa_qs:
            status = hpa.payment_status or 'UNKNOWN'
            hpa_status_breakdown[status] = hpa_status_breakdown.get(status, 0) + 1
        
        bill_status_breakdown = {}
        for bill in bill_qs:
            status = bill.status or 'UNKNOWN'
            bill_status_breakdown[status] = bill_status_breakdown.get(status, 0) + 1
        
        return Response({
            'summary': {
                'total_lrs': total_lrs,
                'total_hpas': total_hpas,
                'total_payments': total_payments,
                'total_bills': total_bills,
                'total_freight_charge': total_freight,
                'total_lorry_hire': total_hired,
                'total_amount_paid': total_paid,
                'total_amount_billed': total_billed,
                'total_amount_collected': total_collected,
                'pending_collection': total_billed - total_collected,
            },
            'lr_status_breakdown': lr_status_breakdown,
            'hpa_status_breakdown': hpa_status_breakdown,
            'bill_status_breakdown': bill_status_breakdown,
        })

    @action(detail=False, methods=['GET'])
    def lr_report(self, request):
        """Detailed LR report"""
        user = request.user
        lrs = LorryReceipt.objects.filter(is_deleted=False)
        
        if not user.can_access_all_branches and user.branch:
            lrs = lrs.filter(branch=user.branch)
        
        # Date range
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if from_date:
            lrs = lrs.filter(lr_date__gte=from_date)
        if to_date:
            lrs = lrs.filter(lr_date__lte=to_date)
        
        # Status filter
        status = request.query_params.get('status')
        if status:
            lrs = lrs.filter(status=status)

        # Search filter
        search = request.query_params.get('search')
        if search:
            lrs = lrs.filter(
                Q(lr_number__icontains=search)
                | Q(truck__truck_number__icontains=search)
                | Q(consignor__name__icontains=search)
                | Q(consignee__name__icontains=search)
                | Q(from_location__icontains=search)
                | Q(to_location__icontains=search)
            )
        
        lrs = lrs.order_by('-lr_date', '-created_at') if hasattr(LorryReceipt, 'created_at') else lrs.order_by('-lr_date')
        
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(lrs, request)
        data = []
        for lr in page:
            bill_item = lr.bill_items.first() if hasattr(lr, 'bill_items') else None
            freight_charge = bill_item.total_amount if bill_item else 0

            data.append({
                'lr_number': lr.lr_number,
                'lr_date': lr.lr_date,
                'consignor': (lr.consignor.name if lr.consignor else 'N/A'),
                'truck': (lr.truck.truck_number if lr.truck else 'N/A'),
                'quantity_mt': lr.quantity_mt,
                'freight_charge': freight_charge,
                'status': lr.status,
                'branch': (lr.branch.name if lr.branch else 'N/A'),
            })
        
        return paginator.get_paginated_response(data)

    @action(detail=False, methods=['GET'])
    def hpa_report(self, request):
        """Detailed HPA report"""
        user = request.user
        hpas = HirePaymentAdvice.objects.all()
        
        if not user.can_access_all_branches and user.branch:
            hpas = hpas.filter(branch=user.branch)
        
        # Date range
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if from_date:
            hpas = hpas.filter(hpa_date__gte=from_date)
        if to_date:
            hpas = hpas.filter(hpa_date__lte=to_date)
        
        # Status filter
        payment_status = request.query_params.get('payment_status')
        if payment_status:
            hpas = hpas.filter(payment_status=payment_status)

        # Search filter
        search = request.query_params.get('search')
        if search:
            hpas = hpas.filter(
                Q(hpa_number__icontains=search)
                | Q(lr__lr_number__icontains=search)
                | Q(truck__truck_number__icontains=search)
                | Q(driver_name__icontains=search)
            )

        hpas = hpas.order_by('-hpa_date', '-created_at') if hasattr(HirePaymentAdvice, 'created_at') else hpas.order_by('-hpa_date')

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(hpas, request)
        data = []
        for hpa in page:
            total_deductions = (hpa.advance_paid_rs or 0) + (hpa.diesel_amount or 0) + (hpa.bank_amount or 0) + (hpa.other_deductions or 0)

            data.append({
                'hpa_number': hpa.hpa_number,
                'hpa_date': hpa.hpa_date,
                'lr_number': (hpa.lr.lr_number if hpa.lr else hpa.hpa_number),
                'lr_count': hpa.lrs.count() if hasattr(hpa, 'lrs') else (1 if hpa.lr else 0),
                'truck_number': (hpa.truck.truck_number if hpa.truck else 'N/A'),
                'driver_name': hpa.driver_name,
                'lorry_hire': hpa.lorry_hire_rs,
                'advance_paid': hpa.advance_paid_rs,
                'diesel_paid': hpa.diesel_amount,
                'bank_charge': hpa.bank_amount,
                'extra_charge': hpa.other_deductions,
                'total_deductions': total_deductions,
                'balance': hpa.balance_rs,
                'payment_status': hpa.payment_status,
                'branch': (hpa.branch.name if hpa.branch else 'N/A'),
            })
        
        return paginator.get_paginated_response(data)

    @action(detail=False, methods=['GET'])
    def payment_report(self, request):
        """Detailed payment report"""
        user = request.user
        payments = Payment.objects.filter(is_deleted=False)
        
        if not user.can_access_all_branches and user.branch:
            payments = payments.filter(branch=user.branch)
        
        # Date range
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if from_date:
            payments = payments.filter(payment_date__gte=from_date)
        if to_date:
            payments = payments.filter(payment_date__lte=to_date)
        
        # Status filter
        status = request.query_params.get('status')
        if status:
            payments = payments.filter(status=status)

        # Search filter
        search = request.query_params.get('search')
        if search:
            payments = payments.filter(
                Q(payment_number__icontains=search)
                | Q(hpa__hpa_number__icontains=search)
                | Q(cheque_number__icontains=search)
                | Q(upi_transaction_id__icontains=search)
                | Q(transaction_reference__icontains=search)
            )

        payments = payments.order_by('-payment_date', '-created_at') if hasattr(Payment, 'created_at') else payments.order_by('-payment_date')

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(payments, request)
        data = []
        for payment in page:
            data.append({
                'payment_number': payment.payment_number,
                'payment_date': payment.payment_date,
                'hpa_number': payment.hpa.hpa_number if payment.hpa else 'N/A',
                'payment_method': payment.payment_method,
                'amount': payment.amount,
                'status': payment.status,
                'created_by': payment.created_by.username if payment.created_by else 'N/A',
            })
        
        return paginator.get_paginated_response(data)

    @action(detail=False, methods=['GET'])
    def bill_report(self, request):
        """Detailed bill report"""
        user = request.user
        bills = Bill.objects.filter(is_deleted=False)
        
        if not user.can_access_all_branches and user.branch:
            bills = bills.filter(branch=user.branch)
        
        # Date range
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if from_date:
            bills = bills.filter(bill_date__gte=from_date)
        if to_date:
            bills = bills.filter(bill_date__lte=to_date)
        
        # Status filter
        status = request.query_params.get('status')
        if status:
            bills = bills.filter(bill_status=status)

        # Search filter
        search = request.query_params.get('search')
        if search:
            bills = bills.filter(
                Q(bill_number__icontains=search)
                | Q(consignor__name__icontains=search)
                | Q(consignor__gstin__icontains=search)
            )

        bills = bills.order_by('-bill_date', '-created_at') if hasattr(Bill, 'created_at') else bills.order_by('-bill_date')
        
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(bills, request)
        data = []
        for bill in page:
            paid_amount = bill.payment_received or 0
            balance_amount = (bill.grand_total or 0) - paid_amount

            data.append({
                'bill_number': bill.bill_number,
                'bill_date': bill.bill_date,
                'total_amount': bill.grand_total,
                'paid_amount': paid_amount,
                'balance_amount': balance_amount,
                'bill_status': bill.status,
            })
        
        return paginator.get_paginated_response(data)

    # ========== ASYNC PDF DOWNLOAD ENDPOINTS ==========
    
    @action(detail=False, methods=['POST'])
    def request_bill_pdf(self, request):
        """Request async PDF generation for a bill"""
        bill_id = request.data.get('bill_id')
        
        if not bill_id:
            return Response(
                {'error': 'bill_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if bill exists and user has access
        try:
            bill = Bill.objects.get(pk=bill_id)
            if not request.user.can_access_all_branches and bill.branch != request.user.branch:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Bill.DoesNotExist:
            return Response(
                {'error': 'Bill not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Trigger async task
        task = generate_bill_pdf_async.delay(bill_id)
        
        return Response({
            'task_id': task.id,
            'status': 'requested',
            'message': 'PDF generation started'
        }, status=status.HTTP_202_ACCEPTED)
    
    @action(detail=False, methods=['POST'])
    def request_lr_pdf(self, request):
        """Request async PDF generation for an LR"""
        lr_id = request.data.get('lr_id')
        
        if not lr_id:
            return Response(
                {'error': 'lr_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            lr = LorryReceipt.objects.get(pk=lr_id)
            if not request.user.can_access_all_branches and lr.branch != request.user.branch:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except LorryReceipt.DoesNotExist:
            return Response(
                {'error': 'LR not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        task = generate_lr_pdf_async.delay(lr_id)
        
        return Response({
            'task_id': task.id,
            'status': 'requested',
            'message': 'PDF generation started'
        }, status=status.HTTP_202_ACCEPTED)
    
    @action(detail=False, methods=['POST'])
    def request_hpa_pdf(self, request):
        """Request async PDF generation for an HPA"""
        hpa_id = request.data.get('hpa_id')
        
        if not hpa_id:
            return Response(
                {'error': 'hpa_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            hpa = HirePaymentAdvice.objects.get(pk=hpa_id)
            if not request.user.can_access_all_branches and hpa.branch != request.user.branch:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except HirePaymentAdvice.DoesNotExist:
            return Response(
                {'error': 'HPA not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        task = generate_hpa_pdf_async.delay(hpa_id)
        
        return Response({
            'task_id': task.id,
            'status': 'requested',
            'message': 'PDF generation started'
        }, status=status.HTTP_202_ACCEPTED)
    
    @action(detail=False, methods=['GET'])
    def task_status(self, request):
        """Check the status of a PDF generation task"""
        task_id = request.query_params.get('task_id')
        
        if not task_id:
            return Response(
                {'error': 'task_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get task status from cache
        from django.core.cache import cache
        cache_key = f"task_status_{task_id}"
        task_status = cache.get(cache_key)
        
        if task_status:
            return Response(task_status)
        else:
            return Response(
                {'status': 'not_found', 'error': 'Task not found or expired'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['GET'])
    def download_bill(self, request):
        """Download generated bill PDF"""
        bill_id = request.query_params.get('bill_id')
        
        if not bill_id:
            return Response(
                {'error': 'bill_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            bill = Bill.objects.get(pk=bill_id)
            if not request.user.can_access_all_branches and bill.branch != request.user.branch:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Bill.DoesNotExist:
            return Response(
                {'error': 'Bill not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Try to get from cache first
        cache_mgr = PDFCacheManager()
        cache_key = cache_mgr.get_pdf_cache_key('Bill', bill_id)
        pdf_buffer = cache_mgr.get_cached_pdf(cache_key)
        
        if not pdf_buffer:
            # Try to load from disk
            file_path = cache_mgr.get_pdf_file_path('Bill', bill_id, f'bill_{bill.bill_number}.pdf')
            pdf_buffer = cache_mgr.load_pdf_from_disk(file_path)
        
        if not pdf_buffer:
            return Response(
                {'error': 'PDF not found. Please request generation first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        pdf_buffer.seek(0)
        response = FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=f'bill_{bill.bill_number}.pdf',
            content_type='application/pdf'
        )
        
        response['Content-Disposition'] = f'attachment; filename="bill_{bill.bill_number}.pdf"'
        response['Cache-Control'] = 'max-age=3600, must-revalidate'
        
        logger.info(f"Downloaded Bill PDF: {bill_id}")
        
        return response
    
    @action(detail=False, methods=['GET'])
    def download_lr(self, request):
        """Download generated LR PDF"""
        lr_id = request.query_params.get('lr_id')
        
        if not lr_id:
            return Response(
                {'error': 'lr_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            lr = LorryReceipt.objects.get(pk=lr_id)
            if not request.user.can_access_all_branches and lr.branch != request.user.branch:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except LorryReceipt.DoesNotExist:
            return Response(
                {'error': 'LR not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        cache_mgr = PDFCacheManager()
        cache_key = cache_mgr.get_pdf_cache_key('LorryReceipt', lr_id)
        pdf_buffer = cache_mgr.get_cached_pdf(cache_key)
        
        if not pdf_buffer:
            file_path = cache_mgr.get_pdf_file_path('LorryReceipt', lr_id, f'lr_{lr.lr_number}.pdf')
            pdf_buffer = cache_mgr.load_pdf_from_disk(file_path)
        
        if not pdf_buffer:
            return Response(
                {'error': 'PDF not found. Please request generation first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        pdf_buffer.seek(0)
        response = FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=f'lr_{lr.lr_number}.pdf',
            content_type='application/pdf'
        )
        
        response['Content-Disposition'] = f'attachment; filename="lr_{lr.lr_number}.pdf"'
        response['Cache-Control'] = 'max-age=3600, must-revalidate'
        
        logger.info(f"Downloaded LR PDF: {lr_id}")
        
        return response
    
    @action(detail=False, methods=['GET'])
    def download_hpa(self, request):
        """Download generated HPA PDF"""
        hpa_id = request.query_params.get('hpa_id')
        
        if not hpa_id:
            return Response(
                {'error': 'hpa_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            hpa = HirePaymentAdvice.objects.get(pk=hpa_id)
            if not request.user.can_access_all_branches and hpa.branch != request.user.branch:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except HirePaymentAdvice.DoesNotExist:
            return Response(
                {'error': 'HPA not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        cache_mgr = PDFCacheManager()
        cache_key = cache_mgr.get_pdf_cache_key('HirePaymentAdvice', hpa_id)
        pdf_buffer = cache_mgr.get_cached_pdf(cache_key)
        
        if not pdf_buffer:
            file_path = cache_mgr.get_pdf_file_path('HirePaymentAdvice', hpa_id, f'hpa_{hpa.hpa_number}.pdf')
            pdf_buffer = cache_mgr.load_pdf_from_disk(file_path)
        
        if not pdf_buffer:
            return Response(
                {'error': 'PDF not found. Please request generation first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        pdf_buffer.seek(0)
        response = FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=f'hpa_{hpa.hpa_number}.pdf',
            content_type='application/pdf'
        )
        
        response['Content-Disposition'] = f'attachment; filename="hpa_{hpa.hpa_number}.pdf"'
        response['Cache-Control'] = 'max-age=3600, must-revalidate'
        
        logger.info(f"Downloaded HPA PDF: {hpa_id}")
        
        return response
    
    @action(detail=False, methods=['GET'])
    def download_bill_sync(self, request):
        """Download bill PDF synchronously (generated on-demand)"""
        bill_id = request.query_params.get('bill_id')
        
        if not bill_id:
            return Response(
                {'error': 'bill_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            bill = Bill.objects.select_related('consignor', 'branch').get(pk=bill_id)
            if not request.user.can_access_all_branches and bill.branch != request.user.branch:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Bill.DoesNotExist:
            return Response(
                {'error': 'Bill not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Generate PDF synchronously
            pdf_buffer = generate_bill_pdf(bill)
            pdf_buffer.seek(0)
            
            response = FileResponse(
                pdf_buffer,
                as_attachment=True,
                filename=f'bill_{bill.bill_number}.pdf',
                content_type='application/pdf'
            )
            
            response['Content-Disposition'] = f'attachment; filename="bill_{bill.bill_number}.pdf"'
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            
            logger.info(f"Downloaded Bill PDF (sync): {bill_id}")
            
            return response
        except Exception as e:
            logger.error(f"Error generating Bill PDF synchronously: {str(e)}")
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # ============================================================
    # PHASE 5: Outstanding Reports & Financial Analysis
    # ============================================================

    @action(detail=False, methods=['GET'])
    def outstanding_summary(self, request):
        """
        Get high-level outstanding summary with aging buckets.
        
        Returns:
        - Total outstanding
        - Breakdown by aging bucket (0-30, 31-60, 61-90, 90+ days)
        - Top consignors by outstanding
        - Branch-wise breakdown (for admin)
        """
        from django.db.models import Sum, Count
        from decimal import Decimal
        from apps.billing.models import ClientPayment
        from apps.masters.models import Consignor
        
        user = request.user
        bills = Bill.objects.filter(is_deleted=False)
        
        # Branch filter
        if not user.can_access_all_branches and user.branch:
            bills = bills.filter(branch=user.branch)
        
        # Exclude fully paid bills
        outstanding_bills = bills.exclude(payment_status='PAID')
        
        # Calculate totals
        total_outstanding = Decimal('0')
        aging_buckets = {
            'current': {'count': 0, 'amount': Decimal('0')},
            '0-30': {'count': 0, 'amount': Decimal('0')},
            '31-60': {'count': 0, 'amount': Decimal('0')},
            '61-90': {'count': 0, 'amount': Decimal('0')},
            '90+': {'count': 0, 'amount': Decimal('0')},
        }
        
        consignor_outstanding = {}
        branch_outstanding = {}
        
        for bill in outstanding_bills:
            outstanding = bill.outstanding_amount
            total_outstanding += outstanding
            
            # Aging bucket
            bucket = bill.aging_bucket
            if bucket in aging_buckets:
                aging_buckets[bucket]['count'] += 1
                aging_buckets[bucket]['amount'] += outstanding
            
            # Consignor breakdown
            if bill.consignor_id:
                c_id = bill.consignor_id
                if c_id not in consignor_outstanding:
                    consignor_outstanding[c_id] = {
                        'consignor_id': c_id,
                        'consignor_name': bill.consignor.name if bill.consignor else 'Unknown',
                        'gstin': bill.consignor.gstin if bill.consignor else '',
                        'outstanding': Decimal('0'),
                        'bill_count': 0,
                        'overdue_count': 0
                    }
                consignor_outstanding[c_id]['outstanding'] += outstanding
                consignor_outstanding[c_id]['bill_count'] += 1
                if bill.payment_status == 'OVERDUE':
                    consignor_outstanding[c_id]['overdue_count'] += 1
            
            # Branch breakdown
            if bill.branch_id:
                b_id = bill.branch_id
                if b_id not in branch_outstanding:
                    branch_outstanding[b_id] = {
                        'branch_id': b_id,
                        'branch_name': bill.branch.name if bill.branch else 'Unknown',
                        'outstanding': Decimal('0'),
                        'bill_count': 0
                    }
                branch_outstanding[b_id]['outstanding'] += outstanding
                branch_outstanding[b_id]['bill_count'] += 1
        
        # Sort consignors by outstanding (descending)
        top_consignors = sorted(
            consignor_outstanding.values(),
            key=lambda x: x['outstanding'],
            reverse=True
        )[:10]
        
        # Sort branches by outstanding (descending)
        branches_breakdown = sorted(
            branch_outstanding.values(),
            key=lambda x: x['outstanding'],
            reverse=True
        )
        
        # Calculate collection metrics
        total_billed = bills.aggregate(total=Sum('grand_total'))['total'] or Decimal('0')
        total_payments = ClientPayment.objects.filter(
            bill__in=bills,
            is_deleted=False
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        collection_rate = (total_payments / total_billed * 100) if total_billed > 0 else Decimal('0')
        
        return Response({
            'total_outstanding': total_outstanding,
            'total_billed': total_billed,
            'total_collected': total_payments,
            'collection_rate': round(collection_rate, 1),
            'outstanding_bills_count': outstanding_bills.count(),
            'aging_buckets': aging_buckets,
            'top_consignors': top_consignors,
            'branches_breakdown': branches_breakdown if user.can_access_all_branches else None,
        })

    @action(detail=False, methods=['GET'])
    def outstanding_detailed(self, request):
        """
        Get detailed outstanding bills report.
        Supports filtering, sorting, and pagination.
        """
        from django.db.models import Sum
        from decimal import Decimal
        
        user = request.user
        bills = Bill.objects.filter(is_deleted=False).exclude(payment_status='PAID')
        
        # Branch filter
        if not user.can_access_all_branches and user.branch:
            bills = bills.filter(branch=user.branch)
        
        # Consignor filter
        consignor_id = request.query_params.get('consignor')
        if consignor_id:
            bills = bills.filter(consignor_id=consignor_id)
        
        # Aging bucket filter
        aging_filter = request.query_params.get('aging')
        if aging_filter:
            filtered_bill_ids = []
            for bill in bills:
                if bill.aging_bucket == aging_filter:
                    filtered_bill_ids.append(bill.id)
            bills = bills.filter(id__in=filtered_bill_ids)
        
        # Payment status filter
        status_filter = request.query_params.get('payment_status')
        if status_filter:
            bills = bills.filter(payment_status=status_filter)
        
        # Date range filter
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        if from_date:
            bills = bills.filter(bill_date__gte=from_date)
        if to_date:
            bills = bills.filter(bill_date__lte=to_date)
        
        # Ordering
        order_by = request.query_params.get('order_by', '-aging_days')
        if order_by == '-aging_days':
            bills = sorted(bills, key=lambda x: x.aging_days, reverse=True)
        elif order_by == 'aging_days':
            bills = sorted(bills, key=lambda x: x.aging_days)
        elif order_by == '-outstanding':
            bills = sorted(bills, key=lambda x: x.outstanding_amount, reverse=True)
        elif order_by == 'outstanding':
            bills = sorted(bills, key=lambda x: x.outstanding_amount)
        else:
            bills = bills.order_by(order_by)
        
        # Pagination
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(list(bills) if not hasattr(bills, 'query') else bills, request)
        
        data = []
        for bill in page:
            data.append({
                'id': bill.id,
                'bill_number': bill.bill_number,
                'bill_date': bill.bill_date,
                'due_date': bill.due_date,
                'consignor_id': bill.consignor_id,
                'consignor_name': bill.consignor.name if bill.consignor else 'Unknown',
                'consignor_gstin': bill.consignor.gstin if bill.consignor else '',
                'branch_name': bill.branch.name if bill.branch else 'Unknown',
                'grand_total': bill.grand_total,
                'payments_received': bill.total_payments_received,
                'outstanding': bill.outstanding_amount,
                'aging_days': bill.aging_days,
                'aging_bucket': bill.aging_bucket,
                'payment_status': bill.payment_status,
                'payment_status_display': bill.get_payment_status_display(),
            })
        
        return paginator.get_paginated_response(data)

    @action(detail=False, methods=['GET'])
    def aging_analysis(self, request):
        """
        Get aging analysis with trends.
        
        Returns aging breakdown with historical comparison.
        """
        from django.db.models import Sum
        from decimal import Decimal
        from datetime import datetime, timedelta
        
        user = request.user
        bills = Bill.objects.filter(is_deleted=False).exclude(payment_status='PAID')
        
        # Branch filter
        if not user.can_access_all_branches and user.branch:
            bills = bills.filter(branch=user.branch)
        
        # Current aging breakdown
        aging_buckets = {
            'current': {'count': 0, 'amount': Decimal('0'), 'consignors': set()},
            '0-30': {'count': 0, 'amount': Decimal('0'), 'consignors': set()},
            '31-60': {'count': 0, 'amount': Decimal('0'), 'consignors': set()},
            '61-90': {'count': 0, 'amount': Decimal('0'), 'consignors': set()},
            '90+': {'count': 0, 'amount': Decimal('0'), 'consignors': set()},
        }
        
        for bill in bills:
            bucket = bill.aging_bucket
            if bucket in aging_buckets:
                aging_buckets[bucket]['count'] += 1
                aging_buckets[bucket]['amount'] += bill.outstanding_amount
                if bill.consignor_id:
                    aging_buckets[bucket]['consignors'].add(bill.consignor_id)
        
        # Convert sets to counts
        for bucket in aging_buckets:
            aging_buckets[bucket]['consignor_count'] = len(aging_buckets[bucket]['consignors'])
            del aging_buckets[bucket]['consignors']
        
        # Calculate risk metrics
        total_outstanding = sum(b['amount'] for b in aging_buckets.values())
        high_risk_amount = aging_buckets['61-90']['amount'] + aging_buckets['90+']['amount']
        high_risk_percentage = (high_risk_amount / total_outstanding * 100) if total_outstanding > 0 else 0
        
        # Calculate average aging days
        total_aging = 0
        bill_count = 0
        for bill in bills:
            total_aging += bill.aging_days
            bill_count += 1
        average_aging = (total_aging / bill_count) if bill_count > 0 else 0
        
        return Response({
            'aging_buckets': aging_buckets,
            'total_outstanding': total_outstanding,
            'total_bills': bill_count,
            'average_aging_days': round(average_aging, 1),
            'high_risk_amount': high_risk_amount,
            'high_risk_percentage': round(high_risk_percentage, 1),
            'risk_assessment': 'HIGH' if high_risk_percentage > 30 else ('MEDIUM' if high_risk_percentage > 15 else 'LOW'),
        })

    @action(detail=False, methods=['GET'])
    def settlement_report(self, request):
        """
        Get settlement/reconciliation report for a date range.
        Shows bills issued, payments received, and collection efficiency.
        """
        from django.db.models import Sum, Count
        from decimal import Decimal
        from apps.billing.models import ClientPayment
        
        user = request.user
        
        # Date range (default: current month)
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if not from_date:
            today = timezone.now().date()
            from_date = today.replace(day=1)
        if not to_date:
            to_date = timezone.now().date()
        
        # Bills issued in date range
        bills = Bill.objects.filter(
            is_deleted=False,
            bill_date__gte=from_date,
            bill_date__lte=to_date
        )
        
        # Branch filter
        if not user.can_access_all_branches and user.branch:
            bills = bills.filter(branch=user.branch)
        
        # Bills metrics
        bills_count = bills.count()
        amount_billed = bills.aggregate(total=Sum('grand_total'))['total'] or Decimal('0')
        
        # Payments received in date range
        payments = ClientPayment.objects.filter(
            is_deleted=False,
            payment_date__gte=from_date,
            payment_date__lte=to_date
        )
        
        if not user.can_access_all_branches and user.branch:
            payments = payments.filter(bill__branch=user.branch)
        
        payments_count = payments.count()
        amount_collected = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Collection efficiency
        collection_efficiency = (amount_collected / amount_billed * 100) if amount_billed > 0 else Decimal('0')
        
        # Payment method breakdown
        payment_methods = {}
        for payment in payments:
            method = payment.payment_method or 'OTHER'
            if method not in payment_methods:
                payment_methods[method] = {'count': 0, 'amount': Decimal('0')}
            payment_methods[method]['count'] += 1
            payment_methods[method]['amount'] += payment.amount
        
        # Daily breakdown (for chart)
        from datetime import datetime, timedelta
        daily_data = []
        current_date = datetime.strptime(str(from_date), '%Y-%m-%d').date() if isinstance(from_date, str) else from_date
        end_date = datetime.strptime(str(to_date), '%Y-%m-%d').date() if isinstance(to_date, str) else to_date
        
        while current_date <= end_date:
            day_bills = bills.filter(bill_date=current_date)
            day_payments = payments.filter(payment_date=current_date)
            
            daily_data.append({
                'date': current_date.isoformat(),
                'billed': day_bills.aggregate(total=Sum('grand_total'))['total'] or 0,
                'collected': day_payments.aggregate(total=Sum('amount'))['total'] or 0,
            })
            current_date += timedelta(days=1)
        
        return Response({
            'period': {
                'from_date': from_date,
                'to_date': to_date,
            },
            'bills': {
                'count': bills_count,
                'amount': amount_billed,
            },
            'payments': {
                'count': payments_count,
                'amount': amount_collected,
            },
            'collection_efficiency': round(collection_efficiency, 1),
            'outstanding_for_period': amount_billed - amount_collected,
            'payment_methods': payment_methods,
            'daily_data': daily_data,
        })

    @action(detail=False, methods=['GET'], url_path='client-statement/(?P<consignor_id>[^/.]+)')
    def client_statement(self, request, consignor_id=None):
        """
        Generate client statement for a consignor.
        Shows opening balance, transactions, and closing balance.
        """
        from django.db.models import Sum
        from decimal import Decimal
        from apps.billing.models import ClientPayment
        from apps.masters.models import Consignor
        
        try:
            consignor = Consignor.objects.get(pk=consignor_id, is_deleted=False)
        except Consignor.DoesNotExist:
            return Response({'error': 'Consignor not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Date range
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if not from_date:
            # Default: last 3 months
            today = timezone.now().date()
            from_date = today - timedelta(days=90)
        else:
            from_date = timezone.datetime.strptime(from_date, '%Y-%m-%d').date()
        
        if not to_date:
            to_date = timezone.now().date()
        else:
            to_date = timezone.datetime.strptime(to_date, '%Y-%m-%d').date()
        
        # Opening balance (outstanding before from_date)
        bills_before = Bill.objects.filter(
            consignor=consignor,
            is_deleted=False,
            bill_date__lt=from_date
        )
        payments_before = ClientPayment.objects.filter(
            bill__consignor=consignor,
            is_deleted=False,
            payment_date__lt=from_date
        )
        
        opening_billed = bills_before.aggregate(total=Sum('grand_total'))['total'] or Decimal('0')
        opening_paid = payments_before.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        opening_balance = opening_billed - opening_paid
        
        # Transactions in period
        bills_in_period = Bill.objects.filter(
            consignor=consignor,
            is_deleted=False,
            bill_date__gte=from_date,
            bill_date__lte=to_date
        ).order_by('bill_date')
        
        payments_in_period = ClientPayment.objects.filter(
            bill__consignor=consignor,
            is_deleted=False,
            payment_date__gte=from_date,
            payment_date__lte=to_date
        ).order_by('payment_date')
        
        # Build transaction list
        transactions = []
        running_balance = opening_balance
        
        # Add bills
        for bill in bills_in_period:
            running_balance += bill.grand_total
            transactions.append({
                'date': bill.bill_date,
                'type': 'BILL',
                'reference': bill.bill_number,
                'description': f'Bill #{bill.bill_number}',
                'debit': bill.grand_total,
                'credit': Decimal('0'),
                'balance': running_balance,
            })
        
        # Add payments
        for payment in payments_in_period:
            running_balance -= payment.amount
            transactions.append({
                'date': payment.payment_date,
                'type': 'PAYMENT',
                'reference': payment.reference_number or f'PAY-{payment.id}',
                'description': f'Payment via {payment.get_payment_method_display()} for {payment.bill.bill_number}',
                'debit': Decimal('0'),
                'credit': payment.amount,
                'balance': running_balance,
            })
        
        # Sort by date
        transactions.sort(key=lambda x: x['date'])
        
        # Recalculate running balances after sorting
        running_balance = opening_balance
        for txn in transactions:
            running_balance += txn['debit'] - txn['credit']
            txn['balance'] = running_balance
        
        # Totals
        period_billed = bills_in_period.aggregate(total=Sum('grand_total'))['total'] or Decimal('0')
        period_paid = payments_in_period.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        closing_balance = opening_balance + period_billed - period_paid
        
        return Response({
            'consignor': {
                'id': consignor.id,
                'name': consignor.name,
                'gstin': consignor.gstin,
                'pan': consignor.pan,
                'address': consignor.address,
                'city': consignor.city,
                'state': consignor.state,
            },
            'period': {
                'from_date': from_date,
                'to_date': to_date,
            },
            'summary': {
                'opening_balance': opening_balance,
                'period_billed': period_billed,
                'period_paid': period_paid,
                'closing_balance': closing_balance,
            },
            'transactions': transactions,
        })

    # ============================================================
    # EXCEL EXPORT ENDPOINTS
    # ============================================================

    @action(detail=False, methods=['GET'])
    def export_outstanding(self, request):
        """
        Export outstanding bills to Excel with filters.
        Supports: consignor, aging, payment_status, date range filters
        """
        import openpyxl
        from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
        from openpyxl.utils import get_column_letter
        from django.db.models import Sum
        
        user = request.user
        bills = Bill.objects.filter(is_deleted=False).exclude(payment_status='PAID')
        
        # Branch filter
        if not user.can_access_all_branches and user.branch:
            bills = bills.filter(branch=user.branch)
        
        # Consignor filter
        consignor_id = request.query_params.get('consignor')
        if consignor_id:
            bills = bills.filter(consignor_id=consignor_id)
        
        # Payment status filter
        status_filter = request.query_params.get('payment_status')
        if status_filter:
            bills = bills.filter(payment_status=status_filter)
        
        # Date range filter
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        if from_date:
            bills = bills.filter(bill_date__gte=from_date)
        if to_date:
            bills = bills.filter(bill_date__lte=to_date)
        
        # Aging bucket filter (must process in Python)
        aging_filter = request.query_params.get('aging')
        if aging_filter:
            filtered_ids = [b.id for b in bills if b.aging_bucket == aging_filter]
            bills = bills.filter(id__in=filtered_ids)
        
        # Search filter
        search = request.query_params.get('search')
        if search:
            bills = bills.filter(
                Q(bill_number__icontains=search) |
                Q(consignor__name__icontains=search) |
                Q(consignor__gstin__icontains=search)
            )
        
        # Order by
        order_by = request.query_params.get('order_by', '-bill_date')
        if order_by in ['-outstanding', 'outstanding', '-aging_days', 'aging_days']:
            # These require Python sorting
            reverse = order_by.startswith('-')
            key = 'outstanding_amount' if 'outstanding' in order_by else 'aging_days'
            bills = sorted(list(bills), key=lambda x: getattr(x, key), reverse=reverse)
        else:
            bills = bills.order_by(order_by)
        
        # Create Excel workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Outstanding Bills"
        
        # Styles
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center")
        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        
        # Header row
        headers = [
            "Bill #", "Bill Date", "Due Date", "Consignor", "GSTIN", "Branch",
            "Grand Total", "Payments Received", "Outstanding", "Aging Days",
            "Aging Bucket", "Payment Status"
        ]
        
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = border
        
        # Data rows
        row_num = 2
        total_grand = Decimal('0')
        total_paid = Decimal('0')
        total_outstanding = Decimal('0')
        
        for bill in bills:
            outstanding = bill.outstanding_amount
            total_grand += bill.grand_total
            total_paid += bill.total_payments_received
            total_outstanding += outstanding
            
            ws.cell(row=row_num, column=1, value=bill.bill_number).border = border
            ws.cell(row=row_num, column=2, value=str(bill.bill_date) if bill.bill_date else '').border = border
            ws.cell(row=row_num, column=3, value=str(bill.due_date) if bill.due_date else '').border = border
            ws.cell(row=row_num, column=4, value=bill.consignor.name if bill.consignor else '').border = border
            ws.cell(row=row_num, column=5, value=bill.consignor.gstin if bill.consignor else '').border = border
            ws.cell(row=row_num, column=6, value=bill.branch.name if bill.branch else '').border = border
            ws.cell(row=row_num, column=7, value=float(bill.grand_total)).border = border
            ws.cell(row=row_num, column=8, value=float(bill.total_payments_received)).border = border
            ws.cell(row=row_num, column=9, value=float(outstanding)).border = border
            ws.cell(row=row_num, column=10, value=bill.aging_days).border = border
            ws.cell(row=row_num, column=11, value=bill.aging_bucket).border = border
            ws.cell(row=row_num, column=12, value=bill.get_payment_status_display()).border = border
            row_num += 1
        
        # Total row
        total_fill = PatternFill(start_color="F3F4F6", end_color="F3F4F6", fill_type="solid")
        ws.cell(row=row_num, column=1, value="TOTAL").font = Font(bold=True)
        ws.cell(row=row_num, column=7, value=float(total_grand)).font = Font(bold=True)
        ws.cell(row=row_num, column=8, value=float(total_paid)).font = Font(bold=True)
        ws.cell(row=row_num, column=9, value=float(total_outstanding)).font = Font(bold=True)
        for col in range(1, 13):
            ws.cell(row=row_num, column=col).fill = total_fill
            ws.cell(row=row_num, column=col).border = border
        
        # Adjust column widths
        column_widths = [12, 12, 12, 35, 18, 15, 15, 18, 15, 12, 12, 15]
        for i, width in enumerate(column_widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = width
        
        # Save to bytes
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        # Generate filename
        filename = f"outstanding_bills_{timezone.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['GET'])
    def export_aging(self, request):
        """Export aging analysis to Excel"""
        import openpyxl
        from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
        from openpyxl.utils import get_column_letter
        
        user = request.user
        bills = Bill.objects.filter(is_deleted=False).exclude(payment_status='PAID')
        
        if not user.can_access_all_branches and user.branch:
            bills = bills.filter(branch=user.branch)
        
        # Build aging data
        aging_buckets = {
            'current': {'count': 0, 'amount': Decimal('0'), 'consignors': {}},
            '0-30': {'count': 0, 'amount': Decimal('0'), 'consignors': {}},
            '31-60': {'count': 0, 'amount': Decimal('0'), 'consignors': {}},
            '61-90': {'count': 0, 'amount': Decimal('0'), 'consignors': {}},
            '90+': {'count': 0, 'amount': Decimal('0'), 'consignors': {}},
        }
        
        for bill in bills:
            bucket = bill.aging_bucket
            if bucket in aging_buckets:
                aging_buckets[bucket]['count'] += 1
                aging_buckets[bucket]['amount'] += bill.outstanding_amount
                c_name = bill.consignor.name if bill.consignor else 'Unknown'
                if c_name not in aging_buckets[bucket]['consignors']:
                    aging_buckets[bucket]['consignors'][c_name] = {'count': 0, 'amount': Decimal('0')}
                aging_buckets[bucket]['consignors'][c_name]['count'] += 1
                aging_buckets[bucket]['consignors'][c_name]['amount'] += bill.outstanding_amount
        
        # Create Excel
        wb = openpyxl.Workbook()
        
        # Summary sheet
        ws = wb.active
        ws.title = "Summary"
        
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
        border = Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin')
        )
        
        # Summary headers
        headers = ["Aging Bucket", "Bill Count", "Outstanding Amount", "% of Total"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = border
        
        total_outstanding = sum(b['amount'] for b in aging_buckets.values())
        row = 2
        for bucket_name, data in aging_buckets.items():
            pct = (data['amount'] / total_outstanding * 100) if total_outstanding > 0 else 0
            ws.cell(row=row, column=1, value=bucket_name).border = border
            ws.cell(row=row, column=2, value=data['count']).border = border
            ws.cell(row=row, column=3, value=float(data['amount'])).border = border
            ws.cell(row=row, column=4, value=f"{pct:.1f}%").border = border
            row += 1
        
        # Total row
        ws.cell(row=row, column=1, value="TOTAL").font = Font(bold=True)
        ws.cell(row=row, column=2, value=sum(b['count'] for b in aging_buckets.values())).font = Font(bold=True)
        ws.cell(row=row, column=3, value=float(total_outstanding)).font = Font(bold=True)
        ws.cell(row=row, column=4, value="100%").font = Font(bold=True)
        
        ws.column_dimensions['A'].width = 15
        ws.column_dimensions['B'].width = 12
        ws.column_dimensions['C'].width = 20
        ws.column_dimensions['D'].width = 12
        
        # Detailed sheet - by consignor
        ws2 = wb.create_sheet("By Consignor")
        headers = ["Consignor", "Aging Bucket", "Bill Count", "Outstanding"]
        for col, header in enumerate(headers, 1):
            cell = ws2.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = border
        
        row = 2
        for bucket_name, data in aging_buckets.items():
            for consignor, c_data in data['consignors'].items():
                ws2.cell(row=row, column=1, value=consignor).border = border
                ws2.cell(row=row, column=2, value=bucket_name).border = border
                ws2.cell(row=row, column=3, value=c_data['count']).border = border
                ws2.cell(row=row, column=4, value=float(c_data['amount'])).border = border
                row += 1
        
        ws2.column_dimensions['A'].width = 35
        ws2.column_dimensions['B'].width = 15
        ws2.column_dimensions['C'].width = 12
        ws2.column_dimensions['D'].width = 18
        
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = f"aging_analysis_{timezone.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['GET'])
    def export_settlement(self, request):
        """Export settlement report to Excel"""
        import openpyxl
        from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
        from django.db.models import Sum
        from apps.billing.models import ClientPayment
        
        user = request.user
        
        # Date range
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if not from_date:
            today = timezone.now().date()
            from_date = today.replace(day=1)
        if not to_date:
            to_date = timezone.now().date()
        
        # Bills and payments
        bills = Bill.objects.filter(
            is_deleted=False,
            bill_date__gte=from_date,
            bill_date__lte=to_date
        )
        payments = ClientPayment.objects.filter(
            is_deleted=False,
            payment_date__gte=from_date,
            payment_date__lte=to_date
        )
        
        if not user.can_access_all_branches and user.branch:
            bills = bills.filter(branch=user.branch)
            payments = payments.filter(bill__branch=user.branch)
        
        # Create Excel
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Settlement Report"
        
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="10B981", end_color="10B981", fill_type="solid")
        border = Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin')
        )
        
        # Summary section
        ws.cell(row=1, column=1, value="SETTLEMENT REPORT").font = Font(bold=True, size=14)
        ws.cell(row=2, column=1, value=f"Period: {from_date} to {to_date}")
        
        total_billed = bills.aggregate(total=Sum('grand_total'))['total'] or Decimal('0')
        total_collected = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        efficiency = (total_collected / total_billed * 100) if total_billed > 0 else 0
        
        ws.cell(row=4, column=1, value="Bills Raised:")
        ws.cell(row=4, column=2, value=bills.count())
        ws.cell(row=4, column=3, value=float(total_billed))
        
        ws.cell(row=5, column=1, value="Payments Received:")
        ws.cell(row=5, column=2, value=payments.count())
        ws.cell(row=5, column=3, value=float(total_collected))
        
        ws.cell(row=6, column=1, value="Collection Efficiency:")
        ws.cell(row=6, column=2, value=f"{efficiency:.1f}%")
        
        # Bills section
        ws.cell(row=8, column=1, value="BILLS RAISED").font = Font(bold=True)
        headers = ["Bill #", "Date", "Consignor", "Amount"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=9, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = border
        
        row = 10
        for bill in bills.order_by('-bill_date'):
            ws.cell(row=row, column=1, value=bill.bill_number).border = border
            ws.cell(row=row, column=2, value=str(bill.bill_date)).border = border
            ws.cell(row=row, column=3, value=bill.consignor.name if bill.consignor else '').border = border
            ws.cell(row=row, column=4, value=float(bill.grand_total)).border = border
            row += 1
        
        # Payments section
        row += 2
        ws.cell(row=row, column=1, value="PAYMENTS RECEIVED").font = Font(bold=True)
        row += 1
        headers = ["Date", "Bill #", "Consignor", "Method", "Reference", "Amount"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col, value=header)
            cell.font = header_font
            cell.fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
            cell.border = border
        
        row += 1
        for payment in payments.order_by('-payment_date'):
            ws.cell(row=row, column=1, value=str(payment.payment_date)).border = border
            ws.cell(row=row, column=2, value=payment.bill.bill_number).border = border
            ws.cell(row=row, column=3, value=payment.bill.consignor.name if payment.bill.consignor else '').border = border
            ws.cell(row=row, column=4, value=payment.get_payment_method_display()).border = border
            ws.cell(row=row, column=5, value=payment.reference_number or '').border = border
            ws.cell(row=row, column=6, value=float(payment.amount)).border = border
            row += 1
        
        # Column widths
        ws.column_dimensions['A'].width = 15
        ws.column_dimensions['B'].width = 12
        ws.column_dimensions['C'].width = 35
        ws.column_dimensions['D'].width = 15
        ws.column_dimensions['E'].width = 18
        ws.column_dimensions['F'].width = 15
        
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = f"settlement_report_{from_date}_{to_date}.xlsx"
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['GET'], url_path='export-client-statement/(?P<consignor_id>[^/.]+)')
    def export_client_statement(self, request, consignor_id=None):
        """Export client statement to Excel"""
        import openpyxl
        from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
        from django.db.models import Sum
        from apps.billing.models import ClientPayment
        from apps.masters.models import Consignor
        
        try:
            consignor = Consignor.objects.get(pk=consignor_id, is_deleted=False)
        except Consignor.DoesNotExist:
            return Response({'error': 'Consignor not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Date range
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if not from_date:
            today = timezone.now().date()
            from_date = today - timedelta(days=90)
        else:
            from_date = timezone.datetime.strptime(from_date, '%Y-%m-%d').date()
        
        if not to_date:
            to_date = timezone.now().date()
        else:
            to_date = timezone.datetime.strptime(to_date, '%Y-%m-%d').date()
        
        # Opening balance
        bills_before = Bill.objects.filter(
            consignor=consignor, is_deleted=False, bill_date__lt=from_date
        )
        payments_before = ClientPayment.objects.filter(
            bill__consignor=consignor, is_deleted=False, payment_date__lt=from_date
        )
        
        opening_billed = bills_before.aggregate(total=Sum('grand_total'))['total'] or Decimal('0')
        opening_paid = payments_before.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        opening_balance = opening_billed - opening_paid
        
        # Transactions
        bills_in_period = Bill.objects.filter(
            consignor=consignor, is_deleted=False,
            bill_date__gte=from_date, bill_date__lte=to_date
        ).order_by('bill_date')
        
        payments_in_period = ClientPayment.objects.filter(
            bill__consignor=consignor, is_deleted=False,
            payment_date__gte=from_date, payment_date__lte=to_date
        ).order_by('payment_date')
        
        # Create Excel
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Statement"
        
        header_font = Font(bold=True, color="FFFFFF")
        border = Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin')
        )
        
        # Header
        ws.cell(row=1, column=1, value="CLIENT STATEMENT").font = Font(bold=True, size=14)
        ws.cell(row=2, column=1, value=consignor.name).font = Font(bold=True)
        ws.cell(row=3, column=1, value=f"GSTIN: {consignor.gstin or 'N/A'}")
        ws.cell(row=4, column=1, value=f"Period: {from_date} to {to_date}")
        
        # Summary
        period_billed = bills_in_period.aggregate(total=Sum('grand_total'))['total'] or Decimal('0')
        period_paid = payments_in_period.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        closing_balance = opening_balance + period_billed - period_paid
        
        ws.cell(row=6, column=1, value="Opening Balance:")
        ws.cell(row=6, column=2, value=float(opening_balance))
        ws.cell(row=7, column=1, value="Bills Raised:")
        ws.cell(row=7, column=2, value=float(period_billed))
        ws.cell(row=8, column=1, value="Payments Received:")
        ws.cell(row=8, column=2, value=float(period_paid))
        ws.cell(row=9, column=1, value="Closing Balance:").font = Font(bold=True)
        ws.cell(row=9, column=2, value=float(closing_balance)).font = Font(bold=True)
        
        # Transactions
        headers = ["Date", "Type", "Reference", "Description", "Debit", "Credit", "Balance"]
        header_fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
        
        row = 11
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = border
        
        row += 1
        ws.cell(row=row, column=1, value="Opening Balance")
        ws.cell(row=row, column=7, value=float(opening_balance))
        running_balance = opening_balance
        row += 1
        
        # Build and sort transactions
        transactions = []
        for bill in bills_in_period:
            transactions.append({
                'date': bill.bill_date,
                'type': 'BILL',
                'reference': bill.bill_number,
                'description': f'Bill #{bill.bill_number}',
                'debit': bill.grand_total,
                'credit': Decimal('0'),
            })
        
        for payment in payments_in_period:
            transactions.append({
                'date': payment.payment_date,
                'type': 'PAYMENT',
                'reference': payment.reference_number or f'PAY-{payment.id}',
                'description': f'Payment - {payment.get_payment_method_display()}',
                'debit': Decimal('0'),
                'credit': payment.amount,
            })
        
        transactions.sort(key=lambda x: x['date'])
        
        for txn in transactions:
            running_balance += txn['debit'] - txn['credit']
            ws.cell(row=row, column=1, value=str(txn['date'])).border = border
            ws.cell(row=row, column=2, value=txn['type']).border = border
            ws.cell(row=row, column=3, value=txn['reference']).border = border
            ws.cell(row=row, column=4, value=txn['description']).border = border
            ws.cell(row=row, column=5, value=float(txn['debit']) if txn['debit'] else '').border = border
            ws.cell(row=row, column=6, value=float(txn['credit']) if txn['credit'] else '').border = border
            ws.cell(row=row, column=7, value=float(running_balance)).border = border
            row += 1
        
        # Closing row
        ws.cell(row=row, column=1, value="Closing Balance").font = Font(bold=True)
        ws.cell(row=row, column=7, value=float(closing_balance)).font = Font(bold=True)
        
        # Column widths
        ws.column_dimensions['A'].width = 12
        ws.column_dimensions['B'].width = 10
        ws.column_dimensions['C'].width = 15
        ws.column_dimensions['D'].width = 35
        ws.column_dimensions['E'].width = 12
        ws.column_dimensions['F'].width = 12
        ws.column_dimensions['G'].width = 15
        
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = f"statement_{consignor.name.replace(' ', '_')}_{from_date}_{to_date}.xlsx"
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    # ============================================================
    # PHASE 5 ADDITIONS: Truck Statement & LR-HPA Mapping Reports
    # ============================================================

    @action(detail=False, methods=['GET'], url_path='truck-statement/(?P<truck_id>[^/.]+)')
    def truck_statement(self, request, truck_id=None):
        """
        Get complete statement for a specific truck.
        Shows all HPAs, payments, and running balance.
        
        Query params:
        - from_date: Start date (YYYY-MM-DD)
        - to_date: End date (YYYY-MM-DD)
        """
        from apps.masters.models import Truck
        from apps.transactions.models import PaymentTransaction
        
        user = request.user
        
        try:
            truck = Truck.objects.get(id=truck_id, is_deleted=False)
        except Truck.DoesNotExist:
            return Response({'error': 'Truck not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get date range
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date', timezone.now().date().isoformat())
        
        if not from_date:
            # Default to last 3 months
            from_date = (timezone.now() - timedelta(days=90)).date().isoformat()
        
        # Get all HPAs for this truck
        hpas = HirePaymentAdvice.objects.filter(
            truck=truck,
            hpa_date__gte=from_date,
            hpa_date__lte=to_date
        ).order_by('hpa_date', 'created_at')
        
        # Branch isolation
        if not user.can_access_all_branches and user.branch:
            hpas = hpas.filter(branch=user.branch)
        
        # Get all payment transactions for these HPAs
        hpa_ids = list(hpas.values_list('id', flat=True))
        payments = PaymentTransaction.objects.filter(
            hpa_id__in=hpa_ids
        ).order_by('payment_date', 'created_at')
        
        # Build statement
        transactions = []
        
        # Add HPAs as freight charges (amount owed to truck)
        for hpa in hpas:
            transactions.append({
                'date': hpa.hpa_date.isoformat(),
                'type': 'HPA',
                'reference': hpa.hpa_number,
                'description': f"HPA {hpa.hpa_number} - {hpa.from_location} → {hpa.to_location}",
                'lorry_hire': float(hpa.lorry_hire_rs or 0),
                'advance': float(hpa.less_advance or 0),
                'diesel': float(hpa.diesel_amount or 0),
                'bank': float(hpa.bank_amount or 0),
                'balance': float(hpa.balance_rs or 0),
                'status': hpa.payment_status
            })
        
        # Add detailed payment transactions
        for payment in payments:
            transactions.append({
                'date': payment.payment_date.isoformat(),
                'type': 'PAYMENT',
                'payment_type': payment.payment_type,
                'reference': payment.reference_number or '',
                'description': f"{payment.get_payment_type_display()} - {payment.hpa.hpa_number}",
                'amount': float(payment.amount),
                'pump_name': payment.pump_name or '',
                'bank_name': payment.bank_name or ''
            })
        
        # Calculate totals
        total_lorry_hire = sum([float(h.lorry_hire_rs or 0) for h in hpas])
        total_advance = sum([float(h.less_advance or 0) for h in hpas])
        total_diesel = sum([float(h.diesel_amount or 0) for h in hpas])
        total_bank = sum([float(h.bank_amount or 0) for h in hpas])
        total_balance = sum([float(h.balance_rs or 0) for h in hpas])
        total_paid = total_advance + total_diesel + total_bank
        
        return Response({
            'truck': {
                'id': truck.id,
                'truck_number': truck.truck_number,
                'owner_name': truck.owner_name,
                'driver_name': truck.driver_name
            },
            'period': {
                'from_date': from_date,
                'to_date': to_date
            },
            'summary': {
                'total_hpas': hpas.count(),
                'total_lorry_hire': total_lorry_hire,
                'total_advance': total_advance,
                'total_diesel': total_diesel,
                'total_bank': total_bank,
                'total_paid': total_paid,
                'total_balance': total_balance
            },
            'transactions': transactions
        })

    @action(detail=False, methods=['GET'])
    def lr_hpa_mapping(self, request):
        """
        Get LR to HPA mapping report.
        Shows which LRs are linked to which HPAs.
        
        Query params:
        - from_date: Start date
        - to_date: End date
        - status: LR status filter
        - has_hpa: true/false - filter LRs with/without HPA
        """
        user = request.user
        
        # Date range
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        has_hpa = request.query_params.get('has_hpa')
        lr_status = request.query_params.get('status')
        
        # Base queryset
        lrs = LorryReceipt.objects.filter(is_deleted=False).select_related(
            'branch', 'truck', 'consignor', 'consignee'
        ).prefetch_related('primary_hpas', 'additional_hpas')
        
        # Branch isolation
        if not user.can_access_all_branches and user.branch:
            lrs = lrs.filter(branch=user.branch)
        
        # Apply filters
        if from_date:
            lrs = lrs.filter(lr_date__gte=from_date)
        if to_date:
            lrs = lrs.filter(lr_date__lte=to_date)
        if lr_status:
            lrs = lrs.filter(status=lr_status)
        
        # Filter by HPA status
        if has_hpa == 'true':
            lrs = lrs.filter(
                Q(primary_hpas__isnull=False) | Q(additional_hpas__isnull=False)
            ).distinct()
        elif has_hpa == 'false':
            lrs = lrs.exclude(
                Q(primary_hpas__isnull=False) | Q(additional_hpas__isnull=False)
            )
        
        # Build mapping data
        mapping = []
        for lr in lrs:
            # Get linked HPAs
            hpas = list(lr.primary_hpas.filter(is_deleted=False))
            hpas.extend(list(lr.additional_hpas.filter(is_deleted=False)))
            
            mapping.append({
                'lr_id': lr.id,
                'lr_number': lr.lr_number,
                'lr_date': lr.lr_date.isoformat() if lr.lr_date else None,
                'truck_number': lr.truck.truck_number if lr.truck else None,
                'consignor': lr.consignor.name if lr.consignor else None,
                'consignee': lr.consignee.name if lr.consignee else None,
                'from_location': lr.from_location,
                'to_location': lr.to_location,
                'quantity_mt': float(lr.quantity_mt or 0),
                'status': lr.status,
                'has_hpa': len(hpas) > 0,
                'hpa_count': len(hpas),
                'hpas': [{
                    'hpa_id': hpa.id,
                    'hpa_number': hpa.hpa_number,
                    'hpa_date': hpa.hpa_date.isoformat() if hpa.hpa_date else None,
                    'lorry_hire': float(hpa.lorry_hire_rs or 0),
                    'payment_status': hpa.payment_status
                } for hpa in hpas]
            })
        
        # Summary
        total_lrs = len(mapping)
        lrs_with_hpa = sum(1 for m in mapping if m['has_hpa'])
        lrs_without_hpa = total_lrs - lrs_with_hpa
        
        return Response({
            'summary': {
                'total_lrs': total_lrs,
                'lrs_with_hpa': lrs_with_hpa,
                'lrs_without_hpa': lrs_without_hpa,
                'coverage_percentage': round((lrs_with_hpa / total_lrs * 100) if total_lrs > 0 else 0, 2)
            },
            'mapping': mapping
        })

    @action(detail=False, methods=['GET'])
    def pending_truck_payments(self, request):
        """
        Get all HPAs with pending payments (balance > 0).
        
        Query params:
        - from_date: Start date
        - to_date: End date
        - truck_id: Filter by specific truck
        - min_balance: Minimum balance amount
        """
        user = request.user
        
        # Date range
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        truck_id = request.query_params.get('truck_id')
        min_balance = request.query_params.get('min_balance', 0)
        
        # Base queryset - HPAs with balance > 0
        hpas = HirePaymentAdvice.objects.filter(
            balance_rs__gt=min_balance
        ).select_related('branch', 'truck', 'lr').order_by('-balance_rs')
        
        # Branch isolation
        if not user.can_access_all_branches and user.branch:
            hpas = hpas.filter(branch=user.branch)
        
        # Apply filters
        if from_date:
            hpas = hpas.filter(hpa_date__gte=from_date)
        if to_date:
            hpas = hpas.filter(hpa_date__lte=to_date)
        if truck_id:
            hpas = hpas.filter(truck_id=truck_id)
        
        # Build response
        pending_list = []
        for hpa in hpas:
            pending_list.append({
                'hpa_id': hpa.id,
                'hpa_number': hpa.hpa_number,
                'hpa_date': hpa.hpa_date.isoformat() if hpa.hpa_date else None,
                'truck_number': hpa.truck.truck_number if hpa.truck else None,
                'truck_id': hpa.truck_id,
                'driver_name': hpa.driver_name,
                'from_location': hpa.from_location,
                'to_location': hpa.to_location,
                'lorry_hire': float(hpa.lorry_hire_rs or 0),
                'total_paid': float((hpa.less_advance or 0) + (hpa.diesel_amount or 0) + (hpa.bank_amount or 0)),
                'balance': float(hpa.balance_rs or 0),
                'payment_status': hpa.payment_status,
                'days_pending': (timezone.now().date() - hpa.hpa_date).days if hpa.hpa_date else 0
            })
        
        # Summary by truck
        truck_summary = {}
        for item in pending_list:
            truck_num = item['truck_number'] or 'Unknown'
            if truck_num not in truck_summary:
                truck_summary[truck_num] = {
                    'truck_id': item['truck_id'],
                    'truck_number': truck_num,
                    'hpa_count': 0,
                    'total_balance': 0
                }
            truck_summary[truck_num]['hpa_count'] += 1
            truck_summary[truck_num]['total_balance'] += item['balance']
        
        total_pending = sum(item['balance'] for item in pending_list)
        
        return Response({
            'summary': {
                'total_hpas': len(pending_list),
                'total_pending': total_pending,
                'trucks_with_pending': len(truck_summary)
            },
            'by_truck': sorted(truck_summary.values(), key=lambda x: -x['total_balance']),
            'details': pending_list
        })
