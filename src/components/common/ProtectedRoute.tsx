import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600" />
          <p className="text-sm text-gray-500">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search + location.hash }}
        replace
      />
    );
  }

  // Authentication only. Feature-specific role checks have intentionally
  // been removed so JAMB CBT and Results cannot be redirected to a dashboard
  // by ProtectedRoute. Access control can be handled by the individual pages
  // or their server-side Supabase RLS policies.
  return <>{children}</>;
};

export default ProtectedRoute;
