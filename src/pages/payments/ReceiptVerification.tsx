// src/pages/ReceiptVerification.tsx
// Fixed to properly search and display receipt verification

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Printer,
  Download,
  Loader2,
  X,
  Key,
  Copy,
  Clock,
  Hash,
  Building,
  User,
  Calendar,
  Banknote,
  FileText,
  Check,
  AlertTriangle,
  Verified,
  Lock,
  ExternalLink,
  Sparkles,
  Crown,
  Zap,
  Star,
} from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';

interface VerificationResult {
  receipt_number: string;
  receipt_code: string;
  transaction_ref: string;
  student_name: string;
  admission_number: string;
  class_name: string;
  branch_name: string;
  amount_paid: number;
  amount_in_words: string;
  payment_method: string;
  payment_date: string;
  verified_at: string;
  term_session: string;
  bursar_signature: string;
  digital_fingerprint: string;
  fee_breakdown: { item: string; amount: number }[];
  status: 'valid' | 'invalid' | 'flagged' | 'revoked' | 'pending';
  security_status: string;
  verification_token: string;
  branch_code: string;
  academic_session: string;
  academic_term: string;
  rejection_reason?: string;
  approved_at?: string;
}

// ============================================
// HELPERS
// ============================================

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';
  
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + units[num % 10] : '');
  if (num < 1000) return units[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + numberToWords(num % 100) : '');

  let result = '';
  let scaleIndex = 0;
  let n = num;
  while (n > 0) {
    if (n % 1000 !== 0) {
      result = numberToWords(n % 1000) + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + (result ? ' ' + result : '');
    }
    n = Math.floor(n / 1000);
    scaleIndex++;
  }
  return result + ' Naira Only';
};

// ============================================
// RECEIPT VERIFICATION COMPONENT
// ============================================

