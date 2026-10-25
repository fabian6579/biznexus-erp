import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Filter,
  FileText,
  Download,
  CreditCard,
  DollarSign,
  Calendar,
  Eye,
  CheckCircle2,
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

const EXPENSE_CATEGORIES = [
  'Office Rent & Facilities',
  'Raw Materials & Inventory',
  'Payroll & Compensation',
  'Utilities & Connectivity',
  'Cloud & Infrastructure',
  'Marketing & Advertising',
  'Shipping & Logistics',
  'Maintenance & Repairs',
  'Legal & Professional Fees',
  'Other Operational Expense',
];

const INCOME_CATEGORIES = [
  'Sales Revenue',
  'Consulting & Professional Services',
  'Subscription / Maintenance Contract',
  'Interest / Investment Income',
  'Other Income',
];

export const FinancePage = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'invoices'

  // Summary State
  const [summary, setSummary] = useState(null);

  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [txnPagination, setTxnPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [txnType, setTxnType] = useState('all');
  const [txnSearch, setTxnSearch] = useState('');

  // Invoices State
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invPagination, setInvPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [invStatus, setInvStatus] = useState('all');
  const [invSearch, setInvSearch] = useState('');

  // Modals
  const [showAddTxnModal, setShowAddTxnModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // New Transaction Form
  const [txnForm, setTxnForm] = useState({
    type: 'expense',
    category: 'Office Rent & Facilities',
    description: '',
    amount: '',
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
  });

  // Invoice Payment Form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentRef, setPaymentRef] = useState('');

  // Fetch Financial Summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await axiosClient.get('/finance/summary');
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    setLoadingTxns(true);
    try {
      const res = await axiosClient.get(
        `/finance/transactions?page=${txnPagination.page}&limit=${txnPagination.limit}&type=${txnType}&search=${encodeURIComponent(
          txnSearch
        )}`
      );
      if (res.success) {
        setTransactions(res.data);
        setTxnPagination(res.pagination);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load transactions.');
    } finally {
      setLoadingTxns(false);
    }
  }, [txnPagination.page, txnPagination.limit, txnType, txnSearch]);

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const res = await axiosClient.get(
        `/finance/invoices?page=${invPagination.page}&limit=${invPagination.limit}&status=${invStatus}&search=${encodeURIComponent(
          invSearch
        )}`
      );
      if (res.success) {
        setInvoices(res.data);
        setInvPagination(res.pagination);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load invoices.');
    } finally {
      setLoadingInvoices(false);
    }
  }, [invPagination.page, invPagination.limit, invStatus, invSearch]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab === 'transactions') fetchTransactions();
    else fetchInvoices();
  }, [activeTab, fetchTransactions, fetchInvoices]);

  const handleCreateTxn = async (e) => {
    e.preventDefault();
    if (!txnForm.amount || !txnForm.description) {
      setFormError('Amount and description are required.');
      return;
    }

    setModalLoading(true);
    setFormError('');

    try {
      await axiosClient.post('/finance/transactions', txnForm);
      toast.success(`${txnForm.type === 'income' ? 'Income' : 'Expense'} recorded successfully.`);
      setShowAddTxnModal(false);
      setTxnForm({
        type: 'expense',
        category: 'Office Rent & Facilities',
        description: '',
        amount: '',
        paymentMethod: 'bank_transfer',
        referenceNumber: '',
      });
      fetchTransactions();
      fetchSummary();
    } catch (err) {
      setFormError(err.message || 'Failed to record transaction.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setFormError('Please enter a valid positive payment amount.');
      return;
    }

    setModalLoading(true);
    setFormError('');

    try {
      await axiosClient.patch(`/finance/invoices/${activeInvoice._id}/payment`, {
        amount: Number(paymentAmount),
        paymentMethod,
        referenceNumber: paymentRef,
      });

      toast.success('Payment recorded and income booked.');
      setShowPaymentModal(false);
      fetchInvoices();
      fetchSummary();
    } catch (err) {
      setFormError(err.message || 'Payment recording failed.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.open('/api/reports/export-csv?reportType=finance', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Finance & Cash Flow</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational cash flow, income ledger, vendor expenses, and customer receivables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={Download} onClick={handleExportCSV}>
            Export CSV
          </Button>

          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setFormError('');
              setShowAddTxnModal(true);
            }}
          >
            Record Transaction
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Total Income
            </span>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(summary.totalIncome)}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" /> Total Expenses
            </span>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(summary.totalExpenses)}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              Net Operating Result
            </span>
            <p
              className={`text-xl font-bold mt-1 ${
                summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {formatCurrency(summary.netProfit)}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding Receivables
            </span>
            <p className="text-xl font-bold text-rose-600 mt-1">
              {formatCurrency(summary.totalOutstanding)}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <IndianRupee className="w-4 h-4" /> Transactions Ledger
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'invoices'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" /> Customer Invoices
        </button>
      </div>

      {activeTab === 'transactions' ? (
        /* Transactions Ledger Table */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search description, reference ID..."
                value={txnSearch}
                onChange={(e) => setTxnSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={txnType}
                onChange={(e) => setTxnType(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700"
              >
                <option value="all">All Types</option>
                <option value="income">Income Only</option>
                <option value="expense">Expense Only</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loadingTxns ? (
              <div className="p-6">
                <LoadingSkeleton count={6} />
              </div>
            ) : transactions.length === 0 ? (
              <EmptyState
                title="No transactions logged"
                description="Record operational expenses, supplier payments, or sales revenues."
                actionLabel="Record Transaction"
                onAction={() => setShowAddTxnModal(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Category & Description</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {transactions.map((t) => {
                      const isIncome = t.type === 'income';
                      return (
                        <tr key={t._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {t.transactionId}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{formatDate(t.transactionDate)}</td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900">{t.description}</p>
                            <span className="text-[11px] text-slate-500">{t.category}</span>
                          </td>
                          <td className="py-3.5 px-4 capitalize text-slate-700">
                            {t.paymentMethod?.replace('_', ' ')}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                            {t.referenceNumber || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold font-mono">
                            <span className={isIncome ? 'text-emerald-600' : 'text-amber-600'}>
                              {isIncome ? `+${formatCurrency(t.amount)}` : `-${formatCurrency(t.amount)}`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              page={txnPagination.page}
              totalPages={txnPagination.totalPages}
              total={txnPagination.total}
              limit={txnPagination.limit}
              onPageChange={(p) => setTxnPagination((prev) => ({ ...prev, page: p }))}
            />
          </div>
        </div>
      ) : (
        /* Invoices Table */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoice number or customer..."
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={invStatus}
              onChange={(e) => setInvStatus(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 capitalize"
            >
              <option value="all">All Invoice Statuses</option>
              <option value="sent">Sent</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loadingInvoices ? (
              <div className="p-6">
                <LoadingSkeleton count={6} />
              </div>
            ) : invoices.length === 0 ? (
              <EmptyState
                title="No invoices logged"
                description="Official invoices generated from completed sales orders will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Issue Date</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Balance Due</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {invoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{inv.customer?.name}</p>
                          <span className="text-[10px] text-slate-500">{inv.customer?.company}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{formatDate(inv.issueDate)}</td>
                        <td className="py-3.5 px-4 text-slate-600">{formatDate(inv.dueDate)}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{formatCurrency(inv.totalAmount)}</td>
                        <td className="py-3.5 px-4 font-bold font-mono">
                          <span className={inv.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                            {formatCurrency(inv.balanceDue)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadgeClass(inv.status)}`}>
                            {inv.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {inv.balanceDue > 0 && (
                              <button
                                onClick={() => {
                                  setActiveInvoice(inv);
                                  setPaymentAmount(inv.balanceDue);
                                  setShowPaymentModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                              >
                                Record Payment
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
              page={invPagination.page}
              totalPages={invPagination.totalPages}
              total={invPagination.total}
              limit={invPagination.limit}
              onPageChange={(p) => setInvPagination((prev) => ({ ...prev, page: p }))}
            />
          </div>
        </div>
      )}

      {/* Record Transaction Modal */}
      <Modal
        isOpen={showAddTxnModal}
        onClose={() => setShowAddTxnModal(false)}
        title="Record Financial Transaction"
        subtitle="Post direct operating income or business expenses to the general ledger."
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateTxn} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                setTxnForm({
                  ...txnForm,
                  type: 'expense',
                  category: EXPENSE_CATEGORIES[0],
                })
              }
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                txnForm.type === 'expense'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Expense Outflow (-)
            </button>

            <button
              type="button"
              onClick={() =>
                setTxnForm({
                  ...txnForm,
                  type: 'income',
                  category: INCOME_CATEGORIES[0],
                })
              }
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                txnForm.type === 'income'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Income Inflow (+)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Transaction Category"
              required
              value={txnForm.category}
              onChange={(e) => setTxnForm({ ...txnForm, category: e.target.value })}
              options={(txnForm.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(
                (c) => ({ value: c, label: c })
              )}
            />

            <Input
              label="Amount (₹)"
              type="number"
              required
              placeholder="e.g. 25000"
              value={txnForm.amount}
              onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })}
            />
          </div>

          <Input
            label="Transaction Description"
            required
            placeholder="e.g. Office electricity bill for Sep 2026"
            value={txnForm.description}
            onChange={(e) => setTxnForm({ ...txnForm, description: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              value={txnForm.paymentMethod}
              onChange={(e) => setTxnForm({ ...txnForm, paymentMethod: e.target.value })}
              options={[
                { value: 'bank_transfer', label: 'Bank Transfer (NEFT/RTGS/IMPS)' },
                { value: 'upi', label: 'UPI / QR Payment' },
                { value: 'credit_card', label: 'Corporate Credit Card' },
                { value: 'cash', label: 'Petty Cash' },
                { value: 'cheque', label: 'Cheque' },
              ]}
            />

            <Input
              label="Reference / UTR Number"
              placeholder="e.g. UTR-88129938"
              value={txnForm.referenceNumber}
              onChange={(e) => setTxnForm({ ...txnForm, referenceNumber: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowAddTxnModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading}>
              Save Transaction
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Invoice Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Invoice Payment"
        subtitle={`Invoice: ${activeInvoice?.invoiceNumber} (Outstanding Balance: ${formatCurrency(
          activeInvoice?.balanceDue
        )})`}
        maxWidth="max-w-md"
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
            {formError}
          </div>
        )}

        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Input
            label="Payment Amount Received (₹)"
            type="number"
            required
            max={activeInvoice?.balanceDue}
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
          />

          <Select
            label="Payment Channel"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { value: 'bank_transfer', label: 'Bank Transfer (NEFT/RTGS)' },
              { value: 'upi', label: 'UPI' },
              { value: 'credit_card', label: 'Credit Card' },
              { value: 'cheque', label: 'Cheque' },
              { value: 'cash', label: 'Cash' },
            ]}
          />

          <Input
            label="UTR / Cheque / Bank Reference"
            placeholder="e.g. NEFT-9912002"
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading}>
              Confirm Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
