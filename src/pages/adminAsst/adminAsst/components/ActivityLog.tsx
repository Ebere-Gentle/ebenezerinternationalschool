// src/pages/adminAsst/components/ActivityLog.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { History, Clock, User, FileText } from 'lucide-react';
import dayjs from 'dayjs';

interface ActivityLogProps {
  logs: any[];
}

const ActivityLog: React.FC<ActivityLogProps> = ({ logs }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Activity Log</h3>
      </div>

      {logs?.slice(0, 20).map((log: any) => (
        <motion.div
          key={log.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {log.action}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {log.description}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {dayjs(log.created_at).format('MMM D')}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {dayjs(log.created_at).format('h:mm A')}
              </span>
            </div>
          </div>
        </motion.div>
      ))}
      {(!logs || logs.length === 0) && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">No activity logs found</div>
      )}
    </div>
  );
};

export default ActivityLog;
