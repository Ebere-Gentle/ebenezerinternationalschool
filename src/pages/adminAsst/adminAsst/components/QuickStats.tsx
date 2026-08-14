
import React from 'react';
import { TrendingUp, TrendingDown, Users, GraduationCap, Box, HandHelping, Clock, AlertTriangle } from 'lucide-react';

interface QuickStatsProps {
  totalStudents: number;
  activeStudents: number;
  pendingAdmissions: number;
  totalClasses: number;
  totalCollections: number;
  lowStockItems: number;
  totalItems: number;
}

const QuickStats: React.FC<QuickStatsProps> = ({
  totalStudents,
  activeStudents,
  pendingAdmissions,
  totalClasses,
  totalCollections,
  lowStockItems,
  totalItems,
}) => {
  const stats = [
    { 
      label: 'Students', 
      value: totalStudents, 
      subValue: `${activeStudents} active`,
      icon: Users, 
      color: 'blue',
      trend: 'up',
      trendValue: '+5%'
    },
    { 
      label: 'Classes', 
      value: totalClasses, 
      subValue: 'Total',
      icon: GraduationCap, 
      color: 'purple',
      trend: 'up',
      trendValue: '+2'
    },
    { 
      label: 'Collections', 
      value: totalCollections, 
      subValue: 'Recorded',
      icon: HandHelping, 
      color: 'green',
      trend: 'up',
      trendValue: '+8%'
    },
    { 
      label: 'Inventory', 
      value: totalItems, 
      subValue: `${lowStockItems} low stock`,
      icon: Box, 
      color: 'orange',
      trend: lowStockItems > 0 ? 'down' : 'up',
      trendValue: lowStockItems > 0 ? `${lowStockItems} items` : 'All good'
    },
  ];

  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    pink: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-xl ${colors[stat.color as keyof typeof colors]}`}>
                <Icon className="w-5 h-5" />
              </div>
              {stat.trend && (
                <div className={`flex items-center gap-0.5 text-xs font-medium ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {stat.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {stat.trendValue}
                </div>
              )}
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              {stat.subValue && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{stat.subValue}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuickStats;
