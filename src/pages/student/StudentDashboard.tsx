import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Wallet,
  CreditCard,
  TrendingUp,
  FileText,
  Bell,
  User,
  ChevronRight,
  Activity,
  Zap,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react';

import { StudentDashboardSkeleton } from '../../components/common/LoadingSpinner';
import { usePaymentData } from '../../hooks/usePaymentData';

// Extend dayjs with relativeTime
dayjs.extend(relativeTime);

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
    case 'completed':
    case 'approved':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'pending':
    case 'processing':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'overdue':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'cancelled':
    case 'failed':
    case 'rejected':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
};

// Get status icon
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'paid':
    case 'completed':
    case 'approved':
      return CheckCircle;
    case 'pending':
    case 'processing':
      return Clock;
    case 'overdue':
      return AlertCircle;
    case 'cancelled':
    case 'failed':
    case 'rejected':
      return XCircle;
    default:
      return Clock;
  }
};

// Get status label
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'paid':
    case 'completed':
    case 'approved':
      return 'Paid';
    case 'pending':
    case 'processing':
      return 'Pending';
    case 'overdue':
      return 'Overdue';
    case 'cancelled':
      return 'Cancelled';
    case 'failed':
    case 'rejected':
      return 'Failed';
    default:
      return status || 'Unknown';
  }
};

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [studentClass, setStudentClass] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);

  // Use the payment data hook
  const {
    assignments: paymentAssignments,
    stats: paymentStats,
    refresh: refreshPaymentData,
    loading: paymentLoading,
  } = usePaymentData(studentId, branchId, {
    autoFetch: !!studentId && !!branchId,
  });

  // Calculate stats from paymentAssignments
  const calculateStats = () => {
    const assignments = paymentAssignments || [];
    
    let totalFees = assignments.length;
    let totalPaid = 0;
    let totalBalance = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let completedCount = 0;

    assignments.forEach((a: any) => {
      const balance = a.balance || 0;
      const amountPaid = a.amount_paid || 0;
      totalPaid += amountPaid;
      totalBalance += balance;

      // Determine status from the assignment's payment_status
      const status = a.payment_status || 'unpaid';
      
      if (status === 'paid' || balance === 0) {
        paidCount++;
        completedCount++;
      } else if (status === 'pending' || status === 'processing') {
        pendingCount++;
      } else if (status === 'overdue') {
        overdueCount++;
      } else if (balance > 0 && status !== 'waived') {
        // Still has balance, count as pending
        pendingCount++;
      }
    });

    const totalDue = assignments.reduce((sum, a) => sum + (a.amount_due || 0), 0);
    const paymentProgress = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

    return {
      totalFees,
      totalPaid,
      totalBalance,
      paidCount,
      pendingCount,
      overdueCount,
      completedCount,
      paymentProgress,
      totalDue,
    };
  };

  // Get display status for assignment
  const getAssignmentDisplayStatus = (assignment: any) => {
    // Check if there's a pending payment
    const hasPending = payments.some(p => 
      p.assignment_id === assignment.id && 
      (p.status === 'pending' || p.status === 'processing')
    );
    
    if (hasPending) {
      return { status: 'pending', label: 'Pending', icon: Clock };
    }
    
    // Use the assignment's payment_status
    const status = assignment.payment_status || 'unpaid';
    
    if (status === 'paid' || assignment.balance === 0) {
      return { status: 'paid', label: 'Paid', icon: CheckCircle };
    } else if (status === 'pending' || status === 'processing') {
      return { status: 'pending', label: 'Pending', icon: Clock };
    } else if (status === 'overdue') {
      return { status: 'overdue', label: 'Overdue', icon: AlertCircle };
    } else if (status === 'waived') {
      return { status: 'paid', label: 'Exempted', icon: CheckCircle };
    } else if (assignment.balance > 0) {
      return { status: 'unpaid', label: 'Unpaid', icon: Clock };
    }
    
    return { status: 'unpaid', label: 'Unpaid', icon: Clock };
  };

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  // Update studentId and branchId when student data loads
  useEffect(() => {
    if (student) {
      setStudentId(student.id);
      setBranchId(student.branch_id);
    }
  }, [student]);

  // Update payments when studentId changes
  useEffect(() => {
    if (studentId) {
      fetchPayments(studentId);
    }
  }, [studentId]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      let studentData = null;

      if (user?.id) {
        const { data, error } = await supabase
          .from('students')
          .select('*, class:class_id (id, name, code, level)')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          studentData = data;
        }
      }

      if (!studentData && user?.email) {
        const { data, error } = await supabase
          .from('students')
          .select('*, class:class_id (id, name, code, level)')
          .eq('email', user.email)
          .single();

        if (!error && data) {
          studentData = data;
        }
      }

      if (!studentData && user?.id) {
        const { data, error } = await supabase
          .from('students')
          .select('*, class:class_id (id, name, code, level)')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          studentData = data;
        }
      }

      if (studentData) {
        setStudent({
          ...studentData,
          class_name: studentData.class?.name || 'Not Assigned',
          class_id: studentData.class?.id || null,
        });
        setStudentClass(studentData.class || null);
        setStudentId(studentData.id);
        setBranchId(studentData.branch_id);

        await fetchNotifications(studentData.id);
        await fetchRecentActivities(studentData.id);
      } else {
        toast.error('Student profile not found. Please contact administration.');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error fetching student data:', error);
      toast.error(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        return;
      }

      const paymentData = data || [];
      setPayments(paymentData);
      
      // Get recent payments (last 5)
      setRecentPayments(paymentData.slice(0, 5));
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchNotifications = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', studentId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchRecentActivities = async (studentId: string) => {
    try {
      const activities: any[] = [];

      // Get recent payments
      const { data: paymentData } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false })
        .limit(3);

      if (paymentData) {
        paymentData.forEach((p: any) => {
          activities.push({
            id: p.id,
            type: 'payment',
            title: `Payment of ${formatCurrency(p.amount_paid)}`,
            description: p.fee_name || 'Payment for fee',
            date: p.payment_date,
            status: p.status || 'completed',
            icon: CreditCard,
            iconColor: 'text-green-500',
            bgColor: 'bg-green-100 dark:bg-green-900/20',
          });
        });
      }

      // Get recent assignments
      const { data: assignmentData } = await supabase
        .from('student_fee_assignments')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (assignmentData) {
        assignmentData.forEach((a: any) => {
          const displayStatus = getAssignmentDisplayStatus(a);
          activities.push({
            id: a.id,
            type: 'assignment',
            title: `Fee Assignment: ${a.fee_name || 'Fee'}`,
            description: `Amount: ${formatCurrency(a.amount_due || 0)}`,
            date: a.created_at,
            status: displayStatus.status,
            icon: FileText,
            iconColor: 'text-blue-500',
            bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          });
        });
      }

      // Sort by date and get latest 5
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivities(activities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  // Navigate to pay bill page
  const goToPayBill = () => {
    navigate('/student/paybill');
  };

  // Navigate to payments history
  const goToPayments = () => {
    navigate('/student/payments');
  };

  // Navigate to profile
  const goToProfile = () => {
    navigate('/student/profile');
  };

  // Get stats from payment data
  const stats = calculateStats();

  if (loading || paymentLoading) {
    return <StudentDashboardSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 rounded-2xl p-4 sm:p-6 text-white"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl sm:text-2xl font-bold flex-shrink-0">
              {student?.first_name?.[0]}{student?.last_name?.[0]}
            </div>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
                Welcome back, {student?.first_name || 'Student'}!
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm">
                {student?.class_name || 'Not Assigned'} • {student?.student_id || student?.admission_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={goToPayBill}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Pay Bill
            </button>
            <button
              onClick={goToProfile}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Profile
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Total Fees</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                {stats.totalFees}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Amount Paid</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(stats.totalPaid)}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Remaining Balance</p>
              <p className={`text-base sm:text-lg md:text-xl font-bold ${stats.totalBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {formatCurrency(stats.totalBalance)}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 dark:bg-red-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Payment Progress</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round(stats.paymentProgress)}%
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Payment Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Payment Progress</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stats.paidCount} of {stats.totalFees} fees paid
            </p>
          </div>
          <span className="text-sm sm:text-base font-bold text-purple-600 dark:text-purple-400">
            {Math.round(stats.paymentProgress)}%
          </span>
        </div>
        <div className="h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(stats.paymentProgress, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
          <span>Total Due: {formatCurrency(stats.totalDue)}</span>
          <span>Paid: {formatCurrency(stats.totalPaid)}</span>
          <span>Remaining: {formatCurrency(stats.totalBalance)}</span>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - Recent Payments & Activities */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Recent Payments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                Recent Payments
              </h3>
              <button
                onClick={goToPayments}
                className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentPayments.length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <CreditCard className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 dark:text-gray-600" />
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">No payments yet</p>
                  <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">Make your first payment today</p>
                </div>
              ) : (
                recentPayments.map((payment) => {
                  const StatusIcon = getStatusIcon(payment.status);
                  return (
                    <div key={payment.id} className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">
                              {payment.fee_name || 'Fee Payment'}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                              <span>{dayjs(payment.payment_date).format('MMM D, YYYY')}</span>
                              <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                              <span className="capitalize">{payment.payment_method || 'Unknown'}</span>
                              <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                              <span className="truncate">{payment.receipt_number}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(payment.amount_paid)}
                          </p>
                          <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium ${getStatusColor(payment.status)}`}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {getStatusLabel(payment.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {recentPayments.length > 0 && (
              <div className="p-2 sm:p-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={goToPayBill}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  Make a Payment
                </button>
              </div>
            )}
          </motion.div>

          {/* Recent Activities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                Recent Activities
              </h3>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentActivities.length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <Activity className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 dark:text-gray-600" />
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">No recent activities</p>
                </div>
              ) : (
                recentActivities.map((activity) => {
                  const StatusIcon = getStatusIcon(activity.status);
                  return (
                    <div key={activity.id} className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${activity.bgColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <activity.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${activity.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                            {activity.title}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                              {dayjs(activity.date).fromNow()}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium ${getStatusColor(activity.status)}`}>
                              <StatusIcon className="w-2.5 h-2.5" />
                              {getStatusLabel(activity.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column - Quick Actions & Notifications */}
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
          >
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              Quick Actions
            </h3>

            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={goToPayBill}
                className="w-full p-3 sm:p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:opacity-90 transition-all flex items-center gap-3"
              >
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-medium">Pay Bill</p>
                  <p className="text-[10px] sm:text-xs opacity-80">Make a payment</p>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>

              <button
                onClick={goToPayments}
                className="w-full p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all flex items-center gap-3 border border-blue-100 dark:border-blue-800"
              >
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-medium">Payment History</p>
                  <p className="text-[10px] sm:text-xs opacity-80">View all payments</p>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>

              <button
                onClick={goToProfile}
                className="w-full p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all flex items-center gap-3 border border-purple-100 dark:border-purple-800"
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-medium">My Profile</p>
                  <p className="text-[10px] sm:text-xs opacity-80">View and edit profile</p>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                Notifications
                {notifications.length > 0 && (
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium bg-red-500 text-white">
                    {notifications.length}
                  </span>
                )}
              </h3>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <Bell className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-gray-300 dark:text-gray-600" />
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">No new notifications</p>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all cursor-pointer">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bell className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[8px] sm:text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {dayjs(notification.created_at).fromNow()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Fee Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
      >
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
          Fee Summary
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Total Fees</p>
            <p className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white">{stats.totalFees}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Paid</p>
            <p className="text-sm sm:text-base md:text-lg font-bold text-green-600 dark:text-green-400">{stats.paidCount}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-sm sm:text-base md:text-lg font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingCount}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Overdue</p>
            <p className="text-sm sm:text-base md:text-lg font-bold text-red-600 dark:text-red-400">{stats.overdueCount}</p>
          </div>
        </div>

        {stats.totalBalance > 0 && (
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-400">Total Outstanding Balance</p>
                <p className="text-sm sm:text-base text-red-500 dark:text-red-300">{formatCurrency(stats.totalBalance)}</p>
              </div>
              <button
                onClick={goToPayBill}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-all"
              >
                Pay Now
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StudentDashboard;
