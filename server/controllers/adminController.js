import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// @desc    Get admin dashboard metrics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
export const getDashboardMetrics = async (req, res, next) => {
  try {
    // Total Revenue
    const orders = await prisma.order.findMany({
      where: {
        status: { notIn: ['CANCELLED'] }
      },
      select: {
        totalAmount: true,
        status: true,
        returnDate: true,
        createdAt: true
      }
    });

    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

    // Active Rentals
    const activeRentals = await prisma.order.count({
      where: {
        status: { in: ['CONFIRMED', 'INVOICED'] },
        returnDate: { gt: new Date() }
      }
    });

    // Late Orders
    const lateOrders = await prisma.order.count({
      where: {
        status: 'LATE'
      }
    });

    // Top Vendors
    const topVendors = await prisma.order.groupBy({
      by: ['vendorId'],
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 5
    });

    const vendorDetails = await Promise.all(
      topVendors.map(async (v) => {
        const vendor = await prisma.user.findUnique({
          where: { id: v.vendorId },
          select: { id: true, firstName: true, lastName: true, companyName: true }
        });
        return {
          ...vendor,
          totalRevenue: v._sum.totalAmount,
          orderCount: v._count.id
        };
      })
    );

    // Most Rented Products
    const mostRentedProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    const productDetails = await Promise.all(
      mostRentedProducts.map(async (p) => {
        const product = await prisma.product.findUnique({
          where: { id: p.productId },
          select: { id: true, name: true, rentPrice: true, rentUnit: true }
        });
        return {
          ...product,
          totalQuantity: p._sum.quantity,
          rentalCount: p._count.id
        };
      })
    );

    // Revenue Trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrders = orders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo);
    const recentRevenue = recentOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

    res.json({
      success: true,
      data: {
        metrics: {
          totalRevenue,
          activeRentals,
          lateOrders,
          recentRevenue
        },
        topVendors: vendorDetails,
        mostRentedProducts: productDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all vendors
// @route   GET /api/admin/vendors
// @access  Private/Admin
export const getAllVendors = async (req, res, next) => {
  try {
    const vendors = await prisma.user.findMany({
      where: { role: 'VENDOR' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        gstin: true,
        vendorCategory: true,
        isVerified: true,
        phoneNumber: true,
        createdAt: true,
        _count: {
          select: {
            productsAsVendor: true,
            ordersAsVendor: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate revenue for each vendor
    const vendorsWithRevenue = await Promise.all(
      vendors.map(async (vendor) => {
        const orders = await prisma.order.findMany({
          where: {
            vendorId: vendor.id,
            status: { notIn: ['CANCELLED'] }
          },
          select: { totalAmount: true }
        });

        const revenue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

        return {
          ...vendor,
          totalRevenue: revenue,
          productCount: vendor._count.productsAsVendor,
          orderCount: vendor._count.ordersAsVendor
        };
      })
    );

    res.json({
      success: true,
      count: vendorsWithRevenue.length,
      data: vendorsWithRevenue
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/Reject vendor
// @route   PATCH /api/admin/vendors/:id/verify
// @access  Private/Admin
export const verifyVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isVerified must be a boolean value'
      });
    }

    const vendor = await prisma.user.findUnique({
      where: { id }
    });

    if (!vendor || vendor.role !== 'VENDOR') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const updatedVendor = await prisma.user.update({
      where: { id },
      data: { isVerified },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        isVerified: true
      }
    });

    res.json({
      success: true,
      message: `Vendor ${isVerified ? 'approved' : 'rejected'} successfully`,
      data: updatedVendor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all products (admin view)
// @route   GET /api/admin/products
// @access  Private/Admin
export const getAllProducts = async (req, res, next) => {
  try {
    const { vendorId, isPublished } = req.query;

    const where = {};
    if (vendorId) where.vendorId = vendorId;
    if (isPublished !== undefined) where.isPublished = isPublished === 'true';

    const products = await prisma.product.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true
          }
        },
        images: true,
        _count: {
          select: { orderItems: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish/Unpublish product
// @route   PATCH /api/admin/products/:id/publish
// @access  Private/Admin
export const publishProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    if (typeof isPublished !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isPublished must be a boolean value'
      });
    }

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { isPublished },
      include: {
        vendor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: `Product ${isPublished ? 'published' : 'unpublished'} successfully`,
      data: updatedProduct
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (admin view)
// @route   GET /api/admin/orders
// @access  Private/Admin
export const getAllOrders = async (req, res, next) => {
  try {
    const { status, vendorId, startDate, endDate } = req.query;

    const where = {};
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true
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
        }
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

// @desc    Export orders to CSV
// @route   GET /api/admin/orders/export
// @access  Private/Admin
export const exportOrders = async (req, res, next) => {
  try {
    const { status, vendorId, startDate, endDate } = req.query;

    const where = {};
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        vendor: true,
        orderItems: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Generate CSV
    let csv = 'Order Reference,Customer,Vendor,Status,Total Amount,Payment Status,Created At\n';
    
    orders.forEach(order => {
      csv += `${order.orderReference},`;
      csv += `${order.customer.firstName} ${order.customer.lastName},`;
      csv += `${order.vendor.companyName || order.vendor.firstName},`;
      csv += `${order.status},`;
      csv += `${order.totalAmount},`;
      csv += `${order.paymentStatus},`;
      csv += `${order.createdAt.toISOString()}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Get returns overview (pickups and returns)
// @route   GET /api/admin/returns
// @access  Private/Admin
export const getReturnsOverview = async (req, res, next) => {
  try {
    // Get all orders with pickup/return information
    const orders = await prisma.order.findMany({
      where: {
        status: { notIn: ['QUOTATION', 'CANCELLED'] }
      },
      include: {
        customer: true,
        vendor: true,
        orderItems: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Separate pickups and returns
    const pickups = orders
      .filter(order => order.pickupDate)
      .map(order => ({
        id: order.id,
        orderRef: order.orderReference,
        pickupDate: order.pickupDate,
        customer: order.customer,
        vendor: order.vendor
      }));

    const returns = orders
      .filter(order => order.status !== 'QUOTATION')
      .map(order => {
        const isReturned = order.returnDate !== null;
        const isLate = isReturned && order.returnDate > order.rentalEnd;
        const lateFee = order.lateFee || 0;

        return {
          id: order.id,
          orderRef: order.orderReference,
          rentalEnd: order.rentalEnd,
          returnDate: order.returnDate,
          isReturned,
          isLate,
          lateFee,
          customer: order.customer,
          vendor: order.vendor
        };
      });

    res.json({
      success: true,
      data: {
        pickups,
        returns
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get admin reports
// @route   GET /api/admin/reports
// @access  Private/Admin
export const getReports = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Revenue data - include all non-cancelled orders
    const orders = await prisma.order.findMany({
      where: {
        status: { notIn: ['QUOTATION', 'CANCELLED'] },
        ...(startDate || endDate ? { createdAt: dateFilter } : {})
      },
      include: {
        vendor: true,
        orderItems: {
          include: { product: true }
        }
      }
    });

    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);

    // Revenue by vendor
    const revenueByVendor = {};
    orders.forEach(order => {
      const vendorId = order.vendorId;
      const vendorName = order.vendor.companyName || order.vendor.firstName;
      
      if (!revenueByVendor[vendorId]) {
        revenueByVendor[vendorId] = { name: vendorName, revenue: 0 };
      }
      revenueByVendor[vendorId].revenue += parseFloat(order.totalAmount);
    });

    // Most rented products
    const productBookings = {};
    orders.forEach(order => {
      order.orderItems.forEach(item => {
        const productId = item.productId;
        const productName = item.product.name;
        
        if (!productBookings[productId]) {
          productBookings[productId] = { name: productName, bookings: 0 };
        }
        productBookings[productId].bookings += 1;
      });
    });

    const mostRented = Object.values(productBookings)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10);

    // Orders by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
      where: startDate || endDate ? { createdAt: dateFilter } : {}
    });

    // Late returns
    const lateReturns = orders
      .filter(o => o.status === 'LATE' && o.lateFee > 0)
      .map(o => ({
        orderRef: o.orderReference,
        vendor: o.vendor.companyName || o.vendor.firstName,
        lateFee: parseFloat(o.lateFee)
      }));

    // Vendor count
    const totalVendors = await prisma.user.count({
      where: { role: 'VENDOR', isVerified: true }
    });

    // Product count
    const totalProducts = await prisma.product.count({
      where: { isPublished: true }
    });

    res.json({
      success: true,
      data: {
        revenue: {
          total: totalRevenue,
          byVendor: Object.values(revenueByVendor),
          byPeriod: []
        },
        products: {
          mostRented,
          totalProducts
        },
        vendors: {
          topPerformers: Object.values(revenueByVendor).slice(0, 5),
          totalVendors
        },
        orders: {
          total: orders.length,
          byStatus: ordersByStatus.map(s => ({ status: s.status, count: s._count.id })),
          lateReturns
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export report
// @route   GET /api/admin/reports/export
// @access  Private/Admin
export const exportReport = async (req, res, next) => {
  try {
    const { type, format, startDate, endDate } = req.query;

    // This would be implemented based on specific export requirements
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${Date.now()}.csv`);
    res.send('Report data exported');
  } catch (error) {
    next(error);
  }
};

// @desc    Get admin settings
// @route   GET /api/admin/settings
// @access  Private/Admin
export const getSettings = async (req, res, next) => {
  try {
    // In a real application, settings would be stored in the database
    const settings = {
      companyName: 'Rental System Pro',
      companyEmail: 'admin@rentalsystem.com',
      companyPhone: '+91 1234567890',
      companyAddress: 'Business Address',
      gstin: 'GSTIN123456',
      rentalPeriods: {
        hourly: true,
        daily: true,
        weekly: true,
        monthly: true,
        custom: false
      },
      lateFeePercentage: 10,
      securityDepositPercentage: 20,
      gstRate: 18,
      defaultRentUnit: 'DAY',
      enableProductAttributes: true,
      enableProductVariants: false,
      requireVendorApproval: true,
      requireProductApproval: true,
      allowCustomerReviews: true,
      autoGenerateInvoices: true
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update admin settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
export const updateSettings = async (req, res, next) => {
  try {
    // In a real application, settings would be stored in the database
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: req.body
    });
  } catch (error) {
    next(error);
  }
};

