from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from apps.masters.models import BaseModel, Branch
from apps.hpa.models import HirePaymentAdvice


class Payment(BaseModel):
    """
    Payment Record - Tracks all payments made against an HPA
    Supports multiple payment methods: Cash, Cheque, UPI, Bank Transfer
    """
    
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('CHEQUE', 'Cheque'),
        ('UPI', 'UPI'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('NEFT', 'NEFT'),
        ('RTGS', 'RTGS'),
        ('IMPS', 'IMPS'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CLEARED', 'Cleared'),
        ('BOUNCED', 'Bounced'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    # Payment Number - Auto-generated
    payment_number = models.CharField(max_length=50, unique=True, editable=False, help_text='Auto-generated payment number')
    payment_date = models.DateField(default=timezone.now, help_text='Payment date')
    
    # Branch
    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name='payments',
        help_text='Branch processing this payment',
        null=True,
        blank=True
    )
    
    # Link to HPA - CRITICAL: All payments are against an HPA
    hpa = models.ForeignKey(
        HirePaymentAdvice,
        on_delete=models.PROTECT,
        related_name='payments',
        help_text='HPA this payment is against',
        db_index=True
    )
    
    # Payment Method
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        help_text='Payment method used'
    )
    
    # Payment Amount
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Payment amount'
    )
    
    # Payment Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        help_text='Payment status'
    )
    
    # Cheque Details (if payment_method is CHEQUE)
    cheque_number = models.CharField(
        max_length=50,
        blank=True,
        help_text='Cheque number (required if payment method is Cheque)',
        db_index=True
    )
    cheque_date = models.DateField(
        blank=True,
        null=True,
        help_text='Cheque date'
    )
    bank_name = models.CharField(
        max_length=200,
        blank=True,
        help_text='Bank name (for cheque/bank transfer)'
    )
    clearing_date = models.DateField(
        blank=True,
        null=True,
        help_text='Cheque clearing date'
    )
    
    # UPI Details (if payment_method is UPI)
    upi_transaction_id = models.CharField(
        max_length=100,
        blank=True,
        help_text='UPI Transaction ID/Reference Number',
        db_index=True
    )
    upi_id = models.CharField(
        max_length=100,
        blank=True,
        help_text='UPI ID (e.g., phone@paytm, name@ybl)'
    )
    
    # Bank Transfer Details (if payment_method is BANK_TRANSFER/NEFT/RTGS/IMPS)
    transaction_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text='Transaction reference number (for bank transfers)',
        db_index=True
    )
    account_number = models.CharField(
        max_length=50,
        blank=True,
        help_text='Account number (last 4 digits)'
    )
    ifsc_code = models.CharField(
        max_length=11,
        blank=True,
        help_text='IFSC code'
    )
    
    # Cash Details (if payment_method is CASH)
    received_by = models.CharField(
        max_length=200,
        blank=True,
        help_text='Person who received cash payment'
    )
    cash_receipt_number = models.CharField(
        max_length=50,
        blank=True,
        help_text='Cash receipt number (if any)'
    )
    
    # Additional Details
    remarks = models.TextField(blank=True, help_text='Payment remarks/notes')
    attachment = models.FileField(
        upload_to='payments/',
        blank=True,
        null=True,
        help_text='Payment proof/document attachment'
    )
    
    # Reconciliation
    reconciled = models.BooleanField(default=False, help_text='Payment reconciled')
    reconciled_date = models.DateField(blank=True, null=True, help_text='Reconciliation date')
    reconciled_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reconciled_payments',
        help_text='User who reconciled this payment'
    )
    
    class Meta:
        db_table = 'payments'
        ordering = ['-payment_date', '-payment_number']
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        indexes = [
            models.Index(fields=['hpa', 'payment_date']),
            models.Index(fields=['payment_method', 'status']),
            models.Index(fields=['payment_date', 'status']),
            models.Index(fields=['cheque_number']),
            models.Index(fields=['upi_transaction_id']),
            models.Index(fields=['transaction_reference']),
            models.Index(fields=['branch', 'payment_date']),
        ]
    
    def __str__(self):
        return f"Payment {self.payment_number} - {self.amount} ({self.get_payment_method_display()})"
    
    def save(self, *args, **kwargs):
        # Auto-generate payment number if not exists
        if not self.payment_number:
            branch = self.branch or (self.hpa.branch if self.hpa else None)
            if branch:
                last_payment = Payment.objects.filter(
                    branch=branch
                ).order_by('-id').first()
                
                if last_payment and last_payment.payment_number:
                    try:
                        prefix = branch.payment_prefix if hasattr(branch, 'payment_prefix') and branch.payment_prefix else "PAY"
                        payment_num = last_payment.payment_number.replace(f"{prefix}-", "").replace(prefix, "")
                        last_num = int(payment_num) if payment_num.isdigit() else 0
                        new_num = last_num + 1
                    except (ValueError, AttributeError):
                        new_num = 1
                else:
                    new_num = 1
                
                prefix = branch.payment_prefix if hasattr(branch, 'payment_prefix') and branch.payment_prefix else "PAY"
                self.payment_number = f"{prefix}-{new_num:04d}"
            else:
                # Fallback if no branch
                last_payment = Payment.objects.order_by('-id').first()
                if last_payment and last_payment.payment_number:
                    try:
                        payment_num = last_payment.payment_number.replace("PAY-", "")
                        last_num = int(payment_num) if payment_num.isdigit() else 0
                        new_num = last_num + 1
                    except (ValueError, AttributeError):
                        new_num = 1
                else:
                    new_num = 1
                self.payment_number = f"PAY-{new_num:04d}"
        
        # Auto-populate branch from HPA if not set
        if not self.branch and self.hpa and self.hpa.branch:
            self.branch = self.hpa.branch
        
        super().save(*args, **kwargs)
        
        # Update HPA payment status after payment is saved
        if self.hpa:
            self._update_hpa_payment_status()
    
    def _update_hpa_payment_status(self):
        """Update HPA payment status based on total payments"""
        # Get all cleared payments for this HPA
        total_cleared = Payment.objects.filter(
            hpa=self.hpa,
            status='CLEARED'
        ).exclude(id=self.id if self.pk else None).aggregate(
            total=models.Sum('amount')
        )['total'] or 0
        
        # Add current payment if it's cleared
        if self.status == 'CLEARED':
            total_cleared += self.amount
        
        # Note: balance_rs already accounts for all deductions (advance_paid_rs, diesel, bank, etc.)
        # So we check if cleared payments cover the remaining balance_rs
        if total_cleared >= self.hpa.balance_rs:
            self.hpa.payment_status = 'PAID'
        elif total_cleared > 0:
            self.hpa.payment_status = 'PARTIAL'
        else:
            self.hpa.payment_status = 'PENDING'
        
        self.hpa.save(update_fields=['payment_status'])

