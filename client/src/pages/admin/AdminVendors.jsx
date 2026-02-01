import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminAPI } from '@/lib/api';
import { Check, X, Package, ShoppingCart, Mail, Phone, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminVendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, verified, pending

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await adminAPI.getAllVendors();
      setVendors(response.data.data);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (vendorId, isVerified) => {
    try {
      await adminAPI.verifyVendor(vendorId, { isVerified });
      toast.success(`Vendor ${isVerified ? 'approved' : 'rejected'} successfully`);
      fetchVendors();
    } catch (error) {
      toast.error('Failed to update vendor status');
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    if (filter === 'verified') return vendor.isVerified;
    if (filter === 'pending') return !vendor.isVerified;
    return true;
  });

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
          <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-500 mt-2">Approve and manage vendor accounts</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setFilter('all')}
          className={`pb-3 px-4 font-medium transition-colors ${
            filter === 'all'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Vendors ({vendors.length})
        </button>
        <button
          onClick={() => setFilter('verified')}
          className={`pb-3 px-4 font-medium transition-colors ${
            filter === 'verified'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Verified ({vendors.filter(v => v.isVerified).length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`pb-3 px-4 font-medium transition-colors ${
            filter === 'pending'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending ({vendors.filter(v => !v.isVerified).length})
        </button>
      </div>

      {/* Vendors List */}
      {filteredVendors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No vendors found</h3>
            <p className="text-gray-500">No vendors match the selected filter</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-lg">
                          {vendor.companyName?.charAt(0) || vendor.firstName?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{vendor.companyName || `${vendor.firstName} ${vendor.lastName}`}</h3>
                        <p className="text-sm text-gray-500">{vendor.vendorCategory}</p>
                      </div>
                      <div className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold ${
                        vendor.isVerified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {vendor.isVerified ? '✓ Verified' : 'Pending'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        {vendor.email}
                      </div>
                      {vendor.phoneNumber && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          {vendor.phoneNumber}
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <Package className="h-4 w-4 mr-2" />
                        {vendor.productCount} Products
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {vendor.orderCount} Orders
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm mb-4">
                      <div>
                        <span className="text-gray-600">GSTIN:</span>
                        <span className="ml-2 font-mono font-semibold">{vendor.gstin}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Revenue:</span>
                        <span className="ml-2 font-bold text-purple-600">₹{vendor.totalRevenue?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        Joined {new Date(vendor.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {!vendor.isVerified ? (
                      <>
                        <Button
                          onClick={() => handleVerify(vendor.id, true)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleVerify(vendor.id, false)}
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => handleVerify(vendor.id, false)}
                        variant="outline"
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
