import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShoppingCart,
  Truck,
  IndianRupee,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDateTime } from '../../utils/formatters';

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [typeFilter, setTypeFilter] = useState('all');

  const filteredNotifications = notifications.filter((n) => {
    if (typeFilter === 'all') return true;
    return n.type === typeFilter;
  });

  const getIconForType = (type) => {
    switch (type) {
      case 'low_stock':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'order_status':
        return <ShoppingCart className="w-4 h-4 text-indigo-500" />;
      case 'purchase_status':
        return <Truck className="w-4 h-4 text-amber-500" />;
      case 'payment':
        return <IndianRupee className="w-4 h-4 text-emerald-500" />;
      case 'task_deadline':
        return <Clock className="w-4 h-4 text-sky-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications & Alerts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational event alerts, system updates, and task deadlines.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllAsRead}>
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        {[
          { id: 'all', label: 'All Alerts' },
          { id: 'low_stock', label: 'Low Stock' },
          { id: 'order_status', label: 'Sales Orders' },
          { id: 'purchase_status', label: 'Purchases' },
          { id: 'payment', label: 'Payments' },
          { id: 'task_deadline', label: 'Tasks' },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setTypeFilter(btn.id)}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              typeFilter === btn.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You are all caught up. New operational updates will trigger here automatically."
          />
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif._id}
              onClick={() => {
                markAsRead(notif._id);
                if (notif.link) navigate(notif.link);
              }}
              className={`p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-start gap-4 ${
                !notif.isRead ? 'bg-indigo-50/30' : ''
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-100 flex-shrink-0">
                {getIconForType(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                <span className="text-[10px] text-slate-400 mt-2 block">
                  {formatDateTime(notif.createdAt)}
                </span>
              </div>

              {notif.link && (
                <span className="p-2 text-slate-400 hover:text-indigo-600">
                  <ExternalLink className="w-4 h-4" />
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
