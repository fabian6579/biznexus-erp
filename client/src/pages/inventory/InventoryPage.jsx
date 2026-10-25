import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  SlidersHorizontal,
  Edit,
  Trash2,
  Eye,
  ArrowUpDown,
  History,
  TrendingUp,
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
import { formatCurrency, getStatusBadgeClass } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = [
  'Electronics',
  'Hardware',
  'Raw Materials',
  'Office Supplies',
  'Software',
  'Services',
  'Packaging',
  'Other',
];

export const InventoryPage = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Add/Edit Form
  const initialForm = {
    name: '',
    sku: '',
    category: 'Hardware',
    description: '',
    costPrice: '',
    sellingPrice: '',
    availableQuantity: 0,
    minStockLevel: 10,
    unit: 'units',
    supplier: '',
  };
  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState('');

  // Stock Adjustment Form
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Manual physical inventory count adjustment');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(
        `/products?page=${pagination.page}&limit=${pagination.limit}&search=${encodeURIComponent(
          search
        )}&category=${category}&lowStock=${lowStockOnly}`
      );
      if (res.success) {
        setProducts(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, category, lowStockOnly]);

  // Load suppliers for dropdown
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const res = await axiosClient.get('/suppliers?limit=100');
        if (res.success) setSuppliers(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    loadSuppliers();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.costPrice === '' || formData.sellingPrice === '') {
      setFormError('Product Name, Cost Price, and Selling Price are required.');
      return;
    }

    setModalLoading(true);
    setFormError('');

    try {
      await axiosClient.post('/products', formData);
      toast.success('Product created successfully.');
      setShowAddModal(false);
      setFormData(initialForm);
      fetchProducts();
    } catch (err) {
      setFormError(err.message || 'Failed to create product.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenEdit = (prod) => {
    setActiveProduct(prod);
    setFormData({
      name: prod.name || '',
      sku: prod.sku || '',
      category: prod.category || 'Hardware',
      description: prod.description || '',
      costPrice: prod.costPrice || 0,
      sellingPrice: prod.sellingPrice || 0,
      minStockLevel: prod.minStockLevel || 10,
      unit: prod.unit || 'units',
      supplier: prod.supplier?._id || '',
      status: prod.status || 'active',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setFormError('');

    try {
      await axiosClient.put(`/products/${activeProduct._id}`, formData);
      toast.success('Product updated successfully.');
      setShowEditModal(false);
      fetchProducts();
    } catch (err) {
      setFormError(err.message || 'Failed to update product.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustQty || Number(adjustQty) === 0) {
      toast.error('Adjustment quantity must not be zero.');
      return;
    }

    setModalLoading(true);
    try {
      await axiosClient.post(`/products/${activeProduct._id}/adjust`, {
        adjustmentQuantity: Number(adjustQty),
        reason: adjustReason,
      });
      toast.success('Inventory stock adjusted successfully.');
      setShowAdjustModal(false);
      setAdjustQty('');
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Stock adjustment failed.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    setModalLoading(true);
    try {
      await axiosClient.delete(`/products/${activeProduct._id}`);
      toast.success('Product removed.');
      setShowDeleteModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Could not delete product.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory & Stock Control</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time product quantities, warehouse valuations, and reorder alerts.
          </p>
        </div>

        {hasRole('business_owner', 'manager') && (
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setFormData(initialForm);
              setFormError('');
              setShowAddModal(true);
            }}
          >
            Add New Product
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, product name, specs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
              lowStockOnly
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock Only
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton count={6} />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No inventory records found"
            description="Add products to start tracking warehouse availability and dispatch workflows."
            actionLabel="Add Product"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">SKU & Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Stock Availability</th>
                  <th className="py-3 px-4">Cost / Selling Price</th>
                  <th className="py-3 px-4">Valuation</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {products.map((p) => {
                  const isLow = p.availableQuantity <= p.minStockLevel;
                  const totalValue = p.availableQuantity * p.costPrice;

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <span className="font-mono text-[10px] text-slate-400 font-semibold">{p.sku}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                          {p.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-xs ${
                              isLow ? 'text-rose-600' : 'text-slate-800'
                            }`}
                          >
                            {p.availableQuantity} {p.unit}
                          </span>
                          {isLow && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">Min: {p.minStockLevel} {p.unit}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{formatCurrency(p.sellingPrice)}</p>
                        <span className="text-[10px] text-slate-400">Cost: {formatCurrency(p.costPrice)}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{formatCurrency(totalValue)}</p>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/inventory/${p._id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="View Movement History"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {hasRole('business_owner', 'manager') && (
                            <button
                              onClick={() => {
                                setActiveProduct(p);
                                setAdjustQty('');
                                setShowAdjustModal(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Adjust Stock Quantity"
                            >
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                          )}

                          {hasRole('business_owner', 'manager') && (
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                              title="Edit Product"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {hasRole('business_owner') && (
                            <button
                              onClick={() => {
                                setActiveProduct(p);
                                setShowDeleteModal(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Inventory Product"
        subtitle="Specify catalog identifiers, pricing, initial opening stock, and reorder levels."
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              name="name"
              required
              placeholder="Edge Computing Gateway"
              value={formData.name}
              onChange={handleFormChange}
            />

            <Input
              label="SKU Identifier"
              name="sku"
              placeholder="e.g. SKU-1001 (Optional)"
              value={formData.sku}
              onChange={handleFormChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              name="category"
              required
              value={formData.category}
              onChange={handleFormChange}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />

            <Select
              label="Primary Supplier"
              name="supplier"
              value={formData.supplier}
              onChange={handleFormChange}
              placeholder="Select supplier (Optional)"
              options={suppliers.map((s) => ({ value: s._id, label: s.companyName }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cost Price (₹)"
              name="costPrice"
              type="number"
              required
              placeholder="4500"
              value={formData.costPrice}
              onChange={handleFormChange}
            />

            <Input
              label="Selling Price (₹)"
              name="sellingPrice"
              type="number"
              required
              placeholder="7800"
              value={formData.sellingPrice}
              onChange={handleFormChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Initial Stock Quantity"
              name="availableQuantity"
              type="number"
              value={formData.availableQuantity}
              onChange={handleFormChange}
            />

            <Input
              label="Minimum Alert Level"
              name="minStockLevel"
              type="number"
              value={formData.minStockLevel}
              onChange={handleFormChange}
            />

            <Input
              label="Unit of Measure"
              name="unit"
              placeholder="pcs, units, kg"
              value={formData.unit}
              onChange={handleFormChange}
            />
          </div>

          <Input
            label="Product Description / Specs"
            name="description"
            placeholder="Industrial IoT gateway with RS485 and 4G connectivity"
            value={formData.description}
            onChange={handleFormChange}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading}>
              Save Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Product Details"
        subtitle={`Updating ${activeProduct?.name} (${activeProduct?.sku})`}
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
            {formError}
          </div>
        )}

        <form onSubmit={handleUpdateProduct} className="space-y-4">
          <Input
            label="Product Name"
            name="name"
            required
            value={formData.name}
            onChange={handleFormChange}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              name="category"
              required
              value={formData.category}
              onChange={handleFormChange}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />

            <Input
              label="Unit of Measure"
              name="unit"
              value={formData.unit}
              onChange={handleFormChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cost Price (₹)"
              name="costPrice"
              type="number"
              required
              value={formData.costPrice}
              onChange={handleFormChange}
            />

            <Input
              label="Selling Price (₹)"
              name="sellingPrice"
              type="number"
              required
              value={formData.sellingPrice}
              onChange={handleFormChange}
            />
          </div>

          <Input
            label="Minimum Alert Level"
            name="minStockLevel"
            type="number"
            value={formData.minStockLevel}
            onChange={handleFormChange}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manual Stock Adjustment Modal */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Manual Stock Adjustment"
        subtitle={`Product: ${activeProduct?.name} (Current: ${activeProduct?.availableQuantity} ${activeProduct?.unit})`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdjustStock} className="space-y-4">
          <p className="text-xs text-slate-500">
            Enter a positive quantity to add stock (e.g. +10 for found inventory) or a negative quantity
            to deduct stock (e.g. -5 for damaged/lost inventory).
          </p>

          <Input
            label="Adjustment Quantity (+ or -)"
            type="number"
            required
            placeholder="e.g. +10 or -5"
            value={adjustQty}
            onChange={(e) => setAdjustQty(e.target.value)}
          />

          <Input
            label="Reason for Adjustment"
            required
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowAdjustModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading}>
              Confirm Adjustment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Product Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete product{' '}
            <span className="font-bold text-slate-900">{activeProduct?.name}</span>? Business rules prevent
            deleting products that appear in existing sales orders or purchase orders. Mark status as
            'discontinued' instead if historical orders exist.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={modalLoading} onClick={handleDeleteProduct}>
              Delete Product
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
