import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  UserPlus,
  Search,
  Building,
  Mail,
  Phone,
  Edit,
  Trash2,
  Eye,
  IndianRupee,
  ShoppingBag,
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

const LEAD_STATUSES = ['lead', 'contacted', 'qualified', 'customer', 'inactive'];

export const CustomersPage = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filter & Search
  const [search, setSearch] = useState('');
  const [leadStatus, setLeadStatus] = useState('all');
  const [customerType, setCustomerType] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form State
  const initialForm = {
    name: '',
    company: '',
    email: '',
    phone: '',
    customerType: 'business',
    leadStatus: 'customer',
    assignedEmployee: '',
    address: { street: '', city: '', state: '', postalCode: '', country: 'India' },
  };
  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(
        `/customers?page=${pagination.page}&limit=${pagination.limit}&search=${encodeURIComponent(
          search
        )}&leadStatus=${leadStatus}&customerType=${customerType}`
      );
      if (res.success) {
        setCustomers(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, leadStatus, customerType]);

  // Load employees for assignment
  useEffect(() => {
    const loadEmps = async () => {
      try {
        const res = await axiosClient.get('/employees?limit=100');
        if (res.success) setEmployees(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    loadEmps();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('addr_')) {
      const field = name.replace('addr_', '');
      setFormData((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setFormError('Customer name and email are required.');
      return;
    }

    setModalLoading(true);
    setFormError('');

    try {
      await axiosClient.post('/customers', formData);
      toast.success('Customer registered successfully.');
      setShowAddModal(false);
      setFormData(initialForm);
      fetchCustomers();
    } catch (err) {
      setFormError(err.message || 'Failed to create customer.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenEdit = (cust) => {
    setActiveCustomer(cust);
    setFormData({
      name: cust.name || '',
      company: cust.company || '',
      email: cust.email || '',
      phone: cust.phone || '',
      customerType: cust.customerType || 'business',
      leadStatus: cust.leadStatus || 'customer',
      assignedEmployee: cust.assignedEmployee?._id || '',
      address: cust.address || { street: '', city: '', state: '', postalCode: '', country: 'India' },
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setFormError('');

    try {
      await axiosClient.put(`/customers/${activeCustomer._id}`, formData);
      toast.success('Customer updated successfully.');
      setShowEditModal(false);
      fetchCustomers();
    } catch (err) {
      setFormError(err.message || 'Failed to update customer.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    setModalLoading(true);
    try {
      await axiosClient.delete(`/customers/${activeCustomer._id}`);
      toast.success('Customer removed.');
      setShowDeleteModal(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err.message || 'Failed to delete customer.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">CRM & Customers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage enterprise accounts, contacts, sales pipeline, and purchase histories.
          </p>
        </div>

        <Button
          variant="primary"
          icon={UserPlus}
          onClick={() => {
            setFormData(initialForm);
            setFormError('');
            setShowAddModal(true);
          }}
        >
          Add New Customer
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, company, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={leadStatus}
            onChange={(e) => setLeadStatus(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
          >
            <option value="all">All Lead Statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Account Types</option>
            <option value="business">Business</option>
            <option value="individual">Individual</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton count={6} />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers registered"
            description="Start building your client database by registering a new business or individual customer."
            actionLabel="Add Customer"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Customer & Account</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Lead Status</th>
                  <th className="py-3 px-4">Orders & Lifetime Value</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {customers.map((cust) => (
                  <tr key={cust._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-900">{cust.name}</p>
                        {cust.company && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            {cust.company}
                          </p>
                        )}
                        <span className="font-mono text-[10px] text-slate-400 font-semibold">{cust.customerId}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <p className="truncate max-w-[160px]">{cust.email}</p>
                      <p className="text-[11px] text-slate-400">{cust.phone || '—'}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                        {cust.customerType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadgeClass(cust.leadStatus)}`}>
                        {cust.leadStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{formatCurrency(cust.totalSpent)}</p>
                      <span className="text-[10px] text-slate-500">{cust.ordersCount || 0} orders placed</span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/customers/${cust._id}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="View Profile & Orders"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(cust)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="Edit Customer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setActiveCustomer(cust);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add Customer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Customer"
        subtitle="Record corporate client or individual customer credentials."
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact / Primary Name"
              name="name"
              required
              placeholder="e.g. Aarav Singhania"
              value={formData.name}
              onChange={handleFormChange}
            />

            <Input
              label="Company Name"
              name="company"
              placeholder="Singhania Tech Enterprises"
              value={formData.company}
              onChange={handleFormChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              name="email"
              type="email"
              required
              placeholder="contact@singhania.org"
              value={formData.email}
              onChange={handleFormChange}
            />

            <Input
              label="Phone Number"
              name="phone"
              placeholder="+91 99887 76655"
              value={formData.phone}
              onChange={handleFormChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Customer Type"
              name="customerType"
              value={formData.customerType}
              onChange={handleFormChange}
              options={[
                { value: 'business', label: 'Business Entity' },
                { value: 'individual', label: 'Individual Buyer' },
              ]}
            />

            <Select
              label="Lead Status"
              name="leadStatus"
              value={formData.leadStatus}
              onChange={handleFormChange}
              options={LEAD_STATUSES.map((s) => ({ value: s, label: s.toUpperCase() }))}
            />

            <Select
              label="Account Manager"
              name="assignedEmployee"
              value={formData.assignedEmployee}
              onChange={handleFormChange}
              placeholder="Unassigned"
              options={employees.map((e) => ({ value: e._id, label: e.fullName }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City"
              name="addr_city"
              placeholder="Mumbai"
              value={formData.address.city}
              onChange={handleFormChange}
            />
            <Input
              label="State / Province"
              name="addr_state"
              placeholder="Maharashtra"
              value={formData.address.state}
              onChange={handleFormChange}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading}>
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Customer Record"
        subtitle={`Editing ${activeCustomer?.name} (${activeCustomer?.customerId})`}
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
            {formError}
          </div>
        )}

        <form onSubmit={handleUpdateCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Primary Name"
              name="name"
              required
              value={formData.name}
              onChange={handleFormChange}
            />

            <Input
              label="Company Name"
              name="company"
              value={formData.company}
              onChange={handleFormChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleFormChange}
            />

            <Input
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Customer Type"
              name="customerType"
              value={formData.customerType}
              onChange={handleFormChange}
              options={[
                { value: 'business', label: 'Business Entity' },
                { value: 'individual', label: 'Individual' },
              ]}
            />

            <Select
              label="Lead Status"
              name="leadStatus"
              value={formData.leadStatus}
              onChange={handleFormChange}
              options={LEAD_STATUSES.map((s) => ({ value: s, label: s.toUpperCase() }))}
            />
          </div>

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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Customer Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete customer{' '}
            <span className="font-bold text-slate-900">{activeCustomer?.name}</span>? If there are any
            existing sales orders or invoices associated with this client, business rules prevent deletion.
            Mark lead status as 'inactive' instead.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={modalLoading} onClick={handleDeleteCustomer}>
              Delete Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
