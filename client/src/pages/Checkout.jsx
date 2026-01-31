import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCartStore, useAuthStore } from '@/store';
import { orderAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, clearCart, getTotal } = useCartStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('STANDARD');
  const [address, setAddress] = useState(user?.address || '');

  const handlePlaceOrder = async () => {
    if (!address) {
      toast.error('Please enter delivery address');
      return;
    }

    setLoading(true);
    try {
      const orderItems = items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        rentalStart: item.rentalStart,
        rentalEnd: item.rentalEnd,
        unitPrice: item.unitPrice
      }));

      const response = await orderAPI.checkout({
        items: orderItems,
        deliveryMethod,
        address
      });

      clearCart();
      toast.success('Order placed successfully!');
      navigate('/order-success', { state: { orders: response.data.data } });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Delivery Address</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your delivery address"
              />
            </div>

            <div>
              <Label>Delivery Method</Label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="delivery"
                    value="STANDARD"
                    checked={deliveryMethod === 'STANDARD'}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-medium">Standard Delivery</p>
                    <p className="text-sm text-gray-500">3-5 business days</p>
                  </div>
                </label>

                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="delivery"
                    value="PICKUP"
                    checked={deliveryMethod === 'PICKUP'}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-medium">Pickup from Vendor</p>
                    <p className="text-sm text-gray-500">Collect from vendor location</p>
                  </div>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Items:</span>
                <span>{items.length}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total Amount:</span>
                <span className="text-purple-600">₹{getTotal().toFixed(2)}</span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full mt-6"
              onClick={handlePlaceOrder}
              disabled={loading}
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
