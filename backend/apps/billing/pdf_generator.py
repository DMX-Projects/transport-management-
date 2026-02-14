"""
Bill PDF Generator - Generate professional bill invoices using ReportLab
"""
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.lib import colors
from datetime import datetime
from decimal import Decimal


def generate_bill_pdf(bill):
    """
    Generate a professional bill PDF matching the invoice format from the image.
    
    Bill contains:
    - Header: Company info, GSTIN, Bill number, date
    - Item Details: Multiple LRs with freight, qty, totals
    - Calculations: Subtotal, SGST, CGST, Grand Total
    - Signature section
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*cm, bottomMargin=0.5*cm,
                            leftMargin=0.7*cm, rightMargin=0.7*cm)
    
    styles = getSampleStyleSheet()
    story = []
    
    # Define custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=14,
        textColor=colors.HexColor('#333333'),
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=10,
        textColor=colors.HexColor('#000000'),
        spaceAfter=3,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=9,
        spaceAfter=2,
        alignment=TA_LEFT
    )
    
    # Header Section
    header_data = [
        [Paragraph("<b>BILL NO : {}</b>".format(bill.bill_number), heading_style), 
         Paragraph("<b>DATE : {}</b>".format(bill.bill_date.strftime('%d-%m-%Y') if bill.bill_date else 'N/A'), heading_style)],
        [Paragraph("<b>GSTIN : {}</b>".format(bill.gstin or 'N/A'), normal_style), 
         Paragraph("<b>HSN/SAC : {}</b>".format(bill.hsn_sac_code), normal_style)],
    ]
    
    if bill.vendor_code:
        header_data.append([
            Paragraph("<b>VENDOR CODE : {}</b>".format(bill.vendor_code), normal_style),
            Paragraph("", normal_style)
        ])
    
    header_table = Table(header_data, colWidths=[3.5*inch, 3.5*inch])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.15*inch))
    
    # Consignor Section
    consignor_data = [
        [Paragraph("<b>Details Of Company (Billed to):</b>", heading_style)],
        [Paragraph(bill.consignor.name if bill.consignor else 'N/A', normal_style)],
        [Paragraph("Address : {}".format(bill.consignor.address if bill.consignor else 'N/A'), normal_style)],
        [Paragraph("GSTIN : {} | PAN : {}".format(
            bill.consignor_gstin or 'N/A',
            bill.consignor_pan or 'N/A'
        ), normal_style)],
    ]
    
    consignor_table = Table(consignor_data, colWidths=[7*inch])
    consignor_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E8E8E8')),
    ]))
    story.append(consignor_table)
    story.append(Spacer(1, 0.1*inch))
    
    # Bill Items Table
    bill_items = bill.bill_items.all()
    
    items_data = [
        ['SNO', 'DESTINATION', 'QTY (MT)', 'FREIGHT', 'TOTAL', 'SHORTAGES']
    ]
    
    for idx, item in enumerate(bill_items, 1):
        items_data.append([
            str(idx),
            item.lr.destination if item.lr else item.lr_number,
            str(item.quantity_mt),
            format_currency(item.freight_per_unit),
            format_currency(item.total_freight),
            ''
        ])
    
    # Add empty rows if needed
    while len(items_data) < 15:
        items_data.append(['', '', '', '', '', ''])
    
    # Add totals row
    items_data.append([
        '',
        '',
        format_currency(bill.total_quantity_mt),
        '',
        format_currency(bill.total_amount),
        ''
    ])
    
    items_table = Table(
        items_data,
        colWidths=[0.6*inch, 2.5*inch, 1*inch, 1.2*inch, 1.2*inch, 1.2*inch]
    )
    
    items_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#333333')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        
        # Data rows
        ('ALIGN', (0, 1), (0, -2), 'CENTER'),
        ('ALIGN', (2, 1), (-1, -2), 'RIGHT'),
        ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -2), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#F5F5F5')]),
        ('GRID', (0, 0), (-1, -2), 1, colors.black),
        
        # Totals row
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#E8E8E8')),
        ('ALIGN', (0, -1), (1, -1), 'CENTER'),
        ('ALIGN', (2, -1), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 9),
        ('TOPPADDING', (0, -1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 6),
        ('GRID', (0, -1), (-1, -1), 1, colors.black),
    ]))
    
    story.append(items_table)
    story.append(Spacer(1, 0.2*inch))
    
    # Summary Section
    summary_data = [
        ['', 'SGST @ {} %'.format(bill.sgst_rate), format_currency(bill.sgst_amount)],
        ['', 'CGST @ {} %'.format(bill.cgst_rate), format_currency(bill.cgst_amount)],
        ['', 'GRAND TOTAL', format_currency(bill.grand_total)],
    ]
    
    summary_table = Table(
        summary_data,
        colWidths=[3.2*inch, 1.9*inch, 1.2*inch]
    )
    
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (0, -1), 9),
        
        # Grand Total row
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#333333')),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.whitesmoke),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 10),
        ('TOPPADDING', (0, -1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 6),
        ('GRID', (1, 0), (-1, -1), 1, colors.black),
    ]))
    
    story.append(summary_table)
    story.append(Spacer(1, 0.25*inch))
    
    # Amount in Words
    words_amount = amount_in_words(bill.grand_total)
    story.append(Paragraph(
        "<b>Amount in Words: {} Rupees Only</b>".format(words_amount.title()),
        normal_style
    ))
    story.append(Spacer(1, 0.2*inch))
    
    # Signature Section
    sig_data = [
        [Paragraph("<b>For Capital Logistics</b>", heading_style), '', Paragraph("<b>Consignor</b>", heading_style)],
        ['', '', ''],
        ['', '', ''],
        [Paragraph("Signature", normal_style), '', Paragraph("Signature", normal_style)],
        [Paragraph("Date", normal_style), '', Paragraph("Date", normal_style)],
    ]
    
    sig_table = Table(sig_data, colWidths=[2.2*inch, 2.2*inch, 2.2*inch])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTSIZE', (0, 3), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
        ('TOPPADDING', (0, 0), (-1, 0), 4),
    ]))
    
    story.append(sig_table)
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def format_currency(value):
    """Format decimal value as currency string"""
    if isinstance(value, Decimal):
        return "₹ {:,.2f}".format(value)
    return "₹ {:,.2f}".format(Decimal(str(value)))


def amount_in_words(amount):
    """
    Convert amount in rupees to words
    Simple implementation for common numbers
    """
    ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
    teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 
             'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    
    amount = int(amount)
    
    if amount == 0:
        return "Zero"
    
    def convert_hundreds(num):
        result = ""
        if num >= 100:
            result += ones[num // 100] + " Hundred "
            num %= 100
        if num >= 20:
            result += tens[num // 10]
            if num % 10:
                result += " " + ones[num % 10]
        elif num >= 10:
            result += teens[num - 10]
        elif num > 0:
            result += ones[num]
        return result.strip()
    
    if amount < 100:
        return convert_hundreds(amount)
    elif amount < 1000:
        return convert_hundreds(amount)
    elif amount < 100000:
        lakh = amount // 1000
        remainder = amount % 1000
        result = str(lakh) + " Thousand"
        if remainder:
            result += " " + convert_hundreds(remainder)
        return result
    else:
        lakh = amount // 100000
        remainder = amount % 100000
        result = str(lakh) + " Lakh"
        if remainder >= 1000:
            result += " " + str(remainder // 1000) + " Thousand"
            remainder %= 1000
        if remainder:
            result += " " + convert_hundreds(remainder)
        return result
