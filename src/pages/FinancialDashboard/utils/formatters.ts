export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-NG').format(value);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date: string): string => {
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return colors[status] || colors.pending;
};

export const getStatusIcon = (status: string): string => {
  const icons: Record<string, string> = {
    completed: '✅',
    paid: '✅',
    approved: '✅',
    pending: '⏳',
    rejected: '❌',
    failed: '❌',
    refunded: '↩️',
    active: '🟢',
    inactive: '🔴',
  };
  return icons[status] || '⏳';
};
