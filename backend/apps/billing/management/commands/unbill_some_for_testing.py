"""
Remove one bill and its items (soft-delete) so some HPAs show up as "without bills" for testing Create Bill.
Run: python manage.py unbill_some_for_testing
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.billing.models import Bill, BillItem


class Command(BaseCommand):
    help = 'Soft-delete one bill (and its items) so some HPAs appear as unbilled for testing Create Bill flow'

    def handle(self, *args, **options):
        bill = Bill.objects.filter(is_deleted=False).order_by('id').first()
        if not bill:
            self.stdout.write(self.style.WARNING('No bills found. Create bills first or run seed_sample_data.'))
            return
        items = bill.bill_items.filter(is_deleted=False)
        count = items.count()
        bill_number = bill.bill_number
        # Soft-delete items so their LRs are no longer "billed"
        items.update(is_deleted=True, deleted_at=timezone.now())
        # Soft-delete the bill
        bill.is_deleted = True
        bill.deleted_at = timezone.now()
        bill.save(update_fields=['is_deleted', 'deleted_at'])
        self.stdout.write(self.style.SUCCESS(
            f'Soft-deleted bill {bill_number} ({count} item(s)). Those HPAs/LRs now appear as unbilled in Create Bill.'
        ))
