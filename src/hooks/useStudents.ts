import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '../services/students/student.service';
import type { StudentRegistrationData } from '../types/student.types';
import toast from 'react-hot-toast';

export const useStudents = (params?: { branch_id?: string; class_id?: string; status?: string }) => {
  return useQuery({
    queryKey: ['students', params],
    queryFn: () => studentService.getStudents(params),
  });
};

export const useStudent = (id: string) => {
  return useQuery({
    queryKey: ['student', id],
    queryFn: () => studentService.getStudentById(id),
    enabled: !!id,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: StudentRegistrationData) => studentService.createStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student registered successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to register student');
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      studentService.updateStudent(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
      toast.success('Student updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update student');
    },
  });
};

export const useSearchStudents = () => {
  return useMutation({
    mutationFn: (query: string) => studentService.searchStudents(query),
  });
};
