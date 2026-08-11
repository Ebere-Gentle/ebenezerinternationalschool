import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';

import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';

/* ============================================================
   TYPES
============================================================ */

type Action =
  | 'pending'
  | 'promote'
  | 'demote'
  | 'repeat'
  | 'withdraw'
  | 'graduate';

type PromotionStatus =
  | 'pending'
  | 'approved'
  | 'cancelled';

interface Student {
  id: string;
  student_id?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  class_id?: string | null;
  branch_id?: string | null;
  current_status?: string | null;
  admission_status?: string | null;
}

interface AcademicSession {
  id: string;
  session_name: string;
  term_name: string;
  term_number: number;
  is_current: boolean;
  branch_id: string;
}

interface SchoolClass {
  id: string;
  name: string;
  branch_id?: string | null;
  level?: number | null;
}

interface ExistingPromotion {
  id: string;
  student_id: string;
  branch_id?: string | null;
  from_session_id: string;
  from_class_id: string;
  to_session_id?: string | null;
  to_class_id?: string | null;
  action: Action;
  reason?: string | null;
  remarks?: string | null;
  status: PromotionStatus;
}

interface Decision {
  action: Action;
  toClassId: string | null;
  reason: string;
  remarks: string;
}

interface StudentRow extends Student {
  className: string;
  suggestedClassId: string | null;
  suggestedClassName: string;
  decision: Decision;
  existingPromotion?: ExistingPromotion;
}

/* ============================================================
   CONSTANTS
============================================================ */

const ACTION_LABELS: Record<Action, string> = {
  pending: 'Pending',
  promote: 'Promote',
  demote: 'Demote',
  repeat: 'Repeat',
  withdraw: 'Withdraw',
  graduate: 'Graduate',
};

const ACTION_CLASSES: Record<Action, string> = {
  pending: 'bg-gray-100 text-gray-700 border-gray-200',
  promote: 'bg-green-50 text-green-700 border-green-200',
  demote: 'bg-red-50 text-red-700 border-red-200',
  repeat: 'bg-amber-50 text-amber-700 border-amber-200',
  withdraw: 'bg-gray-100 text-gray-700 border-gray-300',
  graduate: 'bg-purple-50 text-purple-700 border-purple-200',
};

/*
 * CORRECTED CLASS PROGRESSION:
 * 
 * KG Silver → KG Gold → Nursery 1 → Nursery 2 → Transition → 
 * Grade 1 → Grade 2 → Grade 3 → Grade 4 → Grade 5 → 
 * JSS 1 → JSS 2 → JSS 3 → 
 * SS1 (Science/Arts) → SS2 (Science/Arts) → SS3 (Science/Arts) → Graduate
 */
const CLASS_PROGRESSION = [
  { stage: 10, patterns: ['kg silver'] },
  { stage: 20, patterns: ['kg gold'] },
  { stage: 30, patterns: ['nursery 1'] },
  { stage: 40, patterns: ['nursery 2'] },
  { stage: 50, patterns: ['transition'] },
  { stage: 60, patterns: ['grade 1'] },
  { stage: 70, patterns: ['grade 2'] },
  { stage: 80, patterns: ['grade 3'] },
  { stage: 90, patterns: ['grade 4'] },
  { stage: 100, patterns: ['grade 5'] },
  { stage: 110, patterns: ['jss1'] },
  { stage: 120, patterns: ['jss2'] },
  { stage: 130, patterns: ['jss3'] },
  { stage: 140, patterns: ['ss1'] },
  { stage: 150, patterns: ['ss2'] },
  { stage: 160, patterns: ['ss3'] },
];

/* ============================================================
   HELPERS
============================================================ */

const normalizeClassName = (value?: string | null): string =>
  String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const getAcademicStage = (className?: string | null): number | null => {
  const normalized = normalizeClassName(className);
  if (!normalized) return null;

  for (const item of CLASS_PROGRESSION) {
    if (item.patterns.some((pattern) => normalized.includes(pattern))) {
      return item.stage;
    }
  }
  return null;
};

const getStream = (className?: string | null): string | null => {
  const normalized = normalizeClassName(className);
  if (!normalized) return null;

  if (normalized.includes('science')) return 'science';
  if (normalized.includes('arts')) return 'arts';
  if (normalized.includes('commercial')) return 'commercial';
  return null;
};

const getBaseClassName = (className?: string | null): string => {
  const normalized = normalizeClassName(className);
  return normalized.replace(/\s+science\b/g, '').replace(/\s+arts\b/g, '').replace(/\s+commercial\b/g, '').trim();
};

const isGraduatingClass = (className?: string | null): boolean => {
  const normalized = normalizeClassName(className);
  return normalized === 'ss3' || normalized === 'ss3 science' || normalized === 'ss3 arts' || normalized === 'ss3 commercial';
};

const getSessionYear = (sessionName?: string | null): number | null => {
  const match = String(sessionName || '').match(/^(\d{4})\/(\d{4})$/);
  if (!match) return null;
  return Number(match[1]);
};

const isValidSessionName = (sessionName?: string | null): boolean => {
  const start = getSessionYear(sessionName);
  if (start === null) return false;
  return start >= 2025 && start <= 2040;
};

const compareSessionNames = (a: string, b: string): number => {
  const yearA = getSessionYear(a);
  const yearB = getSessionYear(b);
  if (yearA === null && yearB === null) return a.localeCompare(b);
  if (yearA === null) return 1;
  if (yearB === null) return -1;
  return yearB - yearA;
};

/* ============================================================
   COMPONENT
============================================================ */

