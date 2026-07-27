import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, School, Award, Sun, User, Building2, GraduationCap, BookOpen, CreditCard, TrendingUp } from 'lucide-react';
import dayjs from 'dayjs';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

// Import school logo from assets
import schoolLogo from '../../../assets/school-logo.png';

interface SchoolInfo {
  id: string;
  school_id: string;
  school_name: string;
  address: string;
  email: string;
  website: string;
  phone_number: string;
  logo_url: string;
  motto: string;
  academic_session: string;
  current_term: string;
}

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalPayments: number;
  totalRevenue: number;
  activeStudents: number;
  passRate: number;
}

const HeroBanner: React.FC = () => {
  const { user } = useAuth();
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalPayments: 0,
    totalRevenue: 0,
    activeStudents: 0,
    passRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [branchName, setBranchName] = useState<string>('');

  const currentTime = dayjs();
  const hour = currentTime.hour();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Get user's name from profile or fallback
  const firstName = user?.first_name || user?.email?.split('@')[0] || 'User';
  const userRole = user?.role || 'Staff';
  const userPosition = user?.metadata?.position || '';
  const userBranchId = user?.branch_id;

  // Format role for display
  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: 'Administrator',
      teacher: 'Teacher',
      student: 'Student',
      parent: 'Parent',
      director: 'Director',
      principal: 'Principal',
      bursar: 'Bursar',
      accountant: 'Accountant',
      staff: 'Staff Member',
    };
    return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Fetch school and branch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch school info
        const { data: schoolData, error: schoolError } = await supabase
          .from('school_info')
          .select('*')
          .limit(1)
          .single();

        if (!schoolError && schoolData) {
          setSchoolInfo(schoolData);
        }

        // Fetch branch name if user has branch_id
        if (userBranchId) {
          const { data: branchData, error: branchError } = await supabase
            .from('branches')
            .select('school_name, branch_code')
            .eq('id', userBranchId)
            .single();

          if (!branchError && branchData) {
            setBranchName(branchData.school_name || '');
          } else {
            setBranchName(schoolData?.school_name || 'Main Campus');
          }
        } else {
          setBranchName(schoolData?.school_name || 'Main Campus');
        }

        // Fetch real stats
        await fetchStats();

      } catch (error) {
        console.error('Error fetching hero data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userBranchId]);

  const fetchStats = async () => {
    try {
      // Fetch total students
      let studentsQuery = supabase.from('students').select('id', { count: 'exact' });
      if (userBranchId) {
        studentsQuery = studentsQuery.eq('branch_id', userBranchId);
      }
      const { count: totalStudents } = await studentsQuery;

      // Fetch active students
      let activeQuery = supabase.from('students').select('id', { count: 'exact' }).eq('current_status', 'active');
      if (userBranchId) {
        activeQuery = activeQuery.eq('branch_id', userBranchId);
      }
      const { count: activeStudents } = await activeQuery;

      // Fetch total payments (completed)
      let paymentsQuery = supabase.from('payments').select('amount_paid', { count: 'exact' }).eq('status', 'completed');
      if (userBranchId) {
        paymentsQuery = paymentsQuery.eq('branch_id', userBranchId);
      }
      const { data: payments, count: totalPayments } = await paymentsQuery;

      // Calculate total revenue
      const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;

      // Fetch total teachers (users with teacher role)
      let teachersQuery = supabase.from('users').select('id', { count: 'exact' }).eq('role', 'teacher');
      if (userBranchId) {
        teachersQuery = teachersQuery.eq('branch_id', userBranchId);
      }
      const { count: totalTeachers } = await teachersQuery;

      // Mock pass rate for now (would come from results table)
      const passRate = 94;

      setStats({
        totalStudents: totalStudents || 0,
        totalTeachers: totalTeachers || 0,
        totalPayments: totalPayments || 0,
        totalRevenue,
        activeStudents: activeStudents || 0,
        passRate,
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Get logo URL - use school info logo or fallback to imported asset
  const logoUrl = schoolInfo?.logo_url || schoolLogo;

  // Stats display array with icons
  const statsDisplay = [
    { label: 'Total Students', value: stats.totalStudents.toLocaleString(), icon: Users, color: 'bg-blue-500/20' },
    { label: 'Active Students', value: stats.activeStudents.toLocaleString(), icon: GraduationCap, color: 'bg-green-500/20' },
    { label: 'Total Staff', value: stats.totalTeachers.toLocaleString(), icon: School, color: 'bg-purple-500/20' },
    { label: 'Pass Rate', value: `${stats.passRate}%`, icon: Award, color: 'bg-yellow-500/20' },
    { label: 'Payments', value: stats.totalPayments.toLocaleString(), icon: CreditCard, color: 'bg-indigo-500/20' },
    { label: 'Revenue', value: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(stats.totalRevenue), icon: TrendingUp, color: 'bg-emerald-500/20' },
  ];

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 p-6 md:p-8 animate-pulse">
        <div className="h-32 bg-white/10 rounded-xl"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 p-6 md:p-8 shadow-2xl"
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="absolute right-0 top-0 h-full w-1/2" viewBox="0 0 400 400" fill="none">
          <circle cx="300" cy="100" r="150" fill="white" opacity="0.1" />
          <circle cx="350" cy="250" r="100" fill="white" opacity="0.05" />
          <circle cx="200" cy="350" r="80" fill="white" opacity="0.08" />
        </svg>
        <div className="absolute left-0 bottom-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute right-0 top-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4 flex-1">
          {/* Top Row with Greeting and Weather */}
          <div className="flex items-center gap-3 flex-wrap">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sun className="h-7 w-7 text-yellow-300" />
            </motion.div>
            <div className="flex items-center gap-2 text-sm font-medium text-white/80 flex-wrap">
              <span className="bg-white/10 px-2 py-0.5 rounded-full">Sunny • 28°C</span>
              <span className="w-px h-4 bg-white/20 hidden sm:block" />
              <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full">
                <Building2 className="h-3.5 w-3.5" />
                {branchName}
              </span>
              <span className="w-px h-4 bg-white/20 hidden sm:block" />
              <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs">
                {schoolInfo?.academic_session || '2025/2026'}
              </span>
            </div>
          </div>

          {/* Greeting */}
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-white lg:text-4xl flex items-center gap-3 flex-wrap"
            >
              <span>{greeting}, {firstName}! 👋</span>
              {userPosition && (
                <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full text-white/90">
                  {userPosition}
                </span>
              )}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-1 text-white/80 flex items-center gap-2 flex-wrap text-sm"
            >
              <span>Welcome to {schoolInfo?.school_name || 'Ebenezer International School'}</span>
              <span className="w-px h-3 bg-white/30 hidden sm:block" />
              <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full">
                <User className="h-3 w-3" />
                {getRoleDisplay(userRole)}
              </span>
              {schoolInfo?.current_term && (
                <>
                  <span className="w-px h-3 bg-white/30 hidden sm:block" />
                  <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs">
                    {schoolInfo.current_term}
                  </span>
                </>
              )}
            </motion.p>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"
          >
            {statsDisplay.map((stat, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05, y: -2 }}
                className={`flex items-center gap-2 rounded-xl ${stat.color} px-3 py-2 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all`}
              >
                <stat.icon className="h-4 w-4 text-white/70 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-white truncate block">{stat.value}</span>
                  <span className="text-[10px] text-white/60 truncate block">{stat.label}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Logo / Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center lg:justify-end flex-shrink-0"
        >
          <div className="relative group">
            <div className="flex h-28 w-28 lg:h-36 lg:w-36 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 group-hover:border-white/40 transition-all shadow-2xl">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={schoolInfo?.school_name || 'School Logo'}
                  className="h-20 w-20 lg:h-28 lg:w-28 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = schoolLogo;
                  }}
                />
              ) : (
                <div className="flex flex-col items-center">
                  <School className="h-14 w-14 text-white/70 lg:h-20 lg:w-20" />
                  <span className="text-[10px] text-white/50 mt-1">EIS</span>
                </div>
              )}
            </div>
            {/* Animated Rings */}
            <div className="absolute -inset-4 animate-pulse rounded-full border border-white/10 group-hover:border-white/20 transition-all" />
            <div className="absolute -inset-8 rounded-full border border-white/5 group-hover:border-white/10 transition-all" />
          </div>
        </motion.div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-white/50">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          <span>{currentTime.format('dddd, MMMM D, YYYY')}</span>
        </div>
        <span className="hidden sm:block">•</span>
        <span>{currentTime.format('h:mm A')}</span>
        {user?.email && (
          <>
            <span className="hidden sm:block">•</span>
            <span className="flex items-center gap-1">
              <span className="opacity-50">Logged in as</span>
              <span className="text-white/70">{user.email}</span>
            </span>
          </>
        )}
        {schoolInfo?.motto && (
          <>
            <span className="hidden sm:block">•</span>
            <span className="italic text-white/40">"{schoolInfo.motto}"</span>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default HeroBanner;
