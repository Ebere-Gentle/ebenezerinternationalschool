import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

type UserRole =
  | 'admin'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'director'
  | 'finance'
  | 'super_admin'
  | 'record_keeper'
  | 'admin_asst';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const normalizeRole = (role: unknown): UserRole | null => {
  if (!role) return null;

  const value = String(role)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  const aliases: Record<string, UserRole> = {
    admin: 'admin',
    administrator: 'admin',

    teacher: 'teacher',
    teachers: 'teacher',

    student: 'student',
    students: 'student',

    parent: 'parent',
    parents: 'parent',

    director: 'director',

    finance: 'finance',
    accountant: 'finance',

    super_admin: 'super_admin',
    superadmin: 'super_admin',

    record_keeper: 'record_keeper',
    recordkeeper: 'record_keeper',
    'admin_assistant': 'admin_asst',
    admin_assistant: 'admin_asst',
    admin_asst: 'admin_asst',
    adminassistant: 'admin_asst',
  };

  return aliases[value] || null;
};

const getDashboardPath = (role: UserRole | null): string => {
  switch (role) {
    case 'admin':
    case 'director':
    case 'finance':
    case 'super_admin':
      return '/admin/dashboard';

    case 'teacher':
      return '/teacher/dashboard';

    case 'student':
      return '/student/dashboard';

    case 'parent':
      return '/parent/dashboard';

    case 'record_keeper':
    case 'admin_asst':
      return '/admin-asst/dashboard';

    default:
      return '/dashboard';
  }
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600" />

          <p className="text-sm text-gray-500">
            Loading your account...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * NOT LOGGED IN
   * ---------------------------------------------------------
   */
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location.pathname + location.search + location.hash,
        }}
        replace
      />
    );
  }

  /*
   * ---------------------------------------------------------
   * NORMALIZE USER ROLE
   * ---------------------------------------------------------
   */
  const userRole = normalizeRole(user.role);

  /*
   * Debug information.
   *
   * Keep this for now while we verify the role problem.
   */
  console.log('ProtectedRoute:', {
    pathname: location.pathname,
    rawRole: user.role,
    normalizedRole: userRole,
    allowedRoles,
  });

  /*
   * ---------------------------------------------------------
   * NO ROLE RESTRICTION
   * ---------------------------------------------------------
   */
  if (allowedRoles.length === 0) {
    return <>{children}</>;
  }

  /*
   * ---------------------------------------------------------
   * ROLE CHECK
   * ---------------------------------------------------------
   */
  const normalizedAllowedRoles = allowedRoles.map(
    (role) => normalizeRole(role)
  );

  const hasRole =
    userRole !== null &&
    normalizedAllowedRoles.includes(userRole);

  /*
   * ---------------------------------------------------------
   * IMPORTANT:
   *
   * /user-messages is intentionally allowed for all
   * normal communication users.
   *
   * This prevents the message page from being treated like
   * an admin-only page.
   * ---------------------------------------------------------
   */
  const isUserMessagesRoute =
    location.pathname === '/user-messages' ||
    location.pathname.startsWith('/user-messages/');

  const canUseUserMessages =
    userRole !== null &&
    [
      'student',
      'parent',
      'teacher',
      'record_keeper',
      'admin_asst',
    ].includes(userRole);

  if (isUserMessagesRoute && canUseUserMessages) {
    return <>{children}</>;
  }

  /*
   * ---------------------------------------------------------
   * AUTHORIZED
   * ---------------------------------------------------------
   */
  if (hasRole) {
    return <>{children}</>;
  }

  /*
   * ---------------------------------------------------------
   * UNAUTHORIZED
   * ---------------------------------------------------------
   */
  const redirectPath = getDashboardPath(userRole);

  console.warn('ProtectedRoute: unauthorized access', {
    pathname: location.pathname,
    rawRole: user.role,
    normalizedRole: userRole,
    allowedRoles,
    redirectPath,
  });

  return <Navigate to={redirectPath} replace />;
};

export default ProtectedRoute;