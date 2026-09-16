
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Activity,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle,
  Clock,
  FileText,
  GraduationCap,
  Info,
  Megaphone,
  RefreshCw,
  User,
  Wallet,
  Zap,
  AlertCircle,
  XCircle,
  BarChart3,
  PieChart,
  LineChart,
  Award,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import { StudentDashboardSkeleton } from '../../components/common/LoadingSpinner';
import { usePaymentData } from '../../hooks/usePaymentData';
import { TimetableWidget } from '../../components/tutorial/student/TimetableWidget';

dayjs.extend(relativeTime);

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AcademicSession = {
  id: string;
  session_name: string;
  term_name: string;
  term_number?: number | null;
  start_date?: string | null;
  end_date?: string | null;
};

type StudentClass = {
  id: string;
  name: string;
  code: string | null;
  level: string | null;
};

type TimetableItem = {
  id: string;
  day: string | null;
  day_of_week: string | null;
  period: number;
  start_time: string | null;
  end_time: string | null;
  subject_id: string | null;
  teacher_id: string | null;
  room: string | null;
  notes: string | null;
  subject_name: string | null;
  teacher_name: string | null;
  classroom: string | null;
  is_break: boolean | null;
};

type Subject = {
  id: string;
  name: string;
  code: string | null;
};

type Teacher = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
};

type AttendanceRow = {
  id: string;
  session_id: string | null;
  student_id: string;
  teacher_id: string | null;
  status: string;
  check_in_at: string | null;
  check_out_at: string | null;
  remarks: string | null;
  marked_by: string | null;
  created_at: string | null;
};

type Announcement = {
  id: string;
  announcement_id: string | null;
  branch_id: string;
  title: string;
  content: string;
  category: string | null;
  priority: string | null;
  target_roles: string[] | null;
  target_branches: string[] | null;
  start_date: string | null;
  end_date: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
};

type ResultRow = {
  id: string;
  branch_id: string | null;
  student_id: string;
  class_id: string | null;
  subject_id: string | null;
  term: string | null;
  session: string | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  grade: string | null;
  remark: string | null;
  created_at: string | null;
  _type: 'test' | 'exam' | 'cbt';
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const normalize = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const money = (value: unknown): string =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const statusClass = (status: string): string => {
  const value = normalize(status);

  if (
    ['paid', 'completed', 'approved', 'present', 'active'].includes(value)
  ) {
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  }

  if (
    ['pending', 'processing', 'late', 'partial'].includes(value)
  ) {
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  }

  if (
    ['overdue', 'absent', 'failed', 'rejected'].includes(value)
  ) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  }

  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
};

const statusIcon = (status: string) => {
  const value = normalize(status);

  if (
    ['paid', 'completed', 'approved', 'present', 'active'].includes(value)
  ) {
    return CheckCircle;
  }

  if (['overdue', 'absent'].includes(value)) {
    return AlertCircle;
  }

  if (['failed', 'rejected'].includes(value)) {
    return XCircle;
  }

  return Clock;
};

/* -------------------------------------------------------------------------- */
/* PROGRESS BAR                                                               */
/* -------------------------------------------------------------------------- */

const ProgressBar: React.FC<{
  value: number;
  color?: string;
  label?: string;
}> = ({
  value,
  color = 'bg-blue-500',
  label,
}) => (
  <div className="w-full">
    {label && (
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
    )}

    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700`}
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
        }}
      />
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* DONUT CHART                                                                */
/* -------------------------------------------------------------------------- */

const DonutChart: React.FC<{
  data: {
    label: string;
    value: number;
    color: string;
  }[];
  size?: number;
}> = ({
  data,
  size = 120,
}) => {
  const total = data.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  let currentAngle = 0;

  return (
    <div
      className="relative shrink-0"
      style={{
        width: size,
        height: size,
      }}
    >
      <svg
        viewBox="0 0 120 120"
        className="transform -rotate-90"
      >
        {data.map((item, index) => {
          const percentage =
            total > 0
              ? (item.value / total) * 100
              : 0;

          const angle =
            (percentage / 100) * 360;

          const startAngle = currentAngle;
          const endAngle =
            currentAngle + angle;

          currentAngle = endAngle;

          if (percentage === 0) {
            return null;
          }

          const x1 =
            60 +
            50 *
              Math.cos(
                (startAngle * Math.PI) / 180,
              );

          const y1 =
            60 +
            50 *
              Math.sin(
                (startAngle * Math.PI) / 180,
              );

          const x2 =
            60 +
            50 *
              Math.cos(
                (endAngle * Math.PI) / 180,
              );

          const y2 =
            60 +
            50 *
              Math.sin(
                (endAngle * Math.PI) / 180,
              );

          const largeArcFlag =
            angle > 180 ? 1 : 0;

          return (
            <path
              key={`${item.label}-${index}`}
              d={`M 60 60 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
              fill={item.color}
              stroke="white"
              strokeWidth="2"
            />
          );
        })}

        <circle
          cx="60"
          cy="60"
          r="30"
          fill="white"
          stroke="white"
          strokeWidth="2"
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          {total}
        </span>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* MINI LINE CHART                                                            */
