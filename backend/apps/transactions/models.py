from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from apps.masters.models import BaseModel, Branch
from apps.lr.models import LorryReceipt
from apps.hpa.models import HirePaymentAdvice


class PaymentTransaction(BaseModel):
    """
    Track all payments between Capital Logistics and trucks/drivers
    Replaces manual payment tracking with comprehensive transaction log
    Based on physical HPA form payment breakdown:
    - Lorry Hire Rs.
    - Less Advance
    - Diesel (with Pump Name)
    - Bank
    - Balance Rs.
    """
    PAYMENT_TYPE_CHOICES = [
        ('ADVANCE', 'Advance Payment'),
        ('DIESEL', 'Diesel Payment'), 
        ('BANK', 'Bank Transfer'),
        ('BALANCE', 'Balance Payment'),
        ('DEDUCTION', 'Deduction'),
        ('TOLL', 'Toll Payment'),
        ('COMMISSION', 'Commission'),
        ('OTHER', 'Other Charges'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CHEQUE', 'Cheque'),
        ('UPI', 'UPI'),
        ('RTGS', 'RTGS/NEFT'),
        ('FUEL_CARD', 'Fuel Card'),
    ]
    
    # Branch for data isolation
    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name='payment_transactions',
        help_text='Branch this payment belongs to'
    )
    
    # Link to HPA
    hpa = models.ForeignKey(
        HirePaymentAdvice, 
        on_delete=models.PROTECT,
        related_name='payment_transactions'
    )
    
    # Payment Details
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES)
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    
    # Reference Information
    reference_number = models.CharField(max_length=100, blank=True, help_text='Transaction/Cheque/Reference number')
    pump_name = models.CharField(max_length=100, blank=True, help_text='Diesel pump name')
    bank_name = models.CharField(max_length=100, blank=True)
    
    # Additional Details
    remarks = models.TextField(blank=True)
    attachment = models.FileField(upload_to='payment_attachments/', blank=True, null=True)
    
    class Meta:
        db_table = 'payment_transactions'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['hpa', 'payment_type']),
            models.Index(fields=['payment_date']),
            models.Index(fields=['branch', 'payment_date']),
        ]
    
    def __str__(self):
        return f"{self.hpa.hpa_number} - {self.get_payment_type_display()} - ₹{self.amount}"


class HPALRLink(BaseModel):
    """
    Many-to-Many relationship between HPA and LRs with rate/amount data
    Allows single HPA to include multiple LRs with different rates
    
    This replaces the simple ManyToMany relationship with a through table
    that carries additional data about each LR within the HPA.
    """
    # Branch for data isolation
    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name='hpa_lr_links',
        help_text='Branch this link belongs to'
    )
    
    hpa = models.ForeignKey(
        HirePaymentAdvice, 
        on_delete=models.CASCADE, 
        related_name='lr_links'
    )
    lr = models.ForeignKey(
        LorryReceipt, 
        on_delete=models.CASCADE, 
        related_name='hpa_links'
    ) 
    
    # Rate and Amount for this specific LR in this HPA
    tonnage = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Tonnage for this LR in this HPA'
    )
    rate_per_tonne = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Rate per tonne for this LR'
    )
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Total amount for this LR (tonnage × rate)'
    )
    
    # Optional override fields
    special_rate_reason = models.CharField(
        max_length=200, 
        blank=True, 
        help_text='Reason for special rate if different from standard'
    )
    
    class Meta:
        db_table = 'hpa_lr_links'
        unique_together = [['hpa', 'lr']]
        ordering = ['hpa', 'lr__lr_number']
        indexes = [
            models.Index(fields=['hpa']),
            models.Index(fields=['lr']),
            models.Index(fields=['branch']),
        ]
    
    def __str__(self):
        return f"HPA {self.hpa.hpa_number} ↔ LR {self.lr.lr_number}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate amount if not provided
        if not self.amount and self.tonnage and self.rate_per_tonne:
            self.amount = self.tonnage * self.rate_per_tonne
        super().save(*args, **kwargs)
