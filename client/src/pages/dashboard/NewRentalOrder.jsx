import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Send,
  CheckCircle,
  Printer,
  FileText,
  Plus,
  Trash2,
  Save,
  Check,
  X,
  AlertTriangle,
  Clock,
  Ban
} from 'lucide-react';
import { orderAPI, productAPI } from '../../lib/api';
import { useAuthStore } from '../../store';
import { Button } from '@/components/ui/button';
import DownloadInvoiceButton from '../../components/DownloadInvoiceButton';

// Order Status Constants matching the system
const ORDER_STATUS = {
  DRAFT: 'DRAFT',           // New - not sent
  QUOTATION: 'QUOTATION',   // Customer request (no stock reserved)
  SENT: 'SENT',             // Quotation sent to customer
  SALE: 'SALE',             // When quotation is confirmed (becomes sale order)
  APPROVED: 'APPROVED',     // Vendor approved (awaiting payment)
  CONFIRMED: 'CONFIRMED',   // Stock reserved (hard reservation)
  INVOICED: 'INVOICED',
  PICKEDUP: 'PICKEDUP',
  RETURNED: 'RETURNED',
  LATE: 'LATE',
  CANCELLED: 'CANCELLED'
};

// Status Labels for Display
const STATUS_LABELS = {
  DRAFT: 'Quotation',
  QUOTATION: 'Quotation',
  SENT: 'Quotation Sent',
  SALE: 'Sale Order',
  APPROVED: 'Awaiting Payment',
  CONFIRMED: 'Confirmed',
  INVOICED: 'Invoiced',
  PICKEDUP: 'In Progress',
  RETURNED: 'Completed',
  LATE: 'Overdue',
  CANCELLED: 'Cancelled'
};

