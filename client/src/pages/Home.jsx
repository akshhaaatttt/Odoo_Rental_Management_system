import { Link } from 'react-router-dom';
import { ArrowRight, Package, Users, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {

  return (
    <div className="min-h-screen">
      {/* Hero Section - Full Screen Cinematic */}
      <section className="relative h-screen w-full overflow-hidden select-none">
        {/* Background Image with Blur and Darkening */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1593642532400-2682810df593?q=80&w=2000&auto=format&fit=crop')`,
            filter: 'brightness(0.5) blur(0.5px)'
          }}
        />
        
        {/* Dark Linear Gradient Overlay - Top to Bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/90" />
        
        {/* Hero Content */}
        <div className="relative h-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 text-center">
          {/* Main Headline - Single Line, Large, Bold */}
          <h1 
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-8 tracking-tight"
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            Rent Everything. Instantly.
          </h1>
          
          {/* Subtle Subtext (Optional) */}
          <p 
            className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl mb-12 font-light"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}
          >
            Electronics. Furniture. Anything.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Link to="/products">
              <button className="group relative px-8 py-4 bg-white text-gray-900 rounded-full font-semibold text-lg shadow-2xl hover:shadow-white/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                Browse Rentals
                <ArrowRight className="inline-block w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
            <Link to="/signup">
              <button className="px-8 py-4 bg-white/10 backdrop-blur-md text-white border-2 border-white/30 rounded-full font-semibold text-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
                Start Renting
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">500+</div>
              <div className="text-gray-600 font-medium">Active Vendors</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">5000+</div>
              <div className="text-gray-600 font-medium">Products Listed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">10k+</div>
              <div className="text-gray-600 font-medium">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">98%</div>
              <div className="text-gray-600 font-medium">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Redesigned */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Rent With Us?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Experience the future of rental services with our trusted platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Package className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Wide Selection</h3>
              <p className="text-gray-600 leading-relaxed">
                Access thousands of quality products from verified vendors across 50+ categories. Find exactly what you need, when you need it.
              </p>
              <div className="mt-4 flex items-center text-purple-600 font-medium">
                <CheckCircle className="w-4 h-4 mr-2" />
                Verified Quality
              </div>
            </div>

            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure & Protected</h3>
              <p className="text-gray-600 leading-relaxed">
                Your transactions are protected with bank-grade security. Every rental includes comprehensive insurance coverage.
              </p>
              <div className="mt-4 flex items-center text-pink-600 font-medium">
                <CheckCircle className="w-4 h-4 mr-2" />
                100% Secure
              </div>
            </div>

            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Trusted Vendors</h3>
              <p className="text-gray-600 leading-relaxed">
                Every vendor undergoes rigorous verification. Read authentic reviews and ratings from our community of renters.
              </p>
              <div className="mt-4 flex items-center text-indigo-600 font-medium">
                <CheckCircle className="w-4 h-4 mr-2" />
                5-Star Rated
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Get started in just 3 simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-1/3 left-1/4 right-1/4 h-1 bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200"></div>
            
            <div className="text-center relative">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full text-2xl font-bold mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Search & Browse</h3>
              <p className="text-gray-600">
                Find the perfect item from our extensive catalog of rental products
              </p>
            </div>

            <div className="text-center relative">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-full text-2xl font-bold mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Book & Pay</h3>
              <p className="text-gray-600">
                Select your dates, complete secure payment, and confirm your booking
              </p>
            </div>

            <div className="text-center relative">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-full text-2xl font-bold mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Pickup & Enjoy</h3>
              <p className="text-gray-600">
                Collect your rental and enjoy. Return it when you're done!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Enhanced */}
      <section className="relative py-24 bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-600 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Start Your Rental Journey?
          </h2>
          <p className="text-xl text-purple-100 mb-10 max-w-2xl mx-auto">
            Join thousands of satisfied customers and discover the easiest way to rent anything you need
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/products">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 font-semibold px-10 py-6 rounded-xl shadow-lg text-lg transition-all duration-300 transform hover:scale-105">
                Explore Products
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm font-semibold px-10 py-6 rounded-xl text-lg transition-all duration-300">
                Become a Vendor
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
