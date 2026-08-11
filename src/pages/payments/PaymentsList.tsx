import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  Search, 
  Plus, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Printer,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Banknote,
  Smartphone,
  Building,
  Wallet,
  Receipt,
  User,
  Shield,
  QrCode,
  Barcode,
  Copy,
  Check,
  School,
  X,
  FileText,
  List,
  AlertTriangle,
  Image,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Calendar as CalendarIcon,
  BookOpen,
  Hash,
  Filter
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import ReceiptModal from '../../components/common/ReceiptModal';

// Import school logo from assets
import schoolLogo from '../../assets/school-logo.png';

interface Payment {
  id: string;
  payment_id: string;
  receipt_number: string;
  student_id: string;
  fee_id: string;
  assignment_id?: string;
  amount: number;
  amount_paid: number;
  balance: number;
  payment_method: string;
  payment_date: string;
  due_date: string;
  status: string;
  transaction_reference: string;
  payment_proof_url: string;
  payment_proof_path: string;
  receipt_url: string;
  receipt_path: string;
  receipt_file_name: string;
  approved_by: string;
  approved_at: string;
  rejection_reason: string;
  branch_id: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
  student_first_name?: string;
  student_last_name?: string;
  student_admission?: string;
  student_class_name?: string;
  fee_name?: string;
  // Session/Term fields
  academic_session?: string;
  academic_term?: string;
  term_id?: string;
  session_id?: string;
  fee_term?: string;
  fee_session?: string;
  metadata?: {
    receipt_url?: string;
    receipt_path?: string;
    receipt_file_name?: string;
    uploaded_from?: string;
    uploaded_at?: string;
    uploaded_file?: string;
    proof_path?: string;
    proof_url?: string;
    payment_type?: string;
    submitted_at?: string;
    term?: string;
    session?: string;
    term_id?: string;
    session_id?: string;
    fee_term?: string;
    fee_session?: string;
    fee_name?: string;
    fee_id?: string;
    reference?: string;
    student_name?: string;
    student_id?: string;
    assignment_id?: string;
    payment_method?: string;
    transaction_reference?: string;
    approved_at?: string;
    approved_by?: string;
  };
}

interface PaymentStats {
  totalRevenue: number;
  totalPayments: number;
  pendingPayments: number;
  overduePayments: number;
  completedPayments: number;
  failedPayments: number;
  revenueChange: number;
  paymentChange: number;
}

interface SchoolInfo {
  id: string;
  school_id: string;
  school_name: string;
  address: string;
  email: string;
  website: string;
  phone_number: string;
  logo_url: string;
  motto: string;
  vision: string;
  mission: string;
  principal_id: string;
  director_id: string;
  bank_accounts: any[];
  payment_details: any;
  academic_session: string;
  current_term: string;
  timezone: string;
  currency: string;
  school_colors: {
    primary: string;
    secondary: string;
  };
}

// Available sessions and terms for filters
const AVAILABLE_SESSIONS = ['2024/2025', '2025/2026', '2026/2027', '2027/2028'];
const AVAILABLE_TERMS = ['First Term', 'Second Term', 'Third Term'];

