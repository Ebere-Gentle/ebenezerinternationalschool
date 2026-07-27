import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Eye, CheckCircle, XCircle, RefreshCw, Loader2, X, Receipt, CreditCard, Banknote, Building, Smartphone, Wallet } from 'lucide-react';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface Payment {
  id: string;
  receipt_number: string;
  student_id: string;
  student_name: string;
  student_admission: string;
  student_avatar?: string;
  amount_paid: number;
  amount: number;
  balance: number;
  payment_method: string;
  status: string;
  payment_date: string;
  due_date: string;
  fee_id: string;
  fee_name?: string;
  transaction_reference: string;
  payment_proof_url: string;
  approved_by: string;
  approved_at: string;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}

interface PaymentDetailsModalProps {
  payment: Payment;
  onClose: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({ payment, onClose, onApprove, onReject }) => {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    if (onApprove) {
      setLoading(true);
      await onApprove(payment.id);
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (onReject) {
      setLoading(true);
      await onReject(payment.id);
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    const icons: Record<string, any> = {
      cash: <Banknote className="w-5 h-5 text-green-500" />,
      bank_transfer: <Building className="w-5 h-5 text-blue-500" />,
      card: <CreditCard className="w-5 h-5 text-purple-500" />,
      pos: <Smartphone className="w-5 h-5 text-orange-500" />,
      wallet: <Wallet className="w-5 h-5 text-indigo-500" />,
      remita: <Building className="w-5 h-5 text-blue-500" />,
      paystack: <CreditCard className="w-5 h-5 text-purple-500" />,
      flutterwave: <CreditCard className="w-5 h-5 text-pink-500" />,
      offline_bank: <Building className="w-5 h-5 text-gray-500" />,
    };
    return icons[method] || <CreditCard className="w-5 h-5 text-gray-500" />;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[status] || styles.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'Completed',
      paid: 'Paid',
      pending: 'Pending',
      approved: 'Approved',
      failed: 'Failed',
      rejected: 'Rejected',
      refunded: 'Refunded',
    };
    return labels[status] || status;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Details</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{payment.receipt_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Student Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
            <img 
              src={payment.student_avatar} 
              alt={payment.student_name} 
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(payment.student_name)}&background=random&color=fff&size=50`;
              }}
            />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{payment.student_name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Admission: {payment.student_admission}</p>
              {payment.fee_name && (
                <p className="text-xs text-gray-400 mt-1">Fee: {payment.fee_name}</p>
              )}
            </div>
          </div>

          {/* Payment Summary Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400">Amount Paid</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(payment.amount_paid)}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
              <p className={`text-xl font-bold ${payment.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(payment.balance)}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(payment.status)}`}>
                {getStatusLabel(payment.status)}
              </span>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400">Payment Method</p>
              <div className="flex items-center gap-2 mt-1">
                {getPaymentMethodIcon(payment.payment_method)}
                <span className="text-sm font-medium capitalize">
                  {payment.payment_method?.replace('_', ' ') || 'N/A'}
                </span>
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400">Payment Date</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {dayjs(payment.payment_date).format('MMMM D, YYYY h:mm A')}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400">Transaction Reference</p>
              <p className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all">
                {payment.transaction_reference || 'N/A'}
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4">
            {payment.due_date && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {dayjs(payment.due_date).format('MMMM D, YYYY')}
                </p>
              </div>
            )}
            {payment.approved_at && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400">Approved At</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {dayjs(payment.approved_at).format('MMMM D, YYYY h:mm A')}
                </p>
              </div>
            )}
            {payment.rejection_reason && (
              <div className="col-span-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-500 dark:text-red-400">Rejection Reason</p>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  {payment.rejection_reason}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          {payment.status === 'pending' && (
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 px-4 py-2.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Reject'}
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-green-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Approve Payment
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const RecentPayments: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchUserBranch = async () => {
      if (user?.id) {
        try {
          let branchId = user.branch_id;
          
          if (!branchId) {
            const { data, error } = await supabase
              .from('users')
              .select('branch_id')
              .eq('id', user.id)
              .single();
            
            if (!error && data) {
              branchId = data.branch_id;
            }
          }
          
          if (branchId) {
            setUserBranchId(branchId);
            await fetchPayments(branchId);
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error('Error fetching user branch:', error);
          setLoading(false);
        }
      }
    };
    
    fetchUserBranch();
  }, [user]);

  const fetchPayments = async (branchId: string) => {
    setLoading(true);
    try {
      // Fetch recent payments with student details
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('branch_id', branchId)
        .order('payment_date', { ascending: false })
        .limit(10);

      if (paymentsError) throw paymentsError;

      if (!paymentsData || paymentsData.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }

      // Get unique student IDs
      const studentIds = [...new Set(paymentsData.map(p => p.student_id).filter(Boolean))];
      
      // Fetch student details
      let studentNames: Record<string, { name: string; admission: string }> = {};
      if (studentIds.length > 0) {
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, first_name, last_name, admission_number')
          .in('id', studentIds);

        if (!studentsError && studentsData) {
          studentNames = studentsData.reduce((acc, s) => {
            acc[s.id] = {
              name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown Student',
              admission: s.admission_number || 'N/A'
            };
            return acc;
          }, {} as Record<string, { name: string; admission: string }>);
        }
      }

      // Get unique fee IDs
      const feeIds = [...new Set(paymentsData.map(p => p.fee_id).filter(Boolean))];
      
      // Fetch fee names
      let feeNames: Record<string, string> = {};
      if (feeIds.length > 0) {
        const { data: feesData, error: feesError } = await supabase
          .from('fees')
          .select('id, name')
          .in('id', feeIds);

        if (!feesError && feesData) {
          feeNames = feesData.reduce((acc, f) => {
            acc[f.id] = f.name || 'N/A';
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Combine data
      const formattedPayments: Payment[] = paymentsData.map(p => {
        const studentInfo = studentNames[p.student_id] || { name: 'Unknown Student', admission: 'N/A' };
        return {
          ...p,
          student_name: studentInfo.name,
          student_admission: studentInfo.admission,
          fee_name: p.fee_id ? feeNames[p.fee_id] || 'N/A' : 'N/A',
          student_avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(studentInfo.name)}&background=random&color=fff&size=40`,
        };
      });

      setPayments(formattedPayments);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error(error.message || 'Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (userBranchId) {
      setRefreshing(true);
      await fetchPayments(userBranchId);
      toast.success('Payments refreshed!');
    }
  };

  const handleApprove = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Payment approved!');
      setShowModal(false);
      setSelectedPayment(null);
      if (userBranchId) await fetchPayments(userBranchId);
    } catch (error: any) {
      console.error('Error approving payment:', error);
      toast.error(error.message || 'Failed to approve payment');
    }
  };

  const handleReject = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Payment rejected');
      setShowModal(false);
      setSelectedPayment(null);
      if (userBranchId) await fetchPayments(userBranchId);
    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      toast.error(error.message || 'Failed to reject payment');
    }
  };

  const openPaymentDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowModal(true);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[status] || styles.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'Completed',
      paid: 'Paid',
      pending: 'Pending',
      approved: 'Approved',
      failed: 'Failed',
      rejected: 'Rejected',
      refunded: 'Refunded',
    };
    return labels[status] || status;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 animate-pulse">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-2">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mt-1"></div>
              </div>
              <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-2">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Payments</h3>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {payments.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
              View all →
            </button>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-gray-100 p-4 dark:bg-gray-700/50">
              <DollarSign className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">No payments recorded</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Recent payments will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="pb-3">Student</th>
                  <th className="pb-3 hidden sm:table-cell">Receipt</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3 hidden md:table-cell">Method</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 hidden lg:table-cell">Date</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {payments.slice(0, 5).map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={payment.student_avatar} 
                          alt={payment.student_name} 
                          className="h-8 w-8 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(payment.student_name)}&background=random&color=fff&size=40`;
                          }}
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white block truncate max-w-[100px]">
                            {payment.student_name}
                          </span>
                          <span className="text-xs text-gray-400 hidden sm:inline">#{payment.student_admission}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 hidden sm:table-cell">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {payment.receipt_number}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(payment.amount_paid)}
                      </span>
                    </td>
                    <td className="py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                        {payment.payment_method?.replace('_', ' ') || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(payment.status)}`}>
                        {getStatusLabel(payment.status)}
                      </span>
                    </td>
                    <td className="py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {dayjs(payment.payment_date).format('MMM D, YYYY')}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => openPaymentDetails(payment)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {payment.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleApprove(payment.id)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleReject(payment.id)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Payment Details Modal */}
      <AnimatePresence>
        {showModal && selectedPayment && (
          <PaymentDetailsModal
            payment={selectedPayment}
            onClose={() => {
              setShowModal(false);
              setSelectedPayment(null);
            }}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default RecentPayments;
