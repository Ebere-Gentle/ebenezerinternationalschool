// src/pages/parent/ParentDashboard.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { usePaymentData } from '../../hooks/usePaymentData';
import { supabase } from '../../config/supabase/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isBetween from 'dayjs/plugin/isBetween';
import {
  Users,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Receipt,
  School,
  Search,
  Menu,
  X,
  Home,
  Moon,
  User,
  AlertTriangle,
  Zap,
  TrendingUp,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  CircleDollarSign,
} from 'lucide-react';

import {
  getPaymentStatusBadge,
  getCategoryBadge,
} from '../../utils/paymentUtils';

// Recharts imports
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';

dayjs.extend(relativeTime);
dayjs.extend(isBetween);

// Types
interface Parent {
  id: string;
  parent_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  address: string;
  branch_id: string;
}

interface Student {
  id: string;
  student_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  class_id: string;
  class_name?: string;
  branch_id: string;
  current_status: string;
  admission_status: string;
  admission_date: string;
  passport_url?: string;
  parent_id: string;
}

interface StudentWithFees extends Student {
  assignments: any[];
  payments: any[];
  totalBalance: number;
  totalPaid: number;
  totalDue: number;
  completionRate: number;
  studentId: string;
}

// Chart Colors
const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  info: '#06b6d4',
  pink: '#ec4899',
  orange: '#f97316',
  purple: '#a855f7',
  teal: '#14b8a6',
  indigo: '#6366f1',
  rose: '#f43f5e',
  amber: '#f59e0b',
  emerald: '#10b981',
  cyan: '#06b6d4',
  violet: '#8b5cf6',
  fuchsia: '#d946ef',
  lime: '#84cc16',
};

const COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.info,
  CHART_COLORS.purple,
  CHART_COLORS.pink,
  CHART_COLORS.orange,
  CHART_COLORS.teal,
  CHART_COLORS.indigo,
  CHART_COLORS.rose,
  CHART_COLORS.amber,
];

const ParentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parent, setParent] = useState<Parent | null>(null);
  const [students, setStudents] = useState<StudentWithFees[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithFees | null>(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'fees' | 'payments' | 'analytics'>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [academicInfo, setAcademicInfo] = useState<{ session: string; term: string }>({
    session: '',
    term: ''
  });

  const [summary, setSummary] = useState({
    totalStudents: 0,
    totalOutstanding: 0,
    totalPaid: 0,
    totalDue: 0,
    pendingCount: 0,
    overdueCount: 0,
    collectionRate: 0
  });

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line' | 'area'>('bar');

  const {
    assignments,
    payments,
    refresh: refreshPaymentData,
    loading: paymentDataLoading,
  } = usePaymentData(selectedStudentId, selectedBranchId, {
    autoFetch: !!selectedStudentId && !!selectedBranchId,
  });

  // ============================================
  // FETCH PARENT DATA - FIXED TO REFRESH PROPERLY
  // ============================================
  const fetchParentData = async (showToast: boolean = false) => {
    if (!user?.id) return;
    
    try {
      if (showToast) {
        setRefreshing(true);
      }
      
      // 1. Get parent
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (parentError) throw parentError;
      setParent(parentData);

      // 2. Get academic period
      await fetchAcademicPeriod(parentData.branch_id);

      // 3. Get students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          *,
          class:class_id (
            id,
            name
          )
        `)
        .eq('parent_id', parentData.id)
        .eq('current_status', 'active');

      if (studentsError) throw studentsError;

      // 4. Process each student with fees
      const studentsWithFees = await Promise.all(
        (studentsData || []).map(async (student) => {
          // Get ALL assignments for this student
          const { data: assignmentsData, error: assignmentsError } = await supabase
            .from('student_fee_assignments')
            .select(`
              *,
              fee:fees(
                id,
                name,
                category,
                amount,
                due_date,
                payment_frequency,
                term,
                session,
                metadata
              )
            `)
            .eq('student_id', student.id)
            .eq('is_active', true);

          if (assignmentsError) {
            console.error('Error loading assignments:', assignmentsError);
          }

          // Get ALL successful payments for this student
          const { data: paymentsData, error: paymentsError } = await supabase
            .from('payments')
            .select('*')
            .eq('student_id', student.id)
            .in('status', ['success', 'completed', 'approved', 'paid'])
            .order('payment_date', { ascending: false });

          if (paymentsError) {
            console.error('Error loading payments:', paymentsError);
          }

          // Process assignments with CORRECT calculations
          const processedAssignments = (assignmentsData || []).map((assignment: any) => {
            // Get payments for this specific assignment
            const assignmentPayments = (paymentsData || []).filter(
              (p: any) => p.assignment_id === assignment.id
            );

            // Calculate total paid from payments (SOURCE OF TRUTH)
            const totalPaidFromPayments = assignmentPayments.reduce(
              (sum: number, p: any) => sum + (p.amount_paid || p.amount || 0),
              0
            );

            const amountDue = assignment.amount_due || assignment.original_amount || 0;
            const balance = Math.max(0, amountDue - totalPaidFromPayments);

            // Determine status
            let paymentStatus = assignment.payment_status || 'unpaid';
            if (balance <= 0) {
              paymentStatus = 'paid';
            } else if (totalPaidFromPayments > 0 && balance > 0) {
              paymentStatus = 'partial';
            }

            return {
              ...assignment,
              fee_name: assignment.fee?.name || 'Unknown Fee',
              fee_category: assignment.fee?.category || 'Other',
              fee_amount: assignment.fee?.amount || 0,
              amount_paid: totalPaidFromPayments,
              balance: balance,
              payment_status: paymentStatus,
            };
          });

          const processedPayments = (paymentsData || []).map((p: any) => ({
            ...p,
            fee_name: p.fee?.name || 'Unknown Fee',
          }));

          // Calculate totals
          const totalBalance = processedAssignments
            .filter(a => a.payment_status !== 'paid' && a.payment_status !== 'waived')
            .reduce((sum, a) => sum + a.balance, 0);
          const totalPaid = processedAssignments
            .filter(a => a.payment_status !== 'pending')
            .reduce((sum, a) => sum + a.amount_paid, 0);
          const totalDue = processedAssignments.reduce((sum, a) => sum + a.amount_due, 0);
          const completionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

          return {
            ...student,
            class_name: student.class?.name || 'Not Assigned',
            assignments: processedAssignments,
            payments: processedPayments,
            totalBalance,
            totalPaid,
            totalDue,
            completionRate,
            studentId: student.id,
          };
        })
      );

      setStudents(studentsWithFees);

      // Auto-select first student if none selected or if selected student changed
      if (studentsWithFees.length > 0) {
        // If we have a selected student, try to keep it
        if (selectedStudentId) {
          const existingStudent = studentsWithFees.find(s => s.id === selectedStudentId);
          if (existingStudent) {
            setSelectedStudent(existingStudent);
          } else {
            // If selected student no longer exists, select first
            setSelectedStudent(studentsWithFees[0]);
            setSelectedStudentId(studentsWithFees[0].id);
            setSelectedBranchId(studentsWithFees[0].branch_id);
          }
        } else {
          // No selected student, select first
          setSelectedStudent(studentsWithFees[0]);
          setSelectedStudentId(studentsWithFees[0].id);
          setSelectedBranchId(studentsWithFees[0].branch_id);
        }
      }

      // Update summary
      const totalStudents = studentsWithFees.length;
      const totalOutstanding = studentsWithFees.reduce((sum, s) => sum + s.totalBalance, 0);
      const totalPaid = studentsWithFees.reduce((sum, s) => sum + s.totalPaid, 0);
      const totalDue = studentsWithFees.reduce((sum, s) => sum + s.totalDue, 0);
      const pendingCount = studentsWithFees.reduce((sum, s) =>
        sum + s.assignments.filter(a => a.payment_status === 'unpaid' || a.payment_status === 'partial' || a.payment_status === 'pending').length, 0
      );
      const overdueCount = studentsWithFees.reduce((sum, s) =>
        sum + s.assignments.filter(a => a.payment_status === 'overdue').length, 0
      );
      const collectionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

      setSummary({
        totalStudents,
        totalOutstanding,
        totalPaid,
        totalDue,
        pendingCount,
        overdueCount,
        collectionRate
      });

    } catch (error: any) {
      console.error('Error fetching parent data:', error);
      toast.error(error.message || 'Failed to load your data');
    } finally {
      setLoading(false);
      if (showToast) {
        setRefreshing(false);
        toast.success('Data refreshed!');
      }
    }
  };

  const fetchAcademicPeriod = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('session_name, term_name')
        .eq('branch_id', branchId)
        .eq('is_current', true)
        .single();

      if (!error && data) {
        setAcademicInfo({
          session: data.session_name,
          term: data.term_name
        });
        return;
      }

      const year = dayjs().year();
      setAcademicInfo({
        session: `${year}/${year + 1}`,
        term: 'First Term'
      });
    } catch (error) {
      console.error('Error fetching academic period:', error);
    }
  };

  // ============================================
  // REFRESH DATA - UPDATES EVERYTHING
  // ============================================
  const refreshData = async () => {
    // Force refresh payment data first
    if (selectedStudentId) {
      await refreshPaymentData();
    }
    // Then refresh parent data
    await fetchParentData(true);
  };

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (user?.id) {
      fetchParentData(false);
    }
  }, [user?.id]);

  // Update selected student when payment data changes
  useEffect(() => {
    if (selectedStudent && assignments.length > 0) {
      const totalBalance = assignments.reduce((sum, a) => sum + a.balance, 0);
      const totalPaid = assignments.reduce((sum, a) => sum + a.amount_paid, 0);
      const totalDue = assignments.reduce((sum, a) => sum + a.amount_due, 0);
      const completionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

      setSelectedStudent(prev => prev ? {
        ...prev,
        assignments: assignments as any,
        payments: payments as any,
        totalBalance,
        totalPaid,
        totalDue,
        completionRate,
      } : null);
    }
  }, [assignments, payments]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => getPaymentStatusBadge(status);

  const handleStudentSelect = (student: StudentWithFees) => {
    setSelectedStudent(student);
    setSelectedStudentId(student.id);
    setSelectedBranchId(student.branch_id);
    setShowStudentDetails(true);
    setActiveTab('overview');
  };

  const goToPayBill = (studentId: string) => {
    navigate(`/parent/pay-bill/${studentId}`);
  };

  const goToPaymentHistory = (studentId: string) => {
    navigate(`/parent/payment/${studentId}`);
  };

  // Chart Data Preparation
  const prepareFeeDistributionData = () => {
    if (!selectedStudent) return [];
    const categories = selectedStudent.assignments.reduce((acc: any, a: any) => {
      const category = a.fee_category || 'Other';
      if (!acc[category]) acc[category] = { category, amount: 0, count: 0 };
      acc[category].amount += a.amount_due;
      acc[category].count += 1;
      return acc;
    }, {});
    return Object.values(categories);
  };

  const preparePaymentStatusData = () => {
    if (!selectedStudent) return [];
    const statuses = selectedStudent.assignments.reduce((acc: any, a: any) => {
      const status = a.payment_status || 'unpaid';
      if (!acc[status]) acc[status] = { status, count: 0, amount: 0 };
      acc[status].count += 1;
      acc[status].amount += a.balance;
      return acc;
    }, {});
    return Object.values(statuses);
  };

  const prepareMonthlyPaymentData = () => {
    if (!selectedStudent) return [];
    const months: any = {};
    selectedStudent.payments.forEach((p: any) => {
      const month = dayjs(p.payment_date).format('MMM YYYY');
      if (!months[month]) months[month] = { month, amount: 0, count: 0 };
      months[month].amount += p.amount_paid;
      months[month].count += 1;
    });
    return Object.values(months);
  };

  const prepareStudentComparisonData = () => {
    return students.map(s => ({
      name: `${s.first_name} ${s.last_name}`,
      balance: s.totalBalance,
      paid: s.totalPaid,
      due: s.totalDue,
      progress: Math.round(s.completionRate),
    }));
  };

  const prepareFeeTrendData = () => {
    if (!selectedStudent) return [];
    return selectedStudent.assignments
      .filter((a: any) => a.due_date)
      .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .map((a: any) => ({
        name: a.fee_name || 'Fee',
        due: a.amount_due,
        balance: a.balance,
        paid: a.amount_paid,
      }));
  };

  const feeDistributionData = prepareFeeDistributionData();
  const paymentStatusData = preparePaymentStatusData();
  const monthlyPaymentData = prepareMonthlyPaymentData();
  const studentComparisonData = prepareStudentComparisonData();
  const feeTrendData = prepareFeeTrendData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Loading your dashboard..." />
          <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-400 dark:text-gray-500 animate-pulse">
            Preparing your personalized experience ✨
          </div>
        </div>
      </div>
    );
  }

  const fullName = parent ? `${parent.first_name} ${parent.last_name}` : 'Parent';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      
      {/* Header */}
      <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-white/20 dark:border-slate-700/50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
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
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <School className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
                </div>
                <h1 className="text-sm sm:text-base md:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent truncate">
                  Parent Portal
                </h1>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-100 dark:bg-slate-700 rounded-lg truncate max-w-[100px] sm:max-w-none">
                  {academicInfo.session} • {academicInfo.term}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            
              <button
                onClick={() => navigate('/parent/profile')}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        
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
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (selectedStudent) {
                      goToPayBill(selectedStudent.id);
                    } else if (students.length > 0) {
                      goToPayBill(students[0].id);
                    }
                  }}
                  className="flex items-center gap-2 p-2.5 sm:p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium"
                >
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                  Pay Bill
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (selectedStudent) {
                      goToPaymentHistory(selectedStudent.id);
                    } else if (students.length > 0) {
                      goToPaymentHistory(students[0].id);
                    }
                  }}
                  className="flex items-center gap-2 p-2.5 sm:p-3 bg-blue-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium"
                >
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
                  History
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 text-white shadow-xl"
        >
          <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 sm:w-48 h-24 sm:h-48 bg-white/5 rounded-full blur-xl"></div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm opacity-80">Welcome back,</p>
              <h2 className="text-base sm:text-xl md:text-2xl font-bold truncate">{fullName}</h2>
              <p className="text-xs sm:text-sm opacity-80 mt-0.5 sm:mt-1">
                {students.length} {students.length === 1 ? 'child' : 'children'} enrolled
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-[10px] sm:text-sm font-medium">Rate: {Math.round(summary.collectionRate)}%</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-[10px] sm:text-sm font-medium">{summary.totalStudents}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-3 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 truncate">Students</p>
                <p className="text-base sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 sm:mt-1">{summary.totalStudents}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-3 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 truncate">Outstanding</p>
                <p className="text-xs sm:text-xl font-bold text-red-600 dark:text-red-400 mt-0.5 sm:mt-1 truncate">
                  {formatCurrency(summary.totalOutstanding)}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-3 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 truncate">Total Paid</p>
                <p className="text-xs sm:text-xl font-bold text-green-600 dark:text-green-400 mt-0.5 sm:mt-1 truncate">
                  {formatCurrency(summary.totalPaid)}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-3 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 truncate">Pending Fees</p>
                <p className="text-base sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-0.5 sm:mt-1">{summary.pendingCount}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-3 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 truncate">Overdue</p>
                <p className="text-base sm:text-2xl font-bold text-red-500 dark:text-red-400 mt-0.5 sm:mt-1">{summary.overdueCount}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-3 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 truncate">Collection</p>
                <p className="text-base sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-1">
                  {Math.round(summary.collectionRate)}%
                </p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Left Column - Children List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-3 sm:space-y-4"
          >
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  <span className="truncate">My Children</span>
                </h3>
                <span className="text-xs sm:text-sm text-slate-500 flex-shrink-0">{students.length}</span>
              </div>

              <div className="relative mb-2 sm:mb-3">
                <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
                {students
                  .filter(s => 
                    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.student_id.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((student, index) => (
                    <motion.button
                      key={student.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleStudentSelect(student)}
                      className={`w-full p-2.5 sm:p-3 rounded-lg sm:rounded-xl border transition-all text-left ${
                        selectedStudent?.id === student.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-green-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-medium text-[10px] sm:text-sm flex-shrink-0">
                          {student.first_name?.[0]}{student.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                            {student.class_name || 'No Class'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-1 sm:ml-2">
                          {student.totalBalance > 0 ? (
                            <span className="text-[10px] sm:text-xs font-medium text-red-600 dark:text-red-400">
                              {formatCurrency(student.totalBalance)}
                            </span>
                          ) : (
                            <span className="text-[10px] sm:text-xs font-medium text-green-600 dark:text-green-400">✅</span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
              </div>

              {students.length === 0 && (
                <div className="text-center py-6 sm:py-8">
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 dark:text-gray-600" />
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">No children found</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-3 sm:p-4">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 sm:mb-3">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <button
                  onClick={() => {
                    if (selectedStudent) {
                      goToPayBill(selectedStudent.id);
                    } else if (students.length > 0) {
                      goToPayBill(students[0].id);
                    } else {
                      toast.error('No students found');
                    }
                  }}
                  className="p-2.5 sm:p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                >
                  <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Pay Bill
                </button>
                <button
                  onClick={() => {
                    if (selectedStudent) {
                      goToPaymentHistory(selectedStudent.id);
                    } else if (students.length > 0) {
                      goToPaymentHistory(students[0].id);
                    } else {
                      toast.error('No students found');
                    }
                  }}
                  className="p-2.5 sm:p-3 bg-blue-600 text-white rounded-lg sm:rounded-xl font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                >
                  <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  History
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Student Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            {selectedStudent ? (
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 overflow-hidden">
                
                {/* Student Header */}
                <div className="p-3 sm:p-4 md:p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-lg sm:text-2xl font-bold flex-shrink-0">
                        {selectedStudent.first_name?.[0]}{selectedStudent.last_name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">
                          {selectedStudent.first_name} {selectedStudent.last_name}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                          {selectedStudent.class_name} • {selectedStudent.student_id}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <button
                        onClick={() => goToPayBill(selectedStudent.id)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                      >
                        <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Pay
                      </button>
                      <button
                        onClick={() => goToPaymentHistory(selectedStudent.id)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg sm:rounded-xl font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                      >
                        <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        History
                      </button>
                    </div>
                  </div>

                  {/* Student Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3 mt-3 sm:mt-4">
                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 text-center">
                      <p className="text-[8px] sm:text-xs text-slate-500 dark:text-slate-400">Fees</p>
                      <p className="text-xs sm:text-base md:text-lg font-bold text-slate-900 dark:text-white">
                        {selectedStudent.assignments.length}
                      </p>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 text-center">
                      <p className="text-[8px] sm:text-xs text-slate-500 dark:text-slate-400">Balance</p>
                      <p className={`text-[10px] sm:text-xs md:text-sm lg:text-base font-bold truncate ${selectedStudent.totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(selectedStudent.totalBalance)}
                      </p>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 text-center">
                      <p className="text-[8px] sm:text-xs text-slate-500 dark:text-slate-400">Paid</p>
                      <p className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold text-green-600 dark:text-green-400 truncate">
                        {formatCurrency(selectedStudent.totalPaid)}
                      </p>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 text-center">
                      <p className="text-[8px] sm:text-xs text-slate-500 dark:text-slate-400">Progress</p>
                      <p className="text-xs sm:text-base md:text-lg font-bold text-blue-600 dark:text-blue-400">
                        {Math.round(selectedStudent.completionRate)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-0.5 sm:gap-1 p-2 sm:p-3 border-b border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-gray-800/50 overflow-x-auto">
                  {[
                    { id: 'overview', label: 'Overview', icon: Home },
                    { id: 'fees', label: `Fees (${selectedStudent.assignments.length})`, icon: FileText },
                    { id: 'payments', label: `Payments (${selectedStudent.payments.length})`, icon: Receipt },
                    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap ${
                          activeTab === tab.id
                            ? 'bg-white dark:bg-slate-700 shadow-lg text-green-600 dark:text-green-400'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <span className="flex items-center gap-1 sm:gap-2">
                          <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden xs:inline">{tab.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content */}
                <div className="p-3 sm:p-4 md:p-6">
                  
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="space-y-3 sm:space-y-4">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                          <span className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400">Payment Progress</span>
                          <span className="text-[10px] sm:text-sm font-medium text-slate-900 dark:text-white">
                            {Math.round(selectedStudent.completionRate)}%
                          </span>
                        </div>
                        <div className="h-2 sm:h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(selectedStudent.completionRate, 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                          />
                        </div>
                      </div>

                      {/* Fee Summary */}
                      <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl p-2.5 sm:p-4">
                          <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400">Total Due</p>
                          <p className="text-sm sm:text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">
                            {formatCurrency(selectedStudent.totalDue)}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl p-2.5 sm:p-4">
                          <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400">Remaining</p>
                          <p className={`text-sm sm:text-lg md:text-xl font-bold truncate ${selectedStudent.totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(selectedStudent.totalBalance)}
                          </p>
                        </div>
                      </div>

                      {/* Recent Payments */}
                      {selectedStudent.payments.length > 0 && (
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 sm:mb-3">Recent Payments</h4>
                          <div className="space-y-1.5 sm:space-y-2">
                            {selectedStudent.payments.slice(0, 3).map((payment: any) => (
                              <div key={payment.id} className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 xs:gap-0 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl">
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {payment.fee_name || 'Fee Payment'}
                                  </p>
                                  <p className="text-[10px] sm:text-xs text-slate-500">
                                    {dayjs(payment.payment_date).format('MMM D, YYYY')}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-0 xs:ml-2">
                                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                    {formatCurrency(payment.amount_paid)}
                                  </p>
                                  <span className={`text-[8px] sm:text-xs ${getStatusBadge(payment.status)}`}>
                                    {payment.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fees Tab */}
                  {activeTab === 'fees' && (
                    <div className="space-y-2 sm:space-y-3">
                      {selectedStudent.assignments.length === 0 ? (
                        <div className="text-center py-6 sm:py-8">
                          <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300" />
                          <p className="text-xs sm:text-sm text-gray-500 mt-2">No fees assigned</p>
                        </div>
                      ) : (
                        selectedStudent.assignments.map((assignment: any) => {
                          const isPaid = assignment.payment_status === 'paid' || assignment.payment_status === 'waived';
                          const isOverdue = assignment.payment_status === 'overdue';
                          
                          return (
                            <motion.div
                              key={assignment.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`border rounded-lg sm:rounded-xl overflow-hidden ${
                                isOverdue 
                                  ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800' 
                                  : isPaid 
                                  ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800'
                                  : 'border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <div className="p-2.5 sm:p-4">
                                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                      <span className={`inline-flex px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium ${getCategoryBadge(assignment.fee_category || '')}`}>
                                        {assignment.fee_category?.replace(/_/g, ' ') || 'Fee'}
                                      </span>
                                      <span className="font-medium text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                        {assignment.fee_name || 'Unknown Fee'}
                                      </span>
                                      {assignment.payment_status === 'pending' && (
                                        <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                          Pending
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                                      <span>Due: {assignment.due_date ? dayjs(assignment.due_date).format('MMM D') : 'N/A'}</span>
                                      {assignment.session && assignment.term && (
                                        <span className="truncate">{assignment.term} {assignment.session}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0 ml-0 xs:ml-4">
                                    <p className={`font-bold text-xs sm:text-sm ${
                                      isPaid ? 'text-green-600 dark:text-green-400' :
                                      isOverdue ? 'text-red-600 dark:text-red-400' :
                                      assignment.payment_status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                                      'text-slate-900 dark:text-white'
                                    }`}>
                                      {isPaid ? '✅' : 
                                       assignment.payment_status === 'pending' ? '⏳' :
                                       formatCurrency(assignment.balance)}
                                    </p>
                                    <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium ${getStatusBadge(assignment.payment_status)}`}>
                                      {assignment.payment_status.charAt(0).toUpperCase() + assignment.payment_status.slice(1)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Payments Tab */}
                  {activeTab === 'payments' && (
                    <div className="space-y-2 sm:space-y-3">
                      {selectedStudent.payments.length === 0 ? (
                        <div className="text-center py-6 sm:py-8">
                          <Receipt className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300" />
                          <p className="text-xs sm:text-sm text-gray-500 mt-2">No payment history</p>
                        </div>
                      ) : (
                        selectedStudent.payments.map((payment: any) => (
                          <motion.div
                            key={payment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 xs:gap-0 p-2.5 sm:p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl"
                          >
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">
                                {payment.fee_name || 'Fee Payment'}
                              </p>
                              <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                                {payment.receipt_number} • {dayjs(payment.payment_date).format('MMM D, YYYY')}
                              </p>
                              <p className="text-[8px] sm:text-[10px] text-slate-400 truncate">{payment.payment_method}</p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-0 xs:ml-2">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                {formatCurrency(payment.amount_paid)}
                              </p>
                              <span className={`text-[8px] sm:text-xs ${getStatusBadge(payment.status)}`}>
                                {payment.status}
                              </span>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Analytics Tab - Charts */}
                  {activeTab === 'analytics' && (
                    <div className="space-y-4 sm:space-y-6">
                      
                      {/* Chart Type Selector */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">Chart Type:</span>
                        <button
                          onClick={() => setChartType('bar')}
                          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                            chartType === 'bar' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 dark:bg-gray-700 text-slate-600 dark:text-slate-400 hover:bg-gray-200'
                          }`}
                        >
                          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                          Bar
                        </button>
                        <button
                          onClick={() => setChartType('pie')}
                          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                            chartType === 'pie' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 dark:bg-gray-700 text-slate-600 dark:text-slate-400 hover:bg-gray-200'
                          }`}
                        >
                          <PieChartIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                          Pie
                        </button>
                        <button
                          onClick={() => setChartType('line')}
                          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                            chartType === 'line' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 dark:bg-gray-700 text-slate-600 dark:text-slate-400 hover:bg-gray-200'
                          }`}
                        >
                          <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                          Line
                        </button>
                        <button
                          onClick={() => setChartType('area')}
                          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                            chartType === 'area' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 dark:bg-gray-700 text-slate-600 dark:text-slate-400 hover:bg-gray-200'
                          }`}
                        >
                          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                          Area
                        </button>
                      </div>

                      {/* Fee Distribution Chart */}
                      {feeDistributionData.length > 0 && (
                        <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
                          <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                            <PieChartIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                            Fee Distribution by Category
                          </h4>
                          <ResponsiveContainer width="100%" height={300}>
                            {chartType === 'pie' ? (
                              <PieChart>
                                <Pie
                                  data={feeDistributionData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ category, amount }) => `${category}: ${formatCurrency(amount)}`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="amount"
                                >
                                  {feeDistributionData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                <Legend />
                              </PieChart>
                            ) : chartType === 'line' ? (
                              <LineChart data={feeDistributionData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="category" />
                                <YAxis tickFormatter={(value: any) => formatCurrency(value)} />
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                <Legend />
                                <Line type="monotone" dataKey="amount" stroke={CHART_COLORS.primary} strokeWidth={2} />
                                <Line type="monotone" dataKey="count" stroke={CHART_COLORS.secondary} strokeWidth={2} />
                              </LineChart>
                            ) : chartType === 'area' ? (
                              <AreaChart data={feeDistributionData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="category" />
                                <YAxis tickFormatter={(value: any) => formatCurrency(value)} />
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                <Legend />
                                <Area type="monotone" dataKey="amount" stackId="1" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.3} />
                                <Area type="monotone" dataKey="count" stackId="1" stroke={CHART_COLORS.secondary} fill={CHART_COLORS.secondary} fillOpacity={0.3} />
                              </AreaChart>
                            ) : (
                              <BarChart data={feeDistributionData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="category" />
                                <YAxis tickFormatter={(value: any) => formatCurrency(value)} />
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                <Legend />
                                <Bar dataKey="amount" fill={CHART_COLORS.primary} />
                                <Bar dataKey="count" fill={CHART_COLORS.secondary} />
                              </BarChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Payment Status Chart */}
                      {paymentStatusData.length > 0 && (
                        <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
                          <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                            <CircleDollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                            Payment Status Distribution
                          </h4>
                          <ResponsiveContainer width="100%" height={250}>
                            {chartType === 'pie' ? (
                              <PieChart>
                                <Pie
                                  data={paymentStatusData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ status, count }) => `${status}: ${count}`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="count"
                                >
                                  {paymentStatusData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            ) : chartType === 'line' ? (
                              <LineChart data={paymentStatusData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="status" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="count" stroke={CHART_COLORS.success} strokeWidth={2} />
                              </LineChart>
                            ) : chartType === 'area' ? (
                              <AreaChart data={paymentStatusData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="status" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="count" stroke={CHART_COLORS.success} fill={CHART_COLORS.success} fillOpacity={0.3} />
                              </AreaChart>
                            ) : (
                              <BarChart data={paymentStatusData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="status" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill={CHART_COLORS.success} />
                                <Bar dataKey="amount" fill={CHART_COLORS.primary} />
                              </BarChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Monthly Payment Trend */}
                      {monthlyPaymentData.length > 0 && (
                        <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
                          <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                            Monthly Payment Trend
                          </h4>
                          <ResponsiveContainer width="100%" height={250}>
                            {chartType === 'pie' ? (
                              <PieChart>
                                <Pie
                                  data={monthlyPaymentData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ month, amount }) => `${month}: ${formatCurrency(amount)}`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="amount"
                                >
                                  {monthlyPaymentData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                <Legend />
                              </PieChart>
                            ) : chartType === 'line' ? (
                              <LineChart data={monthlyPaymentData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis tickFormatter={(value: any) => formatCurrency(value)} />
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                <Legend />
                                <Line type="monotone" dataKey="amount" stroke={CHART_COLORS.primary} strokeWidth={2} />
                                <Line type="monotone" dataKey="count" stroke={CHART_COLORS.secondary} strokeWidth={2} />
                              </LineChart>
                            ) : chartType === 'area' ? (
                              <AreaChart data={monthlyPaymentData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis tickFormatter={(value: any) => formatCurrency(value)} />
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                <Legend />
                                <Area type="monotone" dataKey="amount" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.3} />
                              </AreaChart>
                            ) : (
                              <BarChart data={monthlyPaymentData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis tickFormatter={(value: any) => formatCurrency(value)} />
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                <Legend />
                                <Bar dataKey="amount" fill={CHART_COLORS.primary} />
                              </BarChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Student Comparison Chart */}
                      {studentComparisonData.length > 1 && (
                        <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
                          <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                            Student Comparison
                          </h4>
                          <ResponsiveContainer width="100%" height={250}>
                            {chartType === 'pie' ? (
                              <PieChart>
                                <Pie
                                  data={studentComparisonData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, progress }) => `${name}: ${progress}%`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="progress"
                                >
                                  {studentComparisonData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            ) : chartType === 'line' ? (
                              <LineChart data={studentComparisonData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="progress" stroke={CHART_COLORS.purple} strokeWidth={2} />
                                <Line type="monotone" dataKey="balance" stroke={CHART_COLORS.danger} strokeWidth={2} />
                              </LineChart>
                            ) : chartType === 'area' ? (
                              <AreaChart data={studentComparisonData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="progress" stroke={CHART_COLORS.purple} fill={CHART_COLORS.purple} fillOpacity={0.3} />
                                <Area type="monotone" dataKey="balance" stroke={CHART_COLORS.danger} fill={CHART_COLORS.danger} fillOpacity={0.3} />
                              </AreaChart>
                            ) : (
                              <BarChart data={studentComparisonData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="progress" fill={CHART_COLORS.purple} />
                                <Bar dataKey="balance" fill={CHART_COLORS.danger} />
                              </BarChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Fee Trend Chart */}
                      {feeTrendData.length > 0 && (
                        <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
                          <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" />
                            Fee Trend Analysis
                          </h4>
                          <ResponsiveContainer width="100%" height={250}>
                            {chartType === 'pie' ? (
                              <PieChart>
                                <Pie
                                  data={feeTrendData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, due }) => `${name}: ${formatCurrency(due)}`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="due"
                                >
                                  {feeTrendData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                <Legend />
                              </PieChart>
                            ) : chartType === 'line' ? (
                              <LineChart data={feeTrendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value: any) => formatCurrency(value)} />
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                <Legend />
                                <Line type="monotone" dataKey="due" stroke={CHART_COLORS.primary} strokeWidth={2} />
                                <Line type="monotone" dataKey="balance" stroke={CHART_COLORS.danger} strokeWidth={2} />
                                <Line type="monotone" dataKey="paid" stroke={CHART_COLORS.success} strokeWidth={2} />
                              </LineChart>
                            ) : chartType === 'area' ? (
                              <AreaChart data={feeTrendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value: any) => formatCurrency(value)} />
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                <Legend />
                                <Area type="monotone" dataKey="due" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.2} />
                                <Area type="monotone" dataKey="balance" stroke={CHART_COLORS.danger} fill={CHART_COLORS.danger} fillOpacity={0.2} />
                                <Area type="monotone" dataKey="paid" stroke={CHART_COLORS.success} fill={CHART_COLORS.success} fillOpacity={0.2} />
                              </AreaChart>
                            ) : (
                              <BarChart data={feeTrendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value: any) => formatCurrency(value)} />
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                <Legend />
                                <Bar dataKey="due" fill={CHART_COLORS.primary} />
                                <Bar dataKey="balance" fill={CHART_COLORS.danger} />
                                <Bar dataKey="paid" fill={CHART_COLORS.success} />
                              </BarChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-8 sm:p-12 text-center">
                <Users className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 dark:text-gray-600" />
                <h3 className="text-base sm:text-xl font-semibold text-slate-900 dark:text-white mt-3 sm:mt-4">Select a Child</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 sm:mt-2">
                  Choose a child from the list to view their details
                </p>
              </div>
            )}
          </motion.div>
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

export default ParentDashboard;