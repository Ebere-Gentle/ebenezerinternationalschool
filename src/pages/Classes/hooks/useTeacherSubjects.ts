import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase/client';
import { TeacherSubject } from '../types';
import toast from 'react-hot-toast';

export const useTeacherSubjects = (branchId: string | null, session: string) => {
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeacherSubjects = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teacher_subjects')
        .select(`
          *,
          teachers!teacher_subjects_teacher_id_fkey (
            first_name,
            last_name,
            teacher_id
          ),
          subjects!teacher_subjects_subject_id_fkey (
            name,
            code,
            subject_id
          ),
          classes!teacher_subjects_class_id_fkey (
            name,
            code
          )
        `)
        .eq('academic_session', session)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = data?.map(ts => ({
        ...ts,
        teacher_name: ts.teachers ? `${ts.teachers.first_name} ${ts.teachers.last_name}` : 'Unknown',
        subject_name: ts.subjects?.name || 'Unknown',
        class_name: ts.classes?.name || 'All Classes'
      })) || [];

      setTeacherSubjects(formatted);
    } catch (error: any) {
      console.error('Error fetching teacher subjects:', error);
      toast.error(error.message || 'Failed to fetch teacher subjects');
    } finally {
      setLoading(false);
    }
  }, [branchId, session]);

  useEffect(() => {
    fetchTeacherSubjects();
  }, [fetchTeacherSubjects]);

  const assignTeacherToSubject = async (data: Partial<TeacherSubject>) => {
    try {
      const { data: assignment, error } = await supabase
        .from('teacher_subjects')
        .insert([{
          ...data,
          academic_session: session,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchTeacherSubjects();
      toast.success('Teacher assigned to subject successfully!');
      return assignment;
    } catch (error: any) {
      console.error('Error assigning teacher:', error);
      toast.error(error.message || 'Failed to assign teacher');
      return null;
    }
  };

  const removeTeacherFromSubject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchTeacherSubjects();
      toast.success('Teacher removed from subject');
      return true;
    } catch (error: any) {
      console.error('Error removing teacher:', error);
      toast.error(error.message || 'Failed to remove teacher');
      return false;
    }
  };

  return {
    teacherSubjects,
    loading,
    assignTeacherToSubject,
    removeTeacherFromSubject,
    refetch: fetchTeacherSubjects
  };
};
