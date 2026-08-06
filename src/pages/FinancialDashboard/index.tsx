import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import {
  Search,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Eye,
  CreditCard,
  Receipt,
  Calendar,
  User,
  School,
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  BarChart3,
  PieChart,
  Settings,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Info,
  AlertTriangle,
  Zap,
  Target,
  Award,
  Shield,
  Menu,
  X
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
}

interface FeeAssignment {
  id: string;
  student_id: string;
  fee_id: string;
  amount_due: number;
  amount_paid: number;
  balance: number;
  due_date: string;
  payment_status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  session: string;
  term: string;
  fee_name?: string;
  fee_category?: string;
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
}

interface FeePaymentData {
  fee_id: string;
  fee_name: string;
  fee_category: string;
  amount_due: number;
  amount_paid: number;
  balance: number;
  due_date: string | null;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  percentage: number;
  last_payment_date?: string;
  last_payment_receipt?: string;
  assignment_id?: string;
}

interface StudentRowData {
  student: Student;
  fees: Record<string, FeePaymentData>;
  totalDue: number;
  totalPaid: number;
  totalBalance: number;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
}

interface SummaryStats {
  totalStudents: number;
  paidStudents: number;
  partialStudents: number;
  outstandingStudents: number;
  overdueStudents: number;
  totalExpectedRevenue: number;
  totalRevenueCollected: number;
  outstandingBalance: number;
  overdueAmount: number;
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
  const [assignments, setAssignments] = useState<FeeAssignment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [studentRows, setStudentRows] = useState<StudentRowData[]>([]);
  const [filteredRows, setFilteredRows] = useState<StudentRowData[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalStudents: 0,
    paidStudents: 0,
    partialStudents: 0,
    outstandingStudents: 0,
    overdueStudents: 0,
    totalExpectedRevenue: 0,
    totalRevenueCollected: 0,
    outstandingBalance: 0,
    overdueAmount: 0,
    collectionRate: 0,
  });
  const [feeColumnTotals, setFeeColumnTotals] = useState<FeeColumnTotals[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    session: '',
    term: '',
    branch: 'all',
    class: 'all',
    department: 'all',
    feeCategory: 'all',
    paymentStatus: 'all',
    studentStatus: 'active',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedFee, setSelectedFee] = useState<FeePaymentData | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [loadingMore, setLoadingMore] = useState(false);
  const [copied, setCopied] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; level: string }[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [feeCategories, setFeeCategories] = useState<string[]>([]);
  const [academicSessions, setAcademicSessions] = useState<string[]>([]);
  const [academicTerms, setAcademicTerms] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  const [sortField, setSortField] = useState<string>('student_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedFeeColumns, setExpandedFeeColumns] = useState<Set<string>>(new Set());
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileStats, setShowMobileStats] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  const tableRef = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidth] = useState(0);
  const [frozenColumns, setFrozenColumns] = useState(3);

  // ============================================
  // FETCH DATA
  // ============================================

  const fetchData = useCallback(async () => {
    setDebugInfo('Fetching data...');
    setLoading(true);
    
    try {
      const branchId = user?.branch_id || (user as any)?.metadata?.branch_id;
      
      if (!branchId) {
        toast.error('No branch found for this user');
        setDebugInfo('ERROR: No branch found');
        setLoading(false);
        return;
      }

      // 1. Fetch current academic session and term
      const { data: sessionData, error: sessionError } = await supabase
        .from('academic_sessions')
        .select('session_name, term_name')
        .eq('branch_id', branchId)
        .eq('is_current', true)
        .single();

      const currentSession = sessionData?.session_name || '';
      const currentTerm = sessionData?.term_name || '';

      setSelectedSession(currentSession);
      setSelectedTerm(currentTerm);

      setFilters(prev => ({
        ...prev,
        session: currentSession,
        term: currentTerm,
      }));

      // 2. Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
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

      if (studentsError) throw studentsError;

      const studentsWithClass = (studentsData || []).map(s => ({
        ...s,
        class_name: s.class?.name || 'Not Assigned',
        class_level: s.class?.level || '',
      }));

      setStudents(studentsWithClass);

      // 3. Fetch all fees
      const { data: feesData, error: feesError } = await supabase
        .from('fees')
        .select('*')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('name');

      if (feesError) throw feesError;
      setFees(feesData || []);

      // 4. Fetch fee assignments
      let assignmentsQuery = supabase
        .from('student_fee_assignments')
        .select(`
          *,
          fee:fee_id (name, category)
        `)
        .eq('branch_id', branchId)
        .eq('is_active', true);

      if (currentSession) {
        assignmentsQuery = assignmentsQuery.eq('session', currentSession);
      }
      if (currentTerm) {
        assignmentsQuery = assignmentsQuery.eq('term', currentTerm);
      }

      const { data: assignmentsData, error: assignmentsError } = await assignmentsQuery;

      if (assignmentsError) throw assignmentsError;

      const assignmentsWithFeeNames = (assignmentsData || []).map(a => ({
        ...a,
        fee_name: a.fee?.name || 'Unknown Fee',
        fee_category: a.fee?.category || 'Other',
      }));

      setAssignments(assignmentsWithFeeNames);

      // 5. Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('branch_id', branchId)
        .in('status', ['completed', 'paid', 'approved']);

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // 6. Build the payment matrix
      buildPaymentMatrix(
        studentsWithClass,
        feesData || [],
        assignmentsWithFeeNames || [],
        paymentsData || []
      );

      // 7. Fetch filter options
      await fetchFilterOptions(branchId);

      setDebugInfo('Complete!');

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load report data');
      setDebugInfo(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ============================================
  // INITIAL DATA LOAD
  // ============================================
  
  useEffect(() => {
    if (user?.branch_id) {
      fetchData();
    } else {
      setDebugInfo('Waiting for user authentication...');
      if (user === null) {
        setLoading(false);
        setDebugInfo('No user logged in');
      }
    }
  }, [user?.branch_id]);

  const fetchFilterOptions = async (branchId: string) => {
    try {
      // Branches
      const { data: branchData } = await supabase
        .from('branches')
        .select('id, name')
        .eq('id', branchId);
      setBranches(branchData || []);

      // Classes
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name, level')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('name');
      setClasses(classData || []);

      // Departments
      const depts = [...new Set((classData || []).map(c => c.level).filter(Boolean))];
      setDepartments(depts);

      // Fee Categories
      const { data: feeData } = await supabase
        .from('fees')
        .select('category')
        .eq('branch_id', branchId)
        .eq('status', 'active');
      const categories = [...new Set((feeData || []).map(f => f.category).filter(Boolean))];
      setFeeCategories(categories);

      // Academic Sessions
      const { data: sessionData } = await supabase
        .from('academic_sessions')
        .select('session_name')
        .eq('branch_id', branchId)
        .order('session_name', { ascending: false });
      const sessions = [...new Set((sessionData || []).map(s => s.session_name).filter(Boolean))];
      setAcademicSessions(sessions);

      // Academic Terms
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
    paymentsData: Payment[]
  ) => {
    const feeMap: Record<string, Fee> = {};
    feesData.forEach(f => { feeMap[f.id] = f; });

    const assignmentsByStudent: Record<string, any[]> = {};
    assignmentsData.forEach(a => {
      if (!assignmentsByStudent[a.student_id]) {
        assignmentsByStudent[a.student_id] = [];
      }
      assignmentsByStudent[a.student_id].push(a);
    });

    const paymentsByStudentFee: Record<string, Record<string, Payment[]>> = {};
    paymentsData.forEach(p => {
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
          const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount_paid, 0);
          const amountDue = assignment.amount_due || fee.amount || 0;
          const balance = Math.max(0, amountDue - totalPaid);
          const dueDate = assignment.due_date || fee.due_date || null;

          let status: 'paid' | 'partial' | 'unpaid' | 'overdue' = 'unpaid';
          const percentage = amountDue > 0 ? (totalPaid / amountDue) * 100 : 0;

          if (totalPaid >= amountDue && amountDue > 0) {
            status = 'paid';
          } else if (totalPaid > 0 && totalPaid < amountDue) {
            status = 'partial';
          } else if (dueDate && dayjs(dueDate).isBefore(dayjs()) && balance > 0) {
            status = 'overdue';
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
            due_date: dueDate,
            status: status,
            percentage: percentage,
            last_payment_date: lastPaymentDate,
            last_payment_receipt: lastPaymentReceipt,
            assignment_id: assignment.id,
          };
        } else {
          feeData[fee.id] = {
            fee_id: fee.id,
            fee_name: fee.name,
            fee_category: fee.category,
            amount_due: 0,
            amount_paid: 0,
            balance: 0,
            due_date: null,
            status: 'unpaid',
            percentage: 0,
          };
        }
      });

      let totalDue = 0;
      let totalPaid = 0;
      let totalBalance = 0;
      let rowStatus: 'paid' | 'partial' | 'unpaid' | 'overdue' = 'unpaid';

      Object.values(feeData).forEach(f => {
        totalDue += f.amount_due;
        totalPaid += f.amount_paid;
        totalBalance += f.balance;
        if (f.status === 'overdue') rowStatus = 'overdue';
        if (f.status === 'paid' && rowStatus !== 'overdue') rowStatus = 'paid';
        if (f.status === 'partial' && rowStatus !== 'overdue' && rowStatus !== 'paid') rowStatus = 'partial';
        if (f.status === 'unpaid' && rowStatus !== 'overdue' && rowStatus !== 'paid' && rowStatus !== 'partial') {
          rowStatus = 'unpaid';
        }
      });

      if (Object.keys(feeData).length === 0) {
        rowStatus = 'unpaid';
      }

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
  // CALCULATE STATS
  // ============================================

  const calculateSummaryStats = useCallback((rows: StudentRowData[]) => {
    const stats: SummaryStats = {
      totalStudents: rows.length,
      paidStudents: 0,
      partialStudents: 0,
      outstandingStudents: 0,
      overdueStudents: 0,
      totalExpectedRevenue: 0,
      totalRevenueCollected: 0,
      outstandingBalance: 0,
      overdueAmount: 0,
      collectionRate: 0,
    };

    rows.forEach(row => {
      if (row.status === 'paid') stats.paidStudents++;
      else if (row.status === 'partial') stats.partialStudents++;
      else if (row.status === 'overdue') {
        stats.overdueStudents++;
        stats.outstandingStudents++;
      } else if (row.status === 'unpaid') {
        stats.outstandingStudents++;
      }

      stats.totalExpectedRevenue += row.totalDue;
      stats.totalRevenueCollected += row.totalPaid;
      stats.outstandingBalance += row.totalBalance;

      Object.values(row.fees).forEach(fee => {
        if (fee.status === 'overdue') {
          stats.overdueAmount += fee.balance;
        }
      });
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
          else if (feeData.status === 'unpaid' || feeData.status === 'overdue') {
            totals[feeId].unpaidStudents++;
          }
        }
      });
    });

    setFeeColumnTotals(Object.values(totals));
  }, []);

  // ============================================
  // FILTERS & SEARCH
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

    if (filters.department !== 'all') {
      filtered = filtered.filter(row => {
        const dept = row.student.class_level || '';
        return dept === filters.department;
      });
    }

    if (filters.paymentStatus !== 'all') {
      filtered = filtered.filter(row => row.status === filters.paymentStatus);
    }

    if (filters.studentStatus !== 'all') {
      filtered = filtered.filter(row => row.student.current_status === filters.studentStatus);
    }

    if (filters.feeCategory !== 'all') {
      filtered = filtered.filter(row => {
        return Object.values(row.fees).some(f => f.fee_category === filters.feeCategory && f.amount_due > 0);
      });
    }

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'student_name':
          aVal = `${a.student.first_name} ${a.student.last_name}`;
          bVal = `${b.student.first_name} ${b.student.last_name}`;
          break;
        case 'student_id':
          aVal = a.student.student_id;
          bVal = b.student.student_id;
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
          const statusOrder = { paid: 0, partial: 1, unpaid: 2, overdue: 3 };
          aVal = statusOrder[a.status] || 0;
          bVal = statusOrder[b.status] || 0;
          break;
        default:
          aVal = `${a.student.first_name} ${a.student.last_name}`;
          bVal = `${b.student.first_name} ${b.student.last_name}`;
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
          'Admission Number': row.student.admission_number,
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

      const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key.length * 1.5, 12)
      }));
      ws['!cols'] = colWidths;

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
          'Admission Number': row.student.admission_number,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'partial': return 'bg-yellow-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'partial': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'overdue': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return CheckCircle;
      case 'partial': return AlertCircle;
      case 'overdue': return AlertTriangle;
      default: return XCircle;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'partial': return 'Partial';
      case 'overdue': return 'Overdue';
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
    return fees.filter(f => {
      const hasAssignment = assignments.some(a => a.fee_id === f.id);
      return hasAssignment;
    });
  }, [fees, assignments]);

  // Handle scroll to manage shadow on sticky columns
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollPosition(target.scrollLeft);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="mt-3 text-gray-500 text-sm">Loading payment matrix...</span>
        <div className="mt-4 text-xs text-gray-400 text-center">
          <p>Debug: {debugInfo}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6 print:space-y-2 px-1 sm:px-0 pb-20 sm:pb-0">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 sm:gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          <div>
            <h1 className="text-base sm:text-2xl font-bold text-gray-900 dark:text-white">Payment Matrix</h1>
            <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 hidden xs:block">
              {selectedSession} {selectedTerm}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            onClick={handlePrint}
            className="p-1.5 sm:px-3 sm:py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm flex items-center gap-1"
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Print</span>
          </button>
          <button
            onClick={exportToCSV}
            className="p-1.5 sm:px-3 sm:py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">CSV</span>
          </button>
          <button
            onClick={exportToExcel}
            className="p-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-all text-sm flex items-center gap-1 shadow-lg shadow-green-500/25"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Excel</span>
          </button>
          <button
            onClick={() => setShowMobileStats(!showMobileStats)}
            className="sm:hidden p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Stats Drawer */}
      <AnimatePresence>
        {showMobileStats && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="sm:hidden overflow-hidden"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Students</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{summaryStats.totalStudents}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Collection Rate</p>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{summaryStats.collectionRate.toFixed(1)}%</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Collected</p>
                  <p className="text-xs font-bold text-green-600 dark:text-green-400">{formatCurrency(summaryStats.totalRevenueCollected)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Outstanding</p>
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">{formatCurrency(summaryStats.outstandingBalance)}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards - Desktop */}
      <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Students</p>
          <p className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">{summaryStats.totalStudents}</p>
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-green-600 dark:text-green-400 mt-0.5">
            <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            {summaryStats.paidStudents} paid
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Collection Rate</p>
          <p className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400">
            {summaryStats.collectionRate.toFixed(1)}%
          </p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(summaryStats.collectionRate, 100)}%` }}
            />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Collected</p>
          <p className="text-base sm:text-xl font-bold text-green-600 dark:text-green-400 truncate">
            {formatCurrency(summaryStats.totalRevenueCollected)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Outstanding</p>
          <p className="text-base sm:text-xl font-bold text-red-600 dark:text-red-400 truncate">
            {formatCurrency(summaryStats.outstandingBalance)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Overdue</p>
          <p className="text-base sm:text-xl font-bold text-orange-600 dark:text-orange-400">
            {summaryStats.overdueStudents}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Expected Revenue</p>
          <p className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">
            {formatCurrency(summaryStats.totalExpectedRevenue)}
          </p>
        </div>
      </div>

      {/* Search and Filter Bar - Mobile Optimized */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-2 sm:p-4 print:hidden">
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white placeholder:text-xs"
              />
            </div>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`p-1.5 sm:px-3 sm:py-2 rounded-lg border transition-all ${
                showMobileFilters || searchTerm || filters.class !== 'all' || filters.paymentStatus !== 'all'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Filter className="w-4 h-4 sm:w-4 sm:h-4" />
            </button>
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
              className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white max-w-[70px] sm:max-w-none"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Mobile Filters - Expandable */}
          <AnimatePresence>
            {showMobileFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 dark:text-gray-400">Class</label>
                      <select
                        value={filters.class}
                        onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                        className="w-full px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      >
                        <option value="all">All Classes</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 dark:text-gray-400">Category</label>
                      <select
                        value={filters.feeCategory}
                        onChange={(e) => setFilters({ ...filters, feeCategory: e.target.value })}
                        className="w-full px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      >
                        <option value="all">All</option>
                        {feeCategories.map(cat => (
                          <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilters({ ...filters, class: 'all', paymentStatus: 'all', feeCategory: 'all' });
                      setShowMobileFilters(false);
                    }}
                    className="w-full py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    Clear All Filters
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Legend - Compact Mobile */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-xl print:hidden">
          <span className="text-[10px] sm:text-sm font-medium text-gray-700 dark:text-gray-300">Legend:</span>
          <span className="flex items-center gap-1 text-[10px] sm:text-sm">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full" />
            Paid
          </span>
          <span className="flex items-center gap-1 text-[10px] sm:text-sm">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-500 rounded-full" />
            Partial
          </span>
          <span className="flex items-center gap-1 text-[10px] sm:text-sm">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
            Unpaid
          </span>
          <span className="flex items-center gap-1 text-[10px] sm:text-sm">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full" />
            Overdue
          </span>
          <button
            onClick={() => setShowLegend(false)}
            className="ml-auto text-[10px] text-gray-400 hover:text-gray-600"
          >
            Hide
          </button>
        </div>
      )}

      {/* Table - Fixed Sticky Columns */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div 
          ref={tableRef} 
          className="overflow-x-auto"
          onScroll={handleScroll}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="min-w-[900px] sm:min-w-full">
            <table className="w-full border-collapse text-[10px] sm:text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th 
                    className="sticky left-0 z-30 bg-gray-50 dark:bg-gray-700/50 px-2 sm:px-3 py-2 text-left text-[8px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r-2 border-gray-200 dark:border-gray-700 min-w-[80px] sm:min-w-[120px]"
                    style={{
                      boxShadow: scrollPosition > 0 ? '4px 0 8px -4px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Student
                  </th>
                  <th 
                    className="sticky left-[80px] sm:left-[120px] z-30 bg-gray-50 dark:bg-gray-700/50 px-1.5 sm:px-3 py-2 text-left text-[8px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r-2 border-gray-200 dark:border-gray-700 min-w-[60px] sm:min-w-[100px]"
                    style={{
                      boxShadow: scrollPosition > 0 ? '4px 0 8px -4px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    ID
                  </th>
                  <th 
                    className="sticky left-[140px] sm:left-[220px] z-30 bg-gray-50 dark:bg-gray-700/50 px-1.5 sm:px-3 py-2 text-left text-[8px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r-2 border-gray-200 dark:border-gray-700 min-w-[60px] sm:min-w-[100px]"
                    style={{
                      boxShadow: scrollPosition > 0 ? '4px 0 8px -4px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Class
                  </th>
                  {visibleFees.map((fee) => (
                    <th
                      key={fee.id}
                      className="px-1 sm:px-2 py-2 text-center text-[7px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[60px] sm:min-w-[120px] border-r border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[7px] sm:text-xs font-medium truncate max-w-[50px] sm:max-w-none">{fee.name}</span>
                        <span className="text-[6px] sm:text-[10px] text-gray-400 font-normal truncate max-w-[50px] sm:max-w-none">{fee.category?.replace(/_/g, ' ')}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-1.5 sm:px-3 py-2 text-center text-[8px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[50px] sm:min-w-[100px] border-l-2 border-gray-300 dark:border-gray-600">
                    Due
                  </th>
                  <th className="px-1.5 sm:px-3 py-2 text-center text-[8px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[50px] sm:min-w-[100px] border-r border-gray-200 dark:border-gray-700">
                    Paid
                  </th>
                  <th className="px-1.5 sm:px-3 py-2 text-center text-[8px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[50px] sm:min-w-[100px] border-r border-gray-200 dark:border-gray-700">
                    Bal
                  </th>
                  <th className="px-1.5 sm:px-3 py-2 text-center text-[8px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[50px] sm:min-w-[80px]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleFees.length + 7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <BarChart3 className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm sm:text-lg font-medium">No students found</p>
                      <p className="text-xs sm:text-sm mt-0.5">Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr
                      key={row.student.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all"
                    >
                      <td 
                        className="sticky left-0 z-20 bg-white dark:bg-gray-800 px-2 sm:px-3 py-1.5 sm:py-2.5 border-r-2 border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-white truncate max-w-[60px] sm:max-w-[120px] text-[9px] sm:text-sm"
                        style={{
                          boxShadow: scrollPosition > 0 ? '4px 0 8px -4px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        {row.student.first_name} {row.student.last_name}
                      </td>
                      <td 
                        className="sticky left-[80px] sm:left-[120px] z-20 bg-white dark:bg-gray-800 px-1.5 sm:px-3 py-1.5 sm:py-2.5 border-r-2 border-gray-200 dark:border-gray-700 text-[8px] sm:text-xs font-mono text-gray-500 dark:text-gray-400 truncate max-w-[50px] sm:max-w-[100px]"
                        style={{
                          boxShadow: scrollPosition > 0 ? '4px 0 8px -4px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        {row.student.student_id}
                      </td>
                      <td 
                        className="sticky left-[140px] sm:left-[220px] z-20 bg-white dark:bg-gray-800 px-1.5 sm:px-3 py-1.5 sm:py-2.5 border-r-2 border-gray-200 dark:border-gray-700 text-[8px] sm:text-xs text-gray-600 dark:text-gray-300 truncate max-w-[50px] sm:max-w-[100px]"
                        style={{
                          boxShadow: scrollPosition > 0 ? '4px 0 8px -4px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        {row.student.class_name}
                      </td>

                      {visibleFees.map((fee) => {
                        const feeData = row.fees[fee.id];
                        if (!feeData || feeData.amount_due === 0) {
                          return (
                            <td
                              key={fee.id}
                              className="px-1 sm:px-2 py-1.5 sm:py-2.5 text-center border-r border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600"
                            >
                              —
                            </td>
                          );
                        }

                        const status = feeData.status;
                        const bgColor = status === 'paid' ? 'bg-green-50 dark:bg-green-900/20' :
                          status === 'partial' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                          status === 'overdue' ? 'bg-red-50 dark:bg-red-900/20' :
                          'bg-gray-50 dark:bg-gray-800';

                        return (
                          <td
                            key={fee.id}
                            className={`px-1 sm:px-2 py-1.5 sm:py-2.5 text-center border-r border-gray-200 dark:border-gray-700 cursor-pointer hover:ring-1 sm:hover:ring-2 hover:ring-blue-500 transition-all ${bgColor}`}
                            onClick={() => handleCellClick(row.student, feeData)}
                          >
                            <div className="flex flex-col items-center">
                              <span className={`text-[8px] sm:text-xs font-medium ${
                                status === 'paid' ? 'text-green-600 dark:text-green-400' :
                                status === 'partial' ? 'text-yellow-600 dark:text-yellow-400' :
                                status === 'overdue' ? 'text-red-600 dark:text-red-400' :
                                'text-gray-500 dark:text-gray-400'
                              }`}>
                                {status === 'paid' ? '✓' :
                                 status === 'partial' ? `${Math.round(feeData.percentage)}%` :
                                 status === 'overdue' ? '⚠' : '○'}
                              </span>
                              <span className="text-[6px] sm:text-[10px] text-gray-500 dark:text-gray-400">
                                {formatCurrency(feeData.amount_paid)}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-1.5 sm:px-3 py-1.5 sm:py-2.5 text-center text-[8px] sm:text-sm font-medium text-gray-900 dark:text-white border-l-2 border-gray-300 dark:border-gray-600">
                        {formatCurrency(row.totalDue)}
                      </td>
                      <td className="px-1.5 sm:px-3 py-1.5 sm:py-2.5 text-center text-[8px] sm:text-sm font-medium text-green-600 dark:text-green-400 border-r border-gray-200 dark:border-gray-700">
                        {formatCurrency(row.totalPaid)}
                      </td>
                      <td className="px-1.5 sm:px-3 py-1.5 sm:py-2.5 text-center text-[8px] sm:text-sm font-medium text-red-600 dark:text-red-400 border-r border-gray-200 dark:border-gray-700">
                        {formatCurrency(row.totalBalance)}
                      </td>
                      <td className="px-1.5 sm:px-3 py-1.5 sm:py-2.5 text-center">
                        <span className={`inline-flex items-center gap-0.5 px-1 sm:px-2 py-0.5 rounded-full text-[6px] sm:text-xs font-medium ${getStatusBadgeColor(row.status)}`}>
                          {getStatusLabel(row.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Footer Totals */}
              {paginatedRows.length > 0 && (
                <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-300 dark:border-gray-600">
                  <tr>
                    <td 
                      className="sticky left-0 z-20 bg-gray-50 dark:bg-gray-700/50 px-2 sm:px-3 py-1.5 sm:py-2.5 border-r-2 border-gray-200 dark:border-gray-700 font-semibold text-[8px] sm:text-sm text-gray-900 dark:text-white"
                      style={{
                        boxShadow: scrollPosition > 0 ? '4px 0 8px -4px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      Totals
                    </td>
                    <td 
                      className="sticky left-[80px] sm:left-[120px] z-20 bg-gray-50 dark:bg-gray-700/50 px-1.5 sm:px-3 py-1.5 sm:py-2.5 border-r-2 border-gray-200 dark:border-gray-700"
                      style={{
                        boxShadow: scrollPosition > 0 ? '4px 0 8px -4px rgba(0,0,0,0.1)' : 'none'
                      }}
                    />
                    <td 
                      className="sticky left-[140px] sm:left-[220px] z-20 bg-gray-50 dark:bg-gray-700/50 px-1.5 sm:px-3 py-1.5 sm:py-2.5 border-r-2 border-gray-200 dark:border-gray-700"
                      style={{
                        boxShadow: scrollPosition > 0 ? '4px 0 8px -4px rgba(0,0,0,0.1)' : 'none'
                      }}
                    />
                    {visibleFees.map((fee) => {
                      const total = feeColumnTotals.find(t => t.fee_id === fee.id);
                      return (
                        <td key={fee.id} className="px-1 sm:px-2 py-1.5 sm:py-2.5 text-center border-r border-gray-200 dark:border-gray-700">
                          <div className="flex flex-col items-center text-[6px] sm:text-[10px]">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {formatCurrency(total?.collected || 0)}
                            </span>
                            <span className="text-red-600 dark:text-red-400">
                              {formatCurrency(total?.outstanding || 0)}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-1.5 sm:px-3 py-1.5 sm:py-2.5 text-center font-semibold text-[8px] sm:text-sm text-gray-900 dark:text-white border-l-2 border-gray-300 dark:border-gray-600">
                      {formatCurrency(paginatedRows.reduce((sum, r) => sum + r.totalDue, 0))}
                    </td>
                    <td className="px-1.5 sm:px-3 py-1.5 sm:py-2.5 text-center font-semibold text-[8px] sm:text-sm text-green-600 dark:text-green-400 border-r border-gray-200 dark:border-gray-700">
                      {formatCurrency(paginatedRows.reduce((sum, r) => sum + r.totalPaid, 0))}
                    </td>
                    <td className="px-1.5 sm:px-3 py-1.5 sm:py-2.5 text-center font-semibold text-[8px] sm:text-sm text-red-600 dark:text-red-400 border-r border-gray-200 dark:border-gray-700">
                      {formatCurrency(paginatedRows.reduce((sum, r) => sum + r.totalBalance, 0))}
                    </td>
                    <td className="px-1.5 sm:px-3 py-1.5 sm:py-2.5 text-center"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-t border-gray-200 dark:border-gray-700 print:hidden">
            <div className="text-[8px] sm:text-sm text-gray-500 dark:text-gray-400">
              {Math.min((currentPage - 1) * pageSize + 1, filteredRows.length)}-{Math.min(currentPage * pageSize, filteredRows.length)}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 sm:p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <span className="text-[8px] sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 sm:p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
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

      {/* Footer */}
      <div className="text-center text-[8px] sm:text-xs text-gray-400 dark:text-gray-500 print:hidden">
        <p>Generated {dayjs().format('MMM D, YYYY h:mm A')}</p>
      </div>
    </div>
  );
};

// ============================================
// PAYMENT DETAILS MODAL - Mobile Optimized
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
              Payment Details
            </h3>
            <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {student.first_name} {student.last_name} • {student.student_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all flex-shrink-0"
          >
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Fee Summary */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 sm:p-4">
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{feeData.fee_name}</h4>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-2 sm:mt-3">
              <div>
                <p className="text-[8px] sm:text-xs text-gray-500 dark:text-gray-400">Amount</p>
                <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(feeData.amount_due)}
                </p>
              </div>
              <div>
                <p className="text-[8px] sm:text-xs text-gray-500 dark:text-gray-400">Paid</p>
                <p className="text-sm sm:text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(feeData.amount_paid)}
                </p>
              </div>
              <div>
                <p className="text-[8px] sm:text-xs text-gray-500 dark:text-gray-400">Balance</p>
                <p className={`text-sm sm:text-lg font-bold ${feeData.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(feeData.balance)}
                </p>
              </div>
            </div>
            {feeData.due_date && (
              <p className="text-[8px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1.5 sm:mt-2">
                Due: {dayjs(feeData.due_date).format('MMM D, YYYY')}
                {feeData.status === 'overdue' && (
                  <span className="ml-1.5 text-red-500">(Overdue)</span>
                )}
              </p>
            )}
          </div>

          {/* Payments List */}
          <div>
            <h5 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Payment History
            </h5>
            {loading ? (
              <div className="flex justify-center py-3 sm:py-4">
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-blue-500" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-4 sm:py-6 text-gray-500 dark:text-gray-400">
                <Receipt className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-gray-300 dark:text-gray-600 mb-1.5 sm:mb-2" />
                <p className="text-xs sm:text-sm">No payment records found</p>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all"
                  >
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(payment.amount_paid)}
                      </p>
                      <p className="text-[8px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                        {dayjs(payment.payment_date).format('MMM D, YYYY')} • {payment.payment_method?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[7px] sm:text-xs text-gray-400 dark:text-gray-500 font-mono truncate">
                        {payment.receipt_number}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
                      <span className={`px-1 sm:px-2 py-0.5 rounded-full text-[6px] sm:text-xs font-medium ${
                        payment.status === 'completed' || payment.status === 'paid' || payment.status === 'approved'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {payment.status}
                      </span>
                      <button
                        onClick={() => toast.success('Receipt downloaded')}
                        className="p-0.5 sm:p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                      >
                        <Download className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                toast.success('Payment recording form will open');
                onClose();
              }}
              className="flex-1 px-2 sm:px-4 py-1.5 sm:py-2.5 text-[10px] sm:text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-1 sm:gap-2"
            >
              <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
              Record
            </button>
            <button
              onClick={() => toast.success('Invoice generated')}
              className="flex-1 px-2 sm:px-4 py-1.5 sm:py-2.5 text-[10px] sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-1 sm:gap-2"
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              Invoice
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReportsDashboard;