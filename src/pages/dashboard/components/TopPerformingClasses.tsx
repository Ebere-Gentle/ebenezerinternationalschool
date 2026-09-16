
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
} from 'lucide-react';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

interface ClassPerformance {
  rank: number;
  id: string;
  name: string;
  percentage: number;
  students: number;
  paid: number;
  outstanding: number;
}

interface ClassRecord {
  id: string;
  name: string | null;
}

interface StudentRecord {
  id: string;
  class_id: string | null;
}

interface PaymentRecord {
  student_id: string;
  amount_paid: number | null;
  status: string | null;
}

const TopPerformingClasses: React.FC = () => {
  const { user } = useAuth();

  const [classes, setClasses] = useState<ClassPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchClassPerformance();
  }, [user?.id]);

  const fetchClassPerformance = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      /*
       * Resolve the logged-in user's branch.
       *
       * Supports both common user references used in the application:
       * users.user_id = auth user id
       * users.id = auth user id
       */
      let branchId: string | null = user.branch_id || null;

      if (!branchId) {
        const { data: userByUserId } = await supabase
          .from('users')
          .select('branch_id')
          .eq('user_id', user.id)
          .maybeSingle();

        branchId = userByUserId?.branch_id || null;
      }

      if (!branchId) {
        const { data: userById } = await supabase
          .from('users')
          .select('branch_id')
          .eq('id', user.id)
          .maybeSingle();

        branchId = userById?.branch_id || null;
      }

      if (!branchId) {
        setClasses([]);
        return;
      }

      /*
       * Fetch the three datasets in parallel.
       * This is considerably lighter than making one request per class.
       */
      const [
        { data: classesData, error: classesError },
        { data: studentsData, error: studentsError },
        { data: paymentsData, error: paymentsError },
      ] = await Promise.all([
        supabase
          .from('classes')
          .select('id, name')
          .eq('branch_id', branchId)
          .order('name'),

        supabase
          .from('students')
          .select('id, class_id')
          .eq('branch_id', branchId)
          .eq('current_status', 'active'),

        supabase
          .from('payments')
          .select('student_id, amount_paid, status')
          .eq('branch_id', branchId)
          .in('status', ['completed', 'paid']),
      ]);

      if (classesError) throw classesError;
      if (studentsError) throw studentsError;
      if (paymentsError) throw paymentsError;

      const classList = (classesData || []) as ClassRecord[];
      const studentList = (studentsData || []) as StudentRecord[];
      const paymentList = (paymentsData || []) as PaymentRecord[];

      /*
       * Group students by class.
       */
      const studentsByClass = new Map<string, StudentRecord[]>();

      studentList.forEach((student) => {
        if (!student.class_id) return;

        const existing =
          studentsByClass.get(student.class_id) || [];

        existing.push(student);
        studentsByClass.set(student.class_id, existing);
      });

      /*
       * Group paid students.
       *
       * A student is counted once even if they have made
       * multiple payments.
       */
      const paidStudentIds = new Set<string>();

      paymentList.forEach((payment) => {
        if (
          payment.student_id &&
          ['completed', 'paid'].includes(
            String(payment.status || '').toLowerCase()
          )
        ) {
          paidStudentIds.add(payment.student_id);
        }
      });

      /*
       * Calculate collection performance.
       */
      const performance: ClassPerformance[] = classList
        .map((cls) => {
          const students =
            studentsByClass.get(cls.id) || [];

          const studentCount = students.length;

          if (studentCount === 0) {
            return null;
          }

          const paidCount = students.reduce(
            (count, student) =>
              count +
              (paidStudentIds.has(student.id) ? 1 : 0),
            0
          );

          const percentage = Math.round(
            (paidCount / studentCount) * 100
          );

          return {
            rank: 0,
            id: cls.id,
            name: cls.name || 'Unnamed Class',
            percentage,
            students: studentCount,
            paid: paidCount,
            outstanding: studentCount - paidCount,
          };
        })
        .filter(
          (item): item is ClassPerformance => item !== null
        )
        .sort((a, b) => {
          if (b.percentage !== a.percentage) {
            return b.percentage - a.percentage;
          }

          return b.paid - a.paid;
        })
        .slice(0, 5)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }));

      setClasses(performance);
    } catch (error) {
      console.error(
        'TopPerformingClasses error:',
        error
      );
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) {
      return 'bg-gradient-to-br from-amber-400 to-yellow-500';
    }

    if (rank === 2) {
      return 'bg-gradient-to-br from-gray-400 to-gray-500';
    }

    if (rank === 3) {
      return 'bg-gradient-to-br from-orange-400 to-orange-600';
    }

    return 'bg-gray-300 text-gray-700';
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-[300px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />

          <div className="space-y-1.5">
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-700/70" />
          </div>
        </div>

        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3"
            >
              <div className="h-7 w-7 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />

              <div className="h-4 flex-1 animate-pulse rounded bg-gray-100 dark:bg-gray-700/70" />

              <div className="h-4 w-12 animate-pulse rounded bg-gray-100 dark:bg-gray-700/70" />
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-[300px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 shadow-sm">
          <Award className="h-5 w-5 text-white" />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-gray-900 dark:text-white">
            Top Classes
          </h3>

          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            Fee Collection
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-gray-50 px-2 py-1 dark:bg-gray-700/60">
          <CreditCard className="h-3 w-3 text-gray-400" />

          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-300">
            Live
          </span>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="flex h-[220px] flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700/60">
            <Award className="h-6 w-6 text-gray-400" />
          </div>

          <p className="mt-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
            No class data
          </p>

          <p className="mt-1 max-w-[220px] text-xs text-gray-400">
            Active students and payment records will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {classes.map((cls) => {
            const paidPercentage =
              cls.students > 0
                ? Math.round(
                    (cls.paid / cls.students) * 100
                  )
                : 0;

            return (
              <div
                key={cls.id}
                className="group flex h-[39px] items-center gap-2.5 rounded-xl px-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
              >
                {/* Rank */}
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    getRankStyle(cls.rank)
                  } ${
                    cls.rank <= 3
                      ? 'text-white'
                      : ''
                  }`}
                >
                  {cls.rank}
                </div>

                {/* Class */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">
                    {cls.name}
                  </p>

                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                      style={{
                        width: `${Math.min(
                          paidPercentage,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Percentage */}
                <div className="w-11 shrink-0 text-right">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                    {cls.percentage}%
                  </p>
                </div>

                {/* Students */}
                <div className="hidden w-14 shrink-0 items-center justify-end gap-1 sm:flex">
                  <Users className="h-3 w-3 text-gray-400" />

                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {cls.paid}/{cls.students}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {classes.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5 dark:border-gray-700">
          <span className="text-[10px] text-gray-400">
            Based on active students
          </span>

          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
            {classes.length} classes
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default TopPerformingClasses;
