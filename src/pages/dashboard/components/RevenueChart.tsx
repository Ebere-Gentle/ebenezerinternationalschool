
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import dayjs, { Dayjs } from 'dayjs';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  ChevronDown,
  CreditCard,
  Loader2,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';


// ============================================================
// TYPES
// ============================================================

interface Payment {
  id: string;
  branch_id: string;
  student_id: string | null;
  fee_id: string | null;
  assignment_id: string | null;

  amount_paid: number | null;
  amount?: number | null;

  payment_date: string;

  payment_method?: string | null;
  receipt_number?: string | null;

  status: string | null;

  academic_session?: string | null;
  academic_term?: string | null;

  term_id?: string | null;
  session_id?: string | null;

  metadata?: Record<string, any> | null;
}

interface Fee {
  id: string;
  name?: string | null;
  category?: string | null;
  amount?: number | null;
}

interface RevenuePoint {
  date: string;
  label: string;
  revenue: number;
  transactions: number;
}

interface MethodData {
  name: string;
  value: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface Summary {
  revenue: number;
  transactions: number;
  averagePayment: number;
  students: number;
}


// ============================================================
// CONSTANTS
// ============================================================

const SUCCESS_STATUSES = [
  'completed',
  'paid',
  'approved',
  'success',
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  bank: 'Bank Transfer',
  transfer: 'Bank Transfer',
  card: 'Card',
  online: 'Online',
  paystack: 'Paystack',
  pos: 'POS',
  cheque: 'Cheque',
  check: 'Cheque',
  mobile_money: 'Mobile Money',
};

const PIE_COLORS = [
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
];


// ============================================================
// COMPONENT
// ============================================================

const RevenueChart: React.FC = () => {
  const { user } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dateRange, setDateRange] = useState<
    [Dayjs, Dayjs] | null
  >([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  const [viewMode, setViewMode] = useState<
    'daily' | 'monthly'
  >('daily');

  const [chartType, setChartType] = useState<
    'line' | 'bar'
  >('line');

  const [showBreakdown, setShowBreakdown] =
    useState(false);

  const [currentSession, setCurrentSession] =
    useState('');

  const [currentTerm, setCurrentTerm] =
    useState('');

  const [currentSessionId, setCurrentSessionId] =
    useState<string | null>(null);


  // ==========================================================
  // BRANCH ID
  // ==========================================================

  const getBranchId = useCallback(() => {
    return (
      user?.branch_id ||
      (user as any)?.metadata?.branch_id ||
      (user as any)?.user_metadata?.branch_id ||
      ''
    );
  }, [user]);


  // ==========================================================
  // NORMALIZE STATUS
  // ==========================================================

  const isSuccessfulPayment = useCallback(
    (status: string | null | undefined) => {
      if (!status) return false;

      return SUCCESS_STATUSES.includes(
        status.toLowerCase().trim()
      );
    },
    []
  );


  // ==========================================================
  // GET PAYMENT AMOUNT
  //
  // amount_paid is the canonical amount used by the
  // existing payment implementation.
  //
  // amount is retained as a fallback for older records.
  // ==========================================================

  const getPaymentAmount = useCallback(
    (payment: Payment) => {
      const amountPaid = Number(
        payment.amount_paid
      );

      if (
        Number.isFinite(amountPaid) &&
        amountPaid > 0
      ) {
        return amountPaid;
      }

      const amount = Number(
        payment.amount
      );

      return Number.isFinite(amount)
        ? amount
        : 0;
    },
    []
  );


  // ==========================================================
  // FETCH DATA
  // ==========================================================

  const fetchData = useCallback(
    async () => {
      const branchId =
        getBranchId();

      if (!branchId) {
        console.error(
          'RevenueChart: No branch ID found.'
        );

        setPayments([]);
        setFees([]);
        setLoading(false);
        setRefreshing(false);

        return;
      }

      setLoading(true);

      try {
        // ----------------------------------------------------
        // CURRENT ACADEMIC SESSION
        //
        // First try the branch's current session ID.
        // This follows the same structure already used in
        // PaymentsList.tsx.
        // ----------------------------------------------------

        let sessionName = '';
        let termName = '';
        let sessionId: string | null = null;

        const {
          data: branchData,
          error: branchError,
        } = await supabase
          .from('branches')
          .select(
            'current_session_id, current_term'
          )
          .eq('id', branchId)
          .maybeSingle();

        if (branchError) {
          console.warn(
            'RevenueChart branch lookup:',
            branchError.message
          );
        }

        if (branchData?.current_session_id) {
          sessionId =
            branchData.current_session_id;

          const {
            data: sessionData,
            error: sessionError,
          } = await supabase
            .from('academic_sessions')
            .select(
              'id, session_name, term_name'
            )
            .eq(
              'id',
              branchData.current_session_id
            )
            .maybeSingle();

          if (sessionError) {
            console.warn(
              'RevenueChart session lookup:',
              sessionError.message
            );
          }

          if (sessionData) {
            sessionName =
              sessionData.session_name ||
              '';

            termName =
              sessionData.term_name ||
              '';
          }
        }

        // ----------------------------------------------------
        // FALLBACK: CURRENT ACADEMIC SESSION
        // ----------------------------------------------------

        if (!sessionName) {
          const {
            data: sessionData,
            error: sessionError,
          } = await supabase
            .from('academic_sessions')
            .select(
              'id, session_name, term_name'
            )
            .eq(
              'branch_id',
              branchId
            )
            .eq(
              'is_current',
              true
            )
            .maybeSingle();

          if (sessionError) {
            console.warn(
              'RevenueChart current session:',
              sessionError.message
            );
          }

          if (sessionData) {
            sessionId =
              sessionData.id ||
              sessionId;

            sessionName =
              sessionData.session_name ||
              '';

            termName =
              sessionData.term_name ||
              '';
          }
        }

        // Branch current_term is a useful fallback when the
        // academic_sessions row doesn't contain term_name.
        if (
          !termName &&
          branchData?.current_term
        ) {
          termName =
            branchData.current_term;
        }

        setCurrentSession(
          sessionName
        );

        setCurrentTerm(
          termName
        );

        setCurrentSessionId(
          sessionId
        );


        // ----------------------------------------------------
        // PAYMENTS
        //
        // Select only columns actually used by the live
        // payment implementation.
        // ----------------------------------------------------

        const {
          data: paymentData,
          error: paymentError,
        } = await supabase
          .from('payments')
          .select(`
            id,
            branch_id,
            student_id,
            fee_id,
            assignment_id,
            amount_paid,
            amount,
            payment_date,
            payment_method,
            receipt_number,
            status,
            academic_session,
            academic_term,
            term_id,
            session_id,
            metadata
          `)
          .eq(
            'branch_id',
            branchId
          )
          .in(
            'status',
            SUCCESS_STATUSES
          )
          .order(
            'payment_date',
            {
              ascending: true,
            }
          );

        if (paymentError) {
          throw paymentError;
        }

        setPayments(
          (paymentData || []) as Payment[]
        );


        // ----------------------------------------------------
        // FEES
        // ----------------------------------------------------

        const {
          data: feeData,
          error: feeError,
        } = await supabase
          .from('fees')
          .select(`
            id,
            name,
            category,
            amount
          `)
          .eq(
            'branch_id',
            branchId
          );

        if (feeError) {
          console.warn(
            'RevenueChart fees:',
            feeError.message
          );
        }

        setFees(
          (feeData || []) as Fee[]
        );

      } catch (error: any) {
        console.error(
          'RevenueChart fetch error:',
          error
        );

        setPayments([]);
        setFees([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getBranchId]
  );


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    if (getBranchId()) {
      fetchData();
    }
  }, [
    fetchData,
    getBranchId,
  ]);


  // ==========================================================
  // SESSION / TERM NORMALIZATION
  // ==========================================================

  const normalizeText = useCallback(
    (value: unknown) => {
      return String(
        value ?? ''
      )
        .trim()
        .toLowerCase();
    },
    []
  );


  // ==========================================================
  // FILTER PAYMENTS
  //
  // Important:
  //
  // We preserve older payments that do not contain academic
  // session/term values when they fall within the selected
  // calendar period.
  //
  // Newer payments containing academic_session / academic_term
  // are matched against the current academic context.
  // ==========================================================

  const sessionFilteredPayments =
    useMemo(() => {
      if (!currentSession) {
        return payments;
      }

      const normalizedCurrentSession =
        normalizeText(
          currentSession
        );

      const normalizedCurrentTerm =
        normalizeText(
          currentTerm
        );

      return payments.filter(
        payment => {
          const paymentSession =
            normalizeText(
              payment.academic_session ||
              payment.metadata?.session
            );

          const paymentTerm =
            normalizeText(
              payment.academic_term ||
              payment.metadata?.term
            );

          const paymentSessionId =
            payment.session_id ||
            payment.metadata?.session_id;

          // Explicit session ID match.
          if (
            currentSessionId &&
            paymentSessionId
          ) {
            return (
              paymentSessionId ===
              currentSessionId
            );
          }

          // Explicit session name match.
          if (
            paymentSession
          ) {
            if (
              paymentSession !==
              normalizedCurrentSession
            ) {
              return false;
            }

            // If current term is known and payment has a term,
            // match it too.
            if (
              normalizedCurrentTerm &&
              paymentTerm
            ) {
              return (
                paymentTerm ===
                normalizedCurrentTerm
              );
            }

            return true;
          }

          // Legacy payment without academic session.
          // Keep it available so historical data isn't silently
          // removed from the revenue chart.
          return true;
        }
      );
    }, [
      payments,
      currentSession,
      currentTerm,
      currentSessionId,
      normalizeText,
    ]);


  // ==========================================================
  // DATE FILTER
  // ==========================================================

  const filteredPayments =
    useMemo(() => {
      if (!dateRange) {
        return sessionFilteredPayments;
      }

      const [
        start,
        end,
      ] = dateRange;

      const startDate =
        start.startOf('day');

      const endDate =
        end.endOf('day');

      return sessionFilteredPayments.filter(
        payment => {
          const paymentDate =
            dayjs(
              payment.payment_date
            );

          if (
            !paymentDate.isValid()
          ) {
            return false;
          }

          return (
            !paymentDate.isBefore(
              startDate
            ) &&
            !paymentDate.isAfter(
              endDate
            )
          );
        }
      );
    }, [
      sessionFilteredPayments,
      dateRange,
    ]);


  // ==========================================================
  // REVENUE CHART DATA
  // ==========================================================

  const revenueData =
    useMemo(() => {
      if (!dateRange) {
        return [];
      }

      const [
        start,
        end,
      ] = dateRange;

      const grouped: Record<
        string,
        RevenuePoint
      > = {};

      // ------------------------------------------------------
      // CREATE EMPTY DATE POINTS
      // ------------------------------------------------------

      if (
        viewMode === 'monthly'
      ) {
        let cursor =
          start.startOf(
            'month'
          );

        const lastDate =
          end.startOf(
            'month'
          );

        while (
          cursor.isBefore(
            lastDate
          ) ||
          cursor.isSame(
            lastDate,
            'month'
          )
        ) {
          const key =
            cursor.format(
              'YYYY-MM'
            );

          grouped[key] = {
            date: key,
            label: cursor.format(
              'MMM YYYY'
            ),
            revenue: 0,
            transactions: 0,
          };

          cursor =
            cursor.add(
              1,
              'month'
            );
        }
      } else {
        let cursor =
          start.startOf('day');

        const lastDate =
          end.startOf('day');

        while (
          cursor.isBefore(
            lastDate
          ) ||
          cursor.isSame(
            lastDate,
            'day'
          )
        ) {
          const key =
            cursor.format(
              'YYYY-MM-DD'
            );

          grouped[key] = {
            date: key,
            label: cursor.format(
              'DD MMM'
            ),
            revenue: 0,
            transactions: 0,
          };

          cursor =
            cursor.add(
              1,
              'day'
            );
        }
      }


      // ------------------------------------------------------
      // ADD PAYMENTS
      // ------------------------------------------------------

      filteredPayments.forEach(
        payment => {
          const paymentDate =
            dayjs(
              payment.payment_date
            );

          if (
            !paymentDate.isValid()
          ) {
            return;
          }

          const key =
            viewMode === 'monthly'
              ? paymentDate.format(
                  'YYYY-MM'
                )
              : paymentDate.format(
                  'YYYY-MM-DD'
                );

          if (
            !grouped[key]
          ) {
            grouped[key] = {
              date: key,
              label:
                viewMode === 'monthly'
                  ? paymentDate.format(
                      'MMM YYYY'
                    )
                  : paymentDate.format(
                      'DD MMM'
                    ),
              revenue: 0,
              transactions: 0,
            };
          }

          grouped[key].revenue +=
            getPaymentAmount(
              payment
            );

          grouped[key]
            .transactions += 1;
        }
      );


      return Object.values(
        grouped
      ).sort(
        (a, b) =>
          a.date.localeCompare(
            b.date
          )
      );
    }, [
      filteredPayments,
      dateRange,
      viewMode,
      getPaymentAmount,
    ]);


  // ==========================================================
  // SUMMARY
  // ==========================================================

  const summary =
    useMemo<Summary>(() => {
      const revenue =
        filteredPayments.reduce(
          (
            total,
            payment
          ) =>
            total +
            getPaymentAmount(
              payment
            ),
          0
        );

      const transactions =
        filteredPayments.length;

      const studentsPaid =
        new Set(
          filteredPayments
            .map(
              payment =>
                payment.student_id
            )
            .filter(Boolean)
        );

      return {
        revenue,
        transactions,

        averagePayment:
          transactions > 0
            ? revenue /
              transactions
            : 0,

        students:
          studentsPaid.size,
      };
    }, [
      filteredPayments,
      getPaymentAmount,
    ]);


  // ==========================================================
  // PAYMENT METHOD BREAKDOWN
  // ==========================================================

  const paymentMethodData =
    useMemo<MethodData[]>(
      () => {
        const grouped: Record<
          string,
          number
        > = {};

        filteredPayments.forEach(
          payment => {
            const raw =
              payment.payment_method ||
              'other';

            const normalized =
              raw
                .toLowerCase()
                .trim();

            const key =
              PAYMENT_METHOD_LABELS[
                normalized
              ] ||
              raw
                .replace(
                  /_/g,
                  ' '
                )
                .replace(
                  /\b\w/g,
                  char =>
                    char.toUpperCase()
                );

            grouped[key] =
              (
                grouped[key] ||
                0
              ) +
              getPaymentAmount(
                payment
              );
          }
        );

        return Object.entries(
          grouped
        )
          .map(
            ([
              name,
              value,
            ]) => ({
              name,
              value,
            })
          )
          .sort(
            (a, b) =>
              b.value -
              a.value
          );
      },
      [
        filteredPayments,
        getPaymentAmount,
      ]
    );


  // ==========================================================
  // FEE CATEGORY BREAKDOWN
  // ==========================================================

  const categoryData =
    useMemo<CategoryData[]>(
      () => {
        const feeMap =
          new Map<
            string,
            Fee
          >();

        fees.forEach(
          fee => {
            feeMap.set(
              fee.id,
              fee
            );
          }
        );

        const grouped: Record<
          string,
          number
        > = {};

        filteredPayments.forEach(
          payment => {
            const fee =
              payment.fee_id
                ? feeMap.get(
                    payment.fee_id
                  )
                : undefined;

            const rawCategory =
              fee?.category ||
              'Other';

            const category =
              rawCategory
                .replace(
                  /_/g,
                  ' '
                )
                .trim();

            grouped[
              category
            ] =
              (
                grouped[
                  category
                ] || 0
              ) +
              getPaymentAmount(
                payment
              );
          }
        );

        return Object.entries(
          grouped
        )
          .map(
            ([
              name,
              value,
            ]) => ({
              name,
              value,
            })
          )
          .sort(
            (a, b) =>
              b.value -
              a.value
          );
      },
      [
        filteredPayments,
        fees,
        getPaymentAmount,
      ]
    );


  // ==========================================================
  // CURRENCY
  // ==========================================================

  const formatCurrency =
    useCallback(
      (amount: number) => {
        return new Intl.NumberFormat(
          'en-NG',
          {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }
        ).format(
          amount
        );
      },
      []
    );


  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh =
    async () => {
      setRefreshing(true);
      await fetchData();
    };


  // ==========================================================
  // QUICK DATE FILTERS
  // ==========================================================

  const setQuickRange = (
    type:
      | 'today'
      | 'week'
      | 'month'
      | 'year'
  ) => {
    const now =
      dayjs();

    switch (type) {
      case 'today':
        setDateRange([
          now.startOf(
            'day'
          ),
          now.endOf(
            'day'
          ),
        ]);
        break;

      case 'week':
        setDateRange([
          now.startOf(
            'week'
          ),
          now.endOf(
            'week'
          ),
        ]);
        break;

      case 'month':
        setDateRange([
          now.startOf(
            'month'
          ),
          now.endOf(
            'month'
          ),
        ]);
        break;

      case 'year':
        setDateRange([
          now.startOf(
            'year'
          ),
          now.endOf(
            'year'
          ),
        ]);
        break;
    }
  };


  // ==========================================================
  // TOOLTIP
  // ==========================================================

  const CustomTooltip =
    ({
      active,
      payload,
      label,
    }: any) => {
      if (
        !active ||
        !payload ||
        !payload.length
      ) {
        return null;
      }

      const revenue =
        Number(
          payload[0]?.value
        ) || 0;

      const transactions =
        payload[0]
          ?.payload
          ?.transactions ||
        0;

      return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl p-3 min-w-[150px]">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {label}
          </p>

          <p className="text-base font-bold text-gray-900 dark:text-white">
            {formatCurrency(
              revenue
            )}
          </p>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {transactions}{' '}
            transaction
            {transactions !==
            1
              ? 's'
              : ''}
          </p>
        </div>
      );
    };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />

          <span className="text-sm text-gray-500 dark:text-gray-400">
            Loading revenue...
          </span>
        </div>
      </div>
    );
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-4">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>
          <div className="flex items-center gap-2">

            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Revenue Overview
              </h2>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                {currentSession
                  ? `${currentSession}${
                      currentTerm
                        ? ` • ${currentTerm}`
                        : ''
                    }`
                  : 'Payment revenue'}
              </p>
            </div>

          </div>
        </div>


        {/* CONTROLS */}

        <div className="flex flex-wrap items-center gap-2">

          <button
            onClick={() =>
              setQuickRange(
                'today'
              )
            }
            className="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Today
          </button>

          <button
            onClick={() =>
              setQuickRange(
                'week'
              )
            }
            className="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Week
          </button>

          <button
            onClick={() =>
              setQuickRange(
                'month'
              )
            }
            className="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Month
          </button>

          <button
            onClick={() =>
              setQuickRange(
                'year'
              )
            }
            className="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Year
          </button>

          <button
            onClick={
              handleRefresh
            }
            disabled={
              refreshing
            }
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </button>

        </div>

      </div>


      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* REVENUE */}

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Revenue
              </p>

              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(
                  summary.revenue
                )}
              </p>
            </div>

            <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>

          </div>
        </div>


        {/* TRANSACTIONS */}

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Transactions
              </p>

              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {summary.transactions.toLocaleString()}
              </p>
            </div>

            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>

          </div>
        </div>


        {/* AVERAGE */}

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Average Payment
          </p>

          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {formatCurrency(
              summary.averagePayment
            )}
          </p>
        </div>


        {/* STUDENTS */}

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Students Paid
          </p>

          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {summary.students.toLocaleString()}
          </p>
        </div>

      </div>


      {/* =====================================================
          CHART CARD
      ===================================================== */}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">

        {/* CHART HEADER */}

        <div className="p-4 border-b border-gray-200 dark:border-gray-700">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Revenue Trend
              </h3>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Successful payments for the selected period
              </p>
            </div>

            <div className="flex items-center gap-2">

              {/* DAILY / MONTHLY */}

              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">

                <button
                  onClick={() =>
                    setViewMode(
                      'daily'
                    )
                  }
                  className={`px-3 py-1.5 text-xs ${
                    viewMode ===
                    'daily'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Daily
                </button>

                <button
                  onClick={() =>
                    setViewMode(
                      'monthly'
                    )
                  }
                  className={`px-3 py-1.5 text-xs ${
                    viewMode ===
                    'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Monthly
                </button>

              </div>


              {/* LINE / BAR */}

              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">

                <button
                  onClick={() =>
                    setChartType(
                      'line'
                    )
                  }
                  className={`px-3 py-1.5 text-xs ${
                    chartType ===
                    'line'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Trend
                </button>

                <button
                  onClick={() =>
                    setChartType(
                      'bar'
                    )
                  }
                  className={`px-3 py-1.5 text-xs ${
                    chartType ===
                    'bar'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Bar
                </button>

              </div>

            </div>

          </div>

        </div>


        {/* CHART */}

        <div className="p-4">

          {revenueData.length ===
          0 ? (

            <div className="h-[320px] flex flex-col items-center justify-center text-center">

              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                <Wallet className="w-6 h-6 text-gray-400" />
              </div>

              <p className="font-medium text-gray-700 dark:text-gray-300">
                No revenue data
              </p>

              <p className="text-xs text-gray-400 mt-1">
                No successful payments were found for the selected period.
              </p>

            </div>

          ) : (

            <div className="h-[320px] w-full">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                {chartType ===
                'line' ? (

                  <LineChart
                    data={
                      revenueData
                    }
                    margin={{
                      top: 20,
                      right: 20,
                      left: 10,
                      bottom: 0,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-gray-200 dark:stroke-gray-700"
                    />

                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 11,
                      }}
                      tickLine={
                        false
                      }
                      axisLine={
                        false
                      }
                    />

                    <YAxis
                      tick={{
                        fontSize: 11,
                      }}
                      tickLine={
                        false
                      }
                      axisLine={
                        false
                      }
                      tickFormatter={value =>
                        `₦${Number(
                          value
                        ).toLocaleString()}`
                      }
                    />

                    <Tooltip
                      content={
                        <CustomTooltip />
                      }
                    />

                    <Line
                      type="linear"
                      dataKey="revenue"
                      stroke="#2563eb"
                      strokeWidth={
                        3
                      }
                      dot={{
                        r: 4,
                        strokeWidth: 2,
                        fill: '#ffffff',
                      }}
                      activeDot={{
                        r: 7,
                        strokeWidth: 3,
                      }}
                      animationDuration={
                        800
                      }
                      connectNulls={
                        false
                      }
                    />

                  </LineChart>

                ) : (

                  <BarChart
                    data={
                      revenueData
                    }
                    margin={{
                      top: 10,
                      right: 10,
                      left: 10,
                      bottom: 0,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-gray-200 dark:stroke-gray-700"
                    />

                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 11,
                      }}
                      tickLine={
                        false
                      }
                      axisLine={
                        false
                      }
                    />

                    <YAxis
                      tick={{
                        fontSize: 11,
                      }}
                      tickLine={
                        false
                      }
                      axisLine={
                        false
                      }
                      tickFormatter={value =>
                        `₦${Number(
                          value
                        ).toLocaleString()}`
                      }
                    />

                    <Tooltip
                      content={
                        <CustomTooltip />
                      }
                    />

                    <Bar
                      dataKey="revenue"
                      fill="#2563eb"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />

                  </BarChart>

                )}

              </ResponsiveContainer>

            </div>

          )}

        </div>

      </div>


      {/* =====================================================
          BREAKDOWN TOGGLE
      ===================================================== */}

      <button
        onClick={() =>
          setShowBreakdown(
            !showBreakdown
          )
        }
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition"
      >

        <div className="flex items-center gap-2">

          <span className="font-medium text-sm text-gray-900 dark:text-white">
            Revenue Breakdown
          </span>

          <span className="text-xs text-gray-400">
            Payment methods & fee categories
          </span>

        </div>

        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            showBreakdown
              ? 'rotate-180'
              : ''
          }`}
        />

      </button>


      {/* =====================================================
          BREAKDOWN
      ===================================================== */}

      {showBreakdown && (

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* PAYMENT METHODS */}

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">

            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Payment Methods
            </h3>

            {paymentMethodData.length ===
            0 ? (

              <div className="py-10 text-center text-sm text-gray-400">
                No payment method data
              </div>

            ) : (

              <>
                <div className="h-[260px]">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <PieChart>

                      <Pie
                        data={
                          paymentMethodData
                        }
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={
                          90
                        }
                        innerRadius={
                          55
                        }
                      >

                        {paymentMethodData.map(
                          (
                            _,
                            index
                          ) => (

                            <Cell
                              key={`method-${index}`}
                              fill={
                                PIE_COLORS[
                                  index %
                                    PIE_COLORS.length
                                ]
                              }
                            />

                          )
                        )}

                      </Pie>

                      <Tooltip
                        formatter={(
                          value: any
                        ) =>
                          formatCurrency(
                            Number(
                              value
                            )
                          )
                        }
                      />

                    </PieChart>

                  </ResponsiveContainer>

                </div>

                <div className="space-y-2 mt-2">

                  {paymentMethodData.map(
                    method => (

                      <div
                        key={
                          method.name
                        }
                        className="flex items-center justify-between text-sm"
                      >

                        <span className="text-gray-600 dark:text-gray-400">
                          {
                            method.name
                          }
                        </span>

                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(
                            method.value
                          )}
                        </span>

                      </div>

                    )
                  )}

                </div>
              </>

            )}

          </div>


          {/* FEE CATEGORIES */}

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">

            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Revenue by Fee Category
            </h3>

            {categoryData.length ===
            0 ? (

              <div className="py-10 text-center text-sm text-gray-400">
                No fee category data
              </div>

            ) : (

              <div className="space-y-4">

                {categoryData.map(
                  category => {

                    const percentage =
                      summary.revenue >
                      0
                        ? (
                            category.value /
                            summary.revenue
                          ) *
                          100
                        : 0;

                    return (

                      <div
                        key={
                          category.name
                        }
                      >

                        <div className="flex items-center justify-between mb-1">

                          <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                            {
                              category.name
                            }
                          </span>

                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(
                              category.value
                            )}
                          </span>

                        </div>

                        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">

                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                percentage,
                                100
                              )}%`,
                            }}
                          />

                        </div>

                        <p className="text-[10px] text-gray-400 mt-1">
                          {percentage.toFixed(
                            1
                          )}
                          %
                        </p>

                      </div>

                    );
                  }
                )}

              </div>

            )}

          </div>

        </div>

      )}

    </div>
  );
};


export default RevenueChart;