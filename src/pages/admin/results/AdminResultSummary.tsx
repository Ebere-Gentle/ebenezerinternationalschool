import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ResultTable } from '../../../components/results/shared/ResultTable';
import { CumulativeCalculator } from '../../../components/results/shared/CumulativeCalculator';
import type { CumulativeResult, ResultData } from '../../../components/results/shared/CumulativeCalculator';
import { supabase } from '../../../config/supabase/client';
import { Loader2, Filter, TrendingUp, Users, Award, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminResultSummary: React.FC = () => {
  const [filters, setFilters] = useState({
    classId: '',
    term: '',
    session: ''
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [results, setResults] = useState<CumulativeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const terms = ['First Term', 'Second Term', 'Third Term'];
  const sessions = ['2023/2024', '2024/2025', '2025/2026'];

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSummary = async () => {
    if (!filters.classId || !filters.term || !filters.session) {
      toast.error('Please select all filters');
      return;
    }

    setLoading(true);
    try {
      const tables = ['test_results', 'exam_results', 'cbt_results'];
      let allResults: ResultData[] = [];

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select(`
            student_id,
            score,
            max_score,
            percentage,
            grade,
            remark,
            subject_id,
            students:student_id (
              first_name,
              last_name,
              admission_number
            )
          `)
          .eq('class_id', filters.classId)
          .eq('term', filters.term)
          .eq('session', filters.session);

        if (!error && data) {
          const subjectNames = await getSubjectNames(data.map((d: any) => d.subject_id));
          const formattedData: ResultData[] = data.map((item: any) => ({
            studentId: item.student_id,
            studentName: `${item.students?.first_name || ''} ${item.students?.last_name || ''}`.trim() || 'Unknown',
            subject: subjectNames[item.subject_id] || 'Unknown',
            score: item.score,
            maxScore: item.max_score || 100,
            percentage: item.percentage || 0,
            grade: item.grade || 'F',
            remark: item.remark || 'N/A'
          }));
          allResults = [...allResults, ...formattedData];
        }
      }

      if (allResults.length > 0) {
        const cumulativeResults = CumulativeCalculator.calculateCumulative(allResults);
        setResults(cumulativeResults);
        setSummary(CumulativeCalculator.getCumulativeSummary(cumulativeResults));
      } else {
        setResults([]);
        setSummary(null);
        toast.info('No results found for the selected filters');
      }
    } catch (error: any) {
      console.error('Error fetching summary:', error);
      toast.error(error.message || 'Failed to fetch summary');
    } finally {
      setLoading(false);
    }
  };

  const getSubjectNames = async (subjectIds: string[]): Promise<Record<string, string>> => {
    const uniqueIds = [...new Set(subjectIds)].filter(id => id);
    if (uniqueIds.length === 0) return {};

    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .in('id', uniqueIds);

      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((s: any) => {
        map[s.id] = s.name;
      });
      return map;
    } catch (error) {
      console.error('Error fetching subject names:', error);
      return {};
    }
  };

  const handleExport = () => {
    toast.success('Export functionality coming soon');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Result Summary</h1>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={filters.classId}
              onChange={(e) => setFilters(prev => ({ ...prev, classId: e.target.value }))}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>

            <select
              value={filters.term}
              onChange={(e) => setFilters(prev => ({ ...prev, term: e.target.value }))}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Term</option>
              {terms.map(term => (
                <option key={term} value={term}>{term}</option>
              ))}
            </select>

            <select
              value={filters.session}
              onChange={(e) => setFilters(prev => ({ ...prev, session: e.target.value }))}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Session</option>
              {sessions.map(session => (
                <option key={session} value={session}>{session}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchSummary}
            disabled={loading}
            className="mt-4 px-6 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </>
            ) : (
              'Generate Summary'
            )}
          </button>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">Class Average</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.averagePercentage.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Highest Score</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.highestScore.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Lowest Score</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.lowestScore.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {!loading && results.length > 0 && (
          <ResultTable
            results={results}
            title={`Cumulative Results Summary - ${filters.term} ${filters.session}`}
            term={filters.term}
            session={filters.session}
            onExport={handleExport}
            onPrint={handlePrint}
          />
        )}
      </motion.div>
    </div>
  );
};

export default AdminResultSummary;
