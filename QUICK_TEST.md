# Quick Test Checklist

## Before Starting
- [ ] Backend server running (`python manage.py runserver`)
- [ ] Frontend server running (`npm run dev`)
- [ ] Logged into the application
- [ ] Have at least one truck, consignor, and party in the system

## Quick Test (5 minutes)

1. **Go to LR Management page**
   - [ ] See "Create Multiple LRs for HPA" button
   - [ ] Click it

2. **Fill in ONE LR form:**
   - Truck: Select any truck
   - Consignor: Select any consignor
   - Consignee: Select any party
   - LR Date: Today's date
   - From Location: "Mumbai"
   - To Location: "Bangalore"
   - Quantity: "35"
   - Bags: "700"
   - Driver Name: "Test Driver"
   - Driver License: "TEST123"
   - Driver Mobile: "1234567890"
   - Payment Term: "To Be Billed"
   - Status: "Draft"

3. **Create LR:**
   - [ ] Click "Create 1 LR(s) & Continue to HPA"
   - [ ] Wait for success
   - [ ] Should move to HPA form

4. **Fill in HPA:**
   - Rate per Tonne: "1000"
   - [ ] Click "Create HPA"
   - [ ] Should see success message

5. **Verify:**
   - [ ] Check LR Management - see the new LR
   - [ ] Check HPA Management - see the new HPA
   - [ ] HPA should show 1 LR linked

## Full Test (Multiple LRs)

1. **Create 2-3 LRs:**
   - Fill first LR form
   - Click "Add Another LR"
   - Fill second LR form (different data)
   - Repeat for third if desired

2. **Create all LRs:**
   - [ ] Click "Create X LR(s) & Continue to HPA"
   - [ ] All should create successfully

3. **Create HPA:**
   - [ ] Verify total tons = sum of all LR quantities
   - [ ] Fill rate per tonne
   - [ ] Create HPA
   - [ ] Should link all LRs

4. **Verify:**
   - [ ] All LRs in LR Management
   - [ ] HPA in HPA Management
   - [ ] HPA shows correct LR count
   - [ ] HPA tons = sum of all LR quantities

## If Errors Occur

1. **Open Browser Console (F12)**
   - Check for red error messages
   - Copy error details

2. **Check Backend Terminal**
   - Look for error tracebacks
   - Note the error message

3. **Common Fixes:**
   - Ensure all required fields filled
   - Check data types (numbers for quantity/bags)
   - Verify servers are running
   - Try refreshing the page
