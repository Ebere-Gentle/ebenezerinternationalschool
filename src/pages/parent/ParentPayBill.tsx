// src/pages/parent/ParentPayBill.tsx — FULLY FIXED VERSION

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { 
  ArrowLeft, 
  Wallet, 
  Users, 
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
  ListChecks
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { usePaymentData } from '../../hooks/usePaymentData';
import { supabase } from '../../config/supabase/client';
import { paystackService, type PaymentGateway } from '../../services/paystack';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// ============================================
// TYPES
// ============================================
interface Student {
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
}

interface WaiverBreakdownItem {
  item_name: string;
  amount: number;
  waiver_amount: number;
  original_amount: number;
  waiver_percentage?: number;
  final_amount?: number;
}

type PaymentMethodType = 'paystack' | 'bank_transfer';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

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
// FEE BREAKDOWN DISPLAY COMPONENT — WITH WAIVER SUPPORT
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
  
  // Extract waiver details from assignment
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
          
          // Check if this item has a specific waiver applied
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
                      {item.is_optional && (
                        <span className="text-[8px] sm:text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full flex-shrink-0">
                          Optional
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

      {/* Summary Footer with Waiver Details */}
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

        {/* Waiver Breakdown Items */}
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
// SUCCESS RECEIPT MODAL
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
  if (!isOpen || !data) return null;

  const handlePrint = () => window.print();

  const handleDownload = () => {
    const receiptText = `
========================================
        EBENEZER INTERNATIONAL SCHOOL
              PAYMENT RECEIPT
========================================

Payment ID: ${data.payment_id || data.id || 'N/A'}
Receipt Number: ${data.receipt_number || 'N/A'}
Date: ${dayjs(data.payment_date || new Date()).format('MMMM D, YYYY h:mm A')}

Student: ${data.student_name || 'N/A'}
Student ID: ${data.student_id || 'N/A'}
Class: ${data.class_name || 'N/A'}

----------------------------------------
Fee: ${data.fee_name || 'N/A'}
Amount: ${formatCurrencyFn(data.amount || 0)}
Payment Method: ${data.payment_method || 'N/A'}
Reference: ${data.reference || data.transaction_reference || 'N/A'}

----------------------------------------
Status: ${data.status || 'Completed'}
${isBankTransfer ? 'Bank Transfer Reference: ' + (data.transaction_reference || 'N/A') : ''}

========================================
Thank you for your payment!
    `;

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${data.receipt_number || 'payment'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Receipt downloaded');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            Payment Receipt
          </h3>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4" id="receipt-content">
          <div className="text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 dark:text-green-400" />
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

          <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-3">
            <h5 className="text-sm font-bold text-gray-900 dark:text-white">Ebenezer International School</h5>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Official Payment Receipt</p>
          </div>

          <div className="space-y-1.5 text-xs sm:text-sm">
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Payment ID</span>
              <span className="font-medium text-gray-900 dark:text-white font-mono text-[10px]">{data.payment_id || data.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Receipt Number</span>
              <span className="font-medium text-gray-900 dark:text-white">{data.receipt_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Date</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {dayjs(data.payment_date || new Date()).format('MMMM D, YYYY h:mm A')}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Student</span>
              <span className="font-medium text-gray-900 dark:text-white">{data.student_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Student ID</span>
              <span className="font-medium text-gray-900 dark:text-white">{data.student_id || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Class</span>
              <span className="font-medium text-gray-900 dark:text-white">{data.class_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Fee</span>
              <span className="font-medium text-gray-900 dark:text-white">{data.fee_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Payment Method</span>
              <span className="font-medium text-gray-900 dark:text-white capitalize">{data.payment_method || 'N/A'}</span>
            </div>
            {data.transaction_reference && (
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Transaction Ref</span>
                <span className="font-medium text-gray-900 dark:text-white font-mono text-[10px] sm:text-xs truncate max-w-[150px]">
                  {data.transaction_reference}
                </span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t-2 border-gray-300 dark:border-gray-600 mt-2">
              <span className="font-semibold text-gray-900 dark:text-white">Amount Paid</span>
              <span className="font-bold text-lg text-green-600 dark:text-green-400">
                {formatCurrencyFn(data.amount || 0)}
              </span>
            </div>
          </div>

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

          <div className="text-center">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              isBankTransfer 
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              {isBankTransfer ? (
                <>
                  <Clock className="w-3 h-3" />
                  Pending Verification
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Completed
                </>
              )}
            </span>
            {isBankTransfer && (
              <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1">
                Your payment will be verified within 24-48 hours
              </p>
            )}
          </div>

          <div className="flex flex-col xs:flex-row gap-2">
            <button onClick={handlePrint} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button onClick={handleDownload} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download
            </button>
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:opacity-90 transition-all text-sm">
              Done
            </button>
          </div>
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
// MAIN PARENTPAYBILL COMPONENT
// ============================================
const ParentPayBill: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('paystack');
  const [amount, setAmount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [failureReason, setFailureReason] = useState('');
  const [failureDetails, setFailureDetails] = useState('');
  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway | null>(null);
  const [copied, setCopied] = useState(false);
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid' | 'overdue' | 'pending' | 'cancelled' | 'failed'>('all');
  const [expandedFee, setExpandedFee] = useState<string | null>(null);
  const [selectedFailedPayment, setSelectedFailedPayment] = useState<any | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessReceipt, setShowSuccessReceipt] = useState(false);
  const [successPaymentData, setSuccessPaymentData] = useState<any | null>(null);
  const [paymentErrorType, setPaymentErrorType] = useState<'cancelled' | 'network' | 'gateway' | 'bank' | 'unknown'>('unknown');
  const [showChildSelector, setShowChildSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  
  // Breakdown state
  const [breakdownData, setBreakdownData] = useState<Record<string, any>>({});
  const [loadingBreakdown, setLoadingBreakdown] = useState<Record<string, boolean>>({});
  
  // Bank Transfer Proof Upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [transactionReference, setTransactionReference] = useState('');
  const [showBankTransferSuccess, setShowBankTransferSuccess] = useState(false);
  const [bankTransferData, setBankTransferData] = useState<any | null>(null);
  const [wasCancelledByUser, setWasCancelledByUser] = useState(false);

  // Paystack lifecycle refs: onClose can fire immediately after callback.
  // Never let a late onClose overwrite a successful/failed terminal result.
  const paystackTerminalRef = useRef<'none' | 'success' | 'failed' | 'cancelled' | 'network'>('none');
  const paystackCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paystackCallbackReceivedRef = useRef(false);
  const paystackPopupOpenRef = useRef(false);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Refs
  const pendingReferenceRef = useRef<string | null>(null);
  const pendingAmountRef = useRef<number>(0);
  const pendingAssignmentIdRef = useRef<string | null>(null);
  const pendingStudentIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // IMPORTANT: declare this BEFORE any callback that uses it.
  // Paystack callbacks/onClose use this to clear the current transaction refs.
  function clearPaystackRefs(): void {
    pendingReferenceRef.current = null;
    pendingAmountRef.current = 0;
    pendingAssignmentIdRef.current = null;
    pendingStudentIdRef.current = null;
    paystackPopupOpenRef.current = false;
  }

  // User info for audit
  const [userIP, setUserIP] = useState<string>('Not recorded');
  const [userAgent, setUserAgent] = useState<string>('Not recorded');

  // Use shared payment data hook
  const {
    assignments,
    refresh: refreshPaymentData,
  } = usePaymentData(studentId, branchId, {
    autoFetch: !!studentId && !!branchId,
  });

  // Effects
  useEffect(() => {
    setUserAgent(navigator.userAgent);
    const getIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        if (data.ip) {
          setUserIP(data.ip);
        }
      } catch (error) {
        console.log('Could not fetch IP:', error);
      }
    };
    getIP();
  }, []);

  useEffect(() => {
    if (selectedChild?.branch_id) {
      setBranchId(selectedChild.branch_id);
      fetchPaymentGateway(selectedChild.branch_id);
    }
  }, [selectedChild]);

  useEffect(() => {
    if (user?.id) {
      fetchChildren();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChild?.id) {
      setStudentId(selectedChild.id);
      fetchPayments(selectedChild.id);
    }
  }, [selectedChild]);

  // ============================================
  // DATA FETCHING FUNCTIONS
  // ============================================
  
  const fetchPaymentGateway = async (branchId: string) => {
    setGatewayLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Payment gateway fetch error:', error);
        toast.error('Payment gateway not configured. Please contact school administration.');
        setPaymentGateway(null);
        setGatewayLoading(false);
        return;
      }

      if (!data) {
        toast.error('Payment method not configured for this branch.');
        setPaymentGateway(null);
        setGatewayLoading(false);
        return;
      }

      setPaymentGateway(data);
      await paystackService.initialize(branchId);
      
    } catch (error) {
      console.error('Error fetching payment gateway:', error);
      toast.error('Failed to load payment configuration');
      setPaymentGateway(null);
    } finally {
      setGatewayLoading(false);
    }
  };

  const fetchChildren = async () => {
    setLoading(true);
    try {
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (parentError) {
        toast.error('Parent profile not found');
        setLoading(false);
        return;
      }

      const { data: childrenData, error: childrenError } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          student_id,
          passport_url,
          branch_id,
          email,
          admission_number,
          class:class_id (
            name
          )
        `)
        .eq('parent_id', parentData.id)
        .eq('current_status', 'active')
        .order('first_name');

      if (childrenError) {
        toast.error('Failed to load children');
        setLoading(false);
        return;
      }

      const studentsWithClass = (childrenData || []).map(s => ({
        ...s,
        class_name: s.class?.name || 'Not Assigned'
      }));

      setChildren(studentsWithClass);

      if (studentsWithClass.length > 0) {
        setSelectedChild(studentsWithClass[0]);
      } else {
        toast('No children found. Please contact administration.', { icon: 'ℹ️' });
      }

    } catch (error: any) {
      toast.error(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (studentId: string) => {
    try {
      console.log('Fetching payments for student:', studentId);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .in('status', ['success', 'completed', 'approved', 'paid', 'pending', 'processing', 'failed', 'cancelled'])
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Payments fetch error:', error);
        return;
      }

      console.log('Payments fetched:', data);
      setPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
    }
  };

  // ============================================
  // FETCH FEE BREAKDOWN AND DETAILS
  // ============================================
  const fetchBreakdownForAssignment = useCallback(async (assignmentId: string, feeId: string, templateId?: string) => {
    if (breakdownData[assignmentId]) return;
    if (loadingBreakdown[assignmentId]) return;
    
    setLoadingBreakdown(prev => ({ ...prev, [assignmentId]: true }));
    
    try {
      let breakdown: any[] = [];
      let feeDetails: any = {};
      
      if (feeId) {
        const { data: feeData, error: feeError } = await supabase
          .from('fees')
          .select('metadata, fee_template_id, term, session, payment_frequency, category, amount, due_date, name')
          .eq('id', feeId)
          .single();

        if (!feeError && feeData) {
          feeDetails = {
            term: feeData.term,
            session: feeData.session,
            payment_frequency: feeData.payment_frequency,
            category: feeData.category,
            amount: feeData.amount,
            due_date: feeData.due_date,
            name: feeData.name
          };
          
          const feeBreakdown = feeData.metadata?.fee_breakdown;
          
          if (feeBreakdown) {
            if (feeBreakdown.items && Array.isArray(feeBreakdown.items)) {
              breakdown = feeBreakdown.items;
            } else if (Array.isArray(feeBreakdown)) {
              breakdown = feeBreakdown;
            } else if (typeof feeBreakdown === 'object') {
              const possibleArrays = Object.values(feeBreakdown).filter(val => Array.isArray(val));
              if (possibleArrays.length > 0) {
                breakdown = possibleArrays[0];
              }
            }
          }
          
          if (breakdown.length === 0 && feeData.fee_template_id) {
            const { data: templateData, error: templateError } = await supabase
              .from('fee_templates')
              .select('metadata')
              .eq('id', feeData.fee_template_id)
              .single();

            if (!templateError && templateData?.metadata) {
              const templateBreakdown = templateData.metadata.fee_breakdown;
              if (templateBreakdown) {
                if (templateBreakdown.items && Array.isArray(templateBreakdown.items)) {
                  breakdown = templateBreakdown.items;
                } else if (Array.isArray(templateBreakdown)) {
                  breakdown = templateBreakdown;
                }
              }
            }
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
      setBreakdownData(prev => ({ ...prev, [assignmentId]: [] }));
    } finally {
      setLoadingBreakdown(prev => ({ ...prev, [assignmentId]: false }));
    }
  }, [breakdownData, loadingBreakdown]);

  // ============================================
  // PAYMENT HANDLERS
  // ============================================
  const generateReference = () => {
    return paystackService.generateReference();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success('Copied to clipboard');
  };

  const handleFileChange = (file: File | null) => {
    setUploadedFile(file);
    setFileName(file?.name || null);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const refreshData = async () => {
    if (!selectedChild) return;
    setRefreshing(true);
    try {
      await Promise.all([
        refreshPaymentData(),
        fetchPayments(selectedChild.id),
        fetchPaymentGateway(selectedChild.branch_id)
      ]);
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // ============================================
  // FIXED: Get payment status from payments (source of truth)
  // ============================================
  const getPaymentStatusForAssignment = (assignment: any) => {
    // Get all payments for this assignment
    const assignmentPayments = payments.filter(p => p.assignment_id === assignment.id);
    
    // Calculate total paid from payments (source of truth)
    const totalPaidFromPayments = assignmentPayments
      .filter(p => ['success', 'completed', 'approved', 'paid'].includes(String(p.status).toLowerCase()))
      .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    
    // Get balance from assignment or calculate
    const balance = assignment.balance || Math.max(0, assignment.amount_due - totalPaidFromPayments);
    
    // Check for cancelled or failed payments
    const hasCancelled = assignmentPayments.some(p => p.status === 'cancelled' || p.status === 'canceled');
    const hasFailed = assignmentPayments.some(p => p.status === 'failed' || p.status === 'rejected');
    const hasPending = assignmentPayments.some(p => p.status === 'pending' || p.status === 'processing');
    
    // Determine status based on payments
    let status = assignment.payment_status || 'unpaid';
    let label = 'Unpaid';
    let badgeColor = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    let isPayable = false;
    let icon = Clock;

    if (hasPending) {
      status = 'pending';
      label = 'Pending';
      badgeColor = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      isPayable = false;
      icon = Clock;
    } else if (hasCancelled) {
      status = 'cancelled';
      label = 'Cancelled';
      badgeColor = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      isPayable = true;
      icon = X;
    } else if (hasFailed) {
      status = 'failed';
      label = 'Failed';
      badgeColor = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      isPayable = true;
      icon = AlertTriangle;
    } else if (assignment.payment_status === 'waived') {
      status = 'waived';
      label = 'Exempted';
      badgeColor = 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      isPayable = false;
      icon = Shield;
    } else if (balance === 0 || assignment.payment_status === 'paid') {
      status = 'paid';
      label = 'Paid';
      badgeColor = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      isPayable = false;
      icon = CheckCircle;
    } else if (assignment.payment_status === 'overdue' || (assignment.due_date && new Date(assignment.due_date) < new Date() && balance > 0)) {
      status = 'overdue';
      label = 'Overdue';
      badgeColor = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      isPayable = true;
      icon = AlertCircle;
    } else if (balance > 0 && totalPaidFromPayments > 0) {
      // Partial payment detected
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

    return { status, label, badgeColor, isPayable, icon, balance, totalPaidFromPayments };
  };

  const handlePayNow = (assignment: any) => {
    if (!paymentGateway && !gatewayLoading) {
      toast.error('Payment configuration not loaded. Please try again.');
      return;
    }
    
    const status = getPaymentStatusForAssignment(assignment);
    
    if (status.status === 'cancelled' || status.status === 'failed') {
      setSelectedAssignment(assignment);
      setAmount(assignment.balance || 0);
      setShowPaymentModal(true);
      handleFileRemove();
      setTransactionReference('');
      return;
    }
    
    if (!status.isPayable) {
      if (status.status === 'paid') {
        toast.success('✅ This fee is already paid');
      } else if (status.status === 'pending') {
        toast.info('⏳ Payment is awaiting confirmation');
      } else if (status.status === 'waived') {
        toast.info('🛡️ This fee is exempted');
      }
      return;
    }
    
    setSelectedAssignment(assignment);
    setAmount(assignment.balance || 0);
    setShowPaymentModal(true);
    handleFileRemove();
    setTransactionReference('');
  };

  const viewErrorDetails = (payment: any) => {
    setSelectedFailedPayment(payment);
    const errorType = getErrorType(payment);
    setPaymentErrorType(errorType);
    setShowErrorModal(true);
  };

  const uploadPaymentProof = async (file: File, paymentId: string): Promise<{ path: string; url: string } | null> => {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `proof_${paymentId}_${Date.now()}.${fileExt}`;
      const filePath = `payments/${selectedChild?.id}/${fileName}`;

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

  const savePaymentRecord = async (params: {
    assignmentId: string;
    amount: number;
    reference: string;
    status: 'pending' | 'success' | 'failed';
    failureReason?: string;
    gatewayReference?: string;
    paymentMethod?: string;
    paymentProofUrl?: string;
    paymentProofPath?: string;
    transactionReference?: string;
  }) => {
    try {
      const paymentId = generatePaymentId();
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const paymentData = {
        payment_id: paymentId,
        receipt_number: receiptNumber,
        student_id: selectedChild?.id,
        assignment_id: params.assignmentId,
        fee_id: selectedAssignment?.fee_id,
        amount: params.amount,
        // CRITICAL: cancelled/pending/failed transactions are NOT money received.
        // Only a successful/completed payment gets amount_paid.
        amount_paid: params.status === 'success' ? params.amount : 0,
        balance: params.status === 'success' ? 0 : params.amount,
        payment_method: params.paymentMethod || 'paystack',
        payment_date: new Date().toISOString(),
        status: params.status === 'success' ? 'completed' : params.status === 'pending' ? 'pending' : 'failed',
        transaction_reference: params.reference,
        gateway_reference: params.gatewayReference || params.reference,
        failure_reason: params.failureReason || null,
        branch_id: selectedChild?.branch_id,
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payment_proof_url: params.paymentProofUrl || null,
        payment_proof_path: params.paymentProofPath || null,
        gateway_response: params.status === 'success' ? { success: true } : { failed: true, reason: params.failureReason },
        metadata: {
          student_name: `${selectedChild?.first_name} ${selectedChild?.last_name}`,
          student_id: selectedChild?.id,
          fee_name: selectedAssignment?.fee_name,
          fee_id: selectedAssignment?.fee_id,
          payment_method: params.paymentMethod || 'paystack',
          assignment_id: params.assignmentId,
          reference: params.reference,
          transaction_reference: params.transactionReference || null,
          ip_address: userIP,
          user_agent: userAgent,
          parent_id: user?.id,
        }
      };

      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single();

      if (error) {
        console.error('Error saving payment:', error);
        throw error;
      }

      if (params.status === 'success') {
        await updateAssignmentAfterPayment(params.assignmentId, params.amount);
      }

      return data;
    } catch (error) {
      console.error('Error saving payment record:', error);
      throw error;
    }
  };

  const updateAssignmentAfterPayment = async (assignmentId: string, amountPaid: number) => {
    try {
      const { data: assignment } = await supabase
        .from('student_fee_assignments')
        .select('amount_paid, balance, amount_due')
        .eq('id', assignmentId)
        .single();

      if (!assignment) return;

      const newPaid = (assignment.amount_paid || 0) + amountPaid;
      const newBalance = Math.max(0, (assignment.balance || 0) - amountPaid);
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      await supabase
        .from('student_fee_assignments')
        .update({
          amount_paid: newPaid,
          balance: newBalance,
          payment_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

    } catch (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
  };

  const handlePaymentSuccess = useCallback(async (reference: string) => {
    const assignmentId = pendingAssignmentIdRef.current;
    const amount = pendingAmountRef.current;
    
    if (!reference || !assignmentId) {
      toast.error('Missing payment information');
      return;
    }
    
    try {
      const { data: paymentRecord } = await supabase
        .from('payments')
        .select('*')
        .eq('transaction_reference', reference)
        .single();

      await supabase
        .from('payments')
        .update({
          status: 'completed',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          gateway_reference: reference,
          updated_at: new Date().toISOString(),
          gateway_response: { success: true, reference },
        })
        .eq('transaction_reference', reference);

      await updateAssignmentAfterPayment(assignmentId, amount);
      
      await refreshPaymentData();
      if (selectedChild?.id) {
        await fetchPayments(selectedChild.id);
      }
      
      const successData = {
        id: paymentRecord?.payment_id || paymentRecord?.id,
        payment_id: paymentRecord?.payment_id,
        receipt_number: paymentRecord?.receipt_number,
        amount: amount,
        payment_date: paymentRecord?.payment_date || new Date().toISOString(),
        payment_method: 'paystack',
        reference: reference,
        transaction_reference: reference,
        student_name: `${selectedChild?.first_name} ${selectedChild?.last_name}`,
        student_id: selectedChild?.student_id || selectedChild?.admission_number,
        class_name: selectedChild?.class_name,
        fee_name: selectedAssignment?.fee_name,
        status: 'completed',
      };
      
      setSuccessPaymentData(successData);
      setShowSuccessReceipt(true);
      setShowPaymentModal(false);
      
      toast.success(`Payment of ${formatCurrency(amount)} completed successfully!`);
      setProcessing(false);
      
      paystackTerminalRef.current = 'success';
      clearPaystackRefs();
      
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Payment succeeded but failed to update records. Please contact support.');
      setProcessing(false);
    }
  }, [selectedChild, user, selectedAssignment, refreshPaymentData, clearPaystackRefs]);

  const handlePaymentFailure = useCallback(async (reference: string, message?: string) => {
    if (!reference) return;
    
    try {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          failure_reason: message || 'Payment failed',
          updated_at: new Date().toISOString(),
        })
        .eq('transaction_reference', reference);
      
      setFailureReason(message || 'Payment failed. Please try again.');
      setShowFailure(true);
      setProcessing(false);
      paystackTerminalRef.current = 'failed';
      clearPaystackRefs();
    } catch (error) {
      console.error('Error updating failed payment:', error);
    }
  }, []);

  const paystackCallback = useCallback((response: any) => {
    const reference = pendingReferenceRef.current;
    if (!reference) return;

    paystackCallbackReceivedRef.current = true;

    // Paystack success is terminal. Mark it before awaiting DB work so a
    // subsequent onClose event cannot turn the payment into cancelled/pending.
    if (response?.status === 'success') {
      paystackTerminalRef.current = 'success';
      if (paystackCloseTimerRef.current) {
        clearTimeout(paystackCloseTimerRef.current);
        paystackCloseTimerRef.current = null;
      }
      void handlePaymentSuccess(reference);
      return;
    }

    // A genuine Paystack callback with a non-success status is a failed payment,
    // not a pending payment.
    paystackTerminalRef.current = 'failed';
    if (paystackCloseTimerRef.current) {
      clearTimeout(paystackCloseTimerRef.current);
      paystackCloseTimerRef.current = null;
    }
    void handlePaymentFailure(reference, response?.message || 'Payment failed');
  }, [handlePaymentSuccess, handlePaymentFailure]);

  const paystackOnClose = useCallback(() => {
    const reference = pendingReferenceRef.current;
    if (!reference) {
      setProcessing(false);
      return;
    }

    // Do NOT immediately mark pending/cancelled. Paystack can call onClose
    // immediately after callback(), creating a race with the async success handler.
    if (paystackTerminalRef.current !== 'none' || paystackCallbackReceivedRef.current) {
      setProcessing(false);
      return;
    }

    if (paystackCloseTimerRef.current) {
      clearTimeout(paystackCloseTimerRef.current);
    }

    paystackCloseTimerRef.current = setTimeout(async () => {
      const currentReference = pendingReferenceRef.current;
      if (!currentReference || currentReference !== reference) return;

      // Re-check the database before deciding this was a cancellation.
      const { data: payment, error } = await supabase
        .from('payments')
        .select('status')
        .eq('transaction_reference', reference)
        .maybeSingle();

      if (error) {
        // Network/database failure: leave the record as pending because we
        // cannot prove whether the payment was actually cancelled.
        paystackTerminalRef.current = 'network';
        setFailureReason('Network error while checking the Paystack payment. Please refresh or try again.');
        setShowFailure(true);
        setProcessing(false);
        return;
      }

      if (payment?.status === 'completed' || payment?.status === 'success') {
        paystackTerminalRef.current = 'success';
        setProcessing(false);
        clearPaystackRefs();
        return;
      }

      if (payment?.status === 'failed' || payment?.status === 'rejected' || payment?.status === 'cancelled') {
        setProcessing(false);
        clearPaystackRefs();
        return;
      }

      // The user closed Paystack without receiving a callback. This is the
      // ONLY normal path where we convert the temporary pending row to cancelled.
      await supabase
        .from('payments')
        .update({
          status: 'cancelled',
          failure_reason: 'User closed the Paystack payment window before completion',
          updated_at: new Date().toISOString(),
        })
        .eq('transaction_reference', reference)
        .eq('status', 'pending');

      paystackTerminalRef.current = 'cancelled';
      setFailureReason('Payment was cancelled. No successful payment was recorded.');
      setShowFailure(true);
      setProcessing(false);
      clearPaystackRefs();
    }, 2500);
  }, []);

  const handlePayWithPaystack = async () => {
    if (!selectedAssignment || !selectedChild) {
      toast.error('Missing payment information');
      return;
    }

    if (!paymentGateway || !paymentGateway.paystack_public_key) {
      toast.error('Paystack not configured. Please use bank transfer.');
      return;
    }

    if (typeof window.PaystackPop === 'undefined') {
      toast.error('Paystack is not loaded. Please refresh and try again.');
      return;
    }

    setProcessing(true);
    const reference = generateReference();

    try {
      // Reset lifecycle state for this transaction.
      if (paystackCloseTimerRef.current) {
        clearTimeout(paystackCloseTimerRef.current);
        paystackCloseTimerRef.current = null;
      }
      paystackTerminalRef.current = 'none';
      paystackCallbackReceivedRef.current = false;
      paystackPopupOpenRef.current = true;

      pendingReferenceRef.current = reference;
      pendingAmountRef.current = amount;
      pendingAssignmentIdRef.current = selectedAssignment.id;
      pendingStudentIdRef.current = selectedChild.id;

      await savePaymentRecord({
        assignmentId: selectedAssignment.id,
        amount: amount,
        reference: reference,
        status: 'pending',
        gatewayReference: reference,
        paymentMethod: 'paystack',
      });

      const handler = window.PaystackPop.setup({
        key: paymentGateway.paystack_public_key,
        email: selectedChild.email || user?.email || 'parent@example.com',
        amount: Math.round(amount * 100),
        ref: reference,
        currency: 'NGN',
        metadata: {
          student_id: selectedChild.id,
          student_name: `${selectedChild.first_name} ${selectedChild.last_name}`,
          assignment_id: selectedAssignment.id,
          fee_name: selectedAssignment.fee_name,
          payment_type: 'fee_payment',
          branch_id: selectedChild.branch_id,
          parent_id: user?.id,
        },
        callback: paystackCallback,
        onClose: paystackOnClose,
      });

      handler.openIframe();

    } catch (error: any) {
      console.error('Paystack payment error:', error);
      await savePaymentRecord({
        assignmentId: selectedAssignment.id,
        amount: amount,
        reference: reference,
        status: 'failed',
        failureReason: error.message || 'Payment processing failed',
        gatewayReference: reference,
        paymentMethod: 'paystack',
      });
      setFailureReason(error.message || 'Payment processing failed. Please try again or use bank transfer.');
      setShowFailure(true);
      setProcessing(false);
      paystackTerminalRef.current = 'failed';
      clearPaystackRefs();
    }
  };

  const handleBankTransfer = async () => {
    if (!selectedAssignment || !selectedChild) {
      toast.error('Missing payment information');
      return;
    }

    if (!paymentGateway || !paymentGateway.bank_account_number) {
      toast.error('Bank details not configured. Please use Paystack.');
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

      const paymentRecord = await savePaymentRecord({
        assignmentId: selectedAssignment.id,
        amount: amount,
        reference: reference,
        status: 'pending',
        paymentMethod: 'bank_transfer',
        gatewayReference: reference,
        paymentProofUrl: uploadResult.url,
        paymentProofPath: uploadResult.path,
        transactionReference: transactionReference,
      });

      setUploadedFile(null);
      setUploadPreview(null);
      setTransactionReference('');
      setUploading(false);
      
      await refreshPaymentData();
      if (selectedChild?.id) {
        await fetchPayments(selectedChild.id);
      }

      const bankData = {
        id: paymentRecord?.payment_id || paymentRecord?.id,
        payment_id: paymentRecord?.payment_id,
        receipt_number: paymentRecord?.receipt_number,
        amount: amount,
        payment_date: paymentRecord?.payment_date || new Date().toISOString(),
        payment_method: 'bank_transfer',
        reference: reference,
        transaction_reference: transactionReference,
        student_name: `${selectedChild?.first_name} ${selectedChild?.last_name}`,
        student_id: selectedChild?.student_id || selectedChild?.admission_number,
        class_name: selectedChild?.class_name,
        fee_name: selectedAssignment?.fee_name,
        status: 'pending',
        bank_name: paymentGateway.bank_name,
        bank_account_number: paymentGateway.bank_account_number,
        bank_account_name: paymentGateway.bank_account_name,
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

  const handleSubmitPayment = async () => {
    if (!selectedAssignment) {
      toast.error('No fee selected');
      return;
    }

    if (!paymentGateway) {
      toast.error('Payment configuration not loaded. Please try again.');
      return;
    }

    if (paymentMethod === 'paystack') {
      if (!paymentGateway.paystack_public_key) {
        toast.error('Paystack not configured for this branch. Please use bank transfer.');
        return;
      }
      await handlePayWithPaystack();
    } else {
      if (!paymentGateway.bank_account_number) {
        toast.error('Bank details not configured for this branch. Please use Paystack.');
        return;
      }
      await handleBankTransfer();
    }
  };

  const handleChildSelect = (child: Student) => {
    setSelectedChild(child);
    setShowChildSelector(false);
  };

  // ============================================
  // CALCULATIONS — FIXED to use payments
  // ============================================
  const totalBalance = assignments.reduce((sum, a) => {
    // Calculate paid from payments
    const paid = payments
      .filter(p =>
        p.assignment_id === a.id &&
        ['success', 'completed', 'approved', 'paid'].includes(String(p.status).toLowerCase())
      )
      .reduce((s, p) => s + (p.amount_paid || 0), 0);
    return sum + Math.max(0, a.amount_due - paid);
  }, 0);
  
  const totalPaid = assignments.reduce((sum, a) => {
    return sum + payments
      .filter(p =>
        p.assignment_id === a.id &&
        ['success', 'completed', 'approved', 'paid'].includes(String(p.status).toLowerCase())
      )
      .reduce((s, p) => s + (p.amount_paid || 0), 0);
  }, 0);
  
  const totalDue = assignments.reduce((sum, a) => sum + a.amount_due, 0);
  const completionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;
  
  const paidFeesCount = assignments.filter(a => {
    const paid = payments
      .filter(p =>
        p.assignment_id === a.id &&
        ['success', 'completed', 'approved', 'paid'].includes(String(p.status).toLowerCase())
      )
      .reduce((s, p) => s + (p.amount_paid || 0), 0);
    return paid >= a.amount_due;
  }).length;
  
  const totalFeesCount = assignments.length;
  const paidPercentage = totalFeesCount > 0 ? Math.round((paidFeesCount / totalFeesCount) * 100) : 0;

  const filteredAssignments = assignments.filter(a => {
    const statusInfo = getPaymentStatusForAssignment(a);
    if (filterStatus === 'all') return true;
    if (filterStatus === 'unpaid') return statusInfo.status === 'unpaid' || statusInfo.status === 'partial';
    if (filterStatus === 'paid') return statusInfo.status === 'paid';
    if (filterStatus === 'overdue') return statusInfo.status === 'overdue';
    if (filterStatus === 'pending') return statusInfo.status === 'pending';
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
        <LoadingSpinner size="lg" text="Loading your children..." />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
        <div className="text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">No Children Found</h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">
            You don't have any children registered. Please contact the school administration.
          </p>
          <button
            onClick={() => navigate('/parent/dashboard')}
            className="mt-4 sm:mt-6 px-5 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-all text-sm sm:text-base"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      
      {/* Header */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 xs:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={() => navigate('/parent/dashboard')}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0" />
              <span className="truncate">Pay Bill</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {selectedChild ? `Paying for: ${selectedChild.first_name} ${selectedChild.last_name}` : 'Select a child to pay'}
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
          {children.length > 1 && (
            <button
              onClick={() => setShowChildSelector(!showChildSelector)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg sm:rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-xs sm:text-sm"
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{selectedChild ? 'Switch Child' : 'Select Child'}</span>
              <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${showChildSelector ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Child Selector Dropdown */}
      {showChildSelector && (
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 mb-4 sm:mb-6">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search child..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {children
              .filter(child => 
                `${child.first_name} ${child.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                child.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((child) => (
                <button
                  key={child.id}
                  onClick={() => handleChildSelect(child)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    selectedChild?.id === child.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {child.first_name?.[0]}{child.last_name?.[0]}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {child.first_name} {child.last_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {child.student_id} • {child.class_name}
                    </p>
                  </div>
                  {selectedChild?.id === child.id && (
                    <CheckCircle className="w-5 h-5 text-blue-500 ml-auto flex-shrink-0" />
                  )}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Student Info Card */}
      {selectedChild && (
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-base sm:text-lg md:text-xl font-bold flex-shrink-0">
                {selectedChild.first_name?.[0]}{selectedChild.last_name?.[0]}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {selectedChild.first_name} {selectedChild.last_name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  {selectedChild.class_name || 'Not Assigned'} • {selectedChild.student_id || selectedChild.admission_number}
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
      {selectedChild && (
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
                        {statusInfo.isPayable && (
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
                          {/* Fee Details Grid */}
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

                          {/* Fee Breakdown with Waiver Support */}
                          <FeeBreakdownDisplay
                            breakdown={breakdown}
                            totalAmount={assignment.amount_due || 0}
                            feeName={assignment.fee_name || 'Fee'}
                            isLoading={isLoadingBreakdown}
                            feeDetails={feeDetails}
                            assignment={assignment}
                            formatCurrencyFn={formatCurrency}
                          />

                          {/* Payment History */}
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
                                            {formatCurrency(
                                              ['success', 'completed', 'approved', 'paid'].includes(String(payment.status).toLowerCase())
                                                ? (payment.amount_paid || 0)
                                                : 0
                                            )}
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
                  {paymentGateway.paystack_public_key && (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all ${
                        paymentMethod === 'paystack'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                      }`}
                      onClick={() => {
                        setPaymentMethod('paystack');
                        handleFileRemove();
                        setTransactionReference('');
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Card</h4>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Paystack</p>
                        </div>
                      </div>
                      {paymentMethod === 'paystack' && (
                        <div className="mt-1.5 flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          <span className="text-[10px] font-medium">Selected</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                  
                  {paymentGateway.bank_account_number && (
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
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
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

                {paymentMethod === 'bank_transfer' && paymentGateway.bank_account_number && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-1.5 sm:space-y-2 border border-gray-200 dark:border-gray-600">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                        Bank Transfer Details
                      </p>
                      <div className="space-y-1 text-xs sm:text-sm">
                        <div className="flex flex-col xs:flex-row xs:justify-between items-start xs:items-center py-1 border-b border-gray-200 dark:border-gray-600 gap-0.5 xs:gap-0">
                          <span className="text-gray-500">Bank</span>
                          <span className="font-medium text-gray-900 dark:text-white">{paymentGateway.bank_name}</span>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between items-start xs:items-center py-1 border-b border-gray-200 dark:border-gray-600 gap-0.5 xs:gap-0">
                          <span className="text-gray-500">Account Name</span>
                          <span className="font-medium text-gray-900 dark:text-white">{paymentGateway.bank_account_name}</span>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between items-start xs:items-center py-1 gap-0.5 xs:gap-0">
                          <span className="text-gray-500">Account Number</span>
                          <span className="font-medium text-gray-900 dark:text-white font-mono flex items-center gap-2">
                            {paymentGateway.bank_account_number}
                            <button
                              onClick={() => copyToClipboard(paymentGateway.bank_account_number)}
                              className="p-0.5 sm:p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                            >
                              {copied ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" /> : <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />}
                            </button>
                          </span>
                        </div>
                      </div>
                    </div>

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

                    {paymentGateway.payment_instructions && (
                      <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 whitespace-pre-line">
                          <Info className="w-3 h-3 inline mr-1" />
                          {paymentGateway.payment_instructions}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === 'paystack' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5 sm:p-3 border border-blue-200 dark:border-blue-800">
                    <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      You will be redirected to Paystack secure payment page.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSubmitPayment}
                  disabled={processing || gatewayLoading || (paymentMethod === 'bank_transfer' && (!uploadedFile || !transactionReference))}
                  className="w-full px-4 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
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
                  ) : (
                    <>
                      {paymentMethod === 'paystack' ? (
                        <>
                          <CreditCard className="w-4 h-4" />
                          Pay with Paystack
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit with Proof
                        </>
                      )}
                    </>
                  )}
                </button>

                <p className="text-[10px] sm:text-xs text-center text-gray-400 dark:text-gray-500">
                  {paymentMethod === 'paystack' 
                    ? 'You will be redirected to complete payment securely'
                    : 'Upload proof of payment for verification'}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
          setShowSuccess(false);
          setSuccessPaymentData(null);
          setBankTransferData(null);
          refreshData();
        }}
        formatCurrencyFn={formatCurrency}
      />

      {/* ============================================ */}
      {/* FAILURE MODAL */}
      {/* ============================================ */}
      <AnimatePresence>
        {showFailure && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 text-center"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <X className="w-7 h-7 sm:w-8 sm:h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Payment Failed</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
                {failureReason || 'There was an issue processing your payment. Please try again.'}
              </p>
              {failureDetails && (
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{failureDetails}</p>
              )}
              <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowFailure(false);
                    setFailureReason('');
                    setFailureDetails('');
                    handleFileRemove();
                    setTransactionReference('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowFailure(false);
                    setFailureReason('');
                    setFailureDetails('');
                    if (selectedAssignment) {
                      setShowPaymentModal(true);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all text-sm"
                >
                  Retry
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                    <span className="font-medium text-gray-900 dark:text-white">
  {formatCurrency(
    ['success', 'completed', 'approved', 'paid'].includes(String(selectedFailedPayment.status).toLowerCase())
      ? (selectedFailedPayment.amount_paid || 0)
      : 0
  )}
</span>
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
                        handlePayNow(assignment);
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

export default ParentPayBill;