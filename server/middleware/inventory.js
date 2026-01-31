import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Check for rental period overlaps to prevent double-booking
export const checkInventoryAvailability = async (req, res, next) => {
  try {
    const { items } = req.body; // Array of { productId, quantity, rentalStart, rentalEnd }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: items array required'
      });
    }

    const conflicts = [];

    for (const item of items) {
      const { productId, quantity, rentalStart, rentalEnd } = item;

      // Get product
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        conflicts.push({
          productId,
          error: 'Product not found'
        });
        continue;
      }

      // Check for overlapping rentals
      // Logic: Find OrderItems where:
      // - Same productId
      // - NOT returned (isReturned = false)
      // - Order status is not CANCELLED or RETURNED
      // - Rental periods overlap: (rentalStart < reqEnd AND rentalEnd > reqStart)
      const overlappingItems = await prisma.orderItem.findMany({
        where: {
          productId,
          isReturned: false, // Only count items not yet returned
          order: {
            status: {
              notIn: ['CANCELLED', 'RETURNED']
            }
          },
          AND: [
            {
              rentalStart: {
                lt: new Date(rentalEnd)
              }
            },
            {
              rentalEnd: {
                gt: new Date(rentalStart)
              }
            }
          ]
        }
      });

      // Sum up reserved quantities
      const reservedQuantity = overlappingItems.reduce((sum, item) => sum + item.quantity, 0);

      // Check if available
      const availableQuantity = product.quantityOnHand - reservedQuantity;

      if (availableQuantity < quantity) {
        conflicts.push({
          productId,
          productName: product.name,
          requested: quantity,
          available: availableQuantity,
          error: `Only ${availableQuantity} unit(s) available for the selected period`
        });
      }
    }

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Inventory reservation conflict',
        conflicts
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
