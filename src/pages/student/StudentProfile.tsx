// src/pages/student/StudentProfile.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  GraduationCap,
  Download,
  Info,
  Printer,
  Loader2,
  CheckCircle,
  AlertCircle,
  Users,
  Heart,
  FileText,
  UserCheck,
  Shield,
  CalendarDays,
  UserRound,
  Bus,
  ArrowLeft,
  Stethoscope,
  AlertTriangle,
  Upload,
  X,
  Eye,
  FileCheck,
  FolderOpen,
  CloudUpload,
  Home,
  BusFront
} from 'lucide-react';

interface StudentProfileData {
  id: string;
  student_id: string;
  admission_number: string;
  user_id: string | null;
  branch_id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  other_names: string | null;
  gender: string;
  passport_url: string | null;
  date_of_birth: string;
  place_of_birth: string | null;
  nationality: string;
  state_of_origin: string | null;
  lga: string | null;
  religion: string | null;
  blood_group: string | null;
  genotype: string | null;
  email: string | null;
  phone_number: string | null;
  home_address: string;
  residential_address: string | null;
  department: string | null;
  class_id: string | null;
  class_arm: string | null;
  house_id: string | null;
  club_id: string | null;
  admission_date: string;
  admission_status: string;
  current_status: string;
  previous_school: string | null;
  transfer_status: boolean;
  transportation_status: boolean;
  pickup_location: string | null;
  bus_route_id: string | null;
  doctor_name: string | null;
  hospital_name: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  special_needs: string | null;
  guardian_info: any;
  emergency_contact: any;
  created_at: string;
  updated_at: string;
  class_name?: string;
  class_code?: string;
  class_level?: string;
  branch_name?: string;
  house_name?: string;
  house_color?: string;
  house_motto?: string;
  club_name?: string;
  bus_route_name?: string;
}

interface Document {
  id: string;
  student_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string | null;
  uploaded_at: string;
  status: 'pending' | 'approved' | 'rejected';
  metadata: any;
}

