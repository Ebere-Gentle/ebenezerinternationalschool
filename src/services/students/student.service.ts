import { supabase } from '../../config/supabase/client';
import type { Student, StudentRegistrationData } from '../../types/student.types';

export const studentService = {
  // Get all students
  async getStudents(params?: { branch_id?: string; class_id?: string; status?: string }) {
    let query = supabase.from('students').select('*, branches(*), classes(*)');
    
    if (params?.branch_id) {
      query = query.eq('branch_id', params.branch_id);
    }
    if (params?.class_id) {
      query = query.eq('class_id', params.class_id);
    }
    if (params?.status) {
      query = query.eq('current_status', params.status);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Get student by ID
  async getStudentById(id: string) {
    const { data, error } = await supabase
      .from('students')
      .select('*, branches(*), classes(*), houses(*), clubs(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Create student
  async createStudent(studentData: StudentRegistrationData) {
    const { data, error } = await supabase
      .from('students')
      .insert({
        ...studentData,
        admission_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Update student
  async updateStudent(id: string, studentData: Partial<Student>) {
    const { data, error } = await supabase
      .from('students')
      .update({
        ...studentData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Delete student (soft delete)
  async deleteStudent(id: string) {
    const { error } = await supabase
      .from('students')
      .update({ current_status: 'inactive' })
      .eq('id', id);
    if (error) throw error;
  },

  // Search students
  async searchStudents(query: string) {
    const { data, error } = await supabase
      .from('students')
      .select('*, branches(*), classes(*)')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,admission_number.ilike.%${query}%,student_id.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20);
    if (error) throw error;
    return data;
  },

  // Get student payments
  async getStudentPayments(studentId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*, fees(*)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Get student by admission number
  async getStudentByAdmissionNumber(admissionNumber: string) {
    const { data, error } = await supabase
      .from('students')
      .select('*, branches(*), classes(*)')
      .eq('admission_number', admissionNumber)
      .single();
    if (error) throw error;
    return data;
  },
};

export default studentService;
