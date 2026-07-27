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
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';


// Zod validation schema for student edit
const studentEditSchema = z.object({
  // Personal Information
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  middle_name: z.string().optional(),
  other_names: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  place_of_birth: z.string().optional(),
  nationality: z.string().min(1, 'Nationality is required'),
  state_of_origin: z.string().optional(),
  lga: z.string().optional(),
  religion: z.string().optional(),
  blood_group: z.string().optional(),
  genotype: z.string().optional(),
  
  // Contact Information
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone_number: z.string().optional(),
  home_address: z.string().min(5, 'Home address is required'),
  residential_address: z.string().optional(),
  
  // Academic Information
  class_id: z.string().optional(),
  class_arm: z.string().optional(),
  department: z.string().optional(),
  admission_date: z.string().min(1, 'Admission date is required'),
  admission_status: z.enum(['pending', 'admitted', 'rejected', 'withdrawn']),
  current_status: z.enum(['active', 'inactive', 'transferred', 'suspended']),
  previous_school: z.string().optional(),
  transfer_status: z.boolean().default(false),
  
  // Medical Information
  doctor_name: z.string().optional(),
  hospital_name: z.string().optional(),
  allergies: z.string().optional(),
  medical_conditions: z.string().optional(),
  special_needs: z.string().optional(),
  
  // Transportation
  transportation_status: z.boolean().default(false),
  pickup_location: z.string().optional(),
  
  // Emergency Contact
  emergency_contact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
  }).optional(),
  
  // Guardian Info
  guardian_info: z.object({
    father_name: z.string().optional(),
    mother_name: z.string().optional(),
    occupation: z.string().optional(),
  }).optional(),
});

type StudentEditFormData = z.infer<typeof studentEditSchema>;

interface Student extends StudentEditFormData {
  id: string;
  student_id: string;
  admission_number: string;
  passport_url: string | null;
  branch_id: string;
  created_at: string;
  emergency_contact: any;
  guardian_info: any;
}

const EditStudent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; code: string; level: string; class_code: string }>>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StudentEditFormData>({
    resolver: zodResolver(studentEditSchema),
    defaultValues: {
      gender: 'male',
      nationality: 'Nigerian',
      admission_status: 'pending',
      current_status: 'active',
      transportation_status: false,
      transfer_status: false,
      emergency_contact: {},
      guardian_info: {},
    },
  });

  const transportationStatus = watch('transportation_status');

  useEffect(() => {
    if (id) {
      fetchStudentData(id);
    }
    // Get user's branch_id from the user object
    const branchId = user?.branch_id || (user as any)?.metadata?.branch_id;
    if (branchId) {
      fetchClasses(branchId);
    }
  }, [id, user]);

  const fetchStudentData = async (studentId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (error) throw error;

      if (data) {
        setStudent(data);
        // Set form values
        const formData: any = { ...data };
        
        // Handle JSON fields
        if (data.emergency_contact) {
          formData.emergency_contact = data.emergency_contact;
        }
        if (data.guardian_info) {
          formData.guardian_info = data.guardian_info;
        }
        
        Object.keys(formData).forEach((key) => {
          if (key in formData) {
            setValue(key as keyof StudentEditFormData, formData[key]);
          }
        });
      }
    } catch (error: any) {
      console.error('Error fetching student:', error);
      toast.error(error.message || 'Failed to fetch student data');
      navigate('/students');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, code, level, class_code')
        .eq('branch_id', branchId)
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const onSubmit = async (data: StudentEditFormData) => {
    if (!id) return;
    
    setSaving(true);
    try {
      // Prepare update data
      const updateData: any = { ...data };
      
      // Ensure JSON fields are properly formatted
      if (data.emergency_contact) {
        updateData.emergency_contact = data.emergency_contact;
      }
      if (data.guardian_info) {
        updateData.guardian_info = data.guardian_info;
      }
      
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Student updated successfully!');
      navigate(`/students/${id}`);
    } catch (error: any) {
      console.error('Error updating student:', error);
      toast.error(error.message || 'Failed to update student');
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
      className="space-y-6"
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
            onClick={handleSubmit(onSubmit)}
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

      {/* Edit Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Personal Information
            </h2>
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
            </div>
          </div>
        </div>

        {/* Contact Information */}
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
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
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

        {/* Academic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-600" />
              Academic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                {classes.length === 0 && (
                  <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                    No classes available for your branch
                  </p>
                )}
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
                  Department
                </label>
                <select
                  {...register('department')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                >
                  <option value="">Select Department</option>
                  <option value="nursery">Nursery</option>
                  <option value="primary">Primary</option>
                  <option value="science">Science</option>
                  <option value="commercial">Commercial</option>
                  <option value="arts">Arts</option>
                  <option value="creche">Creche</option>
                </select>
              </div>
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
                  Previous School
                </label>
                <input
                  {...register('previous_school')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Transfer Status
                </label>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      {...register('transfer_status')}
                      value="true"
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      {...register('transfer_status')}
                      value="false"
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Medical Information */}
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
                  placeholder="List any allergies..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div className="lg:col-span-3">
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

        {/* Transportation */}
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
                      {...register('transportation_status')}
                      value="true"
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      {...register('transportation_status')}
                      value="false"
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">No</span>
                  </label>
                </div>
              </div>
              {transportationStatus && (
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
              )}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Emergency Contact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Contact Name
                </label>
                <input
                  {...register('emergency_contact.name')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Phone Number
                </label>
                <input
                  {...register('emergency_contact.phone')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Relationship
                </label>
                <input
                  {...register('emergency_contact.relationship')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Guardian Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Guardian Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Father's Name
                </label>
                <input
                  {...register('guardian_info.father_name')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Mother's Name
                </label>
                <input
                  {...register('guardian_info.mother_name')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Occupation
                </label>
                <input
                  {...register('guardian_info.occupation')}
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
