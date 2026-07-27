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
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BookMarked,
  UserCheck,
  GraduationCap,
  X,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  Clock,
  UserPlus,
  UserMinus,
  School,
  Filter,
  Tag,
  Copy,
  ExternalLink,
  Target
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface Subject {
  id: string;
  subject_id: string;
  name: string;
  code: string;
  description: string | null;
  branch_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface Teacher {
  id: string;
  teacher_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string;
  specialization: string | null;
}

interface Class {
  id: string;
  name: string;
  code: string;
  level: string;
}

interface TeacherSubject {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string | null;
  academic_session: string;
  created_at: string;
  teacher_name?: string;
  subject_name?: string;
  class_name?: string;
  class_code?: string;
}

interface SubjectStats {
  totalSubjects: number;
  totalTeachers: number;
  totalAssignments: number;
  subjectsWithTeachers: number;
}

const SubjectsManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [stats, setStats] = useState<SubjectStats>({
    totalSubjects: 0,
    totalTeachers: 0,
    totalAssignments: 0,
    subjectsWithTeachers: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Modal states
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);

  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    subject_id: '',
    teacher_id: '',
    class_id: ''
  });
  const [assigning, setAssigning] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showSubjectDetails, setShowSubjectDetails] = useState(false);
  const [subjectTeachers, setSubjectTeachers] = useState<any[]>([]);
  const [subjectClasses, setSubjectClasses] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  useEffect(() => {
    if (userBranchId) {
      fetchAllData();
    }
  }, [userBranchId, currentPage, searchTerm]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSubjects(),
        fetchTeachers(),
        fetchClasses(),
        fetchTeacherSubjects()
      ]);
      calculateStats();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    if (!userBranchId) return;

    try {
      let query = supabase
        .from('subjects')
        .select('*', { count: 'exact' })
        .eq('branch_id', userBranchId);

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,` +
          `code.ilike.%${searchTerm}%,` +
          `description.ilike.%${searchTerm}%`
        );
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to).order('name');

      const { data, error, count } = await query;

      if (error) throw error;
      setSubjects(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      toast.error(error.message || 'Failed to fetch subjects');
    }
  };

  const fetchTeachers = async () => {
    if (!userBranchId) return;

    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, teacher_id, first_name, last_name, email, phone_number, specialization')
        .eq('branch_id', userBranchId)
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchClasses = async () => {
    if (!userBranchId) return;

    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, code, level')
        .eq('branch_id', userBranchId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchTeacherSubjects = async () => {
    if (!userBranchId) return;

    try {
      const { data, error } = await supabase
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
          ),
          classes:class_id (
            name,
            code
          )
        `)
        .eq('academic_session', '2026/2027');

      if (error) throw error;

      const formatted = data?.map(ts => ({
        ...ts,
        teacher_name: ts.teachers ? `${ts.teachers.first_name} ${ts.teachers.last_name}` : 'Unknown',
        subject_name: ts.subjects?.name || 'Unknown',
        subject_code: ts.subjects?.code || 'N/A',
        class_name: ts.classes?.name || 'All Classes',
        class_code: ts.classes?.code || 'ALL'
      })) || [];

      setTeacherSubjects(formatted);
    } catch (error) {
      console.error('Error fetching teacher subjects:', error);
    }
  };

  const calculateStats = () => {
    const subjectIds = new Set(teacherSubjects.map(ts => ts.subject_id));
    const teacherIds = new Set(teacherSubjects.map(ts => ts.teacher_id));
    
    setStats({
      totalSubjects: subjects.length,
      totalTeachers: teachers.length,
      totalAssignments: teacherSubjects.length,
      subjectsWithTeachers: subjectIds.size
    });
  };

  const handleCreateSubject = async () => {
    if (!userBranchId) return;

    setSaving(true);
    try {
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('subjects')
        .select('id', { count: 'exact' })
        .eq('branch_id', userBranchId);

      const subjectId = `SUB-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
      const code = subjectForm.code.toUpperCase() || `SUB-${String((count || 0) + 1).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('subjects')
        .insert([{
          ...subjectForm,
          code,
          subject_id: subjectId,
          branch_id: userBranchId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Subject created successfully!');
      setShowSubjectModal(false);
      setSubjectForm({ name: '', code: '', description: '' });
      fetchAllData();
    } catch (error: any) {
      console.error('Error creating subject:', error);
      toast.error(error.message || 'Failed to create subject');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('subjects')
        .update({
          ...subjectForm,
          code: subjectForm.code.toUpperCase(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSubject.id);

      if (error) throw error;

      toast.success('Subject updated successfully!');
      setShowSubjectModal(false);
      setEditingSubject(null);
      setSubjectForm({ name: '', code: '', description: '' });
      fetchAllData();
    } catch (error: any) {
      console.error('Error updating subject:', error);
      toast.error(error.message || 'Failed to update subject');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject? This will remove all assignments.')) return;

    try {
      const { error } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('subject_id', id);

      if (error) throw error;

      const { error: deleteError } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Subject deleted successfully!');
      fetchAllData();
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      toast.error(error.message || 'Failed to delete subject');
    }
  };

  const handleAssignTeacher = async () => {
    if (!assignmentForm.subject_id || !assignmentForm.teacher_id) {
      toast.error('Please select a subject and teacher');
      return;
    }

    setAssigning(true);
    try {
      const { data, error } = await supabase
        .from('teacher_subjects')
        .insert([{
          teacher_id: assignmentForm.teacher_id,
          subject_id: assignmentForm.subject_id,
          class_id: assignmentForm.class_id || null,
          academic_session: '2026/2027',
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      toast.success('Teacher assigned to subject successfully!');
      setShowAssignmentModal(false);
      setAssignmentForm({ subject_id: '', teacher_id: '', class_id: '' });
      await fetchAllData();
    } catch (error: any) {
      console.error('Error assigning teacher:', error);
      toast.error(error.message || 'Failed to assign teacher');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    if (!confirm('Remove this teacher from the subject?')) return;

    try {
      const { error } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Teacher removed from subject');
      fetchAllData();
    } catch (error: any) {
      console.error('Error removing assignment:', error);
      toast.error(error.message || 'Failed to remove assignment');
    }
  };

  const viewSubjectDetails = async (subject: Subject) => {
    setSelectedSubject(subject);
    setShowSubjectDetails(true);
    setLoadingDetails(true);

    try {
      // Get teachers for this subject
      const { data: assignments } = await supabase
        .from('teacher_subjects')
        .select(`
          *,
          teachers:teacher_id (
            first_name,
            last_name,
            teacher_id,
            email,
            phone_number
          ),
          classes:class_id (
            name,
            code,
            level
          )
        `)
        .eq('subject_id', subject.id)
        .eq('academic_session', '2026/2027');

      const teachersList = assignments
        ?.filter(a => a.teachers)
        .map(a => ({
          ...a.teachers,
          assignment_id: a.id,
          class_id: a.class_id,
          class_name: a.classes?.name || 'All Classes',
          class_code: a.classes?.code || 'ALL'
        })) || [];

      const classesList = assignments
        ?.filter(a => a.class_id)
        .map(a => ({
          ...a.classes,
          assignment_id: a.id,
          teacher_name: a.teachers ? `${a.teachers.first_name} ${a.teachers.last_name}` : 'Unknown'
        })) || [];

      setSubjectTeachers(teachersList);
      setSubjectClasses(classesList);
    } catch (error) {
      console.error('Error fetching subject details:', error);
    } finally {
      setLoadingDetails(false);
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
            <BookOpen className="w-8 h-8" />
            Subject Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage subjects, assign teachers, and track class assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingSubject(null);
              setSubjectForm({ name: '', code: '', description: '' });
              setShowSubjectModal(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Subject
          </button>
          <button
            onClick={() => {
              setAssignmentForm({ subject_id: '', teacher_id: '', class_id: '' });
              setShowAssignmentModal(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Assign Teacher
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-4 border border-white/20 dark:border-gray-700/50 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Subjects</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalSubjects}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-4 border border-white/20 dark:border-gray-700/50 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Teachers</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalTeachers}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-4 border border-white/20 dark:border-gray-700/50 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Assignments</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalAssignments}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-4 border border-white/20 dark:border-gray-700/50 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Coverage</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.totalSubjects > 0 ? Math.round((stats.subjectsWithTeachers / stats.totalSubjects) * 100) : 0}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
              <Target className="w-5 h-5 text-white" />
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
            placeholder="Search subjects by name, code, or description..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
          />
        </div>
        <button
          onClick={fetchAllData}
          className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Subjects Grid */}
      {subjects.length === 0 ? (
        <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">No subjects found</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create your first subject to get started</p>
          <button
            onClick={() => {
              setEditingSubject(null);
              setSubjectForm({ name: '', code: '', description: '' });
              setShowSubjectModal(true);
            }}
            className="mt-4 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject, index) => {
            // Get teachers for this subject
            const subjectAssignments = teacherSubjects.filter(ts => ts.subject_id === subject.id);
            const teacherNames = subjectAssignments
              .map(ts => ts.teacher_name)
              .filter(Boolean);
            
            // Get classes for this subject
            const classNames = subjectAssignments
              .map(ts => ts.class_name)
              .filter(Boolean);

            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{subject.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {subject.code}
                        </span>
                      </div>
                      {subject.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {subject.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">ID: {subject.subject_id}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg flex-shrink-0">
                      <BookMarked className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                      <Users className="w-4 h-4 mx-auto text-blue-500" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{subjectAssignments.length}</p>
                      <p className="text-[10px] text-gray-500">Assignments</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                      <User className="w-4 h-4 mx-auto text-green-500" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                        {teacherNames.length > 0 ? teacherNames.length : '❌'}
                      </p>
                      <p className="text-[10px] text-gray-500">Teachers</p>
                    </div>
                  </div>

                  {/* Show teachers with their classes */}
                  {teacherNames.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {subjectAssignments.slice(0, 2).map((assignment, idx) => (
                        <div key={idx} className="text-xs text-gray-600 dark:text-gray-300 flex items-center justify-between">
                          <span className="font-medium">{assignment.teacher_name}</span>
                          <span className="text-gray-400">{assignment.class_name || 'All Classes'}</span>
                        </div>
                      ))}
                      {subjectAssignments.length > 2 && (
                        <div className="text-xs text-gray-400">
                          +{subjectAssignments.length - 2} more teacher{subjectAssignments.length - 2 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {dayjs(subject.created_at).format('MMM D, YYYY')}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => viewSubjectDetails(subject)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSubject(subject);
                          setSubjectForm({
                            name: subject.name,
                            code: subject.code,
                            description: subject.description || ''
                          });
                          setShowSubjectModal(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all text-yellow-600 dark:text-yellow-400"
                        title="Edit Subject"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(subject.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-500"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
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

      {/* Create/Edit Subject Modal */}
      <AnimatePresence>
        {showSubjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingSubject ? 'Edit Subject' : 'Create New Subject'}
                </h3>
                <button
                  onClick={() => {
                    setShowSubjectModal(false);
                    setEditingSubject(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    placeholder="e.g., Mathematics"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    placeholder="e.g., MATH101"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={subjectForm.description}
                    onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    placeholder="Enter subject description..."
                  />
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowSubjectModal(false);
                      setEditingSubject(null);
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingSubject ? handleUpdateSubject : handleCreateSubject}
                    disabled={saving || !subjectForm.name || !subjectForm.code}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {editingSubject ? 'Update Subject' : 'Create Subject'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Teacher Modal */}
      <AnimatePresence>
        {showAssignmentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assign Teacher to Subject</h3>
                <button
                  onClick={() => {
                    setShowAssignmentModal(false);
                    setAssignmentForm({ subject_id: '', teacher_id: '', class_id: '' });
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Subject *
                  </label>
                  <select
                    value={assignmentForm.subject_id}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, subject_id: e.target.value })}
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
                    Select Teacher *
                  </label>
                  <select
                    value={assignmentForm.teacher_id}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, teacher_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  >
                    <option value="">Select a teacher...</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name} {teacher.specialization ? `(${teacher.specialization})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assign to Class (Optional)
                  </label>
                  <select
                    value={assignmentForm.class_id}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, class_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  >
                    <option value="">All Classes</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Leave empty to assign to all classes</p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowAssignmentModal(false);
                      setAssignmentForm({ subject_id: '', teacher_id: '', class_id: '' });
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignTeacher}
                    disabled={assigning || !assignmentForm.subject_id || !assignmentForm.teacher_id}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {assigning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    Assign Teacher
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subject Details Modal */}
      <AnimatePresence>
        {showSubjectDetails && selectedSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedSubject.name} - Details
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedSubject.code} • {selectedSubject.subject_id}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSubjectDetails(false);
                    setSelectedSubject(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    {/* Subject Info */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {selectedSubject.description || 'No description provided'}
                      </p>
                      <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-gray-500">Created</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {dayjs(selectedSubject.created_at).format('MMM D, YYYY')}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Teachers</p>
                          <p className="font-medium text-gray-900 dark:text-white">{subjectTeachers.length}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Classes</p>
                          <p className="font-medium text-gray-900 dark:text-white">{subjectClasses.length}</p>
                        </div>
                      </div>
                    </div>

                    {/* Teachers Section */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-blue-500" />
                        Teachers ({subjectTeachers.length})
                      </h4>
                      {subjectTeachers.length === 0 ? (
                        <p className="text-sm text-gray-500">No teachers assigned to this subject</p>
                      ) : (
                        <div className="space-y-2">
                          {subjectTeachers.map((teacher) => (
                            <div key={teacher.assignment_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {teacher.first_name} {teacher.last_name}
                                </p>
                                <p className="text-xs text-gray-500">{teacher.email || teacher.phone_number}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {teacher.class_name}
                                </p>
                                <p className="text-xs text-gray-500">{teacher.class_code}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Classes Section */}
                    {subjectClasses.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                          <School className="w-4 h-4 text-green-500" />
                          Classes ({subjectClasses.length})
                        </h4>
                        <div className="space-y-2">
                          {subjectClasses.map((cls) => (
                            <div key={cls.assignment_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {cls.name} ({cls.code})
                                </p>
                                <p className="text-xs text-gray-500">Level: {cls.level}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-700 dark:text-gray-300">Teacher</p>
                                <p className="text-xs text-gray-500">{cls.teacher_name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubjectsManagement;
