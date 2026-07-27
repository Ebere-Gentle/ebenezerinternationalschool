export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatTime = (date: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const formatDateTime = (date: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const getStatusBadgeClass = (status: string): string => {
  const styles: Record<string, string> = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    present: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    late: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    excused: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'high': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'medium': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'low': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    ongoing: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };
  return styles[status] || styles.pending;
};

export const getGradeColor = (grade: string): string => {
  const colors: Record<string, string> = {
    A: 'text-green-600 dark:text-green-400',
    B: 'text-blue-600 dark:text-blue-400',
    C: 'text-yellow-600 dark:text-yellow-400',
    D: 'text-orange-600 dark:text-orange-400',
    E: 'text-red-600 dark:text-red-400',
    F: 'text-red-600 dark:text-red-400',
  };
  return colors[grade] || 'text-gray-600 dark:text-gray-400';
};
