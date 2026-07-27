export interface Expense {
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
  vendor?: string;
  department?: string;
  tax?: number;
  vat?: number;
  recurring?: boolean;
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  notes?: string;
}

export interface Budget {
  id: string;
  category: string;
  sub_category: string;
  amount: number;
  fiscal_year: string;
  branch_id: string;
  approved?: boolean;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
}

export interface Term {
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

export interface OpeningBalance {
  id: string;
  branch_id: string;
  academic_session: string;
  academic_term: string;
  balance_type: string;
  amount: number;
}

export interface FinancialSummary {
  openingBalance: number;
  closingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  outstandingFees: number;
  expectedRevenue: number;
  budgetUtilization: number;
  collectionRate: number;
  cashAvailable: number;
  bankBalance: number;
  pendingApprovals: number;
  totalBudget: number;
  totalVariance: number;
}

export interface Payment {
  id: string;
  amount_paid: number;
  status: string;
  payment_date: string;
  fee_id: string;
  student_id: string;
  payment_method: string;
  transaction_reference: string;
  student_name?: string;
  student_admission?: string;
  fee_name?: string;
}

export interface IncomeSource {
  id: string;
  name: string;
  category: string;
  expected: number;
  collected: number;
  outstanding: number;
  collectionRate: number;
  studentsPaid: number;
  studentsOwing: number;
}

export interface Receivable {
  id: string;
  student_id: string;
  student_name: string;
  student_admission: string;
  class_name: string;
  amount: number;
  paid: number;
  balance: number;
  due_date: string;
  status: string;
  daysOverdue: number;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id: string;
  user_id: string;
  user_name: string;
  branch_id: string;
  old_values: any;
  new_values: any;
  created_at: string;
  ip_address: string;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface FilterState {
  session: string;
  term: string;
  branch: string;
  department: string;
  dateRange: { start: string; end: string };
  category: string;
  status: string;
  paymentMethod: string;
  vendor: string;
  class: string;
  student: string;
  amountRange: { min: number; max: number };
}
