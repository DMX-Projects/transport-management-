# Phase 1: Database Schema Restructuring

## 1. LR Model Updates
- Remove redundant fields (to_location, destination from main LR)
- Keep only container-level fields
- All item-specific data moves to LRItem

## 2. HPA Model Enhancement  
- Add support for multiple LRs per HPA
- Add payment breakdown fields
- Add advance payment tracking

## 3. New Models Required

### PaymentTransaction Model
```python
class PaymentTransaction(BaseModel):
    """Track all payments between Capital Logistics and trucks"""
    PAYMENT_TYPE_CHOICES = [
        ('ADVANCE', 'Advance Payment'),
        ('DIESEL', 'Diesel Payment'), 
        ('HPA_PAYMENT', 'HPA Final Payment'),
        ('DEDUCTION', 'Deduction'),
        ('BONUS', 'Bonus Payment'),
    ]
    
    hpa = models.ForeignKey(HirePaymentAdvice, on_delete=models.PROTECT)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    reference_number = models.CharField(max_length=100, blank=True)
    pump_name = models.CharField(max_length=100, blank=True)  # For diesel
    bank_name = models.CharField(max_length=100, blank=True)
    remarks = models.TextField(blank=True)
    
    class Meta:
        db_table = 'payment_transactions'
```

### POD Model  
```python
class ProofOfDelivery(BaseModel):
    """Proof of Delivery/Acknowledgment"""
    STATUS_CHOICES = [
        ('PENDING', 'Pending Upload'),
        ('UPLOADED', 'Uploaded'),
        ('VERIFIED', 'Verified'),
        ('REJECTED', 'Rejected'),
    ]
    
    lr = models.OneToOneField(LorryReceipt, on_delete=models.PROTECT)
    hpa = models.ForeignKey(HirePaymentAdvice, on_delete=models.PROTECT)
    delivery_date = models.DateField()
    received_by_name = models.CharField(max_length=200)
    received_by_designation = models.CharField(max_length=100)
    received_by_signature = models.ImageField(upload_to='pod_signatures/')
    pod_document = models.FileField(upload_to='pod_documents/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    verification_remarks = models.TextField(blank=True)
    
    class Meta:
        db_table = 'proof_of_delivery'
```

### HPALRLink Model (Junction Table)
```python
class HPALRLink(BaseModel):
    """Many-to-Many relationship between HPA and LRs with additional data"""
    hpa = models.ForeignKey(HirePaymentAdvice, on_delete=models.CASCADE, related_name='lr_links')
    lr = models.ForeignKey(LorryReceipt, on_delete=models.CASCADE, related_name='hpa_links') 
    tonnage = models.DecimalField(max_digits=10, decimal_places=2)
    rate_per_tonne = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    class Meta:
        db_table = 'hpa_lr_links'
        unique_together = [['hpa', 'lr']]
```