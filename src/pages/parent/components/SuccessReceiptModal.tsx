// src/pages/parent/components/SuccessReceiptModal.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Receipt, Download, Image as ImageIcon, X } from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import successImage from '../../../assets/transfer.png';

interface SuccessReceiptModalProps {
  isOpen: boolean;
  isBankTransfer: boolean;
  data: any;
  user: any;
  paidFeesCount: number;
  totalFeesCount: number;
  paidPercentage: number;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
}

const SuccessReceiptModal: React.FC<SuccessReceiptModalProps> = ({
  isOpen,
  isBankTransfer,
  data,
  user,
  paidFeesCount,
  totalFeesCount,
  paidPercentage,
  onClose,
  formatCurrency,
}) => {
  if (!isOpen || !data) return null;

  // Calculate remaining fees
  const remainingFees = Math.max(0, totalFeesCount - paidFeesCount);
  const isAllPaid = paidFeesCount === totalFeesCount && totalFeesCount > 0;

  // Generate PDF receipt
  const generatePDFReceipt = async () => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf-generation' });

      const schoolInfo = {
        name: 'Ebenezer International School',
        email: 'info@ebenezer.edu.ng',
        phone: '+234 800 000 0000',
        address: '42 Allen Avenue, Ikeja, Lagos',
        motto: 'Excellence in Education'
      };

      const isSuccess = !isBankTransfer;
      const statusColor = isSuccess ? '#22c55e' : '#f59e0b';
      const statusText = isSuccess ? 'SUCCESSFUL' : 'AWAITING APPROVAL';
      const title = isSuccess ? 'Payment Successful' : 'Payment Submitted for Approval';

      // Load success image
      let imageData = '';
      try {
        const response = await fetch(successImage);
        const blob = await response.blob();
        imageData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error('Could not load success image:', e);
      }

      // Create receipt HTML
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
            <img src="${imageData}" alt="Payment Status" style="width: 120px; height: 120px; object-fit: contain;" />
          </div>
        ` : `
          <div style="text-align: center; margin: 16px 0; font-size: 48px;">
            ${isSuccess ? '✅' : '⏳'}
          </div>
        `}

        <div style="text-align: center; margin: 10px 0 20px 0;">
          <h2 style="font-size: 24px; color: ${statusColor}; margin-bottom: 4px;">${title}</h2>
          <div style="display: inline-block; padding: 4px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; color: white; background-color: ${statusColor};">${statusText}</div>
          ${isBankTransfer ? '<div style="margin-top: 8px; font-size: 14px; color: #f59e0b;">⏳ Awaiting Approval</div>' : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          ${Object.entries({
            'Receipt Number': data?.receipt_number || 'N/A',
            'Transaction Reference': data?.transaction_reference || data?.reference || 'N/A',
            'Date': dayjs(data?.payment_date || new Date()).format('dddd, MMMM D, YYYY'),
            'Time': dayjs(data?.payment_date || new Date()).format('h:mm:ss A'),
            'Amount': formatCurrency(data?.amount_paid || data?.amount || 0),
            'Payment Method': data?.payment_method ? data.payment_method.replace(/_/g, ' ').toUpperCase() : 'Paystack',
            'Fee Name': data?.metadata?.fee_name || data?.fee_name || 'School Fees Payment',
            'Student': data?.metadata?.student_name || data?.student_name || 'N/A',
            'Student ID': data?.metadata?.student_id || data?.student_id || 'N/A',
            'Status': statusText,
          }).map(([label, value]) => `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; color: #6b7280; padding-right: 20px;">${label}</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; font-weight: 500; ${label === 'Amount' ? 'color: #22c55e; font-weight: 700;' : ''}">${value}</td>
            </tr>
          `).join('')}
        </table>

        ${data?.metadata ? `
          <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #1a1a1a;">
            <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #4b5563;">ADDITIONAL DETAILS</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              ${Object.entries({
                'Fee ID': data.metadata.fee_id || 'N/A',
                'Assignment ID': data.metadata.assignment_id || 'N/A',
                'IP Address': data.metadata.ip_address || 'Not recorded',
                'User Agent': data.metadata.user_agent || 'Not recorded',
              }).filter(([_, value]) => value !== null && value !== undefined).map(([label, value]) => `
                <tr>
                  <td style="padding: 4px 0; border-bottom: 1px solid #e5e5e5; color: #6b7280; padding-right: 12px; font-weight: 600;">${label}</td>
                  <td style="padding: 4px 0; border-bottom: 1px solid #e5e5e5; font-weight: 400;">${value}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        ` : ''}

        <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #1a1a1a;">
          <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #4b5563;">ACCOUNT DETAILS</h4>
          <table style="width: 100%; border-collapse: collapse;">
            ${Object.entries({
              'Sender Name': user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'N/A',
              'Sender Account': `****${Math.random().toString().slice(-5)}`,
              'Receiver Name': schoolInfo.name,
              'Receiver Account': `****${Math.random().toString().slice(-5)}`,
              'Narration': data?.metadata?.fee_name || data?.fee_name || 'School Fees Payment'
            }).map(([label, value]) => `
              <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #e5e5e5; color: #6b7280; padding-right: 20px;">${label}</td>
                <td style="padding: 6px 0; border-bottom: 1px solid #e5e5e5; font-weight: 500;">${value}</td>
              </tr>
            `).join('')}
          </table>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #1a1a1a; text-align: center; color: #6b7280; font-size: 12px;">
          <p>This is a computer-generated receipt. No signature required.</p>
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
        pdf.save(`receipt-${data?.receipt_number || 'payment'}.pdf`);

        toast.success('PDF downloaded successfully!', { id: 'pdf-generation' });
      } catch (error) {
        console.error('PDF generation error:', error);
        toast.error('Failed to generate PDF. Please try again.', { id: 'pdf-generation' });
      } finally {
        document.body.removeChild(receiptDiv);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate PDF. Please try again.', { id: 'pdf-generation' });
    }
  };

  // Save as image
  const saveAsImage = async () => {
    try {
      toast.loading('Generating image...', { id: 'image-generation' });
      const modalContent = document.querySelector('.bg-white.dark\\:bg-gray-900.rounded-2xl');
      if (modalContent) {
        const canvas = await html2canvas(modalContent as HTMLElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true,
        });
        const link = document.createElement('a');
        link.download = `receipt-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Image saved successfully!', { id: 'image-generation' });
      }
    } catch (error) {
      console.error('Error saving image:', error);
      toast.error('Failed to save image', { id: 'image-generation' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Success Image */}
        <div className="flex justify-center pt-6 px-4">
          {successImage ? (
            <img 
              src={successImage} 
              alt="Payment Successful" 
              className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
            />
          ) : (
            <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-6xl">🎉</span>
            </div>
          )}
        </div>

        <div className="text-center px-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">
            {isBankTransfer ? 'Payment Submitted for Approval!' : 'Transaction Successful!'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isBankTransfer 
              ? 'Your bank transfer has been submitted and is awaiting approval'
              : 'Your payment has been confirmed successfully'}
          </p>
          {isBankTransfer && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              Awaiting Approval
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Payment Progress */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              You have paid <strong>{paidFeesCount}</strong> out of <strong>{totalFeesCount}</strong> fees ({paidPercentage}%)
            </p>
            <div className="mt-2 h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(paidPercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {isAllPaid ? (
                '🎉 All fees paid! Great job!'
              ) : (
                `${remainingFees} fee${remainingFees > 1 ? 's' : ''} remaining`
              )}
            </p>
          </div>

          {/* Receipt Header */}
          <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-3">
            <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
              <Receipt className="w-5 h-5" />
              <span className="text-sm font-medium">Transaction Receipt</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              # {data?.receipt_number || 'N/A'}
            </p>
          </div>

          {/* Transaction Details */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Transaction Details</h4>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Date</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {dayjs(data?.payment_date || new Date()).format('ddd MMM DD YYYY')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Time</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {dayjs(data?.payment_date || new Date()).format('HH:mm:ss')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Reference</span>
                <span className="font-medium text-gray-900 dark:text-white font-mono text-xs">
                  {data?.transaction_reference || data?.reference || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Amount</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(data?.amount_paid || data?.amount || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className={`font-medium flex items-center gap-1 ${
                  isBankTransfer 
                    ? 'text-yellow-600 dark:text-yellow-400' 
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {isBankTransfer ? (
                    <>
                      <Clock className="w-4 h-4" />
                      AWAITING APPROVAL
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      SUCCESSFUL
                    </>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Type</span>
                <span className="font-medium text-gray-900 dark:text-white">Debit</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Method</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {data?.payment_method || 'Paystack'}
                </span>
              </div>
              {/* Fee Metadata */}
              {data?.metadata?.fee_name && (
                <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span className="text-gray-500 dark:text-gray-400">Fee Name</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {data.metadata.fee_name}
                  </span>
                </div>
              )}
              {data?.metadata?.student_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Student</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {data.metadata.student_name}
                  </span>
                </div>
              )}
              {data?.metadata?.student_id && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Student ID</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {data.metadata.student_id}
                  </span>
                </div>
              )}
              {isBankTransfer && data?.transaction_reference && (
                <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span className="text-gray-500 dark:text-gray-400">Bank Ref</span>
                  <span className="font-medium text-gray-900 dark:text-white font-mono text-xs">
                    {data.transaction_reference}
                  </span>
                </div>
              )}
              {isBankTransfer && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Approval Status</span>
                  <span className="font-medium text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Pending
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col xs:flex-row gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={generatePDFReceipt}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={saveAsImage}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Save as Image
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SuccessReceiptModal;
