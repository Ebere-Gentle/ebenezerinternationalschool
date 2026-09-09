
// src/hooks/usePaymentData.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase/client';

/* ============================================================
   TYPES
============================================================ */

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

/* ============================================================
   CONSTANTS
============================================================ */

const SUCCESSFUL_PAYMENT_STATUSES = [
  'success',
  'completed',
  'approved',
  'paid',
];

const PENDING_PAYMENT_STATUSES = [
  'pending',
  'processing',
];

const FAILED_PAYMENT_STATUSES = [
  'failed',
];

const REJECTED_PAYMENT_STATUSES = [
  'rejected',
];

/**
 * Database-valid assignment statuses.
 *
 * IMPORTANT:
 * student_fee_assignments.payment_status has a CHECK constraint.
 * "pending" is NOT a valid assignment status.
 */
const VALID_ASSIGNMENT_STATUSES = {
  unpaid: 'unpaid',
  partial: 'partial',
  paid: 'paid',
  overdue: 'overdue',
  waived: 'waived',
  inactive: 'inactive',
} as const;

/* ============================================================
   HELPERS
============================================================ */

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
};

const roundMoney = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const safeDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const isPastDue = (dueDate: string | null): boolean => {
  if (!dueDate) {
    return false;
  }

  const due = safeDate(dueDate);

  if (!due) {
    return false;
  }

  const now = new Date();

  // Compare calendar dates rather than exact timestamps.
  const dueDay = new Date(
    due.getFullYear(),
    due.getMonth(),
    due.getDate()
  );

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  return dueDay < today;
};

const calculateDaysOverdue = (dueDate: string | null): number => {
  if (!dueDate) {
    return 0;
  }

  const due = safeDate(dueDate);

  if (!due) {
    return 0;
  }

  const now = new Date();

  const dueDay = new Date(
    due.getFullYear(),
    due.getMonth(),
    due.getDate()
  );

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const difference =
    today.getTime() - dueDay.getTime();

  if (difference <= 0) {
    return 0;
  }

  return Math.floor(
    difference / (1000 * 60 * 60 * 24)
  );
};

/**
 * Gets the actual payment amount.
 *
 * Priority:
 * 1. amount_paid when it is a valid positive number
 * 2. amount
 *
 * We deliberately DO NOT add both values together because many
 * payment records contain both columns representing the same
 * transaction amount.
 */
const getPaymentAmount = (payment: any): number => {
  const amountPaid = toNumber(payment?.amount_paid, 0);

  if (amountPaid > 0) {
    return roundMoney(amountPaid);
  }

  return roundMoney(
    Math.max(0, toNumber(payment?.amount, 0))
  );
};

/**
 * Calculates the database-valid assignment status.
 */
const calculateAssignmentStatus = (
  amountDue: number,
  amountPaid: number,
  dueDate: string | null,
  currentStatus?: string | null
): string => {
  const due = roundMoney(Math.max(0, amountDue));
  const paid = roundMoney(Math.max(0, amountPaid));

  /*
   * Preserve waived status when it is already explicitly waived.
   */
  if (currentStatus === VALID_ASSIGNMENT_STATUSES.waived) {
    return VALID_ASSIGNMENT_STATUSES.waived;
  }

  /*
   * Fully paid.
   */
  if (due <= 0 || paid >= due) {
    return VALID_ASSIGNMENT_STATUSES.paid;
  }

  /*
   * Partially paid.
   */
  if (paid > 0) {
    return VALID_ASSIGNMENT_STATUSES.partial;
  }

  /*
   * Overdue only when there is an outstanding balance.
   */
  if (isPastDue(dueDate)) {
    return VALID_ASSIGNMENT_STATUSES.overdue;
  }

  return VALID_ASSIGNMENT_STATUSES.unpaid;
};

/* ============================================================
   HOOK
============================================================ */

export function usePaymentData(
  studentId: string | null,
  branchId: string | null,
  options: UsePaymentDataOptions = {}
): UsePaymentDataResult {
  const {
    session,
    term,
    autoFetch = true,
  } = options;

  /* ==========================================================
     STATE
  ========================================================== */

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<
    FeeAssignmentWithDetails[]
  >([]);

  const [payments, setPayments] = useState<
    PaymentWithDetails[]
  >([]);

  const [unpaidFees, setUnpaidFees] = useState<
    UnpaidFeeSummary[]
  >([]);

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

  const [paymentStats, setPaymentStats] =
    useState<PaymentStats>({
      total: 0,

      completed: 0,
      pending: 0,
      failed: 0,
      rejected: 0,

      totalPaid: 0,
      totalBalance: 0,
      totalDue: 0,
    });

  /* ==========================================================
     FETCH DATA
  ========================================================== */

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!studentId || !branchId) {
        console.log(
          '[usePaymentData] Missing studentId or branchId'
        );

        setAssignments([]);
        setPayments([]);
        setUnpaidFees([]);

        setStats({
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

        setPaymentStats({
          total: 0,
          completed: 0,
          pending: 0,
          failed: 0,
          rejected: 0,

          totalPaid: 0,
          totalBalance: 0,
          totalDue: 0,
        });

        setLoading(false);
        setRefreshing(false);

        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        console.log(
          '[usePaymentData] Fetching payment data',
          {
            studentId,
            branchId,
            session,
            term,
          }
        );

        /* ======================================================
           1. FETCH ACTIVE ASSIGNMENTS
        ====================================================== */

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
          .eq('branch_id', branchId)
          .eq('is_active', true);

        /*
         * Filter by assignment session/term.
         *
         * This is preferable to filtering only the fee because
         * assignments represent the student's actual obligation.
         */
        if (session) {
          assignmentsQuery =
            assignmentsQuery.eq('session', session);
        }

        if (term) {
          assignmentsQuery =
            assignmentsQuery.eq('term', term);
        }

        const {
          data: assignmentsData,
          error: assignmentsError,
        } = await assignmentsQuery.order(
          'assigned_date',
          {
            ascending: false,
          }
        );

        if (assignmentsError) {
          console.error(
            '[usePaymentData] Assignment error:',
            assignmentsError
          );

          throw assignmentsError;
        }

        console.log(
          '[usePaymentData] Assignments fetched:',
          assignmentsData?.length || 0
        );

        /* ======================================================
           2. FETCH PAYMENTS
        ====================================================== */

        /*
         * Payments are fetched for this student AND branch.
         *
         * We intentionally fetch successful payments only for
         * assignment calculations because pending/failed payments
         * must not reduce the student's balance.
         *
         * We also fetch pending/failed/rejected records below for
         * payment statistics.
         */

        const {
          data: paymentsData,
          error: paymentsError,
        } = await supabase
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
          .eq('branch_id', branchId)
          .order('payment_date', {
            ascending: false,
          });

        if (paymentsError) {
          console.error(
            '[usePaymentData] Payment error:',
            paymentsError
          );

          throw paymentsError;
        }

        console.log(
          '[usePaymentData] Payments fetched:',
          paymentsData?.length || 0
        );

        /* ======================================================
           3. MAP PAYMENTS
        ====================================================== */

        const allPayments = paymentsData || [];

        /*
         * Successful payments only.
         *
         * These are the only payment records allowed to reduce
         * an assignment balance.
         */
        const successfulPayments =
          allPayments.filter((payment: any) =>
            SUCCESSFUL_PAYMENT_STATUSES.includes(
              String(payment.status || '').toLowerCase()
            )
          );

        /* ======================================================
           4. PROCESS ASSIGNMENTS
        ====================================================== */

        const processedAssignments: FeeAssignmentWithDetails[] =
          (assignmentsData || []).map(
            (assignment: any) => {
              /*
               * Match successful payments using the assignment
               * database UUID.
               */
              const assignmentPayments =
                successfulPayments.filter(
                  (payment: any) =>
                    payment.assignment_id === assignment.id
                );

              /*
               * Payment records are the source of truth for the
               * amount actually paid.
               */
              const totalPaidFromPayments =
                roundMoney(
                  assignmentPayments.reduce(
                    (
                      sum: number,
                      payment: any
                    ) =>
                      sum +
                      getPaymentAmount(payment),
                    0
                  )
                );

              /*
               * Assignment amount.
               *
               * amount_due is the actual current obligation.
               * original_amount is the fallback.
               */
              const originalAmount = roundMoney(
                Math.max(
                  0,
                  toNumber(
                    assignment.original_amount,
                    0
                  )
                )
              );

              const discountAmount = roundMoney(
                Math.max(
                  0,
                  toNumber(
                    assignment.discount_amount,
                    0
                  )
                )
              );

              const storedAmountDue =
                toNumber(
                  assignment.amount_due,
                  NaN
                );

              let amountDue: number;

              if (Number.isFinite(storedAmountDue)) {
                amountDue = Math.max(
                  0,
                  roundMoney(storedAmountDue)
                );
              } else {
                amountDue = Math.max(
                  0,
                  roundMoney(
                    originalAmount -
                      discountAmount
                  )
                );
              }

              /*
               * Never allow the calculated paid amount to exceed
               * the amount due in the displayed balance.
               */
              const amountPaid = roundMoney(
                Math.min(
                  Math.max(
                    0,
                    totalPaidFromPayments
                  ),
                  amountDue
                )
              );

              const balance = roundMoney(
                Math.max(
                  0,
                  amountDue - amountPaid
                )
              );

              const dueDate =
                assignment.due_date ??
                assignment.fee?.due_date ??
                null;

              const paymentStatus =
                calculateAssignmentStatus(
                  amountDue,
                  amountPaid,
                  dueDate,
                  assignment.payment_status
                );

              return {
                ...assignment,

                fee_name:
                  assignment.fee?.name ||
                  'Unknown Fee',

                fee_category:
                  assignment.fee?.category ||
                  'Other',

                fee_description:
                  assignment.fee?.description ||
                  '',

                fee_amount:
                  toNumber(
                    assignment.fee?.amount,
                    amountDue
                  ),

                original_amount:
                  originalAmount,

                discount_amount:
                  discountAmount,

                amount_due:
                  amountDue,

                amount_paid:
                  amountPaid,

                balance,

                payment_status:
                  paymentStatus,

                due_date:
                  dueDate,

                term:
                  assignment.term ??
                  assignment.fee?.term ??
                  '',

                session:
                  assignment.session ??
                  assignment.fee?.session ??
                  '',
              };
            }
          );

        /* ======================================================
           5. PROCESS PAYMENTS
        ====================================================== */

        const processedPayments: PaymentWithDetails[] =
          allPayments.map((payment: any) => ({
            ...payment,

            fee_name:
              payment.fee?.name ||
              'Unknown Fee',
          }));

        /* ======================================================
           6. ASSIGNMENT STATISTICS
        ====================================================== */

        const totalAssignments =
          processedAssignments.length;

        const paidAssignments =
          processedAssignments.filter(
            (assignment) =>
              assignment.payment_status ===
                VALID_ASSIGNMENT_STATUSES.paid ||
              assignment.balance <= 0
          ).length;

        const partialAssignments =
          processedAssignments.filter(
            (assignment) =>
              assignment.payment_status ===
              VALID_ASSIGNMENT_STATUSES.partial
          ).length;

        const overdueAssignments =
          processedAssignments.filter(
            (assignment) =>
              assignment.payment_status ===
              VALID_ASSIGNMENT_STATUSES.overdue
          ).length;

        const unpaidAssignments =
          processedAssignments.filter(
            (assignment) =>
              assignment.payment_status ===
                VALID_ASSIGNMENT_STATUSES.unpaid &&
              assignment.balance > 0
          ).length;

        /*
         * "pendingAssignments" is kept for compatibility with
         * existing UI code.
         *
         * Database assignment statuses do NOT include pending.
         * Therefore this value remains zero unless your application
         * later introduces a separate pending-assignment concept.
         */
        const pendingAssignments = 0;

        const totalAmountDue =
          roundMoney(
            processedAssignments.reduce(
              (sum, assignment) =>
                sum +
                Math.max(
                  0,
                  toNumber(
                    assignment.amount_due,
                    0
                  )
                ),
              0
            )
          );

        const totalAmountPaid =
          roundMoney(
            processedAssignments.reduce(
              (sum, assignment) =>
                sum +
                Math.max(
                  0,
                  toNumber(
                    assignment.amount_paid,
                    0
                  )
                ),
              0
            )
          );

        const totalBalance =
          roundMoney(
            Math.max(
              0,
              totalAmountDue -
                totalAmountPaid
            )
          );

        const collectionRate =
          totalAmountDue > 0
            ? roundMoney(
                Math.min(
                  100,
                  Math.max(
                    0,
                    (totalAmountPaid /
                      totalAmountDue) *
                      100
                  )
                )
              )
            : 0;

        /* ======================================================
           7. PAYMENT STATISTICS
        ====================================================== */

        const completed =
          allPayments.filter(
            (payment: any) =>
              SUCCESSFUL_PAYMENT_STATUSES.includes(
                String(
                  payment.status || ''
                ).toLowerCase()
              )
          ).length;

        const pending =
          allPayments.filter(
            (payment: any) =>
              PENDING_PAYMENT_STATUSES.includes(
                String(
                  payment.status || ''
                ).toLowerCase()
              )
          ).length;

        const failed =
          allPayments.filter(
            (payment: any) =>
              FAILED_PAYMENT_STATUSES.includes(
                String(
                  payment.status || ''
                ).toLowerCase()
              )
          ).length;

        const rejected =
          allPayments.filter(
            (payment: any) =>
              REJECTED_PAYMENT_STATUSES.includes(
                String(
                  payment.status || ''
                ).toLowerCase()
              )
          ).length;

        const totalPaidAmount =
          roundMoney(
            successfulPayments.reduce(
              (sum: number, payment: any) =>
                sum +
                getPaymentAmount(payment),
              0
            )
          );

        /* ======================================================
           8. UNPAID FEES
        ====================================================== */

        const unpaidFeesData: UnpaidFeeSummary[] =
          processedAssignments
            .filter(
              (assignment) =>
                assignment.balance > 0 &&
                assignment.payment_status !==
                  VALID_ASSIGNMENT_STATUSES.waived
            )
            .map((assignment) => {
              const isOverdue =
                isPastDue(
                  assignment.due_date
                );

              const daysOverdue =
                isOverdue
                  ? calculateDaysOverdue(
                      assignment.due_date
                    )
                  : 0;

              return {
                fee_id:
                  assignment.fee_id,

                fee_name:
                  assignment.fee_name ||
                  'Unknown Fee',

                category:
                  assignment.fee_category ||
                  'Other',

                amount_due:
                  assignment.amount_due,

                amount_paid:
                  assignment.amount_paid,

                balance:
                  assignment.balance,

                due_date:
                  assignment.due_date,

                term:
                  assignment.term,

                session:
                  assignment.session,

                is_overdue: isOverdue,

                days_overdue: daysOverdue,
              };
            });

        /* ======================================================
           9. UPDATE STATE
        ====================================================== */

        setAssignments(
          processedAssignments
        );

        setPayments(
          processedPayments
        );

        setUnpaidFees(
          unpaidFeesData
        );

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
          total: allPayments.length,

          completed,

          pending,

          failed,

          rejected,

          totalPaid:
            totalPaidAmount,

          totalBalance,

          totalDue:
            totalAmountDue,
        });

        console.log(
          '[usePaymentData] Payment data processed',
          {
            assignments:
              totalAssignments,

            due:
              totalAmountDue,

            paid:
              totalAmountPaid,

            balance:
              totalBalance,

            collectionRate,
          }
        );
      } catch (err: any) {
        console.error(
          '[usePaymentData] Error:',
          err
        );

        const message =
          err?.message ||
          'Failed to load payment data';

        setError(message);

        /*
         * Do not leave stale payment information visible after
         * a failed refresh.
         */
        if (!isRefresh) {
          setAssignments([]);
          setPayments([]);
          setUnpaidFees([]);

          setStats({
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

          setPaymentStats({
            total: 0,
            completed: 0,
            pending: 0,
            failed: 0,
            rejected: 0,

            totalPaid: 0,
            totalBalance: 0,
            totalDue: 0,
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      studentId,
      branchId,
      session,
      term,
    ]
  );

  /* ==========================================================
     REFRESH
  ========================================================== */

  const refresh = useCallback(
    async () => {
      await fetchData(true);
    },
    [fetchData]
  );

  /* ==========================================================
     AUTO FETCH
  ========================================================== */

  useEffect(() => {
    if (
      autoFetch &&
      studentId &&
      branchId
    ) {
      console.log(
        '[usePaymentData] Auto-fetch:',
        {
          studentId,
          branchId,
          session,
          term,
        }
      );

      fetchData(false);
    }
  }, [
    autoFetch,
    studentId,
    branchId,
    session,
    term,
    fetchData,
  ]);

  /* ==========================================================
     RETURN
  ========================================================== */

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

export default usePaymentData;
