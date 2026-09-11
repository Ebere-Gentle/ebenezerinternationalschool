import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

type UserRole =
  | 'admin'
  | 'branch_admin'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'director'
  | 'principal'
  | 'finance'
  | 'super_admin'
  | 'record_keeper'
  | 'admin_asst';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
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
    branch_admin: 'branch_admin',
    branchadministrator: 'branch_admin',
    teacher: 'teacher',
    teachers: 'teacher',
    student: 'student',
    students: 'student',
    parent: 'parent',
    parents: 'parent',
    director: 'director',
    principal: 'principal',
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
    case 'branch_admin':
    case 'director':
    case 'principal':
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

const isRoleAllowed = (role: UserRole | null, allowedRoles: string[]) => {
  if (!role) return false;

  const normalizedAllowed = allowedRoles
    .map(normalizeRole)
    .filter((value): value is UserRole => value !== null);

  return normalizedAllowed.includes(role);
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

  let storedRole: unknown = null;
  try {
    const raw = localStorage.getItem('user');
    storedRole = raw
      ? JSON.parse(raw)?.role
      : localStorage.getItem('userRole');
  } catch {
    storedRole = localStorage.getItem('userRole');
  }

  // Prefer the live authenticated profile. Only use local storage when the
  // authenticated profile does not contain a usable role.
  const userRole = normalizeRole(user.role) || normalizeRole(storedRole);

  if (allowedRoles.length === 0) return <>{children}</>;

  const isUserMessagesRoute =
    location.pathname === '/user-messages' ||
    location.pathname.startsWith('/user-messages/');

  const canUseUserMessages =
    userRole !== null &&
    ['student', 'parent', 'teacher', 'record_keeper', 'admin_asst'].includes(userRole);

  if (isUserMessagesRoute && canUseUserMessages) return <>{children}</>;

  // Explicit route families. This prevents a valid feature route from being
  // mistaken for a generic/shared route simply because its parent layout is
  // also protected.
  const adminResults = location.pathname.startsWith('/admin/results/');
  const teacherResults = location.pathname.startsWith('/teacher/results/');
  const studentResults = location.pathname.startsWith('/student/results/');
  const parentResults = location.pathname.startsWith('/parent/results/');

  const adminJamb =
    location.pathname === '/admin/jamb-cbt' ||
    location.pathname.startsWith('/admin/jamb-cbt/');
  const teacherJamb =
    location.pathname === '/teacher/jamb-cbt' ||
    location.pathname.startsWith('/teacher/jamb-cbt/');
  const studentJamb =
    location.pathname === '/student/jamb-cbt' ||
    location.pathname.startsWith('/student/jamb-cbt/');
  const parentJamb =
    location.pathname === '/parent/jamb-cbt' ||
    location.pathname.startsWith('/parent/jamb-cbt/');

  if (adminResults || adminJamb) {
    if (userRole && ['admin', 'branch_admin', 'director', 'principal', 'super_admin'].includes(userRole)) {
      return <>{children}</>;
    }
  }

  if (teacherResults || teacherJamb) {
    if (userRole === 'teacher') return <>{children}</>;
  }

  if (studentResults || studentJamb) {
    if (userRole === 'student') return <>{children}</>;
  }

  if (parentResults || parentJamb) {
    if (userRole === 'parent') return <>{children}</>;
  }

  if (isRoleAllowed(userRole, allowedRoles)) return <>{children}</>;

  // Never send a user to a dashboard because of an ambiguous/legacy feature
  // URL. The caller's intended route is preserved by the route aliases in
  // AppRoutes; this fallback is only for genuinely unauthorized access.
  return <Navigate to={getDashboardPath(userRole)} replace />;
};

export default ProtectedRoute;
