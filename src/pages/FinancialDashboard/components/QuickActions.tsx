import React from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Download, Printer, RefreshCw, 
  FileSpreadsheet, FileText, Mail, Calendar,
  Filter, Search, Settings, Shield
} from 'lucide-react';

interface QuickActionsProps {
  onAddExpense: () => void;
  onExport: () => void;
  onPrint: () => void;
  onRefresh: () => void;
  onGenerateReport: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onAddExpense,
  onExport,
  onPrint,
  onRefresh,
  onGenerateReport,
}) => {
  const actions = [
    { icon: Plus, label: 'Add Expense', color: 'from-green-500 to-emerald-500', onClick: onAddExpense },
    { icon: Download, label: 'Export', color: 'from-blue-500 to-cyan-500', onClick: onExport },
    { icon: Printer, label: 'Print', color: 'from-purple-500 to-violet-500', onClick: onPrint },
    { icon: RefreshCw, label: 'Refresh', color: 'from-gray-500 to-slate-500', onClick: onRefresh },
    { icon: FileText, label: 'Report', color: 'from-orange-500 to-amber-500', onClick: onGenerateReport },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {actions.map((action, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className={`px-4 py-2.5 bg-gradient-to-r ${action.color} text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg flex items-center gap-2 text-sm`}
        >
          <action.icon className="w-4 h-4" />
          {action.label}
        </motion.button>
      ))}
    </div>
  );
};
