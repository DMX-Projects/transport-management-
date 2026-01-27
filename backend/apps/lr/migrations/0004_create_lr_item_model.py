# Generated manually for Multi-Item LR feature

from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('lr', '0003_alter_lorryreceipt_status'),
        ('masters', '0003_auditlog'),
    ]

    operations = [
        migrations.CreateModel(
            name='LRItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('sequence_number', models.IntegerField(default=1, help_text='Order sequence within LR')),
                ('delivery_at', models.CharField(blank=True, help_text='Specific delivery location if different', max_length=200)),
                ('from_location', models.CharField(blank=True, default='', help_text='Loading location', max_length=200)),
                ('to_location', models.CharField(blank=True, default='', help_text='Unloading destination', max_length=200)),
                ('destination', models.CharField(blank=True, help_text='Final destination', max_length=200)),
                ('material_description', models.TextField(blank=True, help_text='Description of goods')),
                ('quantity_mt', models.DecimalField(decimal_places=2, default=0, help_text='Quantity in Metric Tons (M.T.)', max_digits=10, validators=[django.core.validators.MinValueValidator(0)])),
                ('number_of_bags', models.IntegerField(default=0, help_text='Number of bags', validators=[django.core.validators.MinValueValidator(0)])),
                ('grade', models.CharField(blank=True, choices=[('53', 'Grade 53'), ('43', 'Grade 43'), ('OPC', 'OPC (Ordinary Portland Cement)'), ('PPC', 'PPC (Portland Pozzolana Cement)'), ('OTHER', 'Other')], help_text='Grade of material (53/43/OPC)', max_length=10)),
                ('grade_quantity', models.CharField(blank=True, help_text='Grade quantity (e.g., 35MT OPC)', max_length=50)),
                ('loading_from_department', models.CharField(blank=True, default='DISTRIBUTION DEPARTMENT', help_text='Loading from department', max_length=100)),
                ('please_load', models.CharField(blank=True, max_length=100)),
                ('number_of_loads', models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0)])),
                ('grade_type_of_pkg', models.CharField(blank=True, help_text='Grade/Type of Package', max_length=100)),
                ('sap_number', models.CharField(blank=True, help_text='SAP Number from consignor', max_length=50)),
                ('payment_term', models.CharField(choices=[('TO_BE_BILLED', 'To Be Billed'), ('TO_PAY', 'To Pay'), ('PAID', 'Paid')], default='TO_BE_BILLED', help_text='Terms of payment', max_length=20)),
                ('gst_payable_by', models.CharField(default='SERVICE', help_text='GST payable by (Service/Consignor/Consignee)', max_length=50)),
                ('consignee', models.ForeignKey(help_text='Party receiving goods', on_delete=django.db.models.deletion.PROTECT, related_name='lr_items', to='masters.party')),
                ('consignor', models.ForeignKey(help_text='Company sending goods', on_delete=django.db.models.deletion.PROTECT, related_name='lr_items', to='masters.consignor')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='%(class)s_created', to='accounts.user')),
                ('deleted_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(class)s_deleted', to='accounts.user')),
                ('lr', models.ForeignKey(help_text='Parent Lorry Receipt', on_delete=django.db.models.deletion.CASCADE, related_name='lr_items', to='lr.lorryreceipt')),
                ('updated_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='%(class)s_updated', to='accounts.user')),
            ],
            options={
                'verbose_name': 'LR Item',
                'verbose_name_plural': 'LR Items',
                'db_table': 'lr_items',
                'ordering': ['sequence_number', 'id'],
            },
        ),
        migrations.AddIndex(
            model_name='lritem',
            index=models.Index(fields=['lr', 'sequence_number'], name='lr_items_lr_id_sequence_idx'),
        ),
        migrations.AddIndex(
            model_name='lritem',
            index=models.Index(fields=['consignor'], name='lr_items_consignor_idx'),
        ),
        migrations.AddIndex(
            model_name='lritem',
            index=models.Index(fields=['consignee'], name='lr_items_consignee_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='lritem',
            unique_together={('lr', 'sequence_number')},
        ),
    ]
