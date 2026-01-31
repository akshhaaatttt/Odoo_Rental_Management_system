import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Tag } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

// Validation schema
const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(12, 'Password must be at most 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  isVendor: z.boolean().default(false),
  companyName: z.string().optional(),
  gstin: z.string().optional(),
  vendorCategory: z.string().optional(),
  couponCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.isVendor) {
    return data.companyName && data.gstin && data.vendorCategory;
  }
  return true;
}, {
  message: "Vendor details are required when registering as a vendor",
  path: ["companyName"],
});

export default function Signup() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: zodResolver(signupSchema),
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        phoneNumber: data.phoneNumber || '',
        address: data.address || '',
        role: data.isVendor ? 'VENDOR' : 'CUSTOMER',
      };

      if (data.isVendor) {
        payload.companyName = data.companyName;
        payload.gstin = data.gstin;
        payload.vendorCategory = data.vendorCategory;
      }

      console.log('Signup payload:', payload);
      const response = await authAPI.signup(payload);
      console.log('Signup response:', response);
      
      if (response.data && response.data.success && response.data.data) {
        const { user, token } = response.data.data;
        setAuth(user, token);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        toast.success('Account created successfully!');
        
        // Redirect based on role
        if (user.role === 'VENDOR') {
          toast.success('Your vendor account is pending verification', {
            duration: 4000,
            icon: 'ℹ️'
          });
          navigate('/dashboard');
        } else {
          navigate('/');
        }
      } else {
        toast.error('Failed to create account - Invalid response');
      }
    } catch (error) {
      console.error('Signup error:', error);
      const message = error.response?.data?.message || 'Failed to create account';
      toast.error(message);
      
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => toast.error(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center text-purple-600">
            Create an Account
          </CardTitle>
          <CardDescription className="text-center">
            Join our rental marketplace today
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Coupon Code Box */}
          <div className="mb-6 p-4 bg-yellow-50 border-2 border-blue-400 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-5 h-5 text-blue-600" />
              <Label htmlFor="couponCode" className="text-blue-900 font-semibold">
                Have a Coupon Code?
              </Label>
            </div>
            <Input
              id="couponCode"
              {...register('couponCode')}
              placeholder="Enter your coupon code"
              className="border-blue-400"
            />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-600">Passwords do not match</p>
              )}
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  {...register('phoneNumber')}
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  {...register('address')}
                  placeholder="123 Main St"
                />
              </div>
            </div>

            {/* Become a Vendor Toggle */}
            <div className="flex items-center space-x-2 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <input
                type="checkbox"
                id="isVendor"
                {...register('isVendor')}
                checked={isVendor}
                onChange={(e) => setIsVendor(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <Label htmlFor="isVendor" className="cursor-pointer font-semibold text-purple-900">
                Become a vendor
              </Label>
            </div>

            {/* Vendor Fields (Conditional) */}
            {isVendor && (
              <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-900">Vendor Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    {...register('companyName')}
                    placeholder="ABC Rentals Ltd."
                  />
                  {errors.companyName && (
                    <p className="text-sm text-red-600">{errors.companyName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendorCategory">Category *</Label>
                  <select
                    id="vendorCategory"
                    {...register('vendorCategory')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                  >
                    <option value="">Select a category</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Vehicles">Vehicles</option>
                    <option value="Tools">Tools</option>
                    <option value="Events">Events</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.vendorCategory && (
                    <p className="text-sm text-red-600">{errors.vendorCategory.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstin">GST Number *</Label>
                  <Input
                    id="gstin"
                    {...register('gstin')}
                    placeholder="22AAAAA0000A1Z5"
                    className="uppercase"
                  />
                  {errors.gstin && (
                    <p className="text-sm text-red-600">{errors.gstin.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    15-digit GST Identification Number
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>

            {/* Login Link */}
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-purple-600 hover:underline font-semibold">
                Login here
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
