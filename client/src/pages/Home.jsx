import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Package, Users, Shield, Calendar, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFilterStore } from '@/store';

export default function Home() {
  const navigate = useNavigate();
  const { setSearchDates } = useFilterStore();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSearch = () => {
    if (startDate && endDate) {
      if (new Date(startDate) >= new Date(endDate)) {
        alert('End date must be after start date');
        return;
      }
      setSearchDates(startDate, endDate);
    }
    navigate('/products');
  };

  return (
    <div>
      {/* Hero Section with Date Picker */}
      <section className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-6">
              Welcome to Rental System Pro
            </h1>
            <p className="text-xl mb-8 text-purple-100 max-w-2xl mx-auto">
              Your trusted multi-vendor marketplace for renting everything you need.
              From equipment to vehicles, find it all in one place.
            </p>
          </div>

          {/* Date Range Picker Widget */}
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
              </div>
              <Button 
                size="lg" 
                onClick={handleSearch}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Search className="w-5 h-5 mr-2" />
                Check Availability
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-3 text-center">
              Select dates to find available products for your rental period
            </p>
          </div>

          <div className="flex justify-center space-x-4 mt-8">
            <Link to="/signup">
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-purple-600">
                Become a Vendor
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Wide Selection</h3>
              <p className="text-gray-600">
                Access thousands of products from verified vendors across multiple categories.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Transactions</h3>
              <p className="text-gray-600">
                Your payments are secure with our trusted payment processing system.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Verified Vendors</h3>
              <p className="text-gray-600">
                All vendors are verified and reviewed to ensure quality service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-purple-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Renting?</h2>
          <p className="text-gray-600 mb-8">
            Join thousands of satisfied customers and vendors on our platform
          </p>
          <Link to="/products">
            <Button size="lg">
              Explore Products
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
