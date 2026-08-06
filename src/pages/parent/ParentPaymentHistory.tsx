// src/pages/parent/ParentPaymentHistory.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ReceiptModal from '../../components/common/ReceiptModal';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  ArrowLeft,
  Receipt,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Download,
  Search,
  Eye,
  FileText,
  CreditCard,
  Building2,
  Smartphone,
  Wallet,
  RefreshCw,
  AlertTriangle,
  CalendarDays,
  DownloadCloud,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

interface Payment {
  id: string;
  receipt_number: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  status: string;
  fee_name?: string;
  transaction_reference?: string;
  student_id: string;
  assignment_id?: string;
  balance?: number;
  amount?: number;
  fee_id?: string;
  rejection_reason?: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  admission_number: string;
  class_name?: string;
  branch_id: string;
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
  currency?: string;
}

const ParentPaymentHistory: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: dayjs().subtract(6, 'months').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedPaymentsForExport, setSelectedPaymentsForExport] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [generatingBulkReceipt, setGeneratingBulkReceipt] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const pageSize = 10;

  useEffect(() => {
    if (!studentId) {
      setError('No student selected. Please go back and select a child.');
      setLoading(false);
      return;
    }
    loadAllData();
  }, [studentId]);

  useEffect(() => {
    applyFilters();
  }, [payments, searchTerm, statusFilter, dateRange]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const studentData = await fetchStudentInfo();
      if (!studentData) {
        setError('Student not found. Please go back and select a valid child.');
        setLoading(false);
        return;
      }
      await Promise.all([
        fetchPayments(studentData.id),
        fetchSchoolInfo(studentData.branch_id)
      ]);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load payment history');
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentInfo = async (): Promise<Student | null> => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`*, class:class_id (id, name)`)
        .eq('id', studentId)
        .single();

      if (error || !data) return null;

      const studentData: Student = {
        ...data,
        class_name: data.class?.name || 'Not Assigned',
      };
      setStudent(studentData);
      return studentData;
    } catch (error) {
      console.error('Error fetching student:', error);
      return null;
    }
  };

  const fetchSchoolInfo = async (branchId: string) => {
    try {
      if (branchId) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('name, address, phone, email, logo_url')
          .eq('id', branchId)
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
            current_term: '2nd Term',
            currency: 'NGN'
          });
          return;
        }
      }

      const { data } = await supabase.from('school_info').select('*').limit(1).single();
      if (data) {
        setSchoolInfo({
          name: data.school_name || 'Ebenezer International School',
          address: data.address || '42 Allen Avenue, Ikeja, Lagos',
          phone: data.phone_number || '+234 800 000 0000',
          email: data.email || 'info@ebeniza.edu.ng',
          logo_url: data.logo_url || '',
          motto: data.motto || 'Excellence in Education',
          academic_session: data.academic_session || '2026/2027',
          current_term: data.current_term || '2nd Term',
          currency: data.currency || 'NGN',
        });
      }
    } catch (error) {
      console.error('Error fetching school info:', error);
    }
  };

  const fetchPayments = async (studentIdParam: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentIdParam)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      const feeIds = [...new Set(data?.map(p => p.fee_id).filter(Boolean) || [])];
      let feeNameMap: Record<string, string> = {};

      if (feeIds.length > 0) {
        const { data: feeData } = await supabase
          .from('fees')
          .select('id, name')
          .in('id', feeIds);

        if (feeData) {
          feeNameMap = feeData.reduce((acc, fee) => {
            acc[fee.id] = fee.name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const paymentsWithFees = (data || []).map(payment => ({
        ...payment,
        fee_name: payment.fee_id ? feeNameMap[payment.fee_id] || 'N/A' : 'N/A',
      }));

      setPayments(paymentsWithFees);
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  };

  const applyFilters = () => {
    let filtered = [...payments];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.receipt_number?.toLowerCase().includes(term) ||
        p.transaction_reference?.toLowerCase().includes(term) ||
        p.fee_name?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (dateRange.start) {
      filtered = filtered.filter(p => 
        dayjs(p.payment_date).isAfter(dayjs(dateRange.start).subtract(1, 'day'))
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(p => 
        dayjs(p.payment_date).isBefore(dayjs(dateRange.end).add(1, 'day'))
      );
    }

    setFilteredPayments(filtered);
    setCurrentPage(1);
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await loadAllData();
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const currency = schoolInfo?.currency || 'NGN';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      processing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[status] || styles.pending;
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
      case 'paystack':
        return <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />;
      case 'bank_transfer':
      case 'offline_bank':
        return <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />;
      case 'cash':
        return <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />;
      case 'ussd':
        return <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />;
      default:
        return <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />;
    }
  };

  const viewReceipt = (payment: Payment) => {
    if (payment.status === 'failed' || payment.status === 'rejected') {
      toast.error('This payment failed and does not have a valid receipt');
      return;
    }
    setSelectedPayment(payment);
    setShowReceiptModal(true);
  };

  const generateBulkReceipt = async () => {
    if (selectedPaymentsForExport.length === 0) {
      toast.error('Please select at least one payment');
      return;
    }

    setGeneratingBulkReceipt(true);
    try {
      const selectedPayments = payments.filter(p => 
        selectedPaymentsForExport.includes(p.id) &&
        (p.status === 'completed' || p.status === 'approved' || p.status === 'paid')
      );

      if (selectedPayments.length === 0) {
        toast.error('No successful payments selected');
        setGeneratingBulkReceipt(false);
        return;
      }

      selectedPayments.sort((a, b) => 
        dayjs(a.payment_date).diff(dayjs(b.payment_date))
      );

      toast.loading(`Generating receipt for ${selectedPayments.length} payments...`);

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.dismiss();
        toast.error('Please allow popups for this site');
        setGeneratingBulkReceipt(false);
        return;
      }

      const totalAmount = selectedPayments.reduce((sum, p) => sum + p.amount_paid, 0);
      const logoUrl = schoolInfo?.logo_url || '';

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Receipt - ${student?.first_name} ${student?.last_name}</title>
            <style>
              body { font-family: 'Times New Roman', serif; padding: 20px; max-width: 900px; margin: 0 auto; color: #1a1a1a; }
              .receipt-container { border: 2px solid #1a1a1a; padding: 20px; border-radius: 8px; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .text-2xl { font-size: 24px; }
              .text-xl { font-size: 20px; }
              .text-sm { font-size: 14px; }
              .text-xs { font-size: 12px; }
              .text-gray { color: #666; }
              .text-green { color: #22c55e; }
              .border-bottom { border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; }
              .mt-4 { margin-top: 16px; }
              .mb-4 { margin-bottom: 16px; }
              .mt-6 { margin-top: 24px; }
              .pt-4 { padding-top: 16px; }
              .border-top { border-top: 2px solid #1a1a1a; padding-top: 16px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
              th { background-color: #f5f5f5; font-size: 12px; text-transform: uppercase; color: #666; }
              .logo { max-height: 60px; width: auto; object-fit: contain; }
              @media (max-width: 600px) { body { padding: 10px; } table { font-size: 12px; } th, td { padding: 4px 8px; } }
            </style>
          </head>
          <body>
            <div class="receipt-container">
              <div class="text-center border-bottom mb-4">
                ${logoUrl ? `<img src="${logoUrl}" alt="${schoolInfo?.name}" class="logo" />` : ''}
                <h1 class="text-2xl font-bold">${schoolInfo?.name || 'Ebenezer International School'}</h1>
                ${schoolInfo?.motto ? `<p class="text-sm text-gray">"${schoolInfo.motto}"</p>` : ''}
                <div class="text-sm text-gray">
                  <p>${schoolInfo?.address || '42 Allen Avenue, Ikeja, Lagos'}</p>
                  <p>${schoolInfo?.phone || '+234 800 000 0000'} | ${schoolInfo?.email || 'info@ebeniza.edu.ng'}</p>
                </div>
              </div>
              <div class="text-center mb-4">
                <h2 class="text-xl font-bold">PAYMENT HISTORY RECEIPT</h2>
                <p class="text-sm text-gray">Consolidated Payment Statement</p>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
                <div><p class="text-sm text-gray">Student</p><p class="font-bold">${student?.first_name} ${student?.last_name}</p></div>
                <div><p class="text-sm text-gray">Admission</p><p class="font-bold">${student?.admission_number || student?.student_id || 'N/A'}</p></div>
                <div><p class="text-sm text-gray">Class</p><p class="font-bold">${student?.class_name || 'N/A'}</p></div>
                <div><p class="text-sm text-gray">Date Range</p><p class="font-bold">${dayjs(dateRange.start).format('MMM D, YYYY')} - ${dayjs(dateRange.end).format('MMM D, YYYY')}</p></div>
              </div>
              <table class="mt-4">
                <thead><tr><th>S/N</th><th>Receipt</th><th>Fee</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  ${selectedPayments.map((p, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${p.receipt_number}</td>
                      <td>${p.fee_name || 'N/A'}</td>
                      <td>${dayjs(p.payment_date).format('MMM D, YYYY')}</td>
                      <td class="text-right">${formatCurrency(p.amount_paid)}</td>
                      <td>${p.status}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot><tr><td colspan="4" class="font-bold text-right">Total</td><td class="text-right font-bold text-green">${formatCurrency(totalAmount)}</td><td></td></tr></tfoot>
              </table>
              <div class="mt-6 pt-4 border-top text-center text-sm text-gray">
                <p>Computer-generated receipt. No signature required.</p>
                <p>© ${dayjs().year()} ${schoolInfo?.name || 'Ebenezer International School'}. All rights reserved.</p>
              </div>
            </div>
            <script>window.onload=function(){setTimeout(function(){window.print();},1000);};</script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      toast.dismiss();
      toast.success('Receipt generated successfully!');
    } catch (error) {
      console.error('Error generating bulk receipt:', error);
      toast.dismiss();
      toast.error('Failed to generate receipt');
    } finally {
      setGeneratingBulkReceipt(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedPaymentsForExport([]);
    } else {
      const successfulPayments = filteredPayments.filter(p => 
        p.status === 'completed' || p.status === 'approved' || p.status === 'paid'
      );
      setSelectedPaymentsForExport(successfulPayments.map(p => p.id));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelectPayment = (id: string) => {
    setSelectedPaymentsForExport(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const totalAmount = filteredPayments
    .filter(p => p.status === 'completed' || p.status === 'approved' || p.status === 'paid')
    .reduce((sum, p) => sum + p.amount_paid, 0);

  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading payment history..." />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-red-500 mb-3 sm:mb-4" />
          <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{error || 'No Student Selected'}</p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">Please go back and select a child from your dashboard</p>
          <button
            onClick={() => navigate('/parent/dashboard')}
            className="mt-3 sm:mt-4 px-4 sm:px-6 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-all text-sm sm:text-base"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col xs:flex-row xs:items-center gap-3 xs:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button 
            onClick={() => navigate('/parent/dashboard')} 
            className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">Payment History</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {student.first_name} {student.last_name} • {student.admission_number || student.student_id || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 ml-auto xs:ml-0">
          <button 
            onClick={refreshData} 
            disabled={refreshing} 
            className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={generateBulkReceipt}
            disabled={selectedPaymentsForExport.length === 0 || generatingBulkReceipt}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-medium transition-all text-xs sm:text-sm ${
              selectedPaymentsForExport.length === 0 || generatingBulkReceipt
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-blue-500/25'
            }`}
          >
            {generatingBulkReceipt ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            <span className="hidden xs:inline">Generate Receipt</span>
            <span className="xs:hidden">Receipt</span>
            <span className="text-[10px] sm:text-xs bg-white/20 px-1.5 sm:px-2 rounded-full">{selectedPaymentsForExport.length}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards - Mobile Responsive (2x2 grid) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <p className="text-[10px] sm:text-sm text-gray-500">Total Payments</p>
          <p className="text-base sm:text-2xl font-bold text-gray-900 dark:text-white">{filteredPayments.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <p className="text-[10px] sm:text-sm text-gray-500">Total Amount</p>
          <p className="text-xs sm:text-base md:text-2xl font-bold text-green-600 truncate">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <p className="text-[10px] sm:text-sm text-gray-500">Successful</p>
          <p className="text-base sm:text-2xl font-bold text-green-600">
            {filteredPayments.filter(p => p.status === 'completed' || p.status === 'approved' || p.status === 'paid').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <p className="text-[10px] sm:text-sm text-gray-500">Failed</p>
          <p className="text-base sm:text-2xl font-bold text-red-600">
            {filteredPayments.filter(p => p.status === 'failed' || p.status === 'rejected').length}
          </p>
        </div>
      </div>

      {/* Filters - Mobile Responsive */}
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col xs:flex-row gap-2 sm:gap-4">
          <div className="flex-1 min-w-0 relative">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white text-xs sm:text-sm"
            />
          </div>
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-xs"
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {(statusFilter !== 'all' || showDateFilter) && (
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              )}
            </button>

            {/* Desktop Filters */}
            <div className="hidden sm:flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white text-xs sm:text-sm"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
              <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border transition-all text-xs sm:text-sm flex items-center gap-1 sm:gap-2 ${
                  showDateFilter 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Date Range</span>
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
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Status</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['all', 'completed', 'pending', 'failed', 'approved', 'paid'].map((status) => (
                      <button
                        key={status}
                        onClick={() => { setStatusFilter(status); setShowMobileFilters(false); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === status
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="flex-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs dark:text-white"
                    />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="flex-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs dark:text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setDateRange({
                      start: dayjs().subtract(6, 'months').format('YYYY-MM-DD'),
                      end: dayjs().format('YYYY-MM-DD'),
                    });
                    setShowMobileFilters(false);
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Reset to 6 months
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Date Filter - Desktop */}
        {showDateFilter && (
          <div className="hidden sm:block mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col xs:flex-row items-end gap-2 sm:gap-3">
              <div>
                <label className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 block mb-0.5 sm:mb-1">From</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 block mb-0.5 sm:mb-1">To</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white text-xs sm:text-sm"
                />
              </div>
              <button
                onClick={() => {
                  setDateRange({
                    start: dayjs().subtract(6, 'months').format('YYYY-MM-DD'),
                    end: dayjs().format('YYYY-MM-DD'),
                  });
                  setShowDateFilter(false);
                }}
                className="px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm text-blue-600 hover:underline"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payments Table - Mobile Responsive */}
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] sm:min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-2 sm:px-4 py-2 sm:py-3 w-8 sm:w-10">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Receipt</th>
                <th className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fee</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                <th className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 sm:px-6 py-8 sm:py-12 text-center">
                    <Receipt className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">No payments found</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((payment) => {
                  const isSuccessful = payment.status === 'completed' || payment.status === 'approved' || payment.status === 'paid';
                  
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all">
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <input
                          type="checkbox"
                          checked={selectedPaymentsForExport.includes(payment.id)}
                          onChange={() => toggleSelectPayment(payment.id)}
                          disabled={!isSuccessful}
                          className="rounded border-gray-300 dark:border-gray-600 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-mono text-[10px] sm:text-sm text-gray-900 dark:text-white truncate max-w-[60px] sm:max-w-[100px]">
                            {payment.receipt_number}
                          </span>
                        </div>
                        <p className="text-[8px] sm:text-xs text-gray-400 font-mono truncate max-w-[60px] sm:max-w-[150px]">
                          {payment.transaction_reference}
                        </p>
                      </td>
                      <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate max-w-[100px]">
                        {payment.fee_name || 'Unknown Fee'}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(payment.amount_paid)}
                      </td>
                      <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3">
                        <span className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          {getPaymentMethodIcon(payment.payment_method)}
                          <span className="hidden xs:inline">{payment.payment_method?.replace(/_/g, ' ') || 'N/A'}</span>
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {dayjs(payment.payment_date).format('MMM D, YYYY')}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-xs font-medium ${getStatusBadge(payment.status)}`}>
                          {payment.status === 'completed' && <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                          {payment.status === 'pending' && <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                          {payment.status === 'failed' && <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                          <span className="hidden xs:inline">{payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
                          <span className="xs:hidden">
                            {payment.status === 'completed' ? '✓' : 
                             payment.status === 'pending' ? '⏳' : 
                             payment.status === 'failed' ? '✗' : 
                             payment.status.charAt(0).toUpperCase()}
                          </span>
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                          <button
                            onClick={() => viewReceipt(payment)}
                            disabled={!isSuccessful}
                            className={`p-1 sm:p-1.5 rounded-lg transition-all ${
                              isSuccessful 
                                ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                            }`}
                            title={isSuccessful ? 'View Receipt' : 'No receipt available'}
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (isSuccessful) {
                                setSelectedPayment(payment);
                                setShowReceiptModal(true);
                              } else {
                                toast.error('No receipt available for failed payment');
                              }
                            }}
                            disabled={!isSuccessful}
                            className={`p-1 sm:p-1.5 rounded-lg transition-all ${
                              isSuccessful 
                                ? 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400' 
                                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                            }`}
                            title={isSuccessful ? 'Download Receipt' : 'No receipt available'}
                          >
                            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Mobile Responsive */}
        {totalPages > 1 && (
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 px-3 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 text-center xs:text-left">
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredPayments.length)} to {Math.min(currentPage * pageSize, filteredPayments.length)} of {filteredPayments.length}
            </div>
            <div className="flex items-center justify-center xs:justify-end gap-1 sm:gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 sm:p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <span className="text-[10px] sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 sm:p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
            student={student}
            schoolInfo={schoolInfo}
            onClose={() => {
              setShowReceiptModal(false);
              setSelectedPayment(null);
            }}
            formatCurrency={formatCurrency}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ParentPaymentHistory;