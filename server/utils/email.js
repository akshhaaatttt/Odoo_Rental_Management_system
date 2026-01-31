import nodemailer from 'nodemailer';

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send welcome email
export const sendWelcomeEmail = async (user) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Welcome to Rental System Pro!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed;">Welcome to Rental System Pro!</h1>
          <p>Dear ${user.firstName} ${user.lastName},</p>
          <p>Thank you for joining our platform!</p>
          ${user.role === 'VENDOR' ? `
            <p><strong>Your Vendor Account Details:</strong></p>
            <ul>
              <li>Company: ${user.companyName}</li>
              <li>GSTIN: ${user.gstin}</li>
              <li>Category: ${user.vendorCategory}</li>
            </ul>
            <p style="color: #f59e0b;">⚠️ Your account is pending verification. You'll receive a notification once approved.</p>
          ` : ''}
          <p>Start exploring our marketplace and discover amazing rental opportunities!</p>
          <br>
          <p>Best regards,<br>The Rental System Pro Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent to:', user.email);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw - email failure shouldn't block signup
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed;">Password Reset Request</h1>
          <p>You requested to reset your password.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <br>
          <p>Best regards,<br>The Rental System Pro Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent to:', email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

// Send order confirmation email
export const sendOrderConfirmationEmail = async (order, user) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: `Order Confirmation - ${order.orderReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed;">Order Confirmed!</h1>
          <p>Dear ${user.firstName},</p>
          <p>Your order <strong>${order.orderReference}</strong> has been confirmed.</p>
          <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
          <p><strong>Status:</strong> ${order.status}</p>
          <p>You can proceed with pickup as scheduled.</p>
          <br>
          <p>Best regards,<br>The Rental System Pro Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent to:', user.email);
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
  }
};

// Send quotation email to customer
export const sendQuotationEmail = async (order, customer) => {
  try {
    const transporter = createTransporter();

    const itemsHtml = order.orderItems.map(item => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.product?.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${item.unitPrice}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${item.quantity * item.unitPrice}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: customer.email,
      subject: `Rental Quotation - ${order.orderReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed;">Rental Quotation</h1>
          <p>Dear ${customer.firstName} ${customer.lastName},</p>
          <p>Thank you for your interest! Please find your rental quotation below:</p>
          
          <h3>Order: ${order.orderReference}</h3>
          <p><strong>Vendor:</strong> ${order.vendor?.companyName || order.vendor?.firstName}</p>
          <p><strong>Rental Period:</strong> ${new Date(order.pickupDate).toLocaleDateString()} - ${new Date(order.expectedReturnDate).toLocaleDateString()}</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Product</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Quantity</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Unit Price</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div style="text-align: right; margin: 20px 0;">
            <p style="font-size: 18px; font-weight: bold;">Total Amount: ₹${order.totalAmount}</p>
          </div>
          
          <p>Please review and respond to this quotation at your earliest convenience.</p>
          <br>
          <p>Best regards,<br>${order.vendor?.companyName || order.vendor?.firstName}</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Quotation email sent to:', customer.email);
  } catch (error) {
    console.error('Error sending quotation email:', error);
  }
};

// Send pickup reminder email
export const sendPickupReminderEmail = async (order, customer) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: customer.email,
      subject: `Pickup Reminder - ${order.orderReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed;">⏰ Pickup Reminder</h1>
          <p>Dear ${customer.firstName} ${customer.lastName},</p>
          <p>This is a friendly reminder that your rental order <strong>${order.orderReference}</strong> is ready for pickup!</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Pickup Date:</strong> ${new Date(order.pickupDate).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Expected Return:</strong> ${new Date(order.expectedReturnDate).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Vendor:</strong> ${order.vendor?.companyName || order.vendor?.firstName}</p>
            <p style="margin: 5px 0;"><strong>Contact:</strong> ${order.vendor?.phoneNumber || order.vendor?.email}</p>
          </div>
          
          <p>Please ensure you pick up your items on the scheduled date.</p>
          <br>
          <p>Best regards,<br>The Rental System Pro Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Pickup reminder email sent to:', customer.email);
  } catch (error) {
    console.error('Error sending pickup reminder email:', error);
  }
};

// Send return reminder email
export const sendReturnReminderEmail = async (order, customer) => {
  try {
    const transporter = createTransporter();
    const daysLeft = Math.ceil((new Date(order.expectedReturnDate) - new Date()) / (1000 * 60 * 60 * 24));

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: customer.email,
      subject: `Return Reminder - ${order.orderReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed;">⏰ Return Reminder</h1>
          <p>Dear ${customer.firstName} ${customer.lastName},</p>
          <p>Your rental order <strong>${order.orderReference}</strong> is due for return in <strong>${daysLeft} day(s)</strong>!</p>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 5px 0;"><strong>⚠️ Return Date:</strong> ${new Date(order.expectedReturnDate).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Vendor:</strong> ${order.vendor?.companyName || order.vendor?.firstName}</p>
            <p style="margin: 5px 0;"><strong>Contact:</strong> ${order.vendor?.phoneNumber || order.vendor?.email}</p>
          </div>
          
          <p style="color: #dc2626;"><strong>Important:</strong> Late returns may incur additional fees. Please return your items on or before the due date.</p>
          
          <p>Thank you for using our rental service!</p>
          <br>
          <p>Best regards,<br>The Rental System Pro Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Return reminder email sent to:', customer.email);
  } catch (error) {
    console.error('Error sending return reminder email:', error);
  }
};

