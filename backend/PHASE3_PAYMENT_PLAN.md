# Phase 3: Payment Management System

## 3.1 Payment Transaction Management

### Features Required:
1. **HPA Payment Breakdown**
   - Lorry Hire Amount (from LR calculations)
   - Less Advance (payments made before)
   - Diesel Payments (with pump details)
   - Bank Transfer details
   - Other Charges/Deductions
   - Final Balance Calculation

2. **Payment Tracking Dashboard**
   - Pending Payments (by HPA)
   - Payment History
   - Driver/Truck wise payment summary
   - Month-wise payment reports

3. **Payment Methods Support**
   - Cash payments
   - Bank transfers
   - UPI payments
   - Cheque payments
   - Fuel card transactions

## 3.2 Revenue vs Expense Tracking

### Capital Logistics Cash Flow:
```
INCOME (Revenue):
- Bills generated to customers
- Customer payments received

EXPENSES (Payments):
- HPA payments to truck owners/drivers
- Advance payments
- Diesel/Fuel costs
- Commission payments
- Other operational costs

NET PROFIT = Total Revenue - Total Expenses
```

### Dashboard Metrics:
- Monthly Revenue (from bills)
- Monthly Expenses (from payments)
- Net Profit/Loss
- Pending Receivables (unpaid bills)
- Pending Payables (unpaid HPAs)
- Cash Flow projection

## 3.3 Advanced Reporting Requirements

### Report Types:
1. **LR Report**
   - All LRs with filters (date, status, truck, consignor)
   - Excel export with full details
   - Search by LR number, truck, driver, etc.

2. **HPA Report**
   - HPA details with linked LRs
   - Payment status and breakdown
   - Outstanding amounts

3. **Payment Report**
   - All transactions with categorization
   - Truck/Driver wise payment summary
   - Payment method analysis
   - Outstanding payment tracking

4. **Bill Report**
   - Customer billing analysis
   - Payment received vs pending
   - Customer wise revenue analysis

5. **POD Report**
   - Delivery completion tracking
   - Pending PODs
   - Delivery performance metrics