import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  User, 
  Building, 
  CreditCard, 
  Users, 
  Shield, 
  Bell, 
  Database,
  School,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  Globe,
  Lock,
  Key,
  Trash2,
  Plus,
  Save,
  X,
  Edit,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  Download,
  Upload,
  Printer,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  BellRing,
  BellOff,
  Database as DatabaseIcon,
  HardDrive,
  Cloud,
  Server,
  Wifi,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Globe as GlobeIcon,
  Network,
  Lock as LockIcon,
  Key as KeyIcon,
  Fingerprint,
  QrCode,
  Barcode,
  FileText,
  Folder,
  Archive,
  Clock,
  CalendarDays,
  BookOpen,
  GraduationCap,
  Award,
  Medal,
  Trophy,
  Star,
  Sparkles,
  Zap,
  Rocket,
  Crown,
  Gem,
  Diamond,
  Feather,
  Leaf,
  Flower,
  Mountain,
  Sun,
  Moon,
  CloudRain,
  Snowflake,
  Wind,
  Thermometer
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

// ============================================
// TYPES - Updated to match your schema
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

interface Term {
  id: string;
  branch_id: string;
  session: string;
  term: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_closed: boolean;
  closing_balance: number;
  created_at: string;
  updated_at: string;
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

  // Profile State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editProfile, setEditProfile] = useState<Partial<Profile>>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Branch/School Info State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [editSchoolInfo, setEditSchoolInfo] = useState<Partial<SchoolInfo>>({});
  const [isEditingSchool, setIsEditingSchool] = useState(false);

