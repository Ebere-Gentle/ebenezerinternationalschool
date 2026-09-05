import React, { useState, useEffect, useCallback } from 'react';
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
  X,
  Check,
  UserPlus,
  School,
  Target,
  LayoutGrid,
  List,
  GraduationCap,
  Briefcase,
  AlertCircle
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
  created_by: string | null;
}

interface Teacher {
  id: string;
  teacher_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  specialization: string | null;
}

interface ClassItem {
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
  created_at: string;
  teacher_name?: string;
  subject_name?: string;
  subject_code?: string;
  class_name?: string;
  class_code?: string;
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
  class_name?: string;
  class_code?: string;
  class_level?: string;
  subject_name?: string;
  subject_code?: string;
}

interface SubjectStats {
  totalSubjects: number;
  totalTeachers: number;
  totalAssignments: number;
  subjectsWithTeachers: number;
  subjectsWithClasses: number;
}

const PAGE_SIZE = 10;

const SubjectsManagement: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [userBranchId, setUserBranchId] = useState<string | null>(null);

  const [stats, setStats] = useState<SubjectStats>({
    totalSubjects: 0,
    totalTeachers: 0,
    totalAssignments: 0,
    subjectsWithTeachers: 0,
    subjectsWithClasses: 0
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // =========================================================
  // SUBJECT MODAL
  // =========================================================

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    description: ''
  });

  const [saving, setSaving] = useState(false);

  // =========================================================
  // TEACHER ASSIGNMENT MODAL
  // =========================================================

  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const [assignmentForm, setAssignmentForm] = useState({
    subject_id: '',
    teacher_id: '',
    class_id: ''
  });

  const [assigning, setAssigning] = useState(false);

  // =========================================================
  // DETAILS MODAL
  // =========================================================

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showSubjectDetails, setShowSubjectDetails] = useState(false);

  const [subjectTeachers, setSubjectTeachers] = useState<TeacherSubject[]>([]);
  const [subjectClasses, setSubjectClasses] = useState<ClassSubject[]>([]);

  const [loadingDetails, setLoadingDetails] = useState(false);

  // =========================================================
  // GET USER BRANCH
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

          if (!error && data?.branch_id) {
            branchId = data.branch_id;
          }
        }

        if (branchId) {
          setUserBranchId(branchId);
        } else {
          setLoading(false);
          toast.error('Your account is not linked to a school branch.');
        }
      } catch (error) {
        console.error('Error fetching user branch:', error);
        setLoading(false);
        toast.error('Failed to determine school branch');
      }
    };

    fetchUserBranch();
  }, [user]);

  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {
    if (!userBranchId) return;

    fetchAllData();
  }, [userBranchId, currentPage, searchTerm]);

  const fetchAllData = useCallback(async () => {
    if (!userBranchId) return;

    try {
      if (!loading) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [
        subjectsResult,
        allSubjectsResult,
        teachersResult,
        classesResult,
        teacherSubjectsResult,
        classSubjectsResult
      ] = await Promise.all([
        fetchSubjects(),
        fetchAllSubjects(),
        fetchTeachers(),
        fetchClasses(),
        fetchTeacherSubjects(),
        fetchClassSubjects()
      ]);

      const subjectCount = subjectsResult.count || 0;
      const teacherList = teachersResult || [];
      const teacherAssignmentList = teacherSubjectsResult || [];
      const classAssignmentList = classSubjectsResult || [];

      const teacherCoveredSubjects = new Set(
        teacherAssignmentList
          .map(item => item.subject_id)
          .filter(Boolean)
      );

      const classCoveredSubjects = new Set(
        classAssignmentList
          .map(item => item.subject_id)
          .filter(Boolean)
      );

      setStats({
        totalSubjects: subjectCount,
        totalTeachers: teacherList.length,
        totalAssignments: classAssignmentList.length,
        subjectsWithTeachers: teacherCoveredSubjects.size,
        subjectsWithClasses: classCoveredSubjects.size
      });

      // allSubjectsResult is intentionally loaded for dropdowns
      // and future use.
      setAllSubjects(allSubjectsResult || []);
    } catch (error) {
      console.error('Error loading subjects page:', error);
      toast.error('Failed to load subject management data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userBranchId, currentPage, searchTerm, loading]);

  // =========================================================
  // FETCH PAGINATED SUBJECTS
  // =========================================================

  const fetchSubjects = async (): Promise<{
    data: Subject[];
    count: number;
  }> => {
    if (!userBranchId) {
      return { data: [], count: 0 };
    }

    let query = supabase
      .from('subjects')
      .select('*', { count: 'exact' })
      .eq('branch_id', userBranchId);

    if (searchTerm.trim()) {
      const safeSearch = searchTerm.trim();

      query = query.or(
        `name.ilike.%${safeSearch}%,code.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`
      );
    }

    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await query
      .order('name', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('Error fetching subjects:', error);
      throw error;
    }

    const result = data || [];

    setSubjects(result);
    setTotalCount(count || 0);

    return {
      data: result,
      count: count || 0
    };
  };

  // =========================================================
  // FETCH ALL SUBJECTS
  // Used for teacher assignment dropdown.
  // =========================================================

  const fetchAllSubjects = async (): Promise<Subject[]> => {
    if (!userBranchId) return [];

    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('branch_id', userBranchId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching all subjects:', error);
      throw error;
    }

    return data || [];
  };

  // =========================================================
  // FETCH TEACHERS
  // =========================================================

  const fetchTeachers = async (): Promise<Teacher[]> => {
    if (!userBranchId) return [];

    const { data, error } = await supabase
      .from('teachers')
      .select(
        'id, teacher_id, first_name, last_name, email, phone_number, specialization'
      )
      .eq('branch_id', userBranchId)
      .eq('status', 'active')
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching teachers:', error);
      throw error;
    }

    const result = data || [];
    setTeachers(result);

    return result;
  };

  // =========================================================
  // FETCH CLASSES
  // =========================================================

  const fetchClasses = async (): Promise<ClassItem[]> => {
    if (!userBranchId) return [];

    const { data, error } = await supabase
      .from('classes')
      .select('id, name, code, level')
      .eq('branch_id', userBranchId)
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching classes:', error);
      throw error;
    }

    const result = data || [];
    setClasses(result);

    return result;
  };

  // =========================================================
  // FETCH TEACHER ASSIGNMENTS
  // =========================================================

  const fetchTeacherSubjects = async (): Promise<TeacherSubject[]> => {
    if (!userBranchId) return [];

    const { data, error } = await supabase
      .from('teacher_subjects')
      .select('*');

    if (error) {
      console.error('Error fetching teacher subjects:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      setTeacherSubjects([]);
      return [];
    }

    const teacherIds = [
      ...new Set(
        data.map(item => item.teacher_id).filter(Boolean)
      )
    ];

    const subjectIds = [
      ...new Set(
        data.map(item => item.subject_id).filter(Boolean)
      )
    ];

    const classIds = [
      ...new Set(
        data.map(item => item.class_id).filter(Boolean)
      )
    ];

    const [teachersQuery, subjectsQuery, classesQuery] = await Promise.all([
      teacherIds.length
        ? supabase
            .from('teachers')
            .select('id, first_name, last_name, teacher_id')
            .in('id', teacherIds)
            .eq('branch_id', userBranchId)
        : Promise.resolve({ data: [], error: null }),

      subjectIds.length
        ? supabase
            .from('subjects')
            .select('id, name, code, subject_id')
            .in('id', subjectIds)
            .eq('branch_id', userBranchId)
        : Promise.resolve({ data: [], error: null }),

      classIds.length
        ? supabase
            .from('classes')
            .select('id, name, code')
            .in('id', classIds)
            .eq('branch_id', userBranchId)
        : Promise.resolve({ data: [], error: null })
    ]);

    const teacherMap: Record<string, any> = {};
    const subjectMap: Record<string, any> = {};
    const classMap: Record<string, any> = {};

    (teachersQuery.data || []).forEach(item => {
      teacherMap[item.id] = item;
    });

    (subjectsQuery.data || []).forEach(item => {
      subjectMap[item.id] = item;
    });

    (classesQuery.data || []).forEach(item => {
      classMap[item.id] = item;
    });

    const formatted: TeacherSubject[] = data
      .filter(item => {
        const subject = subjectMap[item.subject_id];
        return subject;
      })
      .map(item => {
        const teacher = teacherMap[item.teacher_id];
        const subject = subjectMap[item.subject_id];
        const cls = item.class_id ? classMap[item.class_id] : null;

        return {
          ...item,
          teacher_name: teacher
            ? `${teacher.first_name} ${teacher.last_name}`
            : 'Unknown Teacher',
          subject_name: subject?.name || 'Unknown Subject',
          subject_code: subject?.code || 'N/A',
          class_name: cls?.name || 'All Classes',
          class_code: cls?.code || 'ALL'
        };
      });

    setTeacherSubjects(formatted);

    return formatted;
  };

  // =========================================================
  // FETCH CURRICULUM CLASS/SUBJECT ASSIGNMENTS
  // THIS IS THE IMPORTANT FIX
  // =========================================================

  const fetchClassSubjects = async (): Promise<ClassSubject[]> => {
    if (!userBranchId) return [];

    const { data, error } = await supabase
      .from('class_subjects')
      .select('*')
      .eq('branch_id', userBranchId)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching class subjects:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      setClassSubjects([]);
      return [];
    }

    const classIds = [
      ...new Set(
        data.map(item => item.class_id).filter(Boolean)
      )
    ];

    const subjectIds = [
      ...new Set(
        data.map(item => item.subject_id).filter(Boolean)
      )
    ];

    const [classesQuery, subjectsQuery] = await Promise.all([
      classIds.length
        ? supabase
            .from('classes')
            .select('id, name, code, level')
            .in('id', classIds)
            .eq('branch_id', userBranchId)
        : Promise.resolve({ data: [], error: null }),

      subjectIds.length
        ? supabase
            .from('subjects')
            .select('id, name, code')
            .in('id', subjectIds)
            .eq('branch_id', userBranchId)
        : Promise.resolve({ data: [], error: null })
    ]);

    const classMap: Record<string, any> = {};
    const subjectMap: Record<string, any> = {};

    (classesQuery.data || []).forEach(item => {
      classMap[item.id] = item;
    });

    (subjectsQuery.data || []).forEach(item => {
      subjectMap[item.id] = item;
    });

    const formatted: ClassSubject[] = data
      .filter(item => classMap[item.class_id] && subjectMap[item.subject_id])
      .map(item => {
        const cls = classMap[item.class_id];
        const subject = subjectMap[item.subject_id];

        return {
          ...item,
          class_name: cls.name,
          class_code: cls.code,
          class_level: cls.level,
          subject_name: subject.name,
          subject_code: subject.code
        };
      });

    setClassSubjects(formatted);

    return formatted;
  };

  // =========================================================
  // CREATE SUBJECT
  // =========================================================

  const handleCreateSubject = async () => {
    if (!userBranchId) {
      toast.error('School branch not found');
      return;
    }

    const name = subjectForm.name.trim();
    const code = subjectForm.code.trim().toUpperCase();

    if (!name || !code) {
      toast.error('Subject name and code are required');
      return;
    }

    setSaving(true);

    try {
      // Get all existing subject IDs so deletion does not
      // cause duplicate IDs.
      const { data: existingSubjects, error: existingError } = await supabase
        .from('subjects')
        .select('subject_id')
        .eq('branch_id', userBranchId);

      if (existingError) throw existingError;

      const year = new Date().getFullYear();

      let maxNumber = 0;

      (existingSubjects || []).forEach(item => {
        const match = String(item.subject_id || '').match(
          new RegExp(`^SUB-${year}-(\\d+)$`)
        );

        if (match) {
          maxNumber = Math.max(maxNumber, Number(match[1]));
        }
      });

      const subjectId = `SUB-${year}-${String(maxNumber + 1).padStart(4, '0')}`;

      const { error } = await supabase
        .from('subjects')
        .insert({
          name,
          code,
          description: subjectForm.description.trim() || null,
          subject_id: subjectId,
          branch_id: userBranchId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user?.id || null
        });

      if (error) throw error;

      toast.success('Subject created successfully');

      setShowSubjectModal(false);
      setEditingSubject(null);
      setSubjectForm({
        name: '',
        code: '',
        description: ''
      });

      await fetchAllData();
    } catch (error: any) {
      console.error('Error creating subject:', error);

      if (
        error?.code === '23505'
      ) {
        toast.error('A subject with this code or ID already exists');
      } else {
        toast.error(
          error?.message || 'Failed to create subject'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // UPDATE SUBJECT
  // =========================================================

  const handleUpdateSubject = async () => {
    if (!editingSubject) return;

    const name = subjectForm.name.trim();
    const code = subjectForm.code.trim().toUpperCase();

    if (!name || !code) {
      toast.error('Subject name and code are required');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('subjects')
        .update({
          name,
          code,
          description: subjectForm.description.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSubject.id)
        .eq('branch_id', userBranchId);

      if (error) throw error;

      toast.success('Subject updated successfully');

      setShowSubjectModal(false);
      setEditingSubject(null);
      setSubjectForm({
        name: '',
        code: '',
        description: ''
      });

      await fetchAllData();
    } catch (error: any) {
      console.error('Error updating subject:', error);
      toast.error(
        error?.message || 'Failed to update subject'
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE SUBJECT
  // IMPORTANT: REMOVE BOTH CLASS + TEACHER ASSIGNMENTS
  // =========================================================

  const handleDeleteSubject = async (id: string) => {
    const subject = allSubjects.find(item => item.id === id);

    const confirmed = window.confirm(
      `Are you sure you want to delete "${subject?.name || 'this subject'}"?\n\nThis will remove its class curriculum assignments and teacher assignments.`
    );

    if (!confirmed) return;

    try {
      const { error: classAssignmentError } = await supabase
        .from('class_subjects')
        .delete()
        .eq('subject_id', id)
        .eq('branch_id', userBranchId);

      if (classAssignmentError) throw classAssignmentError;

      const { error: teacherAssignmentError } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('subject_id', id);

      if (teacherAssignmentError) throw teacherAssignmentError;

      const { error: subjectDeleteError } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id)
        .eq('branch_id', userBranchId);

      if (subjectDeleteError) throw subjectDeleteError;

      toast.success('Subject deleted successfully');

      await fetchAllData();
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      toast.error(
        error?.message || 'Failed to delete subject'
      );
    }
  };

  // =========================================================
  // ASSIGN TEACHER
  // =========================================================

  const handleAssignTeacher = async () => {
    if (
      !assignmentForm.subject_id ||
      !assignmentForm.teacher_id
    ) {
      toast.error('Please select a subject and teacher');
      return;
    }

    if (!userBranchId) {
      toast.error('School branch not found');
      return;
    }

    setAssigning(true);

    try {
      let existingQuery = supabase
        .from('teacher_subjects')
        .select('id')
        .eq('subject_id', assignmentForm.subject_id)
        .eq('teacher_id', assignmentForm.teacher_id);

      if (assignmentForm.class_id) {
        existingQuery = existingQuery.eq(
          'class_id',
          assignmentForm.class_id
        );
      } else {
        existingQuery = existingQuery.is(
          'class_id',
          null
        );
      }

      const {
        data: existingAssignments,
        error: existingError
      } = await existingQuery;

      if (existingError) throw existingError;

      if (
        existingAssignments &&
        existingAssignments.length > 0
      ) {
        toast.error(
          'This teacher is already assigned to this subject/class.'
        );
        return;
      }

      const { error } = await supabase
        .from('teacher_subjects')
        .insert({
          teacher_id: assignmentForm.teacher_id,
          subject_id: assignmentForm.subject_id,
          class_id: assignmentForm.class_id || null,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Teacher assigned successfully');

      setShowAssignmentModal(false);

      setAssignmentForm({
        subject_id: '',
        teacher_id: '',
        class_id: ''
      });

      await fetchAllData();
    } catch (error: any) {
      console.error('Error assigning teacher:', error);
      toast.error(
        error?.message || 'Failed to assign teacher'
      );
    } finally {
      setAssigning(false);
    }
  };

  // =========================================================
  // REMOVE TEACHER ASSIGNMENT
  // =========================================================

  const handleRemoveAssignment = async (id: string) => {
    if (
      !window.confirm(
        'Remove this teacher assignment?'
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Teacher assignment removed');

      if (selectedSubject) {
        await viewSubjectDetails(selectedSubject);
      }

      await fetchAllData();
    } catch (error: any) {
      console.error('Error removing assignment:', error);
      toast.error(
        error?.message || 'Failed to remove teacher assignment'
      );
    }
  };

  // =========================================================
  // VIEW SUBJECT DETAILS
  // =========================================================

  const viewSubjectDetails = async (subject: Subject) => {
    setSelectedSubject(subject);
    setShowSubjectDetails(true);
    setLoadingDetails(true);

    try {
      const [teacherAssignmentsQuery, curriculumAssignmentsQuery] =
        await Promise.all([
          supabase
            .from('teacher_subjects')
            .select('*')
            .eq('subject_id', subject.id),

          supabase
            .from('class_subjects')
            .select('*')
            .eq('subject_id', subject.id)
            .eq('branch_id', userBranchId)
            .eq('status', 'active')
        ]);

      if (teacherAssignmentsQuery.error) {
        throw teacherAssignmentsQuery.error;
      }

      if (curriculumAssignmentsQuery.error) {
        throw curriculumAssignmentsQuery.error;
      }

      const teacherAssignments =
        teacherAssignmentsQuery.data || [];

      const curriculumAssignments =
        curriculumAssignmentsQuery.data || [];

      // -------------------------
      // TEACHERS
      // -------------------------

      const teacherIds = [
        ...new Set(
          teacherAssignments
            .map(item => item.teacher_id)
            .filter(Boolean)
        )
      ];

      const teacherClassIds = [
        ...new Set(
          teacherAssignments
            .map(item => item.class_id)
            .filter(Boolean)
        )
      ];

      const [
        teachersQuery,
        teacherClassesQuery
      ] = await Promise.all([
        teacherIds.length
          ? supabase
              .from('teachers')
              .select(
                'id, first_name, last_name, teacher_id, email, phone_number'
              )
              .in('id', teacherIds)
          : Promise.resolve({ data: [], error: null }),

        teacherClassIds.length
          ? supabase
              .from('classes')
              .select('id, name, code, level')
              .in('id', teacherClassIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (teachersQuery.error) {
        throw teachersQuery.error;
      }

      if (teacherClassesQuery.error) {
        throw teacherClassesQuery.error;
      }

      const teacherMap: Record<string, any> = {};
      const teacherClassMap: Record<string, any> = {};

      (teachersQuery.data || []).forEach(item => {
        teacherMap[item.id] = item;
      });

      (teacherClassesQuery.data || []).forEach(item => {
        teacherClassMap[item.id] = item;
      });

      const formattedTeachers: TeacherSubject[] =
        teacherAssignments.map(item => {
          const teacher = teacherMap[item.teacher_id];
          const cls = item.class_id
            ? teacherClassMap[item.class_id]
            : null;

          return {
            ...item,
            teacher_name: teacher
              ? `${teacher.first_name} ${teacher.last_name}`
              : 'Unknown Teacher',
            class_name: cls?.name || 'All Classes',
            class_code: cls?.code || 'ALL'
          };
        });

      // -------------------------
      // CLASSES
      // -------------------------

      const curriculumClassIds = [
        ...new Set(
          curriculumAssignments
            .map(item => item.class_id)
            .filter(Boolean)
        )
      ];

      const { data: curriculumClasses, error: curriculumClassError } =
        curriculumClassIds.length
          ? await supabase
              .from('classes')
              .select('id, name, code, level')
              .in('id', curriculumClassIds)
          : { data: [], error: null };

      if (curriculumClassError) {
        throw curriculumClassError;
      }

      const curriculumClassMap: Record<string, any> = {};

      (curriculumClasses || []).forEach(item => {
        curriculumClassMap[item.id] = item;
      });

      const formattedClasses: ClassSubject[] =
        curriculumAssignments
          .filter(
            item => curriculumClassMap[item.class_id]
          )
          .map(item => {
            const cls = curriculumClassMap[item.class_id];

            return {
              ...item,
              class_name: cls.name,
              class_code: cls.code,
              class_level: cls.level
            };
          });

      setSubjectTeachers(formattedTeachers);
      setSubjectClasses(formattedClasses);
    } catch (error) {
      console.error(
        'Error fetching subject details:',
        error
      );

      toast.error(
        'Failed to load subject details'
      );

      setSubjectTeachers([]);
      setSubjectClasses([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  // =========================================================
  // DERIVED DATA HELPERS
  // =========================================================

  const getSubjectTeacherAssignments = (
    subjectId: string
  ) => {
    return teacherSubjects.filter(
      item => item.subject_id === subjectId
    );
  };

  const getSubjectClassAssignments = (
    subjectId: string
  ) => {
    return classSubjects.filter(
      item => item.subject_id === subjectId
    );
  };

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PAGE_SIZE)
  );

  const coveragePercentage =
    stats.totalSubjects > 0
      ? Math.round(
          (stats.subjectsWithClasses /
            stats.totalSubjects) *
            100
        )
      : 0;

  const teacherCoveragePercentage =
    stats.totalSubjects > 0
      ? Math.round(
          (stats.subjectsWithTeachers /
            stats.totalSubjects) *
            100
        )
      : 0;

  // =========================================================
  // GRID VIEW
  // =========================================================

  const renderGridView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject, index) => {
          const teacherAssignments =
            getSubjectTeacherAssignments(subject.id);

          const classAssignments =
            getSubjectClassAssignments(subject.id);

          const teacherNames = [
            ...new Set(
              teacherAssignments
                .map(item => item.teacher_name)
                .filter(Boolean)
            )
          ];

          return (
            <motion.div
              key={subject.id}
              initial={{
                opacity: 0,
                y: 20
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                delay: index * 0.03
              }}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {subject.name}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {subject.code}
                      </span>

                      <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        {classAssignments.length} classes
                      </span>
                    </div>

                    {subject.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">
                        {subject.description}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      {subject.subject_id}
                    </p>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg flex-shrink-0">
                    <BookMarked className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-5">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                    <School className="w-4 h-4 mx-auto text-green-500" />

                    <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                      {classAssignments.length}
                    </p>

                    <p className="text-[10px] text-gray-500">
                      Classes
                    </p>
                  </div>

                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                    <Users className="w-4 h-4 mx-auto text-purple-500" />

                    <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                      {teacherNames.length}
                    </p>

                    <p className="text-[10px] text-gray-500">
                      Teachers
                    </p>
                  </div>

                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                    <UserCheck className="w-4 h-4 mx-auto text-blue-500" />

                    <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                      {teacherAssignments.length}
                    </p>

                    <p className="text-[10px] text-gray-500">
                      Teacher Links
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Assigned Classes
                  </p>

                  {classAssignments.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {classAssignments
                        .slice(0, 6)
                        .map(item => (
                          <span
                            key={item.id}
                            className="text-xs px-2 py-1 rounded-md bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                          >
                            {item.class_name}
                          </span>
                        ))}

                      {classAssignments.length > 6 && (
                        <span className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-500 dark:bg-gray-700">
                          +{classAssignments.length - 6}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-red-500">
                      No classes assigned
                    </span>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {dayjs(subject.created_at).format(
                      'MMM D, YYYY'
                    )}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        viewSubjectDetails(subject)
                      }
                      className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setEditingSubject(subject);
                        setSubjectForm({
                          name: subject.name,
                          code: subject.code,
                          description:
                            subject.description || ''
                        });
                        setShowSubjectModal(true);
                      }}
                      className="p-2 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        handleDeleteSubject(subject.id)
                      }
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                      title="Delete"
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
  };

  // =========================================================
  // LIST VIEW
  // =========================================================

  const renderListView = () => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Subject
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Code
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Teachers
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Classes
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Coverage
                </th>

                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {subjects.map(subject => {
                const teacherAssignments =
                  getSubjectTeacherAssignments(
                    subject.id
                  );

                const classAssignments =
                  getSubjectClassAssignments(
                    subject.id
                  );

                const teacherNames = [
                  ...new Set(
                    teacherAssignments
                      .map(item => item.teacher_name)
                      .filter(Boolean)
                  )
                ];

                return (
                  <tr
                    key={subject.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="min-w-[220px]">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {subject.name}
                        </p>

                        {subject.description && (
                          <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                            {subject.description}
                          </p>
                        )}

                        <p className="text-xs text-gray-400 mt-1">
                          {subject.subject_id}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {subject.code}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {teacherNames.length > 0 ? (
                        <div className="min-w-[160px]">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {teacherNames
                              .slice(0, 2)
                              .join(', ')}
                          </p>

                          {teacherNames.length > 2 && (
                            <p className="text-xs text-gray-400 mt-1">
                              +{teacherNames.length - 2} more
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-orange-500">
                          <AlertCircle className="w-3.5 h-3.5" />
                          No teachers
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {classAssignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-[320px]">
                          {classAssignments
                            .slice(0, 4)
                            .map(item => (
                              <span
                                key={item.id}
                                className="text-xs px-2 py-1 rounded-md bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                              >
                                {item.class_name}
                              </span>
                            ))}

                          {classAssignments.length > 4 && (
                            <span className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-500 dark:bg-gray-700">
                              +{classAssignments.length - 4}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-red-500">
                          Not assigned
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span
                          className={`text-sm font-medium ${
                            classAssignments.length > 0
                              ? 'text-green-600'
                              : 'text-red-500'
                          }`}
                        >
                          {classAssignments.length} classes
                        </span>

                        <span className="text-xs text-gray-400">
                          {teacherAssignments.length}{' '}
                          teacher links
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() =>
                            viewSubjectDetails(subject)
                          }
                          className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingSubject(subject);

                            setSubjectForm({
                              name: subject.name,
                              code: subject.code,
                              description:
                                subject.description ||
                                ''
                            });

                            setShowSubjectModal(true);
                          }}
                          className="p-2 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() =>
                            handleDeleteSubject(
                              subject.id
                            )
                          }
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                          title="Delete"
                        >
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
  };

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
  // MAIN UI
  // =========================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <BookOpen className="w-8 h-8" />
            Subject Management
          </h1>

          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage curriculum subjects, class assignments,
            teachers, and coverage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingSubject(null);

              setSubjectForm({
                name: '',
                code: '',
                description: ''
              });

              setShowSubjectModal(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Subject
          </button>

          <button
            onClick={() => {
              setAssignmentForm({
                subject_id: '',
                teacher_id: '',
                class_id: ''
              });

              setShowAssignmentModal(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Assign Teacher
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                Total Subjects
              </p>

              <p className="text-2xl font-bold text-blue-600">
                {stats.totalSubjects}
              </p>
            </div>

            <BookOpen className="w-6 h-6 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                Teachers
              </p>

              <p className="text-2xl font-bold text-purple-600">
                {stats.totalTeachers}
              </p>
            </div>

            <Users className="w-6 h-6 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                Class Assignments
              </p>

              <p className="text-2xl font-bold text-green-600">
                {stats.totalAssignments}
              </p>
            </div>

            <School className="w-6 h-6 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                Class Coverage
              </p>

              <p className="text-2xl font-bold text-orange-600">
                {coveragePercentage}%
              </p>
            </div>

            <Target className="w-6 h-6 text-orange-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                Teacher Coverage
              </p>

              <p className="text-2xl font-bold text-indigo-600">
                {teacherCoveragePercentage}%
              </p>
            </div>

            <GraduationCap className="w-6 h-6 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

          <input
            type="text"
            value={searchTerm}
            onChange={event => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search subjects by name, code, or description..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <button
              onClick={() =>
                setViewMode('grid')
              }
              className={`p-2 rounded-lg ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 shadow text-blue-600'
                  : 'text-gray-500'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <button
              onClick={() =>
                setViewMode('list')
              }
              className={`p-2 rounded-lg ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 shadow text-blue-600'
                  : 'text-gray-500'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => fetchAllData()}
            disabled={refreshing}
            className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* INFO */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Briefcase className="w-5 h-5 text-blue-600 mt-0.5" />

          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              Curriculum assignments and teacher assignments are separate.
            </p>

            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              A subject can be assigned to classes even when no teacher has
              been assigned yet. The green class count shows curriculum
              assignments; teacher counts show teaching assignments.
            </p>
          </div>
        </div>
      </div>

      {/* SUBJECT LIST */}
      {subjects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />

          <p className="text-lg font-medium text-gray-900 dark:text-white">
            No subjects found
          </p>

          <p className="text-sm text-gray-500 mt-1">
            Try a different search or create a new subject.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        renderGridView()
      ) : (
        renderListView()
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3">
          <div className="text-sm text-gray-500">
            Showing{' '}
            {Math.min(
              (currentPage - 1) * PAGE_SIZE + 1,
              totalCount
            )}{' '}
            to{' '}
            {Math.min(
              currentPage * PAGE_SIZE,
              totalCount
            )}{' '}
            of {totalCount}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setCurrentPage(prev =>
                  Math.max(prev - 1, 1)
                )
              }
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() =>
                setCurrentPage(prev =>
                  Math.min(
                    prev + 1,
                    totalPages
                  )
                )
              }
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          CREATE / EDIT SUBJECT MODAL
          ===================================================== */}

      <AnimatePresence>
        {showSubjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{
                scale: 0.9,
                opacity: 0
              }}
              animate={{
                scale: 1,
                opacity: 1
              }}
              exit={{
                scale: 0.9,
                opacity: 0
              }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingSubject
                      ? 'Edit Subject'
                      : 'Create New Subject'}
                  </h3>

                  <p className="text-xs text-gray-500 mt-1">
                    Add curriculum subject information
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowSubjectModal(false);
                    setEditingSubject(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject Name *
                  </label>

                  <input
                    type="text"
                    value={subjectForm.name}
                    onChange={event =>
                      setSubjectForm(prev => ({
                        ...prev,
                        name: event.target.value
                      }))
                    }
                    placeholder="e.g. Mathematics"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject Code *
                  </label>

                  <input
                    type="text"
                    value={subjectForm.code}
                    onChange={event =>
                      setSubjectForm(prev => ({
                        ...prev,
                        code: event.target.value.toUpperCase()
                      }))
                    }
                    placeholder="e.g. MTH"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>

                  <textarea
                    value={subjectForm.description}
                    onChange={event =>
                      setSubjectForm(prev => ({
                        ...prev,
                        description: event.target.value
                      }))
                    }
                    rows={3}
                    placeholder="Subject description..."
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowSubjectModal(false);
                      setEditingSubject(null);
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={
                      editingSubject
                        ? handleUpdateSubject
                        : handleCreateSubject
                    }
                    disabled={
                      saving ||
                      !subjectForm.name.trim() ||
                      !subjectForm.code.trim()
                    }
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}

                    {editingSubject
                      ? 'Update Subject'
                      : 'Create Subject'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================
          ASSIGN TEACHER MODAL
          ===================================================== */}

      <AnimatePresence>
        {showAssignmentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{
                scale: 0.9,
                opacity: 0
              }}
              animate={{
                scale: 1,
                opacity: 1
              }}
              exit={{
                scale: 0.9,
                opacity: 0
              }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Assign Teacher
                  </h3>

                  <p className="text-xs text-gray-500 mt-1">
                    Connect a teacher to a subject and optionally a specific class.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowAssignmentModal(false);

                    setAssignmentForm({
                      subject_id: '',
                      teacher_id: '',
                      class_id: ''
                    });
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject *
                  </label>

                  <select
                    value={assignmentForm.subject_id}
                    onChange={event =>
                      setAssignmentForm(prev => ({
                        ...prev,
                        subject_id:
                          event.target.value
                      }))
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">
                      Select subject...
                    </option>

                    {allSubjects.map(subject => (
                      <option
                        key={subject.id}
                        value={subject.id}
                      >
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teacher *
                  </label>

                  <select
                    value={assignmentForm.teacher_id}
                    onChange={event =>
                      setAssignmentForm(prev => ({
                        ...prev,
                        teacher_id:
                          event.target.value
                      }))
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">
                      Select teacher...
                    </option>

                    {teachers.map(teacher => (
                      <option
                        key={teacher.id}
                        value={teacher.id}
                      >
                        {teacher.first_name}{' '}
                        {teacher.last_name}
                        {teacher.specialization
                          ? ` — ${teacher.specialization}`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Class
                  </label>

                  <select
                    value={assignmentForm.class_id}
                    onChange={event =>
                      setAssignmentForm(prev => ({
                        ...prev,
                        class_id:
                          event.target.value
                      }))
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">
                      All Classes
                    </option>

                    {classes.map(cls => (
                      <option
                        key={cls.id}
                        value={cls.id}
                      >
                        {cls.name} ({cls.code})
                      </option>
                    ))}
                  </select>

                  <p className="text-xs text-gray-400 mt-1">
                    Leave as All Classes if the teacher handles the subject across the school.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowAssignmentModal(false);

                      setAssignmentForm({
                        subject_id: '',
                        teacher_id: '',
                        class_id: ''
                      });
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleAssignTeacher}
                    disabled={
                      assigning ||
                      !assignmentForm.subject_id ||
                      !assignmentForm.teacher_id
                    }
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
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

      {/* =====================================================
          DETAILS MODAL
          ===================================================== */}

      <AnimatePresence>
        {showSubjectDetails && selectedSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{
                scale: 0.9,
                opacity: 0
              }}
              animate={{
                scale: 1,
                opacity: 1
              }}
              exit={{
                scale: 0.9,
                opacity: 0
              }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedSubject.name}
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    {selectedSubject.code}{' '}
                    •{' '}
                    {selectedSubject.subject_id}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowSubjectDetails(false);
                    setSelectedSubject(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* SUMMARY */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                        <p className="text-xs text-blue-600">
                          Subject
                        </p>

                        <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                          {selectedSubject.name}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
                        <p className="text-xs text-green-600">
                          Curriculum Classes
                        </p>

                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {subjectClasses.length}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                        <p className="text-xs text-purple-600">
                          Teacher Assignments
                        </p>

                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {subjectTeachers.length}
                        </p>
                      </div>
                    </div>

                    {/* CLASSES */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <School className="w-4 h-4 text-green-500" />
                          Classes Offering This Subject
                        </h4>

                        <span className="text-xs text-gray-500">
                          {subjectClasses.length}{' '}
                          classes
                        </span>
                      </div>

                      {subjectClasses.length === 0 ? (
                        <div className="p-6 border border-dashed border-red-300 rounded-xl text-center">
                          <AlertCircle className="w-8 h-8 mx-auto text-red-400 mb-2" />

                          <p className="text-sm text-red-500">
                            This subject is not assigned to any class.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {subjectClasses.map(item => (
                            <div
                              key={item.id}
                              className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {item.class_name}
                                  </p>

                                  <p className="text-xs text-gray-500 mt-1">
                                    {item.class_code}
                                  </p>

                                  <p className="text-xs text-gray-400 mt-1">
                                    {item.class_level}
                                  </p>
                                </div>

                                {item.is_compulsory && (
                                  <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700">
                                    Compulsory
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* TEACHERS */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-500" />
                          Assigned Teachers
                        </h4>

                        <span className="text-xs text-gray-500">
                          {subjectTeachers.length}{' '}
                          assignments
                        </span>
                      </div>

                      {subjectTeachers.length === 0 ? (
                        <div className="p-6 border border-dashed border-orange-300 rounded-xl text-center">
                          <Users className="w-8 h-8 mx-auto text-orange-400 mb-2" />

                          <p className="text-sm text-orange-500">
                            No teacher has been assigned to this subject yet.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {subjectTeachers.map(teacher => (
                            <div
                              key={teacher.id}
                              className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                  <User className="w-5 h-5 text-purple-600" />
                                </div>

                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {teacher.teacher_name}
                                  </p>

                                  <p className="text-xs text-gray-500">
                                    {teacher.class_name}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() =>
                                  handleRemoveAssignment(
                                    teacher.id
                                  )
                                }
                                className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                                title="Remove assignment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
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