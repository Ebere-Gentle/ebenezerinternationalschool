
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import {
  Receipt,
  Search,
  Loader2,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  FileText,
  Download,
  Eye,
  X,
  Printer,
  ChevronLeft,
  ChevronRight,
  XCircle as XCircleIcon,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Building2,
  Mail,
  Phone,
  MapPin,
  Award,
  QrCode,
  Barcode,
  Shield,
  Check,
  Copy,
  ExternalLink,
  Banknote,
  Wallet,
  TrendingUp,
  TrendingDown,
  School,
  User,
  GraduationCap,
  Home,
  AlertTriangle,
  Users,
  List,
  AlertCircle,
  Info,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';

// Import school logo from assets
import schoolLogo from '../../assets/school-logo.png';

interface Payment {
  id: string;
  payment_id: string;
  receipt_number: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  status: string;
  transaction_reference: string;
  balance: number;
  fee_id: string;
  fee_name?: string;
  amount?: number;
  due_date?: string;
}

interface UnpaidFee {
  id: string;
  name: string;
  amount: number;
  category: string;
  due_date: string;
  description: string;
  balance: number;
  is_overdue: boolean;
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

interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_id: string;
  branch_id: string;
  email: string;
  phone_number: string;
  student_id: string;
  passport_url: string;
  class?: { 
    id: string;
    name: string;
  };
  branch?: { 
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
  };
}

interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_url?: string;
  motto?: string;
  academic_session?: string;
  current_term?: string;
}

