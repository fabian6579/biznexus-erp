import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  Building,
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
import { formatDate, getStatusBadgeClass, formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

const DEPARTMENTS = [
  'Management',
  'Sales',
  'Purchasing',
  'Inventory',
  'Finance',
  'Engineering',
  'Human Resources',
  'Operations',
  'Customer Support',
];

export const EmployeesPage = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form State
  const initialFormState = {
    fullName: '',
    email: '',
    phone: '',
    department: 'Engineering',
    jobTitle: '',
    joiningDate: new Date().toISOString().slice(0, 10),
    employmentStatus: 'active',
    salary: '',
    address: '',
    emergencyContact: { name: '', phone: '', relationship: '' },
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formError, setFormError] = useState('');

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(
        `/employees?page=${pagination.page}&limit=${pagination.limit}&search=${encodeURIComponent(
          search
        )}&department=${selectedDept}&employmentStatus=${selectedStatus}`
      );
      if (res.success) {
        setEmployees(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, selectedDept, selectedStatus]);

  // Fetch employee stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await axiosClient.get('/employees/stats');
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchStats();
  }, [fetchEmployees, fetchStats]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('ec_')) {
      const field = name.replace('ec_', '');
      setFormData((prev) => ({
        ...prev,
        emergencyContact: { ...prev.emergencyContact, [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.jobTitle) {
      setFormError('Please fill in Full Name, Email, and Job Title.');
      return;
    }

    setModalLoading(true);
    setFormError('');

    try {
      await axiosClient.post('/employees', formData);
      toast.success('Employee created successfully.');
      setShowAddModal(false);
      setFormData(initialFormState);
      fetchEmployees();
      fetchStats();
    } catch (err) {
      setFormError(err.message || 'Failed to create employee.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenEdit = (emp) => {
    setActiveEmployee(emp);
    setFormData({
      fullName: emp.fullName || '',
      email: emp.email || '',
      phone: emp.phone || '',
      department: emp.department || 'Operations',
      jobTitle: emp.jobTitle || '',
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().slice(0, 10) : '',
      employmentStatus: emp.employmentStatus || 'active',
      salary: emp.salary || '',
      address: emp.address || '',
      emergencyContact: emp.emergencyContact || { name: '', phone: '', relationship: '' },
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setFormError('');

    try {
      await axiosClient.put(`/employees/${activeEmployee._id}`, formData);
      toast.success('Employee record updated successfully.');
      setShowEditModal(false);
      fetchEmployees();
      fetchStats();
    } catch (err) {
      setFormError(err.message || 'Failed to update employee.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    setModalLoading(true);
    try {
      await axiosClient.delete(`/employees/${activeEmployee._id}`);
      toast.success('Employee record removed.');
      setShowDeleteModal(false);
      fetchEmployees();
      fetchStats();
    } catch (err) {
      toast.error(err.message || 'Could not delete employee.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employee Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage organization staff, roles, departments, and records.
          </p>
        </div>

        {hasRole('business_owner', 'manager') && (
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => {
              setFormData(initialFormState);
              setFormError('');
              setShowAddModal(true);
            }}
          >
            Add New Employee
          </Button>
        )}
      </div>

      {/* Stats Summary Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{stats.total || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Staff</span>
            <p className="text-xl font-bold text-emerald-700 mt-1">{stats.active || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">On Leave</span>
            <p className="text-xl font-bold text-amber-700 mt-1">{stats.onLeave || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Departments</span>
            <p className="text-xl font-bold text-indigo-700 mt-1">{stats.departmentBreakdown?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton count={6} />
          </div>
        ) : employees.length === 0 ? (
          <EmptyState
            title="No employees found"
            description="No staff records match your current filter and search conditions."
            actionLabel="Add Employee"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {emp.fullName?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{emp.fullName}</p>
                          <span className="font-mono text-[10px] text-slate-400 font-semibold">{emp.employeeId}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{emp.jobTitle}</p>
                      <span className="text-[11px] text-slate-500">{emp.department}</span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <p className="truncate max-w-[160px]">{emp.email}</p>
                      <p className="text-[11px] text-slate-400">{emp.phone || '—'}</p>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {formatDate(emp.joiningDate)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadgeClass(emp.employmentStatus)}`}>
                        {emp.employmentStatus?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/employees/${emp._id}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {hasRole('business_owner', 'manager') && (
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="Edit Employee"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {hasRole('business_owner') && (
                          <button
                            onClick={() => {
                              setActiveEmployee(emp);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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

      {/* Add Employee Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Employee"
        subtitle="Fill in staff identity, department, and operational role."
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              name="fullName"
              required
              placeholder="e.g. Rajesh Sharma"
              value={formData.fullName}
              onChange={handleFormChange}
            />

            <Input
              label="Work Email"
              name="email"
              type="email"
              required
              placeholder="rajesh@company.com"
              value={formData.email}
              onChange={handleFormChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              name="phone"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={handleFormChange}
            />

            <Select
              label="Department"
              name="department"
              required
              value={formData.department}
              onChange={handleFormChange}
              options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Job Title / Position"
              name="jobTitle"
              required
              placeholder="Senior Systems Architect"
              value={formData.jobTitle}
              onChange={handleFormChange}
            />

            <Input
              label="Joining Date"
              name="joiningDate"
              type="date"
              value={formData.joiningDate}
              onChange={handleFormChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Monthly CTC Salary (₹)"
              name="salary"
              type="number"
              placeholder="85000"
              value={formData.salary}
              onChange={handleFormChange}
            />

            <Select
              label="Employment Status"
              name="employmentStatus"
              value={formData.employmentStatus}
              onChange={handleFormChange}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'on_leave', label: 'On Leave' },
                { value: 'terminated', label: 'Terminated' },
              ]}
            />
          </div>

          <Input
            label="Residential Address"
            name="address"
            placeholder="Bengaluru, Karnataka"
            value={formData.address}
            onChange={handleFormChange}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading}>
              Save Employee
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Employee Information"
        subtitle={`Updating records for ${activeEmployee?.fullName} (${activeEmployee?.employeeId})`}
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
            {formError}
          </div>
        )}

        <form onSubmit={handleUpdateEmployee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleFormChange}
            />

            <Input
              label="Work Email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleFormChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
            />

            <Select
              label="Department"
              name="department"
              required
              value={formData.department}
              onChange={handleFormChange}
              options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Job Title"
              name="jobTitle"
              required
              value={formData.jobTitle}
              onChange={handleFormChange}
            />

            <Select
              label="Employment Status"
              name="employmentStatus"
              value={formData.employmentStatus}
              onChange={handleFormChange}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'on_leave', label: 'On Leave' },
                { value: 'terminated', label: 'Terminated' },
              ]}
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
        title="Confirm Staff Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete employee{' '}
            <span className="font-bold text-slate-900">{activeEmployee?.fullName}</span> (
            <span className="font-mono text-slate-700">{activeEmployee?.employeeId}</span>)? This action
            cannot be undone. If this staff member has active tasks or project assignments, reassign them
            first or update status to 'Terminated'.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={modalLoading} onClick={handleDeleteEmployee}>
              Delete Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
