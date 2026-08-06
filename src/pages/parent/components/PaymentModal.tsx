// src/pages/parent/components/PaymentModal.tsx

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, CreditCard, Building2, Banknote, Info, Shield, Loader2, Send, Copy, Check, Upload, File, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  isOpen: boolean;
  selectedAssignment: any;
  paymentGateway: any;
  amount: number;
  paymentMethod: 'paystack' | 'bank_transfer';
  onPaymentMethodChange: (method: 'paystack' | 'bank_transfer') => void;
  uploadedFile: File | null;
  uploadPreview: string | null;
  transactionReference: string;
  onFileChange: (file: File | null) => void;
  onFileRemove: () => void;
  onTransactionReferenceChange: (ref: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  processing: boolean;
  uploading: boolean;
  gatewayLoading: boolean;
  copied: boolean;
  onCopy: (text: string) => void;
  formatCurrency: (amount: number) => string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  selectedAssignment,
  paymentGateway,
  amount,
  paymentMethod,
  onPaymentMethodChange,
  uploadedFile,
  uploadPreview,
  transactionReference,
  onFileChange,
  onFileRemove,
  onTransactionReferenceChange,
  onClose,
  onSubmit,
  processing,
  uploading,
  gatewayLoading,
  copied,
  onCopy,
  formatCurrency,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !selectedAssignment || !paymentGateway) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        e.target.value = '';
        return;
      }
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a JPEG, PNG, or PDF file');
        e.target.value = '';
        return;
      }
      onFileChange(file);
      toast.success(`File "${file.name}" uploaded!`);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex items-center justify-between z-10">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            Payment Details
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Amount */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-4 text-white">
            <p className="text-sm opacity-80">Total Amount</p>
            <p className="text-2xl font-bold">{formatCurrency(amount)}</p>
            <p className="text-xs opacity-70 mt-1 truncate">{selectedAssignment.fee_name}</p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              {paymentGateway.paystack_public_key && (
                <button
                  onClick={() => {
                    onPaymentMethodChange('paystack');
                    onFileRemove();
                    onTransactionReferenceChange('');
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'paystack'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                  }`}
                >
                  <CreditCard className="w-6 h-6 mx-auto text-gray-600 dark:text-gray-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1 block">
                    Card
                  </span>
                  <span className="text-[10px] text-gray-400">Online</span>
                </button>
              )}
              
              {paymentGateway.bank_account_number && (
                <button
                  onClick={() => onPaymentMethodChange('bank_transfer')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                  }`}
                >
                  <Building2 className="w-6 h-6 mx-auto text-gray-600 dark:text-gray-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1 block">
                    Transfer
                  </span>
                  <span className="text-[10px] text-gray-400">Offline</span>
                </button>
              )}
            </div>
          </div>

          {/* Bank Transfer Details */}
          {paymentMethod === 'bank_transfer' && paymentGateway.bank_account_number && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2 border border-gray-200 dark:border-gray-600">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-green-500" />
                  Bank Transfer Details
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-gray-500">Bank</span>
                    <span className="font-medium text-gray-900 dark:text-white">{paymentGateway.bank_name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-gray-500">Account Name</span>
                    <span className="font-medium text-gray-900 dark:text-white">{paymentGateway.bank_account_name}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Account Number</span>
                    <span className="font-medium text-gray-900 dark:text-white font-mono flex items-center gap-2">
                      {paymentGateway.bank_account_number}
                      <button
                        onClick={() => onCopy(paymentGateway.bank_account_number)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                      </button>
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transaction Reference <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => onTransactionReferenceChange(e.target.value)}
                  placeholder="Enter bank transaction reference"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm dark:text-white"
                />
                <p className="text-xs text-gray-400 mt-1">Enter the reference number from your bank transfer receipt</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Upload Payment Proof <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div 
                  onClick={triggerFileInput}
                  className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                    uploadPreview 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/10' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                  }`}
                >
                  {uploadPreview ? (
                    <div className="space-y-2">
                      <div className="relative inline-block">
                        {uploadPreview.startsWith('data:image') ? (
                          <img 
                            src={uploadPreview} 
                            alt="Payment proof" 
                            className="max-h-32 mx-auto rounded-lg object-contain"
                          />
                        ) : (
                          <div className="flex items-center justify-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <File className="w-6 h-6 text-blue-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                              {uploadedFile?.name || 'File uploaded'}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFileRemove();
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400">✓ File uploaded successfully</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-400">JPEG, PNG, PDF (Max 5MB)</p>
                    </>
                  )}
                </div>
              </div>

              {paymentGateway.payment_instructions && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300 whitespace-pre-line">
                    <Info className="w-3 h-3 inline mr-1" />
                    {paymentGateway.payment_instructions}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Paystack Info */}
          {paymentMethod === 'paystack' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                You will be redirected to Paystack secure payment page.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={onSubmit}
            disabled={
              processing || 
              gatewayLoading || 
              (paymentMethod === 'bank_transfer' && (!uploadedFile || !transactionReference))
            }
            className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
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

          <p className="text-xs text-center text-gray-400">
            {paymentMethod === 'paystack' 
              ? 'You will be redirected to complete payment securely'
              : 'Upload proof of payment for verification'}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentModal;
