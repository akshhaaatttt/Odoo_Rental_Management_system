import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminAPI } from '@/lib/api';
import { Package, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminReturns() {
  const [returns, setReturns] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReturnsData();
  }, []);

  const fetchReturnsData = async () => {
    try {
      const response = await adminAPI.getReturnsOverview();
      setReturns(response.data.data.returns);
      setPickups(response.data.data.pickups);
    } catch (error) {
      toast.error('Failed to load returns data');
    } finally {
      setLoading(false);
    }
  };

  const calculateLateReturns = () => {
    return returns.filter(r => r.isLate).length;
  };

  const calculateOnTimeReturns = () => {
    return returns.filter(r => !r.isLate && r.isReturned).length;
  };

  const calculatePendingReturns = () => {
    return returns.filter(r => !r.isReturned).length;
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Pickup & Return Oversight</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Pickups
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pickups.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Returns
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {calculatePendingReturns()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Late Returns
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {calculateLateReturns()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              On-Time Returns
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {calculateOnTimeReturns()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pickups Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Pickups</CardTitle>
        </CardHeader>
        <CardContent>
          {pickups.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No pickups yet</p>
          ) : (
            <div className="space-y-4">
              {pickups.slice(0, 10).map((pickup) => (
                <div key={pickup.id} className="flex justify-between items-center border-b pb-3">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-semibold">Order #{pickup.orderRef}</p>
                      <p className="text-sm text-gray-600">
                        Vendor: {pickup.vendor?.companyName || pickup.vendor?.firstName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Customer: {pickup.customer?.firstName} {pickup.customer?.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Pickup Date</p>
                    <p className="font-medium">
                      {new Date(pickup.pickupDate).toLocaleDateString()}
                    </p>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                      Picked Up
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Returns Section */}
      <Card>
        <CardHeader>
          <CardTitle>Return Status</CardTitle>
        </CardHeader>
        <CardContent>
          {returns.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No returns data</p>
          ) : (
            <div className="space-y-4">
              {returns.map((returnItem) => (
                <div key={returnItem.id} className="flex justify-between items-center border-b pb-3">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-semibold">Order #{returnItem.orderRef}</p>
                      <p className="text-sm text-gray-600">
                        Vendor: {returnItem.vendor?.companyName || returnItem.vendor?.firstName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Expected: {new Date(returnItem.rentalEnd).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {returnItem.isReturned ? (
                      <>
                        <p className="text-sm text-gray-600">Return Date</p>
                        <p className="font-medium">
                          {new Date(returnItem.returnDate).toLocaleDateString()}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          returnItem.isLate 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {returnItem.isLate ? 'Late Return' : 'On Time'}
                        </span>
                        {returnItem.lateFee > 0 && (
                          <p className="text-sm text-red-600 mt-1">
                            Late Fee: ₹{parseFloat(returnItem.lateFee).toFixed(2)}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">Status</p>
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                          Pending Return
                        </span>
                        {new Date() > new Date(returnItem.rentalEnd) && (
                          <p className="text-sm text-red-600 mt-1">
                            <AlertCircle className="h-4 w-4 inline mr-1" />
                            Overdue
                          </p>
                        )}
                      </>
                    )}
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