const StudentPayments: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unpaidFees, setUnpaidFees] = useState<UnpaidFee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('payment_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [feeNames, setFeeNames] = useState<Record<string, string>>({});
  const [feeBalances, setFeeBalances] = useState<FeeWithBalance[]>([]);
  const [feeBalancesLoaded, setFeeBalancesLoaded] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);

  const pageSize = 10;
  const receiptRef = useRef<HTMLDivElement>(null);

  // Fetch school info from database (branch-specific) - SAME AS ADMIN
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
              name: branchData.name || 'Ebenezer International School',
              address: branchData.address || '42 Allen Avenue, Ikeja, Lagos',
              phone: branchData.phone || '+234 800 000 0000',
              email: branchData.email || 'info@ebeniza.edu.ng',
              logo_url: branchData.logo_url || '',
              motto: 'Excellence in Education',
              academic_session: '2026/2027',
              current_term: '2nd Term'
            });
            return;
          }
        }

        const { data, error } = await supabase
          .from('school_info')
          .select('*')
          .limit(1)
          .single();

        if (!error && data) {
          setSchoolInfo({
            name: data.school_name || 'Ebenezer International School',
            address: data.address || '42 Allen Avenue, Ikeja, Lagos',
            phone: data.phone_number || '+234 800 000 0000',
            email: data.email || 'info@ebeniza.edu.ng',
            logo_url: data.logo_url || '',
            motto: data.motto || 'Excellence in Education',
            academic_session: data.academic_session || '2026/2027',
            current_term: data.current_term || '2nd Term'
          });
        } else {
          setSchoolInfo({
            name: 'Ebenezer International School',
            address: '42 Allen Avenue, Ikeja, Lagos',
            phone: '+234 800 000 0000',
            email: 'info@ebeniza.edu.ng',
            logo_url: '',
            motto: 'Excellence in Education',
            academic_session: '2026/2027',
            current_term: '2nd Term'
          });
        }
      } catch (error) {
        console.error('Error fetching school info:', error);
        setSchoolInfo({
          name: 'Ebenezer International School',
          address: '42 Allen Avenue, Ikeja, Lagos',
          phone: '+234 800 000 0000',
          email: 'info@ebeniza.edu.ng',
          logo_url: '',
          motto: 'Excellence in Education',
          academic_session: '2026/2027',
          current_term: '2nd Term'
        });
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
    if (userBranchId) {
      fetchStudentProfile();
    }
  }, [userBranchId]);

  useEffect(() => {
    if (studentProfile) {
      fetchPayments();
      fetchUnpaidFees();
    }
  }, [studentProfile, currentPage, searchTerm, statusFilter, sortField, sortDirection]);

  const fetchStudentProfile = async () => {
    try {
      console.log('🔍 Fetching student profile for user:', user?.id);
      
      let studentData = null;

      if (user?.id) {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          studentData = data;
          console.log('✅ Found student via user_id');
        }
      }

      if (!studentData && user?.id) {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          studentData = data;
          console.log('✅ Found student via id');
        }
      }

      if (!studentData && user?.email) {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('email', user.email)
          .single();

        if (!error && data) {
          studentData = data;
          console.log('✅ Found student via email');
        }
      }

      if (studentData) {
        if (studentData.class_id) {
          const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('id, name')
            .eq('id', studentData.class_id)
            .single();

          if (!classError && classData) {
            studentData.class = classData;
          }
        }

        setStudentProfile(studentData);
        
        console.log('📋 Student Profile:', {
          name: `${studentData.first_name} ${studentData.last_name}`,
          class: studentData.class?.name,
          admission: studentData.admission_number
        });
      } else {
        console.log('❌ No student found');
      }
    } catch (error) {
      console.error('Error fetching student profile:', error);
    }
  };

  const fetchPayments = async () => {
    if (!studentProfile) {
      console.log('No student profile yet, skipping payments fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('📊 Fetching payments for student:', studentProfile.id);
      
      let query = supabase
        .from('payments')
        .select('*', { count: 'exact' })
        .eq('student_id', studentProfile.id);

      if (searchTerm) {
        query = query.or(
          `receipt_number.ilike.%${searchTerm}%,` +
          `transaction_reference.ilike.%${searchTerm}%`
        );
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const feeIds = [...new Set(data?.map(p => p.fee_id).filter(Boolean) || [])];
      
      let feeNameMap: Record<string, string> = {};
      if (feeIds.length > 0) {
        const { data: feeData, error: feeError } = await supabase
          .from('fees')
          .select('id, name, amount, due_date, category')
          .in('id', feeIds);

        if (!feeError && feeData) {
          feeNameMap = feeData.reduce((acc, fee) => {
            acc[fee.id] = fee.name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const paymentsWithFeeNames = (data || []).map(payment => ({
        ...payment,
        fee_name: payment.fee_id ? feeNameMap[payment.fee_id] || 'N/A' : 'N/A'
      }));

      setPayments(paymentsWithFeeNames);
      setTotalCount(count || 0);
      console.log(`✅ Found ${paymentsWithFeeNames.length} payments`);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error(error.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnpaidFees = async () => {
    if (!studentProfile || !studentProfile.class_id || !studentProfile.branch_id) {
      console.log('Missing student class or branch, skipping unpaid fees');
      return;
    }

    try {
      console.log('📊 Fetching unpaid fees for student:', studentProfile.id);
      
      const { data: fees, error: feesError } = await supabase
        .from('fees')
        .select('*')
        .eq('branch_id', studentProfile.branch_id)
        .eq('status', 'active');

      if (feesError) throw feesError;

      const applicableFees = fees?.filter(fee => {
        if (fee.class_id === null) return true;
        if (fee.class_id === studentProfile.class_id) return true;
        if (fee.metadata?.class_ids && Array.isArray(fee.metadata.class_ids)) {
          return fee.metadata.class_ids.includes(studentProfile.class_id);
        }
        return false;
      }) || [];

      const { data: completedPayments, error: paymentError } = await supabase
        .from('payments')
        .select('fee_id, amount_paid')
        .eq('student_id', studentProfile.id)
        .in('status', ['completed', 'paid']);

      if (paymentError) throw paymentError;

      const unpaid = applicableFees
        .map(fee => {
          const paid = completedPayments
            ?.filter(p => p.fee_id === fee.id)
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
          
          const balance = (fee.amount || 0) - paid;
          const isOverdue = fee.due_date && dayjs(fee.due_date).isBefore(dayjs()) && balance > 0;
          
          return {
            id: fee.id,
            name: fee.name,
            amount: fee.amount || 0,
            category: fee.category || 'Other',
            due_date: fee.due_date || '',
            description: fee.description || '',
            balance: balance > 0 ? balance : 0,
            is_overdue: isOverdue
          };
        })
        .filter(fee => fee.balance > 0)
        .sort((a, b) => {
          if (a.is_overdue && !b.is_overdue) return -1;
          if (!a.is_overdue && b.is_overdue) return 1;
          if (a.due_date && b.due_date) {
            return dayjs(a.due_date).diff(dayjs(b.due_date));
          }
          return 0;
        });

      setUnpaidFees(unpaid);
      console.log(`✅ Found ${unpaid.length} unpaid fees`);
    } catch (error: any) {
      console.error('Error fetching unpaid fees:', error);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
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
      default:
        return null;
    }
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      school_fees: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      pta: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      laboratory: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      graduation: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      development_levy: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      identity_card: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
      books: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      uniform: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      transport: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      examination: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      medical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      custom: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[category] || styles.custom;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success('Copied to clipboard');
  };

  const generateTrackingNumber = (payment: Payment) => {
    return `TRK-${dayjs(payment.payment_date).format('YYYYMMDD')}-${payment.receipt_number.slice(-6)}`;
  };

  const generatePaymentReference = (payment: Payment) => {
    const shortId = payment.id ? payment.id.slice(0, 8) : '00000000';
    return `PAY-${dayjs(payment.payment_date).format('YYYYMM')}-${shortId}`;
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

  // Receipt Modal Component with Unpaid Fees
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

    const studentName = studentProfile 
      ? `${studentProfile.first_name} ${studentProfile.last_name}`
      : 'N/A';
    
    const studentAdmission = studentProfile?.admission_number || 'N/A';
    const studentClass = studentProfile?.class?.name || 'N/A';
    const totalOutstanding = localFeeBalances.reduce((sum, f) => sum + f.balance, 0);
    const logoUrl = schoolInfo?.logo_url || schoolLogo;
    const schoolName = schoolInfo?.name || 'Ebenezer International School';
    const schoolAddress = schoolInfo?.address || '42 Allen Avenue, Ikeja, Lagos';
    const schoolPhone = schoolInfo?.phone || '+234 800 000 0000';
    const schoolEmail = schoolInfo?.email || 'info@ebeniza.edu.ng';
    const schoolMotto = schoolInfo?.motto || 'Excellence in Education';

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
                    alt={schoolName} 
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
                {schoolName}
              </h1>
              {schoolMotto && (
                <p className="text-sm italic text-gray-500 dark:text-gray-400 mt-1">
                  "{schoolMotto}"
                </p>
              )}
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                <p>{schoolAddress}</p>
                <p>{schoolPhone} | {schoolEmail}</p>
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
                        <CreditCard className="w-4 h-4 text-gray-400" />
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

            {/* All Fees with Balances Section - Including Unpaid Items */}
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
                        <tr key={fee.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition ${fee.balance > 0 ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                          <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                            {fee.name}
                            {fee.balance > 0 && (
                              <span className="ml-2 text-xs text-red-500">(Unpaid)</span>
                            )}
                          </td>
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
                <p className="mt-1">© {dayjs().year()} {schoolName}. All rights reserved.</p>
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

  return (
    <div className="space-y-6 print:space-y-0">
      {/* Header */}
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Receipt className="w-6 h-6 text-blue-600" />
          Payment History
        </h1>
        <p className="text-gray-500 dark:text-gray-400">View all your fee payment records</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Payments</p>
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{totalCount}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Paid</p>
            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
            {formatCurrency(payments.reduce((sum, p) => sum + p.amount_paid, 0))}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {payments.filter(p => p.status === 'completed').length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
            {payments.filter(p => p.status === 'pending').length}
          </p>
        </div>
      </div>

      {/* Unpaid Fees Section */}
      {unpaidFees.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-6 print:hidden">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
                Unpaid Fees
                <span className="text-xs bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                  {unpaidFees.length}
                </span>
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                You have {unpaidFees.length} unpaid fee{unpaidFees.length > 1 ? 's' : ''}. Please make payment before the due date.
              </p>
              <div className="mt-3 space-y-2">
                {unpaidFees.map((fee) => (
                  <div key={fee.id} className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl hover:bg-white/70 dark:hover:bg-gray-700/50 transition-all">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{fee.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryBadge(fee.category)}`}>
                          {fee.category.replace(/_/g, ' ')}
                        </span>
                        {fee.due_date && (
                          <span className={`text-xs ${fee.is_overdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                            Due: {dayjs(fee.due_date).format('MMM D, YYYY')}
                            {fee.is_overdue && ' (Overdue)'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <p className="text-sm font-bold text-red-600">{formatCurrency(fee.balance)}</p>
                      <button className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-medium rounded-lg hover:opacity-90 transition-all shadow-lg shadow-blue-500/25">
                        Pay Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
            placeholder="Search by receipt number or transaction reference..."
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
            <option value="refunded">Refunded</option>
          </select>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={clearFilters}
              className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              title="Clear filters"
            >
              <XCircleIcon className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden print:border-0 print:shadow-none">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : payments.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Receipt className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">No payment records</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">You haven't made any payments yet</p>
            </motion.div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('receipt_number')}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      Receipt
                      {sortField === 'receipt_number' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fee Name
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('amount_paid')}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      Amount
                      {sortField === 'amount_paid' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('payment_method')}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      Method
                      {sortField === 'payment_method' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      Status
                      {sortField === 'status' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('payment_date')}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      Date
                      {sortField === 'payment_date' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                  {payments.map((payment, index) => (
                    <motion.tr 
                      key={payment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
                    >
                      <td className="px-4 sm:px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {payment.receipt_number}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[120px] sm:max-w-[200px]">
                            {payment.transaction_reference}
                          </p>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 sm:px-6 py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[150px]">
                          {payment.fee_name || 'N/A'}
                        </p>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(payment.amount_paid)}
                        </p>
                        {payment.balance > 0 && (
                          <p className="text-xs text-red-500">Balance: {formatCurrency(payment.balance)}</p>
                        )}
                      </td>
                      <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-600 dark:text-gray-300 capitalize truncate max-w-[80px]">
                            {payment.payment_method}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(payment.status)}`}>
                          {getStatusIcon(payment.status)}
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
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
                              setShowReceipt(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400"
                            title="View Receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              toast.success('Receipt download started');
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-gray-500 dark:text-gray-400"
                            title="Download Receipt"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
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
        {showReceipt && selectedPayment && (
          <ReceiptModal
            payment={selectedPayment}
            onClose={() => {
              setShowReceipt(false);
              setSelectedPayment(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentPayments;
