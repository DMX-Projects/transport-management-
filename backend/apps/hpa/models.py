from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from apps.masters.models import BaseModel, Branch, Truck
from apps.lr.models import LorryReceipt


class HirePaymentAdvice(BaseModel):
    """
    HPA (Hire Payment Advice) - Created when driver returns after loading
    CRITICAL: HPA number MUST match LR number
    This document is given to driver before unloading
    """
    
    PAYMENT_STATUS_CHOICES = [
        ('PENDING_BILL', 'Pending Bill Creation'),
        ('PENDING', 'Pending Payment'),
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
    
    # HPA Number - MUST match LR number (same number as LR)
    hpa_number = models.CharField(max_length=20, unique=True, editable=False, help_text='Same as LR Number')
    invoice_number = models.CharField(max_length=50, blank=True, help_text='Invoice/Serial number (e.g., 20153572)')
    hpa_date = models.DateField(default=timezone.now)
    
    # Branch
    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name='hire_payment_advices',
        help_text='Branch creating this HPA',
        null=True,  # Allow null temporarily for migration, will be set from LR
        blank=True
    )
    
    # Link to LR - CRITICAL: Same number relationship
    lr = models.OneToOneField(
        LorryReceipt,
        on_delete=models.PROTECT,
        related_name='hpa',
        help_text='Linked Lorry Receipt (HPA number matches LR number)'
    )
    
    # Vehicle and Driver Details (usually same as LR, but can be updated)
    truck = models.ForeignKey(
        Truck,
        on_delete=models.PROTECT,
        related_name='hire_payment_advices',
        help_text='Truck (auto-populated from LR, can be updated)'
    )
    
    # Location Details
    from_location = models.CharField(max_length=200, help_text='Loading location (from LR, can be updated)')
    to_location = models.CharField(max_length=200, help_text='Unloading destination (from LR, can be updated)')
    
    # Owner Details (if different from truck master)
    owner_name = models.CharField(max_length=200, blank=True, help_text='Owner name (if different)')
    owner_mob = models.CharField(max_length=15, blank=True, help_text='Owner mobile (if different)')
    
    # Driver Details (usually same as LR, but can be updated)
    driver_name = models.CharField(max_length=200, help_text='Driver name')
    driver_mob = models.CharField(max_length=15, blank=True, default='', help_text='Driver mobile')
    
    # LR Reference (shown on form, references the linked LR)
    lr_reference = models.CharField(max_length=50, blank=True, help_text='LR Number reference (for display)')
    
    # Quantity and Rate
    tons = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Quantity in tons (from LR)'
    )
    rate_per_tonne = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Rate per tonne'
    )
    
    # Financial Breakdown
    lorry_hire_rs = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Total lorry hire amount (Tons × Rate per Tonne)'
    )
    advance_paid_rs = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Less Advance amount (deducted from lorry hire)'
    )
    diesel_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Diesel cost'
    )
    pump_name = models.CharField(max_length=200, blank=True, help_text='Diesel pump name')
    bank_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Bank deduction/amount'
    )
    other_deductions = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Any other deductions'
    )
    other_deductions_description = models.TextField(blank=True, help_text='Description of other deductions')
    
    # Calculated Fields
    total_deductions = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        editable=False,
        help_text='Total deductions (advance + diesel + bank + others)'
    )
    balance_rs = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        editable=False,
        help_text='Balance amount to be paid (Lorry Hire - Total Deductions)'
    )
    
    # Payment Status (after POD received)
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='PENDING',
        help_text='Payment status after delivery'
    )
    paid_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Amount actually paid to driver'
    )
    payment_date = models.DateField(blank=True, null=True, help_text='Date when balance was paid')
    payment_mode = models.CharField(
        max_length=20,
        choices=PAYMENT_MODE_CHOICES,
        blank=True,
        help_text='Mode of payment (Cash/Cheque/Bank Transfer/UPI)'
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
        truck_number = self.truck.truck_number if self.truck else 'N/A'
        return f"HPA {self.hpa_number} - {truck_number}"
    
    @property
    def has_bill(self):
        """Check if this HPA has an associated bill"""
        return False
    
    @property
    def is_pending_bill(self):
        """Check if this HPA is pending bill creation"""
        return not self.has_bill
    
    def save(self, *args, **kwargs):
        # CRITICAL: HPA number MUST match LR number
        if self.lr and not self.hpa_number:
            self.hpa_number = self.lr.lr_number
        
        # Auto-populate from LR if not set
        if self.lr:
            if not self.branch_id:
                self.branch = self.lr.branch
            if not self.truck_id:
                self.truck = self.lr.truck
            if not self.from_location:
                self.from_location = self.lr.from_location
            if not self.to_location:
                self.to_location = self.lr.to_location
            if not self.driver_name:
                self.driver_name = self.lr.driver_name
            if not self.driver_mob:
                self.driver_mob = self.lr.driver_phone
            if not self.lr_reference:
                self.lr_reference = self.lr.lr_number
            if not self.tons:
                self.tons = self.lr.quantity_mt
            # Note: rate_per_tonne is not in LR - it must be set when creating HPA
        
        # Calculate lorry hire if tons and rate provided
        if self.tons and self.rate_per_tonne:
            self.lorry_hire_rs = self.tons * self.rate_per_tonne
        
        # Calculate total deductions
        self.total_deductions = (
            self.advance_paid_rs +
            self.diesel_amount +
            self.bank_amount +
            self.other_deductions
        )
        
        # Calculate balance
        self.balance_rs = self.lorry_hire_rs - self.total_deductions
        
        # Update payment status
        if self.paid_amount >= self.balance_rs and self.balance_rs > 0:
            self.payment_status = 'PAID'
        elif self.paid_amount > 0:
            self.payment_status = 'PARTIAL'
        else:
            self.payment_status = 'PENDING'
        
        # Track if advance changed (for auto-payment creation)
        advance_changed = False
        if self.pk:
            try:
                old_instance = HirePaymentAdvice.objects.get(pk=self.pk)
                advance_changed = old_instance.advance_paid_rs != self.advance_paid_rs
            except HirePaymentAdvice.DoesNotExist:
                pass
        else:
            advance_changed = self.advance_paid_rs > 0
        
        is_new = not self.pk
        super().save(*args, **kwargs)
