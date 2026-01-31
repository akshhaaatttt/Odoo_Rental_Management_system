# Customers Feature

## Overview
Vendors can view and manage their customers - users who have placed orders with them.

## Features

### 1. Customer List Page (`/dashboard/customers`)
- **Two View Modes:**
  - 🎯 Kanban View (Grid Cards) - 3 columns on desktop, responsive
  - 📊 List View (Table) - Detailed tabular view
- **Search:** Filter by name, email, or phone
- **Pagination:** Client-side pagination (9 items per page for Kanban, 10 for List)
- **View Persistence:** Selected view saved to localStorage

### 2. Customer Detail Page (`/dashboard/customers/:id`)
- **Customer Information:**
  - Avatar / Name / Email / Phone / Address
  - Join date
- **Statistics Cards:**
  - Total Orders
  - Active Orders
  - Completed Orders
  - Total Revenue
- **Order History Table:**
  - All orders from this customer
  - Clickable rows → navigate to order detail

## Data Model
Customers are users with role `CUSTOMER` who have placed at least one order with the vendor.

```javascript
interface Customer {
  id: string
  vendorId: string
  name: string
  email: string
  phone: string
  avatar?: string
  totalOrders: number
  totalRevenue: number
  joinedDate: Date
}
```

## API Endpoints

### GET `/api/customers`
Get all customers for the logged-in vendor.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+91 9876543210",
    "avatar": "https://...",
    "vendorId": "vendor-uuid",
    "totalOrders": 5,
    "totalRevenue": 25000,
    "joinedDate": "2024-01-15T..."
  }
]
```

### GET `/api/customers/:customerId`
Get detailed information about a specific customer.

**Response:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91 9876543210",
  "avatar": "https://...",
  "address": "123 Main St, Mumbai",
  "createdAt": "2024-01-15T...",
  "stats": {
    "totalOrders": 5,
    "activeOrders": 2,
    "completedOrders": 3,
    "totalRevenue": 25000
  },
  "orders": [
    {
      "id": "uuid",
      "orderReference": "ORD-001",
      "status": "CONFIRMED",
      "totalAmount": 5000,
      "createdAt": "2024-01-20T...",
      "orderItems": [...]
    }
  ]
}
```

## Components

### `CustomerCard.jsx`
Card component for Kanban view showing:
- Avatar with fallback initials
- Name and order count
- Email and phone with icons
- Total revenue
- Join date

### `CustomerTable.jsx`
Table component for List view with columns:
- Avatar + Customer Name
- Email
- Phone
- Orders count
- Total Revenue
- Joined date

### `Customers.jsx`
Main page component with:
- Search bar
- View switcher (Kanban/List)
- Pagination controls
- Loading/Error states
- Empty state

### `CustomerDetail.jsx`
Detail page showing:
- Customer profile header
- Statistics cards (4 metrics)
- Order history table
- Back navigation

## Navigation
- Added "Customers" link to vendor dashboard sidebar
- Icon: `UserCheck` from lucide-react
- Position: After Products, before Invoices

## Testing Steps

1. **Login as Vendor**
   - Email: vendor credentials
   - Password: vendor password

2. **Navigate to Customers**
   - Click "Customers" in sidebar
   - Should load customer list

3. **Test Search**
   - Type customer name/email/phone
   - List should filter in real-time

4. **Test View Switcher**
   - Click Kanban icon (grid)
   - Click List icon (table)
   - Preference should persist on refresh

5. **Test Pagination**
   - If you have 10+ customers, pagination appears
   - Click Next/Previous buttons
   - Page indicator updates

6. **Test Customer Detail**
   - Click any customer card/row
   - Should navigate to detail page
   - Stats and order history displayed

7. **Test Order Navigation**
   - Click any order row in detail page
   - Should navigate to order detail

## File Structure
```
client/src/
├── components/
│   ├── CustomerCard.jsx
│   └── CustomerTable.jsx
├── pages/
│   └── dashboard/
│       ├── Customers.jsx
│       └── CustomerDetail.jsx
└── lib/
    └── api.js (customerAPI added)

server/
├── controllers/
│   └── customerController.js
└── routes/
    └── customerRoutes.js
```

## Security
- Authentication required
- Vendors only see their own customers
- Customers identified by orders placed with vendor
- No cross-vendor data leakage
