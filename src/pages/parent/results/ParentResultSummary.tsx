import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ResultTable } from '../../../components/results/shared/ResultTable';
import { CumulativeCalculator } from '../../../components/results/shared/CumulativeCalculator';
import type { CumulativeResult, ResultData } from '../../../components/results/shared/CumulativeCalculator';
import { supabase } from '../../../config/supabase/client';
import { Loader2, Users, TrendingUp, Award } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import toast from 'react-hot-toast';

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  class_id: string;
}

const ParentResultSummary: React.FC = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [results, setResults] = useState<CumulativeResult[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchChildren();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChild) {
      fetchChildSummary();
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, class_id')
        .eq('parent_id', user.id);

      if (error) throw error;
      setChildren(data || []);
      if (data && data.length > 0) {
        setSelectedChild(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      toast.error('Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const fetchChildSummary = async () => {
    if (!selectedChild) return;
    setLoading(true);
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('first_name, last_name')
        .eq('id', selectedChild)
        .single();

      const tables = ['test_results', 'exam_results', 'cbt_results'];
      let allResults: ResultData[] = [];

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select(`
            score,
            max_score,
            percentage,
            grade,
            remark,
            subject_id,
            subjects:subject_id (name)
          `)
          .eq('student_id', selectedChild);

        if (!error && data) {
          const formattedData: ResultData[] = data.map((item: any) => ({
            studentId: selectedChild,
            studentName: `${studentData?.first_name || ''} ${studentData?.last_name || ''}`.trim() || 'Unknown',
            subject: item.subjects?.name || 'Unknown',
            score: item.score,
            maxScore: item.max_score || 100,
            percentage: item.percentage || 0,
            grade: item.grade || 'F',
            remark: item.remark || 'N/A'
          }));
          allResults = [...allResults, ...formattedData];
        }
      }

      if (allResults.length > 0 && studentData) {
        const cumulativeResults = CumulativeCalculator.calculateCumulative(allResults);
        setResults(cumulativeResults);
        setSummary(CumulativeCalculator.getCumulativeSummary(cumulativeResults));
      } else {
        setResults([]);
        setSummary(null);
      }
    } catch (error) {
      console.error('Error fetching child summary:', error);
      setResults([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading && children.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Result Summary</h1>

        {children.length > 0 ? (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-500" />
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.first_name} {child.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : summary && results.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Overall Grade</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {results[0]?.grade || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Average</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {results[0]?.overallPercentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Position</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {results[0]?.position ? `#${results[0].position}` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Remark</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {results[0]?.remark || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <ResultTable
                  results={results}
                  title="Cumulative Results"
                />
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">No results available for this child.</p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No children registered.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ParentResultSummary;
