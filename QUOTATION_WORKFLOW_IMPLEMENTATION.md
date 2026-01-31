# Quotation to Rental Order Workflow - Implementation Guide

## Overview
This document provides the complete implementation plan for transforming the current rental system into a "Quotation to Rental Order" workflow with strict inventory controls.

---

## Phase 1: Database Schema Updates

### 1.1 Order Status Flow Change
**OLD FLOW:**
```
DRAFT → SENT → SALE → CONFIRMED → INVOICED → RETURNED/LATE
```

**NEW FLOW:**
```
QUOTATION → APPROVED → CONFIRMED → INVOICED → PICKEDUP → RETURNED/LATE
```

### 1.2 Schema Changes

**File:** `prisma/schema.prisma`

```prisma
enum OrderStatus {
  QUOTATION   // Customer Request - No stock reservation
  APPROVED    // Vendor approved, awaiting payment
  CONFIRMED   // Payment done, stock reserved (HARD LOCK)
  INVOICED    // Invoiced
  PICKEDUP    // With Customer
  RETURNED    // Returned on time
  LATE        // Late Return
  CANCELLED   // Cancelled
}

model Order {
  // ... existing fields
  status        OrderStatus    @default(QUOTATION)
  confirmedAt   DateTime?      // NEW: Timestamp when stock was reserved
  approvedAt    DateTime?      // NEW: Timestamp when vendor approved
  // ... rest of fields
}
```

### 1.3 Migration Strategy
```bash
# DO NOT run automatic migration yet
# Manual migration needed to preserve data

# Step 1: Backup database
pg_dump rental_system_pro > backup_$(date +%Y%m%d).sql

# Step 2: Create migration file manually
npx prisma migrate dev --name quotation_workflow --create-only

# Step 3: Edit migration to transform existing data:
# DRAFT → QUOTATION
# SENT → APPROVED  
# SALE → APPROVED
# CONFIRMED → CONFIRMED (no change)

# Step 4: Apply migration
npx prisma migrate deploy
```

---

## Phase 2: Backend Implementation

### 2.1 Availability Check System

**File:** `server/utils/availabilityCheck.js` ✅ (Already Created)

Key Functions:
- `checkAvailability(orderItems, excludeOrderId)` - Main validation
- `checkProductAvailability(productId, startDate, endDate, quantity)` - Real-time check for UI
- `batchCheckAvailability(items)` - Cart validation
- `reserveStock(orderId)` - Hard lock after confirmation
- `releaseStock(orderId)` - Release on cancellation

### 2.2 Updated Order Controller

**File:** `server/controllers/orderController.js`

```javascript
// NEW: Approve quotation (QUOTATION → APPROVED)
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
        status: 'APPROVED',
        approvedAt: new Date()
      },
      include: {
        customer: true,
        vendor: true,
        orderItems: { include: { product: true } }
      }
    });

    // Send email to customer: "Your quotation has been approved"
    // Include payment instructions

    res.json({
      success: true,
      message: 'Quotation approved successfully. Awaiting customer payment.',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// UPDATED: Confirm order with THE AVAILABILITY BRAIN
export const confirmOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const order = await prisma.order.findUnique({
      where: { id },
      include: { 
        orderItems: { include: { product: true } },
        customer: true,
        vendor: true
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Can confirm from APPROVED or QUOTATION (if payment offline)
    if (!['APPROVED', 'QUOTATION'].includes(order.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order must be APPROVED to confirm' 
      });
    }

    // =========================================
    // THE GATEKEEPER - Availability Check
    // =========================================
    const availabilityCheck = await checkAvailability(
      order.orderItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        startDate: order.pickupDate,
        endDate: order.expectedReturnDate
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
    const confirmedOrder = await reserveStock(order.id);

    // Send confirmation email to customer
    sendOrderConfirmationEmail(confirmedOrder, confirmedOrder.customer).catch(err => 
      console.error('Failed to send confirmation email:', err)
    );

    res.json({
      success: true,
      message: 'Order confirmed! Stock has been reserved.',
      data: confirmedOrder
    });
  } catch (error) {
    next(error);
  }
};

// NEW: Reject quotation
export const rejectOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason || 'Quotation rejected by vendor'
      },
      include: { customer: true }
    });

    // Send rejection email to customer

    res.json({
      success: true,
      message: 'Quotation rejected',
      data: order
    });
  } catch (error) {
    next(error);
  }
};
```

