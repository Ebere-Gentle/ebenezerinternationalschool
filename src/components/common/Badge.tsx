import React from 'react';
import { getStatusBadgeClass } from '../../utils/formatters';

interface BadgeProps {
  status: string;
  children?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, children, className = '' }) => {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(status)} ${className}`}>
      {children || status}
    </span>
  );
};
