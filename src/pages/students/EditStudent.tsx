import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, 
  Save, 
  X, 
  Loader2,
  User,
  Mail,
  Bus,
  GraduationCap,
  Users,
  Heart,
  AlertCircle,
  Phone,
  MapPin,
  Calendar,
  Globe,
  Home,
  Stethoscope,
  Pill,
  HelpCircle,
  Building,
  Lock,
  Notebook,
  FileText,
  Camera,
  QrCode,
  Barcode,
  File,
  UserCheck,
  UserX,
  UserCog,
  BookOpen,
  School,
  Bus as BusIcon,
  Home as HomeIcon,
  PlusCircle
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

// Zod schema matching your actual database columns
const studentEditSchema = z.object({
  // Primary & IDs
  id: z.string().optional(),
  student_id: z.string().optional(),
  admission_number: z.string().optional(),
  user_id: z.string().nullable().optional(),
  branch_id: z.string().nullable().optional(),
  session_id: z.string().nullable().optional(),
  parent_id: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  
  // Personal Information
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  middle_name: z.string().nullable().optional(),
  other_names: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).default('male'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  place_of_birth: z.string().nullable().optional(),
  nationality: z.string().default('Nigerian'),
  state_of_origin: z.string().nullable().optional(),
  lga: z.string().nullable().optional(),
  religion: z.string().nullable().optional(),
  blood_group: z.string().nullable().optional(),
  genotype: z.string().nullable().optional(),
  passport_url: z.string().nullable().optional(),
  
  // Contact Information
  email: z.string().email('Invalid email format').nullable().optional(),
  phone_number: z.string().nullable().optional(),
  home_address: z.string().min(1, 'Home address is required'),
  residential_address: z.string().nullable().optional(),
  
  // Academic Information
  department: z.string().nullable().optional(),
  class_id: z.string().nullable().optional(),
  class_arm: z.string().nullable().optional(),
  house_id: z.string().nullable().optional(),
  club_id: z.string().nullable().optional(),
  admission_date: z.string().min(1, 'Admission date is required'),
  admission_status: z.enum(['pending', 'admitted', 'rejected', 'withdrawn']).default('pending'),
  current_status: z.enum(['active', 'inactive', 'transferred', 'suspended']).default('active'),
  previous_school: z.string().nullable().optional(),
  transfer_status: z.boolean().default(false),
  
  // Transportation
  transportation_status: z.boolean().default(false),
  pickup_location: z.string().nullable().optional(),
  bus_route_id: z.string().nullable().optional(),
  
  // Medical Information
  doctor_name: z.string().nullable().optional(),
  hospital_name: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  medical_conditions: z.string().nullable().optional(),
  special_needs: z.string().nullable().optional(),
  medical_info: z.any().nullable().optional(),
  
  // Guardian Info (stored as JSONB)
  guardian_info: z.any().nullable().optional(),
  emergency_contact: z.any().nullable().optional(),
  
  // Documents & Metadata
  documents: z.any().nullable().optional(),
  metadata: z.any().nullable().optional(),
  
  // QR/Barcode
  qr_code_data: z.string().nullable().optional(),
  barcode_data: z.string().nullable().optional(),
  
  // Guardian fields (mapped to guardian_info JSONB)
  father_name: z.string().nullable().optional(),
  father_phone: z.string().nullable().optional(),
  father_email: z.string().nullable().optional(),
  father_occupation: z.string().nullable().optional(),
  mother_name: z.string().nullable().optional(),
  mother_phone: z.string().nullable().optional(),
  mother_email: z.string().nullable().optional(),
  mother_occupation: z.string().nullable().optional(),
  guardian_name: z.string().nullable().optional(),
  guardian_phone: z.string().nullable().optional(),
  guardian_email: z.string().nullable().optional(),
  guardian_address: z.string().nullable().optional(),
  guardian_relationship: z.string().nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional(),
  
  // Additional notes
  student_bio: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
});

