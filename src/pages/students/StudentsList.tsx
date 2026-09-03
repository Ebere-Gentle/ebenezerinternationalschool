import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ChevronDown,
  X,
  FileJson,
  Table,
  FileText,
  GraduationCap,
  School,
  Award
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface Student {
  id: string;
  student_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string | null;
  phone_number: string | null;
  gender: string;
  class_id: string | null;
  class_arm: string | null;
  admission_status: string;
  current_status: string;
  passport_url: string | null;
  date_of_birth: string;
  home_address: string | null;
  created_at: string;
  class_name?: string;
  branch_name?: string;
  class_level?: string;
  class_order?: number;
}

// Class level order for sorting (lowest to highest) - all lowercase to match DB enum
const CLASS_ORDER: Record<string, number> = {
  'creche': 1,
  'nursery': 2,
  'primary': 3,
  'junior': 4,
  'senior': 5
  // 'graduate' is not in the enum, so we'll handle it differently
};

// Display names for levels - matching the actual DB enum values
const LEVEL_DISPLAY_NAMES: Record<string, string> = {
  'creche': 'Creche',
  'nursery': 'Nursery',
  'primary': 'Primary',
  'junior': 'Junior',
  'senior': 'Senior'
};

// Class level colors
const LEVEL_COLORS: Record<string, string> = {
  'creche': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'nursery': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'primary': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'junior': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'senior': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
};

// For detecting graduate students - they have current_status = 'graduated' or class name contains 'Graduate'
const isGraduateStudent = (student: any): boolean => {
  // Check if student has 'graduated' status
  if (student.current_status?.toLowerCase() === 'graduated') return true;
  
  // Check if class name contains 'Graduate'
  if (student.class_name?.toLowerCase().includes('graduate')) return true;
  
  // Check if class level is 'graduate' (even though it's not in the enum)
  if (student.class_level?.toLowerCase() === 'graduate') return true;
  
  return false;
};

