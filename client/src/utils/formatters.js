// Currency Formatter - default INR (₹)
export const formatCurrency = (amount, currency = 'INR', symbol = '₹') => {
  if (amount === undefined || amount === null || isNaN(amount)) return `${symbol}0`;
  return `${symbol}${Number(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;
};

// Date Formatter
export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
};

// DateTime Formatter
export const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
};

// Status Badge Styling Helper
export const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'confirmed':
    case 'fulfilled':
    case 'completed':
    case 'received':
    case 'paid':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'pending':
    case 'processing':
    case 'partially_received':
    case 'partially_paid':
    case 'in_progress':
    case 'sent':
    case 'qualified':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'cancelled':
    case 'terminated':
    case 'discontinued':
    case 'inactive':
    case 'overdue':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'draft':
    case 'todo':
    case 'planning':
    case 'on_hold':
    case 'on_leave':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

// Priority Badge Styling Helper
export const getPriorityBadgeClass = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
    case 'high':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'medium':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'low':
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};
