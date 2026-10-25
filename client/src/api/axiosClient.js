import axios from 'axios';
import {
  mockUser,
  mockDashboardData,
  mockProducts,
  mockEmployees,
  mockCustomers,
  mockSalesOrders,
  mockPurchases,
  mockFinance,
  mockProjects,
  mockTasks,
} from './mockData';

const axiosClient = axios.create({
  baseURL: '/api',
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

// Response interceptor with graceful mock fallback for Vercel static deployments
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const url = error.config?.url || '';
    const status = error.response?.status;
    const isStaticDeployError = status === 405 || status === 404 || error.code === 'ERR_NETWORK' || !error.response;

    // Gracefully handle live cloud preview mode when backend is not deployed on the same origin
    if (isStaticDeployError) {
      console.warn(`[BizNexus Live Demo Mode]: Mocking response for ${url}`);

      if (url.includes('/auth/login')) {
        let reqUser = { ...mockUser };
        try {
          const body = JSON.parse(error.config.data || '{}');
          if (body.email) {
            reqUser.email = body.email;
            if (body.email.includes('manager')) {
              reqUser.name = 'Rajesh Sharma (Operations Manager)';
              reqUser.role = 'manager';
              reqUser.department = 'Operations';
            } else if (body.email.includes('accountant')) {
              reqUser.name = 'Ananya Verma (Accountant)';
              reqUser.role = 'accountant';
              reqUser.department = 'Finance';
            } else if (body.email.includes('employee')) {
              reqUser.name = 'Priya Sundaram (Employee)';
              reqUser.role = 'employee';
              reqUser.department = 'Sales';
            }
          }
        } catch (e) {}

        return Promise.resolve({
          success: true,
          token: 'demo_token_biznexus_enterprise_2026',
          user: reqUser,
        });
      }

      if (url.includes('/auth/me')) {
        const savedUser = localStorage.getItem('biznexus_user');
        const user = savedUser ? JSON.parse(savedUser) : mockUser;
        return Promise.resolve({
          success: true,
          user,
          organization: user.organization || mockUser.organization,
        });
      }

      if (url.includes('/dashboard/summary')) {
        return Promise.resolve({
          success: true,
          data: mockDashboardData,
        });
      }

      if (url.includes('/products')) {
        return Promise.resolve({
          success: true,
          data: mockProducts,
          pagination: { total: mockProducts.length, pages: 1, page: 1, limit: 10 },
        });
      }

      if (url.includes('/employees')) {
        return Promise.resolve({
          success: true,
          data: mockEmployees,
          pagination: { total: mockEmployees.length, pages: 1, page: 1, limit: 10 },
        });
      }

      if (url.includes('/customers')) {
        return Promise.resolve({
          success: true,
          data: mockCustomers,
          pagination: { total: mockCustomers.length, pages: 1, page: 1, limit: 10 },
        });
      }

      if (url.includes('/sales') || url.includes('/orders')) {
        return Promise.resolve({
          success: true,
          data: mockSalesOrders,
          pagination: { total: mockSalesOrders.length, pages: 1, page: 1, limit: 10 },
        });
      }

      if (url.includes('/purchases')) {
        return Promise.resolve({
          success: true,
          data: mockPurchases,
          pagination: { total: mockPurchases.length, pages: 1, page: 1, limit: 10 },
        });
      }

      if (url.includes('/finance') || url.includes('/transactions')) {
        return Promise.resolve({
          success: true,
          data: mockFinance,
          pagination: { total: mockFinance.length, pages: 1, page: 1, limit: 10 },
        });
      }

      if (url.includes('/projects')) {
        return Promise.resolve({
          success: true,
          data: mockProjects,
        });
      }

      if (url.includes('/tasks')) {
        return Promise.resolve({
          success: true,
          data: mockTasks,
        });
      }

      if (url.includes('/notifications')) {
        return Promise.resolve({
          success: true,
          data: mockDashboardData.activities.recentNotifications,
        });
      }

      // Default safe response for other actions (CRUD adds, updates, deletes)
      return Promise.resolve({
        success: true,
        message: 'Action completed successfully in demo preview mode.',
        data: {},
      });
    }

    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
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
