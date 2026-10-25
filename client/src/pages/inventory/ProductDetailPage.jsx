import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  History,
  TrendingUp,
  Truck,
  IndianRupee,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { toast } from '../../components/common/Toast';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusBadgeClass,
} from '../../utils/formatters';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axiosClient.get(`/products/${id}`);
        if (res.success) {
          setProduct(res.data);
        }
      } catch (err) {
        toast.error(err.message || 'Failed to load product details.');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <LoadingSkeleton count={6} />;

  if (!product) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-600 mb-4">Product not found.</p>
        <Button variant="secondary" onClick={() => navigate('/inventory')} icon={ArrowLeft}>
          Back to Inventory
        </Button>
      </div>
    );
  }

  const margin = product.sellingPrice - product.costPrice;
  const marginPct = product.sellingPrice > 0 ? Math.round((margin / product.sellingPrice) * 100) : 0;
  const isLow = product.availableQuantity <= product.minStockLevel;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/inventory')}
          icon={ArrowLeft}
          className="text-slate-500"
        >
          Back to Inventory
        </Button>
      </div>

      {/* Product Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{product.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                {product.category}
              </span>
            </div>
            <span className="inline-block mt-1 font-mono text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
              SKU: {product.sku}
            </span>
            {product.description && (
              <p className="text-xs text-slate-500 mt-2 max-w-2xl">{product.description}</p>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Stock</span>
            <div className="flex items-center gap-2 justify-end mt-0.5">
              <span className={`text-2xl font-bold ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                {product.availableQuantity} {product.unit}
              </span>
              {isLow && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                  Low Stock
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">Min threshold: {product.minStockLevel} {product.unit}</span>
          </div>
        </div>

        {/* Pricing Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-6 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl">
            <span className="text-slate-400 font-semibold block mb-1">Cost Price</span>
            <p className="text-base font-bold text-slate-900">{formatCurrency(product.costPrice)}</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl">
            <span className="text-slate-400 font-semibold block mb-1">Selling Price</span>
            <p className="text-base font-bold text-slate-900">{formatCurrency(product.sellingPrice)}</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl">
            <span className="text-slate-400 font-semibold block mb-1">Gross Margin / Unit</span>
            <p className="text-base font-bold text-emerald-600">
              +{formatCurrency(margin)} ({marginPct}%)
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl">
            <span className="text-slate-400 font-semibold block mb-1">Supplier</span>
            <p className="text-xs font-semibold text-slate-800">
              {product.supplier ? product.supplier.companyName : 'Direct Manufacturer'}
            </p>
          </div>
        </div>
      </div>

      {/* Stock Movement History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" /> Stock Movement & Audit Trail
          </h3>
          <span className="text-xs text-slate-400">{product.movements?.length || 0} transaction logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5">Date & Time</th>
                <th className="py-2.5">Movement Type</th>
                <th className="py-2.5">Quantity Change</th>
                <th className="py-2.5">Balance After</th>
                <th className="py-2.5">Reference ID</th>
                <th className="py-2.5">Reason / Log</th>
                <th className="py-2.5">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {product.movements?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No movements logged for this SKU yet.
                  </td>
                </tr>
              ) : (
                product.movements?.map((mov) => {
                  const isPositive = mov.quantity > 0;
                  return (
                    <tr key={mov._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 text-slate-600">{formatDateTime(mov.createdAt)}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-slate-100 text-slate-700">
                          {mov.type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 font-bold font-mono">
                        <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                          {isPositive ? `+${mov.quantity}` : mov.quantity}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-slate-900 font-mono">{mov.balanceAfter}</td>
                      <td className="py-3 font-mono text-indigo-600 font-semibold">{mov.referenceId || '—'}</td>
                      <td className="py-3 text-slate-600 max-w-xs truncate">{mov.reason || '—'}</td>
                      <td className="py-3 text-slate-500">{mov.createdBy?.name || 'System'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
