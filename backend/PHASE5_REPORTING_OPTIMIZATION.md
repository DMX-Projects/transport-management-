# Phase 5: Advanced Reporting and Performance Optimization

## 5.1 Universal Search Implementation

### Search Capabilities:
1. **Global Search Bar**
   - Search across all entities: LR, HPA, Bill, Payment, POD
   - Search fields: Numbers, truck number, driver name, customer name
   - Auto-complete with result type indication

2. **Entity-specific Quick Search**
   - LR Search: LR number, truck, driver, consignor, route
   - HPA Search: HPA number, invoice number, truck, amount range
   - Bill Search: Bill number, customer, amount, date range
   - Payment Search: Reference number, HPA, payment method
   - POD Search: LR number, delivery date, customer

### Search Result Display:
```json
{
  "type": "LR",
  "number": "LR-2369",
  "truck": "MH40CD6025", 
  "route": "Bangalore → Mumbai",
  "status": "DELIVERED",
  "amount": "₹27,280"
}
```

## 5.2 Excel Export System

### Export Requirements:
1. **Structured Excel Output**
   - Professional formatting with headers
   - Multiple sheets for related data
   - Charts and summaries
   - Conditional formatting for status

2. **Export Types**
   - Single entity export (one LR, HPA, etc.)
   - Bulk export with filters
   - Dashboard summary export
   - Custom date range exports

3. **Excel Templates**
   ```
   LR Report Sheet 1: LR List
   LR Report Sheet 2: LR Items Details  
   LR Report Sheet 3: Summary by Route
   
   HPA Report Sheet 1: HPA List
   HPA Report Sheet 2: Payment Breakdown
   HPA Report Sheet 3: Linked LRs
   ```

## 5.3 Performance Optimization

### Database Optimization:
1. **Indexing Strategy**
   ```sql
   -- Critical indexes for fast search
   CREATE INDEX idx_lr_number ON lorry_receipts(lr_number);
   CREATE INDEX idx_truck_search ON lorry_receipts(truck_id, lr_date);
   CREATE INDEX idx_hpa_search ON hire_payment_advice(hpa_number, hpa_date);
   CREATE INDEX idx_bill_customer ON bills(consignor_id, bill_date);
   
   -- Composite indexes for dashboard queries
   CREATE INDEX idx_lr_status_date ON lorry_receipts(status, lr_date, branch_id);
   CREATE INDEX idx_payment_date_type ON payment_transactions(payment_date, payment_type);
   ```

2. **Query Optimization**
   - Use select_related() for foreign keys
   - Use prefetch_related() for reverse relations
   - Implement pagination for large datasets
   - Database-level aggregations instead of Python loops

3. **Caching Strategy**
   ```python
   # Redis caching for frequently accessed data
   - Dashboard metrics: 5-minute cache
   - Master data: 1-hour cache
   - Reports: 15-minute cache
   - Search results: 2-minute cache
   ```

4. **Response Time Targets**
   - Dashboard load: < 2 seconds
   - Report generation: < 5 seconds (even for 1 million records)
   - Search results: < 1 second
   - Excel export: < 10 seconds (for up to 100K records)

## 5.4 Branch-based Data Isolation

### Implementation Strategy:
1. **Database Level**
   ```python
   class BranchFilteredManager(models.Manager):
       def get_queryset(self):
           user = get_current_user()  # Thread-local user
           if user.can_access_all_branches:
               return super().get_queryset()
           elif user.branch:
               return super().get_queryset().filter(branch=user.branch)
           return super().get_queryset().none()
   ```

2. **API Level**
   - Automatic branch filtering in viewsets
   - Admin override with explicit branch selection
   - Audit logging for cross-branch access

3. **Frontend Level**
   - Branch selector for admin users
   - Branch-specific dashboards
   - Clear indication of current data scope

## 5.5 Advanced Dashboard

### Revenue Dashboard Components:
1. **Financial Overview**
   - Total Revenue (bills generated)
   - Total Expenses (payments made)
   - Net Profit/Loss
   - Month-over-month growth

2. **Operational Metrics**
   - Active trucks count
   - Pending LRs, HPAs, PODs, Bills
   - Average delivery time
   - Customer satisfaction rating

3. **Interactive Charts**
   - Revenue vs Expense trend
   - Route-wise profitability
   - Truck utilization analysis
   - Customer payment patterns

4. **Alerts and Notifications**
   - Overdue payments
   - Pending PODs > 7 days
   - High-value transactions
   - Performance anomalies

### Revenue Calculation Logic:
```python
# Monthly Revenue Calculation
monthly_revenue = Bill.objects.filter(
    bill_date__month=month,
    status__in=['GENERATED', 'SENT', 'PAID']
).aggregate(Sum('grand_total'))

# Monthly Expenses
monthly_expenses = PaymentTransaction.objects.filter(
    payment_date__month=month
).aggregate(Sum('amount'))

# Net Profit
net_profit = monthly_revenue - monthly_expenses
```