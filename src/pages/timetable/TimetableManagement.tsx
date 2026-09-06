
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Clock3,
  BookOpen,
  User,
  MapPin,
  Printer,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Coffee,
  Sparkles,
  BarChart3,
  Clock,
  ArrowRight,
  RefreshCw,
  CalendarCheck2,
  Layers3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';

/* =========================================================
   TYPES
========================================================= */

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

interface Student {
  id: string;
  user_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  student_id?: string | null;
  admission_number?: string | null;
  branch_id?: string | null;
  class_id?: string | null;
  current_status?: string | null;
}

interface ClassRow {
  id: string;
  name: string;
  code?: string | null;
  level?: string | null;
}

interface Subject {
  id: string;
  name: string;
  code?: string | null;
}

interface Teacher {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
}

interface TimetableRow {
  id: string;
  class_id: string;
  subject_id?: string | null;
  teacher_id?: string | null;
  day_of_week: string;
  period?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
  classroom?: string | null;
  subject_name?: string | null;
  teacher_name?: string | null;
  is_break?: boolean | null;
}

/* =========================================================
   CONSTANTS
========================================================= */

const DAYS: {
  key: DayKey;
  label: string;
  short: string;
}[] = [
  { key: 'monday', label: 'Monday', short: 'MON' },
  { key: 'tuesday', label: 'Tuesday', short: 'TUE' },
  { key: 'wednesday', label: 'Wednesday', short: 'WED' },
  { key: 'thursday', label: 'Thursday', short: 'THU' },
  { key: 'friday', label: 'Friday', short: 'FRI' },
];

/*
 * School timetable:
 *
 * Period 1  = 08:10 - 08:50
 * Period 2  = 08:50 - 09:30
 * Period 3  = 09:30 - 10:10
 *
 * Break 1   = 10:10 - 10:30
 *
 * Period 4  = 10:30 - 11:10
 * Period 5  = 11:10 - 11:50
 *
 * Break 2   = 11:50 - 12:10
 *
 * Period 6  = 12:10 - 12:50
 * Period 7  = 12:50 - 01:30
 * Period 8  = 01:30 - 02:10
 */

const PERIODS = [
  {
    period: 1,
    start: '08:10',
    end: '08:50',
    label: '08:10 - 08:50',
  },
  {
    period: 2,
    start: '08:50',
    end: '09:30',
    label: '08:50 - 09:30',
  },
  {
    period: 3,
    start: '09:30',
    end: '10:10',
    label: '09:30 - 10:10',
  },
  {
    period: 4,
    start: '10:30',
    end: '11:10',
    label: '10:30 - 11:10',
  },
  {
    period: 5,
    start: '11:10',
    end: '11:50',
    label: '11:10 - 11:50',
  },
  {
    period: 6,
    start: '12:10',
    end: '12:50',
    label: '12:10 - 12:50',
  },
  {
    period: 7,
    start: '12:50',
    end: '13:30',
    label: '12:50 - 01:30',
  },
  {
    period: 8,
    start: '13:30',
    end: '14:10',
    label: '01:30 - 02:10',
  },
];

/*
 * Fallback subjects.
 *
 * These are only used when timetable records are not yet
 * available from Supabase.
 */
const FALLBACK_SUBJECTS = [
  'Mathematics',
  'English Language',
  'Physics',
  'Chemistry',
  'Biology',
  'Further Mathematics',
  'Economics',
  'Government',
  'Commerce',
  'Financial Accounting',
  'Literature in English',
  'Geography',
  'Agricultural Science',
  'Civic Education',
  'Computer Science',
  'ICT',
  'Data Processing',
  'Basic Science',
  'Basic Technology',
  'Social Studies',
  'Christian Religious Studies',
  'Islamic Religious Studies',
  'French Language',
  'Home Economics',
  'Food & Nutrition',
  'Technical Drawing',
  'Physical & Health Education',
  'Business Studies',
  'Creative Arts',
  'Music',
];

/*
 * Fallback timetable.

 * This makes the page usable immediately.
 * Once Supabase timetable rows exist, those rows replace
 * these values automatically.
 */
const FALLBACK_TIMETABLE: Record<
  DayKey,
  Record<number, { subject: string; teacher: string; room: string }>
> = {
  monday: {
    1: {
      subject: 'Mathematics',
      teacher: 'Mathematics Department',
      room: 'Classroom',
    },
    2: {
      subject: 'English Language',
      teacher: 'English Department',
      room: 'Classroom',
    },
    3: {
      subject: 'Physics',
      teacher: 'Science Department',
      room: 'Laboratory',
    },
    4: {
      subject: 'Chemistry',
      teacher: 'Science Department',
      room: 'Laboratory',
    },
    5: {
      subject: 'Biology',
      teacher: 'Science Department',
      room: 'Laboratory',
    },
    6: {
      subject: 'Civic Education',
      teacher: 'Humanities Department',
      room: 'Classroom',
    },
    7: {
      subject: 'Computer Science',
      teacher: 'ICT Department',
      room: 'ICT Lab',
    },
    8: {
      subject: 'Physical & Health Education',
      teacher: 'Sports Department',
      room: 'Sports Field',
    },
  },

  tuesday: {
    1: {
      subject: 'English Language',
      teacher: 'English Department',
      room: 'Classroom',
    },
    2: {
      subject: 'Mathematics',
      teacher: 'Mathematics Department',
      room: 'Classroom',
    },
    3: {
      subject: 'Chemistry',
      teacher: 'Science Department',
      room: 'Laboratory',
    },
    4: {
      subject: 'Biology',
      teacher: 'Science Department',
      room: 'Laboratory',
    },
    5: {
      subject: 'Economics',
      teacher: 'Social Science Department',
      room: 'Classroom',
    },
    6: {
      subject: 'Further Mathematics',
      teacher: 'Mathematics Department',
      room: 'Classroom',
    },
    7: {
      subject: 'Agricultural Science',
      teacher: 'Agriculture Department',
      room: 'Farm',
    },
    8: {
      subject: 'Literature in English',
      teacher: 'English Department',
      room: 'Classroom',
    },
  },

  wednesday: {
    1: {
      subject: 'Physics',
      teacher: 'Science Department',
      room: 'Laboratory',
    },
    2: {
      subject: 'Chemistry',
      teacher: 'Science Department',
      room: 'Laboratory',
    },
    3: {
      subject: 'Mathematics',
      teacher: 'Mathematics Department',
      room: 'Classroom',
    },
    4: {
      subject: 'English Language',
      teacher: 'English Department',
      room: 'Classroom',
    },
    5: {
      subject: 'Biology',
      teacher: 'Science Department',
      room: 'Laboratory',
    },
    6: {
      subject: 'Geography',
      teacher: 'Social Science Department',
      room: 'Classroom',
    },
    7: {
      subject: 'Civic Education',
      teacher: 'Humanities Department',
      room: 'Classroom',
    },
    8: {
      subject: 'French Language',
      teacher: 'Languages Department',
      room: 'Classroom',
    },
  },

  thursday: {
    1: {
      subject: 'Chemistry',
      teacher: 'Science Department',
      room: 'Laboratory',
    },
    2: {
      subject: 'Biology',
      teacher: 'Science Department',
      room: 'Laboratory',
    },
    3: {
      subject: 'English Language',
      teacher: 'English Department',
      room: 'Classroom',
    },
    4: {
      subject: 'Mathematics',
      teacher: 'Mathematics Department',
      room: 'Classroom',
    },
    5: {
      subject: 'Further Mathematics',
      teacher: 'Mathematics Department',
      room: 'Classroom',
    },
    6: {
      subject: 'Computer Science',
      teacher: 'ICT Department',
      room: 'ICT Lab',
    },
    7: {
      subject: 'Economics',
      teacher: 'Social Science Department',
      room: 'Classroom',
    },
    8: {
      subject: 'Agricultural Science',
      teacher: 'Agriculture Department',
      room: 'Farm',
    },
  },

  friday: {
    1: {
      subject: 'Mathematics',
      teacher: 'Mathematics Department',
      room: 'Classroom',
    },
    2: {
      subject: 'English Language',
      teacher: 'English Department',
      room: 'Classroom',
    },
    3: {
      subject: 'Civic Education',
      teacher: 'Humanities Department',
      room: 'Classroom',
    },
    4: {
      subject: 'Physics',
      teacher: 'Science Department',
      room: 'Laboratory',
    },
    5: {
      subject: 'Chemistry',
      teacher: 'Science Department',
      room: 'Laboratory',
    },
    6: {
      subject: 'Biology',
      teacher: 'Science Department',
      room: 'Laboratory',
    },
    7: {
      subject: 'Physical & Health Education',
      teacher: 'Sports Department',
      room: 'Sports Field',
    },
    8: {
      subject: 'Computer Science',
      teacher: 'ICT Department',
      room: 'ICT Lab',
    },
  },
};

/* =========================================================
   HELPERS
========================================================= */

