import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  GraduationCap,
  Loader2,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';

interface Student {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  class_id: string | null;
  branch_id: string;
  session_id?: string | null;
  passport_url?: string | null;
}

interface SchoolClass {
  id: string;
  name: string;
  code: string;
  level: string;
  department?: string | null;
  academic_session?: string | null;
  status?: string | null;
}

interface Subject {
  id: string;
  subject_id: string;
  name: string;
  code: string;
  description?: string | null;
}

interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  is_compulsory: boolean;
  status?: string | null;
}

interface TeacherSubject {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id?: string | null;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  position?: string | null;
  department?: string | null;
  photo_url?: string | null;
}

interface AcademicSession {
  id: string;
  branch_id: string;
  session_name: string;
  term_name: string;
  term_number: number;
  start_date: string;
  end_date: string;
  is_current?: boolean | null;
}

interface Term {
  id: string;
  branch_id: string;
  session: string;
  term: string;
  start_date: string;
  end_date: string;
  is_active?: boolean | null;
  is_closed?: boolean | null;
}

interface SchemeOfWork {
  id: string;
  branch_id: string;
  class_id: string;
  subject_id: string;
  term_id: string;
  week_number: number;
  topic: string;
  sub_topic?: string | null;
  objectives?: string | null;
  activities?: string | null;
  resources?: string | null;
  assessment?: string | null;
  duration?: string | null;
  teacher_notes?: string | null;
  status?: string | null;
}

interface EnrolledSubject {
  id: string;
  subjectId: string;
  name: string;
  code: string;
  description?: string | null;
  teacher?: string | null;
  teacherId?: string | null;
  teacherPhoto?: string | null;
  position?: string | null;
  department?: string | null;
  compulsory: boolean;
}

/* ============================================================
   CONSTANTS
============================================================ */

const MIN_SESSION_YEAR = 2019;
const MAX_SESSION_YEAR = 2026;

const ALLOWED_SESSIONS = Array.from(
  { length: MAX_SESSION_YEAR - MIN_SESSION_YEAR + 1 },
  (_, index) => {
    const year = MIN_SESSION_YEAR + index;
    return `${year}/${year + 1}`;
  }
);

const DEFAULT_SESSION = '2026/2027';
const DEFAULT_TERM = 'First Term';

/* ============================================================
   HELPERS
============================================================ */

