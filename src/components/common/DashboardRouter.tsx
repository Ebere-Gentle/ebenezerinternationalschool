import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const DashboardRouter: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      const role = user.role || 'student';
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
      const redirectPath = roleMap[role] || '/login';
      navigate(redirectPath, { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return null;
};

export default DashboardRouter;
