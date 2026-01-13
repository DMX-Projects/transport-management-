from django.db import models
from django.core.validators import MinValueValidator
from apps.masters.models import BaseModel, Branch


class DashboardStats(BaseModel):
    """
    Optimized dashboard statistics table
    Updated in real-time via signals when data changes
    Note: created_by and updated_by are overridden to be nullable for auto-generated stats
    """
    # Override BaseModel fields to make them nullable (stats are auto-generated)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='dashboard_stats_created',
        null=True,
        blank=True,
        help_text='User who triggered stats creation (usually system)'
    )
    updated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='dashboard_stats_updated',
        null=True,
        blank=True,
        help_text='User who last updated stats (usually system)'
    )
    
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name='dashboard_stats',
        help_text='Branch these stats belong to (null for all-branches aggregate)',
        null=True,
        blank=True,
        db_index=True  # Index for branch filtering
    )
    
    # Date range for these stats
    date = models.DateField(
        help_text='Date for daily stats',
        db_index=True  # Index for date filtering
    )
    
    # LR Statistics
    total_lrs = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    pending_lrs = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    in_transit_lrs = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    delivered_lrs = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    cancelled_lrs = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    
    # HPA Statistics
    total_hpas = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    pending_hpas = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    partial_hpas = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    paid_hpas = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    
    # POD Statistics
    total_pods = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    pending_pods = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    delivered_pods = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    
    # Bill Statistics
    total_bills = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    pending_bills = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    paid_bills = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    
    # Financial Statistics
    total_revenue = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Total revenue for the period'
    )
    pending_payments = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Total pending payments'
    )
    total_freight = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Total freight amount'
    )
    
    # Truck Statistics
    active_trucks = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    total_trucks = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    
    # Consignor/Party Statistics
    total_consignors = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    total_parties = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    
    # Metadata
    last_updated = models.DateTimeField(auto_now=True, db_index=True)
    stats_type = models.CharField(
        max_length=20,
        choices=[
            ('DAILY', 'Daily Stats'),
            ('WEEKLY', 'Weekly Stats'),
            ('MONTHLY', 'Monthly Stats'),
            ('YTD', 'Year to Date'),
            ('ALL_TIME', 'All Time'),
        ],
        default='DAILY',
        db_index=True
    )
    
    class Meta:
        db_table = 'dashboard_stats'
        verbose_name = 'Dashboard Statistics'
        verbose_name_plural = 'Dashboard Statistics'
        unique_together = [['branch', 'date', 'stats_type']]
        indexes = [
            models.Index(fields=['branch', 'date', 'stats_type']),
            models.Index(fields=['branch', 'stats_type', '-date']),
            models.Index(fields=['-last_updated']),
            models.Index(fields=['date', 'stats_type']),
        ]
        ordering = ['-date', '-last_updated']
    
    def __str__(self):
        branch_name = self.branch.name if self.branch else 'All Branches'
        return f"{branch_name} - {self.date} - {self.get_stats_type_display()}"

