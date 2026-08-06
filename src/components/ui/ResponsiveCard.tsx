// src/components/ui/ResponsiveCard.tsx

import React from 'react';

interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  border?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: 'p-0',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-6 md:p-8',
  lg: 'p-6 sm:p-8 md:p-10',
};

const shadowClasses = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
};

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  className = '',
  padding = 'md',
  hover = false,
  border = true,
  shadow = 'sm',
}) => {
  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl md:rounded-2xl
        ${paddingClasses[padding]}
        ${border ? 'border border-gray-200 dark:border-gray-700' : ''}
        ${shadowClasses[shadow]}
        ${hover ? 'hover:shadow-lg transition-shadow duration-200' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
