import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  IndianRupee,
  TrendingUp,
  Package,
  Users,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import axiosClient from '../../api/axiosClient';
import { Button } from '../../components/common/Button';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { toast } from '../../components/common/Toast';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const ReportsPage = () => {
  const [reportType, setReportType] = useState('sales'); // 'sales' | 'financial' | 'inventory'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/reports/${reportType}`;
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await axiosClient.get(url);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch report.');
    } finally {
      setLoading(false);
    }
  }, [reportType, startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCSV = (type) => {
    window.open(`/api/reports/export-csv?reportType=${type}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational business intelligence, profit & loss, sales velocity, and inventory valuation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
            Print Report
          </Button>

          <Button
            variant="primary"
            icon={Download}
            onClick={() => handleExportCSV(reportType)}
          >
            Export to CSV
          </Button>
        </div>
      </div>

      {/* Report Type Selector & Date Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {[
            { id: 'sales', label: 'Sales Velocity' },
            { id: 'financial', label: 'Financial P&L' },
            { id: 'inventory', label: 'Stock Valuation' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                reportType === tab.id
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs w-full md:w-auto">
          <span className="text-slate-500 font-semibold">Filter:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-300 bg-white"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-300 bg-white"
          />
          <Button variant="secondary" size="sm" onClick={() => fetchReport()}>
            Apply
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton count={6} />
      ) : reportType === 'sales' ? (
        /* ================= SALES VELOCITY REPORT ================= */
        <div className="space-y-6">
          {/* Top Selling Products */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Top Selling Products</h3>
            <p className="text-xs text-slate-500 mb-4">Volume and gross revenue rank</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-2.5">Product Name</th>
                    <th className="py-2.5">SKU</th>
                    <th className="py-2.5 text-center">Units Sold</th>
                    <th className="py-2.5 text-right">Gross Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.topProducts?.map((p, i) => (
                    <tr key={i}>
                      <td className="py-3 font-semibold text-slate-800">{p._id}</td>
                      <td className="py-3 font-mono text-slate-500">{p.sku}</td>
                      <td className="py-3 text-center font-bold text-indigo-600">{p.unitsSold}</td>
                      <td className="py-3 text-right font-bold text-slate-900">
                        {formatCurrency(p.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sales by Customer */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Top Client Accounts by Spend</h3>
            <p className="text-xs text-slate-500 mb-4">Account lifetime value breakdown</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-2.5">Client Name</th>
                    <th className="py-2.5">Company</th>
                    <th className="py-2.5 text-center">Orders Placed</th>
                    <th className="py-2.5 text-right">Total Billed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.salesByCustomer?.map((c, i) => (
                    <tr key={i}>
                      <td className="py-3 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 text-slate-600">{c.company || '—'}</td>
                      <td className="py-3 text-center font-bold text-indigo-600">{c.orderCount}</td>
                      <td className="py-3 text-right font-bold text-slate-900">
                        {formatCurrency(c.totalSpent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : reportType === 'financial' ? (
        /* ================= FINANCIAL P&L REPORT ================= */
        <div className="space-y-6">
          {/* High-level P&L Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                Total Operating Inflow
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(data?.totalIncome)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                Total Operating Expenses
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(data?.totalExpenses)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                Net Operating Result
              </span>
              <p
                className={`text-2xl font-bold mt-1 ${
                  data?.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {formatCurrency(data?.netProfit)}
              </p>
            </div>
          </div>

          {/* Expense Category Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Expenses by Category</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-2.5">Category</th>
                    <th className="py-2.5 text-center">Transactions</th>
                    <th className="py-2.5 text-right">Total Expensed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.expenseByCategory?.map((e, idx) => (
                    <tr key={idx}>
                      <td className="py-3 font-semibold text-slate-800">{e._id}</td>
                      <td className="py-3 text-center text-slate-600">{e.count}</td>
                      <td className="py-3 text-right font-bold text-amber-600">
                        {formatCurrency(e.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ================= INVENTORY VALUATION REPORT ================= */
        <div className="space-y-6">
          {/* Valuation Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total SKUs Monitored
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {data?.summary?.totalItems || 0}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                Total Inventory Valuation (Cost)
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(data?.summary?.totalCost)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                Retail Market Valuation
              </span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {formatCurrency(data?.summary?.totalValue)}
              </p>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Stock Breakdown by Category</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-2.5">Category</th>
                    <th className="py-2.5 text-center">SKUs</th>
                    <th className="py-2.5 text-center">Total Quantity</th>
                    <th className="py-2.5 text-right">Inventory Cost</th>
                    <th className="py-2.5 text-right">Retail Potential</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.categorySummary?.map((cat, idx) => (
                    <tr key={idx}>
                      <td className="py-3 font-semibold text-slate-900">{cat._id}</td>
                      <td className="py-3 text-center text-slate-600">{cat.itemCount}</td>
                      <td className="py-3 text-center font-bold text-indigo-600">{cat.totalUnits}</td>
                      <td className="py-3 text-right font-bold text-slate-800">
                        {formatCurrency(cat.inventoryCost)}
                      </td>
                      <td className="py-3 text-right font-bold text-emerald-600">
                        {formatCurrency(cat.retailValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
