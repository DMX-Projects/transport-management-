from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import HirePaymentAdvice
from .serializers import (
    HirePaymentAdviceSerializer,
    HirePaymentAdviceCreateSerializer,
    HirePaymentAdviceUpdateSerializer
)


class HirePaymentAdviceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for HPA Management
    Supports: Create, Read, Update, Soft Delete
    Features: Filtering, Search, Pagination, Payment Tracking
    """
    queryset = HirePaymentAdvice.objects.filter(is_deleted=False)
    serializer_class = HirePaymentAdviceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['truck', 'lr', 'payment_status']
    search_fields = ['hpa_number', 'lr__lr_number', 'truck__truck_number']
    ordering_fields = ['hpa_date', 'created_at', 'balance_amount']
    ordering = ['-created_at']
    
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
        serializer.save(updated_by=self.request.user)
    
    def perform_destroy(self, instance):
        # Soft delete
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save()
    
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
        total_freight = sum(hpa.freight_amount for hpa in hpas)
        total_paid = sum(hpa.paid_amount for hpa in hpas)
        total_balance = sum(hpa.balance_amount for hpa in hpas)
        
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
        
        hpa.paid_amount = hpa.balance_amount
        hpa.payment_date = payment_date
        hpa.payment_mode = payment_mode
        hpa.payment_status = 'PAID'
        hpa.updated_by = request.user
        hpa.save()
        
        serializer = self.get_serializer(hpa)
        return Response(serializer.data)
