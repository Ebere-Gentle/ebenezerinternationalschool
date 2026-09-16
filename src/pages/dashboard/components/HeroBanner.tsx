
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  GraduationCap,
  CreditCard,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  CalendarDays,
  School,
  Mail,
  Phone,
  Globe,
  MapPin,
  BookOpen,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';
import dayjs from 'dayjs';

import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../contexts/AuthContext';
import schoolLogo from '../../../assets/school-logo.png';

interface SchoolInfo {
  id: string;
  school_id: string;
  school_name: string;
  address: string | null;
  email: string | null;
  website: string | null;
  phone_number: string | null;
  logo_url: string | null;
  motto: string | null;
  academic_session: string | null;
  current_term: string | null;
}

interface AcademicSession {
  id: string;
  session_name: string;
  term_name: string;
  term_number: number;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  branch_id: string | null;
}

interface ResultBatch {
  id: string;
  max_score: number | null;
  status: string;
}

interface ResultEntry {
  id: string;
  student_id: string;
  score: number | null;
  percentage: number | null;
  batch_id: string;
}

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalPayments: number;
  totalRevenue: number;
  studentsPaid: number;
  previousTermRevenue: number;
  activeStudents: number;
  passRate: number | null;
}

interface PaymentRow {
  student_id: string;
  amount_paid: number | null;
  amount: number | null;
  status: string;
  academic_session: string | null;
  academic_term: string | null;
  created_at: string;
  payment_date: string | null;
  branch_id: string | null;
}

const PASS_MARK = 50;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount || 0);

const getPaymentAmount = (payment: PaymentRow) => {
  const amount = Number(payment.amount_paid ?? payment.amount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const getPreviousSessionName = (sessionName: string) => {
  const match = sessionName.match(/^(\d{4})\/(\d{4})$/);

  if (!match) return null;

  return `${Number(match[1]) - 1}/${Number(match[2]) - 1}`;
};

const HeroBanner: React.FC = () => {
  const { user } = useAuth();

  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [academicSession, setAcademicSession] =
    useState<AcademicSession | null>(null);

  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalPayments: 0,
    totalRevenue: 0,
    studentsPaid: 0,
    previousTermRevenue: 0,
    activeStudents: 0,
    passRate: null,
  });

  const [loading, setLoading] = useState(true);

  /*
   * PERSONALIZED GREETING
   */
  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return {
        text: 'Good morning',
        icon: Sun,
      };
    }

    if (hour >= 12 && hour < 18) {
      return {
        text: 'Good afternoon',
        icon: Sun,
      };
    }

    return {
      text: 'Good evening',
      icon: Moon,
    };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  /*
   * GET USER DISPLAY NAME
   */
  const getUserName = () => {
    if (!user) return 'Administrator';

    const authUser = user as typeof user & {
      first_name?: string | null;
      last_name?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      name?: string | null;
      full_name?: string | null;
      fullName?: string | null;
      email?: string | null;
    };

    const firstName =
      authUser.first_name ||
      authUser.firstName ||
      '';

    const lastName =
      authUser.last_name ||
      authUser.lastName ||
      '';

    const fullName =
      `${firstName} ${lastName}`.trim();

    if (fullName) {
      return fullName;
    }

    if (authUser.full_name) {
      return authUser.full_name;
    }

    if (authUser.fullName) {
      return authUser.fullName;
    }

    if (authUser.name) {
      return authUser.name;
    }

    if (authUser.email) {
      return authUser.email.split('@')[0];
    }

    return 'Administrator';
  };

  const userName = getUserName();

  const getUserBranchId = async (): Promise<string | null> => {
    if (!user?.id) return null;

    const authUser = user as typeof user & {
      branch_id?: string | null;
    };

    if (authUser.branch_id) {
      return authUser.branch_id;
    }

    const { data, error } = await supabase
      .from('users')
      .select('branch_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Unable to resolve user branch:', error);
      return null;
    }

    return data?.branch_id ?? null;
  };

  const fetchSchoolInfo = async (
    branchId: string | null
  ): Promise<SchoolInfo | null> => {
    let query = supabase
      .from('school_info')
      .select(`
        id,
        school_id,
        school_name,
        address,
        email,
        website,
        phone_number,
        logo_url,
        motto,
        academic_session,
        current_term
      `);

    if (branchId) {
      query = query.eq('school_id', branchId);
    }

    const { data, error } = await query
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        'Error loading school information:',
        error
      );
      return null;
    }

    return data as SchoolInfo | null;
  };

  /*
   * LIVE ACADEMIC RECORD
   *
   * academic_sessions is the authoritative source.
   */
  const fetchCurrentAcademicSession = async (
    branchId: string | null
  ): Promise<AcademicSession | null> => {
    let query = supabase
      .from('academic_sessions')
      .select(`
        id,
        session_name,
        term_name,
        term_number,
        start_date,
        end_date,
        is_current,
        branch_id
      `)
      .eq('is_current', true);

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        'Error loading current academic session:',
        error
      );
      return null;
    }

    return data as AcademicSession | null;
  };

  const fetchPreviousAcademicSession = async (
    current: AcademicSession,
    branchId: string | null
  ): Promise<AcademicSession | null> => {
    const previousSessionName = getPreviousSessionName(
      current.session_name
    );

    if (!previousSessionName) return null;

    let query = supabase
      .from('academic_sessions')
      .select(`
        id,
        session_name,
        term_name,
        term_number,
        start_date,
        end_date,
        is_current,
        branch_id
      `)
      .eq('session_name', previousSessionName);

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query
      .order('term_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        'Error loading previous academic session:',
        error
      );
      return null;
    }

    return data as AcademicSession | null;
  };

  /*
   * LIVE PASS RATE
   *
   * Published result batches only.
   * Passing percentage = 50% or higher.
   */
  const calculatePassRate = async (
    currentSession: AcademicSession,
    branchId: string | null
  ): Promise<number | null> => {
    let batchQuery = supabase
      .from('result_batches')
      .select(`
        id,
        max_score,
        status
      `)
      .eq('academic_session_id', currentSession.id)
      .eq('status', 'published');

    if (branchId) {
      batchQuery = batchQuery.eq(
        'branch_id',
        branchId
      );
    }

    const {
      data: batches,
      error: batchError,
    } = await batchQuery;

    if (batchError) {
      console.error(
        'Error loading published result batches:',
        batchError
      );
      return null;
    }

    if (!batches || batches.length === 0) {
      return null;
    }

    const typedBatches =
      batches as ResultBatch[];

    const batchIds = typedBatches.map(
      (batch) => batch.id
    );

    if (batchIds.length === 0) {
      return null;
    }

    const maxScoreMap = new Map<
      string,
      number
    >();

    typedBatches.forEach((batch) => {
      const maxScore = Number(
        batch.max_score ?? 100
      );

      if (
        Number.isFinite(maxScore) &&
        maxScore > 0
      ) {
        maxScoreMap.set(
          batch.id,
          maxScore
        );
      }
    });

    const {
      data: entries,
      error: entryError,
    } = await supabase
      .from('result_entries')
      .select(`
        id,
        student_id,
        score,
        percentage,
        batch_id
      `)
      .in('batch_id', batchIds);

    if (entryError) {
      console.error(
        'Error loading result entries:',
        entryError
      );
      return null;
    }

    if (!entries || entries.length === 0) {
      return null;
    }

    const typedEntries =
      entries as ResultEntry[];

    let totalResults = 0;
    let passedResults = 0;

    typedEntries.forEach((entry) => {
      let percentage: number | null = null;

      const storedPercentage =
        Number(entry.percentage);

      if (
        entry.percentage !== null &&
        Number.isFinite(storedPercentage)
      ) {
        percentage =
          storedPercentage;
      } else {
        const score = Number(
          entry.score
        );

        const maxScore =
          maxScoreMap.get(
            entry.batch_id
          ) ?? 100;

        if (
          Number.isFinite(score) &&
          Number.isFinite(maxScore) &&
          maxScore > 0
        ) {
          percentage =
            (score / maxScore) * 100;
        }
      }

      if (
        percentage === null ||
        !Number.isFinite(percentage)
      ) {
        return;
      }

      totalResults++;

      if (percentage >= PASS_MARK) {
        passedResults++;
      }
    });

    if (totalResults === 0) {
      return null;
    }

    return Math.round(
      (passedResults / totalResults) * 100
    );
  };

  const getPaymentStats = async (
    session: AcademicSession,
    branchId: string | null
  ) => {
    let query = supabase
      .from('payments')
      .select(`
        student_id,
        amount_paid,
        amount,
        status,
        academic_session,
        academic_term,
        created_at,
        payment_date,
        branch_id
      `)
      .eq('status', 'completed')
      .eq(
        'academic_session',
        session.session_name
      );

    if (branchId) {
      query = query.eq(
        'branch_id',
        branchId
      );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(
        `Error loading payments for ${session.session_name}:`,
        error
      );

      return {
        revenue: 0,
        studentsPaid: 0,
        totalPayments: 0,
      };
    }

    const payments =
      (data ?? []) as PaymentRow[];

    const revenue =
      payments.reduce(
        (total, payment) =>
          total +
          getPaymentAmount(payment),
        0
      );

    const uniqueStudents =
      new Set(
        payments
          .map(
            (payment) =>
              payment.student_id
          )
          .filter(Boolean)
      );

    return {
      revenue,
      studentsPaid:
        uniqueStudents.size,
      totalPayments:
        payments.length,
    };
  };

  const fetchStats = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const branchId =
        await getUserBranchId();

      const schoolData =
        await fetchSchoolInfo(
          branchId
        );

      if (schoolData) {
        setSchoolInfo(
          schoolData
        );
      }

      const currentSession =
        await fetchCurrentAcademicSession(
          branchId
        );

      if (!currentSession) {
        setAcademicSession(null);

        setStats({
          totalStudents: 0,
          totalTeachers: 0,
          totalPayments: 0,
          totalRevenue: 0,
          studentsPaid: 0,
          previousTermRevenue: 0,
          activeStudents: 0,
          passRate: null,
        });

        setLoading(false);
        return;
      }

      setAcademicSession(
        currentSession
      );

      /*
       * STUDENTS
       */
      let studentsQuery =
        supabase
          .from('students')
          .select(
            'id, current_status'
          );

      if (branchId) {
        studentsQuery =
          studentsQuery.eq(
            'branch_id',
            branchId
          );
      }

      const {
        data: students,
        error: studentsError,
      } = await studentsQuery;

      if (studentsError) {
        console.error(
          'Error loading students:',
          studentsError
        );
      }

      const studentRows =
        students ?? [];

      const totalStudents =
        studentRows.length;

      const activeStudents =
        studentRows.filter(
          (student) =>
            String(
              student.current_status ??
                ''
            ).toLowerCase() ===
            'active'
        ).length;

      /*
       * TEACHERS
       */
      let teachersQuery =
        supabase
          .from('users')
          .select('id')
          .eq(
            'role',
            'teacher'
          )
          .eq(
            'is_active',
            true
          );

      if (branchId) {
        teachersQuery =
          teachersQuery.eq(
            'branch_id',
            branchId
          );
      }

      const {
        data: teachers,
        error: teachersError,
      } = await teachersQuery;

      if (teachersError) {
        console.error(
          'Error loading teachers:',
          teachersError
        );
      }

      const totalTeachers =
        teachers?.length ?? 0;

      /*
       * PAYMENTS
       */
      const currentPaymentStats =
        await getPaymentStats(
          currentSession,
          branchId
        );

      /*
       * PREVIOUS SESSION
       */
      const previousSession =
        await fetchPreviousAcademicSession(
          currentSession,
          branchId
        );

      let previousTermRevenue =
        0;

      if (previousSession) {
        const previousPaymentStats =
          await getPaymentStats(
            previousSession,
            branchId
          );

        previousTermRevenue =
          previousPaymentStats.revenue;
      }

      /*
       * PASS RATE
       */
      const passRate =
        await calculatePassRate(
          currentSession,
          branchId
        );

      setStats({
        totalStudents,
        totalTeachers,
        totalPayments:
          currentPaymentStats.totalPayments,
        totalRevenue:
          currentPaymentStats.revenue,
        studentsPaid:
          currentPaymentStats.studentsPaid,
        previousTermRevenue,
        activeStudents,
        passRate,
      });
    } catch (error) {
      console.error(
        'HeroBanner statistics error:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user?.id]);

  const displayedSession =
    academicSession?.session_name ||
    schoolInfo?.academic_session ||
    'No active session';

  const displayedTerm =
    academicSession?.term_name ||
    schoolInfo?.current_term ||
    'No active term';

  const sessionStart =
    academicSession?.start_date
      ? dayjs(
          academicSession.start_date
        ).format('DD MMM YYYY')
      : null;

  const sessionEnd =
    academicSession?.end_date
      ? dayjs(
          academicSession.end_date
        ).format('DD MMM YYYY')
      : null;

  const revenueDifference =
    stats.totalRevenue -
    stats.previousTermRevenue;

  const revenuePercentage =
    stats.previousTermRevenue > 0
      ? Math.round(
          (Math.abs(
            revenueDifference
          ) /
            stats.previousTermRevenue) *
            100
        )
      : 0;

  const isRevenueIncreasing =
    revenueDifference >= 0;

  const logoUrl =
    schoolInfo?.logo_url ||
    schoolLogo;

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.45,
      }}
      className="w-full"
    >
      <div className="relative overflow-hidden rounded-3xl shadow-sm">

        {/* =====================================================
            BLUE HEADER
        ====================================================== */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-5 py-6 text-white sm:px-6 lg:px-8">

          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10" />

          <div className="pointer-events-none absolute -bottom-32 right-32 h-72 w-72 rounded-full bg-blue-400/10" />

          <div className="pointer-events-none absolute -left-24 bottom-[-140px] h-72 w-72 rounded-full bg-indigo-500/20" />

          <div className="relative">

            {/* =================================================
                PERSONALIZED WELCOME
            ================================================== */}
            <div className="mb-5 flex items-center gap-2">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <GreetingIcon className="h-4 w-4 text-blue-100" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {greeting.text},{' '}
                  <span className="font-bold">
                    {userName}
                  </span>{' '}
                  👋
                </p>

                <p className="mt-0.5 text-xs text-blue-100">
                  Welcome back to your school administration dashboard.
                </p>
              </div>

            </div>

            {/* =================================================
                SCHOOL + ACADEMIC RECORD
            ================================================== */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              {/* SCHOOL INFORMATION */}
              <div className="flex min-w-0 items-center gap-4">

                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-white/30">
                  <img
                    src={logoUrl}
                    alt={
                      schoolInfo?.school_name ||
                      'School logo'
                    }
                    className="h-full w-full object-contain p-2"
                    onError={(event) => {
                      const target =
                        event.currentTarget;

                      if (
                        target.src !==
                        schoolLogo
                      ) {
                        target.src =
                          schoolLogo;
                      }
                    }}
                  />
                </div>

                <div className="min-w-0">

                  <div className="flex items-center gap-2">
                    <School className="h-4 w-4 shrink-0 text-blue-100" />

                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                      School Administration
                    </p>
                  </div>

                  <h1 className="mt-1 truncate text-xl font-bold sm:text-2xl lg:text-3xl">
                    {schoolInfo?.school_name ||
                      'Ebenezer International School'}
                  </h1>

                  {schoolInfo?.motto && (
                    <p className="mt-1 max-w-2xl text-sm italic text-blue-100">
                      "{schoolInfo.motto}"
                    </p>
                  )}

                </div>
              </div>

              {/* CURRENT ACADEMIC RECORD */}
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm lg:min-w-[280px]">

                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-blue-100" />

                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                    Current Academic Record
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">

                  <span className="text-base font-bold text-white">
                    {displayedSession}
                  </span>

                  <span className="text-blue-200">
                    •
                  </span>

                  <span className="text-base font-semibold text-blue-50">
                    {displayedTerm}
                  </span>

                </div>

                {academicSession?.term_number && (
                  <p className="mt-1 text-xs text-blue-100">
                    Term{' '}
                    {academicSession.term_number}
                  </p>
                )}

                {(sessionStart ||
                  sessionEnd) && (
                  <p className="mt-1 text-xs text-blue-100">
                    {sessionStart ||
                      '—'}{' '}
                    {sessionEnd
                      ? `– ${sessionEnd}`
                      : ''}
                  </p>
                )}

              </div>
            </div>

            {/* =================================================
                CONTACT INFORMATION
            ================================================== */}
            <div className="relative mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/15 pt-4">

              {schoolInfo?.address && (
                <div className="flex items-center gap-2 text-xs text-blue-100">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {schoolInfo.address}
                  </span>
                </div>
              )}

              {schoolInfo?.phone_number && (
                <div className="flex items-center gap-2 text-xs text-blue-100">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {schoolInfo.phone_number}
                  </span>
                </div>
              )}

              {schoolInfo?.email && (
                <div className="flex items-center gap-2 text-xs text-blue-100">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {schoolInfo.email}
                  </span>
                </div>
              )}

              {schoolInfo?.website && (
                <div className="flex items-center gap-2 text-xs text-blue-100">
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {schoolInfo.website}
                  </span>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* =====================================================
            STATISTICS SECTION
        ====================================================== */}
        <div className="bg-white p-5 sm:p-6 lg:p-8">

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {/* STUDENTS */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Students
                  </p>

                  {loading ? (
                    <Loader2 className="mt-2 h-6 w-6 animate-spin text-blue-500" />
                  ) : (
                    <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                      {stats.totalStudents.toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-blue-50 p-3">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>

              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCircle className="h-3.5 w-3.5 text-blue-500" />

                <span>
                  {stats.activeStudents.toLocaleString()}{' '}
                  active
                </span>
              </div>

            </div>

            {/* TEACHERS */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Teachers
                  </p>

                  {loading ? (
                    <Loader2 className="mt-2 h-6 w-6 animate-spin text-blue-500" />
                  ) : (
                    <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                      {stats.totalTeachers.toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-blue-50 p-3">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                </div>

              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                <span>
                  Active teaching staff
                </span>
              </div>

            </div>

            {/* REVENUE */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div className="min-w-0">

                  <p className="text-sm font-medium text-slate-500">
                    Revenue
                  </p>

                  {loading ? (
                    <Loader2 className="mt-2 h-6 w-6 animate-spin text-blue-500" />
                  ) : (
                    <p className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">
                      {formatCurrency(
                        stats.totalRevenue
                      )}
                    </p>
                  )}

                </div>

                <div className="rounded-xl bg-blue-50 p-3">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>

              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs">

                {!loading &&
                  stats.previousTermRevenue >
                    0 && (
                    <>
                      {isRevenueIncreasing ? (
                        <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                      )}

                      <span
                        className={
                          isRevenueIncreasing
                            ? 'font-medium text-green-600'
                            : 'font-medium text-red-600'
                        }
                      >
                        {revenuePercentage}%{' '}
                        {isRevenueIncreasing
                          ? 'increase'
                          : 'decrease'}
                      </span>

                      <span className="text-slate-400">
                        vs previous session
                      </span>
                    </>
                  )}

                {!loading &&
                  stats.previousTermRevenue ===
                    0 && (
                    <span className="text-slate-500">
                      {stats.studentsPaid.toLocaleString()}{' '}
                      students paid
                    </span>
                  )}

              </div>
            </div>

            {/* PASS RATE */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div>

                  <p className="text-sm font-medium text-slate-500">
                    Pass Rate
                  </p>

                  {loading ? (
                    <Loader2 className="mt-2 h-6 w-6 animate-spin text-blue-500" />
                  ) : (
                    <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                      {stats.passRate ===
                      null
                        ? '—'
                        : `${stats.passRate}%`}
                    </p>
                  )}

                </div>

                <div className="rounded-xl bg-blue-50 p-3">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>

              </div>

              <div className="mt-3 text-xs text-slate-500">
                {stats.passRate ===
                null
                  ? 'No published results yet'
                  : `Published results · pass mark ${PASS_MARK}%`}
              </div>

            </div>
          </div>

          {/* ===================================================
              ACADEMIC STATUS
          ==================================================== */}
          <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-blue-100">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>

              <div>

                <p className="text-sm font-semibold text-slate-900">
                  {displayedSession}
                </p>

                <p className="text-xs text-slate-500">
                  {displayedTerm}

                  {academicSession?.term_number
                    ? ` · Term ${academicSession.term_number}`
                    : ''}
                </p>

              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-blue-700">

              <span className="h-2 w-2 rounded-full bg-blue-500" />

              Current academic record

            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
};

export default HeroBanner;
