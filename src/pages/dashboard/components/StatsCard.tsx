import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';
import dayjs from 'dayjs';

interface StatsCardProps {
  label: string;
  icon: React.ElementType;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'indigo' | 'pink' | 'teal';
  className?: string;
  value?: string | number;
  trend?: number;
  sparkline?: number[];
  loading?: boolean;
  showChart?: boolean;
  chartColor?: string;
  compact?: boolean;
  mini?: boolean;
}

interface StatData {
  value: number;
  change: number;
  data: { date: string; value: number }[];
}

const StatsCard: React.FC<StatsCardProps> = ({
  label,
  icon: Icon,
  color = 'primary',
  className = '',
  value: propValue,
  trend: propTrend,
  sparkline: propSparkline,
  loading: propLoading,
  showChart = true,
  chartColor,
  compact = false,
  mini = false,
}) => {
  const { user } = useAuth();
  const [value, setValue] = useState<string | number>(propValue || '—');
  const [trend, setTrend] = useState<number | undefined>(propTrend);
  const [sparkline, setSparkline] = useState<number[]>(propSparkline || []);
  const [loading, setLoading] = useState(propLoading || false);
  const [statData, setStatData] = useState<StatData | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const colorMap = {
    primary: { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/30', gradient: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-500/20', chart: '#3B82F6' },
    secondary: { bg: 'from-purple-500 to-purple-600', light: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-900/30', gradient: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-500/20', chart: '#8B5CF6' },
    success: { bg: 'from-green-500 to-green-600', light: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-100 dark:border-green-900/30', gradient: 'from-green-400 to-emerald-600', shadow: 'shadow-green-500/20', chart: '#22C55E' },
    warning: { bg: 'from-yellow-500 to-yellow-600', light: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-100 dark:border-yellow-900/30', gradient: 'from-yellow-400 to-orange-600', shadow: 'shadow-yellow-500/20', chart: '#EAB308' },
    danger: { bg: 'from-red-500 to-red-600', light: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-100 dark:border-red-900/30', gradient: 'from-red-400 to-red-600', shadow: 'shadow-red-500/20', chart: '#EF4444' },
    info: { bg: 'from-cyan-500 to-cyan-600', light: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-100 dark:border-cyan-900/30', gradient: 'from-cyan-400 to-cyan-600', shadow: 'shadow-cyan-500/20', chart: '#06B6D4' },
    indigo: { bg: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-900/30', gradient: 'from-indigo-400 to-indigo-600', shadow: 'shadow-indigo-500/20', chart: '#6366F1' },
    pink: { bg: 'from-pink-500 to-pink-600', light: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-100 dark:border-pink-900/30', gradient: 'from-pink-400 to-pink-600', shadow: 'shadow-pink-500/20', chart: '#EC4899' },
    teal: { bg: 'from-teal-500 to-teal-600', light: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-100 dark:border-teal-900/30', gradient: 'from-teal-400 to-teal-600', shadow: 'shadow-teal-500/20', chart: '#14B8A6' },
  };

  const colors = colorMap[color] || colorMap.primary;
  const chartColorHex = chartColor || colors.chart;

  useEffect(() => {
    const fetchUserBranch = async () => {
      if (user?.id) {
        try {
          let branchId = user.branch_id;
          
          if (!branchId) {
            const { data, error } = await supabase
              .from('users')
              .select('branch_id')
              .eq('id', user.id)
              .single();
            
            if (!error && data) {
              branchId = data.branch_id;
            }
          }
          
          if (branchId) {
            setUserBranchId(branchId);
          }
        } catch (error) {
          console.error('Error fetching user branch:', error);
        }
      }
    };
    
    fetchUserBranch();
  }, [user]);

  useEffect(() => {
    if (label && userBranchId && !propValue && !propTrend && !propSparkline) {
      fetchStatData(label.toLowerCase());
    } else if (propValue !== undefined) {
      setValue(propValue);
    }
  }, [label, userBranchId, propValue]);

  const fetchStatData = async (statType: string) => {
    if (!userBranchId) return;
    
    setLoading(true);
    try {
      let result: StatData = { value: 0, change: 0, data: [] };
      
      const now = dayjs();
      const lastMonth = now.subtract(1, 'month');

      if (statType.includes('student') || statType.includes('students')) {
        result = await getStudentStats(userBranchId, now, lastMonth);
      } else if (statType.includes('revenue') || statType.includes('income')) {
        result = await getRevenueStats(userBranchId, now, lastMonth);
      } else if (statType.includes('payment')) {
        result = await getPaymentStats(userBranchId, now, lastMonth);
      } else if (statType.includes('collection')) {
        result = await getCollectionRateStats(userBranchId);
      } else if (statType.includes('active')) {
        result = await getActiveStudentStats(userBranchId);
      } else if (statType.includes('fee assignment') || statType.includes('assignment')) {
        result = await getFeeAssignmentStats(userBranchId);
      } else if (statType.includes('fee category') || statType.includes('category')) {
        result = await getFeeCategoryStats(userBranchId);
      } else {
        // Default fallback
        if (label.includes('Student')) {
          result = await getStudentStats(userBranchId, now, lastMonth);
        } else if (label.includes('Revenue') || label.includes('Income')) {
          result = await getRevenueStats(userBranchId, now, lastMonth);
        } else if (label.includes('Payment')) {
          result = await getPaymentStats(userBranchId, now, lastMonth);
        } else if (label.includes('Collection')) {
          result = await getCollectionRateStats(userBranchId);
        } else if (label.includes('Active')) {
          result = await getActiveStudentStats(userBranchId);
        } else if (label.includes('Assignment')) {
          result = await getFeeAssignmentStats(userBranchId);
        } else if (label.includes('Category')) {
          result = await getFeeCategoryStats(userBranchId);
        }
      }

      setValue(formatValue(result.value, statType));
      setTrend(result.change);
      
      if (result.data && result.data.length > 0) {
        const values = result.data.map(d => d.value);
        setSparkline(values);
      }
      
      setStatData(result);
    } catch (error) {
      console.error(`Error fetching ${statType} stats:`, error);
    } finally {
      setLoading(false);
    }
  };

  const getStudentStats = async (branchId: string, now: dayjs.Dayjs, lastMonth: dayjs.Dayjs) => {
    const { data, error } = await supabase
      .from('students')
      .select('id, created_at')
      .eq('branch_id', branchId)
      .eq('current_status', 'active');

    if (error) throw error;

    const total = data?.length || 0;
    const lastMonthStudents = data?.filter(s => 
      dayjs(s.created_at).isAfter(lastMonth.startOf('month'))
    ).length || 0;
    const thisMonthStudents = data?.filter(s => 
      dayjs(s.created_at).isAfter(now.startOf('month'))
    ).length || 0;

    const change = lastMonthStudents > 0 
      ? ((thisMonthStudents - lastMonthStudents) / lastMonthStudents) * 100 
      : 0;

    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const date = now.subtract(i, 'month');
      const count = data?.filter(s => 
        dayjs(s.created_at).isAfter(date.startOf('month')) && 
        dayjs(s.created_at).isBefore(date.endOf('month'))
      ).length || 0;
      monthlyData.push({ date: date.format('MMM'), value: count });
    }

    return { value: total, change: Math.round(change), data: monthlyData };
  };

  const getRevenueStats = async (branchId: string, now: dayjs.Dayjs, lastMonth: dayjs.Dayjs) => {
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount_paid, payment_date')
      .eq('branch_id', branchId)
      .in('status', ['completed', 'paid']);

    if (paymentsError) throw paymentsError;

    const total = payments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
    
    const lastMonthRevenue = payments?.filter(p => 
      dayjs(p.payment_date).isAfter(lastMonth.startOf('month'))
    ).reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
    
    const thisMonthRevenue = payments?.filter(p => 
      dayjs(p.payment_date).isAfter(now.startOf('month'))
    ).reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;

    const change = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const date = now.subtract(i, 'month');
      const revenue = payments?.filter(p => 
        dayjs(p.payment_date).isAfter(date.startOf('month')) && 
        dayjs(p.payment_date).isBefore(date.endOf('month'))
      ).reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
      monthlyData.push({ date: date.format('MMM'), value: Math.round(revenue / 1000) });
    }

    return { value: total, change: Math.round(change), data: monthlyData };
  };

  const getPaymentStats = async (branchId: string, now: dayjs.Dayjs, lastMonth: dayjs.Dayjs) => {
    const { data, error } = await supabase
      .from('payments')
      .select('id, payment_date')
      .eq('branch_id', branchId);

    if (error) throw error;

    const total = data?.length || 0;
    const lastMonthPayments = data?.filter(p => 
      dayjs(p.payment_date).isAfter(lastMonth.startOf('month'))
    ).length || 0;
    const thisMonthPayments = data?.filter(p => 
      dayjs(p.payment_date).isAfter(now.startOf('month'))
    ).length || 0;

    const change = lastMonthPayments > 0 
      ? ((thisMonthPayments - lastMonthPayments) / lastMonthPayments) * 100 
      : 0;

    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const date = now.subtract(i, 'month');
      const count = data?.filter(p => 
        dayjs(p.payment_date).isAfter(date.startOf('month')) && 
        dayjs(p.payment_date).isBefore(date.endOf('month'))
      ).length || 0;
      monthlyData.push({ date: date.format('MMM'), value: count });
    }

    return { value: total, change: Math.round(change), data: monthlyData };
  };

  const getCollectionRateStats = async (branchId: string) => {
    const { data: assignments, error: assignmentsError } = await supabase
      .from('student_fee_assignments')
      .select('amount_due, amount_paid, created_at')
      .eq('branch_id', branchId)
      .eq('is_active', true);

    if (assignmentsError) throw assignmentsError;

    const totalExpected = assignments?.reduce((sum, a) => sum + (a.amount_due || 0), 0) || 0;
    const totalCollected = assignments?.reduce((sum, a) => sum + (a.amount_paid || 0), 0) || 0;
    const rate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    const monthlyData = [];
    const now = dayjs();
    for (let i = 11; i >= 0; i--) {
      const date = now.subtract(i, 'month');
      const monthStart = date.startOf('month');
      const monthEnd = date.endOf('month');

      const monthAssignments = assignments?.filter(a => 
        dayjs(a.created_at).isAfter(monthStart) && 
        dayjs(a.created_at).isBefore(monthEnd)
      ) || [];

      const monthExpected = monthAssignments.reduce((sum, a) => sum + (a.amount_due || 0), 0);
      const monthCollected = monthAssignments.reduce((sum, a) => sum + (a.amount_paid || 0), 0);
      const monthRate = monthExpected > 0 ? (monthCollected / monthExpected) * 100 : 0;

      monthlyData.push({ 
        date: date.format('MMM'), 
        value: Math.round(monthRate)
      });
    }

    return { 
      value: Math.round(rate), 
      change: 0, 
      data: monthlyData 
    };
  };

  const getActiveStudentStats = async (branchId: string) => {
    const { data, error } = await supabase
      .from('students')
      .select('id')
      .eq('branch_id', branchId)
      .eq('current_status', 'active');

    if (error) throw error;

    const total = data?.length || 0;
    return { value: total, change: 0, data: [] };
  };

  const getFeeAssignmentStats = async (branchId: string) => {
    const { data, error } = await supabase
      .from('student_fee_assignments')
      .select('id, created_at')
      .eq('branch_id', branchId)
      .eq('is_active', true);

    if (error) throw error;

    const total = data?.length || 0;
    
    const monthlyData = [];
    const now = dayjs();
    for (let i = 11; i >= 0; i--) {
      const date = now.subtract(i, 'month');
      const count = data?.filter(a => 
        dayjs(a.created_at).isAfter(date.startOf('month')) && 
        dayjs(a.created_at).isBefore(date.endOf('month'))
      ).length || 0;
      monthlyData.push({ date: date.format('MMM'), value: count });
    }

    return { value: total, change: 0, data: monthlyData };
  };

  const getFeeCategoryStats = async (branchId: string) => {
    const { data, error } = await supabase
      .from('fees')
      .select('category')
      .eq('branch_id', branchId)
      .eq('status', 'active');

    if (error) throw error;

    const uniqueCategories = new Set(data?.map(f => f.category) || []);
    const total = uniqueCategories.size;

    return { value: total, change: 0, data: [] };
  };

  const formatValue = (val: number, statType: string): string => {
    if (statType.includes('revenue') || statType.includes('income')) {
      if (val >= 1000000) {
        return `₦${(val / 1000000).toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `₦${(val / 1000).toFixed(1)}K`;
      }
      return `₦${val}`;
    }
    if (statType.includes('collection')) {
      return `${val.toFixed(0)}%`;
    }
    if (statType.includes('category')) {
      return val.toLocaleString();
    }
    return val.toLocaleString();
  };

  const isPositive = trend !== undefined ? trend > 0 : false;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white/95 px-2.5 py-1.5 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/95">
          <p className="text-[10px] font-semibold text-gray-900 dark:text-white">
            {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  // Determine sizes based on compact/mini props
  const padding = mini ? 'p-2' : compact ? 'p-2.5 sm:p-4' : 'p-3 sm:p-5';
  const iconSize = mini ? 'p-1' : compact ? 'p-1.5 sm:p-2' : 'p-1.5 sm:p-2.5';
  const iconDimensions = mini ? 'h-3 w-3' : compact ? 'h-3.5 w-3.5 sm:h-4 sm:w-4' : 'h-4 w-4 sm:h-5 sm:w-5';
  const valueSize = mini ? 'text-base' : compact ? 'text-lg sm:text-2xl' : 'text-xl sm:text-3xl';
  const labelSize = mini ? 'text-[8px]' : compact ? 'text-[10px] sm:text-xs' : 'text-[10px] sm:text-sm';
  const trendSize = mini ? 'text-[6px] px-1 py-0.5' : compact ? 'text-[7px] sm:text-[10px] px-1.5 py-0.5' : 'text-[8px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1';
  const chartHeight = mini ? 'h-7' : compact ? 'h-8 sm:h-11' : 'h-10 sm:h-14';
  const rounded = mini ? 'rounded-lg' : compact ? 'rounded-xl' : 'rounded-xl sm:rounded-2xl';
  const gap = mini ? 'gap-0.5' : compact ? 'gap-1 sm:gap-1.5' : 'gap-1 sm:gap-2';
  const trendGap = mini ? 'gap-0.5' : compact ? 'gap-0.5 sm:gap-1' : 'gap-0.5 sm:gap-1.5';

  if (loading) {
    return (
      <div className={`relative overflow-hidden ${rounded} border border-gray-200 bg-white ${padding} shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
        <div className={`flex items-center justify-center ${chartHeight}`}>
          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: compact || mini ? 1.01 : 1.02 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`group relative overflow-hidden ${rounded} border ${colors.border} bg-white ${padding} shadow-sm hover:shadow-lg transition-shadow duration-300 dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      {/* Background glow */}
      <div className={`absolute inset-0 opacity-0 bg-gradient-to-br ${colors.light} transition-opacity duration-300 group-hover:opacity-100`} />

      {/* Content */}
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-gray-500 dark:text-gray-400 truncate ${labelSize}`}>
              {label}
            </p>
            <motion.p
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
              className={`font-bold text-gray-900 dark:text-white truncate ${valueSize}`}
            >
              {value}
            </motion.p>
          </div>

          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
            {trend !== undefined && trend !== 0 && (
              <div className={`flex items-center ${trendGap} rounded-full ${trendSize} font-medium ${
                isPositive
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {isPositive ? (
                  <TrendingUp className={`${mini ? 'h-1.5 w-1.5' : 'h-2 w-2 sm:h-3 sm:w-3'}`} />
                ) : (
                  <TrendingDown className={`${mini ? 'h-1.5 w-1.5' : 'h-2 w-2 sm:h-3 sm:w-3'}`} />
                )}
                {Math.abs(trend)}%
              </div>
            )}
            
            <div className={`rounded-lg bg-gradient-to-br ${colors.bg} ${iconSize} shadow-lg ${colors.shadow} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
              <Icon className={`text-white ${iconDimensions}`} />
            </div>
          </div>
        </div>

        {/* Wave-style Line Chart */}
        {showChart && sparkline.length > 0 && (
          <div className={`mt-1.5 sm:mt-2.5 ${chartHeight} w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline.map((value, index) => ({ value, index }))}>
                <defs>
                  {/* Gradient glow effect */}
                  <linearGradient id={`wave-${label.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={chartColorHex} stopOpacity={0.1} />
                    <stop offset="50%" stopColor={chartColorHex} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={chartColorHex} stopOpacity={0.1} />
                  </linearGradient>
                  {/* Shadow gradient */}
                  <filter id={`glow-${label.replace(/\s+/g, '-')}`}>
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <XAxis dataKey="index" hide />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={chartColorHex}
                  strokeWidth={mini ? 2 : compact ? 2.5 : 3}
                  dot={false}
                  activeDot={{ 
                    r: mini ? 3 : compact ? 4 : 5, 
                    fill: chartColorHex,
                    stroke: 'white',
                    strokeWidth: 2,
                  }}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  // Wave-like smoothness
                  connectNulls={true}
                />
                {/* Glow line behind */}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={chartColorHex}
                  strokeWidth={mini ? 4 : compact ? 6 : 8}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.1}
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Subtle decorative elements */}
      <div className="absolute -top-12 -right-12 h-16 w-16 rounded-full bg-gradient-to-br from-white/10 to-transparent blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="absolute -bottom-8 -left-8 h-12 w-12 rounded-full bg-gradient-to-tr from-white/5 to-transparent blur-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </motion.div>
  );
};

export default StatsCard;