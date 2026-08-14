import React, { useMemo, useRef, useState } from 'react';
import { supabase } from '../config/supabase/client';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import {
  ShieldCheck,
  ShieldX,
  Search,
  Printer,
  Download,
  Copy,
  Check,
  Clock3,
  UserCheck,
  CalendarDays,
  CreditCard,
  Receipt,
  Hash,
  Smartphone,
  Globe,
  LockKeyhole,
  RefreshCw,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReceiptData {
  receipt_number?: string;
  receiptNumber?: string;

  verification_token?: string;
  verificationToken?: string;

  amount?: number | string;
  payment_date?: string;
  paymentDate?: string;

  status?: string;

  student_name?: string;
  studentName?: string;

  student_id?: string;
  studentId?: string;

  admission_number?: string;
  admissionNumber?: string;

  payer_name?: string;
  payerName?: string;

  payment_method?: string;
  paymentMethod?: string;

  reference?: string;
  transaction_reference?: string;
  transactionReference?: string;

  approved_by?: string;
  approvedBy?: string;

  approved_by_name?: string;
  approvedByName?: string;

  approved_at?: string;
  approvedAt?: string;

  created_at?: string;
  createdAt?: string;

  updated_at?: string;
  updatedAt?: string;

  verified_at?: string;
  verifiedAt?: string;

  ip_address?: string;
  ipAddress?: string;

  user_agent?: string;
  userAgent?: string;

  branch_name?: string;
  branchName?: string;

  school_name?: string;
  schoolName?: string;

  session?: string;
  academic_session?: string;

  term?: string;
  academic_term?: string;

  fee_name?: string;
  feeName?: string;

  description?: string;

  [key: string]: any;
}

interface VerificationResult {
  valid: boolean;
  message?: string;
  receipt?: ReceiptData;
  data?: ReceiptData;
  [key: string]: any;
}

const VerifyReceipt: React.FC = () => {
  const [receiptNumber, setReceiptNumber] = useState('');
  const [token, setToken] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');

  const receiptCardRef = useRef<HTMLDivElement>(null);

  const receipt = result?.receipt || result?.data || null;

  const getValue = (
    obj: ReceiptData | null | undefined,
    ...keys: string[]
  ) => {
    if (!obj) return undefined;

    for (const key of keys) {
      const value = obj[key];

      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        return value;
      }
    }

    return undefined;
  };

  const displayReceiptNumber = useMemo(
    () =>
      getValue(
        receipt,
        'receipt_number',
        'receiptNumber'
      ) || receiptNumber,
    [receipt, receiptNumber]
  );

  const verificationToken = useMemo(
    () =>
      getValue(
        receipt,
        'verification_token',
        'verificationToken'
      ) || token,
    [receipt, token]
  );

  const approvedBy = getValue(
    receipt,
    'approved_by_name',
    'approvedByName',
    'approved_by',
    'approvedBy'
  );

  const approvedAt = getValue(
    receipt,
    'approved_at',
    'approvedAt'
  );

  const paymentDate = getValue(
    receipt,
    'payment_date',
    'paymentDate'
  );

  const studentName = getValue(
    receipt,
    'student_name',
    'studentName'
  );

  const studentId = getValue(
    receipt,
    'student_id',
    'studentId'
  );

  const admissionNumber = getValue(
    receipt,
    'admission_number',
    'admissionNumber'
  );

  const payerName = getValue(
    receipt,
    'payer_name',
    'payerName'
  );

  const paymentMethod = getValue(
    receipt,
    'payment_method',
    'paymentMethod'
  );

  const transactionReference = getValue(
    receipt,
    'transaction_reference',
    'transactionReference',
    'reference'
  );

  const ipAddress = getValue(
    receipt,
    'ip_address',
    'ipAddress'
  );

  const userAgent = getValue(
    receipt,
    'user_agent',
    'userAgent'
  );

  const schoolName = getValue(
    receipt,
    'school_name',
    'schoolName'
  );

  const branchName = getValue(
    receipt,
    'branch_name',
    'branchName'
  );

  const academicSession = getValue(
    receipt,
    'academic_session',
    'session'
  );

  const academicTerm = getValue(
    receipt,
    'academic_term',
    'term'
  );

  const feeName = getValue(
    receipt,
    'fee_name',
    'feeName'
  );

  const paymentStatus = getValue(
    receipt,
    'status'
  );

  const amount = getValue(receipt, 'amount');

  const verificationTime = new Date();

  const formatDate = (value?: string) => {
    if (!value) return 'Not available';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-NG', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (value?: string) => {
    if (!value) return 'Not available';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('en-NG', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatAmount = (value?: number | string) => {
    if (value === undefined || value === null || value === '') {
      return '₦0.00';
    }

    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      return `₦${value}`;
    }

    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(numericValue);
  };

  const generateQRCode = async (
    receiptNo: string,
    verificationTokenValue?: string
  ) => {
    try {
      const baseUrl = window.location.origin;

      const verificationUrl =
        `${baseUrl}/verify-receipt?receipt=${encodeURIComponent(
          receiptNo
        )}` +
        (verificationTokenValue
          ? `&token=${encodeURIComponent(
              verificationTokenValue
            )}`
          : '');

      const generated = await QRCode.toDataURL(
        verificationUrl,
        {
          width: 260,
          margin: 2,
          errorCorrectionLevel: 'H',
        }
      );

      setQrCode(generated);
    } catch (error) {
      console.error('QR generation error:', error);
    }
  };

  const handleVerify = async () => {
    if (!receiptNumber.trim()) {
      toast.error('Please enter a receipt number');
      return;
    }

    setLoading(true);
    setResult(null);
    setQrCode('');

    try {
      const supabaseUrl =
        import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/verify-receipt`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receiptNumber: receiptNumber.trim(),
            token: token.trim() || undefined,
          }),
        }
      );

      const data: VerificationResult =
        await response.json();

      setResult(data);

      if (data.valid) {
        const returnedReceipt =
          data.receipt || data.data;

        const returnedReceiptNumber =
          getValue(
            returnedReceipt,
            'receipt_number',
            'receiptNumber'
          ) || receiptNumber;

        const returnedToken =
          getValue(
            returnedReceipt,
            'verification_token',
            'verificationToken'
          ) || token;

        await generateQRCode(
          returnedReceiptNumber,
          returnedToken
        );

        toast.success(
          'Receipt verified successfully'
        );
      } else {
        toast.error(
          data.message ||
            'Receipt verification failed'
        );
      }
    } catch (error) {
      console.error('Receipt verification error:', error);

      toast.error(
        'Unable to verify receipt. Please try again.'
      );

      setResult({
        valid: false,
        message:
          'The verification service could not be reached.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const details = [
      `Receipt Number: ${displayReceiptNumber}`,
      `Verification Token: ${verificationToken || 'N/A'}`,
      `Amount: ${formatAmount(amount)}`,
      `Payment Date: ${formatDateTime(paymentDate)}`,
      `Status: ${paymentStatus || 'N/A'}`,
      `Approved By: ${approvedBy || 'N/A'}`,
      `Approved At: ${formatDateTime(approvedAt)}`,
      `Student: ${studentName || 'N/A'}`,
      `Payment Method: ${paymentMethod || 'N/A'}`,
      `Transaction Reference: ${
        transactionReference || 'N/A'
      }`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(details);

      setCopied(true);
      toast.success('Receipt details copied');

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      toast.error('Unable to copy receipt details');
    }
  };

  const handlePrint = () => {
    if (!receiptCardRef.current) return;

    const printWindow = window.open(
      '',
      '_blank',
      'width=900,height=900'
    );

    if (!printWindow) {
      toast.error(
        'Please allow pop-ups to print the receipt'
      );
      return;
    }

    const receiptHtml =
      receiptCardRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt Verification - ${displayReceiptNumber}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 30px;
              font-family: Arial, Helvetica, sans-serif;
              background: #f5f7fb;
              color: #111827;
            }

            .print-wrapper {
              max-width: 850px;
              margin: auto;
              background: white;
            }

            img {
              max-width: 100%;
            }

            @media print {
              body {
                background: white;
                padding: 0;
              }

              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>

        <body>
          <div class="print-wrapper">
            ${receiptHtml}
          </div>

          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleDownloadPDF = async () => {
    if (!receiptCardRef.current) {
      toast.error('Nothing to download');
      return;
    }

    setDownloading(true);

    try {
      const element = receiptCardRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imageData =
        canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      const pageHeight =
        pdf.internal.pageSize.getHeight();

      const margin = 10;

      const availableWidth =
        pageWidth - margin * 2;

      const imageHeight =
        (canvas.height * availableWidth) /
        canvas.width;

      let heightLeft = imageHeight;
      let position = margin;

      pdf.addImage(
        imageData,
        'PNG',
        margin,
        position,
        availableWidth,
        imageHeight
      );

      heightLeft -=
        pageHeight - margin * 2;

      while (heightLeft > 0) {
        position =
          heightLeft -
          imageHeight +
          margin;

        pdf.addPage();

        pdf.addImage(
          imageData,
          'PNG',
          margin,
          position,
          availableWidth,
          imageHeight
        );

        heightLeft -=
          pageHeight - margin * 2;
      }

      const safeReceiptNumber =
        String(displayReceiptNumber)
          .replace(/[^a-zA-Z0-9-_]/g, '_');

      pdf.save(
        `Receipt_Verification_${safeReceiptNumber}.pdf`
      );

      toast.success('PDF downloaded');
    } catch (error) {
      console.error(
        'PDF generation error:',
        error
      );

      toast.error(
        'Unable to generate PDF'
      );
    } finally {
      setDownloading(false);
    }
  };

  const resetVerification = () => {
    setReceiptNumber('');
    setToken('');
    setResult(null);
    setQrCode('');
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-xl">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Receipt Verification
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Verify the authenticity and integrity of a
            school payment receipt using its secure
            receipt number and verification token.
          </p>
        </div>

        {/* Search Card */}
        <div className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.07] shadow-2xl backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-2.5">
                <Search className="h-5 w-5 text-blue-400" />
              </div>

              <div>
                <h2 className="font-bold text-white">
                  Verify a Receipt
                </h2>

                <p className="text-xs text-slate-400">
                  Enter the details printed on the receipt.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2 md:p-8">

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Receipt Number
              </label>

              <div className="relative">
                <Receipt className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) =>
                    setReceiptNumber(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleVerify();
                    }
                  }}
                  placeholder="RCP/EBE/2026/00000001"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Verification Token
                <span className="ml-2 text-xs font-normal text-slate-500">
                  Optional
                </span>
              </label>

              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                <input
                  type="text"
                  value={token}
                  onChange={(e) =>
                    setToken(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleVerify();
                    }
                  }}
                  placeholder="EIS-VFY-SZ7FYNAWYU5C"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                The token can normally be found below
                the receipt security information.
              </p>
            </div>

            <div className="flex gap-3 md:col-span-2">
              <button
                onClick={handleVerify}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Verifying Receipt...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    Verify Receipt
                  </>
                )}
              </button>

              {result && (
                <button
                  onClick={resetVerification}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-slate-300 transition hover:bg-white/10"
                  title="Clear"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div
            ref={receiptCardRef}
            className="overflow-hidden rounded-3xl bg-white shadow-2xl"
          >

            {/* Status Header */}
            <div
              className={`relative overflow-hidden px-6 py-8 sm:px-10 ${
                result.valid
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-800'
                  : 'bg-gradient-to-br from-red-600 to-red-800'
              }`}
            >
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                    {result.valid ? (
                      <ShieldCheck className="h-9 w-9 text-white" />
                    ) : (
                      <ShieldX className="h-9 w-9 text-white" />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white/70">
                      Receipt Security Status
                    </p>

                    <h2 className="text-2xl font-black text-white sm:text-3xl">
                      {result.valid
                        ? 'AUTHENTIC RECEIPT'
                        : 'INVALID RECEIPT'}
                    </h2>

                    <p className="mt-1 text-sm text-white/80">
                      {result.message ||
                        (result.valid
                          ? 'This receipt passed verification.'
                          : 'This receipt could not be verified.')}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-black/10 px-4 py-3 text-sm text-white/80 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    Verified
                  </div>

                  <p className="mt-1 font-semibold text-white">
                    {verificationTime.toLocaleString(
                      'en-NG'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {result.valid && receipt ? (
              <>
                {/* Receipt Identity */}
                <div className="border-b border-slate-200 px-6 py-7 sm:px-10">
                  <div className="grid gap-6 md:grid-cols-2">

                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Receipt Number
                      </p>

                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-blue-600" />

                        <p className="break-all font-mono text-lg font-black text-slate-900">
                          {displayReceiptNumber}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Verification Token
                      </p>

                      <div className="flex items-center gap-2">
                        <LockKeyhole className="h-4 w-4 text-emerald-600" />

                        <p className="break-all font-mono text-sm font-bold text-slate-800">
                          {verificationToken ||
                            'Not supplied'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-6 py-6 sm:grid-cols-3 sm:px-10">

                  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                      <CreditCard className="h-5 w-5 text-emerald-600" />
                    </div>

                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Amount Paid
                    </p>

                    <p className="mt-1 text-2xl font-black text-slate-900">
                      {formatAmount(amount)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                      <CalendarDays className="h-5 w-5 text-blue-600" />
                    </div>

                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Payment Date
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {formatDateTime(paymentDate)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                      <CheckCircle2 className="h-5 w-5 text-purple-600" />
                    </div>

                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Payment Status
                    </p>

                    <p className="mt-1 text-sm font-black uppercase text-emerald-600">
                      {paymentStatus || 'Verified'}
                    </p>
                  </div>
                </div>

                {/* Student Information */}
                {(studentName ||
                  studentId ||
                  admissionNumber ||
                  payerName) && (
                  <div className="border-b border-slate-200 px-6 py-7 sm:px-10">
                    <h3 className="mb-5 text-lg font-black text-slate-900">
                      Payment Information
                    </h3>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                      {studentName && (
                        <InfoItem
                          label="Student"
                          value={studentName}
                        />
                      )}

                      {studentId && (
                        <InfoItem
                          label="Student ID"
                          value={studentId}
                        />
                      )}

                      {admissionNumber && (
                        <InfoItem
                          label="Admission Number"
                          value={admissionNumber}
                        />
                      )}

                      {payerName && (
                        <InfoItem
                          label="Paid By"
                          value={payerName}
                        />
                      )}

                      {feeName && (
                        <InfoItem
                          label="Fee"
                          value={feeName}
                        />
                      )}

                      {paymentMethod && (
                        <InfoItem
                          label="Payment Method"
                          value={paymentMethod}
                        />
                      )}

                      {academicSession && (
                        <InfoItem
                          label="Academic Session"
                          value={academicSession}
                        />
                      )}

                      {academicTerm && (
                        <InfoItem
                          label="Academic Term"
                          value={academicTerm}
                        />
                      )}

                      {transactionReference && (
                        <InfoItem
                          label="Transaction Reference"
                          value={transactionReference}
                          mono
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Approval Information */}
                <div className="border-b border-slate-200 px-6 py-7 sm:px-10">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-2.5">
                      <UserCheck className="h-5 w-5 text-blue-600" />
                    </div>

                    <div>
                      <h3 className="font-black text-slate-900">
                        Payment Approval Audit
                      </h3>

                      <p className="text-xs text-slate-500">
                        Recorded approval information
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">

                    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-500">
                        Approved By
                      </p>

                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                          <UserCheck className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="font-black text-slate-900">
                            {approvedBy ||
                              'Approval information unavailable'}
                          </p>

                          {!approvedBy && (
                            <p className="mt-1 text-xs text-amber-600">
                              Your verification API does
                              not currently return the
                              approver name.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Approval Date & Time
                      </p>

                      <div className="mt-3 flex items-center gap-3">
                        <CalendarDays className="h-5 w-5 text-slate-500" />

                        <p className="font-bold text-slate-900">
                          {formatDateTime(approvedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Audit */}
                {(ipAddress ||
                  userAgent ||
                  branchName ||
                  schoolName) && (
                  <div className="border-b border-slate-200 px-6 py-7 sm:px-10">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="rounded-xl bg-emerald-50 p-2.5">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      </div>

                      <div>
                        <h3 className="font-black text-slate-900">
                          Security & Audit Trail
                        </h3>

                        <p className="text-xs text-slate-500">
                          Technical information associated
                          with this transaction
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">

                      {schoolName && (
                        <InfoItem
                          label="School"
                          value={schoolName}
                        />
                      )}

                      {branchName && (
                        <InfoItem
                          label="Branch"
                          value={branchName}
                        />
                      )}

                      {ipAddress && (
                        <InfoItem
                          label="IP Address"
                          value={ipAddress}
                          icon={<Globe className="h-4 w-4" />}
                          mono
                        />
                      )}

                      {userAgent && (
                        <InfoItem
                          label="Device / Browser"
                          value={userAgent}
                          icon={
                            <Smartphone className="h-4 w-4" />
                          }
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* QR Verification */}
                <div className="border-b border-slate-200 px-6 py-7 sm:px-10">
                  <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:flex-row">

                    <div className="max-w-md">
                      <div className="mb-3 flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />

                        <h3 className="font-black text-slate-900">
                          Secure Verification
                        </h3>
                      </div>

                      <p className="text-sm leading-6 text-slate-500">
                        Scan the QR code to return to the
                        receipt verification page. This
                        provides an additional layer of
                        protection against forged receipts.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          ✓ Receipt Verified
                        </span>

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                          ✓ Token Checked
                        </span>

                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                          ✓ Audit Trail
                        </span>
                      </div>
                    </div>

                    {qrCode ? (
                      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                        <img
                          src={qrCode}
                          alt="Receipt verification QR code"
                          className="h-40 w-40"
                        />

                        <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Scan to verify
                        </p>
                      </div>
                    ) : (
                      <div className="flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300">
                        <span className="text-xs text-slate-400">
                          QR unavailable
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-950 px-6 py-6 text-center sm:px-10">
                  <div className="flex items-center justify-center gap-2 text-emerald-400">
                    <LockKeyhole className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Secure Digital Receipt
                    </span>
                  </div>

                  <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-slate-500">
                    This verification result is generated
                    from the school's receipt verification
                    system. Any alteration to the receipt
                    number, verification token, or underlying
                    payment record may cause verification to
                    fail.
                  </p>
                </div>
              </>
            ) : (
              <div className="px-6 py-12 text-center sm:px-10">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>

                <h3 className="mt-4 text-xl font-black text-slate-900">
                  Verification Failed
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                  {result.message ||
                    'The receipt could not be authenticated. Check the receipt number and verification token and try again.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {result?.valid && receipt && (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">

            <button
              onClick={handlePrint}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-slate-100"
            >
              <Printer className="h-5 w-5" />
              Print Verification
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Download PDF
                </>
              )}
            </button>

            <button
              onClick={handleCopy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              {copied ? (
                <>
                  <Check className="h-5 w-5 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5" />
                  Copy Details
                </>
              )}
            </button>
          </div>
        )}

        {/* Bottom Security Notice */}
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

          <div>
            <p className="text-sm font-bold text-white">
              Anti-Fraud Verification
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              A genuine receipt should have a valid
              receipt number and verification token that
              match the school's payment records. Do not
              rely solely on screenshots or printed copies
              without verifying them here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface InfoItemProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  mono?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({
  label,
  value,
  icon,
  mono,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <div className="flex items-start gap-2">
        {icon && (
          <span className="mt-0.5 shrink-0 text-slate-400">
            {icon}
          </span>
        )}

        <p
          className={`break-words text-sm font-bold text-slate-800 ${
            mono ? 'font-mono text-xs' : ''
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
};

export default VerifyReceipt;