import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase/client';
import { Performance, ClassPerformance } from '../types/dashboard.types';

export const usePerformance = (studentId: string, classId: string) => {
  const [subjects, setSubjects] = useState<Performance[]>([]);
  const [classPerformance, setClassPerformance] = useState<ClassPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId || !classId) return;

    const fetchPerformance = async () => {
      try {
        const [subjectRes, classRes] = await Promise.all([
          supabase
            .from('subject_performance')
            .select('*')
            .eq('student_id', studentId),
          supabase
            .from('class_performance')
            .select('*')
            .eq('class_id', classId)
            .single(),
        ]);

        if (subjectRes.error) throw subjectRes.error;
        if (classRes.error && classRes.error.code !== 'PGRST116') throw classRes.error;

        setSubjects(subjectRes.data || []);
        if (classRes.data) setClassPerformance(classRes.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [studentId, classId]);

  return { subjects, classPerformance, loading, error };
};
