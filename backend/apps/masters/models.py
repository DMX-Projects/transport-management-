from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


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
    """Branch locations"""
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='branches')
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=10, unique=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    phone = models.CharField(max_length=15)
    email = models.EmailField()
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'branches'
        verbose_name = 'Branch'
        verbose_name_plural = 'Branches'
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class Party(BaseModel):
    """Customer/Party master"""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    gstin = models.CharField(max_length=15, blank=True)
    pan = models.CharField(max_length=10, blank=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    phone = models.CharField(max_length=15)
    email = models.EmailField(blank=True)
    contact_person = models.CharField(max_length=100, blank=True)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit_days = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'parties'
        verbose_name = 'Party'
        verbose_name_plural = 'Parties'
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class Truck(BaseModel):
    """Truck master"""
    
    TRUCK_TYPE_CHOICES = [
        ('OWN', 'Own Truck'),
        ('MARKET', 'Market Truck'),
    ]
    
    truck_number = models.CharField(max_length=20, unique=True)
    truck_type = models.CharField(max_length=10, choices=TRUCK_TYPE_CHOICES, default='MARKET')
    owner_name = models.CharField(max_length=200, blank=True)
    owner_phone = models.CharField(max_length=15, blank=True)
    driver_name = models.CharField(max_length=200, blank=True)
    driver_phone = models.CharField(max_length=15, blank=True)
    capacity_tons = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    pan_number = models.CharField(max_length=10, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'trucks'
        verbose_name = 'Truck'
        verbose_name_plural = 'Trucks'
    
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
