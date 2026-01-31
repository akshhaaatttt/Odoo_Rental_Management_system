import { PrismaClient } from '@prisma/client';
import { generateInvoiceNumber } from '../utils/helpers.js';
import { sendInvoiceEmail } from '../utils/email.js';

const prisma = new PrismaClient();

// @desc    Get invoice by order ID
// @route   GET /api/invoices/order/:orderId
// @access  Private
export const getInvoiceByOrderId = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        vendor: true
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'ADMIN' && 
        order.customerId !== userId && 
        order.vendorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this invoice'
      });
    }

    // Get or create invoice
    let invoice = await prisma.invoice.findFirst({
      where: { orderId },
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                address: true
              }
            },
            vendor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                companyName: true,
                email: true,
                gstin: true,
                address: true
              }
            },
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    type: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // If invoice doesn't exist, create it
    if (!invoice) {
      const invoiceNumber = await generateInvoiceNumber(prisma);
      
      invoice = await prisma.invoice.create({
        data: {
          orderId,
          invoiceNumber,
          status: 'DRAFT', // Invoice status, not Order status
          amountDue: order.totalAmount,
          amountPaid: 0
        },
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phoneNumber: true,
                  address: true
                }
              },
              vendor: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  companyName: true,
                  email: true,
                  gstin: true,
                  address: true
                }
              },
              orderItems: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      type: true
                    }
                  }
                }
              }
            }
          }
        }
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                address: true
              }
            },
            vendor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                companyName: true,
                email: true,
                gstin: true,
                address: true
              }
            },
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    type: true
                  }
                }
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
    const userId = req.user.id;
    const userRole = req.user.role;
    const order = invoice.order;

    if (userRole !== 'ADMIN' && 
        order.customerId !== userId && 
        order.vendorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this invoice'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Post invoice (change from DRAFT to POSTED)
// @route   PATCH /api/invoices/:id/post
// @access  Private (Vendor/Admin)
export const postInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        order: true
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
        message: 'Not authorized to post this invoice'
      });
    }

    if (invoice.status === 'POSTED') {
      return res.status(400).json({
        success: false,
        message: 'Invoice is already posted'
      });
    }

    // Update invoice status
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: { status: 'POSTED' },
      include: {
        order: {
          include: {
            customer: true,
            vendor: true,
            orderItems: {
              include: { product: true }
            }
          }
        }
      }
    });

    // Update order status to INVOICED
    await prisma.order.update({
      where: { id: invoice.orderId },
      data: { status: 'INVOICED' }
    });

    res.json({
      success: true,
      message: 'Invoice posted successfully',
      data: updatedInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record payment
// @route   POST /api/invoices/:id/payment
// @access  Private (Vendor/Admin/Customer)
export const recordPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required'
      });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { order: true }
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
        message: 'Not authorized to record payment for this invoice'
      });
    }

    // Check if customer owns this order
    if (req.user.role === 'CUSTOMER' && invoice.order.customerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pay this invoice'
      });
    }

    const newAmountPaid = parseFloat(invoice.amountPaid) + parseFloat(amount);
    const amountDue = parseFloat(invoice.amountDue);

    if (newAmountPaid > amountDue) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount exceeds amount due'
      });
    }

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: { amountPaid: newAmountPaid }
    });

    // Update order payment status
    let paymentStatus = 'PARTIAL';
    if (newAmountPaid >= amountDue) {
      paymentStatus = 'PAID';
    } else if (newAmountPaid === 0) {
      paymentStatus = 'UNPAID';
    }

    await prisma.order.update({
      where: { id: invoice.orderId },
      data: { paymentStatus }
    });

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: updatedInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
export const getInvoices = async (req, res, next) => {
  try {
    const { status } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let whereClause = {};

    // Filter based on user role
    if (userRole === 'CUSTOMER') {
      whereClause.order = { customerId: userId };
    } else if (userRole === 'VENDOR') {
      whereClause.order = { vendorId: userId };
    }
    // ADMIN sees all invoices

    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            vendor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                companyName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
};

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

    // Send email to customer with payment link
    try {
      await sendInvoiceEmail(invoice, invoice.order.customer, paymentLink);
    } catch (emailError) {
      console.error('Failed to send invoice email:', emailError);
      // Continue even if email fails
    }

    // Invoice is already created, just return it with payment link
    // No need to update any fields

    res.json({
      success: true,
      message: 'Invoice sent successfully with payment link',
      data: {
        invoice: invoice,
        paymentLink
      }
    });
  } catch (error) {
    next(error);
  }
};
