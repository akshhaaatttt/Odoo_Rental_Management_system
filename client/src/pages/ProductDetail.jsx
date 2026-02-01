import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { productAPI } from '@/lib/api';
import { useCartStore } from '@/store';
import { Package, Calendar, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [rentalStart, setRentalStart] = useState('');
  const [rentalEnd, setRentalEnd] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState(0);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (product && rentalStart && rentalEnd) {
      calculatePrice();
    }
  }, [product, rentalStart, rentalEnd, quantity]);

  const fetchProduct = async () => {
    try {
      const response = await productAPI.getProduct(id);
      setProduct(response.data.data);
    } catch (error) {
      toast.error('Failed to load product');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = () => {
    const start = new Date(rentalStart);
    const end = new Date(rentalEnd);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let units = diffDays;
    if (product.rentUnit === 'HOUR') units = diffDays * 24;
    if (product.rentUnit === 'WEEK') units = Math.ceil(diffDays / 7);
    if (product.rentUnit === 'MONTH') units = Math.ceil(diffDays / 30);
    
    const unitPrice = parseFloat(product.rentPrice) * units;
    const price = unitPrice * quantity;
    setEstimatedPrice(price);
    return unitPrice;
  };

  const handleAddToCart = () => {
    if (!rentalStart || !rentalEnd) {
      toast.error('Please select rental dates');
      return;
    }

    if (new Date(rentalStart) >= new Date(rentalEnd)) {
      toast.error('End date must be after start date');
      return;
    }

    const availableQty = product.quantityAvailable ?? product.quantityOnHand;
    if (quantity < 1 || quantity > availableQty) {
      toast.error(`Quantity must be between 1 and ${availableQty}`);
      return;
    }

    const unitPrice = calculatePrice() / quantity;
    addItem(product, quantity, rentalStart, rentalEnd, unitPrice);

    toast.success('Added to cart!');
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div>
          <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-4">
            {product.images?.[0]?.url ? (
              <img
                src={product.images[0].url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="h-24 w-24 text-gray-400" />
              </div>
            )}
          </div>
          {product.images?.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(1).map((img, idx) => (
                <div key={idx} className="aspect-square bg-gray-200 rounded overflow-hidden">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <p className="text-gray-600 mb-6">{product.description}</p>

          <div className="mb-6">
            <span className="text-3xl font-bold text-purple-600">₹{product.rentPrice}</span>
            <span className="text-gray-500"> / {product.rentUnit.toLowerCase()}</span>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Select Rental Period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={rentalStart}
                  onChange={(e) => setRentalStart(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={rentalEnd}
                  onChange={(e) => setRentalEnd(e.target.value)}
                  min={rentalStart || new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  min={1}
                  max={product.quantityAvailable ?? product.quantityOnHand}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Available: {product.quantityAvailable ?? product.quantityOnHand} units
                  {/* {product.quantityReserved > 0 && (
                    <span className="text-orange-600"> ({product.quantityReserved} reserved)</span>
                  )} */}
                </p>
              </div>

              {estimatedPrice > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Estimated Total</p>
                  <p className="text-2xl font-bold text-purple-600">₹{estimatedPrice.toFixed(2)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="w-full"
            onClick={handleAddToCart}
            disabled={(product.quantityAvailable ?? product.quantityOnHand) === 0}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {(product.quantityAvailable ?? product.quantityOnHand) === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Button>

          {/* Attributes */}
          {product.attributes?.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Product Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {product.attributes.map((attr) => (
                    <div key={attr.id} className="flex justify-between border-b pb-2">
                      <span className="font-medium">{attr.name}:</span>
                      <span className="text-gray-600">{attr.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
