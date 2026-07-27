import React, { useState, useEffect } from 'react';
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
  ClipboardCheck} from 'lucide-react';
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
}

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Payment Approved', message: 'Your fee payment of ₦150,000 has been approved', time: '2 mins ago', read: false },
    { id: 2, title: 'New Assignment', message: 'Mathematics assignment posted for SS2', time: '1 hour ago', read: false },
    { id: 3, title: 'Fee Reminder', message: 'Second term tuition fee is due in 5 days', time: '3 hours ago', read: false },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch user profile data
  useEffect(() => {
    if (user?.id) {
      fetchUserProfile(user.id);
    }
  }, [user]);

  const fetchUserProfile = async (userId: string) => {
    setLoadingProfile(true);
    try {
      // First check if user is a student
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', userId)
        .single();

      if (!studentError && studentData) {
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

        setUserProfile({
          id: studentData.id,
          first_name: studentData.first_name || '',
          last_name: studentData.last_name || '',
          email: studentData.email || '',
          role: 'student',
          branch_id: studentData.branch_id || '',
          branch_name: branchName,
          school_name: branchName,
        });
        setLoadingProfile(false);
        return;
      }

      // If not a student, fetch from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user:', userError);
        setUserProfile({
          id: userId,
          first_name: user?.first_name || '',
          last_name: user?.last_name || '',
          email: user?.email || '',
          role: user?.role || 'admin',
          branch_id: '',
          branch_name: 'Not Assigned',
          school_name: 'Not Assigned',
        });
        setLoadingProfile(false);
        return;
      }

      let branchName = 'Not Assigned';
      if (userData.branch_id) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('school_name')
          .eq('id', userData.branch_id)
          .single();
        if (branchData) branchName = branchData.school_name;
      }

      setUserProfile({
        id: userData.id,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        role: userData.role || 'admin',
        branch_id: userData.branch_id || '',
        branch_name: branchName,
        school_name: branchName,
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  // Premium plans
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

  // Premium features
  const premiumFeatures = [
    { icon: Zap, label: 'Ad-Free Experience', description: 'Enjoy the platform without any advertisements' },
    { icon: Crown, label: 'Premium Support', description: 'Get priority support with 24/7 assistance' },
    { icon: BarChart3, label: 'Advanced Analytics', description: 'Access detailed analytics and insights' },
    { icon: FileText, label: 'Custom Reports', description: 'Generate custom reports for your needs' },
    { icon: Download, label: 'Export Data', description: 'Export data in multiple formats' },
    { icon: Database, label: 'More Storage', description: 'Get up to 10GB of storage' },
  ];

  // Define navigation based on roles - Organized by sections
  const navigation: NavigationItem[] = [
    // Main Section
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'super_admin', 'director', 'finance'] },
    
    // Academic Section
    { label: 'Academic', icon: BookOpen, path: '#', roles: ['admin', 'super_admin', 'director'],
      children: [
        { label: 'Students', icon: Users, path: '/students', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Teachers', icon: GraduationCap, path: '/teachers', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Classes', icon: BookOpen, path: '/classes', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Subjects', icon: FileText, path: '/subjects', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Timetable', icon: Calendar, path: '/timetable', roles: ['admin', 'super_admin', 'director'] },
      ]
    },
    
    // Finance Section
    { label: 'Finance', icon: CreditCard, path: '#', roles: ['admin', 'super_admin', 'director', 'finance'],
      children: [
        { label: 'Payments', icon: CreditCard, path: '/payments', roles: ['admin', 'super_admin', 'director', 'finance'] },
        { label: 'Invoice', icon: Coins, path: '/fees', roles: ['admin', 'super_admin', 'director', 'finance'] },
        { label: 'Reports', icon: BarChart3, path: '/reports', roles: ['admin', 'super_admin', 'director', 'finance'] },
      ]
    },
    
    // HR Section
    { label: 'Human Resources', icon: Users2, path: '#', roles: ['admin', 'super_admin', 'director'],
      children: [
        { label: 'Staff', icon: Briefcase, path: '/staff', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Attendance', icon: Clock, path: '/attendance', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Leave Requests', icon: ClipboardCheck, path: '/leave-requests', roles: ['admin', 'super_admin', 'director'] },
      ]
    },
    
    // School Admin Section
    { label: 'School Admin', icon: Building2, path: '#', roles: ['admin', 'super_admin', 'director'],
      children: [
        { label: 'Branches', icon: Building2, path: '/branches', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Houses', icon: Home, path: '/houses', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Transport', icon: Bus, path: '/transport', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Library', icon: BookOpen, path: '/library', roles: ['admin', 'super_admin', 'director'] },
      ]
    },
    
    // Communication Section
    { label: 'Communication', icon: MessageSquare, path: '#', roles: ['admin', 'super_admin', 'director'],
      children: [
        { label: 'Announcements', icon: Megaphone, path: '/announcements', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Messages', icon: MessageSquare, path: '/messages', roles: ['admin', 'super_admin', 'director'] },
        { label: 'Notices', icon: FileText, path: '/notices', roles: ['admin', 'super_admin', 'director'] },
      ]
    },
    
    // Student Section
    { label: 'Student Portal', icon: UserCircle, path: '/student/dashboard', roles: ['student'] },
    { label: 'My Profile', icon: User, path: '/student/profile', roles: ['student'] },
    { label: 'My Fees', icon: Coins, path: '/student/fees', roles: ['student'] },
    { label: 'Pay Bill', icon: Wallet, path: '/student/paybill', roles: ['student'], badge: 'New' },
    { label: 'Payment History', icon: Receipt, path: '/student/payments', roles: ['student'] },
    { label: 'My Classes', icon: BookOpen, path: '/student/classes', roles: ['student'] },
    
    // Settings
    { label: 'Settings', icon: Settings, path: '/settings', roles: ['admin', 'super_admin', 'director', 'finance'] },
  ];

  const userRole = user?.role || 'student';
  
  // Filter navigation based on user role
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

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
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

  // Sidebar animation variants
  const sidebarVariants = {
    open: { width: 280, transition: { duration: 0.3, ease: 'easeInOut' } },
    closed: { width: 80, transition: { duration: 0.3, ease: 'easeInOut' } },
  };

  // Get user display name
  const getUserName = () => {
    if (userProfile) {
      const firstName = userProfile.first_name || '';
      const lastName = userProfile.last_name || '';
      return `${firstName} ${lastName}`.trim() || 'User';
    }
    return user?.first_name ? `${user.first_name} ${user.last_name}`.trim() : 'User';
  };

  // Get user role display
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
    };
    return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Get user branch
  const getUserBranch = () => {
    return userProfile?.branch_name || 'Branch not assigned';
  };

  // Get user avatar initials
  const getInitials = () => {
    if (userProfile) {
      const first = userProfile.first_name?.[0] || '';
      const last = userProfile.last_name?.[0] || '';
      return `${first}${last}`.toUpperCase() || 'U';
    }
    return user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  };

  // Check if user is a student
  const isStudent = userRole === 'student';

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

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={sidebarOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        className="fixed top-0 left-0 z-50 h-screen bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 shadow-2xl shadow-black/5 overflow-hidden"
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between h-20 px-4 border-b border-gray-200/50 dark:border-gray-800/50">
          <div className={`flex items-center gap-3 ${sidebarOpen ? '' : 'justify-center w-full'}`}>
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
              {!isPremium && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
              )}
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
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
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-110"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
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
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                  {sidebarOpen && (
                    <>
                      <span className="text-sm font-medium">{item.label}</span>
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

        {/* Upgrade Banner */}
        {!isPremium && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-3 mb-2 p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-200/50 dark:border-amber-800/50 cursor-pointer group hover:shadow-lg transition-all"
            onClick={() => setShowPremiumModal(true)}
          >
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Go Premium</span>
            </div>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Unlock all premium features</p>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 rounded-full w-fit group-hover:scale-105 transition-transform">
              Upgrade Now
              <Sparkles className="w-3 h-3" />
            </div>
          </motion.div>
        )}

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
          {sidebarOpen ? (
            <div className={`flex items-center gap-3 p-2 rounded-xl ${isPremium ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/50' : 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-100/50 dark:border-blue-800/50'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg ${isPremium ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25' : 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-blue-500/25'}`}>
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1">
                  {getUserName()}
                  {isPremium && <Crown className="w-3 h-3 text-amber-500" />}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {getUserRoleDisplay()}
                  {isPremium && <span className="text-amber-500 text-[10px] font-medium">• Premium</span>}
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
            <div className="flex justify-center">
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

      {/* Premium Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="relative">
                {/* Premium Header */}
                <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500 p-8 text-white rounded-t-3xl">
                  <button
                    onClick={() => setShowPremiumModal(false)}
                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-xl transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <div className="flex items-center gap-3 mb-2">
                    <Crown className="w-10 h-10" />
                    <h2 className="text-3xl font-bold">Go Premium</h2>
                  </div>
                  <p className="text-white/80 text-lg">Unlock all premium features and enjoy an enhanced experience</p>
                  {isPremium && (
                    <div className="mt-4 flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 w-fit">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">You are already a Premium member!</span>
                    </div>
                  )}
                </div>

                <div className="p-8">
                  {/* Premium Features */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      Premium Features
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {premiumFeatures.map((feature, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                        >
                          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                            <feature.icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{feature.label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{feature.description}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Premium Plans */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-purple-500" />
                      Choose Your Plan
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {premiumPlans.map((plan) => {
                        const isSelected = selectedPlan === plan.id;
                        const Icon = plan.icon;
                        return (
                          <motion.div
                            key={plan.id}
                            whileHover={{ y: -4 }}
                            className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? `border-${plan.color.split('-')[1]}-500 bg-gradient-to-br ${plan.color}/10`
                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                            } ${plan.popular ? 'ring-2 ring-purple-500/50' : ''}`}
                            onClick={() => setSelectedPlan(plan.id as 'monthly' | 'yearly' | 'lifetime')}
                          >
                            {plan.popular && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold rounded-full">
                                Most Popular
                              </div>
                            )}
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-3`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h4>
                            <div className="mt-1">
                              <span className="text-2xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400"> / {plan.period}</span>
                            </div>
                            {plan.savings && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                                {plan.savings}
                              </span>
                            )}
                            <ul className="mt-4 space-y-2">
                              {plan.features.map((feature, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                            {isSelected && (
                              <div className="absolute top-4 right-4">
                                <CheckCircle className="w-6 h-6 text-green-500" />
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Lock className="w-4 h-4" />
                      Secure payment • 30-day money-back guarantee
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowPremiumModal(false)}
                        className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpgrade}
                        disabled={isProcessing || isPremium}
                        className={`px-8 py-2.5 rounded-xl font-medium text-white transition-all flex items-center gap-2 ${
                          isPremium
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-105'
                        }`}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                          </>
                        ) : isPremium ? (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Already Premium
                          </>
                        ) : (
                          <>
                            <Crown className="w-5 h-5" />
                            Upgrade Now
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-[280px]' : 'ml-20'}`}>
        {/* Premium Navbar */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
          <div className="h-16 px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                {currentPage}
              </h1>
              <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 text-blue-600 dark:text-blue-400 font-medium capitalize border border-blue-100/50 dark:border-blue-800/50">
                {getUserRoleDisplay()}
              </span>
              {isPremium && (
                <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 text-amber-600 dark:text-amber-400 font-medium border border-amber-200/50 dark:border-amber-800/50 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Premium
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 transition-all text-gray-500 dark:text-gray-400 text-sm"
              >
                <Search className="w-4 h-4" />
                <span className="hidden lg:inline">Search...</span>
                <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-200 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">⌘K</kbd>
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all hover:scale-105"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg shadow-red-500/25">
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
                      className="absolute right-0 mt-2 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden z-50"
                    >
                      <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-800/50">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        <button 
                          onClick={markAllRead}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Mark all read
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-gray-200/50 dark:divide-gray-800/50">
                        {notifications.map((notification) => (
                          <div key={notification.id} className={`p-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-all cursor-pointer ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${!notification.read ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notification.message}</p>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">{notification.time}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 border-t border-gray-200/50 dark:border-gray-800/50">
                        <button className="w-full text-center text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
                          View all notifications
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

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

              {/* User Profile */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all group"
                >
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium text-sm shadow-lg group-hover:scale-105 transition-transform ${isPremium ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25' : 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 shadow-blue-500/25'}`}>
                      {getInitials()}
                    </div>
                    {isPremium && (
                      <div className="absolute -top-1 -right-1">
                        <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                  </div>

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
                      className="absolute right-0 mt-2 w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-800/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold text-lg shadow-lg ${isPremium ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25' : 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 shadow-blue-500/25'}`}>
                            {getInitials()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                              {getUserName()}
                              {isPremium && <Crown className="w-3 h-3 text-amber-500" />}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {user?.email || userProfile?.email || 'No email'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                              <Shield className="w-3 h-3" />
                              {getUserRoleDisplay()} • {getUserBranch()}
                            </p>
                          </div>
                        </div>
                        {isPremium && (
                          <p className="text-[10px] text-amber-500 font-medium mt-2 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Premium Member
                          </p>
                        )}
                      </div>

                      <div className="py-1">
                        <Link
                          to={isStudent ? '/student/profile' : '/profile'}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-all"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <UserCircle className="w-4 h-4" />
                          {isStudent ? 'My Profile' : 'Profile'}
                        </Link>
                        <Link
                          to="/settings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-all"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                        {isStudent && (
                          <Link
                            to="/student/classes"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-all"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <BookOpen className="w-4 h-4" />
                            My Classes
                          </Link>
                        )}
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
                className="border-t border-gray-200/50 dark:border-gray-800/50 px-6 py-4"
              >
                <div className="relative max-w-2xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students, teachers, payments, classes..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 border-0 focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-400"
                    autoFocus
                  />
                  <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] bg-gray-200 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                    ESC
                  </kbd>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Page Content */}
        <main className="p-6">
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
