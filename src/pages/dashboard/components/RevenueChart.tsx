import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Loader2, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import ChartCard from './ChartCard';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

interface RevenueData {
  month: string;
  revenue: number;
  expected: number;
  outstanding: number;
}

const RevenueChart: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [period, setPeriod] = useState<'6months' | '12months'>('12months');

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
    if (userBranchId) {
      fetchRevenueData(userBranchId);
    }
  }, [userBranchId, period]);

  const fetchRevenueData = async (branchId: string) => {
    setLoading(true);
    try {
      const months = period === '6months' ? 6 : 12;
      const startDate = dayjs().subtract(months - 1, 'months').startOf('month');
      const endDate = dayjs().endOf('month');

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount_paid, payment_date, status')
        .eq('branch_id', branchId)
        .gte('payment_date', startDate.format('YYYY-MM-DD'))
        .lte('payment_date', endDate.format('YYYY-MM-DD'));

      if (paymentsError) throw paymentsError;

      const { data: fees, error: feesError } = await supabase
        .from('fees')
        .select('amount')
        .eq('branch_id', branchId)
        .eq('status', 'active');

      if (feesError) throw feesError;

      const totalExpected = fees?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;

      const monthlyData: RevenueData[] = [];
      for (let i = 0; i < months; i++) {
        const date = startDate.add(i, 'months');
        const monthStart = date.startOf('month').format('YYYY-MM-DD');
        const monthEnd = date.endOf('month').format('YYYY-MM-DD');

        const monthPayments = payments?.filter(p => 
          p.payment_date && 
          p.payment_date >= monthStart && 
          p.payment_date <= monthEnd
        ) || [];

        const collected = monthPayments
          .filter(p => p.status === 'completed' || p.status === 'paid')
          .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

        const outstanding = monthPayments
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

        monthlyData.push({
          month: date.format('MMM'),
          revenue: collected,
          expected: Math.round(totalExpected / months),
          outstanding: outstanding,
        });
      }

      setData(monthlyData);
    } catch (error: any) {
      console.error('Error fetching revenue data:', error);
      toast.error(error.message || 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpected = data.reduce((sum, d) => sum + d.expected, 0);
  const totalOutstanding = data.reduce((sum, d) => sum + d.outstanding, 0);
  const collectionRate = totalExpected > 0 ? (totalRevenue / totalExpected) * 100 : 0;
  const lastMonthRevenue = data.length > 0 ? data[data.length - 1].revenue : 0;
  const previousMonthRevenue = data.length > 1 ? data[data.length - 2].revenue : 0;
  const revenueChange = previousMonthRevenue > 0 
    ? ((lastMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
    : 0;

  if (loading) {
    return (
      <ChartCard title="Revenue Overview" icon={DollarSign}>
        <div className="flex items-center justify-center h-40 sm:h-48 md:h-56 lg:h-64">
          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-500" />
        </div>
      </ChartCard>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Summary Cards - Mobile Optimized */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-2 sm:p-3">
          <p className="text-[8px] sm:text-xs text-blue-600 dark:text-blue-400">Revenue</p>
          <p className="text-sm sm:text-xl font-bold text-blue-700 dark:text-blue-300 truncate">
            ₦{(totalRevenue/1000).toFixed(1)}K
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-2 sm:p-3">
          <p className="text-[8px] sm:text-xs text-purple-600 dark:text-purple-400">Expected</p>
          <p className="text-sm sm:text-xl font-bold text-purple-700 dark:text-purple-300 truncate">
            ₦{(totalExpected/1000).toFixed(1)}K
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-2 sm:p-3">
          <p className="text-[8px] sm:text-xs text-red-600 dark:text-red-400">Outstanding</p>
          <p className="text-sm sm:text-xl font-bold text-red-700 dark:text-red-300 truncate">
            ₦{(totalOutstanding/1000).toFixed(1)}K
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-2 sm:p-3">
          <p className="text-[8px] sm:text-xs text-green-600 dark:text-green-400">Collection</p>
          <p className="text-sm sm:text-xl font-bold text-green-700 dark:text-green-300">
            {collectionRate.toFixed(0)}%
          </p>
          {data.length > 1 && (
            <div className={`flex items-center gap-0.5 text-[6px] sm:text-[10px] ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueChange >= 0 ? <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
              {Math.abs(revenueChange).toFixed(0)}% MoM
            </div>
          )}
        </div>
      </div>

      {/* Period Selector - Mobile Optimized */}
      <div className="flex items-center justify-between sm:justify-end gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
          <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Period:</span>
        </div>
        <div className="flex gap-0.5 sm:gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-0.5 sm:p-1">
          <button
            onClick={() => setPeriod('6months')}
            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[8px] sm:text-xs font-medium transition-all ${
              period === '6months' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            6M
          </button>
          <button
            onClick={() => setPeriod('12months')}
            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[8px] sm:text-xs font-medium transition-all ${
              period === '12months' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            12M
          </button>
        </div>
      </div>

      {/* Chart - Responsive Height */}
      <ChartCard title="Revenue Overview" icon={DollarSign} compact>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis 
              dataKey="month" 
              stroke="#9ca3af" 
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickMargin={5}
              interval={0}
            />
            <YAxis 
              stroke="#9ca3af" 
              tickFormatter={(value) => {
                if (value >= 1000000) return `₦${(value/1000000).toFixed(1)}M`;
                if (value >= 1000) return `₦${(value/1000).toFixed(0)}K`;
                return `₦${value}`;
              }}
              tick={{ fontSize: 8, fill: '#9ca3af' }}
              tickMargin={5}
              width={45}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `₦${value.toLocaleString()}`,
                name === 'revenue' ? 'Revenue' : name === 'expected' ? 'Expected' : 'Outstanding'
              ]}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '11px',
              }}
              labelStyle={{
                fontWeight: 'bold',
                fontSize: '12px',
              }}
            />
            <Area 
              type="monotone" 
              dataKey="expected" 
              stroke="#8b5cf6" 
              strokeWidth={1.5} 
              fill="url(#expectedGradient)"
              strokeDasharray="5 5"
              name="Expected"
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#2563eb" 
              strokeWidth={2} 
              fill="url(#revenueGradient)" 
              name="Revenue"
            />
            <Area 
              type="monotone" 
              dataKey="outstanding" 
              stroke="#ef4444" 
              strokeWidth={1} 
              fill="none"
              strokeDasharray="3 3"
              name="Outstanding"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

export default RevenueChart;