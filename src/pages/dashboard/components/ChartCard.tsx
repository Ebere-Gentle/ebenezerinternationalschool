import React from 'react';
import { motion } from 'framer-motion';

interface ChartCardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  iconColor?: string;
  compact?: boolean;
}

const ChartCard: React.FC<ChartCardProps> = ({ 
  title, 
  icon: Icon, 
  children, 
  className = '',
  iconColor = 'from-blue-500 to-purple-600',
  compact = false
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`
        rounded-xl sm:rounded-2xl 
        border border-gray-200 dark:border-gray-700 
        bg-white dark:bg-gray-800 
        shadow-sm hover:shadow-md transition-shadow duration-300
        ${compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6'}
        ${className}
      `}
    >
      {/* Header - Mobile Optimized */}
      <div className={`
        flex items-center gap-2 sm:gap-3 
        ${compact ? 'mb-2 sm:mb-3' : 'mb-3 sm:mb-4'}
      `}>
        {/* Icon - Responsive sizing */}
        <div className={`
          rounded-lg bg-gradient-to-br ${iconColor} 
          flex-shrink-0
          ${compact ? 'p-1.5 sm:p-2' : 'p-2 sm:p-2.5'}
        `}>
          <Icon className={`
            text-white
            ${compact ? 'h-3.5 w-3.5 sm:h-4 sm:w-4' : 'h-4 w-4 sm:h-5 sm:w-5'}
          `} />
        </div>
        
        {/* Title - Responsive text */}
        <h3 className={`
          font-semibold text-gray-900 dark:text-white
          truncate
          ${compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base md:text-lg'}
        `}>
          {title}
        </h3>
      </div>

      {/* Chart Content - Responsive height */}
      <div className={`
        relative
        ${compact ? 'h-40 sm:h-48 md:h-56' : 'h-48 sm:h-56 md:h-64 lg:h-72'}
        w-full
      `}>
        {children}
      </div>
    </motion.div>
  );
};

export default ChartCard;