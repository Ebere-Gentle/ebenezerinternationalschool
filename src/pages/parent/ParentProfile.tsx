// src/pages/parent/ParentProfile.tsx - Complete with Profile Pic, Documents, Payments

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Building,
  Calendar,
  Edit,
  Save,
  X,
  Loader2,
  Key,
  Eye,
  EyeOff,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Users,
  GraduationCap,
  BookOpen,
  Heart,
  Bus,
  Home,
  UserRound,
  CalendarDays,
  AlertTriangle,
  Stethoscope,
  BusFront,
  FileText,
  Download,
  Printer,
  UserCheck,
  Info,
  ChevronDown,
  ChevronRight,
  Menu,
  Settings,
  LogOut,
  ChevronLeft,
  Upload,
  CloudUpload,
  FileCheck,
  FolderOpen,
  Eye as EyeIcon,
  Image,
  CreditCard,
  Wallet,
  Receipt,
  Clock,
  Check,
  XCircle,
  RefreshCw
} from 'lucide-react';

interface ParentProfile {
  id: string;
  parent_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  address: string;
  passport_url: string | null;
  created_at: string;
  updated_at: string;
}

interface StudentProfileData {
  id: string;
  student_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  gender: string;
  passport_url: string | null;
  date_of_birth: string;
  class_id: string | null;
  branch_id: string;
  current_status: string;
  class_name: string;
  class_code: string;
  branch_name: string;
  house_name: string | null;
  house_color: string;
  phone_number: string | null;
  email: string | null;
  home_address: string;
  residential_address: string | null;
  nationality: string;
  state_of_origin: string | null;
  lga: string | null;
  religion: string | null;
  blood_group: string | null;
  genotype: string | null;
  department: string | null;
  class_arm: string | null;
  house_id: string | null;
  club_id: string | null;
  club_name: string | null;
  admission_date: string;
  admission_status: string;
  previous_school: string | null;
  transfer_status: boolean;
  transportation_status: boolean;
  pickup_location: string | null;
  bus_route_id: string | null;
  bus_route_name: string | null;
  doctor_name: string | null;
  hospital_name: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  special_needs: string | null;
  guardian_info: any;
  emergency_contact: any;
  created_at: string;
  updated_at: string;
}

interface PaymentRecord {
  id: string;
  receipt_number: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  status: string;
  assignment_id?: string;
  transaction_reference?: string;
  fee_name?: string;
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

type MobileView = 'profile' | 'children' | 'child-detail';

const ParentProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Parent profile state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [editData, setEditData] = useState<Partial<ParentProfile>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Profile picture
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Children state
  const [children, setChildren] = useState<StudentProfileData[]>([]);
  const [selectedChild, setSelectedChild] = useState<StudentProfileData | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [activeChildTab, setActiveChildTab] = useState('overview');
  
  // Documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  
  // Payments state
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  
  // Mobile responsive state
  const [mobileView, setMobileView] = useState<MobileView>('profile');
  const [isMobile, setIsMobile] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    personal: false,
    academic: false,
    guardian: false,
    medical: false,
    transport: false,
    documents: false,
    payments: false
  });

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setEditData(data);
      await fetchChildren(data.id);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchChildren = async (parentId: string) => {
    setLoadingChildren(true);
    try {
      const { data: childrenData, error: childrenError } = await supabase
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
        .eq('parent_id', parentId)
        .eq('current_status', 'active')
        .order('first_name');

      if (childrenError) throw childrenError;

      const formattedChildren = (childrenData || []).map((child: any) => {
        let guardianInfo = child.guardian_info;
        let emergencyContact = child.emergency_contact;

        if (typeof guardianInfo === 'string') {
          try { guardianInfo = JSON.parse(guardianInfo); } catch (e) { guardianInfo = {}; }
        }
        if (typeof emergencyContact === 'string') {
          try { emergencyContact = JSON.parse(emergencyContact); } catch (e) { emergencyContact = {}; }
        }

        return {
          ...child,
          class_name: child.classes?.name || 'Not Assigned',
          class_code: child.classes?.class_code || child.classes?.code || 'N/A',
          branch_name: child.branches?.school_name || 'N/A',
          house_name: child.houses?.name || null,
          house_color: child.houses?.color || '#6B7280',
          club_name: child.clubs?.name || null,
          bus_route_name: child.bus_routes?.name || null,
          guardian_info: guardianInfo,
          emergency_contact: emergencyContact,
        };
      });

      setChildren(formattedChildren);
      if (formattedChildren.length > 0) {
        setSelectedChild(formattedChildren[0]);
        await fetchDocuments(formattedChildren[0].id);
        await fetchPayments(formattedChildren[0].id);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      toast.error('Failed to load children data');
    } finally {
      setLoadingChildren(false);
    }
  };

  // ============================================
  // PROFILE PICTURE FUNCTIONS
  // ============================================
  
  const uploadProfilePicture = async (file: File) => {
    if (!profile) return;
    
    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/profile-${Date.now()}.${fileExt}`;
      const filePath = `parent-profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('parent-profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('parent-profiles')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('parents')
        .update({ passport_url: urlData.publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, passport_url: urlData.publicUrl });
      toast.success('Profile picture updated!');
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    uploadProfilePicture(file);
    e.target.value = '';
  };

  // ============================================
  // DOCUMENT FUNCTIONS
  // ============================================
  
  const fetchDocuments = async (studentId: string) => {
    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from('student_documents')
        .select('*')
        .eq('student_id', studentId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          setDocuments([]);
          return;
        }
        throw error;
      }
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile || !documentType || !selectedChild) {
      toast.error('Please select a file and document type');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${selectedChild.id}/${Date.now()}-${selectedFile.name}`;
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
          student_id: selectedChild.id,
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
            uploaded_by_name: user?.email || 'Parent',
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
      
      await fetchDocuments(selectedChild.id);
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  // ============================================
  // PAYMENT FUNCTIONS
  // ============================================
  
  const fetchPayments = async (studentId: string) => {
    setLoadingPayments(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  // ============================================
  // PROFILE UPDATE FUNCTIONS
  // ============================================
  
  const updateProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('parents')
        .update({
          first_name: editData.first_name,
          last_name: editData.last_name,
          phone_number: editData.phone_number,
          address: editData.address,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile?.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      await fetchProfile();
    } catch (error: any) {
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
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return dayjs(date).format('MMMM D, YYYY');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      transferred: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      admitted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
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
    return styles[gender] || 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300';
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
    return styles[bloodGroup] || 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300';
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'birth_certificate': 'Birth Certificate',
      'nin': 'National ID (NIN)',
      'medical_cert': 'Medical Certificate',
      'passport': 'Passport Photo',
      'transcript': 'Transcript',
      'transfer_letter': 'Transfer Letter',
      'report_card': 'Report Card',
      'other': 'Other Document',
    };
    return labels[type] || type;
  };

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
    return icons[type] || FileText;
  };

  const getGuardianField = (field: string) => {
    if (!selectedChild?.guardian_info) return 'N/A';
    return selectedChild.guardian_info[field] || 'N/A';
  };

  const getEmergencyField = (field: string) => {
    if (!selectedChild?.emergency_contact) return 'N/A';
    return selectedChild.emergency_contact[field] || 'N/A';
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleChildSelect = async (child: StudentProfileData) => {
    setSelectedChild(child);
    await fetchDocuments(child.id);
    await fetchPayments(child.id);
    setActiveChildTab('overview');
    if (isMobile) {
      setMobileView('child-detail');
    }
  };

  const childTabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'personal', label: 'Personal', icon: UserRound },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'guardian', label: 'Guardian', icon: Users },
    { id: 'medical', label: 'Medical', icon: Heart },
    { id: 'transport', label: 'Transport', icon: Bus },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    );
  }

  // Continue in next part due to length...
  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-6 pb-20 sm:pb-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <button
          onClick={() => {
            if (mobileView === 'child-detail') {
              setMobileView('children');
            } else {
              navigate('/parent/dashboard');
            }
          }}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all touch-manipulation"
        >
          {mobileView === 'child-detail' ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ArrowLeft className="w-5 h-5" />
          )}
        </button>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
          {mobileView === 'child-detail' && selectedChild ? (
            <span className="flex items-center gap-2">
              <span>{selectedChild.first_name}'s Profile</span>
              <span className="text-xs font-normal text-gray-500">({selectedChild.class_name})</span>
            </span>
          ) : mobileView === 'children' ? (
            'My Children'
          ) : (
            'My Profile'
          )}
        </h1>
      </div>

      {/* Profile View */}
      {(mobileView === 'profile' || !isMobile) && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Profile Picture with Upload */}
                  <div className="relative group">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xl sm:text-2xl font-bold overflow-hidden flex-shrink-0">
                      {profile?.passport_url ? (
                        <img src={profile.passport_url} alt={profile.first_name} className="w-full h-full object-cover" />
                      ) : (
                        `${profile?.first_name?.[0]}${profile?.last_name?.[0]}`
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="absolute -bottom-1 -right-1 p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all shadow-lg disabled:opacity-50 touch-manipulation"
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Camera className="w-3 h-3" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                      {profile?.first_name} {profile?.last_name}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{profile?.parent_id}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Parent Account
                    </p>
                  </div>
                </div>
                {!isEditing && !isEditingPassword && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-2 text-sm touch-manipulation"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden xs:inline">Edit</span>
                  </button>
                )}
              </div>
            </div>

            {/* Profile Content - same as before but with profile pic */}
            <div className="p-4 sm:p-6">
              {!isEditing && !isEditingPassword ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                  <ProfileField label="First Name" value={profile?.first_name} />
                  <ProfileField label="Last Name" value={profile?.last_name} />
                  <ProfileField label="Email" value={profile?.email} icon={Mail} />
                  <ProfileField label="Phone" value={profile?.phone_number} icon={Phone} />
                  <ProfileField label="Address" value={profile?.address || 'Not set'} icon={MapPin} fullWidth />
                  <ProfileField label="Parent ID" value={profile?.parent_id} />
                  <ProfileField label="Member Since" value={formatDate(profile?.created_at)} icon={Calendar} />
                </div>
              ) : isEditing ? (
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <InputField
                      label="First Name"
                      value={editData.first_name || ''}
                      onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                    />
                    <InputField
                      label="Last Name"
                      value={editData.last_name || ''}
                      onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                    />
                    <InputField
                      label="Phone"
                      type="tel"
                      value={editData.phone_number || ''}
                      onChange={(e) => setEditData({ ...editData, phone_number: e.target.value })}
                    />
                    <InputField
                      label="Address"
                      value={editData.address || ''}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditData(profile || {});
                      }}
                      className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm touch-manipulation"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updateProfile}
                      disabled={saving}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm touch-manipulation"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Change Password Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mt-4 sm:mt-6">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Change Password</h3>
                </div>
                {!isEditingPassword && (
                  <button
                    onClick={() => setIsEditingPassword(true)}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-xl font-medium hover:bg-yellow-600 transition-all text-sm touch-manipulation"
                  >
                    Change Password
                  </button>
                )}
              </div>

              <AnimatePresence>
                {isEditingPassword && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-3"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all dark:text-white pr-10 text-sm"
                          placeholder="Min 6 characters"
                        />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 touch-manipulation"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all dark:text-white text-sm"
                      />
                    </div>
                    <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 pt-2">
                      <button
                        onClick={() => {
                          setIsEditingPassword(false);
                          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        }}
                        className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm touch-manipulation"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={updatePassword}
                        disabled={saving}
                        className="flex-1 px-4 py-2.5 bg-yellow-500 text-white rounded-xl font-medium hover:bg-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm touch-manipulation"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                        Update Password
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Children Quick Access */}
          {children.length > 0 && (
            <div className="mt-4 sm:mt-6">
              <button
                onClick={() => isMobile ? setMobileView('children') : setMobileView('children')}
                className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl transition-all touch-manipulation"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        My Children
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {children.length} child{children.length > 1 ? 'ren' : ''} registered
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                  {children.map((child) => (
                    <div key={child.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                        {child.passport_url ? (
                          <img src={child.passport_url} alt={child.first_name} className="w-full h-full object-cover" />
                        ) : (
                          `${child.first_name[0]}${child.last_name[0]}`
                        )}
                      </div>
                      <span className="text-[8px] text-gray-500 dark:text-gray-400 truncate max-w-[40px]">
                        {child.first_name}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            </div>
          )}
        </>
      )}

      {/* Children List View */}
      {(mobileView === 'children' && isMobile) && (
        <div className="space-y-3">
          {children.map((child) => (
            <motion.div
              key={child.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => handleChildSelect(child)}
                className="w-full p-4 text-left touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                    {child.passport_url ? (
                      <img src={child.passport_url} alt={child.first_name} className="w-full h-full object-cover" />
                    ) : (
                      `${child.first_name[0]}${child.last_name[0]}`
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {child.first_name} {child.last_name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="truncate max-w-[80px]">{child.class_name}</span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium ${getStatusBadge(child.current_status)}`}>
                        {child.current_status}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{child.admission_number}</p>
                    <p className="text-[8px] text-gray-500 dark:text-gray-400">Admission</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white capitalize">{child.gender}</p>
                    <p className="text-[8px] text-gray-500 dark:text-gray-400">Gender</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{child.house_name || 'N/A'}</p>
                    <p className="text-[8px] text-gray-500 dark:text-gray-400">House</p>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Child Detail View */}
      {(mobileView === 'child-detail' && isMobile && selectedChild) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Child Header with Profile Pic */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden">
                {selectedChild.passport_url ? (
                  <img src={selectedChild.passport_url} alt={selectedChild.first_name} className="w-full h-full object-cover" />
                ) : (
                  `${selectedChild.first_name[0]}${selectedChild.last_name[0]}`
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                  {selectedChild.first_name} {selectedChild.last_name}
                </h3>
                <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="truncate max-w-[80px]">{selectedChild.class_name}</span>
                  <span>•</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium ${getStatusBadge(selectedChild.current_status)}`}>
                    {selectedChild.current_status}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{selectedChild.admission_number}</p>
              </div>
            </div>
          </div>

          {/* Child Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <div className="flex gap-1 px-2 min-w-max">
              {childTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveChildTab(tab.id)}
                  className={`px-2.5 py-2.5 text-[10px] sm:text-xs font-medium capitalize transition-all whitespace-nowrap touch-manipulation ${
                    activeChildTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <tab.icon className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">{tab.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Child Content */}
          <div className="p-3 sm:p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeChildTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                {/* Overview Tab */}
                {activeChildTab === 'overview' && (
                  <div className="space-y-2">
                    <AccordionSection
                      title="Personal Information"
                      icon={<User className="w-4 h-4 text-blue-500" />}
                      isExpanded={expandedSections.overview}
                      onToggle={() => toggleSection('overview')}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <InfoItem label="Full Name" value={`${selectedChild.first_name} ${selectedChild.middle_name || ''} ${selectedChild.last_name}`} />
                        <InfoItem label="Gender" value={selectedChild.gender} badge={getGenderBadge(selectedChild.gender)} />
                        <InfoItem label="Date of Birth" value={formatDate(selectedChild.date_of_birth)} />
                        <InfoItem label="Nationality" value={selectedChild.nationality || 'N/A'} />
                        <InfoItem label="Blood Group" value={selectedChild.blood_group || 'N/A'} badge={getBloodGroupBadge(selectedChild.blood_group || '')} />
                        <InfoItem label="Genotype" value={selectedChild.genotype || 'N/A'} />
                      </div>
                    </AccordionSection>

                    <AccordionSection
                      title="Contact & Academic"
                      icon={<MapPin className="w-4 h-4 text-green-500" />}
                      isExpanded={expandedSections.academic}
                      onToggle={() => toggleSection('academic')}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <InfoItem label="Email" value={selectedChild.email || 'N/A'} />
                        <InfoItem label="Phone" value={selectedChild.phone_number || 'N/A'} />
                        <InfoItem label="Class" value={selectedChild.class_name} />
                        <InfoItem label="Department" value={selectedChild.department || 'N/A'} />
                        <InfoItem label="House" value={selectedChild.house_name || 'N/A'} />
                        <InfoItem label="Admission Date" value={formatDate(selectedChild.admission_date)} />
                      </div>
                    </AccordionSection>
                  </div>
                )}

                {/* Personal Tab */}
                {activeChildTab === 'personal' && (
                  <div className="grid grid-cols-1 gap-2">
                    <InfoItem label="First Name" value={selectedChild.first_name} />
                    <InfoItem label="Last Name" value={selectedChild.last_name} />
                    <InfoItem label="Middle Name" value={selectedChild.middle_name || 'N/A'} />
                    <InfoItem label="Other Names" value={selectedChild.other_names || 'N/A'} />
                    <InfoItem label="Place of Birth" value={selectedChild.place_of_birth || 'N/A'} />
                    <InfoItem label="LGA" value={selectedChild.lga || 'N/A'} />
                    <InfoItem label="Religion" value={selectedChild.religion || 'N/A'} />
                    <InfoItem label="Residential Address" value={selectedChild.residential_address || 'Same as home'} fullWidth />
                    <InfoItem label="Home Address" value={selectedChild.home_address} fullWidth />
                  </div>
                )}

                {/* Academic Tab */}
                {activeChildTab === 'academic' && (
                  <div className="grid grid-cols-1 gap-2">
                    <InfoItem label="Class" value={selectedChild.class_name} />
                    <InfoItem label="Class Code" value={selectedChild.class_code} />
                    <InfoItem label="Class Arm" value={selectedChild.class_arm || 'N/A'} />
                    <InfoItem label="Department" value={selectedChild.department || 'N/A'} />
                    <InfoItem label="Admission Status" value={selectedChild.admission_status} badge={getStatusBadge(selectedChild.admission_status)} />
                    <InfoItem label="Current Status" value={selectedChild.current_status} badge={getStatusBadge(selectedChild.current_status)} />
                    <InfoItem label="Previous School" value={selectedChild.previous_school || 'N/A'} />
                    <InfoItem label="Transfer Status" value={selectedChild.transfer_status ? 'Yes' : 'No'} />
                    <InfoItem label="Admission Date" value={formatDate(selectedChild.admission_date)} />
                    <InfoItem label="Date of Birth" value={formatDate(selectedChild.date_of_birth)} />
                  </div>
                )}

                {/* Guardian Tab */}
                {activeChildTab === 'guardian' && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                        <UserRound className="w-4 h-4 text-blue-500" />
                        Father's Information
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoItem label="Name" value={getGuardianField('father_name')} />
                        <InfoItem label="Phone" value={getGuardianField('father_phone')} />
                        <InfoItem label="Occupation" value={getGuardianField('father_occupation')} fullWidth />
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                        <UserRound className="w-4 h-4 text-pink-500" />
                        Mother's Information
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoItem label="Name" value={getGuardianField('mother_name')} />
                        <InfoItem label="Phone" value={getGuardianField('mother_phone')} />
                        <InfoItem label="Occupation" value={getGuardianField('mother_occupation')} fullWidth />
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                        <UserCheck className="w-4 h-4 text-green-500" />
                        Guardian Information
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoItem label="Name" value={getGuardianField('guardian_name')} />
                        <InfoItem label="Phone" value={getGuardianField('guardian_phone')} />
                        <InfoItem label="Relationship" value={getGuardianField('guardian_relationship')} fullWidth />
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        Emergency Contact
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoItem label="Name" value={getEmergencyField('name')} />
                        <InfoItem label="Phone" value={getEmergencyField('phone')} />
                        <InfoItem label="Relationship" value={getEmergencyField('relationship')} fullWidth />
                      </div>
                    </div>
                  </div>
                )}

                {/* Medical Tab */}
                {activeChildTab === 'medical' && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                        <Stethoscope className="w-4 h-4 text-blue-500" />
                        Medical Details
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoItem label="Doctor" value={selectedChild.doctor_name || 'N/A'} />
                        <InfoItem label="Hospital" value={selectedChild.hospital_name || 'N/A'} />
                        <InfoItem label="Blood Group" value={selectedChild.blood_group || 'N/A'} badge={getBloodGroupBadge(selectedChild.blood_group || '')} />
                        <InfoItem label="Genotype" value={selectedChild.genotype || 'N/A'} />
                        <InfoItem label="Allergies" value={selectedChild.allergies || 'None'} fullWidth />
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        Health Notes
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        <InfoItem label="Medical Conditions" value={selectedChild.medical_conditions || 'None'} fullWidth />
                        <InfoItem label="Special Needs" value={selectedChild.special_needs || 'None'} fullWidth />
                      </div>
                    </div>
                  </div>
                )}

                {/* Transport Tab */}
                {activeChildTab === 'transport' && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                        <BusFront className="w-4 h-4 text-blue-500" />
                        Transport Information
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoItem label="Transportation" value={selectedChild.transportation_status ? 'Yes ✅' : 'No ❌'} fullWidth />
                        {selectedChild.transportation_status && (
                          <>
                            <InfoItem label="Pickup Location" value={selectedChild.pickup_location || 'N/A'} fullWidth />
                            <InfoItem label="Bus Route" value={selectedChild.bus_route_name || 'N/A'} fullWidth />
                          </>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                        <Home className="w-4 h-4 text-green-500" />
                        House & Club
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoItem label="House" value={selectedChild.house_name || 'N/A'} />
                        <InfoItem label="Club" value={selectedChild.club_name || 'N/A'} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents Tab */}
                {activeChildTab === 'documents' && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        Documents ({documents.length})
                      </h4>
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-all flex items-center gap-1 touch-manipulation"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload
                      </button>
                    </div>

                    {loadingDocuments ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      </div>
                    ) : documents.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                        <FolderOpen className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No documents uploaded</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Upload documents for your child</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <DocumentCard key={doc.id} doc={doc} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Payments Tab */}
                {activeChildTab === 'payments' && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                      <CreditCard className="w-4 h-4 text-green-500" />
                      Payment History
                    </h4>

                    {loadingPayments ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      </div>
                    ) : payments.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                        <Wallet className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No payment history</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Payments will appear here once made</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {payments.map((payment) => (
                          <PaymentCard key={payment.id} payment={payment} formatCurrency={formatCurrency} getStatusBadge={getStatusBadge} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal
            onClose={() => {
              setShowUploadModal(false);
              setSelectedFile(null);
              setDocumentType('');
              setDocumentDescription('');
            }}
            onUpload={uploadDocument}
            selectedFile={selectedFile}
            documentType={documentType}
            documentDescription={documentDescription}
            setDocumentType={setDocumentType}
            setDocumentDescription={setDocumentDescription}
            setSelectedFile={setSelectedFile}
            uploading={uploading}
            uploadProgress={uploadProgress}
            fileInputRef={docFileInputRef}
          />
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 px-2 py-1 flex items-center justify-around shadow-lg pb-safe">
          <button
            onClick={() => setMobileView('profile')}
            className={`flex flex-col items-center p-2 rounded-xl transition-all touch-manipulation ${
              mobileView === 'profile' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Profile</span>
          </button>
          {children.length > 0 && (
            <button
              onClick={() => setMobileView('children')}
              className={`flex flex-col items-center p-2 rounded-xl transition-all touch-manipulation relative ${
                mobileView === 'children' || mobileView === 'child-detail'
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Children</span>
              {children.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center">
                  {children.length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => navigate('/parent/settings')}
            className="flex flex-col items-center p-2 rounded-xl transition-all text-gray-500 dark:text-gray-400 touch-manipulation"
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Settings</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================
// Helper Components
// ============================================

const Camera = (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ProfileField: React.FC<{ label: string; value?: string; icon?: any; fullWidth?: boolean }> = ({ label, value, icon: Icon, fullWidth }) => {
  return (
    <div className={`${fullWidth ? 'col-span-1 sm:col-span-2' : ''}`}>
      <label className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3 sm:w-4 sm:h-4" />}
        {label}
      </label>
      <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white mt-0.5 break-words">{value || 'N/A'}</p>
    </div>
  );
};

const InputField: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string }> = ({ label, value, onChange, type = 'text' }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white text-sm"
      />
    </div>
  );
};

const InfoItem: React.FC<{ label: string; value: string; badge?: string; fullWidth?: boolean }> = ({ label, value, badge, fullWidth }) => {
  return (
    <div className={`${fullWidth ? 'col-span-2' : ''}`}>
      <label className="text-[10px] text-gray-500 dark:text-gray-400">{label}</label>
      <div className="mt-0.5">
        {badge ? (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${badge}`}>
            {value}
          </span>
        ) : (
          <p className="text-xs font-medium text-gray-900 dark:text-white break-words">{value}</p>
        )}
      </div>
    </div>
  );
};

const AccordionSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, icon, isExpanded, onToggle, children }) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left touch-manipulation"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3 pb-3"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
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
    return <Icon className="w-4 h-4" />;
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
    <div className={`bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border ${
      doc.status === 'pending' ? 'border-yellow-200 dark:border-yellow-800' :
      doc.status === 'approved' ? 'border-green-200 dark:border-green-800' :
      'border-red-200 dark:border-red-800'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div className={`p-1.5 rounded-lg flex-shrink-0 ${
            doc.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30' :
            doc.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30' :
            'bg-yellow-100 dark:bg-yellow-900/30'
          }`}>
            {getDocumentTypeIcon(doc.document_type)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{doc.file_name}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">{getDocumentTypeLabel(doc.document_type)}</p>
            <p className="text-[8px] text-gray-400 dark:text-gray-500">
              {(doc.file_size / 1024 / 1024).toFixed(2)} MB • {dayjs(doc.uploaded_at).format('MMM D')}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium ${getDocumentStatusBadge(doc.status)}`}>
            {doc.status === 'pending' ? '⏳' : doc.status === 'approved' ? '✅' : '❌'}
          </span>
          <div className="flex items-center gap-0.5">
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all">
              <EyeIcon className="w-3 h-3 text-blue-500" />
            </a>
            <a href={doc.file_url} download={doc.file_name} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all">
              <Download className="w-3 h-3 text-green-500" />
            </a>
          </div>
        </div>
      </div>
      {doc.metadata?.description && (
        <p className="text-[8px] text-gray-500 dark:text-gray-400 mt-1 truncate">{doc.metadata.description}</p>
      )}
    </div>
  );
};

const PaymentCard: React.FC<{ payment: PaymentRecord; formatCurrency: (amount: number) => string; getStatusBadge: (status: string) => string }> = ({ 
  payment, 
  formatCurrency, 
  getStatusBadge 
}) => {
  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'pending': return <Clock className="w-3.5 h-3.5 text-yellow-500" />;
      case 'failed': return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'cancelled': return <XCircle className="w-3.5 h-3.5 text-gray-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Receipt className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
              {payment.receipt_number || 'Payment'}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {dayjs(payment.payment_date).format('MMM D, YYYY h:mm A')}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {formatCurrency(payment.amount_paid)}
          </p>
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-medium ${getStatusBadge(payment.status)}`}>
            {getPaymentStatusIcon(payment.status)}
            <span className="capitalize">{payment.status}</span>
          </span>
        </div>
      </div>
      {payment.fee_name && (
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate">
          {payment.fee_name} • {payment.payment_method?.replace(/_/g, ' ').toUpperCase()}
        </p>
      )}
    </div>
  );
};

const UploadModal: React.FC<{
  onClose: () => void;
  onUpload: () => void;
  selectedFile: File | null;
  documentType: string;
  documentDescription: string;
  setDocumentType: (val: string) => void;
  setDocumentDescription: (val: string) => void;
  setSelectedFile: (val: File | null) => void;
  uploading: boolean;
  uploadProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
}> = ({
  onClose,
  onUpload,
  selectedFile,
  documentType,
  documentDescription,
  setDocumentType,
  setDocumentDescription,
  setSelectedFile,
  uploading,
  uploadProgress,
  fileInputRef,
}) => {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all touch-manipulation"
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
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded touch-manipulation"
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
                  onChange={handleFileSelect}
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
                  <span className="text-gray-600 dark:text-gray-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
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
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2.5">
              <p className="text-[10px] text-yellow-700 dark:text-yellow-300 flex items-start gap-1">
                <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>Your document will be reviewed by the administration. You'll be notified once approved or rejected.</span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col xs:flex-row gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={onUpload}
                disabled={!selectedFile || !documentType || uploading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm touch-manipulation"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ParentProfile;
