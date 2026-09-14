
import React from 'react';
import {
  Users,
  GraduationCap,
  Box,
  HandHelping,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface StatsGridProps {
  stats: {
    students: number;
    classes: number;
    sessions: number;
    collections: number;
    inventory: number;
  };
  activeStudents?: number;
  lowStockItems?: number;
  pendingAdmissions?: number;
}

const StatsGrid: React.FC<StatsGridProps> = ({
  stats,
  activeStudents = 0,
  lowStockItems = 0,
  pendingAdmissions = 0,
}) => {
  const totalStudents = Number(stats.students) || 0;
  const totalClasses = Number(stats.classes) || 0;
  const totalCollections = Number(stats.collections) || 0;
  const totalInventory = Number(stats.inventory) || 0;

  const items = [
    {
      icon: Users,
      label: 'Total Students',
      value: totalStudents,
      subValue: `${activeStudents} active`,
      color: 'blue',
      trend: 'up',
      trendValue: '',
    },
    {
      icon: GraduationCap,
      label: 'Classes',
      value: totalClasses,
      subValue: `${totalClasses} total`,
      color: 'purple',
      trend: 'up',
      trendValue: '',
    },
    {
      icon: HandHelping,
      label: 'Collections',
      value: totalCollections,
      subValue: `${totalCollections} recorded`,
      color: 'green',
      trend: 'up',
      trendValue: '',
    },
    {
      icon: Box,
      label: 'Inventory Items',
      value: totalInventory,
      subValue:
        lowStockItems > 0
          ? `${lowStockItems} low stock`
          : 'All stock levels good',
      color: 'orange',
      trend: lowStockItems > 0 ? 'down' : 'up',
      trendValue:
        lowStockItems > 0
          ? `${lowStockItems} items`
          : 'All good',
    },
  ];

  const colors = {
    blue:
      'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    purple:
      'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    green:
      'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    orange:
      'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    pink:
      'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-start justify-between">
              <div
                className={`rounded-xl p-2.5 ${
                  colors[
                    item.color as keyof typeof colors
                  ]
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>

              {item.trend && item.trendValue && (
                <div
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    item.trend === 'up'
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}
                >
                  {item.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}

                  {item.trendValue}
                </div>
              )}
            </div>

            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {item.value.toLocaleString()}
              </p>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.label}
              </p>

              {item.subValue && (
                <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                  {item.subValue}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsGrid;
