import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  User,
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  School,
  BookMarked,
  BarChart3,
  X,
  Check,
  AlertTriangle,
  UserPlus,
  UserMinus,
  BookOpen,
  GraduationCap,
  LayoutGrid,
  List,
  Trash,
  AlertCircle,
  PieChart,
  TrendingUp,
  Calendar,
  Clock,
  Filter
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

// =========================================================
// TYPES
// =========================================================

interface ClassItem {
  id: string;
  class_id?: string;
  name: string;
  code: string;
  level: string;
  class_teacher_id: string | null;
  class_teacher_name?: string;
  branch_id: string;
  academic_session: string | null;
  status: string;
  capacity: number;
  current_students?: number;
  students_count?: number;
  subjects_count?: number;
  teachers_count?: number;
  created_at: string;
  updated_at: string;
}

interface Teacher {
  id: string;
  teacher_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
}

interface Subject {
  id: string;
  subject_id: string;
  name: string;
  code: string;
  description: string | null;
  branch_id?: string;
}

interface ClassSubject {
  id: string;
  branch_id: string;
  class_id: string;
  subject_id: string;
  is_compulsory: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  subjects?: Subject | null;
  teacher_id?: string | null;
  teachers?: Teacher | null;
}

interface ClassStats {
  totalStudents: number;
  totalSubjects: number;
  totalTeachers: number;
  completionRate: number;
  activeClasses: number;
  totalCapacity: number;
  occupancyRate: number;
}

const VALID_LEVELS = ['creche', 'nursery', 'primary', 'junior', 'senior'];
const LEVEL_DISPLAY_NAMES: Record<string, string> = {
  creche: 'Creche',
  nursery: 'Nursery',
  primary: 'Primary',
  junior: 'Junior',
  senior: 'Senior'
};
const LEVEL_COLORS: Record<string, string> = {
  creche: 'from-pink-500 to-rose-500',
  nursery: 'from-purple-500 to-violet-500',
  primary: 'from-blue-500 to-cyan-500',
  junior: 'from-green-500 to-emerald-500',
  senior: 'from-orange-500 to-amber-500'
};
const PAGE_SIZE = 10;

// =========================================================
// COMPONENT
// =========================================================

