"""
PDF Generator for Lorry Receipt (LR) forms
Matches the exact format and colors from the physical form
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from django.http import HttpResponse
from io import BytesIO
from datetime import datetime


def generate_lr_pdf(lr):
    """
    Generate LR PDF matching the exact format from the image
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, 
                           leftMargin=10*mm, rightMargin=10*mm,
                           topMargin=10*mm, bottomMargin=10*mm)
    
    # Container for the 'Flowable' objects
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles matching the form
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#FF6600'),  # Orange color for CAPITAL LOGISTICS
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=6
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.black,
        fontName='Helvetica',
        alignment=TA_LEFT,
        spaceAfter=2
    )
    
    field_label_style = ParagraphStyle(
        'FieldLabel',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.black,
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
    
    # Header Section - CAPITAL LOGISTICS
    elements.append(Paragraph("CAPITAL LOGISTICS", title_style))
    elements.append(Spacer(1, 3*mm))
    
    # Company Addresses
    office_address = "Off. P. No. 2 B Wing. 1st Floor, Navoday Nagar, Opp. Kajal Nagar Hotagi Road, Solapur - 413224"
    ho_address = "H.O.: 378, 2nd Floor, Sai Krupa Market, Mahaboob Mansion, Malakpet, Hyderabad - 500 036. Telangana"
    
    # Get company details from branch if available
    if lr.branch and lr.branch.company:
        company = lr.branch.company
        if company.gstin:
            gstin = company.gstin
        else:
            gstin = "29AAIFC4150D2ZO"  # Default from image
        if company.email:
            email = company.email
        else:
            email = "captlogs@gmail.com"
        if company.phone:
            phone = company.phone
        else:
            phone = "7386101118, 7397819627"
    else:
        gstin = "29AAIFC4150D2ZO"
        email = "captlogs@gmail.com"
        phone = "7386101118, 7397819627"
    
    elements.append(Paragraph(office_address, header_style))
    elements.append(Paragraph(ho_address, header_style))
    elements.append(Spacer(1, 2*mm))
    
    # GSTIN, Email, Phone
    contact_info = f"GSTIN: {gstin} | Email - {email} | Ph: {phone}"
    elements.append(Paragraph(contact_info, header_style))
    elements.append(Spacer(1, 3*mm))
    
    # Top Section: Transporter Code, SAP No., LR No., Date, LR Submitted Time
    top_data = [
        ['Transporter Code: 36000023', '', 'Sap No.:', lr.sap_number or ''],
        ['', '', 'L.R. No.:', lr.lr_number or ''],
        ['', '', 'Date:', lr.lr_date.strftime('%d/%m/%y') if lr.lr_date else ''],
        ['', '', 'L.R. Submitted Time.:', lr.lr_submitted_time.strftime('%d/%m/%y %H:%M') if lr.lr_submitted_time else '']
    ]
    
    top_table = Table(top_data, colWidths=[60*mm, 20*mm, 40*mm, 60*mm])
    top_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (2, 0), (-1, -1), 0.5, colors.black),
        ('GRID', (0, 0), (0, 0), 0.5, colors.black),
    ]))
    elements.append(top_table)
    elements.append(Spacer(1, 4*mm))
    
    # Consignor Section
    elements.append(Paragraph("<b>Consignor :-</b>", field_label_style))
    if lr.consignor:
        consignor_name = lr.consignor.name
        consignor_address = f"{lr.consignor.address or ''}, {lr.consignor.city or ''} {lr.consignor.state or ''}-{lr.consignor.pincode or ''}"
        consignor_gstin = f"GSTIN : {lr.consignor.gstin or ''}"
    else:
        consignor_name = "CHETTINAD CEMENT CORPORATION PVT. LTD."
        consignor_address = "A/t. Ahuj, Alegaon Works Solapur MAHARASHTRA-413215"
        consignor_gstin = "GSTIN : 27AAACC3130A1ZJ"
    
    elements.append(Paragraph(consignor_name, field_value_style))
    elements.append(Paragraph(consignor_address, field_value_style))
    elements.append(Paragraph(consignor_gstin, field_value_style))
    elements.append(Spacer(1, 3*mm))
    
    # Consignee Section
    elements.append(Paragraph("<b>Consignee :-</b>", field_label_style))
    consignee_data = [
        ['Depot / Party:', lr.consignee.name if lr.consignee else 'Kivle'],
        ['Delivery At:', lr.delivery_at or '']
    ]
    consignee_table = Table(consignee_data, colWidths=[40*mm, 140*mm])
    consignee_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(consignee_table)
    elements.append(Spacer(1, 3*mm))
    
    # Terms of Payment and Destination
    payment_dest_data = [
        ['Terms of Payment - TO BE BILLED / To Pay:', lr.get_payment_term_display() if hasattr(lr, 'get_payment_term_display') else (lr.payment_term or 'TO BE BILLED')],
        ['Destination:', lr.destination or '']
    ]
    payment_dest_table = Table(payment_dest_data, colWidths=[80*mm, 100*mm])
    payment_dest_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(payment_dest_table)
    elements.append(Spacer(1, 3*mm))
    
    # Vehicle & Driver Details
    elements.append(Paragraph("<b>Vehicle & Driver Details:</b>", field_label_style))
    vehicle_data = [
        ['Vehicle No.:', lr.truck.truck_number if lr.truck else 'MH04HT5137'],
        ['Driver Name :', lr.driver_name or 'Nitin'],
        ['Driver Mob:', lr.driver_phone or '9075051507'],
        ['Driver Lic No.:', lr.driver_license_no or 'MH1320130013239']
    ]
    vehicle_table = Table(vehicle_data, colWidths=[50*mm, 130*mm])
    vehicle_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(vehicle_table)
    elements.append(Spacer(1, 3*mm))
    
    # Quantity & Grade Details
    elements.append(Paragraph("<b>Quantity & Grade Details:</b>", field_label_style))
    quantity_data = [
        ['Quantity (M.T.):', str(lr.quantity_mt) if lr.quantity_mt else '35.00'],
        ['No. of Bags:', str(lr.number_of_bags) if lr.number_of_bags else '700'],
        ['Grade 53 / 43 / OPC:', lr.grade_quantity or (lr.grade or '35MT')]
    ]
    quantity_table = Table(quantity_data, colWidths=[50*mm, 130*mm])
    quantity_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(quantity_table)
    elements.append(Spacer(1, 3*mm))
    
    # Loading Details
    elements.append(Paragraph("<b>LOADING FROM DISTRIBUTION DEPARTMENT</b>", field_label_style))
    loading_data = [
        ['Please Load:', lr.please_load or ''],
        ['No. of Load:', str(lr.number_of_loads) if lr.number_of_loads else ''],
        ['Grade / Type of Pkg.:', lr.grade_type_of_pkg or '']
    ]
    loading_table = Table(loading_data, colWidths=[50*mm, 130*mm])
    loading_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(loading_table)
    elements.append(Spacer(1, 3*mm))
    
    # GST and Signature Section
    gst_data = [
        ['GST is Payable by Ser:', lr.gst_payable_by or 'SERVICE'],
        ['Signature:', ''],
        ['Received Signature with Rubber stamp:', '']
    ]
    gst_table = Table(gst_data, colWidths=[60*mm, 120*mm])
    gst_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(gst_table)
    elements.append(Spacer(1, 3*mm))
    
    # Hindi Note
    hindi_note = "नोट : १५ दिन के अंदर असान नहीं वो गाडी का भाडा नही मिलेगा !"
    if lr.note:
        hindi_note = lr.note
    elements.append(Paragraph(hindi_note, field_value_style))
    elements.append(Spacer(1, 3*mm))
    
    # Footer
    footer_data = [
        ['For CAPITAL LOGISTICS', 'Booking Clerk:']
    ]
    footer_table = Table(footer_data, colWidths=[90*mm, 90*mm])
    footer_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(footer_table)
    
    # Build PDF
    doc.build(elements)
    
    # Get the value of the BytesIO buffer and write it to the response
    pdf = buffer.getvalue()
    buffer.close()
    
    return pdf