### 2.3 Route Updates

**File:** `server/routes/orderRoutes.js`

```javascript
import { 
  checkout,
  getOrders,
  getOrder,
  approveOrder,    // NEW
  confirmOrder,    // UPDATED
  rejectOrder,     // NEW
  pickupOrder,
  returnOrder,
  cancelOrder
} from '../controllers/orderController.js';

// Quotation lifecycle
router.patch('/:id/approve', protect, authorize('VENDOR', 'ADMIN'), approveOrder);
router.patch('/:id/confirm', protect, authorize('VENDOR', 'ADMIN'), confirmOrder);
router.patch('/:id/reject', protect, authorize('VENDOR', 'ADMIN'), rejectOrder);

// Existing routes
router.patch('/:id/pickup', protect, authorize('VENDOR', 'ADMIN'), pickupOrder);
router.patch('/:id/return', protect, authorize('VENDOR', 'ADMIN'), returnOrder);
router.patch('/:id/cancel', protect, cancelOrder);
```

---

## Phase 3: Frontend Implementation

### 3.1 API Service Updates

**File:** `client/src/lib/api.js`

```javascript
export const orderAPI = {
  // ... existing methods
  approve: (id) => api.patch(`/orders/${id}/approve`),
  confirm: (id) => api.patch(`/orders/${id}/confirm`),
  reject: (id, data) => api.patch(`/orders/${id}/reject`, data),
  checkAvailability: (data) => api.post(`/orders/check-availability`, data),
  // ... rest
};
```

### 3.2 OrdersKanban Component

**File:** `client/src/pages/dashboard/OrdersKanban.jsx` ✅ (Already Created)

Key Features:
- ✅ Updated status badges with icons
- ✅ Conflict warning banners (red border + AlertTriangle)
- ✅ Approve/Reject buttons for QUOTATION status
- ✅ Confirm & Reserve Stock button for APPROVED status
- ✅ Visual indicators for rental periods
- ✅ Error handling for stock conflicts

### 3.3 OrderDetailView Component

**File:** `client/src/pages/dashboard/OrderDetailView.jsx`

```jsx
// NEW: Vendor approval workflow UI
const OrderDetailView = () => {
  const [order, setOrder] = useState(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictDetails, setConflictDetails] = useState([]);

  // Check availability in real-time for QUOTATION/APPROVED orders
  useEffect(() => {
    if (order && ['QUOTATION', 'APPROVED'].includes(order.status)) {
      checkCurrentAvailability();
    }
  }, [order]);

  const checkCurrentAvailability = async () => {
    try {
      const result = await orderAPI.checkAvailability({
        items: order.orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          startDate: order.pickupDate,
          endDate: order.expectedReturnDate
        })),
        excludeOrderId: order.id
      });

      if (!result.data.available) {
        setHasConflict(true);
        setConflictDetails(result.data.conflicts);
      }
    } catch (error) {
      console.error('Availability check failed:', error);
    }
  };

  const handleApprove = async () => {
    try {
      await orderAPI.approve(order.id);
      toast.success('Quotation approved!  Awaiting customer payment.');
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleConfirm = async () => {
    if (hasConflict) {
      if (!confirm('Stock conflict detected! Continue anyway?')) {
        return;
      }
    }

    try {
      await orderAPI.confirm(order.id);
      toast.success('Order confirmed! Stock reserved.');
      fetchOrder();
    } catch (error) {
      if (error.response?.data?.conflicts) {
        const conflicts = error.response.data.conflicts;
        const conflictMsg = conflicts.map(c => 
          `${c.productName}: Need ${c.requestedQty}, Available ${c.availableQty}`
        ).join('\n');
        
        toast.error(
          <div>
            <p className="font-bold">Cannot Confirm - Stock Conflict!</p>
            <pre className="text-xs mt-2 whitespace-pre-wrap">{conflictMsg}</pre>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.error('Failed to confirm order');
      }
    }
  };

  const handleReject = async () => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;

    try {
      await orderAPI.reject(order.id, { reason });
      toast.success('Quotation rejected');
      navigate('/dashboard/orders');
    } catch (error) {
      toast.error('Failed to reject quotation');
    }
  };

  return (
    <div>
      {/* Conflict Warning Banner */}
      {hasConflict && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-red-900">⚠️ Stock Conflict Detected</h3>
              <p className="text-sm text-red-800 mt-1">
                New orders came in since this quotation was created. Some products may no longer be available for these dates.
              </p>
              <div className="mt-3 space-y-2">
                {conflictDetails.map((conflict, idx) => (
                  <div key={idx} className="text-xs bg-white p-2 rounded border border-red-200">
                    <span className="font-semibold">{conflict.productName}:</span> Requested {conflict.requestedQty}, Available {conflict.availableQty}
                    <br />
                    <span className="text-gray-600">
                      {new Date(conflict.dateRange.startDate).toLocaleDateString()} - {new Date(conflict.dateRange.endDate).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons Based on Status */}
      <div className="flex gap-3">
        {order.status === 'QUOTATION' && (
          <>
            <Button
              onClick={handleApprove}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Quotation
            </Button>
            <Button
              onClick={handleReject}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Reject
            </Button>
          </>
        )}

        {order.status === 'APPROVED' && (
          <Button
            onClick={handleConfirm}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirm & Reserve Stock
          </Button>
        )}

        {/* ... existing buttons for other statuses */}
      </div>

      {/* ... rest of component */}
    </div>
  );
};
```

