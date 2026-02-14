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
from django.db.models import Q
from apps.common.pagination import StandardResultsSetPagination

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
