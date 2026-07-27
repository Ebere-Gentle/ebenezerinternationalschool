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
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import toast from 'react-hot-toast';

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
  // Joined fields
  class_name?: string;
  branch_name?: string;
}

const StudentsList: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchStudents();
  }, [currentPage, searchTerm]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // First, fetch students with class names
      let query = supabase
        .from('students')
        .select(`
          *,
          classes!fk_students_class (
            name,
            code
          )
        `, { count: 'exact' });

      // Apply search filter
      if (searchTerm) {
        query = query.or(
          `first_name.ilike.%${searchTerm}%,` +
          `last_name.ilike.%${searchTerm}%,` +
          `email.ilike.%${searchTerm}%,` +
          `admission_number.ilike.%${searchTerm}%`
        );
      }

      // Pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data - get class name from the joined data
      const formattedStudents = data?.map((item: any) => ({
        ...item,
        class_name: item.classes?.name || 'Not Assigned',
        // We'll get branch name separately or leave it out
      })) || [];

      setStudents(formattedStudents);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast.error(error.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
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
      fetchStudents(); // Refresh list
    } catch (error: any) {
      console.error('Error deleting student:', error);
      toast.error(error.message || 'Failed to delete student');
    }
  };

  const exportStudents = () => {
    toast.success('Export started. Download will begin shortly.');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      transferred: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return colors[status] || colors.active;
  };

  const getStatusDotColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500',
      inactive: 'bg-gray-500',
      transferred: 'bg-yellow-500',
      suspended: 'bg-red-500',
      pending: 'bg-blue-500',
    };
    return colors[status] || colors.active;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage all students across branches
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportStudents}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <Link
            to="/students/register"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25"
          >
            <UserPlus className="w-4 h-4" />
            Register Student
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search by name, admission number, or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {students.filter(s => s.current_status === 'active').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {students.filter(s => s.admission_status === 'pending').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Transferred</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {students.filter(s => s.current_status === 'transferred').length}
          </p>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
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
                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Class
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
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-lg font-medium">No students found</p>
                    <p className="text-sm mt-1">Try adjusting your search or register a new student</p>
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
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
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
                    <td className="hidden lg:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {student.class_name}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(student.current_status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(student.current_status)}`}></span>
                        {student.current_status?.charAt(0).toUpperCase() + student.current_status?.slice(1) || 'Active'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewStudent(student)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400"
                          title="View Student"
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
    </div>
  );
};

export default StudentsList;
