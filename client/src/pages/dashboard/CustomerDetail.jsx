import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, ShoppingBag, TrendingUp, Package, CheckCircle } from 'lucide-react';
import { customerAPI } from '../../lib/api';

const CustomerDetail = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCustomerDetail();
  }, [customerId]);

  const fetchCustomerDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await customerAPI.getById(customerId);
      setCustomer(response.data);
    } catch (err) {
      console.error('Error fetching customer details:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to load customer details';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'text-purple-400 bg-purple-900/30',
      SENT: 'text-purple-400 bg-purple-900/30',
      SALE: 'text-orange-400 bg-orange-900/30',
      CONFIRMED: 'text-green-400 bg-green-900/30',
      INVOICED: 'text-blue-400 bg-blue-900/30',
      CANCELLED: 'text-red-400 bg-red-900/30',
      LATE: 'text-red-400 bg-red-900/30',
      RETURNED: 'text-gray-400 bg-gray-700',
    };
    return colors[status] || 'text-gray-400 bg-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/dashboard/customers')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Customers
          </button>
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
            <p className="text-red-400">{error || 'Customer not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard/customers')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Customers
        </button>

        {/* Customer Header */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold text-3xl flex-shrink-0">
              {customer.avatar ? (
                <img
                  src={customer.avatar}
                  alt={customer.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                customer.name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{customer.name}</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2 text-gray-300">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span>{customer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span>{customer.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span>{customer.address || 'No address provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span>
                    Joined {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Orders</span>
              <ShoppingBag className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold">{customer.stats.totalOrders}</div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Active Orders</span>
              <Package className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-2xl font-bold">{customer.stats.activeOrders}</div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Completed</span>
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold">{customer.stats.completedOrders}</div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Revenue</span>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400">
              ₹{parseFloat(customer.stats.totalRevenue).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold">Order History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                    Order Reference
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                    Products
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {customer.orders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  customer.orders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-750 transition-colors cursor-pointer"
                      onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                    >
                      <td className="px-6 py-4 text-sm text-white font-medium">
                        {order.orderReference}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {new Date(order.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {order.orderItems.length} {order.orderItems.length === 1 ? 'item' : 'items'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-purple-400">
                        ₹{parseFloat(order.totalAmount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