const formatDate = (date?: string | null) => {
  if (!date) return 'Date unavailable';

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const normalizeTermName = (value?: string | null) => {
  if (!value) return '';

  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

/**
 * academic_sessions:
 * First Term
 * Second Term
 * Third Term
 *
 * terms:
 * 1st Term
 * 2nd Term
 * 3rd Term
 */
const academicTermToDatabaseTerm = (value?: string | null) => {
  const normalized = normalizeTermName(value);

  if (
    normalized === 'first' ||
    normalized === '1' ||
    normalized === '1st' ||
    normalized === '1st term' ||
    normalized === 'first term'
  ) {
    return '1st Term';
  }

  if (
    normalized === 'second' ||
    normalized === '2' ||
    normalized === '2nd' ||
    normalized === '2nd term' ||
    normalized === 'second term'
  ) {
    return '2nd Term';
  }

  if (
    normalized === 'third' ||
    normalized === '3' ||
    normalized === '3rd' ||
    normalized === '3rd term' ||
    normalized === 'third term'
  ) {
    return '3rd Term';
  }

  return value?.trim() || '';
};

const getTermLabel = (term?: string | null) => {
  if (!term) return 'Term';

  const normalized = normalizeTermName(term);

  if (
    normalized === '1' ||
    normalized === '1st' ||
    normalized === '1st term' ||
    normalized === 'first' ||
    normalized === 'first term'
  ) {
    return 'First Term';
  }

  if (
    normalized === '2' ||
    normalized === '2nd' ||
    normalized === '2nd term' ||
    normalized === 'second' ||
    normalized === 'second term'
  ) {
    return 'Second Term';
  }

  if (
    normalized === '3' ||
    normalized === '3rd' ||
    normalized === '3rd term' ||
    normalized === 'third' ||
    normalized === 'third term'
  ) {
    return 'Third Term';
  }

  return term;
};

const getTermNumber = (term?: string | null) => {
  if (!term) return 0;

  const normalized = normalizeTermName(term);

  if (
    normalized.includes('1st') ||
    normalized.includes('first') ||
    normalized === '1'
  ) {
    return 1;
  }

  if (
    normalized.includes('2nd') ||
    normalized.includes('second') ||
    normalized === '2'
  ) {
    return 2;
  }

  if (
    normalized.includes('3rd') ||
    normalized.includes('third') ||
    normalized === '3'
  ) {
    return 3;
  }

  const match = normalized.match(/[123]/);

  return match ? Number(match[0]) : 0;
};

const getInitials = (firstName = '', lastName = '') => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

const isAllowedAcademicSession = (sessionName?: string | null) => {
  if (!sessionName) return false;

  return ALLOWED_SESSIONS.includes(sessionName.trim());
};

const sortSubjects = (a: EnrolledSubject, b: EnrolledSubject) =>
  a.name.localeCompare(b.name);

/* ============================================================
   COMPONENT
============================================================ */

const StudentClasses: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);

  const [academicSessions, setAcademicSessions] = useState<
    AcademicSession[]
  >([]);

  const [terms, setTerms] = useState<Term[]>([]);

  const [subjects, setSubjects] = useState<EnrolledSubject[]>([]);

  const [schemes, setSchemes] = useState<
    Record<string, SchemeOfWork[]>
  >({});

  const [selectedSessionName, setSelectedSessionName] =
    useState(DEFAULT_SESSION);

  const [selectedTermName, setSelectedTermName] =
    useState(DEFAULT_TERM);

  const [expandedSubjects, setExpandedSubjects] = useState<
    Record<string, boolean>
  >({});

  const [loading, setLoading] = useState(true);
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ==========================================================
     LOAD STUDENT / CLASS / SUBJECTS / SESSIONS
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        /* ------------------------------------------------------
           AUTHENTICATED USER
        ------------------------------------------------------ */

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          throw new Error(
            'Your session has expired. Please sign in again.'
          );
        }

        /* ------------------------------------------------------
           STUDENT
        ------------------------------------------------------ */

        const { data: studentData, error: studentError } =
          await supabase
            .from('students')
            .select(
              `
                id,
                user_id,
                first_name,
                last_name,
                middle_name,
                class_id,
                branch_id,
                session_id,
                passport_url
              `
            )
            .eq('user_id', user.id)
            .maybeSingle();

        if (studentError) {
          throw studentError;
        }

        if (!studentData) {
          throw new Error(
            'Student profile could not be found.'
          );
        }

        if (!studentData.class_id) {
          throw new Error(
            'Your class has not been assigned yet.'
          );
        }

        if (!studentData.branch_id) {
          throw new Error(
            'Your school branch has not been assigned yet.'
          );
        }

        if (!mounted) return;

        setStudent(studentData as Student);

        /* ------------------------------------------------------
           CLASS
        ------------------------------------------------------ */

        const { data: classData, error: classError } =
          await supabase
            .from('classes')
            .select(
              `
                id,
                name,
                code,
                level,
                department,
                academic_session,
                status
              `
            )
            .eq('id', studentData.class_id)
            .maybeSingle();

        if (classError) {
          throw classError;
        }

        if (!classData) {
          throw new Error(
            'Your assigned class could not be found.'
          );
        }

        if (!mounted) return;

        setSchoolClass(classData as SchoolClass);

        /* ------------------------------------------------------
           ACADEMIC SESSIONS
           
           IMPORTANT:
           Only 2019/2020 -> 2026/2027 are shown.
           
           We deliberately DO NOT trust is_current because the
           database currently has a stale is_current record.
        ------------------------------------------------------ */

        const {
          data: sessionData,
          error: sessionError,
        } = await supabase
          .from('academic_sessions')
          .select(
            `
              id,
              branch_id,
              session_name,
              term_name,
              term_number,
              start_date,
              end_date,
              is_current
            `
          )
          .eq('branch_id', studentData.branch_id)
          .order('start_date', { ascending: false });

        if (sessionError) {
          throw sessionError;
        }

        const validSessions = (
          (sessionData || []) as AcademicSession[]
        )
          .filter((row) =>
            isAllowedAcademicSession(row.session_name)
          )
          .sort((a, b) => {
            const sessionYearA = Number(
              a.session_name.substring(0, 4)
            );

            const sessionYearB = Number(
              b.session_name.substring(0, 4)
            );

            if (sessionYearA !== sessionYearB) {
              return sessionYearB - sessionYearA;
            }

            return a.term_number - b.term_number;
          });

        if (!mounted) return;

        setAcademicSessions(validSessions);

        /* ------------------------------------------------------
           INITIAL SESSION
           
           Always prefer 2026/2027 if it exists.
           Do NOT use stale is_current.
        ------------------------------------------------------ */

        const defaultSessionRows = validSessions.filter(
          (row) => row.session_name === DEFAULT_SESSION
        );

        if (defaultSessionRows.length > 0) {
          setSelectedSessionName(DEFAULT_SESSION);

          const firstTermRow =
            defaultSessionRows.find(
              (row) => row.term_number === 1
            ) || defaultSessionRows[0];

          setSelectedTermName(
            firstTermRow?.term_name || DEFAULT_TERM
          );
        } else if (validSessions.length > 0) {
          const latestSessionName =
            validSessions[0].session_name;

          const latestRows = validSessions
            .filter(
              (row) =>
                row.session_name === latestSessionName
            )
            .sort(
              (a, b) =>
                a.term_number - b.term_number
            );

          setSelectedSessionName(latestSessionName);
          setSelectedTermName(
            latestRows[0]?.term_name || DEFAULT_TERM
          );
        }

        /* ------------------------------------------------------
           CLASS SUBJECTS
           
           We intentionally do not filter only by status='active'
           at SQL level because NULL statuses should not cause
           valid subjects to disappear.
        ------------------------------------------------------ */

        const {
          data: classSubjectsData,
          error: classSubjectsError,
        } = await supabase
          .from('class_subjects')
          .select(
            `
              id,
              class_id,
              subject_id,
              is_compulsory,
              status
            `
          )
          .eq('class_id', studentData.class_id);

        if (classSubjectsError) {
          throw classSubjectsError;
        }

        const classSubjects = (
          (classSubjectsData || []) as ClassSubject[]
        ).filter(
          (item) =>
            !item.status ||
            item.status.toLowerCase() === 'active'
        );

        const subjectIds = [
          ...new Set(
            classSubjects
              .map((item) => item.subject_id)
              .filter(Boolean)
          ),
        ];

        if (subjectIds.length === 0) {
          if (!mounted) return;

          setSubjects([]);
          return;
        }

        /* ------------------------------------------------------
           SUBJECTS
        ------------------------------------------------------ */

        const {
          data: subjectData,
          error: subjectError,
        } = await supabase
          .from('subjects')
          .select(
            `
              id,
              subject_id,
              name,
              code,
              description
            `
          )
          .in('id', subjectIds);

        if (subjectError) {
          throw subjectError;
        }

        /* ------------------------------------------------------
           TEACHER ASSIGNMENTS
        ------------------------------------------------------ */

        const {
          data: teacherSubjectData,
          error: teacherSubjectError,
        } = await supabase
          .from('teacher_subjects')
          .select(
            `
              id,
              teacher_id,
              subject_id,
              class_id
            `
          )
          .eq('class_id', studentData.class_id)
          .in('subject_id', subjectIds);

        if (teacherSubjectError) {
          throw teacherSubjectError;
        }

        const teacherAssignments =
          (teacherSubjectData || []) as TeacherSubject[];

        const teacherIds = [
          ...new Set(
            teacherAssignments
              .map((item) => item.teacher_id)
              .filter(Boolean)
          ),
        ];

        let teachers: Teacher[] = [];

        if (teacherIds.length > 0) {
          const {
            data: teacherData,
            error: teacherError,
          } = await supabase
            .from('teachers')
            .select(
              `
                id,
                first_name,
                last_name,
                middle_name,
                position,
                department,
                photo_url
              `
            )
            .in('id', teacherIds);

          if (teacherError) {
            throw teacherError;
          }

          teachers =
            (teacherData || []) as Teacher[];
        }

        /* ------------------------------------------------------
           MAP DATA
        ------------------------------------------------------ */

        const teacherMap = new Map(
          teachers.map((teacher) => [
            teacher.id,
            teacher,
          ])
        );

        const subjectMap = new Map(
          ((subjectData || []) as Subject[]).map(
            (subject) => [subject.id, subject]
          )
        );

        const finalSubjects: EnrolledSubject[] =
          classSubjects
            .map((classSubject) => {
              const subject = subjectMap.get(
                classSubject.subject_id
              );

              if (!subject) return null;

              const assignment =
                teacherAssignments.find(
                  (item) =>
                    item.subject_id ===
                      classSubject.subject_id &&
                    item.class_id ===
                      studentData.class_id
                ) ||
                teacherAssignments.find(
                  (item) =>
                    item.subject_id ===
                    classSubject.subject_id
                );

              const teacher = assignment
                ? teacherMap.get(
                    assignment.teacher_id
                  )
                : undefined;

              return {
                id: classSubject.id,
                subjectId: subject.id,
                name: subject.name,
                code: subject.code,
                description: subject.description,
                teacher: teacher
                  ? [
                      teacher.first_name,
                      teacher.middle_name,
                      teacher.last_name,
                    ]
                      .filter(Boolean)
                      .join(' ')
                  : null,
                teacherId: teacher?.id || null,
                teacherPhoto:
                  teacher?.photo_url || null,
                position:
                  teacher?.position || null,
                department:
                  teacher?.department || null,
                compulsory:
                  Boolean(classSubject.is_compulsory),
              };
            })
            .filter(Boolean) as EnrolledSubject[];

        finalSubjects.sort(sortSubjects);

        if (!mounted) return;

        setSubjects(finalSubjects);
      } catch (err: any) {
        console.error(
          'Student classes loading error:',
          err
        );

        if (!mounted) return;

        setError(
          err?.message ||
            'Unable to load your classes and academic information.'
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     SESSION OPTIONS
     
     ONLY 2019/2020 -> 2026/2027
  ========================================================== */

  const sessionOptions = useMemo(() => {
    return ALLOWED_SESSIONS.filter((sessionName) =>
      academicSessions.some(
        (row) => row.session_name === sessionName
      )
    ).sort((a, b) => {
      const yearA = Number(a.substring(0, 4));
      const yearB = Number(b.substring(0, 4));

      return yearB - yearA;
    });
  }, [academicSessions]);

  /* ==========================================================
     SELECTED ACADEMIC SESSION ROWS
  ========================================================== */

  const selectedAcademicRows = useMemo(() => {
    return academicSessions
      .filter(
        (row) =>
          row.session_name === selectedSessionName
      )
      .sort(
        (a, b) =>
          a.term_number - b.term_number
      );
  }, [
    academicSessions,
    selectedSessionName,
  ]);

  /* ==========================================================
     MAKE SURE SELECTED TERM EXISTS
  ========================================================== */

  useEffect(() => {
    if (!selectedSessionName) return;

    if (selectedAcademicRows.length === 0) {
      return;
    }

    const selectedExists =
      selectedAcademicRows.some(
        (row) =>
          normalizeTermName(row.term_name) ===
          normalizeTermName(selectedTermName)
      );

    if (!selectedExists) {
      const firstTerm =
        selectedAcademicRows.find(
          (row) => row.term_number === 1
        ) || selectedAcademicRows[0];

      setSelectedTermName(
        firstTerm.term_name
      );
    }
  }, [
    selectedSessionName,
    selectedTermName,
    selectedAcademicRows,
  ]);

  /* ==========================================================
     SELECTED ACADEMIC PERIOD
  ========================================================== */

  const selectedAcademicPeriod = useMemo(() => {
    return selectedAcademicRows.find(
      (row) =>
        normalizeTermName(row.term_name) ===
        normalizeTermName(selectedTermName)
    );
  }, [
    selectedAcademicRows,
    selectedTermName,
  ]);

  /* ==========================================================
     LOAD EXACT TERM + SCHEME
     
     CRITICAL FLOW:
     
     academic_sessions
            ↓
     session_name + term_name
            ↓
     terms
            ↓
     terms.id
            ↓
     scheme_of_work.term_id
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const loadTermAndSchemes = async () => {
      if (
        !student ||
        !schoolClass ||
        !selectedSessionName ||
        !selectedTermName
      ) {
        return;
      }

      try {
        setLoadingSchemes(true);
        setSchemes({});
        setTerms([]);

        /* ------------------------------------------------------
           CONVERT ACADEMIC TERM TO DB TERM
           
           First Term -> 1st Term
           Second Term -> 2nd Term
           Third Term -> 3rd Term
        ------------------------------------------------------ */

        const databaseTermName =
          academicTermToDatabaseTerm(
            selectedTermName
          );

        if (!databaseTermName) {
          throw new Error(
            'Unable to determine the selected academic term.'
          );
        }

        /* ------------------------------------------------------
           FIND EXACT TERM
           
           We match:
           
           branch_id
           session
           term
        ------------------------------------------------------ */

        const {
          data: termData,
          error: termError,
        } = await supabase
          .from('terms')
          .select(
            `
              id,
              branch_id,
              session,
              term,
              start_date,
              end_date,
              is_active,
              is_closed
            `
          )
          .eq('branch_id', student.branch_id)
          .eq(
            'session',
            selectedSessionName
          )
          .eq(
            'term',
            databaseTermName
          );

        if (termError) {
          throw termError;
        }

        const matchingTerms =
          (termData || []) as Term[];

        if (!mounted) return;

        setTerms(matchingTerms);

        const selectedTerm =
          matchingTerms[0];

        if (!selectedTerm) {
          console.warn(
            'No matching terms record found:',
            {
              branchId: student.branch_id,
              session: selectedSessionName,
              academicTerm: selectedTermName,
              databaseTerm: databaseTermName,
            }
          );

          setSchemes({});
          return;
        }

        /* ------------------------------------------------------
           LOAD SCHEME
           
           IMPORTANT:
           
           We use:
           
           term_id = selectedTerm.id
           
           NOT:
           
           academic_sessions.id
        ------------------------------------------------------ */

        const {
          data: schemeData,
          error: schemeError,
        } = await supabase
          .from('scheme_of_work')
          .select(
            `
              id,
              branch_id,
              class_id,
              subject_id,
              term_id,
              week_number,
              topic,
              sub_topic,
              objectives,
              activities,
              resources,
              assessment,
              duration,
              teacher_notes,
              status
            `
          )
          .eq(
            'class_id',
            schoolClass.id
          )
          .eq(
            'term_id',
            selectedTerm.id
          )
          .order(
            'week_number',
            {
              ascending: true,
            }
          );

        if (schemeError) {
          throw schemeError;
        }

        /* ------------------------------------------------------
           IMPORTANT:
           
           Do NOT use:
           
           .neq('status', 'archived')
           
           because NULL status rows would be excluded.
           
           Instead filter archived rows here.
        ------------------------------------------------------ */

        const schemeRows = (
          (schemeData || []) as SchemeOfWork[]
        ).filter(
          (row) =>
            !row.status ||
            row.status.toLowerCase() !==
              'archived'
        );

        /* ------------------------------------------------------
           GROUP BY SUBJECT
        ------------------------------------------------------ */

        const grouped: Record<
          string,
          SchemeOfWork[]
        > = {};

        schemeRows.forEach((item) => {
          if (!grouped[item.subject_id]) {
            grouped[item.subject_id] = [];
          }

          grouped[item.subject_id].push(
            item
          );
        });

        /* ------------------------------------------------------
           SORT EACH SUBJECT'S SCHEME BY WEEK
        ------------------------------------------------------ */

        Object.values(grouped).forEach(
          (rows) => {
            rows.sort(
              (a, b) =>
                a.week_number -
                b.week_number
            );
          }
        );

        if (!mounted) return;

        setSchemes(grouped);

        /* ------------------------------------------------------
           AUTOMATICALLY OPEN SUBJECTS WITH SCHEMES
        ------------------------------------------------------ */

        const initialExpanded: Record<
          string,
          boolean
        > = {};

        subjects.forEach((subject) => {
          const subjectScheme =
            grouped[subject.subjectId] || [];

          if (subjectScheme.length > 0) {
            initialExpanded[
              subject.subjectId
            ] = true;
          }
        });

        setExpandedSubjects(
          initialExpanded
        );

        console.log(
          'Student scheme loaded successfully:',
          {
            session: selectedSessionName,
            academicTerm: selectedTermName,
            databaseTerm: databaseTermName,
            termId: selectedTerm.id,
            classId: schoolClass.id,
            schemeRows: schemeRows.length,
          }
        );
      } catch (err) {
        console.error(
          'Scheme loading error:',
          err
        );

        if (!mounted) return;

        setSchemes({});
      } finally {
        if (mounted) {
          setLoadingSchemes(false);
        }
      }
    };

    loadTermAndSchemes();

    return () => {
      mounted = false;
    };
  }, [
    student,
    schoolClass,
    selectedSessionName,
    selectedTermName,
  ]);

  /* ==========================================================
     SELECTED TERM
  ========================================================== */

  const selectedTerm = useMemo(() => {
    const databaseTermName =
      academicTermToDatabaseTerm(
        selectedTermName
      );

    return terms.find(
      (term) =>
        normalizeTermName(term.term) ===
        normalizeTermName(
          databaseTermName
        )
    );
  }, [
    terms,
    selectedTermName,
  ]);

  /* ==========================================================
     TOTAL SCHEME ENTRIES
     
     Only selected/enrolled subjects count.
  ========================================================== */

  const totalSchemeEntries = useMemo(() => {
    return subjects.reduce(
      (total, subject) => {
        return (
          total +
          (schemes[
            subject.subjectId
          ]?.length || 0)
        );
      },
      0
    );
  }, [subjects, schemes]);

  /* ==========================================================
     SUBJECTS WITH SCHEMES
  ========================================================== */

  const subjectsWithSchemes = useMemo(() => {
    return subjects.filter(
      (subject) =>
        (
          schemes[
            subject.subjectId
          ] || []
        ).length > 0
    ).length;
  }, [subjects, schemes]);

  /* ==========================================================
     COVERAGE
  ========================================================== */

  const coverage = useMemo(() => {
    if (subjects.length === 0) {
      return 0;
    }

    return Math.round(
      (subjectsWithSchemes /
        subjects.length) *
        100
    );
  }, [
    subjects,
    subjectsWithSchemes,
  ]);

  /* ==========================================================
     TERM NUMBER
  ========================================================== */

  const currentTermNumber =
    selectedAcademicPeriod?.term_number ||
    getTermNumber(selectedTermName);

  /* ==========================================================
     TEACHER COUNT
  ========================================================== */

  const teacherCount = useMemo(() => {
    return new Set(
      subjects
        .map(
          (subject) =>
            subject.teacherId
        )
        .filter(Boolean)
    ).size;
  }, [subjects]);

  /* ==========================================================
     TOGGLE SUBJECT
  ========================================================== */

  const toggleSubject = (
    subjectId: string
  ) => {
    setExpandedSubjects(
      (current) => ({
        ...current,
        [subjectId]:
          !current[subjectId],
      })
    );
  };

  /* ==========================================================
     SESSION CHANGE
  ========================================================== */

  const handleSessionChange = (
    newSession: string
  ) => {
    setSelectedSessionName(
      newSession
    );

    const sessionRows =
      academicSessions
        .filter(
          (row) =>
            row.session_name ===
            newSession
        )
        .sort(
          (a, b) =>
            a.term_number -
            b.term_number
        );

    const firstTerm =
      sessionRows.find(
        (row) =>
          row.term_number === 1
      ) || sessionRows[0];

    setSelectedTermName(
      firstTerm?.term_name ||
        DEFAULT_TERM
    );
  };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-slate-50 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-slate-700" />
          </div>

          <h2 className="text-sm font-semibold text-slate-900">
            Loading your classes
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Preparing your academic workspace...
          </p>
        </div>
      </div>
    );
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (error) {
    return (
      <div className="min-h-[70vh] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-slate-900">
            Unable to load your classes
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="mt-6 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const studentName = student
    ? [
        student.first_name,
        student.middle_name,
        student.last_name,
      ]
        .filter(Boolean)
        .join(' ')
    : 'Student';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">

        {/* ====================================================
            MAIN LAYOUT
            No large header.
        ===================================================== */}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">

          {/* ==================================================
              LEFT CONTENT
          ================================================== */}

          <main className="min-w-0 space-y-5">

            {/* CLASS INFORMATION */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <div className="flex items-center gap-2">

                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                        <GraduationCap className="h-4 w-4 text-slate-700" />
                      </span>

                      <h1 className="text-lg font-semibold text-slate-900">
                        {schoolClass?.name ||
                          'My Class'}
                      </h1>

                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {studentName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">

                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {schoolClass?.code ||
                        '—'}
                    </span>

                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                      {schoolClass?.level ||
                        '—'}
                    </span>

                  </div>

                </div>

              </div>

              <div className="grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">

                <div className="px-5 py-4">
                  <p className="text-xs text-slate-400">
                    Subjects
                  </p>

                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {subjects.length}
                  </p>
                </div>

                <div className="px-5 py-4">
                  <p className="text-xs text-slate-400">
                    Compulsory
                  </p>

                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {
                      subjects.filter(
                        (subject) =>
                          subject.compulsory
                      ).length
                    }
                  </p>
                </div>

                <div className="px-5 py-4">
                  <p className="text-xs text-slate-400">
                    Weekly plans
                  </p>

                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {totalSchemeEntries}
                  </p>
                </div>

                <div className="px-5 py-4">
                  <p className="text-xs text-slate-400">
                    Coverage
                  </p>

                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {coverage}%
                  </p>
                </div>

              </div>
            </section>

            {/* ==================================================
                SUBJECTS
            ================================================== */}

            <section>

              <div className="mb-3 flex items-center justify-between">

                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    My Subjects
                  </h2>

                  <p className="mt-0.5 text-sm text-slate-500">
                    {getTermLabel(
                      selectedTermName
                    )}{' '}
                    learning plans
                  </p>
                </div>

                <span className="text-xs font-medium text-slate-400">
                  {subjects.length}{' '}
                  subjects
                </span>

              </div>

              {subjects.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

                  <BookOpen className="mx-auto h-8 w-8 text-slate-300" />

                  <h3 className="mt-3 text-sm font-semibold text-slate-900">
                    No subjects assigned
                  </h3>

                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                    Your school has not
                    assigned subjects to
                    this class yet.
                  </p>

                </div>
              ) : (
                <div className="space-y-3">

                  {subjects.map(
                    (
                      subject,
                      index
                    ) => {
                      const subjectSchemes =
                        schemes[
                          subject.subjectId
                        ] || [];

                      const isExpanded =
                        expandedSubjects[
                          subject.subjectId
                        ] ?? false;

                      return (
                        <article
                          key={
                            subject.id
                          }
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >

                          {/* SUBJECT HEADER */}

                          <button
                            type="button"
                            onClick={() =>
                              toggleSubject(
                                subject.subjectId
                              )
                            }
                            className="w-full text-left"
                          >

                            <div className="px-5 py-5 sm:px-6">

                              <div className="flex items-start gap-4">

                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-700">
                                  {String(
                                    index +
                                      1
                                  ).padStart(
                                    2,
                                    '0'
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">

                                  <div className="flex flex-wrap items-center gap-2">

                                    <h3 className="text-base font-semibold text-slate-900">
                                      {
                                        subject.name
                                      }
                                    </h3>

                                    {subject.compulsory && (
                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                        Compulsory
                                      </span>
                                    )}

                                  </div>

                                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">

                                    <span>
                                      {
                                        subject.code
                                      }
                                    </span>

                                    <span className="flex items-center gap-1">
                                      <BookOpen className="h-3.5 w-3.5" />

                                      {
                                        subjectSchemes.length
                                      }{' '}
                                      {subjectSchemes.length ===
                                      1
                                        ? 'week'
                                        : 'weeks'}
                                    </span>

                                  </div>

                                </div>

                                <div className="shrink-0">
                                  {isExpanded ? (
                                    <ChevronUp className="h-5 w-5 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5 text-slate-400" />
                                  )}
                                </div>

                              </div>

                              {/* TEACHER */}

                              <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">

                                <div className="flex min-w-0 items-center gap-3">

                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">

                                    {subject.teacherPhoto ? (
                                      <img
                                        src={
                                          subject.teacherPhoto
                                        }
                                        alt={
                                          subject.teacher ||
                                          'Teacher'
                                        }
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <User className="h-4 w-4 text-slate-400" />
                                    )}

                                  </div>

                                  <div className="min-w-0">

                                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                      Subject Teacher
                                    </p>

                                    <p className="truncate text-sm font-medium text-slate-700">
                                      {subject.teacher ||
                                        'Teacher not assigned'}
                                    </p>

                                  </div>

                                </div>

                                <span
                                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                                    subjectSchemes.length >
                                    0
                                      ? 'border border-slate-200 bg-white text-slate-600'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  {subjectSchemes.length >
                                  0
                                    ? 'Plan available'
                                    : 'No plan'}
                                </span>

                              </div>

                            </div>

                          </button>

                          {/* ==================================================
                              SCHEME OF WORK
                          ================================================== */}

                          {isExpanded && (
                            <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-5 sm:px-6">

                              <div className="mb-4 flex items-center justify-between">

                                <div>
                                  <h4 className="text-sm font-semibold text-slate-900">
                                    Scheme of Work
                                  </h4>

                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {
                                      selectedSessionName
                                    }{' '}
                                    •{' '}
                                    {getTermLabel(
                                      selectedTermName
                                    )}
                                  </p>
                                </div>

                                {subjectSchemes.length >
                                  0 && (
                                  <span className="text-xs text-slate-400">
                                    {
                                      subjectSchemes.length
                                    }{' '}
                                    weekly entries
                                  </span>
                                )}

                              </div>

                              {loadingSchemes ? (
                                <div className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center">

                                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-500" />

                                  <p className="mt-2 text-xs text-slate-500">
                                    Loading scheme
                                    of work...
                                  </p>

                                </div>
                              ) : subjectSchemes.length ===
                                0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center">

                                  <XCircle className="mx-auto h-5 w-5 text-slate-300" />

                                  <p className="mt-2 text-sm font-medium text-slate-600">
                                    No scheme of
                                    work available
                                  </p>

                                  <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                                    There is no
                                    scheme for
                                    this subject
                                    in{' '}
                                    {
                                      selectedSessionName
                                    }{' '}
                                    —{' '}
                                    {getTermLabel(
                                      selectedTermName
                                    )}
                                    .
                                  </p>

                                </div>
                              ) : (
                                <div className="space-y-3">

                                  {subjectSchemes.map(
                                    (
                                      scheme
                                    ) => (
                                      <div
                                        key={
                                          scheme.id
                                        }
                                        className="rounded-xl border border-slate-200 bg-white p-4"
                                      >

                                        <div className="flex gap-4">

                                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
                                            W
                                            {
                                              scheme.week_number
                                            }
                                          </div>

                                          <div className="min-w-0 flex-1">

                                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">

                                              <div>
                                                <h5 className="text-sm font-semibold text-slate-900">
                                                  {
                                                    scheme.topic
                                                  }
                                                </h5>

                                                {scheme.sub_topic && (
                                                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                                                    {
                                                      scheme.sub_topic
                                                    }
                                                  </p>
                                                )}
                                              </div>

                                              {scheme.duration && (
                                                <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                                                  <Clock3 className="h-3.5 w-3.5" />
                                                  {
                                                    scheme.duration
                                                  }
                                                </span>
                                              )}

                                            </div>

                                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">

                                              {scheme.objectives && (
                                                <div>
                                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                                    Objectives
                                                  </p>

                                                  <p className="mt-1 text-xs leading-5 text-slate-600">
                                                    {
                                                      scheme.objectives
                                                    }
                                                  </p>
                                                </div>
                                              )}

                                              {scheme.activities && (
                                                <div>
                                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                                    Activities
                                                  </p>

                                                  <p className="mt-1 text-xs leading-5 text-slate-600">
                                                    {
                                                      scheme.activities
                                                    }
                                                  </p>
                                                </div>
                                              )}

                                              {scheme.resources && (
                                                <div>
                                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                                    Resources
                                                  </p>

                                                  <p className="mt-1 text-xs leading-5 text-slate-600">
                                                    {
                                                      scheme.resources
                                                    }
                                                  </p>
                                                </div>
                                              )}

                                              {scheme.assessment && (
                                                <div>
                                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                                    Assessment
                                                  </p>

                                                  <p className="mt-1 text-xs leading-5 text-slate-600">
                                                    {
                                                      scheme.assessment
                                                    }
                                                  </p>
                                                </div>
                                              )}

                                            </div>

                                            {scheme.teacher_notes && (
                                              <div className="mt-4 border-t border-slate-100 pt-3">

                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                                  Teacher
                                                  Notes
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                  {
                                                    scheme.teacher_notes
                                                  }
                                                </p>

                                              </div>
                                            )}

                                          </div>

                                        </div>

                                      </div>
                                    )
                                  )}

                                </div>
                              )}

                            </div>
                          )}

                        </article>
                      );
                    }
                  )}

                </div>
              )}

            </section>
          </main>

          {/* ==================================================
              RIGHT SIDEBAR
          ================================================== */}

          <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">

            {/* ==================================================
                ACADEMIC PERIOD
            ================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-4">

                <div className="flex items-center gap-2">

                  <CalendarDays className="h-4 w-4 text-slate-600" />

                  <h2 className="text-sm font-semibold text-slate-900">
                    Academic Period
                  </h2>

                </div>

                <p className="mt-1 text-xs text-slate-400">
                  Select the session and term.
                </p>

              </div>

              <div className="space-y-4 p-5">

                {/* SESSION */}

                <div>

                  <label
                    htmlFor="academic-session"
                    className="mb-1.5 block text-xs font-medium text-slate-500"
                  >
                    Academic Session
                  </label>

                  <div className="relative">

                    <select
                      id="academic-session"
                      value={
                        selectedSessionName
                      }
                      onChange={(event) =>
                        handleSessionChange(
                          event.target
                            .value
                        )
                      }
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >
                      {sessionOptions.map(
                        (
                          session
                        ) => (
                          <option
                            key={
                              session
                            }
                            value={
                              session
                            }
                          >
                            {session}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  </div>

                </div>

                {/* TERM */}

                <div>

                  <label
                    htmlFor="academic-term"
                    className="mb-1.5 block text-xs font-medium text-slate-500"
                  >
                    Term
                  </label>

                  <div className="relative">

                    <select
                      id="academic-term"
                      value={
                        selectedTermName
                      }
                      onChange={(event) =>
                        setSelectedTermName(
                          event.target
                            .value
                        )
                      }
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >
                      {selectedAcademicRows.map(
                        (row) => (
                          <option
                            key={row.id}
                            value={
                              row.term_name
                            }
                          >
                            {getTermLabel(
                              row.term_name
                            )}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  </div>

                </div>

              </div>
            </section>

            {/* ==================================================
                SELECTED PERIOD
            ================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="p-5">

                <div className="flex items-start justify-between gap-3">

                  <div>

                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Current selection
                    </p>

                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedSessionName ||
                        'No session'}
                    </h3>

                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {getTermLabel(
                        selectedTermName
                      )}
                    </p>

                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                    <CalendarDays className="h-4 w-4 text-slate-600" />
                  </div>

                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">

                  <div className="flex items-start gap-3">

                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                    <div>

                      <p className="text-xs font-medium text-slate-500">
                        Academic dates
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {formatDate(
                          selectedAcademicPeriod?.start_date ||
                            selectedTerm?.start_date
                        )}
                      </p>

                      <p className="text-xs text-slate-400">
                        to
                      </p>

                      <p className="text-sm text-slate-700">
                        {formatDate(
                          selectedAcademicPeriod?.end_date ||
                            selectedTerm?.end_date
                        )}
                      </p>

                    </div>

                  </div>

                </div>

                {selectedTerm?.is_closed && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">

                    <XCircle className="h-4 w-4" />

                    This term has been closed.

                  </div>
                )}

                {!selectedTerm &&
                  !loadingSchemes &&
                  selectedSessionName &&
                  selectedTermName && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">

                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                      <span>
                        No term record was
                        found for this
                        academic period.
                      </span>

                    </div>
                  )}

              </div>
            </section>

            {/* ==================================================
                COVERAGE
            ================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="p-5">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs font-medium text-slate-400">
                      Scheme coverage
                    </p>

                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {coverage}%
                    </p>

                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">

                    {coverage ===
                    100 ? (
                      <CheckCircle2 className="h-5 w-5 text-slate-700" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-slate-600" />
                    )}

                  </div>

                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className="h-full rounded-full bg-slate-700 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        coverage,
                        100
                      )}%`,
                    }}
                  />

                </div>

                <p className="mt-3 text-xs leading-5 text-slate-400">
                  {subjectsWithSchemes}{' '}
                  of {subjects.length}{' '}
                  subjects have published
                  weekly plans for this
                  academic period.
                </p>

              </div>
            </section>

            {/* ==================================================
                CLASS SUMMARY
            ================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="p-5">

                <div className="flex items-center gap-2">

                  <Users className="h-4 w-4 text-slate-600" />

                  <h2 className="text-sm font-semibold text-slate-900">
                    Class Summary
                  </h2>

                </div>

                <div className="mt-4 space-y-3">

                  <div className="flex items-center justify-between">

                    <span className="text-xs text-slate-400">
                      Class
                    </span>

                    <span className="text-sm font-medium text-slate-700">
                      {schoolClass?.name ||
                        '—'}
                    </span>

                  </div>

                  <div className="flex items-center justify-between">

                    <span className="text-xs text-slate-400">
                      Class code
                    </span>

                    <span className="text-sm font-medium text-slate-700">
                      {schoolClass?.code ||
                        '—'}
                    </span>

                  </div>

                  <div className="flex items-center justify-between">

                    <span className="text-xs text-slate-400">
                      Term
                    </span>

                    <span className="text-sm font-medium text-slate-700">
                      {currentTermNumber
                        ? `Term ${currentTermNumber}`
                        : getTermLabel(
                            selectedTermName
                          )}
                    </span>

                  </div>

                  <div className="flex items-center justify-between">

                    <span className="text-xs text-slate-400">
                      Teachers assigned
                    </span>

                    <span className="text-sm font-medium text-slate-700">
                      {teacherCount}
                    </span>

                  </div>

                </div>

              </div>
            </section>

          </aside>
        </div>
      </div>
    </div>
  );
};

export default StudentClasses;