const StudentPromotion: React.FC = () => {
  const { user } = useAuth();

  const [branchId, setBranchId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [existingPromotions, setExistingPromotions] = useState<ExistingPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [targetSessionId, setTargetSessionId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState<Action | 'all'>('all');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showIndividualModal, setShowIndividualModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [globalAction, setGlobalAction] = useState<Action>('promote');
  const [globalClassId, setGlobalClassId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* ==========================================================
     AUTH / BRANCH
  ========================================================== */

  const resolveBranchId = useCallback(async () => {
    console.log('🔍 Resolving branch ID...');
    if (!user?.id) {
      console.log('❌ No user ID found');
      return null;
    }

    const directBranchId =
      (user as any)?.branch_id ||
      (user as any)?.user_metadata?.branch_id ||
      null;

    if (directBranchId) {
      console.log('✅ Branch ID from user:', directBranchId);
      setBranchId(directBranchId);
      return directBranchId;
    }

    console.log('🔍 Fetching branch from users table...');
    const { data, error: userError } = await supabase
      .from('users')
      .select('branch_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userError) {
      console.error('❌ Error fetching branch:', userError);
      throw userError;
    }
    if (!data?.branch_id) {
      console.error('❌ No branch found for user');
      throw new Error('No branch is associated with your account.');
    }

    console.log('✅ Branch from users table:', data.branch_id);
    setBranchId(data.branch_id);
    return data.branch_id;
  }, [user]);

  /* ==========================================================
     LOAD DATA
  ========================================================== */

  const loadData = useCallback(async () => {
    console.log('🔄 Loading student promotion data...');
    if (!user?.id) {
      console.log('❌ Cannot load data: No user');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const currentBranchId = branchId || (await resolveBranchId());
      if (!currentBranchId) {
        console.error('❌ No branch ID available');
        throw new Error('Unable to determine your branch.');
      }

      console.log('📚 Loading data for branch:', currentBranchId);

      const [sessionsResult, classesResult, studentsResult] = await Promise.all([
        supabase
          .from('academic_sessions')
          .select(`id, session_name, term_name, term_number, is_current, branch_id`)
          .eq('branch_id', currentBranchId),
        supabase
          .from('classes')
          .select(`id, name, branch_id, level`)
          .eq('branch_id', currentBranchId),
        supabase
          .from('students')
          .select(`id, student_id, first_name, middle_name, last_name, class_id, branch_id, current_status, admission_status`)
          .eq('branch_id', currentBranchId)
          .eq('current_status', 'active')
          .eq('admission_status', 'admitted')
          .order('last_name', { ascending: true }),
      ]);

      if (sessionsResult.error) {
        console.error('❌ Sessions error:', sessionsResult.error);
        throw sessionsResult.error;
      }
      if (classesResult.error) {
        console.error('❌ Classes error:', classesResult.error);
        throw classesResult.error;
      }
      if (studentsResult.error) {
        console.error('❌ Students error:', studentsResult.error);
        throw studentsResult.error;
      }

      const loadedSessions = (sessionsResult.data || []) as AcademicSession[];
      const loadedClasses = (classesResult.data || []) as SchoolClass[];
      const loadedStudents = (studentsResult.data || []) as Student[];

      console.log(`✅ Loaded ${loadedSessions.length} sessions, ${loadedClasses.length} classes, ${loadedStudents.length} students`);

      const validSessions = loadedSessions
        .filter((session) => isValidSessionName(session.session_name))
        .sort((a, b) => {
          const sessionDifference = compareSessionNames(a.session_name, b.session_name);
          if (sessionDifference !== 0) return sessionDifference;
          return Number(b.term_number) - Number(a.term_number);
        });

      setSessions(validSessions);
      setClasses(loadedClasses);
      setStudents(loadedStudents);

      // Auto-select current session
      const currentSession =
        validSessions.find((session) => session.is_current && session.term_number === 3) ||
        validSessions.find((session) => session.is_current) ||
        validSessions.find((session) => session.term_number === 3) ||
        null;

      if (currentSession) {
        console.log('📌 Selected session:', currentSession.session_name, currentSession.term_name);
        setSelectedSessionId(currentSession.id);

        const currentYear = getSessionYear(currentSession.session_name);
        const nextSession = validSessions.find((session) => {
          const sessionYear = getSessionYear(session.session_name);
          return session.term_number === 1 && currentYear !== null && sessionYear === currentYear + 1;
        }) || null;

        if (nextSession) {
          console.log('📌 Target session:', nextSession.session_name);
          setTargetSessionId(nextSession.id);
        }
      }

      // Load existing promotions
      if (currentSession) {
        console.log('📋 Loading existing promotions for session:', currentSession.id);
        const promotionResult = await supabase
          .from('student_promotions')
          .select(`id, student_id, branch_id, from_session_id, from_class_id, to_session_id, to_class_id, action, reason, remarks, status`)
          .eq('branch_id', currentBranchId)
          .eq('from_session_id', currentSession.id)
          .neq('status', 'cancelled');

        if (promotionResult.error) {
          console.error('❌ Promotions error:', promotionResult.error);
          throw promotionResult.error;
        }

        console.log(`✅ Loaded ${promotionResult.data?.length || 0} existing promotions`);
        setExistingPromotions((promotionResult.data || []) as ExistingPromotion[]);
      } else {
        console.log('⚠️ No current session found');
        setExistingPromotions([]);
      }
    } catch (err: any) {
      console.error('❌ Load data error:', err);
      setError(err?.message || 'Unable to load student promotion data.');
    } finally {
      setLoading(false);
      console.log('✅ Load complete');
    }
  }, [branchId, resolveBranchId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ==========================================================
     MAPS
  ========================================================== */

  const classMap = useMemo(() => {
    const map = new Map<string, SchoolClass>();
    classes.forEach((item) => map.set(item.id, item));
    return map;
  }, [classes]);

  const promotionMap = useMemo(() => {
    const map = new Map<string, ExistingPromotion>();
    existingPromotions.forEach((promotion) => map.set(promotion.student_id, promotion));
    return map;
  }, [existingPromotions]);

  /* ==========================================================
     CLASS PROGRESSION
  ========================================================== */

  const findClassForStage = useCallback(
    (stage: number, currentClass?: SchoolClass | null): SchoolClass | null => {
      const currentStream = getStream(currentClass?.name);
      const candidates = classes.filter((item) => {
        const itemStage = getAcademicStage(item.name);
        if (itemStage !== stage) return false;
        if (!currentStream) return true;
        const itemStream = getStream(item.name);
        return !itemStream || itemStream === currentStream;
      });

      if (!candidates.length) return null;

      if (currentStream) {
        const exact = candidates.find((item) => getStream(item.name) === currentStream);
        if (exact) return exact;
      }

      const currentBase = getBaseClassName(currentClass?.name);
      const sameBase = candidates.find((item) => getBaseClassName(item.name) === currentBase);
      return sameBase || candidates[0];
    },
    [classes]
  );

  const getNextClass = useCallback(
    (classId?: string | null): SchoolClass | null => {
      if (!classId) return null;
      const current = classMap.get(classId);
      if (!current) return null;
      
      // If student is in SS3, they should graduate
      if (isGraduatingClass(current.name)) {
        return null; // No next class, they graduate
      }

      const currentStage = getAcademicStage(current.name);
      if (currentStage === null) return null;

      return findClassForStage(currentStage + 10, current);
    },
    [classMap, findClassForStage]
  );

  const getPreviousClass = useCallback(
    (classId?: string | null): SchoolClass | null => {
      if (!classId) return null;
      const current = classMap.get(classId);
      if (!current) return null;

      const currentStage = getAcademicStage(current.name);
      if (currentStage === null) return null;

      return findClassForStage(currentStage - 10, current);
    },
    [classMap, findClassForStage]
  );

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const stageA = getAcademicStage(a.name);
      const stageB = getAcademicStage(b.name);
      if (stageA !== null && stageB !== null && stageA !== stageB) return stageA - stageB;
      if (stageA !== null && stageB === null) return -1;
      if (stageA === null && stageB !== null) return 1;
      return String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [classes]);

  /* ==========================================================
     STUDENT NAME
  ========================================================== */

  const getStudentName = useCallback(
    (student: Student) => {
      return [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ') || 'Unnamed Student';
    },
    []
  );

  /* ==========================================================
     DEFAULT DECISION — FIXED FOR SS3 GRADUATION
  ========================================================== */

  const createDefaultDecision = useCallback(
    (student: Student): Decision => {
      console.log(`📝 Creating default decision for student: ${student.id}`);
      
      const existing = promotionMap.get(student.id);
      if (existing) {
        console.log(`   Using existing promotion: ${existing.action}`);
        return {
          action: existing.action,
          toClassId: existing.to_class_id || null,
          reason: existing.reason || '',
          remarks: existing.remarks || '',
        };
      }

      const currentClass = classMap.get(student.class_id || '');
      
      // SS3 students should default to GRADUATE
      if (isGraduatingClass(currentClass?.name)) {
        console.log(`   Student in graduating class: ${currentClass?.name} -> GRADUATE`);
        return {
          action: 'graduate',
          toClassId: null,
          reason: 'Completed SS3',
          remarks: 'Student has completed secondary education.',
        };
      }

      const nextClass = getNextClass(student.class_id);
      if (!nextClass) {
        console.log(`   No next class found for student`);
        return {
          action: 'pending',
          toClassId: null,
          reason: '',
          remarks: 'No matching next class was found automatically.',
        };
      }

      console.log(`   Suggested promotion to: ${nextClass.name}`);
      return {
        action: 'promote',
        toClassId: nextClass.id,
        reason: '',
        remarks: '',
      };
    },
    [promotionMap, classMap, getNextClass]
  );

  /* ==========================================================
     STUDENT ROWS — FIXED FOR SS3
  ========================================================== */

  const studentRows = useMemo<StudentRow[]>(() => {
    console.log('🔄 Building student rows...');
    return students.map((student) => {
      const currentClass = classMap.get(student.class_id || '');
      const nextClass = getNextClass(student.class_id);
      let decision = decisions[student.id] || createDefaultDecision(student);

      // ✅ FIX: If student is in graduating class, ensure decision is 'graduate'
      if (isGraduatingClass(currentClass?.name) && decision.action === 'promote') {
        console.log(`   Auto-fixing ${student.first_name} ${student.last_name}: promote → graduate`);
        decision = { ...decision, action: 'graduate', toClassId: null };
        // Update the decision in state
        setDecisions(prev => ({
          ...prev,
          [student.id]: decision
        }));
      }

      let suggestedClassName = nextClass?.name || 'No matching next class';
      let suggestedClassId = nextClass?.id || null;
      
      if (isGraduatingClass(currentClass?.name)) {
        suggestedClassName = '🎓 Graduate';
        suggestedClassId = null;
      }

      return {
        ...student,
        className: currentClass?.name || 'No Class',
        suggestedClassId,
        suggestedClassName,
        decision,
        existingPromotion: promotionMap.get(student.id),
      };
    });
  }, [students, classMap, getNextClass, decisions, createDefaultDecision, promotionMap]);

  /* ==========================================================
     FILTERS
  ========================================================== */

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return studentRows.filter((student) => {
      const name = getStudentName(student).toLowerCase();
      const studentId = String(student.student_id || '').toLowerCase();
      const matchesSearch = !query || name.includes(query) || studentId.includes(query);
      const matchesClass = classFilter === 'all' || student.class_id === classFilter;
      const matchesAction = actionFilter === 'all' || student.decision.action === actionFilter;
      return matchesSearch && matchesClass && matchesAction;
    });
  }, [studentRows, searchTerm, classFilter, actionFilter, getStudentName]);

  /* ==========================================================
     SESSION
  ========================================================== */

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  const targetSession = useMemo(
    () => sessions.find((session) => session.id === targetSessionId) || null,
    [sessions, targetSessionId]
  );

  /* ==========================================================
     STATISTICS
  ========================================================== */

  const stats = useMemo(() => {
    const result = { total: studentRows.length, selected: selectedStudents.size, promote: 0, demote: 0, repeat: 0, withdraw: 0, graduate: 0, pending: 0 };
    studentRows.forEach((student) => {
      const action = student.decision.action;
      if (action === 'promote') result.promote++;
      if (action === 'demote') result.demote++;
      if (action === 'repeat') result.repeat++;
      if (action === 'withdraw') result.withdraw++;
      if (action === 'graduate') result.graduate++;
      if (action === 'pending') result.pending++;
    });
    return result;
  }, [studentRows, selectedStudents]);

  /* ==========================================================
     UPDATE DECISION
  ========================================================== */

  const updateDecision = (studentId: string, patch: Partial<Decision>) => {
    console.log(`📝 Updating decision for student ${studentId}:`, patch);
    setDecisions((previous) => {
      const student = students.find((item) => item.id === studentId);
      if (!student) return previous;
      const current = previous[studentId] || createDefaultDecision(student);
      return { ...previous, [studentId]: { ...current, ...patch } };
    });
  };

  /* ==========================================================
     ACTION CHANGE — FIXED FOR SS3
  ========================================================== */

  const handleActionChange = (student: StudentRow, action: Action) => {
    console.log(`🔄 Changing action for ${getStudentName(student)} to: ${action}`);
    let toClassId = student.decision.toClassId;
    let finalAction = action;

    if (action === 'promote') {
      // If student is in a graduating class, promote should actually be graduate
      if (isGraduatingClass(student.className)) {
        console.log(`   Student ${getStudentName(student)} is in graduating class - setting to graduate`);
        finalAction = 'graduate';
        toClassId = null;
      } else {
        toClassId = student.suggestedClassId;
      }
    }
    if (action === 'demote') {
      toClassId = getPreviousClass(student.class_id)?.id || null;
    }
    if (action === 'repeat') {
      toClassId = student.class_id || null;
    }
    if (action === 'withdraw' || action === 'graduate') {
      toClassId = null;
    }

    updateDecision(student.id, { action: finalAction, toClassId });

    if (editingStudent?.id === student.id) {
      setEditingStudent({ ...editingStudent, decision: { ...editingStudent.decision, action: finalAction, toClassId } });
    }
  };

  /* ==========================================================
     SELECTION
  ========================================================== */

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((previous) => {
      const next = new Set(previous);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedStudents((previous) => {
      const next = new Set(previous);
      const allSelected = filteredStudents.length > 0 && filteredStudents.every((student) => next.has(student.id));
      filteredStudents.forEach((student) => {
        if (allSelected) next.delete(student.id);
        else next.add(student.id);
      });
      return next;
    });
  };

  /* ==========================================================
     BULK DECISION
  ========================================================== */

  const applyBulkDecision = () => {
    console.log('📦 Applying bulk decision...');
    console.log(`   Selected students: ${selectedStudents.size}`);
    console.log(`   Action: ${globalAction}`);
    console.log(`   Class ID: ${globalClassId || 'auto'}`);

    if (selectedStudents.size === 0) {
      console.warn('⚠️ No students selected');
      setError('Select at least one student first.');
      return;
    }
    setError('');

    setDecisions((previous) => {
      const next = { ...previous };
      selectedStudents.forEach((studentId) => {
        const student = studentRows.find((item) => item.id === studentId);
        if (!student) return;

        let toClassId: string | null = globalClassId || null;
        let action = globalAction;

        if (globalAction === 'promote') {
          // If student is in graduating class, promote should be graduate
          if (isGraduatingClass(student.className)) {
            action = 'graduate';
            toClassId = null;
          } else {
            toClassId = student.suggestedClassId;
          }
        }
        if (globalAction === 'demote') {
          toClassId = getPreviousClass(student.class_id)?.id || null;
        }
        if (globalAction === 'repeat') {
          toClassId = student.class_id || null;
        }
        if (globalAction === 'withdraw' || globalAction === 'graduate') {
          toClassId = null;
        }

        console.log(`   ${student.first_name} ${student.last_name}: ${action} -> ${toClassId || 'none'}`);
        next[studentId] = { ...student.decision, action, toClassId };
      });
      return next;
    });

    setSuccess(`${selectedStudents.size} student decision(s) updated.`);
    console.log('✅ Bulk decision applied');
  };

  /* ==========================================================
     SAVE DECISIONS — FIXED VALIDATION
  ========================================================== */

  const savePendingDecisions = async () => {
    console.log('💾 === SAVE PENDING DECISIONS STARTED ===');
    console.log(`   Branch ID: ${branchId}`);
    console.log(`   Selected Session: ${selectedSessionId}`);
    console.log(`   Target Session: ${targetSessionId}`);
    console.log(`   User ID: ${user?.id}`);

    if (!branchId || !selectedSessionId) {
      console.error('❌ Missing branch or session');
      setError('Current academic session could not be determined.');
      return;
    }
    if (!targetSessionId) {
      console.error('❌ Missing target session');
      setError('Please select the target academic session.');
      return;
    }

    const rowsToSave = studentRows.filter(
      (student) => selectedStudents.has(student.id) && student.decision.action !== 'pending'
    );

    console.log(`   Found ${rowsToSave.length} students to save`);

    if (!rowsToSave.length) {
      console.warn('⚠️ No students to save');
      setError('Select students with decisions before saving.');
      return;
    }

    // ✅ FIX: Validate only promote, demote, repeat need a target class
    // Graduate and Withdraw are allowed with null toClassId
    const invalid = rowsToSave.find(
      (student) => {
        // If action is promote AND student is in graduating class, they should be graduate instead
        if (student.decision.action === 'promote' && isGraduatingClass(student.className)) {
          console.log(`   ⚠️ Student ${student.id} is in graduating class but has action 'promote' - auto-fixing to 'graduate'`);
          // Auto-fix: change to graduate
          updateDecision(student.id, { action: 'graduate', toClassId: null });
          return false;
        }
        
        // Only these actions require a target class
        const needsTargetClass = ['promote', 'demote', 'repeat'].includes(student.decision.action);
        const hasTargetClass = !!student.decision.toClassId;
        
        return needsTargetClass && !hasTargetClass;
      }
    );
    
    if (invalid) {
      console.error(`❌ Student ${invalid.id} has no target class for ${invalid.decision.action}`);
      setError(`${getStudentName(invalid)} has no valid target class for ${invalid.decision.action}.`);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    let savedCount = 0;
    let failedCount = 0;

    try {
      for (const student of rowsToSave) {
        // ✅ FIX: If student is in graduating class and action is promote, change to graduate
        let decision = student.decision;
        if (decision.action === 'promote' && isGraduatingClass(student.className)) {
          console.log(`   Auto-fixing ${getStudentName(student)}: promote → graduate`);
          decision = { ...decision, action: 'graduate', toClassId: null };
          // Update the decision in state
          updateDecision(student.id, { action: 'graduate', toClassId: null });
        }

        console.log(`   Processing student: ${student.first_name} ${student.last_name} (${student.id})`);
        console.log(`      Action: ${decision.action}`);
        console.log(`      To Class ID: ${decision.toClassId}`);
        console.log(`      From Class ID: ${student.class_id}`);

        const existing = existingPromotions.find(
          (promotion) =>
            promotion.student_id === student.id &&
            promotion.from_session_id === selectedSessionId &&
            promotion.status !== 'cancelled'
        );

        const isTerminal = decision.action === 'withdraw' || decision.action === 'graduate';

        const payload = {
          student_id: student.id,
          branch_id: branchId,
          from_session_id: selectedSessionId,
          from_class_id: student.class_id,
          to_session_id: isTerminal ? null : targetSessionId,
          to_class_id: isTerminal ? null : decision.toClassId,
          action: decision.action,
          reason: decision.reason || null,
          remarks: decision.remarks || null,
          status: 'pending' as const,
          created_by: user?.id || null,
          metadata: {
            source: 'admin_student_promotion',
            source_session: selectedSession?.session_name || null,
            target_session: targetSession?.session_name || null,
            from_class: student.className,
            suggested_class: student.suggestedClassName,
            saved_at: new Date().toISOString(),
          },
        };

        console.log(`      Payload:`, payload);

        if (existing) {
          console.log(`      Updating existing promotion: ${existing.id}`);
          const { data: updateData, error: updateError } = await supabase
            .from('student_promotions')
            .update(payload)
            .eq('id', existing.id)
            .select();

          if (updateError) {
            console.error(`      ❌ Update error for ${student.id}:`, updateError);
            failedCount++;
            continue;
          }
          console.log(`      ✅ Update successful:`, updateData);
        } else {
          console.log(`      Creating new promotion`);
          const { data: insertData, error: insertError } = await supabase
            .from('student_promotions')
            .insert(payload)
            .select();

          if (insertError) {
            console.error(`      ❌ Insert error for ${student.id}:`, insertError);
            failedCount++;
            continue;
          }
          console.log(`      ✅ Insert successful:`, insertData);
        }
        savedCount++;
      }

      console.log(`✅ Saved ${savedCount} promotion decisions, ${failedCount} failed`);
      
      if (savedCount > 0) {
        setSuccess(`${savedCount} promotion decision(s) saved as pending.${failedCount > 0 ? ` ${failedCount} failed.` : ''}`);
        await loadData();
      } else {
        setError(`Failed to save any promotions. ${failedCount} failed.`);
      }
    } catch (err: any) {
      console.error('❌ Save error:', err);
      setError(err?.message || 'Unable to save promotion decisions.');
    } finally {
      setSaving(false);
      console.log('💾 === SAVE PENDING DECISIONS COMPLETED ===');
    }
  };

  /* ==========================================================
     FINALIZE PROMOTIONS — WITH FULL DEBUG
  ========================================================== */

  const finalizePromotions = async () => {
    console.log('🚀 === FINALIZE PROMOTIONS STARTED ===');
    console.log(`   Branch ID: ${branchId}`);
    console.log(`   Selected Session: ${selectedSessionId}`);
    console.log(`   User ID: ${user?.id}`);

    if (!branchId || !selectedSessionId) {
      console.error('❌ Missing branch or session');
      setError('Current academic session could not be determined.');
      return;
    }

    // Get all pending promotions for this session
    const pending = existingPromotions.filter(
      (promotion) =>
        promotion.from_session_id === selectedSessionId &&
        promotion.status === 'pending'
    );

    console.log(`   Found ${pending.length} pending promotions`);

    if (!pending.length) {
      console.warn('⚠️ No pending promotions found');
      setError('There are no pending promotion decisions to finalize. Save the decisions first.');
      return;
    }

    // Log each pending promotion
    pending.forEach((p, i) => {
      console.log(`   Pending ${i+1}: Student ${p.student_id}, Action: ${p.action}, From: ${p.from_class_id}, To: ${p.to_class_id}`);
    });

    setFinalizing(true);
    setError('');
    setSuccess('');

    try {
      const ids = pending.map((promotion) => promotion.id);
      console.log(`   Promotion IDs to approve:`, ids);

      // FIRST: Try the RPC function
      let rpcSuccess = false;
      try {
        console.log('   Attempting RPC: approve_student_promotions');
        const { data: rpcData, error: rpcError } = await supabase.rpc('approve_student_promotions', {
          p_promotion_ids: ids,
          p_approved_by: user?.id || null,
        });
        
        if (rpcError) {
          console.warn('   ⚠️ RPC failed:', rpcError);
        } else {
          console.log('   ✅ RPC succeeded:', rpcData);
          rpcSuccess = true;
        }
      } catch (err) {
        console.warn('   ⚠️ RPC exception:', err);
      }

      // If RPC failed, do manual updates
      let updatedCount = 0;
      let failedIds: string[] = [];

      if (!rpcSuccess) {
        console.log('   📝 Falling back to manual updates...');

        for (const promotion of pending) {
          console.log(`   Processing promotion ${promotion.id} for student ${promotion.student_id}`);

          // Update the promotion status
          console.log(`     Updating promotion status to 'approved'...`);
          const { data: updateData, error: updateError } = await supabase
            .from('student_promotions')
            .update({
              status: 'approved',
              approved_by: user?.id || null,
              approved_at: new Date().toISOString(),
            })
            .eq('id', promotion.id)
            .select();

          if (updateError) {
            console.error(`     ❌ Failed to approve promotion ${promotion.id}:`, updateError);
            failedIds.push(promotion.id);
            continue;
          }
          console.log(`     ✅ Promotion ${promotion.id} status updated:`, updateData);

          // Now update the student based on the action
          console.log(`     Updating student ${promotion.student_id} for action: ${promotion.action}`);

          if (promotion.action === 'promote' && promotion.to_class_id) {
            console.log(`       Moving student to class: ${promotion.to_class_id}`);
            const { data: studentData, error: studentUpdateError } = await supabase
              .from('students')
              .update({
                class_id: promotion.to_class_id,
                updated_at: new Date().toISOString(),
              })
              .eq('id', promotion.student_id)
              .select();

            if (studentUpdateError) {
              console.error(`       ❌ Failed to update student class:`, studentUpdateError);
            } else {
              console.log(`       ✅ Student class updated:`, studentData);
            }
          } else if (promotion.action === 'repeat') {
            console.log(`       Student stays in same class`);
            const { data: studentData, error: studentUpdateError } = await supabase
              .from('students')
              .update({
                updated_at: new Date().toISOString(),
              })
              .eq('id', promotion.student_id)
              .select();

            if (studentUpdateError) {
              console.error(`       ❌ Failed to update student:`, studentUpdateError);
            } else {
              console.log(`       ✅ Student updated:`, studentData);
            }
          } else if (promotion.action === 'withdraw') {
            console.log(`       Withdrawing student`);
            const { data: studentData, error: studentUpdateError } = await supabase
              .from('students')
              .update({
                current_status: 'withdrawn',
                updated_at: new Date().toISOString(),
              })
              .eq('id', promotion.student_id)
              .select();

            if (studentUpdateError) {
              console.error(`       ❌ Failed to withdraw student:`, studentUpdateError);
            } else {
              console.log(`       ✅ Student withdrawn:`, studentData);
            }
          } else if (promotion.action === 'graduate') {
            console.log(`       Graduating student`);
            const { data: studentData, error: studentUpdateError } = await supabase
              .from('students')
              .update({
                current_status: 'graduated',
                updated_at: new Date().toISOString(),
              })
              .eq('id', promotion.student_id)
              .select();

            if (studentUpdateError) {
              console.error(`       ❌ Failed to graduate student:`, studentUpdateError);
            } else {
              console.log(`       ✅ Student graduated:`, studentData);
            }
          } else if (promotion.action === 'demote' && promotion.to_class_id) {
            console.log(`       Demoting student to class: ${promotion.to_class_id}`);
            const { data: studentData, error: studentUpdateError } = await supabase
              .from('students')
              .update({
                class_id: promotion.to_class_id,
                updated_at: new Date().toISOString(),
              })
              .eq('id', promotion.student_id)
              .select();

            if (studentUpdateError) {
              console.error(`       ❌ Failed to demote student:`, studentUpdateError);
            } else {
              console.log(`       ✅ Student demoted:`, studentData);
            }
          }

          updatedCount++;
        }

        console.log(`   Manual updates complete: ${updatedCount} succeeded, ${failedIds.length} failed`);
      }

      const totalApproved = rpcSuccess ? pending.length : updatedCount;

      if (totalApproved === 0) {
        throw new Error(`Failed to approve any promotions.`);
      }

      setShowReviewModal(false);

      if (failedIds.length > 0) {
        setSuccess(`${totalApproved} promotion(s) approved successfully. ${failedIds.length} failed.`);
      } else {
        setSuccess(`${totalApproved} promotion decision(s) approved successfully.`);
      }

      console.log(`✅ Finalization complete: ${totalApproved} approved`);
      await loadData();
    } catch (err: any) {
      console.error('❌ Finalizing promotions failed:', err);
      setError(err?.message || 'Unable to finalize promotion decisions.');
    } finally {
      setFinalizing(false);
      console.log('🚀 === FINALIZE PROMOTIONS COMPLETED ===');
    }
  };

  /* ==========================================================
     INDIVIDUAL EDIT
  ========================================================== */

  const openIndividualEditor = (student: StudentRow) => {
    console.log(`✏️ Opening editor for: ${getStudentName(student)}`);
    setEditingStudent(student);
    setShowIndividualModal(true);
  };

  const closeIndividualEditor = () => {
    console.log('✏️ Closing editor');
    setEditingStudent(null);
    setShowIndividualModal(false);
  };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading student promotion data...</p>
        </div>
      </div>
    );
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-600 text-white">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Student Promotion
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Review, promote, repeat, demote, withdraw or graduate students.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Error & Success */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4">
          <X className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-800 dark:text-red-300">{error}</p>
          </div>
          <button type="button" onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900 p-4">
          <Check className="w-5 h-5 text-green-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-green-800 dark:text-green-300">{success}</p>
          </div>
          <button type="button" onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Session Control */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Academic Session
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => {
                console.log('📌 Session changed to:', e.target.value);
                setSelectedSessionId(e.target.value);
                setExistingPromotions([]);
                setDecisions({});
                setSelectedStudents(new Set());
              }}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm"
            >
              <option value="">Select current session</option>
              {sessions
                .filter((session) => session.term_number === 3 || session.is_current)
                .map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.session_name} — {session.term_name}
                    {session.is_current ? ' (Current)' : ''}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Promotion Target Session
            </label>
            <select
              value={targetSessionId}
              onChange={(e) => {
                console.log('📌 Target session changed to:', e.target.value);
                setTargetSessionId(e.target.value);
              }}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm"
            >
              <option value="">Select target session</option>
              {sessions
                .filter((session) => session.term_number === 1)
                .map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.session_name} — {session.term_name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {selectedSession && (
          <div className="mt-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-300">Promotion period</p>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  Reviewing students from <strong>{selectedSession.session_name}</strong> ({selectedSession.term_name}).
                </p>
                {targetSession && (
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    Target: <strong>{targetSession.session_name}</strong>
                  </p>
                )}
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Class suggestions preserve the student's academic stream where possible.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { icon: Users, value: stats.total, label: 'Students' },
          { icon: UserCheck, value: stats.promote, label: 'Promote' },
          { icon: ArrowDown, value: stats.demote, label: 'Demote' },
          { icon: RefreshCw, value: stats.repeat, label: 'Repeat' },
          { icon: UserMinus, value: stats.withdraw, label: 'Withdraw' },
          { icon: GraduationCap, value: stats.graduate, label: 'Graduate' },
          { icon: ShieldCheck, value: stats.pending, label: 'Pending' },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <Icon className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student or ID..."
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm"
            />
          </div>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm"
          >
            <option value="all">All Classes</option>
            {sortedClasses.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as Action | 'all')}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm"
          >
            <option value="all">All Decisions</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedStudents.size > 0 && (
        <div className="bg-blue-600 rounded-xl p-4 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="font-semibold">{selectedStudents.size} student(s) selected</div>

            <select
              value={globalAction}
              onChange={(e) => setGlobalAction(e.target.value as Action)}
              className="rounded-lg bg-white text-gray-900 px-3 py-2 text-sm"
            >
              <option value="promote">Promote</option>
              <option value="demote">Demote</option>
              <option value="repeat">Repeat</option>
              <option value="withdraw">Withdraw</option>
              <option value="graduate">Graduate</option>
            </select>

            {(globalAction === 'promote' || globalAction === 'demote') && (
              <select
                value={globalClassId}
                onChange={(e) => setGlobalClassId(e.target.value)}
                className="rounded-lg bg-white text-gray-900 px-3 py-2 text-sm"
              >
                <option value="">Auto-select class</option>
                {sortedClasses.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={applyBulkDecision}
              className="px-4 py-2 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50"
            >
              Apply Decision
            </button>

            <button
              type="button"
              onClick={() => setSelectedStudents(new Set())}
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Student Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      filteredStudents.length > 0 &&
                      filteredStudents.every((student) => selectedStudents.has(student.id))
                    }
                    onChange={toggleAllFiltered}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Student ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Current Class</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Suggested Class</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Decision</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <Users className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                    <p className="font-medium text-gray-700 dark:text-gray-300">No students found</p>
                    <p className="text-sm text-gray-500 mt-1">Try changing your search or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-950/50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.id)}
                        onChange={() => toggleStudent(student.id)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {getStudentName(student)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">{student.student_id || '—'}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                        {student.className}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-sm font-medium ${
                          student.suggestedClassId
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                            : student.decision.action === 'graduate'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {student.suggestedClassName}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={student.decision.action}
                        onChange={(e) => handleActionChange(student, e.target.value as Action)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${ACTION_CLASSES[student.decision.action]}`}
                      >
                        {Object.entries(ACTION_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      {student.existingPromotion ? (
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                            student.existingPromotion.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {student.existingPromotion.status}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Not saved</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openIndividualEditor(student)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                      >
                        Edit
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-500">
          Showing {filteredStudents.length} of {studentRows.length} students
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={savePendingDecisions}
            disabled={saving || selectedStudents.size === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Decisions
          </button>

          <button
            type="button"
            onClick={() => {
              console.log('📋 Opening review modal...');
              setShowReviewModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
          >
            <ShieldCheck className="w-4 h-4" />
            Review & Finalize
          </button>
        </div>
      </div>

      {/* Individual Edit Modal */}
      {showIndividualModal && editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Promotion Decision</h2>
                <p className="text-sm text-gray-500 mt-1">{getStudentName(editingStudent)}</p>
              </div>
              <button type="button" onClick={closeIndividualEditor} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-950 p-3">
                  <p className="text-xs text-gray-500">Current Class</p>
                  <p className="font-semibold mt-1">{editingStudent.className}</p>
                </div>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3">
                  <p className="text-xs text-blue-600">Suggested Class</p>
                  <p className="font-semibold mt-1">{editingStudent.suggestedClassName}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Decision</label>
                <select
                  value={editingStudent.decision.action}
                  onChange={(e) => handleActionChange(editingStudent, e.target.value as Action)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5"
                >
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Class</label>
                <select
                  value={editingStudent.decision.toClassId || ''}
                  onChange={(e) => {
                    const toClassId = e.target.value || null;
                    updateDecision(editingStudent.id, { toClassId });
                    setEditingStudent((previous) =>
                      previous ? { ...previous, decision: { ...previous.decision, toClassId } } : previous
                    );
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5"
                >
                  <option value="">No target (Graduate/Withdraw)</option>
                  {sortedClasses.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {editingStudent.decision.action === 'graduate' || editingStudent.decision.action === 'withdraw' 
                    ? 'Graduate and Withdraw do not require a target class' 
                    : 'Select a target class for promotion/demotion/repeat'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Reason</label>
                <input
                  type="text"
                  value={editingStudent.decision.reason}
                  onChange={(e) => {
                    const reason = e.target.value;
                    updateDecision(editingStudent.id, { reason });
                    setEditingStudent((previous) =>
                      previous ? { ...previous, decision: { ...previous.decision, reason } } : previous
                    );
                  }}
                  placeholder="Reason for this decision"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Remarks</label>
                <textarea
                  rows={4}
                  value={editingStudent.decision.remarks}
                  onChange={(e) => {
                    const remarks = e.target.value;
                    updateDecision(editingStudent.id, { remarks });
                    setEditingStudent((previous) =>
                      previous ? { ...previous, decision: { ...previous.decision, remarks } } : previous
                    );
                  }}
                  placeholder="Additional remarks..."
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-800">
              <button type="button" onClick={closeIndividualEditor} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                Close
              </button>
              <button type="button" onClick={closeIndividualEditor} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
                Save Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Review Promotion Decisions</h2>
                <p className="text-sm text-gray-500 mt-1">Review the actual class mapping before approval.</p>
              </div>
              <button type="button" onClick={() => setShowReviewModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
                {[
                  ['Promote', stats.promote, 'bg-green-50 text-green-700'],
                  ['Demote', stats.demote, 'bg-red-50 text-red-700'],
                  ['Repeat', stats.repeat, 'bg-amber-50 text-amber-700'],
                  ['Withdraw', stats.withdraw, 'bg-gray-100 text-gray-700'],
                  ['Graduate', stats.graduate, 'bg-purple-50 text-purple-700'],
                  ['Pending', stats.pending, 'bg-blue-50 text-blue-700'],
                ].map(([label, value, classes]) => (
                  <div key={label} className={`p-3 rounded-lg ${classes}`}>
                    <p className="text-xs">{label}</p>
                    <p className="text-xl font-bold">{value}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-gray-50 dark:bg-gray-950">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Student</th>
                      <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">From</th>
                      <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Action</th>
                      <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">To</th>
                      <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Reason</th>
                      <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {studentRows
                      .filter((student) => selectedStudents.has(student.id) && student.decision.action !== 'pending')
                      .map((student) => (
                        <tr key={student.id}>
                          <td className="px-4 py-3 font-medium">{getStudentName(student)}</td>
                          <td className="px-4 py-3 text-sm">{student.className}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${ACTION_CLASSES[student.decision.action]}`}>
                              {ACTION_LABELS[student.decision.action]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {student.decision.toClassId
                              ? classMap.get(student.decision.toClassId)?.name || '—'
                              : student.decision.action === 'graduate'
                              ? '🎓 Graduated'
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{student.decision.reason}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{student.decision.remarks}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4">
                <p className="font-semibold text-amber-800 dark:text-amber-300">Approval warning</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Approval records these decisions as official promotion decisions.
                  Review every student's source class, action and target class before continuing.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-800">
              <button type="button" onClick={() => setShowReviewModal(false)} className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={savePendingDecisions}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Pending Decisions'}
              </button>
              <button
                type="button"
                onClick={finalizePromotions}
                disabled={finalizing}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {finalizing && <Loader2 className="w-4 h-4 animate-spin" />}
                <ShieldCheck className="w-4 h-4" />
                Approve Decisions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPromotion;