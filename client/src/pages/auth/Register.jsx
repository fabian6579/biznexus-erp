import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Building, User, Mail, Lock, Phone, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { toast } from '../../components/common/Toast';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    organizationName: '',
    organizationCode: '',
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.organizationName || !formData.name || !formData.email || !formData.password) {
      setError('Please complete all required fields.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(formData);
      toast.success('Organization registered successfully! Welcome to BizNexus.');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100 mb-4">
          <Layers className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Register Your Business on BizNexus
        </h2>
        <p className="mt-1.5 text-xs text-slate-500 font-medium">
          Set up a centralized ERP system tailored for your enterprise operations.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-card rounded-2xl border border-slate-200/80">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company / Enterprise Name"
                name="organizationName"
                required
                icon={Building}
                placeholder="Apex Technologies Pvt Ltd"
                value={formData.organizationName}
                onChange={handleChange}
              />

              <Input
                label="Business Org Code"
                name="organizationCode"
                placeholder="e.g. APEX-01 (Optional)"
                value={formData.organizationCode}
                onChange={handleChange}
              />
            </div>

            <Input
              label="Business Owner Full Name"
              name="name"
              required
              icon={User}
              placeholder="Vikram Malhotra"
              value={formData.name}
              onChange={handleChange}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Owner Work Email"
                name="email"
                type="email"
                required
                icon={Mail}
                placeholder="owner@company.com"
                value={formData.email}
                onChange={handleChange}
              />

              <Input
                label="Phone Number"
                name="phone"
                icon={Phone}
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <Input
              label="Secure Password"
              name="password"
              type="password"
              required
              icon={Lock}
              placeholder="Min 6 characters"
              value={formData.password}
              onChange={handleChange}
            />

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full justify-center py-2.5 text-sm"
              icon={ArrowRight}
            >
              Create Business Account
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-5">
            Already registered with an organization?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-800">
              Sign in to your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
