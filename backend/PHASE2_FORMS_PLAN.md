# Phase 2: Enhanced Forms Implementation Plan

## 2.1 Dynamic LR Form Features

### Frontend Requirements:
1. **Multi-Item LR Support**
   - Add/Remove LR items dynamically
   - Each item can have different consignor/consignee
   - Auto-calculate totals

2. **Form Sections** (based on physical form):
   ```
   - Header: SAP No, LR Submitted Time, Date
   - Parties: Consignor, Consignee/Depot/Party, Delivery At
   - Transport: Vehicle No, Driver Name/Phone/License
   - Goods: Material Description, Quantity, Bags, Grade
   - Loading: Loading Department, Please Load, No. of Loads
   - Payment: Terms of Payment, GST Payable By
   - Additional: Signature, Remarks
   ```

3. **Auto-population Features**:
   - Vehicle selection auto-fills driver details
   - Consignor selection auto-fills GSTIN
   - Grade selection provides standard options (53/43/OPC)

## 2.2 Enhanced HPA Form

### Key Features:
1. **Multi-LR Selection**
   - Search and select from open LRs
   - Each LR shows: LR No, Date, Consignor, Consignee, Quantity
   - Different rates per LR allowed
   
2. **Payment Breakdown**:
   - Lorry Hire calculation (auto from LRs)
   - Less Advance field
   - Diesel payment tracking
   - Bank details
   - Balance calculation
   - Other charges

3. **Dynamic Rate Management**:
   - Default rate from master data
   - Override capability with reason
   - Auto-calculate totals

## 2.3 Form Validation Rules

### LR Validation:
- At least one LR item required
- Consignor/Consignee mandatory for each item
- Quantity > 0 for each item
- Truck must be available (not on another active trip)

### HPA Validation:
- At least one LR must be selected
- All selected LRs must be in ISSUED status
- Truck consistency across all LRs
- Payment amounts must be positive
- Balance = Lorry Hire - Advance - Diesel - Other charges