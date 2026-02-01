# HPA Multiple Invoice with Delivery Location Tracking

## Overview

This document explains the enhanced HPA system that supports **multiple invoices** per HPA, where each invoice can have:
- Multiple associated LRs
- Different delivery locations
- Separate quantity and material tracking

---

## Business Scenario

### Example Use Case:
**Single HPA #2369 contains multiple shipments with different destinations:**

```
HPA #2369 (Truck: MH-12-AB-1234, Driver: John Doe)
├── Invoice INV-20153572
│   ├── LRs: LR-2369, LR-2370
│   ├── From: Mumbai Warehouse → To: Pune Distribution Center
│   ├── Quantity: 35 MT Cement (Grade 53)
│   └── Bags: 700 bags
├── Invoice INV-20153573
│   ├── LRs: LR-2371
│   ├── From: Mumbai Warehouse → To: Nashik Construction Site
│   ├── Quantity: 20 MT Cement (Grade 43)
│   └── Bags: 400 bags
└── Invoice INV-20153574
    ├── LRs: LR-2372, LR-2373
    ├── From: Mumbai Warehouse → To: Mumbai Local Dealer
    ├── Quantity: 15 MT Cement (OPC)
    └── Bags: 300 bags

Total HPA: 70 MT across 3 invoices to 3 different locations
```

---

## Database Structure

### HPAInvoice Model

```python
class HPAInvoice(BaseModel):
    # Link to parent HPA
    hpa = ForeignKey(HirePaymentAdvice)
    
    # Invoice Details
    invoice_number = CharField(max_length=50)
    invoice_date = DateField()
    
    # Multiple LRs per invoice (Many-to-Many)
    lrs = ManyToManyField(LorryReceipt)
    
    # Delivery Location per Invoice
    from_location = CharField(max_length=200)
    to_location = CharField(max_length=200)
    destination = CharField(max_length=200)
    
    # Material Details per Invoice
    quantity_mt = DecimalField()
    number_of_bags = IntegerField()
    material_description = TextField()
    
    # Financial
    amount = DecimalField()
    
    # Ordering
    sequence_number = IntegerField(default=1)
    remarks = TextField()
```

### Key Relationships

```
HirePaymentAdvice (1) ─────── (Many) HPAInvoice
                                      │
                                      │ (Many-to-Many)
                                      │
                                      └─────── (Many) LorryReceipt
```

---

## API Structure

### 1. Create HPA with Multiple Invoices

**Endpoint:** `POST /api/v1/hpa/hire-payment-advices/`

**Request Body:**
```json
{
  "branch": 1,
  "lr": 123,
  "lrs": [123, 124, 125],
  "truck": 45,
  "hpa_date": "2026-01-31",
  "rate_per_tonne": 1200,
  "advance_paid_rs": 5000,
  "diesel_amount": 3000,
  
  "invoices": [
    {
      "invoice_number": "INV-20153572",
      "invoice_date": "2026-01-31",
      "lr_ids": [123, 124],
      "from_location": "Mumbai Warehouse",
      "to_location": "Pune Distribution Center",
      "destination": "Pune",
      "quantity_mt": 35.00,
      "number_of_bags": 700,
      "material_description": "Grade 53 Cement",
      "amount": 42000,
      "remarks": "Urgent delivery"
    },
    {
      "invoice_number": "INV-20153573",
      "invoice_date": "2026-01-31",
      "lr_ids": [125],
      "from_location": "Mumbai Warehouse",
      "to_location": "Nashik Construction Site",
      "destination": "Nashik",
      "quantity_mt": 20.00,
      "number_of_bags": 400,
      "material_description": "Grade 43 Cement",
      "amount": 24000
    },
    {
      "invoice_number": "INV-20153574",
      "invoice_date": "2026-01-31",
      "lr_ids": [126, 127],
      "from_location": "Mumbai Warehouse",
      "to_location": "Mumbai Local Dealer",
      "destination": "Mumbai",
      "quantity_mt": 15.00,
      "number_of_bags": 300,
      "material_description": "OPC Cement",
      "amount": 18000
    }
  ]
}
```

