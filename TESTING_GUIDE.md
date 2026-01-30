# Testing Guide: Create Multiple LRs for HPA

## Prerequisites

1. **Ensure servers are running:**
   - Backend: `cd backend && python manage.py runserver`
   - Frontend: `cd frontend && npm run dev`

2. **Ensure you're logged in** to the application

## Step-by-Step Testing Workflow

### Step 1: Access the Feature

1. Navigate to **LR Management** page
2. Look for the button: **"Create Multiple LRs for HPA"** (next to "Create New LR")
3. Click the button

### Step 2: Fill in First LR Form

You'll see a form with the "old format" fields. Fill in:

**Required Fields:**
- **Truck**: Select a truck from dropdown
- **Consignor**: Select consignor
- **Consignee**: Select consignee/party
- **LR Date**: Select date
- **From Location**: Enter location (e.g., "Mumbai")
- **To Location**: Enter location (e.g., "Bangalore")
- **Quantity (M.T.)**: Enter number (e.g., 35)
- **Number of Bags**: Enter number (e.g., 700)
- **Driver Name**: Enter name
- **Driver License No.**: Enter license number
- **Driver Mobile**: Enter phone number
- **Payment Term**: Select from dropdown
- **Status**: Select status (default: Draft)

**Optional Fields:**
- SAP Number
- Material Description
- Grade
- Grade Quantity
- Delivery At
- Destination
- Expected Loading Date
- Expected Delivery Date
- Remarks

### Step 3: Add More LR Forms (Optional)

1. Click **"Add Another LR"** button at the bottom
2. Fill in the second LR form with different data
3. You can add as many LRs as needed
4. You can remove LRs using the "Remove" button (but at least one is required)

### Step 4: Review Totals

At the bottom, you'll see:
- **Total Quantity**: Sum of all LR quantities
- **Total Bags**: Sum of all LR bags

### Step 5: Create LRs

1. Click **"Create X LR(s) & Continue to HPA"** button
2. Wait for all LRs to be created (you'll see "Creating LRs..." message)
3. If successful, you'll automatically move to the HPA creation step

### Step 6: Fill in HPA Details

You'll see a pre-populated HPA form with:
- **LRs created**: Shows list of created LR numbers
- **Total Tons**: Auto-calculated from all LRs
- **Truck, From/To, Driver**: Auto-filled from first LR

**Fill in:**
- **Rate per Tonne** * (Required)
- **Invoice Number** (Optional)
- **HPA Date** * (Required, pre-filled)
- **Advance Paid (₹)** (Optional, default: 0)
- **Diesel Amount (₹)** (Optional, default: 0)
- **Pump Name** (Optional)
- **Bank Amount (₹)** (Optional, default: 0)
- **Other Deductions (₹)** (Optional, default: 0)
- **Other Deductions Description** (Optional)
- **Remarks** (Optional)

**Auto-calculated fields:**
- **Lorry Hire (₹)**: Total Tons × Rate per Tonne
- **Total Deductions (₹)**: Sum of all deductions
- **Balance (₹)**: Lorry Hire - Total Deductions

### Step 7: Create HPA

1. Click **"Create HPA"** button
2. Wait for creation (you'll see "Creating HPA..." message)
3. If successful, you'll see: **"✅ Multiple LRs and HPA created successfully!"**
4. Modal will close automatically

### Step 8: Verify Results

1. Go to **LR Management** page
   - You should see all the created LRs in the list
   - Each LR should show its details correctly

2. Go to **HPA Management** page
   - You should see the created HPA
   - HPA number should match the first LR's number
   - Check that tons are correctly aggregated
   - Check that all linked LRs are shown

3. Check HPA Details:
   - Open the HPA detail view
   - Verify it shows all linked LRs
   - Verify financial calculations are correct

## Common Issues & Troubleshooting

### Issue 1: "Error creating LRs"
- **Check**: Browser console (F12) for detailed error
- **Common causes**:
  - Missing required fields
  - Invalid data format
  - Server not running
  - Network error

### Issue 2: "Error creating HPA"
- **Check**: Browser console for error details
- **Common causes**:
  - Rate per tonne not provided
  - Validation error
  - LRs not created successfully

### Issue 3: LRs created but HPA not linking
- **Check**: Backend logs
- **Verify**: Migration was run successfully
- **Check**: HPA serializer is receiving `lrs` array

### Issue 4: Totals not calculating correctly
- **Check**: All LR quantities are valid numbers
- **Verify**: No empty quantity fields

## Expected Behavior

✅ **Success Indicators:**
- All LRs created successfully
- HPA created and linked to all LRs
- HPA number matches first LR number
- Total tons = sum of all LR quantities
- All LRs visible in LR Management
- HPA visible in HPA Management with correct data

## Testing Checklist

- [ ] Can open "Create Multiple LRs for HPA" modal
- [ ] Can fill in first LR form
- [ ] Can add additional LR forms
- [ ] Can remove LR forms (except last one)
- [ ] Totals calculate correctly
- [ ] Can create multiple LRs successfully
- [ ] HPA form appears after LR creation
- [ ] HPA form is pre-populated correctly
- [ ] Can create HPA successfully
- [ ] All LRs appear in LR Management
- [ ] HPA appears in HPA Management
- [ ] HPA shows correct linked LRs
- [ ] Financial calculations are correct
- [ ] HPA number matches first LR number

## Next Steps After Testing

If everything works:
1. Test with different numbers of LRs (1, 2, 3+)
2. Test with different data combinations
3. Test edge cases (empty optional fields, etc.)

If issues found:
1. Check browser console for errors
2. Check backend logs
3. Verify database state
4. Report specific error messages
