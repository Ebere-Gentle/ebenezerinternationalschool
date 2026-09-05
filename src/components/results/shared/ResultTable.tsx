import React from 'react';
import { motion } from 'framer-motion';
import { Download, Printer, FileText, TrendingUp, Users, Award } from 'lucide-react';
import { CumulativeResult, CumulativeCalculator } from './CumulativeCalculator';

interface ResultTableProps {
  results: CumulativeResult[];
  title?: string;
  subject?: string;
  term?: string;
  session?: string;
  onExport?: () => void;
  onPrint?: () => void;
}

export const ResultTable: React.FC<ResultTableProps> = ({
  results,
  title = 'Results Summary',
  subject,
  term,
  session,
  onExport,
  onPrint
}) => {
  const summary = CumulativeCalculator.getCumulativeSummary(results);

  const getGradeColor = (grade: string): string => {
    const colors: Record<string, string> = {
      'A': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'B': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'C': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'D': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'E': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'F': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    };
    return colors[grade] || colors['F'];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          {(term || session || subject) && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {term && `${term} • `}
              {session && `${session} • `}
              {subject && `Subject: ${subject}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          {onPrint && (
            <button
              onClick={onPrint}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            >
              <Printer className="w-5 h-5 text-gray-500" />
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            >
              <Download className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalStudents}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Average</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.averagePercentage.toFixed(1)}%</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Highest</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.highestScore.toFixed(1)}%</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Lowest</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.lowestScore.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Grade Distribution</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.gradeDistribution).map(([grade, count]) => (
            <span
              key={grade}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${getGradeColor(grade)}`}
            >
              {grade}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">#</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Student</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Total Score</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Average</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Percentage</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Grade</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Remark</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Position</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No results available
                </td>
              </tr>
            ) : (
              results.map((result, index) => (
                <motion.tr
                  key={result.studentId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                >
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {result.studentName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {result.totalScore.toFixed(1)} / {result.totalMaxScore.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {result.averageScore.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                    {result.overallPercentage.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getGradeColor(result.grade)}`}>
                      {result.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {result.remark}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                    {result.position ? (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        result.position === 1 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        result.position === 2 ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' :
                        result.position === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {result.position === 1 ? '🥇' : result.position === 2 ? '🥈' : result.position === 3 ? '🥉' : `#${result.position}`}
                      </span>
                    ) : '-'}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
