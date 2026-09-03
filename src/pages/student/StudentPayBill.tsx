// src/pages/student/StudentPayBill.tsx — FULL FIXED VERSION WITH SCHOOL LOGO & ACCOUNT DETAILS

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { 
  ArrowLeft, 
  Wallet, 
  RefreshCw, 
  ChevronDown,
  Calendar,
  FileText,
  CreditCard,
  Building2,
  Banknote,
  Info,
  Shield,
  Loader2,
  Send,
  Search,
  Copy,
  Check,
  Upload,
  File,
  Trash2,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  GraduationCap,
  Receipt,
  Printer,
  Download,
  Eye,
  ZoomIn,
  ReceiptText,
  ChevronUp,
  Circle,
  Gift,
  Tag,
  Sparkles,
  QrCode,
  Barcode,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Verified,
  ExternalLink,
  Key,
  ListChecks
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { usePaymentData } from '../../hooks/usePaymentData';
import { supabase } from '../../config/supabase/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import JsBarcode from 'jsbarcode';
import { QRCodeCanvas } from 'qrcode.react';
import transferSuccessImg from '../../assets/transfer.png';
import failedImg from '../../assets/failed.png';
import remitaSoonImg from '../../assets/remitasoon.png';
import schoolLogoImg from '../../assets/school-logo.png'; // Import school logo

// ============================================
// TYPES
// ============================================
interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  class_name?: string;
  passport_url?: string;
  branch_id: string;
  email?: string;
  admission_number?: string;
  class_id?: string;
}

interface PaymentRecord {
  id: string;
  payment_id: string;
  receipt_number: string;
  receipt_code?: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  status: string;
  gateway_reference?: string;
  failure_reason?: string;
  payment_proof_url?: string;
  assignment_id?: string;
  transaction_reference?: string;
  metadata?: any;
  gateway_response?: any;
  academic_session?: string;
  academic_term?: string;
  verification_token?: string;
  receipt_signature?: string;
  receipt_barcode_payload?: string;
  receipt_qr_payload?: string;
  receipt_security_status?: string;
  receipt_revoked_at?: string;
  branch_code?: string;
  term_id?: string;
  session_id?: string;
}

interface WaiverBreakdownItem {
  item_name: string;
  amount: number;
  waiver_amount: number;
  original_amount: number;
  waiver_percentage?: number;
  final_amount?: number;
}

interface ReceiptSecurityData {
  signature: string;
  barcodePayload: string;
  qrPayload: string;
  verificationUrl: string;
  receiptNumber: string;
  verificationToken: string;
}

interface BankAccount {
  id: string;
  label: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  sort_code?: string;
  currency?: string;
  support_phone?: string;
  support_email?: string;
  payment_instructions?: string;
  is_active?: boolean;
}

type PaymentMethodType = 'remita' | 'bank_transfer';

// ============================================
// UTILITY FUNCTIONS
// ============================================
const formatCurrency = (amount: number | null | undefined) => {
  const num = amount || 0;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const generatePaymentId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PAY-${timestamp}-${random}`;
};

const generateAlphanumeric = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateBranchReceiptCode = (branchCode: string, session: string, sequence: number): string => {
  const alphanumeric = generateAlphanumeric(6);
  return `${branchCode}/${session}/${alphanumeric}`;
};

const generateVerificationToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = 'EIS-VFY-';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

const createReceiptSignature = async (paymentId: string): Promise<ReceiptSecurityData | null> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      const verificationToken = generateVerificationToken();
      const signature = `EIS-SIG-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const barcodePayload = `EIS|${paymentId}|${signature}`;
      const qrPayload = JSON.stringify({
        v: 2,
        token: verificationToken,
        receipt: paymentId,
        signature: signature,
      });
      
      return {
        signature,
        barcodePayload,
        qrPayload,
        verificationUrl: `${supabaseUrl}/functions/v1/verify-receipt`,
        receiptNumber: paymentId,
        verificationToken,
      };
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/create-receipt-signature`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ paymentId }),
      }
    );

    if (!response.ok) {
      const verificationToken = generateVerificationToken();
      return {
        signature: `EIS-SIG-${Date.now()}`,
        barcodePayload: `EIS|${paymentId}|fallback`,
        qrPayload: JSON.stringify({ v: 1, receipt: paymentId }),
        verificationUrl: `${supabaseUrl}/functions/v1/verify-receipt`,
        receiptNumber: paymentId,
        verificationToken,
      };
    }

    const data = await response.json();
    
    if (!data.success) {
      return null;
    }

    return {
      signature: data.signature,
      barcodePayload: data.barcodePayload,
      qrPayload: data.qrPayload,
      verificationUrl: data.verificationUrl,
      receiptNumber: data.receiptNumber,
      verificationToken: data.verificationToken || generateVerificationToken(),
    };
  } catch (error) {
    const verificationToken = generateVerificationToken();
    return {
      signature: `EIS-SIG-${Date.now()}`,
      barcodePayload: `EIS|${paymentId}|fallback-${Date.now()}`,
      qrPayload: JSON.stringify({ v: 1, receipt: paymentId }),
      verificationUrl: `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/verify-receipt`,
      receiptNumber: paymentId,
      verificationToken,
    };
  }
};

// ============================================
// NORMALIZE BANK ACCOUNTS
// ============================================
const normalizeBankAccounts = (gatewayRows: any[]): BankAccount[] => {
  const accounts: BankAccount[] = [];
  const seen = new Set<string>();

  const add = (raw: any, fallbackIndex?: number) => {
    if (!raw || typeof raw !== 'object') return;
    const accountNumber = String(
      raw.account_number ?? raw.bank_account_number ?? raw.accountNumber ?? ''
    ).trim();
    if (!accountNumber) return;

    const bankName = String(raw.bank_name ?? raw.bankName ?? raw.bank ?? '').trim();
    const accountName = String(
      raw.account_name ?? raw.bank_account_name ?? raw.accountName ?? ''
    ).trim();
    const index = raw.account_index ?? raw.accountIndex ?? fallbackIndex ?? accounts.length + 1;
    const id = String(raw.id ?? raw.key ?? raw.gateway_key ?? `bank_transfer_${index}`);
    const dedupeKey = `${bankName}|${accountNumber}|${accountName}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    accounts.push({
      id,
      label: String(raw.label ?? raw.name ?? `Bank Account ${index}`),
      bank_name: bankName || 'Bank',
      account_number: accountNumber,
      account_name: accountName || 'School Account',
      sort_code: raw.sort_code ?? raw.sortCode,
      currency: raw.currency || 'NGN',
      support_phone: raw.support_phone ?? raw.supportPhone,
      support_email: raw.support_email ?? raw.supportEmail,
      payment_instructions: raw.payment_instructions ?? raw.paymentInstructions,
      is_active: raw.is_active !== false,
    });
  };

  const walkMetadata = (metadata: any) => {
    if (!metadata || typeof metadata !== 'object') return;

    const arrays = [
      metadata.bank_accounts,
      metadata.bankAccounts,
      metadata.bank_transfer_accounts,
      metadata.bankTransferAccounts,
      metadata.accounts,
    ];
    arrays.forEach((arr: any) => {
      if (Array.isArray(arr)) arr.forEach((item, i) => add(item, i + 1));
    });

    Object.entries(metadata).forEach(([key, value]) => {
      if (/^bank_transfer_\d+$/i.test(key) || /^bank_account_\d+$/i.test(key)) {
        if (Array.isArray(value)) value.forEach((item, i) => add(item, i + 1));
        else add(value, Number(key.match(/\d+$/)?.[0]) || undefined);
      }
    });
  };

  gatewayRows.forEach((row, rowIndex) => {
    if (!row) return;
    walkMetadata(row.metadata);
    add(row, rowIndex + 1);
  });

  return accounts.filter(account => account.is_active !== false);
};

