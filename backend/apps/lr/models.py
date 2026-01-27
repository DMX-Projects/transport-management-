from django.db import models
from django.core.validators import MinValueValidator
from django.db.models import Sum, Max
from decimal import Decimal
from apps.masters.models import BaseModel, Branch, Truck, Consignor, Party


class LorryReceipt(BaseModel):
    """
    LR (Lorry Receipt) - Created when company requests transport
    This is the primary document given to driver before loading
    """
    
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PENDING_HPA', 'Pending HPA Creation'),
        ('ISSUED', 'Issued to Driver'),
        ('LOADING', 'At Loading Point'),
        ('IN_TRANSIT', 'In Transit'),
        ('AT_UNLOADING', 'At Unloading Point'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    PAYMENT_TERM_CHOICES = [
        ('TO_BE_BILLED', 'To Be Billed'),
        ('TO_PAY', 'To Pay'),
        ('PAID', 'Paid'),
    ]
    
    GRADE_CHOICES = [
        ('53', 'Grade 53'),
        ('43', 'Grade 43'),
        ('OPC', 'OPC (Ordinary Portland Cement)'),
        ('PPC', 'PPC (Portland Pozzolana Cement)'),
        ('OTHER', 'Other'),
    ]
    
    # LR Number - Auto-generated per branch (e.g., 2369, KAL-2032)
    lr_number = models.CharField(max_length=20, unique=True, editable=False)
    lr_date = models.DateField(blank=True, null=True)  # Will be set in save() if not provided
    sap_number = models.CharField(max_length=50, blank=True, help_text='SAP Number from consignor')
    lr_submitted_time = models.DateTimeField(blank=True, null=True, help_text='Time when LR was submitted/issued')
    
    # Branch - Each branch operates independently
    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name='lorry_receipts',
        help_text='Branch creating this LR'
    )
    
    # Consignor - Company sending goods (like Chettinad Cement)
    consignor = models.ForeignKey(
        Consignor,
        on_delete=models.PROTECT,
        related_name='lorry_receipts',
        help_text='Company sending the goods',
        null=True,  # Temporarily nullable for migration
        blank=True
    )
    
    # Consignee/Party - Destination party receiving goods
    consignee = models.ForeignKey(
        Party,
        on_delete=models.PROTECT,
        related_name='lorry_receipts',
        help_text='Party receiving the goods',
        null=True,  # Temporarily nullable for migration
        blank=True
    )
    delivery_at = models.CharField(max_length=200, blank=True, help_text='Specific delivery location if different')
    
    # Location Details
    from_location = models.CharField(max_length=200, blank=True, default='', help_text='Loading location')
    to_location = models.CharField(max_length=200, blank=True, default='', help_text='Unloading destination')
    destination = models.CharField(max_length=200, blank=True, help_text='Final destination')
    
    # Material Details
    material_description = models.TextField(blank=True, help_text='Description of goods')
    quantity_mt = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Quantity in Metric Tons (M.T.)'
    )
    number_of_bags = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Number of bags'
    )
    grade = models.CharField(
        max_length=10,
        choices=GRADE_CHOICES,
        blank=True,
        help_text='Grade of material (53/43/OPC)'
    )
    grade_quantity = models.CharField(max_length=50, blank=True, help_text='Grade quantity (e.g., 35MT OPC)')
    
    # Loading Details
    loading_from_department = models.CharField(
        max_length=100,
        blank=True,
        default='DISTRIBUTION DEPARTMENT',
        help_text='Loading from department'
    )
    please_load = models.CharField(max_length=100, blank=True)
    number_of_loads = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    grade_type_of_pkg = models.CharField(max_length=100, blank=True, help_text='Grade/Type of Package')
    
    # Vehicle and Driver Details
    truck = models.ForeignKey(
        Truck,
        on_delete=models.PROTECT,
        related_name='lorry_receipts',
        help_text='Assigned truck',
        null=True,  # Temporarily nullable for migration
        blank=True
    )
    # Driver details can be overridden per LR (driver might change)
    driver_name = models.CharField(max_length=200, blank=True, default='', help_text='Driver name for this trip')
    driver_phone = models.CharField(max_length=15, blank=True, default='', help_text='Driver mobile number')
    driver_license_no = models.CharField(max_length=50, blank=True, default='', help_text='Driver license number')
    
    # Payment Terms (Just indication, no amounts - amounts are in HPA only)
    payment_term = models.CharField(
        max_length=20,
        choices=PAYMENT_TERM_CHOICES,
        default='TO_BE_BILLED',
        help_text='Terms of payment'
    )
    
    # GST Details
    gst_payable_by = models.CharField(
        max_length=50,
        default='SERVICE',
        help_text='GST payable by (Service/Consignor/Consignee)'
    )
    
    # Status Tracking
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='DRAFT'
    )
    
    # Dates
    expected_loading_date = models.DateField(blank=True, null=True)
    actual_loading_date = models.DateField(blank=True, null=True)
    expected_delivery_date = models.DateField(blank=True, null=True)
    actual_delivery_date = models.DateField(blank=True, null=True)
    
    # Additional Info
    remarks = models.TextField(blank=True, help_text='Additional remarks or notes')
    note = models.TextField(
        blank=True,
        default='नोट : १५ दिन के अंदर नहीं तो गाडी का भाडा नही मिलेगा !',
        help_text='Note to driver (default Hindi note about 15 days)'
    )
    
    class Meta:
        db_table = 'lorry_receipts'
        ordering = ['-lr_date', '-lr_number']
        verbose_name = 'Lorry Receipt (LR)'
        verbose_name_plural = 'Lorry Receipts (LR)'
        indexes = [
            models.Index(fields=['lr_number']),
            models.Index(fields=['branch', 'lr_date']),
            models.Index(fields=['consignor', 'status']),
            models.Index(fields=['consignee', 'status']),
            models.Index(fields=['truck', 'status']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        consignor_name = self.consignor.name if self.consignor else 'N/A'
        consignee_name = self.consignee.name if self.consignee else 'N/A'
        return f"LR {self.lr_number} - {consignor_name} to {consignee_name}"
    
    @property
    def has_hpa(self):
        """Check if this LR has an associated HPA"""
        return hasattr(self, 'hpa') and self.hpa is not None
    
    @property
    def is_pending_hpa(self):
        """Check if this LR is pending HPA creation"""
        return not self.has_hpa and self.status in ['ISSUED', 'LOADING', 'IN_TRANSIT', 'PENDING_HPA']
    
    @property
    def total_quantity_mt(self):
        """Total quantity across all items"""
        return self.lr_items.filter(is_deleted=False).aggregate(
            Sum('quantity_mt')
        )['quantity_mt__sum'] or Decimal('0')
    
    @property
    def total_bags(self):
        """Total bags across all items"""
        return self.lr_items.filter(is_deleted=False).aggregate(
            Sum('number_of_bags')
        )['number_of_bags__sum'] or 0
    
    @property
    def can_edit_items(self):
        """Check if items can be edited (before ISSUED)"""
        return self.status in ['DRAFT', 'PENDING_HPA']
    
    @property
    def primary_consignor(self):
        """First item's consignor (for display)"""
        first_item = self.lr_items.filter(is_deleted=False).first()
        return first_item.consignor if first_item else None
    
    @property
    def primary_consignee(self):
        """First item's consignee (for display)"""
        first_item = self.lr_items.filter(is_deleted=False).first()
        return first_item.consignee if first_item else None
    
    @property
    def primary_from_location(self):
        """Primary from location"""
        first_item = self.lr_items.filter(is_deleted=False).first()
        return first_item.from_location if first_item else ''
    
    @property
    def primary_to_location(self):
        """Primary to location"""
        first_item = self.lr_items.filter(is_deleted=False).first()
        return first_item.to_location if first_item else ''
    
    def save(self, *args, **kwargs):
        # Set lr_date if not provided
        if not self.lr_date:
            from django.utils import timezone
            self.lr_date = timezone.now().date()
        
        # Auto-generate LR number if not exists
        if not self.lr_number and self.branch:
            # Get the last LR for this branch
            last_lr = LorryReceipt.objects.filter(
                branch=self.branch
            ).order_by('-id').first()
            
            if last_lr and last_lr.lr_number:
                # Extract number and increment
                try:
                    # Handle formats like "2369" or "KAL-2032" or "LR-2369"
                    lr_num = last_lr.lr_number.replace(f"{self.branch.lr_prefix}-", "").replace(self.branch.lr_prefix, "")
                    last_num = int(lr_num) if lr_num.isdigit() else 0
                    new_num = last_num + 1
                except (ValueError, AttributeError):
                    new_num = 1
            else:
                new_num = 1
            
            # Format: Use branch prefix if set, otherwise "LR"
            prefix = self.branch.lr_prefix if self.branch.lr_prefix else "LR"
            self.lr_number = f"{prefix}-{new_num:04d}" if prefix else f"{new_num:04d}"
        
        super().save(*args, **kwargs)


class LRItem(BaseModel):
    """
    LR Item - Individual order/consignment within an LR
    One LR can contain multiple LRItems
    """
    
    # Link to parent LR
    lr = models.ForeignKey(
        LorryReceipt,
        on_delete=models.CASCADE,
        related_name='lr_items',
        help_text='Parent Lorry Receipt'
    )
    
    # Sequence number for ordering items
    sequence_number = models.IntegerField(default=1, help_text='Order sequence within LR')
    
    # Consignor and Consignee
    consignor = models.ForeignKey(
        Consignor,
        on_delete=models.PROTECT,
        related_name='lr_items',
        help_text='Company sending goods'
    )
    consignee = models.ForeignKey(
        Party,
        on_delete=models.PROTECT,
        related_name='lr_items',
        help_text='Party receiving goods'
    )
    delivery_at = models.CharField(max_length=200, blank=True, help_text='Specific delivery location if different')
    
    # Location Details
    from_location = models.CharField(max_length=200, blank=True, default='', help_text='Loading location')
    to_location = models.CharField(max_length=200, blank=True, default='', help_text='Unloading destination')
    destination = models.CharField(max_length=200, blank=True, help_text='Final destination')
    
    # Material Details
    material_description = models.TextField(blank=True, help_text='Description of goods')
    quantity_mt = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Quantity in Metric Tons (M.T.)'
    )
    number_of_bags = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Number of bags'
    )
    grade = models.CharField(
        max_length=10,
        choices=LorryReceipt.GRADE_CHOICES,
        blank=True,
        help_text='Grade of material (53/43/OPC)'
    )
    grade_quantity = models.CharField(max_length=50, blank=True, help_text='Grade quantity (e.g., 35MT OPC)')
    
    # Loading Details
    loading_from_department = models.CharField(
        max_length=100,
        blank=True,
        default='DISTRIBUTION DEPARTMENT',
        help_text='Loading from department'
    )
    please_load = models.CharField(max_length=100, blank=True)
    number_of_loads = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    grade_type_of_pkg = models.CharField(max_length=100, blank=True, help_text='Grade/Type of Package')
    
    # Order-specific
    sap_number = models.CharField(max_length=50, blank=True, help_text='SAP Number from consignor')
    payment_term = models.CharField(
        max_length=20,
        choices=LorryReceipt.PAYMENT_TERM_CHOICES,
        default='TO_BE_BILLED',
        help_text='Terms of payment'
    )
    gst_payable_by = models.CharField(
        max_length=50,
        default='SERVICE',
        help_text='GST payable by (Service/Consignor/Consignee)'
    )
    
    class Meta:
        db_table = 'lr_items'
        ordering = ['sequence_number', 'id']
        unique_together = [['lr', 'sequence_number']]
        indexes = [
            models.Index(fields=['lr', 'sequence_number']),
            models.Index(fields=['consignor']),
            models.Index(fields=['consignee']),
        ]
        verbose_name = 'LR Item'
        verbose_name_plural = 'LR Items'
    
    def __str__(self):
        return f"LR {self.lr.lr_number} - Item {self.sequence_number}: {self.consignor.name} → {self.consignee.name}"
    
    def save(self, *args, **kwargs):
        """Auto-assign sequence number if not provided"""
        if not self.sequence_number or self.sequence_number == 0:
            max_seq = LRItem.objects.filter(
                lr=self.lr,
                is_deleted=False
            ).exclude(id=self.id if self.pk else None).aggregate(
                Max('sequence_number')
            )['sequence_number__max'] or 0
            self.sequence_number = max_seq + 1
        super().save(*args, **kwargs)
