import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Save,
  Download
} from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

interface AttendanceRecord {
  id: string;
  admission_no: string;
  name: string;
  class: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  time_in: string;
  notes?: string;
}

const SAMPLE_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att-1', admission_no: 'EIS/2025/084', name: 'Chinedu Okonkwo', class: 'Grade 10', status: 'present', time_in: '07:45 AM' },
  { id: 'att-2', admission_no: 'EIS/2025/119', name: 'Fatima Abubakar', class: 'Grade 8', status: 'present', time_in: '07:50 AM' },
  { id: 'att-3', admission_no: 'EIS/2025/039', name: 'David Adeleke', class: 'Grade 11', status: 'late', time_in: '08:20 AM', notes: 'Heavy traffic at Ikeja along' },
  { id: 'att-4', admission_no: 'EIS/2025/091', name: 'Zainab Bello', class: 'Grade 10', status: 'absent', time_in: '--', notes: 'Reported fever by parent' },
  { id: 'att-5', admission_no: 'EIS/2025/102', name: 'Kelechi Eze', class: 'Grade 9', status: 'present', time_in: '07:40 AM' },
];

export const AttendanceManagement: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>(SAMPLE_ATTENDANCE);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedClass, setSelectedClass] = useState('all');

  const handleStatusChange = (id: string, status: AttendanceRecord['status']) => {
    setRecords(prev =>
      prev.map(r => (r.id === id ? { ...r, status, time_in: status === 'present' ? '07:45 AM' : '--' } : r))
    );
  };

  const handleSave = () => {
    toast.success('Attendance records successfully synced to student portal and SMS notifications sent');
  };

  const presentCount = records.filter(r => r.status === 'present').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const absentCount = records.filter(r => r.status === 'absent').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-green-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>Daily Roll Call & Biometric Registers</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Attendance & Roll Call Management
          </h1>
          <p className="text-teal-100 text-sm max-w-xl">
            Track daily student and teacher attendance, automated SMS alerts to parents, and term punctuality stats.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-3 rounded-2xl bg-white text-teal-800 font-bold text-sm hover:bg-teal-50 shadow-lg transition-all flex items-center justify-center gap-2 self-start md:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>Save & Sync Attendance</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">Present Today</span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{presentCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">Late Arrivals</span>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{lateCount}</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-2xl text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">Absenteeism</span>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{absentCount}</p>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-2xl text-rose-600">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-200/80 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-semibold"
            />
            <span className="text-xs text-gray-500 font-medium">
              Showing roll call for {dayjs(selectedDate).format('dddd, MMMM D, YYYY')}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 font-semibold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="p-3.5">Admission No</th>
                <th className="p-3.5">Student Name</th>
                <th className="p-3.5">Class</th>
                <th className="p-3.5">Time In</th>
                <th className="p-3.5">Attendance Status</th>
                <th className="p-3.5">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {records.map(record => (
                <tr key={record.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="p-3.5 font-mono text-gray-600 dark:text-gray-400">{record.admission_no}</td>
                  <td className="p-3.5 font-bold text-gray-900 dark:text-white">{record.name}</td>
                  <td className="p-3.5 text-gray-600 dark:text-gray-400">{record.class}</td>
                  <td className="p-3.5 font-mono text-gray-600 dark:text-gray-400">{record.time_in}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      {(['present', 'late', 'absent', 'excused'] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(record.id, st)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all ${
                            record.status === st
                              ? st === 'present'
                                ? 'bg-emerald-600 text-white'
                                : st === 'late'
                                ? 'bg-amber-600 text-white'
                                : 'bg-rose-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="p-3.5 text-gray-500 italic">{record.notes || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceManagement;
