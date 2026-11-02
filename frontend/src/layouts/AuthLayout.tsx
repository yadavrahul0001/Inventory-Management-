import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Package } from 'lucide-react';

const AuthLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 px-4 py-12 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Brand header */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
          <Package className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">InvenIQ</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          AI-Powered Inventory Management
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
        <Outlet />
      </div>

      <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
        &copy; {new Date().getFullYear()} InvenIQ. All rights reserved.
      </p>
    </div>
  );
};

export default AuthLayout;
