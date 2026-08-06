import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

type UserRole = 'admin' | 'teacher' | 'student' | 'parent' | 'director' | 'finance' | 'super_admin' | 'record_keeper' | 'admin_asst';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [] 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If no roles are specified, allow access (but this should rarely happen)
  if (allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if user has the required role
  const userRole = user.role || 'student';
  const hasRole = allowedRoles.includes(userRole);

  // If user doesn't have the required role, redirect to their default dashboard
  if (!hasRole) {
    const roleMap: Record<string, string> = {
      admin: '/admin/dashboard',
      teacher: '/teacher/dashboard',
      student: '/student/dashboard',
      parent: '/parent/dashboard',
      director: '/admin/dashboard',
      finance: '/admin/dashboard',
      super_admin: '/admin/dashboard',
      record_keeper: '/admin-asst/dashboard',
      admin_asst: '/admin-asst/dashboard',
    };
    const redirectPath = roleMap[userRole] || '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // Only render children if user has the required role
  return <>{children}</>;
};

export default ProtectedRoute;
