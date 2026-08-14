import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardCheck,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LeaveItem {
  id: string;
  applicant: string;
  role: string;
  type: 'Annual Leave' | 'Sick Leave' | 'Maternity Leave' | 'Compassionate';
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'approved' | 'pending' | 'rejected';
}

const SAMPLE_LEAVE: LeaveItem[] = [
  {
    id: 'lv-01',
    applicant: 'Mrs. Folashade Adeyemi',
    role: 'Teacher (Grade 10)',
    type: 'Sick Leave',
    start_date: '2025-08-15',
    end_date: '2025-08-18',
    days: 3,
    reason: 'Medical appointment & recovery',
    status: 'approved'
  },
  {
    id: 'lv-02',
    applicant: 'Femi Bakare',
    role: 'Bursar General',
    type: 'Annual Leave',
    start_date: '2025-09-01',
    end_date: '2025-09-12',
    days: 10,
    reason: 'Scheduled vacation with family',
    status: 'pending'
  }
];

export const LeaveRequests: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveItem[]>(SAMPLE_LEAVE);

  const handleApprove = (id: string) => {
    setLeaves(prev => prev.map(l => (l.id === id ? { ...l, status: 'approved' } : l)));
    toast.success('Leave application approved');
  };

  const handleReject = (id: string) => {
    setLeaves(prev => prev.map(l => (l.id === id ? { ...l, status: 'rejected' } : l)));
    toast.success('Leave application declined');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Staff Leave & Absence Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Leave Requests & Approvals</h1>
          <p className="text-purple-100 text-sm max-w-xl">
            Review, approve, and track staff leave entitlements, relief teachers, and medical certificates.
          </p>
        </div>

        <button
          onClick={() => toast.success('New leave request modal opened')}
          className="px-5 py-3 rounded-2xl bg-white text-purple-800 font-bold text-sm hover:bg-purple-50 shadow-lg transition-all flex items-center justify-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {leaves.map(item => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">{item.applicant}</h3>
                <span className="text-xs text-gray-500">({item.role})</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  item.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : item.status === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {item.status}
                </span>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400">
                <strong>{item.type}</strong> • {item.days} days ({item.start_date} to {item.end_date})
              </p>
              <p className="text-xs text-gray-500 italic">"{item.reason}"</p>
            </div>

            {item.status === 'pending' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReject(item.id)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleApprove(item.id)}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  Approve Leave
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default LeaveRequests;
