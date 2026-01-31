import React from 'react';
import { Mail, Phone, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomerCard = ({ customer }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/dashboard/customers/${customer.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-all duration-200 cursor-pointer border border-gray-700 hover:border-purple-500"
    >
      {/* Avatar & Name */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
          {customer.avatar ? (
            <img
              src={customer.avatar}
              alt={customer.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            customer.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">
            {customer.name}
          </h3>
          <p className="text-sm text-gray-400">
            {customer.totalOrders} {customer.totalOrders === 1 ? 'order' : 'orders'}
          </p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="truncate">{customer.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Phone className="w-4 h-4 text-gray-400" />
          <span>{customer.phone}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="pt-4 border-t border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2 text-purple-400">
          <ShoppingBag className="w-4 h-4" />
          <span className="text-sm font-medium">
            ₹{parseFloat(customer.totalRevenue).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          Joined {new Date(customer.joinedDate).toLocaleDateString('en-IN', {
            month: 'short',
            year: 'numeric'
          })}
        </div>
      </div>
    </div>
  );
};

export default CustomerCard;
