import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';

// Layouts
import MainLayout from './layouts/MainLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import Signup from './pages/auth/Signup';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';

// Customer Pages
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import Payment from './pages/Payment';

// Dashboard Pages
import Dashboard from './pages/dashboard/Dashboard';
import OrdersKanban from './pages/dashboard/OrdersKanban';
import NewRentalOrder from './pages/dashboard/NewRentalOrder';
import ProductList from './pages/dashboard/ProductList';
import ProductForm from './pages/dashboard/ProductForm';
import VendorEarnings from './pages/dashboard/VendorEarnings';
import InvoiceView from './pages/dashboard/InvoiceView';
import Reports from './pages/dashboard/Reports';
import Settings from './pages/dashboard/Settings';
import Customers from './pages/dashboard/Customers';
import CustomerDetail from './pages/dashboard/CustomerDetail';
import Invoice from './pages/Invoice';
import InvoiceDetail from './pages/InvoiceDetail';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import VendorManagement from './pages/admin/VendorManagement';
import ProductManagement from './pages/admin/ProductManagement';
import OrderManagement from './pages/admin/OrderManagement';
import AdminInvoices from './pages/admin/AdminInvoices';
import AdminReturns from './pages/admin/AdminReturns';
import AdminSettings from './pages/admin/AdminSettings';
import AdminReports from './pages/admin/AdminReports';

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes with Main Layout */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="cart" element={<Cart />} />
      </Route>

      {/* Auth Routes */}
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Checkout Routes (Protected) */}
      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order-success"
        element={
          <ProtectedRoute>
            <OrderSuccess />
          </ProtectedRoute>
        }
      />

      {/* Payment Route (Protected) */}
      <Route
        path="/payment/:invoiceId"
        element={
          <ProtectedRoute>
            <Payment />
          </ProtectedRoute>
        }
      />

      {/* Customer Dashboard (Protected - Customer Only) */}
      <Route
        path="/customer/dashboard"
        element={
          <ProtectedRoute roles={['CUSTOMER']}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CustomerDashboard />} />
      </Route>

      {/* Invoice Route (Protected) */}
      <Route
        path="/invoice/:orderId"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Invoice />} />
      </Route>

      {/* Dashboard Routes (Protected - Vendor/Admin) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={['VENDOR', 'ADMIN']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<OrdersKanban />} />
        <Route path="orders/new" element={<NewRentalOrder />} />
        <Route path="orders/:id" element={<NewRentalOrder />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
        <Route path="invoices" element={<InvoiceView />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:customerId" element={<CustomerDetail />} />
        <Route path="earnings" element={<VendorEarnings />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Admin Routes (Protected - Admin Only) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="vendors" element={<VendorManagement />} />
        <Route path="products" element={<ProductManagement />} />
        <Route path="orders" element={<OrderManagement />} />
        <Route path="invoices" element={<AdminInvoices />} />
        <Route path="returns" element={<AdminReturns />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
