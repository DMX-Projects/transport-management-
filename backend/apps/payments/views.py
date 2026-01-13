from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import Payment
from .serializers import PaymentSerializer, PaymentCreateSerializer
from apps.hpa.models import HirePaymentAdvice
from apps.common.pagination import StandardResultsSetPagination


class PaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Payment records
    Supports: Create, Read, Update (SUPER_ADMIN only)
    Features: Filtering, Search, Pagination, Branch Isolation
    Note: Only SUPER_ADMIN can update records. Delete functionality is disabled.
    """
    queryset = Payment.objects.filter(is_deleted=False)
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'hpa', 'payment_method', 'status', 'payment_date']
    search_fields = ['payment_number', 'hpa__hpa_number', 'cheque_number', 'upi_transaction_id', 'transaction_reference']
    ordering_fields = ['payment_date', 'amount', 'created_at']
    ordering = ['-payment_date', '-payment_number']
    
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
            return PaymentCreateSerializer
        return PaymentSerializer
    
    def perform_create(self, serializer):
        """Create payment and update HPA status"""
        hpa_id = serializer.validated_data.get('hpa_id')
        try:
            hpa = HirePaymentAdvice.objects.get(id=hpa_id)
            serializer.save(
                hpa=hpa,
                created_by=self.request.user,
                updated_by=self.request.user
            )
        except HirePaymentAdvice.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'hpa_id': 'HPA not found.'})
    
    def perform_update(self, serializer):
        """Only SUPER_ADMIN can update"""
        if not self.request.user.can_edit:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only SUPER_ADMIN can update records.")
        serializer.save(updated_by=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        """Delete functionality is disabled"""
        from rest_framework.exceptions import MethodNotAllowed
        raise MethodNotAllowed("DELETE", detail="Delete functionality is disabled.")
    
    @action(detail=False, methods=['GET'])
    def by_hpa(self, request):
        """
        Get all payments for a specific HPA number
        Usage: /api/v1/payments/by_hpa/?hpa_number=LR-001
        """
        hpa_number = request.query_params.get('hpa_number')
        
        if not hpa_number:
            return Response(
                {'error': 'hpa_number parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            hpa = HirePaymentAdvice.objects.get(hpa_number=hpa_number)
        except HirePaymentAdvice.DoesNotExist:
            return Response(
                {'error': f'HPA with number {hpa_number} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check branch permissions
        user = request.user
        if not user.can_access_all_branches:
            if user.branch and hpa.branch != user.branch:
                return Response(
                    {'error': 'You do not have permission to view this HPA'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        payments = self.get_queryset().filter(hpa=hpa)
        serializer = self.get_serializer(payments, many=True)
        
        # Calculate totals
        total_paid = sum(p.amount for p in payments if p.status in ['PENDING', 'CLEARED'])
        total_cleared = sum(p.amount for p in payments if p.status == 'CLEARED')
        total_pending = sum(p.amount for p in payments if p.status == 'PENDING')
        
        return Response({
            'hpa': {
                'hpa_number': hpa.hpa_number,
                'balance_rs': float(hpa.balance_rs),
                'advance_paid_rs': float(getattr(hpa, 'advance_paid_rs', 0)),
                'lorry_hire_rs': float(hpa.lorry_hire_rs),
                'payment_status': hpa.payment_status,
            },
            'payments': serializer.data,
            'summary': {
                'total_payments': payments.count(),
                'total_paid': float(total_paid),
                'total_cleared': float(total_cleared),
                'total_pending': float(total_pending),
                'remaining_balance': float(max(0, hpa.balance_rs - total_cleared)),
            }
        })
    
    @action(detail=False, methods=['GET'])
    def by_hpa_id(self, request):
        """
        Get all payments for a specific HPA ID
        Usage: /api/v1/payments/by_hpa_id/?hpa_id=1
        """
        hpa_id = request.query_params.get('hpa_id')
        
        if not hpa_id:
            return Response(
                {'error': 'hpa_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            hpa = HirePaymentAdvice.objects.get(id=hpa_id)
        except HirePaymentAdvice.DoesNotExist:
            return Response(
                {'error': f'HPA with ID {hpa_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check branch permissions
        user = request.user
        if not user.can_access_all_branches:
            if user.branch and hpa.branch != user.branch:
                return Response(
                    {'error': 'You do not have permission to view this HPA'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        payments = self.get_queryset().filter(hpa=hpa)
        serializer = self.get_serializer(payments, many=True)
        
        # Calculate totals
        total_paid = sum(p.amount for p in payments if p.status in ['PENDING', 'CLEARED'])
        total_cleared = sum(p.amount for p in payments if p.status == 'CLEARED')
        total_pending = sum(p.amount for p in payments if p.status == 'PENDING')
        
        return Response({
            'hpa': {
                'id': hpa.id,
                'hpa_number': hpa.hpa_number,
                'balance_rs': float(hpa.balance_rs),
                'advance_paid_rs': float(getattr(hpa, 'advance_paid_rs', 0)),
                'lorry_hire_rs': float(hpa.lorry_hire_rs),
                'payment_status': hpa.payment_status,
            },
            'payments': serializer.data,
            'summary': {
                'total_payments': payments.count(),
                'total_paid': float(total_paid),
                'total_cleared': float(total_cleared),
                'total_pending': float(total_pending),
                'remaining_balance': float(max(0, hpa.balance_rs - total_cleared)),
            }
        })

