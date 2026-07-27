import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase/client';
import type { Class, ClassStats } from '../types';
import toast from 'react-hot-toast';

export const useClasses = (branchId: string | null, session: string) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<ClassStats>({
    totalStudents: 0,
    totalSubjects: 0,
    totalTeachers: 0,
    completionRate: 0
  });

  const fetchClasses = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          *,
          teachers!fk_class_teacher (
            first_name,
            last_name,
            teacher_id
          )
        `)
        .eq('branch_id', branchId)
        .order('name');

      if (classesError) throw classesError;

      // Get student counts per class
      const { data: studentClasses } = await supabase
        .from('student_classes')
        .select('class_id, student_id')
        .eq('academic_session', session)
        .eq('is_current', true);

      const studentCounts: Record<string, number> = {};
      studentClasses?.forEach(sc => {
        studentCounts[sc.class_id] = (studentCounts[sc.class_id] || 0) + 1;
      });

      // Get subject counts per class
      const { data: teacherSubjects } = await supabase
        .from('teacher_subjects')
        .select('class_id, subject_id')
        .eq('academic_session', session);

      const subjectCounts: Record<string, Set<string>> = {};
      teacherSubjects?.forEach(ts => {
        if (ts.class_id) {
          if (!subjectCounts[ts.class_id]) {
            subjectCounts[ts.class_id] = new Set();
          }
          subjectCounts[ts.class_id].add(ts.subject_id);
        }
      });

      const formattedClasses = classesData?.map(cls => ({
        ...cls,
        class_teacher_name: cls.teachers ? `${cls.teachers.first_name} ${cls.teachers.last_name}` : 'Not Assigned',
        students_count: studentCounts[cls.id] || 0,
        subjects_count: subjectCounts[cls.id]?.size || 0
      })) || [];

      setClasses(formattedClasses);
      setTotalCount(formattedClasses.length);

      // Calculate stats
      const totalStudents = Object.values(studentCounts).reduce((a, b) => a + b, 0);
      const totalSubjects = new Set(teacherSubjects?.map(ts => ts.subject_id) || []).size;
      const totalTeachers = new Set(teacherSubjects?.map(ts => ts.teacher_id) || []).size;
      const completionRate = formattedClasses.length > 0 
        ? formattedClasses.filter(c => c.class_teacher_id).length / formattedClasses.length * 100 
        : 0;

      setStats({
        totalStudents,
        totalSubjects,
        totalTeachers,
        completionRate
      });

    } catch (error: any) {
      console.error('Error fetching classes:', error);
      toast.error(error.message || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  }, [branchId, session]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const createClass = async (data: Partial<Class>) => {
    try {
      const { data: newClass, error } = await supabase
        .from('classes')
        .insert([{
          ...data,
          branch_id: branchId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchClasses();
      toast.success('Class created successfully!');
      return newClass;
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast.error(error.message || 'Failed to create class');
      return null;
    }
  };

  const updateClass = async (id: string, data: Partial<Class>) => {
    try {
      const { data: updatedClass, error } = await supabase
        .from('classes')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchClasses();
      toast.success('Class updated successfully!');
      return updatedClass;
    } catch (error: any) {
      console.error('Error updating class:', error);
      toast.error(error.message || 'Failed to update class');
      return null;
    }
  };

  const deleteClass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class? This will remove all associated data.')) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchClasses();
      toast.success('Class deleted successfully!');
      return true;
    } catch (error: any) {
      console.error('Error deleting class:', error);
      toast.error(error.message || 'Failed to delete class');
      return false;
    }
  };

  return {
    classes,
    loading,
    totalCount,
    stats,
    createClass,
    updateClass,
    deleteClass,
    refetch: fetchClasses
  };
};
