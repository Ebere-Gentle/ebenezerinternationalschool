import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Home } from 'lucide-react';

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
          <Shield className="w-12 h-12 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          You don't have permission to access this page.
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

export default Unauthorized;
