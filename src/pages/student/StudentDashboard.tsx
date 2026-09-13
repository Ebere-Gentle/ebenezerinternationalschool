import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  Info,
  LineChart,
  Mail,
  MapPin,
  Megaphone,
  MessageSquare,
  PieChart,
  RefreshCw,
  School,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User,
  Users,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import { StudentDashboardSkeleton } from '../../components/common/LoadingSpinner';
import { usePaymentData } from '../../hooks/usePaymentData';
import { TimetableWidget } from '../../components/tutorial/student/TimetableWidget';

dayjs.extend(relativeTime);

type AcademicSession = {
  id: string;
  session_name: string;
  term_name: string;
  term_number?: number;
  start_date?: string | null;
  end_date?: string | null;
};

type StudentClass = {
  id: string;
  name: string;
  code?: string | null;
  level?: string | null;
  department?: string | null;
  class_teacher_id?: string | null;
};

type TimetableItem = {
  id: string;
  day: string;
  day_of_week?: string;
  period: number;
  start_time: string;
  end_time: string;
  subject_id: string | null;
  teacher_id: string | null;
  room: string | null;
  notes: string | null;
  subject_name?: string | null;
  teacher_name?: string | null;
  classroom?: string | null;
  is_break?: boolean;
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
  student_id: string;
  session_id?: string;
  status: string;
  attendance_date?: string;
  check_in_at?: string | null;
  check_out_at?: string | null;
  remarks?: string | null;
  created_at?: string;
};

type Notice = {
  id: string;
  branch_id: string | null;
  reference_no: string;
  title: string;
  category: string;
  summary: string;
  content: string | null;
  issued_by: string;
  issue_date: string;
  effective_date: string | null;
  is_official_gazette: boolean;
  status: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
};

type NoticeRead = {
  id: string;
  notice_id: string;
  user_id: string;
  read_at: string;
};

type Announcement = {
  id: string;
  announcement_id: string;
  branch_id: string | null;
  title: string;
  content: string;
  category: string | null;
  priority: string | null;
  target_roles?: string[] | null;
  target_branches?: string[] | null;
  start_date: string | null;
  end_date: string | null;
  is_published: boolean | null;
  published_at: string | null;
  created_at: string;
};

type Broadcast = {
  id: string;
  title: string;
  message: string;
  channel: string;
  audience_type: string;
  target_class_id: string | null;
  target_student_id: string | null;
  target_role: string | null;
  status: string;
  created_at: string;
};

type SchoolEvent = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  status: string;
  audience_type: string;
  class_id: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  venue: string | null;
  registration_required: boolean;
  registration_deadline: string | null;
};

type NotificationRow = {
  id: string;
  notification_id: string;
  user_id: string | null;
  student_id: string | null;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean | null;
  read_at: string | null;
  created_at: string | null;
  priority?: string | null;
  type?: string;
};

type ResultSummary = {
  id: string;
  student_id: string;
  class_id: string;
  term: string;
  session: string;
  total_subjects: number;
  total_score: number;
  total_max_score: number;
  average_percentage: number;
  grade: string;
  position: number | null;
  remark: string | null;
  published: boolean;
  published_at: string | null;
  generated_at: string;
  teacher_comment: string | null;
  principal_comment: string | null;
  director_comment: string | null;
  promotion_status: string | null;
  fees_cleared: boolean | null;
};

type ResultEntry = {
  id: string;
  batch_id: string;
  student_id: string;
  score: number;
  percentage: number | null;
  grade: string | null;
  remark: string | null;
  position: number | null;
  teacher_comment: string | null;
};

type ResultBatch = {
  id: string;
  subject_id: string;
  class_id: string;
  assessment_type: string;
  title: string;
  max_score: number;
  weight: number;
  assessment_date: string | null;
  status: string;
  published_at: string | null;
};

type JambSubject = {
  id: string;
  name: string;
  code: string | null;
  is_compulsory: boolean;
  is_active: boolean;
  sort_order: number;
};

type JambRegistration = {
  id: string;
  student_id: string;
  academic_session_id: string | null;
  session_name: string;
  status: string;
  registered_at: string;
  locked_at: string | null;
};

type JambRegistrationSubject = {
  id: string;
  registration_id: string;
  subject_id: string;
  is_compulsory: boolean;
};

type JambAttempt = {
  id: string;
  registration_id: string;
  subject_id: string;
  question_count: number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  score: number;
  duration_seconds: number;
  started_at: string;
  submitted_at: string | null;
  status: string;
  topic_breakdown: Record<string, unknown>;
};

type PaymentRow = {
  id: string;
  payment_id: string;
  receipt_number: string;
  amount: number;
  amount_paid: number;
  balance: number | null;
  payment_method: string;
  payment_date: string | null;
  due_date: string | null;
  status: string | null;
  transaction_reference: string | null;
  payment_status?: string | null;
  academic_session?: string | null;
  academic_term?: string | null;
};

type CalendarEvent = {
  id: string;
  event_name: string;
  event_type: string | null;
  start_date: string;
  end_date: string | null;
  description: string | null;
  is_holiday: boolean | null;
};

