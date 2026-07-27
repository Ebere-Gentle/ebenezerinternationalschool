import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Loader2, MoreVertical } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
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
  chartType?: 'line' | 'area';
  chartColor?: string;
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
  chartType = 'area',
  chartColor,
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
    primary: { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/30', gradient: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-500/20' },
    secondary: { bg: 'from-purple-500 to-purple-600', light: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-900/30', gradient: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-500/20' },
    success: { bg: 'from-green-500 to-green-600', light: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-100 dark:border-green-900/30', gradient: 'from-green-400 to-emerald-600', shadow: 'shadow-green-500/20' },
    warning: { bg: 'from-yellow-500 to-yellow-600', light: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-100 dark:border-yellow-900/30', gradient: 'from-yellow-400 to-orange-600', shadow: 'shadow-yellow-500/20' },
    danger: { bg: 'from-red-500 to-red-600', light: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-100 dark:border-red-900/30', gradient: 'from-red-400 to-red-600', shadow: 'shadow-red-500/20' },
    info: { bg: 'from-cyan-500 to-cyan-600', light: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-100 dark:border-cyan-900/30', gradient: 'from-cyan-400 to-cyan-600', shadow: 'shadow-cyan-500/20' },
    indigo: { bg: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-900/30', gradient: 'from-indigo-400 to-indigo-600', shadow: 'shadow-indigo-500/20' },
    pink: { bg: 'from-pink-500 to-pink-600', light: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-100 dark:border-pink-900/30', gradient: 'from-pink-400 to-pink-600', shadow: 'shadow-pink-500/20' },
    teal: { bg: 'from-teal-500 to-teal-600', light: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-100 dark:border-teal-900/30', gradient: 'from-teal-400 to-teal-600', shadow: 'shadow-teal-500/20' },
  };

  const colors = colorMap[color] || colorMap.primary;
  const chartGradientId = `chart-gradient-${label.replace(/\s+/g, '-')}`;
  const chartStrokeColor = chartColor || colors.text.replace('text-', '').replace(' dark:', '');

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
      const lastMonthStart = lastMonth.startOf('month');
      const thisMonthStart = now.startOf('month');

      switch (statType) {
        case 'total students':
        case 'students':
          result = await getStudentStats(userBranchId, now, lastMonth);
          break;
        case 'total revenue':
        case 'revenue':
          result = await getRevenueStats(userBranchId, now, lastMonth);
          break;
        case 'total payments':
        case 'payments':
          result = await getPaymentStats(userBranchId, now, lastMonth);
          break;
        case 'collection rate':
        case 'collection':
          result = await getCollectionRateStats(userBranchId);
          break;
        case 'active students':
          result = await getActiveStudentStats(userBranchId);
          break;
        case 'outstanding fees':
        case 'outstanding':
          result = await getOutstandingStats(userBranchId);
          break;
        default:
          if (label.includes('Student')) {
            result = await getStudentStats(userBranchId, now, lastMonth);
          } else if (label.includes('Revenue') || label.includes('Income')) {
            result = await getRevenueStats(userBranchId, now, lastMonth);
          } else if (label.includes('Payment')) {
            result = await getPaymentStats(userBranchId, now, lastMonth);
          } else if (label.includes('Collection')) {
            result = await getCollectionRateStats(userBranchId);
          } else if (label.includes('Outstanding')) {
            result = await getOutstandingStats(userBranchId);
          } else if (label.includes('Active')) {
            result = await getActiveStudentStats(userBranchId);
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
    const { data, error } = await supabase
      .from('payments')
      .select('amount_paid, payment_date')
      .eq('branch_id', branchId)
      .in('status', ['completed', 'paid']);

    if (error) throw error;

    const total = data?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
    const lastMonthRevenue = data?.filter(p => 
      dayjs(p.payment_date).isAfter(lastMonth.startOf('month'))
    ).reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
    const thisMonthRevenue = data?.filter(p => 
      dayjs(p.payment_date).isAfter(now.startOf('month'))
    ).reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;

    const change = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const date = now.subtract(i, 'month');
      const revenue = data?.filter(p => 
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
    const { data: fees } = await supabase
      .from('fees')
      .select('amount')
      .eq('branch_id', branchId)
      .eq('status', 'active');

    const totalExpected = fees?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;
    const { data: payments } = await supabase
      .from('payments')
      .select('amount_paid')
      .eq('branch_id', branchId)
      .in('status', ['completed', 'paid']);

    const totalCollected = payments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
    const rate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    return { 
      value: rate, 
      change: 0, 
      data: Array.from({ length: 12 }, (_, i) => ({ 
        date: dayjs().subtract(11 - i, 'month').format('MMM'), 
        value: rate 
      })) 
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

  const getOutstandingStats = async (branchId: string) => {
    const { data, error } = await supabase
      .from('payments')
      .select('amount_paid')
      .eq('branch_id', branchId)
      .eq('status', 'pending');

    if (error) throw error;

    const total = data?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
    return { value: total, change: 0, data: [] };
  };

  const formatValue = (val: number, statType: string): string => {
    if (statType.includes('revenue') || statType.includes('income') || statType.includes('outstanding')) {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    }
    if (statType.includes('collection')) {
      return `${val.toFixed(1)}%`;
    }
    return val.toLocaleString();
  };

  const isPositive = trend !== undefined ? trend > 0 : false;

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-medium text-gray-900 dark:text-white">
            {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.3 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`group relative overflow-hidden rounded-2xl border ${colors.border} bg-white p-6 shadow-sm hover:shadow-xl dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      {/* Animated gradient background on hover */}
      <div className={`absolute inset-0 opacity-0 bg-gradient-to-br ${colors.light} transition-opacity duration-500 group-hover:opacity-100`} />

      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] dark:opacity-[0.03]" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
              <button className="opacity-0 transition-opacity group-hover:opacity-100">
                <MoreVertical className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <motion.p
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="text-3xl font-bold text-gray-900 dark:text-white"
            >
              {value}
            </motion.p>
          </div>

          <div className={`rounded-2xl bg-gradient-to-br ${colors.bg} p-3 shadow-lg ${colors.shadow} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>

        {trend !== undefined && trend !== 0 && (
          <div className="mt-4 flex items-center gap-2">
            <motion.div
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                isPositive
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend)}%
            </motion.div>
            <span className="text-xs text-gray-500 dark:text-gray-400">vs last month</span>
          </div>
        )}

        {showChart && sparkline.length > 0 && (
          <div className="mt-4 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={sparkline.map((value, index) => ({ 
                  value, 
                  index 
                }))}>
                  <defs>
                    <linearGradient id={chartGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.text.replace('text-', '')} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colors.text.replace('text-', '')} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="index" hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={colors.text.replace('text-', '')}
                    strokeWidth={2}
                    fill={`url(#${chartGradientId})`}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={1500}
                  />
                </AreaChart>
              ) : (
                <LineChart data={sparkline.map((value, index) => ({ 
                  value, 
                  index 
                }))}>
                  <XAxis dataKey="index" hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={colors.text.replace('text-', '')}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: colors.text.replace('text-', '') }}
                    isAnimationActive={true}
                    animationDuration={1500}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {statData?.data && statData.data.length > 0 && showChart && (
          <div className="mt-2 flex items-center justify-end gap-1">
            <span className="text-[10px] text-gray-400 dark:text-gray-600">
              {statData.data[0]?.date} - {statData.data[statData.data.length - 1]?.date}
            </span>
          </div>
        )}
      </div>

      {/* Decorative shine effect */}
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-white/20 to-transparent blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </motion.div>
  );
};

export default StatsCard;
