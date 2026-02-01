# 🔌 API QUICK REFERENCE GUIDE

## Test Environment

### URLs
```
Backend API Base: http://localhost:8000/api/v1
Frontend Dev: http://localhost:5173
Admin Panel: http://localhost:8000/admin
```

### Test Credentials
```
Username: admin
Password: admin123
```

### Authentication
```bash
# Login to get JWT token
curl -X POST http://localhost:8000/api/v1/accounts/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Response will contain:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": { ... }
}

# Use in subsequent requests:
curl -H "Authorization: Bearer <access_token>" ...
```

---

## EXISTING API ENDPOINTS (Current Implementation)

### Authentication
```
POST   /api/v1/accounts/auth/login/              # Login
POST   /api/v1/accounts/auth/refresh/            # Refresh token
POST   /api/v1/accounts/auth/logout/             # Logout
GET    /api/v1/accounts/users/                   # List users
```

### Masters
```
GET    /api/v1/masters/companies/                # List companies
POST   /api/v1/masters/companies/                # Create company
GET    /api/v1/masters/branches/                 # List branches
POST   /api/v1/masters/branches/                 # Create branch
GET    /api/v1/masters/consignors/               # List consignors
POST   /api/v1/masters/consignors/               # Create consignor
GET    /api/v1/masters/parties/                  # List parties/consignees
POST   /api/v1/masters/parties/                  # Create party
GET    /api/v1/masters/trucks/                   # List trucks
POST   /api/v1/masters/trucks/                   # Create truck
```

### LR Management
```
GET    /api/v1/lr/lorry-receipts/                # List LRs
POST   /api/v1/lr/lorry-receipts/                # Create LR
GET    /api/v1/lr/lorry-receipts/{id}/           # Get LR details
PUT    /api/v1/lr/lorry-receipts/{id}/           # Update LR
DELETE /api/v1/lr/lorry-receipts/{id}/           # Delete LR
GET    /api/v1/lr/lorry-receipts/{id}/items/     # Get LR items
POST   /api/v1/lr/lorry-receipts/{id}/items/     # Add LR item
```

### HPA Management
```
GET    /api/v1/hpa/hire-payment-advices/         # List HPAs
POST   /api/v1/hpa/hire-payment-advices/         # Create HPA
GET    /api/v1/hpa/hire-payment-advices/{id}/    # Get HPA details
PUT    /api/v1/hpa/hire-payment-advices/{id}/    # Update HPA
DELETE /api/v1/hpa/hire-payment-advices/{id}/    # Delete HPA
```

### Payment Management
```
GET    /api/v1/payments/payments/                # List payments
POST   /api/v1/payments/payments/                # Create payment
GET    /api/v1/payments/payments/{id}/           # Get payment details
```

### POD Management
```
GET    /api/v1/pod/proof-of-deliveries/          # List PODs
POST   /api/v1/pod/proof-of-deliveries/          # Create POD
GET    /api/v1/pod/proof-of-deliveries/{id}/     # Get POD details
```

### Billing
```
GET    /api/v1/billing/bills/                    # List bills
POST   /api/v1/billing/bills/                    # Create bill
GET    /api/v1/billing/bills/{id}/               # Get bill details
PUT    /api/v1/billing/bills/{id}/               # Update bill
DELETE /api/v1/billing/bills/{id}/               # Delete bill
```

### Reports
```
GET    /api/v1/reports/summary/                  # Get summary report
GET    /api/v1/reports/lr_report/                # LR report
GET    /api/v1/reports/hpa_report/               # HPA report
GET    /api/v1/reports/payment_report/           # Payment report
GET    /api/v1/reports/bill_report/              # Bill report
```

### Dashboard
```
GET    /api/v1/dashboard/statistics/             # Dashboard statistics
```

---

## NEW API ENDPOINTS (To Be Implemented)

### PHASE 1: Invoice Management

#### Create HPA with Multiple Invoices
```
POST /api/v1/hpa/hire-payment-advices/
Body: {
  "branch": 1,
  "lr": 5,
  "truck": 3,
  "tons": 25.5,
  "rate_per_tonne": 1500,
  "from_location": "Mumbai",
  "to_location": "Delhi",
  "driver_name": "Rajesh Kumar",
  "driver_mob": "9876543210",
  "invoices": [
    {"invoice_number": "INV-001", "invoice_date": "2026-01-15", "amount": 15000},
    {"invoice_number": "INV-002", "invoice_date": "2026-01-16", "amount": 18000},
    {"invoice_number": "INV-003", "invoice_date": "2026-01-17", "amount": 12000}
  ]
}
```

#### Add Invoice to Existing HPA
```
POST /api/v1/hpa/hire-payment-advices/{hpa_id}/add_invoice/
Body: {
  "invoice_number": "INV-004",
  "invoice_date": "2026-01-18",
  "amount": 20000,
  "remarks": "Additional consignment"
}
```

#### Get All Invoices for HPA
```
GET /api/v1/hpa/hire-payment-advices/{hpa_id}/invoices/
Response: [
  {"id": 1, "invoice_number": "INV-001", "invoice_date": "2026-01-15", "amount": 15000},
  {"id": 2, "invoice_number": "INV-002", "invoice_date": "2026-01-16", "amount": 18000},
  ...
]
```

#### Delete Invoice
```
DELETE /api/v1/hpa/hire-payment-advices/{hpa_id}/invoices/{invoice_id}/
```

---

### PHASE 2: Active HPA Dashboard

#### Get Active HPAs
```
GET /api/v1/hpa/active-hpas/
Query Params:
  - search: Search by HPA#, LR#, Invoice#, Truck#, Driver
  - from_date: Filter by date range (YYYY-MM-DD)
  - to_date: Filter by date range (YYYY-MM-DD)
  - payment_status: Filter by payment status
  - page: Page number
  - page_size: Results per page

Response: {
  "count": 45,
  "next": "...",
  "previous": "...",
  "results": [
    {
      "id": 1,
      "hpa_number": "HPA-0001",
      "hpa_date": "2026-01-15",
      "lr_count": 2,
      "invoice_list": "INV-001, INV-002, INV-003",
      "truck_number": "MH-12-AB-1234",
      "lorry_hire_rs": 38250,
      "balance_rs": 15000,
      "payment_status": "PARTIAL",
      "days_active": 5
    },
    ...
  ]
}
```

#### Get Active HPA Statistics
```
GET /api/v1/hpa/active-hpas/statistics/
Response: {
  "total_active": 45,
  "total_lorry_hire": 1250000,
  "total_balance": 450000,
  "avg_days_active": 4.5,
  "by_payment_status": {
    "PENDING": 20,
    "PARTIAL": 15,
    "PAID": 10
  },
  "by_branch": {
    "Mumbai": 25,
    "Delhi": 20
  }
}
```

---

### PHASE 3: Billing Templates

#### List All Templates
```
GET /api/v1/billing/templates/
Response: [
  {
    "id": 1,
    "name": "Standard Format",
    "code": "STD_FMT_V1",
    "template_type": "STANDARD",
    "consignor": null,
    "is_default": true,
    "is_active": true
  },
  ...
]
```

#### Create Template
```
POST /api/v1/billing/templates/
Body: {
  "name": "Chettinad Detailed Format",
  "code": "CHET_DET_V1",
  "description": "Detailed format for Chettinad Cement",
  "consignor": 1,
  "template_type": "DETAILED",
  "is_default": true,
  "field_mapping": {
    "show_lr_number": true,
    "show_invoice_number": true,
    "show_truck_number": true,
    "show_driver_name": false,
    "group_by": "destination"
  },
  "calculation_rules": {
    "freight_formula": "quantity_mt * rate_per_mt",
    "gst_applicable": true,
    "sgst_rate": 9,
    "cgst_rate": 9
  }
}
```

#### Get Templates for Consignor
```
GET /api/v1/billing/templates/for-consignor/{consignor_id}/
```

#### Preview Template
```
GET /api/v1/billing/templates/preview/?template_id=1&sample_data=true
```

#### Create Bill with Template
```
POST /api/v1/billing/bills/
Body: {
  "branch": 1,
  "consignor": 1,
  "billing_template": 1,  // New field
  "bill_date": "2026-01-20",
  "from_date": "2026-01-01",
  "to_date": "2026-01-20",
  // ... other fields
}
```

---

### PHASE 4: Client Payment Tracking

#### List Client Accounts
```
GET /api/v1/billing/client-accounts/
Response: [
  {
    "consignor_id": 1,
    "consignor_name": "Chettinad Cement",
    "total_billed": 5000000,
    "total_paid": 4500000,
    "outstanding": 500000,
    "aging": {
      "0-30": 200000,
      "31-60": 150000,
      "61-90": 100000,
      "90+": 50000
    },
    "last_payment_date": "2026-01-15"
  },
  ...
]
```

#### Get Client Details
```
GET /api/v1/billing/client-accounts/{consignor_id}/
Response: {
  "consignor": {...},
  "summary": {
    "total_billed": 5000000,
    "total_paid": 4500000,
    "outstanding": 500000,
    "avg_payment_days": 35
  },
  "aging": {...},
  "recent_bills": [...],
  "recent_payments": [...]
}
```

#### Get Client Bills
```
GET /api/v1/billing/client-accounts/{consignor_id}/bills/
Query Params:
  - status: Filter by status (PENDING, PAID, OVERDUE)
```