const formatTeacherName = (teacher?: Teacher | null) => {
  if (!teacher) return 'Subject Teacher';

  if (teacher.name) return teacher.name;

  return [teacher.first_name, teacher.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Subject Teacher';
};

const normalizeDay = (value: string): DayKey | null => {
  const day = value.toLowerCase().trim();

  if (day.startsWith('mon')) return 'monday';
  if (day.startsWith('tue')) return 'tuesday';
  if (day.startsWith('wed')) return 'wednesday';
  if (day.startsWith('thu')) return 'thursday';
  if (day.startsWith('fri')) return 'friday';

  return null;
};

const formatDate = (date: Date) => {
  return dayjs(date).format('dddd, MMMM D, YYYY');
};

const getCurrentDay = (): DayKey => {
  const day = dayjs().day();

  switch (day) {
    case 1:
      return 'monday';
    case 2:
      return 'tuesday';
    case 3:
      return 'wednesday';
    case 4:
      return 'thursday';
    case 5:
      return 'friday';
    default:
      return 'monday';
  }
};

const getSubjectInitials = (subject: string) => {
  return subject
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
};

const getSubjectClass = (subject: string) => {
  const name = subject.toLowerCase();

  if (name.includes('math')) {
    return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900';
  }

  if (
    name.includes('physics') ||
    name.includes('chemistry') ||
    name.includes('biology') ||
    name.includes('science')
  ) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900';
  }

  if (
    name.includes('english') ||
    name.includes('literature') ||
    name.includes('french')
  ) {
    return 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900';
  }

  if (
    name.includes('economics') ||
    name.includes('commerce') ||
    name.includes('accounting') ||
    name.includes('government')
  ) {
    return 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900';
  }

  if (
    name.includes('computer') ||
    name.includes('ict') ||
    name.includes('data processing')
  ) {
    return 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-900';
  }

  if (
    name.includes('physical') ||
    name.includes('sports')
  ) {
    return 'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-900';
  }

  return 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
};

const isCurrentPeriod = (period: number) => {
  const now = dayjs();

  const today = now.format('HH:mm');

  const slot = PERIODS.find(item => item.period === period);

  if (!slot) return false;

  return today >= slot.start && today < slot.end;
};

/* =========================================================
   COMPONENT
========================================================= */

