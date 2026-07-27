import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Coins,
  Users,
  Search,
  Filter,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  DollarSign,
  Calendar,
  Building,
  Tag,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  User,
  Mail,
  Phone,
  CreditCard,
  Receipt,
  Printer,
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp,
  TrendingDown,
  PieChart
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface Fee {
  id: string;
  fee_id: string;
  branch_id: string;
  class_id: string | null;
  category: string;
  name: string;
  description: string;
  amount: number;
  due_date: string | null;
  late_fee_amount: number;
  installment_allowed: boolean;
  number_of_installments: number;
  is_mandatory: boolean;
  is_optional: boolean;
  is_recurring: boolean;
  recurrence_period: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  metadata: any;
  class_name?: string;
  branch_name?: string;
}

interface PaymentRecord {
  id: string;
  payment_id: string;
  receipt_number: string;
  student_id: string;
  fee_id: string;
  amount: number;
  amount_paid: number;
  balance: number;
  payment_method: string;
  payment_date: string;
  due_date: string;
  status: string;
  transaction_reference: string;
  payment_proof_url: string;
  approved_by: string;
  approved_at: string;
  rejection_reason: string;
  branch_id: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
  student_email?: string;
  student_phone?: string;
  student_id_number?: string;
}

// Category labels mapping
const categoryLabels: Record<string, string> = {
  school_fees: 'School Fees',
  books: 'Books',
  uniform: 'Uniform',
  sportswear: 'Sportswear',
  bus: 'Bus',
  pta: 'PTA',
  examination: 'Examination',
  medical: 'Medical',
  graduation: 'Graduation',
  development_levy: 'Development Levy',
  identity_card: 'Identity Card',
  excursion: 'Excursion',
  hostel: 'Hostel',
  laboratory: 'Laboratory',
  lesson_fee: 'Lesson Fee',
  extra_classes: 'Extra Classes',
  custom: 'Custom',
};

const FeeDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [fee, setFee] = useState<Fee | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState({
    totalPaid: 0,
    totalStudents: 0,
    pendingCount: 0,
    completedCount: 0,
    failedCount: 0
  });

  const pageSize = 10;

  useEffect(() => {
    if (id) {
      fetchFeeDetails();
    }
  }, [id]);

  useEffect(() => {
    if (fee) {
      fetchPayments();
    }
  }, [fee, currentPage, searchTerm, statusFilter]);

  const fetchFeeDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('fees')
        .select(`
          *,
          classes!fk_fees_class (
            name
          ),
          branches!fk_fees_branch (
            school_name
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setFee({
        ...data,
        class_name: data.classes?.name || 'All Classes',
        branch_name: data.branches?.school_name || 'N/A',
      });
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching fee details:', error);
      toast.error(error.message || 'Failed to load fee details');
      navigate('/fees');
    }
  };

  const fetchPayments = async () => {
    if (!id) return;
    
    setLoadingPayments(true);
    try {
      // Simple query without joins to avoid RLS issues
      const { data, error, count } = await supabase
        .from('payments')
        .select('*', { count: 'exact' })
        .eq('fee_id', id)
        .order('payment_date', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) throw error;

      // Fetch student names separately
      const paymentsWithStudents = await Promise.all(
        (data || []).map(async (payment: any) => {
          let studentName = 'Unknown Student';
          let studentEmail = '';
          let studentPhone = '';
          let studentIdNumber = '';

          if (payment.student_id) {
            try {
              const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('first_name, last_name, email, phone_number, student_id')
                .eq('id', payment.student_id)
                .single();

              if (!studentError && studentData) {
                studentName = `${studentData.first_name} ${studentData.last_name}`;
                studentEmail = studentData.email || '';
                studentPhone = studentData.phone_number || '';
                studentIdNumber = studentData.student_id || '';
              }
            } catch (err) {
              console.warn('Could not fetch student:', err);
            }
          }

          return {
            ...payment,
            student_name: studentName,
            student_email: studentEmail,
            student_phone: studentPhone,
            student_id_number: studentIdNumber,
          };
        })
      );

      setPayments(paymentsWithStudents);
      setTotalCount(count || 0);

      // Calculate summary
      const totalPaid = paymentsWithStudents.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
      const completed = paymentsWithStudents.filter(p => p.status === 'completed').length;
      const pending = paymentsWithStudents.filter(p => p.status === 'pending').length;
      const failed = paymentsWithStudents.filter(p => p.status === 'failed').length;

      setSummaryData({
        totalPaid,
        totalStudents: paymentsWithStudents.length,
        completedCount: completed,
        pendingCount: pending,
        failedCount: failed
      });

    } catch (error: any) {
      console.error('Error fetching payments:', error);
      // Don't show error toast for empty results
      if (error.code !== 'PGRST116') {
        toast.error(error.message || 'Failed to load payment records');
      }
      setPayments([]);
      setTotalCount(0);
    } finally {
      setLoadingPayments(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
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
      custom: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[category] || styles.custom;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleViewStudentPayment = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setShowPaymentDetails(true);
  };

  const togglePaymentExpand = (paymentId: string) => {
    setExpandedPayment(expandedPayment === paymentId ? null : paymentId);
  };

  const exportPaymentData = () => {
    toast.success('Export started. Download will begin shortly.');
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!fee) {
    return (
      <div className="text-center py-12">
        <Coins className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fee not found</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-1">The fee you're looking for doesn't exist</p>
        <button
          onClick={() => navigate('/fees')}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:opacity-90 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Fees
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/fees')}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{fee.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <span className="font-mono text-xs">{fee.fee_id}</span>
              <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(fee.status)}`}>
                {fee.status === 'active' ? (
                  <CheckCircle className="w-3 h-3" />
                ) : fee.status === 'inactive' ? (
                  <XCircle className="w-3 h-3" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportPaymentData}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <Download className="w-4 h-4" />
            Export Payments
          </button>
          <button
            onClick={() => navigate(`/fees/edit/${fee.id}`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25"
          >
            <FileText className="w-4 h-4" />
            Edit Fee
          </button>
        </div>
      </div>

      {/* Fee Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(fee.amount)}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Collected</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(summaryData.totalPaid)}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Students Paid</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{summaryData.totalStudents}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summaryData.pendingCount}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Fee Details Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fee Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadge(fee.category)}`}>
                {categoryLabels[fee.category] || fee.category}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Class</p>
              <p className="font-medium text-gray-900 dark:text-white">{fee.class_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {fee.due_date ? dayjs(fee.due_date).format('MMMM D, YYYY') : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Late Fee</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(fee.late_fee_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Mandatory</p>
              <p className="font-medium text-gray-900 dark:text-white">{fee.is_mandatory ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Recurring</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {fee.is_recurring ? `Yes (${fee.recurrence_period || 'N/A'})` : 'No'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Description</p>
              <p className="font-medium text-gray-900 dark:text-white">{fee.description || 'No description provided'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Payment Records
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {totalCount > 0 ? `Showing ${Math.min((currentPage - 1) * pageSize + 1, totalCount)} to ${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} payments` : 'No payments found'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by receipt or reference..."
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingPayments ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">No payment records</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                No students have made payments for this fee yet
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Receipt
                  </th>
                  <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {payments.map((payment) => (
                  <React.Fragment key={payment.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                      <td className="px-4 sm:px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {payment.receipt_number}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[120px]">
                            {payment.transaction_reference || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 sm:px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {payment.student_name || 'Unknown'}
                          </p>
                          {payment.student_id_number && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {payment.student_id_number}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(payment.amount_paid)}
                        </p>
                        {payment.balance > 0 && (
                          <p className="text-xs text-red-500">Balance: {formatCurrency(payment.balance)}</p>
                        )}
                      </td>
                      <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                            {payment.payment_method ? payment.payment_method.replace('_', ' ') : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(payment.status)}`}>
                          {payment.status === 'completed' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : payment.status === 'pending' ? (
                            <Clock className="w-3 h-3" />
                          ) : payment.status === 'failed' ? (
                            <XCircle className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {dayjs(payment.payment_date).format('MMM D, YYYY')}
                        </p>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewStudentPayment(payment)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400"
                            title="View Payment Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => togglePaymentExpand(payment.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-gray-500 dark:text-gray-400"
                            title="View Details"
                          >
                            {expandedPayment === payment.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Payment Details */}
                    {expandedPayment === payment.id && (
                      <tr>
                        <td colSpan={7} className="px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-700/30">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Student Information</h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-900 dark:text-white">{payment.student_name}</span>
                                </div>
                                {payment.student_email && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-900 dark:text-white">{payment.student_email}</span>
                                  </div>
                                )}
                                {payment.student_phone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-900 dark:text-white">{payment.student_phone}</span>
                                  </div>
                                )}
                                {payment.student_id_number && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-900 dark:text-white font-mono">{payment.student_id_number}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Payment Details</h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">Amount</span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {formatCurrency(payment.amount_paid)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">Method</span>
                                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                                    {payment.payment_method ? payment.payment_method.replace('_', ' ') : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">Reference</span>
                                  <span className="font-mono text-xs text-gray-900 dark:text-white">
                                    {payment.transaction_reference || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">Date</span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {dayjs(payment.payment_date).format('MMMM D, YYYY h:mm A')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Status & Notes</h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">Status</span>
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(payment.status)}`}>
                                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                  </span>
                                </div>
                                {payment.rejection_reason && (
                                  <div className="mt-2">
                                    <p className="text-sm text-red-500 dark:text-red-400">Rejection Reason</p>
                                    <p className="text-sm text-gray-900 dark:text-white mt-1">{payment.rejection_reason}</p>
                                  </div>
                                )}
                                <button
                                  onClick={() => handleViewStudentPayment(payment)}
                                  className="w-full mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                                >
                                  View Full Details
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {showPaymentDetails && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Details</h3>
              <button
                onClick={() => {
                  setShowPaymentDetails(false);
                  setSelectedPayment(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Student Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">Student Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedPayment.student_name || 'Unknown'}
                    </p>
                  </div>
                  {selectedPayment.student_id_number && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Student ID</p>
                      <p className="font-medium text-gray-900 dark:text-white font-mono">
                        {selectedPayment.student_id_number}
                      </p>
                    </div>
                  )}
                  {selectedPayment.student_email && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.student_email}</p>
                    </div>
                  )}
                  {selectedPayment.student_phone && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.student_phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-3">Payment Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Amount Paid</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(selectedPayment.amount_paid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedPayment.status)}`}>
                      {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Payment Method</p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {selectedPayment.payment_method ? selectedPayment.payment_method.replace('_', ' ') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Transaction Reference</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-white">
                      {selectedPayment.transaction_reference || 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Payment Date</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {dayjs(selectedPayment.payment_date).format('MMMM D, YYYY h:mm A')}
                    </p>
                  </div>
                  {selectedPayment.balance > 0 && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Balance</p>
                      <p className="font-medium text-red-600 dark:text-red-400">
                        {formatCurrency(selectedPayment.balance)}
                      </p>
                    </div>
                  )}
                  {selectedPayment.rejection_reason && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Rejection Reason</p>
                      <p className="font-medium text-red-600 dark:text-red-400">{selectedPayment.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Fee Info */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-3">Fee Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fee Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{fee.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fee ID</p>
                    <p className="font-medium text-gray-900 dark:text-white font-mono">{fee.fee_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadge(fee.category)}`}>
                      {categoryLabels[fee.category] || fee.category}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(fee.amount)}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowPaymentDetails(false);
                    setSelectedPayment(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    toast.success('Receipt generation started');
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Generate Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeDetail;
