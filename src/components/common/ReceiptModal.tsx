// src/components/common/ReceiptModal.tsx

import React, { useEffect, useRef, useState } from 'react';
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
  ShieldCheck,
  ShieldAlert,
  Lock,
  ExternalLink,
  Key,
} from 'lucide-react';

import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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
// BARCODE COMPONENT
// ============================================================
//
// IMPORTANT:
// Each ReceiptBarcode owns its own SVG ref.
// This prevents the modal receipt and print receipt
// from sharing one SVG reference.
// ============================================================

interface ReceiptBarcodeProps {
  value: string;
}

const ReceiptBarcode: React.FC<ReceiptBarcodeProps> = ({ value }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      const svg = svgRef.current;

      // Clear previous barcode
      svg.innerHTML = '';

      // Generate CODE128 barcode
      JsBarcode(svg, value, {
        format: 'CODE128',
        width: 2,
        height: 70,
        displayValue: true,
        fontSize: 14,
        font: 'monospace',
        textMargin: 8,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
      });

      // Keep barcode rectangular and responsive
      svg.style.display = 'block';
      svg.style.width = '100%';
      svg.style.maxWidth = '560px';
      svg.style.height = '90px';
      svg.style.margin = '0 auto';
      svg.style.backgroundColor = '#ffffff';

      svg.setAttribute(
        'preserveAspectRatio',
        'xMidYMid meet'
      );
    } catch (error) {
      console.error('Barcode generation error:', error);
    }
  }, [value]);

  return (
    <svg
      ref={svgRef}
      className="barcode-svg"
      width="560"
      height="90"
      preserveAspectRatio="xMidYMid meet"
      style={{
        display: 'block',
        width: '100%',
        maxWidth: '560px',
        height: '90px',
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
  onDownload,
  formatCurrency,
}) => {
  const [feeBalances, setFeeBalances] = useState<FeeWithBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [securityStatus, setSecurityStatus] = useState<
    'loading' | 'authentic' | 'error' | 'revoked' | 'unknown'
  >('loading');

  const [securityMessage, setSecurityMessage] = useState(
    'Verifying receipt...'
  );

  const [verificationResult, setVerificationResult] =
    useState<any>(null);

  const receiptRef = useRef<HTMLDivElement | null>(null);

  // ============================================================
  // BASIC DATA
  // ============================================================

  const studentName = student
    ? `${student.first_name} ${student.last_name}`
    : 'N/A';

  const studentAdmission =
    student?.admission_number ||
    student?.student_id ||
    'N/A';

  const studentClass =
    student?.class_name || 'N/A';

  const logoUrl =
    schoolInfo?.logo_url || schoolLogo;

  const schoolName =
    schoolInfo?.name ||
    'Ebenezer International School';

  const schoolAddress =
    schoolInfo?.address ||
    '42 Allen Avenue, Ikeja, Lagos';

  const schoolPhone =
    schoolInfo?.phone ||
    '+234 800 000 0000';

  const schoolEmail =
    schoolInfo?.email ||
    'info@ebenezer.edu.ng';

  const schoolMotto =
    schoolInfo?.motto ||
    'Excellence in Education';

  // ============================================================
  // VERIFY RECEIPT SECURITY
  // ============================================================

  useEffect(() => {
    const verifyReceiptStatus = async () => {
      if (!payment?.receipt_number) {
        setSecurityStatus('error');
        setSecurityMessage('⚠️ No receipt number found');
        return;
      }

      setSecurityStatus('loading');
      setSecurityMessage('Verifying receipt...');

      try {
        const token =
          payment.verification_token || null;

        const signature =
          payment.receipt_signature || null;

        if (
          payment.receipt_security_status ===
          'AUTHENTIC'
        ) {
          setSecurityStatus('authentic');
          setSecurityMessage(
            '✅ Cryptographically verified receipt'
          );
          return;
        }

        const result = await verifyReceipt(
          payment.receipt_number,
          signature,
          token
        );

        setVerificationResult(result);

        if (
          result.valid &&
          result.status === 'AUTHENTIC'
        ) {
          setSecurityStatus('authentic');
          setSecurityMessage(
            '✅ Cryptographically verified receipt'
          );
        } else if (
          result.status === 'REVOKED'
        ) {
          setSecurityStatus('revoked');
          setSecurityMessage(
            '❌ This receipt has been revoked'
          );
        } else if (
          result.status === 'TAMPERED'
        ) {
          setSecurityStatus('error');
          setSecurityMessage(
            '⚠️ Receipt has been tampered with!'
          );
        } else if (
          result.status === 'INVALID_SIGNATURE'
        ) {
          setSecurityStatus('error');
          setSecurityMessage(
            '⚠️ Invalid receipt signature'
          );
        } else {
          setSecurityStatus('unknown');
          setSecurityMessage(
            '⚠️ Receipt security status unknown'
          );
        }
      } catch (error) {
        console.error(
          'Error verifying receipt:',
          error
        );

        setSecurityStatus('error');
        setSecurityMessage(
          '⚠️ Could not verify receipt'
        );
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

      const balances =
        await fetchStudentFeeBalances(
          payment.student_id
        );

      setFeeBalances(balances);
      setLoadingBalances(false);
    };

    loadFeeBalances();
  }, [payment.student_id]);

  // ============================================================
  // FETCH STUDENT FEE BALANCES
  // ============================================================

  const fetchStudentFeeBalances = async (
    studentId: string
  ): Promise<FeeWithBalance[]> => {
    try {
      const { data: studentData } =
        await supabase
          .from('students')
          .select('class_id, branch_id')
          .eq('id', studentId)
          .single();

      if (!studentData) return [];

      const { data: sessionData } =
        await supabase
          .from('academic_sessions')
          .select(
            'session_name, term_name'
          )
          .eq(
            'branch_id',
            studentData.branch_id
          )
          .eq('is_current', true)
          .single();

      const currentSession =
        sessionData?.session_name || '';

      const currentTerm =
        sessionData?.term_name || '';

      const { data: assignments } =
        await supabase
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
          .eq(
            'branch_id',
            studentData.branch_id
          )
          .eq('is_active', true);

      if (
        !assignments ||
        assignments.length === 0
      ) {
        return [];
      }

      const { data: studentPayments } =
        await supabase
          .from('payments')
          .select('*')
          .eq('student_id', studentId)
          .in('status', [
            'completed',
            'paid',
            'approved',
          ]);

      const feeBalances: FeeWithBalance[] = [];

      for (const assignment of assignments) {
        const fee = assignment.fee;

        if (!fee) continue;

        const metadata =
          assignment.metadata || {};

        const exemptionApplied =
          metadata.exemption_applied || {};

        let isExempted = false;
        let discountAmount =
          assignment.discount_amount || 0;

        let discountPercentage = 0;
        let discountReason = '';

        if (
          exemptionApplied &&
          Object.keys(exemptionApplied).length > 0
        ) {
          isExempted = true;

          const percentage =
            exemptionApplied.percentage || 0;

          if (percentage > 0) {
            discountPercentage =
              percentage;

            discountAmount =
              (fee.amount * percentage) /
              100;

            discountReason =
              exemptionApplied.type ===
              'staff_child'
                ? 'Staff Child Exemption'
                : exemptionApplied.type ===
                    'scholarship'
                  ? 'Scholarship'
                  : 'Fee Exemption';
          }
        }

        if (
          assignment.discount_amount &&
          assignment.discount_amount > 0
        ) {
          discountAmount =
            assignment.discount_amount;

          discountPercentage =
            (discountAmount / fee.amount) *
            100;

          if (!discountReason) {
            discountReason =
              metadata.exemption_applied
                ?.type === 'staff_child'
                ? 'Staff Child Exemption'
                : metadata.exemption_applied
                      ?.type === 'scholarship'
                  ? 'Scholarship'
                  : 'Fee Discount';
          }
        }

        const amountDue =
          assignment.amount_due ||
          Math.max(
            0,
            fee.amount - discountAmount
          );

        const feePayments =
          studentPayments?.filter(
            (p) =>
              p.fee_id === fee.id &&
              p.assignment_id ===
                assignment.id
          ) || [];

        const totalPaid =
          feePayments.reduce(
            (sum, p) =>
              sum +
              Number(p.amount_paid || 0),
            0
          );

        const balance = Math.max(
          0,
          amountDue - totalPaid
        );

        feeBalances.push({
          id: fee.id,
          name: fee.name,
          amount: amountDue,
          original_amount: fee.amount,
          paid: totalPaid,
          balance,
          status:
            balance <= 0
              ? 'Paid'
              : 'Unpaid',
          due_date:
            fee.due_date ||
            assignment.due_date ||
            '',
          category:
            fee.category || 'Other',
          discount_amount:
            discountAmount,
          discount_percentage:
            discountPercentage,
          discount_reason:
            discountReason,
          is_exempted:
            isExempted ||
            discountAmount > 0,
          assignment_id:
            assignment.id,
          amount_due:
            amountDue,
          session:
            assignment.session ||
            currentSession,
          term:
            assignment.term ||
            currentTerm,
        });
      }

      return feeBalances;
    } catch (error) {
      console.error(
        'Error fetching fee balances:',
        error
      );

      return [];
    }
  };

  // ============================================================
  // COPY
  // ============================================================

  const copyToClipboard = (
    text: string
  ) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);

        setTimeout(
          () => setCopied(false),
          3000
        );

        toast.success(
          'Copied to clipboard'
        );
      })
      .catch(() => {
        toast.error(
          'Failed to copy'
        );
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
    }, 300);

    if (onPrint) {
      onPrint();
    }
  };

  // ============================================================
  // PDF DOWNLOAD
  // ============================================================

  const handleDownloadPDF =
    async () => {
      if (!receiptRef.current) {
        toast.error(
          'Receipt content not available'
        );
        return;
      }

      setDownloading(true);

      try {
        const element =
          receiptRef.current;

        // Allow barcode and QR code to finish rendering
        await new Promise(
          (resolve) =>
            setTimeout(resolve, 1000)
        );

        const canvas =
          await html2canvas(element, {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,

            onclone: (
              clonedDocument,
              clonedElement
            ) => {
              // --------------------------------------------
              // Fix barcode for html2canvas
              // --------------------------------------------

              const barcodeSvgs =
                clonedElement.querySelectorAll(
                  '.barcode-svg'
                );

              barcodeSvgs.forEach(
                (barcodeSvg) => {
                  const svg =
                    barcodeSvg as SVGSVGElement;

                  svg.style.display =
                    'block';

                  svg.style.width =
                    '560px';

                  svg.style.height =
                    '90px';

                  svg.style.maxWidth =
                    '560px';

                  svg.style.margin =
                    '0 auto';

                  svg.style.backgroundColor =
                    '#ffffff';

                  svg.setAttribute(
                    'preserveAspectRatio',
                    'xMidYMid meet'
                  );
                }
              );

              // --------------------------------------------
              // Fix QR code container
              // --------------------------------------------

              const qrContainers =
                clonedElement.querySelectorAll(
                  '.qr-code-container'
                );

              qrContainers.forEach(
                (container) => {
                  const el =
                    container as HTMLElement;

                  el.style.display =
                    'inline-block';

                  el.style.backgroundColor =
                    '#ffffff';

                  el.style.opacity =
                    '1';
                }
              );

              // --------------------------------------------
              // Remove dark mode backgrounds
              // for clean PDF
              // --------------------------------------------

              const darkElements =
                clonedElement.querySelectorAll(
                  '[class*="dark:"]'
                );

              darkElements.forEach(
                (element) => {
                  const el =
                    element as HTMLElement;

                  if (
                    el.className &&
                    typeof el.className ===
                      'string'
                  ) {
                    el.style.color =
                      '#111827';
                  }
                }
              );
            },
          });

        const imgData =
          canvas.toDataURL(
            'image/png',
            1.0
          );

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [
            canvas.width,
            canvas.height,
          ],
          hotfixes: ['px_scaling'],
        });

        pdf.addImage(
          imgData,
          'PNG',
          0,
          0,
          canvas.width,
          canvas.height
        );

        pdf.save(
          `receipt-${
            payment.receipt_number ||
            'payment'
          }.pdf`
        );

        toast.success(
          'Receipt downloaded successfully!'
        );

        if (onDownload) {
          onDownload();
        }
      } catch (error) {
        console.error(
          'Error downloading PDF:',
          error
        );

        toast.error(
          'Failed to download receipt. Please try printing instead.'
        );
      } finally {
        setDownloading(false);
      }
    };

  // ============================================================
  // SECURITY ICON
  // ============================================================

  const getSecurityIcon = () => {
    switch (securityStatus) {
      case 'authentic':
        return (
          <ShieldCheck className="w-4 h-4 text-green-600" />
        );

      case 'revoked':
        return (
          <ShieldAlert className="w-4 h-4 text-red-600" />
        );

      case 'error':
        return (
          <ShieldAlert className="w-4 h-4 text-orange-600" />
        );

      case 'loading':
        return (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        );

      default:
        return (
          <Shield className="w-4 h-4 text-gray-600" />
        );
    }
  };

  // ============================================================
  // SECURITY COLOR
  // ============================================================

  const getSecurityColor = () => {
    switch (securityStatus) {
      case 'authentic':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';

      case 'revoked':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';

      case 'error':
        return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';

      case 'loading':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';

      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-700/30 dark:border-gray-600';
    }
  };

  // ============================================================
  // TOTALS
  // ============================================================

  const totalOutstanding =
    feeBalances.reduce(
      (sum, fee) =>
        sum + fee.balance,
      0
    );

  const totalDiscounts =
    feeBalances.reduce(
      (sum, fee) =>
        sum +
        (fee.discount_amount || 0),
      0
    );

  const totalOriginalAmount =
    feeBalances.reduce(
      (sum, fee) =>
        sum +
        (fee.original_amount ||
          fee.amount),
      0
    );

  const totalAmountDue =
    feeBalances.reduce(
      (sum, fee) =>
        sum + fee.amount,
      0
    );

  const totalPaid =
    feeBalances.reduce(
      (sum, fee) =>
        sum + fee.paid,
      0
    );

  const hasDiscounts =
    totalDiscounts > 0;

  // ============================================================
  // LOADING
  // ============================================================

  if (loadingBalances) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />

          <p className="text-center mt-4 text-gray-500 dark:text-gray-400">
            Loading receipt...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      {/* ======================================================
          MODAL
      ====================================================== */}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 print:hidden">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">

          {/* Modal Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">

            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Payment Receipt
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {payment.receipt_number}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">

              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                title="Download PDF"
              >
                {downloading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                )}
              </button>

              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

            </div>
          </div>

          {/* ==================================================
              RECEIPT
          ================================================== */}

          <div
            ref={receiptRef}
            id="receipt-content"
            className="p-6 md:p-8 bg-white"
          >
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
              totalOriginalAmount={
                totalOriginalAmount
              }
              totalAmountDue={totalAmountDue}
              totalPaid={totalPaid}
              hasDiscounts={hasDiscounts}
              formatCurrency={formatCurrency}
              copied={copied}
              copyToClipboard={copyToClipboard}
              securityStatus={securityStatus}
              securityMessage={
                securityMessage
              }
              getSecurityIcon={
                getSecurityIcon
              }
              getSecurityColor={
                getSecurityColor
              }
            />
          </div>

          {/* ==================================================
              ACTIONS
          ================================================== */}

          <div className="flex flex-col sm:flex-row gap-3 p-4 border-t border-gray-200 dark:border-gray-700">

            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
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
                  Print
                </>
              )}
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

      {/* ======================================================
          PRINT VERSION
      ====================================================== */}

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
          totalOriginalAmount={
            totalOriginalAmount
          }
          totalAmountDue={totalAmountDue}
          totalPaid={totalPaid}
          hasDiscounts={hasDiscounts}
          formatCurrency={formatCurrency}
          copied={false}
          copyToClipboard={() => {}}
          securityStatus={securityStatus}
          securityMessage={securityMessage}
          getSecurityIcon={
            getSecurityIcon
          }
          getSecurityColor={
            getSecurityColor
          }
        />

      </div>
    </>
  );
};