const TimetablePage: React.FC = () => {
  const { user } = useAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [studentClass, setStudentClass] = useState<ClassRow | null>(null);

  const [timetableRows, setTimetableRows] = useState<TimetableRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedDay, setSelectedDay] = useState<DayKey>(
    getCurrentDay()
  );

  const [weekOffset, setWeekOffset] = useState(0);

  /* =======================================================
     LOAD STUDENT
  ======================================================= */

  const loadStudent = async () => {
    if (!user?.id) return null;

    let studentData: Student | null = null;

    const byUser = await supabase
      .from('students')
      .select(
        `
          id,
          user_id,
          first_name,
          last_name,
          student_id,
          admission_number,
          branch_id,
          class_id,
          current_status
        `
      )
      .eq('user_id', user.id)
      .maybeSingle();

    if (!byUser.error && byUser.data) {
      studentData = byUser.data;
    }

    if (!studentData && user.email) {
      const byEmail = await supabase
        .from('students')
        .select(
          `
            id,
            user_id,
            first_name,
            last_name,
            student_id,
            admission_number,
            branch_id,
            class_id,
            current_status
          `
        )
        .eq('email', user.email)
        .maybeSingle();

      if (!byEmail.error && byEmail.data) {
        studentData = byEmail.data;
      }
    }

    if (studentData) {
      setStudent(studentData);
    }

    return studentData;
  };

  /* =======================================================
     LOAD CLASS
  ======================================================= */

  const loadClass = async (classId: string | null | undefined) => {
    if (!classId) return;

    const { data, error } = await supabase
      .from('classes')
      .select('id, name, code, level')
      .eq('id', classId)
      .maybeSingle();

    if (!error && data) {
      setStudentClass(data);
    }
  };

  /* =======================================================
     LOAD SUBJECTS
  ======================================================= */

  const loadSubjects = async (branchId?: string | null) => {
    let query = supabase
      .from('subjects')
      .select('id, name, code')
      .order('name');

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setSubjects(data);
    }
  };

  /* =======================================================
     LOAD TEACHERS
  ======================================================= */

  const loadTeachers = async (branchId?: string | null) => {
    let query = supabase
      .from('teachers')
      .select('id, first_name, last_name, name')
      .order('first_name');

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setTeachers(data);
    }
  };

  /* =======================================================
     LOAD TIMETABLE
  ======================================================= */

  const loadTimetable = async (classId: string | null | undefined) => {
    if (!classId) {
      setTimetableRows([]);
      return;
    }

    /*
     * The timetable schema can vary between installations.
     *
     * We first try the expected production structure.
     */

    const { data, error } = await supabase
      .from('timetables')
      .select('*')
      .eq('class_id', classId);

    if (!error && data) {
      setTimetableRows(data as TimetableRow[]);
    } else {
      console.warn(
        'Timetable database query failed. Using fallback timetable.',
        error
      );

      setTimetableRows([]);
    }
  };

  /* =======================================================
     LOAD EVERYTHING
  ======================================================= */

  const loadData = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const studentData = await loadStudent();

      if (!studentData) {
        toast.error(
          'Student profile could not be found.'
        );
        return;
      }

      await Promise.all([
        loadClass(studentData.class_id),
        loadSubjects(studentData.branch_id),
        loadTeachers(studentData.branch_id),
        loadTimetable(studentData.class_id),
      ]);

      if (showRefreshToast) {
        toast.success('Timetable refreshed');
      }
    } catch (error) {
      console.error('Failed to load timetable:', error);
      toast.error('Unable to load timetable');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  /* =======================================================
     DATABASE TIMETABLE MAPPING
  ======================================================= */

  const timetable = useMemo(() => {
    const mapped: Record<
      DayKey,
      Record<
        number,
        {
          subject: string;
          teacher: string;
          room: string;
        }
      >
    > = {
      monday: {},
      tuesday: {},
      wednesday: {},
      thursday: {},
      friday: {},
    };

    /*
     * If database timetable data exists, use it.
     */
    timetableRows.forEach(row => {
      const day = normalizeDay(row.day_of_week);

      if (!day) return;

      const period = Number(row.period);

      if (!period || period < 1 || period > 8) return;

      const subject =
        row.subject_name ||
        subjects.find(s => s.id === row.subject_id)?.name ||
        'Subject';

      const teacher =
        row.teacher_name ||
        formatTeacherName(
          teachers.find(t => t.id === row.teacher_id)
        );

      const room =
        row.room ||
        row.classroom ||
        'Classroom';

      mapped[day][period] = {
        subject,
        teacher,
        room,
      };
    });

    /*
     * If there are no database records, use the safe
     * fallback timetable.
     */
    if (timetableRows.length === 0) {
      return FALLBACK_TIMETABLE;
    }

    /*
     * Fill any missing timetable cells from fallback.
     * This prevents blank timetable cells while the
     * school is still configuring the timetable.
     */
    DAYS.forEach(day => {
      for (let period = 1; period <= 8; period++) {
        if (!mapped[day.key][period]) {
          mapped[day.key][period] =
            FALLBACK_TIMETABLE[day.key][period];
        }
      }
    });

    return mapped;
  }, [
    timetableRows,
    subjects,
    teachers,
  ]);

  /* =======================================================
     SELECTED DAY DATA
  ======================================================= */

  const selectedDayLessons = useMemo(() => {
    return PERIODS.map(period => ({
      ...period,
      lesson: timetable[selectedDay]?.[period.period],
    }));
  }, [selectedDay, timetable]);

  /* =======================================================
     SUBJECT STATISTICS
  ======================================================= */

  const subjectStats = useMemo(() => {
    const counts: Record<string, number> = {};

    DAYS.forEach(day => {
      for (let period = 1; period <= 8; period++) {
        const lesson = timetable[day.key]?.[period];

        if (!lesson?.subject) continue;

        counts[lesson.subject] =
          (counts[lesson.subject] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([subject, count]) => ({
        subject,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [timetable]);

  const totalLessons = useMemo(() => {
    return subjectStats.reduce(
      (total, item) => total + item.count,
      0
    );
  }, [subjectStats]);

  const uniqueSubjects = subjectStats.length;

  /* =======================================================
     CURRENT / NEXT LESSON
  ======================================================= */

  const currentLesson = useMemo(() => {
    if (selectedDay !== getCurrentDay()) {
      return null;
    }

    const currentPeriod = PERIODS.find(period =>
      isCurrentPeriod(period.period)
    );

    if (!currentPeriod) return null;

    const lesson =
      timetable[selectedDay]?.[currentPeriod.period];

    if (!lesson) return null;

    return {
      ...currentPeriod,
      ...lesson,
    };
  }, [selectedDay, timetable]);

  const nextLesson = useMemo(() => {
    if (selectedDay !== getCurrentDay()) {
      return null;
    }

    const now = dayjs().format('HH:mm');

    const next = PERIODS.find(period => now < period.start);

    if (!next) return null;

    const lesson =
      timetable[selectedDay]?.[next.period];

    if (!lesson) return null;

    return {
      ...next,
      ...lesson,
    };
  }, [selectedDay, timetable]);

  /* =======================================================
     WEEK NAVIGATION
  ======================================================= */

  const weekLabel = useMemo(() => {
    const start = dayjs()
      .startOf('week')
      .add(1, 'day')
      .add(weekOffset, 'week');

    const end = start.add(4, 'day');

    if (start.year() !== end.year()) {
      return `${start.format('MMM D, YYYY')} – ${end.format(
        'MMM D, YYYY'
      )}`;
    }

    return `${start.format('MMM D')} – ${end.format(
      'MMM D, YYYY'
    )}`;
  }, [weekOffset]);

  /* =======================================================
     PRINT
  ======================================================= */

  const printTimetable = () => {
    window.print();
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <CalendarDays className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Loading your timetable
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Preparing your weekly academic schedule...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <style>
        {`
          @media print {
            body {
              background: white !important;
            }

            nav,
            aside,
            header button,
            .no-print {
              display: none !important;
            }

            .print-container {
              width: 100% !important;
              max-width: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }

            .print-card {
              box-shadow: none !important;
              border: 1px solid #ddd !important;
            }

            .print-break {
              page-break-inside: avoid;
            }
          }
        `}
      </style>

      <div className="print-container max-w-[1600px] mx-auto space-y-5 sm:space-y-6 pb-12">

        {/* =================================================
            HERO
        ================================================== */}

        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 text-white shadow-2xl"
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-400 blur-3xl" />
            <div className="absolute -bottom-28 -left-20 w-80 h-80 rounded-full bg-indigo-400 blur-3xl" />
          </div>

          <div className="relative p-5 sm:p-7 lg:p-9">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">

              <div className="flex items-start gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 border border-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-7 h-7 sm:w-8 sm:h-8 text-blue-200" />
                </div>

                <div>
                  <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-blue-200 mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Academic Schedule
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
                    My Timetable
                  </h1>

                  <p className="text-blue-100/80 text-xs sm:text-sm mt-1 max-w-2xl">
                    Your complete weekly lesson schedule, periods,
                    teachers and classroom locations.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 no-print">
                <button
                  onClick={() => loadData(true)}
                  disabled={refreshing}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${
                      refreshing ? 'animate-spin' : ''
                    }`}
                  />
                  Refresh
                </button>

                <button
                  onClick={printTimetable}
                  className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-blue-50 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Print Timetable
                </button>
              </div>
            </div>

            {/* STUDENT INFO */}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-7">

              <div className="rounded-2xl bg-white/8 border border-white/10 backdrop-blur p-3">
                <p className="text-[9px] uppercase tracking-wider text-blue-200">
                  Student
                </p>
                <p className="font-bold text-sm mt-1 truncate">
                  {student?.first_name || 'Student'}{' '}
                  {student?.last_name || ''}
                </p>
              </div>

              <div className="rounded-2xl bg-white/8 border border-white/10 backdrop-blur p-3">
                <p className="text-[9px] uppercase tracking-wider text-blue-200">
                  Class
                </p>
                <p className="font-bold text-sm mt-1 truncate">
                  {studentClass?.name || 'Class Not Assigned'}
                </p>
              </div>

              <div className="rounded-2xl bg-white/8 border border-white/10 backdrop-blur p-3">
                <p className="text-[9px] uppercase tracking-wider text-blue-200">
                  Weekly Lessons
                </p>
                <p className="font-bold text-sm mt-1">
                  {totalLessons}
                </p>
              </div>

              <div className="rounded-2xl bg-white/8 border border-white/10 backdrop-blur p-3">
                <p className="text-[9px] uppercase tracking-wider text-blue-200">
                  Subjects
                </p>
                <p className="font-bold text-sm mt-1">
                  {uniqueSubjects}
                </p>
              </div>

            </div>
          </div>
        </motion.div>

        {/* =================================================
            SCHOOL DAY STRUCTURE
        ================================================== */}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
              <Clock3 className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                School Starts
              </span>
            </div>

            <p className="text-lg font-black text-gray-900 dark:text-white">
              8:10 AM
            </p>

            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              First lesson begins
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
              <Coffee className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                First Break
              </span>
            </div>

            <p className="text-lg font-black text-gray-900 dark:text-white">
              10:10 AM
            </p>

            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              After Period 3
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
              <Coffee className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Second Break
              </span>
            </div>

            <p className="text-lg font-black text-gray-900 dark:text-white">
              11:50 AM
            </p>

            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              After Period 5
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
              <GraduationCap className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Last Period
              </span>
            </div>

            <p className="text-lg font-black text-gray-900 dark:text-white">
              2:10 PM
            </p>

            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              End of Period 8
            </p>
          </div>

        </div>

        {/* =================================================
            CURRENT / NEXT LESSON
        ================================================== */}

        {(currentLesson || nextLesson) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {currentLesson && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl bg-emerald-600 text-white p-5 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Happening Now
                  </span>

                  <span className="px-2.5 py-1 rounded-lg bg-white/15 text-[10px] font-bold">
                    Period {currentLesson.period}
                  </span>
                </div>

                <h2 className="text-xl font-black">
                  {currentLesson.subject}
                </h2>

                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 opacity-80" />
                    {currentLesson.label}
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 opacity-80" />
                    {currentLesson.teacher}
                  </div>
                </div>
              </motion.div>
            )}

            {!currentLesson && nextLesson && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl bg-blue-600 text-white p-5 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <ArrowRight className="w-4 h-4" />
                    Next Lesson
                  </span>

                  <span className="px-2.5 py-1 rounded-lg bg-white/15 text-[10px] font-bold">
                    Period {nextLesson.period}
                  </span>
                </div>

                <h2 className="text-xl font-black">
                  {nextLesson.subject}
                </h2>

                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 opacity-80" />
                    {nextLesson.label}
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 opacity-80" />
                    {nextLesson.teacher}
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        )}

        {/* =================================================
            WEEK NAVIGATION
        ================================================== */}

        <div className="print-card bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            <div>
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />

                <h2 className="font-black text-gray-900 dark:text-white">
                  Weekly Timetable
                </h2>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {weekLabel}
              </p>
            </div>

            <div className="flex items-center gap-2 no-print">

              <button
                onClick={() => setWeekOffset(value => value - 1)}
                className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setWeekOffset(0);
                  setSelectedDay(getCurrentDay());
                }}
                className="px-3 h-9 rounded-xl bg-blue-600 text-white text-xs font-bold"
              >
                This Week
              </button>

              <button
                onClick={() => setWeekOffset(value => value + 1)}
                className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

            </div>

          </div>

          {/* DAY SELECTOR MOBILE */}

          <div className="lg:hidden p-3 border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-print">
            <div className="flex gap-2 min-w-max">

              {DAYS.map(day => {
                const active = selectedDay === day.key;
                const today = getCurrentDay() === day.key;

                return (
                  <button
                    key={day.key}
                    onClick={() => setSelectedDay(day.key)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <span>{day.label}</span>

                    {today && (
                      <span className="ml-1.5 text-[8px] opacity-70">
                        TODAY
                      </span>
                    )}
                  </button>
                );
              })}

            </div>
          </div>

          {/* =================================================
              DESKTOP TIMETABLE
          ================================================== */}

          <div className="hidden lg:block overflow-x-auto">

            <table className="w-full border-collapse">

              <thead>
                <tr>
                  <th className="w-36 bg-slate-50 dark:bg-slate-950/50 border-b border-r border-gray-200 dark:border-gray-800 p-4 text-left">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                      Period
                    </div>
                    <div className="text-xs font-black text-gray-700 dark:text-gray-200 mt-1">
                      Time
                    </div>
                  </th>

                  {DAYS.map(day => {
                    const today = getCurrentDay() === day.key;

                    return (
                      <th
                        key={day.key}
                        className={`min-w-[190px] border-b border-r border-gray-200 dark:border-gray-800 p-4 text-left ${
                          today
                            ? 'bg-blue-50 dark:bg-blue-950/20'
                            : 'bg-slate-50 dark:bg-slate-950/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                              {day.short}
                            </div>

                            <div className="text-sm font-black text-gray-900 dark:text-white mt-1">
                              {day.label}
                            </div>
                          </div>

                          {today && (
                            <span className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[8px] font-black">
                              TODAY
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>

                {PERIODS.slice(0, 3).map(period => (
                  <tr key={period.period}>

                    <td className="border-r border-b border-gray-200 dark:border-gray-800 p-3 bg-gray-50/70 dark:bg-gray-950/30">
                      <div className="text-xs font-black text-gray-900 dark:text-white">
                        Period {period.period}
                      </div>

                      <div className="text-[10px] font-mono text-gray-500 mt-1">
                        {period.label}
                      </div>
                    </td>

                    {DAYS.map(day => {
                      const lesson =
                        timetable[day.key]?.[period.period];

                      const today =
                        getCurrentDay() === day.key;

                      const current =
                        today &&
                        isCurrentPeriod(period.period);

                      return (
                        <td
                          key={`${day.key}-${period.period}`}
                          className={`border-r border-b border-gray-200 dark:border-gray-800 p-2 ${
                            current
                              ? 'bg-emerald-50 dark:bg-emerald-950/20'
                              : today
                                ? 'bg-blue-50/30 dark:bg-blue-950/10'
                                : ''
                          }`}
                        >
                          <LessonCard
                            lesson={lesson}
                            period={period.period}
                            current={current}
                          />
                        </td>
                      );
                    })}

                  </tr>
                ))}

                {/* FIRST BREAK */}

                <tr>
                  <td
                    colSpan={6}
                    className="p-3 border-b border-gray-200 dark:border-gray-800 bg-amber-50 dark:bg-amber-950/20"
                  >
                    <div className="flex items-center justify-center gap-3 text-amber-700 dark:text-amber-300">
                      <Coffee className="w-4 h-4" />

                      <span className="text-xs font-black uppercase tracking-wider">
                        First Break
                      </span>

                      <span className="text-[10px] font-mono">
                        10:10 AM – 10:30 AM
                      </span>
                    </div>
                  </td>
                </tr>

                {PERIODS.slice(3, 5).map(period => (
                  <tr key={period.period}>

                    <td className="border-r border-b border-gray-200 dark:border-gray-800 p-3 bg-gray-50/70 dark:bg-gray-950/30">
                      <div className="text-xs font-black text-gray-900 dark:text-white">
                        Period {period.period}
                      </div>

                      <div className="text-[10px] font-mono text-gray-500 mt-1">
                        {period.label}
                      </div>
                    </td>

                    {DAYS.map(day => {
                      const lesson =
                        timetable[day.key]?.[period.period];

                      const today =
                        getCurrentDay() === day.key;

                      const current =
                        today &&
                        isCurrentPeriod(period.period);

                      return (
                        <td
                          key={`${day.key}-${period.period}`}
                          className={`border-r border-b border-gray-200 dark:border-gray-800 p-2 ${
                            current
                              ? 'bg-emerald-50 dark:bg-emerald-950/20'
                              : today
                                ? 'bg-blue-50/30 dark:bg-blue-950/10'
                                : ''
                          }`}
                        >
                          <LessonCard
                            lesson={lesson}
                            period={period.period}
                            current={current}
                          />
                        </td>
                      );
                    })}

                  </tr>
                ))}

                {/* SECOND BREAK */}

                <tr>
                  <td
                    colSpan={6}
                    className="p-3 border-b border-gray-200 dark:border-gray-800 bg-orange-50 dark:bg-orange-950/20"
                  >
                    <div className="flex items-center justify-center gap-3 text-orange-700 dark:text-orange-300">
                      <Coffee className="w-4 h-4" />

                      <span className="text-xs font-black uppercase tracking-wider">
                        Second Break
                      </span>

                      <span className="text-[10px] font-mono">
                        11:50 AM – 12:10 PM
                      </span>
                    </div>
                  </td>
                </tr>

                {PERIODS.slice(5).map(period => (
                  <tr key={period.period}>

                    <td className="border-r border-b border-gray-200 dark:border-gray-800 p-3 bg-gray-50/70 dark:bg-gray-950/30">
                      <div className="text-xs font-black text-gray-900 dark:text-white">
                        Period {period.period}
                      </div>

                      <div className="text-[10px] font-mono text-gray-500 mt-1">
                        {period.label}
                      </div>
                    </td>

                    {DAYS.map(day => {
                      const lesson =
                        timetable[day.key]?.[period.period];

                      const today =
                        getCurrentDay() === day.key;

                      const current =
                        today &&
                        isCurrentPeriod(period.period);

                      return (
                        <td
                          key={`${day.key}-${period.period}`}
                          className={`border-r border-b border-gray-200 dark:border-gray-800 p-2 ${
                            current
                              ? 'bg-emerald-50 dark:bg-emerald-950/20'
                              : today
                                ? 'bg-blue-50/30 dark:bg-blue-950/10'
                                : ''
                          }`}
                        >
                          <LessonCard
                            lesson={lesson}
                            period={period.period}
                            current={current}
                          />
                        </td>
                      );
                    })}

                  </tr>
                ))}

              </tbody>
            </table>

          </div>

          {/* =================================================
              MOBILE DAILY TIMETABLE
          ================================================== */}

          <div className="lg:hidden p-3 space-y-3">

            {selectedDayLessons.map(period => {
              const lesson = period.lesson;

              const current =
                selectedDay === getCurrentDay() &&
                isCurrentPeriod(period.period);

              return (
                <React.Fragment key={period.period}>

                  {period.period === 4 && (
                    <BreakCard
                      title="First Break"
                      time="10:10 AM – 10:30 AM"
                    />
                  )}

                  {period.period === 6 && (
                    <BreakCard
                      title="Second Break"
                      time="11:50 AM – 12:10 PM"
                    />
                  )}

                  <div
                    className={`rounded-2xl border p-3 ${
                      current
                        ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                    }`}
                  >

                    <div className="flex items-center justify-between mb-3">

                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-black text-gray-400">
                          Period {period.period}
                        </span>

                        <p className="text-xs font-mono text-gray-500 mt-0.5">
                          {period.label}
                        </p>
                      </div>

                      {current && (
                        <span className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[8px] font-black">
                          NOW
                        </span>
                      )}

                    </div>

                    <LessonCard
                      lesson={lesson}
                      period={period.period}
                      current={current}
                      mobile
                    />

                  </div>
                </React.Fragment>
              );
            })}

          </div>

        </div>

        {/* =================================================
            ANALYTICS
        ================================================== */}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* SUBJECT FREQUENCY */}

          <div className="xl:col-span-2 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 sm:p-6">

            <div className="flex items-center justify-between mb-5">

              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />

                  <h2 className="font-black text-gray-900 dark:text-white">
                    Weekly Subject Distribution
                  </h2>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Number of periods allocated to each subject this week.
                </p>
              </div>

              <span className="hidden sm:block px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500">
                {totalLessons} LESSONS
              </span>

            </div>

            <div className="space-y-3">

              {subjectStats.slice(0, 10).map(item => {
                const percentage =
                  totalLessons > 0
                    ? (item.count / totalLessons) * 100
                    : 0;

                return (
                  <div key={item.subject}>

                    <div className="flex items-center justify-between mb-1.5">

                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center text-[9px] font-black ${getSubjectClass(item.subject)}`}>
                          {getSubjectInitials(item.subject)}
                        </div>

                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                          {item.subject}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-gray-500">
                          {item.count} periods
                        </span>

                        <span className="text-[10px] font-black text-gray-900 dark:text-white">
                          {Math.round(percentage)}%
                        </span>
                      </div>

                    </div>

                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${percentage}%`,
                        }}
                        transition={{
                          duration: 0.7,
                        }}
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                      />
                    </div>

                  </div>
                );
              })}

            </div>

          </div>

          {/* WEEK SUMMARY */}

          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl">

            <div className="flex items-center gap-2 mb-5">
              <Layers3 className="w-5 h-5 text-blue-300" />

              <h2 className="font-black">
                Week at a Glance
              </h2>
            </div>

            <div className="space-y-3">

              <SummaryRow
                label="School Days"
                value="5"
              />

              <SummaryRow
                label="Periods Per Day"
                value="8"
              />

              <SummaryRow
                label="Weekly Periods"
                value={String(totalLessons)}
              />

              <SummaryRow
                label="Different Subjects"
                value={String(uniqueSubjects)}
              />

              <SummaryRow
                label="Lesson Duration"
                value="40 min"
              />

              <SummaryRow
                label="First Break"
                value="After P3"
              />

              <SummaryRow
                label="Second Break"
                value="After P5"
              />

            </div>

            <div className="mt-6 p-4 rounded-2xl bg-white/8 border border-white/10">

              <div className="flex items-start gap-3">
                <Clock3 className="w-5 h-5 text-blue-300 mt-0.5" />

                <div>
                  <p className="text-xs font-bold">
                    School Schedule
                  </p>

                  <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                    Lessons begin at 8:10 AM. Each lesson runs for
                    40 minutes. The first break comes after Period 3
                    and the second break comes after Period 5.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            SUBJECT DIRECTORY
        ================================================== */}

        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 sm:p-6">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">

            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />

                <h2 className="font-black text-gray-900 dark:text-white">
                  Subjects This Week
                </h2>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Subjects appearing on your weekly timetable.
              </p>
            </div>

            <span className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 text-[10px] font-black">
              {uniqueSubjects} SUBJECTS
            </span>

          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">

            {subjectStats.map(item => (
              <div
                key={item.subject}
                className={`rounded-2xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm ${getSubjectClass(item.subject)}`}
              >

                <div className="flex items-start justify-between gap-2">

                  <div className="w-9 h-9 rounded-xl bg-white/70 dark:bg-black/10 flex items-center justify-center font-black text-xs">
                    {getSubjectInitials(item.subject)}
                  </div>

                  <span className="text-[9px] font-black">
                    {item.count}×
                  </span>

                </div>

                <p className="text-xs font-black mt-3 leading-tight">
                  {item.subject}
                </p>

                <p className="text-[9px] opacity-70 mt-1">
                  {item.count === 1
                    ? '1 period this week'
                    : `${item.count} periods this week`}
                </p>

              </div>
            ))}

          </div>

        </div>

        {/* =================================================
            FOOTER INFORMATION
        ================================================== */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1 text-[10px] text-gray-400">

          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5" />
            {formatDate(new Date())}
          </div>

          <div className="flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5" />
            {studentClass?.name || 'Student Timetable'}
          </div>

        </div>

      </div>
    </>
  );
};

/* =========================================================
   LESSON CARD
========================================================= */

interface LessonCardProps {
  lesson?: {
    subject: string;
    teacher: string;
    room: string;
  };
  period: number;
  current?: boolean;
  mobile?: boolean;
}

const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  current,
  mobile,
}) => {
  if (!lesson) {
    return (
      <div className="min-h-[100px] flex items-center justify-center text-center">
        <span className="text-[10px] text-gray-400">
          No lesson scheduled
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-3 ${
        mobile ? 'min-h-[100px]' : 'min-h-[112px]'
      } ${
        current
          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20'
          : `${getSubjectClass(lesson.subject)}`
      }`}
    >

      <div className="flex items-start justify-between gap-2">

        <div className="w-8 h-8 rounded-lg bg-white/70 dark:bg-black/10 flex items-center justify-center text-[9px] font-black flex-shrink-0">
          {getSubjectInitials(lesson.subject)}
        </div>

        {current && (
          <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[7px] font-black">
            NOW
          </span>
        )}

      </div>

      <p className="font-black text-xs mt-3 leading-tight">
        {lesson.subject}
      </p>

      <div className="space-y-1 mt-2">

        <div className="flex items-center gap-1.5 text-[9px] opacity-75">
          <User className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {lesson.teacher}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[9px] opacity-75">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {lesson.room}
          </span>
        </div>

      </div>

    </div>
  );
};

/* =========================================================
   BREAK CARD
========================================================= */

const BreakCard: React.FC<{
  title: string;
  time: string;
}> = ({ title, time }) => {
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-3">

      <div className="flex items-center gap-3">

        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
          <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>

        <div>
          <p className="text-xs font-black text-amber-800 dark:text-amber-300">
            {title}
          </p>

          <p className="text-[9px] text-amber-600 dark:text-amber-400 font-mono mt-0.5">
            {time}
          </p>
        </div>

      </div>

    </div>
  );
};

/* =========================================================
   SUMMARY ROW
========================================================= */

const SummaryRow: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/8 last:border-0">

      <span className="text-xs text-slate-300">
        {label}
      </span>

      <span className="text-xs font-black text-white">
        {value}
      </span>

    </div>
  );
};

export default TimetablePage;
