import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { orderAPI } from '@/lib/api';
import { DollarSign, TrendingUp, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VendorEarnings() {
  const [earnings, setEarnings] = useState({
    total: 0,
    thisMonth: 0,
    orders: [],
    monthlyData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const response = await orderAPI.getVendorOrders();
      const orders = response.data.data;

      const completedOrders = orders.filter(o => 
        ['INVOICED', 'RETURNED'].includes(o.status)
      );

      const total = completedOrders.reduce((sum, o) => 
        sum + parseFloat(o.totalAmount), 0
      );

      const thisMonth = completedOrders
        .filter(o => {
          const date = new Date(o.createdAt);
          const now = new Date();
          return date.getMonth() === now.getMonth() && 
                 date.getFullYear() === now.getFullYear();
        })
        .reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);

      setEarnings({
        total,
        thisMonth,
        orders: completedOrders,
        monthlyData: []
      });
    } catch (error) {
      toast.error('Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Earnings</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Earnings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{earnings.total.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              This Month
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{earnings.thisMonth.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completed Orders
            </CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{earnings.orders.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.orders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No earnings yet</p>
          ) : (
            <div className="space-y-4">
              {earnings.orders.slice(0, 10).map((order) => (
                <div key={order.id} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <p className="font-medium">Order #{order.orderRef}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-600">
                      ₹{parseFloat(order.totalAmount).toFixed(2)}
                    </p>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
