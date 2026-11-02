import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
          <svg
            className="h-12 w-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Access Denied</h2>
        <p className="max-w-md text-gray-500 dark:text-gray-400">
          You don't have permission to view this page. This area requires{' '}
          <span className="font-semibold">{allowedRoles.join(' or ')}</span> access.
        </p>
        <a
          href="/"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Go to Dashboard
        </a>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
