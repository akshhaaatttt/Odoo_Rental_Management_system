import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminAPI } from '@/lib/api';
import { Eye, EyeOff, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const fetchProducts = async () => {
    try {
      const response = await adminAPI.getAllProducts(search);
      setProducts(response.data.data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (productId, isPublished) => {
    try {
      await adminAPI.publishProduct(productId, { isPublished });
      toast.success(`Product ${isPublished ? 'published' : 'unpublished'}`);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to update product status');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Product Management</h1>

      <Card className="mb-6">
        <CardContent className="p-4">
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <div className="aspect-video bg-gray-200 rounded-lg mb-2">
                {product.images?.[0]?.url ? (
                  <img
                    src={product.images[0].url}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              <CardTitle className="text-lg">{product.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  Vendor: {product.vendor?.companyName || product.vendor?.firstName}
                </p>
                <p className="text-sm text-gray-600">Type: {product.type}</p>
                <p className="font-bold text-purple-600">
                  ₹{parseFloat(product.rentPrice).toFixed(2)} / {product.rentUnit}
                </p>
                <p className="text-sm">
                  Stock: {product.quantityOnHand} | Booked: {product.quantityBooked}
                </p>
              </div>
              <Button
                size="sm"
                className="w-full"
                variant={product.isPublished ? 'destructive' : 'default'}
                onClick={() => handlePublish(product.id, !product.isPublished)}
              >
                {product.isPublished ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Publish
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No products found
          </CardContent>
        </Card>
      )}
    </div>
  );
}
