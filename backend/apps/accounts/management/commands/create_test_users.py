from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.masters.models import Company, Branch
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = 'Create test users: one admin and 3-4 branch users for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            type=str,
            default='admin123',
            help='Password for all users (default: admin123)'
        )

    @transaction.atomic
    def handle(self, *args, **options):
        password = options.get('password', 'admin123')
        
        # First, create or get admin user (needed for BaseModel)
        admin_user, admin_created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@capitallogistics.com',
                'first_name': 'Super',
                'last_name': 'Admin',
                'role': 'SUPER_ADMIN',
                'phone': '9876543210',
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            }
        )
        if not admin_user.check_password(password):
            admin_user.set_password(password)
            admin_user.save()
        if admin_created:
            self.stdout.write(self.style.SUCCESS(f'✅ Created Super Admin user: admin'))
        else:
            self.stdout.write(self.style.SUCCESS(f'✅ Super Admin user already exists: admin'))
        
        # Get or create a company first
        company, company_created = Company.objects.get_or_create(
            gstin='27AAAAA0000A1Z5',
            defaults={
                'name': 'Capital Logistics Pvt Ltd',
                'pan': 'CAPITAL123C',
                'address': 'Head Office, Transport Nagar',
                'city': 'Mumbai',
                'state': 'Maharashtra',
                'pincode': '400001',
                'phone': '02212345678',
                'email': 'info@capitallogistics.com',
                'created_by': admin_user,
                'updated_by': admin_user,
            }
        )
        
        # Ensure the company has created_by/updated_by even if it already existed
        if not company.created_by_id:
            company.created_by = admin_user
            company.updated_by = admin_user
            company.save()
        
        if company_created:
            self.stdout.write(self.style.SUCCESS(f'✅ Created Company: {company.name}'))
        
        branches_data = [
            {
                'code': 'MUM01',
                'name': 'Mumbai Branch',
                'address': '456 Branch Road, Kurla',
                'city': 'Mumbai',
                'state': 'Maharashtra',
                'pincode': '400002',
                'phone': '02298765432',
                'email': 'mumbai@capitallogistics.com',
                'lr_prefix': 'MUM',
            },
            {
                'code': 'DEL01',
                'name': 'Delhi Branch',
                'address': '789 Transport Hub, Noida',
                'city': 'Delhi',
                'state': 'Delhi',
                'pincode': '110001',
                'phone': '01198765433',
                'email': 'delhi@capitallogistics.com',
                'lr_prefix': 'DEL',
            },
            {
                'code': 'BAN01',
                'name': 'Bangalore Branch',
                'address': '321 Logistics Park, Whitefield',
                'city': 'Bangalore',
                'state': 'Karnataka',
                'pincode': '560066',
                'phone': '08098765434',
                'email': 'bangalore@capitallogistics.com',
                'lr_prefix': 'BAN',
            },
            {
                'code': 'CHE01',
                'name': 'Chennai Branch',
                'address': '654 Warehouse Street, Ambattur',
                'city': 'Chennai',
                'state': 'Tamil Nadu',
                'pincode': '600053',
                'phone': '04498765435',
                'email': 'chennai@capitallogistics.com',
                'lr_prefix': 'CHE',
            },
        ]
        
        branches = []
        for branch_data in branches_data:
            branch, created = Branch.objects.get_or_create(
                code=branch_data['code'],
                defaults={
                    **branch_data,
                    'company': company,
                    'created_by': admin_user,
                    'updated_by': admin_user,
                }
            )
            # Ensure the branch has created_by/updated_by even if it already existed
            if not branch.created_by_id:
                branch.created_by = admin_user
                branch.updated_by = admin_user
                branch.save()
            
            branches.append(branch)
            status = '✅ Created' if created else '⚠️  Already exists'
            self.stdout.write(self.style.SUCCESS(f'{status} - {branch.name} ({branch.code})'))
        
        # Ensure admin user password is set correctly
        if not admin_user.check_password(password):
            admin_user.set_password(password)
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f'✅ Super Admin password updated: admin'))
        else:
            self.stdout.write(self.style.SUCCESS(f'✅ Super Admin user ready: admin (Password: {password})'))
        
        # Create Branch Users
        branch_users_data = [
            {
                'username': 'mumbai_manager',
                'email': 'mumbai.manager@capitallogistics.com',
                'first_name': 'Mumbai',
                'last_name': 'Manager',
                'role': 'BRANCH_MANAGER',
                'branch_code': 'MUM01',
                'phone': '9876543211',
            },
            {
                'username': 'delhi_manager',
                'email': 'delhi.manager@capitallogistics.com',
                'first_name': 'Delhi',
                'last_name': 'Manager',
                'role': 'BRANCH_MANAGER',
                'branch_code': 'DEL01',
                'phone': '9876543213',
            },
            {
                'username': 'bangalore_manager',
                'email': 'bangalore.manager@capitallogistics.com',
                'first_name': 'Bangalore',
                'last_name': 'Manager',
                'role': 'BRANCH_MANAGER',
                'branch_code': 'BAN01',
                'phone': '9876543214',
            },
            {
                'username': 'chennai_manager',
                'email': 'chennai.manager@capitallogistics.com',
                'first_name': 'Chennai',
                'last_name': 'Manager',
                'role': 'BRANCH_MANAGER',
                'branch_code': 'CHE01',
                'phone': '9876543215',
            },
        ]
        
        for user_data in branch_users_data:
            branch_code = user_data.pop('branch_code')
            branch = next((b for b in branches if b.code == branch_code), None)
            
            if not branch:
                self.stdout.write(self.style.ERROR(f'❌ Branch {branch_code} not found for user {user_data["username"]}'))
                continue
            
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults={
                    **user_data,
                    'branch': branch,
                    'is_staff': True,
                    'is_active': True,
                }
            )
            
            # Update password and branch if user already existed
            if created or not user.check_password(password):
                user.set_password(password)
                user.branch = branch  # Ensure branch is set
                user.save()
                status = '✅ Created' if created else '✅ Updated'
                self.stdout.write(self.style.SUCCESS(
                    f'{status}: {user.username} ({user.get_role_display()}) - {branch.name} (Password: {password})'
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f'⚠️  Already exists: {user.username} ({user.get_role_display()}) - {branch.name}'
                ))
        
        # Summary
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('✅ Test Users Created Successfully!'))
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(self.style.SUCCESS(f'\n📝 Default Password for all users: {password}'))
        self.stdout.write(self.style.SUCCESS('\n👥 Users Created:'))
        self.stdout.write(self.style.SUCCESS('  1. admin (Super Admin) - Access to all branches, can edit'))
        self.stdout.write(self.style.SUCCESS('  2. mumbai_manager (Branch Manager) - Mumbai Branch, read-only'))
        self.stdout.write(self.style.SUCCESS('  3. delhi_manager (Branch Manager) - Delhi Branch, read-only'))
        self.stdout.write(self.style.SUCCESS('  4. bangalore_manager (Branch Manager) - Bangalore Branch, read-only'))
        self.stdout.write(self.style.SUCCESS('  5. chennai_manager (Branch Manager) - Chennai Branch, read-only'))
        self.stdout.write(self.style.SUCCESS('\n🏢 Branches:'))
        for branch in branches:
            self.stdout.write(self.style.SUCCESS(f'  - {branch.name} ({branch.code})'))
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
