// src/pages/adminAsst/components/StatsGrid.tsx

import React from 'react';
import { Users, GraduationCap, Box, HandHelping, Calendar, School, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsGridProps {
  stats: {
    students: number;
    classes: number;
    sessions: number;
    collections: number;
    inventory: number;
  };
  studentsCount: number;
  activeStudents?: number;
  lowStockItems?: number;
  pendingAdmissions?: number;
}

const StatsGrid: React.FC<StatsGridProps> = ({ 
  stats, 
  studentsCount,
  activeStudents = 0,
  lowStockItems = 0,
  pendingAdmissions = 0,
}) => {
  const items = [
    { 
      icon: Users, 
      label: 'Total Students', 
      value: studentsCount, 
      subValue: `${activeStudents} active`,
      color: 'blue',
      trend: 'up',
      trendValue: '+12%'
    },
    { 
      icon: GraduationCap, 
      label: 'Classes', 
      value: stats.classes, 
      subValue: `${stats.classes} total`,
      color: 'purple',
      trend: 'up',
      trendValue: '+2'
    },
    { 
      icon: HandHelping, 
      label: 'Collections', 
      value: stats.collections, 
      subValue: `${stats.collections} recorded`,
      color: 'green',
      trend: 'up',
      trendValue: '+8%'
    },
    { 
      icon: Box, 
      label: 'Inventory Items', 
      value: stats.inventory, 
      subValue: `${lowStockItems} low stock`,
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
    pink: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-xl ${colors[item.color as keyof typeof colors]}`}>
                <Icon className="w-5 h-5" />
              </div>
              {item.trend && (
                <div className={`flex items-center gap-0.5 text-xs font-medium ${item.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {item.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {item.trendValue}
                </div>
              )}
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
              {item.subValue && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{item.subValue}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsGrid;
