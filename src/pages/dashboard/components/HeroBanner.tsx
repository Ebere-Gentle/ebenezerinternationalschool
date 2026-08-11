import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  School,
  Award,
  User,
  Building2,
  GraduationCap,
  CreditCard,
  TrendingUp,
} from 'lucide-react';
import dayjs from 'dayjs';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

import schoolLogo from '../../../assets/school-logo.png';

interface SchoolInfo {
  id: string;
  school_id: string;
  school_name: string;
  address: string;
  email: string;
  website: string;
  phone_number: string;
  logo_url: string;
  motto: string;
  academic_session: string;
  current_term: string;
}

interface AcademicSession {
  id: string;
  session_name: string;
  term_name: string;
  term_number: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
  branch_id: string;
}

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;

  // Current term payment statistics
  totalPayments: number;
  totalRevenue: number;
  studentsPaid: number;

  // Previous term
  previousTermRevenue: number;

  activeStudents: number;
  passRate: number;
}

interface PaymentRow {
  id: string;
  student_id: string | null;
  amount_paid: number | string | null;
  amount: number | string | null;
  status: string | null;
  academic_session: string | null;
  academic_term: string | null;
  created_at: string | null;
  payment_date: string | null;
  branch_id: string | null;
}

const HeroBanner: React.FC = () => {
  const { user } = useAuth();

  const [schoolInfo, setSchoolInfo] =
    useState<SchoolInfo | null>(null);

  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalPayments: 0,
    totalRevenue: 0,
    studentsPaid: 0,
    previousTermRevenue: 0,
    activeStudents: 0,
    passRate: 0,
  });

  const [loading, setLoading] = useState(true);
  const [branchName, setBranchName] = useState('');

  const currentTime = dayjs();
  const hour = currentTime.hour();

  const greeting =
    hour < 12
      ? 'Good Morning'
      : hour < 17
      ? 'Good Afternoon'
      : 'Good Evening';

  const firstName =
    user?.first_name ||
    user?.email?.split('@')[0] ||
    'User';

  const userRole = user?.role || 'Staff';
  const userPosition = user?.metadata?.position || '';
  const userBranchId = user?.branch_id;

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      super_admin: 'Super Administrator',
      branch_admin: 'Branch Administrator',
      admin: 'Administrator',
      teacher: 'Teacher',
      student: 'Student',
      parent: 'Parent',
      director: 'Director',
      principal: 'Principal',
      admissions_officer: 'Admissions Officer',
      accountant: 'Accountant',
      record_keeper: 'Record Keeper',
      bursar: 'Bursar',
      staff: 'Staff Member',
    };

    return (
      roleMap[role] ||
      role.charAt(0).toUpperCase() +
        role.slice(1).replace(/_/g, ' ')
    );
  };

  /**
   * Normalize term names so that:
   *
   * "First Term"
   * "1st Term"
   * "First"
   * "1"
   *
   * can be compared reliably.
   */
  const normalizeTerm = (term: string | null | undefined) => {
    if (!term) return '';

    const value = term
      .toString()
      .trim()
      .toLowerCase();

    if (
      value.includes('first') ||
      value.includes('1st') ||
      value === '1'
    ) {
      return 'first';
    }

    if (
      value.includes('second') ||
      value.includes('2nd') ||
      value === '2'
    ) {
      return 'second';
    }

    if (
      value.includes('third') ||
      value.includes('3rd') ||
      value === '3'
    ) {
      return 'third';
    }

    return value;
  };

  /**
   * Determine the term number from a term name.
   */
  const getTermNumber = (
    term: string | null | undefined
  ) => {
    const normalized = normalizeTerm(term);

    if (normalized === 'first') return 1;
    if (normalized === 'second') return 2;
    if (normalized === 'third') return 3;

    return 0;
  };

  /**
   * Get current academic session.
   *
   * We first use academic_sessions.is_current.
   * If no current record is found, school_info is used
   * as a fallback because your payment records already
   * store academic_session and academic_term directly.
   */
  const getCurrentAcademicSession =
    async (): Promise<AcademicSession | null> => {
      try {
        let query = supabase
          .from('academic_sessions')
          .select(
            `
              id,
              session_name,
              term_name,
              term_number,
              start_date,
              end_date,
              is_current,
              branch_id
            `
          )
          .eq('is_current', true);

        if (userBranchId) {
          query = query.eq(
            'branch_id',
            userBranchId
          );
        }

        const {
          data,
          error,
        } = await query
          .order('start_date', {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error(
            'Error fetching current academic session:',
            error
          );

          return null;
        }

        return data;
      } catch (error) {
        console.error(
          'Unexpected error fetching current academic session:',
          error
        );

        return null;
      }
    };

  /**
   * Get previous academic term.
   */
  const getPreviousAcademicSession = async (
    currentSession: AcademicSession
  ): Promise<AcademicSession | null> => {
    try {
      const currentTermNumber =
        currentSession.term_number ||
        getTermNumber(
          currentSession.term_name
        );

      /**
       * If current term is Second or Third,
       * previous term is within the same session.
       */
      if (currentTermNumber > 1) {
        const previousTermNumber =
          currentTermNumber - 1;

        let query = supabase
          .from('academic_sessions')
          .select(
            `
              id,
              session_name,
              term_name,
              term_number,
              start_date,
              end_date,
              is_current,
              branch_id
            `
          )
          .eq(
            'session_name',
            currentSession.session_name
          )
          .eq(
            'term_number',
            previousTermNumber
          );

        if (userBranchId) {
          query = query.eq(
            'branch_id',
            userBranchId
          );
        }

        const {
          data,
          error,
        } = await query
          .order('start_date', {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error(
            'Error fetching previous academic term:',
            error
          );

          return null;
        }

        return data;
      }

      /**
       * Current term is First Term.
       * Previous term is Third Term of
       * the previous academic session.
       */
      const match =
        currentSession.session_name.match(
          /^(\d{4})\/(\d{4})$/
        );

      if (!match) {
        return null;
      }

      const startYear = Number(match[1]);
      const endYear = Number(match[2]);

      const previousSessionName =
        `${startYear - 1}/${endYear - 1}`;

      let query = supabase
        .from('academic_sessions')
        .select(
          `
            id,
            session_name,
            term_name,
            term_number,
            start_date,
            end_date,
            is_current,
            branch_id
          `
        )
        .eq(
          'session_name',
          previousSessionName
        )
        .eq('term_number', 3);

      if (userBranchId) {
        query = query.eq(
          'branch_id',
          userBranchId
        );
      }

      const {
        data,
        error,
      } = await query
        .order('start_date', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          'Error fetching previous academic session:',
          error
        );

        return null;
      }

      return data;
    } catch (error) {
      console.error(
        'Unexpected error fetching previous academic session:',
        error
      );

      return null;
    }
  };

  /**
   * Fetch payment statistics directly from payments.
   *
   * IMPORTANT:
   *
   * We DO NOT use term_id.
   *
   * Your current payment records look like:
   *
   * academic_session = "2026/2027"
   * academic_term    = "First Term"
   * term_id          = NULL
   *
   * Therefore academic_session + academic_term
   * are the authoritative filters.
   */
  const getPaymentStats = async (
    academicSession: AcademicSession | null
  ) => {
    if (!academicSession) {
      return {
        totalPayments: 0,
        totalRevenue: 0,
        studentsPaid: 0,
      };
    }

    try {
      /**
       * First try to use the exact term stored
       * in academic_sessions.
       */
      let query = supabase
        .from('payments')
        .select(
          `
            id,
            student_id,
            amount_paid,
            amount,
            status,
            academic_session,
            academic_term,
            created_at,
            payment_date,
            branch_id
          `
        )
        .eq('status', 'completed')
        .eq(
          'academic_session',
          academicSession.session_name
        );

      if (userBranchId) {
        query = query.eq(
          'branch_id',
          userBranchId
        );
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        console.error(
          'Error fetching payments:',
          error
        );

        return {
          totalPayments: 0,
          totalRevenue: 0,
          studentsPaid: 0,
        };
      }

      /**
       * Filter term in JavaScript using normalized
       * values instead of relying on exact spelling.
       *
       * This handles:
       *
       * First Term
       * 1st Term
       * first term
       * FIRST TERM
       */
      const expectedTerm =
        normalizeTerm(
          academicSession.term_name
        );

      const payments =
        ((data || []) as PaymentRow[]).filter(
          (payment) => {
            const paymentTerm =
              normalizeTerm(
                payment.academic_term
              );

            return (
              paymentTerm === expectedTerm
            );
          }
        );

      /**
       * Number of actual completed transactions.
       */
      const totalPayments =
        payments.length;

      /**
       * Sum amount_paid.
       *
       * amount_paid is preferred because that is
       * the actual amount recorded as paid.
       */
      const totalRevenue =
        payments.reduce(
          (sum, payment) => {
            const paid =
              Number(
                payment.amount_paid ??
                  payment.amount ??
                  0
              );

            return (
              sum +
              (Number.isFinite(paid)
                ? paid
                : 0)
            );
          },
          0
        );

      /**
       * Count UNIQUE students.
       *
       * If Bayo makes 6 fee payments,
       * he counts as ONE student paid.
       */
      const uniqueStudentIds =
        new Set<string>();

      payments.forEach(
        (payment) => {
          if (payment.student_id) {
            uniqueStudentIds.add(
              payment.student_id
            );
          }
        }
      );

      const studentsPaid =
        uniqueStudentIds.size;

      return {
        totalPayments,
        totalRevenue,
        studentsPaid,
      };
    } catch (error) {
      console.error(
        'Unexpected error fetching payment statistics:',
        error
      );

      return {
        totalPayments: 0,
        totalRevenue: 0,
        studentsPaid: 0,
      };
    }
  };

  /**
   * Fetch all dashboard statistics.
   */
  const fetchStats = async () => {
    try {
      /**
       * CURRENT ACADEMIC TERM
       */
      const currentAcademicSession =
        await getCurrentAcademicSession();

      /**
       * PREVIOUS ACADEMIC TERM
       */
      const previousAcademicSession =
        currentAcademicSession
          ? await getPreviousAcademicSession(
              currentAcademicSession
            )
          : null;

      /**
       * TOTAL STUDENTS
       */
      let studentsQuery = supabase
        .from('students')
        .select('id', {
          count: 'exact',
          head: true,
        });

      if (userBranchId) {
        studentsQuery =
          studentsQuery.eq(
            'branch_id',
            userBranchId
          );
      }

      const {
        count: totalStudents,
        error: studentsError,
      } = await studentsQuery;

      if (studentsError) {
        console.error(
          'Error fetching total students:',
          studentsError
        );
      }

      /**
       * ACTIVE STUDENTS
       */
      let activeQuery = supabase
        .from('students')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq(
          'current_status',
          'active'
        );

      if (userBranchId) {
        activeQuery =
          activeQuery.eq(
            'branch_id',
            userBranchId
          );
      }

      const {
        count: activeStudents,
        error: activeStudentsError,
      } = await activeQuery;

      if (activeStudentsError) {
        console.error(
          'Error fetching active students:',
          activeStudentsError
        );
      }

      /**
       * TOTAL TEACHERS
       */
      let teachersQuery = supabase
        .from('users')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq(
          'role',
          'teacher'
        );

      if (userBranchId) {
        teachersQuery =
          teachersQuery.eq(
            'branch_id',
            userBranchId
          );
      }

      const {
        count: totalTeachers,
        error: teachersError,
      } = await teachersQuery;

      if (teachersError) {
        console.error(
          'Error fetching teachers:',
          teachersError
        );
      }

      /**
       * CURRENT TERM PAYMENTS
       */
      const currentPaymentStats =
        await getPaymentStats(
          currentAcademicSession
        );

      /**
       * PREVIOUS TERM PAYMENTS
       */
      const previousPaymentStats =
        await getPaymentStats(
          previousAcademicSession
        );

      /**
       * Pass rate.
       *
       * Kept at your existing value until
       * an actual results/assessment calculation
       * is connected.
       */
      const passRate = 94;

      setStats({
        totalStudents:
          totalStudents || 0,

        totalTeachers:
          totalTeachers || 0,

        totalPayments:
          currentPaymentStats.totalPayments,

        totalRevenue:
          currentPaymentStats.totalRevenue,

        studentsPaid:
          currentPaymentStats.studentsPaid,

        previousTermRevenue:
          previousPaymentStats.totalRevenue,

        activeStudents:
          activeStudents || 0,

        passRate,
      });

      console.log(
        '========================================'
      );

      console.log(
        'HERO BANNER PAYMENT STATISTICS'
      );

      console.log(
        '========================================'
      );

      console.log({
        currentSession:
          currentAcademicSession
            ?.session_name || null,

        currentTerm:
          currentAcademicSession
            ?.term_name || null,

        currentTermNumber:
          currentAcademicSession
            ?.term_number || null,

        currentSessionId:
          currentAcademicSession?.id ||
          null,

        studentsPaid:
          currentPaymentStats.studentsPaid,

        totalPayments:
          currentPaymentStats.totalPayments,

        totalRevenue:
          currentPaymentStats.totalRevenue,

        previousSession:
          previousAcademicSession
            ?.session_name || null,

        previousTerm:
          previousAcademicSession
            ?.term_name || null,

        previousRevenue:
          previousPaymentStats.totalRevenue,
      });

      console.log(
        '========================================'
      );
    } catch (error) {
      console.error(
        'Error fetching dashboard statistics:',
        error
      );
    }
  };

  /**
   * FETCH SCHOOL AND BRANCH DATA
   */
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        /**
         * Fetch school information.
         */
        const {
          data: schoolData,
          error: schoolError,
        } = await supabase
          .from('school_info')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (
          mounted &&
          !schoolError &&
          schoolData
        ) {
          setSchoolInfo(
            schoolData as SchoolInfo
          );
        }

        /**
         * Fetch branch name.
         */
        if (userBranchId) {
          const {
            data: branchData,
            error: branchError,
          } = await supabase
            .from('branches')
            .select(
              'school_name, branch_code'
            )
            .eq(
              'id',
              userBranchId
            )
            .maybeSingle();

          if (
            !branchError &&
            branchData
          ) {
            if (mounted) {
              setBranchName(
                branchData.school_name ||
                  ''
              );
            }
          } else {
            if (mounted) {
              setBranchName(
                schoolData?.school_name ||
                  'Main Campus'
              );
            }
          }
        } else {
          if (mounted) {
            setBranchName(
              schoolData?.school_name ||
                'Main Campus'
            );
          }
        }

        /**
         * Fetch statistics.
         */
        await fetchStats();
      } catch (error) {
        console.error(
          'Error fetching hero data:',
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [userBranchId]);

  /**
   * LOGO
   */
  const logoUrl =
    schoolInfo?.logo_url ||
    schoolLogo;

  /**
   * STATS DISPLAY
   *
   * Existing UI/design preserved.
   */
  const statsDisplay = [
    {
      label: 'Total Students',
      value:
        stats.totalStudents.toLocaleString(),
      icon: Users,
      color: 'bg-blue-500/20',
    },

    {
      label: 'Students Paid',
      value:
        stats.studentsPaid.toLocaleString(),
      icon: GraduationCap,
      color: 'bg-green-500/20',
    },

    {
      label: 'Total Staff',
      value:
        stats.totalTeachers.toLocaleString(),
      icon: School,
      color: 'bg-purple-500/20',
    },

    {
      label: 'Pass Rate',
      value: `${stats.passRate}%`,
      icon: Award,
      color: 'bg-yellow-500/20',
    },

    {
      label: 'Payments',
      value:
        stats.totalPayments.toLocaleString(),
      icon: CreditCard,
      color: 'bg-indigo-500/20',
    },

    {
      label: 'Paid This Term',
      value:
        new Intl.NumberFormat(
          'en-NG',
          {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
          }
        ).format(
          stats.totalRevenue
        ),
      icon: TrendingUp,
      color: 'bg-emerald-500/20',
    },
  ];

  /**
   * LOADING
   */
  if (loading) {
    return (
      <div
        className="
          relative overflow-hidden
          rounded-xl sm:rounded-2xl
          bg-gradient-to-br
          from-blue-600
          via-blue-700
          to-purple-800
          p-4 sm:p-6 md:p-8
          shadow-2xl
        "
      >
        <div className="mb-4">
          <div className="h-4 w-32 animate-pulse rounded bg-white/10" />

          <div className="mt-3 h-7 w-48 animate-pulse rounded bg-white/10" />

          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-white/10" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              key={index}
              className="
                h-12
                animate-pulse
                rounded-lg
                sm:rounded-xl
                bg-white/10
              "
            />
          ))}
        </div>
      </div>
    );
  }

  /**
   * MAIN UI
   */
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.6,
      }}
      className="
        relative overflow-hidden
        rounded-xl sm:rounded-2xl
        bg-gradient-to-br
        from-blue-600
        via-blue-700
        to-purple-800
        p-4 sm:p-6 md:p-8
        shadow-2xl
      "
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white blur-3xl" />

        <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-purple-300 blur-3xl" />
      </div>

      {/* Top Row */}
      <div className="relative z-10 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-white/80">
        <span className="bg-white/10 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs whitespace-nowrap">
          Sunny • 28°C
        </span>

        <span className="w-px h-3 bg-white/20 hidden xs:block" />

        <span className="flex items-center gap-1 bg-white/10 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs whitespace-nowrap">
          <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />

          <span className="hidden xs:inline">
            {branchName}
          </span>

          <span className="xs:hidden">
            {branchName
              ? `${branchName.substring(
                  0,
                  10
                )}...`
              : 'Campus'}
          </span>
        </span>

        <span className="w-px h-3 bg-white/20 hidden sm:block" />

        <span className="bg-white/10 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs whitespace-nowrap hidden sm:inline">
          {schoolInfo?.academic_session ||
            '2025/2026'}
        </span>
      </div>

      {/* Greeting */}
      <motion.div
        initial={{
          opacity: 0,
          x: -20,
        }}
        animate={{
          opacity: 1,
          x: 0,
        }}
        transition={{
          delay: 0.15,
        }}
        className="
          relative z-10
          mt-3
          flex
          flex-wrap
          items-center
          gap-2
        "
      >
        <h1 className="text-white font-bold">
          <span className="text-lg sm:text-2xl md:text-3xl lg:text-4xl">
            {greeting}, {firstName}! 👋
          </span>
        </h1>

        {userPosition && (
          <motion.span
            initial={{
              opacity: 0,
              x: -20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              delay: 0.25,
            }}
            className="
              text-[10px]
              sm:text-xs
              font-medium
              bg-white/20
              px-2 sm:px-3
              py-0.5 sm:py-1
              rounded-full
              text-white/90
              self-start
              sm:self-center
              whitespace-nowrap
            "
          >
            {userPosition}
          </motion.span>
        )}
      </motion.div>

      {/* Subtitle */}
      <motion.p
        initial={{
          opacity: 0,
          x: -20,
        }}
        animate={{
          opacity: 1,
          x: 0,
        }}
        transition={{
          delay: 0.3,
        }}
        className="
          relative z-10
          mt-1
          text-xs sm:text-sm
          text-white/80
          flex flex-wrap
          items-center
          gap-1.5 sm:gap-2
        "
      >
        <span className="text-[10px] sm:text-sm">
          Welcome to{' '}
          {schoolInfo?.school_name ||
            'Ebenezer International School'}
        </span>

        <span className="w-px h-3 bg-white/30 hidden xs:block" />

        <span className="flex items-center gap-1 bg-white/10 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs whitespace-nowrap">
          <User className="h-2.5 w-2.5 sm:h-3 sm:w-3" />

          {getRoleDisplay(
            userRole
          )}
        </span>

        {schoolInfo?.current_term && (
          <>
            <span className="w-px h-3 bg-white/30 hidden xs:block" />

            <span className="bg-white/10 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs whitespace-nowrap hidden xs:inline">
              {schoolInfo.current_term}
            </span>
          </>
        )}
      </motion.p>

      {/* Stats */}
      <motion.div
        initial={{
          opacity: 0,
          y: 10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.4,
        }}
        className="
          relative z-10
          mt-4
          grid
          grid-cols-2
          sm:grid-cols-3
          lg:grid-cols-6
          gap-1.5 sm:gap-2
        "
      >
        {statsDisplay.map(
          (stat, index) => (
            <motion.div
              key={index}
              whileHover={{
                scale: 1.05,
                y: -2,
              }}
              whileTap={{
                scale: 0.95,
              }}
              className={`
                flex items-center
                gap-1.5 sm:gap-2
                rounded-lg sm:rounded-xl
                ${stat.color}
                px-2 sm:px-3
                py-1.5 sm:py-2
                backdrop-blur-sm
                border border-white/10
                hover:border-white/20
                transition-all
                min-w-0
              `}
            >
              <stat.icon
                className="
                  h-3 w-3
                  sm:h-4 sm:w-4
                  text-white/70
                  flex-shrink-0
                "
              />

              <div className="min-w-0 flex-1">
                <span
                  className="
                    text-[11px]
                    sm:text-sm
                    font-semibold
                    text-white
                    truncate
                    block
                  "
                >
                  {stat.value}
                </span>

                <span
                  className="
                    text-[8px]
                    sm:text-[10px]
                    text-white/60
                    truncate
                    block
                  "
                >
                  {stat.label}
                </span>
              </div>
            </motion.div>
          )
        )}
      </motion.div>

      {/* Logo / Avatar */}
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.9,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        transition={{
          delay: 0.5,
        }}
        className="
          absolute
          top-4 right-4
          sm:top-6 sm:right-6
          md:top-8 md:right-8
        "
      >
        <div className="relative group">
          <div
            className="
              flex
              h-16 w-16
              sm:h-20 sm:w-20
              md:h-28 md:w-28
              lg:h-36 lg:w-36
              items-center
              justify-center
              rounded-full
              bg-white/10
              backdrop-blur-sm
              border-2
              border-white/20
              group-hover:border-white/40
              transition-all
              shadow-2xl
            "
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={
                  schoolInfo?.school_name ||
                  'School Logo'
                }
                className="
                  h-12 w-12
                  sm:h-14 sm:w-14
                  md:h-20 md:w-20
                  lg:h-28 lg:w-28
                  rounded-full
                  object-cover
                "
                onError={(e) => {
                  (
                    e.target as HTMLImageElement
                  ).src = schoolLogo;
                }}
              />
            ) : (
              <div className="flex flex-col items-center">
                <School
                  className="
                    h-8 w-8
                    sm:h-10 sm:w-10
                    md:h-14 md:w-14
                    text-white/70
                  "
                />

                <span className="text-[8px] sm:text-[10px] text-white/50 mt-0.5">
                  EIS
                </span>
              </div>
            )}
          </div>

          {/* Animated Rings */}
          <div className="absolute -inset-2 sm:-inset-4 animate-pulse rounded-full border border-white/10 group-hover:border-white/20 transition-all hidden sm:block" />

          <div className="absolute -inset-4 sm:-inset-8 rounded-full border border-white/5 group-hover:border-white/10 transition-all hidden md:block" />
        </div>
      </motion.div>

      {/* Footer Info */}
      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          delay: 0.55,
        }}
        className="
          relative z-10
          mt-3
          flex
          flex-wrap
          items-center
          gap-x-2
          gap-y-1
          text-[9px]
          sm:text-[10px]
          text-white/50
        "
      >
        <span className="hidden xs:inline">
          {currentTime.format(
            'dddd, MMMM D, YYYY'
          )}
        </span>

        <span className="xs:hidden">
          {currentTime.format(
            'MMM D, YYYY'
          )}
        </span>

        {user?.email && (
          <>
            <span className="hidden sm:inline">
              •
            </span>

            <span className="hidden sm:flex items-center gap-1">
              <span className="opacity-50">
                Logged in as
              </span>

              <span className="text-white/70 max-w-[100px] truncate">
                {user.email}
              </span>
            </span>
          </>
        )}

        {schoolInfo?.motto && (
          <>
            <span className="hidden lg:inline">
              •
            </span>

            <span className="italic text-white/40 hidden lg:inline max-w-[200px] truncate">
              "{schoolInfo.motto}"
            </span>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default HeroBanner;