// src/pages/student/StudentDashboard.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  User,
  BookOpen,
  CheckCircle,
  AlertCircle,
  DollarSign,
  FileText,
  Receipt,
  Calendar,
  Clock,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Wallet,
  HelpCircle,
  XCircle,
  Rocket,
  Target,
  Shield,
  CreditCard,
  School,
  Zap,
  TrendingUp,
  Award,
  PieChart
} from 'lucide-react';
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

interface AssignmentWithFee {
  id: string;
  assignment_id: string;
  student_id: string;
  fee_id: string;
  branch_id: string;
  original_amount: number;
  discount_amount: number;
  amount_due: number;
  amount_paid: number;
  balance: number;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'waived';
  assigned_date: string;
  due_date: string | null;
  is_active: boolean;
  term: string | null;
  session: string | null;
  fee?: {
    id: string;
    name: string;
    category: string;
    description: string;
  };
}

interface PaymentRecord {
  id: string;
  receipt_number: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  status: string;
  fee_id: string;
  fee?: {
    name: string;
  };
}

interface FeeExemption {
  id: string;
  fee_id: string;
  student_id: string;
  exemption_type: 'staff_child' | 'orphan' | 'scholarship' | 'other';
  waiver_percentage: number;
  is_active: boolean;
}

interface DashboardStats {
  totalAssignments: number;
  paidAssignments: number;
  unpaidAssignments: number;
  partialAssignments: number;
  overdueAssignments: number;
  waivedAssignments: number;
  totalAmountDue: number;
  totalAmountPaid: number;
  totalBalance: number;
  collectionRate: number;
  totalExemptions: number;
  totalExemptionAmount: number;
}

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [assignments, setAssignments] = useState<AssignmentWithFee[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [exemptions, setExemptions] = useState<FeeExemption[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalAssignments: 0,
    paidAssignments: 0,
    unpaidAssignments: 0,
    partialAssignments: 0,
    overdueAssignments: 0,
    waivedAssignments: 0,
    totalAmountDue: 0,
    totalAmountPaid: 0,
    totalBalance: 0,
    collectionRate: 0,
    totalExemptions: 0,
    totalExemptionAmount: 0
  });
  const [recentPayments, setRecentPayments] = useState<PaymentRecord[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<AssignmentWithFee[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<string>('');
  const [currentTerm, setCurrentTerm] = useState<string>('');

  // Fetch student data with timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const loadData = () => {
      if (user) {
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.log('⏰ Loading timeout - forcing loading to stop');
          setLoading(false);
          toast.error('Dashboard loading timed out. Please refresh the page.');
        }, 15000);
        
        fetchStudentData();
      } else {
        setLoading(false);
      }
    };
    
    loadData();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user]);

  // ============================================
  // FETCH STUDENT DATA - FIXED
  // ============================================
  const fetchStudentData = async () => {
    setLoading(true);
    try {
      let studentData = null;
      let foundStudent = false;

      // Try 1: Find student by email
      if (user?.email) {
        console.log('🔍 Looking for student with email:', user.email);
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
          .maybeSingle();
        
        if (!error && data) {
          studentData = data;
          foundStudent = true;
          console.log('✅ Found student by email:', studentData.first_name, studentData.last_name);
        } else if (error) {
          console.log('⚠️ Email lookup failed:', error.message);
        }
      }

      // Try 2: Find by user_id if email fails
      if (!foundStudent && user?.id) {
        console.log('🔍 Looking for student with user_id:', user.id);
        const { data, error } = await supabase
          .from('students')
          .select(`
            *,
            class:class_id (
              id,
              name
            )
          `)
          .eq('id', user.id)
          .maybeSingle();
        
        if (!error && data) {
          studentData = data;
          foundStudent = true;
          console.log('✅ Found student by user_id:', studentData.first_name, studentData.last_name);
        } else if (error) {
          console.log('⚠️ User_id lookup failed:', error.message);
        }
      }

      // Try 3: Get first student as fallback
      if (!foundStudent) {
        console.log('🔍 No student found by email or user_id, getting first student...');
        const { data, error } = await supabase
          .from('students')
          .select(`
            *,
            class:class_id (
              id,
              name
            )
          `)
          .limit(1)
          .maybeSingle();
        
        if (!error && data) {
          studentData = data;
          foundStudent = true;
          console.log('✅ Using fallback student:', studentData.first_name, studentData.last_name);
          toast('Using demo student data. Please set up your student account properly.', {
            duration: 5000,
            icon: 'ℹ️'
          });
        } else if (error) {
          console.log('⚠️ Fallback lookup failed:', error.message);
        }
      }

      // If still no student, show error
      if (!foundStudent || !studentData) {
        console.error('❌ No student found after all attempts');
        toast.error('Student account not found. Please contact support.');
        setLoading(false);
        return;
      }

      setProfile(studentData);

      // Fetch academic period
      if (studentData.branch_id) {
        await fetchAcademicPeriod(studentData.branch_id);
      }

      // Fetch all data in parallel
      await Promise.all([
        fetchAssignments(studentData.id),
        fetchPayments(studentData.id),
        fetchExemptions(studentData.id)
      ]);

      console.log('✅ All data loaded successfully');

    } catch (error: any) {
      console.error('❌ Error fetching student data:', error);
      toast.error(error.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchAcademicPeriod = async (branchId: string) => {
    try {
      console.log('📅 Fetching academic period for branch:', branchId);
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('session_name, term_name')
        .eq('branch_id', branchId)
        .eq('is_current', true)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching academic period:', error);
        return;
      }

      if (data) {
        setCurrentSession(data.session_name || '');
        setCurrentTerm(data.term_name || '');
        console.log('📅 Academic period loaded:', data.session_name, data.term_name);
      } else {
        console.log('📅 No current academic period found, using defaults');
        setCurrentSession('2026/2027');
        setCurrentTerm('First Term');
      }
    } catch (error) {
      console.error('❌ Error in fetchAcademicPeriod:', error);
    }
  };

  const fetchAssignments = async (studentId: string) => {
    try {
      console.log('📋 Fetching assignments for student:', studentId);
      const { data, error } = await supabase
        .from('student_fee_assignments')
        .select(`
          *,
          fee:fee_id (
            id,
            name,
            category,
            description
          )
        `)
        .eq('student_id', studentId)
        .eq('is_active', true)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('❌ Error fetching assignments:', error);
        setAssignments([]);
        return;
      }

      console.log('📋 Assignments loaded:', data?.length || 0);
      
      if (!data || data.length === 0) {
        setAssignments([]);
        setStats(prev => ({
          ...prev,
          totalAssignments: 0,
          paidAssignments: 0,
          unpaidAssignments: 0,
          partialAssignments: 0,
          overdueAssignments: 0,
          waivedAssignments: 0,
          totalAmountDue: 0,
          totalAmountPaid: 0,
          totalBalance: 0,
          collectionRate: 0
        }));
        return;
      }

      const processedData = data.map(assignment => ({
        ...assignment,
        payment_status: assignment.payment_status || 'unpaid'
      }));

      setAssignments(processedData);

      // Calculate stats
      const totalAssignments = processedData.length;
      const paidAssignments = processedData.filter(a => a.payment_status === 'paid').length;
      const unpaidAssignments = processedData.filter(a => a.payment_status === 'unpaid').length;
      const partialAssignments = processedData.filter(a => a.payment_status === 'partial').length;
      const overdueAssignments = processedData.filter(a => a.payment_status === 'overdue').length;
      const waivedAssignments = processedData.filter(a => a.payment_status === 'waived').length;
      
      const totalAmountDue = processedData.reduce((sum, a) => sum + (a.amount_due || 0), 0);
      const totalAmountPaid = processedData.reduce((sum, a) => sum + (a.amount_paid || 0), 0);
      const totalBalance = processedData
        .filter(a => a.payment_status !== 'paid' && a.payment_status !== 'waived')
        .reduce((sum, a) => sum + (a.balance || 0), 0);
      const collectionRate = totalAmountDue > 0 ? (totalAmountPaid / totalAmountDue) * 100 : 0;

      setStats({
        totalAssignments,
        paidAssignments,
        unpaidAssignments,
        partialAssignments,
        overdueAssignments,
        waivedAssignments,
        totalAmountDue,
        totalAmountPaid,
        totalBalance,
        collectionRate,
        totalExemptions: 0,
        totalExemptionAmount: 0
      });

      // Get upcoming assignments
      const upcoming = processedData
        .filter(a => 
          a.due_date && 
          a.payment_status !== 'paid' && 
          a.payment_status !== 'waived' &&
          dayjs(a.due_date).isAfter(dayjs())
        )
        .sort((a, b) => dayjs(a.due_date).diff(dayjs(b.due_date)))
        .slice(0, 5);

      setUpcomingAssignments(upcoming);

    } catch (error) {
      console.error('❌ Error in fetchAssignments:', error);
      setAssignments([]);
    }
  };

  const fetchPayments = async (studentId: string) => {
    try {
      console.log('💳 Fetching payments for student:', studentId);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Error fetching payments:', error);
        setPayments([]);
        setRecentPayments([]);
        return;
      }

      console.log('💳 Payments loaded:', data?.length || 0);

      if (!data || data.length === 0) {
        setPayments([]);
        setRecentPayments([]);
        return;
      }

      const paymentsWithFees = await Promise.all(
        data.map(async (payment) => {
          let feeName = 'Fee Payment';
          if (payment.fee_id) {
            const { data: feeData } = await supabase
              .from('fees')
              .select('name')
              .eq('id', payment.fee_id)
              .maybeSingle();
            if (feeData) {
              feeName = feeData.name;
            }
          }
          return {
            ...payment,
            fee: { name: feeName }
          };
        })
      );

      setPayments(paymentsWithFees);
      setRecentPayments(paymentsWithFees);

    } catch (error) {
      console.error('❌ Error in fetchPayments:', error);
      setPayments([]);
      setRecentPayments([]);
    }
  };

  const fetchExemptions = async (studentId: string) => {
    try {
      console.log('🛡️ Fetching exemptions for student:', studentId);
      const { data, error } = await supabase
        .from('fee_exemptions')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching exemptions:', error);
        setExemptions([]);
        return;
      }

      console.log('🛡️ Exemptions loaded:', data?.length || 0);
      setExemptions(data || []);
      
      if (data && data.length > 0 && assignments.length > 0) {
        const totalExemptions = data.length;
        const totalExemptionAmount = data.reduce((sum, e) => {
          const assignment = assignments.find(a => a.fee_id === e.fee_id);
          return sum + (assignment ? assignment.original_amount * (e.waiver_percentage / 100) : 0);
        }, 0);
        
        setStats(prev => ({
          ...prev,
          totalExemptions,
          totalExemptionAmount
        }));
      }

    } catch (error) {
      console.error('❌ Error in fetchExemptions:', error);
      setExemptions([]);
    }
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

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
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      unpaid: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      waived: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    return styles[status] || styles.pending;
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      school_fees: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      books: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      uniform: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      sportswear: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
      bus: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      pta: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      examination: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      medical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      graduation: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      development_levy: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
      identity_card: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      excursion: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
      hostel: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
      laboratory: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
      lesson_fee: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      extra_classes: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      ict: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      custom: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[category] || styles.custom;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return CheckCircle;
      case 'pending': return Clock;
      case 'overdue': return AlertCircle;
      case 'waived': return Shield;
      case 'partial': return AlertCircle;
      default: return XCircle;
    }
  };

  const completionRate = stats.totalAssignments > 0 
    ? Math.round((stats.paidAssignments / stats.totalAssignments) * 100) 
    : 0;

  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : 'Student';

  // ============================================
  // STATS CARDS - Side by Side on Mobile
  // ============================================
  const statsCards = [
    {
      title: 'Total Fees',
      value: stats.totalAssignments,
      icon: FileText,
      gradient: 'from-blue-500 to-cyan-500',
      text: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Paid Fees',
      value: stats.paidAssignments,
      icon: CheckCircle,
      gradient: 'from-green-500 to-emerald-500',
      text: 'text-green-600 dark:text-green-400'
    },
    {
      title: 'Outstanding',
      value: stats.unpaidAssignments + stats.partialAssignments,
      icon: AlertCircle,
      gradient: 'from-red-500 to-rose-500',
      text: 'text-red-600 dark:text-red-400'
    },
    {
      title: 'Total Paid',
      value: formatCurrency(stats.totalAmountPaid),
      icon: DollarSign,
      gradient: 'from-purple-500 to-violet-500',
      text: 'text-purple-600 dark:text-purple-400'
    }
  ];

  // ============================================
  // QUICK ACTIONS - Side by Side on Mobile
  // ============================================
  const quickActions = [
    { 
      icon: CreditCard, 
      label: 'Pay Fees', 
      desc: 'Make a payment', 
      gradient: 'from-blue-500 to-cyan-500',
      path: '/student/pay-bill' 
    },
    { 
      icon: Receipt, 
      label: 'History', 
      desc: 'View payments', 
      gradient: 'from-purple-500 to-violet-500',
      path: '/student/payments' 
    },
    { 
      icon: BookOpen, 
      label: 'Classes', 
      desc: 'View schedule', 
      gradient: 'from-green-500 to-emerald-500',
      path: '/student/classes' 
    },
    { 
      icon: User, 
      label: 'Profile', 
      desc: 'View & edit', 
      gradient: 'from-orange-500 to-amber-500',
      path: '/student/profile' 
    }
  ];

  // ============================================
  // RENDER
  // ============================================

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      
      {/* ============================================
          HEADER - Responsive
          ============================================ */}
      <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-white/20 dark:border-slate-700/50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="lg:hidden">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <School className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
                </div>
                <h1 className="text-sm sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                  Dashboard
                </h1>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <span className="px-2 py-0.5 sm:py-1 bg-slate-100 dark:bg-slate-700 rounded-lg truncate max-w-[120px] sm:max-w-none">
                  {currentSession} • {currentTerm}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 truncate max-w-[80px] sm:max-w-[150px]">
                {fullName}
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
                {fullName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden mb-4 p-3 sm:p-4 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700"
            >
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      navigate(action.path);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 p-2 sm:p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                  >
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r ${action.gradient} flex items-center justify-center flex-shrink-0`}>
                      <action.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">{action.label}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">{action.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 text-white shadow-xl"
        >
          <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 sm:w-48 h-24 sm:h-48 bg-white/5 rounded-full blur-xl"></div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm opacity-80">Welcome back,</p>
              <h2 className="text-lg sm:text-2xl font-bold truncate">{fullName}</h2>
              <p className="text-xs sm:text-sm opacity-80 mt-0.5 sm:mt-1 truncate">
                {profile?.class?.name || 'Student'} • {profile?.student_id || 'N/A'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium">{completionRate}% Complete</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm">
                <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium">{stats.totalExemptions} Exemptions</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================
            STATS GRID - 2x2 on Mobile, 4 on Desktop
            ============================================ */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {statsCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="relative overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-3 sm:p-5 group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
              <div className="relative">
                <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 truncate">{stat.title}</p>
                <p className="text-base sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 sm:mt-1 truncate">{stat.value}</p>
              </div>
              <div className={`absolute top-2 sm:top-4 right-2 sm:right-4 w-7 h-7 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-white" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* ============================================
            MAIN CONTENT GRID - Side by Side on Mobile
            ============================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
          
          {/* Left Column - 2/3 on desktop, full on mobile */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-6">
            
            {/* Payment Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-4 sm:p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                  Payment Progress
                </h3>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs sm:text-sm font-medium text-slate-500">{completionRate}% Complete</span>
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${completionRate >= 70 ? 'bg-green-500' : completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                </div>
              </div>
              <div className="relative">
                <div className="h-2 sm:h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                  />
                </div>
                <div className="flex flex-col xs:flex-row xs:justify-between mt-2 sm:mt-3 text-[10px] sm:text-sm gap-1 xs:gap-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                    <span className="text-slate-500 dark:text-slate-400">Paid: {formatCurrency(stats.totalAmountPaid)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></div>
                    <span className="text-slate-500 dark:text-slate-400">Balance: {formatCurrency(stats.totalBalance)}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats Mini Grid - 2x2 on Mobile */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-3 sm:p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 truncate">Due Amount</p>
                    <p className="text-sm sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5 sm:mt-1 truncate">
                      {formatCurrency(stats.totalAmountDue)}
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg flex-shrink-0">
                    <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-3 sm:p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 truncate">Overdue</p>
                    <p className="text-sm sm:text-xl font-bold text-red-600 dark:text-red-400 mt-0.5 sm:mt-1">{stats.overdueAssignments}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg flex-shrink-0">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Fee Assignments List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 overflow-hidden"
            >
              <div className="p-3 sm:p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                    Your Fees
                  </h3>
                  <button
                    onClick={() => navigate('/student/fees')}
                    className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    View All
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {assignments.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                      <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                    </div>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">No fees assigned yet</p>
                  </div>
                ) : (
                  assignments.slice(0, 5).map((assignment, index) => {
                    const StatusIcon = getStatusIcon(assignment.payment_status);
                    const isExempted = exemptions.some(e => e.fee_id === assignment.fee_id);
                    const exemption = exemptions.find(e => e.fee_id === assignment.fee_id);
                    const isPaid = assignment.payment_status === 'paid';
                    
                    return (
                      <motion.div
                        key={assignment.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * index }}
                        className={`p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all ${
                          assignment.payment_status === 'overdue' ? 'border-l-4 border-l-red-500' : ''
                        } ${isExempted ? 'border-l-4 border-l-purple-500' : ''}`}
                      >
                        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                              <span className={`inline-flex px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getCategoryBadge(assignment.fee?.category || '')}`}>
                                {assignment.fee?.category?.replace(/_/g, ' ') || 'Fee'}
                              </span>
                              <span className="font-medium text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                {assignment.fee?.name || 'Unknown Fee'}
                              </span>
                              {isExempted && exemption && (
                                <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                  <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  {exemption.waiver_percentage}% waived
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-0.5 sm:gap-1">
                                <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                Due: {assignment.due_date ? dayjs(assignment.due_date).format('MMM D, YYYY') : 'N/A'}
                              </span>
                              {assignment.session && assignment.term && (
                                <span className="truncate">{assignment.term} {assignment.session}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-0 xs:ml-4">
                            <p className={`font-bold text-xs sm:text-base ${
                              isPaid ? 'text-green-600 dark:text-green-400' :
                              assignment.payment_status === 'waived' ? 'text-purple-600 dark:text-purple-400' :
                              'text-slate-900 dark:text-white'
                            }`}>
                              {isPaid || assignment.payment_status === 'waived' ? '₦0.00' : formatCurrency(assignment.balance)}
                            </p>
                            <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                              <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-medium ${getStatusBadge(assignment.payment_status)}`}>
                                <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                {isPaid ? 'Paid' : assignment.payment_status.charAt(0).toUpperCase() + assignment.payment_status.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>

          {/* ============================================
              Right Column - 1/3 on desktop, full on mobile
              ============================================ */}
          <div className="space-y-3 sm:space-y-6">
            
            {/* Quick Actions - 2x2 Grid on Mobile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-3 sm:p-4"
            >
              <h4 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <Rocket className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                Quick Actions
              </h4>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(action.path)}
                    className="flex flex-col items-center p-2 sm:p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group text-center"
                  >
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r ${action.gradient} flex items-center justify-center shadow-lg`}>
                      <action.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <p className="text-[10px] sm:text-xs font-medium text-slate-900 dark:text-white mt-1 sm:mt-1.5 truncate w-full">
                      {action.label}
                    </p>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Recent Payments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-3 sm:p-4"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h4 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 sm:gap-2">
                  <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                  Recent Payments
                </h4>
                <button 
                  onClick={() => navigate('/student/payments')}
                  className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  View All
                </button>
              </div>
              {recentPayments.length === 0 ? (
                <div className="text-center py-4 sm:py-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-1.5 sm:mb-2">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">No recent payments</p>
                </div>
              ) : (
                <div className="space-y-1.5 sm:space-y-2">
                  {recentPayments.slice(0, 4).map((payment, index) => (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                      className="flex items-center justify-between p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg sm:rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all"
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs font-medium text-slate-900 dark:text-white truncate">
                            {payment.fee?.name || 'Fee Payment'}
                          </p>
                          <p className="text-[8px] sm:text-xs text-slate-500 dark:text-slate-400">
                            {dayjs(payment.payment_date).format('MMM D')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-1 sm:ml-2">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {formatCurrency(payment.amount_paid)}
                        </p>
                        <span className={`text-[8px] sm:text-[10px] capitalize px-1 sm:px-1.5 py-0.5 rounded ${
                          payment.status === 'completed' || payment.status === 'paid' || payment.status === 'approved'
                            ? 'text-green-600 bg-green-100 dark:bg-green-900/30' 
                            : payment.status === 'pending'
                            ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
                            : 'text-red-600 bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Exemptions Summary */}
            {exemptions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-purple-200 dark:border-purple-800/50 p-3 sm:p-4"
              >
                <h4 className="text-xs sm:text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
                  Exemptions
                </h4>
                <div className="space-y-1.5 sm:space-y-2">
                  {exemptions.slice(0, 3).map((exemption) => {
                    const assignment = assignments.find(a => a.fee_id === exemption.fee_id);
                    return (
                      <div key={exemption.id} className="flex items-center justify-between p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg sm:rounded-xl">
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs font-medium text-slate-900 dark:text-white truncate">
                            {assignment?.fee?.name || 'Fee'}
                          </p>
                          <p className="text-[8px] sm:text-xs text-purple-600 dark:text-purple-400 capitalize">
                            {exemption.exemption_type.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-1 sm:ml-2">
                          <p className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400">
                            {exemption.waiver_percentage}% waived
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Help Widget */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              whileHover={{ scale: 1.02 }}
              className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white shadow-xl"
            >
              <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-white/20 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-16 sm:w-24 h-16 sm:h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="relative flex items-start gap-2 sm:gap-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                  <HelpCircle className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm sm:text-lg">Need Help?</h4>
                  <p className="text-xs sm:text-sm opacity-90 mt-0.5 sm:mt-1">Our support team is here</p>
                  <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                    <button className="flex-1 px-2 sm:px-3 py-1 sm:py-2 bg-white/20 hover:bg-white/30 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-medium transition-all backdrop-blur-sm">
                      💬 Chat
                    </button>
                    <button className="flex-1 px-2 sm:px-3 py-1 sm:py-2 bg-white/20 hover:bg-white/30 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-medium transition-all backdrop-blur-sm">
                      📞 Call
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 sm:mt-8 text-center text-[10px] sm:text-xs text-slate-400 dark:text-slate-600"
        >
          <p>© {dayjs().year()} Ebenezer International School. All rights reserved.</p>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentDashboard;