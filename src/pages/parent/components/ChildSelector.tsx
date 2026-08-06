// src/pages/parent/components/ChildSelector.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckCircle, Users } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  class_name?: string;
  passport_url?: string;
  branch_id: string;
  email?: string;
}

interface ChildSelectorProps {
  isOpen: boolean;
  children: Student[];
  selectedChild: Student | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelect: (child: Student) => void;
}

const ChildSelector: React.FC<ChildSelectorProps> = ({
  isOpen,
  children,
  selectedChild,
  searchTerm,
  onSearchChange,
  onSelect,
}) => {
  const filteredChildren = children.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.student_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen || children.length <= 1) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-4 sm:mb-6 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search children..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-xs sm:text-sm"
              />
            </div>
          </div>
          <div className="max-h-48 sm:max-h-60 overflow-y-auto">
            {filteredChildren.map((child) => (
              <button
                key={child.id}
                onClick={() => onSelect(child)}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all text-left ${
                  selectedChild?.id === child.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                    : ''
                }`}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-xs sm:text-sm flex-shrink-0">
                  {child.first_name?.[0]}{child.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                    {child.first_name} {child.last_name}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                    {child.class_name} • {child.student_id}
                  </p>
                </div>
                {selectedChild?.id === child.id && (
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChildSelector;
