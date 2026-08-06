import { supabase } from '../config/supabase/client';
import dayjs from 'dayjs';

export interface PaymentWithDetails {
  id: string;
  payment_id: string;
  receipt_number: string;
  student_id: string;
  fee_id: string;
  assignment_id: string;
  amount: number;
  amount_paid: number;
  balance: number;
  payment_method: string;
  payment_date: string;
  due_date: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'paid' | 'approved' | 'rejected';
  transaction_reference: string;
  gateway_reference?: string;
  failure_reason?: string;
  rejection_reason?: string;
  payment_proof_url?: string;
  payment_proof_path?: string;
  branch_id: string;
  created_at: string;
  updated_at: string;
  fee_name?: string;
  fee_category?: string;
  student_name?: string;
  student_admission?: string;
  class_name?: string;
}

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
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'waived' | 'pending';
  assigned_date: string;
  due_date: string | null;
  is_active: boolean;
  term: string | null;
  session: string | null;
  fee_name: string;
  fee_category: string;
  fee_description?: string;
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

export interface UnpaidFeeSummary {
  id: string;
  name: string;
  amount: number;
  category: string;
  due_date: string;
  balance: number;
  is_overdue: boolean;
  payment_status: 'unpaid' | 'partial' | 'pending' | 'paid';
  assignment_id: string;
  fee_id: string;
}

export async function calculateStudentFeeBalances(
  studentId: string,
  branchId: string,
  options?: {
    session?: string;
    term?: string;
    includePaid?: boolean;
  }
): Promise<FeeAssignmentWithDetails[]> {
  try {
    let query = supabase
      .from('student_fee_assignments')
      .select(`
        *,
        fees!inner (
          id,
          name,
          category,
          description,
          amount
        )
      `)
      .eq('student_id', studentId)
      .eq('is_active', true);

    if (options?.session) {
      query = query.eq('session', options.session);
    }
    if (options?.term) {
      query = query.eq('term', options.term);
    }

    const { data: assignments, error: assignmentsError } = await query;

    if (assignmentsError) throw assignmentsError;
    if (!assignments || assignments.length === 0) {
      return [];
    }

    // Get ONLY successful/completed payments
    const { data: allPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .in('status', ['completed', 'paid', 'approved']);

    if (paymentsError) throw paymentsError;

    // Also get pending payments to detect them
    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'pending');

    const pendingAssignmentIds = new Set(
      pendingPayments?.map(p => p.assignment_id) || []
    );

    const results: FeeAssignmentWithDetails[] = assignments.map(assignment => {
      // Only use successful payments for this assignment
      const assignmentPayments = (allPayments || []).filter(
        p => p.assignment_id === assignment.id
      );
      
      const totalCompletedPaid = assignmentPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);

      const hasPending = pendingAssignmentIds.has(assignment.id);

      // Calculate amounts based ONLY on successful payments
      let amountPaid = totalCompletedPaid;
      let balance = Math.max(0, assignment.amount_due - totalCompletedPaid);
      let effectiveStatus: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'waived' | 'pending';
      
      if (assignment.payment_status === 'waived') {
        effectiveStatus = 'waived';
        balance = 0;
        amountPaid = assignment.amount_due;
      } else if (hasPending) {
        effectiveStatus = 'pending';
      } else if (totalCompletedPaid >= assignment.amount_due) {
        effectiveStatus = 'paid';
        balance = 0;
        amountPaid = assignment.amount_due;
      } else if (totalCompletedPaid > 0 && balance > 0) {
        effectiveStatus = 'partial';
      } else {
        // Check if overdue
        if (assignment.due_date && dayjs(assignment.due_date).isBefore(dayjs()) && balance > 0) {
          effectiveStatus = 'overdue';
        } else {
          effectiveStatus = 'unpaid';
        }
      }

      return {
        id: assignment.id,
        assignment_id: assignment.assignment_id || assignment.id,
        student_id: assignment.student_id,
        fee_id: assignment.fee_id,
        branch_id: assignment.branch_id,
        original_amount: assignment.original_amount || assignment.amount_due,
        discount_amount: assignment.discount_amount || 0,
        amount_due: assignment.amount_due,
        amount_paid: amountPaid,
        balance: balance,
        payment_status: effectiveStatus,
        assigned_date: assignment.assigned_date,
        due_date: assignment.due_date,
        is_active: assignment.is_active,
        term: assignment.term,
        session: assignment.session,
        fee_name: assignment.fees?.name || 'Unknown Fee',
        fee_category: assignment.fees?.category || 'Other',
        fee_description: assignment.fees?.description || '',
      };
    });

    if (!options?.includePaid) {
      return results.filter(r => r.payment_status !== 'paid' && r.payment_status !== 'waived');
    }

    return results;
  } catch (error) {
    console.error('Error calculating student fee balances:', error);
    throw error;
  }
}