const StudentsList: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [showGraduated, setShowGraduated] = useState<boolean>(false);
  const [classes, setClasses] = useState<{id: string, name: string, level: string, code: string}[]>([]);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [currentPage, searchTerm, statusFilter, classFilter, showGraduated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowExportDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, code, level')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      // Sort classes by level order - only use valid enum values
      const sortedClasses = data?.sort((a, b) => {
        const orderA = CLASS_ORDER[a.level?.toLowerCase()] || 999;
        const orderB = CLASS_ORDER[b.level?.toLowerCase()] || 999;
        return orderA - orderB;
      }) || [];

      setClasses(sortedClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Build the query
      let query = supabase
        .from('students')
        .select(`
          *,
          classes!fk_students_class (
            id,
            name,
            code,
            level
          )
        `);

      if (searchTerm) {
        query = query.or(
          `first_name.ilike.%${searchTerm}%,` +
          `last_name.ilike.%${searchTerm}%,` +
          `email.ilike.%${searchTerm}%,` +
          `admission_number.ilike.%${searchTerm}%`
        );
      }

      if (statusFilter !== 'all') {
        query = query.eq('current_status', statusFilter);
      }

      if (classFilter !== 'all') {
        query = query.eq('class_id', classFilter);
      }

      // Get all data for export and filtering
      const { data: allData, error: allError } = await query;

      if (allError) throw allError;

      const formattedAllStudents = allData?.map((item: any) => ({
        ...item,
        class_name: item.classes?.name || 'Not Assigned',
        class_level: item.classes?.level || null,
        class_order: item.classes?.level ? CLASS_ORDER[item.classes.level.toLowerCase()] : 999
      })) || [];

      // Sort all students by class level (lowest to highest)
      const sortedAll = formattedAllStudents.sort((a, b) => {
        // Put students with no class at the end
        if (!a.class_order && !b.class_order) return 0;
        if (!a.class_order) return 1;
        if (!b.class_order) return -1;
        return a.class_order - b.class_order;
      });

      setAllStudents(sortedAll);

      // Filter students based on showGraduated toggle
      let nonGraduateStudents = sortedAll;
      if (!showGraduated) {
        nonGraduateStudents = sortedAll.filter(s => !isGraduateStudent(s));
      }

      setFilteredStudents(nonGraduateStudents);

      // Then get paginated results
      let paginatedQuery = supabase
        .from('students')
        .select(`
          *,
          classes!fk_students_class (
            id,
            name,
            code,
            level
          )
        `, { count: 'exact' });

      if (searchTerm) {
        paginatedQuery = paginatedQuery.or(
          `first_name.ilike.%${searchTerm}%,` +
          `last_name.ilike.%${searchTerm}%,` +
          `email.ilike.%${searchTerm}%,` +
          `admission_number.ilike.%${searchTerm}%`
        );
      }

      if (statusFilter !== 'all') {
        paginatedQuery = paginatedQuery.eq('current_status', statusFilter);
      }

      if (classFilter !== 'all') {
        paginatedQuery = paginatedQuery.eq('class_id', classFilter);
      }

      // If not showing graduated, exclude them
      if (!showGraduated) {
        // We need to filter out graduated students - we'll do this in memory
        // since we can't filter by class level in the query (it's not in the enum)
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      paginatedQuery = paginatedQuery.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await paginatedQuery;

      if (error) throw error;

      const formattedStudents = data?.map((item: any) => ({
        ...item,
        class_name: item.classes?.name || 'Not Assigned',
        class_level: item.classes?.level || null,
        class_order: item.classes?.level ? CLASS_ORDER[item.classes.level.toLowerCase()] : 999
      })) || [];

      // Filter paginated results for graduated if needed
      let filteredPaginated = formattedStudents;
      if (!showGraduated) {
        filteredPaginated = formattedStudents.filter(s => !isGraduateStudent(s));
      }

      // Sort paginated students by class level
      const sortedPaginated = filteredPaginated.sort((a, b) => {
        if (!a.class_order && !b.class_order) return 0;
        if (!a.class_order) return 1;
        if (!b.class_order) return -1;
        return a.class_order - b.class_order;
      });

      setStudents(sortedPaginated);
      
      // Count total excluding graduated if needed
      let total = count || 0;
      if (!showGraduated) {
        const graduatedCount = allData?.filter(s => isGraduateStudent(s)).length || 0;
        total = (count || 0) - graduatedCount;
      }
      setTotalCount(Math.max(0, total));
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast.error(error.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleViewStudent = (student: Student) => {
    navigate(`/students/${student.id}`);
  };

  const handleEditStudent = (student: Student) => {
    navigate(`/students/edit/${student.id}`);
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete ${student.first_name} ${student.last_name}?`)) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', student.id);

      if (error) throw error;

      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error: any) {
      console.error('Error deleting student:', error);
      toast.error(error.message || 'Failed to delete student');
    }
  };

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================
  
  const exportStudentsJSON = async () => {
    const exportData = showGraduated ? allStudents : allStudents.filter(s => !isGraduateStudent(s));
    if (exportData.length === 0) {
      toast.error('No students to export');
      return;
    }

    setExporting(true);
    try {
      const cleanData = exportData.map(student => ({
        ...student,
        class_name: student.class_name || 'Not Assigned',
        date_of_birth: student.date_of_birth ? dayjs(student.date_of_birth).format('YYYY-MM-DD') : null,
        created_at: dayjs(student.created_at).format('YYYY-MM-DD HH:mm:ss'),
      }));

      const blob = new Blob(
        [JSON.stringify(cleanData, null, 2)],
        { type: 'application/json' }
      );
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `students_export_${dayjs().format('YYYY-MM-DD')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${exportData.length} students as JSON`);
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export students');
    } finally {
      setExporting(false);
    }
  };

  const exportStudentsCSV = async () => {
    const exportData = showGraduated ? allStudents : allStudents.filter(s => !isGraduateStudent(s));
    if (exportData.length === 0) {
      toast.error('No students to export');
      return;
    }

    setExporting(true);
    try {
      const fields = [
        'student_id', 'admission_number', 'first_name', 'last_name', 
        'gender', 'date_of_birth', 'email', 'phone_number', 
        'class_name', 'admission_status', 'current_status', 'home_address'
      ];
      
      let csv = fields.join(',') + '\n';
      
      exportData.forEach(student => {
        const row = fields.map(field => {
          let value = student[field as keyof Student] || '';
          if (field === 'date_of_birth' && value) {
            value = dayjs(value).format('YYYY-MM-DD');
          }
          if (field === 'class_name') {
            value = student.class_name || 'Not Assigned';
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
      link.download = `students_export_${dayjs().format('YYYY-MM-DD')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${exportData.length} students as CSV`);
      setShowExportDropdown(false);
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  // ============================================
  // PRINT FUNCTION
  // ============================================
  
  const printStudentsList = async () => {
    const printData = showGraduated ? allStudents : allStudents.filter(s => !isGraduateStudent(s));
    if (printData.length === 0) {
      toast.error('No students to print');
      return;
    }

    try {
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Students List</title>
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
            .status-transferred { background: #fef3c7; color: #92400e; }
            .status-suspended { background: #fee2e2; color: #991b1b; }
            .status-graduated { background: #e0e7ff; color: #3730a3; }
            .class-badge { 
              display: inline-block; 
              padding: 2px 8px; 
              border-radius: 4px; 
              font-size: 11px; 
              font-weight: 500;
            }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            .graduated-row { background-color: #f5f3ff !important; }
            @media print {
              .no-print { display: none; }
              .status-badge { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📚 Students List</h1>
            <p>Total Students: ${printData.length}</p>
            <p style="font-size: 14px; color: #6b7280;">
              ${classFilter !== 'all' ? `Class: ${classes.find(c => c.id === classFilter)?.name || 'All'}` : 'All Classes'} • 
              ${statusFilter !== 'all' ? `Status: ${statusFilter}` : 'All Status'} •
              ${showGraduated ? 'Including Graduated' : 'Excluding Graduated'}
            </p>
          </div>
          <div class="meta">
            <span>Generated: ${new Date().toLocaleString()}</span>
            ${searchTerm ? `<span>Search: ${searchTerm}</span>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Admission</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Gender</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${printData.map((student, index) => {
                const isGrad = isGraduateStudent(student);
                return `
                <tr class="${isGrad ? 'graduated-row' : ''}">
                  <td>${index + 1}</td>
                  <td>${student.admission_number || 'N/A'}</td>
                  <td>${student.first_name} ${student.middle_name || ''} ${student.last_name}</td>
                  <td>${student.class_name || 'N/A'}</td>
                  <td>${student.gender || 'N/A'}</td>
                  <td>${student.email || 'N/A'}</td>
                  <td>${student.phone_number || 'N/A'}</td>
                  <td>
                    <span class="status-badge status-${student.current_status || 'active'}">
                      ${student.current_status?.charAt(0).toUpperCase() + student.current_status?.slice(1) || 'Active'}
                    </span>
                  </td>
                </tr>
              `}).join('')}
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
      toast.error('Failed to print student list');
    }
  };

  const toggleExpand = (studentId: string) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      transferred: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      graduated: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    };
    return colors[status] || colors.active;
  };

  const getStatusDotColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500',
      inactive: 'bg-gray-500',
      transferred: 'bg-yellow-500',
      suspended: 'bg-red-500',
      graduated: 'bg-indigo-500',
    };
    return colors[status] || colors.active;
  };

  const getAdmissionStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      admitted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      withdrawn: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return colors[status] || colors.pending;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Get counts
  const activeCount = filteredStudents.filter(s => s.current_status === 'active').length;
  const graduateCount = allStudents.filter(s => isGraduateStudent(s)).length;
  const totalDisplayCount = filteredStudents.length;

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Students
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
            Manage all students across classes
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Graduate Toggle */}
          <button
            onClick={() => setShowGraduated(!showGraduated)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base rounded-xl transition-all ${
              showGraduated
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>{showGraduated ? 'Hide' : 'Show'} Graduated</span>
            {!showGraduated && graduateCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full">
                {graduateCount}
              </span>
            )}
          </button>

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
                  onClick={exportStudentsJSON}
                  disabled={exporting}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  <FileJson className="w-4 h-4" />
                  Export as JSON
                </button>
                <button
                  onClick={exportStudentsCSV}
                  disabled={exporting}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  <Table className="w-4 h-4" />
                  Export as CSV
                </button>
                <button
                  onClick={printStudentsList}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border-t border-gray-200 dark:border-gray-700"
                >
                  <Printer className="w-4 h-4" />
                  Print List
                </button>
              </div>
            )}
          </div>

          {/* Register Button */}
          <Link
            to="/students/register"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden xs:inline">Register</span>
            <span className="xs:hidden">Add</span>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search students..."
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white placeholder:text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-xl transition-all ${
              showFilters || statusFilter !== 'all' || classFilter !== 'all'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden xs:inline">Filters</span>
            {(statusFilter !== 'all' || classFilter !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Dropdown */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Filters</h3>
            <button
              onClick={() => {
                setStatusFilter('all');
                setClassFilter('all');
                setShowFilters(false);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear all
            </button>
          </div>
          
          {/* Class Filter */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Filter by Class</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setClassFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-full capitalize transition-all ${
                  classFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All Classes
              </button>
              {classes.map(cls => {
                const levelKey = cls.level?.toLowerCase() || '';
                return (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setClassFilter(cls.id);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition-all ${
                      classFilter === cls.id
                        ? 'bg-blue-600 text-white'
                        : `${LEVEL_COLORS[levelKey] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'} hover:opacity-80`
                    }`}
                  >
                    {cls.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Filter */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Filter by Status</h4>
            <div className="flex flex-wrap gap-2">
              {['all', 'active', 'inactive', 'transferred', 'suspended', 'graduated'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs sm:text-sm rounded-full capitalize transition-all ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {status === 'all' ? 'All' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Admission Status - Info Only */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Admission Status (Info)</h4>
            <div className="flex flex-wrap gap-2">
              {['pending', 'admitted', 'rejected', 'withdrawn'].map((status) => (
                <span
                  key={status}
                  className={`px-3 py-1 text-xs rounded-full capitalize ${getAdmissionStatusColor(status)}`}
                >
                  {status}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total Active</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
            {activeCount}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">All Students</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totalDisplayCount}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Pending Admission</p>
          <p className="text-lg sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {filteredStudents.filter(s => s.admission_status === 'pending').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Graduated</p>
          <p className="text-lg sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <Award className="w-4 h-4" />
            {graduateCount}
          </p>
        </div>
      </div>

      {/* Students Cards - Mobile First */}
      <div className="space-y-3 sm:hidden">
        {students.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-lg font-medium text-gray-900 dark:text-white">No students found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Try adjusting your search or filters</p>
            <Link
              to="/students/register"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Register Student
            </Link>
          </div>
        ) : (
          students.map((student) => {
            const isGrad = isGraduateStudent(student);
            const levelKey = student.class_level?.toLowerCase() || '';
            return (
              <div
                key={student.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl border ${isGrad ? 'border-indigo-300 dark:border-indigo-700' : 'border-gray-200 dark:border-gray-700'} shadow-sm overflow-hidden`}
              >
                {/* Card Header - Always Visible */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                        {student.passport_url ? (
                          <img src={student.passport_url} alt={student.first_name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          `${student.first_name[0]}${student.last_name[0]}`
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {student.admission_number}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(student.current_status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(student.current_status)}`}></span>
                            {student.current_status?.charAt(0).toUpperCase() + student.current_status?.slice(1) || 'Active'}
                          </span>
                          {student.class_level && LEVEL_COLORS[levelKey] && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLORS[levelKey]}`}>
                              {LEVEL_DISPLAY_NAMES[levelKey] || student.class_level}
                            </span>
                          )}
                          {isGrad && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                              🎓 Graduate
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleExpand(student.id)}
                      className="ml-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex-shrink-0"
                    >
                      <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                        expandedStudent === student.id ? 'rotate-180' : ''
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedStudent === student.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700">
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400 min-w-[80px]">Class:</span>
                        <span className="text-gray-900 dark:text-white font-medium">{student.class_name}</span>
                      </div>
                      {student.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-300 truncate">{student.email}</span>
                        </div>
                      )}
                      {student.phone_number && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-300">{student.phone_number}</span>
                        </div>
                      )}
                      {student.date_of_birth && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-300">
                            {new Date(student.date_of_birth).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {student.gender && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-300 capitalize">{student.gender}</span>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={() => handleViewStudent(student)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => handleEditStudent(student)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-all"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table - Hidden on Mobile */}
      <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Student
                </th>
                <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Admission
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-lg font-medium">No students found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                    <Link
                      to="/students/register"
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all"
                    >
                      <UserPlus className="w-4 h-4" />
                      Register Student
                    </Link>
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const isGrad = isGraduateStudent(student);
                  const levelKey = student.class_level?.toLowerCase() || '';
                  return (
                    <tr key={student.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition ${isGrad ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                            {student.passport_url ? (
                              <img src={student.passport_url} alt={student.first_name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              `${student.first_name[0]}${student.last_name[0]}`
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {student.first_name} {student.middle_name || ''} {student.last_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {student.email || 'No email'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {student.admission_number}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {student.class_name}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        {student.class_level && LEVEL_COLORS[levelKey] && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${LEVEL_COLORS[levelKey]}`}>
                            {LEVEL_DISPLAY_NAMES[levelKey] || student.class_level}
                          </span>
                        )}
                        {isGrad && !student.class_level && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                            🎓 Graduate
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(student.current_status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(student.current_status)}`}></span>
                            {student.current_status?.charAt(0).toUpperCase() + student.current_status?.slice(1) || 'Active'}
                          </span>
                          {student.admission_status && (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getAdmissionStatusColor(student.admission_status)}`}>
                              {student.admission_status}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewStudent(student)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400"
                            title="View Student Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all text-yellow-600 dark:text-yellow-400"
                            title="Edit Student"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-600 dark:text-red-400"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Desktop */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Pagination */}
      {totalPages > 1 && (
        <div className="sm:hidden flex items-center justify-between px-2 py-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {Math.min((currentPage - 1) * pageSize + 1, totalCount)}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 px-2">
              {currentPage}/{totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsList;