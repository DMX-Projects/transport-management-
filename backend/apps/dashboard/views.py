from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum, Count, Q
from datetime import date, timedelta
from decimal import Decimal
from .models import DashboardStats
from .serializers import DashboardStatsSerializer
from apps.lr.models import LorryReceipt
from apps.hpa.models import HirePaymentAdvice
from apps.billing.models import Bill
from apps.masters.models import Truck, Consignor, Party
from .signals import update_dashboard_stats
from apps.common.pagination import StandardResultsSetPagination


class DashboardStatsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Optimized Dashboard Statistics ViewSet
    Returns pre-calculated stats from DashboardStats table
    """
    queryset = DashboardStats.objects.filter(is_deleted=False)
    serializer_class = DashboardStatsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by branch based on user permissions"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # SUPER_ADMIN can see all branches
        if user.can_access_all_branches:
            return queryset
        
        # BRANCH_MANAGER can only see their branch stats
        if user.branch:
            return queryset.filter(branch=user.branch)
        
        # No branch assigned - return empty
        return queryset.none()
    
    @action(detail=False, methods=['GET'])
    def current(self, request):
        """
        Get current dashboard statistics (today's stats)
        Optimized - uses pre-calculated DashboardStats table
        """
        user = request.user
        today = timezone.now().date()
        
        # Get or create today's stats
        if user.can_access_all_branches:
            stats = DashboardStats.objects.filter(
                date=today,
                stats_type='DAILY',
                branch__isnull=True
            ).first()
        else:
            stats = DashboardStats.objects.filter(
                branch=user.branch,
                date=today,
                stats_type='DAILY'
            ).first()
        
        # If stats don't exist, create them
        if not stats:
            update_dashboard_stats(
                branch=user.branch if not user.can_access_all_branches else None,
                date_obj=today,
                user=user
            )
            # Refresh from database
            if user.can_access_all_branches:
                stats = DashboardStats.objects.filter(
                    date=today,
                    stats_type='DAILY',
                    branch__isnull=True
                ).first()
            else:
                stats = DashboardStats.objects.filter(
                    branch=user.branch,
                    date=today,
                    stats_type='DAILY'
                ).first()
        
        if stats:
            serializer = self.get_serializer(stats)
            return Response(serializer.data)
        else:
            return Response({'error': 'Stats not available'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['GET'])
    def summary(self, request):
        """
        Get summary statistics with comparisons
        Returns current stats with week-over-week and month-over-month changes
        """
        user = request.user
        today = timezone.now().date()
        last_week = today - timedelta(days=7)
        last_month = today - timedelta(days=30)
        
        # Base filter: today's daily stats; Super Admin gets global (branch=None), others get their branch
        def stats_qs(date_val):
            qs = DashboardStats.objects.filter(is_deleted=False, date=date_val, stats_type='DAILY')
            if user.can_access_all_branches:
                qs = qs.filter(branch__isnull=True)  # Global aggregate for Super Admin
            elif user.branch_id:
                qs = qs.filter(branch=user.branch)
            else:
                qs = qs.none()
            return qs
        
        current_stats = stats_qs(today).first()
        
        if not current_stats:
            update_dashboard_stats(
                branch=user.branch if not user.can_access_all_branches else None,
                date_obj=today,
                user=user
            )
            current_stats = stats_qs(today).first()
        
        last_week_stats = stats_qs(last_week).first()
        
        # Calculate changes
        def calculate_change(current, previous):
            if previous and previous > 0:
                change = ((current - previous) / previous) * 100
                return round(change, 1)
            return 0
        
        summary = {
            'current': DashboardStatsSerializer(current_stats).data if current_stats else {},
            'changes': {
                'pending_lrs': calculate_change(
                    current_stats.pending_lrs if current_stats else 0,
                    last_week_stats.pending_lrs if last_week_stats else 0
                ) if current_stats else 0,
                'open_hpas': calculate_change(
                    current_stats.pending_hpas if current_stats else 0,
                    last_week_stats.pending_hpas if last_week_stats else 0
                ) if current_stats else 0,
                'total_revenue': calculate_change(
                    float(current_stats.total_revenue) if current_stats else 0,
                    float(last_week_stats.total_revenue) if last_week_stats else 0
                ) if current_stats else 0,
            }
        }
        
        return Response(summary)
    
    @action(detail=False, methods=['POST'])
    def refresh(self, request):
        """
        Manually refresh dashboard statistics
        Only SUPER_ADMIN can trigger this
        """
        if not request.user.can_edit:
            return Response(
                {'error': 'Only SUPER_ADMIN can refresh dashboard stats'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        branch_id = request.data.get('branch_id')
        date_str = request.data.get('date')
        
        if date_str:
            date_obj = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
        else:
            date_obj = timezone.now().date()
        
        from apps.masters.models import Branch
        branch = None
        if branch_id:
            branch = Branch.objects.get(id=branch_id)
        
        update_dashboard_stats(branch=branch, date_obj=date_obj, user=request.user)
        
        return Response({
            'message': 'Dashboard stats refreshed successfully',
            'branch': branch.name if branch else 'All Branches',
            'date': date_obj
        })
    
    @action(detail=False, methods=['GET'])
    def hpas_without_bills(self, request):
        """
        Get HPAs that don't have bills created yet
        Returns list of HPAs whose LRs are not in any BillItem
        """
        from apps.hpa.models import HirePaymentAdvice
        from apps.billing.models import BillItem
        
        user = request.user
        
        # Get all HPAs for user's accessible branches
        hpa_queryset = HirePaymentAdvice.objects.filter(is_deleted=False)
        
        if not user.can_access_all_branches:
            if user.branch:
                hpa_queryset = hpa_queryset.filter(branch=user.branch)
            else:
                hpa_queryset = hpa_queryset.none()
        
        # Get all LRs that are already in bills
        billed_lr_ids = BillItem.objects.filter(
            bill__is_deleted=False
        ).values_list('lr_id', flat=True).distinct()
        
        # Filter HPAs whose LRs are not in bills
        hpas_without_bills = hpa_queryset.exclude(lr_id__in=billed_lr_ids)
        
        # Serialize the results
        from apps.hpa.serializers import HirePaymentAdviceSerializer
        serializer = HirePaymentAdviceSerializer(hpas_without_bills, many=True)
        
        return Response({
            'count': hpas_without_bills.count(),
            'hpas': serializer.data
        })
    
    @action(detail=False, methods=['GET'])
    def pending_lrs(self, request):
        """
        Get all LRs that are pending HPA creation
        Supports date range filtering with from_date and to_date
        """
        from apps.lr.models import LorryReceipt
        from apps.lr.serializers import LorryReceiptSerializer
        
        user = request.user
        
        # Get all LRs for user's accessible branches
        lr_queryset = LorryReceipt.objects.filter(is_deleted=False)
        
        if not user.can_access_all_branches:
            if user.branch:
                lr_queryset = lr_queryset.filter(branch=user.branch)
            else:
                lr_queryset = lr_queryset.none()
        
        # Filter LRs without any HPA linked
        # HPA can be linked either as primary (primary_hpas) or additional (additional_hpas)
        lrs_with_hpa_ids = lr_queryset.filter(
            Q(primary_hpas__isnull=False) | Q(additional_hpas__isnull=False)
        ).values_list('id', flat=True).distinct()
        pending_lrs = lr_queryset.exclude(id__in=lrs_with_hpa_ids)
        
        # Apply date range filters if provided
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if from_date:
            pending_lrs = pending_lrs.filter(lr_date__gte=from_date)
        if to_date:
            pending_lrs = pending_lrs.filter(lr_date__lte=to_date)
        
        # Optionally filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            pending_lrs = pending_lrs.filter(status=status_filter)
        else:
            # Default: Show LRs in statuses that can have HPA
            pending_lrs = pending_lrs.filter(
                status__in=['DRAFT', 'PENDING_HPA', 'ISSUED', 'LOADING', 'IN_TRANSIT']
            )
        
        # Apply search if provided
        search = request.query_params.get('search')
        if search:
            pending_lrs = pending_lrs.filter(
                Q(lr_number__icontains=search) |
                Q(truck__truck_number__icontains=search) |
                Q(consignor__name__icontains=search) |
                Q(consignee__name__icontains=search) |
                Q(from_location__icontains=search) |
                Q(to_location__icontains=search)
            )

        # Order by date
        pending_lrs = pending_lrs.order_by('-lr_date', '-created_at')

        # Paginate
        paginator = StandardResultsSetPagination()
        paged_qs = paginator.paginate_queryset(pending_lrs, request)
        serializer = LorryReceiptSerializer(paged_qs, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    @action(detail=False, methods=['GET'])
    def pending_hpas(self, request):
        """
        Get all HPAs that are pending bill creation
        Supports date range filtering with from_date and to_date
        """
        from apps.hpa.models import HirePaymentAdvice
        from apps.hpa.serializers import HirePaymentAdviceSerializer
        from apps.billing.models import BillItem
        
        user = request.user
        
        # Get all HPAs for user's accessible branches
        hpa_queryset = HirePaymentAdvice.objects.filter(is_deleted=False)
        
        if not user.can_access_all_branches:
            if user.branch:
                hpa_queryset = hpa_queryset.filter(branch=user.branch)
            else:
                hpa_queryset = hpa_queryset.none()
        
        # Get all LR IDs that appear in any bill item (via lr or lr_item)
        from django.db.models import Q
        billed_lr_ids = set()
        billed_lr_ids.update(
            BillItem.objects.filter(
                bill__is_deleted=False, lr__isnull=False
            ).values_list('lr_id', flat=True).distinct()
        )
        billed_lr_ids.update(
            BillItem.objects.filter(
                bill__is_deleted=False, lr_item__isnull=False
            ).values_list('lr_item__lr_id', flat=True).distinct()
        )
        
        # HPAs whose primary or additional LR is in bills
        billed_hpa_ids = HirePaymentAdvice.objects.filter(
            Q(lr_id__in=billed_lr_ids) | Q(additional_lrs__id__in=billed_lr_ids)
        ).values_list('id', flat=True).distinct()
        
        # Filter HPAs without bills
        pending_hpas = hpa_queryset.exclude(id__in=billed_hpa_ids)
        
        # Apply date range filters if provided
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if from_date:
            pending_hpas = pending_hpas.filter(hpa_date__gte=from_date)
        if to_date:
            pending_hpas = pending_hpas.filter(hpa_date__lte=to_date)
        
        # Apply search if provided
        search = request.query_params.get('search')
        if search:
            pending_hpas = pending_hpas.filter(
                Q(hpa_number__icontains=search) |
                Q(lr__lr_number__icontains=search) |
                Q(truck__truck_number__icontains=search) |
                Q(driver_name__icontains=search)
            )

        # Order by date
        pending_hpas = pending_hpas.order_by('-hpa_date', '-created_at')

        # Paginate
        paginator = StandardResultsSetPagination()
        paged_qs = paginator.paginate_queryset(pending_hpas, request)
        serializer = HirePaymentAdviceSerializer(paged_qs, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    @action(detail=False, methods=['GET'])
    def stats_by_date_range(self, request):
        """
        Get comprehensive stats for a specific date range
        Supports from_date and to_date parameters
        Shows all data instead of just last week
        """
        from apps.lr.models import LorryReceipt
        from apps.hpa.models import HirePaymentAdvice
        from apps.billing.models import Bill, BillLineItem
        
        user = request.user
        
        # Get date range from query params
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if not from_date or not to_date:
            # Default to all time if no dates provided
            from_date = date(2000, 1, 1)
            to_date = timezone.now().date()
        
        # Base querysets filtered by user permissions
        if user.can_access_all_branches:
            lr_qs = LorryReceipt.objects.filter(is_deleted=False)
            hpa_qs = HirePaymentAdvice.objects.filter(is_deleted=False)
            bill_qs = Bill.objects.filter(is_deleted=False)
        elif user.branch:
            lr_qs = LorryReceipt.objects.filter(is_deleted=False, branch=user.branch)
            hpa_qs = HirePaymentAdvice.objects.filter(is_deleted=False, branch=user.branch)
            bill_qs = Bill.objects.filter(is_deleted=False, branch=user.branch)
        else:
            return Response({
                'error': 'No branch assigned to user'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Apply date filters
        lr_in_range = lr_qs.filter(lr_date__range=[from_date, to_date])
        hpa_in_range = hpa_qs.filter(hpa_date__range=[from_date, to_date])
        bill_in_range = bill_qs.filter(bill_date__range=[from_date, to_date])
        
        # Calculate stats
        stats = {
            'date_range': {
                'from': from_date,
                'to': to_date
            },
            'lrs': {
                'total': lr_in_range.count(),
                'pending_hpa': lr_in_range.exclude(
                    id__in=lr_in_range.filter(
                        Q(primary_hpas__isnull=False) | Q(additional_hpas__isnull=False)
                    ).values_list('id', flat=True).distinct()
                ).count(),
                'with_hpa': lr_in_range.filter(
                    Q(primary_hpas__isnull=False) | Q(additional_hpas__isnull=False)
                ).distinct().count(),
                'by_status': dict(lr_in_range.values('status').annotate(count=Count('id')).values_list('status', 'count'))
            },
            'hpas': {
                'total': hpa_in_range.count(),
                'pending_bill': hpa_in_range.exclude(
                    id__in=BillLineItem.objects.values_list('hpa_id', flat=True)
                ).count(),
                'total_freight': hpa_in_range.aggregate(total=Sum('lorry_hire_rs'))['total'] or 0,
                'total_balance': hpa_in_range.aggregate(total=Sum('balance_rs'))['total'] or 0,
            },
            'bills': {
                'total': bill_in_range.count(),
                'total_amount': bill_in_range.aggregate(total=Sum('grand_total'))['total'] or 0,
                'by_status': dict(bill_in_range.values('status').annotate(count=Count('id')).values_list('status', 'count'))
            }
        }
        
        return Response(stats)

    @action(detail=False, methods=['GET'])
    def metrics(self, request):
        """
        OPTIMIZED Dashboard Metrics with Date Range Filtering
        
        Returns properly calculated metrics:
        - active_trucks: Trucks currently in movement/transit
          * Trucks with LRs in transit status (LOADING, IN_TRANSIT, UNLOADING)
          * OR trucks with PODs not yet delivered (PENDING, IN_TRANSIT, PARTIAL_DELIVERED)
          * OR trucks with HPAs not yet paid/delivered (PENDING, PARTIAL, PENDING_BILL)
        - pending_lrs: LRs without HPA created in date range
        - pending_hpas: HPAs without bills created in date range
        - total_revenue: Sum of bill amounts in date range (only GENERATED, SENT, ACKNOWLEDGED, PAID status)
        
        Query Params:
        - from_date: Start date (YYYY-MM-DD)
        - to_date: End date (YYYY-MM-DD)
        """
        from apps.lr.models import LorryReceipt
        from apps.hpa.models import HirePaymentAdvice
        from apps.billing.models import Bill, BillItem
        from apps.masters.models import Truck
        from django.db.models import Subquery, OuterRef, Exists
        
        user = request.user
        
        # Parse date range
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        # Default to current month if not provided
        if not from_date or not to_date:
            today = timezone.now().date()
            from_date = today.replace(day=1)
            to_date = today
        
        # Base querysets with branch filtering
        def apply_branch_filter(qs, branch_field='branch'):
            if user.can_access_all_branches:
                return qs
            elif user.branch:
                return qs.filter(**{branch_field: user.branch})
            else:
                return qs.none()
        
        # ========== ACTIVE TRUCKS ==========
        # Trucks that are currently in movement/transit
        # A truck is active if it has:
        # 1. HPAs in date range with LRs in transit status (LOADING, IN_TRANSIT, UNLOADING)
        # 2. OR HPAs with PODs that are not yet fully delivered (PENDING, IN_TRANSIT, PARTIAL_DELIVERED)
        from apps.lr.models import LorryReceipt
        from apps.pod.models import ProofOfDelivery
        
        hpa_qs_for_trucks = HirePaymentAdvice.objects.filter(
            is_deleted=False,
            hpa_date__range=[from_date, to_date]
        )
        hpa_qs_for_trucks = apply_branch_filter(hpa_qs_for_trucks)
        
        # Get truck IDs from HPAs with LRs in transit
        active_truck_ids_from_lr = set()
        for hpa in hpa_qs_for_trucks.select_related('lr', 'truck'):
            if hpa.lr and hpa.lr.status in ['LOADING', 'IN_TRANSIT', 'UNLOADING']:
                if hpa.truck_id:
                    active_truck_ids_from_lr.add(hpa.truck_id)
        
        # Get truck IDs from HPAs with PODs not yet delivered
        active_truck_ids_from_pod = set()
        for hpa in hpa_qs_for_trucks.select_related('truck'):
            try:
                if hpa.pod and hpa.pod.status in ['PENDING', 'IN_TRANSIT', 'PARTIAL_DELIVERED']:
                    if hpa.truck_id:
                        active_truck_ids_from_pod.add(hpa.truck_id)
            except ProofOfDelivery.DoesNotExist:
                # No POD yet, check if HPA is still active (not paid and not delivered)
                if hpa.payment_status in ['PENDING', 'PARTIAL', 'PENDING_BILL'] and hpa.truck_id:
                    active_truck_ids_from_pod.add(hpa.truck_id)
        
        # Combine both sets
        all_active_truck_ids = active_truck_ids_from_lr | active_truck_ids_from_pod
        
        active_trucks_count = Truck.objects.filter(
            id__in=all_active_truck_ids,
            is_deleted=False,
            is_active=True
        ).count()
        
        # ========== PENDING LRs (without HPA) ==========
        lr_qs = LorryReceipt.objects.filter(
            is_deleted=False,
            lr_date__range=[from_date, to_date]
        )
        lr_qs = apply_branch_filter(lr_qs)
        
        # LRs that have HPA (either primary or additional)
        lrs_with_hpa = lr_qs.filter(
            Q(primary_hpas__isnull=False) | Q(additional_hpas__isnull=False)
        ).values_list('id', flat=True).distinct()
        
        pending_lrs_count = lr_qs.exclude(id__in=lrs_with_hpa).filter(
            status__in=['DRAFT', 'PENDING_HPA', 'ISSUED', 'LOADING', 'IN_TRANSIT']
        ).count()
        
        # ========== PENDING HPAs (without bills) ==========
        hpa_qs = HirePaymentAdvice.objects.filter(
            is_deleted=False,
            hpa_date__range=[from_date, to_date]
        )
        hpa_qs = apply_branch_filter(hpa_qs)
        
        # Get all LR IDs that appear in any bill item
        billed_lr_ids = set()
        billed_lr_ids.update(
            BillItem.objects.filter(
                bill__is_deleted=False, lr__isnull=False
            ).values_list('lr_id', flat=True).distinct()
        )
        billed_lr_ids.update(
            BillItem.objects.filter(
                bill__is_deleted=False, lr_item__isnull=False
            ).values_list('lr_item__lr_id', flat=True).distinct()
        )
        
        # HPAs whose primary or additional LR is in bills
        billed_hpa_ids = HirePaymentAdvice.objects.filter(
            Q(lr_id__in=billed_lr_ids) | Q(additional_lrs__id__in=billed_lr_ids)
        ).values_list('id', flat=True).distinct()
        
        pending_hpas_count = hpa_qs.exclude(id__in=billed_hpa_ids).count()
        
        # ========== TOTAL REVENUE ==========
        bill_qs = Bill.objects.filter(
            is_deleted=False,
            bill_date__range=[from_date, to_date],
            status__in=['GENERATED', 'SENT', 'ACKNOWLEDGED', 'PAID']
        )
        bill_qs = apply_branch_filter(bill_qs)
        
        total_revenue = bill_qs.aggregate(
            total=Sum('grand_total')
        )['total'] or Decimal('0')
        
        # ========== ADDITIONAL STATS ==========
        # Total LRs in range
        total_lrs = lr_qs.count()
        
        # Total HPAs in range
        total_hpas = hpa_qs.count()
        
        # Total Bills in range
        total_bills = bill_qs.count()
        
        # Freight pending (balance_rs from HPAs)
        pending_freight = hpa_qs.aggregate(
            total=Sum('balance_rs')
        )['total'] or Decimal('0')
        
        return Response({
            'date_range': {
                'from_date': str(from_date),
                'to_date': str(to_date)
            },
            'metrics': {
                'active_trucks': active_trucks_count,
                'pending_lrs': pending_lrs_count,
                'pending_hpas': pending_hpas_count,
                'total_revenue': float(total_revenue),
            },
            'totals': {
                'total_lrs': total_lrs,
                'total_hpas': total_hpas,
                'total_bills': total_bills,
                'pending_freight': float(pending_freight),
            }
        })


