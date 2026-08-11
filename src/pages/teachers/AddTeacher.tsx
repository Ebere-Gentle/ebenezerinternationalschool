import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  X,
  Loader2,
  User,
  Briefcase,
  Calendar,
  BookOpen,
  DollarSign,
  Shield,
  Heart,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  AlertCircle,
  GraduationCap,
  Camera,
  UserCircle,
  RefreshCw,
  Scan,
  Fingerprint as FingerprintIcon,
  Mic
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Helper function to generate UUID (since we don't have the actual uuid import)
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface TeacherFormData {
  // Personal Information
  first_name: string;
  last_name: string;
  middle_name: string;
  gender: string;
  date_of_birth: string;
  phone_number: string;
  email: string;
  address: string;
  nationality: string;
  state_of_origin: string;
  lga: string;
  religion: string;
  photo_url: string;
  photo_public_id: string;
  
  // Professional Information
  qualification: string;
  specialization: string;
  department: string;
  position: string;
  is_class_teacher: boolean;
  
  // Experience & Education
  years_of_experience: number;
  previous_school: string;
  highest_qualification: string;
  teaching_certificate: string;
  certificate_number: string;
  certificate_issue_date: string;
  certificate_expiry_date: string;
  trcn_number: string;
  trcn_status: string;
  
  // Subjects & Classes
  subjects_taught: string[];
  class_assigned: string[];
  
  // Salary & Banking
  salary: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  pension_company: string;
  pension_number: string;
  insurance_company: string;
  insurance_number: string;
  
  // Employment Details
  employment_date: string;
  contract_type: string;
  contract_start_date: string;
  contract_end_date: string;
  probation_end_date: string;
  confirmation_date: string;
  
  // Status
  status: string;
  availability: string;
  working_hours: string;
  work_schedule: {
    days: string[];
    start: string;
    end: string;
  };
  
  // Biometrics
  biometrics_enrolled: boolean;
  biometrics_data: {
    fingerprint_template?: string;
    facial_data?: string;
    voice_data?: string;
    enrollment_date?: string;
    last_verified?: string;
    device_id?: string;
  };
  
  // Emergency Contact
  emergency_contact: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
    address: string;
  };
}

const AddTeacher: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isEditing = !!id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    professional: false,
    education: false,
    subjects: false,
    employment: false,
    salary: false,
    status: false,
    emergency: false,
    biometrics: false,
  });
  const [qualificationInput, setQualificationInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [classOptions, setClassOptions] = useState<{ id: string; name: string }[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBiometricsModal, setShowBiometricsModal] = useState(false);
  const [enrollingBiometrics, setEnrollingBiometrics] = useState(false);
  const [biometricsDevice, setBiometricsDevice] = useState('');
  const [formData, setFormData] = useState<TeacherFormData>({
    // Personal Information
    first_name: '',
    last_name: '',
    middle_name: '',
    gender: 'male',
    date_of_birth: '',
    phone_number: '',
    email: '',
    address: '',
    nationality: 'Nigerian',
    state_of_origin: '',
    lga: '',
    religion: 'christianity',
    photo_url: '',
    photo_public_id: '',
    
    // Professional Information
    qualification: '',
    specialization: '',
    department: '',
    position: '',
    is_class_teacher: false,
    
    // Experience & Education
    years_of_experience: 0,
    previous_school: '',
    highest_qualification: '',
    teaching_certificate: '',
    certificate_number: '',
    certificate_issue_date: '',
    certificate_expiry_date: '',
    trcn_number: '',
    trcn_status: '',
    
    // Subjects & Classes
    subjects_taught: [],
    class_assigned: [],
    
    // Salary & Banking
    salary: 0,
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    pension_company: '',
    pension_number: '',
    insurance_company: '',
    insurance_number: '',
    
    // Employment Details
    employment_date: dayjs().format('YYYY-MM-DD'),
    contract_type: 'permanent',
    contract_start_date: dayjs().format('YYYY-MM-DD'),
    contract_end_date: '',
    probation_end_date: '',
    confirmation_date: '',
    
    // Status
    status: 'active',
    availability: 'available',
    working_hours: 'Full-time',
    work_schedule: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      start: '08:00',
      end: '16:00'
    },
    
    // Biometrics
    biometrics_enrolled: false,
    biometrics_data: {
      fingerprint_template: '',
      facial_data: '',
      voice_data: '',
      enrollment_date: '',
      last_verified: '',
      device_id: '',
    },
    
    // Emergency Contact
    emergency_contact: {
      name: '',
      relationship: '',
      phone: '',
      email: '',
      address: ''
    }
  });

  const departments = [
    { value: 'science', label: 'Science' },
    { value: 'arts', label: 'Arts' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'primary', label: 'Primary' },
    { value: 'nursery', label: 'Nursery' },
    { value: 'administration', label: 'Administration' },
    { value: 'sports', label: 'Sports' },
    { value: 'ict', label: 'ICT' },
    { value: 'languages', label: 'Languages' },
    { value: 'vocational', label: 'Vocational' },
  ];

  const contractTypes = [
    { value: 'permanent', label: 'Permanent' },
    { value: 'contract', label: 'Contract' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'casual', label: 'Casual' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'inactive', label: 'Inactive', color: 'red' },
    { value: 'on_leave', label: 'On Leave', color: 'yellow' },
    { value: 'suspended', label: 'Suspended', color: 'orange' },
    { value: 'terminated', label: 'Terminated', color: 'gray' },
  ];

  const availabilityOptions = [
    { value: 'available', label: 'Available', color: 'green' },
    { value: 'on_leave', label: 'On Leave', color: 'yellow' },
    { value: 'busy', label: 'Busy', color: 'orange' },
    { value: 'unavailable', label: 'Unavailable', color: 'red' },
  ];

  const religions = [
    { value: 'christianity', label: 'Christianity' },
    { value: 'islam', label: 'Islam' },
    { value: 'traditional', label: 'Traditional' },
    { value: 'other', label: 'Other' },
    { value: 'none', label: 'None' },
  ];

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    const fetchUserBranch = async () => {
      if (user?.id) {
        try {
          let branchId = user.branch_id;
          
          if (!branchId) {
            const { data, error } = await supabase
              .from('users')
              .select('branch_id')
              .eq('id', user.id)
              .single();
            
            if (!error && data) {
              branchId = data.branch_id;
            }
          }
          
          if (branchId) {
            setUserBranchId(branchId);
            await fetchClasses(branchId);
            if (isEditing) {
              await fetchTeacher(id!);
            }
          }
        } catch (error) {
          console.error('Error fetching user branch:', error);
        }
      }
    };
    
    fetchUserBranch();
  }, [user, id, isEditing]);

  const fetchClasses = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('branch_id', branchId)
        .order('name');

      if (!error && data) {
        setClassOptions(data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchTeacher = async (teacherId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', teacherId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Teacher not found');
          toast.error('Teacher not found');
          navigate('/teachers');
        } else {
          throw error;
        }
        return;
      }

      if (data) {
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          middle_name: data.middle_name || '',
          gender: data.gender || 'male',
          date_of_birth: data.date_of_birth || '',
          phone_number: data.phone_number || '',
          email: data.email || '',
          address: data.address || '',
          nationality: data.nationality || 'Nigerian',
          state_of_origin: data.state_of_origin || '',
          lga: data.lga || '',
          religion: data.religion || 'christianity',
          photo_url: data.photo_url || '',
          photo_public_id: data.photo_public_id || '',
          qualification: data.qualification || '',
          specialization: data.specialization || '',
          department: data.department || '',
          position: data.position || '',
          is_class_teacher: data.is_class_teacher || false,
          years_of_experience: data.years_of_experience || 0,
          previous_school: data.previous_school || '',
          highest_qualification: data.highest_qualification || '',
          teaching_certificate: data.teaching_certificate || '',
          certificate_number: data.certificate_number || '',
          certificate_issue_date: data.certificate_issue_date || '',
          certificate_expiry_date: data.certificate_expiry_date || '',
          trcn_number: data.trcn_number || '',
          trcn_status: data.trcn_status || '',
          subjects_taught: data.subjects_taught || [],
          class_assigned: data.class_assigned || [],
          salary: data.salary || 0,
          bank_name: data.bank_name || '',
          bank_account_number: data.bank_account_number || '',
          bank_account_name: data.bank_account_name || '',
          pension_company: data.pension_company || '',
          pension_number: data.pension_number || '',
          insurance_company: data.insurance_company || '',
          insurance_number: data.insurance_number || '',
          employment_date: data.employment_date || dayjs().format('YYYY-MM-DD'),
          contract_type: data.contract_type || 'permanent',
          contract_start_date: data.contract_start_date || '',
          contract_end_date: data.contract_end_date || '',
          probation_end_date: data.probation_end_date || '',
          confirmation_date: data.confirmation_date || '',
          status: data.status || 'active',
          availability: data.availability || 'available',
          working_hours: data.working_hours || 'Full-time',
          work_schedule: data.work_schedule || {
            days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            start: '08:00',
            end: '16:00'
          },
          biometrics_enrolled: data.biometrics_enrolled || false,
          biometrics_data: data.biometrics_data || {
            fingerprint_template: '',
            facial_data: '',
            voice_data: '',
            enrollment_date: '',
            last_verified: '',
            device_id: '',
          },
          emergency_contact: data.emergency_contact || {
            name: '',
            relationship: '',
            phone: '',
            email: '',
            address: ''
          }
        });

        if (data.photo_url) {
          setPhotoPreview(data.photo_url);
        }
      }
    } catch (error: any) {
      console.error('Error fetching teacher:', error);
      setError(error.message || 'Failed to load teacher data');
      toast.error(error.message || 'Failed to load teacher data');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // HELPER FUNCTIONS FOR DATA CLEANING
  // ============================================
  
  const cleanDataForSubmission = (data: any): any => {
    const cleaned: any = {};

    Object.keys(data).forEach((key) => {
      const value = data[key];
      
      // Handle empty strings - convert to null
      if (value === '' || value === undefined) {
        cleaned[key] = null;
      } 
      // Handle arrays - ensure they're arrays
      else if (Array.isArray(value)) {
        cleaned[key] = value.length > 0 ? value : [];
      }
      // Handle objects - clean nested objects
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = cleanDataForSubmission(value);
      }
      // Handle other values
      else {
        cleaned[key] = value;
      }
    });

    return cleaned;
  };

  const generateEmployeeNumber = async (branchId: string) => {
    const { data, count } = await supabase
      .from('teachers')
      .select('id', { count: 'exact' })
      .eq('branch_id', branchId);

    const nextNumber = (count || 0) + 1;
    return `TCH-${String(nextNumber).padStart(4, '0')}`;
  };

  const generateTeacherId = async (branchId: string) => {
    const { data, count } = await supabase
      .from('teachers')
      .select('id', { count: 'exact' })
      .eq('branch_id', branchId);

    const nextNumber = (count || 0) + 1;
    return `TCH-${dayjs().format('YYYY')}-${String(nextNumber).padStart(4, '0')}`;
  };

  const uploadPhoto = async (file: File): Promise<{ url: string; publicId: string } | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${generateUUID()}.${fileExt}`;
      const filePath = `teachers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('teacher-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('teacher-photos')
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        publicId: filePath
      };
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
      return null;
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo size should be less than 5MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setPhotoFile(file);
      toast.success('Photo selected successfully');
    } catch (error) {
      console.error('Error selecting photo:', error);
      toast.error('Failed to select photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('');
    setFormData({ ...formData, photo_url: '', photo_public_id: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBiometricsEnrollment = async () => {
    if (!biometricsDevice.trim()) {
      toast.error('Please enter a device ID or name');
      return;
    }

    setEnrollingBiometrics(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const enrollmentData = {
        fingerprint_template: `FP_${generateUUID()}`,
        facial_data: `FACE_${generateUUID()}`,
        voice_data: `VOICE_${generateUUID()}`,
        enrollment_date: new Date().toISOString(),
        last_verified: new Date().toISOString(),
        device_id: biometricsDevice,
      };

      setFormData({
        ...formData,
        biometrics_enrolled: true,
        biometrics_data: enrollmentData
      });

      setShowBiometricsModal(false);
      setBiometricsDevice('');
      toast.success('Biometrics enrolled successfully!');
    } catch (error) {
      console.error('Error enrolling biometrics:', error);
      toast.error('Failed to enroll biometrics');
    } finally {
      setEnrollingBiometrics(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userBranchId) {
      toast.error('No branch assigned. Please contact administrator.');
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      let photoUrl = formData.photo_url;
      let photoPublicId = formData.photo_public_id;

      if (photoFile) {
        const uploadResult = await uploadPhoto(photoFile);
        if (uploadResult) {
          photoUrl = uploadResult.url;
          photoPublicId = uploadResult.publicId;
        }
      }

      // Clean the data - convert empty strings to null
      const cleanedFormData = cleanDataForSubmission(formData);

      const teacherData = {
        ...cleanedFormData,
        photo_url: photoUrl,
        photo_public_id: photoPublicId,
        branch_id: userBranchId,
        updated_at: new Date().toISOString(),
        // Ensure date fields are properly handled
        date_of_birth: cleanedFormData.date_of_birth || null,
        employment_date: cleanedFormData.employment_date || null,
        contract_start_date: cleanedFormData.contract_start_date || null,
        contract_end_date: cleanedFormData.contract_end_date || null,
        probation_end_date: cleanedFormData.probation_end_date || null,
        confirmation_date: cleanedFormData.confirmation_date || null,
        certificate_issue_date: cleanedFormData.certificate_issue_date || null,
        certificate_expiry_date: cleanedFormData.certificate_expiry_date || null,
        // Ensure nested objects are properly structured
        emergency_contact: cleanedFormData.emergency_contact || null,
        biometrics_data: cleanedFormData.biometrics_data || null,
        work_schedule: cleanedFormData.work_schedule || null,
      };

      console.log('📤 Saving teacher data:', JSON.stringify(teacherData, null, 2));

      if (isEditing) {
        const { error: updateError } = await supabase
          .from('teachers')
          .update(teacherData)
          .eq('id', id);

        if (updateError) {
          console.error('❌ Supabase error:', updateError);
          
          if (updateError.code === '23505') {
            toast.error('Duplicate record. Please check unique fields like email.');
          } else if (updateError.code === '22007') {
            toast.error('Invalid date format. Please check date fields.');
          } else if (updateError.code === '23502') {
            toast.error('Missing required field. Please fill in all required fields.');
          } else if (updateError.code === '42501') {
            toast.error('Permission denied. Please contact administrator.');
          } else {
            toast.error(updateError.message || 'Failed to update teacher');
          }
          setSaving(false);
          return;
        }

        toast.success('Teacher updated successfully!');
      } else {
        const employeeNumber = await generateEmployeeNumber(userBranchId);
        const teacherId = await generateTeacherId(userBranchId);
        
        const { error: insertError } = await supabase
          .from('teachers')
          .insert([{
            ...teacherData,
            employee_number: employeeNumber,
            teacher_id: teacherId,
            created_at: new Date().toISOString(),
            created_by: user?.id,
          }]);

        if (insertError) {
          console.error('❌ Supabase error:', insertError);
          
          if (insertError.code === '23505') {
            toast.error('Duplicate record. Please check unique fields like email.');
          } else if (insertError.code === '22007') {
            toast.error('Invalid date format. Please check date fields.');
          } else if (insertError.code === '23502') {
            toast.error('Missing required field. Please fill in all required fields.');
          } else if (insertError.code === '42501') {
            toast.error('Permission denied. Please contact administrator.');
          } else {
            toast.error(insertError.message || 'Failed to add teacher');
          }
          setSaving(false);
          return;
        }

        toast.success('Teacher added successfully!');
      }

      navigate('/teachers');
    } catch (error: any) {
      console.error('Error saving teacher:', error);
      setError(error.message || 'Failed to save teacher');
      toast.error(error.message || 'Failed to save teacher');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const addQualification = () => {
    if (qualificationInput.trim()) {
      const current = formData.qualification ? formData.qualification.split(',').filter(Boolean) : [];
      const updated = [...current, qualificationInput.trim()];
      setFormData({ ...formData, qualification: updated.join(', ') });
      setQualificationInput('');
    }
  };

  const removeQualification = (index: number) => {
    const current = formData.qualification ? formData.qualification.split(',').filter(Boolean) : [];
    const updated = current.filter((_, i) => i !== index);
    setFormData({ ...formData, qualification: updated.join(', ') });
  };

  const addSubject = () => {
    if (subjectInput.trim() && !formData.subjects_taught.includes(subjectInput.trim())) {
      setFormData({
        ...formData,
        subjects_taught: [...formData.subjects_taught, subjectInput.trim()]
      });
      setSubjectInput('');
    }
  };

  const removeSubject = (index: number) => {
    setFormData({
      ...formData,
      subjects_taught: formData.subjects_taught.filter((_, i) => i !== index)
    });
  };

  const toggleClass = (classId: string) => {
    setFormData({
      ...formData,
      class_assigned: formData.class_assigned.includes(classId)
        ? formData.class_assigned.filter(id => id !== classId)
        : [...formData.class_assigned, classId]
    });
  };

  const getQualificationList = () => {
    return formData.qualification ? formData.qualification.split(',').filter(Boolean) : [];
  };

  const SectionHeader: React.FC<{
    title: string;
    icon: React.ElementType;
    section: keyof typeof expandedSections;
    color: string;
    count?: number;
  }> = ({ title, icon: Icon, section, color, count }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
        expandedSections[section] 
          ? `bg-gradient-to-r ${color} text-white shadow-lg` 
          : 'bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${expandedSections[section] ? 'bg-white/20' : `bg-gradient-to-br ${color}`}`}>
          <Icon className={`w-5 h-5 ${expandedSections[section] ? 'text-white' : 'text-white'}`} />
        </div>
        <span className={`font-semibold ${expandedSections[section] ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            expandedSections[section] ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
            {count}
          </span>
        )}
      </div>
      {expandedSections[section] ? (
        <ChevronUp className={`w-5 h-5 ${expandedSections[section] ? 'text-white' : 'text-gray-400'}`} />
      ) : (
        <ChevronDown className={`w-5 h-5 ${expandedSections[section] ? 'text-white' : 'text-gray-400'}`} />
      )}
    </button>
  );

  // Show loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading teacher data..." />
      </div>
    );
  }

  // Show error with loading spinner
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading teacher data..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/teachers')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {isEditing ? 'Edit Teacher' : 'Add New Teacher'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {isEditing ? 'Update teacher information' : 'Add a new teacher to your school'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/teachers')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            form="teacher-form"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isEditing ? 'Saving...' : 'Adding...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditing ? 'Update Teacher' : 'Add Teacher'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form */}
      <form id="teacher-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Personal Information with Photo */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden">
          <SectionHeader
            title="Personal Information"
            icon={User}
            section="personal"
            color="from-blue-500 to-cyan-500"
          />
          
          <AnimatePresence>
            {expandedSections.personal && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="p-6 pt-0"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                  {/* Photo Upload */}
                  <div className="md:col-span-1 flex flex-col items-center">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="Teacher"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserCircle className="w-16 h-16 text-gray-400" />
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50"
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </button>
                      {photoPreview && (
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="absolute top-0 right-0 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                      Click camera to upload<br/>Max 5MB (JPG, PNG, WebP)
                    </p>
                  </div>

                  {/* Personal Details */}
                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Middle Name
                      </label>
                      <input
                        type="text"
                        value={formData.middle_name}
                        onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Gender
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone_number}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nationality
                      </label>
                      <input
                        type="text"
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        State of Origin
                      </label>
                      <input
                        type="text"
                        value={formData.state_of_origin}
                        onChange={(e) => setFormData({ ...formData, state_of_origin: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        LGA
                      </label>
                      <input
                        type="text"
                        value={formData.lga}
                        onChange={(e) => setFormData({ ...formData, lga: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Religion
                      </label>
                      <select
                        value={formData.religion}
                        onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      >
                        {religions.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Address
                      </label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 2: Professional Information */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden">
          <SectionHeader
            title="Professional Information"
            icon={Briefcase}
            section="professional"
            color="from-purple-500 to-pink-500"
          />
          
          <AnimatePresence>
            {expandedSections.professional && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="p-6 pt-0"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={isEditing ? formData.employee_id || 'Auto-generated' : 'Auto-generated'}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 cursor-not-allowed dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Position
                    </label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      placeholder="e.g., Senior Teacher, HOD"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Specialization
                    </label>
                    <input
                      type="text"
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      placeholder="e.g., Mathematics, English, Physics"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Class Teacher
                    </label>
                    <div className="flex items-center gap-3 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_class_teacher}
                          onChange={(e) => setFormData({ ...formData, is_class_teacher: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 3: Education & Experience */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden">
          <SectionHeader
            title="Education & Experience"
            icon={GraduationCap}
            section="education"
            color="from-green-500 to-emerald-500"
          />
          
          <AnimatePresence>
            {expandedSections.education && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="p-6 pt-0"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      value={formData.years_of_experience}
                      onChange={(e) => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Previous School
                    </label>
                    <input
                      type="text"
                      value={formData.previous_school}
                      onChange={(e) => setFormData({ ...formData, previous_school: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Highest Qualification
                    </label>
                    <input
                      type="text"
                      value={formData.highest_qualification}
                      onChange={(e) => setFormData({ ...formData, highest_qualification: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      placeholder="e.g., B.Ed, M.Sc, PhD"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Teaching Certificate
                    </label>
                    <input
                      type="text"
                      value={formData.teaching_certificate}
                      onChange={(e) => setFormData({ ...formData, teaching_certificate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      placeholder="e.g., PGDE, NCE"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Certificate Number
                    </label>
                    <input
                      type="text"
                      value={formData.certificate_number}
                      onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Certificate Issue Date
                    </label>
                    <input
                      type="date"
                      value={formData.certificate_issue_date}
                      onChange={(e) => setFormData({ ...formData, certificate_issue_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Certificate Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.certificate_expiry_date}
                      onChange={(e) => setFormData({ ...formData, certificate_expiry_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      TRCN Number
                    </label>
                    <input
                      type="text"
                      value={formData.trcn_number}
                      onChange={(e) => setFormData({ ...formData, trcn_number: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      placeholder="Teachers Registration Council Number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      TRCN Status
                    </label>
                    <select
                      value={formData.trcn_status}
                      onChange={(e) => setFormData({ ...formData, trcn_status: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    >
                      <option value="">Select Status</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="expired">Expired</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 4: Subjects & Classes */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden">
          <SectionHeader
            title="Subjects & Classes"
            icon={BookOpen}
            section="subjects"
            color="from-orange-500 to-amber-500"
            count={formData.subjects_taught.length + formData.class_assigned.length}
          />
          
          <AnimatePresence>
            {expandedSections.subjects && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="p-6 pt-0"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  {/* Subjects */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Subjects Taught
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={subjectInput}
                        onChange={(e) => setSubjectInput(e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                        placeholder="Add subject..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSubject();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addSubject}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.subjects_taught.map((subject, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          {subject}
                          <button
                            type="button"
                            onClick={() => removeSubject(index)}
                            className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Classes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Class Assigned
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {classOptions.map((cls) => (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => toggleClass(cls.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            formData.class_assigned.includes(cls.id)
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ring-2 ring-green-500'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {cls.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 5: Employment Details */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden">
          <SectionHeader
            title="Employment Details"
            icon={Calendar}
            section="employment"
            color="from-indigo-500 to-blue-500"
          />
          
          <AnimatePresence>
            {expandedSections.employment && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="p-6 pt-0"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Employment Date
                    </label>
                    <input
                      type="date"
                      value={formData.employment_date}
                      onChange={(e) => setFormData({ ...formData, employment_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contract Type
                    </label>
                    <select
                      value={formData.contract_type}
                      onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    >
                      {contractTypes.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contract Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.contract_start_date}
                      onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contract End Date
                    </label>
                    <input
                      type="date"
                      value={formData.contract_end_date}
                      onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Probation End Date
                    </label>
                    <input
                      type="date"
                      value={formData.probation_end_date}
                      onChange={(e) => setFormData({ ...formData, probation_end_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirmation Date
                    </label>
                    <input
                      type="date"
                      value={formData.confirmation_date}
                      onChange={(e) => setFormData({ ...formData, confirmation_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 6: Salary & Banking */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden">
          <SectionHeader
            title="Salary & Banking"
            icon={DollarSign}
            section="salary"
            color="from-yellow-500 to-orange-500"
          />
          
          <AnimatePresence>
            {expandedSections.salary && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="p-6 pt-0"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Salary (₦)
                    </label>
                    <input
                      type="number"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account_number}
                      onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bank Account Name
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account_name}
                      onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Pension Company
                    </label>
                    <input
                      type="text"
                      value={formData.pension_company}
                      onChange={(e) => setFormData({ ...formData, pension_company: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Pension Number
                    </label>
                    <input
                      type="text"
                      value={formData.pension_number}
                      onChange={(e) => setFormData({ ...formData, pension_number: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Insurance Company
                    </label>
                    <input
                      type="text"
                      value={formData.insurance_company}
                      onChange={(e) => setFormData({ ...formData, insurance_company: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Insurance Number
                    </label>
                    <input
                      type="text"
                      value={formData.insurance_number}
                      onChange={(e) => setFormData({ ...formData, insurance_number: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 7: Biometrics */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden">
          <SectionHeader
            title="Biometrics"
            icon={FingerprintIcon}
            section="biometrics"
            color="from-teal-500 to-cyan-500"
          />
          
          <AnimatePresence>
            {expandedSections.biometrics && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="p-6 pt-0"
              >
                <div className="pt-4">
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-2xl p-6 border border-teal-100 dark:border-teal-800/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${formData.biometrics_enrolled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                          {formData.biometrics_enrolled ? (
                            <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                          ) : (
                            <FingerprintIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {formData.biometrics_enrolled ? 'Biometrics Enrolled' : 'Biometrics Not Enrolled'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formData.biometrics_enrolled 
                              ? `Enrolled on ${dayjs(formData.biometrics_data?.enrollment_date).format('DD MMM YYYY')}`
                              : 'Enroll biometrics for attendance and verification'}
                          </p>
                        </div>
                      </div>
                      {!isEditing ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          Save teacher first to enroll biometrics
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowBiometricsModal(true)}
                          className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-teal-500/25 flex items-center gap-2"
                        >
                          {formData.biometrics_enrolled ? (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Re-enroll
                            </>
                          ) : (
                            <>
                              <FingerprintIcon className="w-4 h-4" />
                              Enroll Now
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {formData.biometrics_enrolled && formData.biometrics_data && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-teal-200 dark:border-teal-700/30">
                        <div className="flex items-center gap-2 text-sm">
                          <FingerprintIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <span className="text-gray-600 dark:text-gray-300">Fingerprint: {formData.biometrics_data.fingerprint_template ? '✓ Enrolled' : '✗ Not enrolled'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Scan className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <span className="text-gray-600 dark:text-gray-300">Facial: {formData.biometrics_data.facial_data ? '✓ Enrolled' : '✗ Not enrolled'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mic className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <span className="text-gray-600 dark:text-gray-300">Voice: {formData.biometrics_data.voice_data ? '✓ Enrolled' : '✗ Not enrolled'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 8: Status & Availability */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden">
          <SectionHeader
            title="Status & Availability"
            icon={Shield}
            section="status"
            color="from-red-500 to-rose-500"
          />
          
          <AnimatePresence>
            {expandedSections.status && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="p-6 pt-0"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    >
                      {statusOptions.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Availability
                    </label>
                    <select
                      value={formData.availability}
                      onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    >
                      {availabilityOptions.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Working Hours
                    </label>
                    <select
                      value={formData.working_hours}
                      onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Casual">Casual</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Work Schedule
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {weekDays.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const days = formData.work_schedule.days.includes(day)
                              ? formData.work_schedule.days.filter(d => d !== day)
                              : [...formData.work_schedule.days, day];
                            setFormData({
                              ...formData,
                              work_schedule: { ...formData.work_schedule, days }
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            formData.work_schedule.days.includes(day)
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-2 ring-blue-500'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Start Time</label>
                        <input
                          type="time"
                          value={formData.work_schedule.start}
                          onChange={(e) => setFormData({
                            ...formData,
                            work_schedule: { ...formData.work_schedule, start: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">End Time</label>
                        <input
                          type="time"
                          value={formData.work_schedule.end}
                          onChange={(e) => setFormData({
                            ...formData,
                            work_schedule: { ...formData.work_schedule, end: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 9: Emergency Contact */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden">
          <SectionHeader
            title="Emergency Contact"
            icon={Heart}
            section="emergency"
            color="from-pink-500 to-rose-500"
          />
          
          <AnimatePresence>
            {expandedSections.emergency && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="p-6 pt-0"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.emergency_contact.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergency_contact: { ...formData.emergency_contact, name: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Relationship
                    </label>
                    <input
                      type="text"
                      value={formData.emergency_contact.relationship}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergency_contact: { ...formData.emergency_contact, relationship: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.emergency_contact.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergency_contact: { ...formData.emergency_contact, phone: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.emergency_contact.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergency_contact: { ...formData.emergency_contact, email: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address
                    </label>
                    <textarea
                      value={formData.emergency_contact.address}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergency_contact: { ...formData.emergency_contact, address: e.target.value }
                      })}
                      rows={2}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/teachers')}
            className="w-full sm:w-auto px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isEditing ? 'Saving...' : 'Adding...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditing ? 'Update Teacher' : 'Add Teacher'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Biometrics Modal */}
      <AnimatePresence>
        {showBiometricsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FingerprintIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  Enroll Biometrics
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Enter the device ID to enroll teacher's biometrics
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Device ID / Name
                  </label>
                  <input
                    type="text"
                    value={biometricsDevice}
                    onChange={(e) => setBiometricsDevice(e.target.value)}
                    placeholder="e.g., DEV-001, Fingerprint Scanner 1"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>

                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-teal-600 dark:text-teal-400 mt-0.5" />
                    <div className="text-sm text-teal-700 dark:text-teal-300">
                      <p className="font-medium">Biometrics Enrollment Process:</p>
                      <ol className="list-decimal list-inside mt-1 space-y-1">
                        <li>Place finger on the scanner</li>
                        <li>Stand for facial recognition</li>
                        <li>Speak for voice verification</li>
                        <li>Wait for confirmation</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowBiometricsModal(false);
                    setBiometricsDevice('');
                  }}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBiometricsEnrollment}
                  disabled={enrollingBiometrics || !biometricsDevice.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enrollingBiometrics ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <FingerprintIcon className="w-4 h-4" />
                      Enroll Now
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddTeacher;