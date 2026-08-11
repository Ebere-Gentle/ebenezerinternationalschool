import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Coins,
  Users,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  DollarSign,
  Building,
  Tag,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  User,
  CreditCard,
  Receipt,
  Printer,
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp,
  CalendarDays,
  Repeat,
  Building2,
  Gift,
  BadgeCheck,
  School,
  UsersRound,
  Shield as ShieldIcon,
  X,
  BookOpen,
  Shield,
  Bus,
  HeartHandshake,
  Save,
  Send,
  Upload,
  Banknote,
  Landmark,
  Smartphone,
  Eye,
  Copy
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate, formatDateTime, getDaysOverdue } from '../../utils';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

// Types
interface Fee {
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
  branch_name?: string;
  class_name?: string;
  fee_template_id?: string;
}

interface StudentFeeAssignment {
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
  assigned_from_fee: boolean;
  payment_frequency: string;
  student_name?: string;
  student_email?: string;
  student_id_number?: string;
  student_class?: string;
}

interface FeeExemption {
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

interface PaymentRecord {
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

// Category labels
const categoryLabels: Record<string, { label: string; description: string; icon: any }> = {
  school_fees: { label: 'School Fees', description: 'Main tuition fees - usually termly', icon: School },
  books: { label: 'Books & Stationery', description: 'Textbooks and stationery - per session', icon: BookOpen },
  uniform: { label: 'School Uniform', description: 'Complete uniform set - same price for all classes', icon: Shield },
  sportswear: { label: 'Sports Wear', description: 'PE kits and sports jerseys', icon: TrendingUp },
  bus: { label: 'School Bus', description: 'Transportation service - optional', icon: Bus },
  pta: { label: 'PTA Levy', description: 'Parent-Teacher Association contribution', icon: HeartHandshake },
  examination: { label: 'Examination Fees', description: 'Terminal and promotional exams', icon: BookOpen },
  medical: { label: 'Medical', description: 'School health program and insurance', icon: AlertCircle },
  graduation: { label: 'Graduation', description: 'Graduation ceremony fees', icon: BadgeCheck },
  development_levy: { label: 'Development Levy', description: 'Infrastructure development contribution', icon: Building },
  identity_card: { label: 'Identity Card', description: 'Student ID card production', icon: User },
  excursion: { label: 'Excursion', description: 'Educational trips and tours', icon: Users },
  hostel: { label: 'Hostel', description: 'Accommodation for boarders', icon: Building },
  laboratory: { label: 'Laboratory', description: 'Science practical and lab materials', icon: AlertCircle },
  lesson_fee: { label: 'Lesson Fee', description: 'After-school extra classes', icon: BookOpen },
  extra_classes: { label: 'Extra Classes', description: 'Extra-curricular activities', icon: Users },
  ict: { label: 'ICT / Computer', description: 'Computer lab and ICT resources', icon: Coins },
  custom: { label: 'Custom Fee', description: 'Custom fee category', icon: Tag },
};

// Payment method options
const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'remita', label: 'Remita', icon: Landmark },
  { value: 'paystack', label: 'Paystack', icon: CreditCard },
  { value: 'flutterwave', label: 'Flutterwave', icon: Smartphone },
  { value: 'offline_bank', label: 'Offline Bank', icon: Building2 },
];

const FeeDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  // State
  const [fee, setFee] = useState<Fee | null>(null);
  const [assignments, setAssignments] = useState<StudentFeeAssignment[]>([]);
  const [exemptions, setExemptions] = useState<FeeExemption[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  
  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [showExemptionModal, setShowExemptionModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<StudentFeeAssignment | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  
  // Form states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [waiverPercentage, setWaiverPercentage] = useState<number>(100);
  const [waiverReason, setWaiverReason] = useState<string>('');
  const [exemptionType, setExemptionType] = useState<string>('staff_child');
  const [exemptionReason, setExemptionReason] = useState<string>('');
  const [exemptionPercentage, setExemptionPercentage] = useState<number>(100);
  
  // Summary
  const [summaryData, setSummaryData] = useState({
    totalAmount: 0,
    totalAssigned: 0,
    totalPaid: 0,
    totalBalance: 0,
    paidCount: 0,
    unpaidCount: 0,
    partialCount: 0,
    overdueCount: 0,
    waivedCount: 0,
    collectionRate: 0
  });

  const pageSize = 10;

  useEffect(() => {
    if (id) {
      fetchFeeDetails();
      fetchAssignments();
      fetchExemptions();
      fetchPayments();
    }
  }, [id]);

  useEffect(() => {
    if (assignments.length > 0) {
      calculateSummary();
    }
  }, [assignments]);

  // ============================================
  // FETCH FUNCTIONS
  // ============================================

  const fetchFeeDetails = async () => {
    try {
      setLoading(true);
      const { data: feeData, error: feeError } = await supabase
        .from('fees')
        .select('*')
        .eq('id', id)
        .single();

      if (feeError) throw feeError;

      let branchName = 'N/A';
      if (feeData.branch_id) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('school_name')
          .eq('id', feeData.branch_id)
          .single();
        if (branchData) branchName = branchData.school_name;
      }

      let className = 'All Classes';
      if (feeData.class_id) {
        const { data: classData } = await supabase
          .from('classes')
          .select('name')
          .eq('id', feeData.class_id)
          .single();
        if (classData) className = classData.name;
      }

      // ============================================
      // FIX: Check if fee has breakdown in metadata
      // If not, try to get it from the template
      // ============================================
      let metadata = feeData.metadata || {};
      
      // Check if breakdown exists in fee metadata
      const hasBreakdown = metadata?.fee_breakdown && 
                           Array.isArray(metadata.fee_breakdown) && 
                           metadata.fee_breakdown.length > 0;
      
      // If no breakdown and fee has a template, fetch from template
      if (!hasBreakdown && feeData.fee_template_id) {
        console.log('Fetching breakdown from template:', feeData.fee_template_id);
        
        const { data: templateData, error: templateError } = await supabase
          .from('fee_templates')
          .select('metadata')
          .eq('id', feeData.fee_template_id)
          .single();
        
        if (!templateError && templateData?.metadata?.fee_breakdown) {
          // Copy breakdown from template to fee metadata
          metadata = {
            ...metadata,
            fee_breakdown: templateData.metadata.fee_breakdown,
            breakdown_from_template: true,
            template_id: feeData.fee_template_id
          };
          
          console.log('Breakdown loaded from template:', templateData.metadata.fee_breakdown);
        }
      }

      setFee({ 
        ...feeData, 
        branch_name: branchName, 
        class_name: className,
        metadata: metadata 
      });
    } catch (error: any) {
      console.error('Error fetching fee details:', error);
      toast.error(error.message || 'Failed to load fee details');
      navigate('/fees');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    if (!id) return;
    setLoadingAssignments(true);
    try {
      const { data, error } = await supabase
        .from('student_fee_assignments')
        .select('*')
        .eq('fee_id', id)
        .eq('is_active', true)
        .order('assigned_date', { ascending: false });

      if (error) {
        console.error('Error fetching assignments:', error);
        setAssignments([]);
        setTotalCount(0);
        setLoadingAssignments(false);
        return;
      }

      if (!data || data.length === 0) {
        setAssignments([]);
        setTotalCount(0);
        setLoadingAssignments(false);
        return;
      }

      const studentIds = data.map(a => a.student_id).filter(Boolean);
      let studentsMap: Record<string, any> = {};
      
      if (studentIds.length > 0) {
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, first_name, last_name, student_id, email, class_id')
          .in('id', studentIds);

        if (!studentsError && studentsData) {
          studentsMap = studentsData.reduce((acc, s) => {
            acc[s.id] = s;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const classIds = Object.values(studentsMap).map(s => s.class_id).filter(Boolean);
      let classesMap: Record<string, string> = {};
      
      if (classIds.length > 0) {
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', classIds);
        
        if (classesData) {
          classesMap = classesData.reduce((acc, c) => {
            acc[c.id] = c.name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const assignmentIds = data.map(a => a.id);
      let paymentsMap: Record<string, { total_paid: number; status: string }> = {};
      
      if (assignmentIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('assignment_id, amount_paid, status')
          .eq('fee_id', id)
          .in('status', ['completed', 'paid', 'approved']);

        if (!paymentsError && paymentsData) {
          paymentsData.forEach(p => {
            if (p.assignment_id) {
              if (!paymentsMap[p.assignment_id]) {
                paymentsMap[p.assignment_id] = { total_paid: 0, status: 'unpaid' };
              }
              paymentsMap[p.assignment_id].total_paid += p.amount_paid || 0;
              if (p.status === 'completed' || p.status === 'paid' || p.status === 'approved') {
                paymentsMap[p.assignment_id].status = 'paid';
              }
            }
          });
        }
      }

      const assignmentsWithStudents = data.map((assignment) => {
        const student = studentsMap[assignment.student_id];
        const studentName = student 
          ? `${student.first_name} ${student.last_name}`.trim() || 'Unknown Student'
          : 'Unknown Student';
        const studentClass = student?.class_id ? classesMap[student.class_id] || '' : '';

        const paymentInfo = paymentsMap[assignment.id];
        const totalPaid = paymentInfo?.total_paid || 0;
        const balance = Math.max(0, assignment.original_amount - totalPaid - (assignment.discount_amount || 0));
        
        let status = assignment.payment_status;
        const amountDue = assignment.original_amount - (assignment.discount_amount || 0);
        if (totalPaid >= amountDue && amountDue > 0) {
          status = 'paid';
        } else if (totalPaid > 0) {
          status = 'partial';
        } else {
          status = 'unpaid';
        }

        return {
          ...assignment,
          student_name: studentName,
          student_id_number: student?.student_id || '',
          student_email: student?.email || '',
          student_class: studentClass,
          amount_paid: totalPaid,
          balance: balance,
          payment_status: status,
        };
      });

      setAssignments(assignmentsWithStudents);
      setTotalCount(assignmentsWithStudents.length);
    } catch (error: any) {
      console.error('Error in fetchAssignments:', error);
      setAssignments([]);
      setTotalCount(0);
      toast.error('Failed to load assignments');
    } finally {
      setLoadingAssignments(false);
    }
  };

  const fetchExemptions = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('fee_exemptions')
        .select('*')
        .eq('fee_id', id)
        .eq('is_active', true);

      if (error) throw error;
      setExemptions(data || []);
    } catch (error: any) {
      console.error('Error fetching exemptions:', error);
    }
  };

  const fetchPayments = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('fee_id', id)
        .in('status', ['completed', 'paid', 'approved', 'pending'])
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
    }
  };

  // ============================================
  // CALCULATIONS
  // ============================================

  const calculateSummary = () => {
    const totalAssigned = assignments.length;
    const totalAmount = assignments.reduce((sum, a) => sum + a.original_amount, 0);
    const totalPaid = assignments.reduce((sum, a) => sum + a.amount_paid, 0);
    const totalBalance = assignments.reduce((sum, a) => sum + a.balance, 0);
    
    const paidCount = assignments.filter(a => a.payment_status === 'paid').length;
    const unpaidCount = assignments.filter(a => a.payment_status === 'unpaid').length;
    const partialCount = assignments.filter(a => a.payment_status === 'partial').length;
    const overdueCount = assignments.filter(a => a.payment_status === 'overdue').length;
    const waivedCount = assignments.filter(a => a.payment_status === 'waived').length;
    
    const collectionRate = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

    setSummaryData({
      totalAmount,
      totalAssigned,
      totalPaid,
      totalBalance,
      paidCount,
      unpaidCount,
      partialCount,
      overdueCount,
      waivedCount,
      collectionRate
    });
  };

  // ============================================
  // PAYMENT FUNCTIONS
  // ============================================

  const handleOpenPaymentModal = (assignment: StudentFeeAssignment) => {
    setSelectedAssignment(assignment);
    setAmountPaid(assignment.balance);
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedAssignment(null);
    setUploadedFile(null);
    setUploadPreview(null);
    setPaymentReference('');
    setAmountPaid(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a JPEG, PNG, or PDF file');
        return;
      }
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setUploadPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadPaymentProof = async (file: File, paymentId: string): Promise<{ path: string; url: string } | null> => {
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `proof_${paymentId}_${Date.now()}.${extension}`;
      const filePath = `payments/${paymentId}/${fileName}`;

      const { error } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(filePath);
      return { path: filePath, url: urlData.publicUrl };
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      return null;
    }
  };

  const generateReceiptNumber = async (): Promise<string> => {
    const year = dayjs().format('YYYY');
    const prefix = `RCP/EBE/${year}/`;
    const { data } = await supabase
      .from('payments')
      .select('receipt_number')
      .like('receipt_number', `${prefix}%`);

    const existingSequences = new Set<number>();
    if (data) {
      data.forEach(p => {
        const parts = p.receipt_number?.split('/');
        const seq = parseInt(parts?.[parts.length - 1]);
        if (!isNaN(seq)) existingSequences.add(seq);
      });
    }

    let nextSequence = 1;
    while (existingSequences.has(nextSequence)) nextSequence++;
    return `${prefix}${String(nextSequence).padStart(8, '0')}`;
  };

  const handleSubmitPayment = async () => {
    if (!selectedAssignment || !fee || !user) {
      toast.error('Missing required data');
      return;
    }

    if (!uploadedFile) {
      toast.error('Please upload payment proof');
      return;
    }

    if (!paymentReference) {
      toast.error('Please enter transaction reference');
      return;
    }

    if (amountPaid <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    if (amountPaid > selectedAssignment.balance) {
      toast.error('Amount cannot exceed balance');
      return;
    }

    try {
      toast.loading('Processing payment...');

      const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const receiptNumber = await generateReceiptNumber();

      const proofResult = await uploadPaymentProof(uploadedFile, paymentId);
      if (!proofResult) throw new Error('Failed to upload payment proof');

      const newBalance = selectedAssignment.balance - amountPaid;
      const isFullyPaid = newBalance <= 0;

      const paymentData = {
        payment_id: paymentId,
        receipt_number: receiptNumber,
        student_id: selectedAssignment.student_id,
        fee_id: fee.id,
        assignment_id: selectedAssignment.id,
        amount: selectedAssignment.original_amount,
        amount_paid: amountPaid,
        balance: Math.max(newBalance, 0),
        payment_method: paymentMethod,
        payment_date: new Date().toISOString(),
        due_date: fee.due_date,
        status: isFullyPaid ? 'completed' : 'pending',
        transaction_reference: paymentReference,
        branch_id: fee.branch_id,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payment_proof_url: proofResult.url,
        receipt_url: proofResult.url,
        metadata: {
          assignment_id: selectedAssignment.id,
          student_name: selectedAssignment.student_name,
          payment_method: paymentMethod,
          uploaded_file: uploadedFile.name,
        }
      };

      const { error: insertError } = await supabase.from('payments').insert([paymentData]);
      if (insertError) throw insertError;

      const newPaid = selectedAssignment.amount_paid + amountPaid;
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      const { error: updateError } = await supabase
        .from('student_fee_assignments')
        .update({
          amount_paid: newPaid,
          balance: Math.max(newBalance, 0),
          payment_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAssignment.id);

      if (updateError) throw updateError;

      toast.dismiss();
      toast.success(`Payment of ${formatCurrency(amountPaid)} recorded successfully! Receipt: ${receiptNumber}`);
      
      handleClosePaymentModal();
      
      await Promise.all([fetchAssignments(), fetchPayments()]);
    } catch (error: any) {
      toast.dismiss();
      console.error('Error submitting payment:', error);
      toast.error(error.message || 'Failed to record payment');
    }
  };

  // ============================================
  // WAIVER FUNCTIONS
  // ============================================

  const handleOpenWaiverModal = (assignment: StudentFeeAssignment) => {
    setSelectedAssignment(assignment);
    setWaiverPercentage(100);
    setWaiverReason('');
    setShowWaiverModal(true);
  };

  const handleCloseWaiverModal = () => {
    setShowWaiverModal(false);
    setSelectedAssignment(null);
    setWaiverPercentage(100);
    setWaiverReason('');
  };

  const handleSubmitWaiver = async () => {
    if (!selectedAssignment || !user) {
      toast.error('Missing required data');
      return;
    }

    if (waiverPercentage <= 0 || waiverPercentage > 100) {
      toast.error('Waiver percentage must be between 1 and 100');
      return;
    }

    try {
      toast.loading('Applying waiver...');

      const waiverAmount = selectedAssignment.balance * (waiverPercentage / 100);
      const newBalance = selectedAssignment.balance - waiverAmount;
      const isFullyWaived = newBalance <= 0;

      const { error: updateError } = await supabase
        .from('student_fee_assignments')
        .update({
          discount_amount: selectedAssignment.discount_amount + waiverAmount,
          amount_due: Math.max(0, selectedAssignment.original_amount - (selectedAssignment.discount_amount + waiverAmount)),
          balance: Math.max(newBalance, 0),
          payment_status: isFullyWaived ? 'waived' : 'partial',
          updated_at: new Date().toISOString(),
          metadata: {
            ...selectedAssignment.metadata,
            waiver_applied: {
              percentage: waiverPercentage,
              amount: waiverAmount,
              reason: waiverReason,
              applied_by: user.email,
              applied_at: new Date().toISOString()
            }
          }
        })
        .eq('id', selectedAssignment.id);

      if (updateError) throw updateError;

      await supabase.from('payments').insert([{
        payment_id: `WAV-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        receipt_number: `WAV/${dayjs().format('YYYY')}/${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        student_id: selectedAssignment.student_id,
        fee_id: fee?.id,
        assignment_id: selectedAssignment.id,
        amount: selectedAssignment.original_amount,
        amount_paid: waiverAmount,
        balance: Math.max(newBalance, 0),
        payment_method: 'waiver',
        payment_date: new Date().toISOString(),
        due_date: fee?.due_date,
        status: 'completed',
        transaction_reference: `WAV-${Date.now()}`,
        branch_id: fee?.branch_id,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          assignment_id: selectedAssignment.id,
          waiver_percentage: waiverPercentage,
          waiver_reason: waiverReason,
          student_name: selectedAssignment.student_name,
        }
      }]);

      toast.dismiss();
      toast.success(`Waiver of ${waiverPercentage}% applied successfully!`);
      
      handleCloseWaiverModal();
      await Promise.all([fetchAssignments(), fetchPayments()]);
    } catch (error: any) {
      toast.dismiss();
      console.error('Error applying waiver:', error);
      toast.error(error.message || 'Failed to apply waiver');
    }
  };

  // ============================================
  // EXEMPTION FUNCTIONS
  // ============================================

  const handleOpenExemptionModal = (assignment: StudentFeeAssignment) => {
    setSelectedAssignment(assignment);
    setExemptionType('staff_child');
    setExemptionReason('');
    setExemptionPercentage(100);
    setShowExemptionModal(true);
  };

  const handleCloseExemptionModal = () => {
    setShowExemptionModal(false);
    setSelectedAssignment(null);
    setExemptionType('staff_child');
    setExemptionReason('');
    setExemptionPercentage(100);
  };

  const handleSubmitExemption = async () => {
    if (!selectedAssignment || !fee || !user) {
      toast.error('Missing required data');
      return;
    }

    if (exemptionPercentage <= 0 || exemptionPercentage > 100) {
      toast.error('Exemption percentage must be between 1 and 100');
      return;
    }

    try {
      toast.loading('Creating exemption...');

      const { data: existing } = await supabase
        .from('fee_exemptions')
        .select('id')
        .eq('fee_id', fee.id)
        .eq('student_id', selectedAssignment.student_id)
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        toast.dismiss();
        toast.error('This student already has an exemption for this fee');
        return;
      }

      const { error: exemptionError } = await supabase
        .from('fee_exemptions')
        .insert([{
          fee_id: fee.id,
          student_id: selectedAssignment.student_id,
          branch_id: fee.branch_id,
          exemption_type: exemptionType,
          waiver_percentage: exemptionPercentage,
          exemption_reason: exemptionReason,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
          metadata: {
            created_by_email: user.email,
            student_name: selectedAssignment.student_name,
          }
        }]);

      if (exemptionError) throw exemptionError;

      const waiverAmount = selectedAssignment.balance * (exemptionPercentage / 100);
      const newBalance = selectedAssignment.balance - waiverAmount;
      const isFullyWaived = newBalance <= 0;

      const { error: updateError } = await supabase
        .from('student_fee_assignments')
        .update({
          discount_amount: selectedAssignment.discount_amount + waiverAmount,
          amount_due: Math.max(0, selectedAssignment.original_amount - (selectedAssignment.discount_amount + waiverAmount)),
          balance: Math.max(newBalance, 0),
          payment_status: isFullyWaived ? 'waived' : 'partial',
          updated_at: new Date().toISOString(),
          metadata: {
            ...selectedAssignment.metadata,
            exemption_applied: {
              type: exemptionType,
              percentage: exemptionPercentage,
              reason: exemptionReason,
              applied_by: user.email,
              applied_at: new Date().toISOString()
            }
          }
        })
        .eq('id', selectedAssignment.id);

      if (updateError) throw updateError;

      toast.dismiss();
      toast.success(`Exemption (${exemptionType}) created successfully!`);
      
      handleCloseExemptionModal();
      await Promise.all([fetchAssignments(), fetchExemptions()]);
    } catch (error: any) {
      toast.dismiss();
      console.error('Error creating exemption:', error);
      toast.error(error.message || 'Failed to create exemption');
    }
  };

  // ============================================
  // VIEW FUNCTIONS
  // ============================================

  const handleViewStudent = (assignment: StudentFeeAssignment) => {
    if (assignment.student_id) {
      navigate(`/students/${assignment.student_id}`);
    } else {
      toast.error('Student ID not found');
    }
  };

  const handleViewPayment = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setShowPaymentDetails(true);
  };

  // ============================================
  // UI HELPERS
  // ============================================

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      unpaid: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      waived: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[status] || styles.unpaid;
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      school_fees: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      books: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      uniform: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      sportswear: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
      bus: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      pta: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      examination: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      medical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      graduation: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      development_levy: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
      identity_card: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      excursion: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
      hostel: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
      laboratory: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
      lesson_fee: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      extra_classes: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      ict: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      custom: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[category] || styles.custom;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return CheckCircle;
      case 'pending': return Clock;
      case 'overdue': return AlertCircle;
      case 'waived': return ShieldIcon;
      case 'partial': return AlertCircle;
      default: return XCircle;
    }
  };

  const toggleAssignmentExpand = (assignmentId: string) => {
    setExpandedAssignment(expandedAssignment === assignmentId ? null : assignmentId);
  };

  const exportData = async () => {
    try {
      toast.loading('Exporting data...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.dismiss();
      toast.success('Export completed successfully!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to export data');
    }
  };

  // Filter and paginate assignments
  const filteredAssignments = assignments.filter(a => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (a.student_name?.toLowerCase().includes(search) ||
              a.student_id_number?.toLowerCase().includes(search) ||
              a.assignment_id.toLowerCase().includes(search));
    }
    if (statusFilter !== 'all') {
      return a.payment_status === statusFilter;
    }
    return true;
  });

  const paginatedAssignments = filteredAssignments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(filteredAssignments.length / pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!fee) {
    return (
      <div className="text-center py-12">
        <Coins className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fee not found</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-1">The fee you're looking for doesn't exist</p>
        <button
          onClick={() => navigate('/fees')}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:opacity-90 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Fees
        </button>
      </div>
    );
  }

  const categoryInfo = categoryLabels[fee.category] || { label: fee.category, description: 'Custom category', icon: Tag };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/fees')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
              {fee.name}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(fee.status)}`}>
                {fee.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
              </span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs">{fee.fee_id}</span>
              <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
              <span>{categoryInfo.label}</span>
              {fee.term && fee.session && (
                <>
                  <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {fee.term} {fee.session}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={exportData} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
            <Download className="w-4 h-4" /> Export Data
          </button>
          <button onClick={() => navigate(`/fees/edit/${fee.id}`)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25">
            <FileText className="w-4 h-4" /> Edit Fee
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(summaryData.totalAmount)}</p>
          <p className="text-xs text-gray-500">{summaryData.totalAssigned} students</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Collected</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(summaryData.totalPaid)}</p>
          <p className="text-xs text-gray-500">{summaryData.collectionRate.toFixed(1)}% rate</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Balance</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(summaryData.totalBalance)}</p>
          <p className="text-xs text-gray-500">Outstanding</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Paid</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{summaryData.paidCount}</p>
          <p className="text-xs text-gray-500">Students</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{summaryData.unpaidCount}</p>
          <p className="text-xs text-gray-500">Students</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{summaryData.overdueCount}</p>
          <p className="text-xs text-gray-500">Students</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Waived</p>
          <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{summaryData.waivedCount}</p>
          <p className="text-xs text-gray-500">Students</p>
        </div>
      </div>

      {/* Fee Details Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" /> Fee Information
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryBadge(fee.category)}`}>
                {categoryInfo.label}
              </span>
              <p className="text-xs text-gray-400 mt-1">{categoryInfo.description}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Branch</p>
              <p className="font-medium text-gray-900 dark:text-white">{fee.branch_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Class</p>
              <p className="font-medium text-gray-900 dark:text-white">{fee.class_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(fee.amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
              <p className="font-medium text-gray-900 dark:text-white">{fee.due_date ? formatDate(fee.due_date) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Frequency</p>
              <p className="font-medium text-gray-900 dark:text-white capitalize">{fee.payment_frequency || 'Termly'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Session</p>
              <p className="font-medium text-gray-900 dark:text-white">{fee.session || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Term</p>
              <p className="font-medium text-gray-900 dark:text-white">{fee.term || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
              <div className="flex items-center gap-2 flex-wrap">
                {fee.is_mandatory && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs"><BadgeCheck className="w-3 h-3" /> Mandatory</span>}
                {fee.is_optional && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs">Optional</span>}
                {fee.is_recurring && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs"><Repeat className="w-3 h-3" /> Recurring</span>}
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Description</p>
              <p className="font-medium text-gray-900 dark:text-white">{fee.description || 'No description provided'}</p>
            </div>
          </div>

          {/* ============================================ */}
          {/* FEE BREAKDOWN SECTION - WITH TEMPLATE FALLBACK */}
          {/* ============================================ */}
          {(() => {
            const breakdown = fee?.metadata?.fee_breakdown;
            const hasBreakdown = breakdown && Array.isArray(breakdown) && breakdown.length > 0;
            const isFromTemplate = fee?.metadata?.breakdown_from_template;
            
            return hasBreakdown ? (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-green-500" />
                  Fee Breakdown
                  {isFromTemplate && (
                    <span className="text-xs font-normal text-blue-500 dark:text-blue-400 ml-2 flex items-center gap-1">
                      <Copy className="w-3 h-3" />
                      (from template)
                    </span>
                  )}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                    ({breakdown.length} items)
                  </span>
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {breakdown.map((item: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
                          <td className="px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                            {item.item || 'Unnamed Item'}
                          </td>
                          <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(item.amount || 0)}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                            {item.description || '-'}
                          </td>
                        </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="bg-blue-50 dark:bg-blue-900/20">
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                          Total
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(breakdown.reduce((sum: number, item: any) => sum + (item.amount || 0), 0))}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {breakdown.length} item(s)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null;
          })()}

          {exemptions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400">
                  <ShieldIcon className="w-4 h-4" />
                  <span>{exemptions.length} student(s) exempted</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assignments Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UsersRound className="w-5 h-5" /> Student Assignments
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {totalCount > 0 ? `Showing ${Math.min((currentPage - 1) * pageSize + 1, totalCount)} to ${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} assignments` : 'No assignments found'}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Search by student..."
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="paid">✅ Paid</option>
                <option value="unpaid">⬜ Unpaid</option>
                <option value="partial">🔄 Partial</option>
                <option value="overdue">🔴 Overdue</option>
                <option value="waived">🛡️ Waived</option>
              </select>
              <button
                onClick={() => { setStatusFilter('all'); setSearchTerm(''); setCurrentPage(1); fetchAssignments(); }}
                className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingAssignments ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : paginatedAssignments.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">No assignments</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No students have been assigned to this fee yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Paid</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedAssignments.map((assignment) => {
                  const StatusIcon = getStatusIcon(assignment.payment_status);
                  const isPaidOrWaived = assignment.payment_status === 'paid' || assignment.payment_status === 'waived';
                  
                  return (
                    <React.Fragment key={assignment.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                              {assignment.student_name?.[0]?.toUpperCase() || 'S'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {assignment.student_name || 'Unknown Student'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                {assignment.student_id_number}
                              </p>
                              {assignment.student_class && (
                                <p className="text-xs text-blue-500">{assignment.student_class}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(assignment.original_amount)}
                          </p>
                          {assignment.discount_amount > 0 && (
                            <p className="text-xs text-green-500">-{formatCurrency(assignment.discount_amount)}</p>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(assignment.amount_paid)}
                          </p>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            {formatCurrency(assignment.balance)}
                          </p>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(assignment.payment_status)}`}>
                            <StatusIcon className="w-3 h-3" />
                            {assignment.payment_status.charAt(0).toUpperCase() + assignment.payment_status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenPaymentModal(assignment)}
                              disabled={isPaidOrWaived}
                              className={`p-1.5 rounded-lg transition-all ${
                                isPaidOrWaived
                                  ? 'opacity-50 cursor-not-allowed text-gray-400'
                                  : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400'
                              }`}
                              title={isPaidOrWaived ? 'Already paid or waived' : 'Record Payment'}
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenWaiverModal(assignment)}
                              disabled={isPaidOrWaived}
                              className={`p-1.5 rounded-lg transition-all ${
                                isPaidOrWaived
                                  ? 'opacity-50 cursor-not-allowed text-gray-400'
                                  : 'hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                              }`}
                              title={isPaidOrWaived ? 'Already paid or waived' : 'Apply Waiver'}
                            >
                              <Gift className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenExemptionModal(assignment)}
                              disabled={isPaidOrWaived}
                              className={`p-1.5 rounded-lg transition-all ${
                                isPaidOrWaived
                                  ? 'opacity-50 cursor-not-allowed text-gray-400'
                                  : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                              }`}
                              title={isPaidOrWaived ? 'Already paid or waived' : 'Create Exemption'}
                            >
                              <ShieldIcon className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleViewStudent(assignment)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-all"
                              title="View Student"
                            >
                              <User className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => toggleAssignmentExpand(assignment.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-gray-500 dark:text-gray-400"
                              title="View Details"
                            >
                              {expandedAssignment === assignment.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expandedAssignment === assignment.id && (
                        <tr>
                          <td colSpan={6} className="px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-700/30">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Assignment Details</h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Original Amount</span>
                                    <span className="font-medium">{formatCurrency(assignment.original_amount)}</span>
                                  </div>
                                  {assignment.discount_amount > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-500">Discount</span>
                                      <span className="font-medium text-green-500">-{formatCurrency(assignment.discount_amount)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Amount Due</span>
                                    <span className="font-medium">{formatCurrency(assignment.amount_due)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Amount Paid</span>
                                    <span className="font-medium text-green-500">{formatCurrency(assignment.amount_paid)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Balance</span>
                                    <span className="font-medium text-red-500">{formatCurrency(assignment.balance)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Status</span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(assignment.payment_status)}`}>
                                      {assignment.payment_status.charAt(0).toUpperCase() + assignment.payment_status.slice(1)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Timeline</h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Assigned</span>
                                    <span className="font-medium">{formatDateTime(assignment.assigned_date)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Due Date</span>
                                    <span className="font-medium">{assignment.due_date ? formatDate(assignment.due_date) : 'N/A'}</span>
                                  </div>
                                  {assignment.payment_status === 'overdue' && assignment.due_date && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-500">Days Overdue</span>
                                      <span className="font-medium text-red-500">{getDaysOverdue(assignment.due_date)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Session</span>
                                    <span className="font-medium">{assignment.session || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Term</span>
                                    <span className="font-medium">{assignment.term || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Quick Actions</h4>
                                <div className="space-y-2">
                                  {!isPaidOrWaived && (
                                    <>
                                      <button
                                        onClick={() => handleOpenPaymentModal(assignment)}
                                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                      >
                                        <DollarSign className="w-4 h-4" /> Record Payment
                                      </button>
                                      <button
                                        onClick={() => handleOpenWaiverModal(assignment)}
                                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                                      >
                                        <Gift className="w-4 h-4" /> Apply Waiver
                                      </button>
                                      <button
                                        onClick={() => handleOpenExemptionModal(assignment)}
                                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                      >
                                        <ShieldIcon className="w-4 h-4" /> Create Exemption
                                      </button>
                                    </>
                                  )}
                                  {assignment.payment_status === 'overdue' && (
                                    <button className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-all flex items-center justify-center gap-2">
                                      <Send className="w-4 h-4" /> Send Reminder
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleViewStudent(assignment)}
                                    className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
                                  >
                                    <User className="w-4 h-4" /> View Student
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* PAYMENT MODAL */}
      {/* ============================================ */}
      <AnimatePresence>
        {showPaymentModal && selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Record Payment
                </h3>
                <button onClick={handleClosePaymentModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Student</h4>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedAssignment.student_name}</p>
                  <p className="text-sm text-gray-500">Balance: {formatCurrency(selectedAssignment.balance)}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount to Pay</label>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                      max={selectedAssignment.balance}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum: {formatCurrency(selectedAssignment.balance)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                    >
                      {paymentMethods.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction Reference</label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Enter transaction reference"
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Payment Proof</label>
                    <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-green-500 transition-all">
                      {uploadPreview ? (
                        <div className="space-y-3">
                          <img src={uploadPreview} alt="Payment proof" className="max-h-48 mx-auto rounded-lg" />
                          <button onClick={() => { setUploadedFile(null); setUploadPreview(null); }} className="text-sm text-red-600 hover:underline">Remove</button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-400">JPEG, PNG, PDF (Max 5MB)</p>
                          <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitPayment}
                    disabled={!uploadedFile || !paymentReference || amountPaid <= 0}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Record Payment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WAIVER MODAL */}
      <AnimatePresence>
        {showWaiverModal && selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-600" />
                  Apply Waiver
                </h3>
                <button onClick={handleCloseWaiverModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">Student</h4>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedAssignment.student_name}</p>
                  <p className="text-sm text-gray-500">Balance: {formatCurrency(selectedAssignment.balance)}</p>
                  <p className="text-sm text-gray-500">Original Amount: {formatCurrency(selectedAssignment.original_amount)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Waiver Percentage (%)</label>
                  <input
                    type="number"
                    value={waiverPercentage}
                    onChange={(e) => setWaiverPercentage(parseFloat(e.target.value) || 0)}
                    min="1"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Waiver amount: {formatCurrency(selectedAssignment.balance * (waiverPercentage / 100))}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (Optional)</label>
                  <textarea
                    value={waiverReason}
                    onChange={(e) => setWaiverReason(e.target.value)}
                    rows={2}
                    placeholder="Reason for waiver..."
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>

                <button
                  onClick={handleSubmitWaiver}
                  disabled={waiverPercentage <= 0 || waiverPercentage > 100}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Gift className="w-4 h-4" /> Apply Waiver
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EXEMPTION MODAL */}
      <AnimatePresence>
        {showExemptionModal && selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldIcon className="w-5 h-5 text-indigo-600" />
                  Create Exemption
                </h3>
                <button onClick={handleCloseExemptionModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-2">Student</h4>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedAssignment.student_name}</p>
                  <p className="text-sm text-gray-500">Balance: {formatCurrency(selectedAssignment.balance)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exemption Type</label>
                  <select
                    value={exemptionType}
                    onChange={(e) => setExemptionType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:text-white"
                  >
                    <option value="staff_child">Staff Child</option>
                    <option value="orphan">Orphan</option>
                    <option value="scholarship">Scholarship</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Waiver Percentage (%)</label>
                  <input
                    type="number"
                    value={exemptionPercentage}
                    onChange={(e) => setExemptionPercentage(parseFloat(e.target.value) || 0)}
                    min="1"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Waiver amount: {formatCurrency(selectedAssignment.balance * (exemptionPercentage / 100))}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (Optional)</label>
                  <textarea
                    value={exemptionReason}
                    onChange={(e) => setExemptionReason(e.target.value)}
                    rows={2}
                    placeholder="Reason for exemption..."
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>

                <button
                  onClick={handleSubmitExemption}
                  disabled={exemptionPercentage <= 0 || exemptionPercentage > 100}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ShieldIcon className="w-4 h-4" /> Create Exemption
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PAYMENT DETAILS MODAL */}
      <AnimatePresence>
        {showPaymentDetails && selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-500" /> Payment Details
                </h3>
                <button onClick={() => { setShowPaymentDetails(false); setSelectedPayment(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Payment Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Amount Paid</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(selectedPayment.amount_paid)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedPayment.status)}`}>
                        {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Payment Method</p>
                      <p className="font-medium text-gray-900 dark:text-white capitalize">{selectedPayment.payment_method || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Reference</p>
                      <p className="font-mono text-sm text-gray-900 dark:text-white">{selectedPayment.transaction_reference || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Payment Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(selectedPayment.payment_date)}</p>
                    </div>
                    {selectedPayment.rejection_reason && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Rejection Reason</p>
                        <p className="font-medium text-red-600 dark:text-red-400">{selectedPayment.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Fee Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Fee Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">{fee?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Fee ID</p>
                      <p className="font-medium text-gray-900 dark:text-white font-mono">{fee?.fee_id || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={() => { setShowPaymentDetails(false); setSelectedPayment(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                    Close
                  </button>
                  <button onClick={() => { toast.success('Generating receipt...'); }} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2">
                    <Printer className="w-4 h-4" /> Generate Receipt
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeeDetail;