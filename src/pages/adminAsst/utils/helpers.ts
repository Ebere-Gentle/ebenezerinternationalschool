// src/pages/adminAsst/utils/helpers.ts

import dayjs from 'dayjs';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: string | null) => {
  if (!date) return 'N/A';
  return dayjs(date).format('MMMM D, YYYY');
};

export const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    transferred: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    admitted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return styles[status] || styles.pending;
};

export const getGenderBadge = (gender: string) => {
  const styles: Record<string, string> = {
    male: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    female: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    other: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return styles[gender] || 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300';
};

export const getLevelBadge = (level: string) => {
  const styles: Record<string, string> = {
    nursery: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    secondary: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    creche: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };
  return styles[level] || 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
};

export const getBloodGroupBadge = (bloodGroup: string) => {
  const styles: Record<string, string> = {
    'A+': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'A-': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'B+': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'B-': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'AB+': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'AB-': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'O+': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'O-': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };
  return styles[bloodGroup] || 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300';
};
