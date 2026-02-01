# Phase 4: POD (Proof of Delivery) and Enhanced Bill Management

## 4.1 POD Workflow

### Process Flow:
```
1. LR Created → 2. HPA Created → 3. Truck Dispatched → 4. Delivery Completed → 5. POD Uploaded → 6. Bill Creation Enabled
```

### POD Requirements:
1. **POD Upload Form**
   - Select LR from dropdown (only LRs linked to HPAs without POD)
   - Show LR Number, HPA Number, Invoice Number in selection list
   - Delivery date/time
   - Received by details (name, designation, company)
   - Upload signature image
   - Upload POD document/photo
   - Delivery condition rating
   - Customer feedback

2. **POD Verification**
   - Admin can verify uploaded PODs
   - Reject with remarks if issues found
   - Only verified PODs enable bill creation

3. **POD Dashboard**
   - Pending PODs (delivered but not uploaded)
   - Uploaded PODs (pending verification)
   - Verified PODs (ready for billing)
   - Rejected PODs (need re-upload)

## 4.2 Enhanced Bill Creation

### Current Issues:
- Bill creation not linked to POD completion
- No filtering by consignor/consignee
- Missing comprehensive invoice selection

### New Bill Creation Process:
1. **Step 1: Select Customer**
   - Choose Consignor OR Consignee
   - Filter: only customers with completed deliveries (verified PODs)

2. **Step 2: Select Invoices/HPAs**
   - Show all HPAs for selected customer where:
     - POD is verified
     - Bill not yet created
   - Display: HPA Number, LR Numbers, Invoice Numbers, Total Amount
   - Multi-select capability

3. **Step 3: Bill Configuration**
   - Choose billing template
   - Review line items
   - Apply taxes/discounts
   - Generate preview

4. **Step 4: Bill Generation**
   - Create bill record
   - Generate PDF
   - Mark HPAs as billed
   - Update payment status

## 4.3 Bill-POD Integration Rules

### Business Rules:
1. Cannot create bill without verified POD
2. One HPA can appear in only one bill
3. Bill amount = Sum of HPA amounts + applicable taxes
4. Bill creation automatically updates HPA status
5. Bill cancellation should revert HPA status

### Status Flow:
```
HPA Status: CREATED → DISPATCHED → DELIVERED → POD_UPLOADED → POD_VERIFIED → BILLED → PAID
```