import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { invoiceAPI } from '@/lib/api';
import { Download, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Invoice() {
  const { orderId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [orderId]);

  const fetchInvoice = async () => {
    try {
      // Fetch invoice by order ID or invoice ID
      const response = await invoiceAPI.getInvoiceByOrderId(orderId);
      setInvoice(response.data.data);
    } catch (error) {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-3xl font-bold">Invoice</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-2">
                Invoice #{invoice.invoiceNumber}
              </CardTitle>
              <p className="text-sm text-gray-600">
                Order: {invoice.order?.orderReference}
              </p>
              <p className="text-sm">
                Status: <span className={`px-2 py-1 rounded ${
                  invoice.status === 'POSTED' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {invoice.status}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Issue Date</p>
              <p className="font-medium">
                {new Date(invoice.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-2">From:</h3>
              <p className="text-sm">
                {invoice.order?.vendor?.companyName || 
                 `${invoice.order?.vendor?.firstName} ${invoice.order?.vendor?.lastName}`}
              </p>
              <p className="text-sm text-gray-600">{invoice.order?.vendor?.email}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">To:</h3>
              <p className="text-sm">
                {`${invoice.order?.customer?.firstName} ${invoice.order?.customer?.lastName}`}
              </p>
              <p className="text-sm text-gray-600">{invoice.order?.customer?.email}</p>
              {invoice.order?.address && (
                <p className="text-sm text-gray-600">{invoice.order.address}</p>
              )}
            </div>
          </div>

          <div className="border-t border-b py-4 mb-4">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-600">
                  <th className="pb-2">Item</th>
                  <th className="pb-2">Rental Period</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.order?.orderItems?.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="py-3">{item.product?.name}</td>
                    <td className="py-3 text-sm text-gray-600">
                      {new Date(item.rentalStart).toLocaleDateString()} - {new Date(item.rentalEnd).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right">₹{parseFloat(item.unitPrice).toFixed(2)}</td>
                    <td className="py-3 text-right font-medium">
                      ₹{(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{(parseFloat(invoice.amountDue || 0) / 1.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST (18%):</span>
                <span className="font-medium">₹{((parseFloat(invoice.amountDue || 0) / 1.18) * 0.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-purple-600">₹{parseFloat(invoice.amountDue || 0).toFixed(2)}</span>
              </div>
              {invoice.amountPaid > 0 && (
                <div className="flex justify-between text-green-600 border-t pt-2">
                  <span>Paid:</span>
                  <span>₹{parseFloat(invoice.amountPaid || 0).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
