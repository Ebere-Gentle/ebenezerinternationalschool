import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Loader2,
  Printer,
  RefreshCw,
} from 'lucide-react';

import toast from 'react-hot-toast';

import {
  useLocation,
  useSearchParams,
} from 'react-router-dom';

import { supabase } from '../../../config/supabase/client';
import schoolLogo from '../../../assets/school-logo.png';
import OfficialResultSheet from '../../../components/results/shared/OfficialResultSheet';
import { resolveAssessmentGroup } from '../../../utils/results/assessmentGroups';

type Session = {
  id: string;
  session_name: string;
  term_name: string | null;
  is_current: boolean;
};

type Term = {
  id: string;
  session: string;
  term: string;
  is_active: boolean;
  is_closed: boolean;
};

type ClassRow = {
  id: string;
  name: string;
  level: string | null;
  department: string | null;
  branch_id: string;
};

type Student = {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  admission_number: string | null;
  gender: string | null;
  date_of_birth: string | null;
  passport_url: string | null;
  class_id: string;
  branch_id: string;
};

type Row = {
  subjectId: string;
  subject: string;

  test1: number | null;
  test2: number | null;
  ca: number | null;
  exam: number | null;

  total: number;
  percentage: number;

  grade: string;
  remark: string;

  position: number | null;

  term1Percentage?: number | null;
  term2Percentage?: number | null;
  term3Percentage?: number | null;
  cumulativePercentage?: number | null;
};

type AutosaveStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error';

const PSYCH = [
  'Handwriting',
  'Drawing / Creativity',
  'Sports',
  'Practical Skills',
  'Manual Dexterity',
  'Music / Performance',
  'Artistic Expression',
  'Coordination',
  'Use of Tools',
  'Neatness of Work',
  'Fine Motor Control',
  'Gross Motor Control',
];

const AFFECTIVE = [
  'Punctuality',
  'Regularity',
  'Neatness',
  'Courtesy',
  'Cooperation',
  'Responsibility',
  'Self-Control',
  'Respect for Authority',
  'Attitude to Learning',
  'Leadership',
  'Honesty',
  'Confidence',
];

const grade = (percentage: number) => {
  if (percentage >= 75) return 'A';
  if (percentage >= 65) return 'B';
  if (percentage >= 55) return 'C';
  if (percentage >= 45) return 'D';
  if (percentage >= 40) return 'E';
  return 'F';
};

const remark = (percentage: number) => {
  if (percentage >= 75) return 'Excellent';
  if (percentage >= 65) return 'Very Good';
  if (percentage >= 55) return 'Good';
  if (percentage >= 45) return 'Fair';
  if (percentage >= 40) return 'Pass';
  return 'Needs Improvement';
};

const ordinal = (
  value: number | null | undefined,
) => {
  if (
    value == null ||
    !Number.isFinite(Number(value)) ||
    Number(value) <= 0
  ) {
    return '—';
  }

  const n = Math.floor(Number(value));
  const mod100 = n % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${n}th`;
  }

  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
};

const norm = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase();

const emptyRatings = (
  items: string[],
): Record<string, string> =>
  Object.fromEntries(
    items.map((item) => [item, '']),
  );

const studentFullName = (
  student: Student | null,
) =>
  [
    student?.first_name,
    student?.middle_name,
    student?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

type RouteState = {
  sessionId?: string;
  termId?: string;
  classId?: string;
  studentId?: string;
};

export default function AdminResultReportsheet() {
  const location = useLocation();

  const [searchParams] =
    useSearchParams();

  /*
   * =========================================================
   * ROUTE SELECTION
   * =========================================================
   */

  const routeState =
    (location.state || {}) as RouteState;

  const routeSessionId =
    searchParams.get('sessionId') ||
    routeState.sessionId ||
    '';

  const routeTermId =
    searchParams.get('termId') ||
    routeState.termId ||
    '';

  const routeClassId =
    searchParams.get('classId') ||
    routeState.classId ||
    '';

  const routeStudentId =
    searchParams.get('studentId') ||
    routeState.studentId ||
    '';

  const openedFromStudent =
    Boolean(routeStudentId);

  /*
   * =========================================================
   * CONTEXT
   * =========================================================
   */

  const [
    sessions,
    setSessions,
  ] = useState<Session[]>([]);

  const [
    terms,
    setTerms,
  ] = useState<Term[]>([]);

  const [
    classes,
    setClasses,
  ] = useState<ClassRow[]>([]);

  const [
    students,
    setStudents,
  ] = useState<Student[]>([]);

  const [
    sessionId,
    setSessionId,
  ] = useState('');

  const [
    termId,
    setTermId,
  ] = useState('');

  const [
    classId,
    setClassId,
  ] = useState('');

  const [
    studentId,
    setStudentId,
  ] = useState('');

  const session =
    sessions.find(
      (item) => item.id === sessionId,
    ) || null;

  const term =
    terms.find(
      (item) => item.id === termId,
    ) || null;

  const selectedClass =
    classes.find(
      (item) => item.id === classId,
    ) || null;

  /*
   * =========================================================
   * REPORT STATE
   * =========================================================
   */

  const [
    student,
    setStudent,
  ] = useState<Student | null>(null);

  const [
    school,
    setSchool,
  ] = useState<any>({
    school_name:
      'Ebenezer International School',
    branch_name: '—',
  });

  const [
    rows,
    setRows,
  ] = useState<Row[]>([]);

  const [
    position,
    setPosition,
  ] = useState<number | null>(null);

  const [
    classSize,
    setClassSize,
  ] = useState(0);

  const [
    average,
    setAverage,
  ] = useState(0);

  const [
    overallGrade,
    setOverallGrade,
  ] = useState('F');

  const [
    overallRemark,
    setOverallRemark,
  ] = useState(
    'Needs Improvement',
  );

  const [
    max,
    setMax,
  ] = useState({
    test1: 0,
    test2: 0,
    ca: 20,
    exam: 0,
    total: 0,
  });

  const [
    attendance,
    setAttendance,
  ] = useState<any>({});

  const [
    psychomotor,
    setPsychomotor,
  ] = useState<
    Record<string, string>
  >({});

  const [
    affective,
    setAffective,
  ] = useState<
    Record<string, string>
  >({});

  const [
    teacherComment,
    setTeacherComment,
  ] = useState('');

  const [
    principalComment,
    setPrincipalComment,
  ] = useState('');

  const [
    directorComment,
    setDirectorComment,
  ] = useState('');

  const [
    nextTermBegins,
    setNextTermBegins,
  ] = useState<string | null>(
    null,
  );

  const [
    feeStatus,
    setFeeStatus,
  ] = useState<any>({
    status: 'NO FEE DATA',
    due: 0,
    paid: 0,
    balance: 0,
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    working,
    setWorking,
  ] = useState(false);

  /*
   * =========================================================
   * AUTOSAVE STATE
   * =========================================================
   */

  const [
    autosaveStatus,
    setAutosaveStatus,
  ] =
    useState<AutosaveStatus>(
      'idle',
    );

  const [
    lastSavedAt,
    setLastSavedAt,
  ] = useState<Date | null>(
    null,
  );

  const ratingsHydratedRef =
    useRef(false);

  const saveInProgressRef =
    useRef(false);

  const pendingAutosaveRef =
    useRef(false);

  const autosaveTimerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const latestPsychomotorRef =
    useRef<Record<string, string>>(
      {},
    );

  const latestAffectiveRef =
    useRef<Record<string, string>>(
      {},
    );

  const latestTeacherCommentRef =
    useRef('');

  const latestPrincipalCommentRef =
    useRef('');

  const latestDirectorCommentRef =
    useRef('');

  const latestAttendanceRef =
    useRef<any>({});

  const latestRowsRef =
    useRef<Row[]>([]);

  const latestAverageRef =
    useRef(0);

  const latestGradeRef =
    useRef('F');

  const latestRemarkRef =
    useRef('Needs Improvement');

  const latestPositionRef =
    useRef<number | null>(null);

  const latestNextTermBeginsRef =
    useRef<string | null>(null);

  const latestMaxRef =
    useRef(max);

  /*
   * =========================================================
   * KEEP REFS SYNCHRONIZED
   * =========================================================
   */

  useEffect(() => {
    latestPsychomotorRef.current =
      psychomotor;
  }, [psychomotor]);

  useEffect(() => {
    latestAffectiveRef.current =
      affective;
  }, [affective]);

  useEffect(() => {
    latestTeacherCommentRef.current =
      teacherComment;
  }, [teacherComment]);

  useEffect(() => {
    latestPrincipalCommentRef.current =
      principalComment;
  }, [principalComment]);

  useEffect(() => {
    latestDirectorCommentRef.current =
      directorComment;
  }, [directorComment]);

  useEffect(() => {
    latestAttendanceRef.current =
      attendance;
  }, [attendance]);

  useEffect(() => {
    latestRowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    latestAverageRef.current =
      average;
  }, [average]);

  useEffect(() => {
    latestGradeRef.current =
      overallGrade;
  }, [overallGrade]);

  useEffect(() => {
    latestRemarkRef.current =
      overallRemark;
  }, [overallRemark]);

  useEffect(() => {
    latestPositionRef.current =
      position;
  }, [position]);

  useEffect(() => {
    latestNextTermBeginsRef.current =
      nextTermBegins;
  }, [nextTermBegins]);

  useEffect(() => {
    latestMaxRef.current = max;
  }, [max]);

  /*
   * =========================================================
   * LOAD INITIAL CONTEXT
   * =========================================================
   */

  const loadContext =
    useCallback(async () => {
      setLoading(true);

      try {
        const [
          {
            data: sessionRows,
            error: sessionError,
          },
          {
            data: classRows,
            error: classError,
          },
        ] =
          await Promise.all([
            supabase
              .from(
                'academic_sessions',
              )
              .select(
                'id,session_name,term_name,is_current',
              )
              .order(
                'start_date',
                {
                  ascending: false,
                },
              ),

            supabase
              .from('classes')
              .select(
                'id,name,level,department,branch_id',
              )
              .eq(
                'status',
                'active',
              )
              .order('name'),
          ]);

        if (sessionError) {
          throw sessionError;
        }

        if (classError) {
          throw classError;
        }

        const sessionList =
          (sessionRows ||
            []) as Session[];

        const classList =
          (classRows ||
            []) as ClassRow[];

        setSessions(sessionList);
        setClasses(classList);

        const selectedSession =
          routeSessionId
            ? sessionList.find(
                (item) =>
                  item.id ===
                  routeSessionId,
              )
            : null;

        const currentSession =
          selectedSession ||
          sessionList.find(
            (item) =>
              item.is_current,
          ) ||
          sessionList[0];

        if (currentSession) {
          setSessionId(
            currentSession.id,
          );
        }
      } catch (error: any) {
        console.error(
          'REPORT CONTEXT ERROR:',
          error,
        );

        toast.error(
          error?.message ||
            'Unable to load report context.',
        );
      } finally {
        setLoading(false);
      }
    }, [routeSessionId]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  /*
   * =========================================================
   * LOAD TERMS
   * =========================================================
   */

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    const loadTerms =
      async () => {
        const {
          data,
          error,
        } = await supabase
          .from('terms')
          .select(
            'id,session,term,is_active,is_closed',
          )
          .eq(
            'session',
            session.session_name,
          )
          .order(
            'start_date',
            {
              ascending: false,
            },
          );

        if (cancelled) {
          return;
        }

        if (error) {
          toast.error(
            error.message,
          );
          return;
        }

        const termRows =
          (data || []) as Term[];

        setTerms(termRows);

        const routeTerm =
          routeTermId
            ? termRows.find(
                (item) =>
                  item.id ===
                  routeTermId,
              )
            : null;

        const defaultTerm =
          routeTerm ||
          termRows.find(
            (item) =>
              item.is_active &&
              norm(item.term) ===
                norm(
                  session.term_name ||
                    '',
                ),
          ) ||
          termRows.find(
            (item) =>
              item.is_active,
          ) ||
          termRows[0];

        setTermId(
          defaultTerm?.id || '',
        );
      };

    void loadTerms();

    return () => {
      cancelled = true;
    };
  }, [
    session,
    routeTermId,
  ]);

  /*
   * =========================================================
   * APPLY ROUTE CLASS
   * =========================================================
   */

  useEffect(() => {
    if (!routeClassId) {
      return;
    }

    const exists =
      classes.some(
        (item) =>
          item.id === routeClassId,
      );

    if (exists) {
      setClassId(
        routeClassId,
      );
    }
  }, [
    classes,
    routeClassId,
  ]);

  /*
   * =========================================================
   * LOAD STUDENTS
   * =========================================================
   */

  useEffect(() => {
    if (!classId) {
      setStudents([]);

      if (!openedFromStudent) {
        setStudentId('');
      }

      return;
    }

    let cancelled = false;

    setStudents([]);

    const loadStudents =
      async () => {
        const {
          data,
          error,
        } = await supabase
          .from('students')
          .select(
            [
              'id',
              'first_name',
              'middle_name',
              'last_name',
              'admission_number',
              'gender',
              'date_of_birth',
              'passport_url',
              'class_id',
              'branch_id',
            ].join(','),
          )
          .eq(
            'class_id',
            classId,
          )
          .eq(
            'current_status',
            'active',
          )
          .order(
            'last_name',
          )
          .order(
            'first_name',
          );

        if (cancelled) {
          return;
        }

        if (error) {
          toast.error(
            error.message,
          );
          return;
        }

        const list =
          (data || []) as Student[];

        setStudents(list);

        if (routeStudentId) {
          const requested =
            list.find(
              (item) =>
                item.id ===
                routeStudentId,
            );

          if (requested) {
            setStudentId(
              requested.id,
            );
          } else {
            const {
              data: exactStudent,
              error:
                exactStudentError,
            } = await supabase
              .from('students')
              .select(
                [
                  'id',
                  'first_name',
                  'middle_name',
                  'last_name',
                  'admission_number',
                  'gender',
                  'date_of_birth',
                  'passport_url',
                  'class_id',
                  'branch_id',
                ].join(','),
              )
              .eq(
                'id',
                routeStudentId,
              )
              .maybeSingle();

            if (
              exactStudentError
            ) {
              toast.error(
                exactStudentError.message,
              );
              return;
            }

            if (
              exactStudent
            ) {
              const historicalStudent =
                exactStudent as Student;

              setStudents(
                (previous) => {
                  if (
                    previous.some(
                      (item) =>
                        item.id ===
                        historicalStudent.id,
                    )
                  ) {
                    return previous;
                  }

                  return [
                    ...previous,
                    historicalStudent,
                  ];
                },
              );

              setStudentId(
                historicalStudent.id,
              );
            } else {
              toast.error(
                'The selected student could not be found.',
              );
            }
          }
        } else {
          setStudentId('');
        }
      };

    void loadStudents();

    return () => {
      cancelled = true;
    };
  }, [
    classId,
    routeStudentId,
    openedFromStudent,
  ]);

  /*
   * =========================================================
   * LOAD REPORT
   * =========================================================
   */

  const loadReport =
    useCallback(async () => {
      if (
        !session ||
        !term ||
        !selectedClass ||
        !studentId
      ) {
        setRows([]);
        return;
      }

      setWorking(true);

      ratingsHydratedRef.current =
        false;

      setAutosaveStatus('idle');

      try {
        const selectedStudent =
          students.find(
            (item) =>
              item.id ===
              studentId,
          );

        let currentStudent =
          selectedStudent ||
          null;

        if (!currentStudent) {
          const {
            data,
            error,
          } = await supabase
            .from('students')
            .select(
              [
                'id',
                'first_name',
                'middle_name',
                'last_name',
                'admission_number',
                'gender',
                'date_of_birth',
                'passport_url',
                'class_id',
                'branch_id',
              ].join(','),
            )
            .eq(
              'id',
              studentId,
            )
            .maybeSingle();

          if (error) {
            throw error;
          }

          currentStudent =
            (data ||
              null) as Student | null;
        }

        if (!currentStudent) {
          throw new Error(
            'Student not found.',
          );
        }

        setStudent(
          currentStudent,
        );

        /*
         * =====================================================
         * ASSESSMENT GROUP
         * =====================================================
         */

        const group =
          resolveAssessmentGroup({
            id: selectedClass.id,
            name: selectedClass.name,
            level: selectedClass.level,
            department:
              selectedClass.department,
          });

        /*
         * =====================================================
         * FETCH REPORT DATA
         * =====================================================
         */

        const [
          {
            data: config,
            error: configError,
          },
          {
            data: batches,
            error: batchError,
          },
          {
            data: summary,
            error: summaryError,
          },
          {
            data: branch,
            error: branchError,
          },
          {
            data: schoolInfo,
          },
          {
            data: fees,
          },
          {
            data: directorSetting,
          },
          {
            data: attendanceData,
            error: attendanceError,
          },
        ] =
          await Promise.all([
            supabase
              .from(
                'result_assessment_configs',
              )
              .select(
                [
                  'first_test_max',
                  'second_test_max',
                  'exam_max',
                  'total_max',
                  'components',
                  'grading_system',
                  'next_term_begins',
                ].join(','),
              )
              .eq(
                'academic_session_id',
                session.id,
              )
              .eq(
                'term_id',
                term.id,
              )
              .eq(
                'academic_group',
                group,
              )
              .eq(
                'status',
                'active',
              )
              .maybeSingle(),

            supabase
              .from(
                'result_batches',
              )
              .select(
                [
                  'id',
                  'class_id',
                  'subject_id',
                  'assessment_type',
                  'max_score',
                  'created_at',
                ].join(','),
              )
              .eq(
                'academic_session_id',
                session.id,
              )
              .eq(
                'term_id',
                term.id,
              )
              .eq(
                'class_id',
                selectedClass.id,
              )
              .in(
                'assessment_type',
                [
                  'first_test',
                  'second_test',
                  'continuous_assessment',
                  'ca',
                  'exam',
                ],
              )
              .order(
                'created_at',
                {
                  ascending: false,
                },
              ),

            supabase
              .from(
                'result_summaries',
              )
              .select(
                [
                  'id',
                  'position',
                  'remark',
                  'grade',
                  'psychomotor',
                  'affective',
                  'attendance',
                  'teacher_comment',
                  'principal_comment',
                  'director_comment',
                  'next_term_begins',
                  'average_percentage',
                ].join(','),
              )
              .eq(
                'student_id',
                studentId,
              )
              .eq(
                'class_id',
                selectedClass.id,
              )
              .eq(
                'session',
                session.session_name,
              )
              .eq(
                'term',
                term.term,
              )
              .maybeSingle(),

            /*
             * IMPORTANT:
             *
             * Fetch the branch NAME here.
             * The UUID is only used for lookup.
             */
            supabase
              .from('branches')
              .select(
                [
                  'id',
                  'name',
                  'school_name',
                  'branch_code',
                  'address',
                  'phone_number',
                  'email',
                  'logo_url',
                  'stamp_url',
                ].join(','),
              )
              .eq(
                'id',
                currentStudent.branch_id,
              )
              .maybeSingle(),

            supabase
              .from('school_info')
              .select(
                [
                  'school_name',
                  'address',
                  'email',
                  'phone_number',
                  'logo_url',
                  'motto',
                  'stamp_url',
                ].join(','),
              )
              .limit(1)
              .maybeSingle(),

            supabase
              .from(
                'student_fee_assignments',
              )
              .select(
                [
                  'amount_due',
                  'amount_paid',
                  'balance',
                ].join(','),
              )
              .eq(
                'student_id',
                studentId,
              )
              .eq(
                'session',
                session.session_name,
              )
              .eq(
                'term',
                term.term,
              )
              .eq(
                'is_active',
                true,
              ),

            supabase
              .from(
                'system_settings',
              )
              .select(
                'setting_value',
              )
              .eq(
                'setting_key',
                'result_director_comments',
              )
              .maybeSingle(),

            supabase.rpc(
              'get_student_term_attendance',
              {
                p_student_id:
                  studentId,
                p_academic_session_id:
                  session.id,
                p_term_id:
                  term.id,
              },
            ),
          ]);

        if (configError) {
          throw configError;
        }

        if (batchError) {
          throw batchError;
        }

        if (summaryError) {
          throw summaryError;
        }

        if (attendanceError) {
          throw attendanceError;
        }

        if (branchError) {
          console.warn(
            'BRANCH LOOKUP WARNING:',
            branchError.message,
          );
        }

        /*
         * =====================================================
         * BASIC SUMMARY VALUES
         * =====================================================
         */

        setAttendance(
          attendanceData || {},
        );

        const nextTerm =
          summary?.next_term_begins ||
          config?.next_term_begins ||
          null;

        setNextTermBegins(
          nextTerm,
        );

        /*
         * =====================================================
         * SCHOOL + BRANCH INFORMATION
         * =====================================================
         *
         * The important change here:
         *
         * branch_name = branch.name
         *
         * NOT:
         *
         * branch_id = UUID
         */

        const resolvedBranchName =
          String(
            branch?.name ||
              branch?.school_name ||
              branch?.branch_code ||
              '—',
          ).trim();

        const schoolData = {
          ...(schoolInfo || {}),
          ...(branch || {}),

          logo_url: schoolLogo,

          stamp_url:
            branch?.stamp_url ||
            schoolInfo?.stamp_url ||
            null,

          school_name:
            branch?.school_name ||
            schoolInfo?.school_name ||
            'Ebenezer International School',

          motto:
            schoolInfo?.motto ||
            'Diligence for Excellence',

          /*
           * DISPLAY VALUE:
           * Show the actual branch name.
           */
          branch_name:
            resolvedBranchName,

          /*
           * Keep branch_id internally if any
           * existing component needs it, but it
           * will no longer be displayed as the
           * Branch value.
           */
          branch_id:
            currentStudent.branch_id,
        };

        setSchool(
          schoolData,
        );

        /*
         * =====================================================
         * ASSESSMENT MAXIMUMS
         * =====================================================
         */

        const components =
          Array.isArray(
            config?.components,
          )
            ? config.components
            : [];

        const componentMax = (
          key: string,
          fallback: number,
        ) =>
          Number(
            components.find(
              (item: any) =>
                item?.key === key,
            )?.max_score ??
              fallback,
          );

        const maxTest1 =
          componentMax(
            'first_test',
            Number(
              config?.first_test_max ||
                0,
            ),
          );

        const maxTest2 =
          componentMax(
            'second_test',
            Number(
              config?.second_test_max ||
                0,
            ),
          );

        const maxCA =
          componentMax(
            'ca',
            20,
          );

        const maxExam =
          componentMax(
            'exam',
            Number(
              config?.exam_max ||
                0,
            ),
          );

        const maxTotal =
          Number(
            config?.total_max ||
              maxTest1 +
                maxTest2 +
                maxCA +
                maxExam,
          );

        const maximums = {
          test1: maxTest1,
          test2: maxTest2,
          ca: maxCA,
          exam: maxExam,
          total: maxTotal,
        };

        setMax(maximums);
        latestMaxRef.current =
          maximums;

        /*
         * =====================================================
         * RESULT BATCHES
         * =====================================================
         */

        const batchList =
          (batches || []) as any[];

        const batchIds =
          batchList.map(
            (item) => item.id,
          );

        const {
          data: allEntries,
          error: entryError,
        } = batchIds.length
          ? await supabase
              .from(
                'result_entries',
              )
              .select(
                [
                  'batch_id',
                  'student_id',
                  'score',
                  'grade',
                  'remark',
                ].join(','),
              )
              .in(
                'batch_id',
                batchIds,
              )
          : {
              data: [],
              error: null,
            };

        if (entryError) {
          throw entryError;
        }

        const scoreMap =
          new Map<string, any>();

        (
          allEntries || []
        ).forEach(
          (entry: any) => {
            scoreMap.set(
              `${entry.student_id}:${entry.batch_id}`,
              entry,
            );
          },
        );

        /*
         * =====================================================
         * LATEST BATCH PER SUBJECT / ASSESSMENT
         * =====================================================
         */

        const latestBatches =
          new Map<
            string,
            any
          >();

        for (const batch of batchList) {
          const type =
            batch.assessment_type ===
            'continuous_assessment'
              ? 'ca'
              : batch.assessment_type;

          const key =
            `${batch.subject_id}:${type}`;

          if (
            !latestBatches.has(
              key,
            )
          ) {
            latestBatches.set(
              key,
              batch,
            );
          }
        }

        /*
         * =====================================================
         * SUBJECTS
         * =====================================================
         */

        const subjectIds = [
          ...new Set(
            batchList.map(
              (batch) =>
                batch.subject_id,
            ),
          ),
        ];

        const {
          data: subjectRows,
          error: subjectError,
        } =
          subjectIds.length
            ? await supabase
                .from('subjects')
                .select(
                  'id,name',
                )
                .in(
                  'id',
                  subjectIds,
                )
            : {
                data: [],
                error: null,
              };

        if (subjectError) {
          throw subjectError;
        }

        const subjectNames =
          new Map<
            string,
            string
          >(
            (
              subjectRows ||
              []
            ).map(
              (item: any) => [
                item.id,
                item.name,
              ],
            ),
          );

        /*
         * =====================================================
         * CLASS-WIDE POSITION CALCULATION
         * =====================================================
         */

        const activeStudentIds =
          students.map(
            (item) =>
              item.id,
          );

        if (
          !activeStudentIds.includes(
            currentStudent.id,
          )
        ) {
          activeStudentIds.push(
            currentStudent.id,
          );
        }

        const overallMap =
          new Map<
            string,
            {
              total: number;
              max: number;
            }
          >();

        const subjectMaps =
          new Map<
            string,
            Map<
              string,
              {
                score: number;
                max: number;
              }
            >
          >();

        for (
          const subjectId of subjectIds
        ) {
          subjectMaps.set(
            subjectId,
            new Map(),
          );
        }

        for (
          const studentKey of activeStudentIds
        ) {
          overallMap.set(
            studentKey,
            {
              total: 0,
              max: 0,
            },
          );
        }

        for (
          const batch of latestBatches.values()
        ) {
          const subjectMap =
            subjectMaps.get(
              batch.subject_id,
            );

          if (!subjectMap) {
            continue;
          }

          for (
            const studentKey of activeStudentIds
          ) {
            const entry =
              scoreMap.get(
                `${studentKey}:${batch.id}`,
              );

            if (
              entry?.score == null
            ) {
              continue;
            }

            const current =
              subjectMap.get(
                studentKey,
              ) || {
                score: 0,
                max: 0,
              };

            current.score +=
              Number(
                entry.score,
              );

            current.max +=
              Number(
                batch.max_score ||
                  0,
              );

            subjectMap.set(
              studentKey,
              current,
            );

            const overall =
              overallMap.get(
                studentKey,
              ) || {
                total: 0,
                max: 0,
              };

            overall.total +=
              Number(
                entry.score,
              );

            overall.max +=
              Number(
                batch.max_score ||
                  0,
              );

            overallMap.set(
              studentKey,
              overall,
            );
          }
        }

        const overallRanking =
          [
            ...overallMap.entries(),
          ]
            .filter(
              ([, value]) =>
                value.max > 0,
            )
            .sort(
              (a, b) => {
                const aPct =
                  a[1].total /
                  a[1].max;

                const bPct =
                  b[1].total /
                  b[1].max;

                return (
                  bPct - aPct ||
                  b[1].total -
                    a[1].total
                );
              },
            );

        const overallRanks =
          new Map<
            string,
            number
          >();

        let currentRank = 0;
        let previousPercentage:
          | number
          | null = null;

        overallRanking.forEach(
          ([studentKey, value], index) => {
            const percentage =
              value.max
                ? (value.total /
                    value.max) *
                  100
                : 0;

            if (
              previousPercentage ===
                null ||
              percentage <
                previousPercentage
            ) {
              currentRank =
                index + 1;
            }

            overallRanks.set(
              studentKey,
              currentRank,
            );

            previousPercentage =
              percentage;
          },
        );

        /*
         * =====================================================
         * BUILD SUBJECT ROWS
         * =====================================================
         */

        const nextRows: Row[] =
          [];

        for (
          const batch of latestBatches.values()
        ) {
          const entry =
            scoreMap.get(
              `${studentId}:${batch.id}`,
            );

          if (
            entry?.score == null
          ) {
            continue;
          }

          const type =
            batch.assessment_type ===
            'continuous_assessment'
              ? 'ca'
              : batch.assessment_type;

          const existing =
            nextRows.find(
              (item) =>
                item.subjectId ===
                batch.subject_id,
            );

          if (existing) {
            if (
              type ===
              'first_test'
            ) {
              existing.test1 =
                Number(
                  entry.score,
                );
            }

            if (
              type ===
              'second_test'
            ) {
              existing.test2 =
                Number(
                  entry.score,
                );
            }

            if (
              type === 'ca'
            ) {
              existing.ca =
                Number(
                  entry.score,
                );
            }

            if (
              type === 'exam'
            ) {
              existing.exam =
                Number(
                  entry.score,
                );
            }
          } else {
            nextRows.push({
              subjectId:
                batch.subject_id,

              subject:
                subjectNames.get(
                  batch.subject_id,
                ) ||
                'Subject',

              test1:
                type ===
                'first_test'
                  ? Number(
                      entry.score,
                    )
                  : null,

              test2:
                type ===
                'second_test'
                  ? Number(
                      entry.score,
                    )
                  : null,

              ca:
                type === 'ca'
                  ? Number(
                      entry.score,
                    )
                  : null,

              exam:
                type === 'exam'
                  ? Number(
                      entry.score,
                    )
                  : null,

              total: 0,
              percentage: 0,

              grade: 'F',
              remark:
                'Needs Improvement',

              position: null,
            });
          }
        }

        /*
         * =====================================================
         * CALCULATE SUBJECT TOTALS
         * =====================================================
         */

        nextRows.forEach(
          (row) => {
            row.total =
              Number(
                row.test1 || 0,
              ) +
              Number(
                row.test2 || 0,
              ) +
              Number(
                row.ca || 0,
              ) +
              Number(
                row.exam || 0,
              );

            row.percentage =
              maxTotal
                ? (row.total /
                    maxTotal) *
                  100
                : 0;

            row.grade =
              grade(
                row.percentage,
              );

            row.remark =
              remark(
                row.percentage,
              );

            const subjectMap =
              subjectMaps.get(
                row.subjectId,
              );

            if (
              !subjectMap
            ) {
              return;
            }

            const subjectRanking =
              [
                ...subjectMap.entries(),
              ].sort(
                (a, b) => {
                  const aPct =
                    a[1].max
                      ? a[1].score /
                        a[1].max
                      : 0;

                  const bPct =
                    b[1].max
                      ? b[1].score /
                        b[1].max
                      : 0;

                  return (
                    bPct - aPct ||
                    b[1].score -
                      a[1].score
                  );
                },
              );

            let subjectRank =
              0;

            let previous:
              | number
              | null = null;

            subjectRanking.forEach(
              (
                [
                  rankingStudentId,
                  value,
                ],
                index,
              ) => {
                const percentage =
                  value.max
                    ? (value.score /
                        value.max) *
                      100
                    : 0;

                if (
                  previous ===
                    null ||
                  percentage <
                    previous
                ) {
                  subjectRank =
                    index + 1;
                }

                if (
                  rankingStudentId ===
                  studentId
                ) {
                  row.position =
                    subjectRank;
                }

                previous =
                  percentage;
              },
            );
          },
        );

        nextRows.sort(
          (a, b) =>
            a.subject.localeCompare(
              b.subject,
            ),
        );

        /*
         * =====================================================
         * SET REPORT RESULTS
         * =====================================================
         */

        setRows(
          nextRows,
        );

        latestRowsRef.current =
          nextRows;

        const overall =
          overallMap.get(
            studentId,
          ) || {
            total: 0,
            max: 0,
          };

        const overallPercentage =
          overall.max
            ? (overall.total /
                overall.max) *
              100
            : 0;

        const calculatedPosition =
          summary?.position ??
          overallRanks.get(
            studentId,
          ) ??
          null;

        const calculatedGrade =
          summary?.grade ||
          grade(
            overallPercentage,
          );

        const calculatedRemark =
          summary?.remark ||
          remark(
            overallPercentage,
          );

        setPosition(
          calculatedPosition,
        );

        setClassSize(
          overallRanking.length ||
            students.length,
        );

        setAverage(
          overallPercentage,
        );

        setOverallGrade(
          calculatedGrade,
        );

        setOverallRemark(
          calculatedRemark,
        );

        /*
         * =====================================================
         * RATINGS
         * =====================================================
         */

        const loadedPsychomotor = {
          ...emptyRatings(PSYCH),
          ...(summary?.psychomotor ||
            {}),
        };

        const loadedAffective = {
          ...emptyRatings(AFFECTIVE),
          ...(summary?.affective ||
            {}),
        };

        setPsychomotor(
          loadedPsychomotor,
        );

        setAffective(
          loadedAffective,
        );

        latestPsychomotorRef.current =
          loadedPsychomotor;

        latestAffectiveRef.current =
          loadedAffective;

        /*
         * =====================================================
         * AUTOMATIC COMMENTS
         * =====================================================
         */

        const fullName =
          studentFullName(
            currentStudent,
          );

        const weakSubjects =
          nextRows
            .filter(
              (item) =>
                item.percentage <
                50,
            )
            .map(
              (item) =>
                item.subject,
            )
            .slice(0, 4)
            .join(', ') ||
          'the subjects studied';

        const automaticTeacherComment =
          `Continue to encourage ${
            currentStudent.first_name ||
            'the student'
          } to maintain consistent class participation and independent study.`;

        const automaticPrincipalComment =
          'The student should sustain positive learning habits and continue to develop academically and personally.';

        const directorTemplates =
          Array.isArray(
            directorSetting?.setting_value,
          )
            ? directorSetting.setting_value
            : [];

        const directorTemplate =
          String(
            directorTemplates.find(
              (value: any) =>
                typeof value ===
                'string',
            ) ||
              'The student is encouraged to maintain steady effort and continuous improvement.',
          );

        const automaticDirectorComment =
          directorTemplate
            .replaceAll(
              '{student_name}',
              fullName ||
                'the student',
            )
            .replaceAll(
              '{weak_subjects}',
              weakSubjects,
            );

        const loadedTeacherComment =
          summary?.teacher_comment ||
          automaticTeacherComment;

        const loadedPrincipalComment =
          summary?.principal_comment ||
          automaticPrincipalComment;

        const loadedDirectorComment =
          summary?.director_comment ||
          automaticDirectorComment;

        setTeacherComment(
          loadedTeacherComment,
        );

        setPrincipalComment(
          loadedPrincipalComment,
        );

        setDirectorComment(
          loadedDirectorComment,
        );

        latestTeacherCommentRef.current =
          loadedTeacherComment;

        latestPrincipalCommentRef.current =
          loadedPrincipalComment;

        latestDirectorCommentRef.current =
          loadedDirectorComment;

        /*
         * =====================================================
         * FEES
         * =====================================================
         */

        const due =
          (fees || []).reduce(
            (
              total: number,
              item: any,
            ) =>
              total +
              Number(
                item.amount_due ||
                  0,
              ),
            0,
          );

        const paid =
          (fees || []).reduce(
            (
              total: number,
              item: any,
            ) =>
              total +
              Number(
                item.amount_paid ||
                  0,
              ),
            0,
          );

        const balance =
          Math.max(
            0,
            (fees || []).reduce(
              (
                total: number,
                item: any,
              ) =>
                total +
                Number(
                  item.balance ??
                    Number(
                      item.amount_due ||
                        0,
                    ) -
                      Number(
                        item.amount_paid ||
                          0,
                      ),
                ),
              0,
            ),
          );

        setFeeStatus({
          status: !fees?.length
            ? 'NO FEE DATA'
            : balance <= 0
              ? 'PAID'
              : paid > 0
                ? 'PARTIAL'
                : 'UNPAID',

          due,
          paid,
          balance,
        });

        /*
         * =====================================================
         * FINISH HYDRATION
         * =====================================================
         */

        requestAnimationFrame(() => {
          ratingsHydratedRef.current =
            true;
        });
      } catch (error: any) {
        console.error(
          'REPORT LOAD ERROR:',
          error,
        );

        toast.error(
          error?.message ||
            'Unable to load report sheet.',
        );

        setRows([]);
      } finally {
        setWorking(false);
      }
    }, [
      session,
      term,
      selectedClass,
      studentId,
      students,
    ]);

  useEffect(() => {
    if (
      !studentId ||
      !session ||
      !term ||
      !selectedClass
    ) {
      return;
    }

    void loadReport();
  }, [
    studentId,
    session,
    term,
    selectedClass,
    loadReport,
  ]);

  /*
   * =========================================================
   * SAVE RESULT SUMMARY
   * =========================================================
   */

  const saveResultSummary =
    useCallback(async () => {
      if (
        !student ||
        !selectedClass ||
        !session ||
        !term
      ) {
        return;
      }

      const currentRows =
        latestRowsRef.current;

      const currentMax =
        latestMaxRef.current;

      const currentPsychomotor =
        latestPsychomotorRef.current;

      const currentAffective =
        latestAffectiveRef.current;

      const currentTeacherComment =
        latestTeacherCommentRef.current;

      const currentPrincipalComment =
        latestPrincipalCommentRef.current;

      const currentDirectorComment =
        latestDirectorCommentRef.current;

      const currentAttendance =
        latestAttendanceRef.current;

      const currentAverage =
        latestAverageRef.current;

      const currentGrade =
        latestGradeRef.current;

      const currentRemark =
        latestRemarkRef.current;

      const currentPosition =
        latestPositionRef.current;

      const currentNextTermBegins =
        latestNextTermBeginsRef.current;

      const {
        data: existingSummary,
        error: lookupError,
      } = await supabase
        .from(
          'result_summaries',
        )
        .select('id')
        .eq(
          'student_id',
          student.id,
        )
        .eq(
          'class_id',
          selectedClass.id,
        )
        .eq(
          'session',
          session.session_name,
        )
        .eq(
          'term',
          term.term,
        )
        .maybeSingle();

      if (lookupError) {
        throw lookupError;
      }

      const payload = {
        branch_id:
          selectedClass.branch_id,

        student_id:
          student.id,

        class_id:
          selectedClass.id,

        term:
          term.term,

        session:
          session.session_name,

        total_subjects:
          currentRows.length,

        total_score:
          currentRows.reduce(
            (
              total,
              row,
            ) =>
              total +
              Number(
                row.total || 0,
              ),
            0,
          ),

        total_max_score:
          currentRows.length *
          Number(
            currentMax.total || 0,
          ),

        average_percentage:
          Number(
            currentAverage || 0,
          ),

        grade:
          currentGrade,

        position:
          currentPosition,

        remark:
          currentRemark,

        attendance:
          currentAttendance,

        psychomotor:
          currentPsychomotor,

        affective:
          currentAffective,

        teacher_comment:
          currentTeacherComment?.trim() ||
          null,

        principal_comment:
          currentPrincipalComment?.trim() ||
          null,

        director_comment:
          currentDirectorComment?.trim() ||
          null,

        next_term_begins:
          currentNextTermBegins,

        updated_at:
          new Date().toISOString(),

        generated_at:
          new Date().toISOString(),

        published: false,
        published_at: null,
      };

      if (existingSummary?.id) {
        const {
          error: updateError,
        } = await supabase
          .from(
            'result_summaries',
          )
          .update(
            payload,
          )
          .eq(
            'id',
            existingSummary.id,
          );

        if (updateError) {
          throw updateError;
        }
      } else {
        const {
          error: insertError,
        } = await supabase
          .from(
            'result_summaries',
          )
          .insert(
            payload,
          );

        if (insertError) {
          throw insertError;
        }
      }
    }, [
      student,
      selectedClass,
      session,
      term,
    ]);

  /*
   * =========================================================
   * AUTOSAVE WORKER
   * =========================================================
   */

  const performAutosave =
    useCallback(async () => {
      if (
        !ratingsHydratedRef.current
      ) {
        return;
      }

      if (
        !student ||
        !selectedClass ||
        !session ||
        !term
      ) {
        return;
      }

      if (
        saveInProgressRef.current
      ) {
        pendingAutosaveRef.current =
          true;

        return;
      }

      saveInProgressRef.current =
        true;

      pendingAutosaveRef.current =
        false;

      setAutosaveStatus(
        'saving',
      );

      try {
        await saveResultSummary();

        setAutosaveStatus(
          'saved',
        );

        setLastSavedAt(
          new Date(),
        );
      } catch (error: any) {
        console.error(
          'RESULT AUTOSAVE ERROR:',
          error,
        );

        setAutosaveStatus(
          'error',
        );

        toast.error(
          error?.message ||
            'Unable to save report changes.',
        );
      } finally {
        saveInProgressRef.current =
          false;

        if (
          pendingAutosaveRef.current
        ) {
          pendingAutosaveRef.current =
            false;

          void performAutosave();
        }
      }
    }, [
      student,
      selectedClass,
      session,
      term,
      saveResultSummary,
    ]);

  /*
   * =========================================================
   * DEBOUNCED AUTOSAVE
   * =========================================================
   */

  const queueAutosave =
    useCallback(() => {
      if (
        !ratingsHydratedRef.current
      ) {
        return;
      }

      if (
        autosaveTimerRef.current
      ) {
        clearTimeout(
          autosaveTimerRef.current,
        );
      }

      autosaveTimerRef.current =
        setTimeout(() => {
          autosaveTimerRef.current =
            null;

          void performAutosave();
        }, 500);
    }, [
      performAutosave,
    ]);

  useEffect(() => {
    return () => {
      if (
        autosaveTimerRef.current
      ) {
        clearTimeout(
          autosaveTimerRef.current,
        );
      }
    };
  }, []);

  /*
   * =========================================================
   * RATING CHANGE
   * =========================================================
   */

  const updateRating = (
    domain:
      | 'psychomotor'
      | 'affective',
    skill: string,
    value: string,
  ) => {
    if (
      domain ===
      'psychomotor'
    ) {
      setPsychomotor(
        (previous) => {
          const next = {
            ...previous,
            [skill]: value,
          };

          latestPsychomotorRef.current =
            next;

          return next;
        },
      );
    } else {
      setAffective(
        (previous) => {
          const next = {
            ...previous,
            [skill]: value,
          };

          latestAffectiveRef.current =
            next;

          return next;
        },
      );
    }

    queueAutosave();
  };

  /*
   * =========================================================
   * COMMENT CHANGES
   * =========================================================
   */

  const updateTeacherComment =
    (value: string) => {
      setTeacherComment(
        value,
      );

      latestTeacherCommentRef.current =
        value;

      queueAutosave();
    };

  const updatePrincipalComment =
    (value: string) => {
      setPrincipalComment(
        value,
      );

      latestPrincipalCommentRef.current =
        value;

      queueAutosave();
    };

  const updateDirectorComment =
    (value: string) => {
      setDirectorComment(
        value,
      );

      latestDirectorCommentRef.current =
        value;

      queueAutosave();
    };

  /*
   * =========================================================
   * MANUAL REFRESH
   * =========================================================
   */

  const refreshReport =
    async () => {
      if (!studentId) {
        return;
      }

      if (
        autosaveTimerRef.current
      ) {
        clearTimeout(
          autosaveTimerRef.current,
        );

        autosaveTimerRef.current =
          null;
      }

      await loadReport();
    };

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const showSelectionContext =
    !openedFromStudent;

  const autosaveText =
    autosaveStatus ===
    'saving'
      ? 'Saving...'
      : autosaveStatus ===
          'saved'
        ? 'Saved'
        : autosaveStatus ===
            'error'
          ? 'Save failed'
          : '';

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 p-4 md:p-6">
      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Academic Results
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Student Report Sheet
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Official academic performance report
          </p>
        </div>

        <div className="flex items-center gap-2">
          {autosaveText && (
            <div
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                autosaveStatus ===
                'saving'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                  : autosaveStatus ===
                      'saved'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : autosaveStatus ===
                        'error'
                      ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                      : 'bg-slate-100 text-slate-600'
              }`}
            >
              {autosaveStatus ===
                'saving' && (
                <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              )}

              {autosaveText}

              {autosaveStatus ===
                'saved' &&
                lastSavedAt && (
                  <span className="ml-1 opacity-70">
                    {lastSavedAt.toLocaleTimeString(
                      [],
                      {
                        hour: '2-digit',
                        minute:
                          '2-digit',
                      },
                    )}
                  </span>
                )}
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              void refreshReport()
            }
            disabled={
              working ||
              !studentId
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                working
                  ? 'animate-spin'
                  : ''
              }`}
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              window.print()
            }
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            <Printer className="h-4 w-4" />

            Print
          </button>
        </div>
      </div>

      {/* =====================================================
          SELECTION CONTEXT
          ===================================================== */}

      {showSelectionContext && (
        <section className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Report Selection
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select the session, term, class and student
              whose report you want to view.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* SESSION */}
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Academic Session
              </span>

              <select
                value={sessionId}
                onChange={(event) =>
                  setSessionId(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-primary dark:border-slate-600 dark:bg-slate-900"
              >
                <option value="">
                  Select session
                </option>

                {sessions.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {
                        item.session_name
                      }

                      {item.is_current
                        ? ' — Current'
                        : ''}
                    </option>
                  ),
                )}
              </select>
            </label>

            {/* TERM */}
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Term
              </span>

              <select
                value={termId}
                onChange={(event) =>
                  setTermId(
                    event.target.value,
                  )
                }
                disabled={
                  !sessionId
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900"
              >
                <option value="">
                  Select term
                </option>

                {terms.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.term}
                    </option>
                  ),
                )}
              </select>
            </label>

            {/* CLASS */}
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Class
              </span>

              <select
                value={classId}
                onChange={(event) =>
                  setClassId(
                    event.target.value,
                  )
                }
                disabled={
                  !termId
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900"
              >
                <option value="">
                  Select class
                </option>

                {classes.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            {/* STUDENT */}
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Student
              </span>

              <select
                value={studentId}
                onChange={(event) =>
                  setStudentId(
                    event.target.value,
                  )
                }
                disabled={
                  !classId
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900"
              >
                <option value="">
                  Select student
                </option>

                {students.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {studentFullName(
                        item,
                      )}

                      {item.admission_number
                        ? ` — ${item.admission_number}`
                        : ''}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
        </section>
      )}

      {/* =====================================================
          REPORT STATUS
          ===================================================== */}

      {working && (
        <div className="no-print flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">
          <Loader2 className="h-4 w-4 animate-spin" />

          Preparing student report...
        </div>
      )}

      {/* =====================================================
          EMPTY STATE
          ===================================================== */}

      {!studentId && (
        <div className="no-print rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Select a student
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Choose the academic session, term, class and
            student to open the official report sheet.
          </p>
        </div>
      )}

      {/* =====================================================
          REPORT
          ===================================================== */}

      {student &&
        session &&
        term &&
        selectedClass && (
          <OfficialResultSheet
            school={school}
            student={student}
            className={
              selectedClass.name
            }
            session={
              session.session_name
            }
            term={term.term}
            assessments={rows}
            test1Max={
              max.test1
            }
            test2Max={
              max.test2
            }
            caMax={max.ca}
            examMax={
              max.exam
            }
            totalMax={
              max.total
            }
            classPosition={
              position
            }
            position={
              position
            }
            classSize={
              classSize
            }
            average={
              average
            }
            overallGrade={
              overallGrade
            }
            overallRemark={
              overallRemark
            }
            attendance={
              attendance
            }
            psychomotor={
              psychomotor
            }
            affective={
              affective
            }
            teacherComment={
              teacherComment
            }
            principalComment={
              principalComment
            }
            directorComment={
              directorComment
            }
            nextTermBegins={
              nextTermBegins
            }
            feeStatus={
              feeStatus
            }
            onRatingChange={
              updateRating
            }
            onTeacherCommentChange={
              updateTeacherComment
            }
            onPrincipalCommentChange={
              updatePrincipalComment
            }
            onDirectorCommentChange={
              updateDirectorComment
            }
          />
        )}
    </div>
  );
}