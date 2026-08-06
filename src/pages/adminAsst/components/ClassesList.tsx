// src/pages/adminAsst/components/ClassesList.tsx

import React from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { getLevelBadge } from '../utils/helpers';

interface ClassesListProps {
  classes: any[];
  onAddClass: () => void;
  onEditClass: (cls: any) => void;
  onDeleteClass: (id: string) => void;
}

const ClassesList: React.FC<ClassesListProps> = ({
  classes,
  onAddClass,
  onEditClass,
  onDeleteClass,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onAddClass}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Class
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Name</th>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Code</th>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Level</th>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Students</th>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {classes?.map((cls: any) => (
                <tr key={cls.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{cls.name}</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{cls.code}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getLevelBadge(cls.level)}`}>
                      {cls.level}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{cls.current_students || 0}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      cls.status === 'active' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {cls.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditClass(cls)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      >
                        <Edit className="w-4 h-4 text-yellow-500" />
                      </button>
                      <button
                        onClick={() => onDeleteClass(cls.id)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!classes || classes.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No classes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClassesList;
