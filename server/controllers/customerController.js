import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Get all customers for a specific vendor
 * A customer is a user who has placed at least one order with the vendor
 */
export const getVendorCustomers = async (req, res) => {
  try {
    const vendorId = req.user.id;

    // Get distinct customers who have ordered from this vendor
    const orders = await prisma.order.findMany({
      where: {
        vendorId: vendorId,
      },
      select: {
        customerId: true,
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
      distinct: ['customerId'],
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform to customer list with aggregated stats
    const customerIds = orders.map(o => o.customerId);
    
    // Get order stats for each customer
    const customerStats = await Promise.all(
      customerIds.map(async (customerId) => {
        const [totalOrders, totalRevenue] = await Promise.all([
          prisma.order.count({
            where: {
              customerId,
              vendorId,
              status: { notIn: ['QUOTATION', 'CANCELLED'] },
            },
          }),
          prisma.order.aggregate({
            where: {
              customerId,
              vendorId,
              status: { notIn: ['QUOTATION', 'CANCELLED'] },
            },
            _sum: {
              totalAmount: true,
            },
          }),
        ]);

        const customer = orders.find(o => o.customerId === customerId).customer;

        return {
          id: customer.id,
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phoneNumber || 'N/A',
          avatar: customer.avatarUrl,
          vendorId: vendorId,
          totalOrders,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          joinedDate: customer.createdAt,
        };
      })
    );

    res.json(customerStats);
  } catch (error) {
    console.error('Error fetching vendor customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

/**
 * Get detailed information about a specific customer
 */
export const getCustomerDetail = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { customerId } = req.params;

    // Verify this customer has ordered from this vendor
    const hasOrders = await prisma.order.findFirst({
      where: {
        customerId,
        vendorId,
      },
    });

    if (!hasOrders) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get customer details
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        avatarUrl: true,
        address: true,
        createdAt: true,
      },
    });

    // Get order history
    const orders = await prisma.order.findMany({
      where: {
        customerId,
        vendorId,
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate stats
    const stats = {
      totalOrders: orders.length,
      completedOrders: orders.filter(o => o.status === 'RETURNED').length,
      activeOrders: orders.filter(o => 
        ['CONFIRMED', 'INVOICED', 'SALE'].includes(o.status)
      ).length,
      totalRevenue: orders
        .filter(o => o.status !== 'CANCELLED' && o.status !== 'QUOTATION')
        .reduce((sum, o) => sum + parseFloat(o.totalAmount), 0),
    };

    res.json({
      ...customer,
      name: `${customer.firstName} ${customer.lastName}`,
      stats,
      orders,
    });
  } catch (error) {
    console.error('Error fetching customer detail:', error);
    res.status(500).json({ error: 'Failed to fetch customer details' });
  }
};
