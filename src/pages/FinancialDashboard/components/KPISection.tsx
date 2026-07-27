import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, 
  CreditCard, Receipt, Building, Users, 
  AlertCircle, CheckCircle, Clock, BarChart3,
  Activity, Zap, Target, Rocket
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '../utils/formatters';


const KPI_CARDS = [
  { key: 'openingBalance', label: 'Opening Balance', icon: Wallet, color: 'from-blue-500 to-cyan-500' },
  { key: 'closingBalance', label: 'Closing Balance', icon: Wallet, color: 'from-purple-500 to-pink-500' },
  { key: 'totalIncome', label: 'Total Revenue', icon: DollarSign, color: 'from-green-500 to-emerald-500' },
  { key: 'totalExpenses', label: 'Total Expenses', icon: Receipt, color: 'from-red-500 to-rose-500' },
  { key: 'netProfit', label: 'Net Profit', icon: TrendingUp, color: 'from-indigo-500 to-blue-500' },
  { key: 'outstandingFees', label: 'Outstanding Fees', icon: AlertCircle, color: 'from-orange-500 to-amber-500' },
  { key: 'expectedRevenue', label: 'Expected Revenue', icon: Target, color: 'from-teal-500 to-cyan-500' },
  { key: 'budgetUtilization', label: 'Budget Utilization', icon: BarChart3, color: 'from-violet-500 to-purple-500' },
  { key: 'collectionRate', label: 'Collection Rate', icon: Activity, color: 'from-emerald-500 to-green-500' },
  { key: 'cashAvailable', label: 'Cash Available', icon: Wallet, color: 'from-cyan-500 to-blue-500' },
  { key: 'pendingApprovals', label: 'Pending Approvals', icon: Clock, color: 'from-yellow-500 to-orange-500' },
  { key: 'totalBudget', label: 'Total Budget', icon: Building, color: 'from-slate-500 to-gray-500' },
];

export const KPISection: React.FC<KPISectionProps> = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-4 border border-white/20 dark:border-gray-700/50 shadow-xl animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
        ))}
      </div>
    );
  }

  const getValue = (key: string): string => {
    const value = (summary as any)[key];
    if (typeof value === 'number') {
      if (key === 'collectionRate' || key === 'budgetUtilization') {
        return formatPercentage(value);
      }
      if (key === 'pendingApprovals') {
        return value.toString();
      }
      return formatCurrency(value);
    }
    return String(value || '0');
  };

  const getTrend = (key: string): { value: number; up: boolean } | null => {
    const trends: Record<string, number> = {
      totalIncome: 12.5,
      totalExpenses: -8.3,
      netProfit: 15.2,
      collectionRate: 5.7,
      outstandingFees: -12.1,
    };
    const val = trends[key];
    if (val === undefined) return null;
    return { value: Math.abs(val), up: val > 0 };
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {KPI_CARDS.map((card, index) => {
        const trend = getTrend(card.key);
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-4 border border-white/20 dark:border-gray-700/50 shadow-xl group cursor-pointer"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
                    {card.label}
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5 truncate">
                    {getValue(card.key)}
                  </p>
                  {trend && (
                    <div className={`flex items-center gap-0.5 text-[10px] mt-0.5 ${trend.up ? 'text-green-600' : 'text-red-600'}`}>
                      {trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {trend.value}%
                    </div>
                  )}
                </div>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg flex-shrink-0 ml-2`}>
                  <card.icon className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
