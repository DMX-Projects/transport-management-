from django.core.management.base import BaseCommand
from apps.masters.models import Company, Branch, Party, Truck
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Create sample master data for testing'

    def handle(self, *args, **options):
        User = get_user_model()
        user = User.objects.first()

        if not user:
            self.stdout.write(self.style.ERROR('No user found. Please create a superuser first.'))
            return

        # Create Company
        company, created = Company.objects.get_or_create(
            gstin='27AAAAA0000A1Z5',
            defaults={
                'name': 'ABC Transport Ltd',
                'pan': 'AAAPL1234C',
                'address': '123 Main Street, Andheri',
                'city': 'Mumbai',
                'state': 'Maharashtra',
                'pincode': '400001',
                'phone': '9876543210',
                'email': 'info@abctransport.com',
                'created_by': user,
                'updated_by': user
            }
        )
        self.stdout.write(f"Company: {'Created' if created else 'Already exists'} - {company.name}")

        # Create Branch
        branch, created = Branch.objects.get_or_create(
            code='MUM01',
            defaults={
                'company': company,
                'name': 'Mumbai Branch',
                'address': '456 Branch Road, Kurla',
                'city': 'Mumbai',
                'state': 'Maharashtra',
                'pincode': '400002',
                'phone': '9876543211',
                'email': 'mumbai@abctransport.com',
                'created_by': user,
                'updated_by': user
            }
        )
        self.stdout.write(f"Branch: {'Created' if created else 'Already exists'} - {branch.name}")

        # Create Parties
        party1, created = Party.objects.get_or_create(
            code='XYZ001',
            defaults={
                'name': 'XYZ Logistics',
                'gstin': '07BBBBB0000B1Z5',
                'pan': 'BBBPL5678D',
                'address': '789 Customer Street',
                'city': 'Delhi',
                'state': 'Delhi',
                'pincode': '110001',
                'phone': '9876543212',
                'email': 'contact@xyzlogistics.com',
                'created_by': user,
                'updated_by': user
            }
        )
        self.stdout.write(f"Party 1: {'Created' if created else 'Already exists'} - {party1.name}")

        party2, created = Party.objects.get_or_create(
            code='PQR002',
            defaults={
                'name': 'PQR Transport Co',
                'gstin': '27CCCCC0000C1Z5',
                'address': '321 Transport Avenue',
                'city': 'Pune',
                'state': 'Maharashtra',
                'pincode': '411001',
                'phone': '9876543213',
                'email': 'pqr@transport.com',
                'created_by': user,
                'updated_by': user
            }
        )
        self.stdout.write(f"Party 2: {'Created' if created else 'Already exists'} - {party2.name}")

        # Create Trucks
        truck1, created = Truck.objects.get_or_create(
            truck_number='MH01AB1234',
            defaults={
                'truck_type': 'OWN',
                'owner_name': 'ABC Transport Ltd',
                'owner_phone': '9876543210',
                'driver_name': 'Rajesh Kumar',
                'driver_phone': '9876543220',
                'capacity_tons': 10.0,
                'created_by': user,
                'updated_by': user
            }
        )
        self.stdout.write(f"Truck 1: {'Created' if created else 'Already exists'} - {truck1.truck_number}")

        truck2, created = Truck.objects.get_or_create(
            truck_number='MH02CD5678',
            defaults={
                'truck_type': 'MARKET',
                'owner_name': 'Independent Owner',
                'owner_phone': '9876543221',
                'driver_name': 'Suresh Singh',
                'driver_phone': '9876543222',
                'capacity_tons': 15.0,
                'created_by': user,
                'updated_by': user
            }
        )
        self.stdout.write(f"Truck 2: {'Created' if created else 'Already exists'} - {truck2.truck_number}")

        truck3, created = Truck.objects.get_or_create(
            truck_number='DL03EF9012',
            defaults={
                'truck_type': 'MARKET',
                'owner_name': 'Delhi Transport',
                'driver_name': 'Amit Sharma',
                'driver_phone': '9876543223',
                'capacity_tons': 12.0,
                'created_by': user,
                'updated_by': user
            }
        )
        self.stdout.write(f"Truck 3: {'Created' if created else 'Already exists'} - {truck3.truck_number}")

        self.stdout.write(self.style.SUCCESS('\n✅ Sample data setup complete!'))
        self.stdout.write(f"Total: {Company.objects.filter(is_deleted=False).count()} companies, {Branch.objects.filter(is_deleted=False).count()} branches, {Party.objects.filter(is_deleted=False).count()} parties, {Truck.objects.filter(is_deleted=False).count()} trucks")
