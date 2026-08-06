// src/pages/parent/MyChildren.tsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  Users,
  User,
  GraduationCap,
  School,
  BookOpen,
  Calendar,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Receipt,
  Wallet,
  Search,
  RefreshCw,
  Home,
  Grid,
  List,
  ArrowLeft,
  Shield,
  FileText,
  X as XIcon,
  LogOut,
  Sun,
  Moon,
  Filter
} from 'lucide-react';

interface Child {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  class_name: string;
  class_id: string;
  admission_date: string;
  admission_status: string;
  photo_url?: string;
  current_term: string;
  current_session: string;
  total_fees: number;
  total_paid: number;
  total_balance: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  fees: Fee[];
}

interface Fee {
  id: string;
  assignment_id: string;
  name: string;
  category: string;
  amount: number;
  paid: number;
  balance: number;
  due_date: string;
  status: 'paid' | 'partial' | 'unpaid' | 'pending' | 'overdue' | 'waived' | 'cancelled' | 'failed';
  payment_frequency: string;
  is_mandatory: boolean;
  is_recurring: boolean;
  payments: Payment[];
  exemptions: Exemption[];
  session: string;
  term: string;
  assignment_status: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  reference: string;
  payment_method: string;
  status: 'success' | 'pending' | 'failed';
  receipt_number: string;
}

interface Exemption {
  id: string;
  exemption_type: string;
  waiver_percentage: number;
  exemption_reason: string;
}

