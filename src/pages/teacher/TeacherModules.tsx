import React, { useState } from 'react';
import {
  GraduationCap,
  Users,
  Clock,
  FileText,
  TrendingUp,
  Calendar,
  Plus,
  CheckCircle2,
  Award,
  Search,
  BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

// 1. Teacher Classes
export const TeacherClasses: React.FC = () => {
  const classes = [
    { id: 'c-1', name: 'Grade 10 - Science Stream', subject: 'Mathematics', students: 38, room: 'Block B Room 102' },
    { id: 'c-2', name: 'Grade 11 - Science Stream', subject: 'Further Mathematics', students: 32, room: 'Block B Room 104' },
    { id: 'c-3', name: 'Grade 12 - Senior Stream', subject: 'Mathematics & Calculus', students: 41, room: 'Auditorium Hall 2' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold">My Assigned Teaching Classes</h1>
        <p className="text-blue-100 text-sm mt-1">Class rosters, subject curricula, and student attendance logs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {classes.map(c => (
          <div key={c.id} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-2xl">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">{c.name}</h3>
                <p className="text-xs text-blue-600 font-semibold">{c.subject}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between text-xs text-gray-500">
              <span>{c.students} Registered Students</span>
              <span>{c.room}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 2. Teacher Students
export const TeacherStudents: React.FC = () => {
  const students = [
    { id: 's-1', name: 'Chinedu Okonkwo', adm: 'EIS/2025/084', class: 'Grade 10', grade: '94% (A+)' },
    { id: 's-2', name: 'Fatima Abubakar', adm: 'EIS/2025/119', class: 'Grade 8', grade: '88% (A)' },
    { id: 's-3', name: 'David Adeleke', adm: 'EIS/2025/039', class: 'Grade 11', grade: '91% (A+)' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="bg-gradient-to-r from-indigo-800 via-purple-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold">Students Directory & Academic Standing</h1>
        <p className="text-indigo-100 text-sm mt-1">Student roster, assessment performances, and guardian contacts.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-6 shadow-sm overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-semibold border-b">
            <tr>
              <th className="p-3">Admission No</th>
              <th className="p-3">Student Name</th>
              <th className="p-3">Class</th>
              <th className="p-3">Academic Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {students.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="p-3 font-mono">{s.adm}</td>
                <td className="p-3 font-bold text-gray-900 dark:text-white">{s.name}</td>
                <td className="p-3 text-gray-600 dark:text-gray-400">{s.class}</td>
                <td className="p-3 font-mono font-bold text-emerald-600">{s.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 3. Teacher Assignments
export const TeacherAssignments: React.FC = () => {
  const assignments = [
    { id: 'as-1', title: 'Quadratic Equations & Graph Plotting Test', class: 'Grade 10 - Science', dueDate: 'Sep 15, 2025', submissions: '34 / 38' },
    { id: 'as-2', title: 'Calculus Differentiation Practical Sheet', class: 'Grade 11 - Science', dueDate: 'Sep 18, 2025', submissions: '28 / 32' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="bg-gradient-to-r from-purple-800 via-pink-700 to-rose-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Class Assignments & Projects</h1>
          <p className="text-purple-100 text-sm mt-1">Create homework, upload test rubrics, and grade student submissions.</p>
        </div>
        <button
          onClick={() => toast.success('Create assignment modal ready')}
          className="px-5 py-2.5 rounded-2xl bg-white text-purple-800 font-bold text-xs hover:bg-purple-50 shadow-md flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Assignment</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assignments.map(a => (
          <div key={a.id} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-5 space-y-3 shadow-sm">
            <h3 className="font-bold text-base text-gray-900 dark:text-white">{a.title}</h3>
            <p className="text-xs text-blue-600 font-semibold">{a.class}</p>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between text-xs text-gray-500">
              <span>Due: {a.dueDate}</span>
              <span className="font-semibold text-emerald-600">{a.submissions} Submitted</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 4. Teacher Grades
export const TeacherGrades: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold">Gradebook & Continuous Assessment</h1>
        <p className="text-emerald-100 text-sm mt-1">Upload mid-term test scores, calculate GPA rankings, and print term report cards.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-6 text-center py-12 text-gray-500">
        <Award className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Gradebook Synchronized</h3>
        <p className="text-xs text-gray-400 mt-1">Grade 10-12 Continuous Assessments are verified and synced with parent portal.</p>
      </div>
    </div>
  );
};