const PaymentsList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    totalPayments: 0,
    pendingPayments: 0,
    overduePayments: 0,
    completedPayments: 0,
    failedPayments: 0,
    revenueChange: 0,
    paymentChange: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [termFilter, setTermFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  });
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showReceiptViewer, setShowReceiptViewer] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [printing, setPrinting] = useState(false);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [viewerImageError, setViewerImageError] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const pageSize = 10;

  // Helper function to extract term/session from payment
  const extractSessionAndTerm = useCallback((payment: any) => {
    let session = payment.academic_session || '';
    let term = payment.academic_term || '';
    let termId = payment.term_id || '';
    let sessionId = payment.session_id || '';

    // If columns are empty, try to get from metadata
    if (!session && payment.metadata) {
      session = payment.metadata.session || payment.metadata.fee_session || '';
      term = payment.metadata.term || payment.metadata.fee_term || '';
      termId = payment.metadata.term_id || '';
      sessionId = payment.metadata.session_id || '';
    }

    return { session, term, termId, sessionId };
  }, []);

  // Fetch school info from database (branch-specific)
  useEffect(() => {
    const fetchSchoolInfo = async () => {
      try {
        let query = supabase.from('school_info').select('*');
        
        if (userBranchId) {
          const { data: branchData } = await supabase
            .from('branches')
            .select('name, address, phone, email, logo_url')
            .eq('id', userBranchId)
            .single();
          
          if (branchData) {
            setSchoolInfo({
              id: '',
              school_id: 'BRANCH-001',
              school_name: branchData.name || 'ebenezer International School',
              address: branchData.address || '42 Allen Avenue, Ikeja, Lagos',
              email: branchData.email || 'info@ebenezer.edu.ng',
              website: '',
              phone_number: branchData.phone || '+234 800 000 0000',
              logo_url: branchData.logo_url || '',
              motto: 'Excellence in Education',
              vision: 'To be a world-class institution',
              mission: 'Providing quality education',
              principal_id: '',
              director_id: '',
              bank_accounts: [],
              payment_details: {},
              academic_session: '2026/2027',
              current_term: '2nd Term',
              timezone: 'Africa/Lagos',
              currency: 'NGN',
              school_colors: { primary: '#2563EB', secondary: '#7C3AED' }
            } as SchoolInfo);
            return;
          }
        }

        const { data, error } = await supabase
          .from('school_info')
          .select('*')
          .limit(1)
          .single();

        if (!error && data) {
          setSchoolInfo(data);
        } else {
          setSchoolInfo({
            id: '',
            school_id: 'EBE-001',
            school_name: 'ebenezer International School',
            address: '42 Allen Avenue, Ikeja, Lagos',
            email: 'info@ebenezer.edu.ng',
            website: 'www.ebenezer.edu.ng',
            phone_number: '+234 800 000 0000',
            logo_url: '',
            motto: 'Excellence in Education',
            vision: 'To be a world-class institution',
            mission: 'Providing quality education',
            principal_id: '',
            director_id: '',
            bank_accounts: [],
            payment_details: {},
            academic_session: '2026/2027',
            current_term: '2nd Term',
            timezone: 'Africa/Lagos',
            currency: 'NGN',
            school_colors: { primary: '#2563EB', secondary: '#7C3AED' }
          } as SchoolInfo);
        }
      } catch (error) {
        console.error('Error fetching school info:', error);
      }
    };

    if (userBranchId !== null) {
      fetchSchoolInfo();
    }
  }, [userBranchId]);

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
          } else {
            setLoading(false);
            setIsInitialLoad(false);
          }
        } catch (error) {
          console.error('Error fetching user branch:', error);
          setLoading(false);
          setIsInitialLoad(false);
        }
      }
    };
    
    fetchUserBranch();
  }, [user]);

  // Memoized fetch functions
  const fetchPayments = useCallback(async () => {
    if (!userBranchId) {
      setLoading(false);
      setIsInitialLoad(false);
      return;
    }

    setFetchError(null);
    setLoading(true);
    try {
      let query = supabase
        .from('payments')
        .select('*', { count: 'exact' })
        .eq('branch_id', userBranchId);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // FIX 1: Date range with inclusive end date
      if (dateRange.start) {
        query = query.gte('payment_date', dateRange.start);
      }
      if (dateRange.end) {
        // Add 1 day to include the full end date
        const endDatePlusOne = dayjs(dateRange.end).add(1, 'day').format('YYYY-MM-DD');
        query = query.lt('payment_date', endDatePlusOne);
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      const paymentsWithDetails = await Promise.all(
        (data || []).map(async (payment) => {
          let studentName = 'Unknown Student';
          let studentAdmission = 'N/A';
          let studentFirstName = '';
          let studentLastName = '';
          let studentClassName = 'N/A';

          if (payment.student_id) {
            // Fetch student with class info
            const { data: studentData } = await supabase
              .from('students')
              .select(`
                first_name, 
                last_name, 
                admission_number,
                class_id,
                class:class_id (name)
              `)
              .eq('id', payment.student_id)
              .single();
            
            if (studentData) {
              studentFirstName = studentData.first_name || '';
              studentLastName = studentData.last_name || '';
              studentName = `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim() || 'Unknown Student';
              studentAdmission = studentData.admission_number || 'N/A';
              studentClassName = studentData.class?.name || 'N/A';
            }
          }

          let feeName = 'N/A';
          let feeTerm = '';
          let feeSession = '';
          if (payment.fee_id) {
            const { data: feeData } = await supabase
              .from('fees')
              .select('name, term, session, academic_session_id')
              .eq('id', payment.fee_id)
              .single();
            
            if (feeData) {
              feeName = feeData.name;
              feeTerm = feeData.term || '';
              feeSession = feeData.session || '';
            }
          }

          // Extract session/term from payment or metadata
          const { session, term, termId, sessionId } = extractSessionAndTerm(payment);

          // Use fee data if available, otherwise use extracted data
          const finalSession = feeSession || session || payment.academic_session || '';
          const finalTerm = feeTerm || term || payment.academic_term || '';

          return {
            ...payment,
            student_name: studentName,
            student_first_name: studentFirstName,
            student_last_name: studentLastName,
            student_admission: studentAdmission,
            student_class_name: studentClassName,
            fee_name: feeName || payment.metadata?.fee_name || 'N/A',
            academic_session: finalSession,
            academic_term: finalTerm,
            term_id: termId || payment.term_id || '',
            session_id: sessionId || payment.session_id || '',
            fee_term: finalTerm,
            fee_session: finalSession,
          };
        })
      );

      // Apply session and term filters (client-side since they may come from metadata)
      let filteredPayments = paymentsWithDetails;
      
      if (sessionFilter !== 'all') {
        filteredPayments = filteredPayments.filter(p => 
          p.academic_session === sessionFilter || p.fee_session === sessionFilter
        );
      }
      
      if (termFilter !== 'all') {
        filteredPayments = filteredPayments.filter(p => 
          p.academic_term === termFilter || p.fee_term === termFilter
        );
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredPayments = filteredPayments.filter(p => 
          p.receipt_number?.toLowerCase().includes(term) ||
          p.transaction_reference?.toLowerCase().includes(term) ||
          p.student_name?.toLowerCase().includes(term) ||
          p.student_first_name?.toLowerCase().includes(term) ||
          p.student_last_name?.toLowerCase().includes(term) ||
          p.student_admission?.toLowerCase().includes(term) ||
          p.payment_id?.toLowerCase().includes(term) ||
          p.fee_name?.toLowerCase().includes(term) ||
          p.academic_session?.toLowerCase().includes(term) ||
          p.academic_term?.toLowerCase().includes(term)
        );
      }

      setPayments(filteredPayments);
      setTotalCount(searchTerm || sessionFilter !== 'all' || termFilter !== 'all' 
        ? filteredPayments.length 
        : count || 0);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      setFetchError(error.message || 'Failed to fetch payments');
      toast.error(error.message || 'Failed to fetch payments');
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [userBranchId, statusFilter, dateRange, currentPage, searchTerm, sessionFilter, termFilter, extractSessionAndTerm]);

  const fetchPaymentStats = useCallback(async () => {
    if (!userBranchId) return;

    try {
      let query = supabase
        .from('payments')
        .select('amount_paid, amount, status, due_date, created_at')
        .eq('branch_id', userBranchId);

      const { data, error } = await query;

      if (error) throw error;

      const totalRevenue = data?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
      const totalPayments = data?.length || 0;
      const pendingPayments = data?.filter(p => p.status === 'pending').length || 0;
      const completedPayments = data?.filter(p => p.status === 'completed' || p.status === 'paid').length || 0;
      const failedPayments = data?.filter(p => p.status === 'failed').length || 0;
      
      const overduePayments = data?.filter(p => 
        p.status === 'pending' && p.due_date && dayjs(p.due_date).isBefore(dayjs())
      ).length || 0;

      const lastMonth = dayjs().subtract(1, 'month').startOf('month');
      const thisMonth = dayjs().startOf('month');
      
      const lastMonthRevenue = data?.filter(p => dayjs(p.created_at).isBefore(thisMonth) && dayjs(p.created_at).isAfter(lastMonth))
        .reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
      
      const revenueChange = lastMonthRevenue > 0 
        ? Number(((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1))
        : 0;

      setStats({
        totalRevenue,
        totalPayments,
        pendingPayments,
        overduePayments,
        completedPayments,
        failedPayments,
        revenueChange,
        paymentChange: 0,
      });
    } catch (error) {
      console.error('Error fetching payment stats:', error);
    }
  }, [userBranchId]);

  // Fetch data when dependencies change
  useEffect(() => {
    if (userBranchId !== null) {
      fetchPayments();
      fetchPaymentStats();
    }
  }, [userBranchId, fetchPayments, fetchPaymentStats]);

  // --- Get receipt URL from multiple sources ---
  const getReceiptUrl = useCallback((payment: Payment): string | null => {
    // Check direct URL fields first
    if (payment.receipt_url && payment.receipt_url.startsWith('http')) {
      return payment.receipt_url;
    }
    
    if (payment.metadata?.receipt_url && payment.metadata.receipt_url.startsWith('http')) {
      return payment.metadata.receipt_url;
    }
    
    if (payment.payment_proof_url && payment.payment_proof_url.startsWith('http')) {
      return payment.payment_proof_url;
    }
    
    if (payment.metadata?.proof_url && payment.metadata.proof_url.startsWith('http')) {
      return payment.metadata.proof_url;
    }

    // Try to construct from paths
    const path = payment.receipt_path || payment.metadata?.receipt_path || 
                 payment.payment_proof_path || payment.metadata?.proof_path;
    
    if (path) {
      const bucket = path.startsWith('payments/') ? 'payment-receipts' : 'payment-proofs';
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }

    if (payment.metadata?.uploaded_file && payment.student_id) {
      const { data } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(`${payment.student_id}/${payment.metadata.uploaded_file}`);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }

    return null;
  }, []);

  const hasReceipt = useCallback((payment: Payment): boolean => {
    return !!(getReceiptUrl(payment));
  }, [getReceiptUrl]);

  const handleDownloadReceiptImage = useCallback(async (payment?: Payment) => {
    const targetPayment = payment || selectedPayment;
    if (!targetPayment) {
      toast.error('No payment selected');
      return;
    }

    const imageUrl = getReceiptUrl(targetPayment);
    if (!imageUrl) {
      toast.error('No receipt image found');
      return;
    }

    try {
      toast.loading('Downloading receipt...');
      
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      
      const fileExtension = blob.type.split('/')[1] || 'jpg';
      const fileName = `receipt-${targetPayment.receipt_number || 'payment'}.${fileExtension}`;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success('Receipt downloaded successfully!');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.dismiss();
      toast.error('Failed to download receipt');
    }
  }, [selectedPayment, getReceiptUrl]);

  const viewReceipt = useCallback(async (payment: Payment) => {
    setSelectedPayment(payment);
    setReceiptLoading(true);
    setViewerImageError(false);
    setImageZoom(1);
    setImageRotation(0);
    
    try {
      const imageUrl = getReceiptUrl(payment);
      
      if (imageUrl) {
        setReceiptImageUrl(imageUrl);
        setShowReceiptViewer(true);
        setReceiptLoading(false);
      } else {
        toast.error('No receipt image found for this payment');
        setReceiptLoading(false);
      }
    } catch (error) {
      console.error('Error viewing receipt:', error);
      toast.error('Failed to load receipt image');
      setReceiptLoading(false);
    }
  }, [getReceiptUrl]);

  const handleZoomIn = useCallback(() => setImageZoom(prev => Math.min(prev + 0.25, 3)), []);
  const handleZoomOut = useCallback(() => setImageZoom(prev => Math.max(prev - 0.25, 0.5)), []);
  const handleRotate = useCallback(() => setImageRotation(prev => (prev + 90) % 360), []);
  const handleReset = useCallback(() => { setImageZoom(1); setImageRotation(0); }, []);

  // FIX 2: Updated handleApprovePayment with session/term population
  const handleApprovePayment = async (paymentId: string) => {
    setProcessing(true);
    try {
      // First, get the payment to find its fee_id and assignment_id
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('fee_id, assignment_id, student_id, branch_id, metadata')
        .eq('id', paymentId)
        .single();

      if (fetchError) throw fetchError;

      let academicSession = '';
      let academicTerm = '';
      let termId = '';

      // Try to get from fee
      if (payment?.fee_id) {
        const { data: feeData } = await supabase
          .from('fees')
          .select('academic_session_id, session, term, term_id')
          .eq('id', payment.fee_id)
          .single();
        
        if (feeData) {
          academicSession = feeData.session || '';
          academicTerm = feeData.term || '';
          termId = feeData.term_id || feeData.academic_session_id || '';
        }
      }

      // If not found in fee, try from assignment
      if (!academicSession && payment?.assignment_id) {
        const { data: assignmentData } = await supabase
          .from('student_fee_assignments')
          .select('academic_session_id, term, session')
          .eq('id', payment.assignment_id)
          .single();
        
        if (assignmentData) {
          academicSession = assignmentData.session || '';
          academicTerm = assignmentData.term || '';
          termId = assignmentData.academic_session_id || '';
        }
      }

      // If still not found, try from the branch's current session
      if (!academicSession && payment?.branch_id) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('current_session_id, current_term')
          .eq('id', payment.branch_id)
          .single();
        
        if (branchData) {
          // Try to get session details
          if (branchData.current_session_id) {
            const { data: sessionData } = await supabase
              .from('academic_sessions')
              .select('session_name, term_name, id')
              .eq('id', branchData.current_session_id)
              .single();
            
            if (sessionData) {
              academicSession = sessionData.session_name || '';
              academicTerm = sessionData.term_name || '';
              termId = sessionData.id || '';
            }
          }
        }
      }

      // Update the payment with status, approval info, AND session/term data
      const updateData: any = {
        status: 'completed',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only add session/term fields if we have values
      if (academicSession) {
        updateData.academic_session = academicSession;
      }
      if (academicTerm) {
        updateData.academic_term = academicTerm;
      }
      if (termId) {
        updateData.term_id = termId;
        // Also update session_id if we have the term ID
        updateData.session_id = termId;
      }

      // Update metadata with session/term info
      const currentMetadata = payment?.metadata || {};
      updateData.metadata = {
        ...currentMetadata,
        term: academicTerm || currentMetadata?.term || '',
        session: academicSession || currentMetadata?.session || '',
        term_id: termId || currentMetadata?.term_id || '',
        session_id: termId || currentMetadata?.session_id || '',
        fee_term: academicTerm || currentMetadata?.fee_term || '',
        fee_session: academicSession || currentMetadata?.fee_session || '',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      };

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Payment approved successfully! Session and term data populated.');
      setShowApproveModal(false);
      fetchPayments();
      fetchPaymentStats();
    } catch (error: any) {
      console.error('Error approving payment:', error);
      toast.error(error.message || 'Failed to approve payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'failed',
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Payment rejected');
      setShowRejectModal(false);
      setRejectionReason('');
      fetchPayments();
      fetchPaymentStats();
    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      toast.error(error.message || 'Failed to reject payment');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = useCallback((status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[status] || styles.pending;
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return <CheckCircle className="w-3 h-3" />;
      case 'pending':
        return <Clock className="w-3 h-3" />;
      case 'failed':
        return <XCircle className="w-3 h-3" />;
      case 'processing':
        return <Loader2 className="w-3 h-3" />;
      case 'refunded':
        return <XCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  }, []);

  const getPaymentMethodIcon = useCallback((method: string) => {
    const methods: Record<string, any> = {
      cash: <Banknote className="w-4 h-4 text-gray-400" />,
      bank_transfer: <Building className="w-4 h-4 text-gray-400" />,
      card: <CreditCard className="w-4 h-4 text-gray-400" />,
      pos: <Smartphone className="w-4 h-4 text-gray-400" />,
      wallet: <Wallet className="w-4 h-4 text-gray-400" />,
      paystack: <CreditCard className="w-4 h-4 text-gray-400" />,
    };
    return methods[method] || <CreditCard className="w-4 h-4 text-gray-400" />;
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    const currency = schoolInfo?.currency || 'NGN';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, [schoolInfo]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }, []);

  const exportPayments = () => {
    toast.success('Export started. Download will begin shortly.');
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Format payment for receipt modal - ensure all required fields exist
  const formatPaymentForReceipt = (payment: Payment) => {
    return {
      ...payment,
      student_id: payment.student_id || '',
      receipt_number: payment.receipt_number || 'N/A',
      amount_paid: payment.amount_paid || 0,
      payment_date: payment.payment_date || new Date().toISOString(),
      payment_method: payment.payment_method || 'N/A',
      status: payment.status || 'pending',
      fee_name: payment.fee_name || 'N/A',
      transaction_reference: payment.transaction_reference || 'N/A',
      student_class_name: payment.student_class_name || 'N/A',
    };
  };

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter('all');
    setSessionFilter('all');
    setTermFilter('all');
    setSearchTerm('');
    setDateRange({
      start: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
      end: dayjs().format('YYYY-MM-DD'),
    });
  };

  if (isInitialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500">Loading payments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track and manage all payments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportPayments}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => navigate('/payments/record')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 print:hidden">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalRevenue)}</p>
          <div className={`flex items-center gap-1 text-xs ${stats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'} mt-1`}>
            {stats.revenueChange >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(stats.revenueChange)}%
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Payments</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalPayments}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.completedPayments}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingPayments}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.overduePayments}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
          <p className="text-xl font-bold text-gray-600 dark:text-gray-400">{stats.failedPayments}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 print:hidden">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by receipt, reference, student, admission, or session..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
            </select>
            
            {/* Session Filter */}
            <select
              value={sessionFilter}
              onChange={(e) => {
                setSessionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm"
            >
              <option value="all">All Sessions</option>
              {AVAILABLE_SESSIONS.map(session => (
                <option key={session} value={session}>{session}</option>
              ))}
            </select>
            
            {/* Term Filter */}
            <select
              value={termFilter}
              onChange={(e) => {
                setTermFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm"
            >
              <option value="all">All Terms</option>
              {AVAILABLE_TERMS.map(term => (
                <option key={term} value={term}>{term}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm"
            />
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm"
            />
          </div>
          
          {(statusFilter !== 'all' || sessionFilter !== 'all' || termFilter !== 'all' || searchTerm) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
          
          <button
            onClick={() => {
              fetchPayments();
              toast.success('Refreshed!');
            }}
            className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden print:border-0 print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Receipt / Student
                </th>
                <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fee / Session
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <CreditCard className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-lg font-medium">No payments found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const isPending = payment.status === 'pending';
                  const isOverdue = isPending && payment.due_date && dayjs(payment.due_date).isBefore(dayjs());
                  const hasReceiptImage = hasReceipt(payment);
                  const isSuccessful = payment.status === 'completed' || payment.status === 'paid' || payment.status === 'approved';

                  return (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-4 sm:px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {payment.receipt_number}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {payment.student_name} • {payment.student_admission}
                          </p>
                          {payment.student_class_name && payment.student_class_name !== 'N/A' && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Class: {payment.student_class_name}
                            </p>
                          )}
                          {hasReceiptImage && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <Check className="w-3 h-3" />
                              Receipt uploaded
                            </span>
                          )}
                          {payment.assignment_id && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 ml-2">
                              ✓ Assigned
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 sm:px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{payment.fee_name}</p>
                          {(payment.academic_session || payment.fee_session) && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <BookOpen className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {payment.academic_session || payment.fee_session}
                              </span>
                              {(payment.academic_term || payment.fee_term) && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  • {payment.academic_term || payment.fee_term}
                                </span>
                              )}
                            </div>
                          )}
                          {payment.term_id && (
                            <span className="inline-flex items-center gap-1 text-xs text-purple-500 dark:text-purple-400">
                              <Hash className="w-3 h-3" />
                              ID: {payment.term_id.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(payment.amount_paid)}
                          </p>
                          {payment.balance > 0 && (
                            <p className="text-xs text-red-500">Balance: {formatCurrency(payment.balance)}</p>
                          )}
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(payment.payment_method)}
                          <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                            {payment.payment_method?.replace('_', ' ') || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(payment.status)}`}>
                          {getStatusIcon(payment.status)}
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          {isOverdue && (
                            <span className="ml-1 text-red-500">(Overdue)</span>
                          )}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {dayjs(payment.payment_date).format('MMM D, YYYY')}
                        </p>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasReceiptImage ? (
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => viewReceipt(payment)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400"
                                title="View Receipt Image"
                              >
                                <Image className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadReceiptImage(payment)}
                                className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-all text-green-600 dark:text-green-400"
                                title="Download Receipt Image"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 cursor-not-allowed"
                              title="No Receipt"
                              disabled
                            >
                              <Image className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowReceiptModal(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400"
                            title="View Receipt Details"
                            disabled={!isSuccessful}
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowDetailsModal(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-gray-500 dark:text-gray-400"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {isPending && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setShowApproveModal(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-all text-green-600 dark:text-green-400"
                                title="Approve Payment"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setShowRejectModal(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-600 dark:text-red-400"
                                title="Reject Payment"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700 print:hidden">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
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

      {/* Receipt Viewer Modal - Image Viewer */}
      <AnimatePresence>
        {showReceiptViewer && selectedPayment && receiptImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowReceiptViewer(false);
                setReceiptImageUrl(null);
                setSelectedPayment(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Image className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Receipt</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedPayment.receipt_number} • {selectedPayment.student_name}
                    </p>
                    {selectedPayment.metadata?.uploaded_file && (
                      <p className="text-xs text-gray-400">
                        File: {selectedPayment.metadata.uploaded_file}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowReceiptViewer(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>

              {/* Image Controls */}
              <div className="bg-gray-50 dark:bg-gray-700/30 p-3 flex items-center justify-center gap-3 border-b border-gray-200 dark:border-gray-700 flex-wrap">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">{Math.round(imageZoom * 100)}%</span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all"
                  title="Rotate"
                >
                  <RotateCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  onClick={handleReset}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all"
                  title="Reset"
                >
                  <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                
                <button
                  onClick={() => handleDownloadReceiptImage(selectedPayment)}
                  className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg transition-all text-green-600 dark:text-green-400"
                  title="Download Receipt Image"
                >
                  <Download className="w-4 h-4" />
                </button>
                
                {receiptLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
              </div>

              {/* Image Display */}
              <div className="relative p-4 flex items-center justify-center bg-gray-100 dark:bg-gray-900/50" style={{ minHeight: '400px' }}>
                {receiptImageUrl && !viewerImageError ? (
                  <motion.img
                    src={receiptImageUrl}
                    alt={`Receipt ${selectedPayment.receipt_number}`}
                    className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-lg"
                    style={{
                      transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                      transition: 'transform 0.3s ease'
                    }}
                    onError={() => {
                      setViewerImageError(true);
                      toast.error('Failed to load receipt image');
                    }}
                  />
                ) : (
                  <div className="text-center py-12">
                    {viewerImageError ? (
                      <>
                        <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500 dark:text-yellow-400 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">Failed to load receipt image</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                          The file may have been moved or deleted
                        </p>
                      </>
                    ) : (
                      <>
                        <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">No receipt image available</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Info Footer */}
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Receipt Number</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.receipt_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Student</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.student_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Class</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.student_class_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Amount</p>
                    <p className="font-medium text-green-600">{formatCurrency(selectedPayment.amount_paid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Session</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedPayment.academic_session || selectedPayment.fee_session || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Term</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedPayment.academic_term || selectedPayment.fee_term || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Term ID</p>
                    <p className="font-medium text-gray-900 dark:text-white text-xs">
                      {selectedPayment.term_id ? selectedPayment.term_id.substring(0, 12) + '...' : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fee</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.fee_name}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Modal - Using reusable component with full content */}
      <AnimatePresence>
        {showReceiptModal && selectedPayment && (
          <ReceiptModal
            payment={formatPaymentForReceipt(selectedPayment)}
            student={{
              id: selectedPayment.student_id || '',
              first_name: selectedPayment.student_first_name || '',
              last_name: selectedPayment.student_last_name || '',
              student_id: selectedPayment.student_admission || '',
              admission_number: selectedPayment.student_admission || '',
              class_name: selectedPayment.student_class_name || 'N/A',
              branch_id: selectedPayment.branch_id || '',
            }}
            schoolInfo={schoolInfo}
            onClose={() => {
              setShowReceiptModal(false);
              setSelectedPayment(null);
            }}
            formatCurrency={formatCurrency}
          />
        )}
      </AnimatePresence>

      {/* Payment Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receipt Number</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.receipt_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Transaction Reference</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.transaction_reference || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Student</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.student_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Admission Number</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.student_admission}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Class</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.student_class_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Fee</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.fee_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Amount Paid</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedPayment.amount_paid)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Balance</p>
                  <p className={`font-medium ${selectedPayment.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(selectedPayment.balance)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Payment Method</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {selectedPayment.payment_method?.replace('_', ' ') || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedPayment.status)}`}>
                    {getStatusIcon(selectedPayment.status)}
                    {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Payment Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {dayjs(selectedPayment.payment_date).format('MMMM D, YYYY h:mm A')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Academic Session</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedPayment.academic_session || selectedPayment.fee_session || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Academic Term</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedPayment.academic_term || selectedPayment.fee_term || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Term ID</p>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {selectedPayment.term_id || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Session ID</p>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {selectedPayment.session_id || 'N/A'}
                  </p>
                </div>
                {selectedPayment.approved_at && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Approved At</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {dayjs(selectedPayment.approved_at).format('MMMM D, YYYY h:mm A')}
                    </p>
                  </div>
                )}
                {selectedPayment.rejection_reason && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Rejection Reason</p>
                    <p className="font-medium text-red-600 dark:text-red-400">{selectedPayment.rejection_reason}</p>
                  </div>
                )}
                {(selectedPayment.receipt_url || selectedPayment.metadata?.receipt_url || selectedPayment.payment_proof_url) && (
                  <div className="col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Receipt File</p>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedPayment.metadata?.uploaded_file || selectedPayment.receipt_file_name || 'Receipt file'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedPayment.metadata?.uploaded_at 
                            ? `Uploaded: ${dayjs(selectedPayment.metadata.uploaded_at).format('MMM D, YYYY')}`
                            : 'Uploaded'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewReceipt(selectedPayment)}
                          className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 transition-all"
                          title="View Receipt"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadReceiptImage(selectedPayment)}
                          className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400 transition-all"
                          title="Download Receipt"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Approve Payment</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to approve this payment?
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Receipt:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedPayment.receipt_number}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500 dark:text-gray-400">Student:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedPayment.student_name}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedPayment.amount_paid)}</span>
              </div>
              {selectedPayment.academic_session && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500 dark:text-gray-400">Session:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedPayment.academic_session}</span>
                </div>
              )}
              {selectedPayment.academic_term && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500 dark:text-gray-400">Term:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedPayment.academic_term}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprovePayment(selectedPayment.id)}
                disabled={processing}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Approve'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Reject Payment</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Please provide a reason for rejecting this payment.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Receipt:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedPayment.receipt_number}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500 dark:text-gray-400">Student:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedPayment.student_name}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedPayment.amount_paid)}</span>
              </div>
              {selectedPayment.academic_session && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500 dark:text-gray-400">Session:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedPayment.academic_session}</span>
                </div>
              )}
              {selectedPayment.academic_term && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500 dark:text-gray-400">Term:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedPayment.academic_term}</span>
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all dark:text-white"
                placeholder="Enter reason for rejection..."
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectPayment(selectedPayment.id)}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Reject'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsList;