// src/components/common/ReceiptModal.tsx — REMOVED QR DETAILS DISPLAY

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../config/supabase/client';
import dayjs from 'dayjs';

import {
  Receipt,
  Printer,
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
  ShieldCheck,
  ShieldAlert,
  Lock,
  ExternalLink,
  Key,
} from 'lucide-react';

import toast from 'react-hot-toast';
import JsBarcode from 'jsbarcode';
import { QRCodeCanvas } from 'qrcode.react';

import schoolLogo from '../../assets/school-logo.png';

// ============================================================
// TYPES
// ============================================================

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
  term_name?: string;
  session_name?: string;
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
  receipt_signature?: string;
  receipt_barcode_payload?: string;
  receipt_qr_payload?: string;
  receipt_security_status?: string;
  verification_token?: string;
  receipt_code?: string;
  payment_id?: string;
  branch_code?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  sort_code?: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  admission_number: string;
  class_name?: string;
  branch_id: string;
  class?: {
    id: string;
    name: string;
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
  currency?: string;
  branch_code?: string;
}

interface ReceiptModalProps {
  payment: Payment;
  student: Student | null;
  schoolInfo: SchoolInfo | null;
  onClose: () => void;
  onPrint?: () => void;
  formatCurrency: (amount: number) => string;
}

// ============================================================
// VERIFY RECEIPT
// ============================================================

