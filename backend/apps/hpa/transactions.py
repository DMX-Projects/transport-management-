from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
from apps.masters.models import BaseModel, Branch
from .models import HirePaymentAdvice


class HPATransaction(BaseModel):
    """
    HPA Transaction - Tracks all transactions related to an HPA
    Includes: Advance payments, Diesel costs, Extra charges, Bank deductions, etc.
    """
    
    TRANSACTION_TYPE_CHOICES = [
        ('ADVANCE', 'Advance Payment'),
        ('DIESEL', 'Diesel'),
        ('BANK', 'Bank Deduction'),
        ('EXTRA', 'Extra Charge'),
        ('OTHER', 'Other Deduction'),
        ('BALANCE_PAYMENT', 'Balance Payment'),  # For final balance payments
    ]
    
    PAYMENT_MODE_CHOICES = [
        ('CASH', 'Cash'),
        ('CHEQUE', 'Cheque'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('UPI', 'UPI'),
        ('NEFT', 'NEFT'),
        ('RTGS', 'RTGS'),
        ('IMPS', 'IMPS'),
    ]
    
    # Transaction Number - Auto-generated
    transaction_number = models.CharField(
        max_length=50, 
        unique=True, 
        editable=False, 
        help_text='Auto-generated transaction number'
    )
    transaction_date = models.DateField(
        default=timezone.now, 
        help_text='Transaction date'
    )
    
    # Branch
    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name='hpa_transactions',
        help_text='Branch processing this transaction',
        null=True,
        blank=True
    )
    
    # Link to HPA - CRITICAL: All transactions are against an HPA
    hpa = models.ForeignKey(
        HirePaymentAdvice,
        on_delete=models.PROTECT,
        related_name='transactions',
        help_text='HPA this transaction is against',
        db_index=True
    )
    
    # Transaction Type
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPE_CHOICES,
        help_text='Type of transaction'
    )
    
    # Transaction Amount
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Transaction amount'
    )
    
    # Payment Mode (for advance payments)
    payment_mode = models.CharField(
        max_length=20,
        choices=PAYMENT_MODE_CHOICES,
        blank=True,
        help_text='Payment mode (for advance payments)'
    )
    
    # Additional Details based on transaction type
    pump_name = models.CharField(
        max_length=200, 
        blank=True, 
        help_text='Diesel pump name (for DIESEL type)'
    )
    
    cheque_number = models.CharField(
        max_length=50,
        blank=True,
        help_text='Cheque number (if payment mode is Cheque)'
    )
    
    bank_name = models.CharField(
        max_length=200,
        blank=True,
        help_text='Bank name'
    )
    
    upi_transaction_id = models.CharField(
        max_length=100,
        blank=True,
        help_text='UPI Transaction ID'
    )
    
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        help_text='Reference/Transaction number'
    )
    
    # Description
    description = models.TextField(
        blank=True, 
        help_text='Description of the transaction'
    )
    
    remarks = models.TextField(
        blank=True, 
        help_text='Additional remarks/notes'
    )
    
    # Attachment
    attachment = models.FileField(
        upload_to='hpa_transactions/',
        blank=True,
        null=True,
        help_text='Transaction proof/document attachment'
    )
    
    class Meta:
        db_table = 'hpa_transactions'
        ordering = ['-transaction_date', '-transaction_number']
        verbose_name = 'HPA Transaction'
        verbose_name_plural = 'HPA Transactions'
        indexes = [
            models.Index(fields=['hpa', 'transaction_date']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['transaction_date']),
            models.Index(fields=['branch', 'transaction_date']),
        ]
    
    def __str__(self):
        return f"Transaction {self.transaction_number} - {self.get_transaction_type_display()} - ₹{self.amount}"
    
    def save(self, *args, **kwargs):
        # Auto-generate transaction number if not exists
        if not self.transaction_number:
            branch = self.branch or (self.hpa.branch if self.hpa else None)
            if branch:
                last_transaction = HPATransaction.objects.filter(
                    branch=branch
                ).order_by('-id').first()
                
                if last_transaction and last_transaction.transaction_number:
                    try:
                        prefix = "TXN"
                        txn_num = last_transaction.transaction_number.replace(f"{prefix}-", "").replace(prefix, "")
                        last_num = int(txn_num) if txn_num.isdigit() else 0
                        new_num = last_num + 1
                    except (ValueError, AttributeError):
                        new_num = 1
                else:
                    new_num = 1
                
                self.transaction_number = f"TXN-{new_num:06d}"
            else:
                # Fallback if no branch
                last_transaction = HPATransaction.objects.order_by('-id').first()
                if last_transaction and last_transaction.transaction_number:
                    try:
                        txn_num = last_transaction.transaction_number.replace("TXN-", "")
                        last_num = int(txn_num) if txn_num.isdigit() else 0
                        new_num = last_num + 1
                    except (ValueError, AttributeError):
                        new_num = 1
                else:
                    new_num = 1
                self.transaction_number = f"TXN-{new_num:06d}"
        
        # Auto-populate branch from HPA if not set
        if not self.branch and self.hpa and self.hpa.branch:
            self.branch = self.hpa.branch
        
        super().save(*args, **kwargs)
        
        # Update HPA totals after transaction is saved
        if self.hpa:
            self._update_hpa_totals()
    
    def _update_hpa_totals(self):
        """Update HPA deduction totals and paid amount based on all transactions"""
        from django.db.models import Sum
        
        # Get transaction totals by type
        transactions = HPATransaction.objects.filter(
            hpa=self.hpa,
            is_deleted=False
        ).exclude(id=self.id if self.pk else None)
        
        # Add current transaction
        current_txns = list(transactions)
        if self.pk and not self.is_deleted:
            current_txns.append(self)
        
        # Calculate deduction totals (these reduce balance)
        advance_total = sum(t.amount for t in current_txns if t.transaction_type == 'ADVANCE')
        diesel_total = sum(t.amount for t in current_txns if t.transaction_type == 'DIESEL')
        bank_total = sum(t.amount for t in current_txns if t.transaction_type == 'BANK')
        extra_total = sum(t.amount for t in current_txns if t.transaction_type == 'EXTRA')
        other_deduction_total = sum(t.amount for t in current_txns if t.transaction_type == 'OTHER')
        
        # Calculate payment totals (these are actual payments made, not deductions)
        balance_payment_total = sum(t.amount for t in current_txns if t.transaction_type == 'BALANCE_PAYMENT')
        
        # Update HPA deduction fields
        self.hpa.advance_paid_rs = advance_total
        self.hpa.diesel_amount = diesel_total
        self.hpa.bank_amount = bank_total
        self.hpa.other_deductions = extra_total + other_deduction_total
        
        # Update paid_amount (actual payments made to driver)
        # Sum of all balance payments
        self.hpa.paid_amount = balance_payment_total
        
        # Update payment date and mode from latest balance payment
        latest_balance_payment = next(
            (t for t in reversed(current_txns) if t.transaction_type == 'BALANCE_PAYMENT'),
            None
        )
        if latest_balance_payment:
            self.hpa.payment_date = latest_balance_payment.transaction_date
            self.hpa.payment_mode = latest_balance_payment.payment_mode or ''
        
        # HPA save method will recalculate total_deductions, balance_rs, and payment_status
        self.hpa.save(update_fields=[
            'advance_paid_rs', 
            'diesel_amount', 
            'bank_amount', 
            'other_deductions',
            'paid_amount',
            'payment_date',
            'payment_mode'
        ])
