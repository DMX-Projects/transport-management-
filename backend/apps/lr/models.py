from django.db import models
from apps.masters.models import BaseModel, Branch, Truck, Party


class LorryReceipt(BaseModel):
    """
    LR (Lorry Receipt) - Represents truck booking
    Created 24x7, invoice number can be missing/incorrect/edited later
    """
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_TRANSIT', 'In Transit'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    # Auto-generated LR number
    lr_number = models.CharField(max_length=20, unique=True, editable=False)
    
    # Foreign Keys
    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name='lorry_receipts'
    )
    truck = models.ForeignKey(
        Truck,
        on_delete=models.PROTECT,
        related_name='lorry_receipts'
    )
    party = models.ForeignKey(
        Party,
        on_delete=models.PROTECT,
        related_name='lorry_receipts',
        help_text='Customer/Consignee'
    )
    
    # Invoice details (optional, can be added/edited later)
    invoice_number = models.CharField(max_length=100, blank=True, null=True)
    invoice_date = models.DateField(blank=True, null=True)
    
    # Location details
    from_location = models.CharField(max_length=200)
    to_location = models.CharField(max_length=200)
    
    # Material details
    material_description = models.TextField()
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    weight_in_tons = models.DecimalField(
        max_digits=10, 
        decimal_places=3,
        help_text='Weight in tons'
    )
    
    # Financial
    freight_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        help_text='Total freight amount'
    )
    
    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    
    # Dates
    lr_date = models.DateField(auto_now_add=True)
    delivery_date = models.DateField(blank=True, null=True)
    
    # Additional info
    remarks = models.TextField(blank=True, null=True)
    
    # Invoice edit tracking (for audit)
    invoice_edited_at = models.DateTimeField(blank=True, null=True)
    invoice_edited_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_edits'
    )
    
    class Meta:
        db_table = 'lorry_receipts'
        ordering = ['-created_at']
        verbose_name = 'Lorry Receipt'
        verbose_name_plural = 'Lorry Receipts'
        indexes = [
            models.Index(fields=['lr_number']),
            models.Index(fields=['branch', 'status']),
            models.Index(fields=['party']),
            models.Index(fields=['lr_date']),
        ]
    
    def __str__(self):
        return f"{self.lr_number} - {self.truck.truck_number}"
    
    def save(self, *args, **kwargs):
        # Auto-generate LR number if not exists
        if not self.lr_number:
            # Get the last LR for this branch
            last_lr = LorryReceipt.objects.filter(
                branch=self.branch
            ).order_by('-id').first()
            
            if last_lr and last_lr.lr_number:
                # Extract number and increment
                try:
                    last_num = int(last_lr.lr_number.replace('LR', ''))
                    new_num = last_num + 1
                except ValueError:
                    new_num = 1
            else:
                new_num = 1
            
            self.lr_number = f'LR{new_num:04d}'
        
        super().save(*args, **kwargs)
