import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import {
  User,
  Mail,
  GraduationCap,
  Users,
  Heart,
  Lock,
  Notebook,
  Upload,
  ArrowLeft,
  Download,
  Eye,
  History,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Save,
  FileText,
  QrCode,
  Building,
  Phone,
  MapPin,
  Calendar,
  Globe,
  Home,
  Stethoscope,
  Pill,
  AlertTriangle,
  HelpCircle,
  Info,
  CloudUpload,
  Check,
  Loader2,
  Camera,
  X
} from 'lucide-react';

// Types
type StudentFormData = z.infer<typeof studentSchema>;

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ElementType;
  required?: boolean;
  error?: { message?: string };
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  icon?: React.ElementType;
  required?: boolean;
  error?: { message?: string };
  options: Array<{ value: string; label: string }>;
  loading?: boolean;
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  icon?: React.ElementType;
  required?: boolean;
  error?: { message?: string };
}

// Zod Schema
const studentSchema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  middle_name: z.string().optional(),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Gender is required',
  }),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  state_of_origin: z.string().optional(),
  lga: z.string().optional(),
  religion: z.string().optional(),
  blood_group: z.string().optional(),
  genotype: z.string().optional(),
  admission_number: z.string().optional(),
  student_id: z.string().optional(),
  qr_code: z.string().optional(),
  passport_photo: z.string().optional(),

  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone_number: z.string().optional(),
  alternative_phone: z.string().optional(),
  home_address: z.string().min(5, 'Home address is required'),
  residential_address: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),

  academic_session: z.string().min(1, 'Academic session is required'),
  term: z.string().min(1, 'Term is required'),
  admission_date: z.string().min(1, 'Admission date is required'),
  department: z.string().optional(),
  class_id: z.string().min(1, 'Class is required'),
  class_arm: z.string().optional(),
  roll_number: z.string().optional(),
  house: z.string().optional(),
  school_bus: z.string().optional(),
  hostel: z.string().optional(),
  previous_school: z.string().optional(),
  previous_class: z.string().optional(),
  student_status: z.enum(['active', 'inactive', 'transferred', 'suspended']).default('active'),

  father_name: z.string().optional(),
  father_phone: z.string().optional(),
  father_email: z.string().email('Invalid email').optional().or(z.literal('')),
  father_occupation: z.string().optional(),
  mother_name: z.string().optional(),
  mother_phone: z.string().optional(),
  mother_email: z.string().email('Invalid email').optional().or(z.literal('')),
  mother_occupation: z.string().optional(),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_email: z.string().email('Invalid email').optional().or(z.literal('')),
  guardian_address: z.string().optional(),
  guardian_relationship: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),

  doctor_name: z.string().optional(),
  hospital_name: z.string().optional(),
  doctor_phone: z.string().optional(),
  medical_conditions: z.string().optional(),
  allergies: z.string().optional(),
  special_needs: z.string().optional(),
  medication: z.string().optional(),
  health_notes: z.string().optional(),

  student_username: z.string().optional(),
  password: z.string().optional(),
  confirm_password: z.string().optional(),
  allow_student_login: z.boolean().default(false),
  generate_password_automatically: z.boolean().default(false),

  student_bio: z.string().optional(),
  notes: z.string().optional(),
  remarks: z.string().optional(),
});

// Form Components
const FormInput: React.FC<FormInputProps> = ({ 
  label, 
  icon: Icon, 
  required, 
  error, 
  className = '', 
  ...props 
}) => {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${error ? 'border-red-500 ring-2 ring-red-200' : ''} ${className}`}
        {...props}
      />
      <AnimatePresence>
        {error?.message && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-red-500 flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {error.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

const FormSelect: React.FC<FormSelectProps> = ({ 
  label, 
  icon: Icon, 
  required, 
  error, 
  options, 
  loading = false,
  className = '', 
  ...props 
}) => {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <select
        className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${error ? 'border-red-500 ring-2 ring-red-200' : ''} ${className}`}
        {...props}
        disabled={loading}
      >
        <option value="">{loading ? 'Loading...' : `Select ${label}`}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <AnimatePresence>
        {error?.message && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-red-500 flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {error.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

const FormTextarea: React.FC<FormTextareaProps> = ({ 
  label, 
  icon: Icon, 
  required, 
  error, 
  className = '', 
  ...props 
}) => {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${error ? 'border-red-500 ring-2 ring-red-200' : ''} ${className}`}
        {...props}
      />
      <AnimatePresence>
        {error?.message && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-red-500 flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {error.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// Section Card Component
interface SectionCardProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const SectionCard: React.FC<SectionCardProps> = ({ 
  icon: Icon, 
  title, 
  children, 
  className = '' 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="space-y-6">{children}</div>
      </div>
    </motion.div>
  );
};

// Main Component
const StudentRegistrationForm: React.FC = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [files, setFiles] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [branchId, setBranchId] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [classOptions, setClassOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [loadingBranch, setLoadingBranch] = useState<boolean>(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  
  // Import states
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [importRecords, setImportRecords] = useState<any[]>([]);
  const [importing, setImporting] = useState<boolean>(false);
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      nationality: 'Nigerian',
      student_status: 'active',
      allow_student_login: false,
      generate_password_automatically: false,
      admission_date: dayjs().format('YYYY-MM-DD'),
      academic_session: '2025/2026',
      term: '1st Term',
      gender: 'male',
    },
  });

  const watchedClassId = watch('class_id');

  // Get authenticated user ID from Supabase directly
  useEffect(() => {
    const getAuthUser = async () => {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting auth user:', error);
        toast.error('Please login to continue');
        setLoadingBranch(false);
        return;
      }
      if (authUser) {
        setAuthUserId(authUser.id);
        await loadUserBranch(authUser.id);
        await loadImportHistory();
      } else {
        toast.error('Please login to continue');
        setLoadingBranch(false);
      }
    };
    getAuthUser();
  }, []);

  // When class changes, auto-fill department
  useEffect(() => {
    if (watchedClassId && classOptions.length > 0) {
      const selected = classOptions.find(c => c.value === watchedClassId);
      if (selected) {
        const dept = selected.label.split(' - ')[1] || '';
        setValue('department', dept);
      }
    }
  }, [watchedClassId, classOptions, setValue]);

  const loadUserBranch = async (userId: string) => {
    setLoadingBranch(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('branch_id, metadata')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        toast.error('Failed to load user profile');
        setLoadingBranch(false);
        return;
      }

      if (!profile?.branch_id) {
        toast.error('No branch assigned to this user. Please contact administrator.');
        setLoadingBranch(false);
        return;
      }

      setBranchId(profile.branch_id);
      
      // Get branch name from metadata or fallback
      if (profile.metadata && typeof profile.metadata === 'object') {
        setBranchName(profile.metadata.branch || profile.metadata.branch_name || 'Unknown Branch');
      }
      
      await loadClasses(profile.branch_id);
      
    } catch (error) {
      console.error('Error loading user branch:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoadingBranch(false);
    }
  };

  const loadClasses = async (branchId: string) => {
    setLoadingClasses(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, code, level, department, class_code')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      if (data && data.length > 0) {
        const options = data.map(cls => ({
          value: cls.id,
          label: `${cls.name} (${cls.class_code || cls.code}) - ${cls.level || ''}`,
          ...cls
        }));
        setClassOptions(options);
        // If only one class, auto-select it
        if (data.length === 1) {
          setValue('class_id', data[0].id);
          setValue('department', data[0].department || '');
        }
      } else {
        toast.warning('No active classes found for this branch.');
        setClassOptions([]);
      }
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      toast.error(error.message || 'Failed to load classes');
      setClassOptions([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadImportHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('import_history')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setImportHistory(data || []);
    } catch (error) {
      console.error('Error loading import history:', error);
    }
  };

  const generateAdmissionNumber = async () => {
    try {
      const year = dayjs().format('YYYY');
      const { count, error } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .like('admission_number', `EISO/${year}%`);

      if (error) throw error;
      
      const sequence = (count || 0) + 1;
      return `EISO/${year}/${String(sequence).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating admission number:', error);
      return `EISO/${dayjs().format('YYYY')}/${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    }
  };

  const onSubmit = async (data: StudentFormData) => {
    setIsSubmitting(true);
    try {
      // Validate required fields
      if (!data.first_name || !data.last_name || !data.gender || !data.date_of_birth || 
          !data.nationality || !data.home_address || !data.class_id || !data.admission_date) {
        toast.error('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }

      // Generate admission number
      const admissionNumber = await generateAdmissionNumber();
      const studentId = `STU-${dayjs().format('YYYY')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      // Format the data for the database
      const studentData = {
        first_name: data.first_name.trim(),
        middle_name: data.middle_name?.trim() || null,
        last_name: data.last_name.trim(),
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        nationality: data.nationality || 'Nigerian',
        state_of_origin: data.state_of_origin?.trim() || null,
        lga: data.lga?.trim() || null,
        religion: data.religion || null,
        blood_group: data.blood_group || null,
        genotype: data.genotype || null,
        email: data.email?.trim() || null,
        phone_number: data.phone_number?.trim() || null,
        alternative_phone: data.alternative_phone?.trim() || null,
        home_address: data.home_address.trim(),
        residential_address: data.residential_address?.trim() || null,
        country: data.country?.trim() || null,
        state: data.state?.trim() || null,
        city: data.city?.trim() || null,
        postal_code: data.postal_code?.trim() || null,
        academic_session: data.academic_session || '2025/2026',
        term: data.term || '1st Term',
        admission_date: data.admission_date,
        department: data.department?.trim() || null,
        class_id: data.class_id,
        class_arm: data.class_arm?.trim() || null,
        roll_number: data.roll_number?.trim() || null,
        house: data.house?.trim() || null,
        school_bus: data.school_bus || null,
        hostel: data.hostel || null,
        previous_school: data.previous_school?.trim() || null,
        previous_class: data.previous_class?.trim() || null,
        student_status: data.student_status || 'active',
        father_name: data.father_name?.trim() || null,
        father_phone: data.father_phone?.trim() || null,
        father_email: data.father_email?.trim() || null,
        father_occupation: data.father_occupation?.trim() || null,
        mother_name: data.mother_name?.trim() || null,
        mother_phone: data.mother_phone?.trim() || null,
        mother_email: data.mother_email?.trim() || null,
        mother_occupation: data.mother_occupation?.trim() || null,
        guardian_name: data.guardian_name?.trim() || null,
        guardian_phone: data.guardian_phone?.trim() || null,
        guardian_email: data.guardian_email?.trim() || null,
        guardian_address: data.guardian_address?.trim() || null,
        guardian_relationship: data.guardian_relationship?.trim() || null,
        emergency_contact_name: data.emergency_contact_name?.trim() || null,
        emergency_contact_phone: data.emergency_contact_phone?.trim() || null,
        doctor_name: data.doctor_name?.trim() || null,
        hospital_name: data.hospital_name?.trim() || null,
        doctor_phone: data.doctor_phone?.trim() || null,
        medical_conditions: data.medical_conditions?.trim() || null,
        allergies: data.allergies?.trim() || null,
        special_needs: data.special_needs?.trim() || null,
        medication: data.medication?.trim() || null,
        health_notes: data.health_notes?.trim() || null,
        student_bio: data.student_bio?.trim() || null,
        notes: data.notes?.trim() || null,
        remarks: data.remarks?.trim() || null,
        admission_number: admissionNumber,
        student_id: studentId,
        branch_id: branchId,
        created_by: authUserId,
        admission_status: 'admitted',
        current_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        emergency_contact: data.emergency_contact_name ? {
          name: data.emergency_contact_name,
          phone: data.emergency_contact_phone,
          relationship: data.guardian_relationship || 'Parent',
        } : null,
        guardian_info: {
          father_name: data.father_name || null,
          mother_name: data.mother_name || null,
          father_phone: data.father_phone || null,
          mother_phone: data.mother_phone || null,
          father_email: data.father_email || null,
          mother_email: data.mother_email || null,
          father_occupation: data.father_occupation || null,
          mother_occupation: data.mother_occupation || null,
          guardian_name: data.guardian_name || null,
          guardian_phone: data.guardian_phone || null,
          guardian_email: data.guardian_email || null,
          guardian_address: data.guardian_address || null,
          relationship: data.guardian_relationship || null,
        },
        metadata: {
          registered_via: 'ERP',
          created_by: user?.email || 'System',
          branch: branchName || branchId,
        },
      };

      // Remove any undefined values
      Object.keys(studentData).forEach(key => {
        if (studentData[key] === undefined) {
          delete studentData[key];
        }
      });

      console.log('Submitting student data:', studentData);

      // Insert into database
      const { data: insertedData, error } = await supabase
        .from('students')
        .insert([studentData])
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        toast.error(error.message || 'Failed to register student');
        setIsSubmitting(false);
        return;
      }

      toast.success(`Student registered successfully! Admission: ${admissionNumber}`);
      
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error(error.message || 'Failed to register student');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== BULK IMPORT FUNCTIONS ====================

  const downloadTemplate = () => {
    const template = [
      {
        'First Name': '',
        'Middle Name': '',
        'Last Name': '',
        'Gender': 'male/female/other',
        'Date of Birth': 'YYYY-MM-DD',
        'Nationality': 'Nigerian',
        'State of Origin': '',
        'LGA': '',
        'Religion': '',
        'Blood Group': 'A+/A-/B+/B-/AB+/AB-/O+/O-',
        'Genotype': 'AA/AS/AC/SS/SC',
        'Email': '',
        'Phone Number': '',
        'Home Address': '',
        'Class Name': '',
        'Class Arm': '',
        'Father Name': '',
        'Father Phone': '',
        'Mother Name': '',
        'Mother Phone': '',
        'Guardian Name': '',
        'Guardian Phone': '',
        'Emergency Contact Name': '',
        'Emergency Contact Phone': '',
        'Previous School': '',
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(template);
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 20 }
    ];

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_import_template_${dayjs().format('YYYY-MM-DD')}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    if (uploadedFiles.length === 0) return;

    const file = uploadedFiles[0];
    const fileWithPreview = Object.assign(file, { preview: URL.createObjectURL(file) });
    setFiles([fileWithPreview]);
    await parseImportFile(file);
  };

  const parseImportFile = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);

          if (jsonData.length === 0) {
            toast.error('No data found in the file');
            return;
          }

          const records = jsonData.map((row: any, index) => {
            const errors: string[] = [];
            
            if (!row['First Name']) errors.push('First Name is required');
            if (!row['Last Name']) errors.push('Last Name is required');
            if (!row['Gender']) errors.push('Gender is required');
            if (!row['Date of Birth']) errors.push('Date of Birth is required');
            if (!row['Home Address']) errors.push('Home Address is required');
            
            if (row['Gender'] && !['male', 'female', 'other'].includes(row['Gender'].toLowerCase())) {
              errors.push('Gender must be male, female, or other');
            }
            
            if (row['Blood Group'] && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(row['Blood Group'])) {
              errors.push('Invalid Blood Group');
            }
            
            if (row['Genotype'] && !['AA', 'AS', 'AC', 'SS', 'SC'].includes(row['Genotype'])) {
              errors.push('Invalid Genotype');
            }

            return {
              row: index + 2,
              data: row,
              errors,
              status: errors.length === 0 ? 'valid' : 'invalid'
            };
          });

          setImportRecords(records);
          setShowPreview(true);
          toast.success(`File parsed! ${records.filter(r => r.status === 'valid').length} valid records found.`);
        } catch (error) {
          console.error('Error parsing file:', error);
          toast.error('Failed to parse file. Please check the format.');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read file');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0];
      const fileWithPreview = Object.assign(file, { preview: URL.createObjectURL(file) });
      setFiles([fileWithPreview]);
      parseImportFile(file);
    }
  };

  const processImport = async () => {
    const validRecords = importRecords.filter(r => r.status === 'valid');
    if (validRecords.length === 0) {
      toast.error('No valid records to import');
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const record of validRecords) {
        try {
          const data = record.data;
          
          let classId = null;
          if (data['Class Name']) {
            const { data: classData } = await supabase
              .from('classes')
              .select('id')
              .eq('name', data['Class Name'])
              .eq('branch_id', branchId)
              .single();
            if (classData) {
              classId = classData.id;
            }
          }

          const year = dayjs().format('YYYY');
          const { count } = await supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .like('admission_number', `EISO/${year}%`);
          
          const sequence = (count || 0) + 1;
          const admissionNumber = `EISO/${year}/${String(sequence).padStart(3, '0')}`;
          const studentId = `STU-${dayjs().format('YYYY')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

          const studentData = {
            first_name: data['First Name'],
            middle_name: data['Middle Name'] || '',
            last_name: data['Last Name'],
            gender: data['Gender']?.toLowerCase() || 'male',
            date_of_birth: data['Date of Birth'],
            nationality: data['Nationality'] || 'Nigerian',
            state_of_origin: data['State of Origin'] || '',
            lga: data['LGA'] || '',
            religion: data['Religion'] || '',
            blood_group: data['Blood Group'] || '',
            genotype: data['Genotype'] || '',
            email: data['Email'] || '',
            phone_number: data['Phone Number'] || '',
            home_address: data['Home Address'] || '',
            residential_address: data['Residential Address'] || '',
            class_id: classId,
            class_arm: data['Class Arm'] || '',
            father_name: data['Father Name'] || '',
            father_phone: data['Father Phone'] || '',
            mother_name: data['Mother Name'] || '',
            mother_phone: data['Mother Phone'] || '',
            guardian_name: data['Guardian Name'] || '',
            guardian_phone: data['Guardian Phone'] || '',
            emergency_contact_name: data['Emergency Contact Name'] || '',
            emergency_contact_phone: data['Emergency Contact Phone'] || '',
            previous_school: data['Previous School'] || '',
            admission_number: admissionNumber,
            student_id: studentId,
            branch_id: branchId,
            created_by: authUserId,
            admission_status: 'admitted',
            current_status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            academic_session: '2025/2026',
            term: '1st Term',
            admission_date: dayjs().format('YYYY-MM-DD'),
            metadata: {
              registered_via: 'Bulk Import',
              created_by: user?.email || 'System',
            },
          };

          Object.keys(studentData).forEach(key => {
            if (studentData[key] === undefined) {
              delete studentData[key];
            }
          });

          const { error } = await supabase
            .from('students')
            .insert([studentData]);

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error('Error importing record:', error);
          errorCount++;
        }
      }

      await supabase
        .from('import_history')
        .insert([{
          branch_id: branchId,
          total_records: validRecords.length,
          success_count: successCount,
          error_count: errorCount,
          file_name: files[0]?.name || 'Unknown',
          created_by: authUserId,
          created_at: new Date().toISOString(),
          metadata: {
            imported_by: user?.email || 'System',
          }
        }]);

      toast.success(`Import complete! ${successCount} students added, ${errorCount} failed.`);
      setShowPreview(false);
      setImportRecords([]);
      setFiles([]);
      await loadImportHistory();
      
    } catch (error) {
      console.error('Error processing import:', error);
      toast.error('Failed to process import');
    } finally {
      setImporting(false);
    }
  };

  // Common options
  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  const bloodGroupOptions = [
    { value: '', label: 'Select Blood Group' },
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
  ];

  const genotypeOptions = [
    { value: '', label: 'Select Genotype' },
    { value: 'AA', label: 'AA' },
    { value: 'AS', label: 'AS' },
    { value: 'AC', label: 'AC' },
    { value: 'SS', label: 'SS' },
    { value: 'SC', label: 'SC' },
  ];

  const sessionOptions = [
    { value: '2024/2025', label: '2024/2025' },
    { value: '2025/2026', label: '2025/2026' },
    { value: '2026/2027', label: '2026/2027' },
  ];

  const termOptions = [
    { value: '1st Term', label: '1st Term' },
    { value: '2nd Term', label: '2nd Term' },
    { value: '3rd Term', label: '3rd Term' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'transferred', label: 'Transferred' },
    { value: 'suspended', label: 'Suspended' },
  ];

  const departmentOptions = [
    { value: '', label: 'Select Department' },
    { value: 'science', label: 'Science' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'arts', label: 'Arts' },
    { value: 'primary', label: 'Primary' },
    { value: 'nursery', label: 'Nursery' },
    { value: 'creche', label: 'Creche' },
  ];

  if (loadingBranch) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="max-w-7xl mx-auto p-8 space-y-8"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Student Registration
          </h1>
          <p className="text-gray-500 mt-1">
            Register a new student into your school management system.
          </p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:scale-105 hover:shadow-md">
          <ArrowLeft className="w-4 h-4" />
          Back to Students
        </button>
      </motion.div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column - Registration Form */}
        <div className="lg:col-span-3 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Personal Information */}
            <SectionCard icon={User} title="Personal Information">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-3">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all">
                        <Camera className="w-8 h-8 text-gray-400" />
                      </div>
                      <button className="absolute -bottom-2 -right-2 p-1.5 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-all hover:scale-110">
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Student Passport Upload</p>
                      <p className="text-xs text-gray-400">JPG, PNG, SVG. Max 2MB</p>
                    </div>
                  </div>
                </div>
                <FormInput
                  label="First Name"
                  icon={User}
                  required
                  error={errors.first_name}
                  {...register('first_name')}
                />
                <FormInput
                  label="Middle Name"
                  icon={User}
                  {...register('middle_name')}
                />
                <FormInput
                  label="Last Name"
                  icon={User}
                  required
                  error={errors.last_name}
                  {...register('last_name')}
                />
                <FormSelect
                  label="Gender"
                  icon={User}
                  required
                  error={errors.gender}
                  options={genderOptions}
                  {...register('gender')}
                />
                <FormInput
                  label="Date of Birth"
                  icon={Calendar}
                  type="date"
                  required
                  error={errors.date_of_birth}
                  {...register('date_of_birth')}
                />
                <FormInput
                  label="Nationality"
                  icon={Globe}
                  required
                  error={errors.nationality}
                  {...register('nationality')}
                />
                <FormInput
                  label="State of Origin"
                  icon={MapPin}
                  {...register('state_of_origin')}
                />
                <FormInput
                  label="LGA"
                  icon={MapPin}
                  {...register('lga')}
                />
                <FormSelect
                  label="Religion"
                  options={[
                    { value: '', label: 'Select Religion' },
                    { value: 'christianity', label: 'Christianity' },
                    { value: 'islam', label: 'Islam' },
                    { value: 'traditional', label: 'Traditional' },
                    { value: 'other', label: 'Other' },
                    { value: 'none', label: 'None' },
                  ]}
                  {...register('religion')}
                />
                <FormSelect
                  label="Blood Group"
                  options={bloodGroupOptions}
                  {...register('blood_group')}
                />
                <FormSelect
                  label="Genotype"
                  options={genotypeOptions}
                  {...register('genotype')}
                />
                <FormInput
                  label="Admission Number"
                  icon={FileText}
                  disabled
                  className="bg-gray-50 cursor-not-allowed"
                  {...register('admission_number')}
                />
                <FormInput
                  label="Student ID"
                  icon={FileText}
                  disabled
                  className="bg-gray-50 cursor-not-allowed"
                  {...register('student_id')}
                />
                <div className="flex items-center gap-3">
                  <QrCode className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">QR Code Preview (Optional)</span>
                </div>
              </div>
            </SectionCard>

            {/* Section 2: Contact Information */}
            <SectionCard icon={Mail} title="Contact Information">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormInput
                  label="Email"
                  icon={Mail}
                  type="email"
                  error={errors.email}
                  {...register('email')}
                />
                <FormInput
                  label="Phone Number"
                  icon={Phone}
                  {...register('phone_number')}
                />
                <FormInput
                  label="Alternative Phone"
                  icon={Phone}
                  {...register('alternative_phone')}
                />
                <div className="md:col-span-2 lg:col-span-3">
                  <FormTextarea
                    label="Home Address"
                    icon={MapPin}
                    required
                    error={errors.home_address}
                    rows={2}
                    {...register('home_address')}
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <FormTextarea
                    label="Residential Address"
                    icon={Home}
                    rows={2}
                    {...register('residential_address')}
                  />
                </div>
                <FormInput
                  label="Country"
                  icon={Globe}
                  {...register('country')}
                />
                <FormInput
                  label="State"
                  icon={MapPin}
                  {...register('state')}
                />
                <FormInput
                  label="City"
                  icon={Building}
                  {...register('city')}
                />
                <FormInput
                  label="Postal Code"
                  {...register('postal_code')}
                />
              </div>
            </SectionCard>

            {/* Section 3: Academic Information */}
            <SectionCard icon={GraduationCap} title="Academic Information">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3 col-span-full">
                  <Building className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-700">
                      Branch: <span className="font-semibold">{branchName || branchId || 'Loading...'}</span>
                    </p>
                    <p className="text-xs text-gray-500">Branch is automatically assigned from your profile</p>
                  </div>
                </div>

                <FormSelect
                  label="Academic Session"
                  icon={Calendar}
                  required
                  error={errors.academic_session}
                  options={sessionOptions}
                  {...register('academic_session')}
                />
                <FormSelect
                  label="Term"
                  required
                  error={errors.term}
                  options={termOptions}
                  {...register('term')}
                />
                <FormInput
                  label="Admission Date"
                  icon={Calendar}
                  type="date"
                  required
                  error={errors.admission_date}
                  {...register('admission_date')}
                />
                <FormSelect
                  label="Department"
                  options={departmentOptions}
                  {...register('department')}
                />
                <FormSelect
                  label="Class"
                  icon={GraduationCap}
                  required
                  error={errors.class_id}
                  options={classOptions}
                  loading={loadingClasses}
                  {...register('class_id')}
                />
                {classOptions.length === 0 && !loadingClasses && (
                  <div className="text-sm text-yellow-600 col-span-full">
                    No active classes found for this branch. Please contact administrator.
                  </div>
                )}
                <FormInput
                  label="Class Arm"
                  placeholder="A, B, C, etc."
                  {...register('class_arm')}
                />
                <FormInput
                  label="Roll Number"
                  {...register('roll_number')}
                />
                <FormInput
                  label="House"
                  {...register('house')}
                />
                <FormSelect
                  label="School Bus"
                  options={[
                    { value: '', label: 'Select Bus' },
                    { value: 'bus1', label: 'Bus 1 - Red' },
                    { value: 'bus2', label: 'Bus 2 - Blue' },
                    { value: 'bus3', label: 'Bus 3 - Yellow' },
                    { value: 'none', label: 'None' },
                  ]}
                  {...register('school_bus')}
                />
                <FormSelect
                  label="Hostel"
                  options={[
                    { value: '', label: 'Select Hostel' },
                    { value: 'hostel1', label: 'Hostel A - Boys' },
                    { value: 'hostel2', label: 'Hostel B - Girls' },
                    { value: 'none', label: 'None' },
                  ]}
                  {...register('hostel')}
                />
                <FormInput
                  label="Previous School"
                  {...register('previous_school')}
                />
                <FormInput
                  label="Previous Class"
                  {...register('previous_class')}
                />
                <FormSelect
                  label="Student Status"
                  required
                  error={errors.student_status}
                  options={statusOptions}
                  {...register('student_status')}
                />
              </div>
            </SectionCard>

            {/* Section 4: Parent/Guardian Information */}
            <SectionCard icon={Users} title="Parent / Guardian">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="col-span-full">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Father's Information</h3>
                </div>
                <FormInput label="Father's Name" {...register('father_name')} />
                <FormInput label="Father's Phone" icon={Phone} {...register('father_phone')} />
                <FormInput label="Father's Email" icon={Mail} type="email" {...register('father_email')} />
                <FormInput label="Father's Occupation" {...register('father_occupation')} />
                
                <div className="col-span-full">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 mt-4">Mother's Information</h3>
                </div>
                <FormInput label="Mother's Name" {...register('mother_name')} />
                <FormInput label="Mother's Phone" icon={Phone} {...register('mother_phone')} />
                <FormInput label="Mother's Email" icon={Mail} type="email" {...register('mother_email')} />
                <FormInput label="Mother's Occupation" {...register('mother_occupation')} />
                
                <div className="col-span-full">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 mt-4">Guardian Information</h3>
                </div>
                <FormInput label="Guardian's Name" {...register('guardian_name')} />
                <FormInput label="Guardian's Phone" icon={Phone} {...register('guardian_phone')} />
                <FormInput label="Guardian's Email" icon={Mail} type="email" {...register('guardian_email')} />
                <FormInput label="Guardian's Address" {...register('guardian_address')} />
                <FormInput label="Relationship" {...register('guardian_relationship')} />
                
                <div className="col-span-full">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 mt-4">Emergency Contact</h3>
                </div>
                <FormInput label="Emergency Contact Name" {...register('emergency_contact_name')} />
                <FormInput label="Emergency Contact Phone" icon={Phone} {...register('emergency_contact_phone')} />
              </div>
            </SectionCard>

            {/* Section 5: Medical Information */}
            <SectionCard icon={Heart} title="Medical Information">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormInput label="Hospital" icon={Building} {...register('hospital_name')} />
                <FormInput label="Doctor" icon={Stethoscope} {...register('doctor_name')} />
                <FormInput label="Doctor's Phone" icon={Phone} {...register('doctor_phone')} />
                <FormSelect
                  label="Blood Group"
                  options={bloodGroupOptions}
                  {...register('blood_group')}
                />
                <FormSelect
                  label="Genotype"
                  options={genotypeOptions}
                  {...register('genotype')}
                />
                <div className="md:col-span-2 lg:col-span-3">
                  <FormTextarea
                    label="Medical Conditions"
                    icon={AlertTriangle}
                    rows={2}
                    placeholder="List any medical conditions..."
                    {...register('medical_conditions')}
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <FormTextarea
                    label="Allergies"
                    icon={Pill}
                    rows={2}
                    placeholder="List any allergies..."
                    {...register('allergies')}
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <FormTextarea
                    label="Special Needs"
                    icon={HelpCircle}
                    rows={2}
                    placeholder="Any special needs..."
                    {...register('special_needs')}
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <FormTextarea
                    label="Medication"
                    icon={Pill}
                    rows={2}
                    placeholder="Current medications..."
                    {...register('medication')}
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <FormTextarea
                    label="Health Notes"
                    icon={Heart}
                    rows={2}
                    placeholder="Additional health notes..."
                    {...register('health_notes')}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Section 6: Account Information */}
            <SectionCard icon={Lock} title="Account Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Student Username"
                  icon={User}
                  {...register('student_username')}
                />
                <FormInput
                  label="Password"
                  icon={Lock}
                  type="password"
                  {...register('password')}
                />
                <FormInput
                  label="Confirm Password"
                  icon={Lock}
                  type="password"
                  {...register('confirm_password')}
                />
                <div className="md:col-span-2 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      {...register('allow_student_login')}
                    />
                    <span className="text-sm text-gray-700">Allow student login</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      {...register('generate_password_automatically')}
                    />
                    <span className="text-sm text-gray-700">Generate password automatically</span>
                  </label>
                </div>
              </div>
            </SectionCard>

            {/* Section 7: Other Information */}
            <SectionCard icon={Notebook} title="Other Information">
              <div className="grid grid-cols-1 gap-4">
                <FormTextarea
                  label="Student Bio"
                  rows={3}
                  placeholder="Brief biography of the student..."
                  {...register('student_bio')}
                />
                <FormTextarea
                  label="Notes"
                  rows={2}
                  placeholder="Additional notes..."
                  {...register('notes')}
                />
                <FormTextarea
                  label="Remarks"
                  rows={2}
                  placeholder="Any remarks..."
                  {...register('remarks')}
                />
              </div>
            </SectionCard>

            {/* Info Notice */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3"
            >
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Admission Number is generated automatically.</p>
                <p>• Student ID is generated automatically.</p>
                <p>• Branch is automatically assigned from your profile.</p>
                <p>• Parent information can be updated later.</p>
                <p>• Medical information is optional.</p>
                <p className="font-semibold">• Fields marked (*) are required.</p>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex items-center gap-2 px-6 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:scale-105 hover:shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 px-6 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:scale-105 hover:shadow-md"
                >
                  <Save className="w-4 h-4" />
                  Save Draft
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || loadingClasses || classOptions.length === 0}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" />
                      Register Student
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-all duration-200 hover:scale-105 hover:shadow-md"
                >
                  <PlusCircle className="w-4 h-4" />
                  Register & Add Another
                </button>
              </div>
            </motion.div>
          </form>
        </div>

        {/* Right Column - Bulk Import Card */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="sticky top-8"
          >
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Bulk Import Students</h3>
                  <p className="text-xs text-white/80">Import thousands from Excel or CSV</p>
                </div>
              </div>

              {/* Upload Zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
                  isDragging
                    ? 'border-white bg-white/20 scale-105'
                    : 'border-white/30 hover:border-white/60'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <motion.div
                  animate={isDragging ? { scale: 1.05 } : { scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <CloudUpload className="w-12 h-12 mx-auto mb-3 text-white/60" />
                  <p className="text-sm font-medium mb-1">Drag & Drop your file here</p>
                  <p className="text-xs text-white/60 mb-3">or</p>
                  <label className="cursor-pointer">
                    <span className="inline-block px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-all hover:scale-105">
                      Choose File
                    </span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                    />
                  </label>
                  <p className="text-xs text-white/50 mt-2">Accepts .csv, .xlsx, .xls</p>
                </motion.div>
              </div>

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-4">
                  <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="bg-white h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-xs text-white/60 mt-1">{uploadProgress}% uploaded</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 space-y-2">
                <button 
                  onClick={downloadTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-all hover:scale-105"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
                <button 
                  onClick={() => setShowPreview(true)}
                  disabled={importRecords.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="w-4 h-4" />
                  Preview Import ({importRecords.filter(r => r.status === 'valid').length})
                </button>
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-all hover:scale-105"
                >
                  <History className="w-4 h-4" />
                  Import History ({importHistory.length})
                </button>
              </div>
            </div>

            {/* Import Features */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
            >
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Import Features</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'CSV',
                  'Excel',
                  'Duplicate Detection',
                  'Validation',
                  'Preview',
                  'Batch Import',
                  'Rollback',
                  'Progress',
                  'Error Report',
                  'Success Report',
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Check className="w-3 h-3 text-green-500" />
                    {feature}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Import Instructions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
            >
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Import Instructions</h4>
              <ol className="space-y-2 text-xs text-gray-600 list-decimal list-inside">
                <li>Download Template</li>
                <li>Fill Student Records</li>
                <li>Save Excel File</li>
                <li>Upload File</li>
                <li>Preview Records</li>
                <li>Import Students</li>
              </ol>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && importRecords.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Import Preview</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {importRecords.filter(r => r.status === 'valid').length} valid records, {importRecords.filter(r => r.status === 'invalid').length} invalid
                  </p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {importRecords.map((record) => (
                    <div
                      key={record.row}
                      className={`p-3 rounded-lg border ${
                        record.status === 'valid'
                          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Row {record.row}
                            </span>
                            {record.status === 'valid' ? (
                              <span className="text-xs font-medium text-green-600 dark:text-green-400">✓ Valid</span>
                            ) : (
                              <span className="text-xs font-medium text-red-600 dark:text-red-400">✗ Invalid</span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                            {record.data['First Name']} {record.data['Last Name']}
                            {record.data['Class Name'] && ` - ${record.data['Class Name']}`}
                          </div>
                          {record.errors.length > 0 && (
                            <ul className="mt-1 text-xs text-red-600 dark:text-red-400 list-disc list-inside">
                              {record.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Close
                </button>
                <button
                  onClick={processImport}
                  disabled={importing || importRecords.filter(r => r.status === 'valid').length === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import {importRecords.filter(r => r.status === 'valid').length} Records
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Import History</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Last 10 imports
                  </p>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {importHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p>No import history found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {importHistory.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{item.file_name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {dayjs(item.created_at).format('MMMM D, YYYY h:mm A')}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-green-600 dark:text-green-400">
                                ✓ {item.success_count}
                              </span>
                              {item.error_count > 0 && (
                                <span className="text-sm text-red-600 dark:text-red-400">
                                  ✗ {item.error_count}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Total: {item.total_records}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowHistory(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StudentRegistrationForm;
