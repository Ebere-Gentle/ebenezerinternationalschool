import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ResultTable } from '../../../components/results/shared/ResultTable';
import { CumulativeResult, CumulativeCalculator, ResultData } from '../../../components/results/shared/CumulativeCalculator';
import { supabase } from '../../../config/supabase/client';
import { Loader2, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';

const TeacherResultSummary: React.FC = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    classId: '',
    term: '',
    session: ''
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [results, setResults] = useState<CumulativeResult[]>([]);
  const [loading, setLoading] = useState(false);

  const terms = ['First Term', 'Second Term', 'Third Term'];
  const sessions = ['2023/2024', '2024/2025', '2025/2026'];

  useEffect(() => {
    if (user?.id) {
      fetchTeacherClasses();
    }
  }, [user]);

  const fetchTeacherClasses = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('teacher_classes')
        .select('class_id, classes(id, name)')
        .eq('teacher_id', user.id);

      if (error) throw error;
      setClasses(data?.map((item: any) => item.classes) || []);
    } catch (error) {
      console.error('Error fetching teacher classes:', error);
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
          const subjectIds = data.map((d: any) => d.subject_id).filter((id: string) => id);
          let subjectNames: Record<string, string> = {};
          if (subjectIds.length > 0) {
            const { data: subjData } = await supabase
              .from('subjects')
              .select('id, name')
              .in('id', subjectIds);
            subjectNames = (subjData || []).reduce((acc: any, s: any) => {
              acc[s.id] = s.name;
              return acc;
            }, {});
          }

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
      } else {
        setResults([]);
        toast.info('No results found');
      }
    } catch (error: any) {
      console.error('Error fetching summary:', error);
      toast.error(error.message || 'Failed to fetch summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Result Summary</h1>

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
              {classes.map((cls: any) => (
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

        {!loading && results.length > 0 && (
          <ResultTable
            results={results}
            title={`Cumulative Results Summary - ${filters.term} ${filters.session}`}
            term={filters.term}
            session={filters.session}
          />
        )}
      </motion.div>
    </div>
  );
};

export default TeacherResultSummary;
