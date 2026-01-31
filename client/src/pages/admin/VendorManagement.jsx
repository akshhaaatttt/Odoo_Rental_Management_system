import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminAPI } from '@/lib/api';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VendorManagement() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await adminAPI.getAllVendors();
      setVendors(response.data.data);
    } catch (error) {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (vendorId, isVerified) => {
    try {
      await adminAPI.verifyVendor(vendorId, { isVerified });
      toast.success(`Vendor ${isVerified ? 'approved' : 'rejected'}`);
      fetchVendors();
    } catch (error) {
      toast.error('Failed to update vendor status');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Vendor Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="flex justify-between items-center border-b pb-4">
                <div>
                  <p className="font-semibold">{vendor.companyName || vendor.firstName + ' ' + vendor.lastName}</p>
                  <p className="text-sm text-gray-600">{vendor.email}</p>
                  <p className="text-sm text-gray-500">
                    Revenue: ₹{vendor.revenue?.toFixed(2) || '0.00'} | Orders: {vendor.orderCount || 0}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {vendor.isVerified ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">
                      Verified
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                      Pending
                    </span>
                  )}
                  {!vendor.isVerified ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleVerify(vendor.id, true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleVerify(vendor.id, false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVerify(vendor.id, false)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
