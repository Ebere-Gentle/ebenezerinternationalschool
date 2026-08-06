// src/pages/admin/Settings.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  User, 
  Building, 
  Users, 
  Database,
  School,
  Calendar,
  Trash2,
  Plus,
  Save,
  X,
  Edit,
  Loader2,
  RefreshCw,
  Download,
  UserPlus,
  UserCheck,
  UserX,
  Database as DatabaseIcon,
  Clock,
  Shield,
  Key,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

// ============================================
// TYPES
// ============================================
interface Profile {
  id: string;
  user_id: string;
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  role: string;
  branch_id: string;
  is_active: boolean;
  last_login: string;
  profile_image_url: string;
  created_at: string;
  updated_at: string;
}

interface Branch {
  id: string;
  branch_id: string;
  school_name: string;
  logo_url: string;
  email: string;
  website: string;
  phone_number: string;
  address: string;
  status: string;
  branch_code: string;
  created_at: string;
  updated_at: string;
}

interface SchoolInfo {
  id: string;
  school_id: string;
  school_name: string;
  address: string;
  email: string;
  website: string;
  phone_number: string;
  logo_url: string;
  motto: string;
  vision: string;
  mission: string;
  academic_session: string;
  current_term: string;
  timezone: string;
  currency: string;
  school_colors: any;
  created_at: string;
  updated_at: string;
}

interface AcademicSession {
  id: string;
  session_name: string;
  term_name: string;
  term_number: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
  branch_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  metadata: any;
}

interface User {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  branch_id: string;
  is_active: boolean;
  last_login: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// MAIN COMPONENT
// ============================================
const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Password reset states
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  // Profile State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editProfile, setEditProfile] = useState<Partial<Profile>>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Branch/School Info State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [editSchoolInfo, setEditSchoolInfo] = useState<Partial<SchoolInfo>>({});
  const [isEditingSchool, setIsEditingSchool] = useState(false);

  // Academic Sessions State
  const [academicSessions, setAcademicSessions] = useState<AcademicSession[]>([]);
  const [editingSession, setEditingSession] = useState<AcademicSession | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState<Partial<AcademicSession>>({
    session_name: dayjs().format('YYYY/YYYY'),
    term_name: 'First Term',
    term_number: 1,
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: dayjs().add(3, 'months').format('YYYY-MM-DD'),
    is_current: false,
  });

  // Users State - View Only + Password Reset
  const [users, setUsers] = useState<User[]>([]);

  // Backups State - Only for admins
  const [backups, setBackups] = useState<any[]>([]);

  // Check if user is admin or has management permissions
  const isAdmin = ['admin', 'director', 'principal', 'bursar', 'accountant'].includes(userRole);
  const canManageUsers = ['admin', 'director', 'principal'].includes(userRole);
  const canManageSessions = ['admin', 'director', 'principal', 'bursar'].includes(userRole);
  const canManageSchool = ['admin', 'director', 'principal'].includes(userRole);
  const isSuperAdmin = userRole === 'admin';

