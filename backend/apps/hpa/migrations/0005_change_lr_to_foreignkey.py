# Generated migration to change HPA.lr from OneToOneField to ForeignKey

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('hpa', '0004_alter_hpatransaction_transaction_type'),
        ('lr', '0006_rename_lr_items_lr_id_sequence_idx_lr_items_lr_id_4b2b1a_idx_and_more'),
    ]

    operations = [
        # Step 1: Add new ForeignKey field (nullable, no unique constraint)
        migrations.AddField(
            model_name='hirepaymentadvice',
            name='lr_new',
            field=models.ForeignKey(
                blank=True,
                help_text='Primary Lorry Receipt (HPA number uses this LR number)',
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='hpas_new',
                to='lr.lorryreceipt',
            ),
        ),
        
        # Step 2: Copy data from old field to new field
        migrations.RunPython(
            code=lambda apps, schema_editor: migrate_lr_data(apps, schema_editor),
            reverse_code=lambda apps, schema_editor: reverse_migrate_lr_data(apps, schema_editor),
        ),
        
        # Step 3: Remove old OneToOneField
        migrations.RemoveField(
            model_name='hirepaymentadvice',
            name='lr',
        ),
        
        # Step 4: Rename new field to old name
        migrations.RenameField(
            model_name='hirepaymentadvice',
            old_name='lr_new',
            new_name='lr',
        ),
        
        # Step 5: Update related_name to 'primary_hpas' (from 'hpa')
        migrations.AlterField(
            model_name='hirepaymentadvice',
            name='lr',
            field=models.ForeignKey(
                blank=True,
                help_text='Primary Lorry Receipt (HPA number uses this LR number)',
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='primary_hpas',
                to='lr.lorryreceipt',
            ),
        ),
        
        # Step 6: Add ManyToMany field for additional LRs
        migrations.AddField(
            model_name='hirepaymentadvice',
            name='additional_lrs',
            field=models.ManyToManyField(
                blank=True,
                help_text='Additional Lorry Receipts linked to this HPA',
                related_name='additional_hpas',
                to='lr.lorryreceipt',
            ),
        ),
    ]


def migrate_lr_data(apps, schema_editor):
    """Copy data from old OneToOneField to new ForeignKey"""
    HirePaymentAdvice = apps.get_model('hpa', 'HirePaymentAdvice')
    for hpa in HirePaymentAdvice.objects.all():
        if hpa.lr_id:  # If old field has a value
            hpa.lr_new_id = hpa.lr_id
            hpa.save(update_fields=['lr_new_id'])


def reverse_migrate_lr_data(apps, schema_editor):
    """Reverse migration - copy back to OneToOneField (if needed)"""
    # This is a one-way migration, but we provide reverse for safety
    HirePaymentAdvice = apps.get_model('hpa', 'HirePaymentAdvice')
    for hpa in HirePaymentAdvice.objects.all():
        if hpa.lr_new_id:
            hpa.lr_id = hpa.lr_new_id
            hpa.save(update_fields=['lr_id'])
