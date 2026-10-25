import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('biznexus_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [organization, setOrganization] = useState(() => {
    const saved = localStorage.getItem('biznexus_user');
    return saved ? JSON.parse(saved).organization : null;
  });
  const [loading, setLoading] = useState(true);

  // Check current session on mount
  const checkAuth = useCallback(async () => {
    try {
      const res = await axiosClient.get('/auth/me');
      if (res.success) {
        setUser(res.user);
        setOrganization(res.organization || res.user?.organization);
        localStorage.setItem('biznexus_user', JSON.stringify(res.user));
      }
    } catch (err) {
      const savedUser = localStorage.getItem('biznexus_user');
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          setUser(u);
          setOrganization(u.organization);
        } catch (e) {
          setUser(null);
          setOrganization(null);
        }
      } else {
        setUser(null);
        setOrganization(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login
  const login = async (email, password) => {
    const res = await axiosClient.post('/auth/login', { email, password });
    if (res.success) {
      if (res.token) {
        localStorage.setItem('biznexus_token', res.token);
      }
      localStorage.setItem('biznexus_user', JSON.stringify(res.user));
      setUser(res.user);
      setOrganization(res.user.organization);
      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  // Register
  const register = async (data) => {
    const res = await axiosClient.post('/auth/register', data);
    if (res.success) {
      if (res.token) {
        localStorage.setItem('biznexus_token', res.token);
      }
      localStorage.setItem('biznexus_user', JSON.stringify(res.user));
      setUser(res.user);
      setOrganization(res.user.organization);
      return res;
    }
    throw new Error(res.message || 'Registration failed');
  };

  // Logout
  const logout = async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch (e) {
      // Ignore network error during logout
    } finally {
      localStorage.removeItem('biznexus_token');
      localStorage.removeItem('biznexus_user');
      setUser(null);
      setOrganization(null);
      window.location.href = '/login';
    }
  };

  // Helper to check roles
  const hasRole = (...roles) => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'business_owner') return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        loading,
        login,
        register,
        logout,
        refreshUser: checkAuth,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
