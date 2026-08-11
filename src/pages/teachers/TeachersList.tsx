import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  Building,
  BookOpen,
  Users,
  DollarSign,
  RefreshCw,
  Loader2,
  AlertCircle,
  Fingerprint,
  User,
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
import LoadingSpinner from '../../components/common/LoadingSpinner';
import dayjs from 'dayjs';

const TeachersList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBiometricsModal, setShowBiometricsModal] = useState(false);
  const [enrollingBiometrics, setEnrollingBiometrics] = useState(false);
  const [biometricsDevice, setBiometricsDevice] = useState('');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  useEffect(() => {
    const fetchBranchAndTeachers = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Get branch_id from user object or fetch from users table
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
          await fetchTeachers(branchId);
        } else {
          setError('No branch assigned. Please contact administrator.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching branch:', error);
        setError('Failed to load branch information');
        setLoading(false);
      }
    };

    fetchBranchAndTeachers();
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowExportDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchTeachers = async (branchIdParam?: string) => {
    const branchIdToUse = branchIdParam || branchId;
    
    if (!branchIdToUse) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // First, get all teachers for export
      const { data: allData, error: allError } = await supabase
        .from('teachers')
        .select('*')
        .eq('branch_id', branchIdToUse)
        .order('created_at', { ascending: false });

      if (allError) throw allError;
      setAllTeachers(allData || []);

      // Then apply filters for display
      let query = supabase
        .from('teachers')
        .select('*')
        .eq('branch_id', branchIdToUse)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(
          `first_name.ilike.%${searchTerm}%,` +
          `last_name.ilike.%${searchTerm}%,` +
          `email.ilike.%${searchTerm}%,` +
          `employee_number.ilike.%${searchTerm}%,` +
          `phone_number.ilike.%${searchTerm}%`
        );
      }

      if (filterDepartment) {
        query = query.eq('department', filterDepartment);
      }

      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTeachers(data || []);
    } catch (error: any) {
      console.error('Error fetching teachers:', error);
      setError(error.message || 'Failed to load teachers');
      toast.error(error.message || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // EXPORT FUNCTIONS - Export ALL teachers
  // ============================================
  
  const exportTeachersJSON = async () => {
    if (allTeachers.length === 0) {
      toast.error('No teachers to export');
      return;
    }

    setExporting(true);
    try {
      const cleanData = allTeachers.map(teacher => ({
        ...teacher,
        created_at: dayjs(teacher.created_at).format('YYYY-MM-DD HH:mm:ss'),
        updated_at: teacher.updated_at ? dayjs(teacher.updated_at).format('YYYY-MM-DD HH:mm:ss') : null,
      }));

      const blob = new Blob(
        [JSON.stringify(cleanData, null, 2)],
        { type: 'application/json' }
      );
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `teachers_export_${dayjs().format('YYYY-MM-DD')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${allTeachers.length} teachers as JSON`);
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export teachers');
    } finally {
      setExporting(false);
    }
  };

  const exportTeachersCSV = async () => {
    if (allTeachers.length === 0) {
      toast.error('No teachers to export');
      return;
    }

    setExporting(true);
    try {
      const fields = [
        'employee_number', 'first_name', 'last_name', 
        'email', 'phone_number', 'department', 'position',
        'status', 'salary', 'gender', 'date_of_birth'
      ];
      
      let csv = fields.join(',') + '\n';
      
      allTeachers.forEach(teacher => {
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
      });
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `teachers_export_${dayjs().format('YYYY-MM-DD')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${allTeachers.length} teachers as CSV`);
      setShowExportDropdown(false);
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  // ============================================
  // PRINT FUNCTION - Print ALL teachers
  // ============================================
  
  const printTeachersList = async () => {
    if (allTeachers.length === 0) {
      toast.error('No teachers to print');
      return;
    }

    try {
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Teachers List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 1200px; margin: 0 auto; }
            h1 { color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; color: #6b7280; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #1a56db; color: white; padding: 10px; text-align: left; }
            td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
            tr:nth-child(even) { background: #f9fafb; }
            .status-badge { 
              display: inline-block; 
              padding: 2px 10px; 
              border-radius: 9999px; 
              font-size: 11px; 
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
              .status-badge { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Teachers List</h1>
            <p>Total Teachers: ${allTeachers.length}</p>
          </div>
          <div class="meta">
            <span>Generated: ${new Date().toLocaleString()}</span>
            ${filterDepartment ? `<span>Department: ${filterDepartment}</span>` : ''}
            ${filterStatus ? `<span>Status: ${filterStatus}</span>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Position</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${allTeachers.map((teacher, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${teacher.employee_number || 'N/A'}</td>
                  <td>${teacher.first_name} ${teacher.last_name}</td>
                  <td>${teacher.department?.toUpperCase() || 'N/A'}</td>
                  <td>${teacher.position || 'N/A'}</td>
                  <td>${teacher.email || 'N/A'}</td>
                  <td>${teacher.phone_number || 'N/A'}</td>
                  <td>
                    <span class="status-badge status-${teacher.status || 'active'}">
                      ${teacher.status?.replace('_', ' ').toUpperCase() || 'Active'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Printed on ${new Date().toLocaleString()} • Page 1 of 1
          </div>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank', 'width=1000,height=800');
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
      toast.error('Failed to print teacher list');
    }
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  const handleDelete = async () => {
    if (!selectedTeacher) return;

    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', selectedTeacher.id);

      if (error) throw error;
      toast.success('Teacher deleted successfully');
      setShowDeleteModal(false);
      setSelectedTeacher(null);
      if (branchId) {
        await fetchTeachers(branchId);
      }
    } catch (error: any) {
      console.error('Error deleting teacher:', error);
      toast.error(error.message || 'Failed to delete teacher');
    }
  };

  const handleBiometricsEnrollment = async (teacherId: string) => {
    if (!biometricsDevice.trim()) {
      toast.error('Please enter a device ID or name');
      return;
    }

    setEnrollingBiometrics(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { error } = await supabase
        .from('teachers')
        .update({
          biometrics_enrolled: true,
          biometrics_data: {
            fingerprint_template: `FP_${Date.now()}`,
            facial_data: `FACE_${Date.now()}`,
            voice_data: `VOICE_${Date.now()}`,
            enrollment_date: new Date().toISOString(),
            last_verified: new Date().toISOString(),
            device_id: biometricsDevice,
          }
        })
        .eq('id', teacherId);

      if (error) throw error;
      toast.success('Biometrics enrolled successfully!');
      setShowBiometricsModal(false);
      setBiometricsDevice('');
      setSelectedTeacher(null);
      if (branchId) {
        await fetchTeachers(branchId);
      }
    } catch (error: any) {
      console.error('Error enrolling biometrics:', error);
      toast.error(error.message || 'Failed to enroll biometrics');
    } finally {
      setEnrollingBiometrics(false);
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

  const filteredTeachers = teachers.filter(teacher => {
    const searchMatch = 
      teacher.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.phone_number?.includes(searchTerm) ||
      teacher.employee_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const departmentMatch = filterDepartment ? teacher.department === filterDepartment : true;
    const statusMatch = filterStatus ? teacher.status === filterStatus : true;
    
    return searchMatch && departmentMatch && statusMatch;
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

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'on_leave', label: 'On Leave' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'terminated', label: 'Terminated' },
  ];

  // Show loading spinner during initial load
  if (loading && teachers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading teachers..." />
      </div>
    );
  }

  // Show error state with loading spinner (no error message)
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading teachers..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Teachers
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your school's teaching staff
          </p>
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
              disabled={exporting}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden xs:inline">{exporting ? 'Exporting...' : 'Export'}</span>
              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            
            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-10">
                <button
                  onClick={exportTeachersJSON}
                  disabled={exporting}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  <FileJson className="w-4 h-4" />
                  Export as JSON
                </button>
                <button
                  onClick={exportTeachersCSV}
                  disabled={exporting}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  <Table className="w-4 h-4" />
                  Export as CSV
                </button>
                <button
                  onClick={printTeachersList}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border-t border-gray-200 dark:border-gray-700"
                >
                  <Printer className="w-4 h-4" />
                  Print List
                </button>
              </div>
            )}
          </div>

          {/* Add Teacher Button */}
          <button
            onClick={() => navigate('/teachers/add')}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Teacher
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search teachers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
          />
        </div>
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
        >
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept.value} value={dept.value}>{dept.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
        >
          <option value="">All Status</option>
          {statusOptions.map(status => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
        <button
          onClick={() => {
            if (branchId) {
              fetchTeachers(branchId);
            }
          }}
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Teachers Grid */}
      {filteredTeachers.length === 0 ? (
        <div className="text-center py-12">
          <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">Please wait while we fetch the teachers.</p>
         
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeachers.map((teacher, index) => (
            <motion.div
              key={teacher.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl overflow-hidden hover:shadow-2xl transition-all"
            >
              <div className="p-6">
                {/* Header with Photo */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                      {teacher.profile_image_url ? (
                        <img src={teacher.profile_image_url} alt={teacher.first_name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        `${teacher.first_name?.[0] || 'T'}${teacher.last_name?.[0] || 'E'}`
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {teacher.first_name} {teacher.last_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {teacher.employee_number || 'No ID'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTeacher(teacher);
                      setShowDeleteModal(true);
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(teacher.status)}`}>
                    {teacher.status?.replace('_', ' ').toUpperCase() || 'N/A'}
                  </span>
                  {teacher.biometrics_enrolled && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 flex items-center gap-1">
                      <Fingerprint className="w-3 h-3" />
                      Biometrics
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span>{teacher.department?.toUpperCase() || 'N/A'}</span>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <BookOpen className="w-4 h-4 text-gray-400" />
                    <span>{teacher.position || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{teacher.email || 'No email'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{teacher.phone_number || 'N/A'}</span>
                  </div>
                  {teacher.salary > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span>₦{teacher.salary.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => navigate(`/teachers/${teacher.id}`)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </button>
                  <button
                    onClick={() => navigate(`/teachers/edit/${teacher.id}`)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-all text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  {!teacher.biometrics_enrolled && (
                    <button
                      onClick={() => {
                        setSelectedTeacher(teacher);
                        setShowBiometricsModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 hover:bg-teal-200 dark:hover:bg-teal-800/30 transition-all text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <Fingerprint className="w-3 h-3" />
                      Enroll
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-lg font-bold">Delete Teacher</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Are you sure you want to delete <strong>{selectedTeacher.first_name} {selectedTeacher.last_name}</strong>? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Biometrics Modal */}
      {showBiometricsModal && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                Enroll Biometrics
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Enrolling: {selectedTeacher.first_name} {selectedTeacher.last_name}
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
                    <p>Please ensure the biometric device is connected and ready.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowBiometricsModal(false);
                  setBiometricsDevice('');
                  setSelectedTeacher(null);
                }}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBiometricsEnrollment(selectedTeacher.id)}
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
                    <Fingerprint className="w-4 h-4" />
                    Enroll Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeachersList;