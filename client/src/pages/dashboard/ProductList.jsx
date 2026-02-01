import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { productAPI } from '@/lib/api';
import { Plus, Package, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productAPI.getProducts();
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await productAPI.deleteProduct(id);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-2">Manage your rental inventory</p>
        </div>
        <Link to="/dashboard/products/new">
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products yet</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first product</p>
            <Link to="/dashboard/products/new">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Product
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-200">
              <div className="aspect-video bg-gray-100 relative flex items-center justify-center overflow-hidden">
                {product.images?.[0]?.url ? (
                  <img 
                    src={product.images[0].url} 
                    alt={product.name}
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full group-hover:bg-gray-200 transition-colors duration-200">
                    <Package className="h-12 w-12 text-gray-400 group-hover:text-gray-500 transition-colors duration-200" />
                  </div>
                )}
                <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold transition-all duration-200 ${
                  product.isPublished ? 'bg-green-100 text-green-800 group-hover:bg-green-200' : 'bg-gray-100 text-gray-800 group-hover:bg-gray-200'
                }`}>
                  {product.isPublished ? 'Published' : 'Draft'}
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-purple-600 transition-colors duration-200">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xl font-bold text-purple-600">
                      ₹{product.rentPrice}
                    </span>
                    <span className="text-sm text-gray-500">/{product.rentUnit.toLowerCase()}</span>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-600">
                      <span className="font-medium">Available:</span> {product.quantityAvailable ?? product.quantityOnHand}
                    </div>
                    {product.quantityReserved > 0 && (
                      <div className="text-orange-600 text-xs">
                        Reserved: {product.quantityReserved}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/dashboard/products/${product.id}/edit`} className="flex-1">
                    <Button variant="outline" className="w-full group/edit hover:border-purple-300">
                      <Edit className="h-4 w-4 mr-2 group-hover/edit:scale-110 transition-transform duration-200" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 hover:border-red-300 group/delete"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4 group-hover/delete:scale-110 transition-transform duration-200" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
