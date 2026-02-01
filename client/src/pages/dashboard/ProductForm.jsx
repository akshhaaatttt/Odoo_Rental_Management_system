import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { productAPI } from '@/lib/api';
import { ArrowLeft, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const isEditMode = Boolean(id);
  const isAdminRoute = location.pathname.startsWith('/admin');

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    name: '',
    type: 'GOODS',
    description: '',
    quantityOnHand: 0,
    rentPrice: '',
    rentUnit: 'DAY',
    costPrice: '',
  });
  const [attributes, setAttributes] = useState([]);
  const [images, setImages] = useState([]);

  useEffect(() => {
    if (isEditMode) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await productAPI.getProduct(id);
      const product = response.data.data;
      setFormData({
        name: product.name,
        type: product.type,
        description: product.description,
        quantityOnHand: product.quantityOnHand,
        rentPrice: product.rentPrice,
        rentUnit: product.rentUnit,
        costPrice: product.costPrice,
      });
      setAttributes(product.attributes || []);
      // Map images to the format expected by the form
      const mappedImages = (product.images || []).map(img => ({
        url: img.url,
        isPrimary: img.isPrimary
      }));
      setImages(mappedImages);
    } catch (error) {
      toast.error('Failed to load product');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddAttribute = () => {
    setAttributes([...attributes, { name: '', value: '', extraPrice: 0 }]);
  };

  const handleAttributeChange = (index, field, value) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    setAttributes(newAttributes);
  };

  const handleRemoveAttribute = (index) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleAddImage = () => {
    setImages([...images, { url: '', isPrimary: images.length === 0 }]);
  };

  const handleImageChange = (index, value) => {
    const newImages = [...images];
    newImages[index].url = value;
    setImages(newImages);
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        quantityOnHand: parseInt(formData.quantityOnHand) || 0,
        rentPrice: parseFloat(formData.rentPrice),
        costPrice: parseFloat(formData.costPrice),
        attributes: attributes.filter(attr => attr.name && attr.value),
        images: images.filter(img => img.url),
      };

      if (isEditMode) {
        await productAPI.updateProduct(id, payload);
        toast.success('Product updated successfully');
      } else {
        await productAPI.createProduct(payload);
        toast.success('Product created successfully');
      }
      const redirectPath = isAdminRoute ? '/admin/products' : '/dashboard/products';
      navigate(redirectPath);
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update product' : 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => navigate(isAdminRoute ? '/admin/products' : '/dashboard/products')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEditMode ? 'Update product details' : 'Create a new rental product'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b mb-6">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'general'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          General Information
        </button>
        <button
          onClick={() => setActiveTab('attributes')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'attributes'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Attributes & Variants
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* General Information Tab */}
        {activeTab === 'general' && (
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Professional DSLR Camera"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="GOODS">Goods</option>
                    <option value="SERVICE">Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Quantity on Hand *</label>
                  <input
                    type="number"
                    name="quantityOnHand"
                    value={formData.quantityOnHand}
                    onChange={handleInputChange}
                    min="0"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Describe your product..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Rental Price *</label>
                  <input
                    type="number"
                    name="rentPrice"
                    value={formData.rentPrice}
                    onChange={handleInputChange}
                    step="1"
                    min="0"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Rental Unit *</label>
                  <select
                    name="rentUnit"
                    value={formData.rentUnit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="HOUR">Per Hour</option>
                    <option value="DAY">Per Day</option>
                    <option value="WEEK">Per Week</option>
                    <option value="MONTH">Per Month</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cost Price *</label>
                <input
                  type="number"
                  name="costPrice"
                  value={formData.costPrice}
                  onChange={handleInputChange}
                  step="1"
                  min="0"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="0"
                />
                <p className="text-sm text-gray-500 mt-1">
                  The original purchase cost of the product
                </p>
              </div>

              {/* Product Images Section */}
              <div className="border-t pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium">Product Images</h3>
                    <p className="text-sm text-gray-500">Add images for your product</p>
                  </div>
                  <Button type="button" onClick={handleAddImage} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Image URL
                  </Button>
                </div>
                {images.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <p>No images added yet</p>
                    <p className="text-sm mt-2">Click "Add Image URL" to add product images</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {images.map((img, index) => (
                      <div key={index} className="flex gap-4 items-center p-3 border rounded-lg">
                        <input
                          type="text"
                          value={img.url}
                          onChange={(e) => handleImageChange(index, e.target.value)}
                          placeholder="Image URL (https://...)"
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                        {img.isPrimary && (
                          <span className="px-3 py-1 text-sm bg-purple-100 text-purple-600 rounded-full">
                            Primary
                          </span>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveImage(index)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attributes Tab */}
        {activeTab === 'attributes' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Product Attributes</CardTitle>
                <Button type="button" onClick={handleAddAttribute} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Attribute
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {attributes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No attributes added yet</p>
                  <p className="text-sm mt-2">Click "Add Attribute" to add product attributes like brand, color, etc.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {attributes.map((attr, index) => (
                    <div key={index} className="flex gap-4 items-start p-4 border rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={attr.name}
                          onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                          placeholder="Attribute name (e.g., Brand)"
                          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                        <input
                          type="text"
                          value={attr.value}
                          onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                          placeholder="Value (e.g., Canon)"
                          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                        {/* <input
                          type="number"
                          value={attr.extraPrice}
                          onChange={(e) => handleAttributeChange(index, 'extraPrice', parseFloat(e.target.value) || 0)}
                          placeholder="Extra price"
                          step="0.01"
                          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                        /> */}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveAttribute(index)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isAdminRoute ? '/admin/products' : '/dashboard/products')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? 'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
}
