// src/pages/student/StudentPayments.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePaymentData } from '../../hooks/usePaymentData';
import { supabase } from '../../config/supabase/client';
import ReceiptModal from '../../components/common/ReceiptModal';
import {
  Receipt,
  Search,
  Loader2,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  ChevronLeft,
  ChevronRight,
  Wallet,
  AlertTriangle,
  RefreshCw,
  Filter,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAssignmentStatusInfo,
  getPaymentStatusBadge,
  getCategoryBadge,
  getStatusIcon,
  type PaymentStatus
} from '../../utils/paymentUtils';

interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_id: string;
  branch_id: string;
  email: string;
  phone_number: string;
  student_id: string;
  passport_url: string;
  class?: { id: string; name: string };
}

interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_url?: string;
  motto?: string;
  academic_session?: string;
  current_term?: string;
  currency?: string;
}

const StudentPayments: React.FC = () => {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const pageSize = 10;

  const {
    loading,
    refreshing,
    assignments,
    payments,
    unpaidFees,
    stats,
    paymentStats,
    refresh,
    error
  } = usePaymentData(studentId, branchId, {
    autoFetch: !!studentId && !!branchId
  });

  // Fetch student profile and school info
  useEffect(() => {
    const fetchStudentProfile = async () => {
      if (!user?.id) return;

      try {
        let studentData = null;

        const { data, error } = await supabase
          .from('students')
          .select('*, class:class_id (id, name)')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          studentData = data;
        }

        if (!studentData && user.email) {
          const { data: emailData } = await supabase
            .from('students')
            .select('*, class:class_id (id, name)')
            .eq('email', user.email)
            .single();
          if (emailData) studentData = emailData;
        }

        if (studentData) {
          setStudentId(studentData.id);
          setBranchId(studentData.branch_id);
          setStudentProfile(studentData);
          await fetchSchoolInfo(studentData.branch_id);
        }
      } catch (error) {
        console.error('Error fetching student profile:', error);
      }
    };

    fetchStudentProfile();
  }, [user]);

  // Fetch school info
  const fetchSchoolInfo = async (branchId: string) => {
    try {
      if (branchId) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('name, address, phone, email, logo_url')
          .eq('id', branchId)
          .single();
        
        if (branchData) {
          setSchoolInfo({
            name: branchData.name || 'Ebenezer International School',
            address: branchData.address || '42 Allen Avenue, Ikeja, Lagos',
            phone: branchData.phone || '+234 800 000 0000',
            email: branchData.email || 'info@ebenezer.edu.ng',
            logo_url: branchData.logo_url || '',
            motto: 'Excellence in Education',
            academic_session: '2026/2027',
            current_term: '2nd Term',
            currency: 'NGN'
          });
          return;
        }
      }

      const { data } = await supabase.from('school_info').select('*').limit(1).single();
      if (data) {
        setSchoolInfo({
          name: data.school_name || 'Ebenezer International School',
          address: data.address || '42 Allen Avenue, Ikeja, Lagos',
          phone: data.phone_number || '+234 800 000 0000',
          email: data.email || 'info@ebenezer.edu.ng',
          logo_url: data.logo_url || '',
          motto: data.motto || 'Excellence in Education',
          academic_session: data.academic_session || '2026/2027',
          current_term: data.current_term || '2nd Term',
          currency: data.currency || 'NGN',
        });
      } else {
        setSchoolInfo({
          name: 'Ebenezer International School',
          address: '42 Allen Avenue, Ikeja, Lagos',
          phone: '+234 800 000 0000',
          email: 'info@ebenezer.edu.ng',
          logo_url: '',
          motto: 'Excellence in Education',
          academic_session: '2026/2027',
          current_term: '2nd Term',
          currency: 'NGN',
        });
      }
    } catch (error) {
      console.error('Error fetching school info:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    const currency = schoolInfo?.currency || 'NGN';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => getPaymentStatusBadge(status);

  const filteredPayments = payments.filter(p => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      p.receipt_number?.toLowerCase().includes(search) ||
      p.transaction_reference?.toLowerCase().includes(search) ||
      p.fee_name?.toLowerCase().includes(search);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success('Copied to clipboard');
  };

  const formatPaymentForReceipt = (payment: any) => {
    return {
      ...payment,
      student_id: payment.student_id || studentId || '',
      receipt_number: payment.receipt_number || 'N/A',
      amount_paid: payment.amount_paid || 0,
      payment_date: payment.payment_date || new Date().toISOString(),
      payment_method: payment.payment_method || 'N/A',
      status: payment.status || 'pending',
      fee_name: payment.fee_name || 'N/A',
      transaction_reference: payment.transaction_reference || 'N/A',
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-sm sm:text-base text-gray-500">Loading payment data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center px-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 text-sm sm:text-base">{error}</p>
          <button onClick={refresh} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm sm:text-base">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 print:space-y-0">
      
      {/* Header */}
      <div className="print:hidden">
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 xs:gap-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
              <span className="truncate">Payment History</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              View all your fee payment records
            </p>
          </div>
          <button 
            onClick={refresh} 
            disabled={refreshing} 
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-xs sm:text-sm flex-shrink-0"
          >
            {refreshing ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            <span className="hidden xs:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards - Mobile Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 print:hidden">
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 truncate">Total Payments</p>
            <div className="p-1 sm:p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-base sm:text-xl font-bold text-gray-900 dark:text-white mt-0.5 sm:mt-1">{paymentStats.total}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 truncate">Total Paid</p>
            <div className="p-1 sm:p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm sm:text-xl font-bold text-green-600 dark:text-green-400 mt-0.5 sm:mt-1 truncate">
            {formatCurrency(paymentStats.totalPaid)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 truncate">Completed</p>
            <div className="p-1 sm:p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-base sm:text-xl font-bold text-green-600 dark:text-green-400 mt-0.5 sm:mt-1">{paymentStats.completed}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 truncate">Pending</p>
            <div className="p-1 sm:p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <p className="text-base sm:text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-0.5 sm:mt-1">{paymentStats.pending}</p>
        </div>
      </div>

      {/* Unpaid Fees Alert - Mobile Responsive */}
      {unpaidFees.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg sm:rounded-2xl p-4 sm:p-6 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-900/20 rounded-lg self-start">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-red-700 dark:text-red-300 flex flex-wrap items-center gap-2">
                Unpaid Fees
                {unpaidFees.filter(f => f.payment_status !== 'pending').length > 0 && (
                  <span className="text-[10px] sm:text-xs bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 px-1.5 sm:px-2 py-0.5 rounded-full">
                    {unpaidFees.filter(f => f.payment_status !== 'pending').length}
                  </span>
                )}
                {unpaidFees.filter(f => f.payment_status === 'pending').length > 0 && (
                  <span className="text-[10px] sm:text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300 px-1.5 sm:px-2 py-0.5 rounded-full">
                    {unpaidFees.filter(f => f.payment_status === 'pending').length} pending
                  </span>
                )}
              </h3>
              <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-1">
                {unpaidFees.filter(f => f.payment_status !== 'pending').length > 0 
                  ? `You have ${unpaidFees.filter(f => f.payment_status !== 'pending').length} unpaid fee(s). Please make payment before the due date.`
                  : 'All fees are pending approval or paid'}
              </p>
              <div className="mt-3 space-y-2">
                {unpaidFees.slice(0, 3).map((fee) => (
                  <div key={fee.id} className={`flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-2.5 sm:p-3 bg-white/50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl hover:bg-white/70 dark:hover:bg-gray-700/50 transition-all ${fee.payment_status === 'pending' ? 'border-l-4 border-l-yellow-500' : 'border-l-4 border-l-red-500'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">{fee.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${getCategoryBadge(fee.category)}`}>
                          {fee.category.replace(/_/g, ' ')}
                        </span>
                        {fee.due_date && (
                          <span className={`text-[10px] sm:text-xs ${fee.is_overdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                            Due: {dayjs(fee.due_date).format('MMM D')}
                            {fee.is_overdue && ' ⚠️'}
                          </span>
                        )}
                        {fee.payment_status === 'pending' && (
                          <span className="text-[10px] sm:text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 sm:px-2 py-0.5 rounded-full">
                            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-0.5" />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2 sm:gap-4 flex-shrink-0">
                      <p className={`text-xs sm:text-sm font-bold ${fee.payment_status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                        {fee.payment_status === 'pending' ? 'Pending' : formatCurrency(fee.balance)}
                      </p>
                      {fee.payment_status !== 'pending' && (
                        <button 
                          onClick={() => {
                            toast.info('Redirecting to payment...');
                          }}
                          className="px-2 sm:px-3 py-0.5 sm:py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-[10px] sm:text-xs font-medium rounded-lg hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex-shrink-0"
                        >
                          Pay
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {unpaidFees.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">+ {unpaidFees.length - 3} more unpaid fees</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 print:hidden">
        <div className="flex-1 min-w-0 relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search by receipt or reference..."
            className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
          />
        </div>
        
        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="sm:hidden flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filter</span>
          {statusFilter !== 'all' && (
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          )}
        </button>

        {/* Desktop Filters */}
        <div className="hidden sm:flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="approved">Approved</option>
          </select>
        </div>

        {/* Mobile Filter Dropdown */}
        <AnimatePresence>
          {showMobileFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="sm:hidden overflow-hidden"
            >
              <div className="pt-2 flex flex-wrap gap-2">
                {['all', 'completed', 'pending', 'failed', 'approved'].map((status) => (
                  <button
                    key={status}
                    onClick={() => { setStatusFilter(status); setCurrentPage(1); setShowMobileFilters(false); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === status
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Payments Table - Mobile Responsive */}
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden print:border-0 print:shadow-none">
        <div className="overflow-x-auto">
          {paginatedPayments.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Receipt className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">No payment records</p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">You haven't made any payments yet</p>
            </div>
          ) : (
            <table className="w-full min-w-[500px] sm:min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Receipt</th>
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fee</th>
                  <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="hidden md:table-cell px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                  <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="hidden lg:table-cell px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedPayments.map((payment) => {
                  const isSuccessful = payment.status === 'completed' || payment.status === 'approved' || payment.status === 'paid';
                  
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[80px] sm:max-w-[120px]">
                            {payment.receipt_number}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[80px] sm:max-w-[150px]">
                            {payment.transaction_reference}
                          </p>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate max-w-[120px]">
                          {payment.fee_name || 'N/A'}
                        </p>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(payment.amount_paid)}
                        </p>
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 capitalize truncate max-w-[60px] sm:max-w-[80px]">
                            {payment.payment_method}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className={`inline-flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-xs font-medium ${getStatusBadge(payment.status)}`}>
                          <span className="hidden xs:inline">{payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
                          <span className="xs:hidden">
                            {payment.status === 'completed' ? '✓' : 
                             payment.status === 'pending' ? '⏳' : 
                             payment.status === 'failed' ? '✗' : 
                             payment.status.charAt(0).toUpperCase()}
                          </span>
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4">
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {dayjs(payment.payment_date).format('MMM D, YYYY')}
                        </p>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => { 
                            if (isSuccessful) {
                              setSelectedPayment(payment); 
                              setShowReceipt(true); 
                            } else {
                              toast.error('No receipt available for failed payment');
                            }
                          }}
                          disabled={!isSuccessful}
                          className={`p-1 sm:p-1.5 rounded-lg transition-all ${
                            isSuccessful 
                              ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          }`}
                          title={isSuccessful ? 'View Receipt' : 'No receipt available'}
                        >
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination - Mobile Responsive */}
        {totalPages > 1 && (
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 px-3 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700 print:hidden">
            <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 text-center xs:text-left">
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredPayments.length)} to {Math.min(currentPage * pageSize, filteredPayments.length)} of {filteredPayments.length}
            </div>
            <div className="flex items-center justify-center xs:justify-end gap-1 sm:gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 sm:p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <span className="text-[10px] sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 sm:p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && selectedPayment && studentProfile && (
          <ReceiptModal
            payment={formatPaymentForReceipt(selectedPayment)}
            student={{
              id: studentProfile.id,
              first_name: studentProfile.first_name,
              last_name: studentProfile.last_name,
              student_id: studentProfile.student_id || studentProfile.admission_number || '',
              admission_number: studentProfile.admission_number || '',
              class_name: studentProfile.class?.name || 'N/A',
              branch_id: studentProfile.branch_id || '',
            }}
            schoolInfo={schoolInfo}
            onClose={() => { 
              setShowReceipt(false); 
              setSelectedPayment(null); 
            }}
            formatCurrency={formatCurrency}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentPayments;