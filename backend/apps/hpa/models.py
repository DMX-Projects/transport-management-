from django.db import models
from django.utils import timezone
from apps.masters.models import Truck
from apps.lr.models import LorryReceipt
from apps.accounts.models import User


class HirePaymentAdvice(models.Model):
    """
    HPA (Hire Payment Advice) for tracking truck hire payments
    Each HPA is linked to an LR and tracks payment breakdown
    """
    
    # Auto-generated HPA number
    hpa_number = models.CharField(max_length=20, unique=True, editable=False)
    hpa_date = models.DateField(default=timezone.now)
    
    # Links
    lr = models.ForeignKey(
        LorryReceipt,
        on_delete=models.PROTECT,
        related_name='hpas',
        help_text="Linked Lorry Receipt"
    )
    truck = models.ForeignKey(
        Truck,
        on_delete=models.PROTECT,
        related_name='hpas',
        help_text="Truck (auto-populated from LR)"
    )
    
    # Payment Breakdown
    freight_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Total freight (from LR)"
    )
    advance_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Advance payment given"
    )
    diesel_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Diesel cost"
    )
    loading_charges = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Loading charges"
    )
    unloading_charges = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Unloading charges"
    )
    other_deductions = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Other deductions"
    )
    other_deductions_description = models.TextField(
        blank=True,
        null=True,
        help_text="Description of other deductions"
    )
    
    # Calculated fields (auto-calculated on save)
    total_deductions = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        editable=False,
        help_text="Sum of all deductions"
    )
    balance_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        editable=False,
        help_text="Balance to be paid (freight - deductions)"
    )
    
    # Payment Status
    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PARTIAL', 'Partially Paid'),
        ('PAID', 'Paid'),
    ]
    payment_status = models.CharField(
        max_length=10,
        choices=PAYMENT_STATUS_CHOICES,
        default='PENDING'
    )
    paid_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Amount actually paid"
    )
    payment_date = models.DateField(blank=True, null=True)
    
    PAYMENT_MODE_CHOICES = [
        ('CASH', 'Cash'),
        ('CHEQUE', 'Cheque'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('UPI', 'UPI'),
    ]
    payment_mode = models.CharField(
        max_length=20,
        choices=PAYMENT_MODE_CHOICES,
        blank=True,
        null=True
    )
    
    # Additional
    remarks = models.TextField(blank=True, null=True)
    
    # Audit trail
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='hpas_created'
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='hpas_updated'
    )
    
    # Soft delete
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)
    deleted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hpas_deleted'
    )
    
    class Meta:
        db_table = 'hire_payment_advices'
        ordering = ['-created_at']
        verbose_name = 'Hire Payment Advice'
        verbose_name_plural = 'Hire Payment Advices'
    
    def __str__(self):
        return f"{self.hpa_number} - {self.truck.truck_number}"
    
    def save(self, *args, **kwargs):
        # Auto-generate HPA number
        if not self.hpa_number:
            last_hpa = HirePaymentAdvice.objects.filter(
                hpa_number__startswith='HPA'
            ).order_by('-hpa_number').first()
            
            if last_hpa and last_hpa.hpa_number:
                last_num = int(last_hpa.hpa_number[3:])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.hpa_number = f'HPA{new_num:04d}'
        
        # Calculate totals
        self.total_deductions = (
            self.advance_paid +
            self.diesel_amount +
            self.loading_charges +
            self.unloading_charges +
            self.other_deductions
        )
        self.balance_amount = self.freight_amount - self.total_deductions
        
        # Update payment status based on paid amount
        if self.paid_amount == 0:
            self.payment_status = 'PENDING'
        elif self.paid_amount >= self.balance_amount:
            self.payment_status = 'PAID'
        else:
            self.payment_status = 'PARTIAL'
        
        super().save(*args, **kwargs)
