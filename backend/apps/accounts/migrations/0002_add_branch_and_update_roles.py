# Generated manually
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('masters', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='branch',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='users',
                to='masters.branch',
                help_text='Branch assignment (null for admin)'
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='is_active_branch',
            field=models.BooleanField(default=True, help_text='User is active for their branch'),
        ),
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[('SUPER_ADMIN', 'Super Admin - Access to all branches'), ('BRANCH_MANAGER', 'Branch Manager')],
                default='BRANCH_MANAGER',
                max_length=20
            ),
        ),
    ]

