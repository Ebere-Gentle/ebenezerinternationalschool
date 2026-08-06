// src/pages/adminAsst/components/StudentsList.tsx

import React from 'react';
import { Eye, Edit, Trash2, Plus, Search, Filter } from 'lucide-react';
import { getStatusBadge, getGenderBadge } from '../utils/helpers';

interface StudentsListProps {
  students: any[];
  classes: any[];
  onViewStudent: (student: any) => void;
  onAddStudent: () => void;
  onEditStudent: (student: any) => void;
  onDeleteStudent: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterValue: string;
  onFilterChange: (value: string) => void;
}

const StudentsList: React.FC<StudentsListProps> = ({
  students,
  classes,
  onViewStudent,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  searchQuery,
  onSearchChange,
  filterValue,
  onFilterChange,
}) => {
  const filteredStudents = students?.filter((s: any) => {
    const matchesSearch = searchQuery === '' || 
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterValue === '' || s.current_class === filterValue;
    return matchesSearch && matchesFilter;
  }) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search students..."
              className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm w-full sm:w-48"
            />
          </div>
          <select
            value={filterValue}
            onChange={(e) => onFilterChange(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
          >
            <option value="">All Classes</option>
            {classes?.map((c: any) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onAddStudent}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Name</th>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">ID</th>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Class</th>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Gender</th>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredStudents.map((student: any) => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                    {student.first_name} {student.last_name}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{student.student_id}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {student.current_class}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getGenderBadge(student.gender)}`}>
                      {student.gender}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(student.status)}`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onViewStudent(student)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      >
                        <Eye className="w-4 h-4 text-blue-500" />
                      </button>
                      <button
                        onClick={() => onEditStudent(student)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      >
                        <Edit className="w-4 h-4 text-yellow-500" />
                      </button>
                      <button
                        onClick={() => onDeleteStudent(student.id)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No students found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
          Showing {filteredStudents.length} of {students?.length || 0} students
        </div>
      </div>
    </div>
  );
};

export default StudentsList;
