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
  Award,
  BarChart3,
  PieChart,
  SlidersHorizontal,
  UserCheck,
  UserX,
  RefreshCw
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

// Primary display order. Explicitly keeps KG Silver first, KG Gold second,
// and graduates at the very end. Unknown/unassigned classes remain before graduates.
const CLASS_ORDER: Record<string, number> = {
  'creche': 100,
  'nursery': 200,
  'primary': 300,
  'junior': 400,
  'senior': 500
};

const getStudentClassOrder = (student: any): number => {
  if (isGraduateStudent(student)) return 999999;

  const name = String(student.class_name || '').trim().toLowerCase();
  const level = String(student.class_level || '').trim().toLowerCase();

  // Exact early-years ordering requested.
  if (/^kg\s*silver\b/.test(name)) return 10;
  if (/^kg\s*gold\b/.test(name)) return 20;

  // Common Nigerian school naming patterns.
  const numberMatch = name.match(/(?:^|\s)([1-9]|10)(?:\s|$)/);
  const number = numberMatch ? Number(numberMatch[1]) : 0;

  if (/^(creche|crèche)\b/.test(name) || level === 'creche') return 50 + number;
  if (/^nursery\b/.test(name) || level === 'nursery') return 100 + number;
  if (/^(primary|basic)\b/.test(name) || level === 'primary') return 200 + number;
  if (/^j\.?s\.?s?\s*[1-3]\b/.test(name) || level === 'junior') return 300 + number;
  if (/^s\.?s\.?\s*[1-3]\b/.test(name) || level === 'senior') return 400 + number;

  return CLASS_ORDER[level] || 9000;
};

const compareStudents = (a: any, b: any) => {
  const orderA = getStudentClassOrder(a);
  const orderB = getStudentClassOrder(b);

  if (orderA !== orderB) return orderA - orderB;

  const classA = String(a.class_name || 'Not Assigned').toLowerCase();
  const classB = String(b.class_name || 'Not Assigned').toLowerCase();
  const classCompare = classA.localeCompare(classB, undefined, { numeric: true, sensitivity: 'base' });

  if (classCompare !== 0) return classCompare;

  const nameA = `${a.first_name || ''} ${a.middle_name || ''} ${a.last_name || ''}`.trim();
  const nameB = `${b.first_name || ''} ${b.middle_name || ''} ${b.last_name || ''}`.trim();
  return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
};

// Display names for levels - matching the actual DB enum values
const LEVEL_DISPLAY_NAMES: Record<string, string> = {
  'creche': 'Creche',
  'nursery': 'Nursery',
  'primary': 'Primary',
  'junior': 'Junior',
  'senior': 'Senior'
};