type StudentEditFormData = z.infer<typeof studentEditSchema>;

interface Student extends StudentEditFormData {
  id: string;
  student_id: string;
  admission_number: string;
  passport_url: string | null;
  branch_id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  admission_status: string;
  current_status: string;
  session_id: string | null;
  created_by: string | null;
  metadata: any;
  guardian_info: any;
  emergency_contact: any;
  medical_info: any;
  qr_code_data: string | null;
  barcode_data: string | null;
  documents: any;
  house_id: string | null;
  club_id: string | null;
  bus_route_id: string | null;
  parent_id: string | null;
}

const EditStudent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; code: string; level: string; class_code: string }>>([]);
  const [houses, setHouses] = useState<Array<{ id: string; name: string }>>([]);
  const [clubs, setClubs] = useState<Array<{ id: string; name: string }>>([]);
  const [busRoutes, setBusRoutes] = useState<Array<{ id: string; name: string }>>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StudentEditFormData>({
    resolver: zodResolver(studentEditSchema),
    defaultValues: {
      gender: 'male',
      nationality: 'Nigerian',
      current_status: 'active',
      admission_status: 'pending',
      transportation_status: false,
      transfer_status: false,
      admission_date: dayjs().format('YYYY-MM-DD'),
      medical_info: {},
      guardian_info: {},
      emergency_contact: {},
      documents: [],
      metadata: {},
      session_id: null,
      parent_id: null,
      created_by: null,
      middle_name: null,
      other_names: null,
      place_of_birth: null,
      state_of_origin: null,
      lga: null,
      religion: null,
      blood_group: null,
      genotype: null,
      email: null,
      phone_number: null,
      residential_address: null,
      department: null,
      class_id: null,
      class_arm: null,
      house_id: null,
      club_id: null,
      previous_school: null,
      pickup_location: null,
      bus_route_id: null,
      doctor_name: null,
      hospital_name: null,
      allergies: null,
      medical_conditions: null,
      special_needs: null,
      qr_code_data: null,
      barcode_data: null,
      father_name: null,
      father_phone: null,
      father_email: null,
      father_occupation: null,
      mother_name: null,
      mother_phone: null,
      mother_email: null,
      mother_occupation: null,
      guardian_name: null,
      guardian_phone: null,
      guardian_email: null,
      guardian_address: null,
      guardian_relationship: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      student_bio: null,
      notes: null,
      remarks: null,
    },
  });

  const transportationStatus = watch('transportation_status');

  // Load data
  useEffect(() => {
    const branchId = user?.branch_id || (user as any)?.metadata?.branch_id;
    if (branchId && id) {
      loadAllData(branchId, id);
    } else if (branchId) {
      loadOptions(branchId);
    } else {
      setLoading(false);
    }
  }, [user, id]);

  const loadOptions = async (branchId: string) => {
    try {
      await Promise.all([
        fetchClasses(branchId),
        fetchHouses(branchId),
        fetchClubs(branchId),
        fetchBusRoutes(branchId),
      ]);
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const loadAllData = async (branchId: string, studentId: string) => {
    setLoading(true);
    try {
      await loadOptions(branchId);
      await fetchStudentData(studentId);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentData = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (error) throw error;

      if (data) {
        setStudent(data);
        
        if (data.passport_url) {
          setPhotoPreview(data.passport_url);
        }
        
        // Build form data
        const formData: any = {
          id: data.id || '',
          student_id: data.student_id || '',
          admission_number: data.admission_number || '',
          user_id: data.user_id ?? null,
          branch_id: data.branch_id || '',
          session_id: data.session_id ?? null,
          parent_id: data.parent_id ?? null,
          created_by: data.created_by ?? null,
          
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          middle_name: data.middle_name ?? null,
          other_names: data.other_names ?? null,
          gender: data.gender || 'male',
          date_of_birth: data.date_of_birth || dayjs().format('YYYY-MM-DD'),
          place_of_birth: data.place_of_birth ?? null,
          nationality: data.nationality || 'Nigerian',
          state_of_origin: data.state_of_origin ?? null,
          lga: data.lga ?? null,
          religion: data.religion ?? null,
          blood_group: data.blood_group ?? null,
          genotype: data.genotype ?? null,
          passport_url: data.passport_url ?? null,
          
          email: data.email ?? null,
          phone_number: data.phone_number ?? null,
          home_address: data.home_address || '',
          residential_address: data.residential_address ?? null,
          
          department: data.department ?? null,
          class_id: data.class_id ?? null,
          class_arm: data.class_arm ?? null,
          house_id: data.house_id ?? null,
          club_id: data.club_id ?? null,
          admission_date: data.admission_date || dayjs().format('YYYY-MM-DD'),
          admission_status: data.admission_status || 'pending',
          current_status: data.current_status || 'active',
          previous_school: data.previous_school ?? null,
          transfer_status: data.transfer_status === true,
          
          transportation_status: data.transportation_status === true,
          pickup_location: data.pickup_location ?? null,
          bus_route_id: data.bus_route_id ?? null,
          
          doctor_name: data.doctor_name ?? null,
          hospital_name: data.hospital_name ?? null,
          allergies: data.allergies ?? null,
          medical_conditions: data.medical_conditions ?? null,
          special_needs: data.special_needs ?? null,
          
          guardian_info: data.guardian_info || {},
          emergency_contact: data.emergency_contact || {},
          documents: data.documents || [],
          metadata: data.metadata || {},
          medical_info: data.medical_info || {},
          
          qr_code_data: data.qr_code_data ?? null,
          barcode_data: data.barcode_data ?? null,
          
          created_at: data.created_at || '',
          updated_at: data.updated_at || '',
        };
        
        // Extract guardian_info fields
        if (data.guardian_info && typeof data.guardian_info === 'object') {
          formData.father_name = data.guardian_info?.father_name ?? null;
          formData.father_phone = data.guardian_info?.father_phone ?? null;
          formData.father_email = data.guardian_info?.father_email ?? null;
          formData.father_occupation = data.guardian_info?.father_occupation ?? null;
          formData.mother_name = data.guardian_info?.mother_name ?? null;
          formData.mother_phone = data.guardian_info?.mother_phone ?? null;
          formData.mother_email = data.guardian_info?.mother_email ?? null;
          formData.mother_occupation = data.guardian_info?.mother_occupation ?? null;
          formData.guardian_name = data.guardian_info?.guardian_name ?? null;
          formData.guardian_phone = data.guardian_info?.guardian_phone ?? null;
          formData.guardian_email = data.guardian_info?.guardian_email ?? null;
          formData.guardian_address = data.guardian_info?.guardian_address ?? null;
          formData.guardian_relationship = data.guardian_info?.relationship ?? null;
        }
        
        // Extract emergency_contact fields
        if (data.emergency_contact && typeof data.emergency_contact === 'object') {
          formData.emergency_contact_name = data.emergency_contact?.name ?? null;
          formData.emergency_contact_phone = data.emergency_contact?.phone ?? null;
        }
        
        reset(formData);
      }
    } catch (error: any) {
      console.error('Error fetching student:', error);
      toast.error(error.message || 'Failed to fetch student data');
      navigate('/students');
    }
  };

  const fetchClasses = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, code, level, class_code')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setClasses(data || []);
      return data;
    } catch (error) {
      console.error('Error fetching classes:', error);
      return [];
    }
  };

  const fetchHouses = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('houses')
        .select('id, name')
        .eq('branch_id', branchId)
        .order('name');

      if (error) throw error;
      setHouses(data || []);
      return data;
    } catch (error) {
      console.error('Error fetching houses:', error);
      return [];
    }
  };

  const fetchClubs = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name')
        .eq('branch_id', branchId)
        .order('name');

      if (error) throw error;
      setClubs(data || []);
      return data;
    } catch (error) {
      console.error('Error fetching clubs:', error);
      return [];
    }
  };

  const fetchBusRoutes = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('bus_routes')
        .select('id, name')
        .eq('branch_id', branchId)
        .order('name');

      if (error) throw error;
      setBusRoutes(data || []);
      return data;
    } catch (error) {
      console.error('Error fetching bus routes:', error);
      return [];
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }
      
      if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.type)) {
        toast.error('Please upload a JPG, PNG, or SVG image');
        return;
      }
      
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadStudentPhoto = async (studentId: string, file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `passport_${Date.now()}.${fileExt}`;
      const filePath = `${studentId}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('student-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });
      
      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }
      
      const { data: urlData } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Photo upload error:', error);
      return null;
    }
  };

  const onFormError = (errors: any) => {
    console.log('Form validation errors:', errors);
    const firstErrorField = Object.keys(errors)[0];
    const firstError = errors[firstErrorField];
    toast.error(firstError?.message || 'Please correct the highlighted fields before saving.');
  };

  // Helper function to safely convert empty string to null for UUID fields
  const toUuidOrNull = (value: any): string | null => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    // Check if it looks like a UUID (simple validation)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(value)) {
      return value;
    }
    // If it's not a valid UUID but not null, return null to avoid errors
    console.warn(`Invalid UUID value: "${value}", converting to null`);
    return null;
  };

  const onSubmit = async (data: StudentEditFormData) => {
    if (!id) {
      toast.error('Student ID missing. Please refresh the page.');
      return;
    }

    setSaving(true);
    
    try {
      // Build update data - only include fields that exist in the database
      const updateData: any = {
        // IDs - use helper to convert empty strings to null for UUID fields
        student_id: data.student_id || null,
        user_id: toUuidOrNull(data.user_id),
        session_id: toUuidOrNull(data.session_id),
        parent_id: toUuidOrNull(data.parent_id),
        created_by: toUuidOrNull(data.created_by),
        
        // Personal Information
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name ?? null,
        other_names: data.other_names ?? null,
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        place_of_birth: data.place_of_birth ?? null,
        nationality: data.nationality,
        state_of_origin: data.state_of_origin ?? null,
        lga: data.lga ?? null,
        religion: data.religion ?? null,
        blood_group: data.blood_group ?? null,
        genotype: data.genotype ?? null,
        
        // Contact Information
        email: data.email ?? null,
        phone_number: data.phone_number ?? null,
        home_address: data.home_address,
        residential_address: data.residential_address ?? null,
        
        // Academic Information
        department: data.department ?? null,
        class_id: toUuidOrNull(data.class_id),
        class_arm: data.class_arm ?? null,
        house_id: toUuidOrNull(data.house_id),
        club_id: toUuidOrNull(data.club_id),
        admission_date: data.admission_date,
        admission_status: data.admission_status || 'pending',
        current_status: data.current_status || 'active',
        previous_school: data.previous_school ?? null,
        transfer_status: data.transfer_status === true,
        
        // Transportation
        transportation_status: data.transportation_status === true,
        pickup_location: data.pickup_location ?? null,
        bus_route_id: toUuidOrNull(data.bus_route_id),
        
        // Medical Information
        doctor_name: data.doctor_name ?? null,
        hospital_name: data.hospital_name ?? null,
        allergies: data.allergies ?? null,
        medical_conditions: data.medical_conditions ?? null,
        special_needs: data.special_needs ?? null,
        
        // QR/Barcode
        qr_code_data: data.qr_code_data ?? null,
        barcode_data: data.barcode_data ?? null,
        
        // Updated timestamp
        updated_at: new Date().toISOString(),
      };

      // Build guardian_info - properly handle null values
      updateData.guardian_info = {
        father_name: data.father_name ?? null,
        father_phone: data.father_phone ?? null,
        father_email: data.father_email ?? null,
        father_occupation: data.father_occupation ?? null,
        mother_name: data.mother_name ?? null,
        mother_phone: data.mother_phone ?? null,
        mother_email: data.mother_email ?? null,
        mother_occupation: data.mother_occupation ?? null,
        guardian_name: data.guardian_name ?? null,
        guardian_phone: data.guardian_phone ?? null,
        guardian_email: data.guardian_email ?? null,
        guardian_address: data.guardian_address ?? null,
        relationship: data.guardian_relationship ?? null,
      };

      // Build emergency_contact - properly handle null values
      updateData.emergency_contact = {
        name: data.emergency_contact_name ?? null,
        phone: data.emergency_contact_phone ?? null,
        relationship: data.guardian_relationship ?? null,
      };

      // Handle JSON fields - ensure they are objects, not strings
      updateData.medical_info = data.medical_info && typeof data.medical_info === 'object' ? data.medical_info : {};
      updateData.documents = Array.isArray(data.documents) ? data.documents : [];
      updateData.metadata = data.metadata && typeof data.metadata === 'object' ? data.metadata : {};

      // Remove undefined values
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      console.log('📤 Updating student with data:', JSON.stringify(updateData, null, 2));

      // Update student
      const { data: updatedStudent, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Supabase error:', error);
        if (error.code === '23505') {
          toast.error('Duplicate record. Please check unique fields.');
        } else if (error.code === '42501') {
          toast.error('Permission denied. Please contact administrator.');
        } else if (error.code === '22P02') {
          toast.error('Invalid data format. Please check UUID fields.');
        } else {
          toast.error(error.message || 'Failed to update student record.');
        }
        throw error;
      }

      if (!updatedStudent || updatedStudent.length === 0) {
        toast.error('Student record was not updated. The student may not exist.');
        setSaving(false);
        return;
      }

      // Upload photo if changed
      if (photoFile) {
        try {
          const photoUrl = await uploadStudentPhoto(id, photoFile);
          if (photoUrl) {
            await supabase
              .from('students')
              .update({ passport_url: photoUrl })
              .eq('id', id);
            toast.success('📸 Student photo uploaded successfully!');
          } else {
            toast('Student updated but photo upload failed. You can upload later.', { icon: '⚠️' });
          }
        } catch (photoError) {
          console.error('Photo upload error:', photoError);
          toast('Student updated but photo upload failed. You can upload later.', { icon: '⚠️' });
        }
      }

      toast.success('Student updated successfully!');
      navigate(`/students/${id}`);
      
    } catch (error: any) {
      console.error('❌ Error updating student:', error);
      if (!error.code) {
        toast.error(error.message || 'Failed to update student. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Student not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">The student you're trying to edit doesn't exist.</p>
        <Link to="/students" className="inline-block mt-4 text-blue-600 hover:text-blue-700">
          Back to Students
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 max-w-7xl mx-auto p-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to={`/students/${id}`}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit Student
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {student.first_name} {student.last_name} • {student.admission_number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/students/${id}`}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <X className="w-4 h-4" />
            Cancel
          </Link>
          <button
            type="submit"
            form="student-edit-form"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <form 
        id="student-edit-form"
        onSubmit={handleSubmit(onSubmit, onFormError)} 
        className="space-y-6"
      >
        {/* Section 1: Personal Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Personal Information
            </h2>
            
            {/* Photo Upload */}
            <div className="mb-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div 
                    className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all ${photoPreview ? 'p-1' : ''}`}
                    onClick={() => document.getElementById('photo-upload')?.click()}
                  >
                    {photoPreview ? (
                      <img 
                        src={photoPreview} 
                        alt="Student passport" 
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <Camera className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/svg+xml"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  {photoPreview && (
                    <button 
                      type="button"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(student?.passport_url || null);
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    className="absolute -bottom-2 -right-2 p-1.5 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-all hover:scale-110"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Student Passport</p>
                  <p className="text-xs text-gray-400">JPG, PNG, SVG. Max 2MB</p>
                  {photoFile && (
                    <p className="text-xs text-green-500 mt-1">✓ {photoFile.name} selected</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  First Name *
                </label>
                <input
                  {...register('first_name')}
                  className={`w-full px-4 py-2.5 rounded-xl border ${errors.first_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-500">{errors.first_name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Middle Name
                </label>
                <input
                  {...register('middle_name')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Last Name *
                </label>
                <input
                  {...register('last_name')}
                  className={`w-full px-4 py-2.5 rounded-xl border ${errors.last_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                />
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-500">{errors.last_name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Other Names
                </label>
                <input
                  {...register('other_names')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Gender *
                </label>
                <select
                  {...register('gender')}
                  className={`w-full px-4 py-2.5 rounded-xl border ${errors.gender ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-500">{errors.gender.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  {...register('date_of_birth')}
                  className={`w-full px-4 py-2.5 rounded-xl border ${errors.date_of_birth ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                />
                {errors.date_of_birth && (
                  <p className="mt-1 text-sm text-red-500">{errors.date_of_birth.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Place of Birth
                </label>
                <input
                  {...register('place_of_birth')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nationality *
                </label>
                <input
                  {...register('nationality')}
                  className={`w-full px-4 py-2.5 rounded-xl border ${errors.nationality ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                />
                {errors.nationality && (
                  <p className="mt-1 text-sm text-red-500">{errors.nationality.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  State of Origin
                </label>
                <input
                  {...register('state_of_origin')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  LGA
                </label>
                <input
                  {...register('lga')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Religion
                </label>
                <select
                  {...register('religion')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                >
                  <option value="">Select Religion</option>
                  <option value="christianity">Christianity</option>
                  <option value="islam">Islam</option>
                  <option value="traditional">Traditional</option>
                  <option value="other">Other</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Blood Group
                </label>
                <select
                  {...register('blood_group')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Genotype
                </label>
                <select
                  {...register('genotype')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                >
                  <option value="">Select Genotype</option>
                  <option value="AA">AA</option>
                  <option value="AS">AS</option>
                  <option value="AC">AC</option>
                  <option value="SS">SS</option>
                  <option value="SC">SC</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Admission Number
                </label>
                <input
                  {...register('admission_number')}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Student ID
                </label>
                <input
                  {...register('student_id')}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-green-600" />
              Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className={`w-full px-4 py-2.5 rounded-xl border ${errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Phone Number
                </label>
                <input
                  {...register('phone_number')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Home Address *
                </label>
                <textarea
                  {...register('home_address')}
                  rows={2}
                  className={`w-full px-4 py-2.5 rounded-xl border ${errors.home_address ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                />
                {errors.home_address && (
                  <p className="mt-1 text-sm text-red-500">{errors.home_address.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Residential Address
                </label>
                <textarea
                  {...register('residential_address')}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Academic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-600" />
              Academic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Admission Date *
                </label>
                <input
                  type="date"
                  {...register('admission_date')}
                  className={`w-full px-4 py-2.5 rounded-xl border ${errors.admission_date ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                />
                {errors.admission_date && (
                  <p className="mt-1 text-sm text-red-500">{errors.admission_date.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Department
                </label>
                <select
                  {...register('department')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                >
                  <option value="">Select Department</option>
                  <option value="science">Science</option>
                  <option value="commercial">Commercial</option>
                  <option value="arts">Arts</option>
                  <option value="primary">Primary</option>
                  <option value="nursery">Nursery</option>
                  <option value="creche">Creche</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Class
                </label>
                <select
                  {...register('class_id')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.class_code || cls.code}) - {cls.level}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Class Arm
                </label>
                <input
                  {...register('class_arm')}
                  placeholder="A, B, C, etc."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  House
                </label>
                <select
                  {...register('house_id')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                >
                  <option value="">Select House</option>
                  {houses.map((house) => (
                    <option key={house.id} value={house.id}>
                      {house.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Club
                </label>
                <select
                  {...register('club_id')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                >
                  <option value="">Select Club</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Previous School
                </label>
                <input
                  {...register('previous_school')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Admission Status
                </label>
                <select
                  {...register('admission_status')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="admitted">Admitted</option>
                  <option value="rejected">Rejected</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Current Status
                </label>
                <select
                  {...register('current_status')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="transferred">Transferred</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Transfer Status
                </label>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="true"
                      {...register('transfer_status', {
                        setValueAs: (v) => v === 'true',
                      })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="false"
                      {...register('transfer_status', {
                        setValueAs: (v) => v === 'true',
                      })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Parent/Guardian Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Parent / Guardian Information
            </h2>
            
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Father's Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Father's Name
                  </label>
                  <input
                    {...register('father_name')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Father's Phone
                  </label>
                  <input
                    {...register('father_phone')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Father's Email
                  </label>
                  <input
                    type="email"
                    {...register('father_email')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Father's Occupation
                  </label>
                  <input
                    {...register('father_occupation')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mother's Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Mother's Name
                  </label>
                  <input
                    {...register('mother_name')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Mother's Phone
                  </label>
                  <input
                    {...register('mother_phone')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Mother's Email
                  </label>
                  <input
                    type="email"
                    {...register('mother_email')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Mother's Occupation
                  </label>
                  <input
                    {...register('mother_occupation')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Guardian Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Guardian's Name
                  </label>
                  <input
                    {...register('guardian_name')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Guardian's Phone
                  </label>
                  <input
                    {...register('guardian_phone')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Guardian's Email
                  </label>
                  <input
                    type="email"
                    {...register('guardian_email')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Guardian's Address
                  </label>
                  <input
                    {...register('guardian_address')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Relationship
                  </label>
                  <input
                    {...register('guardian_relationship')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Emergency Contact Name
                  </label>
                  <input
                    {...register('emergency_contact_name')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Emergency Contact Phone
                  </label>
                  <input
                    {...register('emergency_contact_phone')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Medical Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Medical Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Doctor's Name
                </label>
                <input
                  {...register('doctor_name')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Hospital
                </label>
                <input
                  {...register('hospital_name')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Allergies
                </label>
                <input
                  {...register('allergies')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Medical Conditions
                </label>
                <textarea
                  {...register('medical_conditions')}
                  rows={2}
                  placeholder="List any medical conditions..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Special Needs
                </label>
                <textarea
                  {...register('special_needs')}
                  rows={2}
                  placeholder="Any special needs..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Transportation */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Bus className="w-5 h-5 text-orange-600" />
              Transportation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Transportation Status
                </label>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="true"
                      {...register('transportation_status', {
                        setValueAs: (v) => v === 'true',
                      })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="false"
                      {...register('transportation_status', {
                        setValueAs: (v) => v === 'true',
                      })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">No</span>
                  </label>
                </div>
              </div>
              {transportationStatus && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Pickup Location
                    </label>
                    <input
                      {...register('pickup_location')}
                      placeholder="Enter pickup location..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Bus Route
                    </label>
                    <select
                      {...register('bus_route_id')}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    >
                      <option value="">Select Bus Route</option>
                      {busRoutes.map((route) => (
                        <option key={route.id} value={route.id}>
                          {route.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Section 7: QR & Barcode */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-600" />
              QR & Barcode
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  QR Code Data
                </label>
                <input
                  {...register('qr_code_data')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Barcode Data
                </label>
                <input
                  {...register('barcode_data')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 8: Other Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Notebook className="w-5 h-5 text-gray-600" />
              Other Information
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Student Bio
                </label>
                <textarea
                  {...register('student_bio')}
                  rows={3}
                  placeholder="Brief biography of the student..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="Additional notes..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Remarks
                </label>
                <textarea
                  {...register('remarks')}
                  rows={2}
                  placeholder="Any remarks..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Link
            to={`/students/${id}`}
            className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            form="student-edit-form"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Update Student
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default EditStudent;
