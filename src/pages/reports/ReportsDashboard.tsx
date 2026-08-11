import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  CreditCard,
  Receipt,
  Calendar,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileImage,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

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
  amount_paid: number;
  balance: number;
  due_date: string;
  payment_status: string;
  session: string;
  term: string;
  fee_name?: string;
  fee_category?: string;
  created_at?: string;
  assigned_date?: string;
  assignment_id?: string;
}

interface Payment {
  id: string;
  student_id: string;
  fee_id: string;
  assignment_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  status: string;
  receipt_url?: string;
  payment_proof_url?: string;
}

interface FeePaymentData {
  fee_id: string;
  fee_name: string;
  fee_category: string;
  amount_due: number;
  amount_paid: number;
  balance: number;
  due_date: string | null;
  status: 'paid' | 'partial' | 'unpaid';
  percentage: number;
  last_payment_date?: string;
  last_payment_receipt?: string;
  assignment_id?: string;
  created_at?: string;
  session?: string;
  term?: string;
}

interface StudentRowData {
  student: Student;
  fees: Record<string, FeePaymentData>;
  totalDue: number;
  totalPaid: number;
  totalBalance: number;
  status: 'paid' | 'partial' | 'unpaid';
}

interface SummaryStats {
  totalStudents: number;
  paidStudents: number;
  partialStudents: number;
  unpaidStudents: number;
  totalExpectedRevenue: number;
  totalRevenueCollected: number;
  outstandingBalance: number;
  collectionRate: number;
}

interface FeeColumnTotals {
  fee_id: string;
  fee_name: string;
  fee_category: string;
  collected: number;
  outstanding: number;
  paidStudents: number;
  partialStudents: number;
  unpaidStudents: number;
  totalStudents: number;
}

// ============================================
// MAIN COMPONENT
// ============================================

const ReportsDashboard: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [allAssignments, setAllAssignments] = useState<FeeAssignment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [studentRows, setStudentRows] = useState<StudentRowData[]>([]);
  const [filteredRows, setFilteredRows] = useState<StudentRowData[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalStudents: 0,
    paidStudents: 0,
    partialStudents: 0,
    unpaidStudents: 0,
    totalExpectedRevenue: 0,
    totalRevenueCollected: 0,
    outstandingBalance: 0,
    collectionRate: 0,
  });
  const [feeColumnTotals, setFeeColumnTotals] = useState<FeeColumnTotals[]>([]);

  const [filters, setFilters] = useState({
    session: '',
    term: '',
    class: 'all',
    feeCategory: 'all',
    paymentStatus: 'all',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedFee, setSelectedFee] = useState<FeePaymentData | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [classes, setClasses] = useState<{ id: string; name: string; level: string }[]>([]);
  const [feeCategories, setFeeCategories] = useState<string[]>([]);
  const [academicSessions, setAcademicSessions] = useState<string[]>([]);
  const [academicTerms, setAcademicTerms] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('student_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const tableRef = useRef<HTMLDivElement>(null);

  // ============================================
  // FETCH DATA
  // ============================================

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    try {
      const branchId = user?.branch_id || (user as any)?.metadata?.branch_id;
      if (!branchId) {
        toast.error('No branch found for this user');
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase
        .from('academic_sessions')
        .select('session_name, term_name')
        .eq('branch_id', branchId)
        .eq('is_current', true)
        .single();

      const currentSession = sessionData?.session_name || '';
      const currentTerm = sessionData?.term_name || '';

      setFilters(prev => ({
        ...prev,
        session: currentSession,
        term: currentTerm,
      }));

      const { data: studentsData } = await supabase
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
          class:class_id (name, level)
        `)
        .eq('branch_id', branchId)
        .eq('current_status', 'active')
        .order('first_name');

      const studentsWithClass = (studentsData || []).map(s => ({
        ...s,
        class_name: s.class?.name || 'Not Assigned',
        class_level: s.class?.level || '',
      }));
      setStudents(studentsWithClass);

      const { data: feesData } = await supabase
        .from('fees')
        .select('*')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('name');
      setFees(feesData || []);

      const { data: assignmentsData } = await supabase
        .from('student_fee_assignments')
        .select(`
          *,
          fee:fee_id (name, category, created_at, description)
        `)
        .eq('branch_id', branchId)
        .eq('is_active', true);

      const assignmentsWithFeeNames = (assignmentsData || []).map(a => ({
        ...a,
        fee_name: a.fee?.name || 'Unknown Fee',
        fee_category: a.fee?.category || 'Other',
        created_at: a.fee?.created_at || a.assigned_date || new Date().toISOString(),
        assignment_id: a.id,
      }));
      setAllAssignments(assignmentsWithFeeNames);

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('branch_id', branchId)
        .in('status', ['completed', 'paid', 'approved', 'success']);
      setPayments(paymentsData || []);

      await fetchFilterOptions(branchId);

      buildPaymentMatrix(
        studentsWithClass,
        feesData || [],
        assignmentsWithFeeNames || [],
        paymentsData || [],
        currentSession,
        currentTerm
      );

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.branch_id) {
      fetchData();
    }
  }, [user?.branch_id]);

  const fetchFilterOptions = async (branchId: string) => {
    try {
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name, level')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('name');
      setClasses(classData || []);

      const { data: feeData } = await supabase
        .from('fees')
        .select('category')
        .eq('branch_id', branchId)
        .eq('status', 'active');
      const categories = [...new Set((feeData || []).map(f => f.category).filter(Boolean))];
      setFeeCategories(categories);

      const { data: sessionData } = await supabase
        .from('academic_sessions')
        .select('session_name')
        .eq('branch_id', branchId)
        .order('session_name', { ascending: false });
      const sessions = [...new Set((sessionData || []).map(s => s.session_name).filter(Boolean))];
      setAcademicSessions(sessions);

      const { data: termData } = await supabase
        .from('academic_sessions')
        .select('term_name')
        .eq('branch_id', branchId);
      const terms = [...new Set((termData || []).map(t => t.term_name).filter(Boolean))];
      setAcademicTerms(terms);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  // ============================================
  // BUILD PAYMENT MATRIX
  // ============================================

  const buildPaymentMatrix = useCallback((
    studentsData: any[],
    feesData: Fee[],
    assignmentsData: any[],
    paymentsData: Payment[],
    sessionFilter: string,
    termFilter: string
  ) => {
    let filteredAssignments = assignmentsData;
    
    if (sessionFilter && termFilter) {
      filteredAssignments = assignmentsData.filter(a => {
        const sessionMatch = a.session === sessionFilter || !a.session;
        const termMatch = a.term === termFilter || !a.term;
        return sessionMatch && termMatch;
      });
    } else if (sessionFilter) {
      filteredAssignments = assignmentsData.filter(a => {
        return a.session === sessionFilter || !a.session;
      });
    } else if (termFilter) {
      filteredAssignments = assignmentsData.filter(a => {
        return a.term === termFilter || !a.term;
      });
    }

    if (filteredAssignments.length === 0 && assignmentsData.length > 0) {
      filteredAssignments = assignmentsData;
    }

    const assignmentsByStudent: Record<string, any[]> = {};
    filteredAssignments.forEach(a => {
      if (!assignmentsByStudent[a.student_id]) {
        assignmentsByStudent[a.student_id] = [];
      }
      assignmentsByStudent[a.student_id].push(a);
    });

    const paymentsByStudentFee: Record<string, Record<string, Payment[]>> = {};
    paymentsData.forEach(p => {
      if (!p.student_id || !p.fee_id) return;
      if (!paymentsByStudentFee[p.student_id]) {
        paymentsByStudentFee[p.student_id] = {};
      }
      if (!paymentsByStudentFee[p.student_id][p.fee_id]) {
        paymentsByStudentFee[p.student_id][p.fee_id] = [];
      }
      paymentsByStudentFee[p.student_id][p.fee_id].push(p);
    });

    const rows: StudentRowData[] = studentsData.map(student => {
      const studentAssignments = assignmentsByStudent[student.id] || [];
      const feeData: Record<string, FeePaymentData> = {};

      feesData.forEach(fee => {
        const assignment = studentAssignments.find(a => a.fee_id === fee.id);
        const studentPayments = paymentsByStudentFee[student.id]?.[fee.id] || [];

        if (assignment) {
          const totalPaid = studentPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
          const amountDue = assignment.amount_due || fee.amount || 0;
          const balance = Math.max(0, amountDue - totalPaid);

          let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
          const percentage = amountDue > 0 ? (totalPaid / amountDue) * 100 : 0;

          if (totalPaid >= amountDue && amountDue > 0) {
            status = 'paid';
          } else if (totalPaid > 0 && totalPaid < amountDue) {
            status = 'partial';
          }

          let lastPaymentDate: string | undefined;
          let lastPaymentReceipt: string | undefined;
          if (studentPayments.length > 0) {
            const sorted = [...studentPayments].sort((a, b) =>
              dayjs(b.payment_date).diff(dayjs(a.payment_date))
            );
            lastPaymentDate = sorted[0]?.payment_date;
            lastPaymentReceipt = sorted[0]?.receipt_number;
          }

          feeData[fee.id] = {
            fee_id: fee.id,
            fee_name: fee.name,
            fee_category: fee.category,
            amount_due: amountDue,
            amount_paid: totalPaid,
            balance: balance,
            due_date: assignment.due_date || fee.due_date || null,
            status: status,
            percentage: percentage,
            last_payment_date: lastPaymentDate,
            last_payment_receipt: lastPaymentReceipt,
            assignment_id: assignment.id,
            created_at: assignment.created_at || assignment.assigned_date,
            session: assignment.session,
            term: assignment.term,
          };
        }
      });

      let totalDue = 0;
      let totalPaid = 0;
      let totalBalance = 0;
      let rowStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';

      Object.values(feeData).forEach(f => {
        totalDue += f.amount_due;
        totalPaid += f.amount_paid;
        totalBalance += f.balance;
        if (f.status === 'paid' && rowStatus !== 'partial') rowStatus = 'paid';
        if (f.status === 'partial') rowStatus = 'partial';
      });

      return {
        student,
        fees: feeData,
        totalDue,
        totalPaid,
        totalBalance,
        status: rowStatus,
      };
    });

    setStudentRows(rows);
    setFilteredRows(rows);
    calculateSummaryStats(rows);
    calculateFeeColumnTotals(rows, feesData);
  }, []);

  // ============================================
  // HANDLE FILTER CHANGES
  // ============================================

  const handleFilterChange = useCallback(() => {
    const session = filters.session;
    const term = filters.term;

    buildPaymentMatrix(
      students,
      fees,
      allAssignments,
      payments,
      session,
      term
    );
  }, [filters.session, filters.term, students, fees, allAssignments, payments, buildPaymentMatrix]);

  useEffect(() => {
    if (!loading) {
      handleFilterChange();
    }
  }, [filters.session, filters.term, handleFilterChange, loading]);

  // ============================================
  // CALCULATE STATS
  // ============================================

  const calculateSummaryStats = useCallback((rows: StudentRowData[]) => {
    const stats: SummaryStats = {
      totalStudents: rows.length,
      paidStudents: 0,
      partialStudents: 0,
      unpaidStudents: 0,
      totalExpectedRevenue: 0,
      totalRevenueCollected: 0,
      outstandingBalance: 0,
      collectionRate: 0,
    };

    rows.forEach(row => {
      if (row.status === 'paid') stats.paidStudents++;
      else if (row.status === 'partial') stats.partialStudents++;
      else stats.unpaidStudents++;

      stats.totalExpectedRevenue += row.totalDue;
      stats.totalRevenueCollected += row.totalPaid;
      stats.outstandingBalance += row.totalBalance;
    });

    stats.collectionRate = stats.totalExpectedRevenue > 0
      ? (stats.totalRevenueCollected / stats.totalExpectedRevenue) * 100
      : 0;

    setSummaryStats(stats);
  }, []);

  const calculateFeeColumnTotals = useCallback((rows: StudentRowData[], feesData: Fee[]) => {
    const totals: Record<string, FeeColumnTotals> = {};

    feesData.forEach(fee => {
      totals[fee.id] = {
        fee_id: fee.id,
        fee_name: fee.name,
        fee_category: fee.category,
        collected: 0,
        outstanding: 0,
        paidStudents: 0,
        partialStudents: 0,
        unpaidStudents: 0,
        totalStudents: rows.length,
      };
    });

    rows.forEach(row => {
      Object.entries(row.fees).forEach(([feeId, feeData]) => {
        if (totals[feeId]) {
          totals[feeId].collected += feeData.amount_paid;
          totals[feeId].outstanding += feeData.balance;

          if (feeData.status === 'paid') totals[feeId].paidStudents++;
          else if (feeData.status === 'partial') totals[feeId].partialStudents++;
          else totals[feeId].unpaidStudents++;
        }
      });
    });

    setFeeColumnTotals(Object.values(totals));
  }, []);

  // ============================================
  // APPLY FILTERS
  // ============================================

  const applyFilters = useCallback(() => {
    let filtered = [...studentRows];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        row.student.first_name?.toLowerCase().includes(term) ||
        row.student.last_name?.toLowerCase().includes(term) ||
        row.student.student_id?.toLowerCase().includes(term) ||
        row.student.admission_number?.toLowerCase().includes(term) ||
        row.student.phone_number?.toLowerCase().includes(term)
      );
    }

    if (filters.class !== 'all') {
      filtered = filtered.filter(row => row.student.class_id === filters.class);
    }

    if (filters.paymentStatus !== 'all') {
      filtered = filtered.filter(row => row.status === filters.paymentStatus);
    }

    if (filters.feeCategory !== 'all') {
      filtered = filtered.filter(row => {
        return Object.values(row.fees).some(f => f.fee_category === filters.feeCategory && f.amount_due > 0);
      });
    }

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'student_id':
          aVal = a.student.student_id;
          bVal = b.student.student_id;
          break;
        case 'student_name':
          aVal = `${a.student.first_name} ${a.student.last_name}`;
          bVal = `${b.student.first_name} ${b.student.last_name}`;
          break;
        case 'class':
          aVal = a.student.class_name;
          bVal = b.student.class_name;
          break;
        case 'total_due':
          aVal = a.totalDue;
          bVal = b.totalDue;
          break;
        case 'total_paid':
          aVal = a.totalPaid;
          bVal = b.totalPaid;
          break;
        case 'total_balance':
          aVal = a.totalBalance;
          bVal = b.totalBalance;
          break;
        case 'status':
          const statusOrder = { paid: 0, partial: 1, unpaid: 2 };
          aVal = statusOrder[a.status] || 0;
          bVal = statusOrder[b.status] || 0;
          break;
        default:
          aVal = a.student.student_id;
          bVal = b.student.student_id;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredRows(filtered);
    setCurrentPage(1);
  }, [studentRows, searchTerm, filters, sortField, sortDirection]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  const exportToExcel = () => {
    try {
      const data = filteredRows.map(row => {
        const rowData: any = {
          'Student ID': row.student.student_id,
          'Student Name': `${row.student.first_name} ${row.student.last_name}`,
          'Class': row.student.class_name,
          'Total Due': row.totalDue,
          'Total Paid': row.totalPaid,
          'Total Balance': row.totalBalance,
          'Status': row.status.toUpperCase(),
        };

        Object.entries(row.fees).forEach(([feeId, feeData]) => {
          if (feeData.amount_due > 0) {
            rowData[`${feeData.fee_name} - Due`] = feeData.amount_due;
            rowData[`${feeData.fee_name} - Paid`] = feeData.amount_paid;
            rowData[`${feeData.fee_name} - Balance`] = feeData.balance;
            rowData[`${feeData.fee_name} - Status`] = feeData.status.toUpperCase();
          }
        });

        return rowData;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Payment Matrix');
      XLSX.writeFile(wb, `payment_matrix_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      toast.success('Excel file downloaded successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export to Excel');
    }
  };

  const exportToCSV = () => {
    try {
      const data = filteredRows.map(row => {
        const rowData: any = {
          'Student ID': row.student.student_id,
          'Student Name': `${row.student.first_name} ${row.student.last_name}`,
          'Class': row.student.class_name,
          'Total Due': row.totalDue,
          'Total Paid': row.totalPaid,
          'Total Balance': row.totalBalance,
          'Status': row.status.toUpperCase(),
        };

        Object.entries(row.fees).forEach(([feeId, feeData]) => {
          if (feeData.amount_due > 0) {
            rowData[`${feeData.fee_name} - Due`] = feeData.amount_due;
            rowData[`${feeData.fee_name} - Paid`] = feeData.amount_paid;
            rowData[`${feeData.fee_name} - Balance`] = feeData.balance;
            rowData[`${feeData.fee_name} - Status`] = feeData.status.toUpperCase();
          }
        });

        return rowData;
      });

      const headers = Object.keys(data[0] || {});
      let csv = headers.join(',') + '\n';
      data.forEach(row => {
        csv += headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `payment_matrix_${dayjs().format('YYYY-MM-DD')}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('CSV file downloaded successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export to CSV');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ============================================
  // CELL CLICK HANDLER
  // ============================================

  const handleCellClick = (student: Student, feeData: FeePaymentData) => {
    if (feeData.amount_due === 0) return;
    setSelectedStudent(student);
    setSelectedFee(feeData);
    setShowPaymentModal(true);
  };

  // ============================================
  // PAGINATION
  // ============================================

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // ============================================
  // RENDER HELPERS
  // ============================================

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'partial': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'partial': return 'Partial';
      default: return 'Unpaid';
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

  const visibleFees = useMemo(() => {
    const feeIdsWithAssignments = new Set(allAssignments
      .filter(a => {
        const sessionMatch = !filters.session || a.session === filters.session || !a.session;
        const termMatch = !filters.term || a.term === filters.term || !a.term;
        return sessionMatch && termMatch;
      })
      .map(a => a.fee_id));
    return fees.filter(f => feeIdsWithAssignments.has(f.id));
  }, [fees, allAssignments, filters.session, filters.term]);

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500">Loading payment matrix...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Payment Matrix Report
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Fee payment status for all students
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrint}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={exportToCSV}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={exportToExcel}
            className="px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-all text-sm flex items-center gap-1.5 shadow-lg shadow-green-500/25"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 print:hidden">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Students</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{summaryStats.totalStudents}</p>
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
            <CheckCircle className="w-3 h-3" />
            {summaryStats.paidStudents} paid
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Collection Rate</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {summaryStats.collectionRate.toFixed(1)}%
          </p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1.5">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(summaryStats.collectionRate, 100)}%` }}
            />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Collected</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(summaryStats.totalRevenueCollected)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(summaryStats.outstandingBalance)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Partial</p>
          <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
            {summaryStats.partialStudents}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Expected Revenue</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(summaryStats.totalExpectedRevenue)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[180px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
            />
          </div>

          <select
            value={filters.session}
            onChange={(e) => setFilters({ ...filters, session: e.target.value })}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm min-w-[140px]"
          >
            <option value="">All Sessions</option>
            {academicSessions.map(session => (
              <option key={session} value={session}>{session}</option>
            ))}
          </select>

          <select
            value={filters.term}
            onChange={(e) => setFilters({ ...filters, term: e.target.value })}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm min-w-[140px]"
          >
            <option value="">All Terms</option>
            {academicTerms.map(term => (
              <option key={term} value={term}>{term}</option>
            ))}
          </select>

          <select
            value={filters.class}
            onChange={(e) => setFilters({ ...filters, class: e.target.value })}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm min-w-[140px]"
          >
            <option value="all">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>

          <select
            value={filters.paymentStatus}
            onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm min-w-[140px]"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>

          <select
            value={filters.feeCategory}
            onChange={(e) => setFilters({ ...filters, feeCategory: e.target.value })}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm min-w-[140px]"
          >
            <option value="all">All Categories</option>
            {feeCategories.map(cat => (
              <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setFilters({
                session: '',
                term: '',
                class: 'all',
                paymentStatus: 'all',
                feeCategory: 'all',
              });
            }}
            className="px-3 py-2 text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl print:hidden">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Legend:</span>
          <span className="flex items-center gap-1.5 text-sm">
            <span className="w-3 h-3 bg-green-500 rounded-full" />
            Paid
          </span>
          <span className="flex items-center gap-1.5 text-sm">
            <span className="w-3 h-3 bg-yellow-500 rounded-full" />
            Partial
          </span>
          <span className="flex items-center gap-1.5 text-sm">
            <span className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
            Unpaid
          </span>
          <button
            onClick={() => setShowLegend(false)}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600"
          >
            Hide
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div ref={tableRef} className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="sticky left-0 z-20 bg-gray-50 dark:bg-gray-700/50 px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 min-w-[100px]">
                  <button
                    onClick={() => {
                      if (sortField === 'student_id') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('student_id');
                        setSortDirection('asc');
                      }
                    }}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Student ID
                    {sortField === 'student_id' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="sticky left-[100px] z-20 bg-gray-50 dark:bg-gray-700/50 px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 min-w-[150px]">
                  <button
                    onClick={() => {
                      if (sortField === 'student_name') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('student_name');
                        setSortDirection('asc');
                      }
                    }}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Student Name
                    {sortField === 'student_name' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="sticky left-[250px] z-20 bg-gray-50 dark:bg-gray-700/50 px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 min-w-[100px]">
                  <button
                    onClick={() => {
                      if (sortField === 'class') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('class');
                        setSortDirection('asc');
                      }
                    }}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Class
                    {sortField === 'class' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                {visibleFees.map((fee) => (
                  <th
                    key={fee.id}
                    className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px] border-r border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-medium">{fee.name}</span>
                      <span className="text-[10px] text-gray-400 font-normal">{fee.category?.replace(/_/g, ' ')}</span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">
                  Total Due
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">
                  Total Paid
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">
                  Balance
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[80px]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleFees.length + 8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <BarChart3 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-lg font-medium">No students found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or search terms</p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr
                    key={row.student.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all"
                  >
                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 py-2.5 border-r border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-600 dark:text-gray-300">
                      {row.student.student_id}
                    </td>
                    <td className="sticky left-[100px] z-10 bg-white dark:bg-gray-800 px-3 py-2.5 border-r border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                      {row.student.first_name} {row.student.last_name}
                    </td>
                    <td className="sticky left-[250px] z-10 bg-white dark:bg-gray-800 px-3 py-2.5 border-r border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 truncate max-w-[100px]">
                      {row.student.class_name}
                    </td>

                    {visibleFees.map((fee) => {
                      const feeData = row.fees[fee.id];
                      if (!feeData || feeData.amount_due === 0) {
                        return (
                          <td
                            key={fee.id}
                            className="px-2 py-2.5 text-center border-r border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600"
                          >
                            —
                          </td>
                        );
                      }

                      const status = feeData.status;
                      const bgColor = status === 'paid' ? 'bg-green-50 dark:bg-green-900/20' :
                        status === 'partial' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                        'bg-gray-50 dark:bg-gray-800';

                      return (
                        <td
                          key={fee.id}
                          className={`px-2 py-2.5 text-center border-r border-gray-200 dark:border-gray-700 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all ${bgColor}`}
                          onClick={() => handleCellClick(row.student, feeData)}
                        >
                          <div className="flex flex-col items-center">
                            <span className={`text-xs font-medium ${
                              status === 'paid' ? 'text-green-600 dark:text-green-400' :
                              status === 'partial' ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-gray-500 dark:text-gray-400'
                            }`}>
                              {status === 'paid' ? '✓' :
                               status === 'partial' ? `${Math.round(feeData.percentage)}%` :
                               '○'}
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              {formatCurrency(feeData.amount_paid)} / {formatCurrency(feeData.amount_due)}
                            </span>
                          </div>
                        </td>
                      );
                    })}

                    <td className="px-3 py-2.5 text-center text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(row.totalDue)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-sm font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(row.totalPaid)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-sm font-medium text-red-600 dark:text-red-400">
                      {formatCurrency(row.totalBalance)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(row.status)}`}>
                        {row.status === 'paid' && <CheckCircle className="w-3 h-3" />}
                        {row.status === 'partial' && <AlertCircle className="w-3 h-3" />}
                        {row.status === 'unpaid' && <XCircle className="w-3 h-3" />}
                        {getStatusLabel(row.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {paginatedRows.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-300 dark:border-gray-600">
                <tr>
                  <td className="sticky left-0 z-20 bg-gray-50 dark:bg-gray-700/50 px-3 py-2.5 border-r border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">
                    Totals
                  </td>
                  <td className="sticky left-[100px] z-20 bg-gray-50 dark:bg-gray-700/50 px-3 py-2.5 border-r border-gray-200 dark:border-gray-700"></td>
                  <td className="sticky left-[250px] z-20 bg-gray-50 dark:bg-gray-700/50 px-3 py-2.5 border-r border-gray-200 dark:border-gray-700"></td>
                  {visibleFees.map((fee) => {
                    const total = feeColumnTotals.find(t => t.fee_id === fee.id);
                    return (
                      <td key={fee.id} className="px-2 py-2.5 text-center border-r border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col items-center text-[10px]">
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            {formatCurrency(total?.collected || 0)}
                          </span>
                          <span className="text-red-600 dark:text-red-400">
                            {formatCurrency(total?.outstanding || 0)}
                          </span>
                          <span className="text-gray-400">
                            {total?.paidStudents || 0}/{total?.totalStudents || 0} paid
                          </span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(paginatedRows.reduce((sum, r) => sum + r.totalDue, 0))}
                  </td>
                  <td className="px-3 py-2.5 text-center font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(paginatedRows.reduce((sum, r) => sum + r.totalPaid, 0))}
                  </td>
                  <td className="px-3 py-2.5 text-center font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(paginatedRows.reduce((sum, r) => sum + r.totalBalance, 0))}
                  </td>
                  <td className="px-3 py-2.5 text-center"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 print:hidden">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredRows.length)} to {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedStudent && selectedFee && (
          <PaymentDetailsModal
            student={selectedStudent}
            feeData={selectedFee}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedStudent(null);
              setSelectedFee(null);
            }}
            formatCurrency={formatCurrency}
          />
        )}
      </AnimatePresence>

      <div className="text-center text-xs text-gray-400 dark:text-gray-500 print:hidden">
        <p>Report generated {dayjs().format('MMMM D, YYYY h:mm A')}</p>
        <p className="mt-1">© {dayjs().year()} ebenezer International School. All rights reserved.</p>
      </div>
    </div>
  );
};

// ============================================
// PAYMENT DETAILS MODAL
// ============================================

interface PaymentDetailsModalProps {
  student: Student;
  feeData: FeePaymentData;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
}

const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  student,
  feeData,
  onClose,
  formatCurrency,
}) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('student_id', student.id)
          .eq('fee_id', feeData.fee_id)
          .order('payment_date', { ascending: false });

        if (!error) {
          setPayments(data || []);
        }
      } catch (error) {
        console.error('Error fetching payment details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [student.id, feeData.fee_id]);

  const viewReceipt = (payment: any) => {
    const receiptUrl = payment.receipt_url || payment.payment_proof_url;
    if (receiptUrl) {
      window.open(receiptUrl, '_blank');
    } else {
      toast.info('No receipt/proof uploaded for this payment');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'partial': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Fee Details
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {student.first_name} {student.last_name} • {student.student_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <h4 className="font-medium text-gray-900 dark:text-white">{feeData.fee_name}</h4>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(feeData.status)}`}>
                {feeData.status.toUpperCase()}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Amount Due</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(feeData.amount_due)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Amount Paid</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(feeData.amount_paid)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                <p className={`text-lg font-bold ${feeData.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(feeData.balance)}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-2 text-xs">
              {feeData.session && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Session:</span>
                  <span className="ml-1 text-gray-700 dark:text-gray-300">{feeData.session}</span>
                </div>
              )}
              {feeData.term && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Term:</span>
                  <span className="ml-1 text-gray-700 dark:text-gray-300">{feeData.term}</span>
                </div>
              )}
              {feeData.created_at && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Created:</span>
                  <span className="ml-1 text-gray-700 dark:text-gray-300">
                    {dayjs(feeData.created_at).format('MMM D, YYYY h:mm A')}
                  </span>
                </div>
              )}
              {feeData.due_date && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Due Date:</span>
                  <span className="ml-1 text-gray-700 dark:text-gray-300">
                    {dayjs(feeData.due_date).format('MMM D, YYYY')}
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-500 dark:text-gray-400">Category:</span>
                <span className="ml-1 text-gray-700 dark:text-gray-300">{feeData.fee_category?.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Payment History
            </h5>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <Receipt className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p>No payment records found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(payment.amount_paid)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {dayjs(payment.payment_date).format('MMM D, YYYY')} • {payment.payment_method?.replace(/_/g, ' ')}
                      </p>
                      {payment.receipt_number && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                          Receipt: {payment.receipt_number}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        payment.status === 'completed' || payment.status === 'paid' || payment.status === 'approved'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {payment.status}
                      </span>
                      <button
                        onClick={() => viewReceipt(payment)}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all text-blue-500 hover:text-blue-700"
                        title="View Receipt/Proof"
                      >
                        <FileImage className="w-4 h-4" />
                      </button>
                      {(payment.receipt_url || payment.payment_proof_url) && (
                        <a
                          href={payment.receipt_url || payment.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all text-green-500 hover:text-green-700"
                          title="Download Receipt"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                if (payments.length > 0) {
                  viewReceipt(payments[0]);
                } else {
                  toast.info('No payments to view');
                }
              }}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              View Receipt
            </button>
            <button
              onClick={() => {
                toast.success('Opening invoice...');
              }}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              View Invoice
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReportsDashboard;
