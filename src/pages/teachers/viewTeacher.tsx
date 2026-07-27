import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  DollarSign,
  Fingerprint,
  Edit,
  Loader2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Heart} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const ViewTeacher: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranchAndTeacher = async () => {
      if (!id || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Get branch_id
        let branchId = user.branch_id;
        
        if (!branchId) {
          const { data, error } = await supabase
            .from('users')
            .select('branch_id')
            .eq('id', user.id)
            .single();
          
          if (!error && data?.branch_id) {
            branchId = data.branch_id;
          }
        }

        if (branchId) {
          setBranchId(branchId);
          await fetchTeacher(id, branchId);
        } else {
          toast.error('No branch assigned');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching branch:', error);
        toast.error('Failed to load branch information');
        setLoading(false);
      }
    };

    fetchBranchAndTeacher();
  }, [id, user]);

  const fetchTeacher = async (teacherId: string, branchIdParam: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', teacherId)
        .eq('branch_id', branchIdParam)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('Teacher not found');
          navigate('/teachers');
        } else {
          throw error;
        }
        return;
      }

      setTeacher(data);
    } catch (error: any) {
      console.error('Error fetching teacher:', error);
      toast.error(error.message || 'Failed to load teacher data');
      navigate('/teachers');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'on_leave': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'suspended': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'terminated': return 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Teacher not found</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-1">The teacher you're looking for doesn't exist</p>
        <button
          onClick={() => navigate('/teachers')}
          className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all"
        >
          Back to Teachers
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/teachers')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Teacher Profile
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {teacher.employee_number || 'No ID'} • {teacher.department?.toUpperCase() || 'No Department'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/teachers/edit/${id}`)}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Profile
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center flex-shrink-0">
              {teacher.photo_url ? (
                <img
                  src={teacher.photo_url}
                  alt={teacher.first_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {teacher.first_name} {teacher.last_name}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(teacher.status)}`}>
                  {teacher.status?.replace('_', ' ').toUpperCase() || 'N/A'}
                </span>
                {teacher.biometrics_enrolled && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 flex items-center gap-1">
                    <Fingerprint className="w-3 h-3" />
                    Biometrics Enrolled
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span>{teacher.position || 'No Position'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span>{teacher.department?.toUpperCase() || 'No Department'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{teacher.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{teacher.phone_number || 'No phone'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            Personal Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Full Name</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {teacher.first_name} {teacher.middle_name || ''} {teacher.last_name}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Gender</span>
              <span className="font-medium text-gray-900 dark:text-white capitalize">{teacher.gender}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Date of Birth</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {teacher.date_of_birth ? dayjs(teacher.date_of_birth).format('DD MMM YYYY') : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Nationality</span>
              <span className="font-medium text-gray-900 dark:text-white">{teacher.nationality || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">State of Origin</span>
              <span className="font-medium text-gray-900 dark:text-white">{teacher.state_of_origin || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600 dark:text-gray-300">Address</span>
              <span className="font-medium text-gray-900 dark:text-white text-right">{teacher.address || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-purple-500" />
            Professional Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Employee ID</span>
              <span className="font-medium text-gray-900 dark:text-white">{teacher.employee_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Department</span>
              <span className="font-medium text-gray-900 dark:text-white capitalize">{teacher.department || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Position</span>
              <span className="font-medium text-gray-900 dark:text-white">{teacher.position || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Specialization</span>
              <span className="font-medium text-gray-900 dark:text-white">{teacher.specialization || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Class Teacher</span>
              <span className="font-medium text-gray-900 dark:text-white">{teacher.is_class_teacher ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600 dark:text-gray-300">Years of Experience</span>
              <span className="font-medium text-gray-900 dark:text-white">{teacher.years_of_experience || 0} years</span>
            </div>
          </div>
        </div>

        {/* Education & Subjects */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-green-500" />
            Education & Subjects
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Highest Qualification</span>
              <span className="font-medium text-gray-900 dark:text-white">{teacher.highest_qualification || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Teaching Certificate</span>
              <span className="font-medium text-gray-900 dark:text-white">{teacher.teaching_certificate || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">TRCN Number</span>
              <span className="font-medium text-gray-900 dark:text-white">{teacher.trcn_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Subjects Taught</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {teacher.subjects_taught?.length > 0 ? teacher.subjects_taught.join(', ') : 'None'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600 dark:text-gray-300">Classes Assigned</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {teacher.class_assigned?.length > 0 ? teacher.class_assigned.join(', ') : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Employment & Salary */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-yellow-500" />
            Employment & Salary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Employment Date</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {teacher.employment_date ? dayjs(teacher.employment_date).format('DD MMM YYYY') : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Contract Type</span>
              <span className="font-medium text-gray-900 dark:text-white capitalize">{teacher.contract_type || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Salary</span>
              <span className="font-medium text-gray-900 dark:text-white">₦{teacher.salary?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-300">Bank</span>
              <span className="font-medium text-gray-900 dark:text-white">{teacher.bank_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600 dark:text-gray-300">Account Number</span>
              <span className="font-medium text-gray-900 dark:text-white">{teacher.bank_account_number || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      {teacher.emergency_contact && (
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Emergency Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Name</span>
              <p className="font-medium text-gray-900 dark:text-white">{teacher.emergency_contact.name || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Relationship</span>
              <p className="font-medium text-gray-900 dark:text-white">{teacher.emergency_contact.relationship || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Phone</span>
              <p className="font-medium text-gray-900 dark:text-white">{teacher.emergency_contact.phone || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
              <p className="font-medium text-gray-900 dark:text-white">{teacher.emergency_contact.email || 'N/A'}</p>
            </div>
            <div className="md:col-span-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Address</span>
              <p className="font-medium text-gray-900 dark:text-white">{teacher.emergency_contact.address || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewTeacher;