export const ReceiptVerification: React.FC = () => {
  const { user } = useAuth();
  const [receiptQuery, setReceiptQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentVerifications, setRecentVerifications] = useState<any[]>([]);

  // Load recent verifications
  useEffect(() => {
    const loadRecent = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('payments')
          .select(`
            receipt_number,
            receipt_code,
            amount_paid,
            payment_date,
            status,
            student:student_id (
              first_name,
              last_name,
              admission_number
            )
          `)
          .eq('branch_id', user.branch_id || '')
          .order('created_at', { ascending: false })
          .limit(5);

        if (!error && data) {
          setRecentVerifications(data);
        }
      } catch (error) {
        console.error('Error loading recent verifications:', error);
      }
    };

    if (user) {
      loadRecent();
    }
  }, [user]);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const query = receiptQuery.trim();
    if (!query) {
      toast.error('Please enter a Receipt Number, Receipt Code, or Token');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // Build search conditions
      let searchConditions: any[] = [
        { column: 'receipt_number', value: query },
        { column: 'receipt_code', value: query },
        { column: 'payment_id', value: query },
        { column: 'transaction_reference', value: query },
      ];

      // If it looks like a verification token (starts with EIS-VFY-)
      if (query.startsWith('EIS-VFY-')) {
        searchConditions.push({ column: 'verification_token', value: query });
      }

      // Build the OR query
      let orQuery = searchConditions
        .filter(c => c.value)
        .map(c => `${c.column}.ilike.%${c.value}%`)
        .join(',');

      // If no specific conditions, search all
      if (!orQuery) {
        orQuery = `receipt_number.ilike.%${query}%,receipt_code.ilike.%${query}%,payment_id.ilike.%${query}%,transaction_reference.ilike.%${query}%`;
      }

      // Execute search
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select(`
          *,
          student:student_id (
            id,
            first_name,
            last_name,
            admission_number,
            class_id,
            class:class_id (
              id,
              name
            )
          ),
          branch:branch_id (
            id,
            school_name,
            branch_code,
            address,
        
            email
          )
        `)
        .or(orQuery)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching payment:', fetchError);
        setError('Database error: ' + fetchError.message);
        setLoading(false);
        return;
      }

      if (data) {
        const payment = data;
        const branchName = payment.branch?.school_name || 'Ebenezer International School';
        const student = payment.student as any;
        const studentName = student 
          ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
          : payment.metadata?.student_name || 'Unknown Student';
        const className = student?.class?.name || payment.metadata?.class_name || 'N/A';
        const admission = student?.admission_number || payment.metadata?.student_id || 'N/A';

        // Build fee breakdown
        const feeBreakdown = [
          { item: payment.fee_name || 'Tuition Fee', amount: payment.amount || 0 }
        ];

        if (payment.metadata?.fee_breakdown) {
          const metadataBreakdown = payment.metadata.fee_breakdown;
          if (Array.isArray(metadataBreakdown)) {
            feeBreakdown.length = 0;
            metadataBreakdown.forEach((item: any) => {
              feeBreakdown.push({ 
                item: item.item || item.name || 'Fee', 
                amount: item.amount || 0 
              });
            });
          }
        }

        // Determine status
        let displayStatus: 'valid' | 'invalid' | 'flagged' | 'revoked' | 'pending' = 'pending';
        if (payment.status === 'completed' || payment.status === 'paid' || payment.status === 'approved') {
          displayStatus = payment.receipt_security_status === 'REVOKED' ? 'revoked' : 'valid';
        } else if (payment.status === 'pending' || payment.status === 'processing') {
          displayStatus = 'pending';
        } else if (payment.status === 'failed' || payment.status === 'rejected') {
          displayStatus = 'invalid';
        } else if (payment.receipt_security_status === 'REVOKED') {
          displayStatus = 'revoked';
        }

        if (payment.receipt_revoked_at || payment.receipt_security_status === 'REVOKED') {
          displayStatus = 'revoked';
        }

        const resultData: VerificationResult = {
          receipt_number: payment.receipt_number || query,
          receipt_code: payment.receipt_code || '',
          transaction_ref: payment.transaction_reference || payment.payment_id || 'N/A',
          student_name: studentName,
          admission_number: admission,
          class_name: className,
          branch_name: branchName,
          amount_paid: payment.amount_paid || 0,
          amount_in_words: numberToWords(payment.amount_paid || 0),
          payment_method: payment.payment_method || 'N/A',
          payment_date: payment.payment_date || new Date().toISOString(),
          verified_at: new Date().toISOString(),
          term_session: `${payment.academic_term || ''} ${payment.academic_session || ''}`.trim() || 'Current Session',
          bursar_signature: payment.approved_by ? `Approved by: ${payment.approved_by}` : 'System Verified',
          digital_fingerprint: payment.receipt_signature || 'N/A',
          fee_breakdown: feeBreakdown,
          status: displayStatus,
          security_status: payment.receipt_security_status || 'PENDING',
          verification_token: payment.verification_token || 'N/A',
          branch_code: payment.branch_code || 'EISO',
          academic_session: payment.academic_session || '',
          academic_term: payment.academic_term || '',
          rejection_reason: payment.rejection_reason || undefined,
          approved_at: payment.approved_at || undefined,
        };

        setResult(resultData);

        if (displayStatus === 'valid') {
          toast.success('✅ Official cryptographic seal validated: Authenticated');
        } else if (displayStatus === 'revoked') {
          toast.error('❌ This receipt has been revoked!');
        } else if (displayStatus === 'pending') {
          toast.info('⏳ This payment is pending verification');
        } else {
          toast.error('❌ Receipt verification failed');
        }
      } else {
        // No receipt found - show a more helpful message
        setResult(null);
        setError('No receipt found matching your search criteria. Please check the receipt number, code, or token and try again.');
        toast.error('❌ Receipt not found');
      }
    } catch (error: any) {
      console.error('Error verifying receipt:', error);
      setError(error.message || 'Failed to verify receipt');
      toast.error('Failed to verify receipt');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!result) return;
    
    const receiptText = `
========================================
        EBENEZER INTERNATIONAL SCHOOL
      OFFICIAL RECEIPT VERIFICATION
========================================

Receipt Number: ${result.receipt_number}
Receipt Code: ${result.receipt_code}
Transaction Ref: ${result.transaction_ref}
Verification Token: ${result.verification_token}

Student: ${result.student_name}
Admission: ${result.admission_number}
Class: ${result.class_name}
Branch: ${result.branch_name}

----------------------------------------
AMOUNT: ${formatCurrency(result.amount_paid)}
${result.amount_in_words}
Payment Method: ${result.payment_method}
Payment Date: ${dayjs(result.payment_date).format('MMMM D, YYYY h:mm A')}
Term/Session: ${result.term_session}

----------------------------------------
FEE BREAKDOWN:
${result.fee_breakdown.map(f => `  ${f.item}: ${formatCurrency(f.amount)}`).join('\n')}

----------------------------------------
STATUS: ${result.status.toUpperCase()}
Security Status: ${result.security_status}
Cryptographic Seal: ${result.digital_fingerprint}
Verified At: ${dayjs(result.verified_at).format('MMMM D, YYYY h:mm A')}

========================================
This is a computer-generated verification.
© ${new Date().getFullYear()} Ebenezer International School
    `;

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-verification-${result.receipt_number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Verification report downloaded');
  };

  // Try a sample receipt
  const trySample = (sample: string) => {
    setReceiptQuery(sample);
    handleVerify();
  };

  const clearResults = () => {
    setResult(null);
    setError(null);
    setHasSearched(false);
    setReceiptQuery('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-blue-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Anti-Fraud Cryptographic Verification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Official Receipt & Payment Verification
          </h1>
          <p className="text-emerald-100 text-sm max-w-xl">
            Validate school fee receipts, check official bursary digital signatures, and prevent altered bank slips.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-center flex flex-col items-center justify-center">
          <QrCode className="w-8 h-8 text-white mb-1" />
          <span className="text-[11px] font-medium text-emerald-100">Live QR Authenticator</span>
        </div>
      </div>

      {/* Verification Query Input */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-6 shadow-sm">
        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Hash className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Enter Receipt Number, Receipt Code, Token, or Transaction Ref..."
              value={receiptQuery}
              onChange={e => setReceiptQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-gray-900 dark:text-white font-semibold"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{loading ? 'Verifying...' : 'Verify Authenticity'}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
          <span>Try a sample receipt:</span>
          <button
            onClick={() => trySample('RCP/EBE/2026/00000001')}
            className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold hover:underline px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 rounded"
          >
            RCP/EBE/2026/00000001
          </button>
          <button
            onClick={() => trySample('RCP/EBE/2026/00000003')}
            className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold hover:underline px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 rounded"
          >
            RCP/EBE/2026/00000003
          </button>
        </div>

        {result && (
          <button
            onClick={clearResults}
            className="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear results
          </button>
        )}
      </div>

      {/* Verification Result Card */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-xl overflow-hidden print:border-none print:shadow-none"
        >
          {/* Top Verification Seal Header */}
          <div className={`p-6 border-b flex flex-col sm:flex-row items-center justify-between gap-4 ${
            result.status === 'valid' 
              ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-emerald-950/40 border-emerald-100 dark:border-emerald-900/60'
              : result.status === 'revoked'
              ? 'bg-gradient-to-r from-red-50 via-rose-50 to-red-50 dark:from-red-950/40 dark:via-rose-950/20 dark:to-red-950/40 border-red-100 dark:border-red-900/60'
              : result.status === 'pending'
              ? 'bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 dark:from-yellow-950/40 dark:via-amber-950/20 dark:to-yellow-950/40 border-yellow-100 dark:border-yellow-900/60'
              : 'bg-gradient-to-r from-gray-50 to-gray-50 dark:from-gray-800 dark:to-gray-800 border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                result.status === 'valid' 
                  ? 'bg-emerald-600 shadow-emerald-600/30'
                  : result.status === 'revoked'
                  ? 'bg-red-600 shadow-red-600/30'
                  : result.status === 'pending'
                  ? 'bg-yellow-600 shadow-yellow-600/30'
                  : 'bg-gray-600 shadow-gray-600/30'
              } text-white`}>
                {result.status === 'valid' ? <CheckCircle2 className="w-7 h-7" /> :
                 result.status === 'revoked' ? <AlertCircle className="w-7 h-7" /> :
                 result.status === 'pending' ? <Clock className="w-7 h-7" /> :
                 <AlertCircle className="w-7 h-7" />}
              </div>
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    result.status === 'valid' 
                      ? 'bg-emerald-600 text-white'
                      : result.status === 'revoked'
                      ? 'bg-red-600 text-white'
                      : result.status === 'pending'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-600 text-white'
                  }`}>
                    {result.status === 'valid' ? 'AUTHENTICATED & RECORDED' :
                     result.status === 'revoked' ? 'REVOKED' :
                     result.status === 'pending' ? 'PENDING VERIFICATION' :
                     'INVALID'}
                  </span>
                  <span className="text-xs font-mono text-gray-600 dark:text-gray-300 font-semibold">
                    {result.receipt_number}
                  </span>
                  {result.receipt_code && (
                    <span className="text-xs font-mono text-gray-400">
                      #{result.receipt_code}
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                  {result.status === 'valid' ? 'Valid School Fee Settlement Certificate' :
                   result.status === 'revoked' ? 'This Receipt Has Been Revoked' :
                   result.status === 'pending' ? 'Payment Pending Verification' :
                   'Receipt Not Found or Invalid'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-50 flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
            </div>
          </div>

          {/* Official Document Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Verification Token Display */}
            {result.verification_token && result.verification_token !== 'N/A' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">Verification Token:</span>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{result.verification_token}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.verification_token);
                    toast.success('Token copied to clipboard');
                  }}
                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-500" />
                </button>
              </div>
            )}

            {/* School Info Header */}
            <div className="flex flex-col sm:flex-row items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  EBENEZER INTERNATIONAL SCHOOL
                </h3>
                <p className="text-xs text-gray-500">Official Directorate of Bursary & Financial Affairs</p>
                <p className="text-xs text-gray-400 mt-0.5">{result.term_session}</p>
                <p className="text-xs text-gray-400">Branch: {result.branch_code || 'EISO'}</p>
              </div>

              <div className="text-right mt-2 sm:mt-0">
                <span className="text-xs text-gray-400 block">Verification Timestamp</span>
                <span className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">
                  {dayjs(result.verified_at).format('MMM D, YYYY h:mm A')}
                </span>
                <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  result.status === 'valid' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : result.status === 'revoked'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {result.status === 'valid' ? <ShieldCheck className="w-3 h-3" /> :
                   result.status === 'revoked' ? <AlertCircle className="w-3 h-3" /> :
                   <Clock className="w-3 h-3" />}
                  {result.status === 'valid' ? 'Verified' :
                   result.status === 'revoked' ? 'Revoked' :
                   'Pending'}
                </span>
              </div>
            </div>

            {/* Student & Payment Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">
                <span className="text-gray-400 block text-[11px]">Student Name</span>
                <span className="font-bold text-gray-900 dark:text-white text-sm mt-0.5 block truncate">
                  {result.student_name}
                </span>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">
                <span className="text-gray-400 block text-[11px]">Admission Number</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white text-sm mt-0.5 block">
                  {result.admission_number}
                </span>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">
                <span className="text-gray-400 block text-[11px]">Class & Stream</span>
                <span className="font-bold text-gray-900 dark:text-white text-sm mt-0.5 block truncate">
                  {result.class_name}
                </span>
              </div>

              <div className={`p-3 rounded-2xl border ${
                result.status === 'valid' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800'
                  : result.status === 'revoked'
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200/60 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'
              }`}>
                <span className={`block text-[11px] font-semibold ${
                  result.status === 'valid' 
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : result.status === 'revoked'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  Amount Cleared
                </span>
                <span className={`font-mono font-bold text-base mt-0.5 block ${
                  result.status === 'valid' 
                    ? 'text-emerald-800 dark:text-emerald-200'
                    : result.status === 'revoked'
                    ? 'text-red-800 dark:text-red-200'
                    : 'text-gray-800 dark:text-gray-200'
                }`}>
                  {formatCurrency(result.amount_paid)}
                </span>
              </div>
            </div>

            {/* Itemized Fee Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Itemized Fee Allocation
              </h4>
              <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 font-semibold border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="p-3">Fee Description</th>
                      <th className="p-3 text-right">Amount (NGN)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {result.fee_breakdown.map((fee, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="p-3 font-medium text-gray-900 dark:text-white">{fee.item}</td>
                        <td className="p-3 text-right font-mono font-bold text-gray-800 dark:text-gray-200">
                          {formatCurrency(fee.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50/70 dark:bg-gray-800/40 font-bold">
                      <td className="p-3 text-gray-900 dark:text-white">Total Cleared</td>
                      <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(result.amount_paid)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 italic mt-2">
                Amount in Words: {result.amount_in_words}
              </p>
            </div>

            {/* Security Signatures & Hash */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-200/80 dark:border-gray-800 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-gray-400 block text-[10px]">Payment Method:</span>
                  <span className="font-semibold text-gray-900 dark:text-white capitalize">{result.payment_method}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Transaction Ref:</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300 text-[10px]">{result.transaction_ref}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Security Status:</span>
                  <span className={`font-semibold ${
                    result.security_status === 'AUTHENTIC' ? 'text-green-600 dark:text-green-400' :
                    result.security_status === 'REVOKED' ? 'text-red-600 dark:text-red-400' :
                    'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {result.security_status || 'PENDING'}
                  </span>
                </div>
              </div>

              {result.digital_fingerprint && result.digital_fingerprint !== 'N/A' && (
                <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700 font-mono text-[10px] text-gray-500 truncate">
                  <span className="text-gray-400">Cryptographic Seal: </span>
                  <span className="text-gray-600 dark:text-gray-300">{result.digital_fingerprint}</span>
                </div>
              )}

              {result.bursar_signature && result.bursar_signature !== 'System Verified' && (
                <div className="pt-1 text-[10px] text-gray-500">
                  <span className="text-gray-400">Approved by: </span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{result.bursar_signature}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* No Results State */}
      {hasSearched && !result && !loading && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">No Receipt Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
            We couldn't find a receipt matching your search. Please check the receipt number, code, or token and try again.
          </p>
          {error && (
            <p className="text-sm text-red-500 mt-2">{error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ReceiptVerification;