### 3.4 Quote Builder (Customer View)

**File:** `client/src/pages/Checkout.jsx` or `client/src/pages/QuoteRequest.jsx`

```jsx
// Real-time availability indicator
const QuoteRequestForm = () => {
  const [availability, setAvailability] = useState({});

  const checkAvailability = async (productId, startDate, endDate, quantity) => {
    try {
      const result = await orderAPI.checkAvailability({
        items: [{ productId, startDate, endDate, quantity }]
      });

      setAvailability(prev => ({
        ...prev,
        [productId]: {
          available: result.data.available,
          availableQty: result.data.conflicts[0]?.availableQty || quantity
        }
      }));
    } catch (error) {
      console.error('Availability check failed');
    }
  };

  return (
    <div>
      {/* Product Selection */}
      {cart.items.map(item => (
        <div key={item.productId}>
          <p>{item.product.name}</p>
          
          {/* Availability Indicator (NON-BINDING) */}
          <div className={`flex items-center gap-2 ${
            availability[item.productId]?.available 
              ? 'text-green-600' 
              : 'text-orange-600'
          }`}>
            {availability[item.productId]?.available ? (
              <>
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="text-sm">Currently Available</span>
              </>
            ) : (
              <>
                <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                <span className="text-sm">
                  Limited: {availability[item.productId]?.availableQty || 0} available
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            * Availability is non-binding. Final confirmation subject to vendor approval.
          </p>
        </div>
      ))}

      <Button onClick={handleSubmitQuote}>
        Request Quote
      </Button>
    </div>
  );
};
```

---

## Phase 4: Testing Checklist

### 4.1 Unit Tests
- [ ] `checkAvailability()` with overlapping dates
- [ ] `checkAvailability()` with no conflicts
- [ ] `reserveStock()` updates status correctly
- [ ] `releaseStock()` on cancellation

### 4.2 Integration Tests

**Scenario 1: Normal Flow**
1. Customer requests quote for Product A (Qty: 2) from Jan 1-5
2. Order created with status `QUOTATION`
3. Vendor approves → Status changes to `APPROVED`
4. Customer pays → Vendor confirms → Status changes to `CONFIRMED`
5. ✅ Stock is NOW reserved (2 units locked for Jan 1-5)
6. Customer picks up → Status changes to `PICKEDUP`
7. Customer returns on time → Status changes to `RETURNED`

