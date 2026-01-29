from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import Company, Branch, Party, Truck, ChartOfAccounts, GSTConfig, TDSConfig
from .serializers import (
    CompanySerializer, BranchSerializer, PartySerializer, TruckSerializer,
    ChartOfAccountsSerializer, GSTConfigSerializer, TDSConfigSerializer
)


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.filter(is_deleted=False)
    serializer_class = CompanySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'gstin']
    ordering = ['name']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save()


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.filter(is_deleted=False)
    serializer_class = BranchSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['company']
    search_fields = ['name', 'code']
    ordering = ['name']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save()


class PartyViewSet(viewsets.ModelViewSet):
    queryset = Party.objects.filter(is_deleted=False)
    serializer_class = PartySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'gstin']
    ordering = ['name']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save()


class TruckViewSet(viewsets.ModelViewSet):
    queryset = Truck.objects.filter(is_deleted=False)
    serializer_class = TruckSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['truck_type']
    search_fields = ['truck_number', 'owner_name']
    ordering = ['truck_number']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save()


class ChartOfAccountsViewSet(viewsets.ModelViewSet):
    queryset = ChartOfAccounts.objects.filter(is_deleted=False)
    serializer_class = ChartOfAccountsSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['account_type']
    search_fields = ['account_code', 'account_name']
    ordering = ['account_code']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save()


class GSTConfigViewSet(viewsets.ModelViewSet):
    queryset = GSTConfig.objects.filter(is_deleted=False)
    serializer_class = GSTConfigSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save()


class TDSConfigViewSet(viewsets.ModelViewSet):
    queryset = TDSConfig.objects.filter(is_deleted=False)
    serializer_class = TDSConfigSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save()
