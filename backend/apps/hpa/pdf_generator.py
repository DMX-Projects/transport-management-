"""
PDF Generator for Hire Payment Advice (HPA) forms
Matches the exact format and colors from the physical form
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from django.http import HttpResponse
from io import BytesIO
from datetime import datetime


def generate_hpa_pdf(hpa):
    """
    Generate HPA PDF matching the exact format from the image
    Blue border and blue text for labels
    Includes transaction history at the end
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, 
                           leftMargin=10*mm, rightMargin=10*mm,
                           topMargin=10*mm, bottomMargin=10*mm)
    
    # Container for the 'Flowable' objects
    elements = []
    styles = getSampleStyleSheet()
    
    # Blue color for labels (matching the form)
    blue_color = colors.HexColor('#0000FF')  # Blue
    
    # Custom styles matching the form
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=blue_color,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=6
    )
    
    company_style = ParagraphStyle(
        'Company',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.black,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=4
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.black,
        fontName='Helvetica',
        alignment=TA_LEFT,
        spaceAfter=2
    )
    
    field_label_style = ParagraphStyle(
        'FieldLabel',
        parent=styles['Normal'],
        fontSize=9,
        textColor=blue_color,  # Blue labels
        fontName='Helvetica-Bold',
        alignment=TA_LEFT
    )
    
    field_value_style = ParagraphStyle(
        'FieldValue',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black,
        fontName='Helvetica',
        alignment=TA_LEFT
    )
    
    # Top Section: GSTIN and Cell
    if hpa.branch and hpa.branch.company:
        company = hpa.branch.company
        gstin = company.gstin or "29AAIFC415002ZO"
        phone = company.phone or "8977924118"
    else:
        gstin = "29AAIFC415002ZO"
        phone = "8977924118"
    
    top_info_data = [
        [f'GSTIN: {gstin}', f'Cell: {phone}']
    ]
    top_info_table = Table(top_info_data, colWidths=[90*mm, 90*mm])
    top_info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(top_info_table)
    elements.append(Spacer(1, 4*mm))
    
    # Title: HIRE PAYMENT ADVICE
    elements.append(Paragraph("HIRE PAYMENT ADVICE", title_style))
    elements.append(Spacer(1, 2*mm))
    
    # Company Name
    elements.append(Paragraph("CAPITAL LOGISTICS", company_style))
    elements.append(Paragraph("TRANSPORT CONTRACTORS & FLEET OWNERS", header_style))
    elements.append(Spacer(1, 2*mm))
    
    # Company Addresses
    if hpa.branch and hpa.branch.company:
        company = hpa.branch.company
        address = f"{company.address or 'Pedagartapadu Vill, Dachepalli Mandal, Guntur Dist'}, A.P.-{company.pincode or '522 437'}."
        email = company.email or "captlogs@gmail.com"
        ho_address = "H.O.: #378, 2nd Floor, Sai Krupa Market, Mahaboob Mansion, Malakpet, Hyderabad-500 036, T.S."
    else:
        address = "Pedagartapadu Vill, Dachepalli Mandal, Guntur Dist, A.P.-522 437."
        email = "captlogs@gmail.com"
        ho_address = "H.O.: #378, 2nd Floor, Sai Krupa Market, Mahaboob Mansion, Malakpet, Hyderabad-500 036, T.S."
    
    elements.append(Paragraph(address, header_style))
    elements.append(Paragraph(f"E-mail: {email}", header_style))
    elements.append(Paragraph(ho_address, header_style))
    elements.append(Spacer(1, 4*mm))
    
    # Form Details Section
    # Invoice No., No. (HPA number), Date
    form_header_data = [
        ['Invoice No.:', hpa.invoice_number or '20153572', 'No.:', hpa.hpa_number or '10000'],
        ['Date:', hpa.hpa_date.strftime('%d/%m/%y') if hpa.hpa_date else '8/1/26', '', '']
    ]
    form_header_table = Table(form_header_data, colWidths=[30*mm, 50*mm, 30*mm, 50*mm])
    form_header_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (1, -1), blue_color),  # Labels in blue
        ('TEXTCOLOR', (2, 0), (3, -1), blue_color),
        ('TEXTCOLOR', (1, 0), (1, 0), colors.black),  # Values in black
        ('TEXTCOLOR', (3, 0), (3, 0), colors.black),
        ('TEXTCOLOR', (1, 1), (1, 1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    elements.append(form_header_table)
    elements.append(Spacer(1, 3*mm))
    
    # Location Details
    location_data = [
        ['From:', hpa.from_location or 'Chettinad Dachepalli'],
        ['To:', hpa.to_location or 'RAJAMANDRY PC']
    ]
    location_table = Table(location_data, colWidths=[30*mm, 150*mm])
    location_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), blue_color),  # Labels in blue
        ('TEXTCOLOR', (1, 0), (1, -1), colors.black),  # Values in black
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    elements.append(location_table)
    elements.append(Spacer(1, 3*mm))
    
    # Vehicle & Owner Details
    vehicle_owner_data = [
        ['Vehicle No.:', hpa.truck.truck_number if hpa.truck else 'AP 39UF 3779'],
        ['Owner Name:', hpa.owner_name or ''],
        ['Mob.:', hpa.owner_mob or '']
    ]
    vehicle_owner_table = Table(vehicle_owner_data, colWidths=[40*mm, 140*mm])
    vehicle_owner_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), blue_color),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    elements.append(vehicle_owner_table)
    elements.append(Spacer(1, 3*mm))
    
    # Driver Details
    driver_data = [
        ['Driver Name:', hpa.driver_name or 'B.R.K. REDDY'],
        ['Mob.:', hpa.driver_mob or '9573344895']
    ]
    driver_table = Table(driver_data, colWidths=[40*mm, 140*mm])
    driver_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), blue_color),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    elements.append(driver_table)
    elements.append(Spacer(1, 3*mm))
    
    # LR Reference and Tons
    lr_tons_data = [
        ['LR No.:', hpa.lr_reference or (hpa.lr.lr_number if hpa.lr else hpa.hpa_number)],
        ['Tons:', str(hpa.tons) if hpa.tons else '35']
    ]
    lr_tons_table = Table(lr_tons_data, colWidths=[40*mm, 140*mm])
    lr_tons_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), blue_color),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    elements.append(lr_tons_table)
    elements.append(Spacer(1, 3*mm))
    
    # Financial Details
    financial_data = [
        ['Rate per Tonne:', f"Rs. {hpa.rate_per_tonne or 983}"],
        ['Lorry Hire Rs.:', f"Rs. {float(hpa.lorry_hire_rs or 34405.00):.2f}"],
        ['Less Advance:', f"Rs. {float(hpa.advance_paid_rs or 300.00):.2f}"],
        ['Diesel:', f"Rs. {float(hpa.diesel_amount or 23000):.2f}"],
        ['Pump Name:', hpa.pump_name or 'B.R.K. REDDY'],
        ['Bank:', f"Rs. {float(hpa.bank_amount or 8000.00):.2f}"],
        ['Balance Rs.:', f"Rs. {float(hpa.balance_rs or 3105.00):.2f}"]
    ]
    financial_table = Table(financial_data, colWidths=[50*mm, 130*mm])
    financial_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), blue_color),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('FONTNAME', (1, 1), (1, 1), 'Helvetica-Bold'),  # Bold for Lorry Hire
        ('FONTNAME', (1, 6), (1, 6), 'Helvetica-Bold'),  # Bold for Balance
    ]))
    elements.append(financial_table)
    elements.append(Spacer(1, 3*mm))
    
    # Any Other Charges
    other_charges_data = [
        ['Any Other Charges:', f"Rs. {float(hpa.other_deductions or 0):.2f}"]
    ]
    if hpa.other_deductions_description:
        other_charges_data.append(['Description:', hpa.other_deductions_description])
    
    other_charges_table = Table(other_charges_data, colWidths=[50*mm, 130*mm])
    other_charges_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), blue_color),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    elements.append(other_charges_table)
    elements.append(Spacer(1, 4*mm))
    
    # Transaction History Section - Using unified HPATransaction table
    transactions = hpa.transactions.filter(is_deleted=False).order_by('-transaction_date') if hasattr(hpa, 'transactions') else []
    
    if transactions.exists():
        elements.append(Spacer(1, 2*mm))
        elements.append(Paragraph("<b style='color: %s'>Payment Transactions History</b>" % blue_color, field_label_style))
        elements.append(Spacer(1, 2*mm))
        
        # Transaction table header
        transaction_data = [
            ['Date', 'Type', 'Payment Mode', 'Amount (Rs.)', 'Details']
        ]
        
        # Add transaction rows
        for txn in transactions:
            details = []
            if txn.pump_name:
                details.append(f"Pump: {txn.pump_name}")
            if txn.bank_name:
                details.append(f"Bank: {txn.bank_name}")
            if txn.reference_number:
                details.append(f"Ref: {txn.reference_number}")
            if txn.description:
                details.append(txn.description)
            elif txn.remarks:
                details.append(txn.remarks)
            
            details_text = ', '.join(details) if details else '-'
            
            transaction_data.append([
                str(txn.transaction_date),
                txn.get_transaction_type_display() if hasattr(txn, 'get_transaction_type_display') else txn.transaction_type,
                txn.payment_mode or '-',
                f"Rs. {float(txn.amount):.2f}",
                details_text
            ])
        
        # Add totals row
        total_transactions = sum(float(txn.amount) for txn in transactions)
        transaction_data.append([
            '', 'TOTAL', '', f"Rs. {total_transactions:.2f}", ''
        ])
        
        transaction_table = Table(transaction_data, colWidths=[25*mm, 25*mm, 35*mm, 30*mm, 55*mm])
        transaction_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),  # Header bold
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('BACKGROUND', (0, 0), (-1, 0), blue_color),  # Header background
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (4, 0), (4, -1), 'LEFT'),  # Details column left-aligned
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),  # Total row bold
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),  # Total row background
        ]))
        elements.append(transaction_table)
        elements.append(Spacer(1, 4*mm))
    
    # Note Section
    elements.append(Paragraph("<b>Note:</b>", field_label_style))
    note_text = hpa.note or "I have received above quantity in good condition & I am responsible for good delivery to the party\nminimum 3 Delivery"
    elements.append(Paragraph(note_text, field_value_style))
    elements.append(Spacer(1, 6*mm))
    
    # Signature Section
    signature_data = [
        ['Driver / Owner', 'For Capital Logistics']
    ]
    signature_table = Table(signature_data, colWidths=[90*mm, 90*mm])
    signature_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(signature_table)
    
    # Build PDF
    doc.build(elements)
    
    # Get the value of the BytesIO buffer and write it to the response
    pdf = buffer.getvalue()
    buffer.close()
    
    return pdf

