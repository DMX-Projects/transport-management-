"""
Management command to create default billing templates.
Run: python manage.py create_default_templates
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.billing.models import BillingTemplate


class Command(BaseCommand):
    help = 'Create default billing templates'

    def handle(self, *args, **options):
        User = get_user_model()
        
        # Get or create admin user for audit fields
        admin_user = User.objects.filter(role='SUPER_ADMIN').first()
        if not admin_user:
            admin_user = User.objects.first()
        
        if not admin_user:
            self.stdout.write(self.style.ERROR('No users found. Please create a user first.'))
            return
        
        templates_created = 0
        templates_updated = 0

        # Template 1: Standard Format (Default)
        standard_template, created = BillingTemplate.objects.get_or_create(
            code='STANDARD_V1',
            defaults={
                'created_by': admin_user,
                'updated_by': admin_user,
                'name': 'Standard Format',
                'description': 'Default billing format with all standard fields',
                'template_type': 'STANDARD',
                'consignor': None,  # Global template
                'is_default': True,
                'is_active': True,
                'field_mapping': {
                    "show_lr_number": True,
                    "show_invoice_number": True,
                    "show_truck_number": True,
                    "show_driver_name": False,
                    "show_hpa_number": True,
                    "show_freight_breakdown": True,
                    "show_loading_charges": False,
                    "show_unloading_charges": False,
                    "show_material_description": True,
                    "show_destination": True,
                    "show_consignee": True
                },
                'calculation_rules': {
                    "freight_formula": "quantity_mt * rate_per_mt",
                    "loading_charges_type": "none",
                    "loading_charges_value": 0,
                    "unloading_charges_type": "none",
                    "unloading_charges_value": 0,
                    "round_off": True,
                    "round_direction": "nearest"
                },
                'grouping_rules': {
                    "group_by": "none",
                    "sort_by": "date",
                    "sort_order": "asc",
                    "show_subtotals": False,
                    "merge_same_destination": False
                },
                'tax_configuration': {
                    "gst_applicable": True,
                    "gst_type": "intra_state",
                    "sgst_rate": 9.0,
                    "cgst_rate": 9.0,
                    "igst_rate": 18.0,
                    "tds_applicable": False,
                    "tds_rate": 2.0,
                    "hsn_sac_code": "996791"
                },
                'display_options': {
                    "date_format": "DD/MM/YYYY",
                    "number_format": "indian",
                    "currency_symbol": "Rs.",
                    "decimal_places": 2,
                    "show_amount_in_words": True,
                    "header_text": "Tax Invoice",
                    "footer_text": "Terms and conditions apply"
                },
                'pdf_template_name': 'standard_bill',
                'header_config': {
                    "show_logo": True,
                    "logo_position": "left",
                    "company_name_size": 18,
                    "address_size": 10,
                    "show_gstin_header": True
                },
                'footer_config': {
                    "show_bank_details": True,
                    "show_terms": True,
                    "show_signature_line": True,
                    "terms_text": "Payment due within 30 days"
                },
                'page_settings': {
                    "paper_size": "A4",
                    "orientation": "portrait",
                    "margin_top": 20,
                    "margin_bottom": 20,
                    "margin_left": 15,
                    "margin_right": 15
                }
            }
        )
        if created:
            templates_created += 1
            self.stdout.write(self.style.SUCCESS(f'Created: {standard_template.name}'))
        else:
            templates_updated += 1
            self.stdout.write(self.style.WARNING(f'Already exists: {standard_template.name}'))

        # Template 2: Detailed with Breakdown
        detailed_template, created = BillingTemplate.objects.get_or_create(
            code='DETAILED_V1',
            defaults={
                'created_by': admin_user,
                'updated_by': admin_user,
                'name': 'Detailed with Breakdown',
                'description': 'Comprehensive format showing all charges and breakdowns',
                'template_type': 'DETAILED',
                'consignor': None,
                'is_default': False,
                'is_active': True,
                'field_mapping': {
                    "show_lr_number": True,
                    "show_invoice_number": True,
                    "show_truck_number": True,
                    "show_driver_name": True,
                    "show_hpa_number": True,
                    "show_freight_breakdown": True,
                    "show_loading_charges": True,
                    "show_unloading_charges": True,
                    "show_material_description": True,
                    "show_destination": True,
                    "show_consignee": True,
                    "show_from_location": True,
                    "show_to_location": True,
                    "show_rate_per_mt": True,
                    "show_bags_count": True
                },
                'calculation_rules': {
                    "freight_formula": "quantity_mt * rate_per_mt",
                    "loading_charges_type": "per_mt",
                    "loading_charges_value": 50,
                    "unloading_charges_type": "per_mt",
                    "unloading_charges_value": 50,
                    "round_off": True,
                    "round_direction": "up"
                },
                'grouping_rules': {
                    "group_by": "destination",
                    "sort_by": "date",
                    "sort_order": "asc",
                    "show_subtotals": True,
                    "merge_same_destination": False
                },
                'tax_configuration': {
                    "gst_applicable": True,
                    "gst_type": "intra_state",
                    "sgst_rate": 9.0,
                    "cgst_rate": 9.0,
                    "igst_rate": 18.0,
                    "tds_applicable": True,
                    "tds_rate": 2.0,
                    "hsn_sac_code": "996791"
                },
                'display_options': {
                    "date_format": "DD/MM/YYYY",
                    "number_format": "indian",
                    "currency_symbol": "Rs.",
                    "decimal_places": 2,
                    "show_amount_in_words": True,
                    "header_text": "Tax Invoice - Detailed",
                    "footer_text": "E&OE - Subject to terms and conditions"
                },
                'pdf_template_name': 'detailed_bill',
                'header_config': {
                    "show_logo": True,
                    "logo_position": "left",
                    "company_name_size": 18,
                    "address_size": 10,
                    "show_gstin_header": True
                },
                'footer_config': {
                    "show_bank_details": True,
                    "show_terms": True,
                    "show_signature_line": True,
                    "terms_text": "Payment due within 30 days. Interest @ 18% p.a. on delayed payments."
                },
                'page_settings': {
                    "paper_size": "A4",
                    "orientation": "landscape",
                    "margin_top": 15,
                    "margin_bottom": 15,
                    "margin_left": 10,
                    "margin_right": 10
                }
            }
        )
        if created:
            templates_created += 1
            self.stdout.write(self.style.SUCCESS(f'Created: {detailed_template.name}'))
        else:
            templates_updated += 1
            self.stdout.write(self.style.WARNING(f'Already exists: {detailed_template.name}'))

        # Template 3: Summary Format
        summary_template, created = BillingTemplate.objects.get_or_create(
            code='SUMMARY_V1',
            defaults={
                'created_by': admin_user,
                'updated_by': admin_user,
                'name': 'Summary Format',
                'description': 'Compact summary format with minimal details',
                'template_type': 'SUMMARY',
                'consignor': None,
                'is_default': False,
                'is_active': True,
                'field_mapping': {
                    "show_lr_number": False,
                    "show_invoice_number": True,
                    "show_truck_number": False,
                    "show_driver_name": False,
                    "show_hpa_number": False,
                    "show_freight_breakdown": False,
                    "show_loading_charges": False,
                    "show_unloading_charges": False,
                    "show_material_description": True,
                    "show_destination": True,
                    "show_consignee": False
                },
                'calculation_rules': {
                    "freight_formula": "quantity_mt * rate_per_mt",
                    "loading_charges_type": "none",
                    "loading_charges_value": 0,
                    "unloading_charges_type": "none",
                    "unloading_charges_value": 0,
                    "round_off": True,
                    "round_direction": "nearest"
                },
                'grouping_rules': {
                    "group_by": "destination",
                    "sort_by": "destination",
                    "sort_order": "asc",
                    "show_subtotals": True,
                    "merge_same_destination": True
                },
                'tax_configuration': {
                    "gst_applicable": True,
                    "gst_type": "intra_state",
                    "sgst_rate": 9.0,
                    "cgst_rate": 9.0,
                    "igst_rate": 18.0,
                    "tds_applicable": False,
                    "tds_rate": 0,
                    "hsn_sac_code": "996791"
                },
                'display_options': {
                    "date_format": "DD/MM/YYYY",
                    "number_format": "indian",
                    "currency_symbol": "Rs.",
                    "decimal_places": 2,
                    "show_amount_in_words": True,
                    "header_text": "Tax Invoice",
                    "footer_text": ""
                },
                'pdf_template_name': 'summary_bill',
                'header_config': {
                    "show_logo": True,
                    "logo_position": "center",
                    "company_name_size": 16,
                    "address_size": 9,
                    "show_gstin_header": True
                },
                'footer_config': {
                    "show_bank_details": True,
                    "show_terms": False,
                    "show_signature_line": True,
                    "terms_text": ""
                },
                'page_settings': {
                    "paper_size": "A4",
                    "orientation": "portrait",
                    "margin_top": 20,
                    "margin_bottom": 20,
                    "margin_left": 20,
                    "margin_right": 20
                }
            }
        )
        if created:
            templates_created += 1
            self.stdout.write(self.style.SUCCESS(f'Created: {summary_template.name}'))
        else:
            templates_updated += 1
            self.stdout.write(self.style.WARNING(f'Already exists: {summary_template.name}'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done! Created: {templates_created}, Already existed: {templates_updated}'
        ))

