import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminAPI } from '@/lib/api';
import { Download, TrendingUp, Package, Users, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [vendorChartType, setVendorChartType] = useState('bar'); // 'bar' or 'pie'
  const [productChartType, setProductChartType] = useState('pie'); // 'bar' or 'pie'
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState({
    revenue: {
      total: 0,
      byVendor: [],
      byPeriod: []
    },
    products: {
      mostRented: [],
      totalProducts: 0
    },
    vendors: {
      topPerformers: [],
      totalVendors: 0
    },
    orders: {
      total: 0,
      byStatus: [],
      lateReturns: []
    }
  });

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    try {
      const response = await adminAPI.getReports(dateRange);
      setReportData(response.data.data);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async (reportType) => {
    try {
      await adminAPI.exportReport(reportType, 'pdf', dateRange);
      toast.success(`${reportType} report exported successfully`);
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const handleExportCSV = async (reportType) => {
    try {
      const response = await adminAPI.exportReport(reportType, 'csv', dateRange);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report-${Date.now()}.csv`;
      a.click();
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExportCSV('all')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => handleExportPDF('all')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="border rounded-md px-3 py-2 ml-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="border rounded-md px-3 py-2 ml-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ₹{reportData.revenue.total.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Orders
            </CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reportData.orders.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Vendors
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reportData.vendors.totalVendors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reportData.products.totalProducts}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue by Vendor - Toggle between Bar and Pie Chart */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Vendor-Wise Revenue</CardTitle>
              <div className="flex gap-2">
                <div className="flex border rounded-md">
                  <button
                    onClick={() => setVendorChartType('bar')}
                    className={`px-3 py-1 text-sm ${
                      vendorChartType === 'bar' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    } rounded-l-md`}
                  >
                    Bar
                  </button>
                  <button
                    onClick={() => setVendorChartType('pie')}
                    className={`px-3 py-1 text-sm ${
                      vendorChartType === 'pie' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    } rounded-r-md`}
                  >
                    Pie
                  </button>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleExportCSV('vendor-revenue')}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {reportData.revenue.byVendor.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No data available</p>
            ) : vendorChartType === 'bar' ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.revenue.byVendor}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.revenue.byVendor}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {reportData.revenue.byVendor.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Most Rented Products - Toggle between Pie and Bar Chart */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Most Rented Products</CardTitle>
              <div className="flex gap-2">
                <div className="flex border rounded-md">
                  <button
                    onClick={() => setProductChartType('pie')}
                    className={`px-3 py-1 text-sm ${
                      productChartType === 'pie' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    } rounded-l-md`}
                  >
                    Pie
                  </button>
                  <button
                    onClick={() => setProductChartType('bar')}
                    className={`px-3 py-1 text-sm ${
                      productChartType === 'bar' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    } rounded-r-md`}
                  >
                    Bar
                  </button>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleExportCSV('top-products')}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {reportData.products.mostRented.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No data available</p>
            ) : productChartType === 'pie' ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.products.mostRented.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="bookings"
                  >
                    {reportData.products.mostRented.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.products.mostRented.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bookings" fill="#ec4899" name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.orders.byStatus.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.orders.byStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#10b981" name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Late Returns Summary */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Late Returns Summary</CardTitle>
              <Button size="sm" variant="outline" onClick={() => handleExportCSV('late-returns')}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {reportData.orders.lateReturns.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No late returns</p>
            ) : (
              <div className="space-y-3">
                {reportData.orders.lateReturns.map((order, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium">Order #{order.orderRef}</p>
                      <p className="text-sm text-gray-500">{order.vendor}</p>
                    </div>
                    <span className="text-red-600 font-bold">₹{order.lateFee.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