const normalize = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const money = (value: unknown) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const getInitials = (first?: string, last?: string) =>
  `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || 'ST';

const gradeFromScore = (score: number) => {
  if (score >= 75) return 'A';
  if (score >= 65) return 'B';
  if (score >= 55) return 'C';
  if (score >= 45) return 'D';
  if (score >= 40) return 'E';
  return 'F';
};

const gradeTone = (grade: string) => {
  const g = normalize(grade);

  if (g === 'a') {
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  }

  if (g === 'b') {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  }

  if (g === 'c') {
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  }

  if (['d', 'e'].includes(g)) {
    return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
  }

  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
};

const statusClass = (status: string) => {
  const value = normalize(status);

  if (
    ['paid', 'completed', 'approved', 'present', 'published', 'active'].includes(
      value,
    )
  ) {
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  }

  if (
    ['pending', 'processing', 'late', 'scheduled', 'draft'].includes(value)
  ) {
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  }

  if (
    ['overdue', 'absent', 'failed', 'rejected', 'cancelled', 'inactive'].includes(
      value,
    )
  ) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  }

  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
};

const ProgressBar: React.FC<{
  value: number;
  color?: string;
  label?: string;
}> = ({ value, color = 'bg-indigo-500', label }) => (
  <div className="w-full">
    {label && (
      <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
    )}

    <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
        }}
      />
    </div>
  </div>
);

const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  helper?: string;
  tone?: string;
  onClick?: () => void;
}> = ({ icon: Icon, label, value, helper, tone = 'text-indigo-500', onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all dark:border-gray-700 dark:bg-gray-800 ${
      onClick ? 'hover:-translate-y-0.5 hover:shadow-md' : ''
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900/40 ${tone}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      {onClick && <ArrowUpRight className="h-4 w-4 text-gray-300" />}
    </div>

    <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">{label}</p>

    <p className="mt-1 truncate text-xl font-semibold text-gray-900 dark:text-white">
      {value}
    </p>

    {helper && (
      <p className="mt-1 truncate text-[10px] text-gray-400">{helper}</p>
    )}
  </button>
);

const SectionHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon: Icon, title, subtitle, actionLabel, onAction }) => (
  <div className="mb-4 flex items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>

        {subtitle && (
          <p className="truncate text-[10px] text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>

    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="flex shrink-0 items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
      >
        {actionLabel}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  text: string;
}> = ({ icon: Icon, title, text }) => (
  <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center dark:border-gray-700">
    <Icon className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{title}</p>
    <p className="mt-1 text-[11px] text-gray-400">{text}</p>
  </div>
);

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadingRef = useRef(false);
  const loadedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [student, setStudent] = useState<any>(null);
  const [studentClass, setStudentClass] = useState<StudentClass | null>(null);
  const [academicSession, setAcademicSession] =
    useState<AcademicSession | null>(null);

  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticeReads, setNoticeReads] = useState<NoticeRead[]>([]);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  const [resultSummary, setResultSummary] =
    useState<ResultSummary | null>(null);
  const [resultEntries, setResultEntries] = useState<ResultEntry[]>([]);
  const [resultBatches, setResultBatches] = useState<ResultBatch[]>([]);

  const [jambRegistration, setJambRegistration] =
    useState<JambRegistration | null>(null);
  const [jambSubjects, setJambSubjects] = useState<JambSubject[]>([]);
  const [registeredJambSubjects, setRegisteredJambSubjects] =
    useState<JambRegistrationSubject[]>([]);
  const [jambAttempts, setJambAttempts] = useState<JambAttempt[]>([]);
  const [jambQuestionCount, setJambQuestionCount] = useState(0);

  const [studentId, setStudentId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);

  const { assignments = [], loading: paymentLoading } = usePaymentData(
    studentId,
    branchId,
    {
      autoFetch: Boolean(studentId && branchId),
    },
  );

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
        let studentQuery = await supabase
          .from('students')
          .select(
            `
              *,
              class:class_id(
                id,
                name,
                code,
                level,
                department,
                class_teacher_id
              )
            `,
          )
          .eq('user_id', user.id)
          .maybeSingle();

        if (studentQuery.error) {
          throw studentQuery.error;
        }

        let s = studentQuery.data;

        if (!s && user.email) {
          const fallback = await supabase
            .from('students')
            .select(
              `
                *,
                class:class_id(
                  id,
                  name,
                  code,
                  level,
                  department,
                  class_teacher_id
                )
              `,
            )
            .eq('email', user.email)
            .maybeSingle();

          if (fallback.error) {
            throw fallback.error;
          }

          s = fallback.data;
        }

        if (!s) {
          throw new Error(
            'Student profile not found. Please contact administration.',
          );
        }

        const classId = s.class_id || s.class?.id || null;
        const bId = s.branch_id || null;

        const currentClass: StudentClass | null = s.class
          ? {
              id: s.class.id,
              name: s.class.name,
              code: s.class.code,
              level: s.class.level,
              department: s.class.department,
              class_teacher_id: s.class.class_teacher_id,
            }
          : null;

        setStudent({
          ...s,
          class_name: currentClass?.name || 'Not Assigned',
          class_id: classId,
        });

        setStudentClass(currentClass);
        setStudentId(s.id);
        setBranchId(bId);

        const sessionQuery = supabase
          .from('academic_sessions')
          .select(
            'id,session_name,term_name,term_number,start_date,end_date',
          )
          .eq('is_current', true)
          .order('start_date', { ascending: false })
          .limit(1);

        const sessionResult = bId
          ? await sessionQuery.eq('branch_id', bId).maybeSingle()
          : await sessionQuery.maybeSingle();

        if (sessionResult.error) {
          console.warn('Academic session:', sessionResult.error);
        }

        const currentSession = sessionResult.data || null;
        setAcademicSession(currentSession);

        const [
          paymentsResult,
          notificationsResult,
          attendanceResult,
          timetableResult,
          subjectsResult,
          teachersResult,
          noticesResult,
          noticeReadsResult,
          announcementsResult,
          broadcastsResult,
          eventsResult,
          calendarResult,
          summaryResult,
          jambRegistrationResult,
        ] = await Promise.all([
          supabase
            .from('payments')
            .select(
              `
                id,
                payment_id,
                receipt_number,
                amount,
                amount_paid,
                balance,
                payment_method,
                payment_date,
                due_date,
                status,
                transaction_reference,
                payment_status,
                academic_session,
                academic_term
              `,
            )
            .eq('student_id', s.id)
            .order('payment_date', { ascending: false })
            .limit(20),

          supabase
            .from('notifications')
            .select(
              `
                id,
                notification_id,
                user_id,
                student_id,
                title,
                message,
                link,
                is_read,
                read_at,
                created_at,
                priority,
                type
              `,
            )
            .eq('is_read', false)
            .or(`student_id.eq.${s.id},user_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(10),

          supabase
            .from('attendance_records')
            .select(
              `
                id,
                student_id,
                session_id,
                status,
                attendance_date,
                check_in_at,
                check_out_at,
                remarks,
                created_at
              `,
            )
            .eq('student_id', s.id)
            .order('created_at', { ascending: false })
            .limit(120),

          classId
            ? supabase
                .from('timetables')
                .select(
                  `
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
                  `,
                )
                .eq('class_id', classId)
                .order('period', { ascending: true })
            : Promise.resolve({ data: [], error: null }),

          bId
            ? supabase
                .from('subjects')
                .select('id,name,code')
                .eq('branch_id', bId)
                .order('name')
            : supabase
                .from('subjects')
                .select('id,name,code')
                .order('name'),

          bId
            ? supabase
                .from('teachers')
                .select('id,first_name,middle_name,last_name')
                .eq('branch_id', bId)
                .order('last_name')
            : supabase
                .from('teachers')
                .select('id,first_name,middle_name,last_name')
                .order('last_name'),

          supabase
            .from('notices')
            .select(
              `
                id,
                branch_id,
                reference_no,
                title,
                category,
                summary,
                content,
                issued_by,
                issue_date,
                effective_date,
                is_official_gazette,
                status,
                attachment_url,
                attachment_name,
                created_at
              `,
            )
            .eq('status', 'published')
            .or(bId ? `branch_id.eq.${bId},branch_id.is.null` : 'branch_id.is.null')
            .order('issue_date', { ascending: false })
            .limit(12),

          supabase
            .from('notice_reads')
            .select('id,notice_id,user_id,read_at')
            .eq('user_id', user.id),

          supabase
            .from('announcements')
            .select(
              `
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
              `,
            )
            .eq('is_published', true)
            .order('published_at', { ascending: false })
            .limit(20),

          bId
            ? supabase
                .from('broadcasts')
                .select(
                  `
                    id,
                    title,
                    message,
                    channel,
                    audience_type,
                    target_class_id,
                    target_student_id,
                    target_role,
                    status,
                    created_at
                  `,
                )
                .eq('branch_id', bId)
                .order('created_at', { ascending: false })
                .limit(30)
            : Promise.resolve({ data: [], error: null }),

          bId
            ? supabase
                .from('school_events')
                .select(
                  `
                    id,
                    title,
                    description,
                    event_type,
                    status,
                    audience_type,
                    class_id,
                    start_at,
                    end_at,
                    all_day,
                    venue,
                    registration_required,
                    registration_deadline
                  `,
                )
                .eq('branch_id', bId)
                .order('start_at', { ascending: true })
                .limit(20)
            : Promise.resolve({ data: [], error: null }),

          bId
            ? supabase
                .from('academic_calendar')
                .select(
                  `
                    id,
                    event_name,
                    event_type,
                    start_date,
                    end_date,
                    description,
                    is_holiday
                  `,
                )
                .eq('branch_id', bId)
                .order('start_date', { ascending: true })
                .limit(20)
            : Promise.resolve({ data: [], error: null }),

          currentSession
            ? supabase
                .from('result_summaries')
                .select(
                  `
                    id,
                    student_id,
                    class_id,
                    term,
                    session,
                    total_subjects,
                    total_score,
                    total_max_score,
                    average_percentage,
                    grade,
                    position,
                    remark,
                    published,
                    published_at,
                    generated_at,
                    teacher_comment,
                    principal_comment,
                    director_comment,
                    promotion_status,
                    fees_cleared
                  `,
                )
                .eq('student_id', s.id)
                .eq('session', currentSession.session_name)
                .eq('term', currentSession.term_name)
                .eq('published', true)
                .order('generated_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),

          supabase
            .from('jamb_registrations')
            .select(
              `
                id,
                student_id,
                academic_session_id,
                session_name,
                status,
                registered_at,
                locked_at
              `,
            )
            .eq('student_id', s.id)
            .order('registered_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (paymentsResult.error) {
          console.warn('Payments:', paymentsResult.error);
        }

        if (notificationsResult.error) {
          console.warn('Notifications:', notificationsResult.error);
        }

        setPayments((paymentsResult.data || []) as PaymentRow[]);
        setNotifications(
          (notificationsResult.data || []) as NotificationRow[],
        );
        setAttendance(
          (attendanceResult.data || []) as AttendanceRow[],
        );
        setTimetable(
          (timetableResult.data || []) as TimetableItem[],
        );
        setSubjects((subjectsResult.data || []) as Subject[]);
        setTeachers((teachersResult.data || []) as Teacher[]);
        setNotices((noticesResult.data || []) as Notice[]);
        setNoticeReads((noticeReadsResult.data || []) as NoticeRead[]);

        const allAnnouncements = (announcementsResult.data ||
          []) as Announcement[];

        const visibleAnnouncements = allAnnouncements.filter((item) => {
          if (item.branch_id && item.branch_id !== bId) {
            return false;
          }

          if (
            item.target_branches?.length &&
            bId &&
            !item.target_branches.includes(bId)
          ) {
            return false;
          }

          const now = dayjs();

          if (item.start_date && now.isBefore(dayjs(item.start_date))) {
            return false;
          }

          if (item.end_date && now.isAfter(dayjs(item.end_date))) {
            return false;
          }

          if (!item.target_roles?.length) {
            return true;
          }

          return (
            item.target_roles.includes('student') ||
            item.target_roles.includes('students')
          );
        });

        setAnnouncements(visibleAnnouncements.slice(0, 8));

        const broadcastRows = (broadcastsResult.data ||
          []) as Broadcast[];

        const visibleBroadcasts = broadcastRows.filter((item) => {
          const status = normalize(item.status);

          if (
            ['cancelled', 'failed', 'draft', 'scheduled'].includes(status)
          ) {
            return false;
          }

          if (
            item.target_student_id &&
            item.target_student_id !== s.id
          ) {
            return false;
          }

          if (
            item.target_class_id &&
            item.target_class_id !== classId
          ) {
            return false;
          }

          if (
            normalize(item.audience_type) === 'class' &&
            item.target_class_id !== classId
          ) {
            return false;
          }

          return true;
        });

        setBroadcasts(visibleBroadcasts.slice(0, 8));
        setEvents((eventsResult.data || []) as SchoolEvent[]);
        setCalendarEvents(
          (calendarResult.data || []) as CalendarEvent[],
        );
        setResultSummary(
          (summaryResult.data || null) as ResultSummary | null,
        );

        if (summaryResult.error) {
          console.warn('Result summary:', summaryResult.error);
        }

        if (summaryResult.data?.id) {
          const [entryResult, batchResult] = await Promise.all([
            supabase
              .from('result_entries')
              .select(
                `
                  id,
                  batch_id,
                  student_id,
                  score,
                  percentage,
                  grade,
                  remark,
                  position,
                  teacher_comment
                `,
              )
              .eq('student_id', s.id)
              .limit(100),

            supabase
              .from('result_batches')
              .select(
                `
                  id,
                  subject_id,
                  class_id,
                  assessment_type,
                  title,
                  max_score,
                  weight,
                  assessment_date,
                  status,
                  published_at
                `,
              )
              .eq('class_id', classId)
              .order('assessment_date', { ascending: false })
              .limit(150),
          ]);

          if (!entryResult.error) {
            setResultEntries((entryResult.data || []) as ResultEntry[]);
          }

          if (!batchResult.error) {
            setResultBatches((batchResult.data || []) as ResultBatch[]);
          }
        } else {
          setResultEntries([]);
          setResultBatches([]);
        }

        /*
         * JAMB / CBT data
         *
         * The dashboard does not create a new CBT schema. It uses the
         * existing JAMB registration, subject, attempt and question tables.
         */
        const jambRegistration =
          (jambRegistrationResult.data || null) as JambRegistration | null;

        setJambRegistration(jambRegistration);

        if (jambRegistration) {
          const [registrationSubjectsResult, attemptsResult] =
            await Promise.all([
              supabase
                .from('jamb_registration_subjects')
                .select(
                  'id,registration_id,subject_id,is_compulsory',
                )
                .eq('registration_id', jambRegistration.id),

              supabase
                .from('jamb_attempts')
                .select(
                  `
                    id,
                    registration_id,
                    subject_id,
                    question_count,
                    correct_count,
                    wrong_count,
                    unanswered_count,
                    score,
                    duration_seconds,
                    started_at,
                    submitted_at,
                    status,
                    topic_breakdown
                  `,
                )
                .eq('registration_id', jambRegistration.id)
                .order('started_at', { ascending: false })
                .limit(50),
            ]);

          setRegisteredJambSubjects(
            (registrationSubjectsResult.data ||
              []) as JambRegistrationSubject[],
          );

          setJambAttempts(
            (attemptsResult.data || []) as JambAttempt[],
          );

          const subjectRows = await supabase
            .from('jamb_subjects')
            .select(
              'id,name,code,is_compulsory,is_active,sort_order',
            )
            .eq('is_active', true)
            .order('sort_order');

          setJambSubjects((subjectRows.data || []) as JambSubject[]);

          const subjectIds = (
            registrationSubjectsResult.data || []
          ).map((row: any) => row.subject_id);

          if (subjectIds.length) {
            const questionCountResult = await supabase
              .from('jamb_questions')
              .select('id', { count: 'exact', head: true })
              .eq('is_active', true)
              .in('subject_id', subjectIds);

            setJambQuestionCount(questionCountResult.count || 0);
          } else {
            setJambQuestionCount(0);
          }
        } else {
          setRegisteredJambSubjects([]);
          setJambAttempts([]);
          setJambSubjects([]);
          setJambQuestionCount(0);
        }

        loadedRef.current = true;
      } catch (error: any) {
        console.error('Unable to load student dashboard:', error);
        toast.error(
          error?.message || 'Unable to load student dashboard',
        );
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id, user?.email],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const subjectMap = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  );

  const teacherMap = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher])),
    [teachers],
  );

  const jambSubjectMap = useMemo(
    () =>
      new Map(
        jambSubjects.map((subject) => [subject.id, subject]),
      ),
    [jambSubjects],
  );

  const resultBatchMap = useMemo(
    () =>
      new Map(
        resultBatches.map((batch) => [batch.id, batch]),
      ),
    [resultBatches],
  );

  const attendanceStats = useMemo(() => {
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      halfDay: 0,
      total: 0,
    };

    attendance.forEach((record) => {
      const status = normalize(record.status);

      if (status === 'present') stats.present += 1;
      else if (status === 'absent') stats.absent += 1;
      else if (status === 'late') stats.late += 1;
      else if (status === 'excused') stats.excused += 1;
      else if (
        ['half_day', 'half-day', 'half day'].includes(status)
      ) {
        stats.halfDay += 1;
      }

      stats.total += 1;
    });

    const effectivePresent =
      stats.present +
      stats.late +
      stats.halfDay * 0.5;

    return {
      ...stats,
      rate:
        stats.total > 0
          ? Math.min(100, (effectivePresent / stats.total) * 100)
          : 0,
    };
  }, [attendance]);

  const recentAttendance = useMemo(
    () =>
      [...attendance]
        .sort((a, b) => {
          const ad = a.attendance_date || a.created_at || '';
          const bd = b.attendance_date || b.created_at || '';
          return bd.localeCompare(ad);
        })
        .slice(0, 8),
    [attendance],
  );

  const attendanceTrend = useMemo(() => {
    const today = dayjs();

    return Array.from({ length: 6 }).map((_, index) => {
      const month = today.subtract(5 - index, 'month');
      const monthRows = attendance.filter((record) => {
        const date = record.attendance_date || record.created_at;
        return date && dayjs(date).isSame(month, 'month');
      });

      const present = monthRows.filter((record) =>
        ['present', 'late'].includes(normalize(record.status)),
      ).length;

      return {
        label: month.format('MMM'),
        rate:
          monthRows.length > 0
            ? Math.round((present / monthRows.length) * 100)
            : 0,
      };
    });
  }, [attendance]);

  const scoreFromSummary = Number(
    resultSummary?.average_percentage || 0,
  );

  const legacyScoreValues = useMemo(() => {
    const values: number[] = [];

    return values;
  }, []);

  const resultAverage = scoreFromSummary;

  const resultGrade =
    resultSummary?.grade || gradeFromScore(resultAverage);

  const subjectPerformance = useMemo(() => {
    const map = new Map<
      string,
      {
        subjectId: string;
        name: string;
        scores: number[];
      }
    >();

    resultEntries.forEach((entry) => {
      const batch = resultBatchMap.get(entry.batch_id);

      if (!batch) return;

      const subject = subjectMap.get(batch.subject_id);
      const percentage =
        entry.percentage !== null && entry.percentage !== undefined
          ? Number(entry.percentage)
          : Number(batch.max_score)
            ? (Number(entry.score) / Number(batch.max_score)) * 100
            : 0;

      if (!Number.isFinite(percentage)) return;

      const existing = map.get(batch.subject_id);

      if (existing) {
        existing.scores.push(percentage);
      } else {
        map.set(batch.subject_id, {
          subjectId: batch.subject_id,
          name:
            subject?.name ||
            batch.title ||
            'Subject',
          scores: [percentage],
        });
      }
    });

    return Array.from(map.values())
      .map((item) => ({
        subjectId: item.subjectId,
        name: item.name,
        average:
          item.scores.reduce((sum, score) => sum + score, 0) /
          item.scores.length,
        count: item.scores.length,
      }))
      .sort((a, b) => b.average - a.average);
  }, [resultEntries, resultBatchMap, subjectMap]);

  const recentResults = useMemo(() => {
    return resultEntries
      .map((entry) => {
        const batch = resultBatchMap.get(entry.batch_id);
        const subject = batch
          ? subjectMap.get(batch.subject_id)
          : null;

        const percentage =
          entry.percentage !== null &&
          entry.percentage !== undefined
            ? Number(entry.percentage)
            : batch?.max_score
              ? (Number(entry.score) / Number(batch.max_score)) *
                100
              : 0;

        return {
          ...entry,
          subjectName:
            subject?.name || batch?.title || 'Subject',
          assessment:
            batch?.assessment_type ||
            batch?.title ||
            'Assessment',
          percentage,
          assessmentDate: batch?.assessment_date || null,
        };
      })
      .sort((a, b) =>
        String(b.assessmentDate || '').localeCompare(
          String(a.assessmentDate || ''),
        ),
      )
      .slice(0, 8);
  }, [resultEntries, resultBatchMap, subjectMap]);

  const paymentStats = useMemo(() => {
    let due = 0;
    let paid = 0;
    let balance = 0;
    let overdue = 0;

    assignments.forEach((assignment: any) => {
      due += Number(assignment.amount_due) || 0;
      paid += Number(assignment.amount_paid) || 0;
      balance += Number(assignment.balance) || 0;

      if (
        ['overdue', 'outstanding'].includes(
          normalize(assignment.payment_status),
        )
      ) {
        overdue += 1;
      }
    });

    return {
      due,
      paid,
      balance,
      overdue,
      progress:
        due > 0 ? Math.min(100, (paid / due) * 100) : 0,
    };
  }, [assignments]);

  const recentPayments = useMemo(
    () =>
      [...payments]
        .sort((a, b) =>
          String(b.payment_date || '').localeCompare(
            String(a.payment_date || ''),
          ),
        )
        .slice(0, 6),
    [payments],
  );

  const isSenior = useMemo(() => {
    const level = normalize(studentClass?.level);
    const name = normalize(studentClass?.name);

    return (
      level === 'senior' &&
      (name.includes('ss2') || name.includes('ss3'))
    );
  }, [studentClass]);

  const isSS2 = useMemo(
    () => normalize(studentClass?.name).includes('ss2'),
    [studentClass],
  );

  const isSS3 = useMemo(
    () => normalize(studentClass?.name).includes('ss3'),
    [studentClass],
  );

  const cbtAverage = useMemo(() => {
    if (!jambAttempts.length) return 0;

    const scores = jambAttempts
      .map((attempt) => Number(attempt.score))
      .filter(Number.isFinite);

    return scores.length
      ? scores.reduce((sum, score) => sum + score, 0) /
          scores.length
      : 0;
  }, [jambAttempts]);

  const cbtBestScore = useMemo(
    () =>
      jambAttempts.length
        ? Math.max(
            ...jambAttempts.map((attempt) =>
              Number(attempt.score) || 0,
            ),
          )
        : 0,
    [jambAttempts],
  );

  const cbtReadiness = useMemo(() => {
    if (!isSenior) return 0;

    let score = 0;

    if (jambRegistration) score += 30;
    if (registeredJambSubjects.length >= 4) score += 30;
    else if (registeredJambSubjects.length > 0) score += 15;

    if (jambAttempts.length >= 5) score += 20;
    else if (jambAttempts.length > 0) score += 10;

    if (cbtAverage >= 70) score += 20;
    else if (cbtAverage >= 50) score += 15;
    else if (cbtAverage > 0) score += 8;

    return Math.min(100, score);
  }, [
    isSenior,
    jambRegistration,
    registeredJambSubjects.length,
    jambAttempts.length,
    cbtAverage,
  ]);

  const unreadNotices = useMemo(
    () =>
      notices.filter(
        (notice) =>
          !noticeReads.some(
            (read) => read.notice_id === notice.id,
          ),
      ),
    [notices, noticeReads],
  );

  const recentNotices = useMemo(
    () => notices.slice(0, 6),
    [notices],
  );

  const combinedAnnouncements = useMemo(() => {
    const regular = announcements.map((item) => ({
      id: `announcement-${item.id}`,
      title: item.title,
      message: item.content,
      category: item.category || 'School announcement',
      priority: item.priority || 'normal',
      createdAt:
        item.published_at ||
        item.created_at ||
        new Date().toISOString(),
      source: 'announcement',
    }));

    const targeted = broadcasts.map((item) => ({
      id: `broadcast-${item.id}`,
      title: item.title,
      message: item.message,
      category: item.channel || 'School communication',
      priority: 'normal',
      createdAt: item.created_at,
      source: 'broadcast',
    }));

    return [...regular, ...targeted]
      .sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt)),
      )
      .slice(0, 8);
  }, [announcements, broadcasts]);

  const upcomingEvents = useMemo(() => {
    const now = dayjs();

    const schoolEvents = events
      .filter((event) => {
        const status = normalize(event.status);
        return (
          !['cancelled', 'completed'].includes(status) &&
          dayjs(event.start_at).isAfter(now.subtract(1, 'day')) &&
          (!event.class_id || event.class_id === studentClass?.id)
        );
      })
      .map((event) => ({
        id: event.id,
        title: event.title,
        type: event.event_type,
        date: event.start_at,
        description: event.description,
        venue: event.venue,
      }));

    const academicEvents = calendarEvents
      .filter((event) =>
        dayjs(event.start_date).isAfter(
          now.subtract(1, 'day'),
        ),
      )
      .map((event) => ({
        id: event.id,
        title: event.event_name,
        type: event.event_type || 'Academic calendar',
        date: event.start_date,
        description: event.description,
        venue: null,
      }));

    return [...schoolEvents, ...academicEvents]
      .sort((a, b) =>
        String(a.date).localeCompare(String(b.date)),
      )
      .slice(0, 6);
  }, [events, calendarEvents, studentClass?.id]);

  const uniqueSubjectCount = useMemo(() => {
    const ids = new Set(
      timetable
        .map((item) => item.subject_id)
        .filter(Boolean),
    );

    return ids.size || subjectPerformance.length;
  }, [timetable, subjectPerformance]);

  const todayTimetable = useMemo(() => {
    const today = dayjs().format('dddd').toLowerCase();

    return timetable.filter((item) => {
      const day = normalize(
        item.day_of_week || item.day,
      );

      return (
        day === today ||
        day.startsWith(today.slice(0, 3))
      );
    });
  }, [timetable]);

  const nextLesson = useMemo(() => {
    const now = dayjs();

    return todayTimetable.find((lesson) => {
      if (!lesson.start_time) return true;

      const [hour, minute] = lesson.start_time
        .split(':')
        .map(Number);

      const start = now
        .hour(hour || 0)
        .minute(minute || 0)
        .second(0);

      return start.isAfter(now);
    });
  }, [todayTimetable]);

  const markNoticeRead = async (noticeId: string) => {
    if (!user?.id) return;

    if (
      noticeReads.some(
        (read) => read.notice_id === noticeId,
      )
    ) {
      return;
    }

    const { data, error } = await supabase
      .from('notice_reads')
      .insert({
        notice_id: noticeId,
        user_id: user.id,
      })
      .select('id,notice_id,user_id,read_at')
      .maybeSingle();

    if (!error && data) {
      setNoticeReads((current) => [
        ...current,
        data as NoticeRead,
      ]);
    }
  };

  const refresh = () => {
    loadedRef.current = false;
    void load(true);
  };

  const studentName =
    `${student?.first_name || ''} ${student?.last_name || ''}`.trim() ||
    'Student';

  if (loading || paymentLoading) {
    return <StudentDashboardSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 overflow-x-hidden pb-10">
      {/* HERO */}
      <motion.section
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 text-white shadow-xl sm:p-6"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative shrink-0">
              {student?.passport_url ? (
                <img
                  src={student.passport_url}
                  alt={studentName}
                  className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/30 sm:h-20 sm:w-20"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-xl font-semibold ring-2 ring-white/20 sm:h-20 sm:w-20">
                  {getInitials(
                    student?.first_name,
                    student?.last_name,
                  )}
                </div>
              )}

              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-indigo-600 bg-green-400" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px]">
                  Student Portal
                </span>

                {isSenior && (
                  <span className="rounded-full bg-amber-300/20 px-2.5 py-1 text-[10px] text-amber-100">
                    {isSS3 ? 'SS3 • JAMB Preparation' : 'SS2 • JAMB Track'}
                  </span>
                )}
              </div>

              <h1 className="mt-2 truncate text-xl font-semibold sm:text-2xl">
                Welcome back, {student?.first_name || 'Student'}
              </h1>

              <p className="mt-1 truncate text-xs text-blue-100 sm:text-sm">
                {student?.class_name || 'Class not assigned'}{' '}
                •{' '}
                {student?.admission_number ||
                  student?.student_id ||
                  'Student'}
              </p>

              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-blue-100">
                <span className="inline-flex items-center gap-1">
                  <School className="h-3 w-3" />
                  {academicSession?.session_name ||
                    'Session not set'}
                </span>

                <span>•</span>

                <span>
                  {academicSession?.term_name ||
                    'Term not set'}
                </span>

                <span>•</span>

                <span>
                  {studentClass?.department
                    ? String(studentClass.department)
                        .charAt(0)
                        .toUpperCase() +
                      String(studentClass.department).slice(1)
                    : 'General'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs transition hover:bg-white/25 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? 'animate-spin' : ''
                }`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => navigate('/student/results/summary')}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs transition hover:bg-white/25"
            >
              <GraduationCap className="h-4 w-4" />
              Results
            </button>

            <button
              type="button"
              onClick={() => navigate('/student/paybill')}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-indigo-700 transition hover:bg-blue-50"
            >
              <Wallet className="h-4 w-4" />
              Pay Bill
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
            <p className="text-[10px] text-blue-100">
              Current average
            </p>
            <p className="mt-1 text-xl font-semibold">
              {Math.round(resultAverage)}%
            </p>
            <p className="mt-1 text-[10px] text-blue-100">
              Grade {resultGrade}
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
            <p className="text-[10px] text-blue-100">
              Class position
            </p>
            <p className="mt-1 text-xl font-semibold">
              {resultSummary?.position
                ? `#${resultSummary.position}`
                : '—'}
            </p>
            <p className="mt-1 text-[10px] text-blue-100">
              {resultSummary?.total_subjects || uniqueSubjectCount}{' '}
              subjects
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
            <p className="text-[10px] text-blue-100">
              Attendance
            </p>
            <p className="mt-1 text-xl font-semibold">
              {Math.round(attendanceStats.rate)}%
            </p>
            <p className="mt-1 text-[10px] text-blue-100">
              {attendanceStats.present} present
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
            <p className="text-[10px] text-blue-100">
              Outstanding
            </p>
            <p className="mt-1 text-lg font-semibold">
              {money(paymentStats.balance)}
            </p>
            <p className="mt-1 text-[10px] text-blue-100">
              {paymentStats.overdue} overdue item
              {paymentStats.overdue === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </motion.section>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* LEFT */}
        <div className="space-y-5 xl:col-span-2">
          {/* OVERVIEW STATS */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={GraduationCap}
              label="Academic average"
              value={`${Math.round(resultAverage)}%`}
              helper={`Grade ${resultGrade}`}
              tone="text-indigo-500"
              onClick={() =>
                navigate('/student/results/summary')
              }
            />

            <StatCard
              icon={CalendarDays}
              label="Attendance"
              value={`${Math.round(attendanceStats.rate)}%`}
              helper={`${attendanceStats.present} present`}
              tone="text-green-500"
              onClick={() =>
                navigate('/student/attendance')
              }
            />

            <StatCard
              icon={BookOpen}
              label="Subjects"
              value={String(uniqueSubjectCount)}
              helper={
                studentClass?.department
                  ? String(studentClass.department)
                  : 'Current class'
              }
              tone="text-blue-500"
              onClick={() =>
                navigate('/student/timetable')
              }
            />

            <StatCard
              icon={Bell}
              label="Unread notices"
              value={String(unreadNotices.length)}
              helper="School communications"
              tone="text-amber-500"
              onClick={() =>
                navigate('/student/notifications')
              }
            />
          </div>

          {/* TIMETABLE */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="p-4 sm:p-5">
              <TimetableWidget
                timetable={timetable}
                subjects={subjects}
                teachers={teachers}
                studentClass={studentClass}
                onRefresh={refresh}
                refreshing={refreshing}
              />
            </div>
          </section>

          {/* NEXT LESSON */}
          <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 p-4 dark:border-indigo-900/30 dark:from-indigo-950/30 dark:to-blue-950/20 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                  <Clock className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-[10px] text-indigo-500">
                    Next lesson
                  </p>

                  {nextLesson ? (
                    <>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {nextLesson.subject_name ||
                          subjectMap.get(
                            nextLesson.subject_id || '',
                          )?.name ||
                          'Scheduled lesson'}
                      </h3>

                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {nextLesson.start_time} –{' '}
                        {nextLesson.end_time}
                        {nextLesson.room
                          ? ` • ${nextLesson.room}`
                          : ''}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        No more lessons scheduled today
                      </h3>

                      <p className="text-xs text-gray-500">
                        Check the full timetable for tomorrow.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/student/timetable')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-indigo-600 shadow-sm hover:bg-indigo-50 dark:bg-gray-800 dark:text-indigo-400"
              >
                Full timetable
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>

          {/* ACADEMIC PERFORMANCE */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <SectionHeader
              icon={BarChart3}
              title="Academic performance"
              subtitle="Published performance for the current academic period"
              actionLabel="View result"
              onAction={() =>
                navigate('/student/results/summary')
              }
            />

            {subjectPerformance.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No published subject performance yet"
                text="Your subject performance will appear here when results are published."
              />
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-3">
                  {subjectPerformance
                    .slice(0, 7)
                    .map((subject) => (
                      <div key={subject.subjectId}>
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <span className="truncate text-xs text-gray-700 dark:text-gray-300">
                            {subject.name}
                          </span>

                          <span className="shrink-0 text-xs text-gray-500">
                            {Math.round(subject.average)}%
                          </span>
                        </div>

                        <ProgressBar
                          value={subject.average}
                          color={
                            subject.average >= 70
                              ? 'bg-green-500'
                              : subject.average >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }
                        />
                      </div>
                    ))}
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-500">
                        Average
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-indigo-600">
                        {Math.round(resultAverage)}%
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-500">
                        Grade
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                        {resultGrade}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-500">
                        Position
                      </p>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {resultSummary?.position
                          ? `#${resultSummary.position}`
                          : '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-500">
                        Subjects
                      </p>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {resultSummary?.total_subjects ||
                          subjectPerformance.length}
                      </p>
                    </div>
                  </div>

                  {resultSummary?.remark && (
                    <div className="mt-4 rounded-xl bg-white p-3 dark:bg-gray-800">
                      <p className="text-[10px] text-gray-500">
                        Result remark
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-700 dark:text-gray-300">
                        {resultSummary.remark}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* RECENT RESULTS */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <SectionHeader
              icon={Award}
              title="Recent assessments"
              subtitle="Your latest published assessment entries"
              actionLabel="All results"
              onAction={() =>
                navigate('/student/results/summary')
              }
            />

            {recentResults.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No assessment entries"
                text="Published assessments will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="grid grid-cols-[1.5fr_1fr_0.7fr_0.6fr] gap-3 border-b border-gray-100 px-2 pb-2 text-[10px] text-gray-400 dark:border-gray-700">
                    <span>Subject</span>
                    <span>Assessment</span>
                    <span>Score</span>
                    <span>Grade</span>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {recentResults.map((result) => (
                      <div
                        key={result.id}
                        className="grid grid-cols-[1.5fr_1fr_0.7fr_0.6fr] items-center gap-3 px-2 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs text-gray-800 dark:text-gray-200">
                            {result.subjectName}
                          </p>

                          {result.assessmentDate && (
                            <p className="mt-0.5 text-[9px] text-gray-400">
                              {dayjs(
                                result.assessmentDate,
                              ).format('DD MMM YYYY')}
                            </p>
                          )}
                        </div>

                        <span className="truncate text-xs text-gray-500">
                          {result.assessment}
                        </span>

                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {Math.round(result.percentage)}%
                        </span>

                        <span
                          className={`w-fit rounded-full px-2 py-1 text-[10px] ${gradeTone(
                            result.grade ||
                              gradeFromScore(
                                result.percentage,
                              ),
                          )}`}
                        >
                          {result.grade ||
                            gradeFromScore(
                              result.percentage,
                            )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ATTENDANCE */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <SectionHeader
              icon={CalendarDays}
              title="Attendance overview"
              subtitle="Attendance activity recorded for you"
              actionLabel="Attendance"
              onAction={() =>
                navigate('/student/attendance')
              }
            />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Present', attendanceStats.present, 'text-green-600'],
                ['Absent', attendanceStats.absent, 'text-red-600'],
                ['Late', attendanceStats.late, 'text-yellow-600'],
                ['Excused', attendanceStats.excused, 'text-blue-600'],
              ].map(([label, value, tone]) => (
                <div
                  key={String(label)}
                  className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/30"
                >
                  <p className="text-[10px] text-gray-500">
                    {label}
                  </p>

                  <p
                    className={`mt-1 text-xl font-semibold ${tone}`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Overall attendance rate
                  </span>

                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {Math.round(
                      attendanceStats.rate,
                    )}
                    %
                  </span>
                </div>

                <ProgressBar
                  value={attendanceStats.rate}
                  color={
                    attendanceStats.rate >= 90
                      ? 'bg-green-500'
                      : attendanceStats.rate >= 75
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }
                />

                <div className="mt-4 flex items-end gap-2">
                  {attendanceTrend.map((month) => (
                    <div
                      key={month.label}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <div className="flex h-20 w-full items-end rounded-lg bg-gray-100 px-1 dark:bg-gray-900/40">
                        <div
                          className="w-full rounded-md bg-indigo-500 transition-all"
                          style={{
                            height: `${Math.max(
                              5,
                              month.rate,
                            )}%`,
                          }}
                        />
                      </div>

                      <span className="text-[9px] text-gray-400">
                        {month.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs text-gray-500">
                  Recent attendance
                </p>

                {recentAttendance.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="No attendance records"
                    text="Attendance records will appear when marked."
                  />
                ) : (
                  <div className="space-y-2">
                    {recentAttendance
                      .slice(0, 5)
                      .map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between rounded-xl bg-gray-50 p-2.5 dark:bg-gray-900/30"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-lg ${statusClass(
                                record.status,
                              )}`}
                            >
                              {normalize(
                                record.status,
                              ) === 'present' ? (
                                <CheckCircle className="h-3.5 w-3.5" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5" />
                              )}
                            </div>

                            <div>
                              <p className="text-xs text-gray-700 dark:text-gray-300">
                                {record.status}
                              </p>

                              <p className="text-[9px] text-gray-400">
                                {record.attendance_date
                                  ? dayjs(
                                      record.attendance_date,
                                    ).format(
                                      'ddd, DD MMM',
                                    )
                                  : 'Date unavailable'}
                              </p>
                            </div>
                          </div>

                          {record.check_in_at && (
                            <span className="text-[9px] text-gray-400">
                              {dayjs(
                                record.check_in_at,
                              ).format('HH:mm')}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* NOTICES */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <SectionHeader
              icon={Megaphone}
              title="School notices"
              subtitle="Official notices published by the school"
              actionLabel="View notices"
              onAction={() =>
                navigate('/student/notices')
              }
            />

            {recentNotices.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No notices published"
                text="Official school notices will appear here."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {recentNotices.map((notice) => {
                  const isRead = noticeReads.some(
                    (read) =>
                      read.notice_id === notice.id,
                  );

                  return (
                    <button
                      type="button"
                      key={notice.id}
                      onClick={() => {
                        void markNoticeRead(notice.id);
                        navigate('/student/notices');
                      }}
                      className="group rounded-xl border border-gray-100 bg-gray-50 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-gray-700 dark:bg-gray-900/30 dark:hover:border-indigo-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {!isRead && (
                              <span className="h-2 w-2 rounded-full bg-indigo-500" />
                            )}

                            {notice.is_official_gazette && (
                              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                                Official
                              </span>
                            )}

                            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[9px] text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                              {notice.category}
                            </span>
                          </div>

                          <h3 className="mt-2 line-clamp-2 text-xs font-semibold text-gray-900 dark:text-white">
                            {notice.title}
                          </h3>

                          <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-gray-500 dark:text-gray-400">
                            {notice.summary}
                          </p>
                        </div>

                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[9px] text-gray-400">
                        <span>
                          {notice.reference_no}
                        </span>

                        <span>
                          {dayjs(
                            notice.issue_date,
                          ).format('DD MMM YYYY')}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ANNOUNCEMENTS */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <SectionHeader
              icon={Bell}
              title="Announcements & school communications"
              subtitle="General and targeted messages for students"
              actionLabel="Notifications"
              onAction={() =>
                navigate('/student/notifications')
              }
            />

            {combinedAnnouncements.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No new announcements"
                text="You are currently up to date."
              />
            ) : (
              <div className="space-y-2">
                {combinedAnnouncements.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                            {item.title}
                          </h3>

                          {normalize(
                            item.priority,
                          ) === 'high' && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
                              Priority
                            </span>
                          )}
                        </div>

                        <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-gray-500 dark:text-gray-400">
                          {item.message}
                        </p>
                      </div>

                      <span className="shrink-0 text-[9px] text-gray-400">
                        {dayjs(
                          item.createdAt,
                        ).fromNow()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT */}
        <div className="space-y-5">
          {/* CBT */}
          {isSenior && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 p-4 text-white shadow-lg sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                      <Target className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-[10px] text-indigo-100">
                        JAMB / CBT Centre
                      </p>

                      <h2 className="text-sm font-semibold">
                        {isSS3
                          ? 'SS3 Examination Preparation'
                          : 'SS2 Early Preparation'}
                      </h2>
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] leading-5 text-indigo-100">
                    Practice your registered JAMB subjects,
                    monitor your attempts and build consistent
                    exam performance.
                  </p>
                </div>

                <Sparkles className="h-5 w-5 shrink-0 text-amber-200" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-[9px] text-indigo-100">
                    Registered subjects
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {registeredJambSubjects.length}/4
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-[9px] text-indigo-100">
                    Attempts
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {jambAttempts.length}
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-[9px] text-indigo-100">
                    Best score
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {Math.round(cbtBestScore)}%
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-[9px] text-indigo-100">
                    Question bank
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {jambQuestionCount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-[10px] text-indigo-100">
                  <span>CBT readiness</span>
                  <span>{Math.round(cbtReadiness)}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-700"
                    style={{
                      width: `${cbtReadiness}%`,
                    }}
                  />
                </div>
              </div>

              {jambRegistration ? (
                <>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {registeredJambSubjects.map(
                      (registrationSubject) => {
                        const subject =
                          jambSubjectMap.get(
                            registrationSubject.subject_id,
                          );

                        return (
                          <span
                            key={registrationSubject.id}
                            className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] text-white"
                          >
                            {subject?.name ||
                              'Subject'}
                          </span>
                        );
                      },
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('/student/jamb')
                    }
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-50"
                  >
                    Open CBT Centre
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    navigate('/student/jamb')
                  }
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-50"
                >
                  Open JAMB / CBT
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </motion.section>
          )}

          {/* CBT ATTEMPTS */}
          {isSenior && jambAttempts.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-5">
              <SectionHeader
                icon={TrendingUp}
                title="CBT performance"
                subtitle="Recent JAMB practice attempts"
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/30">
                  <p className="text-[10px] text-gray-500">
                    Average
                  </p>

                  <p className="mt-1 text-xl font-semibold text-indigo-600">
                    {Math.round(cbtAverage)}%
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/30">
                  <p className="text-[10px] text-gray-500">
                    Best
                  </p>

                  <p className="mt-1 text-xl font-semibold text-green-600">
                    {Math.round(cbtBestScore)}%
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {jambAttempts
                  .slice(0, 5)
                  .map((attempt) => {
                    const subject =
                      jambSubjectMap.get(
                        attempt.subject_id,
                      );

                    return (
                      <div
                        key={attempt.id}
                        className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-gray-900/30"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs text-gray-800 dark:text-gray-200">
                            {subject?.name ||
                              'JAMB Subject'}
                          </p>

                          <p className="mt-0.5 text-[9px] text-gray-400">
                            {attempt.correct_count}/
                            {attempt.question_count}{' '}
                            correct •{' '}
                            {attempt.duration_seconds
                              ? `${Math.round(
                                  attempt.duration_seconds /
                                    60,
                                )} min`
                              : 'Practice'}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2 py-1 text-[10px] ${gradeTone(
                            gradeFromScore(
                              Number(attempt.score),
                            ),
                          )}`}
                        >
                          {Math.round(
                            Number(attempt.score) || 0,
                          )}
                          %
                        </span>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* FEE SUMMARY */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <SectionHeader
              icon={Wallet}
              title="Fee & payment centre"
              subtitle="Current fee position and recent payments"
              actionLabel="Pay bill"
              onAction={() =>
                navigate('/student/paybill')
              }
            />

            <div className="mb-4">
              <div className="mb-1 flex justify-between text-[10px] text-gray-500">
                <span>Payment progress</span>
                <span>
                  {Math.round(paymentStats.progress)}%
                </span>
              </div>

              <ProgressBar
                value={paymentStats.progress}
                color="bg-gradient-to-r from-blue-500 to-indigo-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-gray-50 p-2.5 text-center dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">
                  Due
                </p>
                <p className="mt-1 text-xs font-semibold text-gray-900 dark:text-white">
                  {money(paymentStats.due)}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-2.5 text-center dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">
                  Paid
                </p>
                <p className="mt-1 text-xs font-semibold text-green-600">
                  {money(paymentStats.paid)}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-2.5 text-center dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">
                  Balance
                </p>
                <p className="mt-1 text-xs font-semibold text-red-600">
                  {money(paymentStats.balance)}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs text-gray-500">
                Recent transactions
              </p>

              {recentPayments.length === 0 ? (
                <p className="rounded-xl bg-gray-50 p-3 text-center text-[10px] text-gray-400 dark:bg-gray-900/30">
                  No recent payment records
                </p>
              ) : (
                <div className="space-y-2">
                  {recentPayments.slice(0, 4).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-xl bg-gray-50 p-2.5 dark:bg-gray-900/30"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                          <CreditCard className="h-3.5 w-3.5" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-[10px] text-gray-700 dark:text-gray-300">
                            {payment.payment_method ||
                              'Payment'}
                          </p>

                          <p className="text-[9px] text-gray-400">
                            {payment.payment_date
                              ? dayjs(
                                  payment.payment_date,
                                ).format('DD MMM YYYY')
                              : 'Date unavailable'}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 text-xs font-medium text-gray-800 dark:text-gray-200">
                        {money(
                          payment.amount_paid ||
                            payment.amount,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* NOTIFICATIONS */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <SectionHeader
              icon={Bell}
              title="Notifications"
              subtitle={`${notifications.length} unread notification${
                notifications.length === 1 ? '' : 's'
              }`}
              actionLabel="View all"
              onAction={() =>
                navigate('/student/notifications')
              }
            />

            {notifications.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="You are all caught up"
                text="There are no unread notifications."
              />
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 5).map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => {
                      if (notification.link) {
                        navigate(notification.link);
                      } else {
                        navigate('/student/notifications');
                      }
                    }}
                    className="flex w-full items-start gap-3 rounded-xl bg-gray-50 p-3 text-left transition hover:bg-indigo-50 dark:bg-gray-900/30 dark:hover:bg-indigo-900/10"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                      <Bell className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {notification.title ||
                          'Notification'}
                      </p>

                      <p className="mt-0.5 line-clamp-2 text-[10px] text-gray-500 dark:text-gray-400">
                        {notification.message}
                      </p>

                      {notification.created_at && (
                        <p className="mt-1 text-[9px] text-gray-400">
                          {dayjs(
                            notification.created_at,
                          ).fromNow()}
                        </p>
                      )}
                    </div>

                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* EVENTS */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <SectionHeader
              icon={Calendar}
              title="Upcoming school events"
              subtitle="Academic calendar and school activities"
              actionLabel="Calendar"
              onAction={() =>
                navigate('/student/calendar')
              }
            />

            {upcomingEvents.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No upcoming events"
                text="New school activities will appear here."
              />
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-900/30"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                      <span className="text-[9px]">
                        {dayjs(event.date).format('MMM')}
                      </span>

                      <span className="text-sm font-semibold">
                        {dayjs(event.date).format('DD')}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {event.title}
                      </p>

                      <p className="mt-0.5 text-[9px] text-indigo-500">
                        {event.type}
                      </p>

                      <p className="mt-1 line-clamp-2 text-[10px] text-gray-500 dark:text-gray-400">
                        {event.description ||
                          'School calendar activity'}
                      </p>

                      {event.venue && (
                        <p className="mt-1 flex items-center gap-1 text-[9px] text-gray-400">
                          <MapPin className="h-3 w-3" />
                          {event.venue}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* PROFILE */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <SectionHeader
              icon={User}
              title="Student profile"
              subtitle="Your registered school information"
              actionLabel="Profile"
              onAction={() =>
                navigate('/student/profile')
              }
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-gray-900/30">
                <span className="text-[10px] text-gray-500">
                  Full name
                </span>

                <span className="max-w-[60%] truncate text-right text-xs text-gray-800 dark:text-gray-200">
                  {studentName}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-gray-900/30">
                <span className="text-[10px] text-gray-500">
                  Admission number
                </span>

                <span className="text-xs text-gray-800 dark:text-gray-200">
                  {student?.admission_number ||
                    student?.student_id ||
                    'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-gray-900/30">
                <span className="text-[10px] text-gray-500">
                  Class
                </span>

                <span className="text-xs text-gray-800 dark:text-gray-200">
                  {student?.class_name ||
                    'Not assigned'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-gray-900/30">
                <span className="text-[10px] text-gray-500">
                  Student status
                </span>

                <span
                  className={`rounded-full px-2 py-1 text-[9px] ${statusClass(
                    student?.current_status ||
                      'active',
                  )}`}
                >
                  {student?.current_status ||
                    'active'}
                </span>
              </div>

              {student?.email && (
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-900/30">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  <span className="truncate text-[10px] text-gray-600 dark:text-gray-300">
                    {student.email}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* QUICK ACTIONS */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <SectionHeader
              icon={Zap}
              title="Quick actions"
              subtitle="Frequently used student services"
            />

            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: 'Results',
                  path: '/student/results/summary',
                  icon: GraduationCap,
                  tone: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
                },
                {
                  label: 'Pay fees',
                  path: '/student/paybill',
                  icon: Wallet,
                  tone: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
                },
                {
                  label: 'Attendance',
                  path: '/student/attendance',
                  icon: CalendarDays,
                  tone: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
                },
                {
                  label: 'Timetable',
                  path: '/student/timetable',
                  icon: Calendar,
                  tone: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
                },
                {
                  label: 'Notices',
                  path: '/student/notices',
                  icon: Megaphone,
                  tone: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
                },
                {
                  label: 'Messages',
                  path: '/student/messages',
                  icon: MessageSquare,
                  tone: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
                },
              ].map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    type="button"
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className={`rounded-xl p-3 ${action.tone} flex flex-col items-center gap-1.5 transition hover:-translate-y-0.5 hover:shadow-sm`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px]">
                      {action.label}
                    </span>
                  </button>
                );
              })}

              {isSenior && (
                <button
                  type="button"
                  onClick={() =>
                    navigate('/student/jamb')
                  }
                  className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 p-3 text-xs text-white transition hover:opacity-95"
                >
                  <Target className="h-4 w-4" />
                  Open JAMB / CBT Centre
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </section>

          {/* SUPPORT */}
          <section className="rounded-2xl bg-gray-900 p-4 text-white shadow-lg dark:bg-gray-950 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <MessageSquare className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-semibold">
                  Need help?
                </h3>

                <p className="mt-1 text-[10px] leading-5 text-gray-400">
                  Contact your school through the student
                  messaging and support channels.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate('/student/support')
                  }
                  className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-[10px] text-gray-900"
                >
                  Contact support
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
