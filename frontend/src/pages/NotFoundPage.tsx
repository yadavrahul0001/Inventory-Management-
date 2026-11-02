import React from 'react';
import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="text-8xl font-black text-gray-200 dark:text-gray-700">404</div>
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Page not found</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <Link
        to="/"
        className="btn-primary flex items-center gap-2"
      >
        <Home className="h-4 w-4" />
        Go to Dashboard
      </Link>
    </div>
  );
};

export default NotFoundPage;