**Response:**
```json
{
  "id": 456,
  "hpa_number": "LR-2369",
  "hpa_date": "2026-01-31",
  "branch": 1,
  "branch_name": "Mumbai Branch",
  "truck": 45,
  "truck_number": "MH-12-AB-1234",
  "driver_name": "John Doe",
  "driver_mob": "9876543210",
  "lorry_hire_rs": 84000.00,
  "total_deductions": 8000.00,
  "balance_rs": 76000.00,
  
  "invoices": [
    {
      "id": 789,
      "sequence_number": 1,
      "invoice_number": "INV-20153572",
      "invoice_date": "2026-01-31",
      "lrs": [123, 124],
      "lr_numbers": "LR-2369, LR-2370",
      "lr_count": 2,
      "from_location": "Mumbai Warehouse",
      "to_location": "Pune Distribution Center",
      "destination": "Pune",
      "quantity_mt": 35.00,
      "number_of_bags": 700,
      "material_description": "Grade 53 Cement",
      "amount": 42000.00,
      "remarks": "Urgent delivery"
    },
    {
      "id": 790,
      "sequence_number": 2,
      "invoice_number": "INV-20153573",
      "invoice_date": "2026-01-31",
      "lrs": [125],
      "lr_numbers": "LR-2371",
      "lr_count": 1,
      "from_location": "Mumbai Warehouse",
      "to_location": "Nashik Construction Site",
      "destination": "Nashik",
      "quantity_mt": 20.00,
      "number_of_bags": 400,
      "material_description": "Grade 43 Cement",
      "amount": 24000.00,
      "remarks": ""
    },
    {
      "id": 791,
      "sequence_number": 3,
      "invoice_number": "INV-20153574",
      "invoice_date": "2026-01-31",
      "lrs": [126, 127],
      "lr_numbers": "LR-2372, LR-2373",
      "lr_count": 2,
      "from_location": "Mumbai Warehouse",
      "to_location": "Mumbai Local Dealer",
      "destination": "Mumbai",
      "quantity_mt": 15.00,
      "number_of_bags": 300,
      "material_description": "OPC Cement",
      "amount": 18000.00,
      "remarks": ""
    }
  ],
  
  "invoice_list": "INV-20153572, INV-20153573, INV-20153574",
  "invoice_count": 3,
  "delivery_locations_summary": "Pune Distribution Center, Nashik Construction Site, Mumbai Local Dealer",
  
  "lr_count": 5,
  "payment_status": "PENDING"
}
```

### 2. Get HPA with Invoice Details

**Endpoint:** `GET /api/v1/hpa/hire-payment-advices/{id}/`

Returns the same structured response with all invoice details including LR associations and delivery locations.

### 3. Update HPA (Add/Modify Invoices)

**Endpoint:** `PATCH /api/v1/hpa/hire-payment-advices/{id}/`

Can update individual invoice details or add new invoices to existing HPA.

---

## Frontend Implementation Guide

### Creating HPA Form with Multiple Invoices

```jsx
// State structure
const [formData, setFormData] = useState({
  lr: null,
  lrs: [],
  truck: null,
  hpa_date: new Date().toISOString().split('T')[0],
  rate_per_tonne: 0,
  advance_paid_rs: 0,
  diesel_amount: 0,
  
  // Multiple invoices
  invoices: [
    {
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      lr_ids: [],
      from_location: '',
      to_location: '',
      destination: '',
      quantity_mt: 0,
      number_of_bags: 0,
      material_description: '',
      amount: 0,
      remarks: ''
    }
  ]
});

// Add new invoice
const addInvoice = () => {
  setFormData(prev => ({
    ...prev,
    invoices: [...prev.invoices, {
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      lr_ids: [],
      from_location: '',
      to_location: '',
      destination: '',
      quantity_mt: 0,
      number_of_bags: 0,
      material_description: '',
      amount: 0,
      remarks: ''
    }]
  }));
};

// Remove invoice
const removeInvoice = (index) => {
  setFormData(prev => ({
    ...prev,
    invoices: prev.invoices.filter((_, i) => i !== index)
  }));
};

// Update specific invoice field
const updateInvoice = (index, field, value) => {
  setFormData(prev => ({
    ...prev,
    invoices: prev.invoices.map((inv, i) => 
      i === index ? { ...inv, [field]: value } : inv
    )
  }));
};

// Handle LR selection for invoice (multi-select)
const handleInvoiceLRSelection = (index, selectedLRIds) => {
  const selectedLRs = lrs.filter(lr => selectedLRIds.includes(lr.id));
  
  // Auto-populate location from first selected LR
  if (selectedLRs.length > 0) {
    const firstLR = selectedLRs[0];
    updateInvoice(index, 'from_location', firstLR.from_location);
    updateInvoice(index, 'to_location', firstLR.to_location);
    
    // Calculate total quantity from selected LRs
    const totalQuantity = selectedLRs.reduce((sum, lr) => sum + parseFloat(lr.quantity_mt || 0), 0);
    updateInvoice(index, 'quantity_mt', totalQuantity);
  }
  
  updateInvoice(index, 'lr_ids', selectedLRIds);
};
```

