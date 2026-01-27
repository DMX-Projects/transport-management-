# Generated manually for Multi-Item LR feature

from django.db import migrations, models
import django.db.models.deletion


def migrate_billitem_foreign_keys(apps, schema_editor):
    """Migrate existing BillItem foreign keys from LR to LRItem"""
    BillItem = apps.get_model('billing', 'BillItem')
    LRItem = apps.get_model('lr', 'LRItem')
    
    for bill_item in BillItem.objects.filter(lr__isnull=False, lr_item__isnull=True):
        # Find the first item of the LR
        lr_item = LRItem.objects.filter(
            lr=bill_item.lr,
            is_deleted=False
        ).order_by('sequence_number', 'id').first()
        
        if lr_item:
            bill_item.lr_item = lr_item
            bill_item.save(update_fields=['lr_item'])


def reverse_migration(apps, schema_editor):
    """Reverse migration - set lr_item to None"""
    BillItem = apps.get_model('billing', 'BillItem')
    BillItem.objects.all().update(lr_item=None)


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0001_initial'),
        ('lr', '0005_migrate_existing_lr_data'),  # After LRItems are created
    ]

    operations = [
        migrations.AddField(
            model_name='billitem',
            name='lr_item',
            field=models.ForeignKey(
                blank=True,
                help_text='Linked LR Item',
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='bill_items',
                to='lr.lritem'
            ),
        ),
        migrations.AlterField(
            model_name='billitem',
            name='lr',
            field=models.ForeignKey(
                blank=True,
                help_text='Deprecated: Use lr_item instead. Linked Lorry Receipt',
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='bill_items',
                to='lr.lorryreceipt'
            ),
        ),
        migrations.AlterUniqueTogether(
            name='billitem',
            unique_together={('bill', 'lr_item')},
        ),
        migrations.AddIndex(
            model_name='billitem',
            index=models.Index(fields=['lr_item'], name='bill_items_lr_item_idx'),
        ),
        migrations.RunPython(migrate_billitem_foreign_keys, reverse_migration),
    ]
