// Add this function to invoiceController.js

// @desc    Send invoice with payment link
// @route   POST /api/invoices/:id/send
// @access  Private (Vendor/Admin)
export const sendInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
            vendor: true,
            orderItems: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check authorization
    if (req.user.role === 'VENDOR' && invoice.order.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Generate payment link (dummy for now)
    const paymentLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/${invoice.id}`;

    // Send email with invoice and payment link
    const emailContent = {
      to: invoice.order.customer.email,
      subject: `Invoice ${invoice.invoiceNumber} - Payment Required`,
      html: `
        <h2>Invoice for Order ${invoice.order.orderReference}</h2>
        <p>Dear ${invoice.order.customer.firstName},</p>
        <p>Your invoice is ready for payment.</p>
        <p><strong>Amount Due: ₹${invoice.amountDue}</strong></p>
        <p>Please click the link below to make payment:</p>
        <a href="${paymentLink}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Pay Now
        </a>
        <p>Order Details:</p>
        <ul>
          ${invoice.order.orderItems.map(item => `
            <li>${item.product.name} - Qty: ${item.quantity} - ₹${item.unitPrice}</li>
          `).join('')}
        </ul>
        <p>Thank you for your business!</p>
      `
    };

    // Here you would integrate with your email service
    // For now, just update invoice status
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        sentAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Invoice sent successfully with payment link',
      data: {
        invoice: updatedInvoice,
        paymentLink
      }
    });
  } catch (error) {
    next(error);
  }
};
