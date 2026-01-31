import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminAPI } from '@/lib/api';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    gstin: '',
    rentalPeriods: {
      hourly: true,
      daily: true,
      weekly: true,
      monthly: true,
      custom: false
    },
    lateFeePercentage: 10,
    securityDepositPercentage: 20,
    gstRate: 18,
    defaultRentUnit: 'DAY',
    enableProductAttributes: true,
    enableProductVariants: false,
    requireVendorApproval: true,
    requireProductApproval: true,
    allowCustomerReviews: true,
    autoGenerateInvoices: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await adminAPI.getSettings();
      if (response.data.data) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setSettings(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Settings & Configuration</h1>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Company Name</Label>
                <Input
                  value={settings.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <Label>GSTIN</Label>
                <Input
                  value={settings.gstin}
                  onChange={(e) => handleChange('gstin', e.target.value)}
                  placeholder="Enter GSTIN"
                />
              </div>
              <div>
                <Label>Company Email</Label>
                <Input
                  type="email"
                  value={settings.companyEmail}
                  onChange={(e) => handleChange('companyEmail', e.target.value)}
                  placeholder="Enter company email"
                />
              </div>
              <div>
                <Label>Company Phone</Label>
                <Input
                  value={settings.companyPhone}
                  onChange={(e) => handleChange('companyPhone', e.target.value)}
                  placeholder="Enter company phone"
                />
              </div>
            </div>
            <div>
              <Label>Company Address</Label>
              <Input
                value={settings.companyAddress}
                onChange={(e) => handleChange('companyAddress', e.target.value)}
                placeholder="Enter company address"
              />
            </div>
          </CardContent>
        </Card>

        {/* Rental Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Rental Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-3 block">Allowed Rental Periods</Label>
              <div className="space-y-2">
                {Object.keys(settings.rentalPeriods).map((period) => (
                  <label key={period} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.rentalPeriods[period]}
                      onChange={(e) => handleNestedChange('rentalPeriods', period, e.target.checked)}
                    />
                    <span className="capitalize">{period}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Late Fee Percentage (%)</Label>
                <Input
                  type="number"
                  value={settings.lateFeePercentage}
                  onChange={(e) => handleChange('lateFeePercentage', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Security Deposit (%)</Label>
                <Input
                  type="number"
                  value={settings.securityDepositPercentage}
                  onChange={(e) => handleChange('securityDepositPercentage', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>GST Rate (%)</Label>
                <Input
                  type="number"
                  value={settings.gstRate}
                  onChange={(e) => handleChange('gstRate', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div>
              <Label>Default Rent Unit</Label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={settings.defaultRentUnit}
                onChange={(e) => handleChange('defaultRentUnit', e.target.value)}
              >
                <option value="HOUR">Hour</option>
                <option value="DAY">Day</option>
                <option value="WEEK">Week</option>
                <option value="MONTH">Month</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Product Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Product Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.enableProductAttributes}
                onChange={(e) => handleChange('enableProductAttributes', e.target.checked)}
              />
              <span>Enable Product Attributes (Brand, Color, etc.)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.enableProductVariants}
                onChange={(e) => handleChange('enableProductVariants', e.target.checked)}
              />
              <span>Enable Product Variants</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.requireProductApproval}
                onChange={(e) => handleChange('requireProductApproval', e.target.checked)}
              />
              <span>Require Admin Approval for Products</span>
            </label>
          </CardContent>
        </Card>

        {/* User & Platform Settings */}
        <Card>
          <CardHeader>
            <CardTitle>User & Platform Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.requireVendorApproval}
                onChange={(e) => handleChange('requireVendorApproval', e.target.checked)}
              />
              <span>Require Admin Approval for New Vendors</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.allowCustomerReviews}
                onChange={(e) => handleChange('allowCustomerReviews', e.target.checked)}
              />
              <span>Allow Customer Reviews</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoGenerateInvoices}
                onChange={(e) => handleChange('autoGenerateInvoices', e.target.checked)}
              />
              <span>Auto-Generate Invoices on Order Confirmation</span>
            </label>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