const verifyReceipt = async (
  receiptNumber: string,
  signature?: string,
  token?: string
): Promise<{
  valid: boolean;
  status: string;
  message: string;
  receipt?: any;
}> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

    if (!supabaseUrl) {
      return {
        valid: false,
        status: 'ERROR',
        message: 'Supabase URL is not configured',
      };
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/verify-receipt`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptNumber,
          signature: signature || null,
          token: token || null,
        }),
      }
    );

    const data = await response.json();

    return data;
  } catch (error) {
    console.error('Error verifying receipt:', error);

    return {
      valid: false,
      status: 'ERROR',
      message: 'Failed to verify receipt',
    };
  }
};

// ============================================================
// COMPACT BARCODE COMPONENT
// ============================================================

interface ReceiptBarcodeProps {
  value: string;
  compact?: boolean;
}

const ReceiptBarcode: React.FC<ReceiptBarcodeProps> = ({ value, compact = false }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      const svg = svgRef.current;
      svg.innerHTML = '';

      const height = compact ? 35 : 70;
      const width = compact ? 1 : 2;

      JsBarcode(svg, value, {
        format: 'CODE128',
        width: width,
        height: height,
        displayValue: true,
        fontSize: compact ? 8 : 14,
        font: 'monospace',
        textMargin: compact ? 2 : 8,
        margin: compact ? 2 : 10,
        background: '#ffffff',
        lineColor: '#000000',
      });

      svg.style.display = 'block';
      svg.style.width = '100%';
      svg.style.maxWidth = compact ? '200px' : '560px';
      svg.style.height = compact ? '35px' : '90px';
      svg.style.margin = '0 auto';
      svg.style.backgroundColor = '#ffffff';
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    } catch (error) {
      console.error('Barcode generation error:', error);
    }
  }, [value, compact]);

  return (
    <svg
      ref={svgRef}
      className="barcode-svg"
      width={compact ? "200" : "560"}
      height={compact ? "35" : "90"}
      preserveAspectRatio="xMidYMid meet"
      style={{
        display: 'block',
        width: '100%',
        maxWidth: compact ? '200px' : '560px',
        height: compact ? '35px' : '90px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
      }}
    />
  );
};

// ============================================================
// RECEIPT MODAL
// ============================================================

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  payment,
  student,
  schoolInfo,
  onClose,
  onPrint,
  formatCurrency,
}) => {
  const [feeBalances, setFeeBalances] = useState<FeeWithBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [schoolData, setSchoolData] = useState<SchoolInfo | null>(schoolInfo);
  const [loadingSchool, setLoadingSchool] = useState(false);

  const [securityStatus, setSecurityStatus] = useState<
    'loading' | 'authentic' | 'error' | 'revoked' | 'unknown'
  >('loading');

  const [securityMessage, setSecurityMessage] = useState(
    'Verifying receipt...'
  );

  const receiptRef = useRef<HTMLDivElement | null>(null);
  const printReceiptRef = useRef<HTMLDivElement | null>(null);

  // ============================================================
  // BASIC DATA
  // ============================================================

  const studentName = student
    ? `${student.first_name} ${student.last_name}`
    : 'N/A';

  const studentAdmission = student?.admission_number || student?.student_id || 'N/A';
  const studentClass = student?.class?.name || student?.class_name || 'N/A';

  const logoUrl = schoolData?.logo_url || schoolLogo;
  const schoolName = schoolData?.name || '';
  const schoolAddress = schoolData?.address || '';
  const schoolPhone = schoolData?.phone || '';
  const schoolEmail = schoolData?.email || '';
  const schoolMotto = schoolData?.motto || '';
  const academicSession = schoolData?.academic_session || '';
  const currentTerm = schoolData?.current_term || '';

  // ============================================================
  // FETCH SCHOOL INFO FROM DATABASE
  // ============================================================

  useEffect(() => {
    const fetchSchoolInfo = async () => {
      if (schoolInfo) {
        setSchoolData(schoolInfo);
        return;
      }

      if (!student?.branch_id) {
        setLoadingSchool(false);
        return;
      }

      setLoadingSchool(true);

      try {
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('school_name, address, phone_number, email, logo_url, motto, branch_code')
          .eq('id', student.branch_id)
          .single();

        if (branchError) {
          console.error('Error fetching branch:', branchError);
          setLoadingSchool(false);
          return;
        }

        const { data: sessionData, error: sessionError } = await supabase
          .from('academic_sessions')
          .select('session_name, term_name')
          .eq('branch_id', student.branch_id)
          .eq('is_current', true)
          .single();

        if (sessionError) {
          console.error('Error fetching session:', sessionError);
        }

        setSchoolData({
          name: branchData?.school_name || '',
          address: branchData?.address || '',
          phone: branchData?.phone_number || '',
          email: branchData?.email || '',
          logo_url: branchData?.logo_url || '',
          motto: branchData?.motto || '',
          branch_code: branchData?.branch_code || '',
          academic_session: sessionData?.session_name || '',
          current_term: sessionData?.term_name || '',
        });

      } catch (error) {
        console.error('Error fetching school info:', error);
      } finally {
        setLoadingSchool(false);
      }
    };

    fetchSchoolInfo();
  }, [student?.branch_id, schoolInfo]);

  // ============================================================
  // VERIFY RECEIPT
  // ============================================================

  useEffect(() => {
    const verifyReceiptStatus = async () => {
      if (!payment?.receipt_number) {
        setSecurityStatus('error');
        setSecurityMessage('No receipt number found');
        return;
      }

      setSecurityStatus('loading');
      setSecurityMessage('Verifying receipt...');

      try {
        const token = payment.verification_token || null;
        const signature = payment.receipt_signature || null;

        if (payment.receipt_security_status === 'AUTHENTIC') {
          setSecurityStatus('authentic');
          setSecurityMessage('Verified Payment');
          return;
        }

        const result = await verifyReceipt(payment.receipt_number, signature, token);

        if (result.valid && result.status === 'AUTHENTIC') {
          setSecurityStatus('authentic');
          setSecurityMessage('Verified Payment');
        } else {
          setSecurityStatus('unknown');
          setSecurityMessage('Unknown Status');
        }
      } catch (error) {
        console.error('Error verifying receipt:', error);
        setSecurityStatus('error');
        setSecurityMessage('Verification Failed');
      }
    };

    verifyReceiptStatus();
  }, [payment]);

  // ============================================================
  // LOAD FEE BALANCES
  // ============================================================

  useEffect(() => {
    const loadFeeBalances = async () => {
      if (!payment.student_id) {
        setLoadingBalances(false);
        return;
      }

      setLoadingBalances(true);
      const balances = await fetchStudentFeeBalances(payment.student_id);
      setFeeBalances(balances);
      setLoadingBalances(false);
    };

    loadFeeBalances();
  }, [payment.student_id]);

  // ============================================================
  // FETCH STUDENT FEE BALANCES
  // ============================================================

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
        .select('id, session_name, term_name')
        .eq('branch_id', studentData.branch_id)
        .eq('is_current', true)
        .single();

      const currentSession = sessionData?.session_name || '';
      const currentTerm = sessionData?.term_name || '';

      const { data: termsData } = await supabase
        .from('terms')
        .select('id, name')
        .eq('session_id', sessionData?.id || '')
        .order('name');

      const termsMap: Record<string, string> = {};
      if (termsData) {
        termsData.forEach(term => {
          termsMap[term.id] = term.name;
        });
      }

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
            description
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

        let discountAmount = assignment.discount_amount || 0;
        let discountReason = '';

        if (exemptionApplied && Object.keys(exemptionApplied).length > 0) {
          const percentage = exemptionApplied.percentage || 0;
          if (percentage > 0) {
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
          if (!discountReason) {
            discountReason = metadata.exemption_applied?.type === 'staff_child'
              ? 'Staff Child Exemption'
              : metadata.exemption_applied?.type === 'scholarship'
              ? 'Scholarship'
              : 'Fee Discount';
          }
        }

        const amountDue = assignment.amount_due || Math.max(0, fee.amount - discountAmount);

        const feePayments = studentPayments?.filter(
          (p) => p.fee_id === fee.id && p.assignment_id === assignment.id
        ) || [];

        const totalPaid = feePayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
        const balance = Math.max(0, amountDue - totalPaid);

        let termName = assignment.term || currentTerm;
        if (termsMap[termName]) {
          termName = termsMap[termName];
        }

        feeBalances.push({
          id: fee.id,
          name: fee.name,
          amount: amountDue,
          original_amount: fee.amount,
          paid: totalPaid,
          balance,
          status: balance <= 0 ? 'Paid' : 'Unpaid',
          due_date: fee.due_date || assignment.due_date || '',
          category: fee.category || 'Other',
          discount_amount: discountAmount,
          discount_percentage: (discountAmount / fee.amount) * 100 || 0,
          discount_reason: discountReason,
          is_exempted: discountAmount > 0,
          assignment_id: assignment.id,
          amount_due: amountDue,
          session: assignment.session || currentSession,
          term: assignment.term || currentTerm,
          term_name: termName,
          session_name: assignment.session || currentSession,
        });
      }

      return feeBalances;
    } catch (error) {
      console.error('Error fetching fee balances:', error);
      return [];
    }
  };

  // ============================================================
  // COPY
  // ============================================================

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast.success('Copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  // ============================================================
  // PRINT
  // ============================================================

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 500);
    if (onPrint) onPrint();
  };

  // ============================================================
  // SECURITY ICON
  // ============================================================

  const getSecurityIcon = () => {
    switch (securityStatus) {
      case 'authentic':
        return <ShieldCheck className="w-4 h-4 text-green-600" />;
      case 'revoked':
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      case 'error':
        return <ShieldAlert className="w-4 h-4 text-orange-600" />;
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      default:
        return <Shield className="w-4 h-4 text-gray-600" />;
    }
  };

  // ============================================================
  // SECURITY COLOR
  // ============================================================

  const getSecurityColor = () => {
    switch (securityStatus) {
      case 'authentic':
        return 'bg-green-50 border-green-200';
      case 'revoked':
        return 'bg-red-50 border-red-200';
      case 'error':
        return 'bg-orange-50 border-orange-200';
      case 'loading':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // ============================================================
  // TOTALS
  // ============================================================

  const totalOutstanding = feeBalances.reduce((sum, fee) => sum + fee.balance, 0);
  const totalDiscounts = feeBalances.reduce((sum, fee) => sum + (fee.discount_amount || 0), 0);
  const totalOriginalAmount = feeBalances.reduce((sum, fee) => sum + (fee.original_amount || fee.amount), 0);
  const totalAmountDue = feeBalances.reduce((sum, fee) => sum + fee.amount, 0);
  const totalPaid = feeBalances.reduce((sum, fee) => sum + fee.paid, 0);
  const hasDiscounts = totalDiscounts > 0;

  // ============================================================
  // LOADING
  // ============================================================

  if (loadingBalances || loadingSchool) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-center mt-4 text-gray-500">Loading receipt...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      {/* MODAL */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 print:hidden">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
          {/* Modal Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Payment Receipt</h3>
                <p className="text-xs text-gray-500">{payment.receipt_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                disabled={printing}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                title="Print"
              >
                {printing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Printer className="w-5 h-5 text-gray-600" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Screen Receipt Preview */}
          <div ref={receiptRef} className="p-6 bg-white">
            <CompactReceiptContent
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
              academicSession={academicSession}
              currentTerm={currentTerm}
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
              securityStatus={securityStatus}
              securityMessage={securityMessage}
              getSecurityIcon={getSecurityIcon}
              getSecurityColor={getSecurityColor}
            />
          </div>

          {/* Actions - Only Print and Close */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              disabled={printing}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
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
      </div>

      {/* PRINT VERSION */}
      <div 
        ref={printReceiptRef}
        id="printable-receipt"
        className="print-only"
      >
        <CompactReceiptContent
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
          academicSession={academicSession}
          currentTerm={currentTerm}
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
          securityStatus={securityStatus}
          securityMessage={securityMessage}
          getSecurityIcon={getSecurityIcon}
          getSecurityColor={getSecurityColor}
        />
      </div>

      <style>{`
        @media print {
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            background: white;
            overflow: hidden;
          }

          body * {
            visibility: hidden;
          }

          #printable-receipt,
          #printable-receipt * {
            visibility: visible;
          }

          #printable-receipt {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            display: block !important;
            background: white;
            overflow: hidden;
          }

          .print-only {
            display: block !important;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }

          .fixed.inset-0 {
            display: none !important;
          }

          .print\\:hidden {
            display: none !important;
          }
        }

        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

