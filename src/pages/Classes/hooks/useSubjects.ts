import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase/client';
import { Subject } from '../types';
import toast from 'react-hot-toast';

export const useSubjects = (branchId: string | null) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubjects = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('branch_id', branchId)
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      toast.error(error.message || 'Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const createSubject = async (data: Partial<Subject>) => {
    try {
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('subjects')
        .select('id', { count: 'exact' })
        .eq('branch_id', branchId);

      const subjectId = `SUB-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

      const { data: newSubject, error } = await supabase
        .from('subjects')
        .insert([{
          ...data,
          subject_id: subjectId,
          branch_id: branchId,
          code: data.code?.toUpperCase() || `SUB-${String((count || 0) + 1).padStart(3, '0')}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchSubjects();
      toast.success('Subject created successfully!');
      return newSubject;
    } catch (error: any) {
      console.error('Error creating subject:', error);
      toast.error(error.message || 'Failed to create subject');
      return null;
    }
  };

  const updateSubject = async (id: string, data: Partial<Subject>) => {
    try {
      const { data: updatedSubject, error } = await supabase
        .from('subjects')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchSubjects();
      toast.success('Subject updated successfully!');
      return updatedSubject;
    } catch (error: any) {
      console.error('Error updating subject:', error);
      toast.error(error.message || 'Failed to update subject');
      return null;
    }
  };

  const deleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchSubjects();
      toast.success('Subject deleted successfully!');
      return true;
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      toast.error(error.message || 'Failed to delete subject');
      return false;
    }
  };

  return {
    subjects,
    loading,
    createSubject,
    updateSubject,
    deleteSubject,
    refetch: fetchSubjects
  };
};