#### Record Payment Against Bill
```
POST /api/v1/billing/bills/{bill_id}/add-payment/
Body: {
  "payment_date": "2026-01-20",
  "amount": 50000,
  "payment_method": "BANK_TRANSFER",
  "reference_number": "TXN123456",
  "remarks": "Partial payment"
}
```

#### Get Outstanding Bills
```
GET /api/v1/billing/bills/outstanding/
Query Params:
  - consignor: Filter by consignor
  - aging_bucket: Filter by aging (0-30, 31-60, 61-90, 90+)
```

#### Enhanced Bill Search
```
GET /api/v1/billing/bills/?search=<query>
# Now supports searching by:
# - Bill number
# - Consignor name
# - HPA number (NEW)
# - Invoice number (NEW)
# - Truck number (NEW)
```

---

### PHASE 5: Outstanding Reports

#### Outstanding Summary
```
GET /api/v1/reports/outstanding-summary/
Response: {
  "total_outstanding": 2500000,
  "by_aging": {
    "0-30": 1000000,
    "31-60": 800000,
    "61-90": 500000,
    "90+": 200000
  },
  "by_client": [
    {"consignor": "Chettinad Cement", "outstanding": 500000},
    ...
  ],
  "by_branch": {...}
}
```

#### Aging Analysis
```
GET /api/v1/reports/aging-analysis/
Query Params:
  - from_date: Start date
  - to_date: End date
  - consignor: Filter by consignor
```

#### Settlement Report
```
GET /api/v1/reports/settlement-report/
Query Params:
  - from_date: Start date (YYYY-MM-DD)
  - to_date: End date (YYYY-MM-DD)

Response: {
  "period": {"from": "2026-01-01", "to": "2026-01-31"},
  "bills_raised": 45,
  "amount_billed": 3000000,
  "payments_received": 2500000,
  "outstanding": 500000,
  "collection_efficiency": 83.33
}
```

#### Client Statement
```
GET /api/v1/reports/client-statement/{consignor_id}/
Query Params:
  - from_date: Start date
  - to_date: End date
  - format: pdf or json

Response (JSON): {
  "consignor": {...},
  "period": {...},
  "opening_balance": 100000,
  "bills": [...],
  "payments": [...],
  "closing_balance": 500000
}

Response (PDF): Binary PDF file download
```

#### Export Outstanding as CSV
```
GET /api/v1/reports/outstanding-detailed/?export=csv
```

---

## SAMPLE API TEST SCRIPT

### Python Example
```python
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"
USERNAME = "admin"
PASSWORD = "admin123"

# Login
def login():
    response = requests.post(f"{BASE_URL}/accounts/auth/login/", json={
        "username": USERNAME,
        "password": PASSWORD
    })
    return response.json()['access']

# Example: Create HPA with invoices
def create_hpa_with_invoices(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    data = {
        "branch": 1,
        "lr": 5,
        "truck": 3,
        "tons": 25.5,
        "rate_per_tonne": 1500,
        "from_location": "Mumbai",
        "to_location": "Delhi",
        "driver_name": "Rajesh Kumar",
        "invoices": [
            {"invoice_number": "INV-001", "amount": 15000},
            {"invoice_number": "INV-002", "amount": 18000},
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/hpa/hire-payment-advices/",
        json=data,
        headers=headers
    )
    return response.json()

# Run
token = login()
print(f"Token: {token[:20]}...")
hpa = create_hpa_with_invoices(token)
print(f"Created HPA: {hpa['hpa_number']}")
```

---

## COMMON QUERY PARAMETERS

### Pagination
```
?page=1&page_size=25
```

### Search
```
?search=<term>
```

### Filtering
```
?status=PENDING
?from_date=2026-01-01&to_date=2026-01-31
?consignor=1
?branch=1
```

### Sorting
```
?ordering=-created_at        # Descending by created_at
?ordering=hpa_number         # Ascending by hpa_number
```

---

## ERROR RESPONSES

### 400 Bad Request
```json
{
  "field_name": ["Error message"],
  "another_field": ["Another error"]
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## TESTING WORKFLOW

### 1. Test Authentication
```bash
curl -X POST http://localhost:8000/api/v1/accounts/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 2. Test with Token
```bash
TOKEN="<your_token_here>"

curl -X GET http://localhost:8000/api/v1/hpa/active-hpas/ \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Test POST Request
```bash
curl -X POST http://localhost:8000/api/v1/hpa/hire-payment-advices/1/add_invoice/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invoice_number":"INV-005","amount":25000}'
```

---

**Last Updated:** [DATE]  
**API Version:** v1  
**Base URL:** http://localhost:8000/api/v1

---

**END OF API REFERENCE GUIDE**