// ============================================================
// RECEIPT CONTENT
// ============================================================

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
  formatCurrency: (
    amount: number
  ) => string;
  copied: boolean;
  copyToClipboard: (
    text: string
  ) => void;
  securityStatus: string;
  securityMessage: string;
  getSecurityIcon: () => JSX.Element;
  getSecurityColor: () => string;
}

const ReceiptContent: React.FC<
  ReceiptContentProps
> = ({
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
  securityStatus,
  securityMessage,
  getSecurityIcon,
  getSecurityColor,
}) => {

  const isAuthentic =
    securityStatus ===
    'authentic';

  const supabaseUrl =
    import.meta.env
      .VITE_SUPABASE_URL || '';

  const verificationUrl =
    `${supabaseUrl}/functions/v1/verify-receipt`;

  // ============================================================
  // QR VALUE
  // ============================================================

  const qrValue =
    payment.receipt_qr_payload ||
    JSON.stringify({
      v: 2,
      token:
        payment.verification_token ||
        'N/A',
      receipt:
        payment.receipt_number,
      signature:
        payment.receipt_signature ||
        'N/A',
    });

  // ============================================================
  // BARCODE VALUE
  // ============================================================

  const barcodeValue =
    payment.receipt_barcode_payload ||
    `EIS|${payment.receipt_number}|${
      payment.receipt_signature ||
      'N/A'
    }`;

  return (
    <div className="max-w-2xl mx-auto print:max-w-full bg-white text-gray-900">

      {/* ======================================================
          SCHOOL HEADER
      ====================================================== */}

      <div className="text-center border-b-2 border-gray-200 pb-6 mb-6">

        <div className="flex justify-center mb-3">

          {logoUrl ? (
            <img
              src={logoUrl}
              alt={schoolName}
              className="h-16 w-auto object-contain"
              crossOrigin="anonymous"
              onError={(e) => {
                (
                  e.target as HTMLImageElement
                ).src = schoolLogo;
              }}
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              <School className="w-8 h-8" />
            </div>
          )}

        </div>

        <h1 className="text-2xl md:text-3xl font-bold">
          {schoolName}
        </h1>

        {schoolMotto && (
          <p className="text-sm italic text-gray-500 mt-1">
            "{schoolMotto}"
          </p>
        )}

        <div className="text-sm text-gray-600 mt-2 space-y-1">
          <p>
            {schoolAddress}
          </p>

          <p>
            {schoolPhone} | {schoolEmail}
          </p>
        </div>
      </div>

      {/* ======================================================
          RECEIPT TITLE
      ====================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">

        <div>
          <h2 className="text-xl font-bold">
            Payment Receipt
          </h2>

          <p className="text-sm text-gray-500">
            Official payment confirmation
          </p>
        </div>

        <div className="text-right">

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getSecurityColor()}`}
          >
            {getSecurityIcon()}

            <span>
              {securityMessage}
            </span>
          </div>

          <p className="text-xs text-gray-400 mt-1">
            #{payment.receipt_number}
          </p>

        </div>
      </div>

      {/* ======================================================
          SECURITY BADGE
      ====================================================== */}

      <div
        className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border ${getSecurityColor()} mb-6 print:break-inside-avoid`}
      >

        <div className="flex items-center gap-2">
          {getSecurityIcon()}

          <span className="text-xs sm:text-sm font-medium">
            {securityMessage}
          </span>
        </div>

        {isAuthentic && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Cryptographically Verified
          </span>
        )}

      </div>

      {/* ======================================================
          VERIFICATION TOKEN
      ====================================================== */}

      {payment.verification_token && (
        <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200 mb-6 print:break-inside-avoid">

          <div className="flex items-center justify-center gap-2 mb-1">

            <Key className="w-3 h-3 text-gray-500" />

            <p className="text-[10px] sm:text-xs text-gray-500">
              Verification Token
            </p>

          </div>

          <div className="flex items-center justify-center gap-2">

            <p className="text-xs sm:text-sm font-mono font-bold text-blue-600 break-all">
              {payment.verification_token}
            </p>

            <button
              onClick={() =>
                copyToClipboard(
                  payment.verification_token ||
                    ''
                )
              }
              className="p-1 hover:bg-gray-200 rounded transition-all print:hidden"
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 text-gray-400" />
              )}
            </button>

          </div>

          <p className="text-[8px] sm:text-[10px] text-gray-400 mt-1">
            Use this token to verify receipt authenticity online
          </p>

        </div>
      )}

      {/* ======================================================
          STUDENT + PAYMENT INFORMATION
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 print:break-inside-avoid">

        <div className="space-y-4">

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">

            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3" />
              Student Information
            </p>

            <p className="text-sm font-semibold mt-1">
              {studentName}
            </p>

            <p className="text-xs text-gray-500">
              Admission: {studentAdmission}
            </p>

            <p className="text-xs text-gray-500">
              Class: {studentClass}
            </p>

          </div>

          <div className="grid grid-cols-2 gap-3">

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">

              <p className="text-xs text-gray-500">
                Receipt Number
              </p>

              <div className="flex items-center gap-2 mt-1">

                <p className="text-sm font-mono font-semibold break-all">
                  {payment.receipt_number}
                </p>

                <button
                  onClick={() =>
                    copyToClipboard(
                      payment.receipt_number ||
                        ''
                    )
                  }
                  className="p-1 hover:bg-gray-100 rounded transition-all print:hidden flex-shrink-0"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3 text-gray-400" />
                  )}
                </button>

              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">

              <p className="text-xs text-gray-500">
                Payment Date
              </p>

              <p className="text-sm font-semibold">
                {dayjs(
                  payment.payment_date
                ).format(
                  'MMM D, YYYY'
                )}
              </p>

            </div>

          </div>
        </div>

        <div className="space-y-4">

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">

            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Payment Summary
            </p>

            <div className="grid grid-cols-2 gap-4 mt-2">

              <div>
                <p className="text-xs text-gray-500">
                  Amount Paid
                </p>

                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(
                    payment.amount_paid
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Balance
                </p>

                <p
                  className={`text-lg font-bold ${
                    payment.balance &&
                    payment.balance > 0
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  {formatCurrency(
                    payment.balance || 0
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Method
                </p>

                <div className="flex items-center gap-1 mt-1">

                  {payment.payment_method ===
                    'card' ||
                  payment.payment_method ===
                    'paystack' ? (
                    <CreditCard className="w-4 h-4 text-gray-400" />
                  ) : payment.payment_method ===
                      'bank_transfer' ||
                    payment.payment_method ===
                      'offline_bank' ? (
                    <Building2 className="w-4 h-4 text-gray-400" />
                  ) : payment.payment_method ===
                    'cash' ? (
                    <Wallet className="w-4 h-4 text-gray-400" />
                  ) : (
                    <CreditCard className="w-4 h-4 text-gray-400" />
                  )}

                  <span className="text-sm font-medium capitalize break-words">
                    {payment.payment_method?.replace(
                      '_',
                      ' '
                    ) || 'N/A'}
                  </span>

                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Status
                </p>

                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    payment.status ===
                      'completed' ||
                    payment.status ===
                      'paid' ||
                    payment.status ===
                      'approved'
                      ? 'bg-green-100 text-green-700'
                      : payment.status ===
                        'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {payment.status
                    .charAt(0)
                    .toUpperCase() +
                    payment.status.slice(
                      1
                    )}
                </span>
              </div>

            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">

            <p className="text-xs text-gray-500">
              Fee
            </p>

            <p className="text-sm font-semibold break-words">
              {payment.fee_name ||
                'N/A'}
            </p>

            <p className="text-xs text-gray-500 break-all">
              Transaction:{' '}
              {payment.transaction_reference ||
                'N/A'}
            </p>

            {payment.receipt_code && (
              <p className="text-xs text-gray-500">
                Receipt Code:{' '}
                {payment.receipt_code}
              </p>
            )}

          </div>

        </div>
      </div>

      {/* ======================================================
          RECTANGULAR BARCODE
      ====================================================== */}

      <div className="barcode-section bg-gray-50 rounded-lg p-4 text-center border border-gray-200 mb-6 print:break-inside-avoid">

        <div className="flex items-center justify-center gap-2 mb-2">

          <Barcode className="w-4 h-4 text-gray-500" />

          <p className="text-[10px] sm:text-xs text-gray-500">
            Payment Authentication
          </p>

          <Lock className="w-4 h-4 text-gray-400" />

        </div>

        <div className="w-full flex justify-center py-2 bg-white rounded-md overflow-hidden">

          <ReceiptBarcode
            value={barcodeValue}
          />

        </div>

        <p className="text-[8px] sm:text-[10px] text-gray-400 mt-2 font-mono break-all">
          {barcodeValue}
        </p>

        <p className="text-[8px] sm:text-[10px] text-gray-400 mt-1">
          Scan with any barcode scanner to verify authenticity
        </p>

      </div>

      {/* ======================================================
          QR CODE
      ====================================================== */}

      <div className="qr-section text-center mb-6 print:break-inside-avoid">

        <div className="flex items-center justify-center gap-2 mb-2">

          <QrCode className="w-4 h-4 text-gray-500" />

          <p className="text-[10px] sm:text-xs text-gray-500">
            Scan to Verify
          </p>

          <ShieldCheck className="w-4 h-4 text-green-500" />

        </div>

        <div className="qr-code-container inline-block bg-white p-2 rounded-lg border border-gray-200">

          <QRCodeCanvas
            value={qrValue}
            size={150}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            includeMargin={true}
          />

        </div>

        <p className="text-[8px] sm:text-[10px] text-gray-400 mt-1">
          Scan with your phone to verify this receipt
        </p>

        <div className="flex items-center justify-center gap-1 mt-1">

          <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />

          <p className="text-[8px] sm:text-[10px] text-gray-400 break-all">
            Verify at: {verificationUrl}
          </p>

        </div>

      </div>

      {/* ======================================================
          FEE STATEMENT
      ====================================================== */}

      <div className="border-t-2 border-gray-200 pt-6 mt-6 print:break-inside-avoid">

        <div className="flex items-center justify-between mb-4">

          <h3 className="text-lg font-semibold flex items-center gap-2">

            <List className="w-5 h-5 text-blue-500" />

            Fee Statement

          </h3>

          <div className="text-right">

            <p className="text-sm text-gray-500">
              Total Outstanding
            </p>

            <p
              className={`text-xl font-bold ${
                totalOutstanding > 0
                  ? 'text-red-600'
                  : 'text-green-600'
              }`}
            >
              {formatCurrency(
                totalOutstanding
              )}
            </p>

          </div>
        </div>

        {/* Discount */}
        {hasDiscounts && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl print:break-inside-avoid">

            <div className="flex items-center gap-2 text-sm text-green-700">

              <Percent className="w-4 h-4" />

              <span className="font-medium">
                Discount Applied:
              </span>

              <span>
                {formatCurrency(
                  totalDiscounts
                )}
              </span>

              <span className="text-xs text-green-600">
                (
                {totalOriginalAmount >
                0
                  ? (
                      (totalDiscounts /
                        totalOriginalAmount) *
                      100
                    ).toFixed(1)
                  : '0.0'}
                % off)
              </span>

            </div>

            <div className="mt-1 text-xs text-green-600">

              <span>
                Original Total:{' '}
                {formatCurrency(
                  totalOriginalAmount
                )}
              </span>

              <span className="mx-2">
                →
              </span>

              <span>
                Amount Due:{' '}
                {formatCurrency(
                  totalAmountDue
                )}
              </span>

            </div>

          </div>
        )}

        {/* No Fees */}
        {feeBalances.length === 0 ? (

          <div className="text-center py-8 text-gray-500">

            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />

            <p>
              No fees assigned to this student
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto print:overflow-visible">

            <table className="w-full text-sm print:text-xs">

              <thead className="bg-gray-50 print:bg-gray-100">

                <tr>

                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee Name
                  </th>

                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Original
                  </th>

                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>

                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due
                  </th>

                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid
                  </th>

                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>

                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-200">

                {feeBalances.map(
                  (fee, index) => {

                    const hasDiscount =
                      (fee.discount_amount ||
                        0) > 0;

                    return (
                      <tr
                        key={`${fee.id}-${fee.assignment_id}-${index}`}
                        className={`${
                          fee.balance > 0
                            ? 'bg-red-50/30'
                            : ''
                        } ${
                          index % 2 === 0
                            ? 'bg-white'
                            : 'bg-gray-50/50'
                        }`}
                      >

                        <td className="px-3 py-2 font-medium">

                          <div className="flex flex-col">

                            <span className="break-words">
                              {fee.name}
                            </span>

                            <span className="text-[10px] text-gray-400">
                              {fee.session}{' '}
                              {fee.term &&
                                `• ${fee.term}`}
                            </span>

                            {fee.discount_reason && (
                              <span className="text-[10px] text-green-600">
                                {
                                  fee.discount_reason
                                }
                              </span>
                            )}

                          </div>

                        </td>

                        <td
                          className={`px-3 py-2 text-right text-gray-400 text-xs ${
                            hasDiscount
                              ? 'line-through'
                              : ''
                          }`}
                        >
                          {formatCurrency(
                            fee.original_amount ||
                              fee.amount
                          )}
                        </td>

                        <td className="px-3 py-2 text-right text-green-600">
                          {hasDiscount
                            ? formatCurrency(
                                fee.discount_amount ||
                                  0
                              )
                            : '—'}
                        </td>

                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(
                            fee.amount
                          )}
                        </td>

                        <td className="px-3 py-2 text-right text-green-600">
                          {formatCurrency(
                            fee.paid
                          )}
                        </td>

                        <td
                          className={`px-3 py-2 text-right font-medium ${
                            fee.balance > 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          {formatCurrency(
                            fee.balance
                          )}
                        </td>

                        <td className="px-3 py-2 text-center">

                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              fee.balance <= 0
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >

                            {fee.balance <= 0 ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <AlertTriangle className="w-3 h-3" />
                            )}

                            {fee.balance <= 0
                              ? 'Paid'
                              : 'Unpaid'}

                          </span>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

              <tfoot className="bg-gray-50 print:bg-gray-100 border-t-2 border-gray-300">

                <tr>

                  <td className="px-3 py-2 font-semibold">
                    Total
                  </td>

                  <td
                    className={`px-3 py-2 text-right font-semibold text-gray-400 text-xs ${
                      hasDiscounts
                        ? 'line-through'
                        : ''
                    }`}
                  >
                    {formatCurrency(
                      totalOriginalAmount
                    )}
                  </td>

                  <td className="px-3 py-2 text-right font-semibold text-green-600">
                    {formatCurrency(
                      totalDiscounts
                    )}
                  </td>

                  <td className="px-3 py-2 text-right font-semibold">
                    {formatCurrency(
                      totalAmountDue
                    )}
                  </td>

                  <td className="px-3 py-2 text-right font-semibold text-green-600">
                    {formatCurrency(
                      totalPaid
                    )}
                  </td>

                  <td
                    className={`px-3 py-2 text-right font-bold ${
                      totalOutstanding >
                      0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    {formatCurrency(
                      totalOutstanding
                    )}
                  </td>

                  <td />

                </tr>

              </tfoot>

            </table>

          </div>
        )}

      </div>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <div className="mt-6 border-t-2 border-gray-200 pt-4 print:break-inside-avoid">

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">

          <div className="flex items-center gap-2">

            {isAuthentic ? (
              <ShieldCheck className="w-4 h-4 text-green-600" />
            ) : (
              <Shield className="w-4 h-4" />
            )}

            <span>
              {isAuthentic
                ? '✅ Verified Payment'
                : 'Payment'}{' '}
              •{' '}
              {dayjs().format(
                'YYYY-MM-DD HH:mm'
              )}
            </span>

          </div>

          <div className="flex items-center gap-4">

            <div className="flex items-center gap-1">

              <Lock className="w-3 h-3" />

              <span>
                Cryptographically Signed
              </span>

            </div>

          </div>

        </div>

        <div className="text-center mt-3 text-xs text-gray-400">

          <p>
            This is a computer-generated
            receipt. No signature required.
          </p>

          <p className="mt-1">
            © {dayjs().year()} {schoolName}.
            All rights reserved.
          </p>

          {payment.verification_token && (
            <p className="mt-1 text-[10px] font-mono break-all">
              Token:{' '}
              {payment.verification_token}
            </p>
          )}

        </div>

      </div>

    </div>
  );
};

export default ReceiptModal;