// src/pages/parent/hooks/usePaymentHandlers.ts - FIXED PROCESSING STATE

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';

interface UsePaymentHandlersProps {
  selectedChild: any;
  selectedAssignment: any;
  paymentGateway: any;
  payments: any[];
  amount: number;
  uploadedFile: File | null;
  transactionReference: string;
  user: any;
  userIP: string;
  userAgent: string;
  setProcessing: (val: boolean) => void;
  setUploadedFile: (val: File | null) => void;
  setUploadPreview: (val: string | null) => void;
  setTransactionReference: (val: string) => void;
  setUploading: (val: boolean) => void;
  setShowPaymentModal: (val: boolean) => void;
  setSuccessPaymentData: (val: any) => void;
  setShowSuccessReceipt: (val: boolean) => void;
  setShowSuccess: (val: boolean) => void;
  setShowBankTransferSuccess: (val: boolean) => void;
  setBankTransferData: (val: any) => void;
  setShowBankDetails: (val: boolean) => void;
  setFailureReason: (val: string) => void;
  setFailureDetails: (val: string) => void;
  setShowFailure: (val: boolean) => void;
  setSelectedFailedPayment: (val: any) => void;
  setShowErrorModal: (val: boolean) => void;
  setPaymentErrorType: (val: 'cancelled' | 'network' | 'gateway' | 'bank' | 'unknown') => void;
  refreshPaymentData: () => Promise<void>;
  fetchPayments: (studentId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  formatCurrency: (amount: number) => string;
  generateReference: () => string;
}

export const usePaymentHandlers = (props: UsePaymentHandlersProps) => {
  const {
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
    setProcessing,
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
    setShowBankDetails,
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
  } = props;

  // Save payment record to database
  const savePaymentRecord = async (params: {
    assignmentId: string;
    amount: number;
    reference: string;
    status: 'pending' | 'success' | 'failed' | 'cancelled';
    failureReason?: string;
    gatewayReference?: string;
    paymentMethod?: string;
    paymentProofUrl?: string;
    paymentProofPath?: string;
    transactionReference?: string;
    errorDetails?: string;
    gatewayResponse?: any;
    metadata?: any;
  }) => {
    try {
      const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const paymentData = {
        payment_id: paymentId,
        receipt_number: receiptNumber,
        student_id: selectedChild?.id,
        assignment_id: params.assignmentId,
        fee_id: selectedAssignment?.fee_id,
        amount: params.amount,
        amount_paid: params.amount,
        balance: 0,
        payment_method: params.paymentMethod || 'paystack',
        payment_date: new Date().toISOString(),
        status: params.status === 'success' ? 'completed' : params.status,
        transaction_reference: params.reference,
        gateway_reference: params.gatewayReference || params.reference,
        failure_reason: params.failureReason || null,
        branch_id: selectedChild?.branch_id,
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payment_proof_url: params.paymentProofUrl || null,
        payment_proof_path: params.paymentProofPath || null,
        gateway_response: params.gatewayResponse || null,
        metadata: params.metadata || {
          fee_id: selectedAssignment?.fee_id,
          fee_name: selectedAssignment?.fee_name,
          assignment_id: params.assignmentId,
          student_name: `${selectedChild?.first_name} ${selectedChild?.last_name}`,
          student_id: selectedChild?.id,
          reference: params.reference,
          payment_method: params.paymentMethod || 'paystack',
          transaction_reference: params.transactionReference || null,
          error_details: params.errorDetails || null,
          failure_reason: params.failureReason || null,
          timestamp: new Date().toISOString(),
          ip_address: userIP,
          user_agent: userAgent,
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

  // Update assignment after payment
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

  // Upload payment proof
  const uploadPaymentProof = async (file: File, paymentId: string): Promise<{ path: string; url: string } | null> => {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `proof_${paymentId}_${Date.now()}.${fileExt}`;
      const filePath = `payments/${selectedChild?.id}/${fileName}`;

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

  // ============================================
  // PAYSTACK PAYMENT HANDLING
  // ============================================

  // Handle successful payment
  const handlePaymentSuccess = useCallback(async (reference: string) => {
    console.log('✅ Payment success for reference:', reference);
    const assignmentId = (window as any).__pendingAssignmentId;
    const amount = (window as any).__pendingAmount;
    
    if (!reference || !assignmentId) {
      toast.error('Missing payment information');
      setProcessing(false);
      return;
    }
    
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          gateway_reference: reference,
          updated_at: new Date().toISOString(),
          gateway_response: { success: true, reference },
        })
        .eq('transaction_reference', reference)
        .select()
        .single();

      if (error) throw error;

      await updateAssignmentAfterPayment(assignmentId, amount);
      await refreshPaymentData();
      await fetchPayments(selectedChild?.id || '');
      
      setShowPaymentModal(false);
      
      const paymentData = {
        ...payment,
        amount_paid: amount,
        fee_name: selectedAssignment?.fee_name,
        student_name: `${selectedChild?.first_name} ${selectedChild?.last_name}`,
        student_id: selectedChild?.student_id,
        reference: reference,
        payment_method: 'paystack',
        status: 'completed',
        receipt_number: payment?.receipt_number || `RCP-${Date.now()}`,
        metadata: {
          ...payment?.metadata,
          fee_name: selectedAssignment?.fee_name,
          fee_id: selectedAssignment?.fee_id,
          assignment_id: assignmentId,
          student_name: `${selectedChild?.first_name} ${selectedChild?.last_name}`,
          student_id: selectedChild?.id,
          reference: reference,
        }
      };
      
      setSuccessPaymentData(paymentData);
      setShowSuccessReceipt(true);
      setShowSuccess(true);
      
      toast.success(`✅ Payment of ${formatCurrency(amount)} completed successfully!`);
      setProcessing(false);
      
      (window as any).__pendingReference = null;
      (window as any).__pendingAmount = 0;
      (window as any).__pendingAssignmentId = null;
      
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Payment succeeded but failed to update records. Please contact support.');
      setProcessing(false);
    }
  }, [selectedChild, user, formatCurrency, refreshPaymentData, fetchPayments, setShowPaymentModal, setSuccessPaymentData, setShowSuccessReceipt, setShowSuccess, setProcessing]);

  // Handle payment failure
  const handlePaymentFailure = useCallback(async (reference: string, message?: string, errorDetails?: string, gatewayResponse?: any) => {
    console.log('❌ Payment failed for reference:', reference);
    if (!reference) {
      setProcessing(false);
      return;
    }
    
    try {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          failure_reason: message || 'Payment failed',
          updated_at: new Date().toISOString(),
          gateway_response: gatewayResponse || { failed: true, reason: message || 'Payment failed' },
          metadata: {
            error_details: errorDetails || null,
            failure_time: new Date().toISOString(),
            failure_reason: message || 'Payment failed',
            ip_address: userIP,
            user_agent: userAgent,
          }
        })
        .eq('transaction_reference', reference);
      
      setFailureReason(message || 'Payment failed. Please try again.');
      setFailureDetails(errorDetails || 'No additional details available.');
      setShowFailure(true);
      setProcessing(false);
      
      (window as any).__pendingReference = null;
      (window as any).__pendingAmount = 0;
      (window as any).__pendingAssignmentId = null;
      
      setTimeout(() => {
        refreshData();
      }, 1000);
    } catch (error) {
      console.error('Error updating failed payment:', error);
      setProcessing(false);
    }
  }, [userIP, userAgent, setFailureReason, setFailureDetails, setShowFailure, setProcessing, refreshData]);

  // Paystack callback
  const paystackCallback = useCallback((response: any) => {
    console.log('Paystack callback:', response);
    const reference = (window as any).__pendingReference;
    
    if (response.status === 'success' && reference) {
      handlePaymentSuccess(reference);
    } else if (reference) {
      handlePaymentFailure(reference, response.message || 'Transaction failed', JSON.stringify(response, null, 2), response);
    } else {
      setProcessing(false);
    }
  }, [handlePaymentSuccess, handlePaymentFailure, setProcessing]);

  // Paystack onClose - handle cancellation
  const paystackOnClose = useCallback(() => {
    console.log('Paystack modal closed by user');
    const reference = (window as any).__pendingReference;
    const assignmentId = (window as any).__pendingAssignmentId;
    const amount = (window as any).__pendingAmount;
    
    // IMPORTANT: Always set processing to false when modal closes
    setProcessing(false);
    
    if (!reference) {
      console.log('No pending reference found');
      (window as any).__pendingReference = null;
      (window as any).__pendingAmount = 0;
      (window as any).__pendingAssignmentId = null;
      return;
    }

    console.log('Processing cancellation for reference:', reference);

    // Update the payment to cancelled
    setTimeout(async () => {
      try {
        // Check if payment exists
        const { data: existingPayment, error: fetchError } = await supabase
          .from('payments')
          .select('*')
          .eq('transaction_reference', reference)
          .single();

        if (fetchError) {
          console.error('Error fetching payment:', fetchError);
          (window as any).__pendingReference = null;
          (window as any).__pendingAmount = 0;
          (window as any).__pendingAssignmentId = null;
          return;
        }

        if (!existingPayment) {
          console.log('No payment found for reference:', reference);
          (window as any).__pendingReference = null;
          (window as any).__pendingAmount = 0;
          (window as any).__pendingAssignmentId = null;
          return;
        }

        // Only update if still pending
        if (existingPayment.status === 'pending') {
          console.log('Updating payment to cancelled with metadata');
          
          const cancellationMetadata = {
            ...existingPayment.metadata,
            was_cancelled_by_user: true,
            cancelled_at: new Date().toISOString(),
            cancellation_reason: 'User closed payment window before completion',
            ip_address: userIP,
            user_agent: userAgent,
            fraud_risk: 'LOW - User-initiated cancellation',
            error_details: `
Payment Cancellation Details
---------------------------
Reference: ${reference}
Student: ${selectedChild?.first_name || 'N/A'} ${selectedChild?.last_name || 'N/A'}
Fee: ${selectedAssignment?.fee_name || 'N/A'}
Amount: ${formatCurrency(amount || 0)}
IP Address: ${userIP}
User Agent: ${userAgent}
Cancelled At: ${new Date().toISOString()}
Reason: User closed the payment window before completing the transaction.
Status: NO FUNDS DEDUCTED - User-initiated cancellation.
            `.trim()
          };

          const { data: updatedPayment, error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'cancelled',
              failure_reason: 'USER CANCELLED: Payment window closed before completion. NO FUNDS DEDUCTED.',
              updated_at: new Date().toISOString(),
              gateway_response: { 
                cancelled: true, 
                reason: 'User closed payment window before completion',
                timestamp: new Date().toISOString(),
                user_initiated: true,
                no_funds_deducted: true
              },
              metadata: cancellationMetadata
            })
            .eq('transaction_reference', reference)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating payment:', updateError);
            (window as any).__pendingReference = null;
            (window as any).__pendingAmount = 0;
            (window as any).__pendingAssignmentId = null;
            return;
          }

          console.log('Payment updated to cancelled:', updatedPayment);

          toast.error('🚫 You closed the payment window. No funds were deducted.');

          if (updatedPayment) {
            setSelectedFailedPayment(updatedPayment);
            setPaymentErrorType('cancelled');
            setShowErrorModal(true);
          }
          
          // Clear pending data
          (window as any).__pendingReference = null;
          (window as any).__pendingAmount = 0;
          (window as any).__pendingAssignmentId = null;
          
          // Refresh data to update UI
          await refreshData();
          await fetchPayments(selectedChild?.id || '');
          
          console.log('Data refreshed after cancellation');
        } else {
          console.log('Payment status is not pending:', existingPayment.status);
          (window as any).__pendingReference = null;
          (window as any).__pendingAmount = 0;
          (window as any).__pendingAssignmentId = null;
        }
      } catch (error) {
        console.error('Error in paystackOnClose:', error);
        (window as any).__pendingReference = null;
        (window as any).__pendingAmount = 0;
        (window as any).__pendingAssignmentId = null;
      }
    }, 2000);
  }, [selectedChild, selectedAssignment, userIP, userAgent, formatCurrency, setProcessing, setSelectedFailedPayment, setPaymentErrorType, setShowErrorModal, refreshData, fetchPayments]);

  // Pay with Paystack
  const handlePayWithPaystack = async () => {
    if (!selectedAssignment || !selectedChild) {
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
      (window as any).__pendingReference = reference;
      (window as any).__pendingAmount = amount;
      (window as any).__pendingAssignmentId = selectedAssignment.id;

      console.log('Starting Paystack payment with reference:', reference);

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
        email: selectedChild.email || user?.email || 'parent@example.com',
        amount: Math.round(amount * 100),
        ref: reference,
        currency: 'NGN',
        metadata: {
          student_id: selectedChild.id,
          student_name: `${selectedChild.first_name} ${selectedChild.last_name}`,
          assignment_id: selectedAssignment.id,
          fee_name: selectedAssignment.fee_name,
          fee_id: selectedAssignment.fee_id,
          payment_type: 'fee_payment',
          branch_id: selectedChild.branch_id,
          ip_address: userIP,
          user_agent: userAgent,
        },
        callback: paystackCallback,
        onClose: paystackOnClose,
      });

      handler.openIframe();

    } catch (error: any) {
      console.error('Paystack payment error:', error);
      
      let errorType: 'network' | 'gateway' | 'unknown' = 'unknown';
      if (error.message?.includes('network') || error.message?.includes('Network')) {
        errorType = 'network';
      } else if (error.message?.includes('gateway') || error.message?.includes('Paystack')) {
        errorType = 'gateway';
      }
      setPaymentErrorType(errorType);
      
      const errorMessage = errorType === 'network' 
        ? 'Network error: Unable to connect to payment gateway.'
        : errorType === 'gateway'
        ? 'Payment gateway is currently unavailable.'
        : error.message || 'Payment processing failed';
      
      const errorDetails = `Error: ${error.message || 'Unknown error'}\nStack: ${error.stack || 'No stack trace'}`;
      
      await savePaymentRecord({
        assignmentId: selectedAssignment.id,
        amount: amount,
        reference: reference,
        status: 'failed',
        failureReason: errorMessage,
        gatewayReference: reference,
        paymentMethod: 'paystack',
        errorDetails: errorDetails,
        gatewayResponse: { 
          error: true, 
          message: error.message || 'Payment processing failed',
          error_type: errorType,
        }
      });
      
      const { data: paymentRecord } = await supabase
        .from('payments')
        .select('*')
        .eq('transaction_reference', reference)
        .single();
      
      if (paymentRecord) {
        setSelectedFailedPayment(paymentRecord);
        setShowErrorModal(true);
      } else {
        setFailureReason(errorMessage);
        setFailureDetails(errorDetails);
        setShowFailure(true);
      }
      
      setProcessing(false);
      (window as any).__pendingReference = null;
      (window as any).__pendingAmount = 0;
      (window as any).__pendingAssignmentId = null;
    }
  };

  // ============================================
  // BANK TRANSFER HANDLING
  // ============================================

  const handleBankTransfer = async () => {
    if (!selectedAssignment || !selectedChild) {
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

      const savedPayment = await savePaymentRecord({
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
      await fetchPayments(selectedChild.id);

      const bankData = {
        ...savedPayment,
        amount_paid: amount,
        fee_name: selectedAssignment?.fee_name,
        fee_id: selectedAssignment?.fee_id,
        student_name: `${selectedChild?.first_name} ${selectedChild?.last_name}`,
        student_id: selectedChild?.student_id,
        reference: reference,
        payment_method: 'bank_transfer',
        status: 'pending',
        receipt_number: savedPayment?.receipt_number || `RCP-${Date.now()}`,
        transaction_reference: transactionReference,
        metadata: {
          fee_id: selectedAssignment?.fee_id,
          fee_name: selectedAssignment?.fee_name,
          assignment_id: selectedAssignment?.id,
          student_name: `${selectedChild?.first_name} ${selectedChild?.last_name}`,
          student_id: selectedChild?.id,
          reference: reference,
          transaction_reference: transactionReference,
          payment_method: 'bank_transfer',
          timestamp: new Date().toISOString(),
          ip_address: userIP,
          user_agent: userAgent,
        }
      };
      setBankTransferData(bankData);
      setShowBankTransferSuccess(true);
      setShowSuccess(true);
      setShowBankDetails(true);
      setProcessing(false);
      
      toast.success('💳 Bank transfer payment submitted! Waiting for approval.');

    } catch (error: any) {
      console.error('Bank transfer error:', error);
      
      let errorType: 'bank' | 'network' | 'unknown' = 'unknown';
      if (error.message?.includes('network') || error.message?.includes('upload')) {
        errorType = 'network';
      } else if (error.message?.includes('bank') || error.message?.includes('transfer')) {
        errorType = 'bank';
      }
      setPaymentErrorType(errorType);
      
      const errorDetails = `Error: ${error.message || 'Unknown error'}\nStack: ${error.stack || 'No stack trace'}`;
      
      await savePaymentRecord({
        assignmentId: selectedAssignment.id,
        amount: amount,
        reference: reference,
        status: 'failed',
        failureReason: error.message || 'Bank transfer submission failed',
        gatewayReference: reference,
        paymentMethod: 'bank_transfer',
        errorDetails: errorDetails,
        gatewayResponse: {
          error: true,
          error_type: errorType,
          message: error.message || 'Bank transfer submission failed',
        }
      });
      
      const { data: paymentRecord } = await supabase
        .from('payments')
        .select('*')
        .eq('transaction_reference', reference)
        .single();
      
      if (paymentRecord) {
        setSelectedFailedPayment(paymentRecord);
        setShowErrorModal(true);
      } else {
        setFailureReason(error.message || 'Failed to submit bank transfer. Please try again.');
        setFailureDetails(errorDetails);
        setShowFailure(true);
      }
      
      setProcessing(false);
      setUploading(false);
    }
  };

  // ============================================
  // STATUS HELPERS
  // ============================================

  const getPaymentStatusForAssignment = (assignment: any) => {
    // Check for cancelled payments first (highest priority)
    const hasCancelled = payments.some(p => 
      p.assignment_id === assignment.id && 
      (p.status === 'cancelled' || p.status === 'canceled')
    );
    
    const hasFailed = payments.some(p => 
      p.assignment_id === assignment.id && 
      (p.status === 'failed' || p.status === 'rejected')
    );
    
    const hasPending = payments.some(p => 
      p.assignment_id === assignment.id && 
      (p.status === 'pending' || p.status === 'processing')
    );
    
    let isPayable = false;
    let status = assignment.payment_status || 'unpaid';
    let label = 'Unpaid';
    let badgeColor = 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300';
    
    if (hasCancelled) {
      status = 'cancelled';
      label = 'Cancelled';
      badgeColor = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      isPayable = true;
    } else if (hasFailed) {
      status = 'failed';
      label = 'Failed';
      badgeColor = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      isPayable = true;
    } else if (hasPending) {
      status = 'pending';
      label = 'Awaiting Approval';
      badgeColor = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      isPayable = false;
    } else if (assignment.payment_status === 'paid' || assignment.payment_status === 'completed') {
      status = 'paid';
      label = 'Paid';
      badgeColor = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      isPayable = false;
    } else if (assignment.payment_status === 'waived') {
      status = 'waived';
      label = 'Exempted';
      badgeColor = 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      isPayable = false;
    } else if (assignment.payment_status === 'overdue') {
      status = 'overdue';
      label = 'Overdue';
      badgeColor = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      isPayable = true;
    } else if (assignment.balance > 0) {
      status = 'unpaid';
      label = 'Unpaid';
      badgeColor = 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300';
      isPayable = true;
    }
    
    return {
      status,
      label,
      badgeColor,
      isPayable,
    };
  };

  return {
    savePaymentRecord,
    updateAssignmentAfterPayment,
    handlePaymentSuccess,
    handlePaymentFailure,
    paystackCallback,
    paystackOnClose,
    handlePayWithPaystack,
    handleBankTransfer,
    getPaymentStatusForAssignment,
  };
};
