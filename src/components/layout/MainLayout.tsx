import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  CreditCard, 
  Coins, 
  BookOpen, 
  Building2, 
  BarChart3, 
  Settings, 
  LogOut, 
  Sun, 
  Moon,
  User,
  ChevronDown,
  Receipt,
  UserCircle,
  Home,
  Bus,
  Megaphone,
  Bell,
  Shield,
  Wallet,
  Search,
  Sparkles,
  Crown,
  HelpCircle,
  Star,
  FileText,
  Download,
  Database,
  Zap,
  Lock,
  CheckCircle,
  Rocket,
  Loader2,
  School,
  Calendar,
  MapPin,
  Users2,
  Briefcase,
  Clock,
  MessageSquare,
  ClipboardCheck,
  Camera,
  AlertCircle,
  TrendingUp,
  UserCog,
  HandHelping,
  Box,
  History,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../config/supabase/client';
import toast from 'react-hot-toast';

// Import school logo from assets
import schoolLogo from '../../assets/school-logo.png';

interface NavigationItem {
  label: string;
  icon: React.FC<any>;
  path: string;
  roles: string[];
  badge?: string;
  premium?: boolean;
  children?: NavigationItem[];
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  branch_id: string;
  branch_name?: string;
  school_name?: string;
  profile_image_url?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'payment' | 'assignment' | 'fee' | 'system' | 'message' | 'alert';
  is_read: boolean;
  created_at: string;
  data?: any;
}

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isStudent, setIsStudent] = useState(false);
  const [canUploadProfile, setCanUploadProfile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Check if mobile - sidebar closed by default
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Sidebar is closed by default on both desktop and mobile
      setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Fetch user profile data
  useEffect(() => {
    if (user?.id) {
      fetchUserProfile(user.id);
      fetchNotifications();
      
      const subscription = supabase
        .channel('notifications_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            toast(newNotification.title, {
              duration: 4000,
              position: 'top-right',
            });
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const getImageUrl = (path: string): string | null => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    try {
      const { data } = supabase.storage
        .from('student-photos')
        .getPublicUrl(path);
      return data?.publicUrl || null;
    } catch (error) {
      console.error('Error getting image URL:', error);
      return null;
    }
  };

  const fetchUserProfile = async (userId: string) => {
    setLoadingProfile(true);
    setImageError(false);
    setImageLoading(true);
    setIsStudent(false);
    setCanUploadProfile(false);
    
    try {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', userId)
        .single();

      if (!studentError && studentData) {
        setIsStudent(true);
        setCanUploadProfile(false);
        let className = 'Not Assigned';
        let branchName = 'Not Assigned';

        if (studentData.class_id) {
          const { data: classData } = await supabase
            .from('classes')
            .select('name')
            .eq('id', studentData.class_id)
            .single();
          if (classData) className = classData.name;
        }

        if (studentData.branch_id) {
          const { data: branchData } = await supabase
            .from('branches')
            .select('school_name')
            .eq('id', studentData.branch_id)
            .single();
          if (branchData) branchName = branchData.school_name;
        }

        let profileImageUrl = null;
        if (studentData.passport_url) {
          profileImageUrl = getImageUrl(studentData.passport_url);
        }

        setUserProfile({
          id: studentData.id,
          first_name: studentData.first_name || '',
          last_name: studentData.last_name || '',
          email: studentData.email || '',
          role: 'student',
          branch_id: studentData.branch_id || '',
          branch_name: branchName,
          school_name: branchName,
          profile_image_url: profileImageUrl,
        });
        setProfileImageUrl(profileImageUrl);
        setLoadingProfile(false);
        return;
      }

      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!parentError && parentData) {
        setCanUploadProfile(true);
        let branchName = 'Not Assigned';
        if (parentData.branch_id) {
          const { data: branchData } = await supabase
            .from('branches')
            .select('school_name')
            .eq('id', parentData.branch_id)
            .single();
          if (branchData) branchName = branchData.school_name;
        }

        let profileImageUrl = null;
        if (parentData.profile_image_url) {
          profileImageUrl = getImageUrl(parentData.profile_image_url);
        }

        setUserProfile({
          id: parentData.id,
          first_name: parentData.first_name || '',
          last_name: parentData.last_name || '',
          email: parentData.email || '',
          role: 'parent',
          branch_id: parentData.branch_id || '',
          branch_name: branchName,
          school_name: branchName,
          profile_image_url: profileImageUrl,
        });
        setProfileImageUrl(profileImageUrl);
        setLoadingProfile(false);
        return;
      }

      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!teacherError && teacherData) {
        setCanUploadProfile(true);
        let branchName = 'Not Assigned';
        if (teacherData.branch_id) {
          const { data: branchData } = await supabase
            .from('branches')
            .select('school_name')
            .eq('id', teacherData.branch_id)
            .single();
          if (branchData) branchName = branchData.school_name;
        }

        let profileImageUrl = null;
        if (teacherData.profile_image_url) {
          profileImageUrl = getImageUrl(teacherData.profile_image_url);
        }

        setUserProfile({
          id: teacherData.id,
          first_name: teacherData.first_name || '',
          last_name: teacherData.last_name || '',
          email: teacherData.email || '',
          role: 'teacher',
          branch_id: teacherData.branch_id || '',
          branch_name: branchName,
          school_name: branchName,
          profile_image_url: profileImageUrl,
        });
        setProfileImageUrl(profileImageUrl);
        setLoadingProfile(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!userError && userData) {
        setCanUploadProfile(true);
        let branchName = 'Not Assigned';
        if (userData.branch_id) {
          const { data: branchData } = await supabase
            .from('branches')
            .select('school_name')
            .eq('id', userData.branch_id)
            .single();
          if (branchData) branchName = branchData.school_name;
        }

        let profileImageUrl = null;
        if (userData.profile_image_url) {
          profileImageUrl = getImageUrl(userData.profile_image_url);
        }

        setUserProfile({
          id: userData.id,
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || '',
          role: userData.role || 'record_keeper',
          branch_id: userData.branch_id || '',
          branch_name: branchName,
          school_name: branchName,
          profile_image_url: profileImageUrl,
        });
        setProfileImageUrl(profileImageUrl);
        setLoadingProfile(false);
        return;
      }

      setCanUploadProfile(true);
      setUserProfile({
        id: userId,
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        role: user?.role || 'record_keeper',
        branch_id: '',
        branch_name: 'Not Assigned',
        school_name: 'Not Assigned',
        profile_image_url: null,
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoadingProfile(false);
      setImageLoading(false);
    }
  };

  const fetchNotifications = async () => {
    if (!user?.id) return;
    setLoadingNotifications(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markNotificationRead(notification.id);
    
    if (notification.data?.path) {
      navigate(notification.data.path);
    } else if (notification.type === 'payment') {
      navigate('/payments');
    } else if (notification.type === 'assignment') {
      navigate('/assignments');
    } else if (notification.type === 'fee') {
      navigate('/fees');
    }
    
    setShowNotifications(false);
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isStudent) {
      toast.error('Profile picture upload is not available for students');
      return;
    }

    if (!canUploadProfile) {
      toast.error('You do not have permission to upload a profile picture');
      return;
    }

    const file = e.target.files?.[0];
    if (!file || !user?.id) {
      toast.error('Please select a file');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, WEBP, or GIF image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setImageError(false);
    toast.loading('Uploading profile picture...');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const bucketName = 'student-photos';

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (error) {
        console.error('Upload error:', error);
        toast.dismiss();
        
        if (error.message?.includes('bucket not found')) {
          toast.error('Profile photo bucket not found. Please contact administrator.');
        } else if (error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
          toast.error('Permission denied. Please check storage policies for profile-photos bucket.');
        } else if (error.message?.includes('duplicate')) {
          toast.error('File already exists. Please try again.');
        } else {
          toast.error(`Upload failed: ${error.message}`);
        }
        setUploadingImage(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        toast.dismiss();
        toast.error('Failed to get image URL');
        setUploadingImage(false);
        return;
      }

      const userRole = userProfile?.role || 'record_keeper';
      let tableName = 'users';
      
      if (userRole === 'teacher') {
        tableName = 'teachers';
      } else if (userRole === 'parent') {
        tableName = 'parents';
      } else {
        tableName = 'users';
      }
      
      const { data: existingUser, error: checkError } = await supabase
        .from(tableName)
        .select('id')
        .eq('id', user.id)
        .single();

      if (checkError || !existingUser) {
        const { error: updateUserError } = await supabase.auth.updateUser({
          data: { 
            profile_image_url: publicUrl,
            avatar_url: publicUrl
          }
        });

        if (updateUserError) {
          console.error('Error updating user metadata:', updateUserError);
          toast.dismiss();
          toast.error('Failed to update profile');
          setUploadingImage(false);
          return;
        }
      } else {
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ 
            profile_image_url: filePath,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Update error:', updateError);
          toast.dismiss();
          toast.error('Failed to update profile');
          setUploadingImage(false);
          return;
        }
      }

      setProfileImageUrl(publicUrl);
      setUserProfile(prev => prev ? { 
        ...prev, 
        profile_image_url: publicUrl
      } : null);

      toast.dismiss();
      toast.success('Profile picture updated successfully! 🎉');
      
      await fetchUserProfile(user.id);
    } catch (error: any) {
      toast.dismiss();
      console.error('Error uploading profile image:', error);
      toast.error(error.message || 'Failed to upload profile picture');
      setImageError(true);
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const premiumPlans = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: '₦5,000',
      period: 'per month',
      features: [
        'Ad-free experience',
        'Priority support',
        'Advanced analytics',
        'Custom reports',
        'Export data',
        '5GB storage'
      ],
      icon: Zap,
      popular: false,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'yearly',
      name: 'Yearly',
      price: '₦45,000',
      period: 'per year',
      features: [
        'Everything in Monthly',
        'Save 25%',
        'Premium support',
        'Advanced analytics',
        'Custom reports',
        'Export data',
        '10GB storage',
        'Multiple branches'
      ],
      icon: Rocket,
      popular: true,
      color: 'from-purple-500 to-pink-500',
      savings: 'Save 25%'
    },
    {
      id: 'lifetime',
      name: 'Lifetime',
      price: '₦120,000',
      period: 'one-time payment',
      features: [
        'Everything in Yearly',
        'Lifetime access',
        'Priority support',
        'Advanced analytics',
        'Custom reports',
        'Export data',
        'Unlimited storage',
        'All branches',
        'VIP support'
      ],
      icon: Crown,
      popular: false,
      color: 'from-amber-500 to-orange-500'
    }
  ];

  const premiumFeatures = [
    { icon: Zap, label: 'Ad-Free Experience', description: 'Enjoy the platform without any advertisements' },
    { icon: Crown, label: 'Premium Support', description: 'Get priority support with 24/7 assistance' },
    { icon: BarChart3, label: 'Advanced Analytics', description: 'Access detailed analytics and insights' },
    { icon: FileText, label: 'Custom Reports', description: 'Generate custom reports for your needs' },
    { icon: Download, label: 'Export Data', description: 'Export data in multiple formats' },
    { icon: Database, label: 'More Storage', description: 'Get up to 10GB of storage' },
  ];

  const navigation: NavigationItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin-asst/dashboard', roles: ['record_keeper'] },
    { label: 'Students', icon: Users, path: '/admin-asst/students', roles: ['record_keeper'] },
    { label: 'Classes', icon: GraduationCap, path: '/admin-asst/classes', roles: ['record_keeper'] },
    { label: 'Sessions', icon: Calendar, path: '/admin-asst/sessions', roles: ['record_keeper'] },
    { label: 'Collections', icon: HandHelping, path: '/admin-asst/collections', roles: ['record_keeper'] },
    { label: 'Inventory', icon: Box, path: '/admin-asst/inventory', roles: ['record_keeper'] },
    { label: 'Reports', icon: BarChart3, path: '/admin-asst/reports', roles: ['record_keeper'] },
    { label: 'Activity Log', icon: History, path: '/admin-asst/activity', roles: ['record_keeper'] },
    { label: 'Payment', icon: CreditCard, path: '/admin-asst/payment', roles: ['record_keeper', 'admin_asst'] },

    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'super_admin', 'director', 'finance'] },
    { label: 'Academic', icon: BookOpen, path: '#', roles: ['admin', 'super_admin', 'director'],
      children: [
        { label: 'Students', icon: Users, path: '/students', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Teachers', icon: GraduationCap, path: '/teachers', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Classes', icon: BookOpen, path: '/classes', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Subjects', icon: FileText, path: '/subjects', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Timetable', icon: Calendar, path: '/timetable', roles: ['admin', 'super_admin', 'director'] },
      ]
    },
    { label: 'Finance', icon: CreditCard, path: '#', roles: ['admin', 'super_admin', 'director', 'finance'],
      children: [
        { label: 'Payments', icon: CreditCard, path: '/payments', roles: ['admin', 'super_admin', 'director', 'finance'] },
        { label: 'Invoice', icon: Coins, path: '/fees', roles: ['admin', 'super_admin', 'director', 'finance'] },
        { label: 'Reports', icon: BarChart3, path: '/reports', roles: ['admin', 'super_admin', 'director', 'finance'] },
      ]
    },
    { label: 'Human Resources', icon: Users2, path: '#', roles: ['admin', 'super_admin', 'director'],
      children: [
        { label: 'Staff', icon: Briefcase, path: '/staff', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Parents', icon: Users2, path: '/parents/create', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Attendance', icon: Clock, path: '/attendance', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Leave Requests', icon: ClipboardCheck, path: '/leave-requests', roles: ['admin', 'super_admin', 'director'] },
      ]
    },
    { label: 'School Admin', icon: Building2, path: '#', roles: ['admin', 'super_admin', 'director'],
      children: [
        { label: 'Branches', icon: Building2, path: '/branches', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Houses', icon: Home, path: '/houses', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Transport', icon: Bus, path: '/transport', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Library', icon: BookOpen, path: '/library', roles: ['admin', 'super_admin', 'director'] },
      ]
    },
    { label: 'Communication', icon: MessageSquare, path: '#', roles: ['admin', 'super_admin', 'director'],
      children: [
        { label: 'Announcements', icon: Megaphone, path: '/announcements', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Messages', icon: MessageSquare, path: '/messages', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Notices', icon: FileText, path: '/notices', roles: ['admin', 'super_admin', 'director'] },
      ]
    },
    
    { label: 'Dashboard', icon: LayoutDashboard, path: '/teacher/dashboard', roles: ['teacher'] },
    { label: 'My Classes', icon: GraduationCap, path: '/teacher/classes', roles: ['teacher'] },
    { label: 'Students', icon: Users, path: '/teacher/students', roles: ['teacher'] },
    { label: 'Attendance', icon: Clock, path: '/teacher/attendance', roles: ['teacher'] },
    { label: 'Assignments', icon: FileText, path: '/teacher/assignments', roles: ['teacher'] },
    { label: 'Grades', icon: TrendingUp, path: '/teacher/grades', roles: ['teacher'] },
    { label: 'Timetable', icon: Calendar, path: '/teacher/timetable', roles: ['teacher'] },
    
    { label: 'Dashboard', icon: LayoutDashboard, path: '/parent/dashboard', roles: ['parent'] },
    { label: 'My Children', icon: Users, path: '/parent/children', roles: ['parent'] },
    { label: 'Pay Bill', icon: Wallet, path: '/parent/pay-bill', roles: ['parent'], badge: 'New' },
    { label: 'My Profile', icon: User, path: '/parent/profile', roles: ['parent'] },
    
    { label: 'Student Portal', icon: UserCircle, path: '/student/dashboard', roles: ['student'] },
    { label: 'My Profile', icon: User, path: '/student/profile', roles: ['student'] },
    { label: 'Pay Bill', icon: Wallet, path: '/student/paybill', roles: ['student'], badge: 'New' },
    { label: 'Payment History', icon: Receipt, path: '/student/payments', roles: ['student'] },
    { label: 'My Classes', icon: BookOpen, path: '/student/classes', roles: ['student'] },
    
    { label: 'Settings', icon: Settings, path: '/settings', roles: ['admin', 'super_admin', 'director', 'finance', 'teacher', 'parent', 'student', 'record_keeper'] },
  ];

  const userRole = user?.role || 'student';
  
  const filterNavigation = (items: NavigationItem[]): NavigationItem[] => {
    return items
      .filter(item => item.roles.includes(userRole.toLowerCase()))
      .map(item => {
        if (item.children) {
          return {
            ...item,
            children: item.children.filter(child => child.roles.includes(userRole.toLowerCase()))
          };
        }
        return item;
      })
      .filter(item => {
        if (item.children) {
          return item.children.length > 0;
        }
        return true;
      });
  };

  const filteredNavigation = filterNavigation(navigation);

  const isActive = (path: string) => {
    if (path === '#') return false;
    if (path === '/dashboard' && location.pathname === '/') return true;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const handleUpgrade = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsPremium(true);
      setShowPremiumModal(false);
      toast.success('🎉 Congratulations! You are now a Premium member!');
    }, 2000);
  };

  const currentPage = filteredNavigation
    .flatMap(item => item.children ? item.children : [item])
    .find(item => isActive(item.path))?.label || 'Dashboard';

  const sidebarVariants = {
    open: { width: 260, transition: { duration: 0.3, ease: 'easeInOut' } },
    closed: { width: 72, transition: { duration: 0.3, ease: 'easeInOut' } },
  };

  const mobileSidebarVariants = {
    open: { 
      x: 0, 
      transition: { duration: 0.3, ease: 'easeInOut' } 
    },
    closed: { 
      x: '-100%', 
      transition: { duration: 0.3, ease: 'easeInOut' } 
    },
  };

  const getUserName = () => {
    if (userProfile) {
      const firstName = userProfile.first_name || '';
      const lastName = userProfile.last_name || '';
      return `${firstName} ${lastName}`.trim() || 'User';
    }
    return user?.first_name ? `${user.first_name} ${user.last_name}`.trim() : 'User';
  };

  const getUserRoleDisplay = () => {
    const role = userRole || 'student';
    const roleMap: Record<string, string> = {
      admin: 'Administrator',
      teacher: 'Teacher',
      student: 'Student',
      parent: 'Parent',
      director: 'Director',
      finance: 'Finance Officer',
      super_admin: 'Super Admin',
      admin_asst: 'Admin Assistant',
      record_keeper: 'Admin Assistant',
    };
    return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getUserBranch = () => {
    return userProfile?.branch_name || 'Branch not assigned';
  };

  const getInitials = () => {
    if (userProfile) {
      const first = userProfile.first_name?.[0] || '';
      const last = userProfile.last_name?.[0] || '';
      return `${first}${last}`.toUpperCase() || 'U';
    }
    return user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment': return <CreditCard className="w-4 h-4 text-green-500" />;
      case 'assignment': return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'fee': return <Coins className="w-4 h-4 text-amber-500" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'alert': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'payment': return 'bg-green-50 dark:bg-green-900/20';
      case 'assignment': return 'bg-blue-50 dark:bg-blue-900/20';
      case 'fee': return 'bg-amber-50 dark:bg-amber-900/20';
      case 'message': return 'bg-purple-50 dark:bg-purple-900/20';
      case 'alert': return 'bg-red-50 dark:bg-red-900/20';
      default: return 'bg-gray-50 dark:bg-gray-800/50';
    }
  };

  // Memoized Profile Image Component
  const ProfileImage = React.memo(({ className = "w-10 h-10 rounded-xl object-cover shadow-lg" }: { className?: string }) => {
    const [imgError, setImgError] = useState(false);
    const [imgLoading, setImgLoading] = useState(true);

    const getGravatarUrl = useCallback(() => {
      if (user?.email) {
        const email = user.email.toLowerCase().trim();
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
          hash = (hash << 5) - hash + email.charCodeAt(i);
          hash = hash & hash;
        }
        const hashStr = Math.abs(hash).toString(16).padStart(32, '0');
        return `https://www.gravatar.com/avatar/${hashStr}?d=identicon&s=200`;
      }
      return null;
    }, [user?.email]);

    const imageUrl = useMemo(() => {
      if (profileImageUrl && !imgError) {
        return profileImageUrl;
      }
      return getGravatarUrl();
    }, [profileImageUrl, imgError, getGravatarUrl]);

    if (!imageUrl || imgError) {
      return (
        <div className={`${className} flex items-center justify-center text-white font-semibold ${isPremium ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-blue-600 to-purple-600'}`}>
          {getInitials()}
        </div>
      );
    }

    return (
      <>
        {imgLoading && (
          <div className={`${className} bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center`}>
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        )}
        <img 
          src={imageUrl} 
          alt="Profile" 
          className={`${className} ${imgLoading ? 'hidden' : 'block'}`}
          loading="lazy"
          onError={() => {
            setImgError(true);
            setImgLoading(false);
          }}
          onLoad={() => setImgLoading(false)}
        />
      </>
    );
  });

  ProfileImage.displayName = 'ProfileImage';

  const ProfileImageWithUpload = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = {
      sm: 'w-10 h-10',
      md: 'w-12 h-12',
      lg: 'w-14 h-14'
    };

    const inputId = `profile-image-upload-${Math.random().toString(36).substring(7)}`;

    return (
      <div className={`relative group ${sizeClasses[size]}`}>
        <ProfileImage className={`${sizeClasses[size]} rounded-xl object-cover shadow-lg`} />
        
        {!isStudent && canUploadProfile && (
          <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
            <label htmlFor={inputId} className="cursor-pointer w-full h-full flex items-center justify-center">
              {uploadingImage ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleProfileImageUpload}
              disabled={uploadingImage}
            />
          </div>
        )}
        
        {isStudent && (
          <div className="absolute inset-0 rounded-xl flex items-center justify-center pointer-events-none">
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white dark:border-gray-900" />
          </div>
        )}
        
        {isPremium && (
          <div className="absolute -top-1 -right-1">
            <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
          </div>
        )}
      </div>
    );
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl" />
        {isPremium && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        )}
      </div>

      {/* Desktop Sidebar - Hidden on mobile */}
      {!isMobile && (
        <motion.aside
          initial="closed"
          animate={sidebarOpen ? 'open' : 'closed'}
          variants={sidebarVariants}
          className="fixed top-0 left-0 z-50 h-screen bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 shadow-2xl shadow-black/5 overflow-hidden"
        >
          {/* Logo Section */}
          <div className="flex items-center justify-between h-20 px-3 border-b border-gray-200/50 dark:border-gray-800/50">
            <div className={`flex items-center gap-2 ${sidebarOpen ? 'w-full' : 'justify-center w-full'}`}>
              <div className="relative flex-shrink-0">
                {schoolLogo ? (
                  <img 
                    src={schoolLogo} 
                    alt="School Logo" 
                    className={`w-10 h-10 rounded-xl object-cover ${isPremium ? 'ring-2 ring-amber-500/50' : ''}`}
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 ${isPremium ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500' : 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600'}`}>
                    {isPremium ? (
                      <Crown className="w-5 h-5 text-white" />
                    ) : (
                      <School className="w-5 h-5 text-white" />
                    )}
                  </div>
                )}
                {isPremium && (
                  <div className="absolute -top-1 -right-1">
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                      <Star className="w-2 h-2" />
                      PRO
                    </span>
                  </div>
                )}
              </div>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 min-w-0"
                >
                  <span className={`text-lg font-bold ${isPremium ? 'bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent' : 'bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent'}`}>
                    Ebenezer School
                  </span>
                  <span className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 tracking-wider uppercase">
                    {isPremium ? '✨ Premium' : 'School Management'}
                  </span>
                </motion.div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-110 flex-shrink-0 ${!sidebarOpen ? 'mx-auto' : ''}`}
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="px-2 py-4 space-y-1 overflow-y-auto h-[calc(100vh-14rem)]">
            {filteredNavigation.map((item, index) => {
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedMenus.includes(item.label);
              const isActiveParent = item.children?.some(child => isActive(child.path));

              if (hasChildren) {
                return (
                  <div key={item.label} className="mb-1">
                    <button
                      onClick={() => sidebarOpen && toggleMenu(item.label)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                        isActiveParent
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-white'
                      } ${!sidebarOpen ? 'justify-center' : ''}`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {sidebarOpen && (
                        <>
                          <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </>
                      )}
                    </button>
                    {sidebarOpen && isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200/50 dark:border-gray-700/50 pl-3"
                      >
                        {item.children.map((child) => {
                          const active = isActive(child.path);
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                                active
                                  ? 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-white'
                              }`}
                            >
                              <child.icon className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm">{child.label}</span>
                              {child.badge && !active && (
                                <span className="ml-auto px-2 py-0.5 text-[10px] font-medium bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full animate-pulse">
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                );
              }

              const active = isActive(item.path);
              const isPayBill = item.label === 'Pay Bill';
              const isAdminAsst = userRole === 'record_keeper' || userRole === 'admin_asst';
              
              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={item.path}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                      active
                        ? isPayBill
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                          : isAdminAsst
                          ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/25'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-white'
                    } ${!sidebarOpen ? 'justify-center' : ''}`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                    {sidebarOpen && (
                      <>
                        <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                        {item.badge && !active && (
                          <span className="ml-auto px-2 py-0.5 text-[10px] font-medium bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full animate-pulse">
                            {item.badge}
                          </span>
                        )}
                        {active && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="ml-auto w-1 h-6 bg-white/50 rounded-full"
                          />
                        )}
                      </>
                    )}
                    {!sidebarOpen && active && (
                      <div className="absolute -right-0.5 w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
            {sidebarOpen ? (
              <div className={`flex items-center gap-3 p-2 rounded-xl ${isPremium ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/50' : 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-100/50 dark:border-blue-800/50'}`}>
                <ProfileImageWithUpload size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1">
                    {getUserName()}
                    {isPremium && <Crown className="w-3 h-3 text-amber-500" />}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {getUserRoleDisplay()}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ProfileImageWithUpload size="sm" />
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </motion.aside>
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </AnimatePresence>

          <motion.aside
            initial="closed"
            animate={sidebarOpen ? 'open' : 'closed'}
            variants={mobileSidebarVariants}
            className="fixed top-0 left-0 z-50 h-screen w-[280px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 shadow-2xl shadow-black/5 overflow-y-auto"
          >
            <div className="flex items-center justify-between h-20 px-4 border-b border-gray-200/50 dark:border-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  {schoolLogo ? (
                    <img 
                      src={schoolLogo} 
                      alt="School Logo" 
                      className={`w-10 h-10 rounded-xl object-cover ${isPremium ? 'ring-2 ring-amber-500/50' : ''}`}
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 ${isPremium ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500' : 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600'}`}>
                      {isPremium ? (
                        <Crown className="w-5 h-5 text-white" />
                      ) : (
                        <School className="w-5 h-5 text-white" />
                      )}
                    </div>
                  )}
                  {isPremium && (
                    <div className="absolute -top-1 -right-1">
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                        <Star className="w-2 h-2" />
                        PRO
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <span className={`text-lg font-bold ${isPremium ? 'bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent' : 'bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent'}`}>
                    Ebenezer School
                  </span>
                  <span className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 tracking-wider uppercase">
                    {isPremium ? '✨ Premium' : 'School Management'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="px-3 py-4 space-y-1 overflow-y-auto h-[calc(100vh-14rem)]">
              {filteredNavigation.map((item, index) => {
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = expandedMenus.includes(item.label);
                const isActiveParent = item.children?.some(child => isActive(child.path));

                if (hasChildren) {
                  return (
                    <div key={item.label} className="mb-1">
                      <button
                        onClick={() => toggleMenu(item.label)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                          isActiveParent
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200/50 dark:border-gray-700/50 pl-3"
                        >
                          {item.children.map((child) => {
                            const active = isActive(child.path);
                            return (
                              <Link
                                key={child.path}
                                to={child.path}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                                  active
                                    ? 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-white'
                                }`}
                                onClick={() => setSidebarOpen(false)}
                              >
                                <child.icon className="w-4 h-4 flex-shrink-0" />
                                <span className="text-sm">{child.label}</span>
                                {child.badge && !active && (
                                  <span className="ml-auto px-2 py-0.5 text-[10px] font-medium bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full animate-pulse">
                                    {child.badge}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </div>
                  );
                }

                const active = isActive(item.path);
                const isPayBill = item.label === 'Pay Bill';
                const isAdminAsst = userRole === 'record_keeper' || userRole === 'admin_asst';
                
                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                        active
                          ? isPayBill
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                            : isAdminAsst
                            ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/25'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.badge && !active && (
                        <span className="ml-auto px-2 py-0.5 text-[10px] font-medium bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full animate-pulse">
                          {item.badge}
                        </span>
                      )}
                      {active && (
                        <motion.div
                          layoutId="activeIndicatorMobile"
                          className="ml-auto w-1 h-6 bg-white/50 rounded-full"
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            <div className="p-4 border-t border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80">
              <div className={`flex items-center gap-3 p-2 rounded-xl ${isPremium ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/50' : 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-100/50 dark:border-blue-800/50'}`}>
                <ProfileImageWithUpload size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1">
                    {getUserName()}
                    {isPremium && <Crown className="w-3 h-3 text-amber-500" />}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {getUserRoleDisplay()}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}

      {/* Main Content */}
      <div className={`transition-all duration-300 ${!isMobile && sidebarOpen ? 'ml-[260px]' : !isMobile ? 'ml-[72px]' : 'ml-0'}`}>
        {/* Navbar */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
          <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent truncate max-w-[120px] sm:max-w-xs">
                {currentPage}
              </h1>
              <span className="hidden sm:inline-block text-xs px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 text-blue-600 dark:text-blue-400 font-medium capitalize border border-blue-100/50 dark:border-blue-800/50">
                {getUserRoleDisplay()}
              </span>
              {isPremium && (
                <span className="hidden sm:inline-block text-xs px-3 py-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 text-amber-600 dark:text-amber-400 font-medium border border-amber-200/50 dark:border-amber-800/50 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Premium
                </span>
              )}
              {(userRole === 'record_keeper' || userRole === 'admin_asst') && (
                <span className="hidden sm:inline-block text-xs px-3 py-1 rounded-full bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 text-teal-600 dark:text-teal-400 font-medium border border-teal-200/50 dark:border-teal-800/50 flex items-center gap-1">
                  <UserCog className="w-3 h-3" />
                  Admin Assistant
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search */}
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 transition-all text-gray-500 dark:text-gray-400 text-sm"
              >
                <Search className="w-4 h-4" />
                <span className="hidden lg:inline">Search...</span>
              </button>

              {/* Mobile Search */}
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="sm:hidden p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all hover:scale-105"
                aria-label="Toggle theme"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all hover:scale-105"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg shadow-red-500/25 animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-[400px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden z-50"
                    >
                      <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-800/50">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          Notifications
                          {unreadCount > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-red-500 text-white rounded-full">
                              {unreadCount} new
                            </span>
                          )}
                        </h3>
                        <button 
                          onClick={markAllRead}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Mark all read
                        </button>
                      </div>
                      
                      <div className="max-h-80 overflow-y-auto divide-y divide-gray-200/50 dark:divide-gray-800/50">
                        {loadingNotifications ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="text-center py-8">
                            <Bell className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">You're all caught up!</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification)}
                              className={`p-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-all cursor-pointer ${
                                !notification.is_read ? `${getNotificationColor(notification.type)} border-l-4 border-blue-500` : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-1">
                                  {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {notification.title}
                                    </p>
                                    {!notification.is_read && (
                                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                      {new Date(notification.created_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                    {notification.type && (
                                      <span className="text-[10px] capitalize px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                        {notification.type}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      {notifications.length > 0 && (
                        <div className="p-3 border-t border-gray-200/50 dark:border-gray-800/50">
                          <button 
                            onClick={() => {
                              setShowNotifications(false);
                              navigate('/notifications');
                            }}
                            className="w-full text-center text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
                          >
                            View all notifications
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User Profile */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all group"
                >
                  <ProfileImageWithUpload size="sm" />
                  <div className="hidden lg:block text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {getUserName()}
                      </p>
                      {isPremium && <Crown className="w-3 h-3 text-amber-500" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        {getUserRoleDisplay()}
                      </span>
                      <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {getUserBranch()}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden lg:block" />
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-72 max-w-[400px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-800/50">
                        <div className="flex items-center gap-3">
                          <ProfileImageWithUpload size="lg" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                              {getUserName()}
                              {isPremium && <Crown className="w-3 h-3 text-amber-500" />}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                              {user?.email || userProfile?.email || 'No email'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                              <Shield className="w-3 h-3" />
                              {getUserRoleDisplay()} • {getUserBranch()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="py-1 max-h-[60vh] overflow-y-auto">
                        {/* Role-based profile links */}
                        {(userRole === 'record_keeper' || userRole === 'admin_asst') && (
                          <Link
                            to="/admin-asst/profile"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-all"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <UserCog className="w-4 h-4" />
                            My Profile
                          </Link>
                        )}
                        {userRole === 'student' && (
                          <Link
                            to="/student/profile"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-all"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <UserCircle className="w-4 h-4" />
                            My Profile
                          </Link>
                        )}
                        {userRole === 'parent' && (
                          <Link
                            to="/parent/profile"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-all"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <UserCircle className="w-4 h-4" />
                            My Profile
                          </Link>
                        )}
                        {userRole === 'teacher' && (
                          <Link
                            to="/teacher/profile"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-all"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <UserCircle className="w-4 h-4" />
                            My Profile
                          </Link>
                        )}
                        {(userRole === 'admin' || userRole === 'director' || userRole === 'finance') && (
                          <Link
                            to="/profile"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-all"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <UserCircle className="w-4 h-4" />
                            Profile
                          </Link>
                        )}
                        <Link
                          to="/settings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-all"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                        
                        {!isPremium && (
                          <button
                            onClick={() => {
                              setIsDropdownOpen(false);
                              setShowPremiumModal(true);
                            }}
                            className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-amber-600 hover:bg-amber-50/80 dark:hover:bg-amber-900/20 transition-all"
                          >
                            <Crown className="w-4 h-4" />
                            Go Premium
                          </button>
                        )}
                        <Link
                          to="/help"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-all"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <HelpCircle className="w-4 h-4" />
                          Help & Support
                        </Link>
                      </div>

                      <div className="border-t border-gray-200/50 dark:border-gray-800/50 pt-1">
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            handleLogout();
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-red-600 hover:bg-red-50/80 dark:hover:bg-red-900/20 transition-all"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-200/50 dark:border-gray-800/50 px-4 sm:px-6 py-4"
              >
                <div className="relative max-w-2xl mx-auto">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students, teachers, payments, classes..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 border-0 focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-400 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() => setIsSearchOpen(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Page Content */}
        <main className="p-3 sm:p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;