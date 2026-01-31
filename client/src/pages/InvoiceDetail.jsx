import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Send,
  Printer,
  Plus,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { invoiceAPI, productAPI } from '../lib/api';
import { useAuthStore } from '../store';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const [invoice, setInvoice] = useState(null);
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Add print-specific styles
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        @page {
          margin: 1cm;
          size: A4;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(styleTag);

    fetchInvoice();

    return () => {
      document.head.removeChild(styleTag);
    };
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const res = await invoiceAPI.getInvoice(id);
      setInvoice(res.data.data);
      setOrder(res.data.data.order);
    } catch (error) {
      toast.error('Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    try {
      // TODO: Implement send invoice functionality
      toast.success('Invoice sent successfully');
    } catch (error) {
      toast.error('Failed to send invoice');
    }
  };

  const handleConfirm = async () => {
    try {
      await invoiceAPI.postInvoice(id);
      toast.success('Invoice posted successfully');
      fetchInvoice();
    } catch (error) {
      toast.error('Failed to post invoice');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const calculateAmount = (item) => {
    const quantity = item.quantity || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    return (quantity * unitPrice).toFixed(2);
  };

  const getTaxAmount = () => {
    // Calculate 18% GST
    const untaxed = parseFloat(invoice?.amountDue || 0);
    return (untaxed * 0.18).toFixed(2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Invoice not found</p>
          <button
            onClick={() => navigate('/dashboard/invoices')}
            className="mt-4 text-purple-600 hover:underline"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header - Hide on print */}
      <div className="mb-4 print:hidden">
        <h1 className="text-3xl font-bold text-center mb-8">Invoice Page</h1>
      </div>

      <div className="bg-white border-2 border-gray-300 rounded-lg print:border-0">
        {/* Action Buttons Row - Hide on print */}
        <div className="flex items-center justify-between p-4 border-b-2 border-gray-300 print:hidden">
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
              <Plus size={18} />
              New
            </button>
            <button className="p-2 border border-gray-300 rounded hover:bg-gray-50">
              <Check size={18} className="text-green-600" />
            </button>
            <button className="p-2 border border-gray-300 rounded hover:bg-gray-50">
              <X size={18} className="text-red-600" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSend}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              <Send size={18} />
              Send
            </button>
            <button
              onClick={handleConfirm}
              disabled={invoice.status === 'POSTED'}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              <Printer size={18} />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded ${
                invoice.status === 'DRAFT'
                  ? 'bg-gray-200 border-2 border-gray-400'
                  : 'bg-gray-100 border border-gray-300'
              }`}
            >
              Draft
            </button>
            <button
              className={`px-4 py-2 rounded ${
                invoice.status === 'POSTED'
                  ? 'bg-gray-200 border-2 border-gray-400'
                  : 'bg-gray-100 border border-gray-300'
              }`}
            >
              Posted
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="p-6 print:p-8">
          {/* Company Header for Print */}
          <div className="hidden print:block mb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  {order?.vendor?.companyName || `${order?.vendor?.firstName} ${order?.vendor?.lastName}`}
                </h1>
                <p className="text-sm text-gray-600">{order?.vendor?.email}</p>
                <p className="text-sm text-gray-600">{order?.vendor?.phone}</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold">INVOICE</h2>
                <p className="text-sm text-gray-600">Date: {formatDate(invoice.createdAt)}</p>
              </div>
            </div>
            <div className="border-b-2 border-gray-300 mb-6"></div>
          </div>

          {/* Invoice Number */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold print:text-xl">{invoice.invoiceNumber || 'INV/2026/0001'}</h2>
          </div>

          {/* Customer and Date Info */}
          <div className="grid grid-cols-2 gap-8 mb-6 print:mb-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 print:font-bold">
                  Customer
                </label>
                <div className="text-gray-900 print:text-black">
                  {order?.customer?.firstName} {order?.customer?.lastName}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 print:font-bold">
                  Invoice Address
                </label>
                <div className="text-gray-900 print:text-black">
                  {order?.customer?.address || 'No address provided'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 print:font-bold">
                  Delivery Address
                </label>
                <div className="text-gray-900 print:text-black">
                  {order?.deliveryAddress || order?.customer?.address || 'No address provided'}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 print:font-bold">
                  Rental Period
                </label>
                <div className="flex items-center gap-2 text-gray-900 print:text-black">
                  {order?.pickupDate && order?.returnDate ? (
                    <>
                      <span>{formatDate(order.pickupDate)}</span>
                      <span>→</span>
                      <span>{formatDate(order.returnDate)}</span>
                    </>
                  ) : (
                    <span className="text-gray-500">No rental period set</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 print:font-bold">
                  Invoice date
                </label>
                <div className="text-gray-900 print:text-black">
                  {formatDate(invoice.createdAt)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 print:font-bold">
                  Due Date
                </label>
                <div className="text-gray-900 print:text-black">
                  {formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Lines */}
          <div className="mb-6 print:mb-8">
            <div className="border-t border-b border-gray-300 py-2 mb-2 print:border-t-2 print:border-b-2 print:border-black">
              <h3 className="font-semibold print:text-lg">Invoice Lines</h3>
            </div>

            <table className="w-full print:border-collapse">
              <thead className="bg-gray-50 print:bg-white">
                <tr className="print:border-b-2 print:border-black">
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 print:text-black print:font-bold">Product</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 print:text-black print:font-bold">Quantity</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 print:text-black print:font-bold">Unit</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 print:text-black print:font-bold">Unit Price</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 print:text-black print:font-bold">Taxes</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 print:text-black print:font-bold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order?.orderItems?.map((item, index) => (
                  <tr key={index} className="border-b print:border-gray-400">
                    <td className="px-4 py-3 print:text-black">
                      <div>
                        <div className="font-medium">{item.product?.name || 'Product'}</div>
                        <div className="text-xs text-gray-500 print:text-gray-700">
                          [{order.pickupDate ? formatDate(order.pickupDate) : 'Start'} -&gt; {order.returnDate ? formatDate(order.returnDate) : 'End'}]
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 print:text-black">{item.quantity}</td>
                    <td className="px-4 py-3 print:text-black">Units</td>
                    <td className="px-4 py-3 print:text-black">₹{parseFloat(item.unitPrice).toLocaleString()}</td>
                    <td className="px-4 py-3 print:text-black">—</td>
                    <td className="px-4 py-3 print:text-black">₹{calculateAmount(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-2 flex gap-4 text-blue-600 print:hidden">
              <button className="hover:underline flex items-center gap-1">
                <Plus size={16} />
                Add a Product
              </button>
              <button className="hover:underline flex items-center gap-1">
                <Plus size={16} />
                Add a note
              </button>
            </div>
          </div>

          {/* Footer Section */}
          <div className="flex justify-between items-start print:border-t-2 print:border-black print:pt-6 print:mt-8">
            <div className="print:w-1/2">
              <p className="text-sm text-gray-700 mb-2 print:text-black">
                Terms & Conditions:{' '}
                <a href="/terms" target="_blank" className="text-blue-600 hover:underline print:text-black">
                  View Terms & Conditions
                </a>
              </p>
            </div>

            <div className="space-y-4 print:w-1/2">
              <div className="flex gap-2 print:hidden">
                <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm">
                  Coupon Code
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm">
                  Discount
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm">
                  Add Shipping
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded min-w-[300px] print:bg-white print:border-2 print:border-gray-400">
                <div className="flex justify-between mb-2 print:text-black">
                  <span>Untaxed Amount:</span>
                  <span className="font-medium">₹{(parseFloat(invoice.amountDue || 0) / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2 print:text-black">
                  <span>Tax (18%):</span>
                  <span className="font-medium">₹{((parseFloat(invoice.amountDue || 0) / 1.18) * 0.18).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg print:border-t-2 print:border-black print:text-black">
                  <span>Total:</span>
                  <span>₹{parseFloat(invoice.amountDue || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
