import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store';
import { ShoppingCart, Trash2, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeItem, getTotal } = useCartStore();

  // Group items by vendor
  const itemsByVendor = items.reduce((acc, item) => {
    const vendorId = item.product.vendorId;
    if (!acc[vendorId]) {
      acc[vendorId] = {
        vendor: item.product.vendor || { companyName: 'Unknown Vendor' },
        items: []
      };
    }
    acc[vendorId].items.push(item);
    return acc;
  }, {});

  const handleRemove = (productId, rentalStart) => {
    removeItem(productId, rentalStart);
    toast.success('Item removed from cart');
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Enhanced empty cart state */}
        <Card className="border-2 border-dashed border-gray-300 hover:border-purple-300 transition-all duration-300">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-6">
              <ShoppingCart className="h-24 w-24 text-gray-400 animate-pulse" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold text-sm">0</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Your cart is empty</h3>
            <p className="text-gray-500 mb-8 text-center max-w-md">Discover amazing rental products and add them to your cart</p>
            <Button onClick={() => navigate('/products')} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              Browse Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {Object.values(itemsByVendor).map((vendorGroup, idx) => (
            <Card key={idx} className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center mb-4 pb-4 border-b">
                  <Package className="h-5 w-5 mr-2 text-purple-600" />
                  <h3 className="font-semibold">
                    {vendorGroup.vendor.companyName || vendorGroup.vendor.firstName}
                  </h3>
                </div>

                <div className="space-y-4">
                  {vendorGroup.items.map((item) => (
                    <div key={item.productId} className="flex gap-4 group hover:bg-gray-50 p-3 rounded-lg transition-all duration-200">
                      <div className="w-24 h-24 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                        {item.product.images?.[0]?.url ? (
                          <img
                            src={item.product.images[0].url}
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full group-hover:bg-gray-300 transition-colors duration-200">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h4 className="font-semibold">{item.product.name}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(item.rentalStart).toLocaleDateString()} - {new Date(item.rentalEnd).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        <p className="font-bold text-purple-600 mt-2">
                          ₹{(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemove(item.productId, item.rentalStart)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <Card className="sticky top-4">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Items:</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vendors:</span>
                  <span>{Object.keys(itemsByVendor).length}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-purple-600">₹{getTotal().toFixed(2)}</span>
                </div>
              </div>
              <Button size="lg" className="w-full" onClick={handleCheckout}>
                Proceed to Checkout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
