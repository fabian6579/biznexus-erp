import axios from 'axios';
import {
  getDemoUserByEmail,
  mockDashboardData,
  mockProducts,
  mockEmployees,
  mockCustomers,
  mockSalesOrders,
  mockPurchases,
  mockSuppliers,
  mockFinance,
  mockProjects,
  mockTasks,
} from './mockData';

const rawBaseUrl = import.meta.env.VITE_API_URL || '/api';
const baseURL = rawBaseUrl.endsWith('/api') ? rawBaseUrl : (rawBaseUrl === '/api' ? '/api' : `${rawBaseUrl.replace(/\/$/, '')}/api`);

const axiosClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Bearer token if stored
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('biznexus_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Centralized mock data dispatcher for live cloud preview mode
const handleMockFallback = (url, config = {}) => {
  const targetUrl = url || '';
  console.log(`[BizNexus Live Demo Mode]: Serving mock data for ${targetUrl}`);

  // 1. Authentication
  if (targetUrl.includes('/auth/login')) {
    let email = 'admin@biznexus.io';
    try {
      const parsed = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {};
      if (parsed.email) email = parsed.email;
    } catch (e) {}

    const user = getDemoUserByEmail(email);
    localStorage.setItem('biznexus_token', 'demo_token_biznexus_enterprise_2026');
    localStorage.setItem('biznexus_user', JSON.stringify(user));

    return Promise.resolve({
      success: true,
      token: 'demo_token_biznexus_enterprise_2026',
      user,
    });
  }

  if (targetUrl.includes('/auth/me')) {
    const savedUser = localStorage.getItem('biznexus_user');
    let user = getDemoUserByEmail('admin@biznexus.io');
    if (savedUser) {
      try {
        user = JSON.parse(savedUser);
      } catch (e) {}
    }

    return Promise.resolve({
      success: true,
      user,
      organization: user.organization,
    });
  }

  // 2. Executive Dashboard
  if (targetUrl.includes('/dashboard')) {
    return Promise.resolve({
      success: true,
      data: mockDashboardData,
    });
  }

  // 3. Products / Inventory
  if (targetUrl.includes('/products')) {
    return Promise.resolve({
      success: true,
      data: mockProducts,
      pagination: { total: mockProducts.length, pages: 1, page: 1, limit: 10 },
    });
  }

  // 4. Employees / Workforce
  if (targetUrl.includes('/employees')) {
    return Promise.resolve({
      success: true,
      data: mockEmployees,
      pagination: { total: mockEmployees.length, pages: 1, page: 1, limit: 10 },
    });
  }

  // 5. Customers / CRM
  if (targetUrl.includes('/customers')) {
    return Promise.resolve({
      success: true,
      data: mockCustomers,
      pagination: { total: mockCustomers.length, pages: 1, page: 1, limit: 10 },
    });
  }

  // 6. Sales / Orders
  if (targetUrl.includes('/sales') || targetUrl.includes('/orders')) {
    return Promise.resolve({
      success: true,
      data: mockSalesOrders,
      pagination: { total: mockSalesOrders.length, pages: 1, page: 1, limit: 10 },
    });
  }

  // 7. Purchases & Suppliers
  if (targetUrl.includes('/purchases')) {
    return Promise.resolve({
      success: true,
      data: mockPurchases,
      pagination: { total: mockPurchases.length, pages: 1, page: 1, limit: 10 },
    });
  }

  if (targetUrl.includes('/suppliers')) {
    return Promise.resolve({
      success: true,
      data: mockSuppliers,
      pagination: { total: mockSuppliers.length, pages: 1, page: 1, limit: 10 },
    });
  }

  // 8. Finance & Transactions
  if (targetUrl.includes('/finance') || targetUrl.includes('/transactions')) {
    return Promise.resolve({
      success: true,
      data: mockFinance,
      pagination: { total: mockFinance.length, pages: 1, page: 1, limit: 10 },
    });
  }

  // 9. Projects & Kanban Tasks
  if (targetUrl.includes('/projects')) {
    return Promise.resolve({
      success: true,
      data: mockProjects,
    });
  }

  if (targetUrl.includes('/tasks')) {
    return Promise.resolve({
      success: true,
      data: mockTasks,
    });
  }

  // 10. Notifications
  if (targetUrl.includes('/notifications')) {
    return Promise.resolve({
      success: true,
      data: mockDashboardData.activities.recentNotifications,
    });
  }

  // Default response for mutations or unmocked routes
  return Promise.resolve({
    success: true,
    message: 'Operation performed successfully (Demo Mode)',
    data: {},
  });
};

// Response interceptor: handles both HTTP 200 SPA HTML rewrites and network/status errors
axiosClient.interceptors.response.use(
  (response) => {
    // If Vercel rewrote the API route to index.html (returns HTML string with status 200)
    const isHtml =
      typeof response.data === 'string' &&
      (response.data.includes('<!doctype') || response.data.includes('<html') || response.data.includes('window.$RefreshReg$'));

    if (isHtml || (!response.data?.success && typeof response.data !== 'object')) {
      const url = response.config?.url || '';
      return handleMockFallback(url, response.config);
    }

    return response.data;
  },
  (error) => {
    const url = error.config?.url || '';
    const status = error.response?.status;
    const isStaticDeploy = status === 405 || status === 404 || error.code === 'ERR_NETWORK' || !error.response;

    if (isStaticDeploy) {
      return handleMockFallback(url, error.config);
    }

    if (status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('biznexus_token');
      localStorage.removeItem('biznexus_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }

    const message = error.response?.data?.message || error.message || 'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export default axiosClient;
