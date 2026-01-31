import jwt from 'jsonwebtoken';

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Validate password strength
// Requirements: 6-12 characters, 1 uppercase, 1 lowercase, 1 special character
export const validatePassword = (password) => {
  const errors = [];

  if (password.length < 6 || password.length > 12) {
    errors.push('Password must be between 6 and 12 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate unique order reference
export const generateOrderReference = async (prisma) => {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { orderReference: true }
  });

  if (!lastOrder) {
    return 'S00001';
  }

  const lastNumber = parseInt(lastOrder.orderReference.replace('S', ''));
  const nextNumber = lastNumber + 1;
  return `S${nextNumber.toString().padStart(5, '0')}`;
};

// Generate unique invoice number
export const generateInvoiceNumber = async (prisma) => {
  const year = new Date().getFullYear();
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: `INV/${year}/`
      }
    },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true }
  });

  if (!lastInvoice) {
    return `INV/${year}/001`;
  }

  const lastNumber = parseInt(lastInvoice.invoiceNumber.split('/')[2]);
  const nextNumber = lastNumber + 1;
  return `INV/${year}/${nextNumber.toString().padStart(3, '0')}`;
};

// Calculate rental duration in hours
export const calculateRentalHours = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  return Math.ceil(diffMs / (1000 * 60 * 60)); // Convert to hours
};

// Calculate rental price based on unit
export const calculateRentalPrice = (rentPrice, rentUnit, startDate, endDate) => {
  const hours = calculateRentalHours(startDate, endDate);
  
  let multiplier;
  switch (rentUnit) {
    case 'HOUR':
      multiplier = hours;
      break;
    case 'DAY':
      multiplier = Math.ceil(hours / 24);
      break;
    case 'WEEK':
      multiplier = Math.ceil(hours / (24 * 7));
      break;
    case 'MONTH':
      multiplier = Math.ceil(hours / (24 * 30));
      break;
    default:
      multiplier = Math.ceil(hours / 24);
  }

  return parseFloat(rentPrice) * multiplier;
};

// Calculate late fee
export const calculateLateFee = (returnDate, actualReturnDate, dailyRate) => {
  const expected = new Date(returnDate);
  const actual = new Date(actualReturnDate);
  
  if (actual <= expected) {
    return 0;
  }

  const diffMs = actual - expected;
  const lateDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const lateFeeRate = parseFloat(dailyRate) * 0.5; // 50% of daily rate as penalty
  
  return lateFeeRate * lateDays;
};

// Format currency with symbol and 2 decimal places
export const formatCurrency = (amount) => {
  return `₹ ${parseFloat(amount).toFixed(2)}`;
};

// Format date to readable string
export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
