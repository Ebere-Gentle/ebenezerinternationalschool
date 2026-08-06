// src/pages/parent/components/StudentInfoCard.tsx

import React from 'react';
import { motion } from 'framer-motion';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  class_name?: string;
}

interface StudentInfoCardProps {
  student: Student;
  assignments: any[];
  totalBalance: number;
  totalPaid: number;
  completionRate: number;
  formatCurrency: (amount: number) => string;
}

const StudentInfoCard: React.FC<StudentInfoCardProps> = ({
  student,
  assignments,
  totalBalance,
  totalPaid,
  completionRate,
  formatCurrency,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-base sm:text-xl font-bold flex-shrink-0">
            {student.first_name?.[0]}{student.last_name?.[0]}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
              {student.first_name} {student.last_name}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {student.class_name} • {student.student_id}
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right flex-shrink-0">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total Balance</p>
          <p className={`text-lg sm:text-2xl font-bold ${totalBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {formatCurrency(totalBalance)}
          </p>
        </div>
      </div>

      <div className="mt-3 sm:mt-4">
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Payment Progress</span>
          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(completionRate)}%
          </span>
        </div>
        <div className="h-1.5 sm:h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(completionRate, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-3 sm:mt-4">
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Fees</p>
          <p className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white">{assignments.length}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Paid</p>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-green-600 dark:text-green-400 truncate">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Due</p>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-red-600 dark:text-red-400 truncate">
            {formatCurrency(totalBalance)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentInfoCard;
