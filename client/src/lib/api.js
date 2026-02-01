import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
  getProfile: () => api.get('/auth/me'), // Alias for getMe
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Product API
export const productAPI = {
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  addAttribute: (id, data) => api.post(`/products/${id}/attributes`, data),
  checkAvailability: (id, data) => api.post(`/products/${id}/check-availability`, data),
};

// Order API
export const orderAPI = {
  checkout: (data) => api.post('/orders/checkout', data),
  create: (data) => api.post('/orders/checkout', data), // Alias for creating orders
  getAll: (params) => api.get('/orders', { params }),
  getOrders: (params) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  getById: (id) => api.get(`/orders/${id}`),
  update: (id, data) => api.patch(`/orders/${id}`, data),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  approve: (id) => api.patch(`/orders/${id}/approve`),
  reject: (id, data) => api.patch(`/orders/${id}/reject`, data),
  send: (id) => api.patch(`/orders/${id}/send`),
  confirmSale: (id) => api.patch(`/orders/${id}/confirm-sale`),
  confirm: (id) => api.patch(`/orders/${id}/confirm`),
  createInvoice: (id) => api.post(`/orders/${id}/create-invoice`),
  pickup: (id) => api.patch(`/orders/${id}/pickup`),
  return: (id) => api.patch(`/orders/${id}/return`),
  cancel: (id) => api.patch(`/orders/${id}/cancel`),
  getCustomerOrders: () => api.get('/orders?role=customer'),
  getVendorOrders: () => api.get('/orders?role=vendor'),
  checkAvailability: (data) => api.post('/orders/check-availability', data),
};

// Invoice API
export const invoiceAPI = {
  getInvoices: (params) => api.get('/invoices', { params }),
  getInvoice: (id) => api.get(`/invoices/${id}`),
  getInvoiceByOrderId: (orderId) => api.get(`/invoices/order/${orderId}`),
  postInvoice: (id) => api.patch(`/invoices/${id}/post`),
  sendInvoice: (id) => api.post(`/invoices/${id}/send`),
  recordPayment: (id, amount) => api.post(`/invoices/${id}/payment`, { amount }),
};

// Report API
export const reportAPI = {
  getRevenue: (params) => api.get('/reports/revenue', { params }),
  getProducts: () => api.get('/reports/products'),
  getOrders: () => api.get('/reports/orders'),
  getDashboard: () => api.get('/reports/dashboard'),
};

// Admin API
export const adminAPI = {
  // Dashboard
  getDashboardMetrics: () => api.get('/admin/dashboard'),
  
  // Vendor Management
  getAllVendors: () => api.get('/admin/vendors'),
  verifyVendor: (id, data) => api.patch(`/admin/vendors/${id}/verify`, data),
  
  // Product Management
  getAllProducts: (search) => api.get('/admin/products', { params: { search } }),
  publishProduct: (id, data) => api.patch(`/admin/products/${id}/publish`, data),
  
  // Order Management
  getAllOrders: (params) => api.get('/admin/orders', { params }),
  exportOrders: (params) => api.get('/admin/orders/export', { params, responseType: 'blob' }),
  
  // Returns Management
  getReturnsOverview: () => api.get('/admin/returns'),
  
  // Reports
  getReports: (params) => api.get('/admin/reports', { params }),
  exportReport: (type, format, dateRange) => {
    if (format === 'csv') {
      return api.get('/admin/reports/export', { 
        params: { type, format, ...dateRange }, 
        responseType: 'blob' 
      });
    } else {
      return api.get('/admin/reports/export', { 
        params: { type, format, ...dateRange }
      });
    }
  },
  
  // Settings
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
};

// Customer API
export const customerAPI = {
  getAll: () => api.get('/customers'),
  getById: (id) => api.get(`/customers/${id}`),
};


