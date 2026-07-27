import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  Camera,
  Loader2,
  CheckCircle,
  AlertCircle,
  Bell,
  Settings,
  LogOut,
  Menu,
  Sun,
  Moon,
  Shield,
  Award,
  GraduationCap,
  Home,
  Building2,
  Globe,
  ChevronRight,
  BadgeCheck,
  Clock,
  TrendingUp,
  Wallet,
  Receipt,
  FileText,
  Download,
  Printer,
  Share2,
  Copy,
  Check,
  Lock,
  Key,
  Crown,
  Rocket,
  Target,
  Users,
  Info,
  Link,
  Search,
  Phone as PhoneIcon,
  MessageCircle,
  Heart,
  Star,
  Sparkles,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  CreditCard,
  QrCode,
  Barcode,
  HelpCircle,
  LifeBuoy
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// ============================================
// INTERFACES
// ============================================
interface StudentProfile {
  id: string;
  student_id: string;
  admission_number: string;
  admission_date: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  other_names: string;
  gender: string;
  passport_url: string;
  date_of_birth: string;
  place_of_birth: string;
  nationality: string;
  state_of_origin: string;
  lga: string;
  religion: string;
  blood_group: string;
  genotype: string;
  phone_number: string;
  email: string;
  home_address: string;
  residential_address: string;
  branch_id: string;
  department: string;
  class_id: string;
  class_arm: string;
  house_id: string;
  club_id: string;
  transportation_status: boolean;
  pickup_location: string;
  bus_route_id: string;
  medical_info: any;
  doctor_name: string;
  hospital_name: string;
  allergies: string;
  medical_conditions: string;
  special_needs: string;
  previous_school: string;
  transfer_status: string;
  admission_status: string;
  current_status: string;
  emergency_contact: any;
  parent_id: string;
  guardian_info: any;
  documents: any;
  qr_code_data: string;
  barcode_data: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata: any;
  user_id: string;
  class?: { id: string; name: string; };
  branch?: { id: string; name: string; };
}

interface StudentMatch {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
  class_arm: string;
  email: string;
}

