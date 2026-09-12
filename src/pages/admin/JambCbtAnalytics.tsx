
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Folder,
  FolderOpen,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  Trophy,
  Upload,
  UserRound,
  Users,
  XCircle,
  MinusCircle,
  Brain,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabase/client';

type TopicBreakdownItem = {
  topic?: string | null;
  total?: number | null;
  correct?: number | null;
  wrong?: number | null;
  unanswered?: number | null;
  accuracy?: number | null;
};

type Attempt = {
  id: string;
  registration_id: string;
  subject_id: string;
  question_count: number | null;
  correct_count: number | null;
  wrong_count: number | null;
  unanswered_count: number | null;
  score: number | null;
  duration_seconds: number | null;
  submitted_at: string | null;
  started_at?: string | null;
  status?: string | null;
  question_ids?: unknown;
  answers?: unknown;
  topic_breakdown?: TopicBreakdownItem[] | null;

  subject?: {
    id: string;
    name: string;
    code: string | null;
  } | null;

  registration?: {
    id: string;
    student_id: string;
    student?: {
      id: string;
      student_id: string | null;
      admission_number: string | null;
      secondary_admission_number: string | null;
      first_name: string | null;
      middle_name: string | null;
      last_name: string | null;
      class_id: string | null;
      branch_id: string | null;
      passport_url?: string | null;
    } | null;
  } | null;
};

type StudentFolder = {
  studentId: string;
  admissionNo: string;
  name: string;
  attempts: Attempt[];
  average: number;
  best: number;
  latest: number;
  totalQuestions: number;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
};

type TopicPerformance = {
  topic: string;
  correct: number;
  total: number;
  wrong: number;
  unanswered: number;
  percentage: number;
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatShortDate = (value?: string | null) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
  }).format(date);
};

const formatDuration = (seconds?: number | null) => {
  const value = Number(seconds || 0);

  if (!value) return '—';

  const minutes = Math.floor(value / 60);
  const secs = value % 60;

  if (minutes < 1) return `${secs}s`;

  return `${minutes}m ${secs}s`;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const getScoreTone = (score: number) => {
  if (score >= 70) {
    return {
      text: 'text-indigo-700 dark:text-indigo-300',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      border: 'border-indigo-200 dark:border-indigo-800',
      bar: 'bg-indigo-600',
    };
  }

  if (score >= 50) {
    return {
      text: 'text-indigo-600 dark:text-indigo-300',
      bg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
      border: 'border-indigo-100 dark:border-indigo-900',
      bar: 'bg-indigo-500',
    };
  }

  return {
    text: 'text-indigo-500 dark:text-indigo-300',
    bg: 'bg-slate-50 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
    bar: 'bg-indigo-400',
  };
};

const getPerformanceLabel = (score: number) => {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Developing';

  return 'Needs Attention';
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

const JambCbtAnalytics: React.FC = () => {
  const [rows, setRows] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );

  const load = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from('jamb_attempts')
        .select(`
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
          question_ids,
          answers,
          topic_breakdown,
          subject:jamb_subjects(
            id,
            name,
            code
          ),
          registration:jamb_registrations(
            id,
            student_id,
            student:students(
              id,
              student_id,
              admission_number,
              secondary_admission_number,
              first_name,
              middle_name,
              last_name,
              class_id,
              branch_id,
              passport_url
            )
          )
        `)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(5000);

      if (error) throw error;

      setRows((data || []) as Attempt[]);
    } catch (error: any) {
      console.error('JAMB analytics load error:', error);

      toast.error(
        error?.message || 'Unable to load JAMB CBT analytics.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /*
   * ============================================================
   * STUDENT FOLDERS
   * ============================================================
   */

  const studentFolders = useMemo<StudentFolder[]>(() => {
    const map = new Map<string, Attempt[]>();

    rows.forEach((attempt) => {
      const studentId = attempt.registration?.student_id;

      if (!studentId) return;

      const existing = map.get(studentId) || [];

      existing.push(attempt);

      map.set(studentId, existing);
    });

    return Array.from(map.entries())
      .map(([studentId, attempts]) => {
        const student = attempts[0]?.registration?.student;

        const scores = attempts.map((attempt) =>
          Number(attempt.score || 0)
        );

        const totalQuestions = attempts.reduce(
          (sum, attempt) =>
            sum + Number(attempt.question_count || 0),
          0
        );

        const totalCorrect = attempts.reduce(
          (sum, attempt) =>
            sum + Number(attempt.correct_count || 0),
          0
        );

        const totalWrong = attempts.reduce(
          (sum, attempt) => {
            if (attempt.wrong_count !== null && attempt.wrong_count !== undefined) {
              return sum + Number(attempt.wrong_count || 0);
            }

            return (
              sum +
              Math.max(
                0,
                Number(attempt.question_count || 0) -
                  Number(attempt.correct_count || 0) -
                  Number(attempt.unanswered_count || 0)
              )
            );
          },
          0
        );

        const totalUnanswered = attempts.reduce(
          (sum, attempt) =>
            sum + Number(attempt.unanswered_count || 0),
          0
        );

        const average = scores.length
          ? scores.reduce((sum, score) => sum + score, 0) /
            scores.length
          : 0;

        const sortedAttempts = [...attempts].sort(
          (a, b) =>
            new Date(b.submitted_at || 0).getTime() -
            new Date(a.submitted_at || 0).getTime()
        );

        /*
         * IMPORTANT:
         * admission_number is the actual admission number.
         *
         * student_id is NOT used as the displayed admission number.
         */
        const admissionNo =
          student?.admission_number ||
          student?.secondary_admission_number ||
          'No admission number';

        const name =
          [
            student?.first_name,
            student?.middle_name,
            student?.last_name,
          ]
            .filter(Boolean)
            .join(' ')
            .trim() || 'Unknown Student';

        return {
          studentId,
          admissionNo,
          name,
          attempts: sortedAttempts,
          average,
          best: scores.length ? Math.max(...scores) : 0,
          latest: scores[0] || 0,
          totalQuestions,
          totalCorrect,
          totalWrong,
          totalUnanswered,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return studentFolders;

    return studentFolders.filter((student) => {
      return (
        student.name.toLowerCase().includes(term) ||
        student.admissionNo.toLowerCase().includes(term)
      );
    });
  }, [studentFolders, search]);

  useEffect(() => {
    if (!selectedStudentId && studentFolders.length) {
      setSelectedStudentId(studentFolders[0].studentId);

      return;
    }

    if (
      selectedStudentId &&
      !studentFolders.some(
        (student) => student.studentId === selectedStudentId
      )
    ) {
      setSelectedStudentId(studentFolders[0]?.studentId || null);
    }
  }, [studentFolders, selectedStudentId]);

  const selectedStudent = useMemo(
    () =>
      studentFolders.find(
        (student) => student.studentId === selectedStudentId
      ) || null,
    [studentFolders, selectedStudentId]
  );

  /*
   * ============================================================
   * GLOBAL STATISTICS
   * ============================================================
   */

  const globalStats = useMemo(() => {
    const average = rows.length
      ? rows.reduce(
          (sum, row) => sum + Number(row.score || 0),
          0
        ) / rows.length
      : 0;

    const best = rows.length
      ? Math.max(...rows.map((row) => Number(row.score || 0)))
      : 0;

    const totalQuestions = rows.reduce(
      (sum, row) => sum + Number(row.question_count || 0),
      0
    );

    const totalCorrect = rows.reduce(
      (sum, row) => sum + Number(row.correct_count || 0),
      0
    );

    const totalUnanswered = rows.reduce(
      (sum, row) => sum + Number(row.unanswered_count || 0),
      0
    );

    const totalWrong = rows.reduce(
      (sum, row) => {
        if (
          row.wrong_count !== null &&
          row.wrong_count !== undefined
        ) {
          return sum + Number(row.wrong_count || 0);
        }

        return (
          sum +
          Math.max(
            0,
            Number(row.question_count || 0) -
              Number(row.correct_count || 0) -
              Number(row.unanswered_count || 0)
          )
        );
      },
      0
    );

    return {
      uniqueStudents: studentFolders.length,
      attempts: rows.length,
      average,
      best,
      totalQuestions,
      totalCorrect,
      totalWrong,
      totalUnanswered,
    };
  }, [rows, studentFolders]);

  /*
   * ============================================================
   * SELECTED STUDENT SUBJECT PERFORMANCE
   * ============================================================
   */

  const subjectPerformance = useMemo(() => {
    if (!selectedStudent) return [];

    const map = new Map<
      string,
      {
        name: string;
        code: string;
        scores: number[];
        attempts: number;
        correct: number;
        wrong: number;
        unanswered: number;
        questions: number;
      }
    >();

    selectedStudent.attempts.forEach((attempt) => {
      const key = attempt.subject_id;

      const current = map.get(key) || {
        name: attempt.subject?.name || 'Unknown Subject',
        code: attempt.subject?.code || '',
        scores: [],
        attempts: 0,
        correct: 0,
        wrong: 0,
        unanswered: 0,
        questions: 0,
      };

      current.scores.push(Number(attempt.score || 0));

      current.attempts += 1;

      current.correct += Number(
        attempt.correct_count || 0
      );

      current.wrong += Number(
        attempt.wrong_count || 0
      );

      current.unanswered += Number(
        attempt.unanswered_count || 0
      );

      current.questions += Number(
        attempt.question_count || 0
      );

      map.set(key, current);
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        average: item.scores.length
          ? item.scores.reduce(
              (sum, score) => sum + score,
              0
            ) / item.scores.length
          : 0,
        accuracy: item.questions
          ? (item.correct / item.questions) * 100
          : 0,
      }))
      .sort((a, b) => b.average - a.average);
  }, [selectedStudent]);

  /*
   * ============================================================
   * TOPIC PERFORMANCE
   * ============================================================
   */

  const topicPerformance = useMemo<TopicPerformance[]>(() => {
    if (!selectedStudent) return [];

    const map = new Map<
      string,
      {
        correct: number;
        total: number;
        wrong: number;
        unanswered: number;
      }
    >();

    selectedStudent.attempts.forEach((attempt) => {
      const breakdown = Array.isArray(attempt.topic_breakdown)
        ? attempt.topic_breakdown
        : [];

      breakdown.forEach((item) => {
        const topic =
          item?.topic?.trim() || 'Untagged';

        const current = map.get(topic) || {
          correct: 0,
          total: 0,
          wrong: 0,
          unanswered: 0,
        };

        current.correct += Number(item?.correct || 0);
        current.total += Number(item?.total || 0);
        current.wrong += Number(item?.wrong || 0);
        current.unanswered += Number(
          item?.unanswered || 0
        );

        map.set(topic, current);
      });
    });

    return Array.from(map.entries())
      .map(([topic, values]) => ({
        topic,
        correct: values.correct,
        total: values.total,
        wrong: values.wrong,
        unanswered: values.unanswered,
        percentage: values.total
          ? (values.correct / values.total) * 100
          : 0,
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.percentage - a.percentage);
  }, [selectedStudent]);

  const strengths = useMemo(
    () =>
      topicPerformance
        .filter(
          (topic) =>
            topic.percentage >= 70 && topic.total >= 2
        )
        .slice(0, 6),
    [topicPerformance]
  );

  const weaknesses = useMemo(
    () =>
      [...topicPerformance]
        .filter(
          (topic) =>
            topic.percentage < 60 && topic.total >= 2
        )
        .sort((a, b) => a.percentage - b.percentage)
        .slice(0, 6),
    [topicPerformance]
  );

  /*
   * ============================================================
   * PERFORMANCE TREND
   * ============================================================
   */

  const trend = useMemo(() => {
    if (!selectedStudent) return [];

    return [...selectedStudent.attempts]
      .sort(
        (a, b) =>
          new Date(a.submitted_at || 0).getTime() -
          new Date(b.submitted_at || 0).getTime()
      )
      .map((attempt, index) => ({
        index: index + 1,
        score: Number(attempt.score || 0),
        subject:
          attempt.subject?.name || 'Unknown',
        date: attempt.submitted_at,
        attempt,
      }));
  }, [selectedStudent]);

  const trendDirection = useMemo(() => {
    if (trend.length < 2) return 0;

    if (trend.length === 2) {
      return trend[1].score - trend[0].score;
    }

    const recent = trend.slice(-3);
    const older = trend.slice(
      0,
      Math.max(1, trend.length - 3)
    );

    const recentAverage =
      recent.reduce(
        (sum, item) => sum + item.score,
        0
      ) / recent.length;

    const olderAverage =
      older.reduce(
        (sum, item) => sum + item.score,
        0
      ) / older.length;

    return recentAverage - olderAverage;
  }, [trend]);

  /*
   * ============================================================
   * LINE GRAPH
   * ============================================================
   */

  const chart = useMemo(() => {
    const width = 900;
    const height = 330;

    const padding = {
      top: 28,
      right: 28,
      bottom: 55,
      left: 52,
    };

    const innerWidth =
      width - padding.left - padding.right;

    const innerHeight =
      height - padding.top - padding.bottom;

    if (!trend.length) {
      return {
        width,
        height,
        points: [],
        linePath: '',
        areaPath: '',
        grid: [],
      };
    }

    const points = trend.map((item, index) => {
      const x =
        trend.length === 1
          ? padding.left + innerWidth / 2
          : padding.left +
            (index / (trend.length - 1)) *
              innerWidth;

      const y =
        padding.top +
        (1 - clamp(item.score) / 100) *
          innerHeight;

      return {
        ...item,
        x,
        y,
      };
    });

    const linePath = points
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
      )
      .join(' ');

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    const areaPath = [
      `M ${firstPoint.x} ${padding.top + innerHeight}`,
      ...points.map(
        (point) => `L ${point.x} ${point.y}`
      ),
      `L ${lastPoint.x} ${
        padding.top + innerHeight
      }`,
      'Z',
    ].join(' ');

    const grid = [0, 25, 50, 75, 100].map(
      (value) => ({
        value,
        y:
          padding.top +
          (1 - value / 100) *
            innerHeight,
      })
    );

    return {
      width,
      height,
      points,
      linePath,
      areaPath,
      grid,
    };
  }, [trend]);

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Loading JAMB CBT analytics
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Preparing student performance intelligence...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * EMPTY STATE
   * ============================================================
   */

  if (!rows.length) {
    return (
      <div className="space-y-6 pb-10">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-700 p-6 md:p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-medium tracking-[0.18em] uppercase">
              <Activity className="w-4 h-4" />
              Academic Analytics · JAMB CBT
            </div>

            <h1 className="text-2xl md:text-3xl font-semibold mt-2 tracking-tight">
              JAMB CBT Performance Centre
            </h1>

            <p className="text-indigo-100 mt-2 max-w-2xl text-sm leading-6">
              A central intelligence view of student practice,
              subject performance, progress and topic mastery.
            </p>
          </div>

          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute right-20 -bottom-24 w-64 h-64 rounded-full bg-indigo-400/10 blur-3xl" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-12 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-5">
            <ClipboardList className="w-8 h-8 text-indigo-600" />
          </div>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            No completed CBT tests yet
          </h2>

          <p className="text-sm text-gray-500 max-w-lg mx-auto mt-2 leading-6">
            Completed student attempts will automatically appear
            here with student folders, performance trends,
            subject analysis and topic intelligence.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link
              to="/admin/jamb-cbt/questions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
            >
              <BookOpen className="w-4 h-4" />
              Question Bank
            </Link>

            <button
              type="button"
              onClick={() => load(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * MAIN DASHBOARD
   * ============================================================
   */

  return (
    <div className="space-y-6 pb-12">
      {/* ======================================================
          HEADER
      ======================================================= */}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-700 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-indigo-200 text-xs font-medium tracking-[0.18em] uppercase">
                <Activity className="w-4 h-4" />
                Academic Analytics · JAMB CBT
              </div>

              <h1 className="text-2xl md:text-3xl font-semibold mt-2 tracking-tight">
                JAMB CBT Performance Centre
              </h1>

              <p className="text-indigo-100 mt-2 text-sm md:text-[15px] leading-6 max-w-2xl">
                A complete view of student practice history,
                subject performance, progress trends and
                topic-level mastery.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/admin/jamb-cbt/questions"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-800 text-sm font-medium hover:bg-indigo-50 transition shadow-sm"
              >
                <ClipboardList className="w-4 h-4" />
                Question Bank
                <ChevronRight className="w-4 h-4" />
              </Link>

              <Link
                to="/admin/jamb-cbt/questions"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/15 transition"
              >
                <Upload className="w-4 h-4" />
                Import Questions
              </Link>

              <button
                type="button"
                onClick={() => load(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/15 transition disabled:opacity-60"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    refreshing ? 'animate-spin' : ''
                  }`}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-7">
            <div className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm p-4">
              <p className="text-xs text-indigo-200">
                Students
              </p>
              <p className="text-2xl font-semibold mt-1">
                {globalStats.uniqueStudents}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm p-4">
              <p className="text-xs text-indigo-200">
                Completed Tests
              </p>
              <p className="text-2xl font-semibold mt-1">
                {globalStats.attempts}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm p-4">
              <p className="text-xs text-indigo-200">
                Average
              </p>
              <p className="text-2xl font-semibold mt-1">
                {globalStats.average.toFixed(1)}%
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm p-4">
              <p className="text-xs text-indigo-200">
                Highest
              </p>
              <p className="text-2xl font-semibold mt-1">
                {globalStats.best.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="absolute -right-24 -top-28 w-96 h-96 rounded-full bg-indigo-400/15 blur-3xl" />
        <div className="absolute right-40 -bottom-40 w-80 h-80 rounded-full bg-indigo-300/10 blur-3xl" />
      </section>

      {/* ======================================================
          GLOBAL KPI CARDS
      ======================================================= */}

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Users,
            label: 'Students Practising',
            value: globalStats.uniqueStudents,
            description: 'Student performance folders',
          },
          {
            icon: ClipboardList,
            label: 'Tests Completed',
            value: globalStats.attempts,
            description: 'Submitted CBT attempts',
          },
          {
            icon: Target,
            label: 'Questions Attempted',
            value: globalStats.totalQuestions,
            description: `${globalStats.totalCorrect} answered correctly`,
          },
          {
            icon: Trophy,
            label: 'Highest Score',
            value: `${globalStats.best.toFixed(1)}%`,
            description: 'Best recorded attempt',
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900 transition"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>

                <BarChart3 className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </div>

              <p className="text-xs text-gray-500 mt-4">
                {item.label}
              </p>

              <p className="text-2xl font-semibold mt-1 text-gray-900 dark:text-white">
                {item.value}
              </p>

              <p className="text-xs text-gray-400 mt-1">
                {item.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* ======================================================
          ADMIN WORKSPACE
      ======================================================= */}

      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start">
        {/* ====================================================
            STUDENT FOLDERS
        ===================================================== */}

        <aside className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden xl:sticky xl:top-4">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Student Records
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  {studentFolders.length} student folders
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                <Folder className="w-5 h-5 text-indigo-600" />
              </div>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name or admission number..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="max-h-[760px] overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="w-8 h-8 mx-auto text-gray-300 mb-2" />

                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  No student found
                </p>
              </div>
            ) : (
              <div className="p-2">
                {filteredStudents.map((student) => {
                  const active =
                    selectedStudentId ===
                    student.studentId;

                  const scoreTone =
                    getScoreTone(student.average);

                  return (
                    <button
                      key={student.studentId}
                      type="button"
                      onClick={() =>
                        setSelectedStudentId(
                          student.studentId
                        )
                      }
                      className={`w-full text-left p-3 rounded-2xl transition mb-1 border ${
                        active
                          ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${
                            active
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                          }`}
                        >
                          {active ? (
                            <FolderOpen className="w-5 h-5" />
                          ) : (
                            <Folder className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={`text-sm font-medium truncate ${
                                active
                                  ? 'text-indigo-800 dark:text-indigo-200'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {student.name}
                            </p>

                            <span
                              className={`text-sm font-medium ${scoreTone.text}`}
                            >
                              {student.average.toFixed(0)}%
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-[11px] text-gray-500 truncate">
                              {student.admissionNo}
                            </span>

                            <span className="text-[11px] text-gray-400">
                              {student.attempts.length}{' '}
                              {student.attempts.length === 1
                                ? 'test'
                                : 'tests'}
                            </span>
                          </div>

                          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 mt-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${scoreTone.bar}`}
                              style={{
                                width: `${clamp(
                                  student.average
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ====================================================
            STUDENT DETAIL
        ===================================================== */}

        <main className="space-y-5 min-w-0">
          {!selectedStudent ? (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 text-center border border-gray-100 dark:border-gray-700">
              <UserRound className="w-10 h-10 mx-auto text-gray-300 mb-3" />

              <p className="font-medium text-gray-600 dark:text-gray-300">
                Select a student folder
              </p>
            </div>
          ) : (
            <>
              {/* ==================================================
                  STUDENT PROFILE
              =================================================== */}

              <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="relative p-5 md:p-7 bg-gradient-to-br from-indigo-50 via-white to-indigo-50/40 dark:from-gray-800 dark:via-gray-800 dark:to-indigo-950/30">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        {selectedStudent.attempts[0]?.registration?.student
                          ?.passport_url ? (
                          <img
                            src={
                              selectedStudent.attempts[0]
                                ?.registration?.student
                                ?.passport_url || ''
                            }
                            alt={selectedStudent.name}
                            className="w-16 h-16 rounded-2xl object-cover border border-indigo-100 dark:border-indigo-900 shadow-sm"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg font-medium shadow-lg">
                            {getInitials(
                              selectedStudent.name
                            )}
                          </div>
                        )}

                        <div className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-indigo-600" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
                            {selectedStudent.name}
                          </h2>

                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-100 dark:border-indigo-900">
                            <ShieldCheck className="w-3 h-3" />
                            CBT Record
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                          <p className="text-sm text-gray-500">
                            Admission No:{' '}
                            <span className="text-gray-800 dark:text-gray-200 font-medium">
                              {selectedStudent.admissionNo}
                            </span>
                          </p>

                          <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-300" />

                          <p className="text-xs text-gray-400">
                            {selectedStudent.attempts.length}{' '}
                            completed practice{' '}
                            {selectedStudent.attempts.length === 1
                              ? 'test'
                              : 'tests'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="lg:text-right">
                      <p className="text-xs text-gray-500">
                        Overall performance
                      </p>

                      <p
                        className={`text-4xl font-semibold mt-1 ${
                          getScoreTone(
                            selectedStudent.average
                          ).text
                        }`}
                      >
                        {selectedStudent.average.toFixed(1)}%
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {getPerformanceLabel(
                          selectedStudent.average
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-7">
                    <div className="rounded-2xl bg-white/80 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 p-4">
                      <p className="text-[11px] text-gray-500">
                        Tests Completed
                      </p>
                      <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
                        {selectedStudent.attempts.length}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/80 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 p-4">
                      <p className="text-[11px] text-gray-500">
                        Best Score
                      </p>
                      <p
                        className={`text-xl font-semibold mt-1 ${
                          getScoreTone(
                            selectedStudent.best
                          ).text
                        }`}
                      >
                        {selectedStudent.best.toFixed(1)}%
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/80 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 p-4">
                      <p className="text-[11px] text-gray-500">
                        Latest Score
                      </p>
                      <p
                        className={`text-xl font-semibold mt-1 ${
                          getScoreTone(
                            selectedStudent.latest
                          ).text
                        }`}
                      >
                        {selectedStudent.latest.toFixed(1)}%
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/80 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 p-4">
                      <p className="text-[11px] text-gray-500">
                        Questions
                      </p>
                      <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
                        {selectedStudent.totalQuestions}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* ==================================================
                  PERFORMANCE LINE GRAPH
              =================================================== */}

              <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />

                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                          Performance trajectory
                        </h2>
                      </div>

                      <p className="text-xs text-gray-500 mt-1">
                        Every completed attempt, ordered from oldest
                        to most recent.
                      </p>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                        trendDirection >= 0
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {trendDirection >= 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}

                      {trendDirection >= 0
                        ? 'Improving'
                        : 'Declining'}{' '}
                      · {Math.abs(trendDirection).toFixed(1)} pts
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-6">
                  {trend.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                      No trend data available.
                    </div>
                  ) : (
                    <>
                      <div className="w-full overflow-x-auto">
                        <svg
                          viewBox={`0 0 ${chart.width} ${chart.height}`}
                          className="w-full min-w-[680px] h-[300px]"
                          preserveAspectRatio="none"
                          role="img"
                          aria-label="Student performance trend"
                        >
                          <defs>
                            <linearGradient
                              id="jambTrendFill"
                              x1="0"
                              x2="0"
                              y1="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#4f46e5"
                                stopOpacity="0.18"
                              />
                              <stop
                                offset="100%"
                                stopColor="#4f46e5"
                                stopOpacity="0"
                              />
                            </linearGradient>
                          </defs>

                          {chart.grid.map((gridLine) => (
                            <g key={gridLine.value}>
                              <line
                                x1="52"
                                x2="872"
                                y1={gridLine.y}
                                y2={gridLine.y}
                                stroke="currentColor"
                                className="text-gray-100 dark:text-gray-700"
                                strokeWidth="1"
                              />

                              <text
                                x="42"
                                y={gridLine.y + 4}
                                textAnchor="end"
                                className="fill-gray-400"
                                fontSize="11"
                              >
                                {gridLine.value}%
                              </text>
                            </g>
                          ))}

                          <path
                            d={chart.areaPath}
                            fill="url(#jambTrendFill)"
                          />

                          <path
                            d={chart.linePath}
                            fill="none"
                            stroke="#4f46e5"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {chart.points.map((point) => (
                            <g key={`${point.index}-${point.date}`}>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="7"
                                fill="white"
                                stroke="#4f46e5"
                                strokeWidth="3"
                                className="dark:fill-gray-800"
                              />

                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="3"
                                fill="#4f46e5"
                              />

                              <text
                                x={point.x}
                                y={point.y - 15}
                                textAnchor="middle"
                                className="fill-indigo-700 dark:fill-indigo-300"
                                fontSize="11"
                                fontWeight="500"
                              >
                                {point.score.toFixed(0)}%
                              </text>

                              <text
                                x={point.x}
                                y={chart.height - 25}
                                textAnchor="middle"
                                className="fill-gray-400"
                                fontSize="10"
                              >
                                {point.subject.length > 12
                                  ? `${point.subject.slice(
                                      0,
                                      12
                                    )}…`
                                  : point.subject}
                              </text>
                            </g>
                          ))}
                        </svg>
                      </div>

                      <div className="flex flex-wrap items-center gap-5 mt-2 px-2 text-xs text-gray-400">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                          CBT score
                        </span>

                        <span>
                          {trend.length}{' '}
                          {trend.length === 1
                            ? 'attempt'
                            : 'attempts'}{' '}
                          plotted
                        </span>

                        <span>
                          Latest:{' '}
                          <span className="text-gray-700 dark:text-gray-200 font-medium">
                            {selectedStudent.latest.toFixed(1)}%
                          </span>
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* ==================================================
                  ANSWER SUMMARY
              =================================================== */}

              <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  </div>

                  <p className="text-xs text-gray-500 mt-4">
                    Correct
                  </p>

                  <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                    {selectedStudent.totalCorrect}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-indigo-600" />
                  </div>

                  <p className="text-xs text-gray-500 mt-4">
                    Incorrect
                  </p>

                  <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                    {selectedStudent.totalWrong}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                    <MinusCircle className="w-5 h-5 text-indigo-600" />
                  </div>

                  <p className="text-xs text-gray-500 mt-4">
                    Unanswered
                  </p>

                  <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                    {selectedStudent.totalUnanswered}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                    <Target className="w-5 h-5 text-indigo-600" />
                  </div>

                  <p className="text-xs text-gray-500 mt-4">
                    Overall Accuracy
                  </p>

                  <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                    {selectedStudent.totalQuestions
                      ? (
                          (selectedStudent.totalCorrect /
                            selectedStudent.totalQuestions) *
                          100
                        ).toFixed(1)
                      : '0.0'}
                    %
                  </p>
                </div>
              </section>

              {/* ==================================================
                  SUBJECT PERFORMANCE
              =================================================== */}

              <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />

                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      Subject performance
                    </h2>
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    Consolidated performance across every completed
                    attempt for this student.
                  </p>
                </div>

                {subjectPerformance.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400">
                    No subject performance available.
                  </div>
                ) : (
                  <div className="p-4 md:p-5 grid md:grid-cols-2 gap-4">
                    {subjectPerformance.map((subject) => {
                      const tone = getScoreTone(
                        subject.average
                      );

                      return (
                        <div
                          key={subject.name}
                          className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hover:border-indigo-100 dark:hover:border-indigo-900 transition"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                                {subject.name
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {subject.name}
                                </p>

                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  {subject.attempts}{' '}
                                  {subject.attempts === 1
                                    ? 'attempt'
                                    : 'attempts'}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`text-xl font-semibold ${tone.text}`}
                            >
                              {subject.average.toFixed(1)}%
                            </span>
                          </div>

                          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-4">
                            <div
                              className={`h-full rounded-full ${tone.bar}`}
                              style={{
                                width: `${clamp(
                                  subject.average
                                )}%`,
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-3 mt-4">
                            <div>
                              <p className="text-[10px] text-gray-400">
                                Accuracy
                              </p>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mt-0.5">
                                {subject.accuracy.toFixed(1)}%
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] text-gray-400">
                                Correct
                              </p>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mt-0.5">
                                {subject.correct}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] text-gray-400">
                                Questions
                              </p>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mt-0.5">
                                {subject.questions}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ==================================================
                  TOPIC INTELLIGENCE
              =================================================== */}

              <section className="grid lg:grid-cols-2 gap-5">
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-indigo-600" />

                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        Strongest topics
                      </h2>
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                      Areas where the student demonstrates the strongest
                      topic-level accuracy.
                    </p>
                  </div>

                  {strengths.length === 0 ? (
                    <div className="p-8 text-center">
                      <Brain className="w-8 h-8 mx-auto text-gray-300 mb-2" />

                      <p className="text-sm font-medium text-gray-500">
                        Not enough evidence for a strong topic yet.
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        More attempts will make this intelligence more
                        reliable.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {strengths.map((topic) => (
                        <div
                          key={topic.topic}
                          className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                              {topic.topic}
                            </p>

                            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                              {topic.percentage.toFixed(0)}%
                            </span>
                          </div>

                          <div className="h-1.5 bg-white dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                            <div
                              className="h-full bg-indigo-600 rounded-full"
                              style={{
                                width: `${clamp(
                                  topic.percentage
                                )}%`,
                              }}
                            />
                          </div>

                          <p className="text-[10px] text-gray-500 mt-2">
                            {topic.correct} correct ·{' '}
                            {topic.wrong} incorrect ·{' '}
                            {topic.total} questions
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-600" />

                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        Priority revision topics
                      </h2>
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                      Topics with the weakest demonstrated accuracy.
                    </p>
                  </div>

                  {weaknesses.length === 0 ? (
                    <div className="p-8 text-center">
                      <CheckCircle2 className="w-8 h-8 mx-auto text-indigo-400 mb-2" />

                      <p className="text-sm font-medium text-gray-500">
                        No significant weakness identified.
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        Continue monitoring future attempts.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {weaknesses.map((topic) => (
                        <div
                          key={topic.topic}
                          className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                              {topic.topic}
                            </p>

                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-300">
                              {topic.percentage.toFixed(0)}%
                            </span>
                          </div>

                          <div className="h-1.5 bg-white dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                            <div
                              className="h-full bg-indigo-400 rounded-full"
                              style={{
                                width: `${clamp(
                                  topic.percentage
                                )}%`,
                              }}
                            />
                          </div>

                          <p className="text-[10px] text-gray-500 mt-2">
                            {topic.correct} correct ·{' '}
                            {topic.wrong} incorrect ·{' '}
                            {topic.total} questions
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* ==================================================
                  ALL ATTEMPT RECORDS
              =================================================== */}

              <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-indigo-600" />

                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                          Complete test history
                        </h2>
                      </div>

                      <p className="text-xs text-gray-500 mt-1">
                        Every completed JAMB practice attempt belonging
                        to this student is displayed below.
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                      <Activity className="w-3.5 h-3.5" />
                      {selectedStudent.attempts.length}{' '}
                      {selectedStudent.attempts.length === 1
                        ? 'record'
                        : 'records'}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {selectedStudent.attempts.map(
                    (attempt, index) => {
                      const score = Number(
                        attempt.score || 0
                      );

                      const total = Number(
                        attempt.question_count || 0
                      );

                      const correct = Number(
                        attempt.correct_count || 0
                      );

                      const unanswered = Number(
                        attempt.unanswered_count || 0
                      );

                      const wrong =
                        attempt.wrong_count !== null &&
                        attempt.wrong_count !== undefined
                          ? Number(
                              attempt.wrong_count || 0
                            )
                          : Math.max(
                              0,
                              total -
                                correct -
                                unanswered
                            );

                      const tone =
                        getScoreTone(score);

                      const topicCount =
                        Array.isArray(
                          attempt.topic_breakdown
                        )
                          ? attempt.topic_breakdown.length
                          : 0;

                      return (
                        <div
                          key={attempt.id}
                          className="p-4 md:p-5 hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition"
                        >
                          <div className="flex flex-col xl:flex-row xl:items-center gap-5">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="w-11 h-11 shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-sm font-medium">
                                {selectedStudent.attempts.length -
                                  index}
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {attempt.subject?.name ||
                                      'Unknown Subject'}
                                  </p>

                                  {attempt.subject?.code && (
                                    <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-[10px] text-gray-500 dark:text-gray-300">
                                      {attempt.subject.code}
                                    </span>
                                  )}

                                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/30 text-[10px] text-indigo-600 dark:text-indigo-300">
                                    Completed
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-500">
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarDays className="w-3 h-3" />
                                    {formatDate(
                                      attempt.submitted_at
                                    )}
                                  </span>

                                  <span className="inline-flex items-center gap-1">
                                    <Clock3 className="w-3 h-3" />
                                    {formatDuration(
                                      attempt.duration_seconds
                                    )}
                                  </span>

                                  <span>
                                    {topicCount}{' '}
                                    {topicCount === 1
                                      ? 'topic'
                                      : 'topics'}{' '}
                                    analysed
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 xl:flex xl:items-center gap-4 xl:gap-6">
                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Correct
                                </p>

                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mt-1">
                                  {correct}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Wrong
                                </p>

                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mt-1">
                                  {wrong}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Unanswered
                                </p>

                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mt-1">
                                  {unanswered}
                                </p>
                              </div>

                              <div className="min-w-[75px]">
                                <p className="text-[10px] text-gray-400">
                                  Score
                                </p>

                                <p
                                  className={`text-xl font-semibold mt-0.5 ${tone.text}`}
                                >
                                  {score.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 ml-0 md:ml-14">
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${tone.bar}`}
                                style={{
                                  width: `${clamp(
                                    score
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>

              {/* ==================================================
                  ATTEMPT DETAIL INTELLIGENCE
              =================================================== */}

              <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-indigo-600" />

                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      Student intelligence
                    </h2>
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    Server-generated topic breakdown from the student's
                    completed CBT attempts.
                  </p>
                </div>

                <div className="p-5 md:p-6 grid md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                      <Target className="w-5 h-5 text-indigo-600" />
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      Topics analysed
                    </p>

                    <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                      {topicPerformance.length}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      Across all completed attempts
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                      <Award className="w-5 h-5 text-indigo-600" />
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      Strong topics
                    </p>

                    <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                      {strengths.length}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      Based on at least two questions
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      Revision priorities
                    </p>

                    <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                      {weaknesses.length}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      Topics below 60% accuracy
                    </p>
                  </div>
                </div>
              </section>

              {/* ==================================================
                  ADMIN ACTIONS
              =================================================== */}

              <section className="grid md:grid-cols-2 gap-4">
                <Link
                  to="/admin/jamb-cbt/questions"
                  className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>

                    <div className="flex-1">
                      <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                        Question Bank
                      </h2>

                      <p className="text-sm text-gray-500 mt-1 leading-5">
                        Create, edit, activate or bulk-import JAMB
                        questions.
                      </p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition" />
                  </div>
                </Link>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-indigo-600" />
                    </div>

                    <div>
                      <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                        Student intelligence
                      </h2>

                      <p className="text-sm text-gray-500 mt-1 leading-5">
                        Topic-level intelligence is generated from
                        the server-side CBT breakdown stored against
                        each completed attempt.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default JambCbtAnalytics;