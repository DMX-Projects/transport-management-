from django.db import models
from django.db.models import Q
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
from apps.masters.models import BaseModel, Branch, Truck
from apps.lr.models import LorryReceipt


class HirePaymentAdvice(BaseModel):
    """
    HPA (Hire Payment Advice) - Payment agreement between company and truck owner/driver
    Created when truck is hired for transporting goods
    Matches physical HPA form from Capital Logistics
    """
    
    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending Payment'),
        ('PENDING_BILL', 'Pending Bill'),
        ('PARTIAL', 'Partially Paid'),
        ('PAID', 'Fully Paid'),
    ]
    
    PAYMENT_MODE_CHOICES = [
        ('CASH', 'Cash'),
        ('CHEQUE', 'Cheque'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('UPI', 'UPI'),
        ('BANK', 'Bank'),
    ]
    
    # HPA Number - Auto-generated based on sequence
    hpa_number = models.CharField(
        max_length=20, 
        unique=True, 
        editable=False,
        help_text='HPA Number (e.g., 10003)'
    )
    
    # Invoice Number
    invoice_number = models.CharField(
        max_length=50,
        blank=True,
        help_text='Invoice/Serial number (e.g., 20153572)'
    )
    
    # Date
    hpa_date = models.DateField(default=timezone.now)
    
    # Branch
    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name='hire_payment_advices',
        null=True,
        blank=True,
        help_text='Branch creating this HPA'
    )
    
    # Primary LR Reference (for backward compatibility)
    lr = models.ForeignKey(
        LorryReceipt,
        on_delete=models.PROTECT,
        related_name='primary_hpas',
        help_text='Primary Lorry Receipt',
        null=True,
        blank=True
    )
    
    # Additional LRs (for multiple LR support)
    additional_lrs = models.ManyToManyField(
        LorryReceipt,
        related_name='additional_hpas',
        blank=True,
        help_text='Additional Lorry Receipts'
    )
    
    # Location Details (from physical form)
    from_location = models.CharField(max_length=200, help_text='Loading location (e.g., Chettinad Dachepalli)')
    to_location = models.CharField(max_length=200, help_text='Unloading destination (e.g., Proddatur)')
    
    # Truck Details
    truck = models.ForeignKey(
        Truck,
        on_delete=models.PROTECT,
        related_name='hire_payment_advices',
        help_text='Truck'
    )
    
    # Owner Details (from physical form)
    owner_name = models.CharField(max_length=200, blank=True, help_text='Owner name')
    owner_mob = models.CharField(max_length=15, blank=True, help_text='Owner mobile')
    
    # Driver Details (from physical form)
    driver_name = models.CharField(max_length=200, help_text='Driver name')
    driver_mob = models.CharField(max_length=15, blank=True, default='', help_text='Driver mobile')
    
    # LR Reference (for display)
    lr_reference = models.CharField(max_length=50, blank=True, help_text='LR Number reference')
    
    # Tonnage and Rate (from physical form)
    tons = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Quantity in tons'
    )
    rate_per_tonne = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Rate per tonne'
    )
    
    # Calculated Fields
    lorry_hire_rs = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Total lorry hire amount (Tons × Rate per Tonne)'
    )
    
    # Payment Breakdown (from physical form)
    less_advance = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Less Advance paid'
    )
    diesel_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Diesel payment'
    )
    pump_name = models.CharField(max_length=200, blank=True, help_text='Diesel pump name')
    bank_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Bank transfer amount'
    )
    bank_name = models.CharField(max_length=200, blank=True, help_text='Bank name for transfer')
    other_deductions = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Any other deductions'
    )
    other_deductions_description = models.TextField(blank=True, help_text='Description of other deductions/charges')
    
    # Calculated Totals
    total_deductions = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        editable=False,
        help_text='Total deductions'
    )
    balance_rs = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        editable=False,
        help_text='Balance amount to be paid'
    )
    
    # Payment Status
    payment_status = models.CharField(
        max_length=20, 
        choices=PAYMENT_STATUS_CHOICES, 
        default='PENDING',
        help_text='Payment status'
    )
    paid_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Amount actually paid'
    )
    payment_date = models.DateField(null=True, blank=True, help_text='Date when payment was made')
    payment_mode = models.CharField(
        max_length=20, 
        choices=PAYMENT_MODE_CHOICES, 
        blank=True,
        help_text='Mode of payment'
    )
    
    # Notes
    note = models.TextField(
        blank=True,
        default='I have received above quantity in good condition & I am responsible for good delivery to the party\nminimum 3 Delivery',
        help_text='Note on HPA form'
    )
    remarks = models.TextField(blank=True, help_text='Additional remarks')
    
    class Meta:
        db_table = 'hire_payment_advices'
        ordering = ['-hpa_date', '-hpa_number']
        verbose_name = 'Hire Payment Advice (HPA)'
        verbose_name_plural = 'Hire Payment Advices (HPA)'
        indexes = [
            models.Index(fields=['hpa_number']),
            models.Index(fields=['branch', 'hpa_date']),
            models.Index(fields=['lr', 'payment_status']),
            models.Index(fields=['truck', 'payment_status']),
            models.Index(fields=['payment_status']),
        ]
    
    def __str__(self):
        return f"HPA-{self.hpa_number}"
    
    @property
    def all_lrs(self):
        """Get all LRs (primary + additional)"""
        lrs = []
        if self.lr:
            lrs.append(self.lr)
        lrs.extend(list(self.additional_lrs.all()))
        return lrs
    
    @property
    def total_tons(self):
        """Total tonnage from all linked LRs"""
        total = self.tons
        for lr in self.additional_lrs.all():
            if hasattr(lr, 'quantity_mt'):
                total += lr.quantity_mt or Decimal('0')
        return total

    @property
    def is_active(self):
        """Check if HPA is active (pending payment or has active LRs/PODs)"""
        # HPA is active if payment is not fully completed
        if self.payment_status in ['PENDING', 'PENDING_BILL', 'PARTIAL']:
            return True
        
        # Check if any linked LRs are still in transit
        for lr in self.all_lrs:
            if lr and lr.status in ['LOADING', 'IN_TRANSIT', 'UNLOADING']:
                return True
        
        # Check if POD exists and is not delivered
        try:
            if hasattr(self, 'pod') and self.pod:
                if self.pod.status in ['PENDING', 'IN_TRANSIT', 'PARTIAL_DELIVERED']:
                    return True
        except:
            pass
            
        return False

    @property
    def days_active(self):
        """Calculate number of days HPA has been active"""
        from django.utils import timezone
        if self.hpa_date:
            delta = timezone.now().date() - self.hpa_date
            return delta.days
        return 0

    @property
    def is_overdue(self):
        """Check if HPA is overdue (active for more than expected time)"""
        # Consider HPA overdue if it's been active for more than 15 days
        return self.is_active and self.days_active > 15

    @property
    def days_active_category(self):
        """Categorize HPA by days active"""
        days = self.days_active
        if days <= 3:
            return 'NEW'  # 0-3 days
        elif days <= 7:
            return 'ACTIVE'  # 4-7 days
        elif days <= 15:
            return 'AGING'  # 8-15 days
        else:
            return 'OVERDUE'  # 15+ days

    @property
    def has_pod(self):
        """Check if HPA has an associated POD"""
        try:
            return hasattr(self, 'pod') and self.pod is not None
        except:
            return False

    @property
    def pod_status(self):
        """Get POD status if exists"""
        try:
            if hasattr(self, 'pod') and self.pod:
                return self.pod.status
        except:
            pass
        return 'NO_POD'

    def calculate_amounts(self):
        """Calculate lorry hire and balance"""
        self.lorry_hire_rs = self.tons * self.rate_per_tonne
        self.total_deductions = (
            self.less_advance + 
            self.diesel_amount + 
            self.bank_amount + 
            self.other_deductions
        )
        self.balance_rs = self.lorry_hire_rs - self.total_deductions

    def save(self, *args, **kwargs):
        # Auto-generate HPA number
        if not self.hpa_number:
            from django.db.models import Max
            last_hpa = HirePaymentAdvice.objects.aggregate(Max('id'))['id__max'] or 10000
            self.hpa_number = str(last_hpa + 1)
        
        # Calculate amounts
        self.calculate_amounts()
        
        super().save(*args, **kwargs)


# Import HPAInvoice from separate file to maintain backward compatibility
from .invoice_models import HPAInvoice