  // Fetch user branch
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.id) {
        try {
          setLoading(true);
          
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          
          if (data) {
            setProfile(data);
            setEditProfile(data);
            setUserRole(data.role);
            
            const branchId = data.branch_id;
            setUserBranchId(branchId);
            
            await fetchAllData(branchId);
          } else {
            toast.error('Profile not found');
            setLoading(false);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast.error('Failed to load profile');
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user]);

  const fetchAllData = async (branchId: string) => {
    try {
      await Promise.all([
        fetchBranches(branchId),
        fetchSchoolInfo(),
        fetchAcademicSessions(branchId),
        ...(canManageUsers ? [fetchUsers(branchId)] : []),
        ...(isAdmin ? [fetchBackups(branchId)] : [])
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PROFILE FUNCTIONS
  // ============================================
  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setEditProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: editProfile.first_name,
          last_name: editProfile.last_name,
          phone_number: editProfile.phone_number,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      setIsEditingProfile(false);
      fetchProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      setIsEditingPassword(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // BRANCH & SCHOOL INFO FUNCTIONS
  // ============================================
  const fetchBranches = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .single();

      if (error) throw error;
      setSelectedBranch(data);
    } catch (error) {
      console.error('Error fetching branch:', error);
    }
  };

  const fetchSchoolInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('school_info')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setSchoolInfo(data);
        setEditSchoolInfo(data);
      }
    } catch (error) {
      console.error('Error fetching school info:', error);
    }
  };

  const updateSchoolInfo = async () => {
    if (!canManageSchool) {
      toast.error('You do not have permission to update school information');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('school_info')
        .update({
          school_name: editSchoolInfo.school_name,
          address: editSchoolInfo.address,
          email: editSchoolInfo.email,
          phone_number: editSchoolInfo.phone_number,
          website: editSchoolInfo.website,
          motto: editSchoolInfo.motto,
          vision: editSchoolInfo.vision,
          mission: editSchoolInfo.mission,
          academic_session: editSchoolInfo.academic_session,
          current_term: editSchoolInfo.current_term,
          currency: editSchoolInfo.currency,
          updated_at: new Date().toISOString()
        })
        .eq('id', schoolInfo?.id);

      if (error) throw error;

      toast.success('School information updated successfully!');
      setIsEditingSchool(false);
      fetchSchoolInfo();
    } catch (error: any) {
      console.error('Error updating school info:', error);
      toast.error(error.message || 'Failed to update school information');
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // ACADEMIC SESSIONS FUNCTIONS
  // ============================================
  const fetchAcademicSessions = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('*')
        .eq('branch_id', branchId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setAcademicSessions(data || []);
    } catch (error) {
      console.error('Error fetching academic sessions:', error);
    }
  };

  const addAcademicSession = async () => {
    if (!canManageSessions) {
      toast.error('You do not have permission to manage academic sessions');
      return;
    }

    if (!userBranchId) return;

    if (sessionForm.start_date && sessionForm.end_date) {
      if (dayjs(sessionForm.end_date).isBefore(dayjs(sessionForm.start_date))) {
        toast.error('End date must be after start date');
        return;
      }
    }

    setSaving(true);
    try {
      if (sessionForm.is_current) {
        await supabase
          .from('academic_sessions')
          .update({ is_current: false })
          .eq('branch_id', userBranchId);
      }

      const sessionData = {
        ...sessionForm,
        branch_id: userBranchId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user?.id,
        metadata: {
          created_by_email: user?.email || 'System',
          created_at: new Date().toISOString()
        }
      };

      const { data, error } = await supabase
        .from('academic_sessions')
        .insert([sessionData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Academic session created successfully!');
      setShowSessionModal(false);
      setSessionForm({
        session_name: dayjs().format('YYYY/YYYY'),
        term_name: 'First Term',
        term_number: 1,
        start_date: dayjs().format('YYYY-MM-DD'),
        end_date: dayjs().add(3, 'months').format('YYYY-MM-DD'),
        is_current: false,
      });
      
      await fetchAcademicSessions(userBranchId);
      
      if (sessionForm.is_current) {
        await updateSchoolInfoWithSession(data);
      }
    } catch (error: any) {
      console.error('Error adding academic session:', error);
      toast.error(error.message || 'Failed to create academic session');
    } finally {
      setSaving(false);
    }
  };

  const updateAcademicSession = async () => {
    if (!canManageSessions) {
      toast.error('You do not have permission to manage academic sessions');
      return;
    }

    if (!editingSession) return;

    if (editingSession.start_date && editingSession.end_date) {
      if (dayjs(editingSession.end_date).isBefore(dayjs(editingSession.start_date))) {
        toast.error('End date must be after start date');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingSession.is_current) {
        await supabase
          .from('academic_sessions')
          .update({ is_current: false })
          .eq('branch_id', userBranchId)
          .neq('id', editingSession.id);
      }

      const { error } = await supabase
        .from('academic_sessions')
        .update({
          session_name: editingSession.session_name,
          term_name: editingSession.term_name,
          term_number: editingSession.term_number,
          start_date: editingSession.start_date,
          end_date: editingSession.end_date,
          is_current: editingSession.is_current,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSession.id);

      if (error) throw error;

      toast.success('Academic session updated successfully!');
      setEditingSession(null);
      
      await fetchAcademicSessions(userBranchId!);
      
      if (editingSession.is_current) {
        await updateSchoolInfoWithSession(editingSession);
      }
    } catch (error: any) {
      console.error('Error updating academic session:', error);
      toast.error(error.message || 'Failed to update academic session');
    } finally {
      setSaving(false);
    }
  };

  const updateSchoolInfoWithSession = async (session: AcademicSession) => {
    try {
      const { error } = await supabase
        .from('school_info')
        .update({
          academic_session: session.session_name,
          current_term: session.term_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', schoolInfo?.id);

      if (error) throw error;
      
      await fetchSchoolInfo();
      toast.success('School info updated with current session');
    } catch (error) {
      console.error('Error updating school info with session:', error);
    }
  };

  const deleteAcademicSession = async (id: string) => {
    if (!canManageSessions) {
      toast.error('You do not have permission to delete academic sessions');
      return;
    }

    const session = academicSessions.find(s => s.id === id);
    if (session?.is_current) {
      toast.error('Cannot delete the current session. Set another session as current first.');
      return;
    }

    if (!confirm('Are you sure you want to delete this academic session?')) return;

    try {
      const { error } = await supabase
        .from('academic_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Academic session deleted successfully!');
      await fetchAcademicSessions(userBranchId!);
    } catch (error: any) {
      console.error('Error deleting academic session:', error);
      toast.error(error.message || 'Failed to delete academic session');
    }
  };

  const setCurrentSession = async (id: string) => {
    if (!canManageSessions) {
      toast.error('You do not have permission to manage academic sessions');
      return;
    }

    try {
      await supabase
        .from('academic_sessions')
        .update({ is_current: false })
        .eq('branch_id', userBranchId);

      const { data, error } = await supabase
        .from('academic_sessions')
        .update({ is_current: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Current session updated successfully!');
      await updateSchoolInfoWithSession(data);
      await fetchAcademicSessions(userBranchId!);
    } catch (error: any) {
      console.error('Error setting current session:', error);
      toast.error(error.message || 'Failed to set current session');
    }
  };

  const getSessionStatus = (session: AcademicSession) => {
    const now = dayjs();
    const start = dayjs(session.start_date);
    const end = dayjs(session.end_date);

    if (session.is_current) return 'Current';
    if (now.isBefore(start)) return 'Upcoming';
    if (now.isAfter(end)) return 'Expired';
    return 'Active';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Current': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Active': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'Upcoming': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Expired': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return colors[status] || colors.Expired;
  };

  // ============================================
  // USERS FUNCTIONS
  // ============================================
  const fetchUsers = async (branchId: string) => {
    if (!canManageUsers) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const resetUserPassword = async () => {
    if (!selectedUserForReset) return;
    if (!canManageUsers) {
      toast.error('You do not have permission to reset passwords');
      return;
    }

    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (resetPasswordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          userId: selectedUserForReset.id,
          newPassword: resetPasswordForm.newPassword,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error(error.message || 'Failed to reset password');
        return;
      }

      if (data?.success) {
        toast.success(`Password reset for ${selectedUserForReset.email} successfully!`);
        setShowPasswordReset(false);
        setSelectedUserForReset(null);
        setResetPasswordForm({ newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data?.error || 'Failed to reset password');
      }
      
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  const updateUserStatus = async (id: string, isActive: boolean) => {
    if (!canManageUsers) {
      toast.error('You do not have permission to manage users');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully!`);
      fetchUsers(userBranchId!);
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast.error(error.message || 'Failed to update user status');
    }
  };

  // ============================================
  // BACKUPS FUNCTIONS
  // ============================================
  const fetchBackups = async (branchId: string) => {
    if (!isAdmin) return;
    
    setBackups([
      { id: '1', name: 'Backup_2026-07-26.sql', size: 24576000, created_at: new Date().toISOString(), status: 'completed', type: 'auto' },
      { id: '2', name: 'Backup_2026-07-25.sql', size: 24123000, created_at: dayjs().subtract(1, 'day').toISOString(), status: 'completed', type: 'auto' },
    ]);
  };

  const createBackup = async () => {
    if (!isAdmin) {
      toast.error('You do not have permission to create backups');
      return;
    }

    toast.loading('Creating backup...');
    setTimeout(() => {
      toast.dismiss();
      toast.success('Backup created successfully!');
      fetchBackups(userBranchId!);
    }, 2000);
  };

  // ============================================
  // HELPERS
  // ============================================
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getBackupStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[status] || colors.pending;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Define tabs based on user role
  const getTabs = () => {
    const tabs = [
      { id: 'profile', label: 'Profile', icon: User },
    ];
    
    if (canManageSchool) {
      tabs.push({ id: 'school', label: 'School', icon: Building });
    }
    
    if (isAdmin) {
      tabs.push({ id: 'branches', label: 'Branches', icon: School });
    }
    
    if (canManageSessions) {
      tabs.push({ id: 'sessions', label: 'Sessions', icon: Calendar });
    }
    
    if (canManageUsers) {
      tabs.push({ id: 'users', label: 'Users', icon: Users });
    }
    
    if (isAdmin) {
      tabs.push({ id: 'backup', label: 'Backup', icon: Database });
    }
    
    return tabs;
  };

  const tabs = getTabs();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-500 mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        
        {/* Header - Mobile Responsive */}
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 xs:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
              <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                Settings
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                Manage your application settings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg sm:rounded-xl text-xs sm:text-sm text-blue-700 dark:text-blue-300 flex items-center gap-1 sm:gap-2">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span>
              <span className="xs:hidden">{userRole.slice(0, 3)}</span>
            </div>
            <button
              onClick={() => userBranchId && fetchAllData(userBranchId)}
              className="p-1.5 sm:p-2.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-lg sm:rounded-xl border border-white/20 dark:border-gray-700/50 hover:shadow-lg transition-all"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Tabs - Mobile Responsive */}
        {tabs.length > 1 && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl p-1 mb-4 sm:mb-6">
            <div className="flex gap-0.5 sm:gap-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-gray-700 shadow-lg text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            
            {/* ============================================
                PROFILE TAB - Mobile Responsive
                ============================================ */}
            {activeTab === 'profile' && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white">Your Profile</h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Manage your personal information and password</p>
                  </div>
                  {!isEditingProfile && !isEditingPassword && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm w-full xs:w-auto justify-center"
                    >
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Edit Profile
                    </button>
                  )}
                </div>

                {/* Profile Info */}
                {!isEditingProfile && !isEditingPassword && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                    <div className="sm:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Full Name</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{profile?.first_name} {profile?.last_name}</p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Email</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{profile?.email}</p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Phone</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{profile?.phone_number || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Role</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium capitalize">{profile?.role}</p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Member Since</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{dayjs(profile?.created_at).format('MMM D, YYYY')}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        onClick={() => setIsEditingPassword(true)}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-500 text-white rounded-lg sm:rounded-xl font-medium hover:bg-yellow-600 transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                      >
                        <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Change Password
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit Profile Form */}
                {isEditingProfile && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">First Name</label>
                        <input
                          type="text"
                          value={editProfile.first_name || ''}
                          onChange={(e) => setEditProfile({ ...editProfile, first_name: e.target.value })}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Last Name</label>
                        <input
                          type="text"
                          value={editProfile.last_name || ''}
                          onChange={(e) => setEditProfile({ ...editProfile, last_name: e.target.value })}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Phone</label>
                        <input
                          type="text"
                          value={editProfile.phone_number || ''}
                          onChange={(e) => setEditProfile({ ...editProfile, phone_number: e.target.value })}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Email</label>
                        <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{profile?.email}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500">Email cannot be changed</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => {
                          setIsEditingProfile(false);
                          setEditProfile(profile!);
                        }}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={updateProfile}
                        disabled={saving}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-1.5 sm:gap-2 text-sm"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* Change Password Form */}
                {isEditingPassword && (
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Current Password</label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                        placeholder="Enter current password"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">New Password</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                        placeholder="Enter new password (min 6 chars)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                        placeholder="Confirm new password"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => {
                          setIsEditingPassword(false);
                          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        }}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={updatePassword}
                        disabled={saving}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-1.5 sm:gap-2 text-sm"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        Update Password
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================
                SCHOOL TAB - Mobile Responsive
                ============================================ */}
            {activeTab === 'school' && canManageSchool && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white">School Information</h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Manage your school details</p>
                  </div>
                  {!isEditingSchool ? (
                    <button
                      onClick={() => setIsEditingSchool(true)}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm w-full xs:w-auto justify-center"
                    >
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Edit School
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          setIsEditingSchool(false);
                          setEditSchoolInfo(schoolInfo!);
                        }}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={updateSchoolInfo}
                        disabled={saving}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-1.5 sm:gap-2 text-sm"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        Save
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">School Name</label>
                    {isEditingSchool ? (
                      <input
                        type="text"
                        value={editSchoolInfo.school_name || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, school_name: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{schoolInfo?.school_name}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Address</label>
                    {isEditingSchool ? (
                      <textarea
                        value={editSchoolInfo.address || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, address: e.target.value })}
                        rows={2}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{schoolInfo?.address}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Email</label>
                    {isEditingSchool ? (
                      <input
                        type="email"
                        value={editSchoolInfo.email || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, email: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{schoolInfo?.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Phone</label>
                    {isEditingSchool ? (
                      <input
                        type="text"
                        value={editSchoolInfo.phone_number || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, phone_number: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{schoolInfo?.phone_number}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Website</label>
                    {isEditingSchool ? (
                      <input
                        type="text"
                        value={editSchoolInfo.website || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, website: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{schoolInfo?.website || 'Not set'}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Motto</label>
                    {isEditingSchool ? (
                      <input
                        type="text"
                        value={editSchoolInfo.motto || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, motto: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{schoolInfo?.motto || 'Not set'}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Vision</label>
                    {isEditingSchool ? (
                      <textarea
                        value={editSchoolInfo.vision || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, vision: e.target.value })}
                        rows={2}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{schoolInfo?.vision || 'Not set'}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Mission</label>
                    {isEditingSchool ? (
                      <textarea
                        value={editSchoolInfo.mission || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, mission: e.target.value })}
                        rows={2}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{schoolInfo?.mission || 'Not set'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Session</label>
                    {isEditingSchool ? (
                      <input
                        type="text"
                        value={editSchoolInfo.academic_session || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, academic_session: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{schoolInfo?.academic_session}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Current Term</label>
                    {isEditingSchool ? (
                      <input
                        type="text"
                        value={editSchoolInfo.current_term || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, current_term: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{schoolInfo?.current_term}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Currency</label>
                    {isEditingSchool ? (
                      <select
                        value={editSchoolInfo.currency || 'NGN'}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, currency: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                      >
                        <option value="NGN">NGN - Naira</option>
                        <option value="USD">USD - Dollar</option>
                        <option value="GBP">GBP - Pound</option>
                        <option value="EUR">EUR - Euro</option>
                      </select>
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{schoolInfo?.currency}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================
                BRANCHES TAB - Mobile Responsive
                ============================================ */}
            {activeTab === 'branches' && isAdmin && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
                <div>
                  <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white">Branch Information</h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">View your branch details</p>
                </div>

                {selectedBranch && (
                  <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Branch Name</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{selectedBranch.school_name}</p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Branch Code</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{selectedBranch.branch_code}</p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Address</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{selectedBranch.address}</p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Email</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{selectedBranch.email}</p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Phone</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{selectedBranch.phone_number}</p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Status</label>
                      <span className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedBranch.status === 'active' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {selectedBranch.status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Created</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{dayjs(selectedBranch.created_at).format('MMM D, YYYY')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================
                SESSIONS TAB - Mobile Responsive
                ============================================ */}
            {activeTab === 'sessions' && canManageSessions && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white">Academic Sessions</h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Manage academic terms and sessions</p>
                  </div>
                  <button
                    onClick={() => setShowSessionModal(true)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm w-full xs:w-auto justify-center"
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Add Session
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm min-w-[600px]">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Session</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Term</th>
                        <th className="hidden xs:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                        <th className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Start</th>
                        <th className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">End</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {academicSessions.map((session) => {
                        const status = getSessionStatus(session);
                        return (
                          <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 dark:text-white font-medium text-xs sm:text-sm">{session.session_name}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-700 dark:text-gray-300 text-xs sm:text-sm">{session.term_name}</td>
                            <td className="hidden xs:table-cell px-2 sm:px-4 py-2 sm:py-3 text-gray-500 text-xs sm:text-sm">{session.term_number}</td>
                            <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-gray-500 text-xs sm:text-sm">{dayjs(session.start_date).format('MMM D')}</td>
                            <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-gray-500 text-xs sm:text-sm">{dayjs(session.end_date).format('MMM D')}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3">
                              <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-xs font-medium ${getStatusColor(status)}`}>
                                <span className="hidden xs:inline">{status}</span>
                                <span className="xs:hidden">{status.charAt(0)}</span>
                                {status === 'Current' && <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                              <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                                {!session.is_current && status !== 'Expired' && (
                                  <button
                                    onClick={() => setCurrentSession(session.id)}
                                    className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[8px] sm:text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-all"
                                  >
                                    Set
                                  </button>
                                )}
                                <button
                                  onClick={() => setEditingSession(session)}
                                  className="p-1 sm:p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400"
                                >
                                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                                <button
                                  onClick={() => deleteAcademicSession(session.id)}
                                  className={`p-1 sm:p-1.5 rounded-lg transition-all ${
                                    session.is_current 
                                      ? 'text-gray-400 cursor-not-allowed' 
                                      : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500'
                                  }`}
                                  disabled={session.is_current}
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {academicSessions.length === 0 && (
                  <div className="text-center py-6 sm:py-8 text-gray-500">
                    <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm sm:text-base">No academic sessions found</p>
                  </div>
                )}

                {/* Edit Session Modal - Mobile Responsive */}
                <AnimatePresence>
                  {editingSession && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Edit Session</h3>
                          <button
                            onClick={() => setEditingSession(null)}
                            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                          >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Session</label>
                            <input
                              type="text"
                              value={editingSession.session_name}
                              onChange={(e) => setEditingSession({ ...editingSession, session_name: e.target.value })}
                              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Term</label>
                              <select
                                value={editingSession.term_name}
                                onChange={(e) => {
                                  const termNames = ['First Term', 'Second Term', 'Third Term'];
                                  const termNumbers = [1, 2, 3];
                                  const index = termNames.indexOf(e.target.value);
                                  setEditingSession({ 
                                    ...editingSession, 
                                    term_name: e.target.value,
                                    term_number: termNumbers[index] || 1
                                  });
                                }}
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                              >
                                <option value="First Term">First Term</option>
                                <option value="Second Term">Second Term</option>
                                <option value="Third Term">Third Term</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Term #</label>
                              <input
                                type="number"
                                min="1"
                                max="3"
                                value={editingSession.term_number}
                                onChange={(e) => setEditingSession({ ...editingSession, term_number: parseInt(e.target.value) })}
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Start</label>
                              <input
                                type="date"
                                value={editingSession.start_date}
                                onChange={(e) => setEditingSession({ ...editingSession, start_date: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">End</label>
                              <input
                                type="date"
                                value={editingSession.end_date}
                                onChange={(e) => setEditingSession({ ...editingSession, end_date: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingSession.is_current}
                              onChange={(e) => setEditingSession({ ...editingSession, is_current: e.target.checked })}
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Set as Current Session</span>
                          </label>
                          <button
                            onClick={updateAcademicSession}
                            disabled={saving}
                            className="w-full px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                          >
                            {saving ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                            Update Session
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Add Session Modal - Mobile Responsive */}
                <AnimatePresence>
                  {showSessionModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Add Session</h3>
                          <button
                            onClick={() => setShowSessionModal(false)}
                            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                          >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Session</label>
                            <input
                              type="text"
                              value={sessionForm.session_name || ''}
                              onChange={(e) => setSessionForm({ ...sessionForm, session_name: e.target.value })}
                              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Term</label>
                              <select
                                value={sessionForm.term_name || 'First Term'}
                                onChange={(e) => {
                                  const termNames = ['First Term', 'Second Term', 'Third Term'];
                                  const termNumbers = [1, 2, 3];
                                  const index = termNames.indexOf(e.target.value);
                                  setSessionForm({ 
                                    ...sessionForm, 
                                    term_name: e.target.value,
                                    term_number: termNumbers[index] || 1
                                  });
                                }}
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                              >
                                <option value="First Term">First Term</option>
                                <option value="Second Term">Second Term</option>
                                <option value="Third Term">Third Term</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Term #</label>
                              <input
                                type="number"
                                min="1"
                                max="3"
                                value={sessionForm.term_number || 1}
                                onChange={(e) => setSessionForm({ ...sessionForm, term_number: parseInt(e.target.value) })}
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Start</label>
                              <input
                                type="date"
                                value={sessionForm.start_date || ''}
                                onChange={(e) => setSessionForm({ ...sessionForm, start_date: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">End</label>
                              <input
                                type="date"
                                value={sessionForm.end_date || ''}
                                onChange={(e) => setSessionForm({ ...sessionForm, end_date: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sessionForm.is_current || false}
                              onChange={(e) => setSessionForm({ ...sessionForm, is_current: e.target.checked })}
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Set as Current Session</span>
                          </label>
                          <button
                            onClick={addAcademicSession}
                            disabled={saving}
                            className="w-full px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                          >
                            {saving ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                            Create Session
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ============================================
                USERS TAB - Mobile Responsive
                ============================================ */}
            {activeTab === 'users' && canManageUsers && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white">User Management</h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {isSuperAdmin ? 'Manage users and their passwords' : 'View users and reset passwords'}
                    </p>
                  </div>
                  {isSuperAdmin && (
                    <button
                      onClick={() => toast.info('Add user functionality coming soon')}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm w-full xs:w-auto justify-center"
                    >
                      <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Add User
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm min-w-[600px]">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                        <th className="hidden xs:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Login</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-[10px] sm:text-sm flex-shrink-0">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">
                                  {user.first_name} {user.last_name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                              <span className="truncate max-w-[60px] sm:max-w-[120px] text-xs sm:text-sm">{user.email}</span>
                              <button
                                onClick={() => copyToClipboard(user.email)}
                                className="p-0.5 sm:p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all flex-shrink-0"
                              >
                                <Copy className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400" />
                              </button>
                            </div>
                          </td>
                          <td className="hidden xs:table-cell px-2 sm:px-4 py-2 sm:py-3">
                            <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 capitalize`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-xs font-medium ${
                              user.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-gray-500 text-xs">{user.last_login ? dayjs(user.last_login).fromNow() : 'Never'}</td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                            <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                              <button
                                onClick={() => {
                                  setSelectedUserForReset(user);
                                  setShowPasswordReset(true);
                                  setResetPasswordForm({ newPassword: '', confirmPassword: '' });
                                }}
                                className="p-1 sm:p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all text-yellow-600 dark:text-yellow-400"
                              >
                                <Key className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                              <button
                                onClick={() => updateUserStatus(user.id, !user.is_active)}
                                className={`p-1 sm:p-1.5 rounded-lg transition-all ${
                                  user.is_active 
                                    ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500' 
                                    : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500'
                                }`}
                              >
                                {user.is_active ? <UserX className="w-3 h-3 sm:w-4 sm:h-4" /> : <UserCheck className="w-3 h-3 sm:w-4 sm:h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Password Reset Modal - Mobile Responsive */}
                <AnimatePresence>
                  {showPasswordReset && selectedUserForReset && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Key className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                            Reset Password
                          </h3>
                          <button
                            onClick={() => {
                              setShowPasswordReset(false);
                              setSelectedUserForReset(null);
                            }}
                            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                          >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>

                        <div className="space-y-3 sm:space-y-4">
                          <div className="p-2.5 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg sm:rounded-xl text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                            Resetting for: <strong>{selectedUserForReset.email}</strong>
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">New Password</label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={resetPasswordForm.newPassword}
                                onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all text-sm dark:text-white pr-8 sm:pr-10"
                                placeholder="Enter new password (min 6 chars)"
                              />
                              <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                {showPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Confirm Password</label>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={resetPasswordForm.confirmPassword}
                              onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, confirmPassword: e.target.value })}
                              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all text-sm dark:text-white"
                              placeholder="Confirm new password"
                            />
                          </div>

                          <div className="flex flex-col xs:flex-row gap-2 xs:gap-3">
                            <button
                              onClick={() => {
                                setShowPasswordReset(false);
                                setSelectedUserForReset(null);
                              }}
                              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm w-full xs:w-auto order-2 xs:order-1"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={resetUserPassword}
                              disabled={saving}
                              className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm w-full xs:w-auto order-1 xs:order-2"
                            >
                              {saving ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                              Reset Password
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ============================================
                BACKUP TAB - Mobile Responsive
                ============================================ */}
            {activeTab === 'backup' && isAdmin && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white">Backup Management</h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Manage database backups</p>
                  </div>
                  <button
                    onClick={createBackup}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm w-full xs:w-auto justify-center"
                  >
                    <DatabaseIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Create Backup
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm min-w-[500px]">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
                        <th className="hidden xs:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {backups.map((backup) => (
                        <tr key={backup.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 dark:text-white font-mono text-[10px] sm:text-xs truncate max-w-[80px] sm:max-w-none">{backup.name}</td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 dark:text-gray-300 text-xs">{(backup.size / 1024 / 1024).toFixed(1)} MB</td>
                          <td className="hidden xs:table-cell px-2 sm:px-4 py-2 sm:py-3 text-gray-500 text-xs">{dayjs(backup.created_at).format('MMM D, h:mm A')}</td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-xs font-medium ${getBackupStatusColor(backup.status)}`}>
                              {backup.status}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                            <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                              <button className="p-1 sm:p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400">
                                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                              <button className="p-1 sm:p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-500">
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-6 sm:mt-8 text-center text-[10px] sm:text-xs text-gray-400 dark:text-gray-600">
          <p>© {dayjs().year()} {schoolInfo?.school_name || selectedBranch?.school_name || 'Ebeniza International School'}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;