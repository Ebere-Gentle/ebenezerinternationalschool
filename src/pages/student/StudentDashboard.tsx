import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  User,
  BookOpen,
  Coins,
  CheckCircle,
  AlertCircle,
  DollarSign,
  FileText,
  Receipt,
  Mail,
  Phone,
  Calendar,
  Clock,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Sparkles,
  Wallet,
  HelpCircle,
  Crown,
  Rocket,
  Target,
  Sun,
  Moon} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(relativeTime);
dayjs.extend(isBetween);

interface StudentProfile {
  id: string;
  student_id: string;
  admission_number: string;
  admission_date: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  other_names: string;
  gender: string;
  date_of_birth: string;
  email: string;
  phone_number: string;
  home_address: string;
  class_id: string;
  branch_id: string;
  class_arm: string;
  admission_status: string;
  current_status: string;
  passport_url: string;
  class?: {
    id: string;
    name: string;
  };
}

interface FeeSummary {
  total_fees: number;
  paid_fees: number;
  outstanding_fees: number;
  pending_fees: number;
  total_paid_amount: number;
  total_outstanding_amount: number;
}

interface RecentPayment {
  id: string;
  receipt_number: string;
  amount_paid: number;
  payment_date: string;
  status: string;
  payment_method: string;
  fee?: {
    name: string;
  };
}

interface UpcomingFee {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  status: string;
  category: string;
}

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [feeSummary, setFeeSummary] = useState<FeeSummary>({
    total_fees: 0,
    paid_fees: 0,
    outstanding_fees: 0,
    pending_fees: 0,
    total_paid_amount: 0,
    total_outstanding_amount: 0
  });
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [upcomingFees, setUpcomingFees] = useState<UpcomingFee[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      let studentData = null;

      if (user?.email) {
        const { data, error } = await supabase
          .from('students')
          .select(`
            *,
            class:class_id (
              id,
              name
            )
          `)
          .eq('email', user.email)
          .single();
        
        if (!error && data) {
          studentData = data;
        } else {
          const { data: dataById, error: errorById } = await supabase
            .from('students')
            .select(`
              *,
              class:class_id (
                id,
                name
              )
            `)
            .eq('id', user.id)
            .single();
          
          if (!errorById && dataById) {
            studentData = dataById;
          } else {
            throw new Error('Student not found');
          }
        }
      }

      if (studentData) {
        setProfile(studentData);
        
        await fetchFeeSummary(studentData.id, studentData.class_id, studentData.branch_id);
        await fetchRecentPayments(studentData.id);
        await fetchUpcomingFees(studentData.class_id, studentData.branch_id);
      }
    } catch (error: any) {
      console.error('Error fetching student data:', error);
      toast.error(error.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeSummary = async (studentId: string, classId: string, branchId: string) => {
    try {
      if (!branchId || !classId) {
        console.log('Missing branchId or classId');
        return;
      }

      const { data: fees, error: feesError } = await supabase
        .from('fees')
        .select('*')
        .eq('branch_id', branchId)
        .eq('status', 'active');

      if (feesError) throw feesError;

      const applicableFees = fees?.filter(fee => {
        if (fee.class_id === null) return true;
        if (fee.class_id === classId) return true;
        if (fee.metadata?.class_ids && Array.isArray(fee.metadata.class_ids)) {
          return fee.metadata.class_ids.includes(classId);
        }
        return false;
      }) || [];

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId);

      if (paymentsError) throw paymentsError;

      const totalFees = applicableFees.length;
      const paidFees = payments?.filter(p => p.status === 'completed').length || 0;
      const pendingFees = payments?.filter(p => p.status === 'pending').length || 0;
      const totalPaidAmount = payments?.filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount_paid, 0) || 0;
      
      const feeIds = applicableFees.map(f => f.id);
      const paidFeeIds = payments?.filter(p => p.status === 'completed').map(p => p.fee_id) || [];
      const outstandingFeeIds = feeIds.filter(id => !paidFeeIds.includes(id));
      const outstandingFees = applicableFees.filter(f => outstandingFeeIds.includes(f.id));
      const totalOutstandingAmount = outstandingFees.reduce((sum, f) => sum + f.amount, 0);

      setFeeSummary({
        total_fees: totalFees,
        paid_fees: paidFees,
        outstanding_fees: outstandingFees.length,
        pending_fees: pendingFees,
        total_paid_amount: totalPaidAmount,
        total_outstanding_amount: totalOutstandingAmount
      });

    } catch (error) {
      console.error('Error fetching fee summary:', error);
    }
  };

  const fetchRecentPayments = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          fee:fee_id (
            name
          )
        `)
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentPayments(data || []);
    } catch (error) {
      console.error('Error fetching recent payments:', error);
    }
  };

  const fetchUpcomingFees = async (classId: string, branchId: string) => {
    try {
      if (!branchId || !classId) {
        console.log('Missing branchId or classId for upcoming fees');
        return;
      }

      const { data: fees, error: feesError } = await supabase
        .from('fees')
        .select('*')
        .eq('branch_id', branchId)
        .eq('status', 'active');

      if (feesError) throw feesError;

      const applicableFees = fees?.filter(fee => {
        if (fee.class_id === null) return true;
        if (fee.class_id === classId) return true;
        if (fee.metadata?.class_ids && Array.isArray(fee.metadata.class_ids)) {
          return fee.metadata.class_ids.includes(classId);
        }
        return false;
      }) || [];

      const upcoming = applicableFees
        .filter(f => f.due_date && dayjs(f.due_date).isAfter(dayjs()))
        .sort((a, b) => dayjs(a.due_date).diff(dayjs(b.due_date)))
        .slice(0, 5);

      setUpcomingFees(upcoming || []);
    } catch (error) {
      console.error('Error fetching upcoming fees:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[status] || styles.pending;
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      school_fees: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      pta: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      laboratory: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      graduation: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      development_levy: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      identity_card: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    };
    return styles[category] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  };

  const completionRate = feeSummary.total_fees > 0 
    ? Math.round((feeSummary.paid_fees / feeSummary.total_fees) * 100) 
    : 0;

  const stats = [
    {
      title: 'Total Fees',
      value: feeSummary.total_fees,
      icon: FileText,
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Paid Fees',
      value: feeSummary.paid_fees,
      icon: CheckCircle,
      gradient: 'from-green-500 to-emerald-500',
      bg: 'bg-green-500/20',
      text: 'text-green-600 dark:text-green-400'
    },
    {
      title: 'Outstanding',
      value: feeSummary.outstanding_fees,
      icon: AlertCircle,
      gradient: 'from-red-500 to-rose-500',
      bg: 'bg-red-500/20',
      text: 'text-red-600 dark:text-red-400'
    },
    {
      title: 'Total Paid',
      value: formatCurrency(feeSummary.total_paid_amount),
      icon: DollarSign,
      gradient: 'from-purple-500 to-violet-500',
      bg: 'bg-purple-500/20',
      text: 'text-purple-600 dark:text-purple-400'
    }
  ];

  const quickActions = [
    { 
      icon: Coins, 
      label: 'Pay Fees', 
      desc: 'Make a payment', 
      gradient: 'from-blue-500 to-cyan-500',
      path: '/student/pay-bill' 
    },
    { 
      icon: BookOpen, 
      label: 'My Classes', 
      desc: 'View schedule', 
      gradient: 'from-green-500 to-emerald-500',
      path: '/student/classes' 
    },
    { 
      icon: Receipt, 
      label: 'Payment History', 
      desc: 'View all payments', 
      gradient: 'from-purple-500 to-violet-500',
      path: '/student/payments' 
    },
    { 
      icon: User, 
      label: 'My Profile', 
      desc: 'View & edit', 
      gradient: 'from-orange-500 to-amber-500',
      path: '/student/profile' 
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Loading your dashboard..." />
          <div className="mt-4 text-sm text-gray-400 dark:text-gray-500 animate-pulse">
            Preparing your personalized experience ✨
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      {/* Animated Background Particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6"> 

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* LEFT SIDEBAR */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-3 space-y-4"
          >
            {/* Premium Profile Card */}
            <div className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
              <div className="relative text-center">
                {profile?.passport_url ? (
                  <img
                    src={profile.passport_url}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-white dark:border-gray-700 shadow-xl"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-semibold mx-auto mb-4 shadow-xl ring-4 ring-white dark:ring-gray-700">
                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                  </div>
                )}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {profile?.first_name} {profile?.last_name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.student_id}</p>
                <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(profile?.admission_status || '')}`}>
                    {profile?.admission_status}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(profile?.current_status || '')}`}>
                    {profile?.current_status}
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-3 p-2 bg-white/50 dark:bg-gray-700/50 rounded-xl backdrop-blur-sm">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-600 dark:text-gray-300 truncate">{profile?.email}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-white/50 dark:bg-gray-700/50 rounded-xl backdrop-blur-sm">
                    <Phone className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600 dark:text-gray-300">{profile?.phone_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-white/50 dark:bg-gray-700/50 rounded-xl backdrop-blur-sm">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-600 dark:text-gray-300">{profile?.class?.name} - {profile?.class_arm}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-white/50 dark:bg-gray-700/50 rounded-xl backdrop-blur-sm">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-600 dark:text-gray-300">
                      Joined: {dayjs(profile?.admission_date).format('MMM D, YYYY')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Quick Actions */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Rocket className="w-4 h-4 text-blue-500" />
                Quick Actions
              </h4>
              <div className="space-y-2">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02, x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(action.path)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${action.gradient} flex items-center justify-center shadow-lg`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{action.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{action.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Premium Upgrade Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-3xl p-6 text-white shadow-xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="relative flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Crown className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">Go Premium</h4>
                  <p className="text-sm opacity-90 mt-1">Unlock all premium features and enjoy an ad-free experience</p>
                  <button className="mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all backdrop-blur-sm">
                    Upgrade Now →
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* MAIN CONTENT */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-6 space-y-6"
          >
            {/* Premium Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 group"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="relative mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.random() * 100}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className={`h-full bg-gradient-to-r ${stat.gradient}`}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Premium Progress Section */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    Payment Progress
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">{completionRate}% Complete</span>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${completionRate >= 70 ? 'bg-green-500' : completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                      <span className="text-xs text-gray-400">
                        {completionRate >= 70 ? 'Good' : completionRate >= 40 ? 'Average' : 'Needs Attention'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionRate}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                    />
                  </div>
                  <div className="flex justify-between mt-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-500 dark:text-gray-400">Paid: {formatCurrency(feeSummary.total_paid_amount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-gray-500 dark:text-gray-400">Outstanding: {formatCurrency(feeSummary.total_outstanding_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats Mini Grid */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Fees Amount</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                      {formatCurrency(feeSummary.total_fees * 1000)}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pending Payments</p>
                    <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{feeSummary.pending_fees}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* RIGHT SIDEBAR */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-3 space-y-4"
          >
            {/* Recent Payments Widget */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-500" />
                  Recent Payments
                </h4>
                <button 
                  onClick={() => navigate('/student/payments')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  View All
                </button>
              </div>
              {recentPayments.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-2">
                    <Clock className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recent payments</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentPayments.slice(0, 3).map((payment, index) => (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-700/30 rounded-xl backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-700/50 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {payment.fee?.name || 'Fee Payment'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {dayjs(payment.payment_date).format('MMM D')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatCurrency(payment.amount_paid)}
                        </p>
                        <span className={`text-xs capitalize px-1.5 py-0.5 rounded ${payment.status === 'completed' ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'}`}>
                          {payment.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Fees Widget */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  Upcoming Fees
                </h4>
                <button 
                  onClick={() => navigate('/student/fees')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  View All
                </button>
              </div>
              {upcomingFees.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-2">
                    <Sparkles className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming fees</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingFees.slice(0, 3).map((fee, index) => (
                    <motion.div
                      key={fee.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-700/30 rounded-xl backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-700/50 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{fee.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {dayjs(fee.due_date).fromNow()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatCurrency(fee.amount)}
                        </p>
                        <span className={`text-[10px] capitalize px-1.5 py-0.5 rounded ${getCategoryBadge(fee.category)}`}>
                          {fee.category.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Premium Help Widget */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl p-5 text-white shadow-xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="relative flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">Need Help?</h4>
                  <p className="text-sm opacity-90 mt-1">Our support team is here to assist you</p>
                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all backdrop-blur-sm">
                      💬 Chat
                    </button>
                    <button className="flex-1 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all backdrop-blur-sm">
                      📞 Call
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600"
        >
          <p>© {dayjs().year()} Ebeniza International School. All rights reserved. ✨</p>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentDashboard;