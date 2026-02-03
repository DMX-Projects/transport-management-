# 📋 Transport Management System - User Guide

**Version:** 2.0  
**Last Updated:** February 2026

---

## 📑 Quick Navigation

1. [How to Login](#how-to-login)
2. [Dashboard - Your Home Screen](#dashboard---your-home-screen)
3. [Step 1: Create LR (Lorry Receipt)](#step-1-create-lr-lorry-receipt)
4. [Step 2: Create HPA (Payment to Truck Owner)](#step-2-create-hpa-payment-to-truck-owner)
5. [Step 3: Upload POD (Proof of Delivery)](#step-3-upload-pod-proof-of-delivery)
6. [Step 4: Create Bill (Customer Invoice)](#step-4-create-bill-customer-invoice)
7. [Step 5: Record Payments](#step-5-record-payments)
8. [Reports & Tracking](#reports--tracking)
9. [Common Questions](#common-questions)

---

## 🚀 How to Login

1. Open the website in your browser
2. Enter your **Username** and **Password**
3. Click **Sign In**

**First Time?** Contact your admin to get your username and password.

---

## 📊 Dashboard - Your Home Screen

When you login, you'll see the **Dashboard** - this is your control center.

### What You'll See:

#### 📈 Top Cards (Quick Numbers):
- **Active Trucks**: How many trucks are currently working
- **Pending LRs**: Bookings waiting to be processed
- **Pending HPAs**: Payments pending to truck owners
- **Total Revenue**: Money earned from bills

#### 📋 Lists Below:
- **Recent LRs**: Latest bookings
- **Recent HPAs**: Latest payment documents

**💡 Tip:** Click on any item to view full details or take action.

---

## 🚚 Complete Workflow (Simple Steps)

### The Journey of a Shipment:

```
Customer Books → Create LR → Create HPA → Delivery → Upload POD → Create Bill → Receive Payment
```

Let's understand each step:

---

## 📝 Step 1: Create LR (Lorry Receipt)

### What is LR?
**LR = Booking Document** when a customer wants to transport goods.

### How to Create:

1. **Go to:** Left menu → Click **"LR Management"** → Click **"Create LR"** button

2. **Fill Basic Details:**
   - **Date**: Today's date
   - **Customer Name** (Consignor): Who is sending the goods
   - **Receiver Name** (Consignee): Who will receive the goods
   - **From Location**: Where to pick up
   - **To Location**: Where to deliver

3. **Select Truck:**
   - Choose which truck will carry the goods
   - Driver details will auto-fill

4. **Add Items Being Transported:**
   - Click **"Add Item"** button
   - Enter:
     - **Quantity**: How many pieces (e.g., 100 bags)
     - **Material**: What it is (e.g., Rice, Cement)
     - **Weight**: How heavy it is
     - **Rate**: Price per kg
   - **Amount will calculate automatically**

5. **Add Extra Charges** (if any):
   - Loading charges
   - Unloading charges
   - Other charges

6. Click **"Create LR"** button at the bottom

**✅ Done!** LR is created and ready for next step.

---

## 💰 Step 2: Create HPA (Payment to Truck Owner)

### What is HPA?
**HPA = Payment Document** that shows how much to pay the truck owner.

### How to Create:

1. **Go to:** Left menu → Click **"HPA Management"** → Click **"Create HPA"** button

2. **Fill Basic Details:**
   - **Date**: Today's date
   - **Select Truck**: Choose the truck
   - Owner and Driver details will auto-fill

3. **Select LR(s):**
   - **Primary LR**: Select the main booking
   - **Additional LRs**: If truck is carrying multiple bookings, add them here
   - Click **"+ Add Additional LR"** to add more

4. **Add Invoice Details** (One invoice per LR):
   - **Invoice Number**: Enter invoice number
   - **From/To Location**: Auto-fills from LR
   - **Quantity**: Auto-fills from LR

5. **Enter Payment Calculation:**
   - **Tons (Quantity)**: Total weight in tonnes (auto-filled from LRs)
   - **Rate per Tonne**: Agreed rate with truck owner (e.g., ₹1500 per tonne)
   - **Lorry Hire will calculate automatically** (Tons × Rate)
   
   **Example:** 
   - If Tons = 25 and Rate = ₹1500
   - Lorry Hire = 25 × 1500 = **₹37,500** (shows automatically below)

6. **Enter Deductions** (Money already paid or adjusted):
   - **Less Advance**: If you gave advance money (e.g., ₹10,000)
   - **Diesel**: If you paid for fuel (e.g., ₹5,000)
   - **Bank**: Bank charges if any
   - **Other Deductions**: Any other adjustments

7. **Final Balance Calculates Automatically:**
   ```
   Balance = Lorry Hire - (Advance + Diesel + Bank + Other)
   Example: ₹37,500 - (₹10,000 + ₹5,000 + ₹0 + ₹0) = ₹22,500
   ```

8. Click **"Create HPA"** button

**✅ Done!** HPA is created. This amount (₹22,500) is what you'll pay truck owner after delivery.

### 💡 Important Notes:
- **Lorry Hire** is auto-calculated - you don't need to enter it manually
- **Balance** is auto-calculated - shows final amount to pay
- You can link multiple LRs to one HPA if same truck carries multiple bookings
- Each LR gets its own invoice section in the form

---

## 📦 Step 3: Upload POD (Proof of Delivery)

### What is POD?
**POD = Proof that goods were delivered** - needed before you can bill the customer.

### How to Upload:

1. **Go to:** Left menu → Click **"POD Management"** → Click **"Create POD"** button

2. **Select Which Booking:**
   - Choose the LR/HPA that was delivered

3. **Fill Delivery Details:**
   - **Delivery Date**: When goods were delivered
   - **Received By**: Name of person who received goods
   - **Their Designation**: Their position (Manager, Clerk, etc.)

4. **Upload Documents:**
   - **Signature Photo**: Photo of signed delivery paper
   - **POD Document**: Scanned delivery receipt
   - **Delivery Photo**: Photo of goods delivered (optional)

5. **Rate Delivery Condition:**
   - Excellent / Good / Fair / Poor

6. Click **"Create POD"** button

**✅ Done!** Now you can create bill for the customer.

---

## 🧾 Step 4: Create Bill (Customer Invoice)

### What is a Bill?
**Bill = Invoice to Customer** - this is how you charge the customer for transportation.

### How to Create:

1. **Go to:** Left menu → Click **"Billing"** → Click **"Create Bill"** button

2. **Select HPAs:**
   - Choose which HPAs to include in this bill
   - Only HPAs with POD will show up
   - You can select multiple HPAs for one bill

3. **Fill Bill Details:**
   - **Bill Date**: Today's date
   - **Customer Name**: Auto-fills from LR
   - **Bill Template**: Choose format (usually "Default")

4. **Review Bill Items:**
   - System auto-fills items from LRs
   - Check quantities and amounts
   - Edit if needed

5. **Tax Calculation:**
   - Enter tax percentage if applicable
   - Tax amount calculates automatically
   - Grand Total shows final bill amount

6. Click **"Generate Bill"** button

7. **Download PDF:**
   - Click download button to get printable bill
   - Send this bill to customer

**✅ Done!** Bill is created and sent to customer.

---

## 💳 Step 5: Record Payments

### Two Ways to Record Payments:

---

### Option A: **Quick Payment (Recommended for Daily Use)**

**Use this when:** You just want to quickly record a payment.

1. **Go to:** Left menu → Click **"Payments"**

2. **You'll see two tabs:**
   - **Analytics & HPAs**: Shows all HPAs with payment status
   - **All Transactions**: Shows all payment records

3. **To Add Payment:**
   - Find the HPA in the list
   - Click **"Add Payment"** button
   - Enter:
     - **Amount**: How much paid
     - **Payment Date**: When paid
     - **Payment Method**: Cash / Bank / UPI / Cheque
     - **Reference Number**: Bank ref or cheque number (optional)
   - Click **"Save"**

**✅ Done!** Payment recorded.

---

### Option B: **Detailed Payment Recording**

**Use this when:** You need detailed payment tracking with multiple types.

1. **Go to:** Left menu → Click **"Truck Payments"**

2. **Click "Add Payment" button**

3. **Select Payment Type:**
   - **ADVANCE**: Money given before trip
   - **DIESEL**: Fuel payment
   - **BANK**: Bank transfer
   - **BALANCE**: Final balance payment
   - **TOLL**: Toll charges
   - **COMMISSION**: Commission payment
   - **OTHER**: Other payments

4. **Fill Details:**
   - **Select HPA**: Choose which HPA this payment is for
   - **Amount**: Payment amount
   - **Payment Method**: Cash / Bank / UPI / Cheque / Diesel Voucher
   - **Date**: Payment date
   - **Reference**: Bank reference or cheque number
   - **Remarks**: Any notes

5. Click **"Add Payment"**

**✅ Done!** Detailed payment recorded with full tracking.

---

## ⚙️ Master Data Setup (System Configuration)

### What is Master Data?
**Master Data = Basic Information** that the system needs to work - like your trucks, customers, locations, and branches.

**💡 Think of it as:** Setting up your address book before you can make calls.

---

### 🏢 Setting Up Branches

#### What is a Branch?
Each office location in your company is a "branch". Each branch sees only their own data.

#### How to Create a Branch:

1. **Go to:** Left menu → Click **"Masters"** → Click **"Branches"**

2. **Click "Add Branch" button**

3. **Fill Branch Details:**
   - **Branch Name**: Your office name (e.g., "Mumbai Office", "Delhi Branch")
   - **Branch Code**: Short code (e.g., "MUM", "DEL")
   - **Address**: Complete office address
   - **Contact Number**: Office phone number
   - **Manager Name**: Branch manager's name

4. Click **"Save"**

**✅ Done!** Branch is created.

---

### 🚛 Adding Trucks

#### How to Add a Truck:

1. **Go to:** Left menu → Click **"Masters"** → Click **"Trucks"**

2. **Click "Add Truck" button**

3. **Fill Truck Details:**
   - **Truck Number**: Vehicle registration number (e.g., "MH-12-AB-1234")
   - **Owner Name**: Truck owner's name
   - **Owner Mobile**: Owner's phone number
   - **Driver Name**: Current driver's name
   - **Driver Mobile**: Driver's phone number
   - **Truck Type**: Type of vehicle (e.g., "10-Wheeler", "12-Wheeler")
   - **Capacity**: Load capacity in tonnes

4. Click **"Save"**

**✅ Done!** Truck is added and ready to use.

**💡 Tip:** Once saved, this truck will appear in the dropdown when creating LRs.

---

### 🏭 Adding Customers (Consignors)

#### Who is a Consignor?
**Consignor = Customer** who sends goods through your transport service.

#### How to Add:

1. **Go to:** Left menu → Click **"Masters"** → Click **"Consignors"**

2. **Click "Add Consignor" button**

3. **Fill Customer Details:**
   - **Company Name**: Customer's business name
   - **Contact Person**: Name of contact person
   - **Mobile Number**: Contact phone number
   - **Address**: Complete business address
   - **GST Number**: Tax registration number (if applicable)
   - **Email**: Customer's email address

4. Click **"Save"**

**✅ Done!** Customer is added.

---

### 🏪 Adding Delivery Locations (Consignees/Parties)

#### Who is a Consignee?
**Consignee = Party** who receives the goods at the delivery location.

#### How to Add:

1. **Go to:** Left menu → Click **"Masters"** → Click **"Parties"**

2. **Click "Add Party" button**

3. **Fill Receiver Details:**
   - **Party Name**: Receiver's company/person name
   - **Contact Person**: Name of contact at delivery location
   - **Mobile Number**: Contact phone number
   - **Delivery Address**: Complete delivery address
   - **City**: Delivery city
   - **PIN Code**: Area PIN code

4. Click **"Save"**

**✅ Done!** Delivery location is added.

---

### 👥 Adding Users

#### How to Add a New User:

1. **Go to:** Left menu → Click **"Masters"** → Click **"Users"**

2. **Click "Add User" button**

3. **Fill User Details:**
   - **Username**: Login username (e.g., "ram.sharma")
   - **Full Name**: User's complete name
   - **Email**: User's email address
   - **Mobile**: User's phone number
   - **Role**: Select role:
     - **Super Admin**: Full access to all branches
     - **Branch Manager**: Access to assigned branch only
     - **Branch User**: Limited access to assigned branch
   - **Assign Branch**: Select which branch this user belongs to
   - **Password**: Set initial password

4. Click **"Save"**

**✅ Done!** User is created and can now login.

**💡 Security Tip:** Ask the user to change their password on first login.

---

## 🔐 Branch Isolation (How Data is Protected)

### What is Branch Isolation?
**Branch Isolation = Each branch sees only their own data** - Mumbai office cannot see Delhi office data.

### How It Works:

#### 📊 **When You Login:**
- System automatically detects your branch
- You only see data from your branch
- Other branches' data is hidden

#### 📝 **When You Create LR:**
- LR is automatically tagged to your branch
- Other branches cannot see this LR
- Only your branch can access and edit it

#### 🚛 **When You Create HPA:**
- HPA is automatically tagged to your branch
- Only your branch's LRs show up in the list
- Other branches' HPAs are not visible to you

#### 💰 **When You View Reports:**
- Reports show only your branch data
- Dashboard shows only your branch metrics
- Financial data is branch-specific

### Benefits of Branch Isolation:

✅ **Data Security**: Each branch's data is private and secure  
✅ **Clean Interface**: You don't see irrelevant data from other branches  
✅ **Accurate Reports**: Reports show only your branch performance  
✅ **Independent Operations**: Each branch works independently  

### Super Admin Exception:

**Only Super Admin can:**
- See data from ALL branches
- Switch between different branches
- Generate company-wide reports
- Manage all branches and users

---

## 🎯 Master Data Best Practices

### ✅ Do This:

1. **Set Up Branches First**: Create all your branch offices before adding other data
2. **Add Trucks Early**: Register all trucks before starting operations
3. **Maintain Customer List**: Keep consignor and consignee lists updated
4. **Regular Updates**: Update driver/owner details when they change
5. **Check Before Delete**: Make sure truck/customer is not being used before deleting

### ❌ Avoid This:

1. **Don't Skip Master Data**: Don't create LRs without setting up trucks and customers first
2. **Don't Duplicate Entries**: Check if truck/customer already exists before adding
3. **Don't Delete Active Records**: Don't delete trucks or customers that have active LRs/HPAs
4. **Don't Share Passwords**: Each user should have their own login

---

## 📊 Reports & Tracking

### How to Check Different Things:

#### 🚛 Check Truck Statement (All Truck Activity)
1. Go to: **"Truck Statement"** from left menu
2. Select truck number
3. Select date range
4. Click "View Statement"
5. Shows: All HPAs, All payments, Balance amount

#### ⏰ Check Active/Pending HPAs
1. Go to: **"Active HPAs"** from left menu
2. See all HPAs that are still active (not fully paid)
3. View how many days each HPA has been pending
4. **Color codes:**
   - **Green (NEW)**: 0-3 days old
   - **Blue (ACTIVE)**: 4-7 days old
   - **Orange (AGING)**: 8-15 days old
   - **Red (OVERDUE)**: More than 15 days - needs urgent attention!

#### 💰 Check Outstanding Bills (Customer Payments Pending)
1. Go to: **"Outstanding Reports"** from left menu
2. See which customers haven't paid
3. Follow up for payment collection

---

## ❓ Common Questions

### Q1: I created an HPA but the Lorry Hire amount is showing ₹0.00. Why?

**Answer:** Make sure you've entered both:
- **Tons (Quantity)**: Must be more than 0
- **Rate per Tonne**: Must be more than 0

The system will automatically calculate: **Lorry Hire = Tons × Rate**

If either field is empty or 0, the Lorry Hire will show ₹0.00.

---

### Q2: What's the difference between "Payments" and "Truck Payments"?

**Answer:**
- **"Payments"** = Simple and quick - use this for daily work
- **"Truck Payments"** = Detailed with analytics - use this for accounting and detailed records

Both do the same job of recording payments to truck owners. Choose based on your needs.

---

### Q3: Can I link multiple LRs to one HPA?

**Answer:** Yes! 
- Select the first LR as "Primary LR"
- Click **"+ Add Additional LR"** to add more
- This is useful when one truck carries multiple bookings

---

### Q4: Why can't I create a bill?

**Answer:** To create a bill, you must first:
1. ✅ Create LR
2. ✅ Create HPA
3. ✅ Upload POD (Proof of Delivery)

Without POD, you cannot create bills.

---

### Q5: Where do invoices get linked to HPAs?

**Answer:** When you create an HPA:
- Each LR automatically creates an invoice section in the form
- You enter the invoice number there
- The system links the invoice to both the HPA and the LR
- This connection is saved in the database automatically

You don't need to do anything extra - just fill the invoice details in the HPA form!

---

### Q6: What's the meaning of the "Amount" field in the invoice section?

**Answer:** Previously, this was a manual entry field. **Now it's auto-calculated:**
- **Amount = Quantity (MT) × Rate per Tonne**

Example:
- If Quantity = 5 tonnes
- And Rate per Tonne = ₹1500
- Then Amount = 5 × 1500 = **₹7,500** (calculated automatically)

This amount represents the total value of that specific invoice/LR.

---

### Q7: The amount is not calculating automatically. What's wrong?

**Answer:** The amount will only calculate if:
- Both **Quantity (MT)** is filled (more than 0)
- And **Rate per Tonne** is filled (more than 0)

If either is empty or 0, the amount will show ₹0.00.

**💡 Tip:** Try refreshing the page if you entered the values but calculation isn't working.

---

### Q8: How do I download HPA as PDF?

**Answer:**
1. Go to **"HPA Management"**
2. Find your HPA in the list
3. Click the **download icon** (⬇️) next to the HPA
4. PDF will download with all details including payment transactions

---

### Q9: What if I made a mistake in LR or HPA?

**Answer:**
- If nothing is linked yet: Click **Edit** button and correct it
- If HPA is linked to LR: You may need to delete HPA first, then edit LR
- If payments exist: Contact admin for help

**💡 Best Practice:** Double-check all details before saving!

---

### Q10: How many days should an HPA take?

**Answer:** Ideal timeline:
- **0-3 days**: New HPA - Normal
- **4-7 days**: Active - Okay
- **8-15 days**: Aging - Need to follow up
- **15+ days**: Overdue - Urgent action needed!

Check **"Active HPAs"** page to see aging status.

---

## 📞 Need Help?

- **Forgot Password:** Contact your administrator
- **System Error:** Take screenshot and contact support
- **Training Needed:** Ask your manager for training session
- **Questions:** Refer to this guide or ask your supervisor

---

## ✅ Quick Checklist for Each Booking

Use this checklist to ensure you complete all steps:

- [ ] **Day 1:** Create LR (Booking)
- [ ] **Day 1:** Create HPA (Payment doc for truck owner)
- [ ] **Day 2-5:** Truck travels and delivers goods
- [ ] **Day 5:** Upload POD (Proof of delivery)
- [ ] **Day 5:** Create Bill (Invoice for customer)
- [ ] **Day 6:** Record payment from customer
- [ ] **Day 6:** Pay truck owner balance amount

**💡 Keep this checklist handy and tick off as you complete each step!**

---

**© 2026 Transport Management System**  
*Simple Guide for Everyone*

---

**Remember:** This system is designed to make your work easier. Take it step by step, and you'll master it quickly!