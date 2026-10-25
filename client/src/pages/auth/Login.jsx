import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Lock, Mail, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { toast } from '../../components/common/Toast';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      toast.success('Welcome back to BizNexus ERP!');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill demo credentials
  const fillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100 mb-4">
          <Layers className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Sign in to BizNexus ERP
        </h2>
        <p className="mt-1.5 text-xs text-slate-500 font-medium">
          One Platform. Every Business Operation.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-card rounded-2xl border border-slate-200/80">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work Email Address"
              type="email"
              required
              icon={Mail}
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              required
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full justify-center py-2.5 text-sm"
              icon={ArrowRight}
            >
              Sign In to Dashboard
            </Button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Quick Demo Credentials
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => fillDemo('admin@biznexus.io', 'Password123!')}
                className="p-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors"
              >
                <p className="text-xs font-bold text-slate-800">Business Owner</p>
                <p className="text-[10px] text-slate-500 truncate">admin@biznexus.io</p>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('manager@biznexus.io', 'Password123!')}
                className="p-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors"
              >
                <p className="text-xs font-bold text-slate-800">Operations Manager</p>
                <p className="text-[10px] text-slate-500 truncate">manager@biznexus.io</p>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('accountant@biznexus.io', 'Password123!')}
                className="p-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors"
              >
                <p className="text-xs font-bold text-slate-800">Accountant</p>
                <p className="text-[10px] text-slate-500 truncate">accountant@biznexus.io</p>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('employee@biznexus.io', 'Password123!')}
                className="p-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors"
              >
                <p className="text-xs font-bold text-slate-800">Employee</p>
                <p className="text-[10px] text-slate-500 truncate">employee@biznexus.io</p>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an organization account?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-800">
              Register new business
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