// Class level colors - softer, more subtle
const LEVEL_COLORS: Record<string, string> = {
  'creche': 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-300',
  'nursery': 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300',
  'primary': 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300',
  'junior': 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300',
  'senior': 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-300'
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
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [classes, setClasses] = useState<{id: string, name: string, level: string, code: string}[]>([]);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, statusFilter, classFilter, levelFilter, genderFilter]);

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

      if (searchTerm.trim()) {
        const term = searchTerm.trim().replace(/[%_]/g, '');
        query = query.or(
          `first_name.ilike.%${term}%,` +
          `last_name.ilike.%${term}%,` +
          `middle_name.ilike.%${term}%,` +
          `email.ilike.%${term}%,` +
          `admission_number.ilike.%${term}%`
        );
      }

      if (statusFilter !== 'all') {
        query = query.eq('current_status', statusFilter);
      }

      if (classFilter !== 'all') {
        query = query.eq('class_id', classFilter);
      }

      if (genderFilter !== 'all') {
        query = query.eq('gender', genderFilter);
      }

      if (levelFilter !== 'all') {
        query = query.eq('classes.level', levelFilter);
      }

      // IMPORTANT: no range/pagination here. The page intentionally loads
      // the complete matching student register so the visual order is global.
      const { data, error } = await query;

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        ...item,
        class_name: item.classes?.name || 'Not Assigned',
        class_level: item.classes?.level || null,
        class_order: getStudentClassOrder({
          ...item,
          class_name: item.classes?.name || 'Not Assigned',
          class_level: item.classes?.level || null
        })
      }));

      const sorted = formatted.sort(compareStudents);

      setAllStudents(sorted);
      setStudents(sorted);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast.error(error.message || 'Failed to fetch students');
      setStudents([]);
      setAllStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
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
    const exportData = allStudents;
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
    const exportData = allStudents;
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
    const printData = allStudents;
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
              Including Graduated
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
      active: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
      inactive: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      transferred: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
      suspended: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
      graduated: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
    };
    return colors[status] || colors.active;
  };

  const getStatusDotColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-400',
      inactive: 'bg-gray-400',
      transferred: 'bg-yellow-400',
      suspended: 'bg-red-400',
      graduated: 'bg-indigo-400',
    };
    return colors[status] || colors.active;
  };

  const getAdmissionStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
      admitted: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
      rejected: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
      withdrawn: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return colors[status] || colors.pending;
  };

  // Keep a useful selection as the list/filter changes.
  useEffect(() => {
    if (students.length === 0) {
      setSelectedStudentId(null);
      return;
    }
    if (!selectedStudentId || !students.some(s => s.id === selectedStudentId)) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const selectedStudent = students.find(s => s.id === selectedStudentId) || null;
  const activeCount = students.filter(s => s.current_status?.toLowerCase() === 'active').length;
  const graduateCount = students.filter(isGraduateStudent).length;
  const maleCount = students.filter(s => s.gender?.toLowerCase() === 'male').length;
  const femaleCount = students.filter(s => s.gender?.toLowerCase() === 'female').length;
  const otherGenderCount = Math.max(0, students.length - maleCount - femaleCount);
  const pendingCount = students.filter(s => s.admission_status?.toLowerCase() === 'pending').length;
  const unassignedCount = students.filter(s => !s.class_id || !s.class_name || s.class_name === 'Not Assigned').length;
  const classCounts = students.reduce<Record<string, number>>((acc, s) => {
    const key = s.class_name || 'Not Assigned';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const levelCounts = students.reduce<Record<string, number>>((acc, s) => {
    const key = s.class_level ? (LEVEL_DISPLAY_NAMES[s.class_level.toLowerCase()] || s.class_level) : 'Unassigned';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const statusCounts = students.reduce<Record<string, number>>((acc, s) => {
    const key = s.current_status || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const totalDisplayCount = students.length;

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setClassFilter('all');
    setLevelFilter('all');
    setGenderFilter('all');
  };

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Students
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
            Manage all students across classes
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              Complete register
            </span>
          </div>

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
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all shadow-sm"
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
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-all dark:text-white placeholder:text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-xl transition-all ${
              showFilters || statusFilter !== 'all' || classFilter !== 'all'
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden xs:inline">Filters</span>
            {(statusFilter !== 'all' || classFilter !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Dropdown */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-800 dark:text-white">Filters</h3>
            <button
              onClick={() => {
                setStatusFilter('all');
                setClassFilter('all');
                setShowFilters(false);
              }}
              className="text-xs text-blue-500 dark:text-blue-400 hover:underline"
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
                }}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-full capitalize transition-all ${
                  classFilter === 'all'
                    ? 'bg-blue-500 text-white'
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
                    }}
                    className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition-all ${
                      classFilter === cls.id
                        ? 'bg-blue-500 text-white'
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
                  }}
                  className={`px-3 py-1.5 text-xs sm:text-sm rounded-full capitalize transition-all ${
                    statusFilter === status
                      ? 'bg-blue-500 text-white'
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
          <p className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">
            {activeCount}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">All Students</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-500 dark:text-blue-400">
            {totalDisplayCount}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Pending Admission</p>
          <p className="text-lg sm:text-2xl font-bold text-yellow-500 dark:text-yellow-400">
            {pendingCount}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Graduated</p>
          <p className="text-lg sm:text-2xl font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
            <Award className="w-4 h-4" />
            {graduateCount}
          </p>
        </div>
      </div>

      {/* Premium two-column student register */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-700/70 bg-white/90 dark:bg-gray-950/80 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-blue-400" />

        <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500 text-white shadow-sm">
                  <School className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">
                  Complete Student Register
                </h2>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Ordered from <span className="font-semibold text-blue-500 dark:text-blue-400">KG Silver</span> → <span className="font-semibold text-blue-500 dark:text-blue-400">KG Gold</span> → senior classes → <span className="font-semibold text-indigo-500 dark:text-indigo-400">Graduates</span>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200">
                <Users className="w-3.5 h-3.5" />
                {students.length} displayed
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                <Award className="w-3.5 h-3.5" />
                {graduateCount} graduates
              </span>
            </div>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <p className="mt-4 text-lg font-bold text-gray-800 dark:text-white">No students found</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or filters.</p>
            <Link
              to="/students/register"
              className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold shadow-sm hover:bg-blue-600 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Register Student
            </Link>
          </div>
        ) : (
          <div className="space-y-5 px-2 sm:px-0">
            {/* Premium header */}
            <section className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
              <div className="absolute inset-x-0 top-0 h-1 bg-blue-400" />
              <div className="p-5 sm:p-7">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-sm">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-500 dark:text-blue-400">Ebenezer International School Owo</p>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white">Student Intelligence</h1>
                      </div>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm text-gray-500 dark:text-gray-400">A complete student directory with live population analytics, class distribution and quick student intelligence.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => fetchStudents()} className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                      <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                    <div className="relative">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setShowExportDropdown(!showExportDropdown); }} disabled={exporting} className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-900 transition disabled:opacity-50">
                        <Download className="w-4 h-4" /> Export <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {showExportDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-30">
                          <button onClick={exportStudentsJSON} className="flex items-center gap-3 px-4 py-3 w-full text-sm hover:bg-gray-50 dark:hover:bg-gray-800"><FileJson className="w-4 h-4" /> JSON</button>
                          <button onClick={exportStudentsCSV} className="flex items-center gap-3 px-4 py-3 w-full text-sm hover:bg-gray-50 dark:hover:bg-gray-800"><Table className="w-4 h-4" /> CSV</button>
                          <button onClick={printStudentsList} className="flex items-center gap-3 px-4 py-3 w-full text-sm border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"><Printer className="w-4 h-4" /> Print register</button>
                        </div>
                      )}
                    </div>
                    <Link to="/students/register" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-bold shadow-sm hover:bg-blue-600 transition-colors"><UserPlus className="w-4 h-4" /> Add student</Link>
                  </div>
                </div>
              </div>

              {/* Search + advanced filters */}
              <div className="px-5 sm:px-7 pb-5">
                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))_auto] gap-2.5">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={searchTerm} onChange={handleSearch} placeholder="Search name, admission number, email..." className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 text-sm dark:text-white" />
                  </div>
                  <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm dark:text-white outline-none">
                    <option value="all">All classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm dark:text-white outline-none">
                    <option value="all">All levels</option>
                    {Object.entries(LEVEL_DISPLAY_NAMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                  <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} className="px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm dark:text-white outline-none">
                    <option value="all">All genders</option><option value="male">Male</option><option value="female">Female</option>
                  </select>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm dark:text-white outline-none">
                    <option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="transferred">Transferred</option><option value="suspended">Suspended</option><option value="graduated">Graduated</option>
                  </select>
                  <button onClick={clearFilters} className="inline-flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-900"><SlidersHorizontal className="w-4 h-4" /> Clear</button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-300 font-bold">{students.length} matching</span>
                  <span className="px-2.5 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-300 font-bold">{activeCount} active</span>
                  <span className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-300 font-bold">{graduateCount} graduated</span>
                  <span className="ml-auto text-gray-400">KG Silver → KG Gold → Classes → Graduates</span>
                </div>
              </div>
            </section>

            {/* KPI strip - softer colors */}
            <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              {[
                ['Total students', totalDisplayCount, Users, 'text-blue-500'],
                ['Male', maleCount, User, 'text-sky-500'],
                ['Female', femaleCount, User, 'text-pink-500'],
                ['Active', activeCount, UserCheck, 'text-green-500'],
                ['Graduated', graduateCount, GraduationCap, 'text-indigo-500'],
                ['Unassigned', unassignedCount, UserX, 'text-amber-500']
              ].map(([label, value, Icon, tone]) => (
                <div key={String(label)} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 shadow-sm">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-gray-500 dark:text-gray-400">{label}</span><Icon className={`w-4 h-4 ${tone}`} /></div>
                  <div className="mt-2 text-2xl font-black text-gray-800 dark:text-white">{value}</div>
                </div>
              ))}
            </section>

            {/* Master-detail layout */}
            <section className="grid grid-cols-1 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.5fr)] gap-5 items-start">
              {/* LEFT: student register */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur z-10">
                  <div className="flex items-center justify-between">
                    <div><h2 className="font-black text-gray-800 dark:text-white">Student directory</h2><p className="text-xs text-gray-500 mt-1">Select a student to inspect their profile.</p></div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-900">{students.length}</span>
                  </div>
                </div>
                <div className="max-h-[720px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-900">
                  {students.length === 0 ? (
                    <div className="p-10 text-center"><Users className="w-10 h-10 mx-auto text-gray-300" /><p className="mt-3 font-bold">No students found</p><p className="text-xs text-gray-500 mt-1">Adjust your filters and try again.</p></div>
                  ) : students.map((student, index) => {
                    const selected = student.id === selectedStudentId;
                    const isGrad = isGraduateStudent(student);
                    const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`.toUpperCase();
                    return (
                      <button key={student.id} onClick={() => setSelectedStudentId(student.id)} className={`w-full text-left p-4 flex items-center gap-3 transition-all ${selected ? 'bg-blue-50 dark:bg-blue-950/20' : 'hover:bg-gray-50 dark:hover:bg-gray-900/60'}`}>
                        <div className={`w-11 h-11 shrink-0 rounded-xl overflow-hidden flex items-center justify-center font-black text-sm text-white ${isGrad ? 'bg-indigo-400' : 'bg-blue-400'}`}>
                          {student.passport_url ? <img src={student.passport_url} alt="" className="w-full h-full object-cover" loading="lazy" /> : initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2"><span className="text-[10px] font-black text-gray-400">#{String(index + 1).padStart(3, '0')}</span><h3 className="font-bold text-sm text-gray-800 dark:text-white truncate">{student.first_name} {student.middle_name ? `${student.middle_name} ` : ''}{student.last_name}</h3></div>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap"><span className="text-[10px] font-bold text-gray-500">{student.admission_number || 'No admission no.'}</span><span className="text-gray-300">•</span><span className="text-[10px] font-bold text-blue-500 dark:text-blue-400">{student.class_name || 'Not Assigned'}</span></div>
                        </div>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDotColor(student.current_status)}`} title={student.current_status} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: analytics + selected student */}
              <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4"><div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-500"><PieChart className="w-4 h-4" /></div><div><h3 className="font-black">Gender distribution</h3><p className="text-xs text-gray-500">Current filtered register</p></div></div>
                    <div className="h-4 rounded-full bg-gray-100 dark:bg-gray-900 overflow-hidden flex">
                      <div className="bg-sky-400" style={{ width: `${students.length ? maleCount / students.length * 100 : 0}%` }} /><div className="bg-pink-400" style={{ width: `${students.length ? femaleCount / students.length * 100 : 0}%` }} /><div className="bg-gray-400" style={{ width: `${students.length ? otherGenderCount / students.length * 100 : 0}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center"><div><b className="block text-xl">{maleCount}</b><span className="text-[11px] text-gray-500">Male</span></div><div><b className="block text-xl">{femaleCount}</b><span className="text-[11px] text-gray-500">Female</span></div><div><b className="block text-xl">{otherGenderCount}</b><span className="text-[11px] text-gray-500">Other</span></div></div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4"><div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-500"><BarChart3 className="w-4 h-4" /></div><div><h3 className="font-black">Level distribution</h3><p className="text-xs text-gray-500">Students by school section</p></div></div>
                    <div className="space-y-3">{Object.entries(levelCounts).sort((a,b) => b[1]-a[1]).map(([name,count]) => <div key={name}><div className="flex justify-between text-xs font-bold mb-1"><span>{name}</span><span>{count}</span></div><div className="h-2 rounded-full bg-gray-100 dark:bg-gray-900 overflow-hidden"><div className="h-full rounded-full bg-blue-400" style={{ width: `${totalDisplayCount ? count / totalDisplayCount * 100 : 0}%` }} /></div></div>)}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-5"><div><h3 className="font-black">Students per class</h3><p className="text-xs text-gray-500 mt-1">Full class population for the active filters</p></div><BarChart3 className="w-5 h-5 text-blue-500" /></div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">{Object.entries(classCounts).map(([name,count]) => <div key={name}><div className="flex justify-between gap-3 text-xs font-bold mb-1"><span className="truncate">{name}</span><span>{count}</span></div><div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-900 overflow-hidden"><div className="h-full rounded-full bg-blue-400" style={{ width: `${Math.max(3, count / Math.max(1, Math.max(...Object.values(classCounts))) * 100)}%` }} /></div></div>)}</div>
                </div>

                {selectedStudent && (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden shadow-sm">
                    <div className="p-5 sm:p-6 bg-gray-800 text-white relative overflow-hidden">
                      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-blue-400/10 blur-3xl" />
                      <div className="relative flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/10 border border-white/20 flex items-center justify-center font-black text-xl">{selectedStudent.passport_url ? <img src={selectedStudent.passport_url} alt="" className="w-full h-full object-cover" /> : `${selectedStudent.first_name?.[0] || ''}${selectedStudent.last_name?.[0] || ''}`.toUpperCase()}</div>
                          <div><p className="text-[10px] uppercase tracking-[.2em] text-blue-200 font-black">Selected student</p><h2 className="text-xl sm:text-2xl font-black">{selectedStudent.first_name} {selectedStudent.middle_name ? `${selectedStudent.middle_name} ` : ''}{selectedStudent.last_name}</h2><p className="text-sm text-blue-100 mt-1">{selectedStudent.admission_number || 'No admission number'} • {selectedStudent.class_name || 'Not Assigned'}</p></div>
                        </div>
                        <div className="flex gap-2"><button onClick={() => handleViewStudent(selectedStudent)} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold"><Eye className="w-4 h-4 inline mr-1" /> View</button><button onClick={() => handleEditStudent(selectedStudent)} className="px-3 py-2 rounded-xl bg-white text-gray-800 text-xs font-bold"><Edit className="w-4 h-4 inline mr-1" /> Edit</button></div>
                      </div>
                    </div>
                    <div className="p-5 sm:p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        ['Gender', selectedStudent.gender || 'Not provided'],
                        ['Status', selectedStudent.current_status || 'Not provided'],
                        ['Level', selectedStudent.class_level ? (LEVEL_DISPLAY_NAMES[selectedStudent.class_level.toLowerCase()] || selectedStudent.class_level) : 'Unassigned'],
                        ['Admission', selectedStudent.admission_status || 'Not provided']
                      ].map(([label,value]) => <div key={String(label)} className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-3"><p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{label}</p><p className="mt-1 text-sm font-black capitalize text-gray-800 dark:text-white truncate">{value}</p></div>)}
                    </div>
                    <div className="px-5 sm:px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Calendar className="w-4 h-4 text-blue-400" />{selectedStudent.date_of_birth ? dayjs(selectedStudent.date_of_birth).format('DD MMM YYYY') : 'Date of birth not provided'}</div>
                      {selectedStudent.email && <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 truncate"><Mail className="w-4 h-4 text-blue-400" />{selectedStudent.email}</div>}
                      {selectedStudent.phone_number && <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Phone className="w-4 h-4 text-blue-400" />{selectedStudent.phone_number}</div>}
                      {selectedStudent.home_address && <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 truncate"><MapPin className="w-4 h-4 text-blue-400" />{selectedStudent.home_address}</div>}
                    </div>
                    <div className="px-5 sm:px-6 pb-6 flex gap-2"><button onClick={() => handleDeleteStudent(selectedStudent)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-300 text-xs font-bold"><Trash2 className="w-4 h-4" /> Delete</button></div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4"><span className="text-xs text-gray-500">Pending admissions</span><b className="block text-xl mt-1">{pendingCount}</b></div>
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4"><span className="text-xs text-gray-500">Other genders</span><b className="block text-xl mt-1">{otherGenderCount}</b></div>
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4"><span className="text-xs text-gray-500">Classes represented</span><b className="block text-xl mt-1">{Object.keys(classCounts).length}</b></div>
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4"><span className="text-xs text-gray-500">Statuses</span><b className="block text-xl mt-1">{Object.keys(statusCounts).length}</b></div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentsList;