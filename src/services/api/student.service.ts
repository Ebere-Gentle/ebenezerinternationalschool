import { supabase } from '../../config/supabase/client';


const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/register-student';

export interface StudentRegistrationData {
  email: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  gender?: string;
  date_of_birth?: string;
  nationality?: string;
  phone_number?: string;
  home_address?: string;
  class_id?: string;
  admission_date?: string;
  branch_id: string;
  role?: string;
  [key: string]: any;
}

export interface StudentRegistrationResponse {
  success: boolean;
  message: string;
  data?: {
    auth_user_id: string;
    user_id: string;
    student_id: string;
    admission_number: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  };
  error?: string;
  details?: string;
}

export const studentService = {
  async registerStudent(data: StudentRegistrationData): Promise<StudentRegistrationResponse> {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Authentication required: ' + sessionError.message);
      }

      if (!sessionData?.session?.access_token) {
        throw new Error('No active session. Please login first.');
      }

      console.log('📤 Sending registration request to Edge Function...');

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          ...data,
          role: data.role || 'student',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Registration failed:', result);
        return {
          success: false,
          message: result.error || 'Registration failed',
          error: result.error,
          details: result.details,
        };
      }

      console.log('✅ Registration successful:', result);
      return result;

    } catch (error: any) {
      console.error('❌ Registration error:', error);
      return {
        success: false,
        message: error.message || 'Registration failed',
        error: error.message,
      };
    }
  },
};
