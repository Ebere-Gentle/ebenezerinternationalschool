import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase/client';
import type { Student, StudentClass } from '../types';
import toast from 'react-hot-toast';

export const useStudents = (branchId: string | null, classId: string | null, session: string, term: string) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentClasses, setStudentClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    if (!branchId || !classId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get students in this class
      const { data: scData, error: scError } = await supabase
        .from('student_classes')
        .select(`
          *,
          students!student_classes_student_id_fkey (
            id,
            first_name,
            last_name,
            middle_name,
            admission_number,
            student_id,
            gender,
            date_of_birth,
            email,
            phone_number,
            passport_url,
            current_status
          )
        `)
        .eq('class_id', classId)
        .eq('academic_session', session)
        .eq('term', term)
        .eq('is_current', true);

      if (scError) throw scError;

      const studentsData = scData?.map(sc => ({
        ...sc.students,
        class_name: 'Current Class'
      })) || [];

      setStudentClasses(scData || []);
      setStudents(studentsData);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast.error(error.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  }, [branchId, classId, session, term]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const addStudentToClass = async (studentId: string) => {
    if (!classId) return null;

    try {
      const { data, error } = await supabase
        .from('student_classes')
        .insert([{
          student_id: studentId,
          class_id: classId,
          academic_session: session,
          term: term,
          start_date: new Date().toISOString(),
          is_current: true,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchStudents();
      toast.success('Student added to class successfully!');
      return data;
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error.message || 'Failed to add student');
      return null;
    }
  };

  const removeStudentFromClass = async (studentClassId: string) => {
    try {
      const { error } = await supabase
        .from('student_classes')
        .delete()
        .eq('id', studentClassId);

      if (error) throw error;
      await fetchStudents();
      toast.success('Student removed from class');
      return true;
    } catch (error: any) {
      console.error('Error removing student:', error);
      toast.error(error.message || 'Failed to remove student');
      return false;
    }
  };

  const getAvailableStudents = async () => {
    if (!branchId) return [];

    try {
      // Get students not in this class
      const { data: enrolledStudents } = await supabase
        .from('student_classes')
        .select('student_id')
        .eq('class_id', classId)
        .eq('academic_session', session)
        .eq('term', term)
        .eq('is_current', true);

      const enrolledIds = enrolledStudents?.map(s => s.student_id) || [];

      let query = supabase
        .from('students')
        .select('*')
        .eq('branch_id', branchId)
        .eq('current_status', 'active');

      if (enrolledIds.length > 0) {
        query = query.not('id', 'in', `(${enrolledIds.join(',')})`);
      }

      const { data, error } = await query.order('first_name');

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching available students:', error);
      return [];
    }
  };

  return {
    students,
    studentClasses,
    loading,
    addStudentToClass,
    removeStudentFromClass,
    getAvailableStudents,
    refetch: fetchStudents
  };
};
