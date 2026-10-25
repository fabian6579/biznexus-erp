import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Package,
  ShoppingCart,
  Truck,
  IndianRupee,
  KanbanSquare,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { unreadCount } = useNotifications();
  const { user, organization } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Employees', path: '/employees', icon: Users, roles: ['super_admin', 'business_owner', 'manager'] },
    { name: 'CRM / Customers', path: '/customers', icon: UserCheck },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Sales & Orders', path: '/sales', icon: ShoppingCart },
    { name: 'Purchases & Suppliers', path: '/purchases', icon: Truck },
    { name: 'Finance', path: '/finance', icon: IndianRupee, roles: ['super_admin', 'business_owner', 'accountant', 'manager'] },
    { name: 'Projects & Tasks', path: '/projects', icon: KanbanSquare },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['super_admin', 'business_owner', 'manager', 'accountant'] },
    { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Filter based on user role
  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (user?.role === 'super_admin') return true;
    return item.roles.includes(user?.role);
  });

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out border-r border-slate-200 bg-white flex flex-col justify-between ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-100 flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-base font-bold text-slate-900 tracking-tight leading-none">
                  BizNexus<span className="text-indigo-600">ERP</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-1 truncate">
                  {organization?.name || 'One Platform'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="px-3 py-4 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  } ${isCollapsed ? 'justify-center' : ''}`
                }
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}

                {/* Badge if available */}
                {item.badge > 0 && (
                  <span
                    className={`ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white ${
                      isCollapsed ? 'absolute top-1 right-2 w-4 h-4 p-0' : ''
                    }`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Footer / User Role Info */}
      <div className="p-3 border-t border-slate-100">
        {!isCollapsed ? (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
              {user?.name?.slice(0, 2) || 'US'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title={`${user?.name} (${user?.role})`}>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase border border-indigo-100">
              {user?.name?.slice(0, 2) || 'US'}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
