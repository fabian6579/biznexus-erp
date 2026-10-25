import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  UserCheck,
  AlertTriangle,
  Clock,
  RefreshCw,
  Calendar,
  ArrowRight,
  ExternalLink,
  Package,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import axiosClient from '../../api/axiosClient';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { formatCurrency, formatDate, getStatusBadgeClass, getPriorityBadgeClass } from '../../utils/formatters';

const STATUS_COLORS = {
  confirmed: '#10b981',
  fulfilled: '#059669',
  pending: '#f59e0b',
  processing: '#6366f1',
  draft: '#94a3b8',
  cancelled: '#f43f5e',
};

export const DashboardPage = () => {
  const navigate = useNavigate();

  const [timeframe, setTimeframe] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomDates, setShowCustomDates] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      let queryUrl = `/dashboard/summary?timeframe=${timeframe}`;
      if (timeframe === 'custom' && customStart && customEnd) {
        queryUrl += `&startDate=${customStart}&endDate=${customEnd}`;
      }

      const res = await axiosClient.get(queryUrl);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeframe, customStart, customEnd]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleTimeframeChange = (tf) => {
    setTimeframe(tf);
    if (tf === 'custom') {
      setShowCustomDates(true);
    } else {
      setShowCustomDates(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
        </div>
        <LoadingSkeleton count={8} type="card" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200/80 rounded-xl animate-pulse" />
          <div className="h-80 bg-slate-200/80 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 shadow-sm">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-800">Error Loading Dashboard</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
        <Button variant="primary" size="sm" onClick={() => fetchDashboardData()}>
          Try Again
        </Button>
      </div>
    );
  }

  const { kpis, charts, activities } = data || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Date Range Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Enterprise Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time operations, financial telemetry, and inventory metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe pill selector */}
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: 'this_year', label: 'This Year' },
              { id: 'custom', label: 'Custom' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => handleTimeframeChange(btn.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  timeframe === btn.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            loading={refreshing}
            icon={RefreshCw}
            title="Refresh dashboard metrics"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Custom Date Range Selectors if selected */}
      {showCustomDates && (
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 animate-in fade-in">
          <span className="text-xs font-semibold text-slate-600">Select Date Range:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
          />
          <Button variant="primary" size="sm" onClick={() => fetchDashboardData()}>
            Apply Filter
          </Button>
        </div>
      )}

      {/* KPI Cards Grid (8 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(kpis?.totalRevenue)}
          subtitle="Confirmed sales & income"
          icon={IndianRupee}
          colorScheme="indigo"
        />

        <StatCard
          title="Total Expenses"
          value={formatCurrency(kpis?.totalExpenses)}
          subtitle="Operational expenses & purchases"
          icon={TrendingDown}
          colorScheme="amber"
        />

        <StatCard
          title="Net Operating Profit"
          value={formatCurrency(kpis?.netProfit)}
          subtitle={kpis?.netProfit >= 0 ? 'Operating profit surplus' : 'Operating deficit'}
          icon={TrendingUp}
          trend={kpis?.netProfit >= 0 ? '+Positive' : '-Deficit'}
          trendPositive={kpis?.netProfit >= 0}
          colorScheme={kpis?.netProfit >= 0 ? 'emerald' : 'rose'}
        />

        <StatCard
          title="Total Orders"
          value={kpis?.totalOrders || 0}
          subtitle="Customer sales orders placed"
          icon={ShoppingCart}
          colorScheme="sky"
        />

        <StatCard
          title="Active Customers"
          value={kpis?.totalCustomers || 0}
          subtitle="Client relationships logged"
          icon={UserCheck}
          colorScheme="purple"
        />

        <StatCard
          title="Total Workforce"
          value={kpis?.totalEmployees || 0}
          subtitle="Active on-payroll employees"
          icon={Users}
          colorScheme="indigo"
        />

        <StatCard
          title="Low-Stock Alerts"
          value={kpis?.lowStockCount || 0}
          subtitle="Items below reorder limit"
          icon={AlertTriangle}
          trend={kpis?.lowStockCount > 0 ? 'Needs Attention' : 'Optimal'}
          trendPositive={kpis?.lowStockCount === 0}
          colorScheme={kpis?.lowStockCount > 0 ? 'rose' : 'emerald'}
        />

        <StatCard
          title="Pending Tasks"
          value={kpis?.pendingTasks || 0}
          subtitle="Open operational assignments"
          icon={Clock}
          colorScheme="amber"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Expenses Area Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revenue vs. Expenses Trend</h3>
              <p className="text-xs text-slate-500">6-Month financial performance trajectory</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-indigo-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-amber-500">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Expenses
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.monthlyTrends || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), '']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Breakdown (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Order Status Distribution</h3>
            <p className="text-xs text-slate-500 mb-2">Breakdown of orders across pipeline</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {charts?.orderStatusDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.orderStatusDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {charts.orderStatusDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.status] || '#6366f1'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(count, status) => [`${count} orders`, status.toUpperCase()]}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '10px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No orders in selected range</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-100">
            {charts?.orderStatusDistribution?.map((item) => (
              <span key={item.status} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 capitalize">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[item.status] || '#6366f1' }}
                />
                {item.status} ({item.count})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales Orders */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Sales Orders</h3>
              <p className="text-xs text-slate-500">Latest business purchases</p>
            </div>
            <Link to="/sales" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5">Order</th>
                  <th className="py-2.5">Customer</th>
                  <th className="py-2.5">Amount</th>
                  <th className="py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {activities?.recentOrders?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No sales orders found.
                    </td>
                  </tr>
                ) : (
                  activities?.recentOrders?.map((order) => (
                    <tr
                      key={order._id}
                      onClick={() => navigate(`/sales/${order._id}`)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 font-bold text-slate-800 font-mono">{order.orderNumber}</td>
                      <td className="py-2.5 text-slate-600 truncate max-w-[140px]">
                        {order.customer?.name || 'Customer'}
                      </td>
                      <td className="py-2.5 font-bold text-slate-900">{formatCurrency(order.totalAmount)}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadgeClass(order.orderStatus)}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Items Action Panel */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Inventory Critical Stock Alerts</h3>
              <p className="text-xs text-slate-500">Products requiring replenishment</p>
            </div>
            <Link to="/inventory" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
              Manage Stock <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {activities?.lowStockProducts?.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                All inventory levels are currently above minimum threshold.
              </div>
            ) : (
              activities?.lowStockProducts?.map((product) => (
                <div
                  key={product._id}
                  onClick={() => navigate(`/inventory/${product._id}`)}
                  className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-100 text-rose-600">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{product.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {product.sku} • Min Threshold: {product.minStockLevel} {product.unit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-700 bg-white px-2 py-1 rounded-md border border-rose-200">
                      {product.availableQuantity} {product.unit} left
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
