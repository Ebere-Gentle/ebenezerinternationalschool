// src/components/ui/ResponsiveForm.tsx

import React from 'react';

interface ResponsiveFormGroupProps {
  children: React.ReactNode;
  className?: string;
  label?: string;
  error?: string;
  required?: boolean;
}

export const ResponsiveFormGroup: React.FC<ResponsiveFormGroupProps> = ({
  children,
  className = '',
  label,
  error,
  required = false,
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="w-full">{children}</div>
      {error && (
        <p className="text-xs sm:text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

interface ResponsiveInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const ResponsiveInput: React.FC<ResponsiveInputProps> = ({
  className = '',
  type = 'text',
  placeholder,
  ...props
}) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className={`
        w-full px-3 sm:px-4 py-2 sm:py-2.5
        rounded-lg sm:rounded-xl
        border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-900
        text-sm sm:text-base
        focus:ring-2 focus:ring-blue-500 focus:border-transparent
        transition-all
        dark:text-white
        ${className}
      `}
      {...props}
    />
  );
};

interface ResponsiveSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  children: React.ReactNode;
}

export const ResponsiveSelect: React.FC<ResponsiveSelectProps> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <select
      className={`
        w-full px-3 sm:px-4 py-2 sm:py-2.5
        rounded-lg sm:rounded-xl
        border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-900
        text-sm sm:text-base
        focus:ring-2 focus:ring-blue-500 focus:border-transparent
        transition-all
        dark:text-white
        ${className}
      `}
      {...props}
    >
      {children}
    </select>
  );
};

interface ResponsiveTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
  rows?: number;
}

export const ResponsiveTextarea: React.FC<ResponsiveTextareaProps> = ({
  className = '',
  rows = 3,
  ...props
}) => {
  return (
    <textarea
      rows={rows}
      className={`
        w-full px-3 sm:px-4 py-2 sm:py-2.5
        rounded-lg sm:rounded-xl
        border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-900
        text-sm sm:text-base
        focus:ring-2 focus:ring-blue-500 focus:border-transparent
        transition-all
        dark:text-white
        ${className}
      `}
      {...props}
    />
  );
};

interface ResponsiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'purple' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  className = '',
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  disabled,
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    purple: 'bg-purple-500 hover:bg-purple-600 text-white',
    outline: 'border-2 border-gray-300 hover:bg-gray-50 text-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs sm:text-sm',
    md: 'px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base',
    lg: 'px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg',
  };

  return (
    <button
      className={`
        w-full sm:w-auto
        rounded-lg sm:rounded-xl
        font-medium
        transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};