const MyChildren: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'fees' | 'payments' | 'exemptions'>('overview');
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [showFeeDetail, setShowFeeDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'partial' | 'unpaid' | 'pending' | 'overdue' | 'waived' | 'cancelled' | 'failed'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<Fee | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);
  const [currentSession, setCurrentSession] = useState<string>('');
  const [currentTerm, setCurrentTerm] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [parentId, setParentId] = useState<string>('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Get current session/term
  useEffect(() => {
    const getInitialData = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('academic_sessions')
          .select('session_name, term_name')
          .eq('is_current', true)
          .limit(1)
          .single();

        if (!sessionError && sessionData) {
          setCurrentSession(sessionData.session_name);
          setCurrentTerm(sessionData.term_name);
        } else {
          const { data: branchData } = await supabase
            .from('branches')
            .select('academic_session, current_term')
            .limit(1)
            .single();
          
          if (branchData) {
            setCurrentSession(branchData.academic_session || '');
            setCurrentTerm(branchData.current_term || '');
          } else {
            const year = dayjs().year();
            setCurrentSession(`${year}/${year + 1}`);
            setCurrentTerm('First Term');
          }
        }

        if (user?.id) {
          const { data: parentData, error: parentError } = await supabase
            .from('parents')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (!parentError && parentData) {
            setParentId(parentData.id);
          }
        }
      } catch (error) {
        console.error('Error getting initial data:', error);
        const year = dayjs().year();
        setCurrentSession(`${year}/${year + 1}`);
        setCurrentTerm('First Term');
      }
    };
    getInitialData();
  }, [user]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (user?.id && parentId) {
      loadChildren();
    }
  }, [user, parentId]);

  // ============================================
  // FIXED: Load ALL assignments (not filtered by session/term)
  // This matches ParentPayBill behavior
  // ============================================
  const loadChildren = async () => {
    if (!parentId) return;
    
    setLoading(true);
    try {
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          first_name,
          last_name,
          admission_date,
          admission_status,
          class_id,
          classes:class_id (
            id,
            name,
            code,
            level
          )
        `)
        .eq('parent_id', parentId)
        .eq('current_status', 'active');

      if (studentsError) throw studentsError;

      if (!students || students.length === 0) {
        setChildren([]);
        setLoading(false);
        return;
      }

      const childrenData: Child[] = await Promise.all(
        students.map(async (student) => {
          const className = student.classes?.name || 'No Class Assigned';
          const classId = student.class_id || '';

          // ============================================
          // FIXED: Get ALL active assignments - no session/term filter
          // This matches ParentPayBill behavior
          // ============================================
          const { data: assignments, error: assignmentsError } = await supabase
            .from('student_fee_assignments')
            .select(`
              id,
              assignment_id,
              student_id,
              fee_id,
              original_amount,
              amount_due,
              amount_paid,
              balance,
              payment_status,
              due_date,
              assigned_date,
              payment_frequency,
              session,
              term,
              is_active,
              fees:fee_id (
                id,
                name,
                category,
                is_mandatory,
                is_recurring,
                description,
                amount
              )
            `)
            .eq('student_id', student.id)
            .eq('is_active', true);

          if (assignmentsError) {
            console.error('Error loading assignments:', assignmentsError);
          }

          const finalAssignments = assignments || [];

          // Get successful payments
          const { data: payments } = await supabase
            .from('payments')
            .select(`
              id,
              amount,
              amount_paid,
              payment_date,
              transaction_reference,
              payment_method,
              status,
              receipt_number,
              assignment_id
            `)
            .eq('student_id', student.id)
            .in('status', ['success', 'completed', 'approved', 'paid'])
            .order('payment_date', { ascending: false });

          // Get exemptions
          const { data: exemptions } = await supabase
            .from('fee_exemptions')
            .select(`
              id,
              fee_id,
              exemption_type,
              waiver_percentage,
              exemption_reason,
              is_active
            `)
            .eq('student_id', student.id)
            .eq('is_active', true);

          // Process fees
          const fees: Fee[] = (finalAssignments || []).map((assignment) => {
            const assignmentPayments = (payments || []).filter(
              p => p.assignment_id === assignment.id
            );
            
            const totalPaidFromPayments = assignmentPayments.reduce((sum, p) => sum + (p.amount_paid || p.amount || 0), 0);
            
            const feeName = assignment.fees?.name || 'Unknown Fee';
            const feeCategory = assignment.fees?.category || 'Uncategorized';
            
            const originalAmount = assignment.original_amount || 0;
            const amountDue = assignment.amount_due || originalAmount;
            
            let amountPaid = assignment.amount_paid || 0;
            
            if (amountPaid === 0 && totalPaidFromPayments > 0) {
              amountPaid = totalPaidFromPayments;
            }
            
            let balance = Math.max(0, amountDue - amountPaid);
            
            if (assignment.payment_status === 'paid') {
              balance = 0;
              amountPaid = amountDue;
            }
            
            if (totalPaidFromPayments >= amountDue && balance > 0) {
              balance = 0;
              amountPaid = amountDue;
            }
            
            const feeExemptions = (exemptions || [])
              .filter(e => e.fee_id === assignment.fee_id)
              .map((e: any) => ({
                id: e.id,
                exemption_type: e.exemption_type,
                waiver_percentage: e.waiver_percentage,
                exemption_reason: e.exemption_reason,
              }));

            // Determine status - include ALL statuses
            let status: 'paid' | 'partial' | 'unpaid' | 'pending' | 'overdue' | 'waived' | 'cancelled' | 'failed' = 'unpaid';
            
            // Check for cancelled or failed from payments
            const hasCancelledPayment = (payments || []).some(p => 
              p.assignment_id === assignment.id && 
              (p.status === 'cancelled' || p.status === 'canceled')
            );
            
            const hasFailedPayment = (payments || []).some(p => 
              p.assignment_id === assignment.id && 
              (p.status === 'failed' || p.status === 'rejected')
            );

            if (hasCancelledPayment) {
              status = 'cancelled';
            } else if (hasFailedPayment) {
              status = 'failed';
            } else if (balance <= 0 || assignment.payment_status === 'paid') {
              status = 'paid';
            } else if (assignment.payment_status === 'pending') {
              status = 'pending';
            } else if (assignment.payment_status === 'overdue') {
              status = 'overdue';
            } else if (assignment.payment_status === 'waived') {
              status = 'waived';
            } else if (amountPaid > 0 && balance > 0) {
              status = 'partial';
            } else {
              status = 'unpaid';
            }

            return {
              id: assignment.fee_id || assignment.id,
              assignment_id: assignment.id,
              name: feeName,
              category: feeCategory,
              amount: originalAmount,
              paid: amountPaid,
              balance: balance,
              due_date: assignment.due_date || '',
              status: status,
              payment_frequency: assignment.payment_frequency || 'termly',
              is_mandatory: assignment.fees?.is_mandatory || false,
              is_recurring: assignment.fees?.is_recurring || false,
              payments: assignmentPayments.map((p: any) => ({
                id: p.id,
                amount: p.amount_paid || p.amount || 0,
                payment_date: p.payment_date,
                reference: p.transaction_reference || '',
                payment_method: p.payment_method,
                status: p.status === 'success' || p.status === 'completed' || p.status === 'approved' || p.status === 'paid' ? 'success' : 'pending',
                receipt_number: p.receipt_number,
              })),
              exemptions: feeExemptions,
              session: assignment.session || currentSession,
              term: assignment.term || currentTerm,
              assignment_status: assignment.payment_status || 'unpaid',
            };
          });

          // Calculate totals
          const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
          const totalPaid = fees.reduce((sum, f) => sum + f.paid, 0);
          const totalBalance = fees.reduce((sum, f) => sum + f.balance, 0);

          let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
          if (totalBalance <= 0 && totalFees > 0) paymentStatus = 'paid';
          else if (totalPaid > 0 && totalBalance > 0) paymentStatus = 'partial';
          else if (totalFees === 0) paymentStatus = 'paid';
          else paymentStatus = 'unpaid';

          return {
            id: student.id,
            student_id: student.student_id,
            first_name: student.first_name,
            last_name: student.last_name,
            class_name: className,
            class_id: classId,
            admission_date: student.admission_date,
            admission_status: student.admission_status,
            photo_url: student.photo_url,
            current_term: currentTerm || 'Current Term',
            current_session: currentSession || 'Current Session',
            total_fees: totalFees,
            total_paid: totalPaid,
            total_balance: totalBalance,
            payment_status: paymentStatus,
            fees: fees,
          };
        })
      );

      setChildren(childrenData);
      
      if (childrenData.length > 0 && !selectedChild) {
        setSelectedChild(childrenData[0]);
      }
    } catch (error: any) {
      console.error('Error loading children:', error);
      toast.error(error.message || 'Failed to load children data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadChildren();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string): string => {
    if (!date) return 'N/A';
    return dayjs(date).format('DD MMM YYYY');
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'paid':
      case 'success':
      case 'completed':
      case 'approved':
        return 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400';
      case 'partial':
        return 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'pending':
        return 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
      case 'overdue':
        return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      case 'failed':
        return 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400';
      case 'unpaid':
        return 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      case 'waived':
        return 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'success':
      case 'completed':
      case 'approved':
        return <CheckCircle className="w-3.5 h-3.5" />;
      case 'partial':
      case 'pending':
        return <AlertCircle className="w-3.5 h-3.5" />;
      case 'overdue':
        return <XCircle className="w-3.5 h-3.5" />;
      case 'cancelled':
        return <XCircle className="w-3.5 h-3.5" />;
      case 'failed':
        return <XCircle className="w-3.5 h-3.5" />;
      case 'waived':
        return <Shield className="w-3.5 h-3.5" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      school_fees: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
      books: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
      uniform: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
      sportswear: 'bg-lime-50 text-lime-600 dark:bg-lime-900/20 dark:text-lime-400',
      bus: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
      pta: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
      examination: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
      development_levy: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
      identity_card: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
      hostel: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/20 dark:text-fuchsia-400',
      ict: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
      custom: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[category] || styles.custom;
  };

  const handleChildSelect = (child: Child) => {
    setSelectedChild(child);
    setActiveTab('overview');
    setSelectedFee(null);
    setShowFeeDetail(false);
  };

  const handleFeeClick = (fee: Fee) => {
    setSelectedFee(fee);
    setShowFeeDetail(true);
  };

  const handlePayment = (fee: Fee) => {
    if (fee.status === 'paid' || fee.status === 'waived') {
      toast.error('This fee is already paid or exempted');
      return;
    }
    if (fee.status === 'cancelled' || fee.status === 'failed') {
      toast.error('This payment failed or was cancelled. Please try again.');
      return;
    }
    setSelectedFeeForPayment(fee);
    setPaymentAmount(fee.balance);
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!selectedFeeForPayment || paymentAmount <= 0) {
      toast.error('Invalid payment amount');
      return;
    }

    if (paymentAmount > selectedFeeForPayment.balance) {
      toast.error('Amount exceeds balance');
      return;
    }

    setPaymentLoading(true);
    try {
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const reference = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          student_id: selectedChild?.id,
          assignment_id: selectedFeeForPayment.assignment_id,
          fee_id: selectedFeeForPayment.id,
          amount: paymentAmount,
          amount_paid: paymentAmount,
          payment_method: paymentMethod,
          payment_date: new Date().toISOString(),
          status: 'pending',
          transaction_reference: reference,
          receipt_number: receiptNumber,
          created_by: user?.id,
          created_at: new Date().toISOString(),
          branch_id: selectedChild?.class_id,
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      const newPaid = selectedFeeForPayment.paid + paymentAmount;
      const newBalance = Math.max(0, selectedFeeForPayment.balance - paymentAmount);
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      const { error: updateError } = await supabase
        .from('student_fee_assignments')
        .update({
          amount_paid: newPaid,
          balance: newBalance,
          payment_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedFeeForPayment.assignment_id);

      if (updateError) throw updateError;

      toast.success(`Payment of ${formatCurrency(paymentAmount)} submitted for approval!`);
      setShowPaymentModal(false);
      setSelectedFeeForPayment(null);
      setPaymentAmount(0);
      
      await loadChildren();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Payment failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  const viewReceipt = (payment: Payment) => {
    setSelectedReceipt(payment);
    setShowReceiptModal(true);
  };

  const getFilteredFees = (fees: Fee[]) => {
    let filtered = fees;

    if (searchTerm) {
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(f => f.status === filterStatus);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(f => f.category === filterCategory);
    }

    return filtered;
  };

  const getUniqueCategories = (fees: Fee[]) => {
    const categories = new Set(fees.map(f => f.category));
    return Array.from(categories);
  };

  const getChildInitials = (child: Child) => {
    return `${child.first_name[0]}${child.last_name[0]}`;
  };

  const getProgressPercentage = (paid: number, total: number) => {
    if (total === 0) return 0;
    return Math.min((paid / total) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-blue-500 mx-auto" />
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">Loading your children's data...</p>
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Users className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">No Children Found</h3>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            You don't have any children registered in the school yet.
          </p>
          <button
            onClick={refreshData}
            className="mt-3 sm:mt-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all flex items-center gap-2 mx-auto text-xs sm:text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      
      {/* Header - Mobile Responsive */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => navigate('/parent/dashboard')}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">My Children</h1>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                  {children.length} children • {currentTerm} {currentSession}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
             
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        
        {/* Children Grid - Mobile Responsive (2 columns on mobile, 3 on desktop) */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {children.map((child) => (
            <motion.button
              key={child.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleChildSelect(child)}
              className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all text-left ${
                selectedChild?.id === child.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0">
                  {getChildInitials(child)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate text-xs sm:text-sm">
                    {child.first_name} {child.last_name}
                  </p>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate max-w-[60px] sm:max-w-[80px]">
                      {child.class_name}
                    </span>
                    <span className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full ${getStatusColor(child.payment_status)}`}>
                      {child.payment_status}
                    </span>
                  </div>
                </div>
                {selectedChild?.id === child.id && (
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                )}
              </div>
              <div className="mt-2 sm:mt-3 grid grid-cols-3 gap-1 sm:gap-2 text-[10px] sm:text-xs">
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400">Total</p>
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{formatCurrency(child.total_fees)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400">Paid</p>
                  <p className="font-semibold text-green-600 dark:text-green-400 truncate">{formatCurrency(child.total_paid)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400">Balance</p>
                  <p className={`font-semibold truncate ${child.total_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {formatCurrency(child.total_balance)}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Selected Child Details - Mobile Responsive */}
        {selectedChild && (
          <motion.div
            key={selectedChild.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
          >
            {/* Child Header - Mobile Responsive */}
            <div className="p-3 sm:p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-base sm:text-xl flex-shrink-0">
                    {getChildInitials(selectedChild)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                      {selectedChild.first_name} {selectedChild.last_name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-0.5 sm:gap-1">
                        <School className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="truncate max-w-[80px] sm:max-w-[150px]">{selectedChild.class_name}</span>
                      </span>
                      <span className="text-gray-300 dark:text-gray-600 hidden xs:inline">|</span>
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden xs:inline">
                        {selectedChild.current_term} {selectedChild.current_session}
                      </span>
                      <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-0.5 sm:gap-1">
                        <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="truncate max-w-[60px] sm:max-w-[100px]">{selectedChild.student_id}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
                    <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 uppercase">Total</p>
                    <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">{formatCurrency(selectedChild.total_fees)}</p>
                  </div>
                  <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-[8px] sm:text-[10px] text-green-600 dark:text-green-400 uppercase">Paid</p>
                    <p className="font-bold text-xs sm:text-sm text-green-600 dark:text-green-400">{formatCurrency(selectedChild.total_paid)}</p>
                  </div>
                  <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-center ${selectedChild.total_balance > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                    <p className={`text-[8px] sm:text-[10px] uppercase ${selectedChild.total_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      Balance
                    </p>
                    <p className={`font-bold text-xs sm:text-sm ${selectedChild.total_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {formatCurrency(selectedChild.total_balance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-2 sm:mt-3">
                <div className="flex items-center justify-between text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                  <span className="text-gray-500 dark:text-gray-400">Payment Progress</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getProgressPercentage(selectedChild.total_paid, selectedChild.total_fees).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-1 sm:h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${getProgressPercentage(selectedChild.total_paid, selectedChild.total_fees)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Tabs - Mobile Responsive */}
            <div className="flex gap-0.5 sm:gap-1 p-2 sm:p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: Home },
                { id: 'fees', label: `Fees (${selectedChild.fees.length})`, icon: FileText },
                { id: 'payments', label: 'Payments', icon: Receipt },
                { id: 'exemptions', label: 'Exemptions', icon: Shield },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1 sm:gap-1.5 ${
                      activeTab === tab.id
                        ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden xs:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content - Mobile Responsive */}
            <div className="p-3 sm:p-4">
              
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                      <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 uppercase">Total</p>
                      <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">{selectedChild.fees.length}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                      <p className="text-[8px] sm:text-[10px] text-green-600 dark:text-green-400 uppercase">Paid</p>
                      <p className="font-semibold text-sm sm:text-base text-green-600 dark:text-green-400">
                        {selectedChild.fees.filter(f => f.status === 'paid').length}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                      <p className="text-[8px] sm:text-[10px] text-yellow-600 dark:text-yellow-400 uppercase">Partial</p>
                      <p className="font-semibold text-sm sm:text-base text-yellow-600 dark:text-yellow-400">
                        {selectedChild.fees.filter(f => f.status === 'partial').length}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                      <p className="text-[8px] sm:text-[10px] text-red-600 dark:text-red-400 uppercase">Unpaid</p>
                      <p className="font-semibold text-sm sm:text-base text-red-600 dark:text-red-400">
                        {selectedChild.fees.filter(f => f.status === 'unpaid' || f.status === 'overdue' || f.status === 'failed').length}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Fee Status Distribution</h4>
                    <div className="flex gap-0.5 sm:gap-1">
                      <div className="flex-1">
                        <div className="h-5 sm:h-6 bg-green-500 rounded-l-lg flex items-center justify-center text-[8px] sm:text-[10px] text-white font-medium">
                          Paid ({selectedChild.fees.filter(f => f.status === 'paid').length})
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="h-5 sm:h-6 bg-yellow-500 flex items-center justify-center text-[8px] sm:text-[10px] text-white font-medium">
                          Partial ({selectedChild.fees.filter(f => f.status === 'partial').length})
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="h-5 sm:h-6 bg-red-500 rounded-r-lg flex items-center justify-center text-[8px] sm:text-[10px] text-white font-medium">
                          Unpaid ({selectedChild.fees.filter(f => f.status === 'unpaid' || f.status === 'overdue' || f.status === 'failed' || f.status === 'cancelled').length})
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedChild.fees.some(f => f.payments.length > 0) && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Recent Payments</h4>
                      <div className="space-y-1.5 sm:space-y-2">
                        {selectedChild.fees
                          .flatMap(f => f.payments)
                          .sort((a, b) => dayjs(b.payment_date).unix() - dayjs(a.payment_date).unix())
                          .slice(0, 5)
                          .map((payment, index) => {
                            const fee = selectedChild.fees.find(f => f.payments.some(p => p.id === payment.id));
                            return (
                              <div key={index} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                <div className="p-1 sm:p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                  <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {fee?.name || 'Fee Payment'}
                                  </p>
                                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {formatDate(payment.payment_date)} • {payment.payment_method}
                                  </p>
                                </div>
                                <span className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400 flex-shrink-0">
                                  {formatCurrency(payment.amount)}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fees Tab - Mobile Responsive */}
              {activeTab === 'fees' && (
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col xs:flex-row flex-wrap items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 min-w-[120px] sm:min-w-[180px] relative">
                      <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search fees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-7 sm:pl-9 pr-2 sm:pr-3 py-1 sm:py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {/* Mobile Filter Toggle */}
                    <button
                      onClick={() => setShowMobileFilters(!showMobileFilters)}
                      className="sm:hidden flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[40px]">
                        {filterStatus !== 'all' ? filterStatus : 'Filter'}
                      </span>
                    </button>
                    {/* Desktop Filters */}
                    <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Status</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                        <option value="waived">Waived</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="failed">Failed</option>
                      </select>
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Categories</option>
                        {getUniqueCategories(selectedChild.fees).map(cat => (
                          <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                        ))}
                      </select>
                      <div className="flex gap-0.5 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`p-1 rounded ${viewMode === 'grid' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-gray-400'}`}
                        >
                          <Grid className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={`p-1 rounded ${viewMode === 'list' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-gray-400'}`}
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Filter Dropdown */}
                  <AnimatePresence>
                    {showMobileFilters && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="sm:hidden overflow-hidden"
                      >
                        <div className="pt-2 space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {['all', 'paid', 'partial', 'unpaid', 'pending', 'overdue', 'waived', 'cancelled', 'failed'].map((status) => (
                              <button
                                key={status}
                                onClick={() => { setFilterStatus(status as any); setShowMobileFilters(false); }}
                                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                                  filterStatus === status
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                }`}
                              >
                                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            ))}
                          </div>
                          <div>
                            <select
                              value={filterCategory}
                              onChange={(e) => setFilterCategory(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900"
                            >
                              <option value="all">All Categories</option>
                              {getUniqueCategories(selectedChild.fees).map(cat => (
                                <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3' : 'space-y-2'}>
                    {getFilteredFees(selectedChild.fees).map((fee) => {
                      const isPaid = fee.status === 'paid';
                      const isPartial = fee.status === 'partial';
                      const isPending = fee.status === 'pending';
                      const isOverdue = fee.status === 'overdue';
                      const isWaived = fee.status === 'waived';
                      const isCancelled = fee.status === 'cancelled';
                      const isFailed = fee.status === 'failed';
                      
                      return (
                        <motion.div
                          key={fee.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${
                            viewMode === 'grid' ? 'p-3 sm:p-4' : 'p-2 sm:p-3'
                          } hover:shadow-sm transition-all`}
                        >
                          <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-1 xs:gap-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className={`text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-full ${getCategoryBadge(fee.category)}`}>
                                  {fee.category.replace('_', ' ')}
                                </span>
                                <h4 className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                                  {fee.name}
                                </h4>
                                {fee.is_mandatory && (
                                  <span className="text-[8px] sm:text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full">
                                    Required
                                  </span>
                                )}
                              </div>
                              <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                {fee.payment_frequency}
                              </p>
                            </div>
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium ${getStatusColor(fee.status)} flex items-center gap-0.5 flex-shrink-0`}>
                              {getStatusIcon(fee.status)}
                              {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                            </span>
                          </div>

                          <div className="mt-1.5 sm:mt-2 grid grid-cols-3 gap-1 sm:gap-2">
                            <div>
                              <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400">Total</p>
                              <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(fee.amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400">Paid</p>
                              <p className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(fee.paid)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400">Balance</p>
                              <p className={`text-xs sm:text-sm font-semibold ${fee.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {formatCurrency(fee.balance)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-1.5 sm:mt-2">
                            <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isPaid ? 'bg-green-500' : 
                                  isPartial ? 'bg-yellow-500' : 
                                  isPending ? 'bg-blue-500' :
                                  isOverdue ? 'bg-red-500' :
                                  isWaived ? 'bg-purple-500' :
                                  isCancelled ? 'bg-gray-500' :
                                  isFailed ? 'bg-orange-500' : 'bg-gray-500'
                                }`}
                                style={{ width: `${getProgressPercentage(fee.paid, fee.amount)}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-1.5 sm:mt-2 flex flex-col xs:flex-row xs:items-center justify-between gap-1 xs:gap-0">
                            <div className="flex items-center gap-1 text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400">
                              <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              {fee.due_date ? formatDate(fee.due_date) : 'No due date'}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <button
                                onClick={() => handleFeeClick(fee)}
                                className="px-1.5 sm:px-2.5 py-0.5 text-[8px] sm:text-[10px] text-blue-600 hover:bg-blue-50 rounded-lg transition-all dark:text-blue-400 dark:hover:bg-blue-900/20"
                              >
                                Details
                              </button>
                              {!isPaid && !isWaived && !isCancelled && !isFailed && fee.balance > 0 && (
                                <button
                                  onClick={() => handlePayment(fee)}
                                  className="px-1.5 sm:px-2.5 py-0.5 text-[8px] sm:text-[10px] bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                                >
                                  Pay Now
                                </button>
                              )}
                              {isPaid && (
                                <span className="px-1.5 sm:px-2.5 py-0.5 text-[8px] sm:text-[10px] bg-green-100 text-green-600 rounded-lg dark:bg-green-900/30 dark:text-green-400 flex items-center gap-0.5">
                                  <CheckCircle className="w-2.5 h-2.5" />
                                  Paid
                                </span>
                              )}
                              {(isCancelled || isFailed) && (
                                <span className="px-1.5 sm:px-2.5 py-0.5 text-[8px] sm:text-[10px] bg-gray-100 text-gray-600 rounded-lg dark:bg-gray-800 dark:text-gray-400 flex items-center gap-0.5">
                                  <XCircle className="w-2.5 h-2.5" />
                                  {isCancelled ? 'Cancelled' : 'Failed'}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {getFilteredFees(selectedChild.fees).length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400">
                      <FileText className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1.5 sm:mb-2 text-gray-300" />
                      <p className="text-xs sm:text-sm">No fees found</p>
                    </div>
                  )}
                </div>
              )}

              {/* Payments Tab - Mobile Responsive */}
              {activeTab === 'payments' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[400px] sm:min-w-full text-xs sm:text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[8px] sm:text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                          <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[8px] sm:text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Fee</th>
                          <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-[8px] sm:text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                          <th className="hidden xs:table-cell px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[8px] sm:text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Method</th>
                          <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[8px] sm:text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedChild.fees
                          .flatMap(f => f.payments.map(p => ({ ...p, fee_name: f.name })))
                          .sort((a, b) => dayjs(b.payment_date).unix() - dayjs(a.payment_date).unix())
                          .map((payment, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all">
                              <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-gray-900 dark:text-white text-[10px] sm:text-xs">
                                {formatDate(payment.payment_date)}
                              </td>
                              <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-gray-900 dark:text-white text-[10px] sm:text-xs truncate max-w-[60px] sm:max-w-[120px]">
                                {payment.fee_name}
                              </td>
                              <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-medium text-gray-900 dark:text-white text-[10px] sm:text-xs">
                                {formatCurrency(payment.amount)}
                              </td>
                              <td className="hidden xs:table-cell px-2 sm:px-3 py-1.5 sm:py-2 text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs">
                                {payment.payment_method}
                              </td>
                              <td className="px-2 sm:px-3 py-1.5 sm:py-2">
                                <span className={`px-1 sm:px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] ${getStatusColor(payment.status)}`}>
                                  {payment.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {selectedChild.fees.flatMap(f => f.payments).length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400">
                      <Receipt className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1.5 sm:mb-2 text-gray-300" />
                      <p className="text-xs sm:text-sm">No payment history</p>
                    </div>
                  )}
                </div>
              )}

              {/* Exemptions Tab - Mobile Responsive */}
              {activeTab === 'exemptions' && (
                <div className="space-y-2 sm:space-y-3">
                  {selectedChild.fees
                    .filter(f => f.exemptions.length > 0)
                    .map((fee) => (
                      <div key={fee.id} className="p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 xs:gap-0">
                          <div className="min-w-0">
                            <h4 className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">{fee.name}</h4>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">{fee.category}</p>
                          </div>
                          <span className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 font-medium flex-shrink-0">
                            {fee.exemptions[0]?.waiver_percentage}% waived
                          </span>
                        </div>
                        <div className="mt-1.5 sm:mt-2 grid grid-cols-2 gap-2 sm:gap-3 text-[10px] sm:text-xs">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Original Amount</p>
                            <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(fee.amount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Waived Amount</p>
                            <p className="font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(fee.amount * (fee.exemptions[0]?.waiver_percentage / 100))}
                            </p>
                          </div>
                        </div>
                        <div className="mt-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                          <p>Type: {fee.exemptions[0]?.exemption_type.replace('_', ' ')}</p>
                        </div>
                      </div>
                    ))}
                  {selectedChild.fees.filter(f => f.exemptions.length > 0).length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400">
                      <Shield className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1.5 sm:mb-2 text-gray-300" />
                      <p className="text-xs sm:text-sm">No exemptions found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Fee Detail Modal - Mobile Responsive */}
      <AnimatePresence>
        {showFeeDetail && selectedFee && (
          <FeeDetailModal
            fee={selectedFee}
            onClose={() => setShowFeeDetail(false)}
            onPay={() => {
              setShowFeeDetail(false);
              handlePayment(selectedFee);
            }}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}
      </AnimatePresence>

      {/* Payment Modal - Mobile Responsive */}
      <AnimatePresence>
        {showPaymentModal && selectedFeeForPayment && (
          <PaymentModal
            fee={selectedFeeForPayment}
            amount={paymentAmount}
            setAmount={setPaymentAmount}
            method={paymentMethod}
            setMethod={setPaymentMethod}
            loading={paymentLoading}
            onConfirm={processPayment}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedFeeForPayment(null);
              setPaymentAmount(0);
            }}
            formatCurrency={formatCurrency}
          />
        )}
      </AnimatePresence>

      {/* Receipt Modal - Mobile Responsive */}
      <AnimatePresence>
        {showReceiptModal && selectedReceipt && selectedChild && (
          <ReceiptModal
            payment={selectedReceipt}
            student={selectedChild}
            onClose={() => {
              setShowReceiptModal(false);
              setSelectedReceipt(null);
            }}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// Fee Detail Modal - Mobile Responsive
// ============================================
interface FeeDetailModalProps {
  fee: Fee;
  onClose: () => void;
  onPay: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

const FeeDetailModal: React.FC<FeeDetailModalProps> = ({
  fee,
  onClose,
  onPay,
  formatCurrency,
  formatDate,
}) => {
  const isPaid = fee.status === 'paid';
  const isOverdue = fee.status === 'overdue';
  const isPending = fee.status === 'pending';
  const isWaived = fee.status === 'waived';
  const isCancelled = fee.status === 'cancelled';
  const isFailed = fee.status === 'failed';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{fee.name}</h3>
            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all flex-shrink-0"
            >
              <XIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 uppercase">Category</p>
                <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white capitalize">{fee.category.replace('_', ' ')}</p>
              </div>
              <div className="p-2 sm:p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 uppercase">Status</p>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium ${getStatusColor(fee.status)} flex items-center gap-0.5 w-fit`}>
                  {getStatusIcon(fee.status)}
                  {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 uppercase">Total</p>
                <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">{formatCurrency(fee.amount)}</p>
              </div>
              <div className="p-2 sm:p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <p className="text-[8px] sm:text-[10px] text-green-600 dark:text-green-400 uppercase">Paid</p>
                <p className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400">{formatCurrency(fee.paid)}</p>
              </div>
              <div className={`p-2 sm:p-2.5 rounded-lg text-center ${fee.balance > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                <p className={`text-[8px] sm:text-[10px] uppercase ${fee.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  Balance
                </p>
                <p className={`text-sm sm:text-base font-bold ${fee.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(fee.balance)}
                </p>
              </div>
            </div>

            {fee.due_date && (
              <div className="p-2 sm:p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 uppercase">Due Date</p>
                <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">{formatDate(fee.due_date)}</p>
              </div>
            )}

            {fee.exemptions.length > 0 && (
              <div className="p-2 sm:p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-[8px] sm:text-[10px] text-purple-600 dark:text-purple-400 uppercase">Exemption Applied</p>
                <p className="font-medium text-xs sm:text-sm text-purple-700 dark:text-purple-300">
                  {fee.exemptions[0]?.waiver_percentage}% waived ({fee.exemptions[0]?.exemption_type.replace('_', ' ')})
                </p>
              </div>
            )}

            {fee.payments.length > 0 && (
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5">Payment History</h4>
                <div className="space-y-1 sm:space-y-1.5">
                  {fee.payments.slice(0, 3).map((payment, index) => (
                    <div key={index} className="flex flex-col xs:flex-row xs:items-center justify-between p-1.5 sm:p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg gap-0.5 xs:gap-0">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(payment.amount)}</p>
                        <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400">{formatDate(payment.payment_date)}</p>
                      </div>
                      <span className={`text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full ${getStatusColor(payment.status)} flex-shrink-0`}>
                        {payment.status}
                      </span>
                    </div>
                  ))}
                  {fee.payments.length > 3 && (
                    <p className="text-[8px] sm:text-[10px] text-gray-400 text-center">+ {fee.payments.length - 3} more payments</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
              {!isPaid && !isWaived && !isCancelled && !isFailed && fee.balance > 0 && (
                <button
                  onClick={onPay}
                  className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white rounded-lg font-medium text-xs sm:text-sm hover:bg-blue-600 transition-all"
                >
                  Make Payment
                </button>
              )}
              {(isPaid || isWaived) && (
                <button
                  disabled
                  className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg font-medium text-xs sm:text-sm cursor-default flex items-center justify-center gap-1 sm:gap-2"
                >
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  {isWaived ? 'Exempted' : 'Paid'}
                </button>
              )}
              {(isCancelled || isFailed) && (
                <button
                  disabled
                  className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-500 text-white rounded-lg font-medium text-xs sm:text-sm cursor-default flex items-center justify-center gap-1 sm:gap-2"
                >
                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  {isCancelled ? 'Cancelled' : 'Failed'}
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg font-medium text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// Payment Modal - Mobile Responsive
// ============================================
interface PaymentModalProps {
  fee: Fee;
  amount: number;
  setAmount: (amount: number) => void;
  method: string;
  setMethod: (method: string) => void;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  fee,
  amount,
  setAmount,
  method,
  setMethod,
  loading,
  onConfirm,
  onClose,
  formatCurrency,
}) => {
  const presetAmounts = [
    fee.balance,
    Math.round(fee.balance / 2),
    Math.round(fee.balance / 3),
  ].filter(a => a > 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Make Payment</h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {fee.name} - Balance: {formatCurrency(fee.balance)}
          </p>

          <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm"
                placeholder="0.00"
                min="0"
                max={fee.balance}
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {presetAmounts.slice(0, 3).map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => setAmount(preset)}
                    className="px-2 py-0.5 text-[8px] sm:text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-all"
                  >
                    {formatCurrency(preset)}
                  </button>
                ))}
                <button
                  onClick={() => setAmount(fee.balance)}
                  className="px-2 py-0.5 text-[8px] sm:text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-all"
                >
                  Pay Full
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {['card', 'bank_transfer', 'wallet'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-[10px] sm:text-xs font-medium transition-all ${
                      method === m
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {m.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg font-medium text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading || amount <= 0 || amount > fee.balance}
                className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white rounded-lg font-medium text-xs sm:text-sm hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
                    Pay {formatCurrency(amount)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// Receipt Modal - Mobile Responsive
// ============================================
interface ReceiptModalProps {
  payment: Payment;
  student: Child;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({
  payment,
  student,
  onClose,
  formatCurrency,
  formatDate,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Payment Receipt</h3>
            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
            >
              <XIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 sm:p-5">
            <div className="text-center border-b border-gray-200 dark:border-gray-600 pb-2.5 sm:pb-3">
              <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">School Fee Receipt</h4>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400"># {payment.receipt_number}</p>
            </div>

            <div className="mt-2.5 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <div className="flex flex-col xs:flex-row xs:justify-between gap-0.5 xs:gap-0">
                <span className="text-gray-500 dark:text-gray-400">Student</span>
                <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px] xs:max-w-none">
                  {student.first_name} {student.last_name} ({student.student_id})
                </span>
              </div>
              <div className="flex flex-col xs:flex-row xs:justify-between gap-0.5 xs:gap-0">
                <span className="text-gray-500 dark:text-gray-400">Class</span>
                <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px] xs:max-w-none">{student.class_name}</span>
              </div>
              <div className="flex flex-col xs:flex-row xs:justify-between gap-0.5 xs:gap-0">
                <span className="text-gray-500 dark:text-gray-400">Date</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatDate(payment.payment_date)}</span>
              </div>
              <div className="flex flex-col xs:flex-row xs:justify-between gap-0.5 xs:gap-0">
                <span className="text-gray-500 dark:text-gray-400">Method</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">{payment.payment_method}</span>
              </div>
              <div className="flex flex-col xs:flex-row xs:justify-between gap-0.5 xs:gap-0">
                <span className="text-gray-500 dark:text-gray-400">Reference</span>
                <span className="font-medium text-gray-900 dark:text-white font-mono text-[10px] sm:text-xs truncate max-w-[120px] xs:max-w-none">
                  {payment.reference}
                </span>
              </div>
              <div className="flex flex-col xs:flex-row xs:justify-between border-t border-gray-200 dark:border-gray-600 pt-1.5 sm:pt-2 mt-1.5 sm:mt-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Amount Paid</span>
                <span className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(payment.amount)}</span>
              </div>
              <div className="flex flex-col xs:flex-row xs:justify-between">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className={`text-xs sm:text-sm font-medium ${payment.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {payment.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// Helper Functions
// ============================================
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'paid':
    case 'success':
    case 'completed':
    case 'approved':
      return 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400';
    case 'partial':
      return 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'pending':
      return 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
    case 'overdue':
      return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400';
    case 'cancelled':
      return 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    case 'failed':
      return 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400';
    case 'unpaid':
      return 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    case 'waived':
      return 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400';
    default:
      return 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'paid':
    case 'success':
    case 'completed':
    case 'approved':
      return <CheckCircle className="w-3.5 h-3.5" />;
    case 'partial':
    case 'pending':
      return <AlertCircle className="w-3.5 h-3.5" />;
    case 'overdue':
    case 'cancelled':
    case 'failed':
    case 'unpaid':
      return <XCircle className="w-3.5 h-3.5" />;
    case 'waived':
      return <Shield className="w-3.5 h-3.5" />;
    default:
      return <AlertCircle className="w-3.5 h-3.5" />;
  }
};

export default MyChildren;