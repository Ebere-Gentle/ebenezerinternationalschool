import React from 'react';
import { motion } from 'framer-motion';
import schoolLogo from '../../assets/school-logo.png';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '',
  showText = true,
  text = 'Loading...'
}) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative">
        {/* Outer rotating ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className={`${sizes[size]} rounded-full border-4 border-t-blue-600 border-r-purple-600 border-b-pink-600 border-l-transparent`}
        />
        
        {/* Inner counter-rotating ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-0 ${sizes[size]} rounded-full border-4 border-t-transparent border-r-blue-400 border-b-purple-400 border-l-transparent`}
        />

        {/* School Logo in center */}
        <div className={`absolute inset-0 flex items-center justify-center ${sizes[size]}`}>
          <div className="w-2/3 h-2/3 rounded-full overflow-hidden bg-white dark:bg-gray-800 p-0.5 shadow-lg">
            {schoolLogo ? (
              <img 
                src={schoolLogo} 
                alt="School Logo" 
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                EIS
              </div>
            )}
          </div>
        </div>

        {/* Pulsing rings */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute inset-0 ${sizes[size]} rounded-full border-2 border-blue-500/30 -z-10`}
        />
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className={`absolute inset-0 ${sizes[size]} rounded-full border-2 border-purple-500/20 -z-20`}
        />
      </div>

      {showText && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className={`mt-4 font-medium text-gray-600 dark:text-gray-400 ${textSizes[size]}`}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export default LoadingSpinner;
