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
  Heart,
  Download,
  Printer,
  ChevronDown,
  FileJson,
  Table,
  FileText
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ViewTeacher: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

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
          setError('No branch assigned');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching branch:', error);
        setError('Failed to load branch information');
        setLoading(false);
      }
    };

    fetchBranchAndTeacher();
  }, [id, user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowExportDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchTeacher = async (teacherId: string, branchIdParam: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', teacherId)
        .eq('branch_id', branchIdParam)
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

      setTeacher(data);
    } catch (error: any) {
      console.error('Error fetching teacher:', error);
      setError(error.message || 'Failed to load teacher data');
      toast.error(error.message || 'Failed to load teacher data');
      navigate('/teachers');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================
  
  const exportTeacherJSON = () => {
    if (!teacher) return;

    try {
      const cleanData = {
        ...teacher,
        created_at: dayjs(teacher.created_at).format('YYYY-MM-DD HH:mm:ss'),
        updated_at: teacher.updated_at ? dayjs(teacher.updated_at).format('YYYY-MM-DD HH:mm:ss') : null,
        date_of_birth: teacher.date_of_birth ? dayjs(teacher.date_of_birth).format('YYYY-MM-DD') : null,
        employment_date: teacher.employment_date ? dayjs(teacher.employment_date).format('YYYY-MM-DD') : null,
      };

      const blob = new Blob(
        [JSON.stringify(cleanData, null, 2)],
        { type: 'application/json' }
      );
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `teacher_${teacher.first_name}_${teacher.last_name}_${dayjs().format('YYYY-MM-DD')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Teacher data exported as JSON');
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export teacher data');
    }
  };

  const exportTeacherCSV = () => {
    if (!teacher) return;

    try {
      const fields = [
        'employee_number', 'first_name', 'last_name', 
        'email', 'phone_number', 'department', 'position',
        'status', 'salary', 'gender', 'date_of_birth',
        'highest_qualification', 'trcn_number', 'years_of_experience'
      ];
      
      let csv = fields.join(',') + '\n';
      
      const row = fields.map(field => {
        let value = teacher[field] || '';
        if (field === 'date_of_birth' && value) {
          value = dayjs(value).format('YYYY-MM-DD');
        }
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csv += row.join(',') + '\n';
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `teacher_${teacher.first_name}_${teacher.last_name}_${dayjs().format('YYYY-MM-DD')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Teacher data exported as CSV');
      setShowExportDropdown(false);
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV');
    }
  };

  // ============================================
  // PRINT FUNCTION
  // ============================================
  
  const printTeacherProfile = () => {
    if (!teacher) return;

    try {
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Teacher Profile - ${teacher.first_name} ${teacher.last_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; }
            h1 { color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 20px; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .field { display: flex; padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
            .field-label { font-weight: 600; width: 180px; color: #4b5563; }
            .field-value { flex: 1; color: #1f2937; }
            .status-badge { 
              display: inline-block; 
              padding: 2px 10px; 
              border-radius: 9999px; 
              font-size: 12px; 
              font-weight: 600;
            }
            .status-active { background: #d1fae5; color: #065f46; }
            .status-inactive { background: #f3f4f6; color: #374151; }
            .status-on_leave { background: #fef3c7; color: #92400e; }
            .status-suspended { background: #fee2e2; color: #991b1b; }
            .status-terminated { background: #f3f4f6; color: #6b7280; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            @media print {
              .no-print { display: none; }
              .section { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Teacher Profile</h1>
            <p><strong>${teacher.first_name} ${teacher.last_name}</strong></p>
            <p>${teacher.employee_number || 'No ID'} • ${teacher.department?.toUpperCase() || 'No Department'}</p>
            <p>
              <span class="status-badge status-${teacher.status || 'active'}">
                ${teacher.status?.replace('_', ' ').toUpperCase() || 'Active'}
              </span>
            </p>
          </div>
          
          <div class="section">
            <h2>Personal Information</h2>
            <div class="field"><span class="field-label">Full Name:</span><span class="field-value">${teacher.first_name} ${teacher.middle_name || ''} ${teacher.last_name}</span></div>
            <div class="field"><span class="field-label">Gender:</span><span class="field-value">${teacher.gender || 'N/A'}</span></div>
            <div class="field"><span class="field-label">Date of Birth:</span><span class="field-value">${teacher.date_of_birth ? dayjs(teacher.date_of_birth).format('DD MMM YYYY') : 'N/A'}</span></div>
            <div class="field"><span class="field-label">Nationality:</span><span class="field-value">${teacher.nationality || 'N/A'}</span></div>
            <div class="field"><span class="field-label">State of Origin:</span><span class="field-value">${teacher.state_of_origin || 'N/A'}</span></div>
            <div class="field"><span class="field-label">Address:</span><span class="field-value">${teacher.address || 'N/A'}</span></div>
          </div>
          
          <div class="section">
            <h2>Contact Information</h2>
            <div class="field"><span class="field-label">Email:</span><span class="field-value">${teacher.email || 'N/A'}</span></div>
            <div class="field"><span class="field-label">Phone:</span><span class="field-value">${teacher.phone_number || 'N/A'}</span></div>
            <div class="field"><span class="field-label">Alternative Phone:</span><span class="field-value">${teacher.alternative_phone || 'N/A'}</span></div>
          </div>
          
          <div class="section">
            <h2>Professional Information</h2>
            <div class="field"><span class="field-label">Employee ID:</span><span class="field-value">${teacher.employee_number || 'N/A'}</span></div>
            <div class="field"><span class="field-label">Department:</span><span class="field-value">${teacher.department?.toUpperCase() || 'N/A'}</span></div>
            <div class="field"><span class="field-label">Position:</span><span class="field-value">${teacher.position || 'N/A'}</span></div>
            <div class="field"><span class="field-label">Specialization:</span><span class="field-value">${teacher.specialization || 'N/A'}</span></div>
            <div class="field"><span class="field-label">Class Teacher:</span><span class="field-value">${teacher.is_class_teacher ? 'Yes' : 'No'}</span></div>
            <div class="field"><span class="field-label">Years of Experience:</span><span class="field-value">${teacher.years_of_experience || 0} years</span></div>
          </div>
          
          <div class="section">
            <h2>Education & Subjects</h2>
            <div class="field"><span class="field-label">Highest Qualification:</span><span class="field-value">${teacher.highest_qualification || 'N/A'}</span></div>
            <div class="field"><span class="field-label">Teaching Certificate:</span><span class="field-value">${teacher.teaching_certificate || 'N/A'}</span></div>
            <div class="field"><span class="field-label">TRCN Number:</span><span class="field-value">${teacher.trcn_number || 'N/A'}</span></div>
            <div class="field"><span class="field-label">Subjects Taught:</span><span class="field-value">${teacher.subjects_taught?.length > 0 ? teacher.subjects_taught.join(', ') : 'None'}</span></div>
            <div class="field"><span class="field-label">Classes Assigned:</span><span class="field-value">${teacher.class_assigned?.length > 0 ? teacher.class_assigned.join(', ') : 'None'}</span></div>
          </div>
          
          <div class="section">
            <h2>Employment & Salary</h2>
            <div class="field"><span class="field-label">Employment Date:</span><span class="field-value">${teacher.employment_date ? dayjs(teacher.employment_date).format('DD MMM YYYY') : 'N/A'}</span></div>
            <div class="field"><span class="field-label">Contract Type:</span><span class="field-value">${teacher.contract_type ? teacher.contract_type.charAt(0).toUpperCase() + teacher.contract_type.slice(1) : 'N/A'}</span></div>
            <div class="field"><span class="field-label">Salary:</span><span class="field-value">₦${teacher.salary?.toLocaleString() || '0'}</span></div>
            <div class="field"><span class="field-label">Bank:</span><span class="field-value">${teacher.bank_name || 'N/A'}</span></div>
            <div class="field"><span class="field-label">Account Number:</span><span class="field-value">${teacher.bank_account_number || 'N/A'}</span></div>
          </div>
          
          ${teacher.emergency_contact ? `
          <div class="section">
            <h2>Emergency Contact</h2>
            <div class="field"><span class="field-label">Name:</span><span class="field-value">${teacher.emergency_contact.name || 'N/A'}</span></div>
            <div class="field"><span class="field-label">Relationship:</span><span class="field-value">${teacher.emergency_contact.relationship || 'N/A'}</span></div>
            <div class="field"><span class="field-label">Phone:</span><span class="field-value">${teacher.emergency_contact.phone || 'N/A'}</span></div>
            <div class="field"><span class="field-label">Email:</span><span class="field-value">${teacher.emergency_contact.email || 'N/A'}</span></div>
            <div class="field"><span class="field-label">Address:</span><span class="field-value">${teacher.emergency_contact.address || 'N/A'}</span></div>
          </div>
          ` : ''}
          
          <div class="footer">
            Printed on ${new Date().toLocaleString()}
          </div>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank', 'width=900,height=800');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      } else {
        toast.error('Please allow popups to print');
      }
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print teacher profile');
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

  // Show loading spinner during initial load
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading teacher profile..." />
      </div>
    );
  }

  // Show error state with loading spinner (no error message)
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading teacher profile..." />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        
        <p className="text-gray-500 dark:text-gray-400 mt-1">Please wait while we fetch the teacher profile.</p>
      
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-2 sm:px-0">
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
              Teacher Profile
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {teacher.employee_number || 'No ID'} • {teacher.department?.toUpperCase() || 'No Department'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowExportDropdown(!showExportDropdown);
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline">Export</span>
              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            
            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-10">
                <button
                  onClick={exportTeacherJSON}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  <FileJson className="w-4 h-4" />
                  Export as JSON
                </button>
                <button
                  onClick={exportTeacherCSV}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  <Table className="w-4 h-4" />
                  Export as CSV
                </button>
                <button
                  onClick={printTeacherProfile}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border-t border-gray-200 dark:border-gray-700"
                >
                  <Printer className="w-4 h-4" />
                  Print Profile
                </button>
              </div>
            )}
          </div>

          {/* Edit Button */}
          <button
            onClick={() => navigate(`/teachers/edit/${id}`)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
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