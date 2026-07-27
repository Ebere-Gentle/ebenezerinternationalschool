import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase/client';
import { StudentProfile } from '../types/dashboard.types';

export const useStudentData = (studentId: string) => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*, class:class_id(id, name)')
          .eq('id', studentId)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [studentId]);

  return { profile, loading, error };
};