export default function NewRentalOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [availabilityConflicts, setAvailabilityConflicts] = useState([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      customerName: '',
      customerEmail: '',
      invoiceAddress: '',
      deliveryAddress: '',
      pickupDate: '',
      returnDate: '',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryMethod: 'PICKUP',
      orderItems: [{ productId: '', quantity: 1, unitPrice: 0 }],
      discount: 0,
      shipping: 0,
      downPayment: 0,
      taxRate: 18,
      couponCode: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'orderItems'
  });

  const watchOrderItems = watch('orderItems');
  const watchPickupDate = watch('pickupDate');
  const watchReturnDate = watch('returnDate');
  const watchDiscount = watch('discount');
  const watchShipping = watch('shipping');
  const watchDownPayment = watch('downPayment');
  const watchTaxRate = watch('taxRate');

  // Fetch vendor products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await productAPI.getProducts();
        const vendorProducts = res.data.data.filter(
          p => p.vendorId === user.id || user.role === 'ADMIN'
        );
        setProducts(vendorProducts);
      } catch (error) {
        toast.error('Failed to load products');
      }
    };
    fetchProducts();
  }, [user]);

  // Fetch existing order if editing
  useEffect(() => {
    if (id) {
      const fetchOrder = async () => {
        try {
          const res = await orderAPI.getById(id);
          const orderData = res.data.data;
          setOrder(orderData);
          
          // Populate form
          setValue('customerName', orderData.customer?.firstName + ' ' + orderData.customer?.lastName);
          setValue('customerEmail', orderData.customer?.email);
          setValue('pickupDate', orderData.pickupDate?.split('T')[0]);
          setValue('returnDate', orderData.returnDate?.split('T')[0]);
          setValue('deliveryMethod', orderData.deliveryMethod);
          setValue('orderDate', orderData.createdAt.split('T')[0]);
          
          const items = orderData.orderItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unitPrice)
          }));
          setValue('orderItems', items);
        } catch (error) {
          toast.error('Failed to load order');
        }
      };
      fetchOrder();
    }
  }, [id, setValue]);

  // Calculate rental duration in days
  const getRentalDays = () => {
    if (!watchPickupDate || !watchReturnDate) return 0;
    const start = new Date(watchPickupDate);
    const end = new Date(watchReturnDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  // Calculate pricing
  const calculations = () => {
    const rentalDays = getRentalDays();
    
    // Untaxed amount = sum of (quantity * unitPrice * rentalDays)
    const untaxed = watchOrderItems.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + (quantity * price * rentalDays);
    }, 0);

    const discount = parseFloat(watchDiscount) || 0;
    const shipping = parseFloat(watchShipping) || 0;
    const downPayment = parseFloat(watchDownPayment) || 0;
    const taxRate = parseFloat(watchTaxRate) || 0;

    const taxAmount = (untaxed * taxRate) / 100;
    const total = untaxed + taxAmount + shipping - discount - downPayment;

    return {
      untaxed: untaxed.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      discount: discount.toFixed(2),
      shipping: shipping.toFixed(2),
      downPayment: downPayment.toFixed(2),
      total: Math.max(0, total).toFixed(2)
    };
  };

  const pricing = calculations();

  // Handle product selection
  const handleProductChange = (index, productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setValue(`orderItems.${index}.unitPrice`, parseFloat(product.rentPrice));
    }
  };

  // Create or update order
  const onSubmit = async (data) => {
    if (!termsAccepted && !id) {
      toast.error('Please accept terms and conditions');
      return;
    }

    setIsLoading(true);
    try {
      const orderData = {
        customerId: user.id, // In real scenario, you'd select customer
        vendorId: user.id,
        pickupDate: data.pickupDate,
        returnDate: data.returnDate,
        deliveryMethod: data.deliveryMethod,
        totalAmount: parseFloat(pricing.total),
        orderItems: data.orderItems.map(item => ({
          productId: item.productId,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          rentalStart: data.pickupDate,
          rentalEnd: data.returnDate
        })),
        status: ORDER_STATUS.QUOTATION,
        paymentStatus: 'UNPAID'
      };

      if (id) {
        await orderAPI.update(id, orderData);
        toast.success('Order updated successfully');
      } else {
        const res = await orderAPI.create(orderData);
        toast.success('Order created successfully');
        navigate(`/dashboard/orders/${res.data.data.id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save order');
    } finally {
      setIsLoading(false);
    }
  };

  // Status transition handlers
  const handleSend = async () => {
    try {
      setIsLoading(true);
      await orderAPI.send(id);
      toast.success('Quotation sent successfully');
      const updatedOrder = await orderAPI.getById(id);
      setOrder(updatedOrder.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send quotation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      setShowConflictWarning(false);
      setAvailabilityConflicts([]);
      
      await orderAPI.confirm(id);
      toast.success('Order confirmed and stock reserved successfully');
      const updatedOrder = await orderAPI.getById(id);
      setOrder(updatedOrder.data.data);
    } catch (error) {
      // Handle availability conflicts (HTTP 409)
      if (error.response?.status === 409 && error.response?.data?.conflicts) {
        setAvailabilityConflicts(error.response.data.conflicts);
        setShowConflictWarning(true);
        toast.error('Cannot confirm: Stock availability conflicts detected');
      } else {
        toast.error(error.response?.data?.message || 'Failed to confirm order');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      setIsLoading(true);
      await orderAPI.createInvoice(id);
      toast.success('Invoice created successfully');
      const updatedOrder = await orderAPI.getById(id);
      setOrder(updatedOrder.data.data);
      navigate(`/dashboard/invoices?order=${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      setIsLoading(true);
      await orderAPI.updateStatus(id, ORDER_STATUS.CANCELLED);
      toast.success('Order cancelled successfully');
      navigate('/dashboard/orders');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Button visibility logic based on workflow phases
  const canSend = order?.status === ORDER_STATUS.QUOTATION || order?.status === ORDER_STATUS.DRAFT;
  const canConfirm = [ORDER_STATUS.APPROVED, ORDER_STATUS.SENT].includes(order?.status);
  const canCreateInvoice = order?.status === ORDER_STATUS.CONFIRMED;
  const canReject = [ORDER_STATUS.QUOTATION, ORDER_STATUS.SENT, ORDER_STATUS.APPROVED].includes(order?.status);
  const isConfirmedOrLater = [ORDER_STATUS.CONFIRMED, ORDER_STATUS.INVOICED, ORDER_STATUS.PICKEDUP, ORDER_STATUS.RETURNED].includes(order?.status);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Workflow Progress Indicator */}
      {order && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            {/* Quotation Phase */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                [ORDER_STATUS.QUOTATION, ORDER_STATUS.DRAFT, ORDER_STATUS.SENT, ORDER_STATUS.APPROVED, ORDER_STATUS.CONFIRMED, ORDER_STATUS.INVOICED].includes(order.status)
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-200 text-gray-400'
              }`}>
                <FileText size={20} />
              </div>
              <span className="text-sm font-medium mt-2">Quotation</span>
              <span className="text-xs text-gray-500">{STATUS_LABELS[ORDER_STATUS.QUOTATION]}</span>
            </div>

            {/* Arrow */}
            <div className={`flex-1 h-0.5 ${order.status !== ORDER_STATUS.QUOTATION && order.status !== ORDER_STATUS.DRAFT ? 'bg-purple-600' : 'bg-gray-200'}`}></div>

            {/* Quotation Sent Phase */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                [ORDER_STATUS.SENT, ORDER_STATUS.APPROVED, ORDER_STATUS.CONFIRMED, ORDER_STATUS.INVOICED].includes(order.status)
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-200 text-gray-400'
              }`}>
                <Send size={20} />
              </div>
              <span className="text-sm font-medium mt-2">Quotation Sent</span>
              <span className="text-xs text-gray-500">{STATUS_LABELS[ORDER_STATUS.SENT]}</span>
            </div>

            {/* Arrow */}
            <div className={`flex-1 h-0.5 ${[ORDER_STATUS.CONFIRMED, ORDER_STATUS.INVOICED].includes(order.status) ? 'bg-green-600' : 'bg-gray-200'}`}></div>

            {/* Sale Order / Confirmed Phase */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                [ORDER_STATUS.CONFIRMED, ORDER_STATUS.INVOICED].includes(order.status)
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-200 text-gray-400'
              }`}>
                <CheckCircle size={20} />
              </div>
              <span className="text-sm font-medium mt-2">Sale Order</span>
              <span className="text-xs text-gray-500">Stock Reserved</span>
            </div>
          </div>
        </div>
      )}

      {/* Availability Conflict Warning */}
      {showConflictWarning && availabilityConflicts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 flex-shrink-0" size={24} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Stock Availability Conflicts Detected
              </h3>
              <p className="text-red-700 mb-4">
                Cannot confirm this order due to insufficient stock during the requested rental period:
              </p>
              <div className="space-y-3">
                {availabilityConflicts.map((conflict, index) => (
                  <div key={index} className="bg-white rounded p-4 border border-red-200">
                    <p className="font-medium text-gray-900">Product: {conflict.productName || `ID ${conflict.productId}`}</p>
                    <p className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">Reason:</span> {conflict.reason}
                    </p>
                    {conflict.availableQty !== undefined && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Available:</span> {conflict.availableQty} units
                      </p>
                    )}
                    {conflict.dateRange && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Conflict Period:</span> {conflict.dateRange}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-900">
                  <strong>Solution:</strong> Adjust the rental dates, reduce quantities, or wait for stock to become available.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="mb-6">
          {/* Top Row: New Button with Check/X icons */}
          <div className="flex items-center gap-3 mb-4">
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
              onClick={() => navigate('/dashboard/orders/new')}
            >
              <Plus size={18} className="mr-2" />
              New
            </Button>
            <Check className="text-green-600" size={24} />
            <X className="text-red-600" size={24} />
          </div>

          {/* Title and Status Row */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {id ? `Order ${order?.orderReference}` : 'New Rental Order'}
              </h1>
              {order && (
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                    [ORDER_STATUS.QUOTATION, ORDER_STATUS.DRAFT].includes(order.status) ? 'bg-gray-100 text-gray-800' :
                    [ORDER_STATUS.SENT, ORDER_STATUS.APPROVED].includes(order.status) ? 'bg-purple-100 text-purple-800' :
                    order.status === ORDER_STATUS.CONFIRMED ? 'bg-green-100 text-green-800' :
                    order.status === ORDER_STATUS.INVOICED ? 'bg-blue-100 text-blue-800' :
                    order.status === ORDER_STATUS.PICKEDUP ? 'bg-teal-100 text-teal-800' :
                    order.status === ORDER_STATUS.RETURNED ? 'bg-gray-100 text-gray-800' :
                    order.status === ORDER_STATUS.LATE ? 'bg-red-100 text-red-800' :
                    order.status === ORDER_STATUS.CANCELLED ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status === ORDER_STATUS.CONFIRMED && <CheckCircle size={14} />}
                    {order.status === ORDER_STATUS.LATE && <Clock size={14} />}
                    {order.status === ORDER_STATUS.CANCELLED && <Ban size={14} />}
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                    order.paymentStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.paymentStatus}
                  </span>
                  {isConfirmedOrLater && (
                    <span className="px-3 py-1 bg-green-50 border border-green-300 rounded text-sm font-medium text-green-800 flex items-center gap-1">
                      <CheckCircle size={14} />
                      Stock Reserved
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons - Right Side */}
            <div className="flex gap-2">
              {!id && (
                <Button
                  type="submit"
                  form="order-form"
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
                >
                  <Save size={18} className="mr-2" />
                  Create Order
                </Button>
              )}
              
              {id && canSend && (
                <Button
                  onClick={handleSend}
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
                >
                  <Send size={18} className="mr-2" />
                  Send
                </Button>
              )}

              {id && canConfirm && (
                <Button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                >
                  <CheckCircle size={18} className="mr-2" />
                  Confirm Order
                </Button>
              )}

              {id && canCreateInvoice && (
                <Button
                  onClick={handleCreateInvoice}
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
                >
                  Create Invoice
                </Button>
              )}

              {id && order && (
                <>
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="px-6 py-2"
                  >
                    <Printer size={18} className="mr-2" />
                    Print
                  </Button>

                  {/* Download Invoice Button - Show for INVOICED orders */}
                  {[ORDER_STATUS.INVOICED, ORDER_STATUS.PICKEDUP, ORDER_STATUS.RETURNED, ORDER_STATUS.LATE].includes(order.status) && (
                    <DownloadInvoiceButton
                      orderId={order.id}
                      variant="default"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <form id="order-form" onSubmit={handleSubmit(onSubmit)}>
        {/* Order Details Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                {...register('customerName', { required: 'Customer name is required' })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                disabled={!!id}
              />
              {errors.customerName && (
                <p className="text-red-500 text-sm mt-1">{errors.customerName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Email *
              </label>
              <input
                type="email"
                {...register('customerEmail', { required: 'Email is required' })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                disabled={!!id}
              />
              {errors.customerEmail && (
                <p className="text-red-500 text-sm mt-1">{errors.customerEmail.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Address *
              </label>
              <textarea
                {...register('invoiceAddress', { required: 'Invoice address is required' })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                rows="2"
              />
              {errors.invoiceAddress && (
                <p className="text-red-500 text-sm mt-1">{errors.invoiceAddress.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address *
              </label>
              <textarea
                {...register('deliveryAddress', { required: 'Delivery address is required' })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                rows="2"
              />
              {errors.deliveryAddress && (
                <p className="text-red-500 text-sm mt-1">{errors.deliveryAddress.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Date
              </label>
              <input
                type="date"
                {...register('orderDate')}
                className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Method *
              </label>
              <select
                {...register('deliveryMethod')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="PICKUP">Pickup</option>
                <option value="STANDARD">Standard Delivery</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Date *
              </label>
              <input
                type="date"
                {...register('pickupDate', { required: 'Pickup date is required' })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.pickupDate && (
                <p className="text-red-500 text-sm mt-1">{errors.pickupDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Return Date *
              </label>
              <input
                type="date"
                {...register('returnDate', { required: 'Return date is required' })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                min={watchPickupDate}
              />
              {errors.returnDate && (
                <p className="text-red-500 text-sm mt-1">{errors.returnDate.message}</p>
              )}
            </div>
          </div>

          {watchPickupDate && watchReturnDate && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Rental Duration:</strong> {getRentalDays()} days
              </p>
            </div>
          )}
        </div>

        {/* Order Lines (Products) */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Order Lines</h2>
            <button
              type="button"
              onClick={() => append({ productId: '', quantity: 1, unitPrice: 0 })}
              className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus size={16} />
              Add Product
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Product</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Quantity</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Unit</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Unit Price</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Amount</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const item = watchOrderItems[index];
                  const amount = (item?.quantity || 0) * (item?.unitPrice || 0) * getRentalDays();
                  
                  return (
                    <tr key={field.id} className="border-t">
                      <td className="px-4 py-2">
                        <select
                          {...register(`orderItems.${index}.productId`, { required: true })}
                          onChange={(e) => handleProductChange(index, e.target.value)}
                          className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select Product</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          {...register(`orderItems.${index}.quantity`, { required: true, min: 1 })}
                          className="w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-sm text-gray-600">Days</span>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          {...register(`orderItems.${index}.unitPrice`, { required: true, min: 0 })}
                          className="w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-medium">₹{amount.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-2">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Terms & Conditions Link - Below Order Items */}
          {order && isConfirmedOrLater && (
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <FileText size={16} className="inline mr-1" />
                <a
                  href="/terms"
                  target="_blank"
                  className="text-purple-600 hover:underline font-medium"
                >
                  View Terms & Conditions
                </a>
                {' '}for this rental order
              </p>
            </div>
          )}
        </div>

        {/* Pricing Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Pricing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('discount')}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coupon Code
                </label>
                <input
                  type="text"
                  {...register('couponCode')}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shipping Charges (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('shipping')}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {isConfirmedOrLater && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Down Payment (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('downPayment')}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Only visible after order confirmation
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('taxRate')}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg h-fit">
              <h3 className="font-semibold mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Untaxed Amount:</span>
                  <span>₹{pricing.untaxed}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-₹{pricing.discount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>+₹{pricing.shipping}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({watchTaxRate}%):</span>
                  <span>+₹{pricing.taxAmount}</span>
                </div>
                {isConfirmedOrLater && (
                  <div className="flex justify-between text-orange-600">
                    <span>Down Payment:</span>
                    <span>-₹{pricing.downPayment}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total Amount:</span>
                  <span className="text-purple-600">₹{pricing.total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        {!id && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm text-gray-700">
                I accept the{' '}
                <a
                  href="/terms"
                  target="_blank"
                  className="text-purple-600 hover:underline"
                >
                  Terms & Conditions
                </a>
              </label>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
