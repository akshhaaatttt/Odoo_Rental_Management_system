import { PrismaClient } from '@prisma/client';
import {
  generateOrderReference,
  calculateRentalPrice,
  calculateLateFee
} from '../utils/helpers.js';
import { 
  sendOrderConfirmationEmail,
  sendQuotationEmail,
  sendPickupReminderEmail,
  sendReturnReminderEmail,
  sendLateReturnAlert,
  sendPickupConfirmationEmail
} from '../utils/email.js';
import { checkAvailability, reserveStock, releaseStock } from '../utils/availabilityCheck.js';

const prisma = new PrismaClient();

// @desc    Checkout with vendor split logic
// @route   POST /api/checkout
// @access  Private (Customer)
export const checkout = async (req, res, next) => {
  try {
    const { items, deliveryMethod, pickupDate, returnDate } = req.body;
    const customerId = req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart items are required'
      });
    }

    // Fetch all products with vendor info
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { vendor: true }
    });

    // Group items by vendor
    const vendorGroups = {};
    
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`
        });
      }

      const vendorId = product.vendorId;
      
      if (!vendorGroups[vendorId]) {
        vendorGroups[vendorId] = {
          vendorId,
          vendorName: product.vendor.companyName || `${product.vendor.firstName} ${product.vendor.lastName}`,
          items: []
        };
      }

      // Calculate price for this item
      const totalPrice = calculateRentalPrice(
        product.rentPrice,
        product.rentUnit,
        item.rentalStart,
        item.rentalEnd
      );

      vendorGroups[vendorId].items.push({
        ...item,
        product,
        unitPrice: totalPrice / item.quantity
      });
    }

    // Create orders using Prisma transaction
    const createdOrders = await prisma.$transaction(async (tx) => {
      const orders = [];
      let orderIndex = 0;

      for (const [vendorId, group] of Object.entries(vendorGroups)) {
        // Generate base order reference
        const baseReference = await generateOrderReference(tx);
        
        // If multiple vendors, append suffix (A, B, C, etc.)
        const orderReference = Object.keys(vendorGroups).length > 1
          ? `${baseReference}-${String.fromCharCode(65 + orderIndex)}`
          : baseReference;

        // Calculate total for this vendor's order
        const totalAmount = group.items.reduce((sum, item) => {
          return sum + (item.unitPrice * item.quantity);
        }, 0);

        // Create order with QUOTATION status (customer request)
        const order = await tx.order.create({
          data: {
            orderReference,
            customerId,
            vendorId,
            status: 'QUOTATION',  // Order starts as QUOTATION (customer request)
            totalAmount,
            paymentStatus: 'UNPAID',  // Will be PAID after confirmation
            deliveryMethod: deliveryMethod || 'STANDARD',
            pickupDate,
            returnDate,
            orderItems: {
              create: group.items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                rentalStart: new Date(item.rentalStart),
                rentalEnd: new Date(item.rentalEnd)
              }))
            }
          },
          include: {
            orderItems: {
              include: {
                product: true
              }
            },
            vendor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                companyName: true,
                email: true
              }
            }
          }
        });

        orders.push(order);
        orderIndex++;
      }

      return orders;
    });

    // Send confirmation emails (non-blocking)
    const customer = await prisma.user.findUnique({
      where: { id: customerId }
    });

    for (const order of createdOrders) {
      sendOrderConfirmationEmail(order, customer);
    }

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdOrders.length} order(s)`,
      data: {
        orders: createdOrders,
        vendorCount: Object.keys(vendorGroups).length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
export const getOrders = async (req, res, next) => {
  try {
    const { status, role } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let whereClause = {};

    // Filter based on user role
    if (userRole === 'CUSTOMER') {
      whereClause.customerId = userId;
    } else if (userRole === 'VENDOR') {
      whereClause.vendorId = userId;
    }
    // ADMIN sees all orders

    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
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
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                rentPrice: true,
                rentUnit: true
              }
            }
          }
        },
        invoices: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
export const getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
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
            email: true
          }
        },
        orderItems: {
          include: {
            product: {
              include: {
                attributes: true,
                images: true
              }
            }
          }
        },
        invoices: true
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
        message: 'Not authorized to access this order'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private (Vendor/Admin)
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    if (req.user.role === 'VENDOR' && order.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        vendor: true,
        orderItems: {
          include: { product: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Order status updated',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve quotation (QUOTATION -> APPROVED)
// @route   PATCH /api/orders/:id/approve
// @access  Private (Vendor/Admin)
export const approveOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Authorization check
    if (req.user.role !== 'VENDOR' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { orderItems: { include: { product: true } } }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check authorization - Vendor can only approve their own orders
    if (req.user.role === 'VENDOR' && order.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve this order'
      });
    }

    if (order.status !== 'QUOTATION') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only QUOTATION orders can be approved' 
      });
    }

    // CRITICAL: Do NOT check availability here - just approve
    // Quotations can overlap - availability check happens at CONFIRMATION only

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'APPROVED'
      },
      include: {
        customer: true,
        vendor: true,
        orderItems: { include: { product: true } }
      }
    });

    res.json({
      success: true,
      message: 'Quotation approved successfully. Awaiting customer payment.',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm order with stock reservation (APPROVED/QUOTATION -> CONFIRMED)
// @route   PATCH /api/orders/:id/confirm
// @access  Private (Vendor/Admin)
export const confirmOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: { product: true }
        },
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

    // Check authorization - Vendor can only confirm their own orders
    if (req.user.role === 'VENDOR' && order.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm this order'
      });
    }

    // Can confirm from APPROVED, QUOTATION, or SENT status
    if (!['APPROVED', 'QUOTATION', 'SENT'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm order with status ${order.status}. Order must be in QUOTATION, SENT, or APPROVED status.`
      });
    }

    // =========================================
    // THE GATEKEEPER - Availability Check
    // =========================================
    const availabilityCheck = await checkAvailability(
      order.orderItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        startDate: item.rentalStart || order.pickupDate,
        endDate: item.rentalEnd || order.expectedReturnDate || order.returnDate
      })),
      order.id // Exclude current order from conflict check
    );

    if (!availabilityCheck.available) {
      return res.status(409).json({
        success: false,
        message: 'Stock conflict detected. Cannot confirm order.',
        conflicts: availabilityCheck.conflicts
      });
    }

    // Hard reservation - Stock is now locked
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date()
      },
      include: {
        customer: true,
        vendor: true,
        orderItems: {
          include: { product: true }
        }
      }
    });

    // Send confirmation email to customer
    sendOrderConfirmationEmail(updatedOrder, updatedOrder.customer).catch(err => 
      console.error('Failed to send confirmation email:', err)
    );

    res.json({
      success: true,
      message: 'Order confirmed! Stock has been reserved.',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject quotation
// @route   PATCH /api/orders/:id/reject
// @access  Private (Vendor/Admin)
export const rejectOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    if (req.user.role === 'VENDOR' && order.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this order'
      });
    }

    if (!['QUOTATION', 'APPROVED'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Can only reject QUOTATION or APPROVED orders'
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason || 'Quotation rejected by vendor'
      },
      include: { customer: true }
    });

    res.json({
      success: true,
      message: 'Quotation rejected',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Pickup order
// @route   PATCH /api/orders/:id/pickup
// @access  Private (Vendor/Admin)
export const pickupOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: { product: true }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    if (req.user.role === 'VENDOR' && order.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to process this order'
      });
    }

    // Update order status to PICKEDUP
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Mark all order items as picked up
      await tx.orderItem.updateMany({
        where: { orderId: id },
        data: { isPickedUp: true }
      });

      // Update order status to PICKEDUP
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: 'PICKEDUP',
          pickupDate: new Date()
        },
        include: {
          customer: true,
          vendor: true,
          orderItems: {
            include: { product: true }
          }
        }
      });

      return updated;
    });

    // Send pickup confirmation email to customer
    sendPickupConfirmationEmail(updatedOrder, updatedOrder.customer).catch(err => 
      console.error('Failed to send pickup confirmation email:', err)
    );

    res.json({
      success: true,
      message: 'Order marked as picked up',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Return order with late fee calculation
// @route   PATCH /api/orders/:id/return
// @access  Private (Vendor/Admin)
export const returnOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actualReturnDate = new Date();

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: { product: true }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    if (req.user.role === 'VENDOR' && order.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to process this order'
      });
    }

    // Calculate late fees if applicable
    let lateFeeTotal = 0;
    let status = 'RETURNED';

    if (order.returnDate && actualReturnDate > new Date(order.returnDate)) {
      status = 'LATE';

      // Calculate late fee for each item
      for (const item of order.orderItems) {
        const dailyRate = parseFloat(item.product.rentPrice);
        const lateFee = calculateLateFee(order.returnDate, actualReturnDate, dailyRate);
        lateFeeTotal += lateFee * item.quantity;
      }
    }

    // Update order
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Mark all order items as returned
      await tx.orderItem.updateMany({
        where: { orderId: id },
        data: { isReturned: true }
      });

      // If there's a late fee, add it to the total
      const newTotal = parseFloat(order.totalAmount) + lateFeeTotal;

      const updated = await tx.order.update({
        where: { id },
        data: {
          status,
          totalAmount: newTotal,
          returnDate: actualReturnDate
        },
        include: {
          customer: true,
          vendor: true,
          orderItems: {
            include: { product: true }
          }
        }
      });

      return updated;
    });

    // Send late return alert to vendor if order was returned late
    if (lateFeeTotal > 0 && updatedOrder.vendor) {
      sendLateReturnAlert(updatedOrder, updatedOrder.vendor).catch(err => 
        console.error('Failed to send late return alert:', err)
      );
    }

    res.json({
      success: true,
      message: lateFeeTotal > 0 
        ? `Order returned with late fee of $${lateFeeTotal.toFixed(2)}`
        : 'Order returned successfully',
      data: {
        order: updatedOrder,
        lateFee: lateFeeTotal,
        isLate: lateFeeTotal > 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order
// @route   PATCH /api/orders/:id/cancel
// @access  Private
// @desc    Send order quotation to customer
// @route   PATCH /api/orders/:id/send
// @access  Private (Vendor/Admin)
export const sendOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        vendor: true,
        orderItems: {
          include: { product: true }
        }
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

    if (userRole !== 'ADMIN' && order.vendorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send this order'
      });
    }

    // Allow send from QUOTATION or DRAFT statuses only
    if (!['QUOTATION', 'DRAFT'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot send order from status: ${order.status}. Only QUOTATION or DRAFT orders can be sent.`
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { 
        status: 'SENT',
        sentAt: new Date()
      },
      include: {
        customer: true,
        vendor: true,
        orderItems: {
          include: { product: true }
        }
      }
    });

    // Send quotation email to customer
    sendQuotationEmail(updatedOrder, updatedOrder.customer).catch(err => 
      console.error('Failed to send quotation email:', err)
    );

    res.json({
      success: true,
      message: 'Quotation sent to customer successfully',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm order as sale (SENT -> SALE)
// @route   PATCH /api/orders/:id/confirm-sale
// @access  Private (Vendor/Admin)
export const confirmSale = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        vendor: true,
        orderItems: {
          include: { product: true }
        }
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

    if (userRole !== 'ADMIN' && order.vendorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm this order'
      });
    }

    // Check if order is in SENT status
    if (order.status !== 'SENT') {
      return res.status(400).json({
        success: false,
        message: 'Order must be in SENT status to confirm as sale'
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'SALE' },
      include: {
        customer: true,
        vendor: true,
        orderItems: {
          include: { product: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Order confirmed as sale order successfully',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create invoice for order
// @route   POST /api/orders/:id/create-invoice
// @access  Private (Vendor/Admin)
export const createInvoiceForOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        vendor: true,
        orderItems: {
          include: { product: true }
        },
        invoices: true
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

    if (userRole !== 'ADMIN' && order.vendorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create invoice for this order'
      });
    }

    // Check if order can have invoice created
    if (!['SALE', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order must be in SALE or CONFIRMED status to create invoice'
      });
    }

    // Check if invoice already exists
    if (order.invoices.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice already exists for this order'
      });
    }

    // Generate invoice number
    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `INV${String(invoiceCount + 1).padStart(5, '0')}`;

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId: id,
        status: 'DRAFT',
        amountDue: order.totalAmount,
        amountPaid: 0
      }
    });

    // Update order status to INVOICED
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'INVOICED' },
      include: {
        customer: true,
        vendor: true,
        orderItems: {
          include: { product: true }
        },
        invoices: true
      }
    });

    res.json({
      success: true,
      message: 'Invoice created successfully',
      data: {
        order: updatedOrder,
        invoice
      }
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id }
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
        message: 'Not authorized to cancel this order'
      });
    }

    // Can only cancel if not yet confirmed
    if (['CONFIRMED', 'INVOICED', 'RETURNED'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order in current status'
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        customer: true,
        vendor: true,
        orderItems: {
          include: { product: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Order cancelled',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};
