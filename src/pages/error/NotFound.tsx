import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-blue-600 dark:text-blue-400 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Page Not Found</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Oops! The page you're looking for doesn't exist.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 gradient-bg text-white rounded-xl font-medium hover:opacity-90 transition"
        >
          <Home className="w-4 h-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
