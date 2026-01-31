import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { invoiceAPI } from '@/lib/api';
import { FileText, Download, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: '',
    search: ''
  });

  useEffect(() => {
    fetchInvoices();
  }, [filter]);

  const fetchInvoices = async () => {
    try {
      const response = await invoiceAPI.getInvoices(filter);
      setInvoices(response.data.data);
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (invoiceId) => {
    const amount = prompt('Enter payment amount:');
    if (!amount || amount.trim() === '') return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      await invoiceAPI.recordPayment(invoiceId, parsedAmount);
      toast.success('Payment recorded successfully');
      fetchInvoices();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      POSTED: 'bg-blue-100 text-blue-800',
      PAID: 'bg-green-100 text-green-800',
      PARTIAL: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const calculateTotalRevenue = () => {
    return invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + parseFloat(inv.order?.totalAmount || 0), 0);
  };

  const calculatePendingRevenue = () => {
    return invoices
      .filter(inv => ['DRAFT', 'POSTED'].includes(inv.status))
      .reduce((sum, inv) => sum + parseFloat(inv.order?.totalAmount || 0), 0);
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Invoicing & Payments</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue (Paid)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ₹{calculateTotalRevenue().toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              ₹{calculatePendingRevenue().toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Invoices
            </CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search by invoice reference or order..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="flex-1"
            />
            <select
              className="border rounded-md px-3 py-2"
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="POSTED">Posted</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No invoices found</p>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex justify-between items-center border-b pb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-semibold">Invoice #{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-600">
                          Order: {invoice.order?.orderReference}
                        </p>
                        <p className="text-sm text-gray-500">
                          Vendor: {invoice.order?.vendor?.companyName || invoice.order?.vendor?.firstName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{parseFloat(invoice.order?.totalAmount || 0).toFixed(2)}</p>
                      <p className="text-sm text-gray-600">
                        GST: ₹{(parseFloat(invoice.order?.totalAmount || 0) * 0.18).toFixed(2)}
                      </p>
                    </div>

                    <span className={`px-3 py-1 rounded text-sm ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>

                    <div className="flex gap-2">
                      {invoice.status !== 'PAID' && (
                        <Button
                          size="sm"
                          onClick={() => handleRecordPayment(invoice.id)}
                        >
                          Record Payment
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/invoice/${invoice.orderId}`, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
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
