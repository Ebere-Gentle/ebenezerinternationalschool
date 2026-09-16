
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckSquare,
  Users,
  Receipt,
  UserPlus,
  Calendar,
  AlertCircle,
  CreditCard,
  ArrowUpRight,
  WalletCards,
  Clock3,
} from 'lucide-react';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

interface TaskSummary {
  pendingAdmissions: number;
  pendingPayments: number;
  overduePayments: number;
  inactiveStudents: number;
  newAdmissions: number;
  outstandingAmount: number;
  collectedAmount: number;
}

interface PaymentRecord {
  id: string;
  amount: number | null;
  amount_paid: number | null;
  balance: number | null;
  status: string | null;
  due_date: string | null;
}

const EMPTY_SUMMARY: TaskSummary = {
  pendingAdmissions: 0,
  pendingPayments: 0,
  overduePayments: 0,
  inactiveStudents: 0,
  newAdmissions: 0,
  outstandingAmount: 0,
  collectedAmount: 0,
};

const Tasks: React.FC = () => {
  const { user } = useAuth();

  const [summary, setSummary] =
    useState<TaskSummary>(EMPTY_SUMMARY);

  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      /*
       * Resolve branch safely.
       *
       * The application can identify a user using either:
       * users.user_id = auth.users.id
       * or
       * users.id = auth.users.id
       */
      let branchId: string | null =
        user.branch_id || null;

      if (!branchId) {
        const { data: userByUserId } = await supabase
          .from('users')
          .select('branch_id')
          .eq('user_id', user.id)
          .maybeSingle();

        branchId = userByUserId?.branch_id || null;
      }

      if (!branchId) {
        const { data: userById } = await supabase
          .from('users')
          .select('branch_id')
          .eq('id', user.id)
          .maybeSingle();

        branchId = userById?.branch_id || null;
      }

      if (!branchId) {
        setSummary(EMPTY_SUMMARY);
        return;
      }

      /*
       * Use the browser's local date for "today".
       * This avoids using a stale hard-coded date.
       */
      const now = new Date();

      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      const startOfTomorrow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );

      const todayDate = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`;

      /*
       * Run independent database queries in parallel.
       */
      const [
        pendingAdmissionsResult,
        pendingPaymentsResult,
        overduePaymentsResult,
        inactiveStudentsResult,
        newAdmissionsResult,
        paymentsResult,
      ] = await Promise.all([
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', branchId)
          .eq('admission_status', 'pending'),

        supabase
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', branchId)
          .eq('status', 'pending'),

        supabase
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', branchId)
          .eq('status', 'pending')
          .lt('due_date', todayDate),

        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', branchId)
          .eq('current_status', 'inactive'),

        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', branchId)
          .gte(
            'created_at',
            startOfToday.toISOString()
          )
          .lt(
            'created_at',
            startOfTomorrow.toISOString()
          ),

        /*
         * Payment data is used for actual financial
         * outstanding and collected totals.
         */
        supabase
          .from('payments')
          .select(
            'id, amount, amount_paid, balance, status, due_date'
          )
          .eq('branch_id', branchId),
      ]);

      if (pendingAdmissionsResult.error) {
        throw pendingAdmissionsResult.error;
      }

      if (pendingPaymentsResult.error) {
        throw pendingPaymentsResult.error;
      }

      if (overduePaymentsResult.error) {
        throw overduePaymentsResult.error;
      }

      if (inactiveStudentsResult.error) {
        throw inactiveStudentsResult.error;
      }

      if (newAdmissionsResult.error) {
        throw newAdmissionsResult.error;
      }

      if (paymentsResult.error) {
        throw paymentsResult.error;
      }

      const payments =
        (paymentsResult.data || []) as PaymentRecord[];

      /*
       * Calculate actual financial position.
       *
       * Collected:
       * completed / paid payment records
       *
       * Outstanding:
       * positive balance on non-rejected/non-cancelled records
       */
      let collectedAmount = 0;
      let outstandingAmount = 0;

      payments.forEach((payment) => {
        const status = String(
          payment.status || ''
        ).toLowerCase();

        if (
          status === 'completed' ||
          status === 'paid'
        ) {
          collectedAmount +=
            Number(payment.amount_paid) ||
            Number(payment.amount) ||
            0;
        }

        const balance = Number(payment.balance) || 0;

        if (
          balance > 0 &&
          status !== 'cancelled' &&
          status !== 'canceled' &&
          status !== 'rejected'
        ) {
          outstandingAmount += balance;
        }
      });

      setSummary({
        pendingAdmissions:
          pendingAdmissionsResult.count || 0,

        pendingPayments:
          pendingPaymentsResult.count || 0,

        overduePayments:
          overduePaymentsResult.count || 0,

        inactiveStudents:
          inactiveStudentsResult.count || 0,

        newAdmissions:
          newAdmissionsResult.count || 0,

        outstandingAmount,

        collectedAmount,
      });
    } catch (error) {
      console.error(
        'Tasks widget error:',
        error
      );

      setSummary(EMPTY_SUMMARY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    if (!user?.id) return;

    /*
     * Keep the dashboard current when students
     * or payments change.
     */
    const channel = supabase
      .channel('admin-tasks-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
        },
        () => {
          fetchTasks();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const formatMoney = (amount: number) => {
    if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(1)}m`;
    }

    if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(0)}k`;
    }

    return `₦${Math.round(amount).toLocaleString()}`;
  };

  const totalActions = useMemo(
    () =>
      summary.pendingAdmissions +
      summary.pendingPayments +
      summary.overduePayments,
    [summary]
  );

  const urgent =
    summary.overduePayments > 0 ||
    summary.pendingAdmissions > 0;

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-[300px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />

          <div className="space-y-1.5">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-28 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-[65px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700"
            />
          ))}
        </div>

        <div className="mt-3 h-[65px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-[300px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
          <CheckSquare className="h-5 w-5 text-white" />
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Action Centre
          </h3>

          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            Administrative tasks
          </p>
        </div>

        <div
          className={`ml-auto shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
            urgent
              ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
              : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
          }`}
        >
          {urgent
            ? `${totalActions} require attention`
            : 'All clear'}
        </div>
      </div>

      {/* Main actions */}
      <div className="grid grid-cols-2 gap-2">
        {/* Admissions */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-2.5 dark:border-blue-900/30 dark:bg-blue-900/10">
          <div className="flex items-center justify-between">
            <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />

            <span className="text-lg font-bold leading-none text-blue-700 dark:text-blue-300">
              {summary.pendingAdmissions}
            </span>
          </div>

          <p className="mt-2 truncate text-[10px] font-semibold text-gray-600 dark:text-gray-300">
            Pending Admissions
          </p>

          <div className="mt-1 flex items-center gap-1 text-[9px] text-gray-400">
            <ArrowUpRight className="h-3 w-3" />
            Needs review
          </div>
        </div>

        {/* Payments */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-2.5 dark:border-amber-900/30 dark:bg-amber-900/10">
          <div className="flex items-center justify-between">
            <Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" />

            <span className="text-lg font-bold leading-none text-amber-700 dark:text-amber-300">
              {summary.pendingPayments}
            </span>
          </div>

          <p className="mt-2 truncate text-[10px] font-semibold text-gray-600 dark:text-gray-300">
            Pending Payments
          </p>

          <div className="mt-1 flex items-center gap-1 text-[9px] text-gray-400">
            <Clock3 className="h-3 w-3" />
            Awaiting action
          </div>
        </div>

        {/* Overdue */}
        <div
          className={`rounded-xl border p-2.5 ${
            summary.overduePayments > 0
              ? 'border-red-100 bg-red-50/60 dark:border-red-900/30 dark:bg-red-900/10'
              : 'border-gray-100 bg-gray-50/60 dark:border-gray-700 dark:bg-gray-700/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <AlertCircle
              className={`h-4 w-4 ${
                summary.overduePayments > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-400'
              }`}
            />

            <span
              className={`text-lg font-bold leading-none ${
                summary.overduePayments > 0
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {summary.overduePayments}
            </span>
          </div>

          <p className="mt-2 truncate text-[10px] font-semibold text-gray-600 dark:text-gray-300">
            Overdue Payments
          </p>

          <div className="mt-1 text-[9px] text-gray-400">
            {summary.overduePayments > 0
              ? 'Requires attention'
              : 'Nothing overdue'}
          </div>
        </div>

        {/* New today */}
        <div className="rounded-xl border border-green-100 bg-green-50/60 p-2.5 dark:border-green-900/30 dark:bg-green-900/10">
          <div className="flex items-center justify-between">
            <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />

            <span className="text-lg font-bold leading-none text-green-700 dark:text-green-300">
              {summary.newAdmissions}
            </span>
          </div>

          <p className="mt-2 truncate text-[10px] font-semibold text-gray-600 dark:text-gray-300">
            New Students Today
          </p>

          <div className="mt-1 text-[9px] text-gray-400">
            Registered today
          </div>
        </div>
      </div>

      {/* Financial snapshot */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-700/40">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
            <WalletCards className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>

          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wide text-gray-400">
              Collected
            </p>

            <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
              {formatMoney(summary.collectedAmount)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-700/40">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
            <CreditCard className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>

          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wide text-gray-400">
              Outstanding
            </p>

            <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
              {formatMoney(summary.outstandingAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-700">
        <div className="flex items-center gap-1.5">
          <Users className="h-3 w-3 text-gray-400" />

          <span className="text-[9px] text-gray-400">
            {summary.inactiveStudents} inactive student
            {summary.inactiveStudents === 1 ? '' : 's'}
          </span>
        </div>

        <span className="text-[9px] font-medium text-gray-400">
          Live branch data
        </span>
      </div>
    </motion.div>
  );
};

export default Tasks;