// ============================================
// MAIN COMPONENT
// ============================================
const StudentProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  
  // States for the linking flow
  const [showLinking, setShowLinking] = useState(false);
  const [foundStudents, setFoundStudents] = useState<StudentMatch[]>([]);
  const [searchMode, setSearchMode] = useState<'auto' | 'manual' | 'select'>('auto');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentMatch | null>(null);
  const [linking, setLinking] = useState(false);
  const [classNames, setClassNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  // Helper to fetch class names
  const fetchClassNames = async (classIds: string[]) => {
    try {
      const uniqueIds = [...new Set(classIds)];
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', uniqueIds);

      if (!error && data) {
        const nameMap: Record<string, string> = {};
        data.forEach(c => { nameMap[c.id] = c.name; });
        setClassNames(nameMap);
        return nameMap;
      }
    } catch (error) {
      console.error('Error fetching class names:', error);
    }
    return {};
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching profile for user ID:', user?.id);
      console.log('📧 User email:', user?.email);

      let studentData = null;

      // PRIMARY: Use user_id (most reliable)
      if (user?.id) {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          studentData = data;
          console.log('✅ Found student via user_id');
        } else {
          console.log('❌ user_id lookup failed:', error?.message);
        }
      }

      // SECONDARY: Try by ID
      if (!studentData && user?.id) {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          studentData = data;
          console.log('✅ Found student via id match');
        }
      }

      // TERTIARY: Try by email
      if (!studentData && user?.email) {
        console.log('📧 Looking for student with email:', user.email);
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('email', user.email);

        if (!error && data && data.length > 0) {
          if (data.length === 1) {
            studentData = data[0];
            console.log('✅ Found single student via email');
          } else {
            const students = data;
            const classIds = students.map(s => s.class_id).filter(Boolean);
            await fetchClassNames(classIds);
            
            setFoundStudents(students.map(s => ({
              id: s.id,
              first_name: s.first_name,
              last_name: s.last_name,
              admission_number: s.admission_number,
              class_name: classNames[s.class_id] || 'Class',
              class_arm: s.class_arm,
              email: s.email
            })));
            setSearchMode('select');
            setShowLinking(true);
            setLoading(false);
            return;
          }
        }
      }

      // If found student, fetch class and branch names separately
      if (studentData) {
        if (studentData.class_id) {
          const { data: classData } = await supabase
            .from('classes')
            .select('name')
            .eq('id', studentData.class_id)
            .single();
          
          if (classData) {
            studentData.class = classData;
          }
        }

        if (studentData.branch_id) {
          const { data: branchData } = await supabase
            .from('branches')
            .select('name')
            .eq('id', studentData.branch_id)
            .single();
          
          if (branchData) {
            studentData.branch = branchData;
          }
        }

        setProfile(studentData);
        setLoading(false);
        return;
      }

      setShowLinking(true);
      setSearchMode('manual');
      setLoading(false);

    } catch (error: any) {
      console.error('❌ Error fetching profile:', error);
      setLoading(false);
      setShowLinking(true);
      setSearchMode('manual');
    }
  };

  const handleLinkStudent = async (studentId: string) => {
    setLinking(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          user_id: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId);

      if (error) throw error;

      toast.success('Account linked successfully! 🎉');
      setShowLinking(false);
      fetchProfile();
    } catch (error: any) {
      console.error('Error linking student:', error);
      toast.error(error.message || 'Failed to link account');
    } finally {
      setLinking(false);
    }
  };

  const handleSearchStudent = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter an admission number or phone number');
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .or(`admission_number.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%,student_id.ilike.%${searchQuery}%`);

      if (error) throw error;

      if (data && data.length > 0) {
        const classIds = data.map(s => s.class_id).filter(Boolean);
        await fetchClassNames(classIds);

        setFoundStudents(data.map(s => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          admission_number: s.admission_number,
          class_name: classNames[s.class_id] || 'Class',
          class_arm: s.class_arm,
          email: s.email
        })));
        setSearchMode('select');
      } else {
        toast.error('No students found with that information');
        setFoundStudents([]);
      }
    } catch (error: any) {
      console.error('Error searching students:', error);
      toast.error(error.message || 'Failed to search');
    } finally {
      setSearching(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success('Copied to clipboard');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      admitted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return styles[status] || styles.pending;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const tabs = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'medical', label: 'Medical', icon: Heart },
    { id: 'guardian', label: 'Guardian', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'transport', label: 'Transport', icon: Home },
  ];

  // Calculate completion rate
  const completionRate = useMemo(() => {
    if (!profile) return 0;
    const fields = [
      profile.first_name, profile.last_name, profile.email, 
      profile.phone_number, profile.home_address, profile.date_of_birth,
      profile.gender, profile.class_id, profile.branch_id
    ];
    const filled = fields.filter(f => f && f !== '').length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Loading your profile..." />
          <div className="mt-4 text-sm text-gray-400 dark:text-gray-500 animate-pulse">
            Getting your information ready ✨
          </div>
        </div>
      </div>
    );
  }

  // Account Linking Flow
  if (showLinking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg mb-4">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to Student Portal</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {searchMode === 'auto' && 'We found a student record matching your email!'}
                {searchMode === 'select' && 'Select your student account to link'}
                {searchMode === 'manual' && 'Find your student record to continue'}
              </p>
            </div>

            {searchMode === 'auto' && foundStudents.length === 1 && (
              <div className="space-y-6">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {foundStudents[0].first_name} {foundStudents[0].last_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        Admission: {foundStudents[0].admission_number}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        Class: {foundStudents[0].class_name} - {foundStudents[0].class_arm}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        Email: {foundStudents[0].email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      This student record matches your email. Click "Link My Account" to connect this student to your login.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleLinkStudent(foundStudents[0].id)}
                    disabled={linking}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {linking ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Link className="w-5 h-5" />
                        Link My Account
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSearchMode('manual');
                      setFoundStudents([]);
                    }}
                    className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Not You?
                  </button>
                </div>
              </div>
            )}

            {searchMode === 'select' && foundStudents.length > 0 && (
              <div className="space-y-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  We found multiple students with this information. Please select your account:
                </p>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {foundStudents.map((student) => (
                    <motion.div
                      key={student.id}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedStudent?.id === student.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                      }`}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {student.first_name[0]}{student.last_name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {student.admission_number} • {student.class_name} - {student.class_arm}
                            </p>
                          </div>
                        </div>
                        {selectedStudent?.id === student.id && (
                          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (selectedStudent) {
                      handleLinkStudent(selectedStudent.id);
                    } else {
                      toast.error('Please select a student');
                    }
                  }}
                  disabled={linking || !selectedStudent}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {linking ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Link className="w-5 h-5" />
                      Link Selected Account
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setSearchMode('manual');
                    setFoundStudents([]);
                    setSelectedStudent(null);
                  }}
                  className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Search with different information
                </button>
              </div>
            )}

            {searchMode === 'manual' && (
              <div className="space-y-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enter your admission number or phone number to find your student record:
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Admission number or phone number"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchStudent();
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={handleSearchStudent}
                    disabled={searching}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {searching ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Search
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-3">
                    Still having trouble? Contact our support team
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all">
                      <PhoneIcon className="w-4 h-4" />
                      Call School
                    </button>
                    <button className="flex items-center justify-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl hover:bg-green-200 dark:hover:bg-green-900/50 transition-all">
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                onClick={() => {
                  setShowLinking(false);
                  setSearchMode('manual');
                  setFoundStudents([]);
                }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                ← Back to Login
              </button>
              <button
                onClick={() => logout()}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center mb-6">
            <User className="w-12 h-12 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Not Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            We couldn't find your student profile. Please try searching again or contact support.
          </p>
          <div className="mt-6 space-y-3">
            <button
              onClick={() => {
                setShowLinking(true);
                setSearchMode('manual');
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Find My Student
            </button>
            <button
              onClick={() => logout()}
              className="w-full px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN PROFILE VIEW
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Profile Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-6 sm:p-8 text-white shadow-2xl mb-6"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000" />
          
          <div className="relative flex flex-col sm:flex-row items-center gap-6">
            {/* Profile Image */}
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-1 bg-white/20 rounded-full blur-md" />
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full ring-4 ring-white/30 shadow-2xl overflow-hidden">
                {profile.passport_url ? (
                  <img src={profile.passport_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-3xl sm:text-4xl font-bold">
                    {profile.first_name?.[0]}{profile.last_name?.[0]}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 p-1 bg-green-500 rounded-full ring-2 ring-white">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl sm:text-2xl font-bold">
                  {profile.first_name} {profile.last_name}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm">
                  <BadgeCheck className="w-3 h-3" />
                  Verified
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1 text-sm text-white/80">
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-4 h-4" />
                  {profile.class?.name || 'N/A'} {profile.class_arm || ''}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {profile.branch?.name || 'Main Campus'}
                </span>
                <span className="flex items-center gap-1">
                  <CreditCard className="w-4 h-4" />
                  {profile.admission_number}
                </span>
              </div>

              {/* Completion Bar */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 max-w-xs h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
                <span className="text-xs text-white/80">{completionRate}% Complete</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5">
                <Download className="w-4 h-4" />
                ID Card
              </button>
              <button className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5">
                <QrCode className="w-4 h-4" />
                QR
              </button>
            </div>
          </div>
        </motion.div>

       

        {/* Tabs */}
        <div className="space-y-4">
          <div className="flex overflow-x-auto gap-1 p-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 shadow-lg text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="overflow-x-auto"
              >
                {/* Personal Information */}
                {activeTab === 'personal' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> First Name
                      </label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.first_name}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Last Name
                      </label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.last_name}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Middle Name</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.middle_name || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Other Names</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.other_names || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Gender</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 capitalize truncate">{profile.gender || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Date of Birth
                      </label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">
                        {profile.date_of_birth ? dayjs(profile.date_of_birth).format('MMMM D, YYYY') : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Place of Birth</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.place_of_birth || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Nationality</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.nationality || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">State of Origin</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.state_of_origin || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">LGA</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.lga || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Religion</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 capitalize truncate">{profile.religion || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Blood Group</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.blood_group || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Genotype</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.genotype || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> Email
                      </label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.email}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Phone
                      </label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.phone_number || 'N/A'}</p>
                    </div>
                    <div className="sm:col-span-2 p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Home Address
                      </label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 break-words">{profile.home_address || 'N/A'}</p>
                    </div>
                    <div className="sm:col-span-2 p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Residential Address</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 break-words">{profile.residential_address || 'N/A'}</p>
                    </div>
                  </div>
                )}

                {/* Academic Information */}
                {activeTab === 'academic' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Student ID</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 font-mono text-xs sm:text-sm break-all">{profile.student_id}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Admission Number</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 font-mono text-xs sm:text-sm break-all">{profile.admission_number}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Admission Date</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">
                        {profile.admission_date ? dayjs(profile.admission_date).format('MMMM D, YYYY') : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Admission Status</label>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${
                        profile.admission_status === 'admitted' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        <CheckCircle className="w-3 h-3" />
                        {profile.admission_status}
                      </span>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Current Status</label>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${
                        profile.current_status === 'active' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {profile.current_status}
                      </span>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Class</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.class?.name || 'N/A'} {profile.class_arm || ''}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Department</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.department || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">House</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.house_id || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Club</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.club_id || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Transfer Status</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 capitalize truncate">{profile.transfer_status || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Previous School</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.previous_school || 'N/A'}</p>
                    </div>
                    <div className="sm:col-span-2 p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Branch</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.branch?.name || 'N/A'}</p>
                    </div>
                  </div>
                )}

                {/* Medical Information */}
                {activeTab === 'medical' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Blood Group</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.blood_group || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Genotype</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.genotype || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Doctor's Name</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.doctor_name || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Hospital Name</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.hospital_name || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Allergies</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.allergies || 'None'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Medical Conditions</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.medical_conditions || 'None'}</p>
                    </div>
                    <div className="sm:col-span-2 p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Special Needs</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.special_needs || 'None'}</p>
                    </div>
                  </div>
                )}

                {/* Guardian Information */}
                {activeTab === 'guardian' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Father's Name</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.guardian_info?.father_name || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Mother's Name</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.guardian_info?.mother_name || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Guardian's Occupation</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.guardian_info?.occupation || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Emergency Contact</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.emergency_contact?.name || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Emergency Phone</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.emergency_contact?.phone || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Relationship</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.emergency_contact?.relationship || 'N/A'}</p>
                    </div>
                  </div>
                )}

                {/* Documents */}
                {activeTab === 'documents' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile.documents && profile.documents.length > 0 ? (
                      profile.documents.map((doc: string, index: number) => (
                        <div key={index} className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{doc}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Document</p>
                          </div>
                          <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all flex-shrink-0">
                            <Download className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-8 text-gray-500 dark:text-gray-400">
                        <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p>No documents uploaded</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Security */}
                {activeTab === 'security' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">User ID</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 font-mono text-xs break-all">{profile.user_id || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Account Status</label>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">2FA Status</label>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Shield className="w-3 h-3" />
                        Enabled
                      </span>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Registered Email</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.email}</p>
                    </div>
                  </div>
                )}

                {/* Transport */}
                {activeTab === 'transport' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Transportation Status</label>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${
                        profile.transportation_status 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {profile.transportation_status ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Pickup Location</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.pickup_location || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-xl">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Bus Route</label>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 truncate">{profile.bus_route_id || 'N/A'}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600"
        >
          <p>© {dayjs().year()} Ebeniza International School. All rights reserved. ✨</p>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentProfile;