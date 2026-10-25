import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  IndianRupee,
  MessageSquare,
  Plus,
  Send,
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

export const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

  const fetchCustomer = async () => {
    try {
      const res = await axiosClient.get(`/customers/${id}`);
      if (res.success) {
        setCustomer(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load customer profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setNoteLoading(true);
    try {
      const res = await axiosClient.post(`/customers/${id}/notes`, { content: noteContent });
      if (res.success) {
        toast.success('Note added.');
        setNoteContent('');
        setCustomer((prev) => ({ ...prev, notes: res.data }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save note.');
    } finally {
      setNoteLoading(false);
    }
  };

  if (loading) return <LoadingSkeleton count={6} />;

  if (!customer) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-600 mb-4">Customer not found.</p>
        <Button variant="secondary" onClick={() => navigate('/customers')} icon={ArrowLeft}>
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/customers')}
          icon={ArrowLeft}
          className="text-slate-500"
        >
          Back to Customers
        </Button>
      </div>

      {/* Customer Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border ${getStatusBadgeClass(customer.leadStatus)}`}>
                {customer.leadStatus}
              </span>
            </div>
            {customer.company && (
              <p className="text-xs text-slate-600 font-semibold mt-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {customer.company}
              </p>
            )}
            <span className="inline-block mt-1 font-mono text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
              {customer.customerId}
            </span>
          </div>

          <div className="flex items-center gap-6 text-right">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lifetime Revenue</span>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(customer.totalSpent)}</p>
            </div>
            <div className="border-l border-slate-200 pl-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Orders</span>
              <p className="text-xl font-bold text-indigo-600">{customer.ordersCount || 0}</p>
            </div>
          </div>
        </div>

        {/* Contact info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 font-semibold block mb-1">Email</span>
            <p className="font-semibold text-slate-800 break-all">{customer.email}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 font-semibold block mb-1">Phone</span>
            <p className="font-semibold text-slate-800">{customer.phone || '—'}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 font-semibold block mb-1">Assigned Account Lead</span>
            <p className="font-semibold text-slate-800">
              {customer.assignedEmployee ? customer.assignedEmployee.fullName : 'Unassigned'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Associated Orders (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-indigo-600" /> Associated Sales Orders
            </h3>
            <span className="text-xs text-slate-400">{customer.orders?.length || 0} orders recorded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="py-2.5">Order No</th>
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Amount</th>
                  <th className="py-2.5">Order Status</th>
                  <th className="py-2.5">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {customer.orders?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No sales orders logged for this client yet.
                    </td>
                  </tr>
                ) : (
                  customer.orders?.map((ord) => (
                    <tr
                      key={ord._id}
                      onClick={() => navigate(`/sales/${ord._id}`)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                    >
                      <td className="py-3 font-bold font-mono text-indigo-600">{ord.orderNumber}</td>
                      <td className="py-3 text-slate-600">{formatDate(ord.orderDate)}</td>
                      <td className="py-3 font-bold text-slate-900">{formatCurrency(ord.totalAmount)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadgeClass(ord.orderStatus)}`}>
                          {ord.orderStatus}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadgeClass(ord.paymentStatus)}`}>
                          {ord.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interaction Notes (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-indigo-600" /> Activity & Notes
            </h3>

            {/* Note Input */}
            <form onSubmit={handleAddNote} className="mb-4">
              <textarea
                rows={2}
                placeholder="Log a client conversation, meeting note, or follow-up..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
              />
              <div className="flex justify-end mt-1.5">
                <Button type="submit" variant="primary" size="sm" loading={noteLoading} icon={Send}>
                  Save Note
                </Button>
              </div>
            </form>

            {/* Notes List */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {customer.notes?.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No notes logged yet.</p>
              ) : (
                customer.notes?.map((n, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-800">{n.content}</p>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 font-medium">
                      <span>By {n.author}</span>
                      <span>{formatDateTime(n.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