/* -------------------------------------------------------------------------- */

const MiniLineChart: React.FC<{
  data: number[];
  color?: string;
}> = ({
  data,
  color = '#6366f1',
}) => {
  if (!data.length) {
    return (
      <div className="h-20 flex items-center justify-center text-xs text-gray-400">
        No attendance data
      </div>
    );
  }

  const max = Math.max(...data, 1);

  const denominator =
    Math.max(data.length - 1, 1);

  const points = data
    .map(
      (value, index) =>
        `${(index / denominator) * 100},${
          100 - (value / max) * 80
        }`,
    )
    .join(' ');

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-20"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <polyline
        points={`${points} 100,100 0,100`}
        fill={`${color}20`}
        opacity="0.3"
      />
    </svg>
  );
};

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                   */
/* -------------------------------------------------------------------------- */

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadingRef = useRef(false);
  const loadedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [student, setStudent] = useState<any>(null);
  const [studentClass, setStudentClass] =
    useState<StudentClass | null>(null);

  const [academicSession, setAcademicSession] =
    useState<AcademicSession | null>(null);

  const [timetable, setTimetable] =
    useState<TimetableItem[]>([]);

  const [subjects, setSubjects] =
    useState<Subject[]>([]);

  const [teachers, setTeachers] =
    useState<Teacher[]>([]);

  const [attendance, setAttendance] =
    useState<AttendanceRow[]>([]);

  const [notifications, setNotifications] =
    useState<any[]>([]);

  const [announcements, setAnnouncements] =
    useState<Announcement[]>([]);

  const [results, setResults] =
    useState<ResultRow[]>([]);

  const [studentId, setStudentId] =
    useState<string | null>(null);

  const [branchId, setBranchId] =
    useState<string | null>(null);

  /* ------------------------------------------------------------------------ */
  /* FEES                                                                     */
  /* ------------------------------------------------------------------------ */

  const {
    assignments = [],
    loading: paymentLoading,
  } = usePaymentData(
    studentId,
    branchId,
    {
      autoFetch: Boolean(
        studentId && branchId,
      ),
    },
  );

  /* ------------------------------------------------------------------------ */
  /* LOAD DASHBOARD                                                           */
  /* ------------------------------------------------------------------------ */

  const load = useCallback(
    async (force = false) => {
      if (
        !user?.id ||
        loadingRef.current ||
        (loadedRef.current && !force)
      ) {
        return;
      }

      loadingRef.current = true;

      if (force) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        /* ------------------------------------------------------------------ */
        /* STUDENT                                                             */
        /* ------------------------------------------------------------------ */

        let studentQuery = supabase
          .from('students')
          .select(`
            *,
            class:class_id (
              id,
              name,
              code,
              level
            )
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        let {
          data: studentData,
          error: studentError,
        } = await studentQuery;

        if (studentError) {
          throw studentError;
        }

        /* Fallback for older student records */
        if (!studentData && user.email) {
          const fallback =
            await supabase
              .from('students')
              .select(`
                *,
                class:class_id (
                  id,
                  name,
                  code,
                  level
                )
              `)
              .eq('email', user.email)
              .maybeSingle();

          if (fallback.error) {
            throw fallback.error;
          }

          studentData = fallback.data;
        }

        if (!studentData) {
          throw new Error(
            'Student profile not found. Please contact administration.',
          );
        }

        const classId =
          studentData.class_id ||
          studentData.class?.id ||
          null;

        const currentBranchId =
          studentData.branch_id || null;

        setStudent({
          ...studentData,
          class_name:
            studentData.class?.name ||
            'Not Assigned',
          class_id: classId,
        });

        setStudentClass(
          studentData.class || null,
        );

        setStudentId(studentData.id);
        setBranchId(currentBranchId);

        /* ------------------------------------------------------------------ */
        /* CURRENT ACADEMIC SESSION                                           */
        /* ------------------------------------------------------------------ */

        let sessionQuery = supabase
          .from('academic_sessions')
          .select(
            'id,session_name,term_name,term_number,start_date,end_date',
          )
          .eq('is_current', true)
          .order('start_date', {
            ascending: false,
          })
          .limit(1);

        if (currentBranchId) {
          sessionQuery = sessionQuery.eq(
            'branch_id',
            currentBranchId,
          );
        }

        const sessionResult =
          await sessionQuery.maybeSingle();

        if (sessionResult.error) {
          console.warn(
            'Academic session:',
            sessionResult.error,
          );
        }

        const currentSession =
          sessionResult.data || null;

        setAcademicSession(currentSession);

        /* ------------------------------------------------------------------ */
        /* CURRENT SESSION VALUES                                             */
        /* ------------------------------------------------------------------ */

        const sessionName =
          currentSession?.session_name || null;

        const termName =
          currentSession?.term_name || null;

        /* ------------------------------------------------------------------ */
        /* CORE DATA — PARALLEL                                                */
        /* ------------------------------------------------------------------ */

        const [
          notificationResult,
          attendanceResult,
          timetableResult,
          subjectsResult,
          teachersResult,
          announcementResult,
          testResult,
          examResult,
          cbtResult,
        ] = await Promise.all([
          /* Notifications belong to the authenticated user */
          supabase
            .from('notifications')
            .select(
              'id,notification_id,user_id,student_id,title,message,link,is_read,priority,type,created_at,sent_at',
            )
            .eq('user_id', user.id)
            .eq('is_read', false)
            .order('created_at', {
              ascending: false,
            })
            .limit(8),

          /* Attendance */
          supabase
            .from('attendance_records')
            .select(`
              id,
              session_id,
              student_id,
              teacher_id,
              status,
              check_in_at,
              check_out_at,
              remarks,
              marked_by,
              created_at
            `)
            .eq(
              'student_id',
              studentData.id,
            )
            .order('created_at', {
              ascending: false,
            })
            .limit(100),

          /* Timetable */
          classId
            ? supabase
                .from('timetables')
                .select(`
                  id,
                  day,
                  day_of_week,
                  period,
                  start_time,
                  end_time,
                  subject_id,
                  teacher_id,
                  room,
                  notes,
                  subject_name,
                  teacher_name,
                  classroom,
                  is_break
                `)
                .eq('class_id', classId)
                .order('period', {
                  ascending: true,
                })
            : Promise.resolve({
                data: [],
                error: null,
              }),

          /* Subjects */
          currentBranchId
            ? supabase
                .from('subjects')
                .select(
                  'id,name,code',
                )
                .eq(
                  'branch_id',
                  currentBranchId,
                )
                .order('name')
            : supabase
                .from('subjects')
                .select(
                  'id,name,code',
                )
                .order('name'),

          /* Teachers */
          currentBranchId
            ? supabase
                .from('teachers')
                .select(
                  'id,first_name,middle_name,last_name',
                )
                .eq(
                  'branch_id',
                  currentBranchId,
                )
            : supabase
                .from('teachers')
                .select(
                  'id,first_name,middle_name,last_name',
                ),

          /* Live announcements table */
          currentBranchId
            ? supabase
                .from('announcements')
                .select(`
                  id,
                  announcement_id,
                  branch_id,
                  title,
                  content,
                  category,
                  priority,
                  target_roles,
                  target_branches,
                  start_date,
                  end_date,
                  is_published,
                  published_at,
                  created_at
                `)
                .eq(
                  'branch_id',
                  currentBranchId,
                )
                .eq(
                  'is_published',
                  true,
                )
                .order('created_at', {
                  ascending: false,
                })
                .limit(30)
            : Promise.resolve({
                data: [],
                error: null,
              }),

          /* Tests */
          supabase
            .from('test_results')
            .select(`
              id,
              branch_id,
              student_id,
              class_id,
              subject_id,
              term,
              session,
              score,
              max_score,
              percentage,
              grade,
              remark,
              created_at
            `)
            .eq(
              'student_id',
              studentData.id,
            )
            .limit(100),

          /* Exams */
          supabase
            .from('exam_results')
            .select(`
              id,
              branch_id,
              student_id,
              class_id,
              subject_id,
              term,
              session,
              score,
              max_score,
              percentage,
              grade,
              remark,
              created_at
            `)
            .eq(
              'student_id',
              studentData.id,
            )
            .limit(100),

          /* CBT */
          supabase
            .from('cbt_results')
            .select(`
              id,
              branch_id,
              student_id,
              class_id,
              subject_id,
              term,
              session,
              score,
              max_score,
              percentage,
              grade,
              remark,
              created_at
            `)
            .eq(
              'student_id',
              studentData.id,
            )
            .limit(100),
        ]);

        /* ------------------------------------------------------------------ */
        /* HANDLE CORE DATA                                                    */
        /* ------------------------------------------------------------------ */

        if (notificationResult.error) {
          console.warn(
            'Notifications:',
            notificationResult.error,
          );
        }

        if (attendanceResult.error) {
          console.warn(
            'Attendance:',
            attendanceResult.error,
          );
        }

        if (timetableResult.error) {
          console.warn(
            'Timetable:',
            timetableResult.error,
          );
        }

        if (subjectsResult.error) {
          console.warn(
            'Subjects:',
            subjectsResult.error,
          );
        }

        if (teachersResult.error) {
          console.warn(
            'Teachers:',
            teachersResult.error,
          );
        }

        if (announcementResult.error) {
          console.warn(
            'Announcements:',
            announcementResult.error,
          );
        }

        setNotifications(
          notificationResult.data || [],
        );

        setAttendance(
          (attendanceResult.data ||
            []) as AttendanceRow[],
        );

        setTimetable(
          (timetableResult.data ||
            []) as TimetableItem[],
        );

        setSubjects(
          (subjectsResult.data ||
            []) as Subject[],
        );

        setTeachers(
          (teachersResult.data ||
            []) as Teacher[],
        );

        /* ------------------------------------------------------------------ */
        /* ANNOUNCEMENTS                                                       */
        /* ------------------------------------------------------------------ */

        const now = dayjs();

        const visibleAnnouncements =
          ((announcementResult.data ||
            []) as Announcement[]).filter(
            announcement => {
              if (!announcement.is_published) {
                return false;
              }

              const starts =
                announcement.start_date
                  ? dayjs(
                      announcement.start_date,
                    )
                  : null;

              const ends =
                announcement.end_date
                  ? dayjs(
                      announcement.end_date,
                    )
                  : null;

              if (
                starts &&
                starts.isValid() &&
                now.isBefore(starts)
              ) {
                return false;
              }

              if (
                ends &&
                ends.isValid() &&
                now.isAfter(ends)
              ) {
                return false;
              }

              /*
               * Branch is already filtered by query.
               *
               * If target_roles is empty/null, announcement
               * is available to all users in the branch.
               *
               * Students are allowed when:
               * - target_roles is empty
               * - target_roles contains student
               * - target_roles contains students
               * - target_roles contains all/everyone
               */
              const roles =
                (announcement.target_roles ||
                  []).map(normalize);

              if (!roles.length) {
                return true;
              }

              return roles.some(role =>
                [
                  'student',
                  'students',
                  'all',
                  'everyone',
                  'school',
                ].includes(role),
              );
            },
          );

        setAnnouncements(
          visibleAnnouncements.slice(0, 6),
        );

        /* ------------------------------------------------------------------ */
        /* RESULTS                                                            */
        /* ------------------------------------------------------------------ */

        const collectedResults: ResultRow[] = [];

        if (!testResult.error) {
          (testResult.data || []).forEach(
            row => {
              collectedResults.push({
                ...(row as Omit<
                  ResultRow,
                  '_type'
                >),
                _type: 'test',
              });
            },
          );
        } else {
          console.warn(
            'Test results:',
            testResult.error,
          );
        }

        if (!examResult.error) {
          (examResult.data || []).forEach(
            row => {
              collectedResults.push({
                ...(row as Omit<
                  ResultRow,
                  '_type'
                >),
                _type: 'exam',
              });
            },
          );
        } else {
          console.warn(
            'Exam results:',
            examResult.error,
          );
        }

        if (!cbtResult.error) {
          (cbtResult.data || []).forEach(
            row => {
              collectedResults.push({
                ...(row as Omit<
                  ResultRow,
                  '_type'
                >),
                _type: 'cbt',
              });
            },
          );
        } else {
          console.warn(
            'CBT results:',
            cbtResult.error,
          );
        }

        /*
         * Only filter when the result actually contains
         * session/term information.
         *
         * This prevents older results with NULL session/term
         * from disappearing from the dashboard.
         */
        const filteredResults =
          collectedResults.filter(row => {
            const matchesSession =
              !sessionName ||
              !row.session ||
              normalize(row.session) ===
                normalize(sessionName);

            const matchesTerm =
              !termName ||
              !row.term ||
              normalize(row.term) ===
                normalize(termName);

            return (
              matchesSession &&
              matchesTerm
            );
          });

        setResults(
          filteredResults.sort((a, b) => {
            const aDate = a.created_at
              ? new Date(a.created_at).getTime()
              : 0;

            const bDate = b.created_at
              ? new Date(b.created_at).getTime()
              : 0;

            return bDate - aDate;
          }),
        );

        loadedRef.current = true;
      } catch (error: any) {
        console.error(
          'Unable to load student dashboard:',
          error,
        );

        toast.error(
          error?.message ||
            'Unable to load dashboard',
        );
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id, user?.email],
  );

  /* ------------------------------------------------------------------------ */
  /* INITIAL LOAD                                                             */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    void load();
  }, [load]);

  /* ------------------------------------------------------------------------ */
  /* MAPS                                                                     */
  /* ------------------------------------------------------------------------ */

  const subjectMap = useMemo(
    () =>
      new Map(
        subjects.map(subject => [
          subject.id,
          subject,
        ]),
      ),
    [subjects],
  );

  const teacherMap = useMemo(
    () =>
      new Map(
        teachers.map(teacher => [
          teacher.id,
          teacher,
        ]),
      ),
    [teachers],
  );

  /* ------------------------------------------------------------------------ */
  /* ATTENDANCE STATS                                                         */
  /* ------------------------------------------------------------------------ */

  const attendanceStats = useMemo(() => {
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      half_day: 0,
    };

    attendance.forEach(record => {
      const status =
        normalize(record.status);

      if (
        status === 'present' ||
        status === 'p'
      ) {
        stats.present++;
      } else if (
        status === 'absent' ||
        status === 'a'
      ) {
        stats.absent++;
      } else if (
        status === 'late' ||
        status === 'l'
      ) {
        stats.late++;
      } else if (
        status === 'excused' ||
        status === 'e'
      ) {
        stats.excused++;
      } else if (
        status === 'half_day' ||
        status === 'half day'
      ) {
        stats.half_day++;
      }
    });

    const total =
      Object.values(stats).reduce(
        (sum, value) => sum + value,
        0,
      );

    /*
     * Late counts as attendance.
     * Half-day counts as 50%.
     */
    const attended =
      stats.present +
      stats.late +
      stats.half_day * 0.5;

    const rate =
      total > 0
        ? (attended / total) * 100
        : 0;

    return {
      ...stats,
      total,
      rate,
    };
  }, [attendance]);

  /* ------------------------------------------------------------------------ */
  /* RESULT STATISTICS                                                        */
  /* ------------------------------------------------------------------------ */

  const scoreValues = useMemo(
    () =>
      results
        .map(result => {
          const percentage =
            result.percentage;

          if (
            percentage !== null &&
            percentage !== undefined &&
            Number.isFinite(
              Number(percentage),
            )
          ) {
            return Number(percentage);
          }

          const score =
            Number(result.score);

          const max =
            Number(result.max_score);

          if (
            Number.isFinite(score) &&
            Number.isFinite(max) &&
            max > 0
          ) {
            return (
              (score / max) *
              100
            );
          }

          return null;
        })
        .filter(
          (
            value,
          ): value is number =>
            value !== null &&
            Number.isFinite(value),
        ),
    [results],
  );

  const average = useMemo(() => {
    if (!scoreValues.length) {
      return 0;
    }

    return (
      scoreValues.reduce(
        (sum, value) => sum + value,
        0,
      ) / scoreValues.length
    );
  }, [scoreValues]);

  const grade = useMemo(() => {
    if (average >= 75) return 'A';
    if (average >= 65) return 'B';
    if (average >= 55) return 'C';
    if (average >= 45) return 'D';
    if (average >= 40) return 'E';

    return 'F';
  }, [average]);

  /* ------------------------------------------------------------------------ */
  /* SUBJECT PERFORMANCE                                                      */
  /* ------------------------------------------------------------------------ */

  const subjectPerformance = useMemo(() => {
    const map = new Map<
      string,
      {
        scores: number[];
        name: string;
      }
    >();

    results.forEach(result => {
      const subjectId =
        result.subject_id;

      if (!subjectId) {
        return;
      }

      const subject =
        subjectMap.get(subjectId);

      const subjectName =
        subject?.name ||
        'Unknown Subject';

      let percentage =
        result.percentage !== null &&
        result.percentage !== undefined
          ? Number(result.percentage)
          : NaN;

      if (
        !Number.isFinite(
          percentage,
        )
      ) {
        const score =
          Number(result.score);

        const max =
          Number(result.max_score);

        if (
          Number.isFinite(score) &&
          Number.isFinite(max) &&
          max > 0
        ) {
          percentage =
            (score / max) * 100;
        }
      }

      if (
        !Number.isFinite(
          percentage,
        )
      ) {
        return;
      }

      if (!map.has(subjectId)) {
        map.set(subjectId, {
          scores: [],
          name: subjectName,
        });
      }

      map
        .get(subjectId)!
        .scores.push(
          percentage,
        );
    });

    return Array.from(
      map.entries(),
    )
      .map(([id, data]) => ({
        id,
        name: data.name,
        average:
          data.scores.reduce(
            (sum, score) =>
              sum + score,
            0,
          ) /
          data.scores.length,
        count: data.scores.length,
      }))
      .sort(
        (a, b) =>
          b.average - a.average,
      );
  }, [results, subjectMap]);

  /* ------------------------------------------------------------------------ */
  /* UNIQUE SUBJECT COUNT                                                     */
  /* ------------------------------------------------------------------------ */

  const uniqueSubjectsCount = useMemo(() => {
    const ids = new Set(
      timetable
        .map(item => item.subject_id)
        .filter(Boolean),
    );

    /*
     * Some timetable records may use
     * subject_name without subject_id.
     *
     * Fall back to the timetable subject names
     * so the dashboard still reports a useful count.
     */
    if (ids.size === 0) {
      const names = new Set(
        timetable
          .map(item =>
            normalize(
              item.subject_name,
            ),
          )
          .filter(Boolean),
      );

      return names.size;
    }

    return ids.size;
  }, [timetable]);

  /* ------------------------------------------------------------------------ */
  /* REAL WEEKLY ATTENDANCE TREND                                             */
  /* ------------------------------------------------------------------------ */

  const weeklyAttendance = useMemo(() => {
    const days = [
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
    ];

    const result = days.map(day => {
      const records =
        attendance.filter(record => {
          if (!record.created_at) {
            return false;
          }

          const date =
            dayjs(record.created_at);

          return (
            date.format('ddd') === day
          );
        });

      if (!records.length) {
        return 0;
      }

      let attended = 0;

      records.forEach(record => {
        const status =
          normalize(record.status);

        if (
          ['present', 'p'].includes(
            status,
          )
        ) {
          attended += 1;
        } else if (
          ['late', 'l'].includes(
            status,
          )
        ) {
          attended += 1;
        } else if (
          ['half_day', 'half day'].includes(
            status,
          )
        ) {
          attended += 0.5;
        }
      });

      return Math.round(
        (attended /
          records.length) *
          100,
      );
    });

    return result;
  }, [attendance]);

  /* ------------------------------------------------------------------------ */
  /* FEE STATISTICS                                                           */
  /* ------------------------------------------------------------------------ */

  const paymentStats = useMemo(() => {
    let due = 0;
    let paid = 0;
    let balance = 0;
    let overdue = 0;

    assignments.forEach(
      (assignment: any) => {
        due +=
          Number(
            assignment.amount_due,
          ) || 0;

        paid +=
          Number(
            assignment.amount_paid,
          ) || 0;

        balance +=
          Number(
            assignment.balance,
          ) || 0;

        if (
          normalize(
            assignment.payment_status,
          ) === 'overdue'
        ) {
          overdue++;
        }
      },
    );

    return {
      due,
      paid,
      balance,
      overdue,
      progress:
        due > 0
          ? Math.min(
              100,
              (paid / due) * 100,
            )
          : 0,
    };
  }, [assignments]);

  /* ------------------------------------------------------------------------ */
  /* REFRESH                                                                  */
  /* ------------------------------------------------------------------------ */

  const refresh = useCallback(() => {
    void load(true);
  }, [load]);

  /* ------------------------------------------------------------------------ */
  /* LOADING                                                                  */
  /* ------------------------------------------------------------------------ */

  if (
    loading ||
    paymentLoading
  ) {
    return (
      <StudentDashboardSkeleton />
    );
  }

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-6 pb-8 overflow-x-hidden">

      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                             */}
      {/* ------------------------------------------------------------------ */}

      <motion.section
        initial={{
          opacity: 0,
          y: -12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 sm:p-6 text-white shadow-lg"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-white/20 flex items-center justify-center text-lg sm:text-2xl font-bold shrink-0 overflow-hidden">
              {student?.passport_url ? (
                <img
                  src={student.passport_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  {student?.first_name?.[0]}
                  {student?.last_name?.[0]}
                </>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-xs text-blue-100">
                Student Portal
              </p>

              <h1 className="text-xl sm:text-2xl font-bold truncate">
                Welcome,{' '}
                {student?.first_name ||
                  'Student'}
              </h1>

              <p className="text-xs sm:text-sm text-blue-100 truncate">
                {student?.class_name ||
                  'Class not assigned'}
                {' • '}
                {student?.student_id ||
                  student?.admission_number ||
                  'Student'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={refresh}
              disabled={refreshing}
              className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center gap-2 disabled:opacity-60"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  refreshing
                    ? 'animate-spin'
                    : ''
                }`}
              />
              Refresh
            </button>

            <button
              onClick={() =>
                navigate(
                  '/student/paybill',
                )
              }
              className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              Pay Bill
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">

          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[10px] text-blue-100">
              Academic Session
            </p>

            <p className="font-bold text-sm">
              {academicSession?.session_name ||
                'Not set'}
            </p>

            <p className="text-[10px] text-blue-100">
              {academicSession?.term_name ||
                'Term not set'}
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[10px] text-blue-100">
              Today
            </p>

            <p className="font-bold text-sm">
              {dayjs().format(
                'ddd, DD MMM',
              )}
            </p>

            <p className="text-[10px] text-blue-100">
              {dayjs().format('YYYY')}
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[10px] text-blue-100">
              Average Score
            </p>

            <p className="font-bold text-lg">
              {Math.round(average)}%
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[10px] text-blue-100">
              Attendance
            </p>

            <p className="font-bold text-lg">
              {Math.round(
                attendanceStats.rate,
              )}
              %
            </p>
          </div>
        </div>
      </motion.section>

      {/* ------------------------------------------------------------------ */}
      {/* TWO COLUMN LAYOUT                                                  */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* ================================================================ */}
        {/* LEFT COLUMN                                                       */}
        {/* ================================================================ */}

        <div className="lg:col-span-2 space-y-4 sm:space-y-6">

          {/* TIMETABLE */}

          <TimetableWidget
            timetable={timetable}
            subjects={subjects}
            teachers={teachers}
            studentClass={studentClass}
            onRefresh={refresh}
            refreshing={refreshing}
          />

          {/* PERFORMANCE */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5">

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  Subject Performance
                </h3>

                <button
                  onClick={() =>
                    navigate(
                      '/student/results/summary',
                    )
                  }
                  className="text-xs text-indigo-600"
                >
                  View all
                </button>
              </div>

              {subjectPerformance.length ===
              0 ? (
                <div className="py-8 text-center">
                  <FileText className="w-8 h-8 mx-auto text-gray-300" />

                  <p className="mt-2 text-sm text-gray-500">
                    No results available yet
                  </p>

                  <p className="text-xs text-gray-400">
                    Results will appear here once published
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subjectPerformance
                    .slice(0, 5)
                    .map(subject => (
                      <div
                        key={
                          subject.id
                        }
                      >
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                            {
                              subject.name
                            }
                          </span>

                          <span className="text-gray-500">
                            {Math.round(
                              subject.average,
                            )}
                            %
                          </span>
                        </div>

                        <ProgressBar
                          value={
                            subject.average
                          }
                          color={
                            subject.average >=
                            70
                              ? 'bg-green-500'
                              : subject.average >=
                                50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }
                        />
                      </div>
                    ))}
                </div>
              )}
            </section>

            {/* REAL ATTENDANCE TREND */}

            <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5">

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white">
                  <LineChart className="w-4 h-4 text-blue-500" />
                  Attendance Trend
                </h3>

                <span className="text-xs text-gray-500">
                  Recorded days
                </span>
              </div>

              <div className="h-24">
                <MiniLineChart
                  data={
                    weeklyAttendance
                  }
                />
              </div>

              <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                {[
                  'Mon',
                  'Tue',
                  'Wed',
                  'Thu',
                  'Fri',
                ].map(
                  (
                    day,
                    index,
                  ) => (
                    <span
                      key={day}
                    >
                      {day}{' '}
                      {weeklyAttendance[
                        index
                      ] || 0}
                      %
                    </span>
                  ),
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Current rate
                </span>

                <span className="font-bold text-green-600">
                  {Math.round(
                    attendanceStats.rate,
                  )}
                  %
                </span>
              </div>
            </section>
          </div>

          {/* STUDENT PROFILE */}

          <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">

            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <User className="w-5 h-5 text-blue-500" />

              <h2 className="font-bold text-sm text-gray-900 dark:text-white">
                Student Profile
              </h2>
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">
                  Full Name
                </p>

                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {student?.first_name}{' '}
                  {student?.middle_name
                    ? `${student.middle_name} `
                    : ''}
                  {student?.last_name}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">
                  Admission Number
                </p>

                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {student?.admission_number ||
                    'N/A'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">
                  Class
                </p>

                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {student?.class_name ||
                    'Not Assigned'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">
                  Email
                </p>

                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {student?.email ||
                    user?.email ||
                    'N/A'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">
                  Phone
                </p>

                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {student?.phone_number ||
                    'N/A'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">
                  Status
                </p>

                <p
                  className={`inline-flex mt-1 px-2 py-1 rounded-lg text-xs font-medium ${statusClass(
                    student?.current_status ||
                      'active',
                  )}`}
                >
                  {student?.current_status ||
                    'Active'}
                </p>
              </div>
            </div>
          </section>

          {/* ANNOUNCEMENTS */}

          <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">

            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">

              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-amber-600" />
                </span>

                <div>
                  <h2 className="font-bold text-sm text-gray-900 dark:text-white">
                    School Announcements
                  </h2>

                  <p className="text-[11px] text-gray-500">
                    Latest updates from your school
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  navigate(
                    '/student/notifications',
                  )
                }
                className="text-xs font-semibold text-indigo-600 flex items-center gap-1"
              >
                View all
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4">

              {announcements.length ===
              0 ? (
                <div className="py-6 text-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700">

                  <Megaphone className="w-8 h-8 mx-auto text-gray-300" />

                  <p className="mt-2 text-sm text-gray-500">
                    No new announcements
                  </p>

                  <p className="text-xs text-gray-400">
                    You're up to date
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {announcements
                    .slice(0, 3)
                    .map(
                      announcement => (
                        <div
                          key={
                            announcement.id
                          }
                          className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700"
                        >
                          <div className="flex justify-between gap-2">

                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                {
                                  announcement.title
                                }
                              </h3>

                              {announcement.category && (
                                <span className="text-[9px] uppercase tracking-wide text-indigo-500">
                                  {
                                    announcement.category
                                  }
                                </span>
                              )}
                            </div>

                            <span className="text-[10px] text-gray-400 shrink-0">
                              {dayjs(
                                announcement.created_at,
                              ).fromNow()}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {
                              announcement.content
                            }
                          </p>
                        </div>
                      ),
                    )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ================================================================ */}
        {/* RIGHT COLUMN                                                      */}
        {/* ================================================================ */}

        <div className="space-y-4 sm:space-y-6">

          {/* QUICK STATS */}

          <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5">

            <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white mb-4">
              <Activity className="w-4 h-4 text-purple-500" />
              Quick Stats
            </h3>

            <div className="space-y-3">

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-500" />

                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    Current Grade
                  </span>
                </div>

                <span className="text-lg font-bold text-indigo-600">
                  {results.length
                    ? grade
                    : 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />

                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    Days Present
                  </span>
                </div>

                <span className="text-lg font-bold text-blue-600">
                  {
                    attendanceStats.present
                  }
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />

                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    Average Score
                  </span>
                </div>

                <span className="text-lg font-bold text-amber-600">
                  {Math.round(
                    average,
                  )}
                  %
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-green-500" />

                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    Subjects
                  </span>
                </div>

                <span className="text-lg font-bold text-green-600">
                  {
                    uniqueSubjectsCount
                  }
                </span>
              </div>
            </div>
          </section>

          {/* ATTENDANCE */}

          <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5">

            <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white mb-4">
              <PieChart className="w-4 h-4 text-green-500" />
              Attendance Overview
            </h3>

            <div className="flex items-center gap-6">

              <DonutChart
                data={[
                  {
                    label: 'Present',
                    value:
                      attendanceStats.present,
                    color:
                      '#22c55e',
                  },
                  {
                    label: 'Absent',
                    value:
                      attendanceStats.absent,
                    color:
                      '#ef4444',
                  },
                  {
                    label: 'Late',
                    value:
                      attendanceStats.late,
                    color:
                      '#eab308',
                  },
                  {
                    label: 'Excused',
                    value:
                      attendanceStats.excused,
                    color:
                      '#3b82f6',
                  },
                ]}
                size={120}
              />

              <div className="space-y-1 text-xs flex-1">
                {[
                  [
                    'Present',
                    attendanceStats.present,
                    '#22c55e',
                  ],
                  [
                    'Absent',
                    attendanceStats.absent,
                    '#ef4444',
                  ],
                  [
                    'Late',
                    attendanceStats.late,
                    '#eab308',
                  ],
                  [
                    'Excused',
                    attendanceStats.excused,
                    '#3b82f6',
                  ],
                ].map(
                  ([
                    label,
                    value,
                    color,
                  ]) => (
                    <div
                      key={
                        String(
                          label,
                        )
                      }
                      className="flex items-center gap-2"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            color as string,
                        }}
                      />

                      <span className="text-gray-600 dark:text-gray-300">
                        {
                          label
                        }
                      </span>

                      <span className="font-medium text-gray-900 dark:text-white ml-auto">
                        {
                          value
                        }
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between text-xs">
              <span className="text-gray-500">
                Total Records
              </span>

              <span className="font-bold text-gray-900 dark:text-white">
                {
                  attendanceStats.total
                }
              </span>
            </div>
          </section>

          {/* FEE SUMMARY */}

          <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5">

            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white">
                <Wallet className="w-4 h-4 text-green-500" />
                Fee Summary
              </h3>

              <button
                onClick={() =>
                  navigate(
                    '/student/paybill',
                  )
                }
                className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-colors"
              >
                Pay Now
              </button>
            </div>

            <div className="mb-3">

              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>
                  Payment Progress
                </span>

                <span>
                  {Math.round(
                    paymentStats.progress,
                  )}
                  %
                </span>
              </div>

              <ProgressBar
                value={
                  paymentStats.progress
                }
                color="bg-gradient-to-r from-blue-500 to-indigo-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">

              <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">
                  Total Due
                </p>

                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {money(
                    paymentStats.due,
                  )}
                </p>
              </div>

              <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">
                  Paid
                </p>

                <p className="text-sm font-bold text-green-600">
                  {money(
                    paymentStats.paid,
                  )}
                </p>
              </div>

              <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">
                  Balance
                </p>

                <p className="text-sm font-bold text-red-600">
                  {money(
                    paymentStats.balance,
                  )}
                </p>
              </div>
            </div>

            {paymentStats.overdue >
              0 && (
              <div className="mt-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400">
                {paymentStats.overdue}{' '}
                overdue fee assignment
                {paymentStats.overdue !==
                1
                  ? 's'
                  : ''}
              </div>
            )}
          </section>

          {/* NOTIFICATIONS */}

          <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5">

            <div className="flex items-center justify-between mb-3">

              <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white">
                <Bell className="w-4 h-4 text-yellow-500" />

                Notifications

                {notifications.length >
                  0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px]">
                    {
                      notifications.length
                    }
                  </span>
                )}
              </h3>

              <button
                onClick={() =>
                  navigate(
                    '/student/notifications',
                  )
                }
                className="text-xs text-indigo-600"
              >
                View all
              </button>
            </div>

            {notifications.length ===
            0 ? (
              <div className="py-4 text-center">
                <Info className="w-6 h-6 mx-auto text-gray-300" />

                <p className="text-xs text-gray-500 mt-1">
                  No new notifications
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications
                  .slice(0, 3)
                  .map(
                    notification => {
                      const Icon =
                        statusIcon(
                          notification.priority ||
                            'pending',
                        );

                      return (
                        <div
                          key={
                            notification.id
                          }
                          className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/30"
                        >
                          <div className="flex items-start gap-2">
                            <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-500" />

                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 dark:text-white">
                                {notification.title ||
                                  'Notification'}
                              </p>

                              <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                                {
                                  notification.message
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
              </div>
            )}
          </section>

          {/* QUICK ACTIONS */}

          <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5">

            <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white mb-3">
              <Zap className="w-4 h-4 text-yellow-500" />
              Quick Actions
            </h3>

            <div className="grid grid-cols-2 gap-2">

              {[
                [
                  'Pay Bill',
                  '/student/paybill',
                  Wallet,
                  'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
                ],
                [
                  'Results',
                  '/student/results/summary',
                  GraduationCap,
                  'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
                ],
                [
                  'Attendance',
                  '/student/attendance',
                  CalendarDays,
                  'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
                ],
                [
                  'Timetable',
                  '/student/timetable',
                  Calendar,
                  'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
                ],
                [
                  'Profile',
                  '/student/profile',
                  User,
                  'bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400',
                ],
                [
                  'Support',
                  '/student/support',
                  MessageSquare,
                  'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
                ],
              ].map(
                ([
                  label,
                  path,
                  Icon,
                  bg,
                ]) => {
                  const ActionIcon =
                    Icon as React.ElementType;

                  return (
                    <button
                      key={
                        String(
                          label,
                        )
                      }
                      onClick={() =>
                        navigate(
                          String(
                            path,
                          ),
                        )
                      }
                      className={`p-3 rounded-xl ${String(
                        bg,
                      )} flex flex-col items-center gap-1 transition-all hover:scale-105`}
                    >
                      <ActionIcon className="w-5 h-5" />

                      <span className="text-[10px] font-medium">
                        {
                          label
                        }
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;