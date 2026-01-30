# Sample Test Data for 2 LRs

## LR #1 - Sample Values

### Required Fields:
- **Truck**: Select any available truck from dropdown
- **Consignor**: Select any available consignor from dropdown
- **Consignee**: Select any available party from dropdown
- **LR Date**: Today's date (or any date)
- **From Location**: `Mumbai`
- **To Location**: `Bangalore`
- **Quantity (M.T.)**: `35`
- **Number of Bags**: `700`
- **Driver Name**: `Rajesh Kumar`
- **Driver License No.**: `MH-12-2020-1234567`
- **Driver Mobile**: `9876543210`
- **Payment Term**: `TO_BE_BILLED` (select from dropdown)
- **Status**: `DRAFT` (select from dropdown)

### Optional Fields (you can fill or leave empty):
- **SAP Number**: `SAP-2024-001`
- **Material Description**: `Cement - Grade 53`
- **Grade**: `53` (select from dropdown)
- **Grade Quantity**: `35MT Grade 53`
- **Delivery At**: `Warehouse A, Industrial Area`
- **Destination**: `Bangalore City`
- **Expected Loading Date**: Tomorrow's date
- **Expected Delivery Date**: Date 3 days from now
- **Remarks**: `Handle with care. Fragile goods.`

---

## LR #2 - Sample Values

### Required Fields:
- **Truck**: Select a **different** truck from dropdown
- **Consignor**: Select any available consignor (can be same or different)
- **Consignee**: Select any available party (can be same or different)
- **LR Date**: Today's date (or any date)
- **From Location**: `Delhi`
- **To Location**: `Pune`
- **Quantity (M.T.)**: `42`
- **Number of Bags**: `840`
- **Driver Name**: `Amit Sharma`
- **Driver License No.**: `DL-01-2019-9876543`
- **Driver Mobile**: `9123456789`
- **Payment Term**: `TO_PAY` (select from dropdown)
- **Status**: `DRAFT` (select from dropdown)

### Optional Fields:
- **SAP Number**: `SAP-2024-002`
- **Material Description**: `Steel Rods - Construction Grade`
- **Grade**: `43` (select from dropdown)
- **Grade Quantity**: `42MT Grade 43`
- **Delivery At**: `Construction Site B`
- **Destination**: `Pune Industrial Zone`
- **Expected Loading Date**: Tomorrow's date
- **Expected Delivery Date**: Date 4 days from now
- **Remarks**: `Heavy load. Ensure proper handling.`

---

## Quick Copy-Paste Reference

### LR #1 Quick Values:
```
Truck: [Select from dropdown]
Consignor: [Select from dropdown]
Consignee: [Select from dropdown]
LR Date: [Today]
From: Mumbai
To: Bangalore
Quantity: 35
Bags: 700
Driver: Rajesh Kumar
License: MH-12-2020-1234567
Mobile: 9876543210
Payment: TO_BE_BILLED
Status: DRAFT
```

### LR #2 Quick Values:
```
Truck: [Select different truck]
Consignor: [Select from dropdown]
Consignee: [Select from dropdown]
LR Date: [Today]
From: Delhi
To: Pune
Quantity: 42
Bags: 840
Driver: Amit Sharma
License: DL-01-2019-9876543
Mobile: 9123456789
Payment: TO_PAY
Status: DRAFT
```

---

## Expected Results After Creation

### Total Summary:
- **Total Quantity**: 35 + 42 = **77 MT**
- **Total Bags**: 700 + 840 = **1540 bags**

### HPA Form (After Creating LRs):
- **Total Tons**: Should show **77.00 MT**
- **HPA Number**: Will match first LR's number
- **Truck**: Will show first LR's truck
- **From/To**: Will show first LR's locations
- **Driver**: Will show first LR's driver

### HPA Sample Values:
- **Rate per Tonne**: `1200` (or any number)
- **Invoice Number**: `INV-2024-001`
- **HPA Date**: Today's date
- **Advance Paid**: `5000`
- **Diesel Amount**: `3000`
- **Pump Name**: `Indian Oil Pump`
- **Bank Amount**: `2000`
- **Other Deductions**: `1000`
- **Other Deductions Description**: `Toll charges and miscellaneous`
- **Remarks**: `Payment to be processed after delivery confirmation`

### Expected Calculations:
- **Lorry Hire**: 77 × 1200 = **₹92,400**
- **Total Deductions**: 5000 + 3000 + 2000 + 1000 = **₹11,000**
- **Balance**: 92,400 - 11,000 = **₹81,400**

---

## Tips for Testing

1. **Use different trucks** for each LR to make them easily distinguishable
2. **Use different quantities** so you can verify the total calculation
3. **Fill optional fields** to test that all data is saved correctly
4. **Check the totals** at the bottom of the form before submitting
5. **Verify in both LR and HPA pages** after creation

---

## Common Mistakes to Avoid

❌ **Don't:**
- Leave required fields empty
- Use invalid phone numbers (must be 10 digits)
- Use invalid license formats
- Enter text in quantity/bags fields (must be numbers)
- Select same truck for both LRs (makes it harder to distinguish)

✅ **Do:**
- Select valid options from dropdowns
- Use realistic data
- Double-check totals before submitting
- Verify all data after creation
