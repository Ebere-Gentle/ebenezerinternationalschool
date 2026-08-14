import React, { useState } from 'react';
import { Calendar, Clock, BookOpen, User, MapPin, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

const TIMETABLE_SLOTS = [
  { time: '08:00 - 08:50 AM', mon: 'Mathematics (Mr. Ade)', tue: 'English Lang (Mrs. Joy)', wed: 'Physics (Dr. Okoro)', thu: 'Chemistry (Mrs. Bello)', fri: 'Civic Education' },
  { time: '08:50 - 09:40 AM', mon: 'English Lang (Mrs. Joy)', tue: 'Mathematics (Mr. Ade)', wed: 'Chemistry (Mrs. Bello)', thu: 'Biology (Dr. Okoro)', fri: 'ICT Lab' },
  { time: '09:40 - 10:00 AM', mon: 'SHORT BREAK', tue: 'SHORT BREAK', wed: 'SHORT BREAK', thu: 'SHORT BREAK', fri: 'SHORT BREAK' },
  { time: '10:00 - 10:50 AM', mon: 'Biology (Dr. Okoro)', tue: 'Physics Lab', wed: 'Economics', thu: 'Mathematics (Mr. Ade)', fri: 'French Language' },
  { time: '10:50 - 11:40 AM', mon: 'ICT / Coding', tue: 'Literature in English', wed: 'Further Maths', thu: 'Agricultural Science', fri: 'Sports & PE' },
];

export const TimetablePage: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState('Grade 10 - Science Stream');

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="bg-gradient-to-r from-blue-800 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Curriculum & Period Schedule</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Academic Timetable & Schedules</h1>
          <p className="text-blue-100 text-sm max-w-xl">
            Master weekly period breakdown, classroom venues, and subject teacher allocations.
          </p>
        </div>

        <button
          onClick={() => {
            window.print();
            toast.success('Printing timetable schedule');
          }}
          className="px-5 py-3 rounded-2xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 shadow-lg transition-all flex items-center justify-center gap-2 self-start md:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print Timetable</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">Select Class:</span>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
            >
              <option value="Grade 10 - Science Stream">Grade 10 - Science Stream</option>
              <option value="Grade 10 - Commercial Stream">Grade 10 - Commercial Stream</option>
              <option value="Grade 11 - Science Stream">Grade 11 - Science Stream</option>
              <option value="Grade 12 - Senior Stream">Grade 12 - Senior Stream</option>
            </select>
          </div>
          <span className="text-xs text-gray-400 font-mono">1st Term 2025/2026</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-gray-800">
                <th className="p-3 border border-gray-200 dark:border-gray-800">Time / Period</th>
                <th className="p-3 border border-gray-200 dark:border-gray-800">Monday</th>
                <th className="p-3 border border-gray-200 dark:border-gray-800">Tuesday</th>
                <th className="p-3 border border-gray-200 dark:border-gray-800">Wednesday</th>
                <th className="p-3 border border-gray-200 dark:border-gray-800">Thursday</th>
                <th className="p-3 border border-gray-200 dark:border-gray-800">Friday</th>
              </tr>
            </thead>
            <tbody>
              {TIMETABLE_SLOTS.map((slot, idx) => (
                <tr key={idx} className={slot.mon.includes('BREAK') ? 'bg-amber-50/50 dark:bg-amber-950/20 font-bold text-amber-800 dark:text-amber-300' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30'}>
                  <td className="p-3 font-mono font-semibold border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">{slot.time}</td>
                  <td className="p-3 border border-gray-200 dark:border-gray-800">{slot.mon}</td>
                  <td className="p-3 border border-gray-200 dark:border-gray-800">{slot.tue}</td>
                  <td className="p-3 border border-gray-200 dark:border-gray-800">{slot.wed}</td>
                  <td className="p-3 border border-gray-200 dark:border-gray-800">{slot.thu}</td>
                  <td className="p-3 border border-gray-200 dark:border-gray-800">{slot.fri}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TimetablePage;
