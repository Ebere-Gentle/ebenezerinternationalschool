import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Cake,
  Gift,
  Users,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';
import dayjs from 'dayjs';

interface BirthdayPerson {
  id: string;
  name: string;
  role: string;
  date_of_birth: string;
  age: number;
  avatar_url: string;
  class_name: string | undefined;
  student_id: string;
}

interface StudentBirthdayRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  date_of_birth: string | null;
  class_id: string | null;
  passport_url: string | null;
  classes:
    | {
        name: string | null;
      }[]
    | null;
}

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
};

const ROLE_COLORS: Record<string, string> = {
  student:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const getFallbackAvatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=22c55e&color=fff&size=120&bold=true`;

const Birthdays: React.FC = () => {
  const { user } = useAuth();

  const [birthdays, setBirthdays] = useState<
    BirthdayPerson[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [userBranchId, setUserBranchId] =
    useState<string | null>(null);

  const [showAll, setShowAll] =
    useState(false);

  /*
   * ---------------------------------------------------------
   * RESOLVE USER BRANCH
   * ---------------------------------------------------------
   */
  const getUserBranch = async (): Promise<
    string | null
  > => {
    if (!user?.id) return null;

    const authUser = user as typeof user & {
      branch_id?: string | null;
    };

    if (authUser.branch_id) {
      return authUser.branch_id;
    }

    /*
     * Primary users-table lookup.
     */
    const { data, error } = await supabase
      .from('users')
      .select('branch_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data?.branch_id) {
      return data.branch_id;
    }

    /*
     * Fallback for installations where
     * auth user ID is stored in users.id.
     */
    const { data: fallbackData } =
      await supabase
        .from('users')
        .select('branch_id')
        .eq('id', user.id)
        .maybeSingle();

    if (!fallbackData?.branch_id) {
      return null;
    }

    return fallbackData.branch_id;
  };

  /*
   * ---------------------------------------------------------
   * FETCH REAL STUDENT BIRTHDAYS
   * ---------------------------------------------------------
   */
  const fetchBirthdays = async (
    branchId: string
  ) => {
    setLoading(true);

    try {
      const today = dayjs();

      const currentMonth =
        today.month();

      const currentDay =
        today.date();

      const todayYear =
        today.year();

      /*
       * Fetch ONLY real student information.
       *
       * passport_url is intentionally included so the
       * student's actual passport photograph is displayed.
       */
      const {
        data,
        error,
      } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          middle_name,
          date_of_birth,
          class_id,
          passport_url,
          classes:class_id (
            name
          )
        `)
        .eq('branch_id', branchId)
        .eq('current_status', 'active')
        .not('date_of_birth', 'is', null);

      if (error) {
        throw error;
      }

      const students =
        (data ?? []) as StudentBirthdayRow[];

      /*
       * Convert database rows into birthday records.
       *
       * Birthday matching is based on MONTH + DAY,
       * not the original birth year.
       */
      const studentBirthdays: BirthdayPerson[] =
        students
          .map((student) => {
            if (!student.date_of_birth) {
              return null;
            }

            const dob = dayjs(
              student.date_of_birth
            );

            const firstName =
              student.first_name?.trim() || '';

            const lastName =
              student.last_name?.trim() || '';

            const middleName =
              student.middle_name?.trim() || '';

            const fullName =
              `${firstName} ${middleName} ${lastName}`
                .replace(/\s+/g, ' ')
                .trim() ||
              'Unknown Student';

            /*
             * Calculate the age the student will be
             * on this year's birthday.
             */
            const birthdayThisYear =
              dayjs()
                .year(todayYear)
                .month(dob.month())
                .date(dob.date());

            const age =
              todayYear -
              dob.year();

            /*
             * IMPORTANT:
             *
             * passport_url is preferred.
             *
             * No artificial/random image is used.
             */
            const avatarUrl =
              student.passport_url?.trim() ||
              getFallbackAvatar(
                fullName
              );

            return {
              id: student.id,
              name: fullName,
              role: 'student',
              date_of_birth:
                student.date_of_birth,
              age,
              class_name:
                student.classes?.[0]?.name ||
                undefined,
              avatar_url: avatarUrl,
              student_id: student.id,
            };
          })
          .filter(
            (
              student
            ): student is BirthdayPerson =>
              student !== null
          );

      /*
       * -------------------------------------------------------
       * NEXT 7 DAYS
       * -------------------------------------------------------
       *
       * Calculate the birthday date relative to today.
       *
       * This also correctly handles birthdays crossing
       * from December into January.
       */
      const upcomingBirthdays =
        studentBirthdays.filter(
          (student) => {
            const dob = dayjs(
              student.date_of_birth
            );

            let birthday =
              dayjs()
                .month(dob.month())
                .date(dob.date())
                .startOf('day');

            /*
             * If this year's birthday has already passed,
             * move it to next year.
             */
            if (
              birthday.isBefore(
                today.startOf('day')
              )
            ) {
              birthday =
                birthday.add(
                  1,
                  'year'
                );
            }

            const daysUntil =
              birthday.diff(
                today.startOf('day'),
                'day'
              );

            return (
              daysUntil >= 0 &&
              daysUntil <= 7
            );
          }
        );

      /*
       * -------------------------------------------------------
       * SORT
       * -------------------------------------------------------
       *
       * Today's birthdays first.
       * Then nearest upcoming birthday.
       */
      const sortedBirthdays =
        upcomingBirthdays.sort(
          (a, b) => {
            const getDaysUntil =
              (
                birthday: BirthdayPerson
              ) => {
                const dob =
                  dayjs(
                    birthday.date_of_birth
                  );

                let date =
                  dayjs()
                    .month(
                      dob.month()
                    )
                    .date(
                      dob.date()
                    )
                    .startOf(
                      'day'
                    );

                if (
                  date.isBefore(
                    today.startOf(
                      'day'
                    )
                  )
                ) {
                  date =
                    date.add(
                      1,
                      'year'
                    );
                }

                return date.diff(
                  today.startOf(
                    'day'
                  ),
                  'day'
                );
              };

            return (
              getDaysUntil(a) -
              getDaysUntil(b)
            );
          }
        );

      setBirthdays(
        sortedBirthdays
      );
    } catch (error) {
      console.error(
        'Error fetching birthdays:',
        error
      );

      setBirthdays([]);
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!user?.id) {
        if (mounted) {
          setLoading(false);
        }

        return;
      }

      try {
        const branchId =
          await getUserBranch();

        if (!mounted) return;

        if (!branchId) {
          console.warn(
            'No branch found for birthday widget.'
          );

          setUserBranchId(null);
          setBirthdays([]);
          setLoading(false);

          return;
        }

        setUserBranchId(
          branchId
        );

        await fetchBirthdays(
          branchId
        );
      } catch (error) {
        console.error(
          'Birthday widget error:',
          error
        );

        if (mounted) {
          setBirthdays([]);
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  /*
   * ---------------------------------------------------------
   * REALTIME UPDATES
   * ---------------------------------------------------------
   *
   * If a student's passport photo, DOB, status, or branch
   * changes, refresh the widget.
   */
  useEffect(() => {
    if (!userBranchId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `birthdays-${userBranchId}`
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'students',
            filter: `branch_id=eq.${userBranchId}`,
          },
          () => {
            fetchBirthdays(
              userBranchId
            );
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [userBranchId]);

  /*
   * ---------------------------------------------------------
   * HELPERS
   * ---------------------------------------------------------
   */
  const getRoleBadgeColor = (
    role: string
  ) => {
    return (
      ROLE_COLORS[role] ||
      ROLE_COLORS.student
    );
  };

  const getRoleLabel = (
    role: string
  ) => {
    return (
      ROLE_LABELS[role] ||
      role
    );
  };

  const getDaysUntilBirthday = (
    person: BirthdayPerson
  ) => {
    const today =
      dayjs();

    const dob =
      dayjs(
        person.date_of_birth
      );

    let birthday =
      dayjs()
        .month(dob.month())
        .date(dob.date())
        .startOf('day');

    if (
      birthday.isBefore(
        today.startOf('day')
      )
    ) {
      birthday =
        birthday.add(
          1,
          'year'
        );
    }

    return birthday.diff(
      today.startOf('day'),
      'day'
    );
  };

  const isBirthdayToday = (
    person: BirthdayPerson
  ) => {
    const today =
      dayjs();

    const dob =
      dayjs(
        person.date_of_birth
      );

    return (
      dob.month() ===
        today.month() &&
      dob.date() ===
        today.date()
    );
  };

  const displayedBirthdays =
    showAll
      ? birthdays
      : birthdays.slice(
          0,
          5
        );

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */
  if (loading) {
    return (
      <div className="h-[300px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-3 animate-pulse">
          <div className="rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 p-2">
            <Cake className="h-5 w-5 text-white" />
          </div>

          <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-700" />

          <div className="ml-auto h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="space-y-2.5">
          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl bg-gray-50 p-2.5 dark:bg-gray-700/50 animate-pulse"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />

                <div className="min-w-0 flex-1">
                  <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-gray-700" />

                  <div className="mt-1.5 h-2.5 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                </div>

                <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  const today =
    dayjs();

  const todayCount =
    birthdays.filter(
      (birthday) =>
        isBirthdayToday(
          birthday
        )
    ).length;

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.5,
        delay: 0.4,
      }}
      className="h-[300px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      {/* HEADER */}
      <div className="mb-4 flex items-center gap-3">

        <div className="shrink-0 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 p-2 shadow-sm">
          <Cake className="h-5 w-5 text-white" />
        </div>

        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Birthdays
          </h3>

          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Students celebrating this week
          </p>
        </div>

        {birthdays.length > 0 && (
          <span className="ml-auto shrink-0 rounded-full bg-pink-100 px-2.5 py-1 text-[10px] font-semibold text-pink-700 dark:bg-pink-900/30 dark:text-pink-400">
            {todayCount > 0
              ? `🎉 ${todayCount} Today`
              : `${birthdays.length} Upcoming`}
          </span>
        )}
      </div>

      {/* EMPTY STATE */}
      {birthdays.length === 0 ? (
        <div className="flex h-[205px] flex-col items-center justify-center text-center">

          <div className="rounded-full bg-gray-100 p-4 dark:bg-gray-700/50">
            <Calendar className="h-7 w-7 text-gray-400 dark:text-gray-500" />
          </div>

          <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            No birthdays this week
          </p>

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            No active students have a birthday in the next 7 days.
          </p>

        </div>
      ) : (
        <>
          {/* BIRTHDAY LIST */}
          <div className="max-h-[205px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">

            {displayedBirthdays.map(
              (person) => {
                const isToday =
                  isBirthdayToday(
                    person
                  );

                const daysUntil =
                  getDaysUntilBirthday(
                    person
                  );

                return (
                  <motion.div
                    key={person.id}
                    initial={{
                      opacity: 0,
                      x: -10,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      duration: 0.3,
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-2.5 transition-all ${
                      isToday
                        ? 'border-pink-200 bg-gradient-to-r from-pink-50 to-rose-50 shadow-sm dark:border-pink-800 dark:from-pink-900/20 dark:to-rose-900/20'
                        : 'border-transparent bg-gray-50 hover:border-gray-200 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:border-gray-600 dark:hover:bg-gray-700'
                    }`}
                  >

                    {/* REAL PASSPORT PHOTO */}
                    <div className="relative shrink-0">

                      <div
                        className={`h-10 w-10 overflow-hidden rounded-full border-2 bg-gray-100 dark:bg-gray-700 ${
                          isToday
                            ? 'border-pink-300 dark:border-pink-700'
                            : 'border-white dark:border-gray-600'
                        }`}
                      >
                        <img
                          src={
                            person.avatar_url
                          }
                          alt={`${person.name} passport`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(
                            event
                          ) => {
                            const target =
                              event.currentTarget;

                            const fallback =
                              getFallbackAvatar(
                                person.name
                              );

                            if (
                              target.src !==
                              fallback
                            ) {
                              target.src =
                                fallback;
                            }
                          }}
                        />
                      </div>

                      {isToday && (
                        <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[8px] shadow-sm">
                          🎂
                        </div>
                      )}

                    </div>

                    {/* STUDENT INFORMATION */}
                    <div className="min-w-0 flex-1">

                      <div className="flex min-w-0 items-center gap-1.5">

                        <p className="truncate text-xs font-semibold text-gray-900 dark:text-white sm:text-sm">
                          {person.name}
                        </p>

                        {isToday && (
                          <span className="shrink-0 text-[9px] font-bold text-pink-500">
                            Today
                          </span>
                        )}

                      </div>

                      <div className="mt-0.5 flex min-w-0 items-center gap-1.5">

                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${getRoleBadgeColor(
                            person.role
                          )}`}
                        >
                          {getRoleLabel(
                            person.role
                          )}
                        </span>

                        {person.class_name && (
                          <span className="truncate text-[10px] text-gray-500 dark:text-gray-400">
                            {person.class_name}
                          </span>
                        )}

                      </div>

                    </div>

                    {/* DATE / AGE */}
                    <div className="flex shrink-0 flex-col items-end">

                      {isToday ? (
                        <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400">
                          🎉 Today
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                          {daysUntil === 1
                            ? 'Tomorrow'
                            : `In ${daysUntil}d`}
                        </span>
                      )}

                      <span className="mt-0.5 text-[9px] text-gray-400">
                        Age {person.age}
                      </span>

                    </div>

                    <Gift
                      className={`h-4 w-4 shrink-0 ${
                        isToday
                          ? 'text-pink-500'
                          : 'text-gray-400'
                      }`}
                    />

                  </motion.div>
                );
              }
            )}

          </div>

          {/* SHOW MORE */}
          {birthdays.length > 5 && (
            <button
              type="button"
              onClick={() =>
                setShowAll(
                  (current) =>
                    !current
                )
              }
              className="mt-2 flex w-full items-center justify-center gap-1 text-[10px] font-medium text-pink-600 transition-colors hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
            >
              {showAll
                ? 'Show less'
                : `View all ${birthdays.length}`}

              <ChevronRight
                className={`h-3.5 w-3.5 transition-transform ${
                  showAll
                    ? 'rotate-90'
                    : ''
                }`}
              />
            </button>
          )}
        </>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 9999px;
        }

        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }

        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
      `}</style>
    </motion.div>
  );
};

export default Birthdays;
