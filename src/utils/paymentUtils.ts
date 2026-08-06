import dayjs from 'dayjs';

export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'pending' | 'overdue' | 'waived' | 'completed' | 'failed' | 'approved' | 'rejected';

export interface FeeAssignmentStatus {
  status: PaymentStatus;
  label: string;
  badgeColor: string;
  icon: string;
  isPayable: boolean;
  canRetry: boolean;
}

export function getAssignmentStatusInfo(
  assignment: {
    payment_status: string;
    balance: number;
    amount_due: number;
    amount_paid: number;
    due_date?: string | null;
  },
  hasPendingPayment: boolean = false,
  hasFailedPayment: boolean = false
): FeeAssignmentStatus {
  const isPaid = assignment.payment_status === 'paid' || assignment.balance <= 0;
  const isWaived = assignment.payment_status === 'waived';
  const isOverdue = assignment.due_date 
    ? dayjs(assignment.due_date).isBefore(dayjs()) && !isPaid 
    : false;
  const isPartial = assignment.amount_paid > 0 && assignment.balance > 0 && !isPaid;

  let status: PaymentStatus = 'unpaid';
  let label = 'Unpaid';
  let badgeColor = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  let icon = 'AlertCircle';
  let isPayable = true;
  let canRetry = false;

  if (isWaived) {
    status = 'waived';
    label = 'Exempted';
    badgeColor = 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    icon = 'Shield';
    isPayable = false;
  } else if (isPaid) {
    status = 'paid';
    label = 'Paid';
    badgeColor = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    icon = 'CheckCircle';
    isPayable = false;
  } else if (hasPendingPayment) {
    status = 'pending';
    label = 'Awaiting Approval';
    badgeColor = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    icon = 'Clock';
    isPayable = false;
  } else if (hasFailedPayment) {
    status = 'failed';
    label = 'Payment Failed';
    badgeColor = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    icon = 'XCircle';
    isPayable = true;
    canRetry = true;
  } else if (isOverdue) {
    status = 'overdue';
    label = 'Overdue';
    badgeColor = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    icon = 'AlertCircle';
    isPayable = true;
  } else if (isPartial) {
    status = 'partial';
    label = 'Partial';
    badgeColor = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    icon = 'AlertCircle';
    isPayable = true;
  } else {
    status = 'unpaid';
    label = 'Unpaid';
    badgeColor = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    icon = 'XCircle';
    isPayable = true;
  }

  return {
    status,
    label,
    badgeColor,
    icon,
    isPayable,
    canRetry,
  };
}

export function getPaymentStatusBadge(status: string): string {
  const styles: Record<string, string> = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    processing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    unpaid: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    waived: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return styles[status] || styles.pending;
}

export function getCategoryBadge(category: string): string {
  const styles: Record<string, string> = {
    school_fees: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    books: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    uniform: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    sportswear: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
    bus: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    pta: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    examination: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    medical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    graduation: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    development_levy: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    identity_card: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    excursion: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    hostel: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
    laboratory: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    lesson_fee: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    extra_classes: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    ict: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    custom: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };
  return styles[category] || styles.custom;
}

export function getStatusIcon(status: string): string {
  switch (status) {
    case 'paid':
    case 'completed':
    case 'approved':
      return 'CheckCircle';
    case 'pending':
    case 'processing':
      return 'Clock';
    case 'overdue':
      return 'AlertCircle';
    case 'waived':
      return 'Shield';
    case 'failed':
    case 'rejected':
      return 'XCircle';
    default:
      return 'AlertCircle';
  }
}
