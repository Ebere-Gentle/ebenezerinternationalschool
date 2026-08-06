// src/pages/parent/components/FailureModal.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, AlertTriangle, ChevronDown, ChevronUp, Download } from 'lucide-react';

interface FailureModalProps {
  isOpen: boolean;
  reason: string;
  details: string;
  onRetry: () => void;
  onClose: () => void;
}

const FailureModal: React.FC<FailureModalProps> = ({
  isOpen,
  reason,
  details,
  onRetry,
  onClose,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const downloadErrorReport = () => {
    const blob = new Blob([details], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-error-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 text-center max-h-[90vh] overflow-y-auto"
      >
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <X className="w-7 h-7 sm:w-8 sm:h-8 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Payment Unsuccessful</h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
          {reason || 'There was an issue processing your payment. Please try again.'}
        </p>
        
        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800 text-left">
          <p className="text-xs text-orange-700 dark:text-orange-300 flex items-start gap-1.5">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>Please check your payment details and try again. If the issue persists, contact your bank.</span>
          </p>
        </div>

        {details && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full text-xs text-gray-600 dark:text-gray-400"
            >
              <span className="font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                View Error Details
              </span>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800 text-[10px] text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto"
                >
                  {details}
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={downloadErrorReport}
              className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              Download Error Report
            </button>
          </div>
        )}

        <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 mt-4">
          <button
            onClick={onClose}
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

export default FailureModal;