// ============================================
// FEE BREAKDOWN DISPLAY
// ============================================
const FeeBreakdownDisplay: React.FC<{
  breakdown: any[];
  totalAmount: number;
  feeName: string;
  isLoading: boolean;
  feeDetails: any;
  assignment: any;
  formatCurrencyFn: (amount: number) => string;
}> = ({ breakdown, totalAmount, feeName, isLoading, feeDetails, assignment, formatCurrencyFn }) => {
  const [showFullBreakdown, setShowFullBreakdown] = useState(false);
  
  const safeBreakdown = Array.isArray(breakdown) ? breakdown : [];
  
  const discountAmount = assignment?.discount_amount || 0;
  const waiverInfo = assignment?.metadata?.waiver_applied || null;
  const waiverItems: WaiverBreakdownItem[] = assignment?.waiver_breakdown_items || [];
  
  if (isLoading) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center border border-blue-200 dark:border-blue-800">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
        <p className="text-sm text-gray-500 mt-2">Loading fee breakdown...</p>
      </div>
    );
  }

  if (!safeBreakdown || safeBreakdown.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
        <Info className="w-6 h-6 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">No fee breakdown available</p>
      </div>
    );
  }

  const displayItems = showFullBreakdown ? safeBreakdown : safeBreakdown.slice(0, 4);
  const hasMore = safeBreakdown.length > 4;
  const rawTotal = safeBreakdown.reduce((sum: number, item: any) => sum + (item.amount || item.original_amount || 0), 0) || totalAmount;
  const netTotal = Math.max(0, rawTotal - discountAmount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-50/70 to-indigo-50/70 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-blue-200/80 dark:border-blue-800/80 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg">
            <ReceiptText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              Fee Breakdown
              {discountAmount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <Gift className="w-3 h-3 text-purple-600" />
                  Waiver Active
                </span>
              )}
            </h4>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              {safeBreakdown.length} item{safeBreakdown.length > 1 ? 's' : ''} • {feeDetails?.payment_frequency?.replace(/_/g, ' ') || 'One-time'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Payable</p>
          <div className="flex items-baseline gap-1.5 justify-end">
            {discountAmount > 0 && (
              <span className="text-xs text-gray-400 line-through">
                {formatCurrencyFn(rawTotal)}
              </span>
            )}
            <span className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-400">
              {formatCurrencyFn(discountAmount > 0 ? netTotal : rawTotal)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {displayItems.map((item: any, index: number) => {
          const origAmt = item.original_amount || item.amount || 0;
          
          const matchedWaiverItem = waiverItems.find(
            w => w.item_name?.toLowerCase() === (item.item || item.item_name || '').toLowerCase()
          );
          
          const itemWaiverAmt = item.waiver_amount || matchedWaiverItem?.waiver_amount || 0;
          const isItemWaived = item.waiver_applied || itemWaiverAmt > 0;
          const finalItemAmt = isItemWaived ? Math.max(0, origAmt - itemWaiverAmt) : origAmt;

          const percentage = rawTotal > 0 ? (origAmt / rawTotal) * 100 : 0;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              className="group"
            >
              <div className={`py-2 px-2.5 sm:px-3 rounded-xl transition-all ${
                isItemWaived 
                  ? 'bg-purple-50/80 dark:bg-purple-900/20 border border-purple-200/60 dark:border-purple-800/60' 
                  : 'hover:bg-white/60 dark:hover:bg-gray-800/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="text-[10px] sm:text-xs font-medium text-gray-400 dark:text-gray-500 w-4 sm:w-5">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {item.item || item.item_name || 'Unnamed Item'}
                      </span>
                      {isItemWaived && (
                        <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-md font-medium">
                          <Tag className="w-2.5 h-2.5" />
                          Waived -{formatCurrencyFn(itemWaiverAmt)}
                        </span>
                      )}
                      {item.is_mandatory !== false && !isItemWaived && (
                        <span className="text-[8px] sm:text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex-shrink-0">
                          Required
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 ml-5 sm:ml-6 truncate">
                        {item.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-2 justify-end">
                      {isItemWaived && (
                        <span className="text-xs text-gray-400 line-through">
                          {formatCurrencyFn(origAmt)}
                        </span>
                      )}
                      <span className={`text-xs sm:text-sm font-semibold ${
                        isItemWaived ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-white'
                      }`}>
                        {formatCurrencyFn(finalItemAmt)}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      {percentage.toFixed(1)}% of total
                    </p>
                  </div>
                </div>

                <div className="ml-5 sm:ml-6 mt-1.5 h-1 bg-gray-200/80 dark:bg-gray-700/80 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.6, delay: index * 0.04 }}
                    className={`h-full rounded-full ${
                      isItemWaived 
                        ? 'bg-gradient-to-r from-purple-400 to-pink-500' 
                        : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowFullBreakdown(!showFullBreakdown)}
          className="mt-2 text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-all flex items-center gap-1 font-medium"
        >
          {showFullBreakdown ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Show {safeBreakdown.length - 4} more items
            </>
          )}
        </button>
      )}

      <div className="mt-3 pt-3 border-t border-blue-200/70 dark:border-blue-800/70 space-y-1.5">
        <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-300">
          <span>Subtotal (Base Items)</span>
          <span>{formatCurrencyFn(rawTotal)}</span>
        </div>
        
        {discountAmount > 0 && (
          <div className="flex justify-between items-center text-xs font-medium text-purple-600 dark:text-purple-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Total Waiver / Discount
              {waiverInfo?.type === 'percentage' && ` (${waiverInfo.value}%)`}
            </span>
            <span>-{formatCurrencyFn(discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between items-center text-sm font-bold pt-1.5 border-t border-blue-200 dark:border-blue-800">
          <span className="text-gray-900 dark:text-white">Net Fee Payable</span>
          <span className="text-blue-700 dark:text-blue-400">
            {formatCurrencyFn(discountAmount > 0 ? netTotal : rawTotal)}
          </span>
        </div>

        {waiverItems.length > 0 && discountAmount > 0 && (
          <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-800">
            <p className="text-[10px] font-medium text-purple-600 dark:text-purple-400 mb-1.5 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Waiver Breakdown
            </p>
            <div className="space-y-1">
              {waiverItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px] bg-purple-50/50 dark:bg-purple-900/20 px-2 py-1 rounded-md">
                  <span className="text-gray-600 dark:text-gray-300">{item.item_name}</span>
                  <div className="flex items-center gap-2">
                    {item.original_amount > 0 && (
                      <span className="text-gray-400 line-through text-[9px]">
                        {formatCurrencyFn(item.original_amount)}
                      </span>
                    )}
                    <span className="font-medium text-purple-600 dark:text-purple-400">
                      -{formatCurrencyFn(item.waiver_amount || item.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// SUCCESS RECEIPT MODAL - WITH SCHOOL LOGO & ACCOUNT DETAILS
// ============================================
const SuccessReceiptModal: React.FC<{
  isOpen: boolean;
  isBankTransfer: boolean;
  data: any | null;
  user: any;
  paidFeesCount: number;
  totalFeesCount: number;
  paidPercentage: number;
  onClose: () => void;
  formatCurrencyFn: (amount: number) => string;
}> = ({
  isOpen,
  isBankTransfer,
  data,
  user,
  paidFeesCount,
  totalFeesCount,
  paidPercentage,
  onClose,
  formatCurrencyFn
}) => {
  const [barcodeRef, setBarcodeRef] = useState<SVGSVGElement | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (barcodeRef && data) {
      try {
        const barcodeData = data.barcodePayload || data.receipt_barcode_payload || `EIS|${data.receipt_number}|${data.signature || 'N/A'}`;
        JsBarcode(barcodeRef, barcodeData, {
          format: 'CODE128',
          width: 1.5,
          height: 60,
          displayValue: true,
          fontSize: 14,
          font: 'monospace',
          textMargin: 10,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [barcodeRef, data]);

  if (!isOpen || !data) return null;

  const generateReceiptHTML = () => {
    // Get current date and time
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    // Get account details from metadata
    const metadata = data.metadata || {};
    const accountDetails = {
      bankName: metadata.bank_name || data.bank_name || 'N/A',
      accountNumber: metadata.bank_account_number || data.bank_account_number || 'N/A',
      accountName: metadata.bank_account_name || data.bank_account_name || 'N/A',
      bankAccountId: metadata.bank_account_id || data.bank_account_id || 'N/A',
      sortCode: metadata.sort_code || data.sort_code || 'N/A',
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt - ${data.receipt_number || 'N/A'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', 'Helvetica', sans-serif; 
              padding: 40px 20px; 
              max-width: 900px; 
              margin: 0 auto; 
              background: #f0f2f5;
              color: #1a1a2e;
            }
            .receipt-container { 
              border: 2px solid #1a56db; 
              padding: 40px 35px; 
              border-radius: 16px; 
              background: #ffffff;
              box-shadow: 0 8px 40px rgba(0,0,0,0.1);
              position: relative;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #1a56db; 
              padding-bottom: 20px; 
              margin-bottom: 25px; 
            }
            .header .logo-container {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 15px;
              margin-bottom: 8px;
            }
            .header .logo-container img {
              max-height: 70px;
              width: auto;
              object-fit: contain;
            }
            .header h1 { 
              margin: 0; 
              color: #1a56db; 
              font-size: 26px;
              font-weight: 800;
              letter-spacing: 1px;
            }
            .header .subtitle {
              color: #6b7280;
              font-size: 14px;
              margin-top: 2px;
              letter-spacing: 2px;
            }
            .header .school-address {
              color: #9ca3af;
              font-size: 11px;
              margin-top: 2px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 20px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              background: #f59e0b;
              color: #ffffff;
              margin-top: 8px;
            }
            .status-badge.completed {
              background: #10b981;
            }
            .receipt-meta {
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-wrap: wrap;
              gap: 10px;
              background: #f8fafc;
              padding: 12px 16px;
              border-radius: 8px;
              margin-bottom: 20px;
              border: 1px solid #e5e7eb;
            }
            .receipt-meta .meta-item {
              font-size: 12px;
              color: #6b7280;
            }
            .receipt-meta .meta-item strong {
              color: #1a1a2e;
            }
            .details-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 12px 20px; 
              margin: 20px 0;
              padding: 20px;
              background: #f9fafb;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            .details-grid .label {
              color: #6b7280;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 600;
            }
            .details-grid .value {
              color: #1a1a2e;
              font-size: 13px;
              font-weight: 500;
            }
            .details-grid .value.mono {
              font-family: 'Courier New', monospace;
              font-size: 12px;
            }
            .details-grid .full-width {
              grid-column: 1 / -1;
            }
            .amount-section {
              text-align: center;
              padding: 24px;
              margin: 20px 0;
              background: linear-gradient(135deg, #ecfdf5, #d1fae5);
              border-radius: 12px;
              border: 2px solid #a7f3d0;
            }
            .amount-section .amount-label {
              color: #6b7280;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .amount-section .amount-value {
              font-size: 36px;
              font-weight: 800;
              color: #059669;
              margin-top: 4px;
            }
            .account-details {
              background: #f0f9ff;
              border: 1px solid #bae6fd;
              border-radius: 8px;
              padding: 16px;
              margin: 16px 0;
            }
            .account-details .account-title {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #0369a1;
              font-weight: 600;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .account-details .account-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              font-size: 13px;
              border-bottom: 1px dashed #e0f2fe;
            }
            .account-details .account-row:last-child {
              border-bottom: none;
            }
            .account-details .account-row .ac-label {
              color: #6b7280;
            }
            .account-details .account-row .ac-value {
              color: #1a1a2e;
              font-weight: 500;
            }
            .account-details .account-row .ac-value.mono {
              font-family: 'Courier New', monospace;
              font-weight: 600;
              color: #0369a1;
            }
            .qr-section {
              text-align: center;
              margin: 20px 0;
              padding: 20px;
              background: #f9fafb;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            .qr-section .qr-label {
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 8px;
            }
            .qr-section img {
              max-width: 150px;
              height: auto;
            }
            .footer { 
              text-align: center; 
              border-top: 2px solid #e5e7eb; 
              padding-top: 20px; 
              margin-top: 25px; 
              font-size: 11px; 
              color: #9ca3af;
            }
            .footer .thank-you {
              color: #1a56db;
              font-weight: 600;
              font-size: 16px;
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg);
              font-size: 100px;
              color: rgba(26, 86, 219, 0.03);
              font-weight: 900;
              pointer-events: none;
              z-index: 0;
              letter-spacing: 10px;
            }
            @media print {
              body { padding: 0; background: #fff; }
              .receipt-container { border: none; box-shadow: none; border-radius: 0; padding: 30px; }
              .no-print { display: none !important; }
              .details-grid { background: #f9fafb; }
              .amount-section { background: linear-gradient(135deg, #ecfdf5, #d1fae5); }
            }
            @media (max-width: 600px) {
              .details-grid { grid-template-columns: 1fr; gap: 8px; }
              .receipt-container { padding: 20px 15px; }
              .header h1 { font-size: 20px; }
              .amount-section .amount-value { font-size: 28px; }
              .header .logo-container img { max-height: 50px; }
              .header .logo-container { flex-direction: column; gap: 8px; }
              .receipt-meta { flex-direction: column; align-items: flex-start; }
              .account-details .account-row { flex-direction: column; gap: 2px; }
            }
          </style>
        </head>
        <body>
          <div class="watermark">EIS</div>
          <div class="receipt-container">
            <div class="header">
              <div class="logo-container">
                <img src="${schoolLogoImg}" alt="School Logo" />
                <div>
                  <h1>Ebenezer International School</h1>
                  <div class="subtitle">OFFICIAL PAYMENT RECEIPT</div>
                </div>
              </div>
         
              <div class="status-badge ${data.status === 'completed' ? 'completed' : ''}">
                ${data.status === 'completed' ? '✅ PAID' : '⏳ PENDING VERIFICATION'}
              </div>
            </div>

            <div class="receipt-meta">
              <span class="meta-item">📄 Receipt #: <strong>${data.receipt_number || 'N/A'}</strong></span>
              <span class="meta-item">📅 Date: <strong>${formattedDate}</strong></span>
              <span class="meta-item">⏰ Time: <strong>${formattedTime}</strong></span>
            </div>

            <div class="details-grid">
              <div>
                <div class="label">Payment ID</div>
                <div class="value mono">${data.payment_id || data.id || 'N/A'}</div>
              </div>
              <div>
                <div class="label">Receipt Code</div>
                <div class="value mono">${data.receipt_code || 'N/A'}</div>
              </div>
              <div>
                <div class="label">Student Name</div>
                <div class="value">${data.student_name || 'N/A'}</div>
              </div>
              <div>
                <div class="label">Student ID</div>
                <div class="value mono">${data.student_id || 'N/A'}</div>
              </div>
              <div>
                <div class="label">Class</div>
                <div class="value">${data.class_name || 'N/A'}</div>
              </div>
              <div>
                <div class="label">Fee Type</div>
                <div class="value">${data.fee_name || 'N/A'}</div>
              </div>
              <div>
                <div class="label">Payment Method</div>
                <div class="value" style="text-transform:capitalize;">${data.payment_method || 'N/A'}</div>
              </div>
              <div>
                <div class="label">Transaction Reference</div>
                <div class="value mono">${data.transaction_reference || data.reference || 'N/A'}</div>
              </div>
            </div>

            <!-- Account Details Section -->
            ${isBankTransfer && (data.bank_name || data.bank_account_number) ? `
            <div class="account-details">
              <div class="account-title">🏦 Bank Account Details</div>
              <div class="account-row">
                <span class="ac-label">Bank Name</span>
                <span class="ac-value">${data.bank_name || 'N/A'}</span>
              </div>
              <div class="account-row">
                <span class="ac-label">Account Name</span>
                <span class="ac-value">${data.bank_account_name || 'N/A'}</span>
              </div>
              <div class="account-row">
                <span class="ac-label">Account Number</span>
                <span class="ac-value mono">${data.bank_account_number || 'N/A'}</span>
              </div>
              ${data.sort_code ? `
              <div class="account-row">
                <span class="ac-label">Sort Code</span>
                <span class="ac-value mono">${data.sort_code}</span>
              </div>
              ` : ''}
              <div class="account-row">
                <span class="ac-label">Transaction Reference</span>
                <span class="ac-value mono">${data.transaction_reference || data.reference || 'N/A'}</span>
              </div>
              <div class="account-row">
                <span class="ac-label">Payment Date</span>
                <span class="ac-value">${formattedDate} at ${formattedTime}</span>
              </div>
            </div>
            ` : ''}

            <div class="amount-section">
              <div class="amount-label">Amount Paid</div>
              <div class="amount-value">${formatCurrencyFn(data.amount || 0)}</div>
              <div style="font-size:13px;color:#6b7280;margin-top:4px;">
                ${data.status === 'completed' ? '✅ Payment Confirmed' : '⏳ Awaiting Verification'}
              </div>
            </div>

            ${data.qrPayload ? `
            <div class="qr-section">
              <div class="qr-label">🔐 Scan to Verify</div>
              <img src="data:image/png;base64,${data.qrImage}" alt="QR Code" />
            </div>
            ` : ''}

            <div style="margin:20px 0;padding:15px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;text-align:center;">
              <div style="font-size:13px;color:#166534;">
                ${isBankTransfer 
                  ? '📤 Your bank transfer has been submitted. You will receive a confirmation once verified.'
                  : '✅ Your payment has been successfully processed.'}
              </div>
            </div>

            <div class="footer">
              <div class="thank-you">Thank you for your payment!</div>
              <div style="margin-top:8px;">This is a system-generated receipt. For inquiries, contact support.</div>
              <div style="margin-top:4px;font-size:10px;color:#d1d5db;">Generated: ${formattedDate} at ${formattedTime}</div>
            </div>
          </div>
          <div style="text-align:center;padding:10px;font-size:10px;color:#9ca3af;margin-top:10px;">
            Ebenezer International School • Payment Receipt • v2.0
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      const html = generateReceiptHTML();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      window.print();
    }
  };

  const handleDownload = () => {
    try {
      const html = generateReceiptHTML();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${data.receipt_number || 'payment'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Receipt downloaded as HTML');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download receipt');
    }
  };

  const handleDownloadPNG = async () => {
    try {
      toast.loading('Generating image...');
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = generateReceiptHTML();
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '900px';
      tempDiv.style.padding = '20px';
      tempDiv.style.background = '#ffffff';
      document.body.appendChild(tempDiv);

      const html2canvas = (window as any).html2canvas;
      if (html2canvas) {
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 900,
          height: tempDiv.scrollHeight,
        });
        
        const link = document.createElement('a');
        link.download = `receipt_${data.receipt_number || 'payment'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.dismiss();
        toast.success('Receipt downloaded as PNG');
      } else {
        toast.dismiss();
        handleDownload();
        toast('HTML receipt downloaded. Open in browser to save as PDF.');
      }
      
      document.body.removeChild(tempDiv);
    } catch (error) {
      console.error('PNG download error:', error);
      toast.dismiss();
      toast.error('Failed to download as PNG. Use HTML download instead.');
      handleDownload();
    }
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      const html = generateReceiptHTML();
      const printHtml = html.replace('</body>', `
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 1000);
          };
        <\/script>
      </body>`);
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.focus();
      toast.success('Print dialog opened. Save as PDF.');
    } else {
      toast.error('Please allow popups to print.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex items-center justify-between no-print">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            Payment Receipt
          </h3>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all no-print">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div ref={receiptRef} className="p-4 sm:p-6 space-y-4" id="receipt-content">
          <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src={schoolLogoImg} alt="School Logo" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">Ebenezer International School</h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Official Payment Receipt</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mx-auto mb-3">
              {isBankTransfer ? (
                <img src={transferSuccessImg} alt="Bank Transfer" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
              ) : (
                <img src={transferSuccessImg} alt="Payment Success" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
              )}
            </div>
            <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              {isBankTransfer ? 'Payment Submitted!' : 'Payment Successful!'}
            </h4>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isBankTransfer 
                ? 'Your payment has been submitted for verification'
                : 'Your payment has been confirmed successfully'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col">
              <span className="text-gray-500 dark:text-gray-400">Payment ID</span>
              <span className="font-medium text-gray-900 dark:text-white font-mono text-[10px] sm:text-xs truncate">
                {data.payment_id || data.id || 'N/A'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 dark:text-gray-400">Receipt Number</span>
              <span className="font-medium text-gray-900 dark:text-white font-mono text-[10px] sm:text-xs truncate">
                {data.receipt_number || 'N/A'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 dark:text-gray-400">Date</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {dayjs(data.payment_date || new Date()).format('MMM D, YYYY h:mm A')}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isBankTransfer 
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {isBankTransfer ? 'Pending Verification' : 'Completed'}
              </span>
            </div>
            <div className="flex flex-col col-span-2">
              <span className="text-gray-500 dark:text-gray-400">Student</span>
              <span className="font-medium text-gray-900 dark:text-white">{data.student_name || 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 dark:text-gray-400">Fee</span>
              <span className="font-medium text-gray-900 dark:text-white">{data.fee_name || 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 dark:text-gray-400">Payment Method</span>
              <span className="font-medium text-gray-900 dark:text-white capitalize">{data.payment_method || 'N/A'}</span>
            </div>
            {data.transaction_reference && (
              <div className="flex flex-col col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Transaction Ref</span>
                <span className="font-medium text-gray-900 dark:text-white font-mono text-[10px] sm:text-xs truncate">
                  {data.transaction_reference}
                </span>
              </div>
            )}
          </div>

          {/* Bank Account Details Section */}
          {isBankTransfer && (data.bank_name || data.bank_account_number) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
              <h5 className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4" />
                Bank Account Details
              </h5>
              <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Bank</span>
                  <p className="font-medium text-gray-900 dark:text-white">{data.bank_name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Account Name</span>
                  <p className="font-medium text-gray-900 dark:text-white">{data.bank_account_name || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">Account Number</span>
                  <p className="font-medium text-gray-900 dark:text-white font-mono">{data.bank_account_number || 'N/A'}</p>
                </div>
                {data.sort_code && (
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Sort Code</span>
                    <p className="font-medium text-gray-900 dark:text-white font-mono">{data.sort_code}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">Transaction Reference</span>
                  <p className="font-medium text-gray-900 dark:text-white font-mono text-[10px] sm:text-xs truncate">
                    {data.transaction_reference || data.reference || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="col-span-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <span className="text-gray-500 dark:text-gray-400">Amount Paid</span>
            <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrencyFn(data.amount || 0)}
            </p>
          </div>

          {data.qrPayload && (
            <div className="qr-section text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <QrCode className="w-4 h-4 text-gray-500" />
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Scan to Verify</p>
              </div>
              <div className="inline-block bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
                <QRCodeCanvas
                  value={data.qrPayload}
                  size={150}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
            <div className="flex justify-between text-xs sm:text-sm mb-1">
              <span className="text-gray-500 dark:text-gray-400">Payment Progress</span>
              <span className="font-medium text-gray-900 dark:text-white">{paidPercentage}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(paidPercentage, 100)}%` }}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
              {paidFeesCount} of {totalFeesCount} fees paid
            </p>
          </div>

          <div className="text-center border-t border-gray-200 dark:border-gray-700 pt-3">
            <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
              {isBankTransfer 
                ? 'This payment is pending verification. You will receive a confirmation once approved.'
                : 'Thank you for your payment.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 no-print">
            <button 
              onClick={handlePrint} 
              className="flex-1 min-w-[80px] px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button 
              onClick={handleDownloadPNG} 
              className="flex-1 min-w-[80px] px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              PNG
            </button>
            <button 
              onClick={handleDownloadPDF} 
              className="flex-1 min-w-[80px] px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm flex items-center justify-center gap-2"
            >
              <File className="w-4 h-4" />
              PDF
            </button>
            <button 
              onClick={handleDownload} 
              className="flex-1 min-w-[80px] px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              HTML
            </button>
            <button 
              onClick={onClose} 
              className="flex-1 min-w-[80px] px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:opacity-90 transition-all text-sm"
            >
              Done
            </button>
          </div>
          <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 no-print">
            Download as PNG (image), PDF, or HTML (open in browser)
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// IMAGE UPLOAD PREVIEW
// ============================================
const ImageUploadPreview: React.FC<{
  preview: string | null;
  fileName: string | null;
  onRemove: () => void;
}> = ({ preview, fileName, onRemove }) => {
  const [showFullPreview, setShowFullPreview] = useState(false);

  if (!preview) return null;

  return (
    <>
      <div className="relative group">
        <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {preview.startsWith('data:image') ? (
            <div className="relative">
              <img src={preview} alt="Payment proof preview" className="w-full max-h-48 object-contain" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => setShowFullPreview(true)} className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-all">
                  <ZoomIn className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-6 gap-3 bg-gray-100 dark:bg-gray-700">
              <File className="w-8 h-8 text-blue-500" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                  {fileName || 'File uploaded'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Click to view</p>
              </div>
              <button onClick={() => setShowFullPreview(true)} className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all">
                <Eye className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <button onClick={onRemove} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg z-10">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {showFullPreview && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-2xl w-full max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl overflow-hidden"
            >
              <div className="absolute top-2 right-2 z-10 flex gap-2">
                <button onClick={() => setShowFullPreview(false)} className="p-2 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {preview.startsWith('data:image') ? (
                <img src={preview} alt="Payment proof full view" className="w-full h-auto max-h-[85vh] object-contain" />
              ) : (
                <div className="flex flex-col items-center justify-center p-12">
                  <File className="w-16 h-16 text-blue-500 mb-4" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {fileName || 'File uploaded'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    This file type cannot be previewed
                  </p>
                  <button
                    onClick={() => {
                      if (preview) {
                        const link = document.createElement('a');
                        link.href = preview;
                        link.download = fileName || 'uploaded-file';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    }}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                  >
                    <Download className="w-4 h-4 inline mr-2" />
                    Download File
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

// ============================================
// FAILURE MODAL
// ============================================
const FailureModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  details?: string;
  onRetry: () => void;
  onCancel: () => void;
}> = ({ isOpen, title, message, details, onRetry, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 text-center"
      >
        <div className="flex items-center justify-center mb-3 sm:mb-4">
          <img src={failedImg} alt="Payment Failed" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{title || 'Payment Failed'}</h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
          {message || 'There was an issue processing your payment. Please try again.'}
        </p>
        {details && (
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{details}</p>
        )}
        <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onRetry}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all text-sm"
          >
            Retry
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// REMITA COMING SOON MODAL
// ============================================
const RemitaComingSoonModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-md w-full p-6 sm:p-8 text-center"
      >
        <div className="flex items-center justify-center mb-4">
          <img 
            src={remitaSoonImg} 
            alt="Remita Coming Soon" 
            className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 object-contain"
          />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Remita Coming Soon!
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          We're excited to announce that Remita payment integration is currently in development.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
          Soon you'll be able to make payments directly through Remita. Please use bank transfer in the meantime.
        </p>
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 transition-all"
        >
          Got it
        </button>
      </motion.div>
    </div>
  );
};

// ============================================
// GET ERROR TYPE
// ============================================
const getErrorType = (payment: any): 'cancelled' | 'network' | 'gateway' | 'bank' | 'unknown' => {
  if (!payment) return 'unknown';
  
  const reason = (payment.failure_reason || payment.metadata?.failure_reason || '').toLowerCase();
  const gatewayResponse = payment.gateway_response || payment.metadata?.gateway_response || {};
  
  if (reason.includes('cancelled') || reason.includes('canceled')) return 'cancelled';
  if (reason.includes('network') || reason.includes('timeout')) return 'network';
  if (reason.includes('gateway') || reason.includes('paystack')) return 'gateway';
  if (reason.includes('bank') || reason.includes('transfer')) return 'bank';
  if (gatewayResponse?.status === 'cancelled') return 'cancelled';
  if (gatewayResponse?.status === 'failed') return 'gateway';
  
  return 'unknown';
};

const getErrorTitle = (errorType: string): string => {
  const titles: Record<string, string> = {
    cancelled: 'Payment Cancelled',
    network: 'Network Error',
    gateway: 'Gateway Error',
    bank: 'Bank Transfer Issue',
    unknown: 'Payment Failed'
  };
  return titles[errorType] || titles.unknown;
};

const getErrorDescription = (errorType: string, payment: any): string => {
  const descriptions: Record<string, string> = {
    cancelled: 'You cancelled the payment process. No charges were made to your account.',
    network: 'A network error occurred while processing your payment. Please check your internet connection and try again.',
    gateway: 'There was an issue with the payment gateway. Please try again or use bank transfer.',
    bank: 'There was an issue with your bank transfer. Please verify the account details and try again.',
    unknown: 'An unexpected error occurred. Please try again or contact support.'
  };
  return descriptions[errorType] || descriptions.unknown;
};

const getCategoryBadge = (category: string) => {
  const colors: Record<string, string> = {
    tuition: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    boarding: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    transportation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    uniform: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    books: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    sports: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    extra_curricular: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    '': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
  };
  return colors[category] || colors.other;
};

// ============================================
// MAIN STUDENTPAYBILL COMPONENT
// ============================================
const StudentPayBill: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('bank_transfer');
  const [amount, setAmount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [failureReason, setFailureReason] = useState('');
  const [failureDetails, setFailureDetails] = useState('');
  const [paymentGateway, setPaymentGateway] = useState<any | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | null>(null);
  const [copied, setCopied] = useState(false);
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid' | 'overdue' | 'pending' | 'cancelled' | 'failed' | 'waived'>('all');
  const [expandedFee, setExpandedFee] = useState<string | null>(null);
  const [selectedFailedPayment, setSelectedFailedPayment] = useState<any | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessReceipt, setShowSuccessReceipt] = useState(false);
  const [successPaymentData, setSuccessPaymentData] = useState<any | null>(null);
  const [paymentErrorType, setPaymentErrorType] = useState<'cancelled' | 'network' | 'gateway' | 'bank' | 'unknown'>('unknown');
  
  const [breakdownData, setBreakdownData] = useState<Record<string, any>>({});
  const [loadingBreakdown, setLoadingBreakdown] = useState<Record<string, boolean>>({});
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [transactionReference, setTransactionReference] = useState('');
  const [showBankTransferSuccess, setShowBankTransferSuccess] = useState(false);
  const [bankTransferData, setBankTransferData] = useState<any | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const [showRemitaModal, setShowRemitaModal] = useState(false);
  
  const pendingReferenceRef = useRef<string | null>(null);
  const pendingAmountRef = useRef<number>(0);
  const pendingAssignmentIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userIP, setUserIP] = useState<string>('Not recorded');
  const [userAgent, setUserAgent] = useState<string>('Not recorded');

  const {
    assignments,
    refresh: refreshPaymentData,
  } = usePaymentData(studentProfile?.id || null, studentProfile?.branch_id || null, {
    autoFetch: !!studentProfile?.id && !!studentProfile?.branch_id,
  });

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    setUserAgent(navigator.userAgent);
    const getIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        if (data.ip) setUserIP(data.ip);
      } catch (error) {
        console.log('Could not fetch IP:', error);
      }
    };
    getIP();
  }, []);

  useEffect(() => {
    if (studentProfile?.branch_id) {
      fetchPaymentGateway(studentProfile.branch_id);
    }
  }, [studentProfile]);

  useEffect(() => {
    if (studentProfile?.id) {
      fetchPayments(studentProfile.id);
    }
  }, [studentProfile]);

  useEffect(() => {
    if (user) {
      fetchStudentProfile();
    }
  }, [user]);

  // ============================================
  // DATA FETCHING FUNCTIONS
  // ============================================
  const fetchStudentProfile = async () => {
    setLoading(true);
    try {
      let studentData = null;

      if (user?.id) {
        const { data } = await supabase
          .from('students')
          .select('*, class:class_id (id, name)')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) studentData = data;
      }

      if (!studentData && user?.email) {
        const { data } = await supabase
          .from('students')
          .select('*, class:class_id (id, name)')
          .eq('email', user.email)
          .maybeSingle();

        if (data) studentData = data;
      }

      if (studentData) {
        setStudentProfile({
          ...studentData,
          class_name: studentData.class?.name || 'Class 1-A',
        });
      } else {
        setStudentProfile({
          id: user?.id || 'std_david_001',
          first_name: 'David',
          last_name: 'Okonkwo',
          student_id: 'EBE/2026/042',
          admission_number: 'ADM-8921',
          class_name: 'SS 2 Gold',
          branch_id: 'branch_main_01',
          email: user?.email || 'David.Okonkwo@example.com'
        });
      }
    } catch (error: any) {
      console.error('Error fetching student profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentGateway = async (branchId: string) => {
    setGatewayLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true);

      if (error) {
        console.error('Payment gateway fetch error:', error);
        setPaymentGateway(null);
        setBankAccounts([]);
        setSelectedBankAccount(null);
        return;
      }

      const rows = Array.isArray(data) ? data : data ? [data] : [];
      const primary = rows.find((row: any) => row?.paystack_public_key) || rows[0] || null;
      const accounts = normalizeBankAccounts(rows);

      setPaymentGateway(primary);
      setBankAccounts(accounts);
      setSelectedBankAccount(prev => {
        if (prev && accounts.some(account => account.id === prev.id)) return prev;
        return accounts[0] || null;
      });

      if (!primary?.paystack_public_key && accounts.length > 0) {
        setPaymentMethod('bank_transfer');
      }
    } catch (error) {
      console.error('Error fetching payment gateway:', error);
      setPaymentGateway(null);
      setBankAccounts([]);
      setSelectedBankAccount(null);
    } finally {
      setGatewayLoading(false);
    }
  };

  const fetchPayments = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Payments fetch error:', error);
        return;
      }

      setPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchBreakdownForAssignment = useCallback(async (assignmentId: string, feeId: string) => {
    if (breakdownData[assignmentId]) return;
    if (loadingBreakdown[assignmentId]) return;
    
    setLoadingBreakdown(prev => ({ ...prev, [assignmentId]: true }));
    
    try {
      let breakdown: any[] = [];
      let feeDetails: any = {};
      
      if (feeId) {
        const { data: feeData } = await supabase
          .from('fees')
          .select('metadata, fee_template_id, term, session, payment_frequency, category, amount, due_date, name')
          .eq('id', feeId)
          .maybeSingle();

        if (feeData) {
          feeDetails = {
            term: feeData.term,
            session: feeData.session,
            payment_frequency: feeData.payment_frequency,
            category: feeData.category,
            amount: feeData.amount,
            due_date: feeData.due_date,
            name: feeData.name,
          };
          
          const feeBreakdown = feeData.metadata?.fee_breakdown;
          if (feeBreakdown?.items && Array.isArray(feeBreakdown.items)) {
            breakdown = feeBreakdown.items;
          }
        }
      }
      
      if (!Array.isArray(breakdown)) {
        breakdown = [];
      }
      
      setBreakdownData(prev => ({ 
        ...prev, 
        [assignmentId]: breakdown,
        [`${assignmentId}_details`]: feeDetails 
      }));
    } catch (error) {
      console.error('Error fetching fee breakdown:', error);
    } finally {
      setLoadingBreakdown(prev => ({ ...prev, [assignmentId]: false }));
    }
  }, [breakdownData, loadingBreakdown]);

  // ============================================
  // GENERATE REFERENCE
  // ============================================
  const generateReference = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `EIS-${timestamp}-${random}`;
  };

  // ============================================
  // COPY TO CLIPBOARD
  // ============================================
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success('Copied to clipboard');
  };

  // ============================================
  // FILE HANDLING
  // ============================================
  const handleFileChange = (file: File | null) => {
    setUploadedFile(file);
    setFileName(file?.name || null);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setUploadPreview(null);
      setFileName(null);
    }
  };

  const handleFileRemove = () => {
    setUploadedFile(null);
    setUploadPreview(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ============================================
  // REFRESH DATA
  // ============================================
  const refreshData = async () => {
    if (!studentProfile) return;
    setRefreshing(true);
    try {
      await Promise.all([
        refreshPaymentData(),
        fetchPayments(studentProfile.id),
        fetchPaymentGateway(studentProfile.branch_id)
      ]);
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // ============================================
  // GET PAYMENT STATUS FOR ASSIGNMENT
  // ============================================
  const getPaymentStatusForAssignment = (assignment: any) => {
    const assignmentPayments = payments.filter(
      p => p.assignment_id === assignment.id
    );

    const completedPayments = assignmentPayments.filter(
      p => p.status === 'completed' || p.status === 'success'
    );

    const pendingPayments = assignmentPayments.filter(
      p => p.status === 'pending' || p.status === 'processing'
    );

    const failedPayments = assignmentPayments.filter(
      p => p.status === 'failed' || p.status === 'rejected'
    );

    const cancelledPayments = assignmentPayments.filter(
      p => p.status === 'cancelled' || p.status === 'canceled'
    );

    const totalPaidFromPayments = completedPayments.reduce(
      (sum, p) => sum + Number(p.amount_paid || p.amount || 0),
      0
    );

    const amountDue = Number(
      assignment.amount_due ??
      assignment.original_amount ??
      assignment.amount ??
      0
    );

    const storedBalance = Number(assignment.balance || 0);
    const calculatedBalance = Math.max(0, amountDue - totalPaidFromPayments);
    const balance = completedPayments.length > 0 ? calculatedBalance : storedBalance || calculatedBalance;

    let status = assignment.payment_status || 'unpaid';
    let label = 'Unpaid';
    let badgeColor = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    let isPayable = false;
    let icon = Clock;

    if (pendingPayments.length > 0) {
      status = 'pending';
      label = 'Pending';
      badgeColor = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      isPayable = false;
      icon = Clock;
    } else if (cancelledPayments.length > 0) {
      status = 'cancelled';
      label = 'Cancelled';
      badgeColor = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      isPayable = true;
      icon = X;
    } else if (failedPayments.length > 0) {
      status = 'failed';
      label = 'Failed';
      badgeColor = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      isPayable = true;
      icon = AlertTriangle;
    } else if (
      assignment.payment_status === 'waived' ||
      (Number(assignment.discount_amount || 0) >= amountDue && amountDue > 0)
    ) {
      status = 'waived';
      label = 'Exempted';
      badgeColor = 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      isPayable = false;
      icon = Shield;
    } else if (balance <= 0) {
      status = 'paid';
      label = 'Paid';
      badgeColor = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      isPayable = false;
      icon = CheckCircle;
    } else if (
      assignment.due_date &&
      new Date(assignment.due_date) < new Date() &&
      balance > 0
    ) {
      status = 'overdue';
      label = 'Overdue';
      badgeColor = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      isPayable = true;
      icon = AlertCircle;
    } else if (balance > 0 && totalPaidFromPayments > 0) {
      status = 'partial';
      label = 'Partial';
      badgeColor = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      isPayable = true;
      icon = AlertCircle;
    } else if (balance > 0) {
      status = 'unpaid';
      label = 'Unpaid';
      badgeColor = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      isPayable = true;
      icon = Clock;
    }

    return {
      status,
      label,
      badgeColor,
      isPayable,
      icon,
      balance,
      amountDue,
      totalPaidFromPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      cancelledPayments,
    };
  };

  // ============================================
  // SAVE PAYMENT RECORD
  // ============================================
  const savePaymentRecord = async (params: {
    assignmentId: string;
    amount: number;
    amountPaid?: number;
    reference: string;
    status: 'pending' | 'success' | 'failed' | 'cancelled';
    failureReason?: string;
    gatewayReference?: string;
    paymentMethod?: string;
    paymentProofUrl?: string;
    paymentProofPath?: string;
    transactionReference?: string;
    bankAccount?: BankAccount | null;
    branchCode?: string;
    academicSession?: string;
    academicTerm?: string;
  }) => {
    try {
      const paymentId = generatePaymentId();
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const receiptCode = params.branchCode 
        ? generateBranchReceiptCode(params.branchCode, params.academicSession || '2026/2027', Date.now())
        : `EISO/${params.academicSession || '2026/2027'}/${generateAlphanumeric(6)}`;

      const paidAmount = params.amountPaid !== undefined 
        ? params.amountPaid 
        : (params.status === 'success' ? params.amount : 0);

      let balanceAmount = params.amount;
      if (params.status === 'success') {
        balanceAmount = 0;
      } else if (params.status === 'pending') {
        balanceAmount = params.amount - paidAmount;
      } else {
        balanceAmount = params.amount;
      }

      const paymentData = {
        payment_id: paymentId,
        receipt_number: receiptNumber,
        receipt_code: receiptCode,
        student_id: studentProfile?.id,
        assignment_id: params.assignmentId,
        fee_id: selectedAssignment?.fee_id,
        amount: params.amount,
        amount_paid: paidAmount,
        balance: Math.max(0, balanceAmount),
        payment_method: params.paymentMethod || 'bank_transfer',
        payment_date: new Date().toISOString(),
        status: params.status === 'success' ? 'completed' : params.status === 'pending' ? 'pending' : params.status === 'cancelled' ? 'cancelled' : 'failed',
        payment_status: params.status === 'success' ? 'completed' : params.status === 'pending' ? 'pending' : params.status === 'cancelled' ? 'cancelled' : 'failed',
        transaction_reference: params.reference,
        gateway_reference: params.gatewayReference || params.reference,
        failure_reason: params.failureReason || null,
        branch_id: studentProfile?.branch_id,
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payment_proof_url: params.paymentProofUrl || null,
        academic_session: params.academicSession || null,
        academic_term: params.academicTerm || null,
        branch_code: params.branchCode || 'EISO',
        gateway_response:
          params.status === 'success'
            ? { success: true, amount: paidAmount }
            : params.status === 'pending'
              ? { pending: true, reason: params.failureReason || null, amount: paidAmount }
              : { failed: true, reason: params.failureReason || 'Payment failed', amount: paidAmount },
        receipt_security_status: params.status === 'success' ? 'AUTHENTIC' : 'PENDING',
        receipt_security_version: 2,
        metadata: {
          student_name: `${studentProfile?.first_name} ${studentProfile?.last_name}`,
          student_id: studentProfile?.id,
          fee_name: selectedAssignment?.fee_name,
          fee_id: selectedAssignment?.fee_id,
          payment_method: params.paymentMethod || 'bank_transfer',
          assignment_id: params.assignmentId,
          reference: params.reference,
          transaction_reference: params.transactionReference || null,
          ip_address: userIP,
          user_agent: userAgent,
          receipt_code: receiptCode,
          bank_account_id: params.bankAccount?.id || null,
          bank_name: params.bankAccount?.bank_name || null,
          bank_account_number: params.bankAccount?.account_number || null,
          bank_account_name: params.bankAccount?.account_name || null,
          sort_code: params.bankAccount?.sort_code || null,
          amount: params.amount,
          amount_paid: paidAmount,
          balance: Math.max(0, balanceAmount),
          status: params.status,
        }
      };

      console.log('💾 Saving payment record:', {
        amount: params.amount,
        amount_paid: paidAmount,
        status: params.status,
        reference: params.reference
      });

      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single();

      if (error) {
        console.error('Error saving payment:', error);
        throw error;
      }

      if (params.status === 'success' && data) {
        const securityData = await createReceiptSignature(data.id);
        if (securityData) {
          await supabase
            .from('payments')
            .update({
              receipt_signature: securityData.signature,
              receipt_barcode_payload: securityData.barcodePayload,
              receipt_qr_payload: securityData.qrPayload,
              receipt_security_status: 'AUTHENTIC',
              verification_token: securityData.verificationToken,
            })
            .eq('id', data.id);
          
          const { data: updatedPayment } = await supabase
            .from('payments')
            .select('*')
            .eq('id', data.id)
            .single();
          
          return updatedPayment || data;
        }
      }

      return data;
    } catch (error) {
      console.error('Error saving payment record:', error);
      throw error;
    }
  };

  // ============================================
  // UPDATE ASSIGNMENT AFTER PAYMENT
  // ============================================
  const updateAssignmentAfterPayment = async (assignmentId: string, amountPaid: number) => {
    try {
      const { data: assignment, error: fetchError } = await supabase
        .from('student_fee_assignments')
        .select('amount_paid, balance, amount_due, payment_status')
        .eq('id', assignmentId)
        .single();

      if (fetchError) {
        console.error('Error fetching assignment:', fetchError);
        throw fetchError;
      }

      if (!assignment) {
        console.error('Assignment not found:', assignmentId);
        return;
      }

      const currentPaid = Number(assignment.amount_paid || 0);
      const newPaid = currentPaid + amountPaid;
      const currentBalance = Number(assignment.balance || 0);
      const newBalance = Math.max(0, currentBalance - amountPaid);
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      console.log(`Updating assignment ${assignmentId}:`, {
        currentPaid,
        amountPaid,
        newPaid,
        currentBalance,
        newBalance,
        newStatus
      });

      const { error: updateError } = await supabase
        .from('student_fee_assignments')
        .update({
          amount_paid: newPaid,
          balance: newBalance,
          payment_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      if (updateError) {
        console.error('Error updating assignment:', updateError);
        throw updateError;
      }

      console.log(`✅ Assignment updated: paid=${newPaid}, balance=${newBalance}, status=${newStatus}`);
      return { newPaid, newBalance, newStatus };
    } catch (error) {
      console.error('Error updating assignment after payment:', error);
      throw error;
    }
  };

  // ============================================
  // HANDLE REMITA PAYMENT (Coming Soon)
  // ============================================
  const handleRemitaPayment = async () => {
    setShowRemitaModal(true);
    setShowPaymentModal(false);
  };

  // ============================================
  // UPLOAD PAYMENT PROOF
  // ============================================
  const uploadPaymentProof = async (file: File, paymentId: string): Promise<{ path: string; url: string } | null> => {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `proof_${paymentId}_${Date.now()}.${fileExt}`;
      const filePath = `payments/${studentProfile?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      return { path: filePath, url: urlData.publicUrl };
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      return null;
    }
  };

  // ============================================
  // HANDLE BANK TRANSFER
  // ============================================
  const handleBankTransfer = async () => {
    if (!selectedAssignment || !studentProfile) {
      toast.error('Missing payment information');
      return;
    }

    if (!selectedBankAccount) {
      toast.error('Please select a bank account.');
      return;
    }

    if (!uploadedFile) {
      toast.error('Please upload proof of payment');
      return;
    }

    if (!transactionReference) {
      toast.error('Please enter the transaction reference from your bank');
      return;
    }

    setProcessing(true);
    setUploading(true);
    const reference = generateReference();

    try {
      const uploadResult = await uploadPaymentProof(uploadedFile, reference);
      
      if (!uploadResult) {
        toast.error('Failed to upload payment proof. Please try again.');
        setProcessing(false);
        setUploading(false);
        return;
      }

      let branchCode = 'EISO';
      if (studentProfile.branch_id) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('branch_code')
          .eq('id', studentProfile.branch_id)
          .single();
        if (branchData?.branch_code) {
          branchCode = branchData.branch_code;
        }
      }

      const paymentRecord = await savePaymentRecord({
        assignmentId: selectedAssignment.id,
        amount: amount,
        amountPaid: amount,
        reference: reference,
        status: 'pending',
        paymentMethod: 'bank_transfer',
        gatewayReference: reference,
        paymentProofUrl: uploadResult.url,
        paymentProofPath: uploadResult.path,
        transactionReference: transactionReference,
        bankAccount: selectedBankAccount,
        branchCode: branchCode,
        academicSession: selectedAssignment.session,
        academicTerm: selectedAssignment.term,
      });

      setUploadedFile(null);
      setUploadPreview(null);
      setTransactionReference('');
      setUploading(false);
      
      await refreshPaymentData();
      if (studentProfile?.id) {
        await fetchPayments(studentProfile.id);
      }

      const bankData = {
        id: paymentRecord?.payment_id || paymentRecord?.id,
        payment_id: paymentRecord?.payment_id,
        receipt_number: paymentRecord?.receipt_number,
        receipt_code: paymentRecord?.receipt_code,
        amount: amount,
        payment_date: paymentRecord?.payment_date || new Date().toISOString(),
        payment_method: 'bank_transfer',
        reference: reference,
        transaction_reference: transactionReference,
        student_name: `${studentProfile?.first_name} ${studentProfile?.last_name}`,
        student_id: studentProfile?.student_id || studentProfile?.admission_number,
        class_name: studentProfile?.class_name,
        fee_name: selectedAssignment?.fee_name,
        status: 'pending',
        bank_name: selectedBankAccount.bank_name,
        bank_account_number: selectedBankAccount.account_number,
        bank_account_name: selectedBankAccount.account_name,
        bank_account_id: selectedBankAccount.id,
        sort_code: selectedBankAccount.sort_code,
        metadata: {
          bank_name: selectedBankAccount.bank_name,
          bank_account_number: selectedBankAccount.account_number,
          bank_account_name: selectedBankAccount.account_name,
          bank_account_id: selectedBankAccount.id,
          sort_code: selectedBankAccount.sort_code,
          transaction_reference: transactionReference,
        }
      };
      
      setBankTransferData(bankData);
      setShowBankTransferSuccess(true);
      setShowSuccessReceipt(true);
      setShowPaymentModal(false);
      setProcessing(false);
      
      toast.success('Payment submitted! Please wait for confirmation.');

    } catch (error: any) {
      console.error('Bank transfer error:', error);
      await savePaymentRecord({
        assignmentId: selectedAssignment.id,
        amount: amount,
        amountPaid: 0,
        reference: reference,
        status: 'failed',
        failureReason: error.message || 'Bank transfer submission failed',
        gatewayReference: reference,
        paymentMethod: 'bank_transfer',
      });
      setFailureReason(error.message || 'Failed to submit bank transfer. Please try again.');
      setShowFailure(true);
      setProcessing(false);
      setUploading(false);
    }
  };

  // ============================================
  // HANDLE PAY NOW
  // ============================================
  const handlePayNow = (assignment: any) => {
    if (!paymentGateway && !gatewayLoading) {
      toast.error('Payment configuration not loaded. Please try again.');
      return;
    }
    
    const statusInfo = getPaymentStatusForAssignment(assignment);
    
    if (statusInfo.status === 'paid') {
      toast.success('✅ This fee is already paid');
      return;
    }
    
    if (statusInfo.status === 'waived') {
      toast.info('🛡️ This fee is exempted');
      return;
    }
    
    if (statusInfo.status === 'pending') {
      toast.info('⏳ Payment is awaiting confirmation');
      return;
    }
    
    if (!statusInfo.isPayable || statusInfo.balance <= 0) {
      toast.info('This fee is not payable at this time');
      return;
    }
    
    setSelectedAssignment(assignment);
    setAmount(statusInfo.balance);
    if (bankAccounts.length > 0) {
      setSelectedBankAccount(prev => prev && bankAccounts.some(account => account.id === prev.id) ? prev : bankAccounts[0]);
    }
    setPaymentMethod('bank_transfer');
    setShowPaymentModal(true);
    handleFileRemove();
    setTransactionReference('');
  };

  // ============================================
  // VIEW ERROR DETAILS
  // ============================================
  const viewErrorDetails = (payment: any) => {
    setSelectedFailedPayment(payment);
    const errorType = getErrorType(payment);
    setPaymentErrorType(errorType);
    setShowErrorModal(true);
  };

  // ============================================
  // HANDLE SUBMIT PAYMENT
  // ============================================
  const handleSubmitPayment = async () => {
    if (!selectedAssignment) {
      toast.error('No fee selected');
      return;
    }

    if (!paymentGateway) {
      toast.error('Payment configuration not loaded. Please try again.');
      return;
    }

    if (paymentMethod === 'remita') {
      handleRemitaPayment();
      return;
    } else {
      if (!selectedBankAccount) {
        toast.error('Please select a bank account.');
        return;
      }
      await handleBankTransfer();
    }
  };

  // ============================================
  // RETRY PAYMENT HANDLER
  // ============================================
  const handleRetryPayment = useCallback((assignment: any) => {
    setShowFailure(false);
    setFailureReason('');
    setFailureDetails('');
    setSelectedFailedPayment(null);
    
    pendingReferenceRef.current = null;
    pendingAmountRef.current = 0;
    pendingAssignmentIdRef.current = null;
    
    setProcessing(false);
    
    refreshData().then(() => {
      handlePayNow(assignment);
    });
  }, [refreshData]);

  // ============================================
  // CALCULATIONS
  // ============================================
  const totalBalance = assignments.reduce((sum, assignment) => {
    const statusInfo = getPaymentStatusForAssignment(assignment);
    return sum + statusInfo.balance;
  }, 0);

  const totalPaid = assignments.reduce((sum, assignment) => {
    const statusInfo = getPaymentStatusForAssignment(assignment);
    return sum + statusInfo.totalPaidFromPayments;
  }, 0);

  const totalDue = assignments.reduce(
    (sum, a) => sum + Number(a.amount_due || 0),
    0
  );

  const completionRate = totalDue > 0 ? Math.min(100, (totalPaid / totalDue) * 100) : 0;

  const paidFeesCount = assignments.filter(a => {
    const statusInfo = getPaymentStatusForAssignment(a);
    return statusInfo.status === 'paid' || statusInfo.balance <= 0;
  }).length;

  const totalFeesCount = assignments.length;
  const paidPercentage = totalFeesCount > 0 ? Math.round((paidFeesCount / totalFeesCount) * 100) : 0;

  // ============================================
  // FILTERING
  // ============================================
  const filteredAssignments = assignments.filter(a => {
    const statusInfo = getPaymentStatusForAssignment(a);

    if (filterStatus === 'all') return true;
    if (filterStatus === 'unpaid') {
      return statusInfo.status === 'unpaid' || statusInfo.status === 'partial';
    }
    if (filterStatus === 'paid') return statusInfo.status === 'paid';
    if (filterStatus === 'overdue') return statusInfo.status === 'overdue';
    if (filterStatus === 'pending') return statusInfo.status === 'pending';
    if (filterStatus === 'waived') return statusInfo.status === 'waived';
    if (filterStatus === 'cancelled') return statusInfo.status === 'cancelled';
    if (filterStatus === 'failed') return statusInfo.status === 'failed';
    return true;
  });

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading your bill details..." />
      </div>
    );
  }

  if (!studentProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold">Student Profile Not Found</h2>
        <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl">
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      
      {/* Header */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 xs:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0" />
              <span className="truncate">Student Pay Bill</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {studentProfile.first_name} {studentProfile.last_name} • {studentProfile.student_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Student Info Card */}
      {studentProfile && (
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-base sm:text-lg md:text-xl font-bold flex-shrink-0">
                {studentProfile.first_name?.[0]}{studentProfile.last_name?.[0]}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {studentProfile.first_name} {studentProfile.last_name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  {studentProfile.class_name || 'Not Assigned'} • {studentProfile.student_id || studentProfile.admission_number}
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right flex-shrink-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total Balance</p>
              <p className={`text-lg sm:text-xl md:text-2xl font-bold ${totalBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {formatCurrency(totalBalance)}
              </p>
            </div>
          </div>

          <div className="mt-3 sm:mt-4">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Payment Progress</span>
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                {Math.round(completionRate)}%
              </span>
            </div>
            <div className="h-1.5 sm:h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(completionRate, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-3 sm:mt-4">
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Total Fees</p>
              <p className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white">{assignments.length}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Paid</p>
              <p className="text-sm sm:text-base md:text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Due</p>
              <p className="text-sm sm:text-base md:text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(totalBalance)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Fee List */}
      {studentProfile && (
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 gap-2 xs:gap-3">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
              <span className="truncate">Your Fees</span>
              <span className="text-xs sm:text-sm font-normal text-gray-500 flex-shrink-0">
                ({filteredAssignments.length} of {assignments.length})
              </span>
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
              >
                <option value="all">All</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="pending">Pending</option>
                <option value="waived">Waived</option>
                <option value="cancelled">Cancelled</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAssignments.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 dark:text-gray-600" />
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">No fees found</p>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                  {filterStatus !== 'all' ? `No ${filterStatus} fees` : 'All fees are paid!'}
                </p>
              </div>
            ) : (
              filteredAssignments.map((assignment) => {
                const statusInfo = getPaymentStatusForAssignment(assignment);
                const isExpanded = expandedFee === assignment.id;
                const breakdown = breakdownData[assignment.id] || [];
                const isLoadingBreakdown = loadingBreakdown[assignment.id] || false;
                const feeDetails = breakdownData[`${assignment.id}_details`] || {};

                return (
                  <div
                    key={assignment.id}
                    className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all ${
                      statusInfo.status === 'overdue' ? 'border-l-4 border-l-red-500' : ''
                    } ${statusInfo.status === 'paid' ? 'border-l-4 border-l-green-500' : ''} ${
                      statusInfo.status === 'pending' ? 'border-l-4 border-l-yellow-500' : ''
                    } ${statusInfo.status === 'waived' ? 'border-l-4 border-l-purple-500' : ''} ${
                      statusInfo.status === 'cancelled' ? 'border-l-4 border-l-gray-500' : ''
                    } ${statusInfo.status === 'failed' ? 'border-l-4 border-l-orange-500' : ''}`}
                  >
                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <span className={`inline-flex px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getCategoryBadge(assignment.fee_category || '')}`}>
                            {assignment.fee_category?.replace(/_/g, ' ') || 'Fee'}
                          </span>
                          <span className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                            {assignment.fee_name || 'Unknown Fee'}
                          </span>
                          {statusInfo.status === 'overdue' && (
                            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              Overdue
                            </span>
                          )}
                          {statusInfo.status === 'pending' && (
                            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              Pending
                            </span>
                          )}
                          {statusInfo.status === 'paid' && (
                            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              Paid
                            </span>
                          )}
                          {statusInfo.status === 'waived' && (
                            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              Exempted
                            </span>
                          )}
                          {statusInfo.status === 'cancelled' && (
                            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400">
                              <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              Cancelled
                            </span>
                          )}
                          {statusInfo.status === 'failed' && (
                            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                              <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              Failed
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-0.5 sm:gap-1">
                            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            Due: {assignment.due_date ? dayjs(assignment.due_date).format('MMM D') : 'N/A'}
                          </span>
                          {assignment.session && assignment.term && (
                            <span className="truncate">{assignment.term} {assignment.session}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-0 xs:ml-4">
                        <p className={`font-bold text-xs sm:text-sm md:text-base ${
                          statusInfo.status === 'paid' ? 'text-green-600 dark:text-green-400' :
                          statusInfo.status === 'waived' ? 'text-purple-600 dark:text-purple-400' :
                          statusInfo.status === 'overdue' ? 'text-red-600 dark:text-red-400' :
                          statusInfo.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                          statusInfo.status === 'cancelled' ? 'text-gray-500 dark:text-gray-400' :
                          statusInfo.status === 'failed' ? 'text-orange-600 dark:text-orange-400' :
                          'text-gray-900 dark:text-white'
                        }`}>
                          {statusInfo.status === 'paid' || statusInfo.status === 'waived' ? '✅' : 
                           statusInfo.status === 'pending' ? '⏳' : 
                           statusInfo.status === 'cancelled' ? '❌' :
                           statusInfo.status === 'failed' ? '⚠️' :
                           formatCurrency(statusInfo.balance)}
                        </p>
                        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                          <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium ${statusInfo.badgeColor}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        {statusInfo.isPayable && statusInfo.balance > 0 && (
                          <button
                            onClick={() => handlePayNow(assignment)}
                            disabled={processing || gatewayLoading}
                            className={`mt-1 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-lg transition-all ${
                              processing || gatewayLoading
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                                : statusInfo.status === 'failed'
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90'
                                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90'
                            }`}
                          >
                            {statusInfo.status === 'failed' ? 'Retry' : 'Pay'}
                          </button>
                        )}
                        {statusInfo.status === 'failed' && (
                          <button
                            onClick={() => {
                              const failedPayment = payments.find(p => 
                                p.assignment_id === assignment.id && 
                                (p.status === 'failed' || p.status === 'rejected')
                              );
                              if (failedPayment) {
                                viewErrorDetails(failedPayment);
                              }
                            }}
                            className="mt-0.5 text-[10px] text-red-500 hover:underline block"
                          >
                            View Error
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (expandedFee === assignment.id) {
                          setExpandedFee(null);
                        } else {
                          setExpandedFee(assignment.id);
                          fetchBreakdownForAssignment(assignment.id, assignment.fee_id);
                        }
                      }}
                      className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all flex items-center gap-1"
                    >
                      {isExpanded ? 'Show less' : 'Show details'}
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3 sm:space-y-4"
                        >
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2.5 sm:p-3">
                              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Assignment ID</p>
                              <p className="text-[10px] sm:text-xs font-mono font-medium text-gray-900 dark:text-white truncate">
                                {assignment.assignment_id || 'N/A'}
                              </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2.5 sm:p-3">
                              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Original Amount</p>
                              <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                                {formatCurrency(assignment.amount_due || 0)}
                              </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2.5 sm:p-3">
                              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Paid</p>
                              <p className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(statusInfo.totalPaidFromPayments || 0)}
                              </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2.5 sm:p-3">
                              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Balance</p>
                              <p className={`text-sm sm:text-base font-bold ${
                                statusInfo.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                              }`}>
                                {formatCurrency(statusInfo.balance || 0)}
                              </p>
                            </div>
                          </div>

                          <FeeBreakdownDisplay
                            breakdown={breakdown}
                            totalAmount={assignment.amount_due || 0}
                            feeName={assignment.fee_name || 'Fee'}
                            isLoading={isLoadingBreakdown}
                            feeDetails={feeDetails}
                            assignment={assignment}
                            formatCurrencyFn={formatCurrency}
                          />

                          {payments.filter(p => p.assignment_id === assignment.id).length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center gap-2 mb-2">
                                <Receipt className="w-4 h-4 text-gray-500" />
                                <h5 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Payment History
                                </h5>
                                <span className="text-[10px] text-gray-400 ml-auto">
                                  {payments.filter(p => p.assignment_id === assignment.id).length} payment(s)
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {payments
                                  .filter(p => p.assignment_id === assignment.id)
                                  .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                                  .map((payment) => {
                                    const isCompleted = payment.status === 'completed' || payment.status === 'success';
                                    const isPending = payment.status === 'pending' || payment.status === 'processing';
                                    const isFailed = payment.status === 'failed' || payment.status === 'rejected';
                                    const isCancelled = payment.status === 'cancelled' || payment.status === 'canceled';
                                    
                                    return (
                                      <div key={payment.id} className="flex items-center justify-between py-1.5 px-2 sm:px-3 rounded-lg bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 text-xs sm:text-sm">
                                        <div className="flex items-center gap-2 min-w-0">
                                          {isCompleted ? (
                                            <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                          ) : isPending ? (
                                            <Clock className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                                          ) : isFailed ? (
                                            <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                                          ) : isCancelled ? (
                                            <X className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                          ) : (
                                            <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                          )}
                                          <span className="font-medium text-gray-900 dark:text-white truncate">
                                            {formatCurrency(payment.amount_paid || payment.amount || 0)}
                                          </span>
                                          <span className="text-gray-500 dark:text-gray-400 hidden xs:inline">
                                            • {dayjs(payment.payment_date).format('MMM D, YYYY')}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                          <span className={`text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                            isCompleted ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            isPending ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                            isFailed ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                            isCancelled ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' :
                                            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                          }`}>
                                            {isCompleted ? 'Complete' :
                                             isPending ? 'Pending' :
                                             isFailed ? 'Failed' :
                                             isCancelled ? 'Cancelled' :
                                             'Unknown'}
                                          </span>
                                          <span className="text-[10px] text-gray-400 uppercase hidden sm:inline">
                                            {payment.payment_method || 'N/A'}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
          <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-gray-200 dark:border-gray-700 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
            Showing {filteredAssignments.length} of {assignments.length} fees
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* PAYMENT MODAL */}
      {/* ============================================ */}
      <AnimatePresence>
        {showPaymentModal && selectedAssignment && paymentGateway && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex items-center justify-between">
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                  Payment Details
                </h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    handleFileRemove();
                    setTransactionReference('');
                  }}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg sm:rounded-xl p-3 sm:p-4 text-white">
                  <p className="text-xs sm:text-sm opacity-80">Total Amount</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold">{formatCurrency(amount)}</p>
                  <p className="text-[10px] sm:text-xs opacity-70 mt-0.5 sm:mt-1 truncate">{selectedAssignment.fee_name}</p>
                </div>

                {/* Payment Method Selection */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {/* Remita Option */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                      paymentMethod === 'remita'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                    }`}
                    onClick={() => setPaymentMethod('remita')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Remita</h4>
                        <p className="text-[10px] sm:text-xs text-blue-500 font-medium">Coming Soon</p>
                      </div>
                    </div>
                    {paymentMethod === 'remita' && (
                      <div className="mt-1.5 flex items-center gap-1 text-blue-600">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-[10px] font-medium">Selected</span>
                      </div>
                    )}
                    <div className="absolute -top-1 -right-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-medium bg-blue-500 text-white shadow-lg">
                        Soon
                      </span>
                    </div>
                  </motion.div>
                  
                  {/* Bank Transfer Option */}
                  {bankAccounts.length > 0 && (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all ${
                        paymentMethod === 'bank_transfer'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                      }`}
                      onClick={() => setPaymentMethod('bank_transfer')}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Bank</h4>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Transfer</p>
                        </div>
                      </div>
                      {paymentMethod === 'bank_transfer' && (
                        <div className="mt-1.5 flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          <span className="text-[10px] font-medium">Selected</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {paymentMethod === 'remita' && (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 sm:p-6 text-center border-2 border-blue-300 dark:border-blue-700">
                    <img 
                      src={remitaSoonImg} 
                      alt="Remita Coming Soon" 
                      className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto mb-3 object-contain"
                    />
                    <h4 className="text-sm sm:text-base font-bold text-blue-700 dark:text-blue-300 mb-1">
                      Remita Integration Coming Soon!
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      We're working on integrating Remita for seamless payments.
                      <br />
                      Please use Bank Transfer in the meantime.
                    </p>
                  </div>
                )}

                {paymentMethod === 'bank_transfer' && bankAccounts.length > 0 && (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Bank Account Selection */}
                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select Bank Account
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {bankAccounts.map((account) => (
                          <button
                            key={account.id}
                            type="button"
                            onClick={() => setSelectedBankAccount(account)}
                            className={`text-left p-3 rounded-xl border-2 transition-all ${
                              selectedBankAccount?.id === account.id
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                {account.label}
                              </span>
                              {selectedBankAccount?.id === account.id && (
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{account.bank_name}</p>
                            <p className="text-xs font-mono font-semibold text-gray-900 dark:text-white mt-0.5">{account.account_number}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bank Details Display */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-1.5 sm:space-y-2 border border-gray-200 dark:border-gray-600">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                        Bank Transfer Details
                      </p>
                      <div className="space-y-1 text-xs sm:text-sm">
                        <div className="flex flex-col xs:flex-row xs:justify-between items-start xs:items-center py-1 border-b border-gray-200 dark:border-gray-600 gap-0.5 xs:gap-0">
                          <span className="text-gray-500">Bank</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedBankAccount?.bank_name || '—'}</span>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between items-start xs:items-center py-1 border-b border-gray-200 dark:border-gray-600 gap-0.5 xs:gap-0">
                          <span className="text-gray-500">Account Name</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedBankAccount?.account_name || '—'}</span>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between items-start xs:items-center py-1 gap-0.5 xs:gap-0">
                          <span className="text-gray-500">Account Number</span>
                          <span className="font-medium text-gray-900 dark:text-white font-mono flex items-center gap-2">
                            {selectedBankAccount?.account_number || '—'}
                            <button
                              onClick={() => copyToClipboard(selectedBankAccount?.account_number || '')}
                              className="p-0.5 sm:p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                            >
                              {copied ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" /> : <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />}
                            </button>
                          </span>
                        </div>
                        {selectedBankAccount?.sort_code && (
                          <div className="flex flex-col xs:flex-row xs:justify-between items-start xs:items-center py-1 border-b border-gray-200 dark:border-gray-600 gap-0.5 xs:gap-0">
                            <span className="text-gray-500">Sort Code</span>
                            <span className="font-medium text-gray-900 dark:text-white font-mono">{selectedBankAccount.sort_code}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Transaction Reference */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Transaction Reference
                      </label>
                      <input
                        type="text"
                        value={transactionReference}
                        onChange={(e) => setTransactionReference(e.target.value)}
                        placeholder="Enter bank transaction reference"
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm dark:text-white"
                      />
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Enter the reference number from your bank transfer</p>
                    </div>

                    {/* Upload Proof */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Upload Payment Proof
                      </label>
                      <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center hover:border-green-500 transition-all">
                        {uploadPreview ? (
                          <ImageUploadPreview
                            preview={uploadPreview}
                            fileName={fileName}
                            onRemove={handleFileRemove}
                          />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-gray-400 mb-1 sm:mb-2" />
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-400">
                              JPEG, PNG, PDF (Max 5MB)
                            </p>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast.error('File size must be less than 5MB');
                                    return;
                                  }
                                  const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
                                  if (!validTypes.includes(file.type)) {
                                    toast.error('Please upload a JPEG, PNG, or PDF file');
                                    return;
                                  }
                                  handleFileChange(file);
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </>
                        )}
                      </div>
                      {uploadPreview && (
                        <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          File ready for upload
                        </p>
                      )}
                    </div>

                    {(selectedBankAccount?.payment_instructions || paymentGateway.payment_instructions) && (
                      <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 whitespace-pre-line">
                          <Info className="w-3 h-3 inline mr-1" />
                          {selectedBankAccount?.payment_instructions || paymentGateway.payment_instructions}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleSubmitPayment}
                  disabled={processing || gatewayLoading || (paymentMethod === 'bank_transfer' && (!uploadedFile || !transactionReference))}
                  className={`w-full px-4 py-2.5 sm:py-3 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base ${
                    paymentMethod === 'remita' 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                      : 'bg-gradient-to-r from-green-500 to-emerald-500'
                  }`}
                >
                  {processing || uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {uploading ? 'Uploading...' : 'Processing...'}
                    </>
                  ) : gatewayLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : paymentMethod === 'remita' ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Coming Soon
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit with Proof
                    </>
                  )}
                </button>

                <p className="text-[10px] sm:text-xs text-center text-gray-400 dark:text-gray-500">
                  {paymentMethod === 'remita' 
                    ? 'Remita integration is coming soon! Use bank transfer for now.'
                    : 'Upload proof of payment for verification'}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================ */}
      {/* REMITA COMING SOON MODAL */}
      {/* ============================================ */}
      <RemitaComingSoonModal
        isOpen={showRemitaModal}
        onClose={() => {
          setShowRemitaModal(false);
          setPaymentMethod('bank_transfer');
        }}
      />

      {/* ============================================ */}
      {/* SUCCESS RECEIPT MODAL */}
      {/* ============================================ */}
      <SuccessReceiptModal
        isOpen={showSuccessReceipt}
        isBankTransfer={showBankTransferSuccess}
        data={showBankTransferSuccess ? bankTransferData : successPaymentData}
        user={user}
        paidFeesCount={paidFeesCount}
        totalFeesCount={totalFeesCount}
        paidPercentage={paidPercentage}
        onClose={() => {
          setShowSuccessReceipt(false);
          setShowBankTransferSuccess(false);
          setSuccessPaymentData(null);
          setBankTransferData(null);
          refreshData();
        }}
        formatCurrencyFn={formatCurrency}
      />

      {/* ============================================ */}
      {/* FAILURE MODAL */}
      {/* ============================================ */}
      <FailureModal
        isOpen={showFailure}
        title={failureReason || 'Payment Failed'}
        message={failureReason || 'There was an issue processing your payment. Please try again.'}
        details={failureDetails}
        onRetry={() => {
          if (selectedAssignment) {
            handleRetryPayment(selectedAssignment);
          } else {
            const unpaidFee = assignments.find(a => {
              const status = getPaymentStatusForAssignment(a);
              return status.isPayable && status.balance > 0;
            });
            if (unpaidFee) {
              handleRetryPayment(unpaidFee);
            } else {
              setShowFailure(false);
              refreshData();
            }
          }
        }}
        onCancel={() => {
          setShowFailure(false);
          setFailureReason('');
          setFailureDetails('');
          handleFileRemove();
          setTransactionReference('');
          setProcessing(false);
          pendingReferenceRef.current = null;
          pendingAmountRef.current = 0;
          pendingAssignmentIdRef.current = null;
          refreshData();
        }}
      />

      {/* ============================================ */}
      {/* ERROR DETAILS MODAL */}
      {/* ============================================ */}
      <AnimatePresence>
        {showErrorModal && selectedFailedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Payment Error Details
                </h3>
                <button
                  onClick={() => {
                    setShowErrorModal(false);
                    setSelectedFailedPayment(null);
                  }}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border ${
                  paymentErrorType === 'cancelled' ? 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600' :
                  paymentErrorType === 'network' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                  paymentErrorType === 'gateway' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
                  'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                      paymentErrorType === 'cancelled' ? 'bg-gray-200 dark:bg-gray-600' :
                      paymentErrorType === 'network' ? 'bg-yellow-200 dark:bg-yellow-900/50' :
                      paymentErrorType === 'gateway' ? 'bg-orange-200 dark:bg-orange-900/50' :
                      'bg-red-200 dark:bg-red-900/50'
                    }`}>
                      {paymentErrorType === 'cancelled' ? <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" /> :
                       paymentErrorType === 'network' ? <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" /> :
                       paymentErrorType === 'gateway' ? <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" /> :
                       <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                        {getErrorTitle(paymentErrorType)}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {getErrorDescription(paymentErrorType, selectedFailedPayment)}
                      </p>
                      {selectedFailedPayment.failure_reason && (
                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 font-mono break-words">
                            <span className="font-medium">Error details:</span> {selectedFailedPayment.failure_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                  <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Payment Information</p>
                  <div className="grid grid-cols-2 gap-1 text-xs sm:text-sm">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedFailedPayment.amount_paid || 0)}</span>
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {dayjs(selectedFailedPayment.payment_date).format('MMM D, YYYY')}
                    </span>
                    <span className="text-gray-500">Method</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {selectedFailedPayment.payment_method || 'Unknown'}
                    </span>
                    <span className="text-gray-500">Reference</span>
                    <span className="font-medium text-gray-900 dark:text-white font-mono text-[10px] sm:text-xs truncate">
                      {selectedFailedPayment.transaction_reference || selectedFailedPayment.gateway_reference || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setShowErrorModal(false);
                      const assignment = assignments.find(a => 
                        a.id === selectedFailedPayment.assignment_id || 
                        a.id === selectedFailedPayment.metadata?.assignment_id
                      );
                      setSelectedFailedPayment(null);
                      if (assignment) {
                        handleRetryPayment(assignment);
                      } else {
                        toast.error('Payment record not found. Please refresh and try again.');
                        refreshData();
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all text-sm"
                  >
                    Retry Payment
                  </button>
                  <button
                    onClick={() => {
                      setShowErrorModal(false);
                      setSelectedFailedPayment(null);
                      refreshData();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      {assignments.some(a => {
        const status = getPaymentStatusForAssignment(a);
        return status.isPayable && status.balance > 0;
      }) && paymentGateway && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full shadow-2xl shadow-green-500/30 flex items-center justify-center hover:scale-110 transition-all z-40"
          onClick={() => {
            const firstUnpaid = assignments.find(a => {
              const status = getPaymentStatusForAssignment(a);
              return status.isPayable && status.balance > 0;
            });
            if (firstUnpaid) {
              handlePayNow(firstUnpaid);
            }
          }}
        >
          <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
        </motion.button>
      )}
    </div>
  );
};

export default StudentPayBill;