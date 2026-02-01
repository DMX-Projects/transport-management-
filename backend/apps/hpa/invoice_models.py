"""
HPA Invoice Models - Track multiple invoices per HPA with their delivery locations
Each invoice can be associated with one or more LRs and has specific delivery information
"""
from django.db import models
from django.core.validators import MinValueValidator
from apps.masters.models import BaseModel
from apps.lr.models import LorryReceipt


class HPAInvoice(BaseModel):
    """
    HPA Invoice - Represents individual invoices within an HPA
    
    Business Logic:
    - One HPA can have multiple invoices
    - Each invoice can be associated with multiple LRs (many-to-many)
    - Each invoice tracks its own delivery location(s)
    - Used when multiple shipments/invoices are combined in single HPA
    """
    
    # Link to parent HPA
    hpa = models.ForeignKey(
        'HirePaymentAdvice',
        on_delete=models.CASCADE,
        related_name='invoices',
        help_text='Parent HPA'
    )
    
    # Invoice Details
    invoice_number = models.CharField(
        max_length=50,
        help_text='Invoice/Serial number (e.g., 20153572)'
    )
    invoice_date = models.DateField(
        blank=True,
        null=True,
        help_text='Invoice date if different from HPA date'
    )
    
    # Associated LRs for this invoice
    lrs = models.ManyToManyField(
        LorryReceipt,
        related_name='hpa_invoices',
        help_text='LRs associated with this invoice'
    )
    
    # Delivery Location Details for this invoice
    from_location = models.CharField(
        max_length=200,
        blank=True,
        help_text='Pickup location for this invoice'
    )
    to_location = models.CharField(
        max_length=200,
        blank=True,
        help_text='Delivery destination for this invoice'
    )
    destination = models.CharField(
        max_length=200,
        blank=True,
        help_text='Final destination for this invoice (if different from to_location)'
    )
    
    # Material/Shipment Details
    quantity_mt = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Quantity in Metric Tons for this invoice'
    )
    number_of_bags = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Number of bags for this invoice'
    )
    material_description = models.TextField(
        blank=True,
        help_text='Material description for this invoice'
    )
    
    # Sequence for ordering invoices in HPA
    sequence_number = models.IntegerField(
        default=1,
        help_text='Order sequence within HPA'
    )
    
    # Additional Info
    remarks = models.TextField(
        blank=True,
        help_text='Invoice-specific remarks'
    )
    
    class Meta:
        db_table = 'hpa_invoices'
        ordering = ['hpa', 'sequence_number', 'id']
        unique_together = [['hpa', 'invoice_number']]  # Same invoice can't repeat in one HPA
        indexes = [
            models.Index(fields=['hpa', 'sequence_number']),
            models.Index(fields=['invoice_number']),
        ]
        verbose_name = 'HPA Invoice'
        verbose_name_plural = 'HPA Invoices'
    
    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.to_location}"
    
    def save(self, *args, **kwargs):
        """Auto-assign sequence number if not provided"""
        if not self.sequence_number or self.sequence_number == 0:
            from django.db.models import Max
            max_seq = HPAInvoice.objects.filter(
                hpa=self.hpa,
                is_deleted=False
            ).exclude(id=self.id if self.pk else None).aggregate(
                Max('sequence_number')
            )['sequence_number__max'] or 0
            self.sequence_number = max_seq + 1
        
        super().save(*args, **kwargs)
    
    @property
    def lr_numbers(self):
        """Get comma-separated LR numbers for this invoice"""
        return ', '.join(self.lrs.values_list('lr_number', flat=True))
    
    @property
    def lr_count(self):
        """Count of LRs for this invoice"""
        return self.lrs.count()
