from django.db import models
from django.db.models import Q
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
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
    
    # HPA Number - Uses first LR's number, or generates unique number for multi-LR HPAs
    hpa_number = models.CharField(max_length=20, unique=True, editable=False, help_text='HPA Number (uses first LR number or generated)')
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
    
    # Link to LR - Now supports multiple LRs per HPA
    lr = models.ForeignKey(
        LorryReceipt,
        on_delete=models.PROTECT,
        related_name='primary_hpas',
        help_text='Primary Lorry Receipt (HPA number uses this LR number)',
        null=True,  # Allow null temporarily for migration
        blank=True
    )
    
    # Additional LRs linked to this HPA (ManyToMany for multiple LRs)
    additional_lrs = models.ManyToManyField(
        LorryReceipt,
        related_name='additional_hpas',
        blank=True,
        help_text='Additional Lorry Receipts linked to this HPA'
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
            models.Index(fields=['lr', 'payment_status']),  # Keep for backward compatibility
            models.Index(fields=['truck', 'payment_status']),
            models.Index(fields=['payment_status']),
        ]
    
    def __str__(self):
        truck_number = self.truck.truck_number if self.truck else 'N/A'
        lr_count = self.lrs.count()
        return f"HPA {self.hpa_number} - {truck_number} ({lr_count} LR{'s' if lr_count != 1 else ''})"
    
    @property
    def lrs(self):
        """Get all LRs linked to this HPA (primary + additional)"""
        from apps.lr.models import LorryReceipt
        lr_ids = []
        
        # Add primary LR
        if self.lr_id:
            lr_ids.append(self.lr_id)
        
        # Add additional LRs (only if HPA is saved)
        if self.pk:
            additional_ids = list(self.additional_lrs.values_list('id', flat=True))
            lr_ids.extend(additional_ids)
        
        # Return queryset
        if lr_ids:
            return LorryReceipt.objects.filter(id__in=lr_ids).distinct()
        else:
            return LorryReceipt.objects.none()
    
    @property
    def primary_lr(self):
        """Get the primary LR (for backward compatibility)"""
        return self.lr
    
    @property
    def has_bill(self):
        """Check if this HPA has an associated bill"""
        from apps.billing.models import BillLineItem
        return BillLineItem.objects.filter(hpa=self).exists()
    
    @property
    def is_pending_bill(self):
        """Check if this HPA is pending bill creation"""
        return not self.has_bill
    
    @property
    def total_tons(self):
        """Calculate total tons from all linked LRs"""
        total = Decimal('0')
        for lr in self.lrs:
            total += lr.total_quantity_mt if hasattr(lr, 'total_quantity_mt') else (lr.quantity_mt or Decimal('0'))
        return total
    
    def save(self, *args, **kwargs):
        # Set HPA number from first LR if not set
        if not self.hpa_number:
            if self.lr:
                self.hpa_number = self.lr.lr_number
            else:
                # Get from linked LRs if lr field is not set
                linked_lrs = self.lrs if self.pk else []
                if linked_lrs.exists():
                    first_lr = linked_lrs.first()
                    self.hpa_number = first_lr.lr_number
                else:
                    # Generate unique number if no LRs yet
                    from django.db.models import Max
                    last_hpa = HirePaymentAdvice.objects.aggregate(Max('id'))
                    next_id = (last_hpa['id__max'] or 0) + 1
                    self.hpa_number = f"HPA-{next_id:04d}"
        
        # Auto-populate from primary LR if not set
        primary_lr = self.lr
        if primary_lr:
            if not self.branch_id:
                self.branch = primary_lr.branch
            if not self.truck_id:
                self.truck = primary_lr.truck
            if not self.from_location:
                self.from_location = primary_lr.from_location or primary_lr.primary_from_location
            if not self.to_location:
                self.to_location = primary_lr.to_location or primary_lr.primary_to_location
            if not self.driver_name:
                self.driver_name = primary_lr.driver_name
            if not self.driver_mob:
                self.driver_mob = primary_lr.driver_phone
            if not self.lr_reference:
                # For multiple LRs, show first LR number or combined
                lr_numbers = [lr.lr_number for lr in self.lrs[:3]]
                if len(lr_numbers) > 1:
                    self.lr_reference = f"{lr_numbers[0]} (+{len(lr_numbers)-1} more)" if len(lr_numbers) > 1 else lr_numbers[0]
                else:
                    self.lr_reference = primary_lr.lr_number
            # Calculate tons from all linked LRs
            if not self.tons or self.tons == 0:
                self.tons = self.total_tons
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
        
        # Calculate balance (amount due after deductions, minus payments made)
        # balance_rs = lorry_hire - deductions - payments_made
        # This represents the remaining amount to be paid
        amount_due = self.lorry_hire_rs - self.total_deductions
        self.balance_rs = max(Decimal('0'), amount_due - self.paid_amount)
        
        # Update payment status
        if self.balance_rs <= 0 and amount_due > 0:
            self.payment_status = 'PAID'
        elif self.paid_amount > 0 and self.balance_rs > 0:
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
        
        # AUTO-CREATE PAYMENT if advance_paid_rs is set on creation
        if is_new and self.advance_paid_rs > 0 and self.created_by:
            from apps.payments.models import Payment
            # Check if payment already exists
            if not self.payments.filter(amount=self.advance_paid_rs, status='CLEARED').exists():
                Payment.objects.create(
                    hpa=self,
                    branch=self.branch,
                    payment_date=self.hpa_date,
                    payment_method='CASH',
                    amount=self.advance_paid_rs,
                    status='CLEARED',
                    received_by='Driver (Advance)',
                    remarks='Auto-created advance payment on HPA creation',
                    created_by=self.created_by,
                    updated_by=self.created_by
                )
