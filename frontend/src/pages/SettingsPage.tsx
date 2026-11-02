import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, Shield, Moon, Sun, Bell, Database } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage system preferences, account details, and notification thresholds
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* User Profile */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-700">
            <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Account Profile</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Name:</span>
              <p className="font-medium text-gray-800 dark:text-gray-100">{user?.name || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Email:</span>
              <p className="font-medium text-gray-800 dark:text-gray-100">{user?.email || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Role:</span>
              <p className="font-medium capitalize text-primary-600 dark:text-primary-400">{user?.role || 'staff'}</p>
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-700">
            {theme === 'dark' ? (
              <Moon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            ) : (
              <Sun className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            )}
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Appearance</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Dark Mode</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Toggle dark / light appearance theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className="btn-secondary flex items-center gap-2 text-xs"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>
        </div>

        {/* System & Alerts */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-700">
            <Bell className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Notifications</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Email & webhook notification settings for stockout risks and reorder thresholds.
          </p>
          <div className="text-xs text-gray-400">Configurable in future updates.</div>
        </div>

        {/* Security & Access */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-700">
            <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Security & RBAC</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Role-based permissions: Admin (Full control), Manager (Purchases & Stock approvals), Staff (Read & Sales recording).
          </p>
          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <Database className="h-4 w-4" />
            <span>JWT Bearer Authentication Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
