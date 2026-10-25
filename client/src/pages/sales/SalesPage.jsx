import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  FileText,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { toast } from '../../components/common/Toast';
import {
  formatCurrency,
  formatDate,
  getStatusBadgeClass,
} from '../../utils/formatters';

const ORDER_STATUSES = ['draft', 'pending', 'confirmed', 'processing', 'fulfilled', 'cancelled'];

export const SalesPage = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Create Order Form State
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [items, setItems] = useState([{ product: '', quantity: 1, unitPrice: 0, subtotal: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(18);
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [newOrderStatus, setNewOrderStatus] = useState('pending');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(
        `/sales?page=${pagination.page}&limit=${pagination.limit}&search=${encodeURIComponent(
          search
        )}&orderStatus=${orderStatus}&paymentStatus=${paymentStatus}`
      );
      if (res.success) {
        setOrders(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load sales orders.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, orderStatus, paymentStatus]);

  // Load customers & products for creation modal
  useEffect(() => {
    const loadReferences = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          axiosClient.get('/customers?limit=100'),
          axiosClient.get('/products?limit=100'),
        ]);
        if (custRes.success) setCustomers(custRes.data);
        if (prodRes.success) setProducts(prodRes.data);
      } catch (e) {
        console.error(e);
      }
    };
    loadReferences();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Line item handlers
  const handleItemProductChange = (index, productId) => {
    const selectedProd = products.find((p) => p._id === productId);
    const updated = [...items];
    const unitPrice = selectedProd ? selectedProd.sellingPrice : 0;
    const qty = updated[index].quantity || 1;

    updated[index] = {
      product: productId,
      quantity: qty,
      unitPrice,
      subtotal: unitPrice * qty,
    };
    setItems(updated);
  };

  const handleItemQuantityChange = (index, qty) => {
    const quantity = Math.max(1, Number(qty) || 1);
    const updated = [...items];
    const unitPrice = updated[index].unitPrice || 0;

    updated[index] = {
      ...updated[index],
      quantity,
      subtotal: unitPrice * quantity,
    };
    setItems(updated);
  };

  const handleAddItemRow = () => {
    setItems([...items, { product: '', quantity: 1, unitPrice: 0, subtotal: 0 }]);
  };

  const handleRemoveItemRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Computations
  const subtotal = items.reduce((sum, it) => sum + (it.subtotal || 0), 0);
  const taxableAmount = Math.max(0, subtotal - Number(discount || 0));
  const taxAmount = Math.round(taxableAmount * (Number(taxRate || 0) / 100));
  const grandTotal = taxableAmount + taxAmount;

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setFormError('Please select a customer.');
      return;
    }

    const validItems = items.filter((it) => it.product && it.quantity > 0);
    if (validItems.length === 0) {
      setFormError('Please add at least one valid product line item.');
      return;
    }

    setModalLoading(true);
    setFormError('');

    try {
      await axiosClient.post('/sales', {
        customer: selectedCustomer,
        items: validItems,
        discount: Number(discount),
        taxRate: Number(taxRate),
        shippingAddress,
        notes,
        orderStatus: newOrderStatus,
      });

      toast.success('Sales order created successfully.');
      setShowCreateModal(false);
      // Reset form
      setSelectedCustomer('');
      setItems([{ product: '', quantity: 1, unitPrice: 0, subtotal: 0 }]);
      setDiscount(0);
      setShippingAddress('');
      setNotes('');
      fetchOrders();
    } catch (err) {
      setFormError(err.message || 'Failed to create sales order.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales & Order Fulfillment</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Process commercial sales orders, stock dispatches, and client invoicing.
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setFormError('');
            setShowCreateModal(true);
          }}
        >
          Create Sales Order
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order # (e.g. SO-10001) or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={orderStatus}
            onChange={(e) => setOrderStatus(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
          >
            <option value="all">All Order Statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
          >
            <option value="all">All Payment Statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton count={6} />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No sales orders found"
            description="Create an order for an existing client to initiate fulfillment workflows."
            actionLabel="Create Order"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Customer & Account</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Fulfillment Status</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {orders.map((o) => (
                  <tr key={o._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                      {o.orderNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{o.customer?.name || 'Customer'}</p>
                      {o.customer?.company && (
                        <p className="text-[11px] text-slate-500">{o.customer.company}</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">{formatDate(o.orderDate)}</td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatCurrency(o.totalAmount)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadgeClass(o.orderStatus)}`}>
                        {o.orderStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadgeClass(o.paymentStatus)}`}>
                        {o.paymentStatus?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/sales/${o._id}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        />
      </div>

      {/* Create Sales Order Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Sales Order"
        subtitle="Select client, configure product line items, and generate order document."
        maxWidth="max-w-3xl"
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Select Customer"
              required
              value={selectedCustomer}
              onChange={(e) => {
                setSelectedCustomer(e.target.value);
                const cust = customers.find((c) => c._id === e.target.value);
                if (cust?.address?.street) {
                  setShippingAddress(`${cust.address.street}, ${cust.address.city || ''}`);
                }
              }}
              options={customers.map((c) => ({
                value: c._id,
                label: `${c.name} ${c.company ? `(${c.company})` : ''}`,
              }))}
            />

            <Select
              label="Initial Order Status"
              value={newOrderStatus}
              onChange={(e) => setNewOrderStatus(e.target.value)}
              options={[
                { value: 'pending', label: 'Pending (Hold Stock)' },
                { value: 'confirmed', label: 'Confirmed (Deduct Stock)' },
                { value: 'draft', label: 'Draft' },
              ]}
            />
          </div>

          {/* Line Items Table Builder */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Order Line Items
              </span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add Product Row
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto p-1">
              {items.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex-1">
                    <select
                      value={row.product}
                      onChange={(e) => handleItemProductChange(idx, e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      required
                    >
                      <option value="">Choose product...</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id} disabled={p.availableQuantity <= 0}>
                          {p.name} ({p.sku}) - {formatCurrency(p.sellingPrice)} [Stock: {p.availableQuantity}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={row.quantity}
                      onChange={(e) => handleItemQuantityChange(idx, e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 text-center"
                      required
                    />
                  </div>

                  <div className="w-28 text-right font-bold text-xs text-slate-800 font-mono">
                    {formatCurrency(row.subtotal)}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(idx)}
                    disabled={items.length <= 1}
                    className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                  >
                    <MinusCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-600">Discount Amount (₹):</span>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-28 text-right p-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-600">Tax Rate (%):</span>
              <input
                type="number"
                min="0"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-28 text-right p-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
              <span>Tax Calculated:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(taxAmount)}</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="text-indigo-600 font-bold">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <Input
            label="Shipping Destination Address"
            placeholder="Street address, City, Pincode"
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
          />

          <Input
            label="Order Notes / PO Reference"
            placeholder="Delivery terms, special customer instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading}>
              Confirm & Create Order
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
