import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Eye,
  PlusCircle,
  MinusCircle,
  Building,
  Mail,
  Phone,
  CheckCircle2,
  PackageCheck,
  Star,
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

const PO_STATUSES = ['draft', 'ordered', 'partially_received', 'received', 'cancelled'];

export const PurchasesPage = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'suppliers'

  // Purchase Orders State
  const [purchases, setPurchases] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderPagination, setOrderPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');

  // Suppliers State
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [supplierPagination, setSupplierPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [supplierSearch, setSupplierSearch] = useState('');

  // Products Reference
  const [products, setProducts] = useState([]);

  // Modals
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // New PO State
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [poItems, setPoItems] = useState([{ product: '', orderedQuantity: 1, unitCost: 0, subtotal: 0 }]);
  const [expectedDate, setExpectedDate] = useState('');
  const [poNotes, setPoNotes] = useState('');

  // New Supplier Form State
  const [supplierForm, setSupplierForm] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    paymentTerms: 'Net 30',
    rating: 5,
  });

  // Fetch Purchase Orders
  const fetchPurchaseOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await axiosClient.get(
        `/purchases?page=${orderPagination.page}&limit=${orderPagination.limit}&search=${encodeURIComponent(
          orderSearch
        )}&status=${orderStatus}`
      );
      if (res.success) {
        setPurchases(res.data);
        setOrderPagination(res.pagination);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load purchase orders.');
    } finally {
      setLoadingOrders(false);
    }
  }, [orderPagination.page, orderPagination.limit, orderSearch, orderStatus]);

  // Fetch Suppliers
  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const res = await axiosClient.get(
        `/suppliers?page=${supplierPagination.page}&limit=${supplierPagination.limit}&search=${encodeURIComponent(
          supplierSearch
        )}`
      );
      if (res.success) {
        setSuppliers(res.data);
        setSupplierPagination(res.pagination);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load suppliers.');
    } finally {
      setLoadingSuppliers(false);
    }
  }, [supplierPagination.page, supplierPagination.limit, supplierSearch]);

  // Load products & initial suppliers
  useEffect(() => {
    const loadInit = async () => {
      try {
        const [prodRes, supRes] = await Promise.all([
          axiosClient.get('/products?limit=100'),
          axiosClient.get('/suppliers?limit=100'),
        ]);
        if (prodRes.success) setProducts(prodRes.data);
        if (supRes.success) setSuppliers(supRes.data);
      } catch (e) {
        console.error(e);
      }
    };
    loadInit();
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') fetchPurchaseOrders();
    else fetchSuppliers();
  }, [activeTab, fetchPurchaseOrders, fetchSuppliers]);

  // Line item handlers
  const handleItemProductChange = (index, productId) => {
    const selectedProd = products.find((p) => p._id === productId);
    const updated = [...poItems];
    const unitCost = selectedProd ? selectedProd.costPrice : 0;
    const qty = updated[index].orderedQuantity || 1;

    updated[index] = {
      product: productId,
      orderedQuantity: qty,
      unitCost,
      subtotal: unitCost * qty,
    };
    setPoItems(updated);
  };

  const handleItemQtyChange = (index, qty) => {
    const orderedQuantity = Math.max(1, Number(qty) || 1);
    const updated = [...poItems];
    const unitCost = updated[index].unitCost || 0;

    updated[index] = {
      ...updated[index],
      orderedQuantity,
      subtotal: unitCost * orderedQuantity,
    };
    setPoItems(updated);
  };

  const handleAddItemRow = () => {
    setPoItems([...poItems, { product: '', orderedQuantity: 1, unitCost: 0, subtotal: 0 }]);
  };

  const handleRemoveItemRow = (index) => {
    if (poItems.length > 1) {
      setPoItems(poItems.filter((_, i) => i !== index));
    }
  };

  const poTotal = poItems.reduce((sum, it) => sum + (it.subtotal || 0), 0);

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) {
      setFormError('Please select a supplier.');
      return;
    }

    const validItems = poItems.filter((it) => it.product && it.orderedQuantity > 0);
    if (validItems.length === 0) {
      setFormError('Please add at least one product line item.');
      return;
    }

    setModalLoading(true);
    setFormError('');

    try {
      await axiosClient.post('/purchases', {
        supplier: selectedSupplier,
        items: validItems,
        expectedDate: expectedDate || null,
        notes: poNotes,
      });

      toast.success('Purchase order created successfully.');
      setShowCreatePOModal(false);
      setSelectedSupplier('');
      setPoItems([{ product: '', orderedQuantity: 1, unitCost: 0, subtotal: 0 }]);
      fetchPurchaseOrders();
    } catch (err) {
      setFormError(err.message || 'Failed to create PO.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.companyName || !supplierForm.email) {
      setFormError('Company name and email are required.');
      return;
    }

    setModalLoading(true);
    setFormError('');

    try {
      await axiosClient.post('/suppliers', supplierForm);
      toast.success('Supplier added.');
      setShowAddSupplierModal(false);
      setSupplierForm({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        paymentTerms: 'Net 30',
        rating: 5,
      });
      fetchSuppliers();
    } catch (err) {
      setFormError(err.message || 'Failed to add supplier.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchases & Suppliers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Procurement management, replenishment purchase orders, and goods receiving.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'orders' ? (
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setFormError('');
                setShowCreatePOModal(true);
              }}
            >
              Create Purchase Order
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setFormError('');
                setShowAddSupplierModal(true);
              }}
            >
              Add New Supplier
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" /> Purchase Orders
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'suppliers'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" /> Vendor Suppliers
        </button>
      </div>

      {activeTab === 'orders' ? (
        /* Orders View */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by PO # or supplier..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 capitalize"
            >
              <option value="all">All PO Statuses</option>
              {PO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loadingOrders ? (
              <div className="p-6">
                <LoadingSkeleton count={6} />
              </div>
            ) : purchases.length === 0 ? (
              <EmptyState
                title="No purchase orders"
                description="Create replenishment purchase orders to restock inventory from verified suppliers."
                actionLabel="Create PO"
                onAction={() => setShowCreatePOModal(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">PO Number</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Date Placed</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Receiving Status</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {purchases.map((po) => (
                      <tr key={po._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{po.poNumber}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{po.supplier?.companyName || 'Supplier'}</p>
                          <span className="text-[10px] text-slate-400">{po.supplier?.contactPerson}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{formatDate(po.orderDate)}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{formatCurrency(po.totalAmount)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadgeClass(po.status)}`}>
                            {po.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadgeClass(po.paymentStatus)}`}>
                            {po.paymentStatus?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => navigate(`/purchases/${po._id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="View PO & Receive Goods"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              page={orderPagination.page}
              totalPages={orderPagination.totalPages}
              total={orderPagination.total}
              limit={orderPagination.limit}
              onPageChange={(p) => setOrderPagination((prev) => ({ ...prev, page: p }))}
            />
          </div>
        </div>
      ) : (
        /* Suppliers View */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search suppliers by name or email..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loadingSuppliers ? (
              <div className="p-6">
                <LoadingSkeleton count={6} />
              </div>
            ) : suppliers.length === 0 ? (
              <EmptyState
                title="No suppliers found"
                description="Add supplier credentials to streamline inventory sourcing."
                actionLabel="Add Supplier"
                onAction={() => setShowAddSupplierModal(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Supplier Company</th>
                      <th className="py-3 px-4">Contact Person</th>
                      <th className="py-3 px-4">Contact Info</th>
                      <th className="py-3 px-4">Payment Terms</th>
                      <th className="py-3 px-4">Rating</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {suppliers.map((s) => (
                      <tr key={s._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{s.companyName}</p>
                          <span className="font-mono text-[10px] text-slate-400 font-semibold">{s.supplierId}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 font-medium">{s.contactPerson || '—'}</td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <p>{s.email}</p>
                          <p className="text-[11px] text-slate-400">{s.phone}</p>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">{s.paymentTerms}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {s.rating || 5}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadgeClass(s.status)}`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={showCreatePOModal}
        onClose={() => setShowCreatePOModal(false)}
        title="Create Replenishment Purchase Order"
        subtitle="Select vendor supplier and line items to order."
        maxWidth="max-w-3xl"
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreatePO} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Select Supplier"
              required
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              options={suppliers.map((s) => ({ value: s._id, label: s.companyName }))}
            />

            <Input
              label="Expected Delivery Date"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>

          {/* Line Items */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Products to Order
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
              {poItems.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex-1">
                    <select
                      value={row.product}
                      onChange={(e) => handleItemProductChange(idx, e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      required
                    >
                      <option value="">Select product to reorder...</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.sku}) - Cost: {formatCurrency(p.costPrice)} [Stock: {p.availableQuantity}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={row.orderedQuantity}
                      onChange={(e) => handleItemQtyChange(idx, e.target.value)}
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
                    disabled={poItems.length <= 1}
                    className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                  >
                    <MinusCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
            <span>Total Estimated Cost:</span>
            <span className="text-indigo-600 text-base">{formatCurrency(poTotal)}</span>
          </div>

          <Input
            label="Procurement Notes"
            placeholder="Delivery terms, warehouse bay instructions..."
            value={poNotes}
            onChange={(e) => setPoNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowCreatePOModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading}>
              Place Purchase Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        title="Add Vendor Supplier"
        subtitle="Record vendor contact credentials and standard payment terms."
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
            {formError}
          </div>
        )}

        <form onSubmit={handleAddSupplier} className="space-y-4">
          <Input
            label="Company Name"
            required
            placeholder="e.g. Apex Industrial Solutions Ltd"
            value={supplierForm.companyName}
            onChange={(e) => setSupplierForm({ ...supplierForm, companyName: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Person"
              placeholder="Gautam Deshmukh"
              value={supplierForm.contactPerson}
              onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
            />

            <Input
              label="Email Address"
              type="email"
              required
              placeholder="orders@apexindustrial.com"
              value={supplierForm.email}
              onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              placeholder="+91 20 2712 3456"
              value={supplierForm.phone}
              onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
            />

            <Select
              label="Payment Terms"
              value={supplierForm.paymentTerms}
              onChange={(e) => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}
              options={[
                { value: 'Net 15', label: 'Net 15 Days' },
                { value: 'Net 30', label: 'Net 30 Days' },
                { value: 'Net 45', label: 'Net 45 Days' },
                { value: 'Advance', label: '100% Advance Payment' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowAddSupplierModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading}>
              Save Supplier
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
