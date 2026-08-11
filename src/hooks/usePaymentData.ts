// src/hooks/usePaymentData.ts — FULL FIXED VERSION

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase/client';

export interface FeeAssignmentWithDetails {
  id: string;
  assignment_id: string;
  student_id: string;
  fee_id: string;
  branch_id: string;
  original_amount: number;
  discount_amount: number;
  amount_due: number;
  amount_paid: number;
  balance: number;
  payment_status: string;
  assigned_date: string;
  due_date: string | null;
  is_active: boolean;
  term: string;
  session: string;
  academic_session_id: string | null;
  payment_frequency: string;
  assigned_from_fee: boolean;
  metadata: any;
  fee_name?: string;
  fee_category?: string;
  fee_description?: string;
  fee_amount?: number;
}

export interface PaymentWithDetails {
  id: string;
  receipt_number: string;
  student_id: string;
  assignment_id: string;
  fee_id: string;
  amount: number;
  amount_paid: number;
  balance: number;
  payment_method: string;
  payment_date: string;
  status: string;
  transaction_reference: string;
  gateway_reference: string | null;
  failure_reason: string | null;
  payment_proof_url: string | null;
  branch_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
  fee_name?: string;
}

export interface UnpaidFeeSummary {
  fee_id: string;
  fee_name: string;
  category: string;
  amount_due: number;
  amount_paid: number;
  balance: number;
  due_date: string | null;
  term: string;
  session: string;
  is_overdue: boolean;
  days_overdue: number;
}

export interface PaymentStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  rejected: number;
  totalPaid: number;
  totalBalance: number;
  totalDue: number;
}

export interface StudentPaymentDashboard {
  assignments: FeeAssignmentWithDetails[];
  payments: PaymentWithDetails[];
  unpaidFees: UnpaidFeeSummary[];
  stats: {
    totalAssignments: number;
    paidAssignments: number;
    unpaidAssignments: number;
    partialAssignments: number;
    pendingAssignments: number;
    overdueAssignments: number;
    totalAmountDue: number;
    totalAmountPaid: number;
    totalBalance: number;
    collectionRate: number;
  };
}

interface UsePaymentDataOptions {
  session?: string;
  term?: string;
  autoFetch?: boolean;
}

interface UsePaymentDataResult {
  loading: boolean;
  refreshing: boolean;
  assignments: FeeAssignmentWithDetails[];
  payments: PaymentWithDetails[];
  unpaidFees: UnpaidFeeSummary[];
  stats: {
    totalAssignments: number;
    paidAssignments: number;
    unpaidAssignments: number;
    partialAssignments: number;
    pendingAssignments: number;
    overdueAssignments: number;
    totalAmountDue: number;
    totalAmountPaid: number;
    totalBalance: number;
    collectionRate: number;
  };
  paymentStats: PaymentStats;
  refresh: () => Promise<void>;
  error: string | null;
}

