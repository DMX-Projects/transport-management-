from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from apps.accounts.models import User
from apps.masters.models import Branch, Company, Truck, Consignor, Party
from apps.lr.models import LorryReceipt
from apps.hpa.models import HirePaymentAdvice
from apps.payments.models import Payment
from apps.billing.models import Bill
import random

class Command(BaseCommand):
    help = 'Seed sample data for the transport management system'

    def handle(self, *args, **options):
        self.stdout.write('Starting sample data seeding...')
        
        try:
            # Create admin user first
            admin_user, _ = User.objects.get_or_create(
                username='admin',
                defaults={'email': 'admin@capital.com', 'is_staff': True, 'is_superuser': True}
            )
            
            # Create company
            company, _ = Company.objects.get_or_create(
                name='Capital Logistics',
                defaults={
                    'email': 'info@capital.com',
                    'phone': '9876543210',
                    'gstin': '27AABBG1234K1Z0',
                    'created_by': admin_user,
                    'updated_by': admin_user,
                }
            )
            
            # Create branches
            branches = self._create_branches(company, admin_user)
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(branches)} branches'))
            
            # Create trucks
            trucks = self._create_trucks(branches, admin_user)
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(trucks)} trucks'))
            
            # Create consignors and parties
            consignors = self._create_consignors(admin_user)
            parties = self._create_parties(admin_user)
            
            # Create users
            users = self._create_users(branches, admin_user)
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(users)} users'))
            
            # Create LRs
            lrs = self._create_lrs(branches, trucks, consignors, parties, users)
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(lrs)} Lorry Receipts'))
            
            # Create HPAs
            hpas = self._create_hpas(lrs, branches, users, admin_user)
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(hpas)} Hire Payment Advices'))
            
            # Create Payments
            payments = self._create_payments(hpas, branches, users, admin_user)
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(payments)} Payments'))
            
            # Create Bills
            bills = self._create_bills(hpas, branches, users, admin_user)
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(bills)} Bills'))
            
            self.stdout.write(self.style.SUCCESS('\n✓ Sample data seeding completed successfully!'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))
            import traceback
            traceback.print_exc()

    def _create_branches(self, company, admin_user):
        branches_data = [
            {'name': 'Delhi HQ', 'city': 'New Delhi', 'state': 'Delhi'},
            {'name': 'Mumbai Branch', 'city': 'Mumbai', 'state': 'Maharashtra'},
            {'name': 'Bangalore Branch', 'city': 'Bangalore', 'state': 'Karnataka'},
        ]
        branches = []
        for data in branches_data:
            data['company'] = company
            data['created_by'] = admin_user
            data['updated_by'] = admin_user
            branch, _ = Branch.objects.get_or_create(name=data['name'], defaults=data)
            branches.append(branch)
        return branches

    def _create_trucks(self, branches, admin_user):
        truck_numbers = ['KA-01-AB-1234', 'MH-02-CD-5678', 'DL-03-EF-9012', 'KA-04-GH-3456', 'MH-05-IJ-7890']
        trucks = []
        for i, truck_no in enumerate(truck_numbers):
            truck, _ = Truck.objects.get_or_create(
                truck_number=truck_no,
                defaults={
                    'owner_name': f'Owner {i+1}',
                    'owner_phone': f'98765{i:05d}',
                    'created_by': admin_user,
                    'updated_by': admin_user,
                }
            )
            trucks.append(truck)
        return trucks

    def _create_users(self, branches, admin_user):
        users_data = [
            {'email': 'manager@capital.com', 'username': 'manager', 'role': 'BRANCH_MANAGER'},
            {'email': 'operator@capital.com', 'username': 'operator', 'role': 'BRANCH_MANAGER'},
        ]
        users = [admin_user]  # Include admin user in the list
        for i, data in enumerate(users_data):
            user, created = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'username': data['username'], 
                    'role': data['role'],
                    'branch': branches[i % len(branches)],
                }
            )
            if created:
                user.set_password('Test@123')
                user.save()
            users.append(user)
        return users

    def _create_lrs(self, branches, trucks, consignors, parties, users):
        lrs = []
        locations = ['Delhi', 'Mumbai', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai']
        statuses = ['DRAFT', 'PENDING_HPA', 'ISSUED', 'LOADING', 'IN_TRANSIT', 'DELIVERED']
        
        for i in range(15):
            lr = LorryReceipt.objects.create(
                lr_date=timezone.now() - timedelta(days=random.randint(1, 30)),
                branch=random.choice(branches),
                truck=random.choice(trucks),
                created_by=random.choice(users),
                updated_by=random.choice(users),
                consignor=random.choice(consignors),
                consignee=random.choice(parties),
                from_location=random.choice(locations),
                to_location=random.choice([loc for loc in locations]),
                driver_name=f'Driver {i+1}',
                driver_phone=f'98765{i:05d}',
                quantity_mt=random.uniform(5, 50),
                status=random.choice(statuses),
                remarks=f'Sample LR #{i+1}'
            )
            lrs.append(lr)
        
        return lrs

    def _create_consignors(self, admin_user):
        consignor_data = [
            {'name': 'Chettinad Cement', 'code': 'CHETTI', 'gstin': '27CHETTI1234K1Z0', 'city': 'Mumbai', 'state': 'Maharashtra'},
            {'name': 'Ultratech Cement', 'code': 'ULTRA', 'gstin': '27ULTRA1234K1Z0', 'city': 'Mumbai', 'state': 'Maharashtra'},
            {'name': 'ACC Cement', 'code': 'ACC', 'gstin': '27ACC1234K1Z0', 'city': 'Mumbai', 'state': 'Maharashtra'},
        ]
        consignors = []
        for data in consignor_data:
            consignor, _ = Consignor.objects.get_or_create(
                code=data['code'],
                defaults={
                    'name': data['name'],
                    'gstin': data['gstin'],
                    'address': 'Sample Address',
                    'city': data['city'],
                    'state': data['state'],
                    'pincode': '400001',
                    'phone': '9876543210',
                    'email': 'consignor@example.com',
                    'created_by': admin_user,
                    'updated_by': admin_user,
                }
            )
            consignors.append(consignor)
        return consignors

    def _create_parties(self, admin_user):
        party_data = [
            {'name': 'Retail Store A', 'code': 'RSA', 'city': 'Pune', 'state': 'Maharashtra'},
            {'name': 'Warehouse B', 'code': 'WHB', 'city': 'Bangalore', 'state': 'Karnataka'},
            {'name': 'Factory C', 'code': 'FAC', 'city': 'Hyderabad', 'state': 'Telangana'},
        ]
        parties = []
        for data in party_data:
            party, _ = Party.objects.get_or_create(
                code=data['code'],
                defaults={
                    'name': data['name'],
                    'gstin': '27PARTY1234K1Z0',
                    'address': 'Sample Address',
                    'city': data['city'],
                    'state': data['state'],
                    'pincode': '560001',
                    'phone': '9876543210',
                    'email': 'party@example.com',
                    'created_by': admin_user,
                    'updated_by': admin_user,
                }
            )
            parties.append(party)
        return parties

    def _create_hpas(self, lrs, branches, users, admin_user):
        hpas = []
        # Filter for LRs that can have HPA
        eligible_lrs = [lr for lr in lrs if lr.status in ['PENDING_HPA', 'ISSUED', 'LOADING', 'IN_TRANSIT']]
        
        for i, lr in enumerate(eligible_lrs[:10]):
            hpa_date = lr.lr_date + timedelta(days=random.randint(1, 5))
            lorry_hire = random.randint(5000, 20000)
            advance_paid = random.randint(0, lorry_hire // 2)
            
            hpa = HirePaymentAdvice.objects.create(
                lr=lr,
                hpa_date=hpa_date,
                invoice_number=f'INV-{1000+i}',
                truck=lr.truck,
                from_location=lr.from_location,
                to_location=lr.to_location,
                driver_name=lr.driver_name,
                driver_mob=lr.driver_phone,
                branch=lr.branch,
                created_by=random.choice(users),
                updated_by=random.choice(users),
                tons=lr.quantity_mt,
                rate_per_tonne=random.randint(100, 300),
                lorry_hire_rs=lorry_hire,
                advance_paid_rs=advance_paid,
                diesel_amount=random.randint(0, 5000),
                bank_amount=random.randint(0, 500),
                other_deductions=random.randint(0, 2000),
                payment_status=random.choice(['PENDING', 'PARTIAL', 'PAID']),
                remarks=f'Sample HPA for {lr.lr_number}'
            )
            hpas.append(hpa)
        
        return hpas

    def _create_payments(self, hpas, branches, users, admin_user):
        payments = []
        payment_methods = ['CASH', 'CHEQUE', 'UPI', 'BANK_TRANSFER', 'NEFT']
        
        for hpa in hpas:
            num_payments = random.randint(1, 3)
            for j in range(num_payments):
                payment_date = hpa.hpa_date + timedelta(days=random.randint(1, 10))
                upper = max(1000, int(hpa.lorry_hire_rs or 5000))
                amount = random.randint(1000, upper)
                # Ensure unique payment prefix per branch to avoid global collisions
                if hpa.branch:
                    prefix = hpa.branch.code if getattr(hpa.branch, 'code', None) else f"BR{hpa.branch.id}"
                    setattr(hpa.branch, 'payment_prefix', prefix)
                
                payment = Payment.objects.create(
                    hpa=hpa,
                    payment_date=payment_date,
                    payment_method=random.choice(payment_methods),
                    amount=amount,
                    status=random.choice(['PENDING', 'CLEARED']),
                    branch=hpa.branch,
                    created_by=random.choice(users),
                    updated_by=random.choice(users),
                    remarks=f'Payment {j+1} for {hpa.hpa_number}'
                )
                payments.append(payment)
        
        return payments

    def _create_bills(self, hpas, branches, users, admin_user):
        bills = []
        # Create bills for consignors present in LRs
        # Collect consignors from LRs linked to HPAs
        consignor_set = set()
        for hpa in hpas:
            if hpa.lr and hpa.lr.consignor:
                consignor_set.add(hpa.lr.consignor)
        consignor_list = list(consignor_set)
        
        for i in range(min(5, len(consignor_list))):
            consignor = consignor_list[i]
            branch = random.choice(branches)
            # Ensure unique bill prefix per branch to avoid global collisions
            prefix = branch.code if getattr(branch, 'code', None) else f"BR{branch.id}"
            setattr(branch, 'bill_prefix', prefix)
            bill_date = timezone.now().date() - timedelta(days=random.randint(1, 15))
            
            bill = Bill.objects.create(
                bill_date=bill_date,
                branch=branch,
                consignor=consignor,
                created_by=random.choice(users),
                updated_by=random.choice(users),
                status=random.choice(['DRAFT', 'GENERATED', 'SENT', 'ACKNOWLEDGED', 'PAID']),
                sgst_rate=Decimal('9.00'),
                cgst_rate=Decimal('9.00')
            )
            bills.append(bill)
            
            # Add 2-4 bill items from LRs of this consignor
            lr_candidates = [h.lr for h in hpas if h.lr and h.lr.consignor == consignor]
            random.shuffle(lr_candidates)
            for lr in lr_candidates[:random.randint(2, 4)]:
                # Create bill item with random freight rate
                from apps.billing.models import BillItem
                BillItem.objects.create(
                    bill=bill,
                    lr=lr,
                    destination=lr.to_location,
                    quantity_mt=lr.quantity_mt,
                    freight_rate=random.randint(300, 900),
                    created_by=random.choice(users),
                    updated_by=random.choice(users),
                    remarks=f'Billing for {lr.lr_number}'
                )
            
            # Recalculate totals and optionally mark some bills as PAID with payment_received
            bill.save()
            if bill.total_amount > 0 and bill.status == 'PAID':
                # Simulate partial or full payment received
                paid = bill.total_amount + bill.sgst_amount + bill.cgst_amount
                # Receive between 60% and 100%
                payment_received = paid * Decimal(str(random.uniform(0.6, 1.0)))
                bill.payment_received = payment_received.quantize(Decimal('0.01'))
                bill.payment_date = bill.bill_date + timedelta(days=random.randint(1, 10))
                bill.payment_mode = random.choice(['CASH', 'CHEQUE', 'BANK_TRANSFER'])
                bill.save()
        
        return bills

    def _create_users(self, branches, admin_user):
        users_data = [
            {'email': 'manager@capital.com', 'username': 'manager', 'role': 'BRANCH_MANAGER'},
            {'email': 'operator@capital.com', 'username': 'operator', 'role': 'BRANCH_MANAGER'},
        ]
        users = [admin_user]  # Include admin user in the list
        for i, data in enumerate(users_data):
            user, created = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'username': data['username'], 
                    'role': data['role'],
                    'branch': branches[i % len(branches)],
                }
            )
            if created:
                user.set_password('Test@123')
                user.save()
            users.append(user)
        return users

