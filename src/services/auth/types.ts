export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  branch_id?: string;
}

export interface AuthResponse {
  user: any;
  session: any;
  profile?: any;
}
