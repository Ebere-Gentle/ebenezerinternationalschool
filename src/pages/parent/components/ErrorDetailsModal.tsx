// src/pages/parent/components/ErrorDetailsModal.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { XCircle, Info, HelpCircle, Download, RefreshCw, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import errorImage from '../../../assets/failed.png';

interface ErrorDetailsModalProps {
  isOpen: boolean;
  payment: any;
  errorType: 'cancelled' | 'network' | 'gateway' | 'bank' | 'unknown';
  user: any;
  onRetry: () => void;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
}

const ErrorDetailsModal: React.FC<ErrorDetailsModalProps> = ({
  isOpen,
  payment,
  errorType,
  user,
  onRetry,
  onClose,
  formatCurrency,
}) => {
  const [showFullMetadata, setShowFullMetadata] = useState(false);

  if (!isOpen || !payment) return null;

  const getErrorTitle = (type: string): string => {
    switch (type) {
      case 'cancelled': return 'Payment Cancelled';
      case 'network': return 'Network Error';
      case 'gateway': return 'Gateway Unavailable';
      case 'bank': return 'Bank Transfer Failed';
      default: return 'Payment Failed';
    }
  };

  const getErrorDescription = (type: string, paymentData: any): string => {
    switch (type) {
      case 'cancelled': 
        return 'You closed the payment window before completion';
      case 'network':
        return 'Network connection issue detected';
      case 'gateway':
        return 'Payment gateway is currently unavailable';
      case 'bank':
        return 'Bank transfer submission failed';
      default:
        return paymentData.failure_reason || 'Transaction unsuccessful';
    }
  };

  const title = getErrorTitle(errorType);
  const description = getErrorDescription(errorType, payment);

  // Download error report as PDF
  const downloadErrorReport = async () => {
    try {
      toast.loading('Generating error report...', { id: 'error-pdf' });

      const schoolInfo = {
        name: 'Ebenezer International School',
        email: 'info@ebenezer.edu.ng',
        phone: '+234 800 000 0000',
        address: '42 Allen Avenue, Ikeja, Lagos',
        motto: 'Excellence in Education'
      };

      const isCancelled = errorType === 'cancelled';
      const statusColor = isCancelled ? '#f59e0b' : '#ef4444';
      const statusText = isCancelled ? 'CANCELLED BY USER' : 'FAILED';

      // Load error image
      let imageData = '';
      try {
        const response = await fetch(errorImage);
        const blob = await response.blob();
        imageData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error('Could not load error image:', e);
      }

      const receiptDiv = document.createElement('div');
      receiptDiv.style.width = '800px';
      receiptDiv.style.padding = '40px';
      receiptDiv.style.fontFamily = 'Times New Roman, Georgia, serif';
      receiptDiv.style.background = '#ffffff';
      receiptDiv.style.border = '2px solid #1a1a1a';
      receiptDiv.style.borderRadius = '12px';
      receiptDiv.style.position = 'absolute';
      receiptDiv.style.left = '-9999px';
      receiptDiv.style.top = '0';
      receiptDiv.style.zIndex = '9999';

      // Get metadata for display
      const metadata = payment.metadata || {};

      receiptDiv.innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 20px;">
          <div style="font-size: 28px; font-weight: 700; letter-spacing: 2px; color: #1a1a1a;">🏫 ${schoolInfo.name}</div>
          <div style="font-style: italic; color: #6b7280; font-size: 14px; margin-top: 4px;">"${schoolInfo.motto}"</div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 8px;">
            ${schoolInfo.address} <br/>
            ${schoolInfo.phone} | ${schoolInfo.email}
          </div>
        </div>

        ${imageData ? `
          <div style="text-align: center; margin: 16px 0;">
            <img src="${imageData}" alt="Payment Error" style="width: 120px; height: 120px; object-fit: contain;" />
          </div>
        ` : `
          <div style="text-align: center; margin: 16px 0; font-size: 48px;">
            ${isCancelled ? '⚠️' : '❌'}
          </div>
        `}

        <div style="text-align: center; margin: 10px 0 20px 0;">
          <h2 style="font-size: 24px; color: ${statusColor}; margin-bottom: 4px;">${title}</h2>
          <div style="display: inline-block; padding: 4px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; color: white; background-color: ${statusColor};">${statusText}</div>
          ${isCancelled ? '<div style="margin-top: 8px; font-size: 14px; color: #f59e0b;">⏳ No funds deducted</div>' : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          ${Object.entries({
            'Fee Name': metadata.fee_name || payment.fee_name || 'N/A',
            'Fee ID': metadata.fee_id || 'N/A',
            'Assignment ID': metadata.assignment_id || payment.assignment_id || 'N/A',
            'Student Name': metadata.student_name || 'N/A',
            'Student ID': metadata.student_id || 'N/A',
            'Reference': metadata.reference || payment.transaction_reference || 'N/A',
            'Date': dayjs(payment.payment_date || metadata.timestamp || new Date()).format('dddd, MMMM D, YYYY'),
            'Time': dayjs(payment.payment_date || metadata.timestamp || new Date()).format('h:mm:ss A'),
            'Amount': formatCurrency(payment.amount_paid || payment.amount || 0),
            'Payment Method': payment.payment_method ? payment.payment_method.replace(/_/g, ' ').toUpperCase() : 'N/A',
            'Status': statusText,
            'User Action': metadata.was_cancelled_by_user ? 'USER CANCELLED' : 'FAILED',
            'Fraud Risk': metadata.fraud_risk || 'NONE',
            'IP Address': metadata.ip_address || 'Not recorded',
            'User Agent': metadata.user_agent || 'Not recorded',
            'Cancelled At': metadata.cancelled_at ? dayjs(metadata.cancelled_at).format('dddd, MMMM D, YYYY HH:mm:ss') : 'N/A',
          }).map(([label, value]) => `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; color: #6b7280; padding-right: 20px;">${label}</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; font-weight: 500; ${label === 'Amount' ? 'color: #ef4444; font-weight: 700;' : ''}">${value}</td>
            </tr>
          `).join('')}
        </table>

        ${isCancelled ? `
          <div style="background-color: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace; font-size: 12px; color: #991b1b;">
            <div style="font-weight: 700; color: #dc2626; font-size: 14px; margin-bottom: 8px;">⚠️ FRAUD PROTECTION NOTICE</div>
            <div>This transaction was CANCELLED BY THE USER. The user closed the payment window before completing the transaction. NO FUNDS were deducted.</div>
            <div style="margin-top: 8px; font-weight: 600;">NO REFUND is applicable as no payment was made.</div>
          </div>
        ` : ''}

        ${payment.failure_reason ? `
          <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #1a1a1a;">
            <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #4b5563;">FAILURE REASON</h4>
            <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 12px; margin: 12px 0;">
              <div style="font-size: 12px; color: #4b5563; white-space: pre-wrap;">${payment.failure_reason}</div>
            </div>
          </div>
        ` : ''}

        ${metadata.error_details ? `
          <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #1a1a1a;">
            <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #4b5563;">ERROR DETAILS</h4>
            <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 12px; margin: 12px 0;">
              <div style="font-size: 12px; color: #4b5563; white-space: pre-wrap; font-family: monospace;">${metadata.error_details}</div>
            </div>
          </div>
        ` : ''}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #1a1a1a; text-align: center; color: #6b7280; font-size: 12px;">
          <p>This is a computer-generated error report. Please present to finance department if assistance is needed.</p>
          <p style="margin-top: 4px;">© ${dayjs().year()} ${schoolInfo.name}. All rights reserved.</p>
          <p style="margin-top: 8px; font-size: 11px; color: #9ca3af;">Generated on ${dayjs().format('MMMM D, YYYY h:mm:ss A')}</p>
        </div>
      `;

      document.body.appendChild(receiptDiv);

      try {
        const canvas = await html2canvas(receiptDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`error-report-${payment.transaction_reference || 'payment'}.pdf`);

        toast.success('Error report downloaded successfully!', { id: 'error-pdf' });
      } catch (error) {
        console.error('PDF generation error:', error);
        toast.error('Failed to generate PDF. Please try again.', { id: 'error-pdf' });
      } finally {
        document.body.removeChild(receiptDiv);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate PDF. Please try again.', { id: 'error-pdf' });
    }
  };

  // Get metadata for display
  const metadata = payment.metadata || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Error Image */}
        <div className="flex justify-center pt-6 px-4">
          {errorImage ? (
            <img 
              src={errorImage} 
              alt="Payment Failed" 
              className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
            />
          ) : (
            <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center">
              <span className="text-6xl">❌</span>
            </div>
          )}
        </div>

        <div className="text-center px-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className={`text-2xl font-bold ${
            errorType === 'cancelled' ? 'text-gray-600 dark:text-gray-400' :
            errorType === 'network' ? 'text-orange-600 dark:text-orange-400' :
            'text-red-600 dark:text-red-400'
          }`}>
            {title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
          {errorType === 'cancelled' && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
              <XCircle className="w-3.5 h-3.5" />
              No funds deducted
            </div>
          )}
          {errorType === 'network' && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              Check your connection
            </div>
          )}
          {errorType === 'gateway' && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              Try bank transfer
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Transaction Details */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Transaction Details</h4>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-2 max-h-60 overflow-y-auto">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Fee Name</span>
                <span className="font-medium text-gray-900 dark:text-white">{metadata.fee_name || payment.fee_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Fee ID</span>
                <span className="font-medium text-gray-900 dark:text-white font-mono text-xs">{metadata.fee_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Assignment ID</span>
                <span className="font-medium text-gray-900 dark:text-white font-mono text-xs">{metadata.assignment_id || payment.assignment_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Student Name</span>
                <span className="font-medium text-gray-900 dark:text-white">{metadata.student_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Student ID</span>
                <span className="font-medium text-gray-900 dark:text-white">{metadata.student_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Reference</span>
                <span className="font-medium text-gray-900 dark:text-white font-mono text-xs">{metadata.reference || payment.transaction_reference || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Date</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {dayjs(payment.payment_date || metadata.timestamp || new Date()).format('ddd MMM DD YYYY')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Time</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {dayjs(payment.payment_date || metadata.timestamp || new Date()).format('HH:mm:ss')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Amount</span>
                <span className="font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(payment.amount_paid || payment.amount || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Payment Method</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">{payment.payment_method || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className={`font-medium flex items-center gap-1 ${
                  errorType === 'cancelled' 
                    ? 'text-gray-600 dark:text-gray-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  <XCircle className="w-4 h-4" />
                  {errorType === 'cancelled' ? 'CANCELLED' : 'FAILED'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">User Action</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {metadata.was_cancelled_by_user ? 'USER CANCELLED' : 'FAILED'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Fraud Risk</span>
                <span className="font-medium text-gray-900 dark:text-white">{metadata.fraud_risk || 'NONE'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">IP Address</span>
                <span className="font-medium text-gray-900 dark:text-white font-mono text-xs">{metadata.ip_address || 'Not recorded'}</span>
              </div>
              {metadata.was_cancelled_by_user && (
                <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span className="text-gray-500 dark:text-gray-400">Cancellation Reason</span>
                  <span className="font-medium text-yellow-600 dark:text-yellow-400">User closed payment window before completion</span>
                </div>
              )}
              {payment.failure_reason && (
                <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span className="text-gray-500 dark:text-gray-400">Failure Reason</span>
                  <span className="font-medium text-red-600 dark:text-red-400">{payment.failure_reason}</span>
                </div>
              )}
              {metadata.cancelled_at && (
                <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span className="text-gray-500 dark:text-gray-400">Cancelled At</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {dayjs(metadata.cancelled_at).format('ddd MMM DD YYYY HH:mm:ss')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Full Metadata Toggle */}
          {metadata && Object.keys(metadata).length > 0 && (
            <div>
              <button
                onClick={() => setShowFullMetadata(!showFullMetadata)}
                className="flex items-center justify-between w-full text-xs text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <span className="font-medium flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Full Metadata
                </span>
                {showFullMetadata ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showFullMetadata && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg max-h-40 overflow-y-auto">
                  <pre className="text-[10px] text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
                    {JSON.stringify(metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Error Details */}
          {metadata.error_details && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Error Details</h4>
              <div className={`rounded-xl p-3 max-h-40 overflow-y-auto border ${
                errorType === 'cancelled' 
                  ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                  : errorType === 'network'
                  ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
                  : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
              }`}>
                <pre className={`text-xs font-mono whitespace-pre-wrap ${
                  errorType === 'cancelled' 
                    ? 'text-yellow-700 dark:text-yellow-300'
                    : errorType === 'network'
                    ? 'text-orange-700 dark:text-orange-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {metadata.error_details}
                </pre>
              </div>
            </div>
          )}

          {/* Error Type Specific Message */}
          {errorType === 'cancelled' && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-700 dark:text-yellow-300 flex items-start gap-1.5">
                <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>You closed the payment window before the transaction could be completed. No funds were deducted from your account. You can try again at any time.</span>
              </p>
            </div>
          )}

          {errorType === 'network' && (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-xs text-orange-700 dark:text-orange-300 flex items-start gap-1.5">
                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>Network connection issue detected. Please check your internet connection and try again. If the problem persists, try using a different network or use bank transfer.</span>
              </p>
            </div>
          )}

          {errorType === 'gateway' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-700 dark:text-red-300 flex items-start gap-1.5">
                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>Payment gateway is currently unavailable. Please try again later or use the bank transfer option as an alternative payment method.</span>
              </p>
            </div>
          )}

          {errorType === 'bank' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-700 dark:text-red-300 flex items-start gap-1.5">
                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>Bank transfer submission failed. Please verify the account details and try again. If the issue persists, contact the school's finance department.</span>
              </p>
            </div>
          )}

          {/* Download Button */}
          <button
            onClick={downloadErrorReport}
            className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Error Report (PDF)
          </button>

          {/* Action Buttons */}
          <div className="flex flex-col xs:flex-row gap-2">
            <button
              onClick={onRetry}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {errorType === 'cancelled' ? 'Try Again' : 'Retry'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Close
            </button>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 flex items-start gap-1.5">
              <HelpCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>If this issue persists, please contact the school's finance department with the downloaded error report for assistance.</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ErrorDetailsModal;
