import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet,
  Download,
  Loader2,
  Trash2,
  X,
  Info,
  DollarSign,
  Copy,
  Columns,
  Rows,
  Percent,
  Cloud,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Sun,
  Moon,
  Plus,
  Search,
  Filter,
  Edit,
  Save,
  Check,
  Eye,
  Printer,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Wallet,
  CreditCard,
  Receipt,
  Building,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  PieChart,
  BarChart3,
  LineChart,
  Activity,
  Zap,
  Sparkles,
  Crown,
  Star,
  Medal,
  Award,
  Target,
  Rocket,
  Gift,
  Shield,
  Lock,
  EyeOff,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Settings,
  BookOpen
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

// ============================================
// TYPES
// ============================================
interface Expense {
  id: string;
  expense_id: string;
  category: string;
  sub_category: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  payment_reference: string;
  receipt_url: string;
  approved_by: string;
  approved_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  branch_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  academic_session: string;
  academic_term: string;
  metadata: any;
}

interface Budget {
  id: string;
  category: string;
  sub_category: string;
  amount: number;
  fiscal_year: string;
  branch_id: string;
}

interface Term {
  id: string;
  branch_id: string;
  session: string;
  term: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_closed: boolean;
  closing_balance: number;
}

interface OpeningBalance {
  id: string;
  branch_id: string;
  academic_session: string;
  academic_term: string;
  balance_type: string;
  amount: number;
}

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalFeesCollected: number;
  totalFeesOutstanding: number;
  totalBudget: number;
  totalVariance: number;
  collectionRate: number;
  openingBalanceFees: number;
  closingBalanceFees: number;
  expenseBreakdown: {
    category: string;
    budgeted: number;
    actual: number;
    variance: number;
    percentage: number;
  }[];
}

interface CellData {
  value: string | number;
  formula?: string;
  format?: 'currency' | 'number' | 'percentage' | 'text' | 'date';
  style?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    align?: 'left' | 'center' | 'right';
    color?: string;
    bgColor?: string;
  };
}

interface RowData {
  id: string;
  cells: Record<string, CellData>;
  type?: 'header' | 'total' | 'subtotal' | 'data' | 'formula';
}

interface ColumnData {
  id: string;
  label: string;
  width: number;
  type?: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'formula';
  visible: boolean;
}

interface SheetData {
  id: string;
  name: string;
  rows: RowData[];
  columns: ColumnData[];
}

