import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Package,
  Truck,
  ShoppingCart,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Settings,
  LogOut,
  X,
  Shield,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Inventory', path: '/inventory', icon: Boxes },
    { label: 'Products', path: '/products', icon: Package },
    { label: 'Suppliers', path: '/suppliers', icon: Truck },
    { label: 'Sales & POS', path: '/sales', icon: ShoppingCart },
    { label: 'Purchases', path: '/purchases', icon: ClipboardList },
    { label: 'Demand Forecast', path: '/forecast', icon: TrendingUp },
    { label: 'Sales Anomalies', path: '/anomalies', icon: AlertTriangle },
    { label: 'AI Insights', path: '/insights', icon: Sparkles },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-3.5 h-3.5 text-rose-500" />;
      case 'manager':
        return <Briefcase className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <UserCheck className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-700 to-primary-500 flex items-center justify-center shadow-md shadow-primary-500/20">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-gray-900 tracking-tight">
                Inventory<span className="text-primary-600">AI</span>
              </span>
              <span className="block text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                SaaS Enterprise
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Main Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm border border-primary-200">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {getRoleIcon(user?.role)}
                <span className="text-xs text-gray-500 capitalize">{user?.role || 'Staff'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200/50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
