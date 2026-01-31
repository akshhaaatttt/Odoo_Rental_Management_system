import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { invoiceAPI } from '@/lib/api';
import { CheckCircle, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Payment() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const response = await invoiceAPI.getInvoice(invoiceId);
      setInvoice(response.data.data);
    } catch (error) {
      toast.error('Failed to load invoice');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    
    // Simulate payment processing
    setTimeout(async () => {
      try {
        // Record payment
        await invoiceAPI.recordPayment(invoiceId, invoice.amountDue);
        setPaymentSuccess(true);
        toast.success('Payment successful!');
        
        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } catch (error) {
        toast.error('Payment failed. Please try again.');
        setProcessing(false);
      }
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">
              Your payment of ₹{invoice.amountDue.toLocaleString()} has been processed successfully.
            </p>
            <p className="text-sm text-gray-500">
              Invoice: {invoice.invoiceNumber}
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Redirecting to homepage...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Payment</h1>
            <p className="text-gray-600">Invoice #{invoice?.invoiceNumber}</p>
          </div>

          {invoice && (
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Order Reference:</span>
                  <span className="font-medium">{invoice.order?.orderReference}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Amount Due:</span>
                  <span className="text-2xl font-bold text-purple-600">
                    ₹{invoice.amountDue.toLocaleString()}
                  </span>
                </div>
              </div>

              {invoice.order?.orderItems && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Order Items:</h3>
                  <div className="space-y-2">
                    {invoice.order.orderItems.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.product?.name} × {item.quantity}
                        </span>
                        <span className="text-gray-900">₹{(item.unitPrice * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handlePayment}
              disabled={processing}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pay ₹{invoice?.amountDue.toLocaleString()} (Dummy Payment)
                </>
              )}
            </Button>
            
            <p className="text-xs text-center text-gray-500">
              This is a demo payment. No actual charge will be made.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
