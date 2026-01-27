from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import ProofOfDelivery
from .serializers import ProofOfDeliverySerializer


class ProofOfDeliveryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Proof of Delivery (POD) records
    Supports: Create, Read, Update (SUPER_ADMIN only)
    Features: Filtering, Search, Pagination, Branch Isolation
    Note: Only SUPER_ADMIN can update records. Delete functionality is disabled.
    """
    queryset = ProofOfDelivery.objects.filter(is_deleted=False)
    serializer_class = ProofOfDeliverySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'status', 'lr', 'hpa']
    search_fields = ['pod_number', 'lr__lr_number', 'delivered_to', 'delivery_date']
    ordering_fields = ['pod_date', 'delivery_date', 'created_at']
    ordering = ['-pod_date']
    
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
        from rest_framework.exceptions import PermissionDenied
        user = self.request.user
        if not user.can_access_all_branches:
            if not user.branch:
                raise PermissionDenied("Branch assignment is required to create POD records.")
            requested_branch = serializer.validated_data.get('branch')
            if requested_branch and requested_branch != user.branch:
                raise PermissionDenied("You can only create PODs for your own branch.")
        pod = serializer.save(
            created_by=user,
            updated_by=user,
            branch=serializer.validated_data.get('branch') or (user.branch if not user.can_access_all_branches else None)
        )
        lr = pod.lr or (pod.hpa.lr if pod.hpa and pod.hpa.lr else None)
        if lr:
            lr.status = 'DELIVERED'
            lr.actual_delivery_date = pod.delivery_date or timezone.now().date()
            lr.updated_by = user
            lr.save(update_fields=['status', 'actual_delivery_date', 'updated_by', 'updated_at'])
    
    def perform_update(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        user = self.request.user
        pod = self.get_object()
        if not user.can_access_all_branches:
            if not user.branch:
                raise PermissionDenied("Branch assignment is required to update POD records.")
            if pod.branch_id != user.branch_id:
                raise PermissionDenied("You can only update PODs for your own branch.")
            requested_branch = serializer.validated_data.get('branch')
            if requested_branch and requested_branch != user.branch:
                raise PermissionDenied("You can only update PODs for your own branch.")
        serializer.save(updated_by=user)
    
    def destroy(self, request, *args, **kwargs):
        # Delete functionality is disabled
        from rest_framework.exceptions import MethodNotAllowed
        raise MethodNotAllowed("DELETE", detail="Delete functionality is disabled.")

