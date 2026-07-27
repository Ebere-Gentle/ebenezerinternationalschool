export const ROUTES = {
  // Public Routes
  HOME: '/',
  LOGIN: '/login',
  LANDING: '/',
  
  // Protected Routes
  DASHBOARD: '/dashboard',
  STUDENTS: '/students',
  STUDENT_REGISTER: '/students/register',
  STUDENT_EDIT: '/students/edit/:id',
  STUDENT_VIEW: '/students/:id',
  TEACHERS: '/teachers',
  PAYMENTS: '/payments',
  FEES: '/fees',
  CLASSES: '/classes',
  BRANCHES: '/branches',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  
  // Role-based Dashboards
  ADMIN_DASHBOARD: '/admin/dashboard',
  TEACHER_DASHBOARD: '/teacher/dashboard',
  STUDENT_DASHBOARD: '/student/dashboard',
  PARENT_DASHBOARD: '/parent/dashboard',
  
  // Error Routes
  NOT_FOUND: '/404',
  UNAUTHORIZED: '/401',
} as const;

export type RouteKeys = keyof typeof ROUTES;
export type RouteValues = typeof ROUTES[RouteKeys];
