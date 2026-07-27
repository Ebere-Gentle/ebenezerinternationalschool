import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { type User, type AuthState, ROLE_MAP } from '../types/auth.types';
import authService from '../services/auth/auth.service';

export const useAuth = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check user session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          // Update last login
          await authService.updateLastLogin(user.id);
          
          setState({
            user,
            isLoading: false,
            isAuthenticated: true,
          });
          
          // Store user in localStorage for quick access
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('userRole', user.role);
        } else {
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setState({ ...state, isLoading: true });

    try {
      const response = await authService.login({ email, password });
      const { user, token } = response;

      // Store auth data
      if (token) {
        localStorage.setItem('auth_token', token);
      }
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userRole', user.role);

      // Update last login
      await authService.updateLastLogin(user.id);

      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });

      toast.success(`Welcome back, ${user.first_name}!`);
      return user;
    } catch (error: any) {
      setState({ ...state, isLoading: false });
      const message = error?.message || 'Invalid email or password';
      toast.error(message);
      throw error;
    }
  }, [state]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear all auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      toast.success('Logged out successfully');
      navigate('/');
    }
  }, [navigate]);

  const getUserRole = useCallback((): string | null => {
    return localStorage.getItem('userRole');
  }, []);

  const getRedirectPath = useCallback((role: string): string => {
    return ROLE_MAP[role as keyof typeof ROLE_MAP] || '/dashboard';
  }, []);

  return {
    ...state,
    login,
    logout,
    getUserRole,
    getRedirectPath,
  };
};

export default useAuth;
