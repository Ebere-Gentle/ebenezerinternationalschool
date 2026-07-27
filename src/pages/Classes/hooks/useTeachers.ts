import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase/client';
import { Teacher } from '../types';
import toast from 'react-hot-toast';

export const useTeachers = (branchId: string | null) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeachers = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      setTeachers(data || []);
    } catch (error: any) {
      console.error('Error fetching teachers:', error);
      toast.error(error.message || 'Failed to fetch teachers');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  return {
    teachers,
    loading,
    refetch: fetchTeachers
  };
};
