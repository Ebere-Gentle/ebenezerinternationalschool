import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Loader2 } from 'lucide-react';
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

      // Fetch payments for the period
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount_paid, payment_date, status')
        .eq('branch_id', branchId)
        .gte('payment_date', startDate.format('YYYY-MM-DD'))
        .lte('payment_date', endDate.format('YYYY-MM-DD'));

      if (paymentsError) throw paymentsError;

      // Fetch expected fees (budget)
      const { data: fees, error: feesError } = await supabase
        .from('fees')
        .select('amount')
        .eq('branch_id', branchId)
        .eq('status', 'active');

      if (feesError) throw feesError;

      const totalExpected = fees?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;

      // Generate monthly data
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

  if (loading) {
    return (
      <ChartCard title="Revenue Overview" icon={DollarSign}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </ChartCard>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setPeriod('6months')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            period === '6months' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
          }`}
        >
          6 Months
        </button>
        <button
          onClick={() => setPeriod('12months')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            period === '12months' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
          }`}
        >
          12 Months
        </button>
      </div>

      <ChartCard title="Revenue Overview" icon={DollarSign}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              stroke="#9ca3af" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="#9ca3af" 
              tickFormatter={(value) => `₦${(value/1000)}K`}
              tick={{ fontSize: 12 }}
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
                padding: '12px',
              }}
              labelStyle={{
                fontWeight: 'bold',
              }}
            />
            <Area 
              type="monotone" 
              dataKey="expected" 
              stroke="#8b5cf6" 
              strokeWidth={2} 
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
              strokeWidth={1.5} 
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
