import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  BookOpen, 
  GraduationCap,
  CreditCard,
  Edit,
  Download,
  Printer,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  Building2,
  Globe,
  Heart,
  FileText,
  AlertTriangle,
  MessageSquare,
  School
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface Student {
  id: string;
  student_id: string;
  admission_number: string;
  admission_date: string;
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
  phone_number: string | null;
  email: string | null;
  home_address: string;
  residential_address: string | null;
  branch_id: string;
  department: string | null;
  class_id: string | null;
  class_arm: string | null;
  house_id: string | null;
  club_id: string | null;
  transportation_status: boolean;
  pickup_location: string | null;
  bus_route_id: string | null;
  medical_info: any;
  doctor_name: string | null;
  hospital_name: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  special_needs: string | null;
  previous_school: string | null;
  transfer_status: boolean;
  admission_status: string;
  current_status: string;
  emergency_contact: any;
  parent_id: string | null;
  guardian_info: any;
  documents: any[];
  qr_code_data: string | null;
  barcode_data: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  metadata: any;
  // Joined fields
  class_name?: string;
  class_code?: string;
  class_level?: string;
  branch_name?: string;
  house_name?: string;
  club_name?: string;
  bus_route_name?: string;
  parent_names?: string;
}

const StudentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      fetchStudentDetails(id);
    }
  }, [id]);

  const fetchStudentDetails = async (studentId: string) => {
    setLoading(true);
    try {
      // Fetch student with class details
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
            branch_code
          )
        `)
        .eq('id', studentId)
        .single();

      if (error) throw error;

      if (data) {
        // Get parent information if parent_id exists
        let parentNames = null;
        if (data.parent_id) {
          const { data: parentData, error: parentError } = await supabase
            .from('parents')
            .select('first_name, last_name, phone_number, email')
            .eq('id', data.parent_id)
            .single();

          if (!parentError && parentData) {
            parentNames = `${parentData.first_name} ${parentData.last_name}`;
          }
        }

        const formattedStudent: Student = {
          ...data,
          class_name: data.classes?.name || 'Not Assigned',
          class_code: data.classes?.class_code || data.classes?.code || 'N/A',
          class_level: data.classes?.level || 'N/A',
          branch_name: data.branches?.school_name || 'N/A',
          parent_names: parentNames || 'Not Assigned',
        };

        setStudent(formattedStudent);
      }
    } catch (error: any) {
      console.error('Error fetching student:', error);
      toast.error(error.message || 'Failed to fetch student details');
      navigate('/students');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      transferred: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return styles[status] || styles.active;
  };

  const getAdmissionStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      admitted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      withdrawn: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[status] || styles.pending;
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
        <p className="text-gray-500 dark:text-gray-400 mt-2">The student you're looking for doesn't exist.</p>
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
            to="/students"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Student Profile
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {student.first_name} {student.last_name} • {student.admission_number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
            <Download className="w-4 h-4" />
            Export
          </button>
          <Link
            to={`/students/edit/${student.id}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-4xl font-bold flex-shrink-0">
                {student.passport_url ? (
                  <img src={student.passport_url} alt={student.first_name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  `${student.first_name[0]}${student.last_name[0]}`
                )}
              </div>
              <div className="absolute -bottom-1 -right-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(student.current_status)}`}>
                  {student.current_status}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {student.first_name} {student.middle_name || ''} {student.last_name}
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Admission:</span> {student.admission_number}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Student ID:</span> {student.student_id}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Class:</span> {student.class_name}
                </span>
                {student.class_code && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Class Code:</span> {student.class_code}
                  </span>
                )}
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Branch:</span> {student.branch_name}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3">
                {student.email && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                    <Mail className="w-4 h-4" />
                    {student.email}
                  </span>
                )}
                {student.phone_number && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                    <Phone className="w-4 h-4" />
                    {student.phone_number}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                  <Calendar className="w-4 h-4" />
                  {dayjs(student.date_of_birth).format('MMMM D, YYYY')}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                  <span className="capitalize">{student.gender}</span>
                </span>
                {student.class_level && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getLevelBadge(student.class_level)}`}>
                    {student.class_level}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm">
                <MessageSquare className="w-4 h-4" />
                Message
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm">
                <CreditCard className="w-4 h-4" />
                Payments
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm">
                <FileText className="w-4 h-4" />
                Documents
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6 overflow-x-auto">
          {['overview', 'academic', 'medical', 'parents', 'payments', 'documents'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Personal Information
                </h3>
                <dl className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Full Name</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {student.first_name} {student.middle_name || ''} {student.last_name}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Gender</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white capitalize">{student.gender}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {dayjs(student.date_of_birth).format('MMMM D, YYYY')}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Place of Birth</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.place_of_birth || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Nationality</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.nationality}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">State of Origin</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.state_of_origin || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">LGA</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.lga || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Religion</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.religion || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Blood Group</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.blood_group || 'N/A'}</dd>
                  </div>
                </dl>
              </div>

              {/* Contact & Academic */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  Contact & Academic
                </h3>
                <dl className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.email || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Phone</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.phone_number || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Home Address</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.home_address}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Residential Address</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.residential_address || 'Same as home'}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Class</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.class_name}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Class Code</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.class_code || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Class Level</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getLevelBadge(student.class_level || '')}`}>
                        {student.class_level || 'N/A'}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Class Arm</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.class_arm || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Admission Date</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {dayjs(student.admission_date).format('MMMM D, YYYY')}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Admission Status</dt>
                    <dd className="text-sm font-medium">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getAdmissionStatusBadge(student.admission_status)}`}>
                        {student.admission_status}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Transportation</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {student.transportation_status ? 'Yes' : 'No'}
                      {student.pickup_location && ` (${student.pickup_location})`}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {activeTab === 'academic' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-purple-600" />
                Academic Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Current Class Information</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Class</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.class_name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Class Code</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.class_code}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Level</dt>
                      <dd className="text-sm font-medium">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getLevelBadge(student.class_level || '')}`}>
                          {student.class_level}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Class Arm</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.class_arm || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Department</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.department || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Academic Status</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Admission Status</dt>
                      <dd className="text-sm font-medium">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getAdmissionStatusBadge(student.admission_status)}`}>
                          {student.admission_status}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Current Status</dt>
                      <dd className="text-sm font-medium">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(student.current_status)}`}>
                          {student.current_status}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Previous School</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.previous_school || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Transfer Status</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.transfer_status ? 'Yes' : 'No'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Medical Information
                </h3>
                <dl className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Doctor</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.doctor_name || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Hospital</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.hospital_name || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Blood Group</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.blood_group || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Genotype</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.genotype || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Allergies</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.allergies || 'None'}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Health Notes
                </h3>
                <dl className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Medical Conditions</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.medical_conditions || 'None'}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Special Needs</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.special_needs || 'None'}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Medical Info</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {student.medical_info ? JSON.stringify(student.medical_info) : 'None'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {activeTab === 'parents' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Parent / Guardian Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Primary Contact</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Name</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">{student.parent_names || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Relationship</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">
                        {student.guardian_info?.relationship || 'Parent'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Phone</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-white">
                        {student.emergency_contact?.phone || 'N/A'}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Guardian Details</h4>
                  <dl className="space-y-2">
                    {student.guardian_info && typeof student.guardian_info === 'object' ? (
                      Object.entries(student.guardian_info).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <dt className="text-sm text-gray-500 dark:text-gray-400 capitalize">{key.replace('_', ' ')}</dt>
                          <dd className="text-sm font-medium text-gray-900 dark:text-white">{String(value) || 'N/A'}</dd>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No guardian information available</p>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Payment History</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Payment records will be displayed here</p>
              <button className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all">
                View All Payments
              </button>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Documents</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Student documents will be displayed here</p>
              <button className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all">
                Upload Document
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default StudentDetails;
