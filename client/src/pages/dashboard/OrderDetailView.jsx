import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { orderAPI, productAPI, customerAPI, invoiceAPI } from '@/lib/api';
import { ArrowLeft, Send, Printer, FileText, Plus, X, Check, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

export default function OrderDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictDetails, setConflictDetails] = useState([]);
  const [paymentLink, setPaymentLink] = useState(null);

  // Editable fields
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    pickupDate: '',
    returnDate: '',
    orderItems: [],
    discount: 0,
    shipping: 0,
    taxRate: 0,
    notes: ''
  });

  useEffect(() => {
    fetchOrder();
    fetchProducts();
    fetchCustomers();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await orderAPI.getById(id);
      const orderData = response.data.data;
      setOrder(orderData);
      
      // Initialize form data
      // Get dates from first orderItem since all items have same rental period
      const firstItem = orderData.orderItems[0];
      setFormData({
        customerId: orderData.customerId,
        pickupDate: firstItem?.rentalStart?.split('T')[0] || orderData.pickupDate?.split('T')[0] || '',
        returnDate: firstItem?.rentalEnd?.split('T')[0] || orderData.returnDate?.split('T')[0] || '',
        orderItems: orderData.orderItems.map(item => ({
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice
        })),
        discount: orderData.discount || 0,
        shipping: orderData.shipping || 0,
        taxRate: orderData.taxRate || 0,
        notes: orderData.notes || ''
      });
    } catch (error) {
      toast.error('Failed to load order');
      navigate('/dashboard/orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productAPI.getProducts();
      setProducts(response.data.data.filter(p => p.vendorId === user.id));
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customerAPI.getAll();
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const handleApprove = async () => {
    try {
      await orderAPI.approve(order.id);
      toast.success('Quotation approved! Awaiting customer payment.');
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve quotation');
    }
  };

  const handlePickup = async () => {
    if (!confirm('Mark order as picked up?')) return;
    try {
      await orderAPI.pickup(order.id);
      toast.success('Order marked as picked up!');
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process pickup');
    }
  };

  const handleReturn = async () => {
    if (!confirm('Mark order as returned?')) return;
    try {
      const response = await orderAPI.return(order.id);
      if (response.data.data.isLate) {
        toast.success(`Order returned with late fee: ₹${response.data.data.lateFee.toFixed(2)}`);
      } else {
        toast.success('Order returned successfully!');
      }
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process return');
    }
  };

  const handleReject = async () => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;

    try {
      await orderAPI.reject(order.id, { reason });
      toast.success('Quotation rejected');
      navigate('/dashboard/orders');
    } catch (error) {
      toast.error('Failed to reject quotation');
    }
  };

  const handleSendQuotation = async () => {
    try {
      await orderAPI.send(order.id);
      toast.success('Quotation sent to customer');
      fetchOrder();
    } catch (error) {
      toast.error('Failed to send quotation');
    }
  };

  const handleConfirmOrder = async () => {
    if (hasConflict) {
      if (!window.confirm('⚠️ Stock conflict detected! Items may not be available. Continue anyway?')) {
        return;
      }
    }

    try {
      await orderAPI.confirm(order.id);
      toast.success('Order confirmed! Stock has been reserved.');
      fetchOrder();
    } catch (error) {
      if (error.response?.data?.conflicts) {
        const conflicts = error.response.data.conflicts;
        setHasConflict(true);
        setConflictDetails(conflicts);
        
        const conflictMsg = conflicts.map(c => 
          `${c.productName}: Need ${c.requestedQty}, Available ${c.availableQty}`
        ).join('\n');
        
        toast.error(
          <div>
            <p className="font-bold">Cannot Confirm - Stock Conflict!</p>
            <pre className="text-xs mt-2 whitespace-pre-wrap">{conflictMsg}</pre>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.error('Failed to confirm order');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCreateInvoice = async () => {
    try {
      await orderAPI.createInvoice(order.id);
      toast.success('Invoice created successfully');
      fetchOrder();
    } catch (error) {
      toast.error('Failed to create invoice');
    }
  };

  const handleSendInvoice = async () => {
    if (!order.invoices || order.invoices.length === 0) {
      toast.error('No invoice found for this order');
      return;
    }

    try {
      const response = await invoiceAPI.sendInvoice(order.invoices[0].id);
      const link = response.data.data.paymentLink;
      setPaymentLink(link);
      
      toast.success(
        <div>
          <p>Invoice sent successfully with payment link!</p>
          <p className="text-xs mt-1">Email sent to customer</p>
        </div>,
        { duration: 5000 }
      );
      
      fetchOrder();
    } catch (error) {
      toast.error('Failed to send invoice');
    }
  };

  const handleAddProduct = () => {
    setFormData({
      ...formData,
      orderItems: [
        ...formData.orderItems,
        { productId: '', productName: '', quantity: 1, unitPrice: 0, total: 0 }
      ]
    });
  };

  const handleRemoveProduct = (index) => {
    const newItems = formData.orderItems.filter((_, i) => i !== index);
    setFormData({ ...formData, orderItems: newItems });
  };

  const handleProductChange = (index, field, value) => {
    const newItems = [...formData.orderItems];
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          productId: value,
          productName: product.name,
          unitPrice: parseFloat(product.rentPrice),
          total: newItems[index].quantity * parseFloat(product.rentPrice)
        };
      }
    } else if (field === 'quantity') {
      newItems[index][field] = parseInt(value) || 0;
      newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
    } else {
      newItems[index][field] = value;
    }
    
    setFormData({ ...formData, orderItems: newItems });
  };

  const calculateSubtotal = () => {
    return formData.orderItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    return (calculateSubtotal() * (formData.taxRate / 100));
  };

  const calculateTotal = () => {
    return calculateSubtotal() - formData.discount + formData.shipping + calculateTax();
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'bg-purple-100 text-purple-800',
      SENT: 'bg-purple-100 text-purple-800',
      SALE: 'bg-orange-100 text-orange-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      INVOICED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-red-100 text-red-800',
      RETURNED: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  const showActions = ['QUOTATION', 'APPROVED', 'CONFIRMED', 'INVOICED', 'PICKEDUP'].includes(order.status);
  const canApprove = order.status === 'QUOTATION';
  const canConfirm = order.status === 'APPROVED';
  const canSend = order.status === 'QUOTATION';
  const canCreateInvoice = order.status === 'CONFIRMED' && !order.invoices?.length;
  const canSendInvoice = order.status === 'INVOICED' && order.invoices?.length > 0;
  const canPickup = (order.status === 'CONFIRMED' || order.status === 'INVOICED') && order.paymentStatus === 'PAID';
  const canReturn = order.status === 'PICKEDUP';

  return (
    <div className="max-w-7xl mx-auto">
      {/* Conflict Warning Banner */}
      {hasConflict && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-red-900">⚠️ Stock Conflict Detected</h3>
              <p className="text-sm text-red-800 mt-1">
                New orders came in since this quotation was created. Some products may no longer be available for these dates.
              </p>
              {conflictDetails.length > 0 && (
                <div className="mt-3 space-y-2">
                  {conflictDetails.map((conflict, idx) => (
                    <div key={idx} className="text-xs bg-white p-2 rounded border border-red-200">
                      <span className="font-semibold">{conflict.productName}:</span> Requested {conflict.requestedQty}, Available {conflict.availableQty}
                      <br />
                      <span className="text-gray-600">
                        Dates: {new Date(conflict.dateRange?.startDate).toLocaleDateString()} - {new Date(conflict.dateRange?.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header Section with Title and Status Badges */}
      <div className="mb-6">;
        {/* Title Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/orders')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2"
              >
                New
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold">Rental order</span>
                <Check className="text-green-600" size={20} />
                <X className="text-red-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons and Status Badges Row */}
        <div className="flex items-center justify-between">
          {/* Left: Action Buttons */}
          <div className="flex gap-3 print:hidden">
            {canApprove && (
              <>
                <Button
                  onClick={handleApprove}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={handleReject}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 px-6 py-2"
                >
                  Reject
                </Button>
              </>
            )}
            {canSend && (
              <Button
                onClick={handleSendQuotation}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
              >
                Send
              </Button>
            )}
            {canConfirm && (
              <Button
                onClick={handleConfirmOrder}
                variant="outline"
                className="border-gray-300 px-6 py-2"
              >
                Confirm
              </Button>
            )}
            <Button
              onClick={handlePrint}
              variant="outline"
              className="border-gray-300 px-6 py-2"
            >
              Print
            </Button>
            {canCreateInvoice && (
              <Button
                onClick={handleCreateInvoice}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
              >
                Create Invoice
              </Button>
            )}
            {canSendInvoice && (
              <Button
                onClick={handleSendInvoice}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Invoice
              </Button>
            )}
            {canPickup && (
              <Button
                onClick={handlePickup}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2"
              >
                Mark as Picked Up
              </Button>
            )}
            {canReturn && (
              <Button
                onClick={handleReturn}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              >
                Mark as Returned
              </Button>
            )}
          </div>

          {/* Right: Status Badges */}
          <div className="flex gap-3">
            <div className={`px-4 py-2 rounded border-2 text-sm font-medium ${order.status === 'QUOTATION' ? 'border-gray-600 bg-gray-50 text-gray-700' : 'border-gray-300 bg-white text-gray-600'}`}>
              Quotation
            </div>
            <div className={`px-4 py-2 rounded border-2 text-sm font-medium ${order.status === 'APPROVED' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-300 bg-white text-gray-600'}`}>
              Approved
            </div>
            <div className={`px-4 py-2 rounded border-2 text-sm font-medium ${order.status === 'CONFIRMED' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-300 bg-white text-gray-600'}`}>
              Confirmed
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">{order.orderReference}</h2>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold">{order.customer?.firstName} {order.customer?.lastName}</p>
                <p className="text-sm text-gray-600">{order.customer?.email}</p>
                <p className="text-sm text-gray-600">{order.customer?.phoneNumber}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rental Period</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={formData.pickupDate}
                    readOnly
                    className="flex-1 p-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default"
                  />
                  <span className="text-gray-500">→</span>
                  <input
                    type="date"
                    value={formData.returnDate}
                    readOnly
                    className="flex-1 p-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order Date</label>
                <input
                  type="text"
                  value={formatDate(order.createdAt)}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Address</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{order.customer?.address || 'No address provided'}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{order.customer?.address || 'Same as invoice address'}</p>
              </div>
            </div>
          </div>

          {/* Payment Link Section */}
          {paymentLink && order.status === 'INVOICED' && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText className="text-purple-600 mt-1" size={20} />
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900 mb-2">Payment Link Generated</h3>
                  <p className="text-sm text-purple-700 mb-3">Share this link with the customer to complete payment:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={paymentLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm font-mono"
                    />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(paymentLink);
                        toast.success('Payment link copied to clipboard!');
                      }}
                      variant="outline"
                      className="border-purple-600 text-purple-600 hover:bg-purple-50"
                    >
                      Copy
                    </Button>
                    <Button
                      onClick={() => window.open(paymentLink, '_blank')}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Open Link
                    </Button>
                  </div>
                  <p className="text-xs text-purple-600 mt-2">✉️ Email has been sent to customer with payment instructions</p>
                </div>
              </div>
            </div>
          )}

          {/* Order Lines */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Order Line</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Product</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Quantity</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Unit</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Unit Price</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Taxes</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {formData.orderItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        {item.productName}
                        <div className="text-xs text-gray-500">
                          {formatDate(formData.pickupDate)} → {formatDate(formData.returnDate)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-center">Units</td>
                      <td className="px-4 py-3 text-right">₹{Number(item.unitPrice).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">—</td>
                      <td className="px-4 py-3 text-right font-medium">₹{Number(item.total).toLocaleString()}</td>
                    </tr>
                  ))}
                  {order.downPayment > 0 && (
                    <tr>
                      <td className="px-4 py-3 font-medium">Downpayment</td>
                      <td className="px-4 py-3 text-center">{formData.orderItems[0]?.quantity || 1}</td>
                      <td className="px-4 py-3 text-center">Units</td>
                      <td className="px-4 py-3 text-right">—</td>
                      <td className="px-4 py-3 text-right">—</td>
                      <td className="px-4 py-3 text-right font-medium">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-4 text-blue-600 print:hidden">
              <button className="hover:underline flex items-center gap-1 text-sm">
                <Plus size={16} />
                Add a Product
              </button>
              <button className="hover:underline flex items-center gap-1 text-sm">
                <Plus size={16} />
                Add a note
              </button>
            </div>
          </div>

          {/* Footer Section */}
          <div className="flex justify-between items-start border-t pt-6">
            <div className="max-w-md">
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Terms & Conditions:</span>{' '}
                <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                  View standard rental terms
                </a>
              </p>
              <p className="text-xs text-gray-500 mt-4">
                Note: Downpayments, Deposits, and Taxes should be taken into consideration while calculating total amount
              </p>
            </div>

            <div className="space-y-3 min-w-[300px]">
              <div className="flex gap-2 print:hidden">
                <Button variant="outline" size="sm" className="flex-1">
                  Coupon Code
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Discount
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Add Shipping
                </Button>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Untaxed Amount:</span>
                  <span className="font-medium">₹{Number(calculateSubtotal()).toLocaleString()}</span>
                </div>
                {formData.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>- ₹{Number(formData.discount).toLocaleString()}</span>
                  </div>
                )}
                {formData.shipping > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping:</span>
                    <span className="font-medium">₹{Number(formData.shipping).toLocaleString()}</span>
                  </div>
                )}
                {formData.taxRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax ({formData.taxRate}%):</span>
                    <span className="font-medium">₹{Number(calculateTax()).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>₹{Number(order.totalAmount).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
