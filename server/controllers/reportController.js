import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// @desc    Get revenue analytics
// @route   GET /api/reports/revenue
// @access  Private (Vendor/Admin)
export const getRevenueAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let whereClause = {
      status: {
        notIn: ['QUOTATION', 'CANCELLED']
      }
    };

    // Filter by vendor if not admin
    if (userRole === 'VENDOR') {
      whereClause.vendorId = userId;
    }

    // Filter by date range
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    // Get orders
    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        orderReference: true,
        totalAmount: true,
        paymentStatus: true,
        status: true,
        createdAt: true,
        vendor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by period
    const revenueByPeriod = {};
    
    orders.forEach(order => {
      let periodKey;
      const date = new Date(order.createdAt);

      if (groupBy === 'month') {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        const weekNum = Math.ceil(date.getDate() / 7);
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-W${weekNum}`;
      } else if (groupBy === 'day') {
        periodKey = date.toISOString().split('T')[0];
      } else {
        periodKey = date.getFullYear().toString();
      }

      if (!revenueByPeriod[periodKey]) {
        revenueByPeriod[periodKey] = {
          period: periodKey,
          totalRevenue: 0,
          orderCount: 0,
          paidRevenue: 0,
          unpaidRevenue: 0
        };
      }

      const amount = parseFloat(order.totalAmount);
      revenueByPeriod[periodKey].totalRevenue += amount;
      revenueByPeriod[periodKey].orderCount += 1;

      if (order.paymentStatus === 'PAID') {
        revenueByPeriod[periodKey].paidRevenue += amount;
      } else {
        revenueByPeriod[periodKey].unpaidRevenue += amount;
      }
    });

    // Convert to array and sort
    const data = Object.values(revenueByPeriod).sort((a, b) => 
      a.period.localeCompare(b.period)
    );

    // Calculate totals
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
    const paidRevenue = orders
      .filter(o => o.paymentStatus === 'PAID')
      .reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders: orders.length,
          totalRevenue,
          paidRevenue,
          unpaidRevenue: totalRevenue - paidRevenue
        },
        data: data
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product performance
// @route   GET /api/reports/products
// @access  Private (Vendor/Admin)
export const getProductPerformance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let whereClause = {};

    // Filter by vendor if not admin
    if (userRole === 'VENDOR') {
      whereClause.vendorId = userId;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        orderItems: {
          where: {
            order: {
              status: {
                in: ['CONFIRMED', 'INVOICED', 'RETURNED', 'LATE']
              }
            }
          },
          include: {
            order: true
          }
        }
      }
    });

    const productStats = products.map(product => {
      const totalRentals = product.orderItems.length;
      const totalRevenue = product.orderItems.reduce((sum, item) => {
        return sum + (parseFloat(item.unitPrice) * item.quantity);
      }, 0);

      return {
        id: product.id,
        name: product.name,
        totalRentals,
        totalRevenue,
        averageRevenuePerRental: totalRentals > 0 ? totalRevenue / totalRentals : 0,
        quantityOnHand: product.quantityOnHand,
        utilizationRate: product.quantityOnHand > 0 
          ? (totalRentals / product.quantityOnHand) * 100 
          : 0
      };
    });

    // Sort by total revenue
    productStats.sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.json({
      success: true,
      data: productStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order statistics
// @route   GET /api/reports/orders
// @access  Private (Vendor/Admin)
export const getOrderStatistics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let whereClause = {};

    // Filter by vendor if not admin
    if (userRole === 'VENDOR') {
      whereClause.vendorId = userId;
    }

    // Get all orders
    const orders = await prisma.order.findMany({
      where: whereClause
    });

    // Group by status
    const statusCounts = {};
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    // Payment status breakdown
    const paymentCounts = {};
    orders.forEach(order => {
      paymentCounts[order.paymentStatus] = (paymentCounts[order.paymentStatus] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalOrders: orders.length,
        byStatus: statusCounts,
        byPaymentStatus: paymentCounts
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard summary
// @route   GET /api/reports/dashboard
// @access  Private (Vendor/Admin)
export const getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let orderWhere = {};
    let productWhere = {};

    if (userRole === 'VENDOR') {
      orderWhere.vendorId = userId;
      productWhere.vendorId = userId;
    }

    // Get date ranges
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get counts and revenue
    const [
      totalOrders,
      activeOrders,
      totalProducts,
      totalRevenue,
      monthlyRevenue,
      lastMonthRevenue
    ] = await Promise.all([
      prisma.order.count({ where: orderWhere }),
      prisma.order.count({
        where: {
          ...orderWhere,
          status: {
            in: ['CONFIRMED', 'INVOICED']
          }
        }
      }),
      prisma.product.count({ where: productWhere }),
      prisma.order.aggregate({
        where: {
          ...orderWhere,
          status: {
            in: ['CONFIRMED', 'INVOICED', 'RETURNED', 'LATE']
          }
        },
        _sum: {
          totalAmount: true
        }
      }),
      prisma.order.aggregate({
        where: {
          ...orderWhere,
          status: {
            in: ['CONFIRMED', 'INVOICED', 'RETURNED', 'LATE']
          },
          createdAt: {
            gte: firstDayThisMonth
          }
        },
        _sum: {
          totalAmount: true
        }
      }),
      prisma.order.aggregate({
        where: {
          ...orderWhere,
          status: {
            in: ['CONFIRMED', 'INVOICED', 'RETURNED', 'LATE']
          },
          createdAt: {
            gte: firstDayLastMonth,
            lt: firstDayThisMonth
          }
        },
        _sum: {
          totalAmount: true
        }
      })
    ]);

    const totalRev = parseFloat(totalRevenue._sum.totalAmount || 0);
    const monthlyRev = parseFloat(monthlyRevenue._sum.totalAmount || 0);
    const lastMonthRev = parseFloat(lastMonthRevenue._sum.totalAmount || 0);
    
    // Calculate growth percentage
    const growth = lastMonthRev > 0 
      ? ((monthlyRev - lastMonthRev) / lastMonthRev * 100).toFixed(1)
      : 0;

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      where: orderWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        totalOrders,
        activeOrders,
        totalProducts,
        totalRevenue: totalRev,
        monthlyRevenue: monthlyRev,
        lastMonthRevenue: lastMonthRev,
        growth: parseFloat(growth),
        recentOrders
      }
    });
  } catch (error) {
    next(error);
  }
};
