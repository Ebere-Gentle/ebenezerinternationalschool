// paymentService.ts

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

// ============================================
// SYNC MISSING ASSIGNMENTS
// ============================================
export async function syncStudentAssignments(
  studentId: string,
  branchId: string,
  classId?: string
): Promise<{ created: number; fees: any[] }> {
  try {
    let created = 0;
    const createdFees = [];

    // Get all active fees for this branch
    const { data: fees, error: feesError } = await supabase
      .from('fees')
      .select('*')
      .eq('branch_id', branchId)
      .eq('status', 'active');

    if (feesError) {
      console.error('Error fetching fees for sync:', feesError);
      return { created: 0, fees: [] };
    }

    // Get existing assignments for this student
    const { data: existingAssignments, error: existingError } = await supabase
      .from('student_fee_assignments')
      .select('fee_id')
      .eq('student_id', studentId);

    if (existingError) {
      console.error('Error fetching existing assignments:', existingError);
      return { created: 0, fees: [] };
    }

    const existingFeeIds = new Set(existingAssignments.map(a => a.fee_id));

    // Filter fees that apply to this student and don't have assignments
    const applicableFees = fees.filter(fee => {
      // Skip if already assigned
      if (existingFeeIds.has(fee.id)) return false;

      // Check if fee applies to this student
      if (fee.target_type === 'all') return true;

      if (fee.target_type === 'class' && classId) {
        return fee.target_ids?.includes(classId);
      }

      if (fee.target_type === 'student') {
        return fee.target_ids?.includes(studentId);
      }

      return false;
    });

    if (applicableFees.length === 0) {
      return { created: 0, fees: [] };
    }

    // Get the next assignment number
    const { data: lastAssignment } = await supabase
      .from('student_fee_assignments')
      .select('assignment_id')
      .order('assignment_id', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (lastAssignment && lastAssignment.length > 0 && lastAssignment[0].assignment_id) {
      const match = lastAssignment[0].assignment_id.match(/ASN-(\d+)-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[2]) + 1;
      }
    }

    const currentYear = new Date().getFullYear();

    // Create assignments
    for (const fee of applicableFees) {
      const assignmentId = `ASN-${currentYear}-${String(nextNumber).padStart(5, '0')}`;

      const { error: insertError } = await supabase
        .from('student_fee_assignments')
        .insert({
          assignment_id: assignmentId,
          student_id: studentId,
          fee_id: fee.id,
          branch_id: branchId,
          original_amount: fee.amount,
          discount_amount: 0,
          amount_due: fee.amount,
          amount_paid: 0,
          balance: fee.amount,
          payment_status: 'unpaid',
          due_date: fee.due_date,
          term: fee.term || 'Current Term',
          session: fee.session || 'Current Session',
          academic_session_id: fee.academic_session_id,
          payment_frequency: fee.payment_frequency || 'termly',
          assigned_from_fee: true,
          is_active: true,
          assigned_date: new Date().toISOString(),
          metadata: {
            fee_name: fee.name,
            category: fee.category,
            target_type: fee.target_type,
            target_ids: fee.target_ids,
            created_from: 'payment_service_sync'
          }
        });

      if (insertError) {
        console.error(`Error creating assignment for fee ${fee.name}:`, insertError);
      } else {
        created++;
        createdFees.push(fee);
        nextNumber++;
      }
    }

    return { created, fees: createdFees };
  } catch (error) {
    console.error('Error syncing student assignments:', error);
    return { created: 0, fees: [] };
  }
}

// ============================================
// GET STUDENT PAYMENT DASHBOARD (UPDATED)
// ============================================
export async function getStudentPaymentDashboard(
  studentId: string,
  branchId: string,
  options: { session?: string; term?: string } = {}
): Promise<StudentPaymentDashboard> {
  try {
    // First, get the student's class
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('class_id')
      .eq('id', studentId)
      .single();

    if (studentError) {
      console.error('Error fetching student:', studentError);
      // Continue without class_id
    }

    const classId = student?.class_id;

    // SYNC: Check for missing assignments and create them
    await syncStudentAssignments(studentId, branchId, classId);

    // Now fetch assignments with fee details
    let query = supabase
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

    if (options.session) {
      query = query.eq('session', options.session);
    }

    if (options.term) {
      query = query.eq('term', options.term);
    }

    const { data: assignmentsData, error: assignmentsError } = await query;

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      throw assignmentsError;
    }

    // Process assignments with fee details
    const processedAssignments: FeeAssignmentWithDetails[] = (assignmentsData || []).map((item: any) => ({
      ...item,
      fee_name: item.fee?.name || 'Unknown Fee',
      fee_category: item.fee?.category || 'Other',
      fee_description: item.fee?.description || '',
      fee_amount: item.fee?.amount || 0,
    }));

    // Get payments
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
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    const processedPayments: PaymentWithDetails[] = (paymentsData || []).map((item: any) => ({
      ...item,
      fee_name: item.fee?.name || 'Unknown Fee',
    }));

    // Calculate unpaid fees summary
    const unpaidFees: UnpaidFeeSummary[] = processedAssignments
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

    // Calculate stats
    const totalAssignments = processedAssignments.length;
    const paidAssignments = processedAssignments.filter(a => a.payment_status === 'paid' || a.balance === 0).length;
    const unpaidAssignments = processedAssignments.filter(a => a.balance > 0 && a.payment_status !== 'pending').length;
    const partialAssignments = processedAssignments.filter(a => a.payment_status === 'partial').length;
    const pendingAssignments = processedAssignments.filter(a => a.payment_status === 'pending').length;
    const overdueAssignments = processedAssignments.filter(a => a.payment_status === 'overdue' || (a.due_date && new Date(a.due_date) < new Date() && a.balance > 0)).length;
    const totalAmountDue = processedAssignments.reduce((sum, a) => sum + a.amount_due, 0);
    const totalAmountPaid = processedAssignments.reduce((sum, a) => sum + a.amount_paid, 0);
    const totalBalance = processedAssignments.reduce((sum, a) => sum + a.balance, 0);
    const collectionRate = totalAmountDue > 0 ? (totalAmountPaid / totalAmountDue) * 100 : 0;

    return {
      assignments: processedAssignments,
      payments: processedPayments,
      unpaidFees,
      stats: {
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
      },
    };
  } catch (error) {
    console.error('Error in getStudentPaymentDashboard:', error);
    // Return empty data structure
    return {
      assignments: [],
      payments: [],
      unpaidFees: [],
      stats: {
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
      },
    };
  }
}

// ============================================
// OTHER EXISTING FUNCTIONS
// ============================================
export async function getStudentPayments(studentId: string) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    const completed = data.filter(p => p.status === 'completed' || p.status === 'success').length;
    const pending = data.filter(p => p.status === 'pending' || p.status === 'processing').length;
    const failed = data.filter(p => p.status === 'failed').length;
    const rejected = data.filter(p => p.status === 'rejected').length;
    const totalPaid = data.filter(p => p.status === 'completed' || p.status === 'success').reduce((sum, p) => sum + p.amount_paid, 0);
    const totalDue = data.reduce((sum, p) => sum + p.amount, 0);
    const totalBalance = data.reduce((sum, p) => sum + (p.balance || 0), 0);

    return {
      data,
      stats: {
        total: data.length,
        completed,
        pending,
        failed,
        rejected,
        totalPaid,
        totalBalance,
        totalDue,
      },
    };
  } catch (error) {
    console.error('Error fetching payments:', error);
    return {
      data: [],
      stats: {
        total: 0,
        completed: 0,
        pending: 0,
        failed: 0,
        rejected: 0,
        totalPaid: 0,
        totalBalance: 0,
        totalDue: 0,
      },
    };
  }
}

export async function getUnpaidFees(studentId: string) {
  try {
    const { data, error } = await supabase
      .from('student_fee_assignments')
      .select(`
        *,
        fee:fees(
          id,
          name,
          category,
          amount,
          due_date
        )
      `)
      .eq('student_id', studentId)
      .eq('is_active', true)
      .eq('payment_status', 'unpaid');

    if (error) throw error;

    return (data || []).map((item: any) => ({
      ...item,
      fee_name: item.fee?.name || 'Unknown Fee',
      fee_category: item.fee?.category || 'Other',
    }));
  } catch (error) {
    console.error('Error fetching unpaid fees:', error);
    return [];
  }
}

export async function calculateStudentFeeBalances(studentId: string) {
  try {
    const { data, error } = await supabase
      .from('student_fee_assignments')
      .select('*')
      .eq('student_id', studentId)
      .eq('is_active', true);

    if (error) throw error;

    let totalDue = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    (data || []).forEach(a => {
      totalDue += a.amount_due || 0;
      totalPaid += a.amount_paid || 0;
      totalBalance += a.balance || 0;
    });

    return {
      totalDue,
      totalPaid,
      totalBalance,
      count: data?.length || 0,
    };
  } catch (error) {
    console.error('Error calculating balances:', error);
    return {
      totalDue: 0,
      totalPaid: 0,
      totalBalance: 0,
      count: 0,
    };
  }
}