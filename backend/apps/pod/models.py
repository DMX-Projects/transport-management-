from django.db import models
from django.core.validators import MinValueValidator
from apps.masters.models import BaseModel, Branch
from apps.lr.models import LorryReceipt
from apps.hpa.models import HirePaymentAdvice


class ProofOfDelivery(BaseModel):
    """
    POD (Proof of Delivery) - Acknowledgment receipt from consignee after delivery
    Created when driver returns with delivery acknowledgment
    Used to trigger payment to driver and bill to consignor
    """
    
    STATUS_CHOICES = [
        ('RECEIVED', 'POD Received'),
        ('VERIFIED', 'Verified'),
        ('DISPUTED', 'Disputed'),
        ('ACCEPTED', 'Accepted'),
    ]
    
    # POD Number - Auto-generated
    pod_number = models.CharField(max_length=20, unique=True, editable=False)
    pod_date = models.DateField(blank=True, null=True, help_text='Date when POD was received')
    
    # Branch
    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name='proof_of_deliveries',
        help_text='Branch receiving this POD',
        null=True,  # Temporarily nullable for migration
        blank=True
    )
    
    # Links to LR and HPA
    lr = models.OneToOneField(
        LorryReceipt,
        on_delete=models.PROTECT,
        related_name='pod',
        help_text='Linked Lorry Receipt',
        null=True,  # Temporarily nullable for migration
        blank=True
    )
    hpa = models.OneToOneField(
        HirePaymentAdvice,
        on_delete=models.PROTECT,
        related_name='pod',
        help_text='Linked Hire Payment Advice',
        null=True,  # Temporarily nullable for migration
        blank=True
    )
    
    # Delivery Details
    delivery_date = models.DateField(blank=True, null=True, help_text='Actual delivery date')
    delivery_time = models.TimeField(blank=True, null=True, help_text='Delivery time if available')
    delivered_to = models.CharField(max_length=200, blank=True, default='', help_text='Name of person who received delivery')
    delivered_to_phone = models.CharField(max_length=15, blank=True, help_text='Phone number of receiver')
    delivery_signature = models.CharField(max_length=200, blank=True, help_text='Signature of receiver')
    
    # Quantity Verification
    quantity_received_mt = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Quantity received in MT (for verification)'
    )
    number_of_bags_received = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Number of bags received (for verification)'
    )
    
    # Condition and Remarks
    goods_condition = models.CharField(
        max_length=50,
        choices=[
            ('GOOD', 'Good Condition'),
            ('DAMAGED', 'Damaged'),
            ('SHORT', 'Short Delivery'),
            ('EXCESS', 'Excess Delivery'),
        ],
        default='GOOD',
        help_text='Condition of goods received'
    )
    delivery_remarks = models.TextField(blank=True, help_text='Remarks about delivery')
    consignee_remarks = models.TextField(blank=True, help_text='Remarks from consignee/receiver')
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='RECEIVED',
        help_text='POD verification status'
    )
    
    # Document Upload
    pod_document = models.FileField(
        upload_to='pod_documents/',
        blank=True,
        null=True,
        help_text='Upload POD document/photo if available'
    )
    
    # Verification
    verified_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_pods',
        help_text='User who verified this POD'
    )
    verified_at = models.DateTimeField(blank=True, null=True, help_text='Verification timestamp')
    
    # Additional Info
    remarks = models.TextField(blank=True, help_text='Internal remarks')
    
    class Meta:
        db_table = 'proof_of_deliveries'
        ordering = ['-pod_date', '-pod_number']
        verbose_name = 'Proof of Delivery (POD)'
        verbose_name_plural = 'Proof of Deliveries (POD)'
        indexes = [
            models.Index(fields=['pod_number']),
            models.Index(fields=['branch', 'pod_date']),
            models.Index(fields=['lr', 'status']),
            models.Index(fields=['hpa', 'status']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        lr_number = self.lr.lr_number if self.lr else 'N/A'
        return f"POD {self.pod_number} - LR {lr_number}"
    
    def save(self, *args, **kwargs):
        # Auto-generate POD number if not exists
        if not self.pod_number and self.branch:
            last_pod = ProofOfDelivery.objects.filter(
                branch=self.branch
            ).order_by('-id').first()
            
            if last_pod and last_pod.pod_number:
                try:
                    pod_num = last_pod.pod_number.replace(f"{self.branch.lr_prefix}-POD-", "").replace("POD-", "")
                    last_num = int(pod_num) if pod_num.isdigit() else 0
                    new_num = last_num + 1
                except (ValueError, AttributeError):
                    new_num = 1
            else:
                new_num = 1
            
            prefix = self.branch.lr_prefix if self.branch.lr_prefix else "LR"
            self.pod_number = f"{prefix}-POD-{new_num:04d}"
        
        super().save(*args, **kwargs)

