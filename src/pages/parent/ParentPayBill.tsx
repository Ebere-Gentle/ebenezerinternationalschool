// src/pages/parent/ParentPayBill.tsx - COMPLETE FIXED VERSION

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { 
  ArrowLeft, 
  Wallet, 
  Users, 
  RefreshCw, 
  ChevronDown,
  User,
  Calendar,
  FileText,
  CreditCard,
  Building2,
  Banknote,
  Info,
  Shield,
  Loader2,
  Send,
  Copy,
  Check,
  Upload,
  File,
  Trash2,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Shield as ShieldIcon,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePaymentData } from '../../hooks/usePaymentData';
import { supabase } from '../../config/supabase/client';
import { paystackService, type PaymentGateway } from '../../services/paystack';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Components
import ChildSelector from './components/ChildSelector';
import StudentInfoCard from './components/StudentInfoCard';
import FeeList from './components/FeeList';
import PaymentModal from './components/PaymentModal';
import SuccessReceiptModal from './components/SuccessReceiptModal';
import ErrorDetailsModal from './components/ErrorDetailsModal';
import FailureModal from './components/FailureModal';
import PayOnlineSidebar from './components/PayOnlineSidebar';
import FloatingActionButton from './components/FloatingActionButton';

// Hooks
import { usePaymentHandlers } from './hooks/usePaymentHandlers';

// Utils
import { formatCurrency, getErrorType, getErrorTitle, getErrorDescription } from './utils/paymentHelpers';

// Types
interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  class_name?: string;
  passport_url?: string;
  branch_id: string;
  email?: string;
}

interface PaymentRecord {
  id: string;
  receipt_number: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  status: string;
  gateway_reference?: string;
  failure_reason?: string;
  payment_proof_url?: string;
  assignment_id?: string;
  transaction_reference?: string;
  metadata?: any;
  gateway_response?: any;
}

type PaymentMethodType = 'paystack' | 'bank_transfer';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