// Send late return alert to vendor
export const sendLateReturnAlert = async (order, vendor) => {
  try {
    const transporter = createTransporter();
    const daysLate = Math.ceil((new Date() - new Date(order.expectedReturnDate)) / (1000 * 60 * 60 * 24));

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: vendor.email,
      subject: `⚠️ Late Return Alert - ${order.orderReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">⚠️ Late Return Alert</h1>
          <p>Dear ${vendor.firstName || vendor.companyName},</p>
          <p>Order <strong>${order.orderReference}</strong> is <strong>${daysLate} day(s)</strong> overdue!</p>
          
          <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p style="margin: 5px 0;"><strong>Customer:</strong> ${order.customer?.firstName} ${order.customer?.lastName}</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${order.customer?.phoneNumber}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${order.customer?.email}</p>
            <p style="margin: 5px 0;"><strong>Expected Return:</strong> ${new Date(order.expectedReturnDate).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Days Overdue:</strong> ${daysLate}</p>
          </div>
          
          <p>Please contact the customer immediately to arrange for the return of items.</p>
          <p>Late fees will be automatically calculated when the items are returned.</p>
          <br>
          <p>Best regards,<br>The Rental System Pro Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Late return alert sent to vendor:', vendor.email);
  } catch (error) {
    console.error('Error sending late return alert:', error);
  }
};

// Send order pickup confirmation
export const sendPickupConfirmationEmail = async (order, customer) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: customer.email,
      subject: `Pickup Confirmed - ${order.orderReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">✅ Pickup Confirmed!</h1>
          <p>Dear ${customer.firstName} ${customer.lastName},</p>
          <p>Your rental items for order <strong>${order.orderReference}</strong> have been picked up successfully!</p>
          
          <div style="background-color: #d1fae5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Pickup Date:</strong> ${new Date(order.pickupDate).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Return By:</strong> ${new Date(order.expectedReturnDate).toLocaleDateString()}</p>
          </div>
          
          <p><strong>Important Reminders:</strong></p>
          <ul>
            <li>Please take good care of the rented items</li>
            <li>Return items in the same condition</li>
            <li>Ensure timely return to avoid late fees</li>
          </ul>
          
          <p>We'll send you a reminder before your return date.</p>
          <br>
          <p>Best regards,<br>The Rental System Pro Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Pickup confirmation email sent to:', customer.email);
  } catch (error) {
    console.error('Error sending pickup confirmation email:', error);
  }
};

// Send invoice with payment link
export const sendInvoiceEmail = async (invoice, customer, paymentLink) => {
  try {
    const transporter = createTransporter();

    // Calculate item details
    const itemsList = invoice.order.orderItems.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.product.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${parseFloat(item.unitPrice).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${(item.quantity * parseFloat(item.unitPrice)).toFixed(2)}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: customer.email,
      subject: `Invoice ${invoice.invoiceNumber} - ${invoice.order.orderReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #7c3aed; margin-bottom: 10px;">Invoice Generated</h1>
            <p style="color: #6b7280; margin-bottom: 30px;">Order Reference: <strong>${invoice.order.orderReference}</strong></p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <h2 style="color: #374151; font-size: 18px; margin-bottom: 15px;">Invoice Details</h2>
              <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Customer:</strong> ${customer.firstName} ${customer.lastName}</p>
              <p style="margin: 5px 0;"><strong>Vendor:</strong> ${invoice.order.vendor?.companyName || 'N/A'}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #d1d5db;">Item</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #d1d5db;">Qty</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #d1d5db;">Price</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #d1d5db;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
            </table>

            <div style="background-color: #ede9fe; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #7c3aed;">
              <p style="margin: 0; font-size: 24px; color: #6b21a8;"><strong>Total Amount: ₹${parseFloat(invoice.amountDue).toFixed(2)}</strong></p>
            </div>

            <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; color: #1e40af;"><strong>📱 Pay via Customer Portal:</strong></p>
              <p style="margin: 10px 0 0 0; color: #1e40af;">Please login to your customer dashboard to make the payment securely.</p>
              <p style="margin: 5px 0 0 0; color: #1e40af;">Dashboard → My Rentals → Invoices & Payments</p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If you have any questions about this invoice, please contact the vendor.<br>
              <br>
              Thank you for your business!
            </p>
            
            <br>
            <p style="color: #9ca3af; font-size: 12px;">Best regards,<br>The Rental System Pro Team</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Invoice email sent to:', customer.email);
  } catch (error) {
    console.error('Error sending invoice email:', error);
    throw error;
  }
};
