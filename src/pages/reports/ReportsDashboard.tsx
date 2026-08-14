// src/pages/reports/ReportsDashboard.tsx
// ADVANCED PAYMENT MATRIX / FINANCIAL REPORT
//
// Important:
// - Payments are matched to assignments whenever assignment_id exists.
// - Session/term filtering is applied BEFORE the matrix is built.
// - Multiple assignments for the same student/fee are not blindly collapsed.
// - Page totals are calculated from the currently visible page.
// - Overdue fees are identified separately from unpaid fees.

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

import {
  Search,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileImage,
  RefreshCw,
  Clock,
  Wallet,
  Users,
  TrendingUp,
  Receipt,
  CreditCard,
  AlertTriangle,
  X,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

type FeeStatus = 'paid' | 'partial' | 'unpaid';

interface Student {
  id: string;
  student_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  class_name?: string;
  class_id?: string;
  branch_id: string;
  current_status: string;
  phone_number?: string;
  class_level?: string;
}

interface Fee {
  id: string;
  name: string;
  category: string;
  amount: number;
  due_date: string;
  is_mandatory: boolean;
  status?: string;
  created_at?: string;
  description?: string;
  fee_group_id?: string;
}

interface FeeAssignment {
  id: string;
  student_id: string;
  fee_id: string;
  amount_due: number;
  amount_paid?: number;
  balance?: number;
  due_date: string;
  payment_status?: string;
  session?: string;
  term?: string;
  fee_name?: string;
  fee_category?: string;
  created_at?: string;
  assigned_date?: string;
  assignment_id?: string;
  is_active?: boolean;
}

interface Payment {
  id: string;
  student_id: string;
  fee_id: string;
  assignment_id?: string | null;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  status: string;
  receipt_url?: string;
  payment_proof_url?: string;
  created_at?: string;
}

interface FeePaymentData {
  key: string;
  fee_id: string;
  assignment_id: string;

  fee_name: string;
  fee_category: string;

  amount_due: number;
  amount_paid: number;
  balance: number;
  overpayment: number;

  due_date: string | null;

  status: FeeStatus;

  percentage: number;

  is_overdue: boolean;

  payment_count: number;

  last_payment_date?: string;
  last_payment_receipt?: string;

  session?: string;
  term?: string;

  payments: Payment[];
}

interface StudentRowData {
  student: Student;

  fees: Record<string, FeePaymentData>;

  totalDue: number;
  totalPaid: number;
  totalBalance: number;
  totalOverpayment: number;

  feeCount: number;
  paidFeeCount: number;
  partialFeeCount: number;
  unpaidFeeCount: number;
  overdueFeeCount: number;

  status: FeeStatus;
}

interface SummaryStats {
  totalStudents: number;

  paidStudents: number;
  partialStudents: number;
  unpaidStudents: number;

  studentsWithOverdue: number;

  totalFees: number;
  paidFees: number;
  partialFees: number;
  unpaidFees: number;
  overdueFees: number;

  totalExpectedRevenue: number;
  totalRevenueCollected: number;
  outstandingBalance: number;
  totalOverpayment: number;

  collectionRate: number;

  totalTransactions: number;
}

interface FeeColumnTotals {
  fee_id: string;

  fee_name: string;
  fee_category: string;

  collected: number;
  outstanding: number;
  overpayment: number;

  paidStudents: number;
  partialStudents: number;
  unpaidStudents: number;
  overdueStudents: number;

  transactionCount: number;

  totalStudents: number;
}

// ============================================================
// HELPERS
// ============================================================

const VALID_PAYMENT_STATUSES = new Set([
  'completed',
  'paid',
  'approved',
  'success',
]);

const normalizeAmount = (value: any): number => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

const normalizeText = (value: any): string => {
  return String(value ?? '').trim();
};

const paymentIsValid = (payment: Payment): boolean => {
  return VALID_PAYMENT_STATUSES.has(
    normalizeText(payment.status).toLowerCase()
  );
};

const getAssignmentKey = (
  studentId: string,
  assignmentId: string
): string => {
  return `${studentId}::${assignmentId}`;
};

const getFeeStatus = (
  amountDue: number,
  amountPaid: number
): FeeStatus => {
  if (amountDue <= 0) return 'unpaid';

  if (amountPaid >= amountDue) {
    return 'paid';
  }

  if (amountPaid > 0) {
    return 'partial';
  }

  return 'unpaid';
};

const getStatusBadgeColor = (
  status?: string
): string => {
  const normalized = normalizeText(status).toLowerCase();

  switch (normalized) {
    case 'paid':
      return 'bg-green-100 text-green-700';
    case 'partial':
      return 'bg-yellow-100 text-yellow-700';
    case 'unpaid':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const ReportsDashboard: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [allAssignments, setAllAssignments] = useState<FeeAssignment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [classes, setClasses] = useState<
    { id: string; name: string; level: string }[]
  >([]);

  const [feeCategories, setFeeCategories] = useState<string[]>([]);
  const [academicSessions, setAcademicSessions] = useState<string[]>([]);
  const [academicTerms, setAcademicTerms] = useState<string[]>([]);

  const [filters, setFilters] = useState({
    session: '',
    term: '',
    class: 'all',
    feeCategory: 'all',
    paymentStatus: 'all',
    overdueOnly: false,
  });

  const [searchTerm, setSearchTerm] = useState('');

  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null);

  const [selectedFee, setSelectedFee] =
    useState<FeePaymentData | null>(null);

  const [showPaymentModal, setShowPaymentModal] =
    useState(false);

  const [showLegend, setShowLegend] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 50;

  const [sortField, setSortField] =
    useState<string>('student_id');

  const [sortDirection, setSortDirection] =
    useState<'asc' | 'desc'>('asc');

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  // ============================================================
  // FETCH FILTER OPTIONS
  // ============================================================

  const fetchFilterOptions = useCallback(
    async (branchId: string) => {
      try {
        const [
          classResult,
          feeCategoryResult,
          sessionResult,
          termResult,
        ] = await Promise.all([
          supabase
            .from('classes')
            .select('id, name, level')
            .eq('branch_id', branchId)
            .eq('status', 'active')
            .order('name'),

          supabase
            .from('fees')
            .select('category')
            .eq('branch_id', branchId)
            .eq('status', 'active'),

          supabase
            .from('academic_sessions')
            .select('session_name')
            .eq('branch_id', branchId)
            .order('session_name', {
              ascending: false,
            }),

          supabase
            .from('academic_sessions')
            .select('term_name')
            .eq('branch_id', branchId),
        ]);

        setClasses(classResult.data || []);

        const categories = [
          ...new Set(
            (feeCategoryResult.data || [])
              .map((item: any) => item.category)
              .filter(Boolean)
          ),
        ];

        setFeeCategories(categories);

        setAcademicSessions([
          ...new Set(
            (sessionResult.data || [])
              .map((item: any) => item.session_name)
              .filter(Boolean)
          ),
        ]);

        setAcademicTerms([
          ...new Set(
            (termResult.data || [])
              .map((item: any) => item.term_name)
              .filter(Boolean)
          ),
        ]);
      } catch (error) {
        console.error(
          'Error loading filter options:',
          error
        );
      }
    },
    []
  );

  // ============================================================
  // FETCH ALL REPORT DATA
  // ============================================================

  const fetchData = useCallback(async () => {
    const branchId =
      user?.branch_id ||
      (user as any)?.metadata?.branch_id;

    if (!branchId) {
      toast.error('No branch found for this user.');
      return;
    }

    setLoading(true);

    try {
      // --------------------------------------------------------
      // CURRENT SESSION
      // --------------------------------------------------------

      const { data: currentSessionData } =
        await supabase
          .from('academic_sessions')
          .select('session_name, term_name')
          .eq('branch_id', branchId)
          .eq('is_current', true)
          .maybeSingle();

      const currentSession =
        currentSessionData?.session_name || '';

      const currentTerm =
        currentSessionData?.term_name || '';

      setFilters(prev => ({
        ...prev,
        session: prev.session || currentSession,
        term: prev.term || currentTerm,
      }));

      // --------------------------------------------------------
      // STUDENTS
      // --------------------------------------------------------

      const { data: studentsData, error: studentsError } =
        await supabase
          .from('students')
          .select(`
            id,
            student_id,
            admission_number,
            first_name,
            last_name,
            class_id,
            branch_id,
            current_status,
            phone_number,
            class:class_id (
              name,
              level
            )
          `)
          .eq('branch_id', branchId)
          .eq('current_status', 'active')
          .order('first_name');

      if (studentsError) {
        throw studentsError;
      }

      const studentsWithClass: Student[] =
        (studentsData || []).map((student: any) => ({
          ...student,

          class_name:
            student.class?.name || 'Not Assigned',

          class_level:
            student.class?.level || '',
        }));

      setStudents(studentsWithClass);

      // --------------------------------------------------------
      // FEES
      // --------------------------------------------------------

      const { data: feesData, error: feesError } =
        await supabase
          .from('fees')
          .select('*')
          .eq('branch_id', branchId)
          .eq('status', 'active')
          .order('name');

      if (feesError) {
        throw feesError;
      }

      setFees(feesData || []);

      // --------------------------------------------------------
      // ASSIGNMENTS
      // --------------------------------------------------------

      const {
        data: assignmentsData,
        error: assignmentsError,
      } = await supabase
        .from('student_fee_assignments')
        .select(`
          *,
          fee:fee_id (
            name,
            category,
            created_at,
            description,
            amount,
            due_date
          )
        `)
        .eq('branch_id', branchId)
        .eq('is_active', true);

      if (assignmentsError) {
        throw assignmentsError;
      }

      const assignments: FeeAssignment[] =
        (assignmentsData || []).map((assignment: any) => ({
          ...assignment,

          amount_due: normalizeAmount(
            assignment.amount_due ??
              assignment.fee?.amount
          ),

          fee_name:
            assignment.fee?.name ||
            'Unknown Fee',

          fee_category:
            assignment.fee?.category ||
            'Other',

          created_at:
            assignment.created_at ||
            assignment.assigned_date ||
            assignment.fee?.created_at,

          assignment_id: assignment.id,
        }));

      setAllAssignments(assignments);

      // --------------------------------------------------------
      // PAYMENTS
      // --------------------------------------------------------

      const {
        data: paymentsData,
        error: paymentsError,
      } = await supabase
        .from('payments')
        .select('*')
        .eq('branch_id', branchId)
        .in('status', [
          'completed',
          'paid',
          'approved',
          'success',
        ])
        .order('payment_date', {
          ascending: false,
        });

      if (paymentsError) {
        throw paymentsError;
      }

      setPayments(paymentsData || []);

      await fetchFilterOptions(branchId);

      setLastUpdated(new Date());

      toast.success('Payment report updated');
    } catch (error: any) {
      console.error(
        'Error loading payment report:',
        error
      );

      toast.error(
        error?.message ||
          'Failed to load payment report'
      );
    } finally {
      setLoading(false);
    }
  }, [user, fetchFilterOptions]);

  useEffect(() => {
    if (user?.branch_id) {
      fetchData();
    }
  }, [user?.branch_id, fetchData]);

  // ============================================================
  // FILTER ASSIGNMENTS
  // ============================================================

  const filteredAssignments = useMemo(() => {
    return allAssignments.filter(assignment => {
      const sessionMatches =
        !filters.session ||
        assignment.session === filters.session;

      const termMatches =
        !filters.term ||
        assignment.term === filters.term;

      return sessionMatches && termMatches;
    });
  }, [
    allAssignments,
    filters.session,
    filters.term,
  ]);

  // ============================================================
  // PAYMENT INDEX
  // ============================================================

  const paymentsByAssignment = useMemo(() => {
    const index: Record<string, Payment[]> = {};

    payments.forEach(payment => {
      if (!paymentIsValid(payment)) return;

      const assignmentId =
        payment.assignment_id;

      if (assignmentId) {
        if (!index[assignmentId]) {
          index[assignmentId] = [];
        }

        index[assignmentId].push(payment);
      }
    });

    return index;
  }, [payments]);

  const paymentsByStudentFee = useMemo(() => {
    const index: Record<
      string,
      Payment[]
    > = {};

    payments.forEach(payment => {
      if (!paymentIsValid(payment)) return;

      if (!payment.student_id || !payment.fee_id) {
        return;
      }

      const key =
        `${payment.student_id}::${payment.fee_id}`;

      if (!index[key]) {
        index[key] = [];
      }

      index[key].push(payment);
    });

    return index;
  }, [payments]);

  // ============================================================
  // BUILD PAYMENT MATRIX
  // ============================================================

  const studentRows = useMemo(() => {
    const assignmentsByStudent: Record<
      string,
      FeeAssignment[]
    > = {};

    filteredAssignments.forEach(assignment => {
      if (!assignmentsByStudent[assignment.student_id]) {
        assignmentsByStudent[assignment.student_id] =
          [];
      }

      assignmentsByStudent[
        assignment.student_id
      ].push(assignment);
    });

    const rows: StudentRowData[] =
      students.map(student => {
        const studentAssignments =
          assignmentsByStudent[student.id] || [];

        const feeData: Record<
          string,
          FeePaymentData
        > = {};

        let totalDue = 0;
        let totalPaid = 0;
        let totalBalance = 0;
        let totalOverpayment = 0;

        let feeCount = 0;
        let paidFeeCount = 0;
        let partialFeeCount = 0;
        let unpaidFeeCount = 0;
        let overdueFeeCount = 0;

        // ------------------------------------------------------
        // IMPORTANT:
        // One student can have the same fee multiple times.
        // We therefore use assignment ID as the unique key.
        // ------------------------------------------------------

        studentAssignments.forEach(
          assignment => {
            const fee =
              fees.find(
                item =>
                  item.id === assignment.fee_id
              );

            if (!fee) return;

            const amountDue =
              normalizeAmount(
                assignment.amount_due ??
                  fee.amount
              );

            let assignmentPayments: Payment[] =
              [];

            // Preferred:
            // exact assignment match.
            if (assignment.id) {
              assignmentPayments =
                paymentsByAssignment[
                  assignment.id
                ] || [];
            }

            // Legacy fallback:
            // only use student + fee when there
            // are no assignment-level payments.
            if (
              assignmentPayments.length === 0
            ) {
              const fallbackKey =
                `${student.id}::${fee.id}`;

              const fallbackPayments =
                paymentsByStudentFee[
                  fallbackKey
                ] || [];

              // Do NOT use fallback if there are
              // multiple assignments for this same fee.
              const sameFeeAssignments =
                studentAssignments.filter(
                  item =>
                    item.fee_id === fee.id
                );

              if (
                sameFeeAssignments.length === 1
              ) {
                assignmentPayments =
                  fallbackPayments;
              }
            }

            const amountPaid =
              assignmentPayments.reduce(
                (sum, payment) =>
                  sum +
                  normalizeAmount(
                    payment.amount_paid
                  ),
                0
              );

            const balance = Math.max(
              0,
              amountDue - amountPaid
            );

            const overpayment = Math.max(
              0,
              amountPaid - amountDue
            );

            const status =
              getFeeStatus(
                amountDue,
                amountPaid
              );

            const dueDate =
              assignment.due_date ||
              fee.due_date ||
              null;

            const isOverdue =
              Boolean(
                dueDate &&
                  dayjs(dueDate).isBefore(
                    dayjs(),
                    'day'
                  ) &&
                  balance > 0
              );

            const sortedPayments = [
              ...assignmentPayments,
            ].sort((a, b) =>
              dayjs(b.payment_date).diff(
                dayjs(a.payment_date)
              )
            );

            const key =
              getAssignmentKey(
                student.id,
                assignment.id
              );

            feeData[key] = {
              key,

              fee_id: fee.id,

              assignment_id:
                assignment.id,

              fee_name:
                assignment.fee_name ||
                fee.name,

              fee_category:
                assignment.fee_category ||
                fee.category ||
                'Other',

              amount_due: amountDue,

              amount_paid: amountPaid,

              balance,

              overpayment,

              due_date: dueDate,

              status,

              percentage:
                amountDue > 0
                  ? Math.min(
                      100,
                      (amountPaid /
                        amountDue) *
                        100
                    )
                  : 0,

              is_overdue: isOverdue,

              payment_count:
                assignmentPayments.length,

              last_payment_date:
                sortedPayments[0]
                  ?.payment_date,

              last_payment_receipt:
                sortedPayments[0]
                  ?.receipt_number,

              session:
                assignment.session,

              term:
                assignment.term,

              payments:
                assignmentPayments,
            };

            feeCount++;

            if (status === 'paid') {
              paidFeeCount++;
            }

            if (status === 'partial') {
              partialFeeCount++;
            }

            if (status === 'unpaid') {
              unpaidFeeCount++;
            }

            if (isOverdue) {
              overdueFeeCount++;
            }

            totalDue += amountDue;
            totalPaid += amountPaid;
            totalBalance += balance;
            totalOverpayment += overpayment;
          }
        );

        let status: FeeStatus = 'unpaid';

        if (
          feeCount > 0 &&
          paidFeeCount === feeCount
        ) {
          status = 'paid';
        } else if (
          totalPaid > 0
        ) {
          status = 'partial';
        } else {
          status = 'unpaid';
        }

        return {
          student,
          fees: feeData,

          totalDue,
          totalPaid,
          totalBalance,
          totalOverpayment,

          feeCount,
          paidFeeCount,
          partialFeeCount,
          unpaidFeeCount,
          overdueFeeCount,

          status,
        };
      });

    return rows;
  }, [
    students,
    fees,
    filteredAssignments,
    paymentsByAssignment,
    paymentsByStudentFee,
  ]);

  // ============================================================
  // SUMMARY
  // ============================================================

  const summaryStats = useMemo<SummaryStats>(() => {
    const stats: SummaryStats = {
      totalStudents:
        studentRows.length,

      paidStudents: 0,
      partialStudents: 0,
      unpaidStudents: 0,

      studentsWithOverdue: 0,

      totalFees: 0,
      paidFees: 0,
      partialFees: 0,
      unpaidFees: 0,
      overdueFees: 0,

      totalExpectedRevenue: 0,
      totalRevenueCollected: 0,
      outstandingBalance: 0,
      totalOverpayment: 0,

      collectionRate: 0,

      totalTransactions: 0,
    };

    studentRows.forEach(row => {
      if (row.status === 'paid') {
        stats.paidStudents++;
      } else if (row.status === 'partial') {
        stats.partialStudents++;
      } else {
        stats.unpaidStudents++;
      }

      if (row.overdueFeeCount > 0) {
        stats.studentsWithOverdue++;
      }

      stats.totalFees += row.feeCount;
      stats.paidFees += row.paidFeeCount;
      stats.partialFees += row.partialFeeCount;
      stats.unpaidFees += row.unpaidFeeCount;
      stats.overdueFees += row.overdueFeeCount;

      stats.totalExpectedRevenue +=
        row.totalDue;

      stats.totalRevenueCollected +=
        row.totalPaid;

      stats.outstandingBalance +=
        row.totalBalance;

      stats.totalOverpayment +=
        row.totalOverpayment;

      Object.values(row.fees).forEach(
        fee => {
          stats.totalTransactions +=
            fee.payment_count;
        }
      );
    });

    stats.collectionRate =
      stats.totalExpectedRevenue > 0
        ? Math.min(
            100,
            (stats.totalRevenueCollected /
              stats.totalExpectedRevenue) *
              100
          )
        : 0;

    return stats;
  }, [studentRows]);

  // ============================================================
  // FEE TOTALS
  // ============================================================

  const feeColumnTotals =
    useMemo<FeeColumnTotals[]>(() => {
      const totals: Record<
        string,
        FeeColumnTotals
      > = {};

      studentRows.forEach(row => {
        Object.values(row.fees).forEach(
          feeData => {
            if (!totals[feeData.fee_id]) {
              totals[feeData.fee_id] = {
                fee_id: feeData.fee_id,

                fee_name:
                  feeData.fee_name,

                fee_category:
                  feeData.fee_category,

                collected: 0,
                outstanding: 0,
                overpayment: 0,

                paidStudents: 0,
                partialStudents: 0,
                unpaidStudents: 0,
                overdueStudents: 0,

                transactionCount: 0,

                totalStudents: 0,
              };
            }

            const total =
              totals[feeData.fee_id];

            total.collected +=
              feeData.amount_paid;

            total.outstanding +=
              feeData.balance;

            total.overpayment +=
              feeData.overpayment;

            total.transactionCount +=
              feeData.payment_count;

            total.totalStudents++;

            if (
              feeData.status === 'paid'
            ) {
              total.paidStudents++;
            } else if (
              feeData.status === 'partial'
            ) {
              total.partialStudents++;
            } else {
              total.unpaidStudents++;
            }

            if (feeData.is_overdue) {
              total.overdueStudents++;
            }
          }
        );
      });

      return Object.values(totals);
    }, [studentRows]);

  // ============================================================
  // VISIBLE FEES
  // ============================================================

  const visibleFees = useMemo(() => {
    const feeIds = new Set(
      filteredAssignments.map(
        assignment =>
          assignment.fee_id
      )
    );

    return fees.filter(
      fee => feeIds.has(fee.id)
    );
  }, [
    fees,
    filteredAssignments,
  ]);

  // ============================================================
  // SEARCH / FILTER / SORT
  // ============================================================

  const filteredRows = useMemo(() => {
    let rows = [...studentRows];

    if (searchTerm.trim()) {
      const term =
        searchTerm
          .toLowerCase()
          .trim();

      rows = rows.filter(row => {
        const student =
          row.student;

        return (
          student.first_name
            ?.toLowerCase()
            .includes(term) ||

          student.last_name
            ?.toLowerCase()
            .includes(term) ||

          student.student_id
            ?.toLowerCase()
            .includes(term) ||

          student.admission_number
            ?.toLowerCase()
            .includes(term) ||

          student.phone_number
            ?.toLowerCase()
            .includes(term)
        );
      });
    }

    if (
      filters.class !== 'all'
    ) {
      rows = rows.filter(
        row =>
          row.student.class_id ===
          filters.class
      );
    }

    if (
      filters.paymentStatus !==
      'all'
    ) {
      rows = rows.filter(
        row =>
          row.status ===
          filters.paymentStatus
      );
    }

    if (filters.feeCategory !== 'all') {
      rows = rows.filter(row =>
        Object.values(row.fees).some(
          fee =>
            fee.fee_category ===
              filters.feeCategory &&
            fee.amount_due > 0
        )
      );
    }

    if (filters.overdueOnly) {
      rows = rows.filter(
        row =>
          row.overdueFeeCount > 0
      );
    }

    rows.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'student_name':
          aValue =
            `${a.student.first_name} ${a.student.last_name}`
              .toLowerCase();

          bValue =
            `${b.student.first_name} ${b.student.last_name}`
              .toLowerCase();

          break;

        case 'class':
          aValue =
            a.student.class_name
              ?.toLowerCase() || '';

          bValue =
            b.student.class_name
              ?.toLowerCase() || '';

          break;

        case 'total_due':
          aValue = a.totalDue;
          bValue = b.totalDue;
          break;

        case 'total_paid':
          aValue = a.totalPaid;
          bValue = b.totalPaid;
          break;

        case 'total_balance':
          aValue = a.totalBalance;
          bValue = b.totalBalance;
          break;

        case 'status': {
          const order = {
            paid: 0,
            partial: 1,
            unpaid: 2,
          };

          aValue =
            order[a.status];

          bValue =
            order[b.status];

          break;
        }

        default:
          aValue =
            a.student.student_id
              ?.toLowerCase() || '';

          bValue =
            b.student.student_id
              ?.toLowerCase() || '';
      }

      if (aValue < bValue) {
        return sortDirection === 'asc'
          ? -1
          : 1;
      }

      if (aValue > bValue) {
        return sortDirection === 'asc'
          ? 1
          : -1;
      }

      return 0;
    });

    return rows;
  }, [
    studentRows,
    searchTerm,
    filters,
    sortField,
    sortDirection,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    filters,
    sortField,
    sortDirection,
  ]);

  // ============================================================
  // PAGINATION
  // ============================================================

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredRows.length / pageSize
    )
  );

  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );

  const paginatedRows =
    filteredRows.slice(
      (safeCurrentPage - 1) *
        pageSize,

      safeCurrentPage *
        pageSize
    );

  // ============================================================
  // PAGE TOTALS
  // ============================================================

  const pageTotals = useMemo(() => {
    return paginatedRows.reduce(
      (result, row) => {
        result.totalDue +=
          row.totalDue;

        result.totalPaid +=
          row.totalPaid;

        result.totalBalance +=
          row.totalBalance;

        return result;
      },
      {
        totalDue: 0,
        totalPaid: 0,
        totalBalance: 0,
      }
    );
  }, [paginatedRows]);

  // ============================================================
  // FORMATTING
  // ============================================================

  const formatCurrency = (
    amount: number
  ) => {
    return new Intl.NumberFormat(
      'en-NG',
      {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }
    ).format(amount);
  };

  const getStatusBadgeColor = (
    status: string
  ) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

      case 'partial':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';

      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusLabel = (
    status: string
  ) => {
    switch (status) {
      case 'paid':
        return 'Paid';

      case 'partial':
        return 'Partial';

      default:
        return 'Unpaid';
    }
  };

  // ============================================================
  // SORT
  // ============================================================

  const changeSort = (
    field: string
  ) => {
    if (sortField === field) {
      setSortDirection(
        previous =>
          previous === 'asc'
            ? 'desc'
            : 'asc'
      );
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (
    field: string
  ) => {
    if (sortField !== field) {
      return null;
    }

    return sortDirection === 'asc'
      ? (
        <ChevronUp className="w-3 h-3" />
      )
      : (
        <ChevronDown className="w-3 h-3" />
      );
  };

  // ============================================================
  // EXPORT
  // ============================================================

  const createExportRows = () => {
    return filteredRows.map(row => {
      const data: Record<
        string,
        any
      > = {
        'Student ID':
          row.student.student_id,

        'Admission Number':
          row.student.admission_number,

        'Student Name':
          `${row.student.first_name} ${row.student.last_name}`,

        Class:
          row.student.class_name,

        'Total Fees':
          row.feeCount,

        'Total Due':
          row.totalDue,

        'Total Paid':
          row.totalPaid,

        'Outstanding Balance':
          row.totalBalance,

        Overpayment:
          row.totalOverpayment,

        'Paid Fees':
          row.paidFeeCount,

        'Partial Fees':
          row.partialFeeCount,

        'Unpaid Fees':
          row.unpaidFeeCount,

        'Overdue Fees':
          row.overdueFeeCount,

        Status:
          row.status.toUpperCase(),
      };

      Object.values(row.fees).forEach(
        fee => {
          const prefix =
            `${fee.fee_name} [${fee.session || 'N/A'} - ${fee.term || 'N/A'}]`;

          data[
            `${prefix} - Due`
          ] =
            fee.amount_due;

          data[
            `${prefix} - Paid`
          ] =
            fee.amount_paid;

          data[
            `${prefix} - Balance`
          ] =
            fee.balance;

          data[
            `${prefix} - Status`
          ] =
            fee.status.toUpperCase();

          data[
            `${prefix} - Due Date`
          ] =
            fee.due_date
              ? dayjs(
                  fee.due_date
                ).format(
                  'YYYY-MM-DD'
                )
              : '';

          data[
            `${prefix} - Payments`
          ] =
            fee.payment_count;
        }
      );

      return data;
    });
  };

  const exportToExcel = () => {
    try {
      const data =
        createExportRows();

      const workbook =
        XLSX.utils.book_new();

      const worksheet =
        XLSX.utils.json_to_sheet(
          data
        );

      worksheet['!cols'] =
        Object.keys(
          data[0] || {}
        ).map(() => ({
          wch: 20,
        }));

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'Payment Matrix'
      );

      XLSX.writeFile(
        workbook,
        `payment_matrix_${dayjs().format(
          'YYYY-MM-DD_HH-mm'
        )}.xlsx`
      );

      toast.success(
        'Excel report exported successfully'
      );
    } catch (error) {
      console.error(
        'Excel export error:',
        error
      );

      toast.error(
        'Failed to export Excel report'
      );
    }
  };

  const exportToCSV = () => {
    try {
      const data =
        createExportRows();

      if (!data.length) {
        toast.error(
          'There is no data to export'
        );
        return;
      }

      const headers =
        Object.keys(data[0]);

      const csvRows = [
        headers.join(','),
        ...data.map(row =>
          headers
            .map(header => {
              const value =
                row[header] ??
                '';

              return `"${String(
                value
              ).replace(
                /"/g,
                '""'
              )}"`;
            })
            .join(',')
        ),
      ];

      const blob =
        new Blob(
          [
            csvRows.join('\n'),
          ],
          {
            type:
              'text/csv;charset=utf-8;',
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          'a'
        );

      link.href = url;

      link.download =
        `payment_matrix_${dayjs().format(
          'YYYY-MM-DD_HH-mm'
        )}.csv`;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      URL.revokeObjectURL(
        url
      );

      toast.success(
        'CSV report exported successfully'
      );
    } catch (error) {
      console.error(
        'CSV export error:',
        error
      );

      toast.error(
        'Failed to export CSV report'
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ============================================================
  // OPEN STUDENT
  // ============================================================

  const handleStudentClick = (
    student: Student
  ) => {
    const row =
      studentRows.find(
        item =>
          item.student.id ===
          student.id
      );

    const studentFees =
      row
        ? Object.values(row.fees)
        : [];

    const firstOutstanding =
      studentFees.find(
        fee =>
          fee.balance > 0
      );

    setSelectedStudent(
      student
    );

    setSelectedFee(
      firstOutstanding ||
        studentFees[0] ||
        null
    );

    setShowPaymentModal(
      true
    );
  };

  const handleCellClick = (
    student: Student,
    fee: FeePaymentData
  ) => {
    setSelectedStudent(
      student
    );

    setSelectedFee(fee);

    setShowPaymentModal(
      true
    );
  };

  // ============================================================
  // CLEAR FILTERS
  // ============================================================

  const clearFilters = () => {
    setSearchTerm('');

    setFilters({
      session: '',
      term: '',
      class: 'all',
      feeCategory: 'all',
      paymentStatus: 'all',
      overdueOnly: false,
    });
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading && !students.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />

        <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">
          Building payment matrix...
        </p>

        <p className="text-sm text-gray-400 mt-1">
          Loading students, fees, assignments and payments
        </p>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6 print:space-y-2">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">

        <div>
          <div className="flex items-center gap-2">

            <BarChart3 className="w-7 h-7 text-blue-600" />

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Payment Matrix Report
            </h1>

          </div>

          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Complete student fee collection and outstanding balance analysis
          </p>

          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Updated{' '}
              {dayjs(
                lastUpdated
              ).format(
                'MMM D, YYYY h:mm A'
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm flex items-center gap-1.5"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Refresh
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>

          <button
            onClick={exportToCSV}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            CSV
          </button>

          <button
            onClick={exportToExcel}
            className="px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:opacity-90 text-sm flex items-center gap-1.5 shadow-lg shadow-green-500/25"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>

        </div>
      </div>

      {/* ======================================================
          REPORT PERIOD
      ====================================================== */}

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg print:hidden">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6" />

            <div>
              <p className="text-blue-100 text-sm">
                Report Period
              </p>

              <p className="font-bold text-lg">
                {filters.session ||
                  'All Sessions'}

                {' • '}

                {filters.term ||
                  'All Terms'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5 text-center">

            <div>
              <p className="text-blue-100 text-xs">
                Students
              </p>

              <p className="font-bold text-xl">
                {filteredRows.length}
              </p>
            </div>

            <div>
              <p className="text-blue-100 text-xs">
                Fees
              </p>

              <p className="font-bold text-xl">
                {summaryStats.totalFees}
              </p>
            </div>

            <div>
              <p className="text-blue-100 text-xs">
                Transactions
              </p>

              <p className="font-bold text-xl">
                {summaryStats.totalTransactions}
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* ======================================================
          SUMMARY CARDS
      ====================================================== */}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 print:hidden">

        <SummaryCard
          icon={<Users className="w-4 h-4" />}
          label="Students"
          value={summaryStats.totalStudents}
        />

        <SummaryCard
          icon={<CheckCircle className="w-4 h-4" />}
          label="Fully Paid"
          value={summaryStats.paidStudents}
          color="green"
        />

        <SummaryCard
          icon={<AlertCircle className="w-4 h-4" />}
          label="Partial"
          value={summaryStats.partialStudents}
          color="yellow"
        />

        <SummaryCard
          icon={<XCircle className="w-4 h-4" />}
          label="Unpaid"
          value={summaryStats.unpaidStudents}
        />

        <SummaryCard
          icon={<Clock className="w-4 h-4" />}
          label="Overdue"
          value={summaryStats.studentsWithOverdue}
          color="red"
        />

        <SummaryCard
          icon={<Wallet className="w-4 h-4" />}
          label="Collected"
          value={formatCurrency(
            summaryStats.totalRevenueCollected
          )}
          color="green"
        />

        <SummaryCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Outstanding"
          value={formatCurrency(
            summaryStats.outstandingBalance
          )}
          color="red"
        />

        <SummaryCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Collection"
          value={`${summaryStats.collectionRate.toFixed(1)}%`}
          color="blue"
        />

      </div>

      {/* ======================================================
          COLLECTION PROGRESS
      ====================================================== */}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 print:hidden">

        <div className="flex items-center justify-between mb-3">

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Revenue Collection
            </h3>

            <p className="text-xs text-gray-500 mt-1">
              Collected versus expected revenue
            </p>
          </div>

          <span className="font-bold text-blue-600 dark:text-blue-400">
            {summaryStats.collectionRate.toFixed(1)}%
          </span>

        </div>

        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">

          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(
                100,
                summaryStats.collectionRate
              )}%`,
            }}
          />

        </div>

        <div className="flex justify-between text-xs mt-2 text-gray-500">

          <span>
            Collected:{' '}
            <strong>
              {formatCurrency(
                summaryStats.totalRevenueCollected
              )}
            </strong>
          </span>

          <span>
            Expected:{' '}
            <strong>
              {formatCurrency(
                summaryStats.totalExpectedRevenue
              )}
            </strong>
          </span>

        </div>

      </div>

      {/* ======================================================
          FILTERS
      ====================================================== */}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 print:hidden">

        <div className="flex flex-wrap items-center gap-3">

          <div className="flex-1 min-w-[220px] relative">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              type="text"
              placeholder="Search name, student ID, admission number or phone..."
              value={searchTerm}
              onChange={e =>
                setSearchTerm(
                  e.target.value
                )
              }
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
            />

          </div>

          <select
            value={filters.session}
            onChange={e =>
              setFilters(prev => ({
                ...prev,
                session:
                  e.target.value,
              }))
            }
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white text-sm min-w-[145px]"
          >
            <option value="">
              All Sessions
            </option>

            {academicSessions.map(
              session => (
                <option
                  key={session}
                  value={session}
                >
                  {session}
                </option>
              )
            )}
          </select>

          <select
            value={filters.term}
            onChange={e =>
              setFilters(prev => ({
                ...prev,
                term: e.target.value,
              }))
            }
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white text-sm min-w-[135px]"
          >
            <option value="">
              All Terms
            </option>

            {academicTerms.map(
              term => (
                <option
                  key={term}
                  value={term}
                >
                  {term}
                </option>
              )
            )}
          </select>

          <select
            value={filters.class}
            onChange={e =>
              setFilters(prev => ({
                ...prev,
                class:
                  e.target.value,
              }))
            }
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white text-sm min-w-[140px]"
          >
            <option value="all">
              All Classes
            </option>

            {classes.map(cls => (
              <option
                key={cls.id}
                value={cls.id}
              >
                {cls.name}
              </option>
            ))}
          </select>

          <select
            value={
              filters.paymentStatus
            }
            onChange={e =>
              setFilters(prev => ({
                ...prev,
                paymentStatus:
                  e.target.value,
              }))
            }
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white text-sm min-w-[130px]"
          >
            <option value="all">
              All Status
            </option>

            <option value="paid">
              Paid
            </option>

            <option value="partial">
              Partial
            </option>

            <option value="unpaid">
              Unpaid
            </option>
          </select>

          <select
            value={
              filters.feeCategory
            }
            onChange={e =>
              setFilters(prev => ({
                ...prev,
                feeCategory:
                  e.target.value,
              }))
            }
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white text-sm min-w-[145px]"
          >
            <option value="all">
              All Categories
            </option>

            {feeCategories.map(
              category => (
                <option
                  key={category}
                  value={category}
                >
                  {category.replace(
                    /_/g,
                    ' '
                  )}
                </option>
              )
            )}
          </select>

          <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer text-sm">

            <input
              type="checkbox"
              checked={
                filters.overdueOnly
              }
              onChange={e =>
                setFilters(prev => ({
                  ...prev,
                  overdueOnly:
                    e.target.checked,
                }))
              }
              className="rounded text-red-600 focus:ring-red-500"
            />

            <span className="text-gray-700 dark:text-gray-300">
              Overdue only
            </span>

          </label>

          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-red-500 hover:text-red-700"
          >
            Clear
          </button>

        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">

          <p className="text-xs text-gray-500">
            Showing{' '}
            <strong>
              {filteredRows.length}
            </strong>{' '}
            students
          </p>

          <p className="text-xs text-gray-500">
            {visibleFees.length} fee columns
          </p>

        </div>

      </div>

      {/* ======================================================
          LEGEND
      ====================================================== */}

      {showLegend && (
        <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl print:hidden">

          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Legend:
          </span>

          <LegendItem
            className="bg-green-500"
            label="Paid"
          />

          <LegendItem
            className="bg-yellow-500"
            label="Partial"
          />

          <LegendItem
            className="bg-gray-400"
            label="Unpaid"
          />

          <LegendItem
            className="bg-red-500"
            label="Overdue"
          />

          <button
            onClick={() =>
              setShowLegend(false)
            }
            className="ml-auto text-xs text-gray-400 hover:text-gray-600"
          >
            Hide
          </button>

        </div>
      )}

      {/* ======================================================
          TABLE
      ====================================================== */}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full border-collapse text-sm">

            <thead className="bg-gray-50 dark:bg-gray-700/50">

              <tr>

                <SortableHeader
                  label="Student ID"
                  field="student_id"
                  sortField={sortField}
                  onSort={changeSort}
                  icon={renderSortIcon}
                  sticky="left-0"
                />

                <SortableHeader
                  label="Student Name"
                  field="student_name"
                  sortField={sortField}
                  onSort={changeSort}
                  icon={renderSortIcon}
                  sticky="left-[100px]"
                  minWidth="min-w-[170px]"
                />

                <SortableHeader
                  label="Class"
                  field="class"
                  sortField={sortField}
                  onSort={changeSort}
                  icon={renderSortIcon}
                  sticky="left-[270px]"
                />

                {visibleFees.map(
                  fee => (
                    <th
                      key={fee.id}
                      className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-r border-gray-200 dark:border-gray-700 min-w-[145px]"
                    >
                      <div className="flex flex-col items-center">

                        <span className="font-semibold text-gray-700 dark:text-gray-300 normal-case">
                          {fee.name}
                        </span>

                        <span className="text-[10px] text-gray-400 font-normal mt-0.5">
                          {fee.category?.replace(
                            /_/g,
                            ' '
                          )}
                        </span>

                      </div>
                    </th>
                  )
                )}

                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[110px]">
                  Due
                </th>

                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[110px]">
                  Paid
                </th>

                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[110px]">
                  Balance
                </th>

                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[100px]">
                  Status
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">

              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      visibleFees.length +
                      7
                    }
                    className="px-6 py-16 text-center"
                  >
                    <BarChart3 className="w-14 h-14 mx-auto text-gray-300 dark:text-gray-600 mb-4" />

                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      No payment records found
                    </p>

                    <p className="text-sm text-gray-400 mt-1">
                      Try changing the session, term, class or payment filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map(
                  row => (
                    <tr
                      key={row.student.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                      onClick={() =>
                        handleStudentClick(
                          row.student
                        )
                      }
                    >

                      <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 py-3 border-r border-gray-200 dark:border-gray-700 text-xs font-mono">
                        {row.student.student_id}
                      </td>

                      <td className="sticky left-[100px] z-10 bg-white dark:bg-gray-800 px-3 py-3 border-r border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-white">
                        <div>
                          {row.student.first_name}{' '}
                          {row.student.last_name}
                        </div>

                        {row.overdueFeeCount >
                          0 && (
                          <span className="text-[10px] text-red-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {row.overdueFeeCount}{' '}
                            overdue
                          </span>
                        )}
                      </td>

                      <td className="sticky left-[270px] z-10 bg-white dark:bg-gray-800 px-3 py-3 border-r border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
                        {row.student.class_name}
                      </td>

                      {visibleFees.map(
                        fee => {

                          const matchingFees =
                            Object.values(
                              row.fees
                            ).filter(
                              item =>
                                item.fee_id ===
                                fee.id
                            );

                          if (
                            matchingFees.length ===
                            0
                          ) {
                            return (
                              <td
                                key={fee.id}
                                className="px-2 py-3 text-center border-r border-gray-200 dark:border-gray-700 text-gray-300"
                              >
                                —
                              </td>
                            );
                          }

                          return (
                            <td
                              key={fee.id}
                              className="px-2 py-2 border-r border-gray-200 dark:border-gray-700"
                              onClick={e =>
                                e.stopPropagation()
                              }
                            >
                              <div className="space-y-1">

                                {matchingFees.map(
                                  feeData => {

                                    const background =
                                      feeData.is_overdue
                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                        : feeData.status === 'paid'
                                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                        : feeData.status === 'partial'
                                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';

                                    return (
                                      <button
                                        key={
                                          feeData.assignment_id
                                        }
                                        onClick={() =>
                                          handleCellClick(
                                            row.student,
                                            feeData
                                          )
                                        }
                                        className={`w-full p-2 rounded-lg border text-center hover:ring-2 hover:ring-blue-500 transition-all ${background}`}
                                      >

                                        <div className="flex items-center justify-center gap-1">

                                          {feeData.is_overdue ? (
                                            <Clock className="w-3 h-3 text-red-500" />
                                          ) : feeData.status === 'paid' ? (
                                            <CheckCircle className="w-3 h-3 text-green-500" />
                                          ) : feeData.status === 'partial' ? (
                                            <AlertCircle className="w-3 h-3 text-yellow-500" />
                                          ) : (
                                            <XCircle className="w-3 h-3 text-gray-400" />
                                          )}

                                          <span className="text-xs font-bold">
                                            {feeData.is_overdue
                                              ? 'OVERDUE'
                                              : feeData.status.toUpperCase()}
                                          </span>

                                        </div>

                                        <div className="text-[10px] text-gray-500 mt-1">
                                          {formatCurrency(
                                            feeData.amount_paid
                                          )}{' '}
                                          /{' '}
                                          {formatCurrency(
                                            feeData.amount_due
                                          )}
                                        </div>

                                        {feeData.balance >
                                          0 && (
                                          <div className="text-[10px] text-red-500 font-medium">
                                            Balance:{' '}
                                            {formatCurrency(
                                              feeData.balance
                                            )}
                                          </div>
                                        )}

                                        {feeData.payment_count >
                                          0 && (
                                          <div className="text-[9px] text-gray-400 mt-0.5">
                                            {feeData.payment_count}{' '}
                                            payment
                                            {feeData.payment_count !==
                                            1
                                              ? 's'
                                              : ''}
                                          </div>
                                        )}

                                      </button>
                                    );
                                  }
                                )}

                              </div>
                            </td>
                          );
                        }
                      )}

                      <td className="px-3 py-3 text-center font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(
                          row.totalDue
                        )}
                      </td>

                      <td className="px-3 py-3 text-center font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(
                          row.totalPaid
                        )}
                      </td>

                      <td className="px-3 py-3 text-center font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(
                          row.totalBalance
                        )}
                      </td>

                      <td className="px-3 py-3 text-center">

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                            row.status
                          )}`}
                        >
                          {row.status ===
                            'paid' && (
                            <CheckCircle className="w-3 h-3" />
                          )}

                          {row.status ===
                            'partial' && (
                            <AlertCircle className="w-3 h-3" />
                          )}

                          {row.status ===
                            'unpaid' && (
                            <XCircle className="w-3 h-3" />
                          )}

                          {getStatusLabel(
                            row.status
                          )}
                        </span>

                      </td>

                    </tr>
                  )
                )
              )}

            </tbody>

            {/* ==================================================
                PAGE TOTALS
            ================================================== */}

            {paginatedRows.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-300 dark:border-gray-600">

                <tr>

                  <td className="sticky left-0 z-20 bg-gray-50 dark:bg-gray-700/50 px-3 py-3 font-bold">
                    Page Totals
                  </td>

                  <td className="sticky left-[100px] z-20 bg-gray-50 dark:bg-gray-700/50"></td>

                  <td className="sticky left-[270px] z-20 bg-gray-50 dark:bg-gray-700/50"></td>

                  {visibleFees.map(
                    fee => {

                      const pageFeeData =
                        paginatedRows.flatMap(
                          row =>
                            Object.values(
                              row.fees
                            ).filter(
                              item =>
                                item.fee_id ===
                                fee.id
                            )
                        );

                      const collected =
                        pageFeeData.reduce(
                          (sum, item) =>
                            sum +
                            item.amount_paid,
                          0
                        );

                      const outstanding =
                        pageFeeData.reduce(
                          (sum, item) =>
                            sum +
                            item.balance,
                          0
                        );

                      const paid =
                        pageFeeData.filter(
                          item =>
                            item.status ===
                            'paid'
                        ).length;

                      return (
                        <td
                          key={fee.id}
                          className="px-2 py-3 text-center border-r border-gray-200 dark:border-gray-700"
                        >

                          <div className="text-[10px]">

                            <div className="text-green-600 font-semibold">
                              {formatCurrency(
                                collected
                              )}
                            </div>

                            <div className="text-red-600">
                              {formatCurrency(
                                outstanding
                              )}
                            </div>

                            <div className="text-gray-400">
                              {paid} paid
                            </div>

                          </div>

                        </td>
                      );
                    }
                  )}

                  <td className="px-3 py-3 text-center font-bold">
                    {formatCurrency(
                      pageTotals.totalDue
                    )}
                  </td>

                  <td className="px-3 py-3 text-center font-bold text-green-600">
                    {formatCurrency(
                      pageTotals.totalPaid
                    )}
                  </td>

                  <td className="px-3 py-3 text-center font-bold text-red-600">
                    {formatCurrency(
                      pageTotals.totalBalance
                    )}
                  </td>

                  <td></td>

                </tr>

              </tfoot>
            )}

          </table>

        </div>

        {/* ======================================================
            PAGINATION
        ====================================================== */}

        {filteredRows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700 print:hidden">

            <div className="text-sm text-gray-500">
              Showing{' '}
              <strong>
                {(safeCurrentPage - 1) *
                  pageSize +
                  1}
              </strong>{' '}
              to{' '}
              <strong>
                {Math.min(
                  safeCurrentPage *
                    pageSize,
                  filteredRows.length
                )}
              </strong>{' '}
              of{' '}
              <strong>
                {filteredRows.length}
              </strong>
            </div>

            <div className="flex items-center gap-2">

              <button
                onClick={() =>
                  setCurrentPage(
                    previous =>
                      Math.max(
                        previous - 1,
                        1
                      )
                  )
                }
                disabled={
                  safeCurrentPage ===
                  1
                }
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm font-medium">
                Page {safeCurrentPage} of{' '}
                {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage(
                    previous =>
                      Math.min(
                        previous + 1,
                        totalPages
                      )
                  )
                }
                disabled={
                  safeCurrentPage ===
                  totalPages
                }
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

            </div>

          </div>
        )}

      </div>

      {/* ======================================================
          ADDITIONAL FINANCIAL BREAKDOWN
      ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:hidden">

        <InfoPanel
          title="Fee Performance"
          icon={
            <CreditCard className="w-5 h-5 text-blue-600" />
          }
        >

          <div className="space-y-3">

            <MetricRow
              label="Paid fees"
              value={
                summaryStats.paidFees
              }
            />

            <MetricRow
              label="Partial fees"
              value={
                summaryStats.partialFees
              }
            />

            <MetricRow
              label="Unpaid fees"
              value={
                summaryStats.unpaidFees
              }
            />

            <MetricRow
              label="Overdue fees"
              value={
                summaryStats.overdueFees
              }
              danger
            />

          </div>

        </InfoPanel>

        <InfoPanel
          title="Revenue"
          icon={
            <Wallet className="w-5 h-5 text-green-600" />
          }
        >

          <div className="space-y-3">

            <MetricRow
              label="Expected"
              value={formatCurrency(
                summaryStats.totalExpectedRevenue
              )}
            />

            <MetricRow
              label="Collected"
              value={formatCurrency(
                summaryStats.totalRevenueCollected
              )}
              positive
            />

            <MetricRow
              label="Outstanding"
              value={formatCurrency(
                summaryStats.outstandingBalance
              )}
              danger
            />

            {summaryStats.totalOverpayment >
              0 && (
              <MetricRow
                label="Overpayment"
                value={formatCurrency(
                  summaryStats.totalOverpayment
                )}
              />
            )}

          </div>

        </InfoPanel>

        <InfoPanel
          title="Transactions"
          icon={
            <Receipt className="w-5 h-5 text-purple-600" />
          }
        >

          <div className="space-y-3">

            <MetricRow
              label="Successful payments"
              value={
                summaryStats.totalTransactions
              }
            />

            <MetricRow
              label="Students fully paid"
              value={
                summaryStats.paidStudents
              }
              positive
            />

            <MetricRow
              label="Students with overdue fees"
              value={
                summaryStats.studentsWithOverdue
              }
              danger
            />

          </div>

        </InfoPanel>

      </div>

      {/* ======================================================
          MODAL
      ====================================================== */}

      <AnimatePresence>
        {showPaymentModal &&
          selectedStudent && (
            <PaymentDetailsModal
              student={
                selectedStudent
              }
              feeData={
                selectedFee
              }
              session={
                filters.session
              }
              term={
                filters.term
              }
              onClose={() => {
                setShowPaymentModal(
                  false
                );

                setSelectedStudent(
                  null
                );

                setSelectedFee(
                  null
                );
              }}
              formatCurrency={
                formatCurrency
              }
            />
          )}
      </AnimatePresence>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <div className="text-center text-xs text-gray-400 dark:text-gray-500 print:hidden">

        <p>
          Report generated{' '}
          {dayjs().format(
            'MMMM D, YYYY h:mm A'
          )}
        </p>

        <p className="mt-1">
          © {dayjs().year()} Ebenezer
          International School. All rights
          reserved.
        </p>

      </div>

    </div>
  );
};

