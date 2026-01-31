import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { reportAPI } from '@/lib/api';
import { DollarSign, TrendingUp, Package, Users, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
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

export default function Reports() {
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState('pie'); // 'pie' or 'trend'
  const [revenueData, setRevenueData] = useState({
    total: 0,
    thisMonth: 0,
    lastMonth: 0,
    growth: 0
  });
  const [revenueHistory, setRevenueHistory] = useState([]);

  useEffect(() => {
    fetchReports();
    fetchRevenueHistory();
  }, [period]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await reportAPI.getDashboard();
      const data = response.data.data;
      
      setRevenueData({
        total: data.totalRevenue || 0,
        thisMonth: data.monthlyRevenue || 0,
        lastMonth: data.lastMonthRevenue || 0,
        growth: data.growth || 0
      });
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueHistory = async () => {
    try {
      // Get last 6 months of revenue data
      const response = await reportAPI.getRevenue({ groupBy: 'month' });
      const data = response.data.data;
      
      // Transform data for chart
      const chartData = data.data?.slice(-6).map(item => ({
        period: item.period,
        revenue: item.totalRevenue,
        orders: item.orderCount
      })) || [];
      
      setRevenueHistory(chartData);
    } catch (error) {
      console.error('Failed to fetch revenue history:', error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 mt-2">Track your business performance</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'week' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'month' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'year' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            This Year
          </button>
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{revenueData.total.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{revenueData.thisMonth.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Current period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Last Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{revenueData.lastMonth.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Previous period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              revenueData.growth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {revenueData.growth >= 0 ? '+' : ''}{revenueData.growth}%
            </div>
            <p className="text-xs text-gray-500 mt-1">vs last period</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Visualization */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Revenue Visualization</CardTitle>
            <div className="flex border rounded-md">
              <button
                onClick={() => setChartType('pie')}
                className={`px-3 py-1 text-sm ${
                  chartType === 'pie' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } rounded-l-md`}
              >
                Pie Chart
              </button>
              <button
                onClick={() => setChartType('trend')}
                className={`px-3 py-1 text-sm ${
                  chartType === 'trend' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } rounded-r-md`}
              >
                Trend Line
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {revenueHistory.length === 0 ? (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No revenue data available yet</p>
              </div>
            </div>
          ) : chartType === 'pie' ? (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={revenueHistory}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={(entry) => `${entry.period}: ₹${entry.revenue.toLocaleString()}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {revenueHistory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  name="Revenue"
                  dot={{ fill: '#8b5cf6', r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Orders"
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueData.thisMonth === 0 && revenueData.lastMonth === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No comparison data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { month: 'Last Month', revenue: revenueData.lastMonth },
                { month: 'This Month', revenue: revenueData.thisMonth }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
