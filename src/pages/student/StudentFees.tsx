import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  CreditCard,
  Receipt,
  ChevronDown,
  ChevronUp,
  Users,
  TrendingUp,
  Wallet,
  Bell,
  Settings,
  CreditCard as CardIcon,
  Banknote,
  Smartphone,
  Menu,
  X,
  Sparkles} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Extend dayjs with relative time plugin
dayjs.extend(relativeTime);

interface Fee {
  id: string;
  fee_id: string;
  name: string;
  description: string;
  amount: number;
  due_date: string;
  category: string;
  status: string;
  is_mandatory: boolean;
  is_optional: boolean;
  late_fee_amount: number;
  class_id: string | null;
  installment_allowed: boolean;
  number_of_installments: number;
  is_recurring: boolean;
  recurrence_period: string | null;
  metadata: {
    branch?: string;
    class_ids?: string[];
    created_by?: string;
    apply_to_all_classes?: boolean;
  };
}

interface PaymentRecord {
  id: string;
  receipt_number: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  status: string;
  balance: number;
  transaction_reference: string;
  fee_id: string;
}

const StudentFees: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedFee, setExpandedFee] = useState<string | null>(null);
  const [studentClassId, setStudentClassId] = useState<string | null>(null);
  const [studentBranchId, setStudentBranchId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching student data for email:', user?.email);

      let student = null;

      // Approach 1: Find student by email (most reliable)
      if (user?.email) {
        try {
          const { data, error } = await supabase
            .from('students')
            .select('id, class_id, branch_id, first_name, last_name, middle_name, admission_number, email')
            .eq('email', user.email)
            .single();

          if (!error && data) {
            student = data;
            console.log('✅ Found student via email:', student);
          } else {
            console.log('❌ Email approach failed:', error?.message);
          }
        } catch (err) {
          console.log('❌ Email approach error:', err);
        }
      }

      // Approach 2: Try with user_id (if it exists)
      if (!student) {
        try {
          const { data, error } = await supabase
            .from('students')
            .select('id, class_id, branch_id, first_name, last_name, middle_name, admission_number, email')
            .eq('user_id', user?.id)
            .single();

          if (!error && data) {
            student = data;
            console.log('✅ Found student via user_id:', student);
          }
        } catch (err) {
          console.log('❌ user_id approach failed');
        }
      }

      // Approach 3: Try with id (if student ID matches user ID)
      if (!student) {
        try {
          const { data, error } = await supabase
            .from('students')
            .select('id, class_id, branch_id, first_name, last_name, middle_name, admission_number, email')
            .eq('id', user?.id)
            .single();

          if (!error && data) {
            student = data;
            console.log('✅ Found student via id:', student);
          }
        } catch (err) {
          console.log('❌ id approach failed');
        }
      }

      // Approach 4: Fallback - get first student (for testing)
      if (!student) {
        try {
          const { data, error } = await supabase
            .from('students')
            .select('id, class_id, branch_id, first_name, last_name, middle_name, admission_number, email')
            .limit(1)
            .single();

          if (!error && data) {
            student = data;
            console.log('⚠️ Using first student as fallback:', student);
            toast.warning('Using demo student data. Please set up your student account properly.');
          }
        } catch (err) {
          console.log('❌ All approaches failed');
        }
      }

      if (!student) {
        throw new Error('Could not find student record. Please contact support.');
      }

      // Build full name
      const fullName = [
        student.first_name,
        student.middle_name,
        student.last_name
      ].filter(Boolean).join(' ');

      setStudentId(student.id);
      setStudentClassId(student.class_id);
      setStudentBranchId(student.branch_id);
      setStudentData({
        ...student,
        full_name: fullName
      });

      console.log('📋 Student Info:', {
        id: student.id,
        class_id: student.class_id,
        branch_id: student.branch_id,
        name: fullName,
        admission: student.admission_number
      });

      // Fetch class name
      if (student.class_id) {
        const { data: classData } = await supabase
          .from('classes')
          .select('name')
          .eq('id', student.class_id)
          .single();

        if (classData) {
          setStudentData(prev => ({ ...prev, class_name: classData.name }));
          console.log('📚 Class Name:', classData.name);
        }
      }

      // Fetch branch name
      if (student.branch_id) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('name')
          .eq('id', student.branch_id)
          .single();

        if (branchData) {
          setStudentData(prev => ({ ...prev, branch_name: branchData.name }));
        }
      }

      // Fetch fees and payments
      await fetchFees(student.class_id, student.branch_id);
      await fetchPayments(student.id);

    } catch (error: any) {
      console.error('❌ Error fetching student data:', error);
      toast.error(error.message || 'Failed to load your data. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFees = async (classId: string, branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('fees')
        .select('*')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('due_date', { ascending: true });

      if (error) throw error;

      console.log('📊 All Fees in Branch:', data?.map(f => ({
        name: f.name,
        class_id: f.class_id,
        metadata_class_ids: f.metadata?.class_ids,
        student_class: classId
      })));

      const filteredFees = data?.filter(fee => {
        if (fee.class_id === null) {
          console.log(`✅ Fee "${fee.name}" applies to ALL classes`);
          return true;
        }
        if (fee.class_id === classId) {
          console.log(`✅ Fee "${fee.name}" applies directly to class ${classId}`);
          return true;
        }
        if (fee.metadata?.class_ids && Array.isArray(fee.metadata.class_ids)) {
          const hasClass = fee.metadata.class_ids.includes(classId);
          if (hasClass) {
            console.log(`✅ Fee "${fee.name}" applies via metadata.class_ids to class ${classId}`);
          } else {
            console.log(`❌ Fee "${fee.name}" has metadata.class_ids but doesn't include ${classId}`);
          }
          return hasClass;
        }
        console.log(`❌ Fee "${fee.name}" does NOT apply to class ${classId} (class_id: ${fee.class_id})`);
        return false;
      });

      setFees(filteredFees || []);
      console.log('🎯 Final Filtered Fees:', filteredFees?.map(f => f.name));
    } catch (error: any) {
      console.error('❌ Error fetching fees:', error);
      toast.error('Failed to load fees');
    }
  };

  const fetchPayments = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
      console.log('💳 Payments found:', data?.length || 0);
    } catch (error: any) {
      console.error('❌ Error fetching payments:', error);
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
      laboratory: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      graduation: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      development_levy: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      identity_card: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
      custom: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[category] || styles.custom;
  };

  const isFeePaid = (feeId: string) => {
    return payments.some(p => p.fee_id === feeId && p.status === 'completed');
  };

  const getFeePayment = (feeId: string) => {
    return payments.find(p => p.fee_id === feeId);
  };

  // Calculate statistics
  const totalDue = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount_paid, 0);
  const totalOutstanding = totalDue - totalPaid;
  const completionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;
  
  const upcomingFees = fees.filter(f => !isFeePaid(f.id) && f.due_date);
  const nextDue = upcomingFees.length > 0 
    ? upcomingFees.sort((a, b) => dayjs(a.due_date).diff(dayjs(b.due_date)))[0]
    : null;
  
  const overdueFees = fees.filter(f => 
    !isFeePaid(f.id) && f.due_date && dayjs(f.due_date).isBefore(dayjs())
  );

  const feeCategories = [...new Set(fees.map(f => f.category))];

  const filteredByCategory = selectedCategory 
    ? fees.filter(f => f.category === selectedCategory)
    : fees;

  const filteredFees = filteredByCategory.filter(fee => {
    const matchesSearch = fee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          fee.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          fee.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          fee.fee_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'paid' && isFeePaid(fee.id)) ||
                          (statusFilter === 'unpaid' && !isFeePaid(fee.id));
    return matchesSearch && matchesStatus;
  });


  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading please wait..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Fees & Payments
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage your fees and track payments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button className="p-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all">
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button className="lg:hidden p-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </motion.div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR - Student Info & Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-3 space-y-4"
          >
            {/* Student Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                  {studentData?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'S'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {studentData?.full_name || user?.email?.split('@')[0] || 'Student'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Student</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {studentData?.admission_number || 'ST2026001'}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Class</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {studentData?.class_name || 'Not Assigned'}
                  </span>
                </div>
               
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Branch</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {studentData?.branch_name || 'Main Campus'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <button className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
                  💳 Pay Fees
                </button>
                <button className="p-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
                  📄 Statement
                </button>
                <button className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
                  🧾 Receipts
                </button>
                <button className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
                  📞 Contact
                </button>
              </div>
            </div>

            {/* Fee Categories */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Categories</h4>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                    !selectedCategory 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  All Fees
                </button>
                {feeCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all capitalize ${
                      selectedCategory === cat 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {cat.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* MAIN CONTENT */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-6 space-y-6"
          >
            {/* Summary Cards - 6 Premium Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <motion.div variants={itemVariants} className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <Wallet className="w-6 h-6 opacity-80" />
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Total</span>
                </div>
                <p className="text-2xl font-bold mt-3">{formatCurrency(totalDue)}</p>
                <p className="text-sm opacity-80">Total Fees</p>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <CheckCircle className="w-6 h-6 opacity-80" />
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Paid</span>
                </div>
                <p className="text-2xl font-bold mt-3">{formatCurrency(totalPaid)}</p>
                <p className="text-sm opacity-80">Amount Paid</p>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <AlertCircle className="w-6 h-6 opacity-80" />
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Balance</span>
                </div>
                <p className="text-2xl font-bold mt-3">{formatCurrency(totalOutstanding)}</p>
                <p className="text-sm opacity-80">Outstanding</p>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <Calendar className="w-6 h-6 opacity-80" />
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Upcoming</span>
                </div>
                <p className="text-2xl font-bold mt-3">{upcomingFees.length}</p>
                <p className="text-sm opacity-80">Fees Due</p>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <Clock className="w-6 h-6 opacity-80" />
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Overdue</span>
                </div>
                <p className="text-2xl font-bold mt-3">{overdueFees.length}</p>
                <p className="text-sm opacity-80">Overdue Fees</p>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <TrendingUp className="w-6 h-6 opacity-80" />
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Progress</span>
                </div>
                <p className="text-2xl font-bold mt-3">{Math.round(completionRate)}%</p>
                <div className="w-full bg-white/20 rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-white rounded-full h-1.5 transition-all duration-1000"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <p className="text-sm opacity-80">Completion Rate</p>
              </motion.div>
            </div>

            {/* Progress Section */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Progress</h3>
                <span className="text-sm text-gray-500">{Math.round(completionRate)}% Complete</span>
              </div>
              <div className="relative">
                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>Paid: {formatCurrency(totalPaid)}</span>
                  <span>Remaining: {formatCurrency(totalOutstanding)}</span>
                </div>
              </div>
            </motion.div>

            {/* Fee Table - Modern Design */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Search and Filter Bar */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search fees..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  >
                    <option value="all">All Fees</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
              </div>

              {/* Fee List */}
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredFees.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mb-4">
                      <Sparkles className="w-10 h-10 text-blue-500 dark:text-blue-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">All Clear!</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No outstanding fees found</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {filteredFees.map((fee, index) => {
                      const paid = isFeePaid(fee.id);
                      const payment = getFeePayment(fee.id);
                      const isExpanded = expandedFee === fee.id;
                      const isOverdue = fee.due_date && dayjs(fee.due_date).isBefore(dayjs()) && !paid;

                      return (
                        <motion.div
                          key={fee.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div 
                            className="p-4 cursor-pointer"
                            onClick={() => setExpandedFee(isExpanded ? null : fee.id)}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryBadge(fee.category)}`}>
                                    {fee.category.replace(/_/g, ' ')}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-white truncate">
                                    {fee.name}
                                  </span>
                                  {fee.class_id === null && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                      <Users className="w-2.5 h-2.5" />
                                      All
                                    </span>
                                  )}
                                  {isOverdue && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                      <AlertCircle className="w-2.5 h-2.5" />
                                      Overdue
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Due: {fee.due_date ? dayjs(fee.due_date).format('MMM D') : 'N/A'}
                                  </span>
                                  {fee.is_mandatory && (
                                    <span className="text-blue-500">• Mandatory</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(fee.amount)}
                                  </p>
                                  <div className="flex items-center justify-end gap-1">
                                    {paid ? (
                                      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                        <CheckCircle className="w-3 h-3" />
                                        Paid
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                        <XCircle className="w-3 h-3" />
                                        Unpaid
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="px-4 pb-4"
                              >
                                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 space-y-4">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Fee ID</p>
                                      <p className="font-medium text-gray-900 dark:text-white">{fee.fee_id}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Category</p>
                                      <p className="font-medium text-gray-900 dark:text-white capitalize">
                                        {fee.category.replace(/_/g, ' ')}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Type</p>
                                      <p className="font-medium text-gray-900 dark:text-white">
                                        {fee.is_mandatory ? 'Mandatory' : 'Optional'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Late Fee</p>
                                      <p className="font-medium text-red-600 dark:text-red-400">
                                        {formatCurrency(fee.late_fee_amount)}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {payment && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Details</p>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                        <div>
                                          <p className="text-gray-500 dark:text-gray-400">Receipt</p>
                                          <p className="font-medium text-gray-900 dark:text-white">{payment.receipt_number}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500 dark:text-gray-400">Amount</p>
                                          <p className="font-medium text-green-600">{formatCurrency(payment.amount_paid)}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500 dark:text-gray-400">Method</p>
                                          <p className="font-medium text-gray-900 dark:text-white capitalize">{payment.payment_method}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500 dark:text-gray-400">Date</p>
                                          <p className="font-medium text-gray-900 dark:text-white">
                                            {dayjs(payment.payment_date).format('MMM D, YYYY')}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {!paid && (
                                    <div className="flex gap-3 pt-2">
                                      <button className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
                                        Pay Now
                                      </button>
                                      <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
                                        Remind Me
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* RIGHT SIDEBAR - Widgets */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-3 space-y-4"
          >
            {/* Upcoming Payments */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Upcoming Payments
              </h4>
              {nextDue ? (
                <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">⚠️ Next Due</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{nextDue.name}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(nextDue.amount)}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {dayjs(nextDue.due_date).fromNow()}
                    </span>
                    <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-all">
                      Pay Now
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming payments</p>
              )}
            </div>

            {/* Recent Payments */}
            {payments.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-green-500" />
                  Recent Payments
                </h4>
                <div className="space-y-2">
                  {payments.slice(0, 3).map(payment => (
                    <div key={payment.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{payment.receipt_number}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {dayjs(payment.payment_date).format('MMM D')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatCurrency(payment.amount_paid)}
                        </p>
                        <span className={`text-xs capitalize ${payment.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Methods */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Payment Methods</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                  <CardIcon className="w-5 h-5 mx-auto text-blue-500" />
                  <span className="text-[10px] text-gray-500">Card</span>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                  <Banknote className="w-5 h-5 mx-auto text-green-500" />
                  <span className="text-[10px] text-gray-500">Bank</span>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                  <Smartphone className="w-5 h-5 mx-auto text-purple-500" />
                  <span className="text-[10px] text-gray-500">USSD</span>
                </div>
              </div>
            </div>

            {/* Help */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl p-4 text-white shadow-lg">
              <h4 className="text-sm font-semibold mb-2">Need Help?</h4>
              <p className="text-xs opacity-90 mb-3">Our support team is here to assist you</p>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-all">
                  💬 Chat
                </button>
                <button className="flex-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-all">
                  📞 Call
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full shadow-2xl shadow-blue-500/30 flex items-center justify-center hover:scale-110 transition-all z-50"
        onClick={() => toast.success('Opening payment...')}
      >
        <CreditCard className="w-6 h-6" />
      </motion.button>
    </div>
  );
};

export default StudentFees;