// ============================================================
// SUMMARY CARD
// ============================================================

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: 'green' | 'yellow' | 'red' | 'blue';
}

const SummaryCard: React.FC<
  SummaryCardProps
> = ({
  icon,
  label,
  value,
  color = 'blue',
}) => {
  const colors = {
    blue:
      'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    green:
      'text-green-600 bg-green-50 dark:bg-green-900/20',
    yellow:
      'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    red:
      'text-red-600 bg-red-50 dark:bg-red-900/20',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">

      <div className="flex items-center justify-between">

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {label}
        </p>

        <div
          className={`p-1.5 rounded-lg ${colors[color]}`}
        >
          {icon}
        </div>

      </div>

      <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">
        {value}
      </p>

    </div>
  );
};

// ============================================================
// SORTABLE HEADER
// ============================================================

interface SortableHeaderProps {
  label: string;
  field: string;
  sortField: string;
  onSort: (field: string) => void;
  icon: (field: string) => React.ReactNode;
  sticky?: string;
  minWidth?: string;
}

const SortableHeader: React.FC<
  SortableHeaderProps
> = ({
  label,
  field,
  onSort,
  icon,
  sticky = '',
  minWidth = 'min-w-[100px]',
}) => (
  <th
    className={`sticky ${sticky} z-20 bg-gray-50 dark:bg-gray-700/50 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-200 dark:border-gray-700 ${minWidth}`}
  >
    <button
      onClick={() =>
        onSort(field)
      }
      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-white"
    >
      {label}
      {icon(field)}
    </button>
  </th>
);

