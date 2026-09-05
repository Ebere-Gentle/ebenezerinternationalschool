import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ResultTable } from '../../../components/results/shared/ResultTable';
import { CumulativeResult, CumulativeCalculator, ResultData } from '../../../components/results/shared/CumulativeCalculator';
import { supabase } from '../../../config/supabase/client';
import { Loader2, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';

interface FilterState {
  classId: string;
  subjectId: string;
  term: string;
  session: string;
  type: 'test' | 'exam' | 'cbt';
}

const TeacherViewResults: React.FC = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<FilterState>({
    classId: '',
    subjectId: '',
    term: '',
    session: '',
    type: 'test'
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [results, setResults] = useState<CumulativeResult[]>([]);
  const [loading, setLoading] = useState(false);

  const terms = ['First Term', 'Second Term', 'Third Term'];
  const sessions = ['2023/2024', '2024/2025', '2025/2026'];
  const types = ['test', 'exam', 'cbt'];

  useEffect(() => {
    fetchTeacherClasses();
    fetchTeacherSubjects();
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

  const fetchTeacherSubjects = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('teacher_subjects')
        .select('subject_id, subjects(id, name)')
        .eq('teacher_id', user.id);

      if (error) throw error;
      setSubjects(data?.map((item: any) => item.subjects) || []);
    } catch (error) {
      console.error('Error fetching teacher subjects:', error);
    }
  };

  const fetchResults = async () => {
    if (!filters.classId || !filters.subjectId || !filters.term || !filters.session) {
      toast.error('Please select all filters');
      return;
    }

    setLoading(true);
    try {
      const tableName = filters.type === 'test' ? 'test_results' :
                       filters.type === 'exam' ? 'exam_results' : 'cbt_results';

      const { data, error } = await supabase
        .from(tableName)
        .select(`
          student_id,
          score,
          max_score,
          percentage,
          grade,
          remark,
          students:student_id (
            first_name,
            last_name,
            admission_number
          )
        `)
        .eq('class_id', filters.classId)
        .eq('subject_id', filters.subjectId)
        .eq('term', filters.term)
        .eq('session', filters.session);

      if (error) throw error;

      if (data && data.length > 0) {
        const resultData: ResultData[] = data.map((item: any) => ({
          studentId: item.student_id,
          studentName: `${item.students?.first_name || ''} ${item.students?.last_name || ''}`.trim() || 'Unknown',
          subject: subjects.find(s => s.id === filters.subjectId)?.name || 'Unknown',
          score: item.score,
          maxScore: item.max_score || 100,
          percentage: item.percentage || 0,
          grade: item.grade || 'F',
          remark: item.remark || 'N/A'
        }));

        const cumulativeResults = CumulativeCalculator.calculateCumulative(resultData);
        setResults(cumulativeResults);
      } else {
        setResults([]);
        toast.info('No results found for the selected filters');
      }
    } catch (error: any) {
      console.error('Error fetching results:', error);
      toast.error(error.message || 'Failed to fetch results');
      setResults([]);
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">View Results</h1>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {types.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>

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
              value={filters.subjectId}
              onChange={(e) => setFilters(prev => ({ ...prev, subjectId: e.target.value }))}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Subject</option>
              {subjects.map((subj: any) => (
                <option key={subj.id} value={subj.id}>{subj.name}</option>
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
            onClick={fetchResults}
            disabled={loading}
            className="mt-4 px-6 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </>
            ) : (
              'View Results'
            )}
          </button>
        </div>

        {!loading && results.length > 0 && (
          <ResultTable
            results={results}
            title={`${filters.type.charAt(0).toUpperCase() + filters.type.slice(1)} Results`}
            subject={subjects.find((s: any) => s.id === filters.subjectId)?.name}
            term={filters.term}
            session={filters.session}
          />
        )}
      </motion.div>
    </div>
  );
};

export default TeacherViewResults;
