from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from apps.masters.models import BaseModel
from apps.lr.models import LorryReceipt
from apps.hpa.models import HirePaymentAdvice


class PaymentTransaction(BaseModel):
    """
    Track all payments between Capital Logistics and trucks/drivers
    Replaces manual payment tracking with comprehensive transaction log
    """
    PAYMENT_TYPE_CHOICES = [
        ('ADVANCE', 'Advance Payment'),
        ('DIESEL', 'Diesel Payment'), 
        ('HPA_PAYMENT', 'HPA Final Payment'),
        ('DEDUCTION', 'Deduction'),
        ('BONUS', 'Bonus Payment'),
        ('TOLL', 'Toll Payment'),
        ('COMMISSION', 'Commission'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CHEQUE', 'Cheque'),
        ('UPI', 'UPI'),
        ('RTGS', 'RTGS/NEFT'),
    ]
    
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
        ]
    
    def __str__(self):
        return f"{self.hpa.hpa_number} - {self.get_payment_type_display()} - ₹{self.amount}"


class ProofOfDelivery(BaseModel):
    """
    Proof of Delivery/Acknowledgment system
    Links LR completion to enable billing
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending Upload'),
        ('UPLOADED', 'Uploaded'),
        ('VERIFIED', 'Verified'),
        ('REJECTED', 'Rejected'),
    ]
    
    # Primary Links
    lr = models.OneToOneField(
        LorryReceipt, 
        on_delete=models.PROTECT,
        related_name='pod'
    )
    hpa = models.ForeignKey(
        HirePaymentAdvice, 
        on_delete=models.PROTECT,
        related_name='pods'
    )
    
    # Delivery Information
    delivery_date = models.DateField()
    actual_delivery_time = models.TimeField(blank=True, null=True)
    delivery_location = models.CharField(max_length=300, help_text='Actual delivery address')
    
    # Recipient Information  
    received_by_name = models.CharField(max_length=200)
    received_by_designation = models.CharField(max_length=100, blank=True)
    received_by_phone = models.CharField(max_length=15, blank=True)
    received_by_company = models.CharField(max_length=200, blank=True)
    
    # Documents
    received_by_signature = models.ImageField(upload_to='pod_signatures/', blank=True, null=True)
    pod_document = models.FileField(upload_to='pod_documents/', blank=True, null=True)
    delivery_photos = models.JSONField(default=list, blank=True, help_text='List of delivery photo URLs')
    
    # Status and Verification
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    verification_remarks = models.TextField(blank=True)
    verified_by = models.ForeignKey(
        'accounts.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='verified_pods'
    )
    verified_at = models.DateTimeField(blank=True, null=True)
    
    # Quality Metrics
    on_time_delivery = models.BooleanField(default=True)
    condition_rating = models.IntegerField(
        default=5, 
        validators=[MinValueValidator(1)], 
        help_text='Delivery condition rating (1-5)'
    )
    customer_feedback = models.TextField(blank=True)
    
    class Meta:
        db_table = 'proof_of_delivery'
        ordering = ['-delivery_date', '-created_at']
        indexes = [
            models.Index(fields=['lr', 'hpa']),
            models.Index(fields=['delivery_date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"POD for LR {self.lr.lr_number} - HPA {self.hpa.hpa_number}"
    
    @property
    def can_create_bill(self):
        """Check if POD is complete enough to allow bill creation"""
        return self.status in ['VERIFIED'] and self.delivery_date
    
    def save(self, *args, **kwargs):
        # Auto-set verification timestamp
        if self.status == 'VERIFIED' and not self.verified_at:
            from django.utils import timezone
            self.verified_at = timezone.now()
        super().save(*args, **kwargs)


class HPALRLink(BaseModel):
    """
    Many-to-Many relationship between HPA and LRs with rate/amount data
    Allows single HPA to include multiple LRs with different rates
    """
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
        ]
    
    def __str__(self):
        return f"HPA {self.hpa.hpa_number} ↔ LR {self.lr.lr_number}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate amount if not provided
        if not self.amount and self.tonnage and self.rate_per_tonne:
            self.amount = self.tonnage * self.rate_per_tonne
        super().save(*args, **kwargs)