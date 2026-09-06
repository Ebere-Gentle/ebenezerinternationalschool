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
    school_admin: 'admin',
    schooladministrator: 'admin',
    teacher: 'teacher',
    teachers: 'teacher',
    student: 'student',
    students: 'student',
    parent: 'parent',
    parents: 'parent',
    director: 'director',
    principal: 'director',
    finance: 'finance',
    finance_officer: 'finance',
    accountant: 'finance',
    super_admin: 'super_admin',
    superadmin: 'super_admin',
    record_keeper: 'record_keeper',
    recordkeeper: 'record_keeper',
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

  // Prefer the live Supabase profile, but fall back to persisted auth data
  // while the profile state is settling after a navigation.
  let storedRole: unknown = null;
  try {
    const raw = localStorage.getItem('user');
    storedRole = raw
      ? JSON.parse(raw)?.role
      : localStorage.getItem('userRole');
  } catch {
    storedRole = localStorage.getItem('userRole');
  }

  const userRole = normalizeRole(user.role) || normalizeRole(storedRole);

  if (allowedRoles.length === 0) {
    return <>{children}</>;
  }

  const normalizedAllowedRoles = allowedRoles
    .map(normalizeRole)
    .filter((role): role is UserRole => role !== null);

  const hasRole = userRole !== null && normalizedAllowedRoles.includes(userRole);

  // Normal-user messaging is intentionally available across these roles.
  const isUserMessagesRoute =
    location.pathname === '/user-messages' ||
    location.pathname.startsWith('/user-messages/');

  const canUseUserMessages =
    userRole !== null &&
    ['student', 'parent', 'teacher', 'record_keeper', 'admin_asst'].includes(userRole);

  if (isUserMessagesRoute && canUseUserMessages) {
    return <>{children}</>;
  }

  // Explicitly recognize the role-scoped Results routes. This keeps Results
  // navigation aligned with AppRoutes and prevents a valid Results child from
  // falling through to the role dashboard because of a transient role alias.
  const isAdminResults = location.pathname.startsWith('/admin/results/');
  const isTeacherResults = location.pathname.startsWith('/teacher/results/');
  const isStudentResults = location.pathname.startsWith('/student/results/');
  const isParentResults = location.pathname.startsWith('/parent/results/');

  const canUseResults =
    (isAdminResults && !!userRole && ['admin', 'director', 'finance', 'super_admin'].includes(userRole)) ||
    (isTeacherResults && userRole === 'teacher') ||
    (isStudentResults && userRole === 'student') ||
    (isParentResults && userRole === 'parent');

  if (canUseResults) {
    return <>{children}</>;
  }

  if (hasRole) {
    return <>{children}</>;
  }

  return <Navigate to={getDashboardPath(userRole)} replace />;
};

export default ProtectedRoute;
