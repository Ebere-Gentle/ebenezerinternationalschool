import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Users,
  User,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  School,
  BookMarked,
  UserCheck,
  GraduationCap,
  BarChart3,
  X,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Download,
  Printer,
  Mail,
  Phone,
  Calendar,
  Clock,
  UserPlus,
  UserMinus,
  BookOpen as BookOpenIcon
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

// Types
interface Class {
  id: string;
  name: string;
  code: string;
  level: string;
  class_teacher_id: string | null;
  class_teacher_name?: string;
  branch_id: string;
  academic_session: string;
  status: string;
  capacity: number;
  students_count?: number;
  subjects_count?: number;
  created_at: string;
  updated_at: string;
}

interface Teacher {
  id: string;
  teacher_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string;
}

interface Subject {
  id: string;
  subject_id: string;
  name: string;
  code: string;
  description: string | null;
}

interface ClassStats {
  totalStudents: number;
  totalSubjects: number;
  totalTeachers: number;
  completionRate: number;
}

const ClassesList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [stats, setStats] = useState<ClassStats>({
    totalStudents: 0,
    totalSubjects: 0,
    totalTeachers: 0,
    completionRate: 0
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    level: '',
    class_teacher_id: '',
    capacity: 30,
    status: 'active'
  });
  const [saving, setSaving] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [showClassDetails, setShowClassDetails] = useState(false);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [currentTerm, setCurrentTerm] = useState<any>(null);

  const pageSize = 10;

  useEffect(() => {
    const fetchUserBranch = async () => {
      if (user?.id) {
        try {
          let branchId = user.branch_id;
          
          if (!branchId) {
            const { data, error } = await supabase
              .from('users')
              .select('branch_id')
              .eq('id', user.id)
              .single();
            
            if (!error && data) {
              branchId = data.branch_id;
            }
          }
          
          if (branchId) {
            setUserBranchId(branchId);
            await fetchCurrentTerm(branchId);
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error('Error fetching user branch:', error);
          setLoading(false);
        }
      }
    };
    
    fetchUserBranch();
  }, [user]);

  const fetchCurrentTerm = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('terms')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .single();

      if (!error && data) {
        setCurrentTerm(data);
      } else {
        // Fallback to latest term
        const { data: latest } = await supabase
          .from('terms')
          .select('*')
          .eq('branch_id', branchId)
          .order('start_date', { ascending: false })
          .limit(1)
          .single();

        if (latest) {
          setCurrentTerm(latest);
        }
      }
    } catch (error) {
      console.error('Error fetching current term:', error);
    }
  };

  useEffect(() => {
    if (userBranchId) {
      fetchClasses();
      fetchTeachers();
      fetchSubjects();
    }
  }, [userBranchId, currentPage, searchTerm, statusFilter]);

  const fetchClasses = async () => {
    if (!userBranchId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('classes')
        .select('*', { count: 'exact' })
        .eq('branch_id', userBranchId);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,` +
          `code.ilike.%${searchTerm}%,` +
          `level.ilike.%${searchTerm}%`
        );
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to).order('name');

      const { data, error, count } = await query;

      if (error) throw error;

      // Get students directly from students table (they have class_id)
      const { data: students } = await supabase
        .from('students')
        .select('id, class_id')
        .eq('branch_id', userBranchId)
        .eq('current_status', 'active');

      const studentCounts: Record<string, number> = {};
      students?.forEach(s => {
        if (s.class_id) {
          studentCounts[s.class_id] = (studentCounts[s.class_id] || 0) + 1;
        }
      });

      // Get subject counts from teacher_subjects
      const session = currentTerm?.session || '2026/2027';
      const { data: teacherSubjects } = await supabase
        .from('teacher_subjects')
        .select('class_id, subject_id')
        .eq('academic_session', session);

      const subjectCounts: Record<string, Set<string>> = {};
      teacherSubjects?.forEach(ts => {
        if (ts.class_id) {
          if (!subjectCounts[ts.class_id]) {
            subjectCounts[ts.class_id] = new Set();
          }
          subjectCounts[ts.class_id].add(ts.subject_id);
        }
      });

      // Get class teacher names
      const teacherIds = data?.map(c => c.class_teacher_id).filter(Boolean) || [];
      let teacherNames: Record<string, string> = {};
      if (teacherIds.length > 0) {
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('id, first_name, last_name')
          .in('id', teacherIds);
        
        if (teacherData) {
          teacherNames = teacherData.reduce((acc, t) => {
            acc[t.id] = `${t.first_name} ${t.last_name}`;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const formattedClasses = data?.map(cls => ({
        ...cls,
        class_teacher_name: cls.class_teacher_id ? teacherNames[cls.class_teacher_id] || 'Not Assigned' : 'Not Assigned',
        students_count: studentCounts[cls.id] || 0,
        subjects_count: subjectCounts[cls.id]?.size || 0
      })) || [];

      setClasses(formattedClasses);
      setTotalCount(count || 0);

      // Calculate stats
      const totalStudents = Object.values(studentCounts).reduce((a, b) => a + b, 0);
      const totalSubjects = new Set(teacherSubjects?.map(ts => ts.subject_id) || []).size;
      const totalTeachers = new Set(teacherSubjects?.map(ts => ts.teacher_id) || []).size;
      const completionRate = formattedClasses.length > 0 
        ? formattedClasses.filter(c => c.class_teacher_id).length / formattedClasses.length * 100 
        : 0;

      setStats({
        totalStudents,
        totalSubjects,
        totalTeachers,
        completionRate
      });

    } catch (error: any) {
      console.error('Error fetching classes:', error);
      toast.error(error.message || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    if (!userBranchId) return;

    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, teacher_id, first_name, last_name, email, phone_number')
        .eq('branch_id', userBranchId)
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchSubjects = async () => {
    if (!userBranchId) return;

    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('branch_id', userBranchId)
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchAvailableStudents = async () => {
    if (!selectedClass || !userBranchId) return;

    try {
      // Get students already in this class (from students table)
      const { data: enrolledStudents } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', selectedClass.id)
        .eq('branch_id', userBranchId)
        .eq('current_status', 'active');

      const enrolledIds = enrolledStudents?.map(e => e.id) || [];

      let query = supabase
        .from('students')
        .select('id, first_name, last_name, admission_number, student_id')
        .eq('branch_id', userBranchId)
        .eq('current_status', 'active');

      if (enrolledIds.length > 0) {
        query = query.not('id', 'in', `(${enrolledIds.join(',')})`);
      }

      const { data, error } = await query.order('first_name');

      if (error) throw error;
      setAvailableStudents(data || []);
    } catch (error) {
      console.error('Error fetching available students:', error);
    }
  };

  const handleCreateClass = async () => {
    if (!userBranchId) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert([{
          ...formData,
          branch_id: userBranchId,
          academic_session: currentTerm?.session || '2026/2027',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Class created successfully!');
      setShowCreateModal(false);
      setFormData({
        name: '',
        code: '',
        level: '',
        class_teacher_id: '',
        capacity: 30,
        status: 'active'
      });
      fetchClasses();
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast.error(error.message || 'Failed to create class');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateClass = async () => {
    if (!editingClass) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('classes')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingClass.id);

      if (error) throw error;

      toast.success('Class updated successfully!');
      setEditingClass(null);
      setFormData({
        name: '',
        code: '',
        level: '',
        class_teacher_id: '',
        capacity: 30,
        status: 'active'
      });
      fetchClasses();
    } catch (error: any) {
      console.error('Error updating class:', error);
      toast.error(error.message || 'Failed to update class');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      // First update any students with this class_id to NULL
      await supabase
        .from('students')
        .update({ class_id: null })
        .eq('class_id', id);

      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Class deleted successfully!');
      fetchClasses();
    } catch (error: any) {
      console.error('Error deleting class:', error);
      toast.error(error.message || 'Failed to delete class');
    }
  };

  const viewClassDetails = async (cls: Class) => {
    setSelectedClass(cls);
    setShowClassDetails(true);
    setLoadingDetails(true);

    try {
      // Fetch students directly from students table (they have class_id)
      const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name, admission_number, student_id, email, phone_number, gender, date_of_birth')
        .eq('class_id', cls.id)
        .eq('branch_id', userBranchId)
        .eq('current_status', 'active');

      setClassStudents(students || []);

      // Fetch subjects and teachers for this class
      const session = currentTerm?.session || '2026/2027';
      const { data: teacherSubjects } = await supabase
        .from('teacher_subjects')
        .select(`
          *,
          teachers:teacher_id (
            first_name,
            last_name,
            teacher_id
          ),
          subjects:subject_id (
            name,
            code,
            subject_id
          )
        `)
        .eq('class_id', cls.id)
        .eq('academic_session', session);

      setClassSubjects(teacherSubjects || []);
      await fetchAvailableStudents();
    } catch (error) {
      console.error('Error fetching class details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAddStudent = async () => {
    if (!selectedClass || !selectedStudent) {
      toast.error('Please select a student');
      return;
    }

    setAddingStudent(true);
    try {
      // Update the student's class_id directly
      const { error } = await supabase
        .from('students')
        .update({ 
          class_id: selectedClass.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedStudent);

      if (error) throw error;

      // Also add to student_classes for history tracking
      await supabase
        .from('student_classes')
        .insert([{
          student_id: selectedStudent,
          class_id: selectedClass.id,
          academic_session: currentTerm?.session || '2026/2027',
          term: currentTerm?.term || '2nd Term',
          start_date: new Date().toISOString(),
          is_current: true,
          created_at: new Date().toISOString()
        }]);

      toast.success('Student added to class successfully!');
      setSelectedStudent('');
      setShowAddStudentModal(false);
      viewClassDetails(selectedClass);
      fetchClasses(); // Refresh stats
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error.message || 'Failed to add student');
    } finally {
      setAddingStudent(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Remove this student from the class?')) return;

    try {
      // Update the student's class_id to NULL
      const { error } = await supabase
        .from('students')
        .update({ 
          class_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId);

      if (error) throw error;

      toast.success('Student removed from class');
      viewClassDetails(selectedClass!);
      fetchClasses(); // Refresh stats
    } catch (error: any) {
      console.error('Error removing student:', error);
      toast.error(error.message || 'Failed to remove student');
    }
  };

  const handleAddSubject = async () => {
    if (!selectedClass || !selectedSubject || !selectedTeacher) {
      toast.error('Please select a subject and teacher');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('teacher_subjects')
        .insert([{
          teacher_id: selectedTeacher,
          subject_id: selectedSubject,
          class_id: selectedClass.id,
          academic_session: currentTerm?.session || '2026/2027',
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      toast.success('Subject assigned to class successfully!');
      setSelectedSubject('');
      setSelectedTeacher('');
      setShowAddSubjectModal(false);
      viewClassDetails(selectedClass);
    } catch (error: any) {
      console.error('Error adding subject:', error);
      toast.error(error.message || 'Failed to add subject');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubject = async (subjectId: string) => {
    if (!confirm('Remove this subject from the class?')) return;

    try {
      const { error } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('id', subjectId);

      if (error) throw error;

      toast.success('Subject removed from class');
      viewClassDetails(selectedClass!);
    } catch (error: any) {
      console.error('Error removing subject:', error);
      toast.error(error.message || 'Failed to remove subject');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <GraduationCap className="w-8 h-8" />
            Classes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage all classes, subjects, and assignments
          </p>
        </div>
        <button
          onClick={() => {
            setEditingClass(null);
            setFormData({
              name: '',
              code: '',
              level: '',
              class_teacher_id: '',
              capacity: 30,
              status: 'active'
            });
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Class
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-4 border border-white/20 dark:border-gray-700/50 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Classes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <School className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-4 border border-white/20 dark:border-gray-700/50 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Students</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalStudents}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-4 border border-white/20 dark:border-gray-700/50 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Subjects</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalSubjects}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg">
              <BookMarked className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-4 border border-white/20 dark:border-gray-700/50 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Completion</p>
              <p className="text-2xl font-bold text-orange-600">{Math.round(stats.completionRate)}%</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search classes by name, code, or level..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
        <button
          onClick={fetchClasses}
          className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl">
          <School className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">No classes found</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create your first class to get started</p>
          <button
            onClick={() => {
              setEditingClass(null);
              setFormData({
                name: '',
                code: '',
                level: '',
                class_teacher_id: '',
                capacity: 30,
                status: 'active'
              });
              setShowCreateModal(true);
            }}
            className="mt-4 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls, index) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{cls.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        cls.status === 'active' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {cls.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Code: {cls.code}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Level: {cls.level}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg flex-shrink-0">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <Users className="w-4 h-4 mx-auto text-blue-500" />
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{cls.students_count || 0}</p>
                    <p className="text-[10px] text-gray-500">Students</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <BookMarked className="w-4 h-4 mx-auto text-purple-500" />
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{cls.subjects_count || 0}</p>
                    <p className="text-[10px] text-gray-500">Subjects</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <User className="w-4 h-4 mx-auto text-green-500" />
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                      {cls.class_teacher_name && cls.class_teacher_name !== 'Not Assigned' ? '✅' : '❌'}
                    </p>
                    <p className="text-[10px] text-gray-500">Class Teacher</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="text-xs text-gray-500 truncate max-w-[120px]">
                    {cls.class_teacher_name || 'No class teacher assigned'}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => viewClassDetails(cls)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingClass(cls);
                        setFormData({
                          name: cls.name,
                          code: cls.code,
                          level: cls.level,
                          class_teacher_id: cls.class_teacher_id || '',
                          capacity: cls.capacity || 30,
                          status: cls.status || 'active'
                        });
                        setShowCreateModal(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all text-yellow-600 dark:text-yellow-400"
                      title="Edit Class"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-500"
                      title="Delete Class"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
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

      {/* Create/Edit Class Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingClass ? 'Edit Class' : 'Create New Class'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingClass(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Class Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    placeholder="e.g., JSS 1 Gold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Class Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    placeholder="e.g., JSS1G"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Level *
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  >
                    <option value="">Select Level</option>
                    <option value="Creche">Creche</option>
                    <option value="Nursery">Nursery</option>
                    <option value="Primary">Primary</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Class Teacher
                  </label>
                  <select
                    value={formData.class_teacher_id}
                    onChange={(e) => setFormData({ ...formData, class_teacher_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  >
                    <option value="">Select Class Teacher</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 30 })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    min="1"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingClass(null);
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingClass ? handleUpdateClass : handleCreateClass}
                    disabled={saving || !formData.name || !formData.code || !formData.level}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {editingClass ? 'Update Class' : 'Create Class'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Class Details Modal */}
      <AnimatePresence>
        {showClassDetails && selectedClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedClass.name} - Details
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedClass.code} • {selectedClass.level}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowAddStudentModal(true);
                      fetchAvailableStudents();
                    }}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all flex items-center gap-1"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Student
                  </button>
                  <button
                    onClick={() => setShowAddSubjectModal(true)}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Subject
                  </button>
                  <button
                    onClick={() => {
                      setShowClassDetails(false);
                      setSelectedClass(null);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    {/* Class Info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                      <div>
                        <p className="text-xs text-gray-500">Class Teacher</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {selectedClass.class_teacher_name || 'Not Assigned'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Capacity</p>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedClass.capacity || 30}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Students</p>
                        <p className="font-medium text-gray-900 dark:text-white">{classStudents.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Subjects</p>
                        <p className="font-medium text-gray-900 dark:text-white">{classSubjects.length}</p>
                      </div>
                    </div>

                    {/* Students Section */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-blue-500" />
                        Students ({classStudents.length})
                      </h4>
                      {classStudents.length === 0 ? (
                        <p className="text-sm text-gray-500">No students enrolled in this class</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {classStudents.map((student) => (
                            <div key={student.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                  {student.first_name?.[0]}{student.last_name?.[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {student.first_name} {student.last_name}
                                  </p>
                                  <p className="text-xs text-gray-500">{student.admission_number}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveStudent(student.id)}
                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                title="Remove student"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Subjects & Teachers Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                        <BookMarked className="w-4 h-4 text-purple-500" />
                        Subjects & Teachers ({classSubjects.length})
                      </h4>
                      {classSubjects.length === 0 ? (
                        <p className="text-sm text-gray-500">No subjects assigned to this class</p>
                      ) : (
                        <div className="space-y-2">
                          {classSubjects.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {item.subjects?.name || 'Unknown Subject'}
                                </p>
                                <p className="text-xs text-gray-500">Code: {item.subjects?.code || 'N/A'}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {item.teachers ? `${item.teachers.first_name} ${item.teachers.last_name}` : 'No teacher assigned'}
                                  </p>
                                  <p className="text-xs text-gray-500">{item.teachers?.teacher_id || ''}</p>
                                </div>
                                <button
                                  onClick={() => handleRemoveSubject(item.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                  title="Remove subject"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddStudentModal && selectedClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Student to Class</h3>
                <button
                  onClick={() => {
                    setShowAddStudentModal(false);
                    setSelectedStudent('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Student
                  </label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  >
                    <option value="">Select a student...</option>
                    {availableStudents.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} - {student.admission_number}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowAddStudentModal(false);
                      setSelectedStudent('');
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStudent}
                    disabled={!selectedStudent || addingStudent}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {addingStudent ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    Add Student
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Subject Modal */}
      <AnimatePresence>
        {showAddSubjectModal && selectedClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assign Subject to Class</h3>
                <button
                  onClick={() => {
                    setShowAddSubjectModal(false);
                    setSelectedSubject('');
                    setSelectedTeacher('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Subject
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  >
                    <option value="">Select a subject...</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assign Teacher
                  </label>
                  <select
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  >
                    <option value="">Select a teacher...</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowAddSubjectModal(false);
                      setSelectedSubject('');
                      setSelectedTeacher('');
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSubject}
                    disabled={!selectedSubject || !selectedTeacher || saving}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Assign Subject
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClassesList;
