# Generated manually for Multi-Item LR feature - Data Migration

from django.db import migrations


def migrate_existing_data(apps, schema_editor):
    """Copy existing LR data to LRItems (one item per LR)"""
    LorryReceipt = apps.get_model('lr', 'LorryReceipt')
    LRItem = apps.get_model('lr', 'LRItem')
    
    for lr in LorryReceipt.objects.all():
        # Only migrate if has order fields (not already migrated)
        if lr.consignor_id and lr.consignee_id:
            # Check if items already exist for this LR
            existing_items = LRItem.objects.filter(lr=lr, is_deleted=False)
            if existing_items.exists():
                continue  # Skip if already migrated
            
            LRItem.objects.create(
                lr=lr,
                sequence_number=1,
                consignor=lr.consignor,
                consignee=lr.consignee,
                delivery_at=lr.delivery_at or '',
                from_location=lr.from_location or '',
                to_location=lr.to_location or '',
                destination=lr.destination or '',
                material_description=lr.material_description or '',
                quantity_mt=lr.quantity_mt or 0,
                number_of_bags=lr.number_of_bags or 0,
                grade=lr.grade or '',
                grade_quantity=lr.grade_quantity or '',
                loading_from_department=lr.loading_from_department or 'DISTRIBUTION DEPARTMENT',
                please_load=lr.please_load or '',
                number_of_loads=lr.number_of_loads or 0,
                grade_type_of_pkg=lr.grade_type_of_pkg or '',
                sap_number=lr.sap_number or '',
                payment_term=lr.payment_term or 'TO_BE_BILLED',
                gst_payable_by=lr.gst_payable_by or 'SERVICE',
                created_by=lr.created_by,
                updated_by=lr.updated_by,
                created_at=lr.created_at,
                updated_at=lr.updated_at,
            )


def reverse_migration(apps, schema_editor):
    """Reverse migration - delete all LRItems"""
    LRItem = apps.get_model('lr', 'LRItem')
    LRItem.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('lr', '0004_create_lr_item_model'),
    ]

    operations = [
        migrations.RunPython(migrate_existing_data, reverse_migration),
    ]