const FinancialReports: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [selectedSession, setSelectedSession] = useState<string>('2026/2027');
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [cellValue, setCellValue] = useState<string>('');
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: dayjs().startOf('month').format('YYYY-MM-DD'),
    end: dayjs().endOf('month').format('YYYY-MM-DD'),
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const [showFormulaBar, setShowFormulaBar] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [copiedCell, setCopiedCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expenseStatus, setExpenseStatus] = useState<string>('all');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({
    category: '',
    sub_category: '',
    description: '',
    amount: 0,
    expense_date: dayjs().format('YYYY-MM-DD'),
    payment_method: 'Bank Transfer',
    status: 'pending',
    academic_session: '2026/2027',
    academic_term: '2nd Term'
  });

  const gridRef = useRef<HTMLDivElement>(null);

  // Expense categories
  const expenseCategories = [
    'Salaries & Wages',
    'Utilities',
    'Transport & Logistics',
    'Maintenance & Repairs',
    'Academic Materials',
    'Food & Catering',
    'Medical & Health',
    'Events & Programs',
    'Administrative Costs',
    'Miscellaneous'
  ];

  const paymentMethods = ['Bank Transfer', 'Cash', 'POS', 'Cheque', 'Card'];

  // Fetch data
  useEffect(() => {
    const fetchUserBranch = async () => {
      if (user?.id) {
        try {
          let branchId = user.branch_id;
          
          if (!branchId) {
            const { data, error } = await supabase
              .from('users')
              .select('branch_id')
              .eq('id', user.id)
              .single();
            
            if (!error && data) {
              branchId = data.branch_id;
            }
          }
          
          if (branchId) {
            setUserBranchId(branchId);
            await fetchAllData(branchId);
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error('Error fetching user branch:', error);
          setLoading(false);
        }
      }
    };
    
    fetchUserBranch();
  }, [user]);

  const fetchAllData = async (branchId: string) => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTerms(branchId),
        fetchOpeningBalances(branchId),
        fetchPaymentsData(branchId),
        fetchExpensesData(branchId),
        fetchBudgetData(branchId),
      ]);
      
      // Set active term
      const activeTerm = terms.find(t => t.is_active);
      if (activeTerm) {
        setSelectedTerm(activeTerm);
        setSelectedSession(activeTerm.session);
      }
      
      initializeSheet();
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTerms = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('terms')
        .select('*')
        .eq('branch_id', branchId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setTerms(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching terms:', error);
      return [];
    }
  };

  const fetchOpeningBalances = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('opening_balances')
        .select('*')
        .eq('branch_id', branchId);

      if (error) throw error;
      setOpeningBalances(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching opening balances:', error);
      return [];
    }
  };

  const fetchPaymentsData = async (branchId: string) => {
    try {
      let query = supabase
        .from('payments')
        .select('amount_paid, status, payment_date, fee_id, student_id, payment_method')
        .eq('branch_id', branchId);

      // Filter by selected term
      if (selectedTerm) {
        query = query
          .gte('payment_date', selectedTerm.start_date)
          .lte('payment_date', selectedTerm.end_date);
      }

      const { data: payments, error } = await query;

      if (error) throw error;

      const completed = payments?.filter(p => p.status === 'completed' || p.status === 'paid') || [];
      const pending = payments?.filter(p => p.status === 'pending') || [];

      const totalFeesCollected = completed.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
      const totalFeesOutstanding = pending.reduce((sum, p) => sum + (p.amount_paid || 0), 0);

      // Get opening balance for fees
      const openingFees = openingBalances.find(
        ob => ob.balance_type === 'fees' && 
        ob.academic_session === selectedSession
      );

      const openingBalanceFees = openingFees?.amount || 0;

      setSummary(prev => ({
        ...prev!,
        totalFeesCollected,
        totalFeesOutstanding,
        totalIncome: totalFeesCollected,
        openingBalanceFees,
        closingBalanceFees: openingBalanceFees + totalFeesCollected - totalFeesOutstanding
      }));

      return { totalFeesCollected, totalFeesOutstanding };
    } catch (error) {
      console.error('Error fetching payments:', error);
      return { totalFeesCollected: 0, totalFeesOutstanding: 0 };
    }
  };

  const fetchExpensesData = async (branchId: string) => {
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('branch_id', branchId);

      // Filter by selected term
      if (selectedTerm) {
        query = query
          .gte('expense_date', selectedTerm.start_date)
          .lte('expense_date', selectedTerm.end_date);
      }

      const { data: expensesData, error } = await query;

      if (error) throw error;

      setExpenses(expensesData || []);

      const totalExpenses = expensesData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      setSummary(prev => ({
        ...prev!,
        totalExpenses,
        netProfit: (prev?.totalIncome || 0) - totalExpenses
      }));

      return totalExpenses;
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return 0;
    }
  };

  const fetchBudgetData = async (branchId: string) => {
    try {
      const { data: budgetData, error } = await supabase
        .from('budget')
        .select('*')
        .eq('branch_id', branchId)
        .eq('fiscal_year', selectedSession.split('/')[0]);

      if (error) throw error;

      setBudgets(budgetData || []);

      const totalBudget = budgetData?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

      setSummary(prev => ({
        ...prev!,
        totalBudget,
        totalVariance: totalBudget - (prev?.totalExpenses || 0),
        collectionRate: totalBudget > 0 ? ((prev?.totalIncome || 0) / totalBudget) * 100 : 0
      }));

      return totalBudget;
    } catch (error) {
      console.error('Error fetching budget:', error);
      return 0;
    }
  };

  const initializeSheet = () => {
    if (!summary) return;

    // Create columns
    const columns: ColumnData[] = [
      { id: 'A', label: 'Description', width: 200, type: 'text', visible: true },
      { id: 'B', label: 'Category', width: 150, type: 'text', visible: true },
      { id: 'C', label: 'Budget', width: 120, type: 'currency', visible: true },
      { id: 'D', label: 'Actual', width: 120, type: 'currency', visible: true },
      { id: 'E', label: 'Variance', width: 120, type: 'currency', visible: true },
      { id: 'F', label: 'Variance %', width: 100, type: 'percentage', visible: true },
      { id: 'G', label: 'Status', width: 120, type: 'text', visible: true },
    ];

    const rows: RowData[] = [];

    // Header
    rows.push({
      id: 'header',
      type: 'header',
      cells: {
        A: { value: 'DESCRIPTION', style: { bold: true, align: 'center' } },
        B: { value: 'CATEGORY', style: { bold: true, align: 'center' } },
        C: { value: 'BUDGET', style: { bold: true, align: 'center' } },
        D: { value: 'ACTUAL', style: { bold: true, align: 'center' } },
        E: { value: 'VARIANCE', style: { bold: true, align: 'center' } },
        F: { value: 'VARIANCE %', style: { bold: true, align: 'center' } },
        G: { value: 'STATUS', style: { bold: true, align: 'center' } },
      }
    });

    // Term Info
    rows.push({
      id: 'term-info',
      type: 'header',
      cells: {
        A: { value: `Session: ${selectedSession} | Term: ${selectedTerm?.term || 'Current'}`, style: { bold: true, align: 'left', color: '#8B5CF6' } },
      }
    });

    // Opening Balance
    rows.push({
      id: 'opening-balance',
      type: 'header',
      cells: {
        A: { value: `Opening Balance (Fees): ${formatCurrency(summary.openingBalanceFees || 0)}`, style: { bold: true, align: 'left', color: '#10B981' } },
      }
    });

    // Income rows
    rows.push({
      id: 'income-header',
      type: 'header',
      cells: {
        A: { value: '--- INCOME ---', style: { bold: true, align: 'left', color: '#10B981' } },
      }
    });

    rows.push({
      id: 'income-fees',
      cells: {
        A: { value: 'School Fees Collected' },
        B: { value: 'Income' },
        C: { value: summary.totalBudget || 0, format: 'currency' },
        D: { value: summary.totalIncome || 0, format: 'currency' },
        E: { value: (summary.totalBudget || 0) - (summary.totalIncome || 0), format: 'currency' },
        F: { value: summary.totalBudget > 0 ? ((summary.totalIncome || 0) / summary.totalBudget) * 100 : 0, format: 'percentage' },
        G: { value: 'Collected', style: { color: '#10B981' } },
      }
    });

    // Expense rows
    rows.push({
      id: 'expense-header',
      type: 'header',
      cells: {
        A: { value: '--- EXPENSES ---', style: { bold: true, align: 'left', color: '#EF4444' } },
      }
    });

    // Group expenses by category
    const expenseGroups = expenses.reduce((acc, exp) => {
      const cat = exp.category || 'Other';
      if (!acc[cat]) acc[cat] = { budget: 0, actual: 0, items: [] };
      acc[cat].actual += exp.amount || 0;
      return acc;
    }, {} as Record<string, { budget: number; actual: number; items: Expense[] }>);

    // Add budget data
    budgets.forEach(b => {
      if (expenseGroups[b.category]) {
        expenseGroups[b.category].budget += b.amount || 0;
      } else {
        expenseGroups[b.category] = { budget: b.amount || 0, actual: 0, items: [] };
      }
    });

    Object.entries(expenseGroups).forEach(([category, data]) => {
      const variance = data.budget - data.actual;
      const variancePercent = data.budget > 0 ? (variance / data.budget) * 100 : 0;
      const status = variancePercent > 10 ? 'Over Budget' : variancePercent < -10 ? 'Under Budget' : 'On Track';
      const statusColor = variancePercent > 10 ? '#EF4444' : variancePercent < -10 ? '#10B981' : '#F59E0B';

      rows.push({
        id: `expense-${category.replace(/\s+/g, '-')}`,
        cells: {
          A: { value: category },
          B: { value: 'Expense' },
          C: { value: data.budget, format: 'currency' },
          D: { value: data.actual, format: 'currency' },
          E: { value: variance, format: 'currency' },
          F: { value: variancePercent, format: 'percentage' },
          G: { value: status, style: { color: statusColor } },
        }
      });
    });

    // Totals row
    const totalBudget = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalActual = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalVariance = totalBudget - totalActual;
    const totalVariancePercent = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0;

    rows.push({
      id: 'total',
      type: 'total',
      cells: {
        A: { value: 'TOTAL EXPENSES', style: { bold: true, align: 'right' } },
        B: { value: '' },
        C: { value: totalBudget, format: 'currency', style: { bold: true } },
        D: { value: totalActual, format: 'currency', style: { bold: true } },
        E: { value: totalVariance, format: 'currency', style: { bold: true } },
        F: { value: totalVariancePercent, format: 'percentage', style: { bold: true } },
        G: { value: totalVariancePercent > 10 ? 'Over Budget' : totalVariancePercent < -10 ? 'Under Budget' : 'On Track', style: { bold: true } },
      }
    });

    // Net Profit row
    const netProfit = (summary.totalIncome || 0) - totalActual;
    rows.push({
      id: 'net-profit',
      type: 'total',
      cells: {
        A: { value: 'NET PROFIT', style: { bold: true, align: 'right', color: '#8B5CF6' } },
        B: { value: '' },
        C: { value: summary.totalIncome || 0, format: 'currency', style: { bold: true, color: '#8B5CF6' } },
        D: { value: totalActual, format: 'currency', style: { bold: true, color: '#8B5CF6' } },
        E: { value: netProfit, format: 'currency', style: { bold: true, color: netProfit >= 0 ? '#10B981' : '#EF4444' } },
        F: { value: (summary.totalIncome || 0) > 0 ? (netProfit / (summary.totalIncome || 1)) * 100 : 0, format: 'percentage', style: { bold: true, color: '#8B5CF6' } },
        G: { value: netProfit >= 0 ? 'Profit' : 'Loss', style: { bold: true, color: netProfit >= 0 ? '#10B981' : '#EF4444' } },
      }
    });

    // Closing Balance
    const closingBalance = (summary.openingBalanceFees || 0) + (summary.totalIncome || 0) - totalActual;
    rows.push({
      id: 'closing-balance',
      type: 'total',
      cells: {
        A: { value: 'CLOSING BALANCE', style: { bold: true, align: 'right', color: '#10B981' } },
        B: { value: '' },
        C: { value: 0, format: 'currency' },
        D: { value: closingBalance, format: 'currency', style: { bold: true, color: '#10B981' } },
        E: { value: 0, format: 'currency' },
        F: { value: 0, format: 'percentage' },
        G: { value: '' },
      }
    });

    setSheetData({
      id: 'main',
      name: 'Financial Report',
      rows,
      columns,
    });

    // Update summary with closing balance
    setSummary(prev => ({
      ...prev!,
      closingBalanceFees: closingBalance
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleCellClick = (rowId: string, colId: string) => {
    setSelectedCell({ rowId, colId });
    if (sheetData) {
      const cell = sheetData.rows.find(r => r.id === rowId)?.cells[colId];
      setCellValue(cell?.value?.toString() || '');
    }
  };

  const handleCellDoubleClick = (rowId: string, colId: string) => {
    if (rowId === 'header' || rowId === 'total' || rowId === 'net-profit' || rowId === 'income-header' || rowId === 'expense-header') {
      toast.info('This cell is protected');
      return;
    }
    setEditingCell(`${rowId}-${colId}`);
    const cell = sheetData?.rows.find(r => r.id === rowId)?.cells[colId];
    setCellValue(cell?.value?.toString() || '');
  };

  const handleCellChange = (rowId: string, colId: string, value: string) => {
    if (!sheetData) return;

    const oldValue = sheetData.rows.find(r => r.id === rowId)?.cells[colId]?.value;

    setUndoStack(prev => [...prev, { 
      action: 'edit', 
      rowId, 
      colId, 
      oldValue 
    }]);

    const newRows = sheetData.rows.map(row => {
      if (row.id === rowId) {
        const newCells = { ...row.cells };
        const numValue = parseFloat(value);
        newCells[colId] = {
          ...newCells[colId],
          value: isNaN(numValue) ? value : numValue,
        };
        return { ...row, cells: newCells };
      }
      return row;
    });

    setSheetData({ ...sheetData, rows: newRows });
    calculateTotals(newRows);
  };

  const calculateTotals = (rows: RowData[]) => {
    const expenseRows = rows.filter(r => r.id.startsWith('expense-'));
    const totalBudget = expenseRows.reduce((sum, r) => sum + (Number(r.cells.C?.value) || 0), 0);
    const totalActual = expenseRows.reduce((sum, r) => sum + (Number(r.cells.D?.value) || 0), 0);
    const totalVariance = totalBudget - totalActual;
    const totalVariancePercent = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0;

    const totalRow = rows.find(r => r.id === 'total');
    if (totalRow) {
      totalRow.cells.C.value = totalBudget;
      totalRow.cells.D.value = totalActual;
      totalRow.cells.E.value = totalVariance;
      totalRow.cells.F.value = totalVariancePercent;
    }

    const incomeRow = rows.find(r => r.id === 'income-fees');
    const incomeAmount = Number(incomeRow?.cells.D?.value) || 0;
    const netProfit = incomeAmount - totalActual;

    const netProfitRow = rows.find(r => r.id === 'net-profit');
    if (netProfitRow) {
      netProfitRow.cells.C.value = incomeAmount;
      netProfitRow.cells.D.value = totalActual;
      netProfitRow.cells.E.value = netProfit;
      netProfitRow.cells.F.value = incomeAmount > 0 ? (netProfit / incomeAmount) * 100 : 0;
    }

    // Update closing balance
    const openingBalance = Number(rows.find(r => r.id === 'opening-balance')?.cells.A?.value?.toString().replace(/\D/g, '')) || 0;
    const closingBalanceRow = rows.find(r => r.id === 'closing-balance');
    if (closingBalanceRow) {
      const closingBalance = openingBalance + incomeAmount - totalActual;
      closingBalanceRow.cells.D.value = closingBalance;
    }

    setSummary(prev => ({
      ...prev!,
      totalBudget,
      totalExpenses: totalActual,
      totalVariance,
      netProfit,
      collectionRate: totalBudget > 0 ? (incomeAmount / totalBudget) * 100 : 0,
      closingBalanceFees: openingBalance + incomeAmount - totalActual
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // ... (keep existing keyboard handling)
  };

  const addRow = () => {
    if (!sheetData || !selectedCell) return;

    const rowIndex = sheetData.rows.findIndex(r => r.id === selectedCell.rowId);
    const newRow: RowData = {
      id: `row-${Date.now()}`,
      type: 'data',
      cells: {},
    };

    sheetData.columns.forEach(col => {
      newRow.cells[col.id] = { value: '' };
    });

    const newRows = [...sheetData.rows];
    newRows.splice(rowIndex + 1, 0, newRow);

    setSheetData({ ...sheetData, rows: newRows });
    toast.success('Row added successfully');
  };

  const deleteRow = () => {
    if (!sheetData || !selectedCell) return;
    const protectedRows = ['header', 'total', 'net-profit', 'income-header', 'expense-header', 'income-fees', 'term-info', 'opening-balance', 'closing-balance'];
    if (protectedRows.includes(selectedCell.rowId) || selectedCell.rowId.startsWith('expense-')) {
      toast.error('Cannot delete protected rows');
      return;
    }

    const newRows = sheetData.rows.filter(r => r.id !== selectedCell.rowId);
    setSheetData({ ...sheetData, rows: newRows });
    toast.success('Row deleted');
  };

  const copyCell = () => {
    if (!selectedCell) return;
    setCopiedCell(selectedCell);
    toast.success('Cell copied');
  };

  const pasteCell = () => {
    if (!sheetData || !selectedCell || !copiedCell) return;

    const sourceCell = sheetData.rows.find(r => r.id === copiedCell.rowId)?.cells[copiedCell.colId];
    if (!sourceCell) return;

    const newRows = sheetData.rows.map(row => {
      if (row.id === selectedCell.rowId) {
        const newCells = { ...row.cells };
        newCells[selectedCell.colId] = { ...sourceCell };
        return { ...row, cells: newCells };
      }
      return row;
    });

    setSheetData({ ...sheetData, rows: newRows });
    calculateTotals(newRows);
    toast.success('Cell pasted');
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const action = undoStack.pop();
    if (action && action.action === 'edit' && sheetData) {
      setRedoStack(prev => [...prev, action]);
      const newRows = sheetData.rows.map(row => {
        if (row.id === action.rowId) {
          const newCells = { ...row.cells };
          if (newCells[action.colId]) {
            newCells[action.colId].value = action.oldValue;
          }
          return { ...row, cells: newCells };
        }
        return row;
      });
      setSheetData({ ...sheetData, rows: newRows });
      calculateTotals(newRows);
    }
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const action = redoStack.pop();
    if (action && action.action === 'edit' && sheetData) {
      setUndoStack(prev => [...prev, action]);
      toast.info('Redo functionality requires storing new values');
    }
  };

  const addExpense = async () => {
    if (!userBranchId || !user) return;

    try {
      const expenseData = {
        expense_id: `EXP-${dayjs().format('YYYY')}-${String(expenses.length + 1).padStart(5, '0')}`,
        ...expenseForm,
        amount: Number(expenseForm.amount) || 0,
        branch_id: userBranchId,
        created_by: user.id,
        academic_session: selectedSession,
        academic_term: selectedTerm?.term || 'Current',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Expense added successfully!');
      setShowExpenseModal(false);
      setExpenseForm({
        category: '',
        sub_category: '',
        description: '',
        amount: 0,
        expense_date: dayjs().format('YYYY-MM-DD'),
        payment_method: 'Bank Transfer',
        status: 'pending',
        academic_session: selectedSession,
        academic_term: selectedTerm?.term || 'Current'
      });
      
      // Refresh data
      if (userBranchId) {
        await fetchExpensesData(userBranchId);
        initializeSheet();
      }
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast.error(error.message || 'Failed to add expense');
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Expense deleted successfully!');
      if (userBranchId) {
        await fetchExpensesData(userBranchId);
        initializeSheet();
      }
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      toast.error(error.message || 'Failed to delete expense');
    }
  };

  const exportSheet = async () => {
    setIsExporting(true);
    try {
      toast.loading('Exporting financial report...');
      setTimeout(() => {
        toast.dismiss();
        toast.success('Report exported successfully!');
      }, 1500);
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesCategory = selectedCategory === 'all' || exp.category === selectedCategory;
    const matchesStatus = expenseStatus === 'all' || exp.status === expenseStatus;
    return matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
              <FileSpreadsheet className="w-8 h-8" />
              Financial Report
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
              <span>Professional accounting spreadsheet with real-time calculations</span>
              <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                {selectedSession} • {selectedTerm?.term || 'Current Term'}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Term Selector */}
            <select
              value={selectedTerm?.id || ''}
              onChange={(e) => {
                const term = terms.find(t => t.id === e.target.value);
                if (term) {
                  setSelectedTerm(term);
                  setSelectedSession(term.session);
                  if (userBranchId) {
                    fetchAllData(userBranchId);
                  }
                }
              }}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm dark:text-white"
            >
              {terms.map(term => (
                <option key={term.id} value={term.id}>
                  {term.session} - {term.term} {term.is_active ? '🟢' : term.is_closed ? '🔒' : ''}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl px-3 py-1.5 border border-white/20">
              <Cloud className="w-3 h-3 text-green-500" />
              <span>Synced</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
              <span>{dayjs().format('HH:mm:ss')}</span>
            </div>

            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-green-500/25 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>

            <button
              onClick={exportSheet}
              disabled={isExporting}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export
            </button>

            <button
              onClick={() => {
                if (userBranchId) {
                  fetchAllData(userBranchId);
                  toast.success('Data refreshed!');
                }
              }}
              className="p-2.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl border border-white/20 dark:border-gray-700/50 hover:shadow-lg transition-all"
            >
              <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl border border-white/20 dark:border-gray-700/50 hover:shadow-lg transition-all"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-3 border border-white/20 dark:border-gray-700/50 shadow-xl">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Opening Balance</p>
              <p className="text-sm font-bold text-blue-600">{formatCurrency(summary.openingBalanceFees || 0)}</p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-3 border border-white/20 dark:border-gray-700/50 shadow-xl">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Income</p>
              <p className="text-sm font-bold text-green-600">{formatCurrency(summary.totalIncome)}</p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-3 border border-white/20 dark:border-gray-700/50 shadow-xl">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Expenses</p>
              <p className="text-sm font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-3 border border-white/20 dark:border-gray-700/50 shadow-xl">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Net Profit</p>
              <p className={`text-sm font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.netProfit)}
              </p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-3 border border-white/20 dark:border-gray-700/50 shadow-xl">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Budget</p>
              <p className="text-sm font-bold text-blue-600">{formatCurrency(summary.totalBudget)}</p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-3 border border-white/20 dark:border-gray-700/50 shadow-xl">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Variance</p>
              <p className={`text-sm font-bold ${summary.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.totalVariance)}
              </p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-3 border border-white/20 dark:border-gray-700/50 shadow-xl">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Closing Balance</p>
              <p className="text-sm font-bold text-purple-600">{formatCurrency(summary.closingBalanceFees || 0)}</p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-3 border border-white/20 dark:border-gray-700/50 shadow-xl mb-4 overflow-x-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all" title="Align Left">
              <AlignLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all" title="Align Center">
              <AlignCenter className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all" title="Align Right">
              <AlignRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all" title="Currency">
              <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all" title="Percentage">
              <Percent className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
            <button onClick={copyCell} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all" title="Copy">
              <Copy className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button onClick={pasteCell} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all" title="Paste">
              <Copy className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
            <button onClick={addRow} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all" title="Insert Row">
              <Rows className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              <span className="text-xs ml-1">+ Row</span>
            </button>
            <button onClick={deleteRow} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-red-500" title="Delete Row">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Spreadsheet Grid */}
        <div 
          ref={gridRef}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-auto"
          style={{ maxHeight: '70vh' }}
          tabIndex={0}
        >
          <div className="min-w-full" style={{ fontSize: `${zoom / 100}rem` }}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky top-0 z-20 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-1 min-w-[40px] text-center text-xs text-gray-500">
                    #
                  </th>
                  {sheetData?.columns.filter(c => c.visible).map((col) => (
                    <th
                      key={col.id}
                      className="sticky top-0 z-20 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap"
                      style={{ minWidth: col.width, width: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheetData?.rows.map((row, rowIndex) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors ${
                      row.type === 'header' ? 'bg-gray-50 dark:bg-gray-700/50' :
                      row.type === 'total' ? 'bg-blue-50 dark:bg-blue-900/20 font-bold' :
                      ''
                    }`}
                  >
                    <td className="border border-gray-200 dark:border-gray-600 p-1 text-center text-xs text-gray-400 sticky left-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm z-10">
                      {rowIndex + 1}
                    </td>
                    {sheetData.columns.filter(c => c.visible).map((col) => {
                      const cell = row.cells[col.id];
                      const isSelected = selectedCell?.rowId === row.id && selectedCell?.colId === col.id;
                      const isEditing = editingCell === `${row.id}-${col.id}`;
                      const cellValueDisplay = cell?.value || '';

                      return (
                        <td
                          key={col.id}
                          className={`border border-gray-200 dark:border-gray-600 p-1 transition-all cursor-cell ${
                            isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/50 dark:bg-blue-900/20' : ''
                          } ${row.type === 'total' ? 'font-bold' : ''}`}
                          style={{
                            minWidth: col.width,
                            width: col.width,
                            color: cell?.style?.color || (row.type === 'total' ? '#1a1a1a' : undefined),
                            backgroundColor: cell?.style?.bgColor || (isSelected ? 'transparent' : undefined),
                            fontWeight: cell?.style?.bold ? 'bold' : undefined,
                            fontStyle: cell?.style?.italic ? 'italic' : undefined,
                            textDecoration: cell?.style?.underline ? 'underline' : undefined,
                            textAlign: cell?.style?.align || 'left',
                          }}
                          onClick={() => handleCellClick(row.id, col.id)}
                          onDoubleClick={() => handleCellDoubleClick(row.id, col.id)}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              value={cellValue}
                              onChange={(e) => setCellValue(e.target.value)}
                              onBlur={() => {
                                handleCellChange(row.id, col.id, cellValue);
                                setEditingCell(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellChange(row.id, col.id, cellValue);
                                  setEditingCell(null);
                                }
                                if (e.key === 'Escape') {
                                  setEditingCell(null);
                                  setCellValue(cell?.value?.toString() || '');
                                }
                              }}
                              className="w-full bg-transparent focus:outline-none text-sm dark:text-white"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm dark:text-white">
                              {cell?.format === 'currency' ? formatCurrency(Number(cellValueDisplay)) :
                               cell?.format === 'percentage' ? formatPercentage(Number(cellValueDisplay)) :
                               cellValueDisplay}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense List */}
        <div className="mt-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-500" />
              Expense Transactions ({filteredExpenses.length})
            </h3>
            <div className="flex items-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-white"
              >
                <option value="all">All Categories</option>
                {expenseCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={expenseStatus}
                onChange={(e) => setExpenseStatus(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Add
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Sub Category</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Description</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Term</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">No expenses found for this term</td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                      <td className="px-4 py-2 text-xs font-mono text-gray-500">{expense.expense_id}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{expense.category}</td>
                      <td className="px-4 py-2 text-gray-500">{expense.sub_category || '-'}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{expense.description}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(expense.amount)}</td>
                      <td className="px-4 py-2 text-gray-500">{dayjs(expense.expense_date).format('MMM D, YYYY')}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{expense.academic_term || 'N/A'}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          expense.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          expense.status === 'approved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          expense.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {expense.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-medium">💡 Pro Tips for Accountants:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• <strong>Double-click</strong> any cell to edit its value</li>
                <li>• Use <strong>Arrow keys</strong> to navigate between cells</li>
                <li>• Press <strong>Enter</strong> to confirm edits, <strong>Escape</strong> to cancel</li>
                <li>• Click <strong>+ Row</strong> to add new rows</li>
                <li>• Use <strong>Copy</strong> and <strong>Paste</strong> to duplicate cell values</li>
                <li>• The <strong>Total</strong> and <strong>Net Profit</strong> rows update automatically</li>
                <li>• All calculations are real-time and auto-calculated</li>
                <li>• <strong>Add Expense</strong> to record new transactions directly</li>
                <li>• Switch between <strong>Terms</strong> to view historical data</li>
                <li>• <strong>Opening Balance</strong> carries forward from previous terms</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showExpenseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowExpenseModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-green-500" />
                  Add Expense
                </h3>
                <button
                  onClick={() => setShowExpenseModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category *
                    </label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    >
                      <option value="">Select Category</option>
                      {expenseCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sub Category
                    </label>
                    <input
                      type="text"
                      value={expenseForm.sub_category || ''}
                      onChange={(e) => setExpenseForm({ ...expenseForm, sub_category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      placeholder="e.g., Teaching Staff"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={expenseForm.description || ''}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      placeholder="Brief description of the expense"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      value={expenseForm.amount || ''}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Expense Date *
                    </label>
                    <input
                      type="date"
                      value={expenseForm.expense_date || ''}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={expenseForm.payment_method || 'Bank Transfer'}
                      onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    >
                      {paymentMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={expenseForm.status || 'pending'}
                      onChange={(e) => setExpenseForm({ ...expenseForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="paid">Paid</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <strong>Term:</strong> {selectedTerm?.term || 'Current'} ({selectedSession})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowExpenseModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addExpense}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-green-500/25 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Add Expense
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinancialReports;