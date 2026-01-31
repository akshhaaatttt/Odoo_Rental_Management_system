import PDFDocument from 'pdfkit';
import { formatCurrency, formatDate } from './helpers.js';

/**
 * Generate Invoice PDF
 * @param {Object} invoiceData - Complete invoice data including order, customer, vendor, items
 * @param {Stream} stream - Writable stream to output PDF
 */
export const generateInvoicePDF = (invoiceData, stream) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Pipe to stream
  doc.pipe(stream);

  // Extract data
  const { invoice, order, customer, vendor, orderItems } = invoiceData;

  // Header
  generateHeader(doc, vendor, invoice);
  
  // Billing Information
  generateBillingInfo(doc, customer, vendor);
  
  // Invoice Table
  generateInvoiceTable(doc, orderItems, order);
  
  // Financial Summary
  generateSummary(doc, invoice, order);
  
  // Footer
  generateFooter(doc);

  // Finalize PDF
  doc.end();
};

/**
 * Generate PDF Header with Logo and Invoice Details
 */
function generateHeader(doc, vendor, invoice) {
  doc
    .fontSize(20)
    .fillColor('#6366f1')
    .text('INVOICE', 50, 50, { align: 'left' })
    .fontSize(9)
    .fillColor('#000000')
    .text(`Invoice #: ${invoice.invoiceNumber}`, 50, 80)
    .text(`Date: ${formatDate(invoice.createdAt)}`, 50, 93)
    .text(`Status: ${invoice.status}`, 50, 106);

  // Company Info (Right Side)
  const companyX = 320;
  doc
    .fontSize(14)
    .fillColor('#6366f1')
    .text(vendor.companyName || `${vendor.firstName} ${vendor.lastName}`, companyX, 50, { align: 'right', width: 225 })
    .fontSize(8.5)
    .fillColor('#000000')
    .text(vendor.address || 'Address not provided', companyX, 70, { align: 'right', width: 225 })
    .text(`Email: ${vendor.email}`, companyX, 85, { align: 'right', width: 225 })
    .text(`Phone: ${vendor.phoneNumber || 'N/A'}`, companyX, 98, { align: 'right', width: 225 });

  if (vendor.gstin) {
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(`GSTIN: ${vendor.gstin}`, companyX, 111, { align: 'right', width: 225 })
      .font('Helvetica');
  }

  // Horizontal line
  doc
    .strokeColor('#6366f1')
    .lineWidth(2)
    .moveTo(50, 145)
    .lineTo(545, 145)
    .stroke();
}

/**
 * Generate Billing Information Section
 */
function generateBillingInfo(doc, customer, vendor) {
  const startY = 165;

  // Bill To (Customer)
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('BILL TO:', 50, startY)
    .font('Helvetica')
    .fontSize(9)
    .text(`${customer.firstName} ${customer.lastName}`, 50, startY + 18)
    .text(customer.email, 50, startY + 31)
    .text(customer.phoneNumber || 'N/A', 50, startY + 44)
    .text(customer.address || 'Address not provided', 50, startY + 57, { width: 220 });

  // Pay To (Vendor)
  const payToX = 300;
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('PAY TO:', payToX, startY)
    .font('Helvetica')
    .fontSize(9)
    .text(vendor.companyName || `${vendor.firstName} ${vendor.lastName}`, payToX, startY + 18)
    .text(vendor.email, payToX, startY + 31)
    .text(vendor.phoneNumber || 'N/A', payToX, startY + 44);

  if (vendor.gstin) {
    doc
      .font('Helvetica-Bold')
      .text(`GSTIN: ${vendor.gstin}`, payToX, startY + 57)
      .font('Helvetica');
  }
}

/**
 * Generate Invoice Table with Line Items
 */
