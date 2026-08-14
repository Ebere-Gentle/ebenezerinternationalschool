import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { type User, type AuthState, ROLE_MAP } from '../types/auth.types';
import authService from '../services/auth/auth.service';
import { supabase } from '../config/supabase/client';

const USER_STORAGE_KEY = 'user';
const ROLE_STORAGE_KEY = 'userRole';
const TOKEN_STORAGE_KEY = 'auth_token';

export const useAuth = () => {
  const navigate = useNavigate();

  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // ============================================================
  // ACTIVITY LOG HELPER
  // ============================================================

  const logActivity = useCallback(
    async (
      action: string,
      resourceType: string = 'authentication',
      resourceId: string | null = null,
      resourceName: string | null = null,
      changes: Record<string, any> = {}
    ) => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        const userId = authUser?.id || null;

        // Get user's branch if available
        let branchId: string | null = null;

        if (userId) {
          const { data: profile } = await supabase
            .from('users')
            .select('branch_id')
            .eq('id', userId)
            .maybeSingle();

          branchId = profile?.branch_id || null;
        }

        // Get browser information
        const userAgent =
          typeof navigator !== 'undefined'
            ? navigator.userAgent
            : null;

        // IP lookup is best-effort only
        let ipAddress: string | null = null;

        try {
          const response = await fetch(
            'https://api.ipify.org?format=json'
          );

          if (response.ok) {
            const data = await response.json();
            ipAddress = data?.ip || null;
          }
        } catch {
          // Do not allow IP lookup failure to break login/logout
        }

        await supabase.rpc('log_activity', {
          p_user_id: userId,
          p_action: action,
          p_resource_type: resourceType,
          p_resource_id: resourceId,
          p_resource_name: resourceName,
          p_changes: changes,
          p_ip_address: ipAddress,
          p_user_agent: userAgent,
          p_branch_id: branchId,
        });
      } catch (error) {
        // Activity logging must NEVER prevent authentication.
        console.error('Activity log error:', error);
      }
    },
    []
  );

  // ============================================================
  // SAVE USER LOCALLY
  // ============================================================

  const persistUser = useCallback((user: User, token?: string | null) => {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(ROLE_STORAGE_KEY, user.role);

      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      }
    } catch (error) {
      console.error('Failed to persist authentication data:', error);
    }
  }, []);

  // ============================================================
  // CLEAR LOCAL AUTH
  // ============================================================

  const clearStoredAuth = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(ROLE_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear authentication data:', error);
    }
  }, []);

  // ============================================================
  // CHECK CURRENT SESSION
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        setState((previous) => ({
          ...previous,
          isLoading: true,
        }));

        const user = await authService.getCurrentUser();

        if (!mounted) return;

        if (user) {
          try {
            await authService.updateLastLogin(user.id);
          } catch (error) {
            console.error('Failed to update last login:', error);
          }

          persistUser(user);

          setState({
            user,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          clearStoredAuth();

          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } catch (error) {
        console.error('Auth check error:', error);

        if (!mounted) return;

        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    checkAuth();

    // ============================================================
    // SUPABASE AUTH STATE LISTENER
    // ============================================================

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        // SIGNED OUT
        if (event === 'SIGNED_OUT' || !session) {
          clearStoredAuth();

          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });

          return;
        }

        // PASSWORD RECOVERY
        if (event === 'PASSWORD_RECOVERY') {
          return;
        }

        // TOKEN REFRESH
        if (event === 'TOKEN_REFRESHED') {
          if (session.access_token) {
            localStorage.setItem(
              TOKEN_STORAGE_KEY,
              session.access_token
            );
          }

          return;
        }

        // SIGNED IN
        if (event === 'SIGNED_IN' && session.user) {
          const user = await authService.getCurrentUser();

          if (!mounted || !user) return;

          persistUser(user, session.access_token);

          setState({
            user,
            isLoading: false,
            isAuthenticated: true,
          });
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [clearStoredAuth, persistUser]);

  // ============================================================
  // LOGIN
  // ============================================================

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      setState((previous) => ({
        ...previous,
        isLoading: true,
      }));

      try {
        const cleanEmail = email.trim().toLowerCase();

        const response = await authService.login({
          email: cleanEmail,
          password,
        });

        const { user, token } = response;

        if (!user) {
          throw new Error('Unable to load user profile.');
        }

        // Save authentication data
        persistUser(user, token);

        // Update last login
        try {
          await authService.updateLastLogin(user.id);
        } catch (error) {
          console.error('Failed to update last login:', error);
        }

        // ========================================================
        // ACTIVITY LOG
        // ========================================================

        await logActivity(
          'LOGIN',
          'authentication',
          user.id,
          `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
            user.email,
          {
            email: user.email,
            role: user.role,
            login_time: new Date().toISOString(),
          }
        );

        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });

        return user;
      } catch (error: any) {
        console.error('Login error:', error);

        setState((previous) => ({
          ...previous,
          isLoading: false,
        }));

        throw error;
      }
    },
    [logActivity, persistUser]
  );

  // ============================================================
  // LOGOUT
  // ============================================================

  const logout = useCallback(async () => {
    const currentUser = state.user;

    try {
      // Log BEFORE signing out because after logout
      // Supabase may no longer know the current user.
      if (currentUser) {
        await logActivity(
          'LOGOUT',
          'authentication',
          currentUser.id,
          `${currentUser.first_name || ''} ${
            currentUser.last_name || ''
          }`.trim() || currentUser.email,
          {
            email: currentUser.email,
            role: currentUser.role,
            logout_time: new Date().toISOString(),
          }
        );
      }

      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearStoredAuth();

      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      toast.success('Logged out successfully');

      navigate('/');
    }
  }, [clearStoredAuth, logActivity, navigate, state.user]);

  // ============================================================
  // GET USER ROLE
  // ============================================================

  const getUserRole = useCallback((): string | null => {
    return localStorage.getItem(ROLE_STORAGE_KEY);
  }, []);

  // ============================================================
  // REDIRECT PATH
  // ============================================================

  const getRedirectPath = useCallback((role: string): string => {
    return (
      ROLE_MAP[role as keyof typeof ROLE_MAP] ||
      '/dashboard'
    );
  }, []);

  // ============================================================
  // CURRENT USER
  // ============================================================

  const getCurrentUser = useCallback((): User | null => {
    if (state.user) {
      return state.user;
    }

    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);

      if (!storedUser) {
        return null;
      }

      return JSON.parse(storedUser) as User;
    } catch {
      return null;
    }
  }, [state.user]);

  // ============================================================
  // RETURN
  // ============================================================

  return {
    ...state,

    login,
    logout,

    getUserRole,
    getRedirectPath,
    getCurrentUser,

    logActivity,
  };
};

export default useAuth;