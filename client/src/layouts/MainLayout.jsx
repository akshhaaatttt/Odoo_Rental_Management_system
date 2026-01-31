import { Outlet, Link } from 'react-router-dom';
import { ShoppingCart, User, Menu, ChevronDown, UserCircle, Package, Settings, LogOut } from 'lucide-react';
import { useAuthStore, useCartStore } from '@/store';
import { useState } from 'react';

export default function MainLayout() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { items } = useCartStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-purple-600">Rental System Pro</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <Link to="/" className="text-gray-700 hover:text-purple-600 font-medium">
                Home
              </Link>
              <Link to="/products" className="text-gray-700 hover:text-purple-600 font-medium">
                Products
              </Link>
              {isAuthenticated && user?.role === 'CUSTOMER' && (
                <Link to="/customer/dashboard" className="text-gray-700 hover:text-purple-600 font-medium">
                  My Dashboard
                </Link>
              )}
              {isAuthenticated && (user?.role === 'VENDOR' || user?.role === 'ADMIN') && (
                <Link to="/dashboard" className="text-gray-700 hover:text-purple-600 font-medium">
                  Dashboard
                </Link>
              )}
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* Cart */}
              <Link to="/cart" className="relative">
                <ShoppingCart className="w-6 h-6 text-gray-700 hover:text-purple-600" />
                {items.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </Link>

              {/* User Menu */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    {user?.firstName}
                  </span>
                  <button
                    onClick={logout}
                    className="text-sm text-purple-600 hover:underline"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link to="/login" className="text-gray-700 hover:text-purple-600">
                    <User className="w-6 h-6" />
                  </Link>
                  <Link to="/signup">
                    <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
                      Sign Up
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Rental System Pro</h3>
              <p className="text-gray-400">
                Your trusted multi-vendor rental marketplace
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/products" className="text-gray-400 hover:text-white">Browse Products</Link></li>
                <li><Link to="/signup" className="text-gray-400 hover:text-white">Become a Vendor</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <p className="text-gray-400">support@rentalsystempro.com</p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2026 Rental System Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
