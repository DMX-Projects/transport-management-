from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from apps.masters.models import BaseModel, Branch, Consignor
from apps.lr.models import LorryReceipt


class Bill(BaseModel):
    """
    Bill/Invoice to Consignor - Final invoice to company sending goods
    Contains multiple LR entries with freight details and GST calculations
    """
    
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('GENERATED', 'Generated'),
        ('SENT', 'Sent to Consignor'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    # Bill Number - Auto-generated per branch (e.g., KAL-2032, BILL-001)
    bill_number = models.CharField(max_length=50, unique=True, editable=False)
    bill_date = models.DateField(blank=True, null=True, help_text='Bill date')
    
    # Branch
    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name='bills',
        help_text='Branch creating this bill',
        null=True,  # Temporarily nullable for migration
        blank=True
    )
    
    # Consignor - Company receiving this bill (who sent goods)
    consignor = models.ForeignKey(
        Consignor,
        on_delete=models.PROTECT,
        related_name='bills',
        help_text='Company receiving this bill (consignor)',
        null=True,  # Temporarily nullable for migration
        blank=True
    )
    
    # Bill Details
    from_date = models.DateField(blank=True, null=True, help_text='From date (start of billing period)')
    to_date = models.DateField(blank=True, null=True, help_text='To date (end of billing period)')
    
    # HSN/SAC Code
    hsn_sac_code = models.CharField(
        max_length=20,
        default='996791',
        help_text='HSN/SAC Code for service'
    )
    
    # Vendor/Transporter Code
    vendor_code = models.CharField(max_length=50, blank=True, help_text='Vendor/Transporter Code')
    
    # GST Details
    gstin = models.CharField(max_length=15, blank=True, help_text='Bill issuer GSTIN')
    consignor_gstin = models.CharField(max_length=15, blank=True, help_text='Consignor GSTIN')
    consignor_pan = models.CharField(max_length=10, blank=True, help_text='Consignor PAN')
    
    # GST State Code
    state_code = models.CharField(max_length=2, blank=True, help_text='State code for GST')
    gst_payable_by = models.CharField(
        max_length=50,
        default='SERVICE',
        help_text='GST payable by (Service/Consignor/Consignee)'
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='DRAFT',
        help_text='Bill status'
    )
    
    # Calculated Totals (auto-calculated)
    total_quantity_mt = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        editable=False,
        help_text='Total quantity in MT'
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        editable=False,
        help_text='Total amount before GST (sum of all line items)'
    )
    sgst_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('9.00'),
        validators=[MinValueValidator(0)],
        help_text='SGST rate (percentage)'
    )
    cgst_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('9.00'),
        validators=[MinValueValidator(0)],
        help_text='CGST rate (percentage)'
    )
    sgst_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        editable=False,
        help_text='SGST amount'
    )
    cgst_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        editable=False,
        help_text='CGST amount'
    )
    grand_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        editable=False,
        help_text='Grand total (Total + SGST + CGST)'
    )
    
    # Payment Details
    payment_received = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Amount received'
    )
    payment_date = models.DateField(blank=True, null=True, help_text='Payment date')
    payment_mode = models.CharField(
        max_length=50,
        blank=True,
        help_text='Payment mode (Cash/Cheque/Bank Transfer)'
    )
    
    # Additional Info
    remarks = models.TextField(blank=True, help_text='Internal remarks')
    consignor_note = models.TextField(blank=True, help_text='Note for consignor')
    
    class Meta:
        db_table = 'bills'
        ordering = ['-bill_date', '-bill_number']
        verbose_name = 'Bill/Invoice'
        verbose_name_plural = 'Bills/Invoices'
        indexes = [
            models.Index(fields=['bill_number']),
            models.Index(fields=['branch', 'bill_date']),
            models.Index(fields=['consignor', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['from_date', 'to_date']),
        ]
    
    def __str__(self):
        return f"Bill {self.bill_number} - {self.consignor.name}"
    
    def save(self, *args, **kwargs):
        # Auto-generate bill number if not exists
        if not self.bill_number and self.branch:
            last_bill = Bill.objects.filter(
                branch=self.branch
            ).order_by('-id').first()
            
            if last_bill and last_bill.bill_number:
                try:
                    # Handle formats like "KAL-2032" or "BILL-001"
                    bill_num = last_bill.bill_number.replace(f"{self.branch.bill_prefix}-", "").replace(self.branch.bill_prefix, "")
                    last_num = int(bill_num) if bill_num.isdigit() else 0
                    new_num = last_num + 1
                except (ValueError, AttributeError):
                    new_num = 1
            else:
                new_num = 1
            
            prefix = self.branch.bill_prefix if self.branch.bill_prefix else "BILL"
            self.bill_number = f"{prefix}-{new_num:04d}"
        
        # Save first to get PK
        super().save(*args, **kwargs)
        
        # Calculate totals from line items (after save so items can be linked)
        line_items = self.bill_items.all()
        if line_items.exists():
            self.total_quantity_mt = sum(Decimal(str(item.quantity_mt)) for item in line_items)
            self.total_amount = sum(Decimal(str(item.total_amount)) for item in line_items)
        else:
            self.total_quantity_mt = Decimal('0')
            self.total_amount = Decimal('0')
        
        # Calculate GST (ensure rates are Decimal)
        # Cast rates to Decimal safely to prevent Decimal×float TypeError
        rate_sgst = Decimal(str(self.sgst_rate)) if self.sgst_rate is not None else Decimal('0')
        rate_cgst = Decimal(str(self.cgst_rate)) if self.cgst_rate is not None else Decimal('0')

        if self.total_amount > 0:
            self.sgst_amount = (self.total_amount * rate_sgst) / Decimal('100')
            self.cgst_amount = (self.total_amount * rate_cgst) / Decimal('100')
            self.grand_total = self.total_amount + self.sgst_amount + self.cgst_amount
        else:
            self.sgst_amount = Decimal('0')
            self.cgst_amount = Decimal('0')
            self.grand_total = Decimal('0')
        
        # Update totals if they changed (use update to avoid recursion)
        if self.pk:
            Bill.objects.filter(pk=self.pk).update(
                total_quantity_mt=self.total_quantity_mt,
                total_amount=self.total_amount,
                sgst_amount=self.sgst_amount,
                cgst_amount=self.cgst_amount,
                grand_total=self.grand_total
            )
    
    def get_amount_in_words(self):
        """Convert grand total amount to words (for printing)"""
        # This can be implemented with a library or custom function
        # For now, returning the amount
        return f"{self.grand_total:.2f}"


class BillItem(BaseModel):
    """
    Bill Line Item - Each LR entry in the bill
    Links to LR and contains billing details for that LR
    """
    
    # Link to Bill
    bill = models.ForeignKey(
        Bill,
        on_delete=models.CASCADE,
        related_name='bill_items',
        help_text='Parent bill'
    )
    
    # Link to LRItem (new - preferred)
    lr_item = models.ForeignKey(
        'lr.LRItem',
        on_delete=models.PROTECT,
        related_name='bill_items',
        help_text='Linked LR Item',
        null=True,  # Temporarily nullable for migration
        blank=True
    )
    
    # Link to LR (deprecated - kept for backward compatibility)
    lr = models.ForeignKey(
        LorryReceipt,
        on_delete=models.PROTECT,
        related_name='bill_items',
        help_text='Deprecated: Use lr_item instead. Linked Lorry Receipt',
        null=True,  # Make nullable for backward compatibility
        blank=True
    )
    
    # Item Details
    destination = models.CharField(max_length=200, blank=True, default='', help_text='Delivery destination')
    quantity_mt = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Quantity in MT'
    )
    freight_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Freight rate per ton'
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Total amount (Quantity × Freight Rate)'
    )
    
    # Line item remarks
    remarks = models.CharField(max_length=500, blank=True, help_text='Line item remarks')
    
    class Meta:
        db_table = 'bill_items'
        ordering = ['id']
        verbose_name = 'Bill Item'
        verbose_name_plural = 'Bill Items'
        indexes = [
            models.Index(fields=['bill', 'id']),
            models.Index(fields=['lr_item']),
            models.Index(fields=['lr']),  # Keep for backward compatibility
        ]
        unique_together = [['bill', 'lr_item']]  # One LRItem can appear once per bill
    
    def __str__(self):
        return f"{self.bill.bill_number} - {self.destination} ({self.quantity_mt} MT)"
    
    def save(self, *args, **kwargs):
        # Auto-populate from LRItem if not set (preferred)
        if self.lr_item:
            if not self.destination:
                self.destination = self.lr_item.to_location
            if not self.quantity_mt:
                self.quantity_mt = self.lr_item.quantity_mt
        # Fallback to LR for backward compatibility
        elif self.lr:
            if not self.destination:
                self.destination = self.lr.to_location
            if not self.quantity_mt:
                self.quantity_mt = self.lr.quantity_mt
        # Note: LR doesn't have freight_rate_per_ton - rate must be provided when creating Bill
        # freight_rate is set from BillItem or must be provided
        
        # Calculate total amount using Decimal-safe arithmetic
        if self.quantity_mt is not None and self.freight_rate is not None:
            try:
                self.total_amount = Decimal(str(self.quantity_mt)) * Decimal(str(self.freight_rate))
            except Exception:
                # Fallback to direct multiplication if values are already Decimals
                self.total_amount = (self.quantity_mt or Decimal('0')) * (self.freight_rate or Decimal('0'))
        
        super().save(*args, **kwargs)
        
        # Update parent bill totals
        if self.bill:
            self.bill.save()

