import React from 'react';
import { motion } from 'framer-motion';

interface ChartCardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, icon: Icon, children, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-2">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="h-64">{children}</div>
    </motion.div>
  );
};

export default ChartCard;
