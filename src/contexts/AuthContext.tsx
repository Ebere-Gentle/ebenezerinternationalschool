import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase/client';
import type { User } from '../types/auth.types';
import authService from '../services/auth/auth.service';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!error && profile) {
            setUser(profile as User);
            setIsAuthenticated(true);
            localStorage.setItem('user', JSON.stringify(profile));
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user');
      } else if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!error && profile) {
          setUser(profile as User);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(profile));
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      const userData = response.user;
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
      toast.success('Logged out successfully');
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" text="Loading your profile..." />
      </div>
    );
  }

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
