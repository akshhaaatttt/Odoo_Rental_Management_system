import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { orderAPI } from '@/lib/api';
import { Package, Calendar, User, DollarSign, PackageCheck, RotateCcw, CheckCircle, Plus, Grid3x3, List, Download, Upload, Search } from 'lucide-react';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

const ORDER_STATUSES = {
  QUOTATION: { label: 'Quotation', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: '📋' },
  APPROVED: { label: 'Approved', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: '✓' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-green-100 text-green-800 border-green-300', icon: '✔' },
  INVOICED: { label: 'Invoiced', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: '📄' },
  PICKEDUP: { label: 'Picked Up', color: 'bg-teal-100 text-teal-800 border-teal-300', icon: '📦' },
  RETURNED: { label: 'Returned', color: 'bg-slate-100 text-slate-800 border-slate-300', icon: '↩' },
  LATE: { label: 'Late Return', color: 'bg-red-100 text-red-800 border-red-300', icon: '⚠' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-300', icon: '✕' },
};

export default function OrdersKanban() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupedOrders, setGroupedOrders] = useState({});
  const [view, setView] = useState(() => {
    return localStorage.getItem('ordersView') || 'kanban';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [pickupFilter, setPickupFilter] = useState(false);
  const [returnFilter, setReturnFilter] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    // Group orders by status
    const grouped = orders.reduce((acc, order) => {
      if (!acc[order.status]) {
        acc[order.status] = [];
      }
      acc[order.status].push(order);
      return acc;
    }, {});
    setGroupedOrders(grouped);
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('ordersView', view);
  }, [view]);

  const fetchOrders = async () => {
    try {
      const response = await orderAPI.getOrders();
      setOrders(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (orderId) => {
    try {
      await orderAPI.confirm(orderId);
      toast.success('Order confirmed successfully! Customer can now proceed with pickup.');
      fetchOrders();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to confirm order';
      toast.error(errorMsg);
    }
  };

  const handlePickup = async (orderId) => {
    try {
      await orderAPI.pickup(orderId);
      toast.success('Order marked as picked up');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to mark order as picked up');
    }
  };

  const handleReturn = async (orderId) => {
    try {
      await orderAPI.return(orderId);
      toast.success('Return processed successfully');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to process return');
    }
  };

  const handleExport = async () => {
    try {
      // Create CSV content from orders
      const csvHeaders = ['Order Reference', 'Date', 'Customer', 'Product Count', 'Total Amount', 'Status', 'Payment Status'];
      const csvRows = orders.map(order => [
        order.orderReference,
        new Date(order.createdAt).toLocaleDateString(),
        `${order.customer?.firstName} ${order.customer?.lastName}`,
        order.orderItems?.length || 0,
        order.totalAmount,
        ORDER_STATUSES[order.status]?.label || order.status,
        order.paymentStatus
      ]);
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Orders exported successfully');
    } catch (error) {
      toast.error('Failed to export orders');
    }
  };

  const canShowConfirm = (order) => {
    return order.status === 'SALE';
  };

  const canShowPickup = (order) => {
    return (order.status === 'CONFIRMED' || order.status === 'INVOICED') && order.paymentStatus === 'PAID' && !order.pickupDate;
  };

  const canShowReturn = (order) => {
    return order.status === 'PICKEDUP' || (order.pickupDate && ['CONFIRMED', 'INVOICED', 'PICKEDUP'].includes(order.status));
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchQuery === '' || 
      order.orderReference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.lastName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPickup = !pickupFilter || 
      (order.status === 'CONFIRMED' && !order.pickupDate);

    const matchesReturn = !returnFilter || 
      (order.pickupDate && !order.returnDate && 
       new Date(order.expectedReturnDate) <= new Date(Date.now() + 86400000));

    return matchesSearch && matchesPickup && matchesReturn;
  });

  // Regroup filtered orders
  const filteredGroupedOrders = filteredOrders.reduce((acc, order) => {
    if (!acc[order.status]) {
      acc[order.status] = [];
    }
    acc[order.status].push(order);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rental Orders</h1>
            <p className="text-gray-500 mt-2">Manage and track your rental orders</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download size={18} />
              Export
            </Button>
            <Button
              onClick={() => navigate('/dashboard/orders/new')}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Plus size={20} />
              New Rental Order
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search orders, customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <Button
            variant={pickupFilter ? "default" : "outline"}
            onClick={() => setPickupFilter(!pickupFilter)}
            className={pickupFilter ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <PackageCheck size={18} className="mr-2" />
            Pickup
          </Button>

          <Button
            variant={returnFilter ? "default" : "outline"}
            onClick={() => setReturnFilter(!returnFilter)}
            className={returnFilter ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            <RotateCcw size={18} className="mr-2" />
            Return
          </Button>

          {/* View Switcher */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('kanban')}
              className={`p-2 rounded-md transition-colors ${
                view === 'kanban'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Kanban View"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-md transition-colors ${
                view === 'list'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* View Content */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500">
              {searchQuery || pickupFilter || returnFilter 
                ? 'Try adjusting your filters' 
                : 'Orders will appear here once customers start renting'}
            </p>
          </CardContent>
        </Card>
      ) : view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Object.entries(ORDER_STATUSES).map(([status, config]) => (
            <div key={status} className="flex flex-col flex-shrink-0 w-80">
              <div className={`${config.color} px-4 py-3 rounded-t-lg border font-semibold`}>
                <h3 className="text-sm flex items-center gap-2">
                  <span>{config.icon}</span>
                  {config.label}
                </h3>
                <p className="text-xs opacity-75 mt-1">
                  {filteredGroupedOrders[status]?.length || 0} orders
                </p>
              </div>
              <div className="space-y-3 bg-gray-50 p-3 rounded-b-lg min-h-[400px] flex-1 border border-t-0 border-gray-200 overflow-y-auto max-h-[calc(100vh-300px)]">
                {filteredGroupedOrders[status]?.map((order) => (
                  <Card 
                    key={order.id} 
                    className="hover:shadow-lg transition-all cursor-pointer bg-white border border-gray-200"
                    onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                  >
                    <CardContent className="p-4">
                      {/* Top Row: Customer Name and Product */}
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-800">
                          {order.customer?.firstName} {order.customer?.lastName}
                        </span>
                        <span className="text-sm font-medium text-gray-700 text-right">
                          {order.orderItems?.[0]?.product?.name || 'Product'}
                        </span>
                      </div>
                      
                      {/* Second Row: Order Reference and Price */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-600">
                          {order.orderReference}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          ₹{Number(order.totalAmount).toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Rental Duration Label */}
                      <div className="mb-3 pb-3 border-b border-gray-200">
                        <span className="text-xs text-gray-500">Rental Duration</span>
                        {order.pickupDate && order.returnDate && (
                          <div className="text-xs text-gray-600 mt-1">
                            {formatDate(order.pickupDate)} - {formatDate(order.returnDate)}
                          </div>
                        )}
                        {order.pickupDate && !order.returnDate && (
                          <div className="text-xs text-green-600 mt-1">
                            ✓ Picked up: {formatDate(order.pickupDate)}
                          </div>
                        )}
                        {!order.pickupDate && order.expectedReturnDate && (
                          <div className="text-xs text-gray-600 mt-1">
                            Expected: {formatDate(order.expectedReturnDate)}
                          </div>
                        )}
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex justify-end">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${ORDER_STATUSES[order.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {ORDER_STATUSES[order.status]?.label || order.status}
                        </span>
                      </div>

                      {/* Vendor Actions */}
                      {user?.role === 'VENDOR' && (
                        <div className="mt-3 space-y-2 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                          {canShowConfirm(order) && (
                            <Button
                              size="sm"
                              className="w-full bg-orange-600 hover:bg-orange-700 text-xs"
                              onClick={() => handleConfirm(order.id)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Confirm Order
                            </Button>
                          )}
                          
                          {canShowPickup(order) && (
                            <Button
                              size="sm"
                              className="w-full bg-green-600 hover:bg-green-700 text-xs"
                              onClick={() => handlePickup(order.id)}
                            >
                              <PackageCheck className="h-3 w-3 mr-1" />
                              Mark as Picked Up
                            </Button>
                          )}
                          
                          {canShowReturn(order) && (
                            <Button
                              size="sm"
                              className="w-full bg-blue-600 hover:bg-blue-700 text-xs"
                              onClick={() => handleReturn(order.id)}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Process Return
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Ref</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr 
                      key={order.id}
                      onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-purple-600">
                        {order.orderReference}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {order.customer?.firstName} {order.customer?.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {order.orderItems?.length || 0} item(s)
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ₹{Number(order.totalAmount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${ORDER_STATUSES[order.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {ORDER_STATUSES[order.status]?.label || order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
