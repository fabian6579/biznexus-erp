import React, { useState, useEffect } from 'react';
import {
  Building,
  User,
  Shield,
  History,
  Lock,
  Mail,
  Phone,
  Save,
  UserPlus,
  KeyRound,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { formatDate, formatDateTime, getStatusBadgeClass } from '../../utils/formatters';

export const SettingsPage = () => {
  const { user, organization, refreshUser, hasRole } = useAuth();

  const [activeTab, setActiveTab] = useState('organization'); // 'organization' | 'profile' | 'users' | 'audit'

  // Organization Settings Form
  const [orgForm, setOrgForm] = useState({
    name: '',
    phone: '',
    email: '',
    taxNumber: '',
    currency: 'INR',
    currencySymbol: '₹',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    defaultTaxRate: 18,
  });
  const [orgLoading, setOrgLoading] = useState(false);

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Team Users
  const [teamUsers, setTeamUsers] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: 'Operations',
    phone: '',
  });
  const [userModalLoading, setUserModalLoading] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Populate Org & User state on mount
  useEffect(() => {
    if (organization) {
      setOrgForm({
        name: organization.name || '',
        phone: organization.phone || '',
        email: organization.email || '',
        taxNumber: organization.taxNumber || '',
        currency: organization.currency || 'INR',
        currencySymbol: organization.currencySymbol || '₹',
        street: organization.address?.street || '',
        city: organization.address?.city || '',
        state: organization.address?.state || '',
        postalCode: organization.address?.postalCode || '',
        country: organization.address?.country || 'India',
        defaultTaxRate: organization.settings?.defaultTaxRate || 18,
      });
    }
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
      }));
    }
  }, [organization, user]);

  // Load team users
  const fetchUsers = async () => {
    try {
      const res = await axiosClient.get('/settings/users');
      if (res.success) setTeamUsers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  // Load audit logs
  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await axiosClient.get('/settings/audit-logs');
      if (res.success) setAuditLogs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab]);

  const handleUpdateOrg = async (e) => {
    e.preventDefault();
    setOrgLoading(true);
    try {
      await axiosClient.put('/settings/organization', {
        name: orgForm.name,
        phone: orgForm.phone,
        email: orgForm.email,
        taxNumber: orgForm.taxNumber,
        currency: orgForm.currency,
        currencySymbol: orgForm.currencySymbol,
        address: {
          street: orgForm.street,
          city: orgForm.city,
          state: orgForm.state,
          postalCode: orgForm.postalCode,
          country: orgForm.country,
        },
        settings: {
          defaultTaxRate: Number(orgForm.defaultTaxRate),
        },
      });
      toast.success('Organization configuration updated successfully.');
      refreshUser();
    } catch (err) {
      toast.error(err.message || 'Failed to update organization settings.');
    } finally {
      setOrgLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      // Profile name/phone
      await axiosClient.put('/auth/profile', {
        name: profileForm.name,
        phone: profileForm.phone,
      });

      // Password change if supplied
      if (profileForm.newPassword) {
        if (profileForm.newPassword !== profileForm.confirmPassword) {
          toast.error('New passwords do not match.');
          setProfileLoading(false);
          return;
        }
        await axiosClient.put('/auth/change-password', {
          currentPassword: profileForm.currentPassword,
          newPassword: profileForm.newPassword,
        });
        setProfileForm((prev) => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
      }

      toast.success('Profile credentials updated.');
      refreshUser();
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserModalLoading(true);
    try {
      await axiosClient.post('/settings/users', newUserForm);
      toast.success('New team user added.');
      setShowAddUserModal(false);
      setNewUserForm({
        name: '',
        email: '',
        password: '',
        role: 'employee',
        department: 'Operations',
        phone: '',
      });
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to create user.');
    } finally {
      setUserModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System & Enterprise Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure business profile, user access permissions, and security parameters.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('organization')}
          className={`pb-3 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'organization'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" /> Business Profile
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4" /> User Profile & Security
        </button>

        {hasRole('business_owner', 'manager') && (
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" /> Team & Roles Access
          </button>
        )}

        {hasRole('business_owner') && (
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" /> Audit Trail Logs
          </button>
        )}
      </div>

      {activeTab === 'organization' ? (
        /* ================= BUSINESS PROFILE ================= */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs max-w-4xl">
          <form onSubmit={handleUpdateOrg} className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Company Identification</h3>
              <p className="text-xs text-slate-500">Legal entity information and tax identifier</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Enterprise Name"
                required
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
              />

              <Input
                label="Tax Identifier / GSTIN"
                placeholder="29AABCN8891C1Z4"
                value={orgForm.taxNumber}
                onChange={(e) => setOrgForm({ ...orgForm, taxNumber: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Official Contact Email"
                type="email"
                value={orgForm.email}
                onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
              />

              <Input
                label="Official Phone"
                value={orgForm.phone}
                onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Headquarters Address</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <Input
                  label="Street Address"
                  value={orgForm.street}
                  onChange={(e) => setOrgForm({ ...orgForm, street: e.target.value })}
                />
                <Input
                  label="City"
                  value={orgForm.city}
                  onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })}
                />
                <Input
                  label="State / Province"
                  value={orgForm.state}
                  onChange={(e) => setOrgForm({ ...orgForm, state: e.target.value })}
                />
                <Input
                  label="Postal Code / PIN"
                  value={orgForm.postalCode}
                  onChange={(e) => setOrgForm({ ...orgForm, postalCode: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Currency & Standard Tax Rate</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                <Input
                  label="Primary Currency Code"
                  value={orgForm.currency}
                  onChange={(e) => setOrgForm({ ...orgForm, currency: e.target.value })}
                />
                <Input
                  label="Currency Symbol"
                  value={orgForm.currencySymbol}
                  onChange={(e) => setOrgForm({ ...orgForm, currencySymbol: e.target.value })}
                />
                <Input
                  label="Default GST / Tax Rate (%)"
                  type="number"
                  value={orgForm.defaultTaxRate}
                  onChange={(e) => setOrgForm({ ...orgForm, defaultTaxRate: e.target.value })}
                />
              </div>
            </div>

            {hasRole('business_owner') && (
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button type="submit" variant="primary" loading={orgLoading} icon={Save}>
                  Save Business Profile
                </Button>
              </div>
            )}
          </form>
        </div>
      ) : activeTab === 'profile' ? (
        /* ================= USER PROFILE & SECURITY ================= */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs max-w-2xl">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
              <p className="text-xs text-slate-500">Update account identity and contact details</p>
            </div>

            <div className="space-y-4">
              <Input
                label="Full Name"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              />

              <Input
                label="Phone Number"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" /> Change Password
              </h3>
              <p className="text-xs text-slate-500 mb-3">Leave blank if you do not wish to alter your password</p>

              <div className="space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  placeholder="••••••••"
                  value={profileForm.currentPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                />

                <Input
                  label="New Password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={profileForm.newPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="••••••••"
                  value={profileForm.confirmPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button type="submit" variant="primary" loading={profileLoading} icon={Save}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      ) : activeTab === 'users' ? (
        /* ================= TEAM & USER ACCESS ================= */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900">Organization User Accounts</h3>
              <p className="text-xs text-slate-500">Manage application access credentials and role permissions</p>
            </div>

            {hasRole('business_owner') && (
              <Button
                variant="primary"
                size="sm"
                icon={UserPlus}
                onClick={() => setShowAddUserModal(true)}
              >
                Add User Account
              </Button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{u.name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 capitalize">
                          {u.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{u.department}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadgeClass(u.status)}`}>
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ================= AUDIT TRAIL LOGS ================= */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Activity & Audit Trail</h3>
            <p className="text-xs text-slate-500">Security event logging for business operations</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No audit events logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {log.userName} ({log.userRole || 'system'})
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-600">{log.module}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="Add Organization User Account"
        subtitle="Grant enterprise access to staff members."
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Staff Full Name"
            required
            placeholder="Priya Nair"
            value={newUserForm.name}
            onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
          />

          <Input
            label="Work Email Address"
            type="email"
            required
            placeholder="priya@company.com"
            value={newUserForm.email}
            onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
          />

          <Input
            label="Initial Password"
            type="password"
            required
            placeholder="Min 6 characters"
            value={newUserForm.password}
            onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Assigned System Role"
              value={newUserForm.role}
              onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
              options={[
                { value: 'business_owner', label: 'Business Owner (Full Access)' },
                { value: 'manager', label: 'Operations Manager' },
                { value: 'accountant', label: 'Accountant' },
                { value: 'employee', label: 'Employee' },
              ]}
            />

            <Select
              label="Department"
              value={newUserForm.department}
              onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
              options={[
                { value: 'Management', label: 'Management' },
                { value: 'Operations', label: 'Operations' },
                { value: 'Finance', label: 'Finance' },
                { value: 'Engineering', label: 'Engineering' },
                { value: 'Sales', label: 'Sales' },
                { value: 'Inventory', label: 'Inventory' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowAddUserModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={userModalLoading}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