export async function getStudentPayments(
  studentId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: string[];
    search?: string;
  }
): Promise<{ payments: PaymentWithDetails[]; total: number; stats: PaymentStats }> {
  try {
    let query = supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('student_id', studentId);

    if (options?.status && options.status.length > 0) {
      query = query.in('status', options.status);
    }

    if (options?.search) {
      query = query.or(
        `receipt_number.ilike.%${options.search}%,` +
        `transaction_reference.ilike.%${options.search}%`
      );
    }

    query = query.order('payment_date', { ascending: false });

    if (options?.limit) {
      query = query.range(options.offset || 0, (options.offset || 0) + options.limit - 1);
    }

    const { data: payments, error, count } = await query;

    if (error) throw error;

    const feeIds = [...new Set(payments?.map(p => p.fee_id).filter(Boolean) || [])];
    let feeNameMap: Record<string, { name: string; category: string }> = {};

    if (feeIds.length > 0) {
      const { data: fees } = await supabase
        .from('fees')
        .select('id, name, category')
        .in('id', feeIds);

      if (fees) {
        feeNameMap = fees.reduce((acc, fee) => {
          acc[fee.id] = { name: fee.name, category: fee.category || 'Other' };
          return acc;
        }, {} as Record<string, { name: string; category: string }>);
      }
    }

    const paymentsWithDetails = (payments || []).map(payment => ({
      ...payment,
      fee_name: payment.fee_id ? feeNameMap[payment.fee_id]?.name || 'N/A' : 'N/A',
      fee_category: payment.fee_id ? feeNameMap[payment.fee_id]?.category || 'Other' : 'Other',
    }));

    // Calculate stats - ONLY count successful payments for totalPaid
    const successfulPayments = paymentsWithDetails.filter(p => 
      p.status === 'completed' || p.status === 'paid' || p.status === 'approved'
    );
    
    const stats: PaymentStats = {
      total: paymentsWithDetails.length,
      completed: successfulPayments.length,
      pending: paymentsWithDetails.filter(p => p.status === 'pending').length,
      failed: paymentsWithDetails.filter(p => p.status === 'failed' || p.status === 'rejected').length,
      rejected: paymentsWithDetails.filter(p => p.status === 'rejected').length,
      // ONLY sum successful payments for totalPaid
      totalPaid: successfulPayments.reduce((sum, p) => sum + p.amount_paid, 0),
      totalBalance: 0,
      totalDue: 0,
    };

    return {
      payments: paymentsWithDetails,
      total: count || 0,
      stats,
    };
  } catch (error) {
    console.error('Error getting student payments:', error);
    throw error;
  }
}

export async function getUnpaidFees(
  studentId: string,
  branchId: string,
  options?: {
    session?: string;
    term?: string;
    includePending?: boolean;
  }
): Promise<UnpaidFeeSummary[]> {
  try {
    const assignments = await calculateStudentFeeBalances(studentId, branchId, {
      session: options?.session,
      term: options?.term,
      includePaid: false,
    });

    // Get pending payments to mark them
    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('assignment_id, status')
      .eq('student_id', studentId)
      .eq('status', 'pending');

    const pendingAssignmentIds = new Set(
      pendingPayments?.map(p => p.assignment_id) || []
    );

    const unpaidFees: UnpaidFeeSummary[] = assignments
      .filter(a => {
        if (a.payment_status === 'paid' || a.payment_status === 'waived') return false;
        if (!options?.includePending && pendingAssignmentIds.has(a.id)) return false;
        return true;
      })
      .map(a => ({
        id: a.id,
        name: a.fee_name,
        amount: a.amount_due,
        category: a.fee_category,
        due_date: a.due_date || '',
        balance: a.balance,
        is_overdue: a.due_date ? dayjs(a.due_date).isBefore(dayjs()) && a.balance > 0 : false,
        payment_status: pendingAssignmentIds.has(a.id) ? 'pending' : 
          a.payment_status === 'partial' ? 'partial' : 'unpaid',
        assignment_id: a.assignment_id,
        fee_id: a.fee_id,
      }))
      .sort((a, b) => {
        if (a.payment_status === 'pending' && b.payment_status !== 'pending') return -1;
        if (b.payment_status === 'pending' && a.payment_status !== 'pending') return 1;
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        if (a.due_date && b.due_date) {
          return dayjs(a.due_date).diff(dayjs(b.due_date));
        }
        return 0;
      });

    return unpaidFees;
  } catch (error) {
    console.error('Error getting unpaid fees:', error);
    throw error;
  }
}

export async function getStudentPaymentDashboard(
  studentId: string,
  branchId: string,
  options?: {
    session?: string;
    term?: string;
  }
): Promise<{
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
}> {
  try {
    const allAssignments = await calculateStudentFeeBalances(studentId, branchId, {
      session: options?.session,
      term: options?.term,
      includePaid: true,
    });

    const unpaidFees = await getUnpaidFees(studentId, branchId, {
      session: options?.session,
      term: options?.term,
      includePending: true,
    });

    const { payments, stats: paymentStats } = await getStudentPayments(studentId);

    // Calculate stats based on assignments (which already filter out failed payments)
    const totalAmountDue = allAssignments.reduce((sum, a) => sum + a.amount_due, 0);
    // Only count successful payments from the payment stats
    const totalAmountPaid = paymentStats.totalPaid;
    const totalBalance = allAssignments
      .filter(a => a.payment_status !== 'paid' && a.payment_status !== 'waived' && a.payment_status !== 'pending')
      .reduce((sum, a) => sum + a.balance, 0);
    
    const collectionRate = totalAmountDue > 0 ? (totalAmountPaid / totalAmountDue) * 100 : 0;

    const stats = {
      totalAssignments: allAssignments.length,
      paidAssignments: allAssignments.filter(a => a.payment_status === 'paid' || a.payment_status === 'waived').length,
      unpaidAssignments: allAssignments.filter(a => a.payment_status === 'unpaid').length,
      partialAssignments: allAssignments.filter(a => a.payment_status === 'partial').length,
      pendingAssignments: allAssignments.filter(a => a.payment_status === 'pending').length,
      overdueAssignments: allAssignments.filter(a => a.payment_status === 'overdue').length,
      totalAmountDue,
      totalAmountPaid,
      totalBalance,
      collectionRate,
    };

    return {
      assignments: allAssignments,
      payments,
      unpaidFees,
      stats,
    };
  } catch (error) {
    console.error('Error getting student payment dashboard:', error);
    throw error;
  }
}
