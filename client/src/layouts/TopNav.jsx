import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Bell,
  HelpCircle,
  LogOut,
  User,
  Settings,
  Building,
  Check,
  ChevronDown,
  ExternalLink,
  X,
  Package,
  Users,
  ShoppingCart,
  FileText,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export const TopNav = ({ isCollapsed }) => {
  const { user, organization, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Dropdown states
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);

  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setShowNotificationsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced Global Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axiosClient.get(`/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.success) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Compute breadcrumbs from current route
  const pathnames = location.pathname.split('/').filter((x) => x);
  const breadcrumbs = [
    { label: 'Home', path: '/' },
    ...pathnames.map((value, index) => {
      const to = `/${pathnames.slice(0, index + 1).join('/')}`;
      const label = value.charAt(0).toUpperCase() + value.slice(1).replace('-', ' ');
      return { label, path: to };
    }),
  ];

  return (
    <>
      <header
        className={`fixed top-0 right-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-all duration-300 flex items-center justify-between px-6 ${
          isCollapsed ? 'left-20' : 'left-64'
        }`}
      >
        {/* Left: Breadcrumbs & Global Search Button */}
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={bc.path}>
                {idx > 0 && <span className="text-slate-300">/</span>}
                {idx === breadcrumbs.length - 1 ? (
                  <span className="text-slate-900 font-semibold">{bc.label}</span>
                ) : (
                  <Link to={bc.path} className="hover:text-indigo-600 transition-colors">
                    {bc.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Search Trigger */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-slate-400 hover:text-slate-600 text-xs transition-colors shadow-xs w-48 sm:w-64"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="truncate">Search customers, orders, SKU...</span>
            <kbd className="hidden sm:inline-block ml-auto px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 rounded text-slate-500">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Actions & User Info */}
        <div className="flex items-center gap-3">
          {/* Organization Pill */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate max-w-[140px]">{organization?.name || 'Nexus ERP'}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-white rounded-full font-mono text-slate-500 font-semibold border border-slate-200">
              {organization?.currency || 'INR'}
            </span>
          </div>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative focus:outline-none"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {showNotificationsMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No notifications</p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                          !notif.isRead ? 'bg-indigo-50/40' : ''
                        }`}
                        onClick={() => {
                          markAsRead(notif._id);
                          if (notif.link) {
                            navigate(notif.link);
                            setShowNotificationsMenu(false);
                          }
                        }}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            !notif.isRead ? 'bg-indigo-600' : 'bg-slate-300'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800">{notif.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notif.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {formatDateTime(notif.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 px-4 border-t border-slate-100 text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setShowNotificationsMenu(false)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {user?.name?.slice(0, 2).toUpperCase() || 'US'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 leading-none">{user?.name}</span>
                <span className="text-[10px] text-slate-400 font-medium capitalize mt-1">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-indigo-50 text-indigo-700 capitalize">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-medium"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Settings & Profile
                  </Link>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center px-4 py-3.5 border-b border-slate-200 gap-3">
              <Search className="w-5 h-5 text-indigo-600" />
              <input
                type="text"
                autoFocus
                placeholder="Type to search customers, products, orders, employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
              />
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                  setSearchResults(null);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results Container */}
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
              {isSearching && (
                <div className="text-center py-8 text-xs text-slate-400">Searching records...</div>
              )}

              {!isSearching && !searchResults && (
                <div className="text-center py-8 text-xs text-slate-400">
                  Enter keywords to search across all BizNexus modules.
                </div>
              )}

              {searchResults && (
                <>
                  {/* Customers */}
                  {searchResults.customers?.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Customers
                      </h4>
                      <div className="space-y-1">
                        {searchResults.customers.map((c) => (
                          <div
                            key={c._id}
                            onClick={() => {
                              navigate(`/customers/${c._id}`);
                              setShowSearchModal(false);
                            }}
                            className="p-2.5 rounded-xl hover:bg-indigo-50/60 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{c.name}</p>
                              <p className="text-[11px] text-slate-500">{c.company} • {c.email}</p>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">{c.customerId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  {searchResults.products?.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /> Products
                      </h4>
                      <div className="space-y-1">
                        {searchResults.products.map((p) => (
                          <div
                            key={p._id}
                            onClick={() => {
                              navigate(`/inventory/${p._id}`);
                              setShowSearchModal(false);
                            }}
                            className="p-2.5 rounded-xl hover:bg-indigo-50/60 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{p.name}</p>
                              <p className="text-[11px] text-slate-500">{p.category} • In stock: {p.availableQuantity} {p.unit}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-slate-900">{formatCurrency(p.sellingPrice)}</span>
                              <span className="block text-[10px] font-mono text-slate-400">{p.sku}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Orders */}
                  {searchResults.orders?.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5" /> Sales Orders
                      </h4>
                      <div className="space-y-1">
                        {searchResults.orders.map((o) => (
                          <div
                            key={o._id}
                            onClick={() => {
                              navigate(`/sales/${o._id}`);
                              setShowSearchModal(false);
                            }}
                            className="p-2.5 rounded-xl hover:bg-indigo-50/60 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{o.orderNumber}</p>
                              <p className="text-[11px] text-slate-500">{o.customer?.name} • Status: {o.orderStatus}</p>
                            </div>
                            <span className="text-xs font-bold text-slate-900">{formatCurrency(o.totalAmount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* If nothing returned */}
                  {searchResults.customers?.length === 0 &&
                    searchResults.products?.length === 0 &&
                    searchResults.orders?.length === 0 &&
                    searchResults.employees?.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-6">
                        No results found for "{searchQuery}".
                      </p>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
