"""
Refresh dashboard stats for today (global + per branch) so the dashboard shows current data.
Run after seeding or when dashboard shows zeros: python manage.py refresh_dashboard_stats
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.masters.models import Branch
from apps.dashboard.signals import update_dashboard_stats


class Command(BaseCommand):
    help = 'Refresh dashboard stats for today so the dashboard shows current data'

    def handle(self, *args, **options):
        today = timezone.now().date()
        # Update global stats (branch=None) for Super Admin
        update_dashboard_stats(branch=None, date_obj=today, user=None)
        self.stdout.write(self.style.SUCCESS(f'Updated global dashboard stats for {today}'))
        # Update per-branch stats
        for branch in Branch.objects.filter(is_deleted=False, is_active=True):
            update_dashboard_stats(branch=branch, date_obj=today, user=None)
            self.stdout.write(self.style.SUCCESS(f'  Updated stats for branch: {branch.name}'))
        self.stdout.write(self.style.SUCCESS('Dashboard stats refreshed. Reload the dashboard page.'))
