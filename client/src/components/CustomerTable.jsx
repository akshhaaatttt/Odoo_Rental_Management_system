import React from 'react';
import { Mail, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomerTable = ({ customers }) => {
  const navigate = useNavigate();

  const handleRowClick = (customerId) => {
    navigate(`/dashboard/customers/${customerId}`);
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-750 border-b border-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Orders
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Total Revenue
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {customers.map((customer) => (
              <tr
                key={customer.id}
                onClick={() => handleRowClick(customer.id)}
                className="hover:bg-gray-750 transition-all duration-200 cursor-pointer group hover:shadow-md"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0 group-hover:scale-110 group-hover:shadow-lg transition-all duration-200">
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
                    <div>
                      <div className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors duration-200">
                        {customer.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-gray-300 group-hover:text-gray-200 transition-colors duration-200">
                    <Mail className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors duration-200" />
                    {customer.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-gray-300 group-hover:text-gray-200 transition-colors duration-200">
                    <Phone className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors duration-200" />
                    {customer.phone}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-300 group-hover:text-white group-hover:font-medium transition-all duration-200">
                    {customer.totalOrders}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-purple-400 group-hover:text-purple-300 transition-colors duration-200">
                    ₹{parseFloat(customer.totalRevenue).toLocaleString('en-IN')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-200">
                    {new Date(customer.joinedDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerTable;