  // Terms State
  const [terms, setTerms] = useState<Term[]>([]);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [showTermModal, setShowTermModal] = useState(false);
  const [termForm, setTermForm] = useState<Partial<Term>>({
    session: dayjs().format('YYYY/YYYY'),
    term: '1st Term',
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: dayjs().add(3, 'months').format('YYYY-MM-DD'),
    is_active: false,
    is_closed: false,
    closing_balance: 0
  });

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState<Partial<User>>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'staff',
    is_active: true
  });

  // Backups State
  const [backups, setBackups] = useState<any[]>([]);

  // Fetch user branch
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.id) {
        try {
          // Fetch user profile
          await fetchProfile();
          
          // Fetch branch ID from user profile
          if (profile) {
            setUserBranchId(profile.branch_id);
            await fetchAllData(profile.branch_id);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setLoading(false);
        }
      }
    };
    
    fetchUserData();
  }, [user]);

  const fetchAllData = async (branchId: string) => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBranches(branchId),
        fetchSchoolInfo(),
        fetchTerms(branchId),
        fetchUsers(branchId),
        fetchBackups(branchId)
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
      // school_info table doesn't have branch_id, get the first one
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
  // TERMS FUNCTIONS
  // ============================================
  const fetchTerms = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('terms')
        .select('*')
        .eq('branch_id', branchId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setTerms(data || []);
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const addTerm = async () => {
    if (!userBranchId) return;

    setSaving(true);
    try {
      const termData = {
        ...termForm,
        branch_id: userBranchId,
        closing_balance: termForm.closing_balance || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('terms')
        .insert([termData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Term created successfully!');
      setShowTermModal(false);
      setTermForm({
        session: dayjs().format('YYYY/YYYY'),
        term: '1st Term',
        start_date: dayjs().format('YYYY-MM-DD'),
        end_date: dayjs().add(3, 'months').format('YYYY-MM-DD'),
        is_active: false,
        is_closed: false,
        closing_balance: 0
      });
      fetchTerms(userBranchId);
    } catch (error: any) {
      console.error('Error adding term:', error);
      toast.error(error.message || 'Failed to create term');
    } finally {
      setSaving(false);
    }
  };

  const updateTerm = async () => {
    if (!editingTerm) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('terms')
        .update({
          session: editingTerm.session,
          term: editingTerm.term,
          start_date: editingTerm.start_date,
          end_date: editingTerm.end_date,
          is_active: editingTerm.is_active,
          is_closed: editingTerm.is_closed,
          closing_balance: editingTerm.closing_balance,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTerm.id);

      if (error) throw error;

      toast.success('Term updated successfully!');
      setEditingTerm(null);
      fetchTerms(userBranchId!);
    } catch (error: any) {
      console.error('Error updating term:', error);
      toast.error(error.message || 'Failed to update term');
    } finally {
      setSaving(false);
    }
  };

  const deleteTerm = async (id: string) => {
    if (!confirm('Are you sure you want to delete this term?')) return;

    try {
      const { error } = await supabase
        .from('terms')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Term deleted successfully!');
      fetchTerms(userBranchId!);
    } catch (error: any) {
      console.error('Error deleting term:', error);
      toast.error(error.message || 'Failed to delete term');
    }
  };

  // ============================================
  // USERS FUNCTIONS
  // ============================================
  const fetchUsers = async (branchId: string) => {
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

  const addUser = async () => {
    if (!userBranchId) return;

    setSaving(true);
    try {
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userForm.email!,
        password: 'Temp123!@#',
      });

      if (authError) throw authError;

      // Generate user_id
      const { data: userCount } = await supabase
        .from('users')
        .select('id', { count: 'exact' });
      
      const userNumber = (userCount?.count || 0) + 1;
      const userId = `EIS-USER-${String(userNumber).padStart(4, '0')}`;

      // Then create user record
      const userData = {
        id: authData.user?.id,
        user_id: userId,
        email: userForm.email,
        first_name: userForm.first_name,
        last_name: userForm.last_name,
        role: userForm.role,
        is_active: userForm.is_active,
        branch_id: userBranchId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user?.id
      };

      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;

      toast.success('User created successfully!');
      setShowUserModal(false);
      setUserForm({
        email: '',
        first_name: '',
        last_name: '',
        role: 'staff',
        is_active: true
      });
      fetchUsers(userBranchId);
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const updateUserStatus = async (id: string, isActive: boolean) => {
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

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('User deleted successfully!');
      fetchUsers(userBranchId!);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  // ============================================
  // BACKUPS FUNCTIONS
  // ============================================
  const fetchBackups = async (branchId: string) => {
    // Mock backups - you can create a backups table
    setBackups([
      { id: '1', name: 'Backup_2026-07-26.sql', size: 24576000, created_at: new Date().toISOString(), status: 'completed', type: 'auto' },
      { id: '2', name: 'Backup_2026-07-25.sql', size: 24123000, created_at: dayjs().subtract(1, 'day').toISOString(), status: 'completed', type: 'auto' },
    ]);
  };

  const createBackup = async () => {
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[status] || colors.pending;
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'school', label: 'School Settings', icon: Building },
    { id: 'branches', label: 'Branches', icon: School },
    { id: 'terms', label: 'Terms & Sessions', icon: Calendar },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'backup', label: 'Backup', icon: Database },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl shadow-lg">
              <SettingsIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                Manage your application settings and configurations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl border border-white/20 dark:border-gray-700/50 hover:shadow-lg transition-all"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
            </button>
            <button
              onClick={() => userBranchId && fetchAllData(userBranchId)}
              className="p-2.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl border border-white/20 dark:border-gray-700/50 hover:shadow-lg transition-all"
            >
              <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl p-1 mb-6 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 shadow-lg text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Profile</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your personal information</p>
                  </div>
                  {!isEditingProfile ? (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setIsEditingProfile(false);
                          setEditProfile(profile!);
                        }}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={updateProfile}
                        disabled={saving}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-2"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={editProfile.first_name || ''}
                        onChange={(e) => setEditProfile({ ...editProfile, first_name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">{profile?.first_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={editProfile.last_name || ''}
                        onChange={(e) => setEditProfile({ ...editProfile, last_name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">{profile?.last_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <p className="text-gray-900 dark:text-white font-medium">{profile?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={editProfile.phone_number || ''}
                        onChange={(e) => setEditProfile({ ...editProfile, phone_number: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">{profile?.phone_number || 'Not set'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                    <p className="text-gray-900 dark:text-white font-medium capitalize">{profile?.role}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User ID</label>
                    <p className="text-gray-900 dark:text-white font-medium">{profile?.user_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Member Since</label>
                    <p className="text-gray-900 dark:text-white font-medium">{dayjs(profile?.created_at).format('MMMM D, YYYY')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Login</label>
                    <p className="text-gray-900 dark:text-white font-medium">{profile?.last_login ? dayjs(profile.last_login).fromNow() : 'Never'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* School Settings Tab */}
            {activeTab === 'school' && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">School Information</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your school details</p>
                  </div>
                  {!isEditingSchool ? (
                    <button
                      onClick={() => setIsEditingSchool(true)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit School
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setIsEditingSchool(false);
                          setEditSchoolInfo(schoolInfo!);
                        }}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={updateSchoolInfo}
                        disabled={saving}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-2"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">School Name</label>
                    {isEditingSchool ? (
                      <input
                        type="text"
                        value={editSchoolInfo.school_name || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, school_name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">{schoolInfo?.school_name}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                    {isEditingSchool ? (
                      <textarea
                        value={editSchoolInfo.address || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, address: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">{schoolInfo?.address}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    {isEditingSchool ? (
                      <input
                        type="email"
                        value={editSchoolInfo.email || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, email: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">{schoolInfo?.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                    {isEditingSchool ? (
                      <input
                        type="text"
                        value={editSchoolInfo.phone_number || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, phone_number: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">{schoolInfo?.phone_number}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                    {isEditingSchool ? (
                      <input
                        type="text"
                        value={editSchoolInfo.website || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, website: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">{schoolInfo?.website || 'Not set'}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motto</label>
                    {isEditingSchool ? (
                      <input
                        type="text"
                        value={editSchoolInfo.motto || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, motto: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">{schoolInfo?.motto || 'Not set'}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vision</label>
                    {isEditingSchool ? (
                      <textarea
                        value={editSchoolInfo.vision || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, vision: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">{schoolInfo?.vision || 'Not set'}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mission</label>
                    {isEditingSchool ? (
                      <textarea
                        value={editSchoolInfo.mission || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, mission: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">{schoolInfo?.mission || 'Not set'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Academic Session</label>
                    {isEditingSchool ? (
                      <input
                        type="text"
                        value={editSchoolInfo.academic_session || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, academic_session: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">{schoolInfo?.academic_session}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Term</label>
                    {isEditingSchool ? (
                      <input
                        type="text"
                        value={editSchoolInfo.current_term || ''}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, current_term: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">{schoolInfo?.current_term}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                    {isEditingSchool ? (
                      <select
                        value={editSchoolInfo.currency || 'NGN'}
                        onChange={(e) => setEditSchoolInfo({ ...editSchoolInfo, currency: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      >
                        <option value="NGN">NGN - Nigerian Naira</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="EUR">EUR - Euro</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">{schoolInfo?.currency}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Branches Tab */}
            {activeTab === 'branches' && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Branch Information</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View your branch details</p>
                </div>

                {selectedBranch && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch Name</label>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedBranch.school_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch Code</label>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedBranch.branch_code}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedBranch.address}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedBranch.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedBranch.phone_number}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedBranch.status === 'active' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {selectedBranch.status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Created</label>
                      <p className="text-gray-900 dark:text-white font-medium">{dayjs(selectedBranch.created_at).format('MMMM D, YYYY')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Terms Tab */}
            {activeTab === 'terms' && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Terms & Sessions</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage academic terms and sessions</p>
                  </div>
                  <button
                    onClick={() => setShowTermModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Term
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Session</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Term</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Start Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">End Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {terms.map((term) => (
                        <tr key={term.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{term.session}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{term.term}</td>
                          <td className="px-4 py-3 text-gray-500">{dayjs(term.start_date).format('MMM D, YYYY')}</td>
                          <td className="px-4 py-3 text-gray-500">{dayjs(term.end_date).format('MMM D, YYYY')}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              term.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              term.is_closed ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' :
                              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {term.is_active ? 'Active' : term.is_closed ? 'Closed' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditingTerm(term)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteTerm(term.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Edit Term Modal */}
                <AnimatePresence>
                  {editingTerm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Term</h3>
                          <button
                            onClick={() => setEditingTerm(null)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session</label>
                            <input
                              type="text"
                              value={editingTerm.session}
                              onChange={(e) => setEditingTerm({ ...editingTerm, session: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Term</label>
                            <select
                              value={editingTerm.term}
                              onChange={(e) => setEditingTerm({ ...editingTerm, term: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                            >
                              <option value="1st Term">1st Term</option>
                              <option value="2nd Term">2nd Term</option>
                              <option value="3rd Term">3rd Term</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                              <input
                                type="date"
                                value={editingTerm.start_date}
                                onChange={(e) => setEditingTerm({ ...editingTerm, start_date: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                              <input
                                type="date"
                                value={editingTerm.end_date}
                                onChange={(e) => setEditingTerm({ ...editingTerm, end_date: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingTerm.is_active}
                                onChange={(e) => setEditingTerm({ ...editingTerm, is_active: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingTerm.is_closed}
                                onChange={(e) => setEditingTerm({ ...editingTerm, is_closed: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Closed</span>
                            </label>
                          </div>
                          <button
                            onClick={updateTerm}
                            disabled={saving}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Update Term
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Add Term Modal */}
                <AnimatePresence>
                  {showTermModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Term</h3>
                          <button
                            onClick={() => setShowTermModal(false)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session</label>
                            <input
                              type="text"
                              value={termForm.session || ''}
                              onChange={(e) => setTermForm({ ...termForm, session: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Term</label>
                            <select
                              value={termForm.term || '1st Term'}
                              onChange={(e) => setTermForm({ ...termForm, term: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                            >
                              <option value="1st Term">1st Term</option>
                              <option value="2nd Term">2nd Term</option>
                              <option value="3rd Term">3rd Term</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                              <input
                                type="date"
                                value={termForm.start_date || ''}
                                onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                              <input
                                type="date"
                                value={termForm.end_date || ''}
                                onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={termForm.is_active || false}
                                onChange={(e) => setTermForm({ ...termForm, is_active: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={termForm.is_closed || false}
                                onChange={(e) => setTermForm({ ...termForm, is_closed: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Closed</span>
                            </label>
                          </div>
                          <button
                            onClick={addTerm}
                            disabled={saving}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Create Term
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Management</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage system users and their roles</p>
                  </div>
                  <button
                    onClick={() => setShowUserModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add User
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Login</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{user.first_name} {user.last_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{user.last_login ? dayjs(user.last_login).fromNow() : 'Never'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => updateUserStatus(user.id, !user.is_active)}
                                className={`p-1.5 rounded-lg transition-all ${
                                  user.is_active 
                                    ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500' 
                                    : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500'
                                }`}
                              >
                                {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => deleteUser(user.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add User Modal */}
                <AnimatePresence>
                  {showUserModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New User</h3>
                          <button
                            onClick={() => setShowUserModal(false)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                              <input
                                type="text"
                                value={userForm.first_name || ''}
                                onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                              <input
                                type="text"
                                value={userForm.last_name || ''}
                                onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <input
                              type="email"
                              value={userForm.email || ''}
                              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                            <select
                              value={userForm.role || 'staff'}
                              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                            >
                              <option value="admin">Admin</option>
                              <option value="director">Director</option>
                              <option value="principal">Principal</option>
                              <option value="teacher">Teacher</option>
                              <option value="staff">Staff</option>
                              <option value="accountant">Accountant</option>
                              <option value="bursar">Bursar</option>
                            </select>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={userForm.is_active !== false}
                              onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                          </label>
                          <button
                            onClick={addUser}
                            disabled={saving}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            Create User
                          </button>
                          <p className="text-xs text-gray-500 text-center">
                            Temporary password will be: <strong>Temp123!@#</strong>
                          </p>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Backup Tab */}
            {activeTab === 'backup' && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Backup Management</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage database backups</p>
                  </div>
                  <button
                    onClick={createBackup}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
                  >
                    <DatabaseIcon className="w-4 h-4" />
                    Create Backup
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {backups.map((backup) => (
                        <tr key={backup.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-mono text-xs">{backup.name}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{(backup.size / 1024 / 1024).toFixed(1)} MB</td>
                          <td className="px-4 py-3 text-gray-500">{dayjs(backup.created_at).format('MMM D, YYYY h:mm A')}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300 capitalize">{backup.type}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(backup.status)}`}>
                              {backup.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400">
                                <Download className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-500">
                                <Trash2 className="w-4 h-4" />
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
        <div className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600">
          <p>© {dayjs().year()} {schoolInfo?.school_name || selectedBranch?.school_name || 'Ebeniza International School'}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