const ClassesList: React.FC = () => {
  const { user } = useAuth();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [userBranchId, setUserBranchId] = useState<string | null>(null);

  const [stats, setStats] = useState<ClassStats>({
    totalStudents: 0,
    totalSubjects: 0,
    totalTeachers: 0,
    completionRate: 0,
    activeClasses: 0,
    totalCapacity: 0,
    occupancyRate: 0
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
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

  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [showClassDetails, setShowClassDetails] = useState(false);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');

  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');

  const [addingStudent, setAddingStudent] = useState(false);
  const [currentTerm, setCurrentTerm] = useState<any>(null);
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showOrphanCleanup, setShowOrphanCleanup] = useState(false);
  const [orphanRecords, setOrphanRecords] = useState<any[]>([]);

  // =========================================================
  // HELPERS
  // =========================================================

  const isGraduateClass = (cls: ClassItem | null) => {
    if (!cls) return false;
    return cls.name?.toLowerCase().includes('graduate') ||
           cls.code?.toLowerCase() === 'grad' ||
           cls.level === 'graduate';
  };

  // =========================================================
  // USER BRANCH
  // =========================================================

  useEffect(() => {
    const fetchUserBranch = async () => {
      if (!user?.id) return;
      try {
        let branchId = user.branch_id;
        if (!branchId) {
          const { data, error } = await supabase
            .from('users')
            .select('branch_id')
            .eq('id', user.id)
            .single();
          if (!error && data?.branch_id) branchId = data.branch_id;
        }
        if (branchId) {
          setUserBranchId(branchId);
          await fetchCurrentTerm(branchId);
        } else {
          setLoading(false);
          toast.error('Your account is not linked to a school branch.');
        }
      } catch (error) {
        console.error('Error fetching user branch:', error);
        setLoading(false);
      }
    };
    fetchUserBranch();
  }, [user]);

  // =========================================================
  // CURRENT TERM
  // =========================================================

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
        return;
      }
      const { data: latest } = await supabase
        .from('terms')
        .select('*')
        .eq('branch_id', branchId)
        .order('start_date', { ascending: false })
        .limit(1)
        .single();
      if (latest) setCurrentTerm(latest);
    } catch (error) {
      console.error('Error fetching current term:', error);
    }
  };

  // =========================================================
  // INITIAL DATA
  // =========================================================

  useEffect(() => {
    if (!userBranchId) return;
    fetchClasses();
    fetchTeachers();
    fetchSubjects();
  }, [userBranchId, currentPage, searchTerm, statusFilter, levelFilter]);

  // =========================================================
  // CHECK ORPHANED RECORDS
  // =========================================================

  const checkOrphanedRecords = async (classId?: string) => {
    try {
      let query = supabase.from('teacher_subjects').select('*');
      if (classId) query = query.eq('class_id', classId);
      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        setOrphanRecords([]);
        setShowOrphanCleanup(false);
        return [];
      }
      const orphanChecks = await Promise.all(data.map(async record => {
        let isOrphan = false;
        const issues: string[] = [];
        if (record.class_id) {
          const { data: classData } = await supabase
            .from('classes')
            .select('id')
            .eq('id', record.class_id)
            .maybeSingle();
          if (!classData) { isOrphan = true; issues.push('Missing Class'); }
        }
        if (record.subject_id) {
          const { data: subjectData } = await supabase
            .from('subjects')
            .select('id')
            .eq('id', record.subject_id)
            .maybeSingle();
          if (!subjectData) { isOrphan = true; issues.push('Missing Subject'); }
        }
        if (record.teacher_id) {
          const { data: teacherData } = await supabase
            .from('teachers')
            .select('id')
            .eq('id', record.teacher_id)
            .maybeSingle();
          if (!teacherData) { isOrphan = true; issues.push('Missing Teacher'); }
        }
        return isOrphan ? { ...record, issue: issues.join(', ') } : null;
      }));
      const orphans = orphanChecks.filter(Boolean);
      setOrphanRecords(orphans);
      setShowOrphanCleanup(orphans.length > 0);
      return orphans;
    } catch (error) {
      console.error('Error checking orphaned records:', error);
      return [];
    }
  };

  const cleanupOrphanedRecords = async () => {
    if (!orphanRecords.length) {
      toast.info('No orphaned records to clean up');
      return;
    }
    if (!window.confirm(`Delete ${orphanRecords.length} orphaned teacher assignment(s)?`)) return;
    try {
      const ids = orphanRecords.map(record => record.id);
      const { error } = await supabase.from('teacher_subjects').delete().in('id', ids);
      if (error) throw error;
      toast.success(`Cleaned up ${ids.length} orphaned assignment(s)`);
      setOrphanRecords([]);
      setShowOrphanCleanup(false);
      await fetchClasses();
      if (selectedClass) await viewClassDetails(selectedClass);
    } catch (error: any) {
      console.error('Error cleaning up orphans:', error);
      toast.error(error?.message || 'Failed to clean up orphaned records');
    }
  };

  // =========================================================
  // FETCH CLASSES — FIXED STUDENT COUNTS
  // =========================================================

  const fetchClasses = async () => {
    if (!userBranchId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('classes')
        .select('*', { count: 'exact' })
        .eq('branch_id', userBranchId);

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (levelFilter !== 'all') query = query.eq('level', levelFilter);
      if (searchTerm.trim()) {
        const search = searchTerm.trim();
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await query
        .order('name', { ascending: true })
        .range(from, to);

      if (error) throw error;

      const classList = data || [];

      // ------------------------------------------------------------
      // GET ALL STUDENTS FOR THIS BRANCH (including graduated)
      // This is the key fix: we count ALL students, not just active.
      // ------------------------------------------------------------
      const { data: allStudents } = await supabase
        .from('students')
        .select('id, class_id, current_status')
        .eq('branch_id', userBranchId);

      // Count students per class (ALL students, regardless of status)
      const studentCounts: Record<string, number> = {};
      (allStudents || []).forEach(student => {
        if (!student.class_id) return;
        studentCounts[student.class_id] = (studentCounts[student.class_id] || 0) + 1;
      });

      // Also track active counts separately for display
      const activeStudentCounts: Record<string, number> = {};
      (allStudents || []).forEach(student => {
        if (!student.class_id) return;
        if (student.current_status === 'active') {
          activeStudentCounts[student.class_id] = (activeStudentCounts[student.class_id] || 0) + 1;
        }
      });

      // ------------------------------------------------------------
      // CURRICULUM SUBJECT COUNTS
      // ------------------------------------------------------------
      const { data: curriculumAssignments } = await supabase
        .from('class_subjects')
        .select('class_id, subject_id')
        .eq('branch_id', userBranchId)
        .eq('status', 'active');

      const subjectCounts: Record<string, Set<string>> = {};
      (curriculumAssignments || []).forEach(item => {
        if (!item.class_id) return;
        if (!subjectCounts[item.class_id]) subjectCounts[item.class_id] = new Set();
        subjectCounts[item.class_id].add(item.subject_id);
      });

      // ------------------------------------------------------------
      // TEACHER COUNTS
      // ------------------------------------------------------------
      const { data: teacherAssignments } = await supabase
        .from('teacher_subjects')
        .select('class_id, teacher_id, subject_id');

      const teacherCounts: Record<string, Set<string>> = {};
      (teacherAssignments || []).forEach(item => {
        if (!item.class_id) return;
        if (!teacherCounts[item.class_id]) teacherCounts[item.class_id] = new Set();
        teacherCounts[item.class_id].add(item.teacher_id);
      });

      // ------------------------------------------------------------
      // CLASS TEACHERS
      // ------------------------------------------------------------
      const teacherIds = classList.map(cls => cls.class_teacher_id).filter(Boolean);
      const teacherNames: Record<string, string> = {};
      if (teacherIds.length > 0) {
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('id, first_name, last_name')
          .in('id', teacherIds);
        (teacherData || []).forEach(teacher => {
          teacherNames[teacher.id] = `${teacher.first_name} ${teacher.last_name}`;
        });
      }

      // ------------------------------------------------------------
      // FORMAT
      // ------------------------------------------------------------
      const formattedClasses = classList.map(cls => ({
        ...cls,
        class_teacher_name: cls.class_teacher_id
          ? teacherNames[cls.class_teacher_id] || 'Not Assigned'
          : 'Not Assigned',
        students_count: studentCounts[cls.id] || 0,
        active_students: activeStudentCounts[cls.id] || 0,
        subjects_count: subjectCounts[cls.id]?.size || 0,
        teachers_count: teacherCounts[cls.id]?.size || 0
      })).sort((a, b) => {
        const aGraduate = a.name.toLowerCase().includes('graduate');
        const bGraduate = b.name.toLowerCase().includes('graduate');
        if (aGraduate && !bGraduate) return 1;
        if (!aGraduate && bGraduate) return -1;
        return a.name.localeCompare(b.name);
      });

      setClasses(formattedClasses);
      setTotalCount(count || 0);

      // ------------------------------------------------------------
      // GLOBAL STATS
      // ------------------------------------------------------------
      const totalStudents = Object.values(studentCounts).reduce((sum, v) => sum + v, 0);
      const totalSubjects = new Set((curriculumAssignments || []).map(item => item.subject_id)).size;
      const totalTeachers = new Set((teacherAssignments || [])
        .map(item => item.teacher_id).filter(Boolean)).size;
      const activeClasses = classList.filter(c => c.status === 'active').length;
      const totalCapacity = classList.reduce((sum, c) => sum + (c.capacity || 0), 0);
      const occupancyRate = totalCapacity > 0 ? (totalStudents / totalCapacity) * 100 : 0;
      const completionRate = classList.length
        ? (classList.filter(cls => Boolean(cls.class_teacher_id)).length / classList.length) * 100
        : 0;

      setStats({
        totalStudents,
        totalSubjects,
        totalTeachers,
        completionRate,
        activeClasses,
        totalCapacity,
        occupancyRate
      });

      await checkOrphanedRecords();
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      toast.error(error?.message || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FETCH TEACHERS
  // =========================================================

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

  // =========================================================
  // FETCH SUBJECTS
  // =========================================================

  const fetchSubjects = async () => {
    if (!userBranchId) return;
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('branch_id', userBranchId)
        .order('name', { ascending: true });
      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  // =========================================================
  // AVAILABLE STUDENTS
  // =========================================================

  const fetchAvailableStudents = async () => {
    if (!selectedClass || !userBranchId) return;
    try {
      const { data: enrolledStudents } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', selectedClass.id)
        .eq('branch_id', userBranchId);
      const enrolledIds = enrolledStudents?.map(s => s.id) || [];

      let query = supabase
        .from('students')
        .select('id, first_name, last_name, admission_number, secondary_admission_number, student_id, current_status')
        .eq('branch_id', userBranchId)
        .eq('current_status', 'active');

      if (enrolledIds.length) {
        query = query.not('id', 'in', `(${enrolledIds.join(',')})`);
      }
      const { data, error } = await query.order('first_name');
      if (error) throw error;
      setAvailableStudents(data || []);
    } catch (error) {
      console.error('Error fetching available students:', error);
    }
  };

  // =========================================================
  // CREATE / UPDATE / DELETE CLASS
  // =========================================================

  const handleCreateClass = async () => {
    if (!userBranchId) return;
    const levelValue = formData.level.toLowerCase();
    if (!VALID_LEVELS.includes(levelValue)) {
      toast.error(`Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}`);
      return;
    }
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Class name and code are required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('classes').insert({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        level: levelValue,
        class_teacher_id: formData.class_teacher_id || null,
        capacity: Number(formData.capacity) || 30,
        status: formData.status,
        branch_id: userBranchId,
        academic_session: currentTerm?.session || '2026/2027',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user?.id || null
      });
      if (error) throw error;
      toast.success('Class created successfully');
      setShowCreateModal(false);
      resetClassForm();
      await fetchClasses();
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast.error(error?.message || 'Failed to create class');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateClass = async () => {
    if (!editingClass) return;
    const levelValue = formData.level.toLowerCase();
    if (!VALID_LEVELS.includes(levelValue)) {
      toast.error(`Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('classes')
        .update({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          level: levelValue,
          class_teacher_id: formData.class_teacher_id || null,
          capacity: Number(formData.capacity) || 30,
          status: formData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingClass.id)
        .eq('branch_id', userBranchId);
      if (error) throw error;
      toast.success('Class updated successfully');
      setShowCreateModal(false);
      setEditingClass(null);
      resetClassForm();
      await fetchClasses();
    } catch (error: any) {
      console.error('Error updating class:', error);
      toast.error(error?.message || 'Failed to update class');
    } finally {
      setSaving(false);
    }
  };

  const resetClassForm = () => {
    setFormData({ name: '', code: '', level: '', class_teacher_id: '', capacity: 30, status: 'active' });
  };

  const handleDeleteClass = async (id: string) => {
    const cls = classes.find(item => item.id === id);
    if (!window.confirm(`Delete ${cls?.name || 'this class'}?\n\nStudents will be unassigned. Curriculum and teacher assignments will be removed.`)) return;
    try {
      await supabase.from('class_subjects').delete().eq('class_id', id);
      await supabase.from('teacher_subjects').delete().eq('class_id', id);
      await supabase.from('students').update({ class_id: null, updated_at: new Date().toISOString() }).eq('class_id', id);
      const { error } = await supabase.from('classes').delete().eq('id', id).eq('branch_id', userBranchId);
      if (error) throw error;
      toast.success('Class deleted successfully');
      await fetchClasses();
    } catch (error: any) {
      console.error('Error deleting class:', error);
      toast.error(error?.message || 'Failed to delete class');
    }
  };

  // =========================================================
  // VIEW CLASS DETAILS — FIXED STUDENT COUNTS
  // =========================================================

  const viewClassDetails = async (cls: ClassItem) => {
    setSelectedClass(cls);
    setShowClassDetails(true);
    setLoadingDetails(true);
    try {
      // Get ALL students for this class (including graduated)
      let studentQuery = supabase
        .from('students')
        .select('id, first_name, last_name, admission_number, secondary_admission_number, student_id, email, phone_number, gender, date_of_birth, current_status')
        .eq('class_id', cls.id)
        .eq('branch_id', userBranchId);

      // For graduate classes, respect the filter
      if (isGraduateClass(cls)) {
        if (studentStatusFilter !== 'all') {
          studentQuery = studentQuery.eq('current_status', studentStatusFilter);
        }
      } else {
        // For non-graduate, typically show active only, but we show all for consistency
        // Actually for non-graduate we should show all assigned students
        // studentQuery = studentQuery.eq('current_status', 'active');
        // Actually let's show all students assigned to the class
      }

      const { data: students, error: studentError } = await studentQuery.order('first_name');
      if (studentError) throw studentError;
      setClassStudents(students || []);

      // Curriculum subjects
      const { data: curriculumAssignments, error: curriculumError } = await supabase
        .from('class_subjects')
        .select('*')
        .eq('class_id', cls.id)
        .eq('branch_id', userBranchId)
        .eq('status', 'active')
        .order('created_at', { ascending: true });
      if (curriculumError) throw curriculumError;

      if (!curriculumAssignments || curriculumAssignments.length === 0) {
        setClassSubjects([]);
        await checkOrphanedRecords(cls.id);
        setLoadingDetails(false);
        return;
      }

      const subjectIds = [...new Set(curriculumAssignments.map(item => item.subject_id))];
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, subject_id, name, code, description, branch_id')
        .in('id', subjectIds)
        .eq('branch_id', userBranchId);
      if (subjectsError) throw subjectsError;

      const subjectMap: Record<string, Subject> = {};
      (subjectsData || []).forEach(subject => { subjectMap[subject.id] = subject; });

      const { data: teacherAssignments, error: teacherAssignmentError } = await supabase
        .from('teacher_subjects')
        .select('*')
        .eq('class_id', cls.id);
      if (teacherAssignmentError) throw teacherAssignmentError;

      const teacherIds = [...new Set((teacherAssignments || []).map(item => item.teacher_id).filter(Boolean))];
      let teacherMap: Record<string, Teacher> = {};
      if (teacherIds.length) {
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('id, teacher_id, first_name, last_name, email, phone_number')
          .in('id', teacherIds);
        if (teacherError) throw teacherError;
        (teacherData || []).forEach(teacher => { teacherMap[teacher.id] = teacher; });
      }

      const formattedSubjects: ClassSubject[] = curriculumAssignments.map(assignment => {
        const subject = subjectMap[assignment.subject_id];
        const teacherAssignment = (teacherAssignments || []).find(
          ti => ti.subject_id === assignment.subject_id
        );
        const teacher = teacherAssignment ? teacherMap[teacherAssignment.teacher_id] || null : null;
        return {
          ...assignment,
          subjects: subject || null,
          teacher_id: teacherAssignment?.teacher_id || null,
          teachers: teacher
        };
      }).filter(item => item.subjects !== null);

      setClassSubjects(formattedSubjects);
      await checkOrphanedRecords(cls.id);
    } catch (error) {
      console.error('Error fetching class details:', error);
      toast.error('Failed to load class details');
      setClassSubjects([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  // =========================================================
  // ADD / REMOVE STUDENT
  // =========================================================

  const handleAddStudent = async () => {
    if (!selectedClass || !selectedStudent) {
      toast.error('Please select a student');
      return;
    }
    setAddingStudent(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ class_id: selectedClass.id, updated_at: new Date().toISOString() })
        .eq('id', selectedStudent)
        .eq('branch_id', userBranchId);
      if (error) throw error;

      await supabase
        .from('student_classes')
        .update({ is_current: false })
        .eq('student_id', selectedStudent)
        .eq('is_current', true);

      await supabase.from('student_classes').insert({
        student_id: selectedStudent,
        class_id: selectedClass.id,
        academic_session: currentTerm?.session || '2026/2027',
        term: currentTerm?.term || '2nd Term',
        start_date: new Date().toISOString(),
        is_current: true,
        created_at: new Date().toISOString()
      });

      toast.success('Student added to class successfully');
      setSelectedStudent('');
      setShowAddStudentModal(false);
      await viewClassDetails(selectedClass);
      await fetchClasses();
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error?.message || 'Failed to add student');
    } finally {
      setAddingStudent(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!window.confirm('Remove this student from the class?')) return;
    try {
      const { error } = await supabase
        .from('students')
        .update({ class_id: null, updated_at: new Date().toISOString() })
        .eq('id', studentId)
        .eq('branch_id', userBranchId);
      if (error) throw error;

      await supabase
        .from('student_classes')
        .update({ is_current: false, end_date: new Date().toISOString() })
        .eq('student_id', studentId)
        .eq('class_id', selectedClass?.id)
        .eq('is_current', true);

      toast.success('Student removed from class');
      if (selectedClass) await viewClassDetails(selectedClass);
      await fetchClasses();
    } catch (error: any) {
      console.error('Error removing student:', error);
      toast.error(error?.message || 'Failed to remove student');
    }
  };

  // =========================================================
  // ADD / REMOVE SUBJECT
  // =========================================================

  const handleAddSubject = async () => {
    if (!selectedClass || !selectedSubject) {
      toast.error('Please select a subject');
      return;
    }
    if (!userBranchId) {
      toast.error('School branch not found');
      return;
    }
    setSaving(true);
    try {
      const { data: existingClassSubject, error: classSubjectCheckError } = await supabase
        .from('class_subjects')
        .select('id, is_compulsory')
        .eq('class_id', selectedClass.id)
        .eq('subject_id', selectedSubject)
        .eq('branch_id', userBranchId)
        .maybeSingle();
      if (classSubjectCheckError) throw classSubjectCheckError;

      if (!existingClassSubject) {
        const { error: classSubjectInsertError } = await supabase
          .from('class_subjects')
          .insert({
            branch_id: userBranchId,
            class_id: selectedClass.id,
            subject_id: selectedSubject,
            is_compulsory: true,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        if (classSubjectInsertError) throw classSubjectInsertError;
      }

      if (selectedTeacher) {
        const { data: existingTeacherAssignment, error: teacherCheckError } = await supabase
          .from('teacher_subjects')
          .select('id')
          .eq('class_id', selectedClass.id)
          .eq('subject_id', selectedSubject)
          .eq('teacher_id', selectedTeacher)
          .maybeSingle();
        if (teacherCheckError) throw teacherCheckError;

        if (!existingTeacherAssignment) {
          const { error: teacherInsertError } = await supabase
            .from('teacher_subjects')
            .insert({
              teacher_id: selectedTeacher,
              subject_id: selectedSubject,
              class_id: selectedClass.id,
              created_at: new Date().toISOString()
            });
          if (teacherInsertError) throw teacherInsertError;
        }
      }

      toast.success(existingClassSubject
        ? selectedTeacher ? 'Teacher assignment updated successfully' : 'Subject is already assigned to this class'
        : 'Subject assigned to class successfully');

      setSelectedSubject('');
      setSelectedTeacher('');
      setShowAddSubjectModal(false);
      await viewClassDetails(selectedClass);
      await fetchClasses();
    } catch (error: any) {
      console.error('Error adding subject:', error);
      toast.error(error?.message || 'Failed to assign subject');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubject = async (classSubjectId: string) => {
    if (!selectedClass) return;
    const assignment = classSubjects.find(item => item.id === classSubjectId);
    const subjectName = assignment?.subjects?.name || 'this subject';
    if (!window.confirm(`Remove ${subjectName} from ${selectedClass.name}?\n\nThis will also remove any teacher assignment for this subject in this class.`)) return;

    try {
      const subjectId = assignment?.subject_id;
      if (subjectId) {
        await supabase
          .from('teacher_subjects')
          .delete()
          .eq('class_id', selectedClass.id)
          .eq('subject_id', subjectId);
      }
      const { error } = await supabase
        .from('class_subjects')
        .delete()
        .eq('id', classSubjectId)
        .eq('class_id', selectedClass.id)
        .eq('branch_id', userBranchId);
      if (error) throw error;

      toast.success(`${subjectName} removed from ${selectedClass.name}`);
      await viewClassDetails(selectedClass);
      await fetchClasses();
    } catch (error: any) {
      console.error('Error removing subject:', error);
      toast.error(error?.message || 'Failed to remove subject');
    }
  };

  // =========================================================
  // TOTAL PAGES
  // =========================================================

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // =========================================================
  // STAT CARD COMPONENT
  // =========================================================

  const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; className: string; trend?: string }> = ({
    label, value, icon, className, trend
  }) => (
    <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {trend && <p className="text-xs text-green-600">{trend}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${className} flex items-center justify-center shadow-lg flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );

  // =========================================================
  // GRID VIEW — TWO COLUMNS WITH DETAILS
  // =========================================================

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {classes.map((cls, index) => {
        const graduate = isGraduateClass(cls);
        const levelColor = LEVEL_COLORS[cls.level] || 'from-gray-500 to-gray-600';
        const occupancy = cls.capacity > 0 ? Math.round(((cls.students_count || 0) / cls.capacity) * 100) : 0;

        return (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`bg-white/70 dark:bg-gray-800/70 rounded-2xl border shadow-xl hover:shadow-2xl transition-all overflow-hidden ${
              graduate ? 'border-green-500/40 ring-1 ring-green-500/20' : 'border-white/20 dark:border-gray-700/50'
            }`}
          >
            {/* Header with gradient bar */}
            <div className={`h-1.5 bg-gradient-to-r ${levelColor}`} />

            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{cls.name}</h3>
                    {graduate && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">🎓 Graduate</span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      cls.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>{cls.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span>Code: {cls.code}</span>
                    <span>•</span>
                    <span>Level: {graduate ? 'Graduate' : LEVEL_DISPLAY_NAMES[cls.level] || cls.level}</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${levelColor} flex items-center justify-center shadow-lg flex-shrink-0`}>
                  {graduate ? <GraduationCap className="w-6 h-6 text-white" /> : <School className="w-6 h-6 text-white" />}
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <Users className="w-4 h-4 mx-auto text-blue-500" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{cls.students_count || 0}</p>
                  <p className="text-[10px] text-gray-500">Students</p>
                  {cls.active_students !== undefined && cls.active_students !== cls.students_count && (
                    <p className="text-[9px] text-green-600">({cls.active_students} active)</p>
                  )}
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <BookMarked className="w-4 h-4 mx-auto text-purple-500" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{cls.subjects_count || 0}</p>
                  <p className="text-[10px] text-gray-500">Subjects</p>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <User className="w-4 h-4 mx-auto text-green-500" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{cls.teachers_count || 0}</p>
                  <p className="text-[10px] text-gray-500">Teachers</p>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <TrendingUp className="w-4 h-4 mx-auto text-orange-500" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{occupancy}%</p>
                  <p className="text-[10px] text-gray-500">Occupancy</p>
                </div>
              </div>

              {/* Progress bar for occupancy */}
              <div className="mt-3">
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      occupancy > 80 ? 'bg-red-500' : occupancy > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(occupancy, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>Capacity: {cls.capacity || 0}</span>
                  <span>{cls.students_count || 0} enrolled</span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {cls.class_teacher_name || 'No class teacher'}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => viewClassDetails(cls)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
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
                        level: isGraduateClass(cls) ? 'senior' : cls.level,
                        class_teacher_id: cls.class_teacher_id || '',
                        capacity: cls.capacity || 30,
                        status: cls.status || 'active'
                      });
                      setShowCreateModal(true);
                    }}
                    className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600 transition-colors"
                    title="Edit Class"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClass(cls.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                    title="Delete Class"
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
  );

  // =========================================================
  // LIST VIEW
  // =========================================================

  const renderListView = () => (
    <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subjects</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teachers</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class Teacher</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {classes.map(cls => {
              const graduate = isGraduateClass(cls);
              return (
                <tr key={cls.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${graduate ? 'bg-green-50/20' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {graduate ? <GraduationCap className="w-5 h-5 text-green-500" /> : <School className="w-5 h-5 text-blue-500" />}
                      <span className="font-medium text-gray-900 dark:text-white">{cls.name}</span>
                      {graduate && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Graduate</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{cls.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {graduate ? 'Graduate' : LEVEL_DISPLAY_NAMES[cls.level] || cls.level}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{cls.students_count || 0}</td>
                  <td className="px-6 py-4 text-sm font-medium text-purple-600">{cls.subjects_count || 0}</td>
                  <td className="px-6 py-4 text-sm text-green-600">{cls.teachers_count || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{cls.class_teacher_name}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${cls.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {cls.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => viewClassDetails(cls)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingClass(cls);
                          setFormData({
                            name: cls.name,
                            code: cls.code,
                            level: graduate ? 'senior' : cls.level,
                            class_teacher_id: cls.class_teacher_id || '',
                            capacity: cls.capacity || 30,
                            status: cls.status || 'active'
                          });
                          setShowCreateModal(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteClass(cls.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // =========================================================
  // MAIN
  // =========================================================

  return (
    <div className="space-y-6">
      {/* ORPHAN WARNING */}
      {showOrphanCleanup && orphanRecords.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Found {orphanRecords.length} orphaned teacher assignment(s)
              </p>
              <p className="text-xs text-amber-600 mt-1">These records reference missing classes, subjects, or teachers.</p>
            </div>
          </div>
          <button onClick={cleanupOrphanedRecords} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm flex items-center gap-1">
            <Trash className="w-3 h-3" /> Clean Up
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <GraduationCap className="w-8 h-8" />
            Classes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage classes, curriculum subjects, teachers and students</p>
        </div>
        <button
          onClick={() => { setEditingClass(null); resetClassForm(); setShowCreateModal(true); }}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-lg flex items-center gap-2 hover:shadow-xl transition-shadow"
        >
          <Plus className="w-4 h-4" /> New Class
        </button>
      </div>

      {/* STATS — TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Classes" value={totalCount} icon={<School className="w-5 h-5 text-white" />} className="from-blue-500 to-cyan-500" />
        <StatCard label="Total Students" value={stats.totalStudents} icon={<Users className="w-5 h-5 text-white" />} className="from-green-500 to-emerald-500" />
        <StatCard label="Active Classes" value={stats.activeClasses} icon={<BarChart3 className="w-5 h-5 text-white" />} className="from-indigo-500 to-blue-500" />
        <StatCard label="Occupancy Rate" value={`${Math.round(stats.occupancyRate)}%`} icon={<PieChart className="w-5 h-5 text-white" />} className="from-orange-500 to-amber-500" />
      </div>

      {/* SECOND ROW OF STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Subjects" value={stats.totalSubjects} icon={<BookMarked className="w-5 h-5 text-white" />} className="from-purple-500 to-violet-500" />
        <StatCard label="Total Teachers" value={stats.totalTeachers} icon={<User className="w-5 h-5 text-white" />} className="from-teal-500 to-cyan-500" />
        <StatCard label="Class Teacher Coverage" value={`${Math.round(stats.completionRate)}%`} icon={<TrendingUp className="w-5 h-5 text-white" />} className="from-rose-500 to-pink-500" />
        <StatCard label="Total Capacity" value={stats.totalCapacity} icon={<Users className="w-5 h-5 text-white" />} className="from-gray-500 to-slate-500" />
      </div>

      {/* SEARCH / FILTER */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search classes by name or code..."
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={levelFilter}
          onChange={e => { setLevelFilter(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Levels</option>
          {VALID_LEVELS.map(level => (
            <option key={level} value={level}>{LEVEL_DISPLAY_NAMES[level] || level}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
        <button onClick={fetchClasses} className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl" title="Refresh">
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* CLASSES */}
      {classes.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <School className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">No classes found</p>
        </div>
      ) : viewMode === 'grid' ? renderGridView() : renderListView()}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-3">
          <div className="text-sm text-gray-500">
            Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalCount)} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-lg border disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-lg border disabled:opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===== CREATE / EDIT CLASS MODAL ===== */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">{editingClass ? 'Edit Class' : 'Create New Class'}</h3>
                <button onClick={() => { setShowCreateModal(false); setEditingClass(null); }} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <input type="text" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Class Name" className="w-full px-4 py-2.5 border rounded-xl dark:bg-gray-900 dark:text-white" />
                <input type="text" value={formData.code} onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))} placeholder="Class Code" className="w-full px-4 py-2.5 border rounded-xl dark:bg-gray-900 dark:text-white" />
                <select value={formData.level} onChange={e => setFormData(prev => ({ ...prev, level: e.target.value }))} className="w-full px-4 py-2.5 border rounded-xl dark:bg-gray-900 dark:text-white">
                  <option value="">Select Level</option>
                  {VALID_LEVELS.map(level => <option key={level} value={level}>{LEVEL_DISPLAY_NAMES[level] || level}</option>)}
                </select>
                <select value={formData.class_teacher_id} onChange={e => setFormData(prev => ({ ...prev, class_teacher_id: e.target.value }))} className="w-full px-4 py-2.5 border rounded-xl dark:bg-gray-900 dark:text-white">
                  <option value="">No Class Teacher</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
                <input type="number" min="1" value={formData.capacity} onChange={e => setFormData(prev => ({ ...prev, capacity: Number(e.target.value) || 30 }))} className="w-full px-4 py-2.5 border rounded-xl dark:bg-gray-900 dark:text-white" />
                <select value={formData.status} onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))} className="w-full px-4 py-2.5 border rounded-xl dark:bg-gray-900 dark:text-white">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => { setShowCreateModal(false); setEditingClass(null); }} className="flex-1 px-4 py-2.5 border rounded-xl">Cancel</button>
                  <button onClick={editingClass ? handleUpdateClass : handleCreateClass} disabled={saving || !formData.name || !formData.code || !formData.level} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editingClass ? 'Update Class' : 'Create Class'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== CLASS DETAILS MODAL ===== */}
      <AnimatePresence>
        {showClassDetails && selectedClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedClass.name}</h3>
                  <p className="text-sm text-gray-500">{selectedClass.code} • {isGraduateClass(selectedClass) ? 'Graduate' : LEVEL_DISPLAY_NAMES[selectedClass.level] || selectedClass.level}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {!isGraduateClass(selectedClass) && (
                    <button onClick={() => { setShowAddStudentModal(true); fetchAvailableStudents(); }} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1">
                      <UserPlus className="w-4 h-4" /> Add Student
                    </button>
                  )}
                  <button onClick={() => setShowAddSubjectModal(true)} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add Subject
                  </button>
                  <button onClick={() => { setShowClassDetails(false); setSelectedClass(null); }} className="p-2 rounded-lg hover:bg-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {loadingDetails ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                ) : (
                  <>
                    {/* SUMMARY */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                      <div><p className="text-xs text-gray-500">Class Teacher</p><p className="font-medium text-gray-900 dark:text-white">{selectedClass.class_teacher_name}</p></div>
                      <div><p className="text-xs text-gray-500">Capacity</p><p className="font-medium text-gray-900 dark:text-white">{selectedClass.capacity}</p></div>
                      <div><p className="text-xs text-gray-500">Students</p><p className="font-medium text-gray-900 dark:text-white">{classStudents.length}</p></div>
                      <div><p className="text-xs text-gray-500">Subjects</p><p className="font-medium text-gray-900 dark:text-white">{classSubjects.length}</p></div>
                    </div>

                    {/* STUDENTS */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /> Students ({classStudents.length})</h4>
                        {isGraduateClass(selectedClass) && (
                          <select value={studentStatusFilter} onChange={e => { setStudentStatusFilter(e.target.value); viewClassDetails(selectedClass); }} className="text-xs px-2 py-1 border rounded-lg">
                            <option value="all">All</option>
                            <option value="graduated">Graduated</option>
                            <option value="active">Active</option>
                          </select>
                        )}
                      </div>
                      {classStudents.length === 0 ? (
                        <div className="p-6 text-center bg-gray-50 dark:bg-gray-700/30 rounded-xl"><p className="text-sm text-gray-500">No students enrolled.</p></div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {classStudents.map(student => (
                            <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{student.first_name} {student.last_name}</p>
                                <p className="text-xs text-gray-500">{student.admission_number} • {student.current_status}</p>
                              </div>
                              {!isGraduateClass(selectedClass) && (
                                <button onClick={() => handleRemoveStudent(student.id)} className="p-1.5 text-red-500 rounded-lg hover:bg-red-50">
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SUBJECTS */}
                    <div className="border-t pt-5">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2"><BookMarked className="w-4 h-4 text-purple-500" /> Curriculum Subjects ({classSubjects.length})</h4>
                        <button onClick={() => setShowAddSubjectModal(true)} className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Add Subject
                        </button>
                      </div>
                      {classSubjects.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                          <BookOpen className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">No curriculum subjects assigned.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {classSubjects.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-gray-900 dark:text-white">{item.subjects?.name}</p>
                                  <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{item.subjects?.code}</span>
                                  {item.is_compulsory && <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Compulsory</span>}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <User className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-xs text-gray-600 dark:text-gray-400">Teacher: {item.teachers ? `${item.teachers.first_name} ${item.teachers.last_name}` : 'Not assigned'}</span>
                                </div>
                              </div>
                              <button onClick={() => handleRemoveSubject(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Remove subject">
                                <Trash2 className="w-4 h-4" />
                              </button>
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

      {/* ===== ADD STUDENT MODAL ===== */}
      <AnimatePresence>
        {showAddStudentModal && selectedClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Student</h3>
                <button onClick={() => setShowAddStudentModal(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
              </div>
              <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl dark:bg-gray-900 dark:text-white">
                <option value="">Select student...</option>
                {availableStudents.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.admission_number}</option>)}
              </select>
              <div className="flex gap-3 mt-5">
                <button onClick={() => { setShowAddStudentModal(false); setSelectedStudent(''); }} className="flex-1 px-4 py-2.5 border rounded-xl">Cancel</button>
                <button onClick={handleAddStudent} disabled={!selectedStudent || addingStudent} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                  {addingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add Student
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== ADD SUBJECT MODAL ===== */}
      <AnimatePresence>
        {showAddSubjectModal && selectedClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assign Subject</h3><p className="text-xs text-gray-500 mt-1">{selectedClass.name}</p></div>
                <button onClick={() => { setShowAddSubjectModal(false); setSelectedSubject(''); setSelectedTeacher(''); }} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Subject *</label>
                  <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl dark:bg-gray-900 dark:text-white">
                    <option value="">Select subject...</option>
                    {subjects.map(subject => {
                      const alreadyAssigned = classSubjects.some(item => item.subject_id === subject.id);
                      return <option key={subject.id} value={subject.id} disabled={alreadyAssigned}>{subject.name} ({subject.code}){alreadyAssigned ? ' — Already assigned' : ''}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Teacher</label>
                  <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl dark:bg-gray-900 dark:text-white">
                    <option value="">No teacher assigned yet</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.teacher_id})</option>)}
                  </select>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-xs text-blue-700 dark:text-blue-300">The subject is assigned to the class curriculum first. A teacher can be assigned now or later.</p>
                </div>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => { setShowAddSubjectModal(false); setSelectedSubject(''); setSelectedTeacher(''); }} className="flex-1 px-4 py-2.5 border rounded-xl">Cancel</button>
                  <button onClick={handleAddSubject} disabled={!selectedSubject || saving} className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Assign Subject
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