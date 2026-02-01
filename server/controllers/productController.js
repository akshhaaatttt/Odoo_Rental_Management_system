import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculate reserved quantity for a product
 * Returns the sum of quantities in CONFIRMED, INVOICED, and PICKEDUP orders
 */
const calculateReservedQuantity = async (productId) => {
  const activeOrders = await prisma.order.findMany({
    where: {
      status: { in: ['CONFIRMED', 'INVOICED', 'PICKEDUP'] },
      orderItems: {
        some: { productId }
      }
    },
    include: {
      orderItems: {
        where: { productId },
        select: { quantity: true }
      }
    }
  });

  return activeOrders.reduce((total, order) => {
    const orderQty = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
    return total + orderQty;
  }, 0);
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res, next) => {
  try {
    const { 
      search, 
      vendorId, 
      type, 
      isPublished,
      minPrice,
      maxPrice,
      page = 1,
      limit = 12
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = {};

    // Search by name or description
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filter by vendor
    if (vendorId) {
      whereClause.vendorId = vendorId;
    }

    // Filter by type
    if (type) {
      whereClause.type = type;
    }

    // Filter by published status
    if (isPublished !== undefined) {
      whereClause.isPublished = isPublished === 'true';
    } else {
      // By default, only show published products to non-vendors
      if (!req.user || req.user.role === 'CUSTOMER') {
        whereClause.isPublished = true;
      }
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      whereClause.rentPrice = {};
      if (minPrice) whereClause.rentPrice.gte = parseFloat(minPrice);
      if (maxPrice) whereClause.rentPrice.lte = parseFloat(maxPrice);
    }

    // Get total count
    const totalCount = await prisma.product.count({ where: whereClause });

    // Get products
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        vendor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true
          }
        },
        attributes: true,
        images: {
          where: { isPrimary: true },
          take: 1
        }
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    // Calculate reserved quantities for each product
    const productsWithAvailability = await Promise.all(
      products.map(async (product) => {
        const reservedQty = await calculateReservedQuantity(product.id);
        return {
          ...product,
          quantityReserved: reservedQty,
          quantityAvailable: Math.max(0, product.quantityOnHand - reservedQty)
        };
      })
    );

    res.json({
      success: true,
      count: productsWithAvailability.length,
      total: totalCount,
      page: parseInt(page),
      pages: Math.ceil(totalCount / parseInt(limit)),
      data: productsWithAvailability
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
export const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true
          }
        },
        attributes: true,
        images: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private (Vendor/Admin)
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      type,
      description,
      quantityOnHand,
      rentPrice,
      rentUnit,
      costPrice,
      isPublished,
      attributes,
      images
    } = req.body;

    // Validation
    if (!name || !description || !rentPrice || !costPrice) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Determine vendor ID
    let vendorId = req.user.id;
    
    // If admin is creating, they can specify vendorId
    if (req.user.role === 'ADMIN' && req.body.vendorId) {
      vendorId = req.body.vendorId;
    }

    // Only admin can publish directly
    const publishStatus = req.user.role === 'ADMIN' 
      ? (isPublished !== undefined ? isPublished : false)
      : false;

    // Create product
    const product = await prisma.product.create({
      data: {
        vendorId,
        name,
        type: type || 'GOODS',
        description,
        quantityOnHand: parseInt(quantityOnHand) || 0,
        rentPrice: parseFloat(rentPrice),
        rentUnit: rentUnit || 'DAY',
        costPrice: parseFloat(costPrice),
        isPublished: publishStatus,
        attributes: attributes ? {
          create: attributes.map(attr => ({
            name: attr.name,
            value: attr.value,
            extraPrice: parseFloat(attr.extraPrice) || 0
          }))
        } : undefined,
        images: images ? {
          create: images.map((img, index) => ({
            url: img.url,
            isPrimary: img.isPrimary || index === 0
          }))
        } : undefined
      },
      include: {
        vendor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true
          }
        },
        attributes: true,
        images: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Vendor/Admin)
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      description,
      quantityOnHand,
      rentPrice,
      rentUnit,
      costPrice,
      isPublished,
      attributes,
      images
    } = req.body;

    // Get existing product
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check authorization
    if (req.user.role === 'VENDOR' && existingProduct.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (description) updateData.description = description;
    if (quantityOnHand !== undefined) updateData.quantityOnHand = parseInt(quantityOnHand);
    if (rentPrice) updateData.rentPrice = parseFloat(rentPrice);
    if (rentUnit) updateData.rentUnit = rentUnit;
    if (costPrice) updateData.costPrice = parseFloat(costPrice);
    
    // Only admin can change published status
    if (req.user.role === 'ADMIN' && isPublished !== undefined) {
      updateData.isPublished = isPublished;
    }

    // Handle attributes update
    if (attributes) {
      // Delete existing attributes
      await prisma.productAttribute.deleteMany({
        where: { productId: id }
      });
      // Create new attributes
      updateData.attributes = {
        create: attributes.map(attr => ({
          name: attr.name,
          value: attr.value,
          extraPrice: parseFloat(attr.extraPrice) || 0
        }))
      };
    }

    // Handle images update
    if (images) {
      // Delete existing images
      await prisma.productImage.deleteMany({
        where: { productId: id }
      });
      // Create new images
      updateData.images = {
        create: images.map((img, index) => ({
          url: img.url,
          isPrimary: img.isPrimary || index === 0
        }))
      };
    }

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        vendor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true
          }
        },
        attributes: true,
        images: true
      }
    });

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Vendor/Admin)
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check authorization
    if (req.user.role === 'VENDOR' && product.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    // Check if product has active orders
    const activeOrders = await prisma.orderItem.count({
      where: {
        productId: id,
        order: {
          status: {
            notIn: ['CANCELLED', 'RETURNED']
          }
        }
      }
    });

    if (activeOrders > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product with active orders'
      });
    }

    await prisma.product.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add product attribute
// @route   POST /api/products/:id/attributes
// @access  Private (Vendor/Admin)
export const addProductAttribute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, value, extraPrice } = req.body;

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check authorization
    if (req.user.role === 'VENDOR' && product.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this product'
      });
    }

    const attribute = await prisma.productAttribute.create({
      data: {
        productId: id,
        name,
        value,
        extraPrice: parseFloat(extraPrice) || 0
      }
    });

    res.status(201).json({
      success: true,
      message: 'Attribute added successfully',
      data: attribute
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check product availability
// @route   POST /api/products/:id/check-availability
// @access  Public
export const checkAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rentalStart, rentalEnd, quantity } = req.body;

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find overlapping rentals
    const overlappingItems = await prisma.orderItem.findMany({
      where: {
        productId: id,
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

    const reservedQuantity = overlappingItems.reduce((sum, item) => sum + item.quantity, 0);
    const availableQuantity = product.quantityOnHand - reservedQuantity;

    res.json({
      success: true,
      data: {
        available: availableQuantity >= quantity,
        quantityAvailable: availableQuantity,
        quantityRequested: quantity,
        quantityOnHand: product.quantityOnHand
      }
    });
  } catch (error) {
    next(error);
  }
};
