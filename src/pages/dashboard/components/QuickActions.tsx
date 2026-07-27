import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, UserCog, DollarSign, FileText, Megaphone,  Calendar, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const actions = [
  { id: 1, label: 'Register Student', icon: UserPlus, color: 'primary' },
  { id: 2, label: 'Register Teacher', icon: UserCog, color: 'secondary' },
  { id: 3, label: 'Create Fee', icon: DollarSign, color: 'success' },
  { id: 4, label: 'Generate Report', icon: FileText, color: 'warning' },
  { id: 5, label: 'Announcements', icon: Megaphone, color: 'info' },
  { id: 6, label: 'Attendance', icon: Calendar, color: 'primary' },
  { id: 7, label: 'Invoices', icon: Receipt, color: 'secondary' },
];

const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const colorClasses = {
    primary: 'border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-900/20',
    secondary: 'border-purple-200 bg-purple-50 hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-900/20',
    success: 'border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-900 dark:bg-green-900/20',
    warning: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100 dark:border-yellow-900 dark:bg-yellow-900/20',
    danger: 'border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900 dark:bg-red-900/20',
    info: 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-900/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-2">
          <UserPlus className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/${action.label.toLowerCase().replace(' ', '-')}`)}
            className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-medium transition-all ${colorClasses[action.color as keyof typeof colorClasses]}`}
          >
            <action.icon className={`h-4 w-4 text-gray-600 dark:text-gray-400`} />
            {action.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default QuickActions;
