// src/components/common/ReceiptModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../config/supabase/client';
import dayjs from 'dayjs';
import {
  Receipt,
  Printer,
  Download,
  X,
  Loader2,
  Shield,
  QrCode,
  Barcode,
  School,
  User,
  CheckCircle,
  AlertTriangle,
  Copy,
  Check,
  FileText,
  List,
  CreditCard,
  Building2,
  Wallet,
  Percent,
  Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Import school logo from assets
import schoolLogo from '../../assets/school-logo.png';

interface FeeWithBalance {
  id: string;
  name: string;
  amount: number;
  original_amount: number;
  paid: number;
  balance: number;
  status: string;
  due_date: string;
  category: string;
  discount_amount: number;
  discount_percentage: number;
  discount_reason: string;
  is_exempted: boolean;
  assignment_id: string;
  amount_due: number;
  session: string;
  term: string;
}

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

interface ReceiptModalProps {
  payment: Payment;
  student: Student | null;
  schoolInfo: SchoolInfo | null;
  onClose: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
  formatCurrency: (amount: number) => string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  payment,
  student,
  schoolInfo,
  onClose,
  onPrint,
  onDownload,
  formatCurrency
}) => {
  const [feeBalances, setFeeBalances] = useState<FeeWithBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const studentName = student 
    ? `${student.first_name} ${student.last_name}`
    : 'N/A';
  const studentAdmission = student?.admission_number || student?.student_id || 'N/A';
  const studentClass = student?.class_name || 'N/A';
  const logoUrl = schoolInfo?.logo_url || schoolLogo;
  const schoolName = schoolInfo?.name || 'Ebenezer International School';
  const schoolAddress = schoolInfo?.address || '42 Allen Avenue, Ikeja, Lagos';
  const schoolPhone = schoolInfo?.phone || '+234 800 000 0000';
  const schoolEmail = schoolInfo?.email || 'info@ebenezer.edu.ng';
  const schoolMotto = schoolInfo?.motto || 'Excellence in Education';

  useEffect(() => {
    const loadFeeBalances = async () => {
      if (payment.student_id) {
        setLoadingBalances(true);
        const balances = await fetchStudentFeeBalances(payment.student_id);
        setFeeBalances(balances);
        setLoadingBalances(false);
      } else {
        setLoadingBalances(false);
      }
    };
    loadFeeBalances();
  }, [payment.student_id]);

  const fetchStudentFeeBalances = async (studentId: string): Promise<FeeWithBalance[]> => {
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('class_id, branch_id')
        .eq('id', studentId)
        .single();

      if (!studentData) return [];

      const { data: sessionData } = await supabase
        .from('academic_sessions')
        .select('session_name, term_name')
        .eq('branch_id', studentData.branch_id)
        .eq('is_current', true)
        .single();

      const currentSession = sessionData?.session_name || '';
      const currentTerm = sessionData?.term_name || '';

      const { data: assignments } = await supabase
        .from('student_fee_assignments')
        .select(`
          *,
          fee:fee_id (
            id, 
            name, 
            amount, 
            category, 
            due_date, 
            description,
            created_at
          )
        `)
        .eq('student_id', studentId)
        .eq('branch_id', studentData.branch_id)
        .eq('is_active', true);

      if (!assignments || assignments.length === 0) {
        return [];
      }

      const { data: studentPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .in('status', ['completed', 'paid', 'approved']);

      const feeBalances: FeeWithBalance[] = [];

      for (const assignment of assignments) {
        const fee = assignment.fee;
        if (!fee) continue;

        const metadata = assignment.metadata || {};
        const exemptionApplied = metadata.exemption_applied || {};
        
        let isExempted = false;
        let discountAmount = assignment.discount_amount || 0;
        let discountPercentage = 0;
        let discountReason = '';

        if (exemptionApplied && Object.keys(exemptionApplied).length > 0) {
          isExempted = true;
          const percentage = exemptionApplied.percentage || 0;
          if (percentage > 0) {
            discountPercentage = percentage;
            discountAmount = (fee.amount * percentage) / 100;
            discountReason = exemptionApplied.type === 'staff_child' 
              ? 'Staff Child Exemption' 
              : exemptionApplied.type === 'scholarship'
              ? 'Scholarship'
              : 'Fee Exemption';
          }
        }

        if (assignment.discount_amount && assignment.discount_amount > 0) {
          discountAmount = assignment.discount_amount;
          discountPercentage = (discountAmount / fee.amount) * 100;
          if (!discountReason) {
            discountReason = metadata.exemption_applied?.type === 'staff_child' 
              ? 'Staff Child Exemption' 
              : metadata.exemption_applied?.type === 'scholarship'
              ? 'Scholarship'
              : 'Fee Discount';
          }
        }

        const amountDue = assignment.amount_due || Math.max(0, fee.amount - discountAmount);
        const feePayments = studentPayments?.filter(p => p.fee_id === fee.id && p.assignment_id === assignment.id) || [];
        const totalPaid = feePayments.reduce((sum, p) => sum + p.amount_paid, 0);
        const balance = Math.max(0, amountDue - totalPaid);

        feeBalances.push({
          id: fee.id,
          name: fee.name,
          amount: amountDue,
          original_amount: fee.amount,
          paid: totalPaid,
          balance: balance,
          status: balance <= 0 ? 'Paid' : 'Unpaid',
          due_date: fee.due_date || assignment.due_date || '',
          category: fee.category || 'Other',
          discount_amount: discountAmount,
          discount_percentage: discountPercentage,
          discount_reason: discountReason,
          is_exempted: isExempted || discountAmount > 0,
          assignment_id: assignment.id,
          amount_due: amountDue,
          session: assignment.session || currentSession,
          term: assignment.term || currentTerm
        });
      }

      return feeBalances;

    } catch (error) {
      console.error('Error fetching fee balances:', error);
      return [];
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success('Copied to clipboard');
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 300);
    if (onPrint) onPrint();
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    
    setDownloading(true);
    try {
      const element = receiptRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 800,
        height: element.scrollHeight,
        windowHeight: element.scrollHeight,
        onclone: (document) => {
          const clonedElement = document.getElementById('receipt-content');
          if (clonedElement) {
            clonedElement.style.transform = 'none';
            clonedElement.style.width = '800px';
            clonedElement.style.margin = '0 auto';
            clonedElement.style.padding = '40px';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
        hotfixes: ['px_scaling'],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`receipt-${payment.receipt_number || 'payment'}.pdf`);
      
      toast.success('Receipt downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download receipt. Please try printing instead.');
    } finally {
      setDownloading(false);
    }
  };

  const totalOutstanding = feeBalances.reduce((sum, f) => sum + f.balance, 0);
  const totalDiscounts = feeBalances.reduce((sum, f) => sum + (f.discount_amount || 0), 0);
  const totalOriginalAmount = feeBalances.reduce((sum, f) => sum + (f.original_amount || f.amount), 0);
  const totalAmountDue = feeBalances.reduce((sum, f) => sum + f.amount, 0);
  const totalPaid = feeBalances.reduce((sum, f) => sum + f.paid, 0);
  const hasDiscounts = totalDiscounts > 0;

  if (loadingBalances) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-center mt-4 text-gray-500 dark:text-gray-400">Loading receipt...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 print:hidden">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
          {/* Modal Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
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
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                title="Download PDF"
              >
                {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>

          {/* Receipt Content */}
          <div ref={receiptRef} id="receipt-content" className="p-6 md:p-8">
            <ReceiptContent
              payment={payment}
              studentName={studentName}
              studentAdmission={studentAdmission}
              studentClass={studentClass}
              logoUrl={logoUrl}
              schoolName={schoolName}
              schoolMotto={schoolMotto}
              schoolAddress={schoolAddress}
              schoolPhone={schoolPhone}
              schoolEmail={schoolEmail}
              feeBalances={feeBalances}
              totalOutstanding={totalOutstanding}
              totalDiscounts={totalDiscounts}
              totalOriginalAmount={totalOriginalAmount}
              totalAmountDue={totalAmountDue}
              totalPaid={totalPaid}
              hasDiscounts={hasDiscounts}
              formatCurrency={formatCurrency}
              copied={copied}
              copyToClipboard={copyToClipboard}
            />
          </div>

          {/* Modal Actions */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Close
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-green-500/25 flex items-center justify-center gap-2"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Print Version */}
      <div className="hidden print:block print:bg-white print:p-8">
        <ReceiptContent
          payment={payment}
          studentName={studentName}
          studentAdmission={studentAdmission}
          studentClass={studentClass}
          logoUrl={logoUrl}
          schoolName={schoolName}
          schoolMotto={schoolMotto}
          schoolAddress={schoolAddress}
          schoolPhone={schoolPhone}
          schoolEmail={schoolEmail}
          feeBalances={feeBalances}
          totalOutstanding={totalOutstanding}
          totalDiscounts={totalDiscounts}
          totalOriginalAmount={totalOriginalAmount}
          totalAmountDue={totalAmountDue}
          totalPaid={totalPaid}
          hasDiscounts={hasDiscounts}
          formatCurrency={formatCurrency}
          copied={false}
          copyToClipboard={() => {}}
        />
      </div>
    </>
  );
};

// ============================================
// RECEIPT CONTENT COMPONENT (Reusable for both modal and print)
// ============================================

interface ReceiptContentProps {
  payment: Payment;
  studentName: string;
  studentAdmission: string;
  studentClass: string;
  logoUrl: string;
  schoolName: string;
  schoolMotto: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  feeBalances: FeeWithBalance[];
  totalOutstanding: number;
  totalDiscounts: number;
  totalOriginalAmount: number;
  totalAmountDue: number;
  totalPaid: number;
  hasDiscounts: boolean;
  formatCurrency: (amount: number) => string;
  copied: boolean;
  copyToClipboard: (text: string) => void;
}

const ReceiptContent: React.FC<ReceiptContentProps> = ({
  payment,
  studentName,
  studentAdmission,
  studentClass,
  logoUrl,
  schoolName,
  schoolMotto,
  schoolAddress,
  schoolPhone,
  schoolEmail,
  feeBalances,
  totalOutstanding,
  totalDiscounts,
  totalOriginalAmount,
  totalAmountDue,
  totalPaid,
  hasDiscounts,
  formatCurrency,
  copied,
  copyToClipboard,
}) => {
  return (
    <div className="max-w-2xl mx-auto print:max-w-full">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 print:break-inside-avoid">
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3" /> Student Information
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{studentName}</p>
            <p className="text-xs text-gray-500">Admission: {studentAdmission}</p>
            <p className="text-xs text-gray-500">Class: {studentClass}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400">Receipt Number</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{payment.receipt_number}</p>
                <button 
                  onClick={() => copyToClipboard(payment.receipt_number || '')}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all print:hidden"
                >
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                </button>
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400">Payment Date</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {dayjs(payment.payment_date).format('MMM D, YYYY')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Summary</p>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <p className="text-xs text-gray-500">Amount Paid</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(payment.amount_paid)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Balance</p>
                <p className={`text-lg font-bold ${payment.balance && payment.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(payment.balance || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Method</p>
                <div className="flex items-center gap-1 mt-1">
                  {payment.payment_method === 'card' || payment.payment_method === 'paystack' ? (
                    <CreditCard className="w-4 h-4 text-gray-400" />
                  ) : payment.payment_method === 'bank_transfer' || payment.payment_method === 'offline_bank' ? (
                    <Building2 className="w-4 h-4 text-gray-400" />
                  ) : payment.payment_method === 'cash' ? (
                    <Wallet className="w-4 h-4 text-gray-400" />
                  ) : (
                    <CreditCard className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium capitalize">{payment.payment_method?.replace('_', ' ') || 'N/A'}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  payment.status === 'completed' || payment.status === 'paid' || payment.status === 'approved'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : payment.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">Fee</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{payment.fee_name || 'N/A'}</p>
            <p className="text-xs text-gray-500">Transaction: {payment.transaction_reference || 'N/A'}</p>
            {payment.rejection_reason && (
              <p className="text-xs text-red-500 mt-1">Rejection: {payment.rejection_reason}</p>
            )}
          </div>
        </div>
      </div>

      {/* Fee Statement */}
      <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-6 mt-6 print:break-inside-avoid">
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

        {hasDiscounts && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl print:break-inside-avoid">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <Percent className="w-4 h-4" />
              <span className="font-medium">Discount Applied:</span>
              <span>{formatCurrency(totalDiscounts)}</span>
              <span className="text-xs text-green-600 dark:text-green-400">
                ({((totalDiscounts / totalOriginalAmount) * 100).toFixed(1)}% off)
              </span>
            </div>
            <div className="mt-1 text-xs text-green-600 dark:text-green-400">
              <span>Original Total: {formatCurrency(totalOriginalAmount)}</span>
              <span className="mx-2">→</span>
              <span>Amount Due: {formatCurrency(totalAmountDue)}</span>
            </div>
          </div>
        )}

        {feeBalances.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p>No fees assigned to this student</p>
          </div>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-sm print:text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700/50 print:bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fee Name
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Original
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Due
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {feeBalances.map((fee, index) => {
                  const hasDiscount = (fee.discount_amount || 0) > 0;
                  return (
                    <tr 
                      key={fee.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition ${
                        fee.balance > 0 ? 'bg-red-50/30 dark:bg-red-900/10' : ''
                      } ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'}`}
                    >
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                        <div className="flex flex-col">
                          <span>{fee.name}</span>
                          <span className="text-[10px] text-gray-400">
                            {fee.session} {fee.term && `• ${fee.term}`}
                          </span>
                          {fee.discount_reason && (
                            <span className="text-[10px] text-green-600 dark:text-green-400">
                              {fee.discount_reason}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* ONLY show strikethrough if there's actually a discount */}
                      <td className={`px-3 py-2 text-right text-gray-400 dark:text-gray-500 text-xs ${hasDiscount ? 'line-through' : ''}`}>
                        {formatCurrency(fee.original_amount || fee.amount)}
                      </td>
                      <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">
                        {hasDiscount ? formatCurrency(fee.discount_amount || 0) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(fee.amount)}
                      </td>
                      <td className="px-3 py-2 text-right text-green-600">
                        {formatCurrency(fee.paid)}
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${fee.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(fee.balance)}
                      </td>
                      <td className="px-3 py-2 text-center">
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
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-700/50 print:bg-gray-100 border-t-2 border-gray-300 dark:border-gray-600">
                <tr>
                  <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">Total</td>
                  {/* Only show strikethrough on total original if there are discounts */}
                  <td className={`px-3 py-2 text-right font-semibold text-gray-400 dark:text-gray-500 text-xs ${hasDiscounts ? 'line-through' : ''}`}>
                    {formatCurrency(totalOriginalAmount)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-green-600">
                    {formatCurrency(totalDiscounts)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(totalAmountDue)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-green-600">
                    {formatCurrency(totalPaid)}
                  </td>
                  <td className={`px-3 py-2 text-right font-bold ${totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(totalOutstanding)}
                  </td>
                  <td className="px-3 py-2 text-center"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 border-t-2 border-gray-200 dark:border-gray-700 pt-4 print:break-inside-avoid">
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
    </div>
  );
};

export default ReceiptModal;