export function usePaymentData(
  studentId: string | null,
  branchId: string | null,
  options: UsePaymentDataOptions = {}
): UsePaymentDataResult {
  const { session, term, autoFetch = true } = options;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<FeeAssignmentWithDetails[]>([]);
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [unpaidFees, setUnpaidFees] = useState<UnpaidFeeSummary[]>([]);
  const [stats, setStats] = useState({
    totalAssignments: 0,
    paidAssignments: 0,
    unpaidAssignments: 0,
    partialAssignments: 0,
    pendingAssignments: 0,
    overdueAssignments: 0,
    totalAmountDue: 0,
    totalAmountPaid: 0,
    totalBalance: 0,
    collectionRate: 0,
  });
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    rejected: 0,
    totalPaid: 0,
    totalBalance: 0,
    totalDue: 0,
  });

  const fetchData = useCallback(async (isRefresh: boolean = false) => {
    if (!studentId || !branchId) {
      console.log('No studentId or branchId provided, skipping fetch');
      setLoading(false);
      return;
    }

    console.log('fetchData called for student:', studentId, 'branch:', branchId);

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // ============================================
      // 1. GET ALL ASSIGNMENTS FOR THIS STUDENT
      // ============================================
      let assignmentsQuery = supabase
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
            metadata,
            target_type,
            target_ids,
            description
          )
        `)
        .eq('student_id', studentId)
        .eq('is_active', true);

      if (session) {
        assignmentsQuery = assignmentsQuery.eq('session', session);
      }
      if (term) {
        assignmentsQuery = assignmentsQuery.eq('term', term);
      }

      const { data: assignmentsData, error: assignmentsError } = await assignmentsQuery;

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        throw assignmentsError;
      }

      console.log('Assignments fetched:', assignmentsData?.length || 0);

      // ============================================
      // 2. GET ALL SUCCESSFUL PAYMENTS FOR THIS STUDENT
      // ============================================
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          fee:fees(
            id,
            name,
            category
          )
        `)
        .eq('student_id', studentId)
        .in('status', ['success', 'completed', 'approved', 'paid'])
        .order('payment_date', { ascending: false });

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        throw paymentsError;
      }

      console.log('Payments fetched:', paymentsData?.length || 0);

      // ============================================
      // 3. PROCESS ASSIGNMENTS WITH CORRECT CALCULATIONS
      // ============================================
      const processedAssignments: FeeAssignmentWithDetails[] = (assignmentsData || []).map((assignment: any) => {
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

        // Determine status based on payments
        let paymentStatus = assignment.payment_status || 'unpaid';
        if (balance <= 0) {
          paymentStatus = 'paid';
        } else if (totalPaidFromPayments > 0 && balance > 0) {
          paymentStatus = 'partial';
        }

        // Check for overdue
        if (paymentStatus !== 'paid' && assignment.due_date && new Date(assignment.due_date) < new Date()) {
          paymentStatus = 'overdue';
        }

        return {
          ...assignment,
          fee_name: assignment.fee?.name || 'Unknown Fee',
          fee_category: assignment.fee?.category || 'Other',
          fee_description: assignment.fee?.description || '',
          fee_amount: assignment.fee?.amount || 0,
          // Override with calculated values
          amount_paid: totalPaidFromPayments,
          balance: balance,
          payment_status: paymentStatus,
        };
      });

      // ============================================
      // 4. PROCESS PAYMENTS WITH FEE DETAILS
      // ============================================
      const processedPayments: PaymentWithDetails[] = (paymentsData || []).map((item: any) => ({
        ...item,
        fee_name: item.fee?.name || 'Unknown Fee',
      }));

      // ============================================
      // 5. CALCULATE STATS
      // ============================================
      const totalAssignments = processedAssignments.length;
      const paidAssignments = processedAssignments.filter(a => a.payment_status === 'paid' || a.balance === 0).length;
      const partialAssignments = processedAssignments.filter(a => a.payment_status === 'partial').length;
      const unpaidAssignments = processedAssignments.filter(a => a.payment_status === 'unpaid' && a.balance > 0).length;
      const pendingAssignments = processedAssignments.filter(a => a.payment_status === 'pending').length;
      const overdueAssignments = processedAssignments.filter(a => a.payment_status === 'overdue').length;
      const totalAmountDue = processedAssignments.reduce((sum, a) => sum + a.amount_due, 0);
      const totalAmountPaid = processedAssignments.reduce((sum, a) => sum + a.amount_paid, 0);
      const totalBalance = processedAssignments.reduce((sum, a) => sum + a.balance, 0);
      const collectionRate = totalAmountDue > 0 ? (totalAmountPaid / totalAmountDue) * 100 : 0;

      // ============================================
      // 6. CALCULATE PAYMENT STATS
      // ============================================
      const completed = (paymentsData || []).filter(p => p.status === 'completed' || p.status === 'success').length;
      const pending = (paymentsData || []).filter(p => p.status === 'pending' || p.status === 'processing').length;
      const failed = (paymentsData || []).filter(p => p.status === 'failed').length;
      const rejected = (paymentsData || []).filter(p => p.status === 'rejected').length;
      const totalPaidAmount = (paymentsData || []).reduce((sum, p) => sum + (p.amount_paid || p.amount || 0), 0);

      // ============================================
      // 7. UNPAID FEES
      // ============================================
      const unpaidFeesData: UnpaidFeeSummary[] = processedAssignments
        .filter(a => a.balance > 0 && a.payment_status !== 'pending')
        .map(a => {
          const isOverdue = a.due_date ? new Date(a.due_date) < new Date() : false;
          const daysOverdue = isOverdue ? Math.floor((Date.now() - new Date(a.due_date!).getTime()) / (1000 * 60 * 60 * 24)) : 0;
          return {
            fee_id: a.fee_id,
            fee_name: a.fee_name || 'Unknown Fee',
            category: a.fee_category || 'Other',
            amount_due: a.amount_due,
            amount_paid: a.amount_paid,
            balance: a.balance,
            due_date: a.due_date,
            term: a.term,
            session: a.session,
            is_overdue: isOverdue,
            days_overdue: daysOverdue,
          };
        });

      setAssignments(processedAssignments);
      setPayments(processedPayments);
      setUnpaidFees(unpaidFeesData);
      setStats({
        totalAssignments,
        paidAssignments,
        unpaidAssignments,
        partialAssignments,
        pendingAssignments,
        overdueAssignments,
        totalAmountDue,
        totalAmountPaid,
        totalBalance,
        collectionRate,
      });
      setPaymentStats({
        total: (paymentsData || []).length,
        completed,
        pending,
        failed,
        rejected,
        totalPaid: totalPaidAmount,
        totalBalance,
        totalDue: totalAmountDue,
      });

    } catch (err: any) {
      console.error('Error fetching payment data:', err);
      setError(err.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId, branchId, session, term]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    if (autoFetch && studentId && branchId) {
      console.log('Auto-fetching payment data for student:', studentId);
      fetchData(false);
    }
  }, [autoFetch, studentId, branchId, fetchData]);

  return {
    loading,
    refreshing,
    assignments,
    payments,
    unpaidFees,
    stats,
    paymentStats,
    refresh,
    error,
  };
}