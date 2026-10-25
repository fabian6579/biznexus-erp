import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingCart,
  Building,
  User,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  AlertTriangle,
  RotateCcw,
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
import { useAuth } from '../../context/AuthContext';

export const SalesOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { organization } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await axiosClient.get(`/sales/${id}`);
      if (res.success) {
        setOrder(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load sales order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleUpdateStatus = async (status) => {
    setActionLoading(true);
    try {
      await axiosClient.patch(`/sales/${id}/status`, { status });
      toast.success(`Order status changed to '${status}'.`);
      fetchOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to update order status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setActionLoading(true);
    try {
      const res = await axiosClient.post(`/sales/${id}/invoice`);
      if (res.success) {
        toast.success(res.message);
        fetchOrder();
        setShowInvoiceModal(true);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSkeleton count={6} />;

  if (!order) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-600 mb-4">Sales order not found.</p>
        <Button variant="secondary" onClick={() => navigate('/sales')} icon={ArrowLeft}>
          Back to Sales
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/sales')}
          icon={ArrowLeft}
          className="text-slate-500"
        >
          Back to Sales Orders
        </Button>

        <div className="flex items-center gap-2">
          {order.invoice ? (
            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={() => setShowInvoiceModal(true)}
            >
              Print Invoice ({order.invoice.invoiceNumber})
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              icon={FileText}
              loading={actionLoading}
              onClick={handleGenerateInvoice}
            >
              Generate Official Invoice
            </Button>
          )}

          {/* Status Transitions */}
          {order.orderStatus === 'pending' && (
            <Button
              variant="success"
              size="sm"
              loading={actionLoading}
              onClick={() => handleUpdateStatus('confirmed')}
            >
              Confirm Order (Deduct Stock)
            </Button>
          )}

          {order.orderStatus === 'confirmed' && (
            <Button
              variant="primary"
              size="sm"
              loading={actionLoading}
              onClick={() => handleUpdateStatus('fulfilled')}
            >
              Mark Fulfilled
            </Button>
          )}

          {order.orderStatus !== 'cancelled' && order.orderStatus !== 'fulfilled' && (
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading}
              onClick={() => handleUpdateStatus('cancelled')}
            >
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {/* Main Order Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-mono text-indigo-600">{order.orderNumber}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border ${getStatusBadgeClass(order.orderStatus)}`}>
                {order.orderStatus}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border ${getStatusBadgeClass(order.paymentStatus)}`}>
                {order.paymentStatus?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Placed on {formatDate(order.orderDate)} • Created by {order.createdBy?.name || 'Staff'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Order Amount</span>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(order.totalAmount)}</p>
            <div className="mt-1">
              {order.isStockDeducted ? (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Inventory Stock Deducted
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Stock Deduction Pending
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Customer & Shipping Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-100 text-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Client / Customer</span>
            <p className="font-bold text-slate-900 text-sm">{order.customer?.name}</p>
            {order.customer?.company && (
              <p className="text-slate-600 font-medium">{order.customer.company}</p>
            )}
            <p className="text-slate-500">{order.customer?.email} • {order.customer?.phone}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Shipping Destination</span>
            <p className="text-slate-800 font-medium">
              {order.shippingAddress || 'Standard Business Address on file'}
            </p>
            {order.notes && (
              <p className="text-slate-500 italic mt-2">Notes: {order.notes}</p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="pt-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Ordered Items & Quantities</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Product / SKU</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {order.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-800">{item.productName}</p>
                      <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Totals Box */}
          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-72 space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-semibold">-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Applicable Tax ({order.taxRate}%):</span>
                <span className="font-semibold text-slate-800">{formatCurrency(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Amount:</span>
                <span className="text-indigo-600">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 pt-1">
                <span>Paid So Far:</span>
                <span>{formatCurrency(order.paidAmount || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Invoice Modal */}
      {order.invoice && (
        <Modal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          title={`Commercial Tax Invoice: ${order.invoice.invoiceNumber}`}
          maxWidth="max-w-3xl"
        >
          <div id="printable-invoice" className="p-6 bg-white space-y-6 text-slate-800">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {organization?.name || 'Nexus Dynamics Pvt Ltd'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{organization?.address?.street || 'Koramangala 4th Block'}</p>
                <p className="text-xs text-slate-500">{organization?.address?.city || 'Bengaluru'}, {organization?.address?.state || 'Karnataka'} - {organization?.address?.postalCode || '560034'}</p>
                <p className="text-xs font-mono text-slate-600 mt-1">GSTIN: {organization?.taxNumber || '29AABCN8891C1Z4'}</p>
              </div>

              <div className="text-right">
                <span className="text-lg font-bold text-indigo-600 block">TAX INVOICE</span>
                <p className="text-xs font-mono font-bold text-slate-800">{order.invoice.invoiceNumber}</p>
                <p className="text-xs text-slate-500 mt-1">Date: {formatDate(order.invoice.issueDate)}</p>
                <p className="text-xs text-slate-500">Due: {formatDate(order.invoice.dueDate)}</p>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Billed To:</span>
                <p className="font-bold text-slate-900 text-sm">{order.customer?.name}</p>
                <p className="text-slate-600">{order.customer?.company}</p>
                <p className="text-slate-500">{order.customer?.email} • {order.customer?.phone}</p>
              </div>
              <div className="text-right">
                <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Order Ref:</span>
                <p className="font-mono font-semibold text-slate-700">{order.orderNumber}</p>
                <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadgeClass(order.invoice.status)}`}>
                  Status: {order.invoice.status}
                </span>
              </div>
            </div>

            {/* Items */}
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.invoice.items?.map((it, i) => (
                  <tr key={i}>
                    <td className="py-2.5 px-3">{it.description}</td>
                    <td className="py-2.5 px-3 text-center">{it.quantity}</td>
                    <td className="py-2.5 px-3 text-right">{formatCurrency(it.unitPrice)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">{formatCurrency(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Invoice Total */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs text-right">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(order.invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax Amount:</span>
                  <span>{formatCurrency(order.invoice.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Invoice Total:</span>
                  <span className="text-indigo-600">{formatCurrency(order.invoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pt-1">
                  <span>Outstanding Balance:</span>
                  <span className="font-bold text-rose-600">{formatCurrency(order.invoice.balanceDue)}</span>
                </div>
              </div>
            </div>

            {/* Print Action Bar */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 no-print">
              <Button variant="secondary" onClick={() => setShowInvoiceModal(false)}>
                Close
              </Button>
              <Button variant="primary" icon={Printer} onClick={() => window.print()}>
                Print / Save PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
