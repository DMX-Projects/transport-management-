from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class AuditLog(models.Model):
    """Tracks all changes to records for audit trail"""
    FIELD_CHANGES = {
        'string': models.CharField,
        'integer': models.IntegerField,
        'decimal': models.DecimalField,
        'boolean': models.BooleanField,
        'datetime': models.DateTimeField,
        'date': models.DateField,
        'foreign_key': models.CharField,
        'choice': models.CharField,
    }
    
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    record_id = models.IntegerField()
    changed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    changed_at = models.DateTimeField(auto_now_add=True)
    action = models.CharField(
        max_length=20,
        choices=[('CREATE', 'Create'), ('UPDATE', 'Update'), ('DELETE', 'Delete')],
        default='UPDATE'
    )
    field_name = models.CharField(max_length=100, blank=True)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    record_branch = models.ForeignKey(
        'masters.Branch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    
    class Meta:
        db_table = 'audit_logs'
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-changed_at']
        indexes = [
            models.Index(fields=['content_type', 'record_id', '-changed_at']),
            models.Index(fields=['record_branch', '-changed_at']),
            models.Index(fields=['changed_by', '-changed_at']),
        ]
    
    def __str__(self):
        return f"{self.content_type.model}:{self.record_id} {self.action} by {self.changed_by}"
    
    @classmethod
    def log_change(cls, obj, action, field_name, old_value, new_value, changed_by, branch=None):
        """Create an audit log entry"""
        content_type = ContentType.objects.get_for_model(obj.__class__)
        return cls.objects.create(
            content_type=content_type,
            record_id=obj.id if obj.id else obj.pk,
            action=action,
            field_name=field_name,
            old_value=str(old_value)[:500],
            new_value=str(new_value)[:500],
            changed_by=changed_by,
            record_branch=branch
        )


class BaseModel(models.Model):
    """Base model with common fields and audit trail"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='%(class)s_created'
    )
    updated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='%(class)s_updated'
    )
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_deleted'
    )
    
    class Meta:
        abstract = True


class Company(BaseModel):
    """Company/Business entity master"""
    name = models.CharField(max_length=200)
    gstin = models.CharField(max_length=15, unique=True)
    pan = models.CharField(max_length=10, blank=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    phone = models.CharField(max_length=15)
    email = models.EmailField()
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'companies'
        verbose_name = 'Company'
        verbose_name_plural = 'Companies'
    
    def __str__(self):
        return self.name


class Branch(BaseModel):
    """Branch locations - Each branch operates independently with data isolation"""
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='branches')
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=10, unique=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    gstin = models.CharField(max_length=15, blank=True, help_text='Branch GSTIN if different from company')
    hsn_sac_code = models.CharField(max_length=20, default='996791', help_text='HSN/SAC Code for billing')
    lr_prefix = models.CharField(max_length=5, default='LR', help_text='Prefix for LR numbers (e.g., LR, KAL)')
    invoice_prefix = models.CharField(max_length=10, default='INV', help_text='Prefix for invoice numbers')
    bill_prefix = models.CharField(max_length=10, default='BILL', help_text='Prefix for bill numbers')
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'branches'
        verbose_name = 'Branch'
        verbose_name_plural = 'Branches'
        indexes = [
            models.Index(fields=['code', 'is_active']),
            models.Index(fields=['company', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class Consignor(BaseModel):
    """Consignor master - Companies sending goods (like Chettinad Cement)"""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    gstin = models.CharField(max_length=15, unique=True)
    pan = models.CharField(max_length=10, blank=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    state_code = models.CharField(max_length=2, blank=True, help_text='GST State Code')
    pincode = models.CharField(max_length=10)
    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    contact_person = models.CharField(max_length=100, blank=True)
    transporter_code = models.CharField(max_length=50, blank=True, help_text='Vendor/Transporter Code')
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'consignors'
        verbose_name = 'Consignor'
        verbose_name_plural = 'Consignors'
        indexes = [
            models.Index(fields=['gstin']),
            models.Index(fields=['code', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class Party(BaseModel):
    """Consignee/Party master - Destination parties receiving goods"""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    gstin = models.CharField(max_length=15, blank=True)
    pan = models.CharField(max_length=10, blank=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    contact_person = models.CharField(max_length=100, blank=True)
    delivery_address = models.TextField(blank=True, help_text='Specific delivery address if different')
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'parties'
        verbose_name = 'Party/Consignee'
        verbose_name_plural = 'Parties/Consignees'
        indexes = [
            models.Index(fields=['code', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class Truck(BaseModel):
    """Truck master - Vehicle information can be updated per trip"""
    
    TRUCK_TYPE_CHOICES = [
        ('OWN', 'Own Truck'),
        ('MARKET', 'Market Truck'),
    ]
    
    truck_number = models.CharField(max_length=20, unique=True)
    truck_type = models.CharField(max_length=10, choices=TRUCK_TYPE_CHOICES, default='MARKET')
    owner_name = models.CharField(max_length=200, blank=True)
    owner_phone = models.CharField(max_length=15, blank=True)
    owner_pan = models.CharField(max_length=10, blank=True, help_text='Owner PAN if available')
    driver_name = models.CharField(max_length=200, blank=True, help_text='Default driver name (can be overridden in LR)')
    driver_phone = models.CharField(max_length=15, blank=True, help_text='Default driver phone (can be overridden in LR)')
    driver_license_no = models.CharField(max_length=50, blank=True, help_text='Default driver license (can be overridden in LR)')
    capacity_tons = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'trucks'
        verbose_name = 'Truck'
        verbose_name_plural = 'Trucks'
        indexes = [
            models.Index(fields=['truck_number', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.truck_number} ({self.get_truck_type_display()})"


class ChartOfAccounts(BaseModel):
    """Chart of Accounts for accounting module"""
    
    ACCOUNT_TYPE_CHOICES = [
        ('ASSET', 'Asset'),
        ('LIABILITY', 'Liability'),
        ('CAPITAL', 'Capital'),
        ('INCOME', 'Income'),
        ('EXPENSE', 'Expense'),
    ]
    
    account_code = models.CharField(max_length=20, unique=True)
    account_name = models.CharField(max_length=200)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'chart_of_accounts'
        verbose_name = 'Chart of Account'
        verbose_name_plural = 'Chart of Accounts'
    
    def __str__(self):
        return f"{self.account_code} - {self.account_name}"


class GSTConfig(BaseModel):
    """GST Configuration"""
    rate = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)])
    description = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'gst_config'
        verbose_name = 'GST Configuration'
        verbose_name_plural = 'GST Configurations'
    
    def __str__(self):
        return f"{self.rate}% - {self.description}"


class TDSConfig(BaseModel):
    """TDS Configuration"""
    rate = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)])
    description = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'tds_config'
        verbose_name = 'TDS Configuration'
        verbose_name_plural = 'TDS Configurations'
    
    def __str__(self):
        return f"{self.rate}% - {self.description}"
