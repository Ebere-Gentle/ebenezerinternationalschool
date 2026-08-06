// src/pages/parent/utils/paymentHelpers.ts

import dayjs from 'dayjs';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getErrorType = (payment: any): 'cancelled' | 'network' | 'gateway' | 'bank' | 'unknown' => {
  if (payment.metadata?.was_cancelled_by_user) {
    return 'cancelled';
  }
  
  const errorDetails = payment.metadata?.error_details || payment.gateway_response?.details || '';
  const errorType = payment.gateway_response?.error_type || '';
  
  if (errorType === 'network' || errorDetails.toLowerCase().includes('network')) {
    return 'network';
  }
  
  if (errorType === 'gateway' || errorDetails.toLowerCase().includes('gateway') || 
      errorDetails.toLowerCase().includes('paystack')) {
    return 'gateway';
  }
  
  if (payment.payment_method === 'bank_transfer' || 
      errorDetails.toLowerCase().includes('bank') || 
      errorDetails.toLowerCase().includes('transfer')) {
    return 'bank';
  }
  
  return 'unknown';
};

export const getErrorTitle = (errorType: string): string => {
  switch (errorType) {
    case 'cancelled': return 'Payment Cancelled';
    case 'network': return 'Network Error';
    case 'gateway': return 'Gateway Unavailable';
    case 'bank': return 'Bank Transfer Failed';
    default: return 'Payment Failed';
  }
};

export const getErrorDescription = (errorType: string, payment: any): string => {
  switch (errorType) {
    case 'cancelled': 
      return 'You closed the payment window before completion';
    case 'network':
      return 'Network connection issue detected';
    case 'gateway':
      return 'Payment gateway is currently unavailable';
    case 'bank':
      return 'Bank transfer submission failed';
    default:
      return payment.failure_reason || 'Transaction unsuccessful';
  }
};

export const getStatusColor = (status: string): string => {
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

export const getStatusBadgeColor = (status: string): string => {
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

export const getButtonText = (status: string): string => {
  switch (status) {
    case 'cancelled': return 'Try Again';
    case 'failed': return 'Retry';
    default: return 'Pay';
  }
};

export const getButtonStyle = (status: string, processing: boolean): string => {
  if (processing) {
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

export const schoolInfo = {
  name: 'Ebenezer International School',
  email: 'info@ebeniza.edu.ng',
  phone: '+234 800 000 0000',
  address: '42 Allen Avenue, Ikeja, Lagos',
  motto: 'Excellence in Education'
};
