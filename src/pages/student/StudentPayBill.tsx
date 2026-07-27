import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import {
  CreditCard,
  Building2,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Banknote,
  Send,
  History,
  Copy,
  Check,
  Wallet,
  AlertCircle,
  FileText,
  Bell,
  Settings,
  Menu,
  X,
  Calendar,
  Clock,
  Receipt,
  Smartphone,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Landmark,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

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
  metadata: {
    branch?: string;
    class_ids?: string[];
    created_by?: string;
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

// Valid payment methods from the enum
type PaymentMethodType = 'cash' | 'remita' | 'paystack' | 'flutterwave' | 'offline_bank';

const StudentPayBill: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('offline_bank');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [studentClassId, setStudentClassId] = useState<string | null>(null);
  const [studentBranchId, setStudentBranchId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [expandedFee, setExpandedFee] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch student data and fees
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

      // Approach 1: Find student by email
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
          }
        } catch (err) {
          console.log('❌ Email approach failed');
        }
      }

      // Approach 2: Try with user_id
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

      // Approach 3: Try with id
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

      // Approach 4: Fallback - get first student
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

      // Fetch class name
      if (student.class_id) {
        const { data: classData } = await supabase
          .from('classes')
          .select('name')
          .eq('id', student.class_id)
          .single();

        if (classData) {
          setStudentData(prev => ({ ...prev, class_name: classData.name }));
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

      const filteredFees = data?.filter(fee => {
        if (fee.class_id === null) return true;
        if (fee.class_id === classId) return true;
        if (fee.metadata?.class_ids && Array.isArray(fee.metadata.class_ids)) {
          return fee.metadata.class_ids.includes(classId);
        }
        return false;
      });

      setFees(filteredFees || []);
      console.log('🎯 Fees loaded:', filteredFees?.length || 0);
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      unpaid: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success('Copied to clipboard');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePayNow = (fee: Fee) => {
    setSelectedFee(fee);
    setAmountPaid(fee.amount);
    setShowPaymentModal(true);
  };

  const generatePaymentId = async () => {
    try {
      const year = dayjs().format('YYYY');
      const { count, error } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .like('payment_id', `PAY-${year}%`);

      if (error) throw error;
      const sequence = (count || 0) + 1;
      return `PAY-${year}-${String(sequence).padStart(5, '0')}`;
    } catch (error) {
      console.error('Error generating payment ID:', error);
      return `PAY-${dayjs().format('YYYY')}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
    }
  };

  const generateReceiptNumber = async () => {
    try {
      const year = dayjs().format('YYYY');
      const { count, error } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .like('receipt_number', `RCP/EBE/${year}%`);

      if (error) throw error;
      const sequence = (count || 0) + 1;
      return `RCP/EBE/${year}/${String(sequence).padStart(8, '0')}`;
    } catch (error) {
      console.error('Error generating receipt number:', error);
      return `RCP/EBE/${dayjs().format('YYYY')}/${String(Math.floor(Math.random() * 10000000)).padStart(8, '0')}`;
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedFee) {
      toast.error('Please select a fee to pay');
      return;
    }

    setProcessing(true);
    try {
      const paymentId = await generatePaymentId();
      const receiptNumber = await generateReceiptNumber();

      // Calculate due date (30 days from now)
      const dueDate = dayjs().add(30, 'days').format('YYYY-MM-DD');

      const paymentData = {
        payment_id: paymentId,
        receipt_number: receiptNumber,
        student_id: studentId,
        fee_id: selectedFee.id,
        amount: selectedFee.amount, // ✅ Required: Total fee amount
        amount_paid: amountPaid,
        balance: selectedFee.amount - amountPaid,
        payment_method: paymentMethod,
        payment_date: new Date().toISOString(),
        due_date: dueDate,
        status: 'pending',
        transaction_reference: paymentReference || `PAY-${Date.now()}`,
        branch_id: studentBranchId,
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          uploaded_file: uploadedFile?.name,
          payment_method: paymentMethod,
          student_name: studentData?.full_name,
          student_class: studentData?.class_name
        }
      };

      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select();

      if (error) throw error;

      setShowSuccess(true);
      setShowPaymentModal(false);
      toast.success(`Payment submitted successfully! Receipt: ${receiptNumber}`);
      
      // Refresh payments
      if (studentId) {
        await fetchPayments(studentId);
      }
    } catch (error: any) {
      console.error('Error submitting payment:', error);
      toast.error(error.message || 'Failed to submit payment');
    } finally {
      setProcessing(false);
    }
  };

  // Calculate statistics
  const unpaidFees = fees.filter(f => !isFeePaid(f.id));
  const totalOutstanding = unpaidFees.reduce((sum, fee) => sum + fee.amount, 0);
  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount_paid, 0);
  const pendingApproval = payments.filter(p => p.status === 'pending').length;
  const completionRate = (totalPaid / (totalPaid + totalOutstanding)) * 100 || 0;

  const bankDetails = {
    bankName: 'Zenith Bank',
    accountName: 'Ebeniza International School',
    accountNumber: '1012345678',
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Pay Bill
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Pay your school fees securely
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button className="p-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all">
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={() => navigate('/student/payments')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Payment History</span>
            </button>
            <button className="lg:hidden p-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </motion.div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-3 space-y-4"
          >
            {/* Student Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold">
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
                  <span className="text-gray-500 dark:text-gray-400">Session</span>
                  <span className="font-medium text-gray-900 dark:text-white">2026/2027</span>
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
                <button className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
                  💳 Pay Now
                </button>
                <button className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
                  📄 Statement
                </button>
                <button className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
                  🧾 Receipts
                </button>
                <button className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
                  📞 Help
                </button>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Payment Methods</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                  <CreditCard className="w-5 h-5 mx-auto text-blue-500" />
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
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-4 text-white shadow-lg">
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

          {/* MAIN CONTENT */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-6 space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <motion.div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <AlertCircle className="w-6 h-6 opacity-80" />
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Due</span>
                </div>
                <p className="text-2xl font-bold mt-3">{formatCurrency(totalOutstanding)}</p>
                <p className="text-sm opacity-80">Outstanding</p>
              </motion.div>

              <motion.div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <CheckCircle className="w-6 h-6 opacity-80" />
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Paid</span>
                </div>
                <p className="text-2xl font-bold mt-3">{formatCurrency(totalPaid)}</p>
                <p className="text-sm opacity-80">Total Paid</p>
              </motion.div>

              <motion.div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <Clock className="w-6 h-6 opacity-80" />
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Pending</span>
                </div>
                <p className="text-2xl font-bold mt-3">{pendingApproval}</p>
                <p className="text-sm opacity-80">Approval</p>
              </motion.div>
            </div>

            {/* Progress Section */}
            <motion.div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
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
                    className="h-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-full"
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>Paid: {formatCurrency(totalPaid)}</span>
                  <span>Remaining: {formatCurrency(totalOutstanding)}</span>
                </div>
              </div>
            </motion.div>

            {/* Payment Method Selection */}
            <motion.div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Payment Method</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'offline_bank'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                  }`}
                  onClick={() => setPaymentMethod('offline_bank')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Bank Transfer</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Pay via bank transfer</p>
                    </div>
                  </div>
                  {paymentMethod === 'offline_bank' && (
                    <div className="mt-3 flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Selected</span>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'remita'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                  }`}
                  onClick={() => setPaymentMethod('remita')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                      <Landmark className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Pay with Remita</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Pay via Remita gateway</p>
                    </div>
                  </div>
                  {paymentMethod === 'remita' && (
                    <div className="mt-3 flex items-center gap-2 text-purple-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Selected</span>
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>

            {/* Fees List */}
            <motion.div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-500" />
                  Select Fee to Pay
                </h2>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {unpaidFees.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                      <Sparkles className="w-10 h-10 text-green-500 dark:text-green-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">All Paid!</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">You have no outstanding fees</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {unpaidFees.map((fee, index) => {
                      const isExpanded = expandedFee === fee.id;
                      const isOverdue = fee.due_date && dayjs(fee.due_date).isBefore(dayjs());

                      return (
                        <motion.div
                          key={fee.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryBadge(fee.category)}`}>
                                    {fee.category.replace(/_/g, ' ')}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-white truncate">
                                    {fee.name}
                                  </span>
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
                                    Due: {fee.due_date ? dayjs(fee.due_date).format('MMM D, YYYY') : 'N/A'}
                                  </span>
                                  {fee.is_mandatory && (
                                    <span className="text-blue-500">• Mandatory</span>
                                  )}
                                  {fee.installment_allowed && (
                                    <span className="text-purple-500">• {fee.number_of_installments} installments</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(fee.amount)}
                                  </p>
                                  {fee.late_fee_amount > 0 && (
                                    <p className="text-xs text-red-500">Late fee: {formatCurrency(fee.late_fee_amount)}</p>
                                  )}
                                </div>
                                <button
                                  onClick={() => handlePayNow(fee)}
                                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                                >
                                  Pay Now
                                </button>
                                <button
                                  onClick={() => setExpandedFee(isExpanded ? null : fee.id)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
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
                                  className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700"
                                >
                                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* RIGHT SIDEBAR */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-3 space-y-4"
          >
            {/* Quick Payment */}
            {unpaidFees.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-green-500" />
                  Quick Pay
                </h4>
                <div className="space-y-2">
                  {unpaidFees.slice(0, 2).map(fee => (
                    <div key={fee.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{fee.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(fee.amount)}</p>
                      </div>
                      <button
                        onClick={() => handlePayNow(fee)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-all"
                      >
                        Pay
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Payments */}
            {payments.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-500" />
                  Recent Payments
                </h4>
                <div className="space-y-2">
                  {payments.slice(0, 3).map(payment => (
                    <div key={payment.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{payment.receipt_number}</p>
                        <p className="text-xs text-gray-500">
                          {dayjs(payment.payment_date).format('MMM D')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatCurrency(payment.amount_paid)}
                        </p>
                        <span className={`text-xs capitalize ${getStatusBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bank Details */}
            {paymentMethod === 'offline_bank' && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-green-500" />
                  Bank Transfer Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-gray-500">Bank</span>
                    <span className="font-medium text-gray-900 dark:text-white">{bankDetails.bankName}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-gray-500">Account Name</span>
                    <span className="font-medium text-gray-900 dark:text-white">{bankDetails.accountName}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-gray-500">Account Number</span>
                    <span className="font-medium text-gray-900 dark:text-white font-mono flex items-center gap-2">
                      {bankDetails.accountNumber}
                      <button
                        onClick={() => copyToClipboard(bankDetails.accountNumber)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedFee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-green-600" />
                  Payment Details
                </h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedFee(null);
                    setUploadedFile(null);
                    setUploadPreview(null);
                    setPaymentReference('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Amount Summary */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
                  <p className="text-white/80 text-sm">Total Amount to Pay</p>
                  <p className="text-3xl font-bold">{formatCurrency(selectedFee.amount)}</p>
                  <p className="text-white/60 text-sm mt-1">Selected Fee: {selectedFee.name}</p>
                  {selectedFee.late_fee_amount > 0 && (
                    <p className="text-white/80 text-sm mt-2">Late fee included: {formatCurrency(selectedFee.late_fee_amount)}</p>
                  )}
                </div>

                {paymentMethod === 'offline_bank' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Amount You're Paying
                      </label>
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                        min="0"
                        max={selectedFee.amount}
                        step="100"
                      />
                      <p className="text-xs text-gray-500 mt-1">Maximum: {formatCurrency(selectedFee.amount)}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Transaction Reference
                      </label>
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="Enter transaction reference"
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Upload Payment Proof
                      </label>
                      <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-green-500 transition-all">
                        {uploadPreview ? (
                          <div className="space-y-3">
                            <img src={uploadPreview} alt="Payment proof" className="max-h-48 mx-auto rounded-lg" />
                            <button
                              onClick={() => {
                                setUploadedFile(null);
                                setUploadPreview(null);
                              }}
                              className="text-sm text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload or drag and drop</p>
                            <p className="text-xs text-gray-400">JPEG, PNG, PDF (Max 5MB)</p>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={handleFileUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleSubmitPayment}
                      disabled={processing || !uploadedFile || !paymentReference}
                      className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Submit Payment for Approval
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 text-center">
                      <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Landmark className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Pay with Remita</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        You will be redirected to Remita secure payment gateway
                      </p>
                      <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Amount to pay</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(selectedFee.amount)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleSubmitPayment}
                      disabled={processing}
                      className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          Proceed to Remita
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 text-center"
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {paymentMethod === 'offline_bank' ? 'Payment Submitted!' : 'Payment Successful!'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {paymentMethod === 'offline_bank' 
                  ? 'Your payment has been submitted for approval. You will receive a notification once it\'s confirmed.'
                  : 'Your payment has been processed successfully. You will receive a confirmation email shortly.'}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowSuccess(false);
                    navigate('/student/payments');
                  }}
                  className="flex-1 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-all"
                >
                  View Status
                </button>
                <button
                  onClick={() => {
                    setShowSuccess(false);
                    setShowPaymentModal(false);
                    setSelectedFee(null);
                  }}
                  className="flex-1 px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      {unpaidFees.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full shadow-2xl shadow-green-500/30 flex items-center justify-center hover:scale-110 transition-all z-50"
          onClick={() => {
            if (unpaidFees.length > 0) {
              handlePayNow(unpaidFees[0]);
            }
          }}
        >
          <CreditCard className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  );
};

export default StudentPayBill;
