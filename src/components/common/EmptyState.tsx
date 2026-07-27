import React from 'react';
import { AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data available',
  message = 'There is no data to display at the moment.',
  icon = <AlertCircle className="w-12 h-12 text-gray-400" />,
  action,
}) => {
  return (
    <div className="text-center py-12">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