### Invoice UI Component

```jsx
{formData.invoices.map((invoice, index) => (
  <div key={index} className="invoice-section">
    <div className="invoice-header">
      <h4>Invoice #{index + 1}</h4>
      {index > 0 && (
        <button onClick={() => removeInvoice(index)}>Remove</button>
      )}
    </div>
    
    {/* Invoice Number */}
    <input
      type="text"
      placeholder="Invoice Number"
      value={invoice.invoice_number}
      onChange={(e) => updateInvoice(index, 'invoice_number', e.target.value)}
    />
    
    {/* LR Multi-Select */}
    <select
      multiple
      value={invoice.lr_ids}
      onChange={(e) => {
        const selectedIds = Array.from(e.target.selectedOptions, option => parseInt(option.value));
        handleInvoiceLRSelection(index, selectedIds);
      }}
    >
      {availableLRs.map(lr => (
        <option key={lr.id} value={lr.id}>
          {lr.lr_number} - {lr.consignee?.name} ({lr.quantity_mt} MT)
        </option>
      ))}
    </select>
    
    {/* Delivery Location */}
    <input
      type="text"
      placeholder="From Location"
      value={invoice.from_location}
      onChange={(e) => updateInvoice(index, 'from_location', e.target.value)}
    />
    <input
      type="text"
      placeholder="To Location (Delivery Destination)"
      value={invoice.to_location}
      onChange={(e) => updateInvoice(index, 'to_location', e.target.value)}
    />
    
    {/* Quantity */}
    <input
      type="number"
      step="0.01"
      placeholder="Quantity (MT)"
      value={invoice.quantity_mt}
      onChange={(e) => updateInvoice(index, 'quantity_mt', parseFloat(e.target.value))}
    />
    
    {/* Material Description */}
    <textarea
      placeholder="Material Description"
      value={invoice.material_description}
      onChange={(e) => updateInvoice(index, 'material_description', e.target.value)}
    />
  </div>
))}

<button onClick={addInvoice}>+ Add Another Invoice</button>
```

---

## Benefits

### 1. **Accurate Tracking**
- Each invoice maintains its own delivery location
- Clear association between invoice → LRs → destination
- No confusion about where each shipment is going

### 2. **Flexible Operations**
- One truck can carry multiple shipments to different locations
- Each location tracked separately
- Better route optimization

### 3. **Financial Clarity**
- Each invoice has its own amount
- Can track payment per invoice
- Better billing reconciliation

### 4. **Reporting**
- Reports can show deliveries grouped by location
- Track performance per destination
- Better analytics on delivery patterns

---

## Migration from Old System

### Backward Compatibility

The system maintains backward compatibility with the old single `invoice_number` field:

1. **Old HPAs:** Legacy `invoice_number` field is still present
2. **New HPAs:** Use `invoices` relationship
3. **Display:** `invoice_list` property combines both old and new

### Helper Properties

```python
# HPA Model Properties
@property
def invoice_list(self):
    """Returns comma-separated list of all invoice numbers"""
    # Returns: "INV-001, INV-002, INV-003"

@property
def invoice_count(self):
    """Total count of invoices"""
    # Returns: 3

@property
def delivery_locations_summary(self):
    """Returns comma-separated list of all unique delivery locations"""
    # Returns: "Pune, Nashik, Mumbai"
```

---

## Testing Checklist

- [ ] Create HPA with single invoice
- [ ] Create HPA with multiple invoices (3+)
- [ ] Associate multiple LRs with single invoice
- [ ] Verify different delivery locations per invoice
- [ ] Auto-populate location from selected LRs
- [ ] Display all invoices in HPA detail view
- [ ] PDF shows all invoices with their locations
- [ ] Search HPA by invoice number
- [ ] Filter by delivery location
- [ ] Backward compatibility with old HPAs

---

## Next Steps

1. ✅ Model and migration created
2. ✅ Serializers updated
3. ⏳ Frontend UI for multi-invoice management
4. ⏳ PDF generator enhancement
5. ⏳ Search/filter by delivery location
6. ⏳ Reports showing location-wise breakdown
