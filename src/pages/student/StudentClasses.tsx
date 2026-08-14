import React from 'react';
import { BookOpen, User, Calendar, Award } from 'lucide-react';

export const StudentClasses: React.FC = () => {
  const mySubjects = [
    { name: 'Mathematics', teacher: 'Mr. Adeyemi', room: 'Block B Room 102', periods: '4 Periods / Wk', score: '94% (A+)' },
    { name: 'English Language', teacher: 'Mrs. Joy Bello', room: 'Block A Room 201', periods: '4 Periods / Wk', score: '88% (A)' },
    { name: 'Physics', teacher: 'Dr. Joseph Okoro', room: 'Physics Lab', periods: '3 Periods / Wk', score: '91% (A+)' },
    { name: 'Chemistry', teacher: 'Mrs. Aminat Bello', room: 'Chemistry Lab', periods: '3 Periods / Wk', score: '86% (A)' },
    { name: 'Biology', teacher: 'Dr. Joseph Okoro', room: 'Biology Lab', periods: '3 Periods / Wk', score: '90% (A+)' },
    { name: 'ICT & Programming', teacher: 'Mr. Femi Bakare', room: 'Computer Lab 1', periods: '2 Periods / Wk', score: '96% (A+)' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold">My Enrolled Subjects & Classes</h1>
        <p className="text-blue-100 text-sm mt-1">Grade 10 - Science Stream Curriculum for 1st Term 2025/2026.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mySubjects.map((sub, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-2xl">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">{sub.name}</h3>
                <p className="text-xs text-gray-500">{sub.teacher}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between text-xs text-gray-500">
              <span>{sub.room}</span>
              <span className="font-bold text-emerald-600">{sub.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentClasses;