// ============================================================
// LEGEND ITEM
// ============================================================

const LegendItem: React.FC<{
  className: string;
  label: string;
}> = ({
  className,
  label,
}) => (
  <span className="flex items-center gap-1.5 text-sm">
    <span
      className={`w-3 h-3 rounded-full ${className}`}
    />
    {label}
  </span>
);

// ============================================================
// INFO PANEL
// ============================================================

const InfoPanel: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({
  title,
  icon,
  children,
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">

    <div className="flex items-center gap-2 mb-4">

      {icon}

      <h3 className="font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>

    </div>

    {children}

  </div>
);

// ============================================================
// METRIC ROW
// ============================================================

const MetricRow: React.FC<{
  label: string;
  value: string | number;
  danger?: boolean;
  positive?: boolean;
}> = ({
  label,
  value,
  danger,
  positive,
}) => (
  <div className="flex items-center justify-between">

    <span className="text-sm text-gray-500 dark:text-gray-400">
      {label}
    </span>

    <span
      className={`text-sm font-semibold ${
        danger
          ? 'text-red-600'
          : positive
          ? 'text-green-600'
          : 'text-gray-900 dark:text-white'
      }`}
    >
      {value}
    </span>

  </div>
);

// ============================================================
// PAYMENT DETAILS MODAL
// ============================================================

interface PaymentDetailsModalProps {
  student: Student;
  feeData: FeePaymentData | null;

  session: string;
  term: string;

  onClose: () => void;

  formatCurrency: (
    amount: number
  ) => string;
}

const PaymentDetailsModal: React.FC<
  PaymentDetailsModalProps
> = ({
  student,
  feeData,
  session,
  term,
  onClose,
  formatCurrency,
}) => {
  const [allFees, setAllFees] =
    useState<FeePaymentData[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedFeeKey, setSelectedFeeKey] =
    useState<string | null>(
      feeData?.key || null
    );

  const fetchData = useCallback(
    async () => {
      setLoading(true);

      try {
        let assignmentQuery =
          supabase
            .from(
              'student_fee_assignments'
            )
            .select(`
              *,
              fee:fee_id (
                name,
                category,
                amount,
                due_date
              )
            `)
            .eq(
              'student_id',
              student.id
            )
            .eq(
              'is_active',
              true
            );

        if (session) {
          assignmentQuery =
            assignmentQuery.eq(
              'session',
              session
            );
        }

        if (term) {
          assignmentQuery =
            assignmentQuery.eq(
              'term',
              term
            );
        }

        const {
          data: assignments,
          error:
            assignmentsError,
        } =
          await assignmentQuery;

        if (assignmentsError) {
          throw assignmentsError;
        }

        const assignmentIds =
          (assignments || []).map(
            (item: any) =>
              item.id
          );

        let paymentQuery =
          supabase
            .from('payments')
            .select('*')
            .eq(
              'student_id',
              student.id
            )
            .in('status', [
              'completed',
              'paid',
              'approved',
              'success',
            ])
            .order(
              'payment_date',
              {
                ascending: false,
              }
            );

        if (
          assignmentIds.length > 0
        ) {
          paymentQuery =
            paymentQuery.in(
              'assignment_id',
              assignmentIds
            );
        }

        const {
          data: paymentsData,
          error:
            paymentsError,
        } =
          await paymentQuery;

        if (paymentsError) {
          throw paymentsError;
        }

        const feeDataMap: Record<
          string,
          FeePaymentData
        > = {};

        (assignments || []).forEach(
          (assignment: any) => {
            const fee =
              assignment.fee;

            if (!fee) return;

            const assignmentPayments =
              (
                paymentsData || []
              ).filter(
                (payment: any) =>
                  payment.assignment_id ===
                  assignment.id
              );

            const amountDue =
              normalizeAmount(
                assignment.amount_due ??
                  fee.amount
              );

            const amountPaid =
              assignmentPayments.reduce(
                (
                  sum: number,
                  payment: any
                ) =>
                  sum +
                  normalizeAmount(
                    payment.amount_paid
                  ),
                0
              );

            const balance =
              Math.max(
                0,
                amountDue -
                  amountPaid
              );

            const overpayment =
              Math.max(
                0,
                amountPaid -
                  amountDue
              );

            const status =
              getFeeStatus(
                amountDue,
                amountPaid
              );

            const dueDate =
              assignment.due_date ||
              fee.due_date ||
              null;

            const isOverdue =
              Boolean(
                dueDate &&
                  dayjs(
                    dueDate
                  ).isBefore(
                    dayjs(),
                    'day'
                  ) &&
                  balance > 0
              );

            const key =
              getAssignmentKey(
                student.id,
                assignment.id
              );

            feeDataMap[key] = {
              key,

              fee_id:
                fee.id,

              assignment_id:
                assignment.id,

              fee_name:
                fee.name,

              fee_category:
                fee.category ||
                'Other',

              amount_due:
                amountDue,

              amount_paid:
                amountPaid,

              balance,

              overpayment,

              due_date:
                dueDate,

              status,

              percentage:
                amountDue > 0
                  ? Math.min(
                      100,
                      (amountPaid /
                        amountDue) *
                        100
                    )
                  : 0,

              is_overdue:
                isOverdue,

              payment_count:
                assignmentPayments.length,

              last_payment_date:
                assignmentPayments[0]
                  ?.payment_date,

              last_payment_receipt:
                assignmentPayments[0]
                  ?.receipt_number,

              session:
                assignment.session,

              term:
                assignment.term,

              payments:
                assignmentPayments,
            };
          }
        );

        const fees =
          Object.values(
            feeDataMap
          );

        setAllFees(fees);

        if (
          !selectedFeeKey
        ) {
          const firstOutstanding =
            fees.find(
              fee =>
                fee.balance > 0
            );

          setSelectedFeeKey(
            firstOutstanding?.key ||
              fees[0]?.key ||
              null
          );
        }
      } catch (error) {
        console.error(
          'Payment modal error:',
          error
        );

        toast.error(
          'Failed to load payment details'
        );
      } finally {
        setLoading(false);
      }
    },
    [
      student.id,
      session,
      term,
      selectedFeeKey,
    ]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedFee =
    allFees.find(
      fee =>
        fee.key ===
        selectedFeeKey
    );

  const outstandingFees =
    allFees.filter(
      fee =>
        fee.balance > 0
    );

  const totalOutstanding =
    outstandingFees.reduce(
      (sum, fee) =>
        sum + fee.balance,
      0
    );

  const viewReceipt = (
    payment: Payment
  ) => {
    const url =
      payment.receipt_url ||
      payment.payment_proof_url;

    if (!url) {
      toast.info(
        'No receipt or proof file is attached.'
      );
      return;
    }

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => {
        if (
          e.target ===
          e.currentTarget
        ) {
          onClose();
        }
      }}
    >

      <motion.div
        initial={{
          scale: 0.96,
          opacity: 0,
        }}
        animate={{
          scale: 1,
          opacity: 1,
        }}
        exit={{
          scale: 0.96,
          opacity: 0,
        }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl"
      >

        {/* HEADER */}

        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-5 flex items-center justify-between">

          <div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Student Payment Details
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              {student.first_name}{' '}
              {student.last_name}
              {' • '}
              {student.student_id}
            </p>

          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>

        </div>

        <div className="p-5 space-y-5">

          {/* PERIOD */}

          <div className="flex flex-wrap gap-2">

            {session && (
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                {session}
              </span>
            )}

            {term && (
              <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                {term}
              </span>
            )}

            <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
              {student.class_name}
            </span>

          </div>

          {/* OUTSTANDING */}

          {outstandingFees.length >
            0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">

              <div className="flex items-center gap-2">

                <AlertTriangle className="w-5 h-5 text-red-600" />

                <div>
                  <p className="font-semibold text-red-700 dark:text-red-300">
                    Outstanding Fees
                  </p>

                  <p className="text-xs text-red-500">
                    {outstandingFees.length}{' '}
                    fee assignment
                    {outstandingFees.length !==
                    1
                      ? 's'
                      : ''}{' '}
                    require attention.
                  </p>
                </div>

              </div>

              <div className="mt-3 space-y-2">

                {outstandingFees.map(
                  fee => (
                    <button
                      key={fee.key}
                      onClick={() =>
                        setSelectedFeeKey(
                          fee.key
                        )
                      }
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedFeeKey ===
                        fee.key
                          ? 'border-red-400 bg-red-100 dark:bg-red-900/30'
                          : 'border-transparent hover:bg-red-100/60 dark:hover:bg-red-900/20'
                      }`}
                    >

                      <div className="flex justify-between gap-3">

                        <div>

                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {fee.fee_name}
                          </p>

                          <p className="text-xs text-gray-500 mt-1">
                            {fee.session ||
                              'No session'}{' '}
                            •{' '}
                            {fee.term ||
                              'No term'}
                          </p>

                          {fee.is_overdue && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-red-600 mt-1">
                              <Clock className="w-3 h-3" />
                              Overdue
                            </span>
                          )}

                        </div>

                        <div className="text-right">

                          <p className="font-bold text-red-600">
                            {formatCurrency(
                              fee.balance
                            )}
                          </p>

                          <p className="text-[10px] text-gray-500">
                            of{' '}
                            {formatCurrency(
                              fee.amount_due
                            )}
                          </p>

                        </div>

                      </div>

                    </button>
                  )
                )}

              </div>

              <div className="flex justify-between border-t border-red-200 dark:border-red-800 pt-3 mt-3">

                <span className="font-semibold text-red-700">
                  Total Outstanding
                </span>

                <span className="font-bold text-red-600">
                  {formatCurrency(
                    totalOutstanding
                  )}
                </span>

              </div>

            </div>
          )}

          {/* FEE SELECTOR */}

          {allFees.length > 1 && (
            <div>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fee Assignment
              </label>

              <select
                value={
                  selectedFeeKey ||
                  ''
                }
                onChange={e =>
                  setSelectedFeeKey(
                    e.target.value
                  )
                }
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white"
              >

                {allFees.map(
                  fee => (
                    <option
                      key={fee.key}
                      value={fee.key}
                    >
                      {fee.fee_name} —{' '}
                      {fee.session ||
                        'N/A'}{' '}
                      {fee.term ||
                        ''}{' '}
                      —{' '}
                      {fee.status.toUpperCase()}
                    </option>
                  )
                )}

              </select>

            </div>
          )}

          {/* SELECTED FEE */}

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            </div>
          ) : selectedFee ? (
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <h4 className="font-bold text-gray-900 dark:text-white">
                    {selectedFee.fee_name}
                  </h4>

                  <p className="text-xs text-gray-500 mt-1">
                    {selectedFee.fee_category.replace(
                      /_/g,
                      ' '
                    )}
                  </p>

                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    selectedFee.is_overdue
                      ? 'bg-red-100 text-red-700'
                      : getStatusBadgeColor(
                          selectedFee.status
                        )
                  }`}
                >
                  {selectedFee.is_overdue
                    ? 'OVERDUE'
                    : selectedFee.status.toUpperCase()}
                </span>

              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">

                <ModalMetric
                  label="Amount Due"
                  value={formatCurrency(
                    selectedFee.amount_due
                  )}
                />

                <ModalMetric
                  label="Amount Paid"
                  value={formatCurrency(
                    selectedFee.amount_paid
                  )}
                  positive
                />

                <ModalMetric
                  label="Balance"
                  value={formatCurrency(
                    selectedFee.balance
                  )}
                  danger={
                    selectedFee.balance >
                    0
                  }
                />

                <ModalMetric
                  label="Payments"
                  value={
                    selectedFee.payment_count
                  }
                />

              </div>

              <div className="mt-5">

                <div className="flex justify-between text-xs text-gray-500 mb-1">

                  <span>
                    Payment progress
                  </span>

                  <span>
                    {selectedFee.percentage.toFixed(
                      1
                    )}
                    %
                  </span>

                </div>

                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">

                  <div
                    className={`h-full rounded-full ${
                      selectedFee.is_overdue
                        ? 'bg-red-500'
                        : selectedFee.status === 'paid'
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        selectedFee.percentage
                      )}%`,
                    }}
                  />

                </div>

              </div>

              <div className="grid grid-cols-2 gap-3 mt-5 text-xs">

                <DetailItem
                  label="Session"
                  value={
                    selectedFee.session ||
                    'Not specified'
                  }
                />

                <DetailItem
                  label="Term"
                  value={
                    selectedFee.term ||
                    'Not specified'
                  }
                />

                <DetailItem
                  label="Due Date"
                  value={
                    selectedFee.due_date
                      ? dayjs(
                          selectedFee.due_date
                        ).format(
                          'MMM D, YYYY'
                        )
                      : 'No due date'
                  }
                />

                <DetailItem
                  label="Last Payment"
                  value={
                    selectedFee.last_payment_date
                      ? dayjs(
                          selectedFee.last_payment_date
                        ).format(
                          'MMM D, YYYY h:mm A'
                        )
                      : 'No payment'
                  }
                />

              </div>

              {selectedFee.overpayment >
                0 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">

                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Overpayment detected:{' '}
                    <strong>
                      {formatCurrency(
                        selectedFee.overpayment
                      )}
                    </strong>
                  </p>

                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              No fee assignment found for this period.
            </div>
          )}

          {/* PAYMENT HISTORY */}

          {selectedFee && (
            <div>

              <div className="flex items-center justify-between mb-3">

                <h5 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Payment History
                </h5>

                <span className="text-xs text-gray-400">
                  {selectedFee.payment_count}{' '}
                  transaction
                  {selectedFee.payment_count !==
                  1
                    ? 's'
                    : ''}
                </span>

              </div>

              {selectedFee.payments
                .length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl">

                  <Receipt className="w-10 h-10 mx-auto text-gray-300 mb-2" />

                  <p className="text-sm text-gray-500">
                    No successful payment recorded for this assignment.
                  </p>

                </div>
              ) : (
                <div className="space-y-2">

                  {selectedFee.payments.map(
                    payment => (
                      <div
                        key={
                          payment.id
                        }
                        className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl"
                      >

                        <div className="min-w-0">

                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(
                              payment.amount_paid
                            )}
                          </p>

                          <p className="text-xs text-gray-500 mt-1">
                            {dayjs(
                              payment.payment_date
                            ).format(
                              'MMM D, YYYY h:mm A'
                            )}
                          </p>

                          <p className="text-xs text-gray-400 mt-0.5">
                            {payment.payment_method?.replace(
                              /_/g,
                              ' '
                            )}
                          </p>

                          {payment.receipt_number && (
                            <p className="text-[10px] font-mono text-gray-400 mt-1">
                              Receipt:{' '}
                              {payment.receipt_number}
                            </p>
                          )}

                        </div>

                        <div className="flex items-center gap-2">

                          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">
                            {payment.status}
                          </span>

                          {(
                            payment.receipt_url ||
                            payment.payment_proof_url
                          ) && (
                            <button
                              onClick={() =>
                                viewReceipt(
                                  payment
                                )
                              }
                              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-blue-600"
                              title="View receipt"
                            >
                              <FileImage className="w-4 h-4" />
                            </button>
                          )}

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
          >
            Close
          </button>

        </div>

      </motion.div>

    </motion.div>
  );
};

// ============================================================
// MODAL METRIC
// ============================================================

const ModalMetric: React.FC<{
  label: string;
  value: string | number;
  positive?: boolean;
  danger?: boolean;
}> = ({
  label,
  value,
  positive,
  danger,
}) => (
  <div>

    <p className="text-xs text-gray-500">
      {label}
    </p>

    <p
      className={`text-lg font-bold mt-1 ${
        danger
          ? 'text-red-600'
          : positive
          ? 'text-green-600'
          : 'text-gray-900 dark:text-white'
      }`}
    >
      {value}
    </p>

  </div>
);

// ============================================================
// DETAIL ITEM
// ============================================================

const DetailItem: React.FC<{
  label: string;
  value: string;
}> = ({
  label,
  value,
}) => (
  <div>

    <span className="text-gray-400">
      {label}
    </span>

    <span className="ml-1 text-gray-700 dark:text-gray-300">
      {value}
    </span>

  </div>
);

export default ReportsDashboard;