const StudentProfile: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [houseDetails, setHouseDetails] = useState<{ id: string; name: string; color: string; motto: string } | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentsEnabled, setDocumentsEnabled] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStudentProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchStudentProfile = async () => {
    setLoading(true);
    try {
      let studentData = null;

      if (user?.id) {
        const { data, error } = await supabase
          .from('students')
          .select(`
            *,
            classes!fk_students_class (
              id,
              name,
              code,
              level,
              class_code
            ),
            branches!fk_students_branch (
              id,
              school_name,
              branch_code,
              address
            ),
            houses!fk_students_house (
              id,
              name,
              color,
              motto
            ),
            clubs!fk_students_club (
              id,
              name
            ),
            bus_routes!fk_students_bus_route (
              id,
              name
            )
          `)
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          studentData = data;
        }
      }

      if (!studentData && user?.email) {
        const { data, error } = await supabase
          .from('students')
          .select(`
            *,
            classes!fk_students_class (
              id,
              name,
              code,
              level,
              class_code
            ),
            branches!fk_students_branch (
              id,
              school_name,
              branch_code,
              address
            ),
            houses!fk_students_house (
              id,
              name,
              color,
              motto
            ),
            clubs!fk_students_club (
              id,
              name
            ),
            bus_routes!fk_students_bus_route (
              id,
              name
            )
          `)
          .eq('email', user.email)
          .single();

        if (!error && data) {
          studentData = data;
        }
      }

      if (!studentData) {
        toast.error('Student profile not found. Please contact school administration.');
        setLoading(false);
        return;
      }

      if (studentData.houses) {
        setHouseDetails({
          id: studentData.houses.id,
          name: studentData.houses.name,
          color: studentData.houses.color || '#6B7280',
          motto: studentData.houses.motto || ''
        });
      } else if (studentData.house_id) {
        const { data: houseData } = await supabase
          .from('houses')
          .select('id, name, color, motto')
          .eq('id', studentData.house_id)
          .single();
        
        if (houseData) {
          setHouseDetails({
            id: houseData.id,
            name: houseData.name,
            color: houseData.color || '#6B7280',
            motto: houseData.motto || ''
          });
        }
      }

      let guardianInfo = studentData.guardian_info;
      let emergencyContact = studentData.emergency_contact;

      if (typeof guardianInfo === 'string') {
        try { guardianInfo = JSON.parse(guardianInfo); } catch (e) { guardianInfo = {}; }
      }
      if (typeof emergencyContact === 'string') {
        try { emergencyContact = JSON.parse(emergencyContact); } catch (e) { emergencyContact = {}; }
      }

      const formattedProfile: StudentProfileData = {
        ...studentData,
        class_name: studentData.classes?.name || 'Not Assigned',
        class_code: studentData.classes?.class_code || studentData.classes?.code || 'N/A',
        class_level: studentData.classes?.level || 'N/A',
        branch_name: studentData.branches?.school_name || 'N/A',
        house_name: studentData.houses?.name || null,
        house_color: studentData.houses?.color || '#6B7280',
        house_motto: studentData.houses?.motto || '',
        club_name: studentData.clubs?.name || null,
        bus_route_name: studentData.bus_routes?.name || null,
        guardian_info: guardianInfo,
        emergency_contact: emergencyContact,
      };

      setProfile(formattedProfile);
      await fetchDocuments(studentData.id);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('student_documents')
        .select('*')
        .eq('student_id', studentId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          setDocumentsEnabled(false);
          setDocuments([]);
          return;
        }
        throw error;
      }
      setDocuments(data || []);
      setDocumentsEnabled(true);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const uploadDocument = async () => {
    if (!selectedFile || !documentType || !profile) {
      toast.error('Please select a file and document type');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}-${selectedFile.name}`;
      const filePath = `student-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        if (uploadError.message?.includes('bucket')) {
          toast.error('Storage bucket not configured. Please contact admin.');
        } else {
          toast.error(uploadError.message || 'Failed to upload file');
        }
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('student-documents')
        .getPublicUrl(filePath);

      const { error: docError } = await supabase
        .from('student_documents')
        .insert([{
          student_id: profile.id,
          document_type: documentType,
          file_name: selectedFile.name,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          uploaded_by: user?.id || null,
          uploaded_at: new Date().toISOString(),
          status: 'pending',
          metadata: {
            description: documentDescription || '',
            uploaded_by_name: user?.email || 'Student',
            uploaded_by_id: user?.id || null
          }
        }]);

      if (docError) {
        await supabase.storage.from('student-documents').remove([filePath]);
        toast.error('Failed to save document record');
        setUploading(false);
        return;
      }

      toast.success('Document uploaded successfully! Waiting for admin approval.');
      setShowUploadModal(false);
      setSelectedFile(null);
      setDocumentType('');
      setDocumentDescription('');
      setUploadProgress(0);
      
      await fetchDocuments(profile.id);
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return dayjs(date).format('MMMM D, YYYY');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      transferred: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      admitted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    return styles[status] || styles.active;
  };

  const getDocumentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return styles[status] || styles.pending;
  };

  const getGenderBadge = (gender: string) => {
    const styles: Record<string, string> = {
      male: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      female: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      other: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return styles[gender] || styles.blue;
  };

  const getLevelBadge = (level: string) => {
    const styles: Record<string, string> = {
      nursery: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      secondary: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      creche: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return styles[level] || styles.primary;
  };

  const getBloodGroupBadge = (bloodGroup: string) => {
    const styles: Record<string, string> = {
      'A+': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'A-': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'B+': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'B-': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'AB+': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'AB-': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'O+': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'O-': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    return styles[bloodGroup] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  };

  const getGuardianField = (field: string) => {
    if (!profile?.guardian_info) return 'N/A';
    return profile.guardian_info[field] || 'N/A';
  };

  const getEmergencyField = (field: string) => {
    if (!profile?.emergency_contact) return 'N/A';
    return profile.emergency_contact[field] || 'N/A';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'personal', label: 'Personal', icon: UserRound },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'guardian', label: 'Guardian', icon: Users },
    { id: 'medical', label: 'Medical', icon: Heart },
    { id: 'transport', label: 'Transport', icon: Bus },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

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

  // ✅ CRITICAL FIX: Check if profile exists before rendering
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center max-w-md mx-auto p-6">
         
  
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Loading...
            </p>
           
          
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link
              to="/student/dashboard"
              className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                My Profile
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                {profile.first_name} {profile.last_name} • {profile.admission_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-xs sm:text-sm"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Print</span>
            </button>
            <button className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-xs sm:text-sm">
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Profile Card - Mobile Responsive */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              
              {/* Avatar - Responsive */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl md:text-4xl font-bold">
                  {profile.passport_url ? (
                    <img src={profile.passport_url} alt={profile.first_name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    `${profile.first_name[0]}${profile.last_name[0]}`
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1">
                  <span className={`px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-xs font-medium ${getStatusBadge(profile.current_status)}`}>
                    {profile.current_status}
                  </span>
                </div>
              </div>

              {/* Info - Responsive */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {profile.first_name} {profile.middle_name || ''} {profile.last_name}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-3 mt-1.5 sm:mt-2">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Admission:</span> {profile.admission_number}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Class:</span> {profile.class_name}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Branch:</span> {profile.branch_name}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-3 mt-1.5 sm:mt-2">
                  {profile.email && (
                    <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate max-w-[120px] sm:max-w-none">
                      <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      {profile.email}
                    </span>
                  )}
                  {profile.phone_number && (
                    <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate max-w-[100px] sm:max-w-none">
                      <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      {profile.phone_number}
                    </span>
                  )}
                  {houseDetails ? (
                    <span 
                      className="flex items-center gap-1 text-xs sm:text-sm font-medium px-1.5 sm:px-2 py-0.5 rounded-full truncate max-w-[120px] sm:max-w-none"
                      style={{ 
                        backgroundColor: houseDetails.color ? `${houseDetails.color}20` : '#6B728020',
                        color: houseDetails.color || '#6B7280'
                      }}
                    >
                      <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                      {houseDetails.name}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Quick Action - Responsive */}
              <div className="flex flex-col gap-1.5 sm:gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => {
                    setActiveTab('documents');
                    setTimeout(() => setShowUploadModal(true), 300);
                  }}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg sm:rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-xs sm:text-sm w-full sm:w-auto"
                >
                  <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Mobile Responsive */}
        <div className="border-b border-gray-200 dark:border-gray-700 mt-4 sm:mt-6 overflow-x-auto">
          <nav className="flex gap-1 sm:gap-4 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 sm:px-3 py-2 sm:py-3 text-[10px] sm:text-sm font-medium capitalize transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-2">
                  <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">{tab.label}</span>
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content - Mobile Responsive */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mt-4 sm:mt-6">
          <div className="p-3 sm:p-4 md:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        Personal Information
                      </h3>
                      <dl className="space-y-2 sm:space-y-3">
                        <div className="flex flex-col xs:flex-row xs:justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700 gap-1 xs:gap-0">
                          <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Full Name</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                            {profile.first_name} {profile.middle_name || ''} {profile.last_name}
                          </dd>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700 gap-1 xs:gap-0">
                          <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Gender</dt>
                          <dd className="text-xs sm:text-sm font-medium">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getGenderBadge(profile.gender)}`}>
                              {profile.gender}
                            </span>
                          </dd>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700 gap-1 xs:gap-0">
                          <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Date of Birth</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            {formatDate(profile.date_of_birth)}
                          </dd>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700 gap-1 xs:gap-0">
                          <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Nationality</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{profile.nationality || 'N/A'}</dd>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700 gap-1 xs:gap-0">
                          <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Blood Group</dt>
                          <dd className="text-xs sm:text-sm font-medium">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getBloodGroupBadge(profile.blood_group || '')}`}>
                              {profile.blood_group || 'N/A'}
                            </span>
                          </dd>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between py-1.5 sm:py-2 gap-1 xs:gap-0">
                          <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Genotype</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{profile.genotype || 'N/A'}</dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                        Contact & Academic
                      </h3>
                      <dl className="space-y-2 sm:space-y-3">
                        <div className="flex flex-col xs:flex-row xs:justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700 gap-1 xs:gap-0">
                          <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Email</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px] xs:max-w-none">{profile.email || 'N/A'}</dd>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700 gap-1 xs:gap-0">
                          <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Phone</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{profile.phone_number || 'N/A'}</dd>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700 gap-1 xs:gap-0">
                          <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Class</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{profile.class_name}</dd>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700 gap-1 xs:gap-0">
                          <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Department</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white capitalize">{profile.department || 'N/A'}</dd>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700 gap-1 xs:gap-0">
                          <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Admission Date</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            {formatDate(profile.admission_date)}
                          </dd>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700 gap-1 xs:gap-0">
                          <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Status</dt>
                          <dd className="text-xs sm:text-sm font-medium">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(profile.current_status)}`}>
                              {profile.current_status}
                            </span>
                          </dd>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between py-1.5 sm:py-2 gap-1 xs:gap-0">
                          <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">House</dt>
                          <dd className="text-xs sm:text-sm font-medium">
                            {houseDetails ? (
                              <span 
                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ 
                                  backgroundColor: houseDetails.color ? `${houseDetails.color}20` : '#6B728020',
                                  color: houseDetails.color || '#6B7280'
                                }}
                              >
                                {houseDetails.name}
                              </span>
                            ) : profile.house_name ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                {profile.house_name}
                              </span>
                            ) : 'N/A'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}

                {/* Personal Tab - Mobile Responsive */}
                {activeTab === 'personal' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                    <InfoField label="First Name" value={profile.first_name} icon={User} />
                    <InfoField label="Last Name" value={profile.last_name} icon={User} />
                    <InfoField label="Middle Name" value={profile.middle_name || 'N/A'} />
                    <InfoField label="Other Names" value={profile.other_names || 'N/A'} />
                    <InfoField label="Place of Birth" value={profile.place_of_birth || 'N/A'} />
                    <InfoField label="LGA" value={profile.lga || 'N/A'} />
                    <InfoField label="Religion" value={profile.religion || 'N/A'} />
                    <InfoField label="Residential Address" value={profile.residential_address || 'Same as home'} />
                    <InfoField label="Home Address" value={profile.home_address} icon={MapPin} fullWidth />
                  </div>
                )}

                {/* Academic Tab - Mobile Responsive */}
                {activeTab === 'academic' && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      Academic Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
                      <InfoCard 
                        title="Class Information" 
                        icon={<BookOpen className="w-4 h-4 text-blue-500" />}
                        items={[
                          { label: 'Class', value: profile.class_name || 'N/A' },
                          { label: 'Class Code', value: profile.class_code || 'N/A' },
                          { label: 'Level', value: profile.class_level || 'N/A', badge: getLevelBadge(profile.class_level || '') },
                          { label: 'Class Arm', value: profile.class_arm || 'N/A' },
                          { label: 'Department', value: profile.department || 'N/A' },
                        ]}
                      />
                      <InfoCard 
                        title="Status" 
                        icon={<Shield className="w-4 h-4 text-green-500" />}
                        items={[
                          { label: 'Admission Status', value: profile.admission_status, badge: getStatusBadge(profile.admission_status) },
                          { label: 'Current Status', value: profile.current_status, badge: getStatusBadge(profile.current_status) },
                          { label: 'Previous School', value: profile.previous_school || 'N/A' },
                          { label: 'Transfer Status', value: profile.transfer_status ? 'Yes' : 'No' },
                        ]}
                      />
                      <InfoCard 
                        title="Dates" 
                        icon={<CalendarDays className="w-4 h-4 text-orange-500" />}
                        items={[
                          { label: 'Admission Date', value: formatDate(profile.admission_date) },
                          { label: 'Date of Birth', value: formatDate(profile.date_of_birth) },
                          { label: 'Created', value: formatDate(profile.created_at) },
                          { label: 'Last Updated', value: formatDate(profile.updated_at) },
                        ]}
                      />
                    </div>
                  </div>
                )}

                {/* Guardian Tab - Mobile Responsive */}
                {activeTab === 'guardian' && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      Guardian & Emergency Contact
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                      <InfoCard 
                        title="Father's Information" 
                        icon={<UserRound className="w-4 h-4 text-blue-500" />}
                        items={[
                          { label: 'Name', value: getGuardianField('father_name') },
                          { label: 'Phone', value: getGuardianField('father_phone') },
                          { label: 'Occupation', value: getGuardianField('father_occupation') },
                        ]}
                      />
                      <InfoCard 
                        title="Mother's Information" 
                        icon={<UserRound className="w-4 h-4 text-pink-500" />}
                        items={[
                          { label: 'Name', value: getGuardianField('mother_name') },
                          { label: 'Phone', value: getGuardianField('mother_phone') },
                          { label: 'Occupation', value: getGuardianField('mother_occupation') },
                        ]}
                      />
                      <InfoCard 
                        title="Guardian Information" 
                        icon={<UserCheck className="w-4 h-4 text-green-500" />}
                        items={[
                          { label: 'Name', value: getGuardianField('guardian_name') },
                          { label: 'Phone', value: getGuardianField('guardian_phone') },
                          { label: 'Relationship', value: getGuardianField('guardian_relationship') },
                        ]}
                      />
                      <InfoCard 
                        title="Emergency Contact" 
                        icon={<AlertCircle className="w-4 h-4 text-red-500" />}
                        items={[
                          { label: 'Name', value: getEmergencyField('name') },
                          { label: 'Phone', value: getEmergencyField('phone') },
                          { label: 'Relationship', value: getEmergencyField('relationship') },
                        ]}
                      />
                    </div>
                  </div>
                )}

                {/* Medical Tab - Mobile Responsive */}
                {activeTab === 'medical' && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                      <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                      Medical Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                      <InfoCard 
                        title="Primary Medical Details" 
                        icon={<Stethoscope className="w-4 h-4 text-blue-500" />}
                        items={[
                          { label: 'Doctor', value: profile.doctor_name || 'N/A' },
                          { label: 'Hospital', value: profile.hospital_name || 'N/A' },
                          { label: 'Blood Group', value: profile.blood_group || 'N/A', badge: getBloodGroupBadge(profile.blood_group || '') },
                          { label: 'Genotype', value: profile.genotype || 'N/A' },
                          { label: 'Allergies', value: profile.allergies || 'None' },
                        ]}
                      />
                      <InfoCard 
                        title="Health Notes" 
                        icon={<AlertTriangle className="w-4 h-4 text-yellow-500" />}
                        items={[
                          { label: 'Medical Conditions', value: profile.medical_conditions || 'None' },
                          { label: 'Special Needs', value: profile.special_needs || 'None' },
                        ]}
                      />
                    </div>
                  </div>
                )}

                {/* Transport Tab - Mobile Responsive */}
                {activeTab === 'transport' && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                      <Bus className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                      Transportation Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                      <InfoCard 
                        title="Transport Information" 
                        icon={<BusFront className="w-4 h-4 text-blue-500" />}
                        items={[
                          { label: 'Transportation', value: profile.transportation_status ? 'Yes ✅' : 'No ❌' },
                          ...(profile.transportation_status ? [
                            { label: 'Pickup Location', value: profile.pickup_location || 'N/A' },
                            { label: 'Bus Route', value: profile.bus_route_name || 'N/A' },
                          ] : []),
                        ]}
                      />
                      <InfoCard 
                        title="House & Club" 
                        icon={<Home className="w-4 h-4 text-green-500" />}
                        items={[
                          { label: 'House', value: houseDetails ? houseDetails.name : profile.house_name || 'N/A' },
                          { label: 'Club', value: profile.club_name || 'N/A' },
                        ]}
                      />
                    </div>
                  </div>
                )}

                {/* Documents Tab - Mobile Responsive */}
                {activeTab === 'documents' && (
                  <div>
                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        My Documents
                      </h3>
                      <button 
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium hover:opacity-90 transition-all w-full xs:w-auto"
                      >
                        <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Upload Document
                      </button>
                    </div>

                    {documents.length === 0 ? (
                      <div className="text-center py-8 sm:py-12">
                        <FolderOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3 sm:mb-4" />
                        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">No documents uploaded</p>
                        <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">
                          Upload your NIN, Birth Certificate, Medical records, and other documents.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {documents.map((doc) => (
                          <DocumentCard key={doc.id} doc={doc} />
                        ))}
                      </div>
                    )}
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
          className="mt-6 sm:mt-8 text-center text-[10px] sm:text-xs text-gray-400 dark:text-gray-600"
        >
          <p>© {dayjs().year()} Built by Ebenezer International School ICT. All rights reserved. ✨</p>
          <p className="mt-0.5 sm:mt-1 text-[8px] sm:text-[10px] text-gray-400 dark:text-gray-500">
            Last updated: {profile.updated_at ? dayjs(profile.updated_at).format('MMM D, YYYY h:mm A') : 'N/A'}
          </p>
        </motion.div>
      </div>

      {/* Upload Document Modal - Mobile Responsive */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowUploadModal(false);
                setSelectedFile(null);
                setDocumentType('');
                setDocumentDescription('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <CloudUpload className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    Upload Document
                  </h3>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFile(null);
                      setDocumentType('');
                      setDocumentDescription('');
                    }}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {/* Document Type */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Document Type *
                    </label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                    >
                      <option value="">Select Document Type</option>
                      <option value="birth_certificate">Birth Certificate</option>
                      <option value="nin">National Identification Number (NIN)</option>
                      <option value="medical_cert">Medical Certificate</option>
                      <option value="passport">Passport Photo</option>
                      <option value="transcript">Transcript</option>
                      <option value="transfer_letter">Transfer Letter</option>
                      <option value="report_card">Report Card</option>
                      <option value="other">Other Document</option>
                    </select>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Select File *
                    </label>
                    <div 
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl p-6 sm:p-8 text-center hover:border-blue-500 transition-all cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                          <FileCheck className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                          <div className="text-left min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">{selectedFile.name}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                            }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-gray-400 mb-1.5 sm:mb-2" />
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Click to upload or drag and drop</p>
                          <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">PDF, JPG, PNG (Max 10MB)</p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={documentDescription}
                      onChange={(e) => setDocumentDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm dark:text-white"
                      placeholder="Add a description for this document..."
                    />
                  </div>

                  {/* Upload Progress */}
                  {uploading && (
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
                        <span className="text-gray-600 dark:text-gray-400">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Info Notice */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2.5 sm:p-3">
                    <p className="text-[10px] sm:text-xs text-yellow-700 dark:text-yellow-300 flex items-start gap-1">
                      <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 mt-0.5" />
                      <span>Your document will be reviewed by the administration. You'll be notified once approved or rejected.</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setShowUploadModal(false);
                        setSelectedFile(null);
                        setDocumentType('');
                        setDocumentDescription('');
                      }}
                      className="flex-1 px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={uploadDocument}
                      disabled={!selectedFile || !documentType || uploading}
                      className="flex-1 px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Upload
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// Helper Components
// ============================================

const InfoField: React.FC<{ label: string; value: string; icon?: any; fullWidth?: boolean }> = ({ label, value, icon: Icon, fullWidth }) => {
  return (
    <div className={`p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl ${fullWidth ? 'sm:col-span-2' : ''}`}>
      <label className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
        {label}
      </label>
      <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white mt-0.5 break-words">{value}</p>
    </div>
  );
};

const InfoCard: React.FC<{ title: string; icon: React.ReactNode; items: Array<{ label: string; value: string; badge?: string }> }> = ({ title, icon, items }) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4">
      <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2 text-sm sm:text-base">
        {icon}
        {title}
      </h4>
      <dl className="space-y-1.5 sm:space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col xs:flex-row xs:justify-between gap-0.5 xs:gap-0">
            <dt className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{item.label}</dt>
            <dd className="text-[10px] sm:text-xs font-medium text-gray-900 dark:text-white">
              {item.badge ? (
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium ${item.badge}`}>
                  {item.value}
                </span>
              ) : item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

