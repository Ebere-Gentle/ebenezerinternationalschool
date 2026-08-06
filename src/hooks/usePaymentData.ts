import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase/client';
import {
  calculateStudentFeeBalances,
  getStudentPayments,
  getUnpaidFees,
  getStudentPaymentDashboard,
  type FeeAssignmentWithDetails,
  type PaymentWithDetails,
  type UnpaidFeeSummary,
  type PaymentStats,
} from '../services/paymentService';

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
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const dashboard = await getStudentPaymentDashboard(studentId, branchId, {
        session,
        term,
      });

      setAssignments(dashboard.assignments);
      setPayments(dashboard.payments);
      setUnpaidFees(dashboard.unpaidFees);
      setStats(dashboard.stats);

      const { stats: pStats } = await getStudentPayments(studentId);
      setPaymentStats(pStats);

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
      fetchData(false);
    }
  }, [autoFetch, studentId, branchId, session, term]);

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
