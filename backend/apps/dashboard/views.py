from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum, Count, Q
from datetime import date, timedelta
from .models import DashboardStats
from .serializers import DashboardStatsSerializer
from apps.lr.models import LorryReceipt
from apps.hpa.models import HirePaymentAdvice
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
        
        # Get current stats
        current_stats = self.get_queryset().filter(
            date=today,
            stats_type='DAILY'
        ).first()
        
        if not current_stats:
            update_dashboard_stats(
                branch=user.branch if not user.can_access_all_branches else None,
                date_obj=today,
                user=user
            )
            # Refresh from database
            current_stats = self.get_queryset().filter(
                date=today,
                stats_type='DAILY'
            ).first()
        
        # Get last week stats for comparison
        last_week_stats = self.get_queryset().filter(
            date=last_week,
            stats_type='DAILY'
        ).first()
        
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
        
        # Filter LRs without HPA (OneToOne relationship)
        pending_lrs = lr_queryset.filter(hpa__isnull=True)
        
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
        Get all HPAs that are pending payment
        Supports date range filtering with from_date and to_date
        """
        from apps.hpa.models import HirePaymentAdvice
        from apps.hpa.serializers import HirePaymentAdviceSerializer
        
        user = request.user
        
        # Get all HPAs for user's accessible branches
        hpa_queryset = HirePaymentAdvice.objects.filter(is_deleted=False)
        
        if not user.can_access_all_branches:
            if user.branch:
                hpa_queryset = hpa_queryset.filter(branch=user.branch)
            else:
                hpa_queryset = hpa_queryset.none()
        
        # Filter HPAs with pending/partial payment
        pending_hpas = hpa_queryset.filter(payment_status__in=['PENDING', 'PARTIAL'])
        
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
        """
        from apps.lr.models import LorryReceipt
        from apps.hpa.models import HirePaymentAdvice
        
        user = request.user
        
        # Get date range from query params
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if not from_date or not to_date:
            from_date = date(2000, 1, 1)
            to_date = timezone.now().date()
        
        # Base querysets filtered by user permissions
        if user.can_access_all_branches:
            lr_qs = LorryReceipt.objects.filter(is_deleted=False)
            hpa_qs = HirePaymentAdvice.objects.filter(is_deleted=False)
        elif user.branch:
            lr_qs = LorryReceipt.objects.filter(is_deleted=False, branch=user.branch)
            hpa_qs = HirePaymentAdvice.objects.filter(is_deleted=False, branch=user.branch)
        else:
            return Response({
                'error': 'No branch assigned to user'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Apply date filters
        lr_in_range = lr_qs.filter(lr_date__range=[from_date, to_date])
        hpa_in_range = hpa_qs.filter(hpa_date__range=[from_date, to_date])
        
        # Calculate stats
        stats = {
            'date_range': {
                'from': from_date,
                'to': to_date
            },
            'lrs': {
                'total': lr_in_range.count(),
                'pending_hpa': lr_in_range.filter(hpa__isnull=True).count(),
                'with_hpa': lr_in_range.filter(hpa__isnull=False).count(),
                'by_status': dict(lr_in_range.values('status').annotate(count=Count('id')).values_list('status', 'count'))
            },
            'hpas': {
                'total': hpa_in_range.count(),
                'total_freight': hpa_in_range.aggregate(total=Sum('lorry_hire_rs'))['total'] or 0,
                'total_balance': hpa_in_range.aggregate(total=Sum('balance_rs'))['total'] or 0,
            },
        }
        
        return Response(stats)


