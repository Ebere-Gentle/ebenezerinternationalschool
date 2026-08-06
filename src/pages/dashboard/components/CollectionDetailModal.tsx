// src/pages/dashboard/components/CollectionDetailModal.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Package, Calendar, School, PenTool, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';

interface CollectionDetailModalProps {
  open: boolean;
  onClose: () => void;
  collection: any;
}

const CollectionDetailModal: React.FC<CollectionDetailModalProps> = ({ open, onClose, collection }) => {
  if (!collection) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-500" />
                Collection Details
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Student Info */}
              <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {collection.student_name?.[0] || 'S'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {collection.student_name || 'Unknown Student'}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <School className="w-4 h-4" />
                    <span>{collection.class_at_collection || 'N/A'}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(collection.status || 'completed')}`}>
                  {getStatusIcon(collection.status || 'completed')}
                  {collection.status || 'Completed'}
                </span>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-teal-500" />
                  Items Collected
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-2">
                  {collection.items && collection.items.length > 0 ? (
                    collection.items.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 last:border-0 pb-1.5 last:pb-0">
                        <span className="text-sm text-gray-800 dark:text-gray-200">{item.item_name}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">×{item.quantity}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-800 dark:text-gray-200">{collection.item_name}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">×{collection.quantity}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {dayjs(collection.collection_date).format('MMMM D, YYYY')}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Session</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {collection.session_name || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Term</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {collection.term_name || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Recorded By</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {collection.recorded_by || 'System'}
                  </p>
                </div>
              </div>

              {/* Signature */}
              {collection.signature_url && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <PenTool className="w-3.5 h-3.5" />
                    Signature
                  </p>
                  <div className="mt-1">
                    <img 
                      src={collection.signature_url} 
                      alt="Signature" 
                      className="h-12 object-contain bg-white dark:bg-gray-700 rounded-lg p-1"
                    />
                  </div>
                </div>
              )}

              {/* Remarks */}
              {collection.remarks && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Remarks</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{collection.remarks}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium hover:opacity-90 transition-all text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CollectionDetailModal;