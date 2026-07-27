export interface Class {
  id: string;
  name: string;
  code: string;
  level: string;
  class_teacher_id: string | null;
  class_teacher_name?: string;
  branch_id: string;
  academic_session: string;
  status: string;
  capacity: number;
  students_count?: number;
  subjects_count?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface Subject {
  id: string;
  subject_id: string;
  branch_id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface Teacher {
  id: string;
  teacher_id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string | null;
  phone_number: string;
  department: string;
  position: string;
  specialization: string | null;
  is_class_teacher: boolean;
  status: string;
  branch_id: string;
}

export interface TeacherSubject {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string | null;
  academic_session: string;
  created_at: string;
  teacher_name?: string;
  subject_name?: string;
  class_name?: string;
}

export interface StudentClass {
  id: string;
  student_id: string;
  class_id: string;
  academic_session: string;
  term: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  created_at: string;
  student_name?: string;
  student_admission?: string;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  admission_number: string;
  student_id: string;
  gender: string;
  date_of_birth: string;
  email: string;
  phone_number: string;
  passport_url: string | null;
  current_status: string;
  class_name?: string;
}

export interface Term {
  id: string;
  branch_id: string;
  session: string;
  term: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_closed: boolean;
  closing_balance: number;
}

export interface ClassStats {
  totalStudents: number;
  totalSubjects: number;
  totalTeachers: number;
  completionRate: number;
}
