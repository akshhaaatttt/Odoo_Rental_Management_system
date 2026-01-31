import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * The Availability Brain - Gatekeeper for Stock Reservation
 * 
 * This function checks if products are available for the requested rental period
 * CRITICAL: Only call this during CONFIRMATION, never during quotation creation
 * 
 * @param {Array} orderItems - Array of {productId, quantity, startDate, endDate}
 * @param {String} excludeOrderId - Optional order ID to exclude from conflict check (for updates)
 * @returns {Object} {available: boolean, conflicts: Array}
 */
export const checkAvailability = async (orderItems, excludeOrderId = null) => {
  const conflicts = [];

  for (const item of orderItems) {
    const { productId, quantity, startDate, endDate } = item;

    // Step 1: Fetch total physical inventory
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { 
        id: true,
        name: true,
        quantityOnHand: true 
      }
    });

    if (!product) {
      conflicts.push({
        productId,
        productName: 'Unknown Product',
        reason: 'Product not found',
        requestedQty: quantity,
        availableQty: 0
      });
      continue;
    }

    const totalStock = product.quantityOnHand;

    // Step 2: Calculate overlapping commitments
    // Find all CONFIRMED, PICKEDUP orders that overlap with requested dates
    const overlappingOrders = await prisma.order.findMany({
      where: {
        AND: [
          // Only count orders that have stock reserved
          { status: { in: ['CONFIRMED', 'PICKEDUP', 'INVOICED'] } },
          // Exclude current order if updating
          excludeOrderId ? { id: { not: excludeOrderId } } : {},
          {
            orderItems: {
              some: {
                productId: productId,
                // Date overlap logic using OrderItem dates: (start1 <= end2) AND (end1 >= start2)
                AND: [
                  {
                    rentalStart: { lte: new Date(endDate) }
                  },
                  {
                    rentalEnd: { gte: new Date(startDate) }
                  }
                ]
              }
            }
          }
        ]
      },
      include: {
        orderItems: {
          where: { productId: productId },
          select: { quantity: true }
        }
      }
    });

    // Step 3: Sum up committed quantities
    const overlappingCommitments = overlappingOrders.reduce((sum, order) => {
      const orderQty = order.orderItems.reduce((itemSum, item) => itemSum + item.quantity, 0);
      return sum + orderQty;
    }, 0);

    // Step 4: The Formula - Available Stock = Total Inventory - Overlapping Commitments
    const availableStock = totalStock - overlappingCommitments;

    // Step 5: Decision - Block if insufficient
    if (availableStock < quantity) {
      conflicts.push({
        productId,
        productName: product.name,
        reason: 'Insufficient stock for requested dates',
        requestedQty: quantity,
        availableQty: Math.max(0, availableStock),
        totalStock,
        committedQty: overlappingCommitments,
        dateRange: { startDate, endDate }
      });
    }
  }

  return {
    available: conflicts.length === 0,
    conflicts
  };
};

/**
 * Get real-time availability status for customer view
 * This is NON-BINDING - just for visual indicators (Green/Red)
 * 
 * @param {Number} productId
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {Number} quantity
 * @returns {Object} {available: boolean, availableQty: number}
 */
export const checkProductAvailability = async (productId, startDate, endDate, quantity = 1) => {
  const result = await checkAvailability([{ productId, quantity, startDate, endDate }]);
  
  if (result.available) {
    return { available: true, availableQty: quantity };
  }

  const conflict = result.conflicts[0];
  return {
    available: false,
    availableQty: conflict.availableQty,
    reason: conflict.reason
  };
};

/**
 * Batch check availability for multiple products
 * Used in cart/quote validation
 */
export const batchCheckAvailability = async (items) => {
  return await checkAvailability(items);
};

/**
 * Reserve stock after successful confirmation
 * This updates the order status and creates the hard reservation
 * 
 * @param {String} orderId
 * @returns {Object} Updated order
 */
export const reserveStock = async (orderId) => {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'CONFIRMED',
      confirmedAt: new Date()
    },
    include: {
      orderItems: {
        include: { product: true }
      },
      customer: true,
      vendor: true
    }
  });

  return order;
};

/**
 * Release stock when order is cancelled or returned
 * 
 * @param {String} orderId
 */
export const releaseStock = async (orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true }
  });

  if (!order) return;

  // Just update status - no need to manually adjust stock
  // The availability check algorithm will automatically exclude this order
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: order.status === 'CANCELLED' ? 'CANCELLED' : 'RETURNED'
    }
  });
};
