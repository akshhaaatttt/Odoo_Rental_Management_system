import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { orderAPI, invoiceAPI } from '@/lib/api';
import { 
  Package, Download, Clock, AlertTriangle, CheckCircle, 
  Calendar, DollarSign, FileText, CreditCard, ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await orderAPI.getCustomerOrders();
      setOrders(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    const activeStatuses = ['QUOTATION', 'APPROVED', 'CONFIRMED', 'INVOICED', 'PICKEDUP'];
    const active = orders.filter(o => activeStatuses.includes(o.status));
    const past = orders.filter(o => ['RETURNED', 'CANCELLED'].includes(o.status));
    
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upcoming = active.filter(o => {
      if (!o.orderItems?.[0]?.rentalEnd) return false;
      const endDate = new Date(o.orderItems[0].rentalEnd);
      return endDate <= threeDaysFromNow && endDate > now;
    });

    const late = orders.filter(o => o.status === 'LATE');

    const totalSpent = orders
      .filter(o => !['QUOTATION', 'CANCELLED'].includes(o.status))
      .reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);

    return {
      activeCount: active.length,
      pastCount: past.length,
      upcomingCount: upcoming.length,
      lateCount: late.length,
      totalSpent,
      activeOrders: active,
      pastOrders: past,
      upcomingReturns: upcoming,
      lateOrders: late
    };
  };

  const stats = getStats();

  const getStatusColor = (status) => {
    const colors = {
      QUOTATION: 'bg-gray-100 text-gray-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      INVOICED: 'bg-purple-100 text-purple-800',
      PICKEDUP: 'bg-orange-100 text-orange-800',
      RETURNED: 'bg-gray-200 text-gray-700',
      LATE: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-red-50 text-red-600'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusTimeline = (order) => {
    const stages = [
      { key: 'QUOTATION', label: 'Quotation', completed: ['QUOTATION', 'APPROVED', 'CONFIRMED', 'INVOICED', 'PICKEDUP', 'RETURNED', 'LATE'].includes(order.status) },
      { key: 'APPROVED', label: 'Approved', completed: ['APPROVED', 'CONFIRMED', 'INVOICED', 'PICKEDUP', 'RETURNED', 'LATE'].includes(order.status) },
      { key: 'CONFIRMED', label: 'Confirmed', completed: ['CONFIRMED', 'INVOICED', 'PICKEDUP', 'RETURNED', 'LATE'].includes(order.status) },
      { key: 'INVOICED', label: 'Invoice Sent', completed: ['INVOICED', 'PICKEDUP', 'RETURNED', 'LATE'].includes(order.status) },
      { key: 'PICKEDUP', label: 'Picked Up', completed: ['PICKEDUP', 'RETURNED', 'LATE'].includes(order.status) },
      { key: 'RETURNED', label: 'Returned', completed: ['RETURNED'].includes(order.status) },
    ];

    return stages;
  };

  const getDaysRemaining = (rentalEnd) => {
    const now = new Date();
    const end = new Date(rentalEnd);
    const diff = end - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const handlePayNow = (invoiceId) => {
    navigate(`/payment/${invoiceId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Rentals</h1>
        <p className="text-gray-600 mt-2">Track your orders and manage your rentals</p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Rentals</p>
                <p className="text-3xl font-bold text-purple-600">{stats.activeCount}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming Returns</p>
                <p className="text-3xl font-bold text-orange-600">{stats.upcomingCount}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Late Returns</p>
                <p className="text-3xl font-bold text-red-600">{stats.lateCount}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-green-600">₹{stats.totalSpent.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(stats.lateCount > 0 || stats.upcomingCount > 0) && (
        <div className="space-y-4 mb-8">
          {stats.lateCount > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center text-red-800">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Overdue Rentals - Action Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.lateOrders.map((order) => (
                    <div key={order.id} className="bg-white p-4 rounded-lg border border-red-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{order.orderReference}</p>
                          <p className="text-sm text-gray-600">{order.vendor?.companyName}</p>
                          <p className="text-sm text-red-600 mt-1">
                            Late by {Math.abs(getDaysRemaining(order.orderItems?.[0]?.rentalEnd))} days
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded">
                          OVERDUE
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.upcomingCount > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-800">
                  <Clock className="h-5 w-5 mr-2" />
                  Upcoming Returns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.upcomingReturns.map((order) => {
                    const daysLeft = getDaysRemaining(order.orderItems?.[0]?.rentalEnd);
                    return (
                      <div key={order.id} className="bg-white p-4 rounded-lg border border-orange-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-900">{order.orderReference}</p>
                            <p className="text-sm text-gray-600">{order.vendor?.companyName}</p>
                            <p className="text-sm text-orange-600 mt-1">
                              Return due in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded">
                            {daysLeft} DAYS LEFT
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Active Rentals ({stats.activeCount})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Order History ({stats.pastCount})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invoices'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Invoices & Payments
          </button>
        </nav>
      </div>

      {/* Active Rentals */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {stats.activeOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No active rentals</p>
                <Link to="/products">
                  <Button>Browse Products</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            stats.activeOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader className="bg-gray-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {order.orderReference}
                    </CardTitle>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {/* Timeline */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">Order Progress</h4>
                    <div className="relative flex justify-between items-center">
                      {getStatusTimeline(order).map((stage, idx) => (
                        <div key={stage.key} className="flex flex-col items-center z-10 bg-white">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            stage.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                          }`}>
                            {stage.completed ? <CheckCircle className="h-5 w-5" /> : <div className="w-3 h-3 rounded-full bg-current" />}
                          </div>
                          <p className="text-xs mt-2 text-center max-w-[80px]">{stage.label}</p>
                        </div>
                      ))}
                      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" style={{zIndex: 0}} />
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b">
                    <div>
                      <p className="text-sm text-gray-600">Vendor</p>
                      <p className="font-medium">{order.vendor?.companyName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Rental Period</p>
                      <p className="font-medium text-sm">
                        {order.orderItems?.[0] && 
                          `${new Date(order.orderItems[0].rentalStart).toLocaleDateString()} - ${new Date(order.orderItems[0].rentalEnd).toLocaleDateString()}`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="font-bold text-purple-600">₹{parseFloat(order.totalAmount).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Items</p>
                    <div className="space-y-2">
                      {order.orderItems?.map((item, idx) => (
                        <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{item.product?.name} x {item.quantity}</span>
                          <span className="text-sm font-medium">₹{parseFloat(item.unitPrice * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  {order.status === 'INVOICED' && order.invoices?.length > 0 && (
                    <div className="flex gap-3">
                      {order.paymentStatus === 'UNPAID' ? (
                        <Button
                          onClick={() => handlePayNow(order.invoices[0].id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay Now
                        </Button>
                      ) : (
                        <span className="flex items-center text-green-600 text-sm font-medium">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Payment Completed
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {stats.pastOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No past orders</p>
              </CardContent>
            </Card>
          ) : (
            stats.pastOrders.map((order) => (
              <Card key={order.id}>
                <CardContent className="py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold">{order.orderReference}</p>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-6 text-sm">
                        <div>
                          <span className="text-gray-600">Vendor: </span>
                          <span>{order.vendor?.companyName}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Date: </span>
                          <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Amount: </span>
                          <span className="font-bold text-purple-600">₹{parseFloat(order.totalAmount).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    {order.invoices?.length > 0 && (
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Invoice
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Invoices */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {orders.filter(o => o.invoices?.length > 0).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No invoices yet</p>
              </CardContent>
            </Card>
          ) : (
            orders.filter(o => o.invoices?.length > 0).map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between">
                    <span>Invoice - {order.orderReference}</span>
                    <span className={`px-3 py-1 rounded text-sm ${
                      order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                      order.paymentStatus === 'PARTIAL' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Invoice #</p>
                      <p className="font-medium">{order.invoices[0]?.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium">{new Date(order.invoices[0]?.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Amount Due</p>
                      <p className="font-bold text-purple-600">₹{parseFloat(order.invoices[0]?.amountDue || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Paid</p>
                      <p className="font-bold text-green-600">₹{parseFloat(order.invoices[0]?.amountPaid || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {order.paymentStatus !== 'PAID' && (
                      <Button
                        onClick={() => handlePayNow(order.invoices[0].id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay ₹{parseFloat((order.invoices[0]?.amountDue || 0) - (order.invoices[0]?.amountPaid || 0)).toFixed(2)}
                      </Button>
                    )}
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