**Scenario 2: Stock Conflict**
1. Order A: Product X (Qty: 3) from Jan 1-5 → CONFIRMED (stock reserved)
2. Order B: Product X (Qty: 2) from Jan 3-7 → QUOTATION (no reservation yet)
3. Vendor tries to approve Order B → ✅ Success (no check at approval)
4. Vendor tries to confirm Order B → ❌ BLOCKED
   - Error: "Stock conflict! Need 2, Available 0 (3 already committed)"
   - Conflict details returned to frontend
5. Red banner appears in Order Detail View
6. Vendor must either:
   - Reject Order B
   - Wait for Order A to return
   - Adjust Order B dates/quantity

**Scenario 3: Multiple Overlapping Quotations**
1. Order A: Product Y (Qty: 5) from Jan 1-10 → QUOTATION
2. Order B: Product Y (Qty: 5) from Jan 5-15 → QUOTATION
3. Order C: Product Y (Qty: 5) from Jan 12-20 → QUOTATION
4. ✅ All three can exist as QUOTATION (no reservation)
5. Vendor confirms Order A → Stock reserved
6. Vendor tries to confirm Order B → ❌ BLOCKED (conflict with Order A)
7. After Jan 10, Order A returns → Stock released
8. Now Order B can be confirmed ✅

---

## Phase 5: Deployment Strategy

### 5.1 Pre-Deployment
1. Run full test suite
2. Backup production database
3. Test migration on staging environment
4. Prepare rollback plan

### 5.2 Deployment Steps
```bash
# Step 1: Deploy backend first (API backwards compatible)
git push heroku main

# Step 2: Run migration
heroku run npx prisma migrate deploy

# Step 3: Deploy frontend
npm run build
# Deploy to Vercel/Netlify

# Step 4: Verify
# - Check order creation
# - Test approve/confirm flow
# - Verify conflict detection
```

### 5.3 Post-Deployment Monitoring
- Monitor error logs for stock conflicts
- Track approval → confirmation conversion rate
- Watch for database performance (availability checks can be heavy)

---

## Phase 6: Performance Optimization

### 6.1 Database Indexing
```sql
CREATE INDEX idx_order_status_dates ON "Order" (status, "pickupDate", "expectedReturnDate");
CREATE INDEX idx_order_items_product ON "OrderItem" ("productId", "orderId");
```

### 6.2 Caching Strategy
- Cache product stock levels (Redis)
- Invalidate cache on order confirmation/cancellation
- Real-time availability checks use cache with 30s TTL

### 6.3 Background Jobs
- Daily job to identify quotations with potential conflicts
- Send vendor alerts for quotes that became unavailable
- Auto-expire quotations after 7 days

---

## Key Principles Summary

1. **No Stock Reservation at Quotation Stage**
   - Multiple customers can quote same product/dates
   - Creates urgency for customers to confirm quickly

2. **Hard Lock Only at Confirmation**
   - Stock mathematically reserved when status = CONFIRMED
   - No overbooking possible after confirmation

3. **Real-Time Conflict Detection**
   - Check availability immediately before confirmation
   - Block confirmation if conflict detected
   - Display clear error messages with details

4. **Transparent Communication**
   - Show conflict warnings in UI before confirmation
   - Non-binding availability indicators for customers
   - Email notifications at each status change

5. **Vendor Control**
   - Vendor reviews and approves quotations
   - Vendor triggers final confirmation (gatekeeper)
   - Vendor can reject quotations with reasons

---

## Migration Timeline

- **Week 1:** Backend implementation + availability algorithm
- **Week 2:** Frontend UI updates + testing
- **Week 3:** Integration testing + bug fixes
- **Week 4:** Staging deployment + user training
- **Week 5:** Production deployment + monitoring

---

## Support & Documentation

- **Technical Docs:** This file
- **User Guide:** Create separate guide for vendors
- **API Docs:** Update Postman collection
- **Video Tutorial:** Record workflow demo

---

## Success Metrics

- ✅ Zero overbooking incidents after deployment
- ✅ < 5% quotation rejection rate due to conflicts
- ✅ Average approval time < 2 hours
- ✅ Customer satisfaction with transparency
- ✅ Reduced manual intervention by vendors

---

**Status:** Ready for Implementation
**Last Updated:** January 31, 2026
**Document Version:** 1.0
