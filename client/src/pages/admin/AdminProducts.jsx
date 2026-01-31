import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminAPI } from '@/lib/api';
import { Package, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await adminAPI.getProducts();
      setProducts(response.data.data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id, isPublished) => {
    try {
      await adminAPI.publishProduct(id, isPublished);
      toast.success(`Product ${isPublished ? 'published' : 'unpublished'}`);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to update product');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Product Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <Card key={product.id}>
            <CardContent className="p-4">
              <h3 className="font-bold mb-2">{product.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{product.vendor.companyName || product.vendor.firstName}</p>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded ${product.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                  {product.isPublished ? 'Published' : 'Draft'}
                </span>
                <Button
                  size="sm"
                  onClick={() => handlePublish(product.id, !product.isPublished)}
                  variant="outline"
                >
                  {product.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
