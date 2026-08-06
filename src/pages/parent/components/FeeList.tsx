// src/pages/parent/components/FeeList.tsx

import React from 'react';
import { FileText, Calendar, CheckCircle, Clock, AlertCircle, XCircle, Shield, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';
import { getCategoryBadge } from '../../../utils/paymentUtils';

interface FeeListProps {
  assignments: any[];
  totalAssignments: number;
  payments: any[];
  filterStatus: 'all' | 'unpaid' | 'paid' | 'overdue' | 'pending' | 'cancelled' | 'failed';
  onFilterChange: (status: any) => void;
  onPayNow: (assignment: any) => void;
  onViewError: (payment: any) => void;
  processing: boolean;
  formatCurrency: (amount: number) => string;
  getPaymentStatusForAssignment: (assignment: any) => any;
}

const FeeList: React.FC<FeeListProps> = ({
  assignments,
  totalAssignments,
  payments,
  filterStatus,
  onFilterChange,
  onPayNow,
  onViewError,
  processing,
  formatCurrency,
  getPaymentStatusForAssignment,
}) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'paid': return 'text-green-600 dark:text-green-400';
      case 'pending': return 'text-yellow-600 dark:text-yellow-400';
      case 'overdue': return 'text-red-600 dark:text-red-400';
      case 'cancelled': return 'text-gray-600 dark:text-gray-400';
      case 'failed': return 'text-orange-600 dark:text-orange-400';
      case 'waived': return 'text-purple-600 dark:text-purple-400';
      default: return 'text-gray-900 dark:text-white';
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'overdue': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'cancelled': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      case 'failed': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'waived': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300';
    }
  };

  const getButtonText = (status: string): string => {
    switch (status) {
      case 'cancelled': return 'Try Again';
      case 'failed': return 'Retry';
      default: return 'Pay';
    }
  };

  const getButtonStyle = (status: string, disabled: boolean): string => {
    if (disabled) {
      return 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400';
    }
    switch (status) {
      case 'cancelled':
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:opacity-90';
      case 'failed':
        return 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90';
      default:
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex flex-col xs:flex-row xs:items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 gap-2 xs:gap-3">
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
          <span className="truncate">Fees</span>
          <span className="text-xs sm:text-sm font-normal text-gray-500 flex-shrink-0">
            ({assignments.length} of {totalAssignments})
          </span>
        </h3>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <select
            value={filterStatus}
            onChange={(e) => onFilterChange(e.target.value as any)}
            className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
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
        {assignments.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">No fees found</p>
            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
              {filterStatus !== 'all' ? `No ${filterStatus} fees` : 'All fees are paid!'}
            </p>
          </div>
        ) : (
          assignments.map((assignment) => {
            const statusInfo = getPaymentStatusForAssignment(assignment);
            
            // Find the most recent failed or cancelled payment for this assignment
            const failedPayment = payments
              .filter(p => 
                p.assignment_id === assignment.id && 
                (p.status === 'failed' || p.status === 'rejected' || p.status === 'cancelled' || p.status === 'canceled')
              )
              .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];
            
            const hasPending = payments.some(p => 
              p.assignment_id === assignment.id && 
              (p.status === 'pending' || p.status === 'processing')
            );

            // Determine if we should show the pay button
            const showPayButton = statusInfo.isPayable || 
              statusInfo.status === 'cancelled' || 
              statusInfo.status === 'failed';
            
            // Determine if we should show the view error button
            const showViewError = (statusInfo.status === 'failed' || statusInfo.status === 'cancelled') && failedPayment;

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
                      <span className={`inline-flex px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium ${getCategoryBadge(assignment.fee_category || '')}`}>
                        {assignment.fee_category?.replace(/_/g, ' ') || 'Fee'}
                      </span>
                      <span className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                        {assignment.fee_name || 'Unknown Fee'}
                      </span>
                      {statusInfo.status === 'cancelled' && (
                        <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                          <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          Cancelled
                        </span>
                      )}
                      {statusInfo.status === 'failed' && (
                        <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          Failed
                        </span>
                      )}
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
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
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
                    <p className={`font-bold text-xs sm:text-sm md:text-base ${getStatusColor(statusInfo.status)}`}>
                      {statusInfo.status === 'paid' || statusInfo.status === 'waived' ? '✅' : 
                       statusInfo.status === 'pending' ? '⏳' : 
                       statusInfo.status === 'cancelled' ? '🚫' :
                       statusInfo.status === 'failed' ? '❌' :
                       formatCurrency(assignment.balance)}
                    </p>
                    <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                      <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium ${getStatusBadgeColor(statusInfo.status)}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    
                    {/* Pay/Retry/Try Again Button */}
                    {showPayButton && (
                      <button
                        onClick={() => onPayNow(assignment)}
                        disabled={processing || hasPending}
                        className={`mt-0.5 sm:mt-1 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-lg transition-all ${getButtonStyle(statusInfo.status, processing || hasPending)}`}
                      >
                        {hasPending ? 'Processing...' : getButtonText(statusInfo.status)}
                      </button>
                    )}
                    
                    {/* View Error Button - Show for cancelled or failed */}
                    {showViewError && failedPayment && (
                      <button
                        onClick={() => {
                          console.log('View Error clicked for payment:', failedPayment);
                          onViewError(failedPayment);
                        }}
                        className="mt-0.5 flex items-center justify-end gap-0.5 text-[8px] sm:text-[10px] text-orange-600 dark:text-orange-400 hover:underline w-full"
                      >
                        <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        View Error
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-gray-200 dark:border-gray-700 text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">
        Showing {assignments.length} of {totalAssignments} fees
      </div>
    </div>
  );
};

export default FeeList;