// ============================================================
// COMPACT RECEIPT CONTENT - SINGLE PAGE (NO QR DETAILS DISPLAY)
// ============================================================

interface CompactReceiptContentProps {
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
  academicSession: string;
  currentTerm: string;
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
  securityStatus: string;
  securityMessage: string;
  getSecurityIcon: () => JSX.Element;
  getSecurityColor: () => string;
}

const CompactReceiptContent: React.FC<CompactReceiptContentProps> = ({
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
  academicSession,
  currentTerm,
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
  securityStatus,
  securityMessage,
  getSecurityIcon,
  getSecurityColor,
}) => {
  const isAuthentic = securityStatus === 'authentic';

  const isPaid = payment.status === 'completed' || payment.status === 'paid' || payment.status === 'approved';
  
  // Use fee_name from payment or get it from feeBalances
  const feeName = payment.fee_name || (feeBalances.length > 0 ? feeBalances[0].name : 'N/A');

  // ============================================================
  // QR CODE VALUE - Contains FULL payment details for scanning
  // ============================================================

  const qrValue = JSON.stringify({
    receipt: payment.receipt_number,
    student: studentName,
    admission: studentAdmission,
    class: studentClass,
    fee: feeName,
    amount: formatCurrency(payment.amount_paid),
    amount_paid: payment.amount_paid,
    balance: payment.balance || 0,
    date: payment.payment_date ? dayjs(payment.payment_date).format('MMM D, YYYY h:mm A') : '',
    method: payment.payment_method?.replace('_', ' ') || 'N/A',
    reference: payment.transaction_reference || 'N/A',
    status: isPaid ? 'PAID' : 'PENDING',
    school: schoolName || 'School',
    session: academicSession || '',
    term: currentTerm || '',
    verification_status: isAuthentic ? 'AUTHENTIC' : 'PENDING',
    token: payment.verification_token || 'N/A',
    signature: payment.receipt_signature || 'N/A',
  });

  // ============================================================
  // BARCODE VALUE - Contains receipt number and payment info
  // ============================================================

  const barcodeValue = payment.receipt_barcode_payload || 
    `EIS|${payment.receipt_number}|${studentName}|${formatCurrency(payment.amount_paid)}|${isPaid ? 'PAID' : 'PENDING'}`;

  return (
    <div className="compact-receipt" style={{
      maxWidth: '794px',
      margin: '0 auto',
      background: '#ffffff',
      color: '#111827',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '9pt',
      lineHeight: '1.3',
      padding: '10pt',
    }}>
      <style>{`
        .compact-receipt table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7.5pt;
        }
        .compact-receipt th {
          background: #f3f4f6;
          padding: 1.5mm 1mm;
          text-align: left;
          font-weight: 600;
          font-size: 6.5pt;
          text-transform: uppercase;
          border-bottom: 1.5px solid #d1d5db;
          color: #374151;
        }
        .compact-receipt td {
          padding: 1mm 1mm;
          border-bottom: 0.5px solid #e5e7eb;
          vertical-align: middle;
        }
        .compact-receipt .text-right { text-align: right; }
        .compact-receipt .text-center { text-align: center; }
        .compact-receipt .font-mono { font-family: monospace; }
        .compact-receipt .text-green { color: #059669; }
        .compact-receipt .text-red { color: #dc2626; }
        .compact-receipt .text-gray { color: #6b7280; }
        .compact-receipt .font-bold { font-weight: 700; }
        .compact-receipt .line-through { text-decoration: line-through; }
        .compact-receipt .bg-gray { background: #f9fafb; }
        .compact-receipt .bg-green { background: #f0fdf4; }
        .compact-receipt .border-bottom { border-bottom: 1px solid #e5e7eb; }
        .compact-receipt .border-top { border-top: 1px solid #e5e7eb; }
        .compact-receipt .mt-1 { margin-top: 2mm; }
        .compact-receipt .mb-1 { margin-bottom: 2mm; }
        .compact-receipt .p-1 { padding: 1mm; }
        .compact-receipt .p-2 { padding: 2mm; }
        .compact-receipt .gap-1 { gap: 1mm; }
        .compact-receipt .flex { display: flex; }
        .compact-receipt .flex-between { display: flex; justify-content: space-between; align-items: center; }
        .compact-receipt .flex-center { display: flex; align-items: center; justify-content: center; }
        .compact-receipt .flex-col { display: flex; flex-direction: column; }
        .compact-receipt .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; }
        .compact-receipt .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2mm; }
        .compact-receipt .badge {
          display: inline-block;
          padding: 0.3mm 2mm;
          border-radius: 2px;
          font-size: 6.5pt;
          font-weight: 600;
        }
        .compact-receipt .badge-green { background: #d1fae5; color: #065f46; }
        .compact-receipt .badge-yellow { background: #fef3c7; color: #92400e; }
        .compact-receipt .badge-red { background: #fee2e2; color: #991b1b; }
        .compact-receipt .badge-blue { background: #dbeafe; color: #1e40af; }
        .compact-receipt .col-fee { width: 28%; }
        .compact-receipt .col-amount { width: 12%; text-align: right; }
        .compact-receipt .col-discount { width: 12%; text-align: right; }
        .compact-receipt .col-due { width: 12%; text-align: right; }
        .compact-receipt .col-paid { width: 12%; text-align: right; }
        .compact-receipt .col-balance { width: 12%; text-align: right; }
        .compact-receipt .col-status { width: 12%; text-align: center; }
        .compact-receipt .fee-name { word-break: break-word; overflow-wrap: anywhere; }
        .compact-receipt .qr-container canvas { width: 60px !important; height: 60px !important; }
        .compact-receipt .barcode-svg { width: 100% !important; max-width: 180px !important; height: 30px !important; }
      `}</style>

      {/* ======================================================
          HEADER - SCHOOL NAME IS DISPLAYED HERE
      ====================================================== */}

      <div className="text-center border-bottom pb-1 mb-1">
        <div className="flex-center" style={{ gap: '3mm' }}>
          {logoUrl ? (
            <img src={logoUrl} alt={schoolName || 'School'} style={{ height: '16mm', width: 'auto', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '16mm', height: '16mm', background: '#1a56db', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: '12pt', fontWeight: 'bold' }}>S</span>
            </div>
          )}
          <div>
            <div style={{ fontSize: '14pt', fontWeight: '700', color: '#1a56db' }}>
              {schoolName || 'Ebenezer International School'}
            </div>
            {schoolMotto && <div style={{ fontSize: '6pt', color: '#6b7280' }}>"{schoolMotto}"</div>}
            <div style={{ fontSize: '6pt', color: '#6b7280' }}>
              {schoolAddress} 
              {schoolPhone && ` | ${schoolPhone}`} 
              {schoolEmail && ` | ${schoolEmail}`}
            </div>
            {academicSession && currentTerm && (
              <div style={{ fontSize: '6pt', color: '#6b7280', fontWeight: '600' }}>
                {academicSession} • {currentTerm}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================
          RECEIPT TITLE & STATUS
      ====================================================== */}

      <div className="flex-between mb-1">
        <div>
          <div style={{ fontSize: '13pt', fontWeight: '700' }}>PAYMENT RECEIPT</div>
          <div style={{ fontSize: '6.5pt', color: '#6b7280' }}>
            #{payment.receipt_number} • {feeName}
          </div>
        </div>
        <div className="text-right">
          <span className={`badge ${isPaid ? 'badge-green' : 'badge-yellow'}`}>
            {isPaid ? 'PAID' : 'PENDING'}
          </span>
          <div style={{ fontSize: '6.5pt', color: '#6b7280', marginTop: '0.5mm' }}>
            {payment.payment_date ? dayjs(payment.payment_date).format('MMM D, YYYY h:mm A') : ''}
          </div>
        </div>
      </div>

      {/* ======================================================
          SECURITY STATUS
      ====================================================== */}

      <div className={`flex-between p-1 border-bottom mb-1 ${getSecurityColor()}`} style={{ border: '1px solid #e5e7eb', borderRadius: '2px' }}>
        <div className="flex-center" style={{ gap: '1mm' }}>
          {getSecurityIcon()}
          <span style={{ fontSize: '7pt', fontWeight: '500' }}>{securityMessage}</span>
        </div>
        {isAuthentic && (
          <span style={{ fontSize: '6pt', color: '#059669' }}>Verified</span>
        )}
      </div>

      {/* ======================================================
          VERIFICATION TOKEN - COMPACT
      ====================================================== */}

      {payment.verification_token && (
        <div className="bg-gray p-1 text-center mb-1" style={{ border: '1px solid #e5e7eb', borderRadius: '2px' }}>
          <div className="flex-center" style={{ gap: '1mm' }}>
            <Key size={10} className="text-gray" />
            <span style={{ fontSize: '5.5pt', color: '#6b7280' }}>Token:</span>
            <span style={{ fontSize: '5.5pt', fontFamily: 'monospace', fontWeight: '600', color: '#1a56db' }}>
              {payment.verification_token}
            </span>
          </div>
        </div>
      )}

      {/* ======================================================
          STUDENT & PAYMENT INFO - COMPACT GRID
      ====================================================== */}

      <div className="grid-2 mb-1">
        <div className="bg-gray p-1" style={{ border: '1px solid #e5e7eb', borderRadius: '2px' }}>
          <div style={{ fontSize: '5.5pt', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Student Information</div>
          <div style={{ fontSize: '8pt', fontWeight: '600' }}>{studentName}</div>
          <div style={{ fontSize: '6.5pt', color: '#6b7280' }}>Admission: {studentAdmission}</div>
          <div style={{ fontSize: '6.5pt', color: '#6b7280' }}>Class: {studentClass}</div>
          <div style={{ fontSize: '6pt', color: '#6b7280' }}>Fee: {feeName}</div>
        </div>

        <div className="bg-gray p-1" style={{ border: '1px solid #e5e7eb', borderRadius: '2px' }}>
          <div style={{ fontSize: '5.5pt', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Payment Summary</div>
          <div className="grid-2" style={{ marginTop: '0.5mm' }}>
            <div>
              <div style={{ fontSize: '5.5pt', color: '#6b7280' }}>Amount Paid</div>
              <div style={{ fontSize: '10pt', fontWeight: '700', color: '#059669' }}>{formatCurrency(payment.amount_paid)}</div>
            </div>
            <div>
              <div style={{ fontSize: '5.5pt', color: '#6b7280' }}>Balance</div>
              <div style={{ fontSize: '10pt', fontWeight: '700', color: payment.balance && payment.balance > 0 ? '#dc2626' : '#059669' }}>
                {formatCurrency(payment.balance || 0)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '5.5pt', color: '#6b7280' }}>Method</div>
              <div style={{ fontSize: '7pt', fontWeight: '500', textTransform: 'capitalize' }}>
                {payment.payment_method?.replace('_', ' ') || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '5.5pt', color: '#6b7280' }}>Status</div>
              <span className={`badge ${isPaid ? 'badge-green' : 'badge-yellow'}`}>
                {isPaid ? 'Paid' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          FEE TABLE - COMPACT
      ====================================================== */}

      <div className="mb-1">
        <div className="flex-between" style={{ marginBottom: '0.5mm' }}>
          <div style={{ fontSize: '8pt', fontWeight: '600' }}>
            Fee Statement
            {academicSession && currentTerm && (
              <span style={{ fontSize: '6pt', fontWeight: '400', color: '#6b7280' }}> ({academicSession} • {currentTerm})</span>
            )}
          </div>
          <div className="text-right">
            <div style={{ fontSize: '5.5pt', color: '#6b7280' }}>Outstanding</div>
            <div style={{ fontSize: '9pt', fontWeight: '700', color: totalOutstanding > 0 ? '#dc2626' : '#059669' }}>
              {formatCurrency(totalOutstanding)}
            </div>
          </div>
        </div>

        {hasDiscounts && (
          <div className="bg-green p-1 mb-1" style={{ border: '1px solid #bbf7d0', borderRadius: '2px' }}>
            <div className="flex-center" style={{ gap: '1mm', fontSize: '6.5pt', color: '#065f46' }}>
              <Percent size={10} />
              <span>Discount: {formatCurrency(totalDiscounts)}</span>
              {totalOriginalAmount > 0 && (
                <span>({((totalDiscounts / totalOriginalAmount) * 100).toFixed(1)}% off)</span>
              )}
            </div>
          </div>
        )}

        {feeBalances.length === 0 ? (
          <div className="text-center p-2" style={{ color: '#6b7280' }}>
            <FileText size={20} className="text-gray" />
            <div style={{ fontSize: '7pt' }}>No fees assigned</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="col-fee">Fee</th>
                <th className="col-amount">Original</th>
                <th className="col-discount">Disc.</th>
                <th className="col-due">Due</th>
                <th className="col-paid">Paid</th>
                <th className="col-balance">Balance</th>
                <th className="col-status">Status</th>
              </tr>
            </thead>
            <tbody>
              {feeBalances.map((fee, index) => {
                const hasDiscount = (fee.discount_amount || 0) > 0;
                const isPaidFee = fee.balance <= 0;
                return (
                  <tr key={`${fee.id}-${fee.assignment_id}-${index}`}>
                    <td className="col-fee">
                      <div className="fee-name">{fee.name}</div>
                      {(fee.session_name || fee.term_name) && (
                        <div style={{ fontSize: '5.5pt', color: '#6b7280' }}>
                          {fee.session_name || fee.session} {fee.term_name && `• ${fee.term_name}`}
                        </div>
                      )}
                      {fee.discount_reason && (
                        <div style={{ fontSize: '5pt', color: '#059669' }}>{fee.discount_reason}</div>
                      )}
                    </td>
                    <td className="col-amount" style={{ textDecoration: hasDiscount ? 'line-through' : 'none', color: hasDiscount ? '#9ca3af' : 'inherit' }}>
                      {formatCurrency(fee.original_amount || fee.amount)}
                    </td>
                    <td className="col-amount" style={{ color: '#059669' }}>
                      {hasDiscount ? formatCurrency(fee.discount_amount || 0) : '—'}
                    </td>
                    <td className="col-amount">{formatCurrency(fee.amount)}</td>
                    <td className="col-amount" style={{ color: '#059669' }}>{formatCurrency(fee.paid)}</td>
                    <td className="col-amount" style={{ color: isPaidFee ? '#059669' : '#dc2626', fontWeight: '600' }}>
                      {formatCurrency(fee.balance)}
                    </td>
                    <td className="col-status">
                      <span className={`badge ${isPaidFee ? 'badge-green' : 'badge-yellow'}`}>
                        {isPaidFee ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #d1d5db' }}>
                <td style={{ fontWeight: '600' }}>Total</td>
                <td className="text-right" style={{ textDecoration: hasDiscounts ? 'line-through' : 'none', color: '#9ca3af', fontSize: '6.5pt' }}>
                  {formatCurrency(totalOriginalAmount)}
                </td>
                <td className="text-right" style={{ color: '#059669' }}>{formatCurrency(totalDiscounts)}</td>
                <td className="text-right">{formatCurrency(totalAmountDue)}</td>
                <td className="text-right" style={{ color: '#059669' }}>{formatCurrency(totalPaid)}</td>
                <td className="text-right" style={{ color: totalOutstanding > 0 ? '#dc2626' : '#059669', fontWeight: '700' }}>
                  {formatCurrency(totalOutstanding)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ======================================================
          QR + BARCODE - COMPACT SIDE BY SIDE
      ====================================================== */}

      <div className="flex-between p-1" style={{ border: '1px solid #e5e7eb', borderRadius: '2px', background: '#f9fafb' }}>
        <div className="flex-center" style={{ gap: '2mm' }}>
          <div className="qr-container">
            <QRCodeCanvas
              value={qrValue}
              size={60}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
              includeMargin={true}
            />
          </div>
          <div>
            <div style={{ fontSize: '5.5pt', color: '#6b7280' }}>Scan to Verify</div>
            <div style={{ fontSize: '4.5pt', color: '#9ca3af' }}>QR Code</div>
          </div>
        </div>

        <div className="text-center">
          <ReceiptBarcode value={barcodeValue} compact={true} />
          <div style={{ fontSize: '4.5pt', color: '#9ca3af' }}>{payment.receipt_number}</div>
        </div>

        <div className="text-right">
          <div style={{ fontSize: '5.5pt', color: '#6b7280' }}>Verified</div>
          <div style={{ fontSize: '5.5pt', color: '#059669' }}>✓ Authentic</div>
        </div>
      </div>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <div className="text-center mt-1" style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1mm' }}>
        <div style={{ fontSize: '5.5pt', color: '#9ca3af' }}>
          This is a computer-generated receipt. No signature required.
        </div>
        <div style={{ fontSize: '5pt', color: '#9ca3af' }}>
          © {dayjs().year()} {schoolName || 'School'} • {payment.receipt_number} • {feeName}
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;