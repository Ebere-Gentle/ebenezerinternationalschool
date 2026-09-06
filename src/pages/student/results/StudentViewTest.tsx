import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ResultTable } from '../../../components/results/shared/ResultTable';
import { CumulativeResult, CumulativeCalculator, ResultData } from '../../../components/results/shared/CumulativeCalculator';
import { supabase } from '../../../config/supabase/client';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

const StudentViewTest: React.FC = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<CumulativeResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchStudentResults();
  }, [user]);

  const fetchStudentResults = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name, class_id')
        .eq('user_id', user.id)
        .single();

      if (studentError || !studentData) {
        setResults([]);
        return;
      }

      const { data, error } = await supabase
        .from('test_results')
        .select(`score,max_score,percentage,grade,remark,subject_id,term,session,subjects:subject_id (name)`)
        .eq('student_id', studentData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const resultData: ResultData[] = (data || []).map((item: any) => ({
        studentId: studentData.id,
        studentName: `${studentData.first_name} ${studentData.last_name}`,
        subject: item.subjects?.name || 'Unknown',
        score: item.score,
        maxScore: item.max_score || 100,
        percentage: item.percentage || 0,
        grade: item.grade || 'F',
        remark: item.remark || 'N/A',
      }));

      setResults(CumulativeCalculator.calculateCumulative(resultData));
    } catch (error) {
      console.error('Error fetching student test results:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="container mx-auto p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Test Results</h1>
        {results.length > 0 ? <ResultTable results={results} title="Test Results" /> : <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"><p className="text-gray-500 dark:text-gray-400">No test results available yet.</p></div>}
      </motion.div>
    </div>
  );
};

export default StudentViewTest;
