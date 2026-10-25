import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  Building,
  Calendar,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
  Clock,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { toast } from '../../components/common/Toast';
import {
  formatCurrency,
  formatDate,
  getStatusBadgeClass,
} from '../../utils/formatters';

export const PurchaseOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Goods Receive Modal State
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveInputs, setReceiveInputs] = useState({});
  const [receiveLoading, setReceiveLoading] = useState(false);

  const fetchPO = async () => {
    try {
      const res = await axiosClient.get(`/purchases/${id}`);
      if (res.success) {
        setPo(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load purchase order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPO();
  }, [id]);

  const handleOpenReceive = () => {
    // Initialize receive inputs with remaining quantities
    const initialInputs = {};
    po.items?.forEach((it) => {
      const remaining = it.orderedQuantity - it.receivedQuantity;
      initialInputs[it.product?._id || it.product] = remaining > 0 ? remaining : 0;
    });
    setReceiveInputs(initialInputs);
    setShowReceiveModal(true);
  };

  const handleConfirmReceive = async (e) => {
    e.preventDefault();
    setReceiveLoading(true);

    try {
      const receivedItems = Object.entries(receiveInputs)
        .map(([productId, qty]) => ({
          product: productId,
          quantityReceived: Number(qty),
        }))
        .filter((it) => it.quantityReceived > 0);

      if (receivedItems.length === 0) {
        toast.error('Please enter at least one quantity to receive.');
        setReceiveLoading(false);
        return;
      }

      const res = await axiosClient.patch(`/purchases/${id}/receive`, {
        receivedItems,
      });

      if (res.success) {
        toast.success(res.message);
        setShowReceiveModal(false);
        fetchPO();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to process goods receipt.');
    } finally {
      setReceiveLoading(false);
    }
  };

  if (loading) return <LoadingSkeleton count={6} />;

  if (!po) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-600 mb-4">Purchase order not found.</p>
        <Button variant="secondary" onClick={() => navigate('/purchases')} icon={ArrowLeft}>
          Back to Purchases
        </Button>
      </div>
    );
  }

  const isFullyReceived = po.status === 'received';
  const isCancelled = po.status === 'cancelled';

  return (
    <div className="space-y-6">
      {/* Back button & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/purchases')}
          icon={ArrowLeft}
          className="text-slate-500"
        >
          Back to Purchases
        </Button>

        <div>
          {!isFullyReceived && !isCancelled && (
            <Button
              variant="primary"
              size="sm"
              icon={PackageCheck}
              onClick={handleOpenReceive}
            >
              Record Goods Received
            </Button>
          )}
        </div>
      </div>

      {/* Main PO Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-mono text-indigo-600">{po.poNumber}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border ${getStatusBadgeClass(po.status)}`}>
                {po.status?.replace('_', ' ')}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border ${getStatusBadgeClass(po.paymentStatus)}`}>
                Payment: {po.paymentStatus?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Placed on {formatDate(po.orderDate)} • Expected Delivery: {formatDate(po.expectedDate)}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Purchase Cost</span>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(po.totalAmount)}</p>
          </div>
        </div>

        {/* Supplier details */}
        <div className="py-4 border-b border-slate-100 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Vendor Supplier Information
          </span>
          <p className="font-bold text-slate-900 text-sm">{po.supplier?.companyName}</p>
          <p className="text-slate-600">
            Contact: {po.supplier?.contactPerson} • {po.supplier?.email} • {po.supplier?.phone}
          </p>
        </div>

        {/* Items Table */}
        <div className="pt-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Line Items & Receipt Status</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Product / SKU</th>
                  <th className="py-2.5 px-3 text-center">Ordered</th>
                  <th className="py-2.5 px-3 text-center">Received</th>
                  <th className="py-2.5 px-3 text-center">Outstanding</th>
                  <th className="py-2.5 px-3 text-right">Unit Cost</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {po.items?.map((it, idx) => {
                  const remaining = it.orderedQuantity - it.receivedQuantity;
                  return (
                    <tr key={idx}>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">{it.productName}</p>
                        <span className="text-[10px] font-mono text-slate-400">{it.sku}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">{it.orderedQuantity}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600">
                        {it.receivedQuantity}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-amber-600">
                        {remaining > 0 ? remaining : 0}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(it.unitCost)}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(it.subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Receive Goods Modal */}
      <Modal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title="Record Goods Received"
        subtitle={`PO Number: ${po.poNumber} — Inventory will be incremented automatically upon confirmation.`}
      >
        <form onSubmit={handleConfirmReceive} className="space-y-4">
          <p className="text-xs text-slate-500">
            Verify package contents and enter the actual physical quantity received for each line item below:
          </p>

          <div className="space-y-3">
            {po.items?.map((it) => {
              const productId = it.product?._id || it.product;
              const remaining = it.orderedQuantity - it.receivedQuantity;
              if (remaining <= 0) return null;

              return (
                <div
                  key={productId}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">{it.productName}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {it.sku} • Outstanding to receive: <span className="font-bold text-indigo-600">{remaining}</span>
                    </p>
                  </div>

                  <div className="w-32">
                    <input
                      type="number"
                      min="0"
                      max={remaining}
                      value={receiveInputs[productId] || ''}
                      onChange={(e) =>
                        setReceiveInputs({
                          ...receiveInputs,
                          [productId]: Math.min(remaining, Math.max(0, Number(e.target.value))),
                        })
                      }
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white text-center font-bold"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowReceiveModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={receiveLoading}>
              Confirm Received Stock
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