function generateInvoiceTable(doc, orderItems, order) {
  const tableTop = 280;
  const itemCodeX = 50;
  const descriptionX = 100;
  const rentalPeriodX = 220;
  const quantityX = 330;
  const rateX = 380;
  const taxX = 450;
  const amountX = 490;

  // Table Header
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#ffffff')
    .rect(50, tableTop, 495, 25)
    .fillAndStroke('#6366f1');

  doc
    .fillColor('#ffffff')
    .text('Item', itemCodeX + 3, tableTop + 8, { width: 45 })
    .text('Description', descriptionX + 3, tableTop + 8, { width: 115 })
    .text('Rental Period', rentalPeriodX + 3, tableTop + 8, { width: 105 })
    .text('Qty', quantityX + 3, tableTop + 8, { width: 35 })
    .text('Rate', rateX + 3, tableTop + 8, { width: 65 })
    .text('Tax%', taxX + 3, tableTop + 8, { width: 35 })
    .text('Amount', amountX + 3, tableTop + 8, { width: 52, align: 'right' });

  doc.font('Helvetica').fillColor('#000000');

  // Table Rows
  let y = tableTop + 35;
  let subtotal = 0;

  orderItems.forEach((item, index) => {
    const rentalDays = calculateRentalDays(item.rentalStart, item.rentalEnd);
    const amount = parseFloat(item.unitPrice) * item.quantity * rentalDays;
    subtotal += amount;

    // Alternate row colors
    if (index % 2 === 0) {
      doc
        .fillColor('#f9fafb')
        .rect(50, y - 5, 495, 22)
        .fill();
    }

    // Format rental period
    const startDate = new Date(item.rentalStart);
    const endDate = new Date(item.rentalEnd);
    const rentalPeriod = `${startDate.getDate()} ${startDate.toLocaleString('default', { month: 'short' })} - ${endDate.getDate()} ${endDate.toLocaleString('default', { month: 'short' })} ${endDate.getFullYear()}`;

    doc
      .fillColor('#000000')
      .fontSize(8.5)
      .text(`#${index + 1}`, itemCodeX + 3, y, { width: 45 })
      .text(item.product.name, descriptionX + 3, y, { width: 115, ellipsis: true })
      .text(rentalPeriod, rentalPeriodX + 3, y, { width: 105 })
      .text(item.quantity.toString(), quantityX + 3, y, { width: 35, align: 'center' })
      .text(`Rs. ${parseFloat(item.unitPrice).toFixed(2)}`, rateX + 3, y, { width: 65 })
      .text('18%', taxX + 3, y, { width: 35, align: 'center' })
      .text(`Rs. ${amount.toFixed(2)}`, amountX + 3, y, { width: 52, align: 'right' });

    y += 25;

    // Add new page if needed
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
  });

  // Bottom border
  doc
    .strokeColor('#e5e7eb')
    .lineWidth(1)
    .moveTo(50, y)
    .lineTo(545, y)
    .stroke();

  return y + 10;
}

/**
 * Generate Financial Summary
 */
function generateSummary(doc, invoice, order) {
  const summaryTop = 520;
  const labelX = 370;
  const valueX = 470;

  // Calculate values
  const subtotal = parseFloat(order.totalAmount);
  const taxRate = 0.18; // 18% GST
  const taxAmount = subtotal * taxRate;
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;
  const grandTotal = subtotal + taxAmount;
  const amountPaid = parseFloat(invoice.amountPaid);
  const balanceDue = parseFloat(invoice.amountDue);

  doc.fontSize(10).font('Helvetica');

  // Subtotal
  doc
    .text('Subtotal:', labelX, summaryTop)
    .text(`Rs. ${subtotal.toFixed(2)}`, valueX, summaryTop, { width: 75, align: 'right' });

  // Tax Breakdown
  doc
    .text('CGST (9%):', labelX, summaryTop + 20)
    .text(`Rs. ${cgst.toFixed(2)}`, valueX, summaryTop + 20, { width: 75, align: 'right' });

  doc
    .text('SGST (9%):', labelX, summaryTop + 40)
    .text(`Rs. ${sgst.toFixed(2)}`, valueX, summaryTop + 40, { width: 75, align: 'right' });

  // Tax Total
  doc
    .font('Helvetica-Bold')
    .text('Tax (18%):', labelX, summaryTop + 60)
    .text(`Rs. ${taxAmount.toFixed(2)}`, valueX, summaryTop + 60, { width: 75, align: 'right' })
    .font('Helvetica');

  // Line
  doc
    .strokeColor('#e5e7eb')
    .lineWidth(1)
    .moveTo(labelX, summaryTop + 80)
    .lineTo(545, summaryTop + 80)
    .stroke();

  // Grand Total
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#6366f1')
    .text('Grand Total:', labelX, summaryTop + 90)
    .text(`Rs. ${grandTotal.toFixed(2)}`, valueX, summaryTop + 90, { width: 75, align: 'right' });

  // Amount Paid
  doc
    .fontSize(10)
    .fillColor('#000000')
    .font('Helvetica')
    .text('Less: Amount Paid:', labelX, summaryTop + 120)
    .text(`Rs. ${amountPaid.toFixed(2)}`, valueX, summaryTop + 120, { width: 75, align: 'right' });

  // Line
  doc
    .strokeColor('#e5e7eb')
    .lineWidth(1)
    .moveTo(labelX, summaryTop + 140)
    .lineTo(545, summaryTop + 140)
    .stroke();

  // Balance Due
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor(balanceDue > 0 ? '#ef4444' : '#10b981')
    .text('Balance Due:', labelX, summaryTop + 150)
    .text(`Rs. ${balanceDue.toFixed(2)}`, valueX, summaryTop + 150, { width: 75, align: 'right' });
}

/**
 * Generate Footer
 */
function generateFooter(doc) {
  doc
    .fontSize(8)
    .fillColor('#6b7280')
    .text(
      'Thank you for your business! For any queries, please contact us.',
      50,
      720,
      { align: 'center', width: 500 }
    )
    .text(
      'This is a computer-generated invoice and does not require a signature.',
      50,
      735,
      { align: 'center', width: 500 }
    );
}

/**
 * Helper: Calculate rental days
 */
function calculateRentalDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 1;
}

export default generateInvoicePDF;
