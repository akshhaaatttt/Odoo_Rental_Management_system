import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateOrderToSale() {
  try {
    // Get the most recent order
    const order = await prisma.order.findFirst({
      where: { status: 'DRAFT' },
      orderBy: { createdAt: 'desc' }
    });

    if (!order) {
      console.log('No DRAFT orders found');
      return;
    }

    console.log(`Found order: ${order.orderReference}`);
    console.log(`Current status: ${order.status}, Payment: ${order.paymentStatus}`);

    // Update to SALE status with PAID payment
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'SALE',
        paymentStatus: 'PAID'
      }
    });

    console.log(`\nUpdated successfully!`);
    console.log(`New status: ${updated.status}, Payment: ${updated.paymentStatus}`);
    console.log(`\nNow the "Confirm Order" button should appear in the Sale Order column.`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateOrderToSale();