const DocumentCard: React.FC<{ doc: Document }> = ({ doc }) => {
  const getDocumentTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      'birth_certificate': FileCheck,
      'nin': Shield,
      'medical_cert': Stethoscope,
      'passport': User,
      'transcript': BookOpen,
      'transfer_letter': FileText,
      'report_card': FileCheck,
      'other': FileText,
    };
    const Icon = icons[type] || FileText;
    return <Icon className="w-4 h-4 sm:w-5 sm:h-5" />;
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'birth_certificate': 'Birth Certificate',
      'nin': 'NIN',
      'medical_cert': 'Medical Certificate',
      'passport': 'Passport',
      'transcript': 'Transcript',
      'transfer_letter': 'Transfer Letter',
      'report_card': 'Report Card',
      'other': 'Other Document',
    };
    return labels[type] || type;
  };

  const getDocumentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return styles[status] || styles.pending;
  };

  return (
    <div className={`bg-gray-50 dark:bg-gray-700/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border hover:shadow-md transition-all ${
      doc.status === 'pending' ? 'border-yellow-200 dark:border-yellow-800' :
      doc.status === 'approved' ? 'border-green-200 dark:border-green-800' :
      'border-red-200 dark:border-red-800'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
          <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
            doc.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30' :
            doc.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30' :
            'bg-yellow-100 dark:bg-yellow-900/30'
          }`}>
            {getDocumentTypeIcon(doc.document_type)}
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[100px] sm:max-w-[150px]">
              {doc.file_name}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 capitalize">
              {getDocumentTypeLabel(doc.document_type)}
            </p>
            <p className="text-[8px] sm:text-[10px] text-gray-400 dark:text-gray-500">
              {(doc.file_size / 1024 / 1024).toFixed(2)} MB • {dayjs(doc.uploaded_at).format('MMM D')}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium ${getDocumentStatusBadge(doc.status)}`}>
            {doc.status === 'pending' ? '⏳' : doc.status === 'approved' ? '✅' : '❌'}
          </span>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-0.5 sm:p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
              title="View"
            >
              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500" />
            </a>
            <a
              href={doc.file_url}
              download={doc.file_name}
              className="p-0.5 sm:p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
              title="Download"
            >
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
            </a>
          </div>
        </div>
      </div>
      {doc.metadata?.description && (
        <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate">
          {doc.metadata.description}
        </p>
      )}
    </div>
  );
};

export default StudentProfile;