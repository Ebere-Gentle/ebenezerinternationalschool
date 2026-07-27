import type { User, LoginCredentials, AuthResponse } from '../../types/auth.types';
import { supabase } from '../../config/supabase/client';


class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Step 1: Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from authentication');

      // Step 2: Fetch user profile from your users table
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('User profile not found');
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authData.user.id);

      return {
        user: profile as User,
        token: authData.session?.access_token,
      };
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      // Step 1: Get authenticated user from Supabase
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) return null;

      // Step 2: Fetch user profile from your users table
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return null;
      }

      return profile as User;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Add the missing method that AuthContext is trying to call
  async getUserProfile(userId: string): Promise<User | null> {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Get user profile error:', error);
        return null;
      }

      return profile as User;
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const { data: updatedProfile, error } = await supabase
        .from('users')
        .update(data)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;

      return updatedProfile as User;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  async changePassword(newPassword: string): Promise<void> {
    try {
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Update last login error:', error);
    }
  }
}

export default AuthService.getInstance();
