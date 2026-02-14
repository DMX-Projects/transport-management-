from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from apps.accounts.models import User
from apps.masters.models import Branch, Company, Truck, Consignor, Party
from apps.lr.models import LorryReceipt
from apps.hpa.models import HirePaymentAdvice
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

