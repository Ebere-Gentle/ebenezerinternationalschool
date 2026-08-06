export interface Fee {
  id: string;
  fee_id: string;
  branch_id: string;
  class_id: string | null;
  category: string;
  name: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  late_fee_amount: number;
  installment_allowed: boolean;
  number_of_installments: number;
  is_mandatory: boolean;
  is_optional: boolean;
  is_recurring: boolean;
  recurrence_period: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
  term: string;
  session: string;
  payment_frequency: string;
  student_eligibility: string;
  class_name?: string;
  branch_name?: string;
}

export interface StudentFeeAssignment {
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
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'waived';
  assigned_date: string;
  due_date: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
  term: string | null;
  session: string | null;
  academic_session_id: string | null;
  assigned_from_fee: boolean;
  payment_frequency: string;
}

export interface FeeExemption {
  id: string;
  fee_id: string;
  student_id: string;
  branch_id: string;
  exemption_type: 'staff_child' | 'orphan' | 'scholarship' | 'other';
  waiver_percentage: number;
  exemption_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  metadata: any;
}

export interface PaymentRecord {
  id: string;
  payment_id: string;
  receipt_number: string;
  student_id: string;
  fee_id: string;
  amount: number;
  amount_paid: number;
  balance: number;
  payment_method: string;
  payment_date: string;
  due_date: string;
  status: string;
  transaction_reference: string;
  payment_proof_url: string;
  approved_by: string;
  approved_at: string;
  rejection_reason: string;
  branch_id: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
  student_email?: string;
  student_phone?: string;
  student_id_number?: string;
}

export interface FeeWithStatus extends Fee {
  amount_due: number;
  original_amount: number;
  is_paid: boolean;
  is_exempted: boolean;
  is_overdue: boolean;
  is_prorated: boolean;
  exemption_details?: FeeExemption;
  payment_status: 'paid' | 'pending' | 'unpaid' | 'exempted';
  payment_record?: PaymentRecord;
  days_until_due: number;
  days_overdue: number;
  discount_applied: number;
  discount_type?: 'exemption' | 'sibling' | 'early_payment' | 'prorated';
}

export interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  class_id: string;
  branch_id: string;
  admission_date: string;
  class_name?: string;
  branch_name?: string;
  full_name?: string;
}

export interface Class {
  id: string;
  name: string;
  code: string;
  level: string;
  student_count: number;
}

export interface AcademicPeriod {
  session: string;
  term: string;
  term_start_date?: string;
  term_end_date?: string;
  is_current?: boolean;
}
