import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, UserCog, DollarSign, FileText, Megaphone, Calendar, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const actions = [
  { 
    id: 1, 
    label: 'Register Student', 
    icon: UserPlus, 
    color: 'primary',
    path: '/students/register'
  },
  { 
    id: 2, 
    label: 'Register Teacher', 
    icon: UserCog, 
    color: 'secondary',
    path: '/teachers/add'
  },
  { 
    id: 3, 
    label: 'Create Fee', 
    icon: DollarSign, 
    color: 'success',
    path: '/fees/create'
  },
  { 
    id: 4, 
    label: 'Generate Report', 
    icon: FileText, 
    color: 'warning',
    path: '/reports'
  },
  { 
    id: 5, 
    label: 'Announcements', 
    icon: Megaphone, 
    color: 'info',
    path: '/announcements'
  },
  { 
    id: 6, 
    label: 'Attendance', 
    icon: Calendar, 
    color: 'primary',
    path: '/attendance'
  },
  { 
    id: 7, 
    label: 'Invoices', 
    icon: Receipt, 
    color: 'secondary',
    path: '/payments'
  },
];

const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const colorClasses = {
    primary: 'border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-900/20 hover:dark:bg-blue-900/30',
    secondary: 'border-purple-200 bg-purple-50 hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-900/20 hover:dark:bg-purple-900/30',
    success: 'border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-900 dark:bg-green-900/20 hover:dark:bg-green-900/30',
    warning: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100 dark:border-yellow-900 dark:bg-yellow-900/20 hover:dark:bg-yellow-900/30',
    danger: 'border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900 dark:bg-red-900/20 hover:dark:bg-red-900/30',
    info: 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-900/20 hover:dark:bg-cyan-900/30',
  };

  const iconColors = {
    primary: 'text-blue-600 dark:text-blue-400',
    secondary: 'text-purple-600 dark:text-purple-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
    info: 'text-cyan-600 dark:text-cyan-400',
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-2 flex-shrink-0">
          <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {actions.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleNavigation(action.path)}
            className={`
              flex items-center gap-1.5 sm:gap-2 
              rounded-xl border p-2.5 sm:p-3 
              text-left text-xs sm:text-sm 
              font-medium transition-all 
              min-w-0 overflow-hidden
              ${colorClasses[action.color as keyof typeof colorClasses]}
            `}
          >
            <action.icon className={`
              h-3.5 w-3.5 sm:h-4 sm:w-4 
              flex-shrink-0 
              ${iconColors[action.color as keyof typeof iconColors]}
            `} />
            <span className="truncate text-gray-700 dark:text-gray-200">
              {action.label}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default QuickActions;