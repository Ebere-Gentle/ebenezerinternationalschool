export interface User {
  id: string;
  user_id: string;
  email: string;
  phone_number: string | null;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  role: 'admin' | 'teacher' | 'student' | 'parent' | 'director' | 'admin_asst';
  branch_id: string;
  is_active: boolean;
  last_login: string | null;
  profile_image_url: string | null;
  password_changed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  metadata: {
    branch: string;
    position: string;
    is_first_user: boolean;
  };
}

export interface AuthResponse {
  user: User;
  token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent' | 'director' | 'admin_asst';

export const ROLE_MAP: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
  parent: '/parent/dashboard',
  director: '/admin/dashboard',
  admin_asst: '/admin-asst/dashboard',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
  director: 'Director',
  admin_asst: 'Admin Assistant',
};

// Default export for convenience
export default {
  ROLE_MAP,
  ROLE_LABELS,
};
