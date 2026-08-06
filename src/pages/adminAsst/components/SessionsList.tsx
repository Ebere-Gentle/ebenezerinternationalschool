// src/pages/adminAsst/components/SessionsList.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import dayjs from 'dayjs';

interface SessionsListProps {
  sessions: any[];
  onSetActive: (id: string) => void;
}

const SessionsList: React.FC<SessionsListProps> = ({ sessions, onSetActive }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Academic Sessions</h3>
      </div>

      {sessions?.map((session: any) => (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 ${
            session.is_current ? 'border-teal-500 dark:border-teal-400' : 'border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">{session.session_name}</span>
                {session.is_current && (
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{session.term_name}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500">
                <span>{dayjs(session.start_date).format('MMM D, YYYY')}</span>
                <span>→</span>
                <span>{dayjs(session.end_date).format('MMM D, YYYY')}</span>
              </div>
            </div>
            {!session.is_current && (
              <button
                onClick={() => onSetActive(session.id)}
                className="px-3 py-1.5 text-xs font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all"
              >
                Set Active
              </button>
            )}
          </div>
        </motion.div>
      ))}
      {(!sessions || sessions.length === 0) && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">No sessions found</div>
      )}
    </div>
  );
};

export default SessionsList;