const ParentPayBill: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('paystack');
  const [amount, setAmount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [failureReason, setFailureReason] = useState('');
  const [failureDetails, setFailureDetails] = useState('');
  const [showChildSelector, setShowChildSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid' | 'overdue' | 'pending' | 'cancelled' | 'failed'>('all');
  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway | null>(null);
  const [copied, setCopied] = useState(false);
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [selectedFailedPayment, setSelectedFailedPayment] = useState<any | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessReceipt, setShowSuccessReceipt] = useState(false);
  const [successPaymentData, setSuccessPaymentData] = useState<any | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [transactionReference, setTransactionReference] = useState('');
  const [wasCancelledByUser, setWasCancelledByUser] = useState(false);
  const [showBankTransferSuccess, setShowBankTransferSuccess] = useState(false);
  const [bankTransferData, setBankTransferData] = useState<any | null>(null);
  const [paymentErrorType, setPaymentErrorType] = useState<'cancelled' | 'network' | 'gateway' | 'bank' | 'unknown'>('unknown');
  
  // Refs
  const pendingReferenceRef = useRef<string | null>(null);
  const pendingAmountRef = useRef<number>(0);
  const pendingAssignmentIdRef = useRef<string | null>(null);
  const pendingStudentIdRef = useRef<string | null>(null);

  // User info
  const [userIP, setUserIP] = useState<string>('Not recorded');
  const [userAgent, setUserAgent] = useState<string>('Not recorded');

  // Get payment data
  const {
    assignments,
    refresh: refreshPaymentData,
  } = usePaymentData(studentId, branchId, {
    autoFetch: !!studentId && !!branchId
  });

  // Effects
  useEffect(() => {
    setUserAgent(navigator.userAgent);
    const getIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        if (data.ip) {
          setUserIP(data.ip);
        }
      } catch (error) {
        console.log('Could not fetch IP:', error);
      }
    };
    getIP();
  }, []);

  useEffect(() => {
    if (selectedChild?.branch_id) {
      setBranchId(selectedChild.branch_id);
      fetchPaymentGateway(selectedChild.branch_id);
    }
  }, [selectedChild]);

  useEffect(() => {
    if (user?.id) {
      fetchChildren();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChild?.id) {
      setStudentId(selectedChild.id);
    }
  }, [selectedChild]);

  useEffect(() => {
    if (selectedChild) {
      fetchPayments(selectedChild.id);
    }
  }, [selectedChild]);

  // Fetch functions
  const fetchPaymentGateway = async (branchId: string) => {
    setGatewayLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Payment gateway fetch error:', error);
        toast.error('Payment gateway not configured. Please contact school administration.');
        setPaymentGateway(null);
        setGatewayLoading(false);
        return;
      }

      if (!data) {
        toast.error('Payment method not configured for this branch.');
        setPaymentGateway(null);
        setGatewayLoading(false);
        return;
      }

      setPaymentGateway(data);
      await paystackService.initialize(branchId);
      
    } catch (error) {
      console.error('Error fetching payment gateway:', error);
      toast.error('Failed to load payment configuration');
      setPaymentGateway(null);
    } finally {
      setGatewayLoading(false);
    }
  };

  const fetchChildren = async () => {
    setLoading(true);
    try {
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (parentError) {
        toast.error('Parent profile not found');
        setLoading(false);
        return;
      }

      const { data: childrenData, error: childrenError } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          student_id,
          passport_url,
          branch_id,
          email,
          class:class_id (
            name
          )
        `)
        .eq('parent_id', parentData.id)
        .eq('current_status', 'active')
        .order('first_name');

      if (childrenError) {
        toast.error('Failed to load children');
        setLoading(false);
        return;
      }

      const studentsWithClass = (childrenData || []).map(s => ({
        ...s,
        class_name: s.class?.name || 'Not Assigned'
      }));

      setChildren(studentsWithClass);

      if (studentsWithClass.length > 0) {
        setSelectedChild(studentsWithClass[0]);
      } else {
        toast('No children found. Please contact administration.', { icon: 'ℹ️' });
      }

    } catch (error: any) {
      toast.error(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (studentId: string) => {
    try {
      console.log('Fetching payments for student:', studentId);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Payments fetch error:', error);
        return;
      }

      console.log('Payments fetched:', data);
      setPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
    }
  };

  // Generate reference
  const generateReference = () => {
    return paystackService.generateReference();
  };

  // File upload handlers
  const handleFileChange = (file: File | null) => {
    setUploadedFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setUploadPreview(null);
    }
  };

  const handleFileRemove = () => {
    setUploadedFile(null);
    setUploadPreview(null);
  };

  // Refresh data - DEFINED BEFORE usePaymentHandlers
  const refreshData = async () => {
    if (!selectedChild) return;
    console.log('Refreshing data...');
    setRefreshing(true);
    try {
      await Promise.all([
        refreshPaymentData(),
        fetchPayments(selectedChild.id),
        fetchPaymentGateway(selectedChild.branch_id)
      ]);
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Use payment handlers hook
  const {
    savePaymentRecord,
    updateAssignmentAfterPayment,
    handlePaymentSuccess,
    handlePaymentFailure,
    paystackCallback,
    paystackOnClose,
    handlePayWithPaystack,
    handleBankTransfer,
    getPaymentStatusForAssignment,
  } = usePaymentHandlers({
    selectedChild,
    selectedAssignment,
    paymentGateway,
    payments,
    amount,
    uploadedFile,
    transactionReference,
    user,
    userIP,
    userAgent,
    wasCancelledByUser,
    setProcessing,
    setWasCancelledByUser,
    setUploadedFile,
    setUploadPreview,
    setTransactionReference,
    setUploading,
    setShowPaymentModal,
    setSuccessPaymentData,
    setShowSuccessReceipt,
    setShowSuccess,
    setShowBankTransferSuccess,
    setBankTransferData,
    setShowBankDetails: () => {},
    setFailureReason,
    setFailureDetails,
    setShowFailure,
    setSelectedFailedPayment,
    setShowErrorModal,
    setPaymentErrorType,
    refreshPaymentData,
    fetchPayments,
    refreshData,
    formatCurrency,
    generateReference,
  });

  // Handlers
  const handleChildSelect = (child: Student) => {
    setSelectedChild(child);
    setShowChildSelector(false);
  };

  const handlePayNow = (assignment: any) => {
    if (!paymentGateway && !gatewayLoading) {
      toast.error('Payment configuration not loaded. Please try again.');
      return;
    }
    
    const status = getPaymentStatusForAssignment(assignment);
    
    // Always allow retry for cancelled or failed payments
    if (status.status === 'cancelled' || status.status === 'failed') {
      setSelectedAssignment(assignment);
      setAmount(assignment.balance);
      setShowPaymentModal(true);
      handleFileRemove();
      setTransactionReference('');
      return;
    }
    
    if (!status.isPayable) {
      if (status.status === 'paid') {
        toast.success('✅ This fee is already paid');
      } else if (status.status === 'pending') {
        toast.info('⏳ Payment is awaiting confirmation');
      } else if (status.status === 'waived') {
        toast.info('🛡️ This fee is exempted');
      }
      return;
    }
    
    setSelectedAssignment(assignment);
    setAmount(assignment.balance);
    setShowPaymentModal(true);
    handleFileRemove();
    setTransactionReference('');
  };

  const handleSubmitPayment = async () => {
    if (!selectedAssignment) {
      toast.error('No fee selected');
      return;
    }

    if (!paymentGateway) {
      toast.error('Payment configuration not loaded. Please try again.');
      return;
    }

    if (paymentMethod === 'paystack') {
      if (!paymentGateway.paystack_public_key) {
        toast.error('Paystack not configured for this branch. Please use bank transfer.');
        return;
      }
      await handlePayWithPaystack();
    } else {
      if (!paymentGateway.bank_account_number) {
        toast.error('Bank details not configured for this branch. Please use Paystack.');
        return;
      }
      await handleBankTransfer();
    }
  };

  const viewErrorDetails = (payment: any) => {
    console.log('View Error clicked with payment:', payment);
    setSelectedFailedPayment(payment);
    const errorType = getErrorType(payment);
    setPaymentErrorType(errorType);
    setShowErrorModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success('Copied to clipboard');
  };

  // Calculate totals
  const totalBalance = assignments.reduce((sum, a) => sum + a.balance, 0);
  const totalPaid = assignments.reduce((sum, a) => sum + a.amount_paid, 0);
  const totalDue = assignments.reduce((sum, a) => sum + a.amount_due, 0);
  const completionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;
  
  // Count paid fees - check both 'paid' and 'completed' status
  const paidFeesCount = assignments.filter(a => 
    a.payment_status === 'paid' || 
    a.payment_status === 'completed' ||
    a.balance === 0
  ).length;
  
  const totalFeesCount = assignments.length;
  const paidPercentage = totalFeesCount > 0 ? Math.round((paidFeesCount / totalFeesCount) * 100) : 0;

  // Filtered assignments
  const filteredAssignments = assignments.filter(a => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'unpaid') return a.balance > 0 && a.payment_status !== 'paid' && a.payment_status !== 'pending';
    if (filterStatus === 'paid') return a.payment_status === 'paid' || a.payment_status === 'completed' || a.balance === 0;
    if (filterStatus === 'overdue') return a.payment_status === 'overdue';
    if (filterStatus === 'pending') return a.payment_status === 'pending';
    if (filterStatus === 'cancelled') {
      return payments.some(p => p.assignment_id === a.id && (p.status === 'cancelled' || p.status === 'canceled'));
    }
    if (filterStatus === 'failed') {
      return payments.some(p => p.assignment_id === a.id && (p.status === 'failed' || p.status === 'rejected'));
    }
    return true;
  });

  // Debug: Log payments and assignments
  useEffect(() => {
    console.log('Payments state updated:', payments);
    console.log('Assignments:', assignments);
  }, [payments, assignments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading your children..." />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
        <div className="text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">No Children Found</h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">
            You don't have any children registered. Please contact the school administration.
          </p>
          <button
            onClick={() => navigate('/parent/dashboard')}
            className="mt-4 sm:mt-6 px-5 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-all text-sm sm:text-base"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      
      {/* Main Content with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Left Column - Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 xs:gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={() => navigate('/parent/dashboard')}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0" />
                  <span className="truncate">Pay Bill</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                  {selectedChild ? `Paying for: ${selectedChild.first_name} ${selectedChild.last_name}` : 'Select a child to pay'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              {children.length > 1 && (
                <button
                  onClick={() => setShowChildSelector(!showChildSelector)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg sm:rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-xs sm:text-sm"
                >
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">{selectedChild ? 'Switch Child' : 'Select Child'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${showChildSelector ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          </div>

          {/* Child Selector */}
          <ChildSelector
            isOpen={showChildSelector}
            children={children}
            selectedChild={selectedChild}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onSelect={handleChildSelect}
          />

          {/* Student Info Card */}
          {selectedChild && (
            <StudentInfoCard
              student={selectedChild}
              assignments={assignments}
              totalBalance={totalBalance}
              totalPaid={totalPaid}
              completionRate={completionRate}
              formatCurrency={formatCurrency}
            />
          )}

          {/* Fee List */}
          {selectedChild && (
            <FeeList
              assignments={filteredAssignments}
              totalAssignments={assignments.length}
              payments={payments}
              filterStatus={filterStatus}
              onFilterChange={setFilterStatus}
              onPayNow={handlePayNow}
              onViewError={viewErrorDetails}
              processing={processing}
              formatCurrency={formatCurrency}
              getPaymentStatusForAssignment={getPaymentStatusForAssignment}
            />
          )}
        </div>

        {/* Right Column - Pay Online Sidebar */}
        <PayOnlineSidebar
          assignments={assignments}
          onPayNow={handlePayNow}
        />
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        selectedAssignment={selectedAssignment}
        paymentGateway={paymentGateway}
        amount={amount}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        uploadedFile={uploadedFile}
        uploadPreview={uploadPreview}
        transactionReference={transactionReference}
        onFileChange={handleFileChange}
        onFileRemove={handleFileRemove}
        onTransactionReferenceChange={setTransactionReference}
        onClose={() => {
          setShowPaymentModal(false);
          handleFileRemove();
          setTransactionReference('');
        }}
        onSubmit={handleSubmitPayment}
        processing={processing}
        uploading={uploading}
        gatewayLoading={gatewayLoading}
        copied={copied}
        onCopy={copyToClipboard}
        formatCurrency={formatCurrency}
      />

      {/* Success Receipt Modal */}
      <SuccessReceiptModal
        isOpen={showSuccessReceipt || showBankTransferSuccess}
        isBankTransfer={showBankTransferSuccess}
        data={successPaymentData || bankTransferData}
        user={user}
        paidFeesCount={paidFeesCount}
        totalFeesCount={totalFeesCount}
        paidPercentage={paidPercentage}
        onClose={() => {
          setShowSuccessReceipt(false);
          setShowBankTransferSuccess(false);
          setShowSuccess(false);
          setSuccessPaymentData(null);
          setBankTransferData(null);
          refreshData();
        }}
        formatCurrency={formatCurrency}
      />

      {/* Error Details Modal */}
      <ErrorDetailsModal
        isOpen={showErrorModal}
        payment={selectedFailedPayment}
        errorType={paymentErrorType}
        user={user}
        onRetry={() => {
          setShowErrorModal(false);
          const assignment = assignments.find(a => 
            a.id === selectedFailedPayment?.assignment_id || 
            a.id === selectedFailedPayment?.metadata?.assignment_id
          );
          setSelectedFailedPayment(null);
          if (assignment) {
            handlePayNow(assignment);
          } else {
            toast.error('Payment record not found. Please refresh and try again.');
            refreshData();
          }
        }}
        onClose={() => {
          setShowErrorModal(false);
          setSelectedFailedPayment(null);
          refreshData();
        }}
        formatCurrency={formatCurrency}
      />

      {/* Failure Modal */}
      <FailureModal
        isOpen={showFailure}
        reason={failureReason}
        details={failureDetails}
        onRetry={() => {
          setShowFailure(false);
          setFailureReason('');
          setFailureDetails('');
          if (selectedAssignment) {
            setShowPaymentModal(true);
          } else {
            refreshData();
          }
        }}
        onClose={() => {
          setShowFailure(false);
          setFailureReason('');
          setFailureDetails('');
          refreshData();
        }}
      />

      {/* Floating Action Button */}
      <FloatingActionButton
        assignments={assignments}
        paymentGateway={!!paymentGateway}
        onPayNow={handlePayNow}
      />
    </div>
  );
};

export default ParentPayBill;
