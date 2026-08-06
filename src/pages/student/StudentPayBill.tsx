// src/pages/student/StudentPayBill.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { usePaymentData } from '../../hooks/usePaymentData';
import { supabase } from '../../config/supabase/client';
import { paystackService, type PaymentGateway } from '../../services/paystack';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Loader2,
  X,
  Building2,
  Send,
  Copy,
  Check,
  Calendar,
  Shield,
  Users,
  Search,
  RefreshCw,
  Banknote,
  Info,
  ChevronDown,
  ChevronUp,
  Upload,
  File,
  Trash2,
  Eye,
  BookOpen,
  GraduationCap,
  User
} from 'lucide-react';
import {
  getAssignmentStatusInfo,
  getPaymentStatusBadge,
  getCategoryBadge,
} from '../../utils/paymentUtils';

interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  class_name?: string;
  passport_url?: string;
  branch_id: string;
  email?: string;
  admission_number?: string;
  class_id?: string;
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
}

type PaymentMethodType = 'paystack' | 'bank_transfer';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

const StudentPayBill: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('paystack');
  const [amount, setAmount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [failureReason, setFailureReason] = useState('');
  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway | null>(null);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid' | 'overdue' | 'pending'>('all');
  const [expandedFee, setExpandedFee] = useState<string | null>(null);
  
  // Bank Transfer Proof Upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [transactionReference, setTransactionReference] = useState('');
  
  // Store payment reference for callback
  const pendingReferenceRef = useRef<string | null>(null);
  const pendingAmountRef = useRef<number>(0);
  const pendingAssignmentIdRef = useRef<string | null>(null);
  const pendingStudentIdRef = useRef<string | null>(null);

  // Use shared payment data hook
  const {
    assignments,
    unpaidFees,
    stats,
    paymentStats,
    refresh: refreshPaymentData,
    loading: paymentDataLoading,
  } = usePaymentData(studentProfile?.id || null, studentProfile?.branch_id || null, {
    autoFetch: !!studentProfile?.id && !!studentProfile?.branch_id,
  });

  // Fetch student profile
  useEffect(() => {
    if (user) {
      fetchStudentProfile();
    }
  }, [user]);

  // Fetch payment gateway config when student is found
  useEffect(() => {
    if (studentProfile?.branch_id) {
      fetchPaymentGateway(studentProfile.branch_id);
    }
  }, [studentProfile]);

  // Fetch payments separately
  useEffect(() => {
    if (studentProfile?.id) {
      fetchPayments(studentProfile.id);
    }
  }, [studentProfile]);

  const fetchStudentProfile = async () => {
    setLoading(true);
    try {
      let studentData = null;

      if (user?.id) {
        const { data, error } = await supabase
          .from('students')
          .select('*, class:class_id (id, name)')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          studentData = data;
        }
      }

      if (!studentData && user?.email) {
        const { data, error } = await supabase
          .from('students')
          .select('*, class:class_id (id, name)')
          .eq('email', user.email)
          .single();

        if (!error && data) {
          studentData = data;
        }
      }

      if (!studentData && user?.id) {
        const { data, error } = await supabase
          .from('students')
          .select('*, class:class_id (id, name)')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          studentData = data;
        }
      }

      if (studentData) {
        setStudentProfile({
          ...studentData,
          class_name: studentData.class?.name || 'Not Assigned',
        });
      } else {
        toast.error('Student profile not found. Please contact administration.');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error fetching student profile:', error);
      toast.error(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

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
        console.error('No payment gateway found for branch:', branchId);
        toast.error('Payment method not configured for this branch.');
        setPaymentGateway(null);
        setGatewayLoading(false);
        return;
      }

      console.log('Payment gateway found:', data);
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

  const fetchPayments = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Payments fetch error:', error);
        return;
      }

      setPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
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

  const getStatusBadge = (status: string) => getPaymentStatusBadge(status);

  const generateReference = () => {
    return paystackService.generateReference();
  };

  const uploadPaymentProof = async (file: File, paymentId: string): Promise<{ path: string; url: string } | null> => {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `proof_${paymentId}_${Date.now()}.${fileExt}`;
      const filePath = `payments/${studentProfile?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      return { path: filePath, url: urlData.publicUrl };
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      return null;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a JPEG, PNG, or PDF file');
        return;
      }
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setUploadPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setUploadPreview(null);
  };

  const savePaymentRecord = async (params: {
    assignmentId: string;
    amount: number;
    reference: string;
    status: 'pending' | 'success' | 'failed';
    failureReason?: string;
    gatewayReference?: string;
    paymentMethod?: string;
    paymentProofUrl?: string;
    paymentProofPath?: string;
    transactionReference?: string;
  }) => {
    try {
      const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const paymentData = {
        payment_id: paymentId,
        receipt_number: receiptNumber,
        student_id: studentProfile?.id,
        assignment_id: params.assignmentId,
        fee_id: selectedAssignment?.fee_id,
        amount: params.amount,
        amount_paid: params.amount,
        balance: 0,
        payment_method: params.paymentMethod || 'paystack',
        payment_date: new Date().toISOString(),
        status: params.status === 'success' ? 'completed' : params.status === 'pending' ? 'pending' : 'failed',
        transaction_reference: params.reference,
        gateway_reference: params.gatewayReference || params.reference,
        failure_reason: params.failureReason || null,
        branch_id: studentProfile?.branch_id,
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payment_proof_url: params.paymentProofUrl || null,
        payment_proof_path: params.paymentProofPath || null,
        gateway_response: params.status === 'success' ? { success: true } : { failed: true, reason: params.failureReason },
        metadata: {
          student_name: `${studentProfile?.first_name} ${studentProfile?.last_name}`,
          student_id: studentProfile?.id,
          fee_name: selectedAssignment?.fee_name,
          fee_id: selectedAssignment?.fee_id,
          payment_method: params.paymentMethod || 'paystack',
          assignment_id: params.assignmentId,
          reference: params.reference,
          transaction_reference: params.transactionReference || null,
        }
      };

      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single();

      if (error) {
        console.error('Error saving payment:', error);
        throw error;
      }

      if (params.status === 'success') {
        await updateAssignmentAfterPayment(params.assignmentId, params.amount);
      }

      return data;
    } catch (error) {
      console.error('Error saving payment record:', error);
      throw error;
    }
  };

  const updateAssignmentAfterPayment = async (assignmentId: string, amountPaid: number) => {
    try {
      const { data: assignment } = await supabase
        .from('student_fee_assignments')
        .select('amount_paid, balance, amount_due')
        .eq('id', assignmentId)
        .single();

      if (!assignment) return;

      const newPaid = (assignment.amount_paid || 0) + amountPaid;
      const newBalance = Math.max(0, (assignment.balance || 0) - amountPaid);
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      await supabase
        .from('student_fee_assignments')
        .update({
          amount_paid: newPaid,
          balance: newBalance,
          payment_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

    } catch (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
  };

  const handlePaymentSuccess = useCallback(async (reference: string) => {
    const assignmentId = pendingAssignmentIdRef.current;
    const amount = pendingAmountRef.current;
    
    if (!reference || !assignmentId) {
      toast.error('Missing payment information');
      return;
    }
    
    try {
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          gateway_reference: reference,
          updated_at: new Date().toISOString(),
          gateway_response: { success: true, reference },
        })
        .eq('transaction_reference', reference);

      await updateAssignmentAfterPayment(assignmentId, amount);
      
      await refreshPaymentData();
      if (studentProfile?.id) {
        await fetchPayments(studentProfile.id);
      }
      
      setShowPaymentModal(false);
      setShowSuccess(true);
      toast.success(`Payment of ${formatCurrency(amount)} completed successfully!`);
      setProcessing(false);
      
      pendingReferenceRef.current = null;
      pendingAmountRef.current = 0;
      pendingAssignmentIdRef.current = null;
      
      setTimeout(() => setShowSuccess(false), 10000);
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Payment succeeded but failed to update records. Please contact support.');
      setProcessing(false);
    }
  }, [studentProfile, user, formatCurrency, refreshPaymentData]);

  const handlePaymentFailure = useCallback(async (reference: string, message?: string) => {
    if (!reference) return;
    
    try {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          failure_reason: message || 'Payment failed',
          updated_at: new Date().toISOString(),
        })
        .eq('transaction_reference', reference);
      
      setFailureReason(message || 'Payment failed. Please try again.');
      setShowFailure(true);
      setProcessing(false);
      pendingReferenceRef.current = null;
      pendingAmountRef.current = 0;
      pendingAssignmentIdRef.current = null;
    } catch (error) {
      console.error('Error updating failed payment:', error);
    }
  }, []);

  const paystackCallback = useCallback((response: any) => {
    console.log('✅ Paystack payment callback:', response);
    const reference = pendingReferenceRef.current;
    
    if (response.status === 'success' && reference) {
      handlePaymentSuccess(reference);
    } else if (reference) {
      handlePaymentFailure(reference, response.message);
    }
  }, [handlePaymentSuccess, handlePaymentFailure]);

  const paystackOnClose = useCallback(() => {
    console.log('Paystack modal closed');
    const reference = pendingReferenceRef.current;
    
    if (reference) {
      setTimeout(async () => {
        const { data: payment } = await supabase
          .from('payments')
          .select('status')
          .eq('transaction_reference', reference)
          .single();

        if (payment && payment.status === 'pending') {
          await supabase
            .from('payments')
            .update({
              status: 'cancelled',
              failure_reason: 'User cancelled payment',
              updated_at: new Date().toISOString(),
            })
            .eq('transaction_reference', reference);
          
          toast.error('Payment was cancelled');
          setProcessing(false);
          pendingReferenceRef.current = null;
          pendingAmountRef.current = 0;
          pendingAssignmentIdRef.current = null;
        }
      }, 2000);
    }
  }, []);

  const handlePayWithPaystack = async () => {
    if (!selectedAssignment || !studentProfile) {
      toast.error('Missing payment information');
      return;
    }

    if (!paymentGateway || !paymentGateway.paystack_public_key) {
      toast.error('Paystack not configured. Please use bank transfer.');
      return;
    }

    if (typeof window.PaystackPop === 'undefined') {
      toast.error('Paystack is not loaded. Please refresh and try again.');
      return;
    }

    setProcessing(true);
    const reference = generateReference();

    try {
      pendingReferenceRef.current = reference;
      pendingAmountRef.current = amount;
      pendingAssignmentIdRef.current = selectedAssignment.id;
      pendingStudentIdRef.current = studentProfile.id;

      await savePaymentRecord({
        assignmentId: selectedAssignment.id,
        amount: amount,
        reference: reference,
        status: 'pending',
        gatewayReference: reference,
        paymentMethod: 'paystack',
      });

      const handler = window.PaystackPop.setup({
        key: paymentGateway.paystack_public_key,
        email: studentProfile.email || user?.email || 'student@example.com',
        amount: Math.round(amount * 100),
        ref: reference,
        currency: 'NGN',
        metadata: {
          student_id: studentProfile.id,
          student_name: `${studentProfile.first_name} ${studentProfile.last_name}`,
          assignment_id: selectedAssignment.id,
          fee_name: selectedAssignment.fee_name,
          payment_type: 'fee_payment',
          branch_id: studentProfile.branch_id,
        },
        callback: paystackCallback,
        onClose: paystackOnClose,
      });

      handler.openIframe();

    } catch (error: any) {
      console.error('Paystack payment error:', error);
      await savePaymentRecord({
        assignmentId: selectedAssignment.id,
        amount: amount,
        reference: reference,
        status: 'failed',
        failureReason: error.message || 'Payment processing failed',
        gatewayReference: reference,
        paymentMethod: 'paystack',
      });
      setFailureReason(error.message || 'Payment processing failed. Please try again or use bank transfer.');
      setShowFailure(true);
      setProcessing(false);
      pendingReferenceRef.current = null;
      pendingAmountRef.current = 0;
      pendingAssignmentIdRef.current = null;
    }
  };

  const handleBankTransfer = async () => {
    if (!selectedAssignment || !studentProfile) {
      toast.error('Missing payment information');
      return;
    }

    if (!paymentGateway || !paymentGateway.bank_account_number) {
      toast.error('Bank details not configured. Please use Paystack.');
      return;
    }

    if (!uploadedFile) {
      toast.error('Please upload proof of payment');
      return;
    }

    if (!transactionReference) {
      toast.error('Please enter the transaction reference from your bank');
      return;
    }

    setProcessing(true);
    setUploading(true);
    const reference = generateReference();

    try {
      const uploadResult = await uploadPaymentProof(uploadedFile, reference);
      
      if (!uploadResult) {
        toast.error('Failed to upload payment proof. Please try again.');
        setProcessing(false);
        setUploading(false);
        return;
      }

      await savePaymentRecord({
        assignmentId: selectedAssignment.id,
        amount: amount,
        reference: reference,
        status: 'pending',
        paymentMethod: 'bank_transfer',
        gatewayReference: reference,
        paymentProofUrl: uploadResult.url,
        paymentProofPath: uploadResult.path,
        transactionReference: transactionReference,
      });

      setUploadedFile(null);
      setUploadPreview(null);
      setTransactionReference('');
      setUploading(false);
      
      await refreshPaymentData();
      if (studentProfile?.id) {
        await fetchPayments(studentProfile.id);
      }

      setShowBankDetails(true);
      setShowSuccess(true);
      setProcessing(false);
      
      toast.success('Payment submitted! Please wait for confirmation.');

    } catch (error: any) {
      console.error('Bank transfer error:', error);
      await savePaymentRecord({
        assignmentId: selectedAssignment.id,
        amount: amount,
        reference: reference,
        status: 'failed',
        failureReason: error.message || 'Bank transfer submission failed',
        gatewayReference: reference,
        paymentMethod: 'bank_transfer',
      });
      setFailureReason(error.message || 'Failed to submit bank transfer. Please try again.');
      setShowFailure(true);
      setProcessing(false);
      setUploading(false);
    }
  };

  const getPaymentStatusForAssignment = (assignment: any) => {
    const hasPending = payments.some(p => 
      p.assignment_id === assignment.id && 
      (p.status === 'pending' || p.status === 'processing')
    );
    
    const hasFailed = payments.some(p => 
      p.assignment_id === assignment.id && 
      (p.status === 'failed' || p.status === 'rejected')
    );
    
    return getAssignmentStatusInfo(
      {
        payment_status: assignment.payment_status,
        balance: assignment.balance,
        amount_due: assignment.amount_due,
        amount_paid: assignment.amount_paid,
        due_date: assignment.due_date,
      },
      hasPending,
      hasFailed
    );
  };

  const handlePayNow = (assignment: any) => {
    if (!paymentGateway && !gatewayLoading) {
      toast.error('Payment configuration not loaded. Please try again.');
      return;
    }
    
    const status = getPaymentStatusForAssignment(assignment);
    if (!status.isPayable) {
      if (status.status === 'paid') {
        toast.success('This fee is already paid');
      } else if (status.status === 'pending') {
        toast.info('Payment is awaiting confirmation');
      } else if (status.status === 'waived') {
        toast.info('This fee is exempted');
      }
      return;
    }
    
    setSelectedAssignment(assignment);
    setAmount(assignment.balance);
    setShowPaymentModal(true);
    setUploadedFile(null);
    setUploadPreview(null);
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

  const refreshData = async () => {
    if (!studentProfile) return;
    setRefreshing(true);
    try {
      await Promise.all([
        refreshPaymentData(),
        fetchPayments(studentProfile.id),
        fetchPaymentGateway(studentProfile.branch_id)
      ]);
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success('Copied to clipboard');
  };

  const filteredAssignments = assignments.filter(a => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'unpaid') return a.balance > 0 && a.payment_status !== 'paid' && a.payment_status !== 'pending';
    if (filterStatus === 'paid') return a.payment_status === 'paid';
    if (filterStatus === 'overdue') return a.payment_status === 'overdue';
    if (filterStatus === 'pending') return a.payment_status === 'pending';
    return true;
  });

  const totalBalance = assignments.reduce((sum, a) => sum + a.balance, 0);
  const totalPaid = assignments.reduce((sum, a) => sum + a.amount_paid, 0);
  const totalDue = assignments.reduce((sum, a) => sum + a.amount_due, 0);
  const completionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading your profile..." />
      </div>
    );
  }

  if (!studentProfile) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
        <div className="text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Student Profile Not Found</h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">
            Please contact the school administration to set up your profile.
          </p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="mt-6 px-5 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-all text-sm sm:text-base"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 xs:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={() => navigate('/student/dashboard')}
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
              {studentProfile.first_name} {studentProfile.last_name} • {studentProfile.admission_number || studentProfile.student_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Student Info Card - Mobile Responsive */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-base sm:text-lg md:text-xl font-bold flex-shrink-0">
              {studentProfile.first_name?.[0]}{studentProfile.last_name?.[0]}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                {studentProfile.first_name} {studentProfile.last_name}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                {studentProfile.class_name || 'Not Assigned'} • {studentProfile.student_id || studentProfile.admission_number}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right flex-shrink-0">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total Balance</p>
            <p className={`text-lg sm:text-xl md:text-2xl font-bold ${totalBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {formatCurrency(totalBalance)}
            </p>
          </div>
        </div>

        <div className="mt-3 sm:mt-4">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Payment Progress</span>
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              {Math.round(completionRate)}%
            </span>
          </div>
          <div className="h-1.5 sm:h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(completionRate, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-3 sm:mt-4">
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Total Fees</p>
            <p className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white">{assignments.length}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Paid</p>
            <p className="text-sm sm:text-base md:text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Due</p>
            <p className="text-sm sm:text-base md:text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(totalBalance)}</p>
          </div>
        </div>
      </div>

      {/* Payment Method Selection - Mobile Responsive */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
          <span className="truncate">Select Payment Method</span>
        </h2>
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
          {paymentGateway?.paystack_public_key && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'paystack'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
              }`}
              onClick={() => {
                setPaymentMethod('paystack');
                setUploadedFile(null);
                setUploadPreview(null);
                setTransactionReference('');
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Card</h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Online • Paystack</p>
                </div>
              </div>
              {paymentMethod === 'paystack' && (
                <div className="mt-2 sm:mt-3 flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-medium">Selected</span>
                </div>
              )}
            </motion.div>
          )}
          
          {paymentGateway?.bank_account_number && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'bank_transfer'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
              }`}
              onClick={() => setPaymentMethod('bank_transfer')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Bank Transfer</h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    Offline • {paymentGateway.bank_name}
                  </p>
                </div>
              </div>
              {paymentMethod === 'bank_transfer' && (
                <div className="mt-2 sm:mt-3 flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-medium">Selected</span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Fee List - Mobile Responsive */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 gap-2 xs:gap-3">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
            <span className="truncate">Your Fees</span>
            <span className="text-xs sm:text-sm font-normal text-gray-500 flex-shrink-0">
              ({filteredAssignments.length} of {assignments.length})
            </span>
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
            >
              <option value="all">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredAssignments.length === 0 ? (
            <div className="p-6 sm:p-8 text-center">
              <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 dark:text-gray-600" />
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">No fees found</p>
              <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                {filterStatus !== 'all' ? `No ${filterStatus} fees` : 'All fees are paid!'}
              </p>
            </div>
          ) : (
            filteredAssignments.map((assignment) => {
              const statusInfo = getPaymentStatusForAssignment(assignment);
              const isExpanded = expandedFee === assignment.id;
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={assignment.id}
                  className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all ${
                    statusInfo.status === 'overdue' ? 'border-l-4 border-l-red-500' : ''
                  } ${statusInfo.status === 'paid' ? 'border-l-4 border-l-green-500' : ''} ${
                    statusInfo.status === 'pending' ? 'border-l-4 border-l-yellow-500' : ''
                  } ${statusInfo.status === 'waived' ? 'border-l-4 border-l-purple-500' : ''}`}
                >
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <span className={`inline-flex px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getCategoryBadge(assignment.fee_category || '')}`}>
                          {assignment.fee_category?.replace(/_/g, ' ') || 'Fee'}
                        </span>
                        <span className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                          {assignment.fee_name || 'Unknown Fee'}
                        </span>
                        {statusInfo.status === 'overdue' && (
                          <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            Overdue
                          </span>
                        )}
                        {statusInfo.status === 'pending' && (
                          <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            Pending
                          </span>
                        )}
                        {statusInfo.status === 'paid' && (
                          <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            Paid
                          </span>
                        )}
                        {statusInfo.status === 'waived' && (
                          <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            Exempted
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-0.5 sm:gap-1">
                          <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          Due: {assignment.due_date ? dayjs(assignment.due_date).format('MMM D') : 'N/A'}
                        </span>
                        {assignment.session && assignment.term && (
                          <span className="truncate">{assignment.term} {assignment.session}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-0 xs:ml-4">
                      <p className={`font-bold text-xs sm:text-sm md:text-base ${
                        statusInfo.status === 'paid' ? 'text-green-600 dark:text-green-400' :
                        statusInfo.status === 'waived' ? 'text-purple-600 dark:text-purple-400' :
                        statusInfo.status === 'overdue' ? 'text-red-600 dark:text-red-400' :
                        statusInfo.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-gray-900 dark:text-white'
                      }`}>
                        {statusInfo.status === 'paid' || statusInfo.status === 'waived' ? '✅' : 
                         statusInfo.status === 'pending' ? '⏳' : 
                         formatCurrency(assignment.balance)}
                      </p>
                      <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                        <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium ${statusInfo.badgeColor}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      {statusInfo.isPayable && (
                        <button
                          onClick={() => handlePayNow(assignment)}
                          disabled={processing || gatewayLoading}
                          className={`mt-1 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-lg transition-all ${
                            processing || gatewayLoading
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                              : statusInfo.status === 'failed'
                              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90'
                              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90'
                          }`}
                        >
                          {statusInfo.status === 'failed' ? 'Retry' : 'Pay'}
                        </button>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700"
                      >
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl p-3 sm:p-4 grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Assignment ID</p>
                            <p className="font-medium text-gray-900 dark:text-white font-mono text-[10px] sm:text-xs truncate">
                              {assignment.assignment_id}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Original Amount</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(assignment.amount_due)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Amount Paid</p>
                            <p className="font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(assignment.amount_paid)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Balance</p>
                            <p className={`font-medium ${assignment.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              {formatCurrency(assignment.balance)}
                            </p>
                          </div>
                          {assignment.due_date && (
                            <div className="col-span-2">
                              <p className="text-gray-500 dark:text-gray-400">Due Date</p>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {dayjs(assignment.due_date).format('MMMM D, YYYY')}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
        <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-gray-200 dark:border-gray-700 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
          Showing {filteredAssignments.length} of {assignments.length} fees
        </div>
      </div>

      {/* Payment Modal - Mobile Responsive */}
      <AnimatePresence>
        {showPaymentModal && selectedAssignment && paymentGateway && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex items-center justify-between">
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                  Payment Details
                </h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setUploadedFile(null);
                    setUploadPreview(null);
                    setTransactionReference('');
                  }}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg sm:rounded-xl p-3 sm:p-4 text-white">
                  <p className="text-xs sm:text-sm opacity-80">Total Amount</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold">{formatCurrency(amount)}</p>
                  <p className="text-[10px] sm:text-xs opacity-70 mt-0.5 sm:mt-1 truncate">{selectedAssignment.fee_name}</p>
                </div>

                {paymentMethod === 'bank_transfer' && paymentGateway && paymentGateway.bank_account_number && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-1.5 sm:space-y-2 border border-gray-200 dark:border-gray-600">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                        Bank Transfer Details
                      </p>
                      <div className="space-y-1 text-xs sm:text-sm">
                        <div className="flex flex-col xs:flex-row xs:justify-between items-start xs:items-center py-1 border-b border-gray-200 dark:border-gray-600 gap-0.5 xs:gap-0">
                          <span className="text-gray-500">Bank</span>
                          <span className="font-medium text-gray-900 dark:text-white">{paymentGateway.bank_name}</span>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between items-start xs:items-center py-1 border-b border-gray-200 dark:border-gray-600 gap-0.5 xs:gap-0">
                          <span className="text-gray-500">Account Name</span>
                          <span className="font-medium text-gray-900 dark:text-white">{paymentGateway.bank_account_name}</span>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between items-start xs:items-center py-1 gap-0.5 xs:gap-0">
                          <span className="text-gray-500">Account Number</span>
                          <span className="font-medium text-gray-900 dark:text-white font-mono flex items-center gap-2">
                            {paymentGateway.bank_account_number}
                            <button
                              onClick={() => copyToClipboard(paymentGateway.bank_account_number)}
                              className="p-0.5 sm:p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                            >
                              {copied ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" /> : <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />}
                            </button>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Transaction Reference
                      </label>
                      <input
                        type="text"
                        value={transactionReference}
                        onChange={(e) => setTransactionReference(e.target.value)}
                        placeholder="Enter bank transaction reference"
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm dark:text-white"
                      />
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Enter the reference number from your bank transfer</p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Upload Payment Proof
                      </label>
                      <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center hover:border-green-500 transition-all">
                        {uploadPreview ? (
                          <div className="space-y-2 sm:space-y-3">
                            <div className="relative">
                              {uploadPreview.startsWith('data:image') ? (
                                <img 
                                  src={uploadPreview} 
                                  alt="Payment proof" 
                                  className="max-h-28 sm:max-h-40 mx-auto rounded-lg object-contain"
                                />
                              ) : (
                                <div className="flex items-center justify-center gap-2 p-3 sm:p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                  <File className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">
                                    {uploadedFile?.name || 'File uploaded'}
                                  </span>
                                </div>
                              )}
                              <button
                                onClick={removeUploadedFile}
                                className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 p-0.5 sm:p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
                              >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                            <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                              ✓ File uploaded successfully
                            </p>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-gray-400 mb-1 sm:mb-2" />
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-400">
                              JPEG, PNG, PDF (Max 5MB)
                            </p>
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

                    {paymentGateway.payment_instructions && (
                      <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 whitespace-pre-line">
                          <Info className="w-3 h-3 inline mr-1" />
                          {paymentGateway.payment_instructions}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === 'paystack' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5 sm:p-3 border border-blue-200 dark:border-blue-800">
                    <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      You will be redirected to Paystack secure payment page.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSubmitPayment}
                  disabled={processing || gatewayLoading || (paymentMethod === 'bank_transfer' && (!uploadedFile || !transactionReference))}
                  className="w-full px-4 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {processing || uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {uploading ? 'Uploading...' : 'Processing...'}
                    </>
                  ) : gatewayLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      {paymentMethod === 'paystack' ? (
                        <>
                          <CreditCard className="w-4 h-4" />
                          Pay with Paystack
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit with Proof
                        </>
                      )}
                    </>
                  )}
                </button>

                <p className="text-[10px] sm:text-xs text-center text-gray-400 dark:text-gray-500">
                  {paymentMethod === 'paystack' 
                    ? 'You will be redirected to complete payment securely'
                    : 'Upload proof of payment for verification'}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal - Mobile Responsive */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 text-center max-h-[90vh] overflow-y-auto"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                {paymentMethod === 'bank_transfer' ? 'Payment Submitted!' : 'Payment Successful!'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
                {paymentMethod === 'bank_transfer' 
                  ? `Your bank transfer of ${formatCurrency(amount)} has been submitted with proof. 
                     You will receive a confirmation once it's verified.`
                  : `Your payment of ${formatCurrency(amount)} has been confirmed successfully. 
                     Receipt has been generated.`}
              </p>
              {paymentMethod === 'bank_transfer' && paymentGateway && showBankDetails && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl text-left border border-gray-200 dark:border-gray-600">
                  <p className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 flex items-center gap-2">
                    <Banknote className="w-3 h-3" />
                    Bank Transfer Details
                  </p>
                  <div className="space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
                    <div className="flex flex-col xs:flex-row xs:justify-between">
                      <span className="text-gray-500">Bank</span>
                      <span className="font-medium">{paymentGateway.bank_name}</span>
                    </div>
                    <div className="flex flex-col xs:flex-row xs:justify-between">
                      <span className="text-gray-500">Account Number</span>
                      <span className="font-medium font-mono">{paymentGateway.bank_account_number}</span>
                    </div>
                    <div className="flex flex-col xs:flex-row xs:justify-between">
                      <span className="text-gray-500">Account Name</span>
                      <span className="font-medium">{paymentGateway.bank_account_name}</span>
                    </div>
                    <div className="flex flex-col xs:flex-row xs:justify-between border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
                      <span className="text-gray-500 font-medium">Amount</span>
                      <span className="font-bold text-green-600">{formatCurrency(amount)}</span>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setShowBankDetails(false);
                  setShowPaymentModal(false);
                  setUploadedFile(null);
                  setUploadPreview(null);
                  setTransactionReference('');
                }}
                className="mt-4 px-5 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all text-sm sm:text-base"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Failure Modal - Mobile Responsive */}
      <AnimatePresence>
        {showFailure && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 text-center"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <X className="w-7 h-7 sm:w-8 sm:h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Payment Failed</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
                {failureReason || 'There was an issue processing your payment. Please try again.'}
              </p>
              <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowFailure(false);
                    setFailureReason('');
                    setUploadedFile(null);
                    setUploadPreview(null);
                    setTransactionReference('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowFailure(false);
                    setFailureReason('');
                    if (selectedAssignment) {
                      setShowPaymentModal(true);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all text-sm"
                >
                  Retry
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button - Mobile Responsive */}
      {assignments.some(a => a.balance > 0 && a.payment_status !== 'paid' && a.payment_status !== 'pending' && a.payment_status !== 'waived') && paymentGateway && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full shadow-2xl shadow-green-500/30 flex items-center justify-center hover:scale-110 transition-all z-40"
          onClick={() => {
            const firstUnpaid = assignments.find(a => a.balance > 0 && a.payment_status !== 'paid' && a.payment_status !== 'pending' && a.payment_status !== 'waived');
            if (firstUnpaid) {
              handlePayNow(firstUnpaid);
            }
          }}
        >
          <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
        </motion.button>
      )}
    </div>
  );
};

export default StudentPayBill;