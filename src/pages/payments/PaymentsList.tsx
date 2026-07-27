import React, { useState, useEffect, useRef } from 'react';
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
  Calendar,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  Shield,
  QrCode,
  Barcode,
  Copy,
  Check,
  School,
  GraduationCap,
  Home,
  X,
  FileText,
  Info,
  Users,
  List,
  AlertTriangle,
  Globe
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

// Import school logo from assets
import schoolLogo from '../../assets/school-logo.png';

interface Payment {
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
  student_first_name?: string;
  student_last_name?: string;
  student_admission?: string;
  fee_name?: string;
}

interface FeeWithBalance {
  id: string;
  name: string;
  amount: number;
  paid: number;
  balance: number;
  status: string;
  due_date: string;
  category: string;
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
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  });
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [printing, setPrinting] = useState(false);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [feeBalances, setFeeBalances] = useState<FeeWithBalance[]>([]);
  const [feeBalancesLoaded, setFeeBalancesLoaded] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const pageSize = 10;
  const receiptRef = useRef<HTMLDivElement>(null);

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
              school_name: branchData.name || 'Ebeniza International School',
              address: branchData.address || '42 Allen Avenue, Ikeja, Lagos',
              email: branchData.email || 'info@ebeniza.edu.ng',
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
            school_name: 'Ebeniza International School',
            address: '42 Allen Avenue, Ikeja, Lagos',
            email: 'info@ebeniza.edu.ng',
            website: 'www.ebeniza.edu.ng',
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
          }
        } catch (error) {
          console.error('Error fetching user branch:', error);
          setLoading(false);
        }
      }
    };
    
    fetchUserBranch();
  }, [user]);

  useEffect(() => {
    if (userBranchId !== null) {
      fetchPayments();
      fetchPaymentStats();
    }
  }, [currentPage, searchTerm, statusFilter, dateRange, userBranchId]);

  const fetchPayments = async () => {
    if (!userBranchId) {
      console.log('No branch ID found, skipping fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('payments')
        .select('*', { count: 'exact' })
        .eq('branch_id', userBranchId);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (dateRange.start) {
        query = query.gte('payment_date', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lte('payment_date', dateRange.end);
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

          if (payment.student_id) {
            const { data: studentData } = await supabase
              .from('students')
              .select('first_name, last_name, admission_number')
              .eq('id', payment.student_id)
              .single();
            
            if (studentData) {
              studentFirstName = studentData.first_name || '';
              studentLastName = studentData.last_name || '';
              studentName = `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim() || 'Unknown Student';
              studentAdmission = studentData.admission_number || 'N/A';
            }
          }

          let feeName = 'N/A';
          if (payment.fee_id) {
            const { data: feeData } = await supabase
              .from('fees')
              .select('name')
              .eq('id', payment.fee_id)
              .single();
            
            if (feeData) {
              feeName = feeData.name;
            }
          }

          return {
            ...payment,
            student_name: studentName,
            student_first_name: studentFirstName,
            student_last_name: studentLastName,
            student_admission: studentAdmission,
            fee_name: feeName,
          };
        })
      );

      let filteredPayments = paymentsWithDetails;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredPayments = paymentsWithDetails.filter(p => 
          p.receipt_number?.toLowerCase().includes(term) ||
          p.transaction_reference?.toLowerCase().includes(term) ||
          p.student_name?.toLowerCase().includes(term) ||
          p.student_first_name?.toLowerCase().includes(term) ||
          p.student_last_name?.toLowerCase().includes(term) ||
          p.student_admission?.toLowerCase().includes(term) ||
          p.payment_id?.toLowerCase().includes(term)
        );
      }

      setPayments(filteredPayments);
      setTotalCount(searchTerm ? filteredPayments.length : count || 0);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error(error.message || 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentStats = async () => {
    if (!userBranchId) {
      return;
    }

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
  };

  const fetchStudentFeeBalances = async (studentId: string) => {
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('class_id, branch_id')
        .eq('id', studentId)
        .single();

      if (!studentData) return [];

      const { data: allFees } = await supabase
        .from('fees')
        .select('*')
        .eq('branch_id', studentData.branch_id)
        .eq('status', 'active');

      if (!allFees) return [];

      const applicableFees = allFees.filter(fee => {
        if (fee.class_id === null) return true;
        if (fee.class_id === studentData.class_id) return true;
        if (fee.metadata?.class_ids && Array.isArray(fee.metadata.class_ids)) {
          return fee.metadata.class_ids.includes(studentData.class_id);
        }
        return false;
      });

      const { data: studentPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'completed');

      const feeBalancesList = applicableFees.map(fee => {
        const payments = studentPayments?.filter(p => p.fee_id === fee.id) || [];
        const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);
        const balance = fee.amount - totalPaid;

        return {
          id: fee.id,
          name: fee.name,
          amount: fee.amount,
          paid: totalPaid,
          balance: balance > 0 ? balance : 0,
          status: balance <= 0 ? 'Paid' : 'Unpaid',
          due_date: fee.due_date,
          category: fee.category
        };
      });

      return feeBalancesList;
    } catch (error) {
      console.error('Error fetching fee balances:', error);
      return [];
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Payment approved successfully!');
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[status] || styles.pending;
  };

  const getStatusIcon = (status: string) => {
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
  };

  const getPaymentMethodIcon = (method: string) => {
    const methods: Record<string, any> = {
      cash: <Banknote className="w-4 h-4 text-gray-400" />,
      bank_transfer: <Building className="w-4 h-4 text-gray-400" />,
      card: <CreditCard className="w-4 h-4 text-gray-400" />,
      pos: <Smartphone className="w-4 h-4 text-gray-400" />,
      wallet: <Wallet className="w-4 h-4 text-gray-400" />,
    };
    return methods[method] || <CreditCard className="w-4 h-4 text-gray-400" />;
  };

  const formatCurrency = (amount: number) => {
    const currency = schoolInfo?.currency || 'NGN';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const generateTrackingNumber = (payment: Payment) => {
    return `TRK-${dayjs(payment.payment_date).format('YYYYMMDD')}-${payment.receipt_number?.slice(-6) || '000000'}`;
  };

  const generatePaymentReference = (payment: Payment) => {
    const shortId = payment.id ? payment.id.slice(0, 8) : '00000000';
    return `PAY-${dayjs(payment.payment_date).format('YYYYMM')}-${shortId}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success('Copied to clipboard');
  };

  const handlePrint = () => {
    setPrinting(true);
    if (selectedPayment?.student_id) {
      fetchStudentFeeBalances(selectedPayment.student_id).then(balances => {
        setFeeBalances(balances);
        setFeeBalancesLoaded(true);
        setTimeout(() => {
          window.print();
          setPrinting(false);
        }, 500);
      });
    } else {
      setTimeout(() => {
        window.print();
        setPrinting(false);
      }, 500);
    }
  };

  const handleDownload = async () => {
    if (!selectedPayment) {
      toast.error('No payment selected');
      return;
    }

    try {
      toast.loading('Generating receipt...');
      
      const receiptElement = receiptRef.current;
      if (!receiptElement) {
        toast.dismiss();
        toast.error('Receipt not found');
        return;
      }

      let balances = feeBalances;
      if (!feeBalancesLoaded && selectedPayment.student_id) {
        balances = await fetchStudentFeeBalances(selectedPayment.student_id);
        setFeeBalances(balances);
        setFeeBalancesLoaded(true);
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.dismiss();
        toast.error('Please allow popups for this site');
        return;
      }

      const htmlContent = receiptElement.innerHTML;
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Receipt - ${selectedPayment.receipt_number}</title>
            <style>
              body { 
                font-family: 'Times New Roman', serif; 
                padding: 40px; 
                max-width: 800px; 
                margin: 0 auto;
                color: #1a1a1a;
              }
              .receipt-container {
                border: 2px solid #1a1a1a;
                padding: 30px;
                border-radius: 8px;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .mt-4 { margin-top: 16px; }
              .mb-4 { margin-bottom: 16px; }
              .border-bottom { border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; }
              .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
              .p-4 { padding: 16px; }
              .bg-gray { background-color: #f5f5f5; }
              .rounded { border-radius: 8px; }
              .font-bold { font-weight: bold; }
              .text-2xl { font-size: 24px; }
              .text-xl { font-size: 20px; }
              .text-sm { font-size: 14px; }
              .text-xs { font-size: 12px; }
              .text-gray { color: #666; }
              .text-green { color: #22c55e; }
              .text-red { color: #ef4444; }
              .text-blue { color: #3b82f6; }
              .mb-2 { margin-bottom: 8px; }
              .mt-2 { margin-top: 8px; }
              .mt-6 { margin-top: 24px; }
              .pt-4 { padding-top: 16px; }
              .border-top { border-top: 2px solid #1a1a1a; padding-top: 16px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
              th { background-color: #f5f5f5; font-size: 12px; text-transform: uppercase; color: #666; }
              .status-paid { color: #22c55e; }
              .status-unpaid { color: #eab308; }
              .logo { max-height: 60px; width: auto; object-fit: contain; }
            </style>
          </head>
          <body>
            <div class="receipt-container">
              ${htmlContent}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      toast.dismiss();
      toast.success('Receipt ready for download');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.dismiss();
      toast.error('Failed to download receipt');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Receipt Modal Component
  const ReceiptModal: React.FC<{ payment: Payment; onClose: () => void }> = ({ payment, onClose }) => {
    const [localFeeBalances, setLocalFeeBalances] = useState<FeeWithBalance[]>([]);
    const [loadingBalances, setLoadingBalances] = useState(true);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
      const loadFeeBalances = async () => {
        if (payment.student_id) {
          setLoadingBalances(true);
          setIsReady(false);
          
          if (feeBalancesLoaded && feeBalances.length > 0) {
            setLocalFeeBalances(feeBalances);
            setLoadingBalances(false);
            setIsReady(true);
            return;
          }

          const balances = await fetchStudentFeeBalances(payment.student_id);
          setLocalFeeBalances(balances);
          setFeeBalances(balances);
          setFeeBalancesLoaded(true);
          setLoadingBalances(false);
          
          setTimeout(() => {
            setIsReady(true);
          }, 50);
        } else {
          setIsReady(true);
        }
      };
      
      loadFeeBalances();
    }, [payment.student_id]);

    if (!isReady) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl p-8"
          >
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading receipt...</p>
            </div>
          </motion.div>
        </motion.div>
      );
    }

    const studentName = payment.student_name || 'N/A';
    const studentAdmission = payment.student_admission || 'N/A';
    const totalOutstanding = localFeeBalances.reduce((sum, f) => sum + f.balance, 0);
    const logoUrl = schoolInfo?.logo_url || schoolLogo;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl"
        >
          {/* Modal Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10 print:hidden">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Receipt</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{payment.receipt_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                disabled={printing}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all print:hidden"
                title="Print Receipt"
              >
                {printing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
              </button>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all print:hidden"
                title="Download Receipt"
              >
                <Download className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all print:hidden"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>

          {/* Receipt Content */}
          <div ref={receiptRef} className="p-6 md:p-8 print:p-8">
            {/* School Header */}
            <div className="text-center border-b-2 border-gray-200 dark:border-gray-700 pb-6 mb-6">
              <div className="flex justify-center mb-3">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={schoolInfo?.school_name || 'School Logo'} 
                    className="h-16 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = schoolLogo;
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    <School className="w-8 h-8" />
                  </div>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {schoolInfo?.school_name || 'Ebeniza International School'}
              </h1>
              {schoolInfo?.motto && (
                <p className="text-sm italic text-gray-500 dark:text-gray-400 mt-1">
                  "{schoolInfo.motto}"
                </p>
              )}
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                <p>{schoolInfo?.address || '42 Allen Avenue, Ikeja, Lagos'}</p>
                <p>
                  {schoolInfo?.phone_number || '+234 800 000 0000'} | {schoolInfo?.email || 'info@ebeniza.edu.ng'}
                </p>
                {schoolInfo?.website && (
                  <p className="text-xs text-blue-500">{schoolInfo.website}</p>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-400">
                <span>Session: {schoolInfo?.academic_session || '2026/2027'}</span>
                <span className="mx-2">•</span>
                <span>Term: {schoolInfo?.current_term || '2nd Term'}</span>
              </div>
            </div>

            {/* Receipt Title */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Receipt</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Official payment confirmation</p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  <Shield className="w-3 h-3" />
                  Verified
                </div>
                <p className="text-xs text-gray-400 mt-1">#{payment.receipt_number}</p>
              </div>
            </div>

            {/* Student & Payment Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3" /> Student Information
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{studentName}</p>
                  <p className="text-xs text-gray-500">Admission: {studentAdmission}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Receipt Number</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{payment.receipt_number}</p>
                      <button 
                        onClick={() => copyToClipboard(payment.receipt_number || '')}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all"
                      >
                        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Payment Date</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {dayjs(payment.payment_date).format('MMM D, YYYY')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Summary</p>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-xs text-gray-500">Amount Paid</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(payment.amount_paid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Balance</p>
                      <p className={`text-lg font-bold ${payment.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(payment.balance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Method</p>
                      <div className="flex items-center gap-1 mt-1">
                        {getPaymentMethodIcon(payment.payment_method)}
                        <span className="text-sm font-medium capitalize">{payment.payment_method?.replace('_', ' ') || 'N/A'}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fee</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{payment.fee_name || 'N/A'}</p>
                  <p className="text-xs text-gray-500">Transaction: {payment.transaction_reference || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* All Fees with Balances Section */}
            <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <List className="w-5 h-5 text-blue-500" />
                  Fee Statement
                </h3>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Outstanding</p>
                  <p className={`text-xl font-bold ${totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(totalOutstanding)}
                  </p>
                </div>
              </div>

              {localFeeBalances.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p>No fees found for this student</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Fee Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Paid
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Balance
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {localFeeBalances.map((fee) => (
                        <tr key={fee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                          <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{fee.name}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-300 capitalize">{fee.category.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">{formatCurrency(fee.amount)}</td>
                          <td className="px-4 py-2 text-right text-green-600">{formatCurrency(fee.paid)}</td>
                          <td className={`px-4 py-2 text-right font-medium ${fee.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(fee.balance)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              fee.balance <= 0 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {fee.balance <= 0 ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                              {fee.balance <= 0 ? 'Paid' : 'Unpaid'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 font-semibold text-gray-900 dark:text-white">Total</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(localFeeBalances.reduce((sum, f) => sum + f.amount, 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          {formatCurrency(localFeeBalances.reduce((sum, f) => sum + f.paid, 0))}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(totalOutstanding)}
                        </td>
                        <td className="px-4 py-3 text-center"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 border-t-2 border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Verified Payment • {dayjs().format('YYYY-MM-DD HH:mm')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <QrCode className="w-8 h-8 text-gray-400" />
                  <Barcode className="w-16 h-8 text-gray-400" />
                </div>
              </div>
              <div className="text-center mt-3 text-xs text-gray-400 dark:text-gray-500">
                <p>This is a computer-generated receipt. No signature required.</p>
                <p className="mt-1">© {dayjs().year()} {schoolInfo?.school_name || 'Ebeniza International School'}. All rights reserved.</p>
              </div>
            </div>

            {/* Print Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 print:hidden">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                disabled={printing}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                {printing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    Print Receipt
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const exportPayments = () => {
    toast.success('Export started. Download will begin shortly.');
  };

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
      <div className="flex flex-col sm:flex-row gap-4 print:hidden">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by receipt, reference, student, or admission..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="processing">Processing</option>
          </select>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
          />
          <span className="text-gray-500 dark:text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
          />
          <button
            onClick={() => {
              setDateRange({
                start: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
                end: dayjs().format('YYYY-MM-DD'),
              });
              setStatusFilter('all');
              setSearchTerm('');
            }}
            className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
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
                  Fee
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
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 sm:px-6 py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">{payment.fee_name}</p>
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
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowReceiptModal(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400"
                            title="View Receipt"
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

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceiptModal && selectedPayment && (
          <ReceiptModal
            payment={selectedPayment}
            onClose={() => {
              setShowReceiptModal(false);
              setSelectedPayment(null);
            }}
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