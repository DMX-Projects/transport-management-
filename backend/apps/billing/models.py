from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from apps.masters.models import BaseModel, Branch, Consignor
from apps.lr.models import LorryReceipt


class BillingTemplate(BaseModel):
    """
    Billing Template - Configurable billing format for different consignors
    
    Allows defining:
    - Which fields to display on bills
    - Calculation rules for freight, taxes, etc.
    - Grouping and display options
    - PDF layout configuration
    
    Business Logic:
    - Each consignor can have multiple templates
    - One template can be marked as default for a consignor
    - Templates can be global (no consignor) for use as defaults
    - Template determines how bill totals are calculated
    """
    
    TEMPLATE_TYPE_CHOICES = [
        ('STANDARD', 'Standard Format'),
        ('DETAILED', 'Detailed with Breakdown'),
        ('SUMMARY', 'Summary Format'),
        ('CUSTOM', 'Custom Format'),
    ]
    
    # Basic Info
    name = models.CharField(
        max_length=100,
        help_text='Template name (e.g., "Chettinad Detailed Format")'
    )
    code = models.CharField(
        max_length=50,
        unique=True,
        help_text='Unique template code (e.g., "CHET_DET_V1")'
    )
    description = models.TextField(
        blank=True,
        help_text='Template description and purpose'
    )
    
    # Template Type
    template_type = models.CharField(
        max_length=20,
        choices=TEMPLATE_TYPE_CHOICES,
        default='STANDARD',
        help_text='Template category'
    )
    
    # Consignor Assignment (optional - null means global/default template)
    consignor = models.ForeignKey(
        Consignor,
        on_delete=models.SET_NULL,
        related_name='billing_templates',
        null=True,
        blank=True,
        help_text='Specific consignor (null = global template)'
    )
    
    # Default Flag
    is_default = models.BooleanField(
        default=False,
        help_text='Default template for this consignor (or global default if no consignor)'
    )
    
    # Active Flag
    is_active = models.BooleanField(
        default=True,
        help_text='Whether template is available for use'
    )
    
    # ====== Configuration Fields (JSON) ======
    
    # Field Mapping - Which fields to show/hide
    field_mapping = models.JSONField(
        default=dict,
        blank=True,
        help_text='''
        Field visibility configuration:
        {
            "show_lr_number": true,
            "show_invoice_number": true,
            "show_truck_number": true,
            "show_driver_name": false,
            "show_hpa_number": true,
            "show_freight_breakdown": true,
            "show_loading_charges": false,
            "show_unloading_charges": false,
            "show_material_description": true,
            "show_destination": true,
            "show_consignee": true
        }
        '''
    )
    
    # Calculation Rules
    calculation_rules = models.JSONField(
        default=dict,
        blank=True,
        help_text='''
        Calculation formulas and rules:
        {
            "freight_formula": "quantity_mt * rate_per_mt",
            "loading_charges_type": "fixed",
            "loading_charges_value": 100,
            "unloading_charges_type": "per_mt",
            "unloading_charges_value": 50,
            "round_off": true,
            "round_direction": "nearest"
        }
        '''
    )
    
    # Grouping Rules
    grouping_rules = models.JSONField(
        default=dict,
        blank=True,
        help_text='''
        How to group line items:
        {
            "group_by": "destination",
            "sort_by": "date",
            "sort_order": "asc",
            "show_subtotals": true,
            "merge_same_destination": false
        }
        '''
    )
    
    # Tax Configuration
    tax_configuration = models.JSONField(
        default=dict,
        blank=True,
        help_text='''
        GST and tax settings:
        {
            "gst_applicable": true,
            "gst_type": "intra_state",
            "sgst_rate": 9.0,
            "cgst_rate": 9.0,
            "igst_rate": 18.0,
            "tds_applicable": false,
            "tds_rate": 2.0,
            "hsn_sac_code": "996791"
        }
        '''
    )
    
    # Display Options
    display_options = models.JSONField(
        default=dict,
        blank=True,
        help_text='''
        UI display preferences:
        {
            "date_format": "DD/MM/YYYY",
            "number_format": "indian",
            "currency_symbol": "Rs.",
            "decimal_places": 2,
            "show_amount_in_words": true,
            "header_text": "Tax Invoice",
            "footer_text": "Terms and conditions apply"
        }
        '''
    )
    
    # ====== PDF Configuration ======
    
    pdf_template_name = models.CharField(
        max_length=100,
        default='default_bill',
        help_text='PDF template file name (without extension)'
    )
    
    header_config = models.JSONField(
        default=dict,
        blank=True,
        help_text='''
        PDF header configuration:
        {
            "show_logo": true,
            "logo_position": "left",
            "company_name_size": 18,
            "address_size": 10,
            "show_gstin_header": true
        }
        '''
    )
    
    footer_config = models.JSONField(
        default=dict,
        blank=True,
        help_text='''
        PDF footer configuration:
        {
            "show_bank_details": true,
            "show_terms": true,
            "show_signature_line": true,
            "terms_text": "Payment due within 30 days"
        }
        '''
    )
    
    page_settings = models.JSONField(
        default=dict,
        blank=True,
        help_text='''
        PDF page settings:
        {
            "paper_size": "A4",
            "orientation": "portrait",
            "margin_top": 20,
            "margin_bottom": 20,
            "margin_left": 15,
            "margin_right": 15
        }
        '''
    )
    
    class Meta:
        db_table = 'billing_templates'
        ordering = ['name']
        verbose_name = 'Billing Template'
        verbose_name_plural = 'Billing Templates'
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['consignor', 'is_default']),
            models.Index(fields=['template_type', 'is_active']),
        ]
        constraints = [
            # Only one default template per consignor (or global)
            models.UniqueConstraint(
                fields=['consignor', 'is_default'],
                condition=models.Q(is_default=True),
                name='unique_default_template_per_consignor'
            )
        ]
    
    def __str__(self):
        consignor_name = self.consignor.name if self.consignor else 'Global'
        default_str = ' (Default)' if self.is_default else ''
        return f"{self.name} - {consignor_name}{default_str}"
    
    def save(self, *args, **kwargs):
        # If this is being set as default, unset other defaults for same consignor
        if self.is_default:
            BillingTemplate.objects.filter(
                consignor=self.consignor,
                is_default=True,
                is_deleted=False
            ).exclude(pk=self.pk).update(is_default=False)
        
        # Set default JSON values if empty
        if not self.field_mapping:
            self.field_mapping = self.get_default_field_mapping()
        if not self.calculation_rules:
            self.calculation_rules = self.get_default_calculation_rules()
        if not self.tax_configuration:
            self.tax_configuration = self.get_default_tax_configuration()
        if not self.display_options:
            self.display_options = self.get_default_display_options()
        if not self.page_settings:
            self.page_settings = self.get_default_page_settings()
        
        super().save(*args, **kwargs)
    
    @staticmethod
    def get_default_field_mapping():
        return {
            "show_lr_number": True,
            "show_invoice_number": True,
            "show_truck_number": True,
            "show_driver_name": False,
            "show_hpa_number": True,
            "show_freight_breakdown": True,
            "show_loading_charges": False,
            "show_unloading_charges": False,
            "show_material_description": True,
            "show_destination": True,
            "show_consignee": True
        }
    
    @staticmethod
    def get_default_calculation_rules():
        return {
            "freight_formula": "quantity_mt * rate_per_mt",
            "loading_charges_type": "none",
            "loading_charges_value": 0,
            "unloading_charges_type": "none",
            "unloading_charges_value": 0,
            "round_off": True,
            "round_direction": "nearest"
        }
    
    @staticmethod
    def get_default_tax_configuration():
        return {
            "gst_applicable": True,
            "gst_type": "intra_state",
            "sgst_rate": 9.0,
            "cgst_rate": 9.0,
            "igst_rate": 18.0,
            "tds_applicable": False,
            "tds_rate": 2.0,
            "hsn_sac_code": "996791"
        }
    
    @staticmethod
    def get_default_display_options():
        return {
            "date_format": "DD/MM/YYYY",
            "number_format": "indian",
            "currency_symbol": "Rs.",
            "decimal_places": 2,
            "show_amount_in_words": True,
            "header_text": "Tax Invoice",
            "footer_text": "Terms and conditions apply"
        }
    
    @staticmethod
    def get_default_page_settings():
        return {
            "paper_size": "A4",
            "orientation": "portrait",
            "margin_top": 20,
            "margin_bottom": 20,
            "margin_left": 15,
            "margin_right": 15
        }
    
    @classmethod
    def get_template_for_consignor(cls, consignor_id):
        """
        Get the appropriate billing template for a consignor.
        Priority:
        1. Consignor's default template
        2. Consignor's first active template
        3. Global default template
        4. First active global template
        5. None
        """
        # Try consignor's default template
        template = cls.objects.filter(
            consignor_id=consignor_id,
            is_default=True,
            is_active=True,
            is_deleted=False
        ).first()
        
        if template:
            return template
        
        # Try consignor's first active template
        template = cls.objects.filter(
            consignor_id=consignor_id,
            is_active=True,
            is_deleted=False
        ).first()
        
        if template:
            return template
        
        # Try global default template
        template = cls.objects.filter(
            consignor__isnull=True,
            is_default=True,
            is_active=True,
            is_deleted=False
        ).first()
        
        if template:
            return template
        
        # Try first active global template
        template = cls.objects.filter(
            consignor__isnull=True,
            is_active=True,
            is_deleted=False
        ).first()
        
        return template


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
    
    # Billing Template (NEW - Phase 3)
    billing_template = models.ForeignKey(
        'BillingTemplate',
        on_delete=models.SET_NULL,
        related_name='bills',
        null=True,
        blank=True,
        help_text='Billing template used for this bill (determines format and calculations)'
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
    
    # Phase 4: Payment Tracking Fields
    due_date = models.DateField(
        blank=True,
        null=True,
        help_text='Payment due date'
    )
    
    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PARTIAL', 'Partially Paid'),
        ('PAID', 'Fully Paid'),
        ('OVERDUE', 'Overdue'),
    ]
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='PENDING',
        help_text='Payment collection status'
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
    
    # Phase 4: Computed Properties for Payment Tracking
    
    @property
    def outstanding_amount(self):
        """Calculate outstanding amount (grand_total - payments received)"""
        total_payments = self.client_payments.filter(is_deleted=False).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0')
        return self.grand_total - total_payments
    
    @property
    def total_payments_received(self):
        """Total of all payments received for this bill"""
        return self.client_payments.filter(is_deleted=False).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0')
    
    @property
    def aging_days(self):
        """Calculate days since bill date or due date"""
        from django.utils import timezone
        reference_date = self.due_date or self.bill_date
        if reference_date:
            return (timezone.now().date() - reference_date).days
        return 0
    
    @property
    def is_overdue(self):
        """Check if bill is overdue"""
        if self.payment_status == 'PAID':
            return False
        if self.due_date:
            from django.utils import timezone
            return timezone.now().date() > self.due_date
        return False
    
    @property
    def aging_bucket(self):
        """Return aging bucket for the bill"""
        days = self.aging_days
        if days <= 0:
            return 'current'
        elif days <= 30:
            return '0-30'
        elif days <= 60:
            return '31-60'
        elif days <= 90:
            return '61-90'
        else:
            return '90+'
    
    def update_payment_status(self):
        """Update payment status based on payments received"""
        if self.grand_total <= 0:
            self.payment_status = 'PAID'
        elif self.outstanding_amount <= 0:
            self.payment_status = 'PAID'
        elif self.total_payments_received > 0:
            if self.is_overdue:
                self.payment_status = 'OVERDUE'
            else:
                self.payment_status = 'PARTIAL'
        elif self.is_overdue:
            self.payment_status = 'OVERDUE'
        else:
            self.payment_status = 'PENDING'
        
        Bill.objects.filter(pk=self.pk).update(
            payment_status=self.payment_status,
            payment_received=self.total_payments_received
        )


class ClientPayment(BaseModel):
    """
    ClientPayment - Track individual payments received against bills
    
    Phase 4: Client Payment Tracking
    Supports:
    - Full payments
    - Partial payments
    - Payment methods tracking
    - Payment reference/transaction numbers
    """
    
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('CHEQUE', 'Cheque'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('UPI', 'UPI'),
        ('RTGS', 'RTGS'),
        ('NEFT', 'NEFT'),
        ('DD', 'Demand Draft'),
        ('OTHER', 'Other'),
    ]
    
    # Link to Bill
    bill = models.ForeignKey(
        Bill,
        on_delete=models.CASCADE,
        related_name='client_payments',
        help_text='Bill against which payment is made'
    )
    
    # Payment Details
    payment_date = models.DateField(
        help_text='Date payment was received'
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text='Payment amount'
    )
    
    # Payment Method
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default='BANK_TRANSFER',
        help_text='Method of payment'
    )
    
    # Reference/Transaction Details
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        help_text='Cheque number, transaction ID, or reference'
    )
    bank_name = models.CharField(
        max_length=100,
        blank=True,
        help_text='Bank name (for cheque/DD)'
    )
    
    # Additional Info
    remarks = models.TextField(
        blank=True,
        help_text='Payment remarks or notes'
    )
    
    class Meta:
        db_table = 'client_payments'
        ordering = ['-payment_date', '-created_at']
        verbose_name = 'Client Payment'
        verbose_name_plural = 'Client Payments'
        indexes = [
            models.Index(fields=['bill', 'payment_date']),
            models.Index(fields=['payment_date']),
            models.Index(fields=['payment_method']),
        ]
    
    def __str__(self):
        return f"Payment Rs.{self.amount} for {self.bill.bill_number} on {self.payment_date}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update bill payment status after saving payment
        self.bill.update_payment_status()
    
    def delete(self, *args, **kwargs):
        bill = self.bill
        super().delete(*args, **kwargs)
        # Update bill payment status after deleting payment
        bill.update_payment_status()


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
    
    # Link to HPAInvoice (NEW - to track which invoices have been billed)
    hpa_invoice = models.ForeignKey(
        'hpa.HPAInvoice',
        on_delete=models.PROTECT,
        related_name='bill_items',
        help_text='Linked HPA Invoice (to track which invoices have been billed)',
        null=True,
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

