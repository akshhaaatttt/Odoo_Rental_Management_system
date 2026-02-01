import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store';
import { authAPI } from '@/lib/api';
import { Building, User, Lock, Mail, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  // Refresh user data on component mount to get latest verification status
  useEffect(() => {
    const refreshUserData = async () => {
      try {
        const response = await authAPI.getProfile();
        if (response.data.success) {
          updateUser(response.data.data);
        }
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      }
    };
    refreshUserData();
  }, []);

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    address: user?.address || '',
    companyName: user?.companyName || '',
    gstin: user?.gstin || '',
    vendorCategory: user?.vendorCategory || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Filter out fields based on which tab is active
      const dataToUpdate = activeTab === 'profile' 
        ? {
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            phoneNumber: profileData.phoneNumber,
            address: profileData.address
          }
        : {
            companyName: profileData.companyName,
            vendorCategory: profileData.vendorCategory
          };

      const response = await authAPI.updateProfile(dataToUpdate);
      if (response.data.success) {
        updateUser(response.data.data);
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.changePassword(passwordData);
      if (response.data.success) {
        toast.success('Password changed successfully');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-2">Manage your account settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-2 font-medium transition-colors ${
            activeTab === 'profile'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User className="h-4 w-4 inline mr-2" />
          Profile Information
        </button>
        {user?.role === 'VENDOR' && (
          <button
            onClick={() => setActiveTab('work')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'work'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building className="h-4 w-4 inline mr-2" />
            Work Information
          </button>
        )}
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-2 font-medium transition-colors ${
            activeTab === 'security'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Lock className="h-4 w-4 inline mr-2" />
          Security
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  readOnly
                  className="bg-gray-50 cursor-default"
                />
              </div>

              <div>
                <Label htmlFor="phoneNumber">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  value={profileData.phoneNumber}
                  onChange={(e) => setProfileData({...profileData, phoneNumber: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="address">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Address
                </Label>
                <Input
                  id="address"
                  value={profileData.address}
                  onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                />
              </div>

              <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Work Info Tab (Vendor Only) */}
      {activeTab === 'work' && user?.role === 'VENDOR' && (
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={profileData.companyName}
                  onChange={(e) => setProfileData({...profileData, companyName: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  value={profileData.gstin}
                  readOnly
                  className="bg-gray-50 cursor-default"
                />
                <p className="text-xs text-gray-500 mt-1">GSTIN cannot be changed. Contact support if needed.</p>
              </div>

              <div>
                <Label htmlFor="vendorCategory">Category</Label>
                <Input
                  id="vendorCategory"
                  value={profileData.vendorCategory}
                  onChange={(e) => setProfileData({...profileData, vendorCategory: e.target.value})}
                />
              </div>

              <div className={`p-4 rounded-lg ${
                user.isVerified ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
              }`}>
                <p className={`text-sm font-medium ${
                  user.isVerified ? 'text-green-800' : 'text-orange-800'
                }`}>
                  Verification Status: {user.isVerified ? '✓ Verified' : 'Pending Verification'}
                </p>
              </div>

              <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                {loading ? 'Updating...' : 'Update Information'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  6-12 characters, uppercase, lowercase, and special character required
                </p>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
