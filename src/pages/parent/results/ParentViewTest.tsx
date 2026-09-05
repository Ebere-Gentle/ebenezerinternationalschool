import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ResultTable } from '../../../components/results/shared/ResultTable';
import { CumulativeResult, CumulativeCalculator, ResultData } from '../../../components/results/shared/CumulativeCalculator';
import { supabase } from '../../../config/supabase/client';
import { Loader2, Users } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import toast from 'react-hot-toast';

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  class_id: string;
}

const ParentViewTest: React.FC = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [results, setResults] = useState<CumulativeResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchChildren();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChild) {
      fetchChildResults();
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

  const fetchChildResults = async () => {
    if (!selectedChild) return;
    setLoading(true);
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('first_name, last_name')
        .eq('id', selectedChild)
        .single();

      const { data, error } = await supabase
        .from('test_results')
        .select(`
          score,
          max_score,
          percentage,
          grade,
          remark,
          subject_id,
          term,
          session,
          subjects:subject_id (name)
        `)
        .eq('student_id', selectedChild)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0 && studentData) {
        const resultData: ResultData[] = data.map((item: any) => ({
          studentId: selectedChild,
          studentName: `${studentData.first_name} ${studentData.last_name}`,
          subject: item.subjects?.name || 'Unknown',
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
      }
    } catch (error) {
      console.error('Error fetching child results:', error);
      setResults([]);
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">View Test Results</h1>

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
            ) : results.length > 0 ? (
              <ResultTable
                results={results}
                title="Test Results"
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">No test results available for this child.</p>
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

export default ParentViewTest;
