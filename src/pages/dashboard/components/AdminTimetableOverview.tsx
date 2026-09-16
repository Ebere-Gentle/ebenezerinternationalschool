import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  User,
  MapPin,
  Printer,
  GraduationCap,
  Sparkles,
  RefreshCw,
  CalendarCheck2,
  Layers3,
  Users,
  Eye,
  Grid3X3,
  List,
  Search,
  Filter,
  X,
  Building2,
  TrendingUp,
  AlertCircle,
  Baby,
  BookOpen,
  School,
  Backpack,
  Pencil,
  Microscope,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../config/supabase/client';

/* =========================================================
   TYPES
========================================================= */

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
type ViewMode = 'grid' | 'list' | 'compact';

interface ClassRow {
  id: string;
  name: string;
  code?: string | null;
  level?: string | null;
  branch_id?: string | null;
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
  day?: string | null;
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

interface Lesson {
  subject: string;
  teacher: string;
  room: string;
}

interface ClassTimetable {
  classInfo: ClassRow;
  lessons: Record<DayKey, Record<number, Lesson>>;
  stats: {
    totalLessons: number;
    uniqueSubjects: number;
    completionRate: number;
  };
}

/* =========================================================
   CONSTANTS
========================================================= */

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'MON' },
  { key: 'tuesday', label: 'Tuesday', short: 'TUE' },
  { key: 'wednesday', label: 'Wednesday', short: 'WED' },
  { key: 'thursday', label: 'Thursday', short: 'THU' },
  { key: 'friday', label: 'Friday', short: 'FRI' },
];

const PERIODS = [
  { period: 1, start: '08:10', end: '08:50', label: '08:10 - 08:50' },
  { period: 2, start: '08:50', end: '09:30', label: '08:50 - 09:30' },
  { period: 3, start: '09:30', end: '10:10', label: '09:30 - 10:10' },
  { period: 4, start: '10:30', end: '11:10', label: '10:30 - 11:10' },
  { period: 5, start: '11:10', end: '11:50', label: '11:10 - 11:50' },
  { period: 6, start: '12:10', end: '12:50', label: '12:10 - 12:50' },
  { period: 7, start: '12:50', end: '13:30', label: '12:50 - 01:30' },
  { period: 8, start: '13:30', end: '14:10', label: '01:30 - 02:10' },
];

/* =========================================================
   CLASS ICON RESOLVER
========================================================= */

interface ClassIconConfig {
  icon: React.ReactNode;
  gradient: string;
  label: string;
}

/**
 * Picks an icon based on the class level or name.
 *
 * Examples:
 *  - Nursery / Pre-K / KG      -> Baby icon (pink)
 *  - Primary / Grade 1-6        -> Backpack icon (amber)
 *  - JSS / Junior Secondary     -> BookOpen icon (blue)
 *  - SSS / Senior Secondary     -> Microscope icon (emerald)
 *  - Science class              -> Microscope icon (emerald)
 *  - Art / Creative             -> Pencil icon (purple)
 *  - Default                    -> School icon (indigo)
 */
const getClassIcon = (cls: ClassRow): ClassIconConfig => {
  const haystack = `${cls.name} ${cls.level || ''} ${cls.code || ''}`.toLowerCase();

  /* Nursery / Kindergarten / Pre-K */
  if (
    haystack.includes('nursery') ||
    haystack.includes('pre-k') ||
    haystack.includes('prek') ||
    haystack.includes('kindergarten') ||
    haystack.includes(' kg ') ||
    haystack.endsWith(' kg') ||
    haystack.includes('creche') ||
    haystack.includes('play group') ||
    haystack.includes('playgroup')
  ) {
    return {
      icon: <Baby className="w-5 h-5" />,
      gradient: 'from-pink-400 to-rose-500',
      label: 'Nursery',
    };
  }

  /* Primary */
  if (
    haystack.includes('primary') ||
    haystack.includes('basic') ||
    /grade\s*[1-6]/.test(haystack) ||
    /primary\s*[1-6]/.test(haystack)
  ) {
    return {
      icon: <Backpack className="w-5 h-5" />,
      gradient: 'from-amber-400 to-orange-500',
      label: 'Primary',
    };
  }

  /* JSS / Junior Secondary */
  if (
    haystack.includes('jss') ||
    haystack.includes('junior') ||
    haystack.includes('js ')
  ) {
    return {
      icon: <BookOpen className="w-5 h-5" />,
      gradient: 'from-blue-500 to-indigo-600',
      label: 'Junior Secondary',
    };
  }

  /* SSS / Senior Secondary */
  if (
    haystack.includes('sss') ||
    haystack.includes('senior') ||
    haystack.includes('ss ') ||
    haystack.includes('high school')
  ) {
    return {
      icon: <Microscope className="w-5 h-5" />,
      gradient: 'from-emerald-500 to-teal-600',
      label: 'Senior Secondary',
    };
  }

  /* Science / Lab */
  if (haystack.includes('science') || haystack.includes('lab')) {
    return {
      icon: <Microscope className="w-5 h-5" />,
      gradient: 'from-emerald-500 to-cyan-600',
      label: 'Science',
    };
  }

  /* Art / Creative */
  if (
    haystack.includes('art') ||
    haystack.includes('creative') ||
    haystack.includes('music')
  ) {
    return {
      icon: <Pencil className="w-5 h-5" />,
      gradient: 'from-purple-500 to-fuchsia-600',
      label: 'Creative',
    };
  }

  /* Default */
  return {
    icon: <School className="w-5 h-5" />,
    gradient: 'from-indigo-500 to-blue-600',
    label: 'Class',
  };
};

/* =========================================================
   HELPERS
========================================================= */

const normalizeDay = (value: string | null | undefined): DayKey | null => {
  if (!value) return null;
  const day = String(value).toLowerCase().trim();
  if (day.startsWith('mon')) return 'monday';
  if (day.startsWith('tue')) return 'tuesday';
  if (day.startsWith('wed')) return 'wednesday';
  if (day.startsWith('thu')) return 'thursday';
  if (day.startsWith('fri')) return 'friday';
  return null;
};

const formatTeacherName = (teacher?: Teacher | null) => {
  if (!teacher) return 'Subject Teacher';
  if (teacher.name?.trim()) return teacher.name.trim();
  return (
    [teacher.first_name, teacher.last_name].filter(Boolean).join(' ').trim() ||
    'Subject Teacher'
  );
};

const getCurrentDay = (): DayKey => {
  const day = dayjs().day();
  switch (day) {
    case 1: return 'monday';
    case 2: return 'tuesday';
    case 3: return 'wednesday';
    case 4: return 'thursday';
    case 5: return 'friday';
    default: return 'monday';
  }
};

const getSubjectInitials = (subject: string) => {
  if (!subject) return '?';
  return subject
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
};

const getSubjectColor = (subject: string) => {
  if (!subject)
    return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
  const name = subject.toLowerCase();
  if (name.includes('math'))
    return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40';
  if (name.includes('physics') || name.includes('chemistry') || name.includes('biology') || name.includes('science'))
    return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40';
  if (name.includes('english') || name.includes('literature') || name.includes('french'))
    return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/40';
  if (name.includes('economics') || name.includes('commerce') || name.includes('accounting') || name.includes('government'))
    return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/40';
  if (name.includes('computer') || name.includes('ict') || name.includes('data processing'))
    return 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-900/40';
  if (name.includes('physical') || name.includes('sports'))
    return 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-900/40';
  return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700/40';
};

/* =========================================================
   CLASS BADGE (reusable)
========================================================= */

const ClassBadge: React.FC<{
  cls: ClassRow;
  size?: 'sm' | 'md' | 'lg';
}> = ({ cls, size = 'md' }) => {
  const config = getClassIcon(cls);

  const sizeMap = {
    sm: { box: 'w-8 h-8 rounded-lg', icon: 'w-3.5 h-3.5' },
    md: { box: 'w-11 h-11 rounded-xl', icon: 'w-5 h-5' },
    lg: { box: 'w-14 h-14 rounded-2xl', icon: 'w-6 h-6' },
  };

  const s = sizeMap[size];

  /* Render icon at the requested size */
  const iconNode = React.isValidElement(config.icon)
    ? React.cloneElement(config.icon as React.ReactElement<any>, {
        className: s.icon,
      })
    : config.icon;

  return (
    <div
      className={`${s.box} bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}
      title={config.label}
    >
      {iconNode}
    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

const AdminTimetableOverview: React.FC = () => {
  const { user } = useAuth();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [allTimetables, setAllTimetables] = useState<TimetableRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayKey>(getCurrentDay());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [selectedClassForDetail, setSelectedClassForDetail] = useState<ClassRow | null>(null);

  /* Collapsible section state */
  const [collapsed, setCollapsed] = useState(false);

  const branchId = user?.branch_id || null;

  /* =========================================================
     DATA LOADING
  ========================================================= */

  const loadAllData = useCallback(async () => {
    if (!user?.id) return;

    try {
      let classQuery = supabase
        .from('classes')
        .select('id, name, code, level, branch_id')
        .eq('status', 'active')
        .order('name');

      if (branchId) {
        classQuery = classQuery.eq('branch_id', branchId);
      }

      const { data: classData, error: classError } = await classQuery;
      if (classError) throw classError;

      const loadedClasses = (classData || []) as ClassRow[];
      setClasses(loadedClasses);

      let subjectQuery = supabase
        .from('subjects')
        .select('id, name, code')
        .order('name');

      if (branchId) {
        subjectQuery = subjectQuery.eq('branch_id', branchId);
      }

      const { data: subjectData, error: subjectError } = await subjectQuery;
      if (subjectError) throw subjectError;
      setSubjects((subjectData || []) as Subject[]);

      let teacherQuery = supabase
        .from('teachers')
        .select('id, first_name, last_name, name')
        .order('first_name');

      if (branchId) {
        teacherQuery = teacherQuery.eq('branch_id', branchId);
      }

      const { data: teacherData, error: teacherError } = await teacherQuery;
      if (teacherError) throw teacherError;
      setTeachers((teacherData || []) as Teacher[]);

      if (loadedClasses.length > 0) {
        const classIds = loadedClasses.map((c) => c.id);
        const { data: timetableData, error: timetableError } = await supabase
          .from('timetables')
          .select('*')
          .in('class_id', classIds)
          .order('day_of_week')
          .order('period');

        if (timetableError) throw timetableError;
        setAllTimetables((timetableData || []) as TimetableRow[]);
      } else {
        setAllTimetables([]);
      }
    } catch (error) {
      console.error('Failed to load admin timetable data:', error);
      toast.error('Unable to load timetable data');
    }
  }, [user?.id, branchId]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      await loadAllData();
      if (!cancelled) setLoading(false);
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [loadAllData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
    toast.success('Timetable data refreshed');
  };

  /* =========================================================
     COMPUTED DATA
  ========================================================= */

  const levels = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      if (c.level) set.add(c.level);
    });
    return Array.from(set).sort();
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const matchesSearch =
        !searchQuery ||
        cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cls.code?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesLevel = levelFilter === 'all' || cls.level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [classes, searchQuery, levelFilter]);

  const classTimetables: ClassTimetable[] = useMemo(() => {
    return filteredClasses.map((cls) => {
      const classRows = allTimetables.filter((row) => row.class_id === cls.id);

      const mapped: Record<DayKey, Record<number, Lesson>> = {
        monday: {},
        tuesday: {},
        wednesday: {},
        thursday: {},
        friday: {},
      };

      classRows.forEach((row) => {
        if (!row.day_of_week) return;
        const day = normalizeDay(row.day_of_week);
        if (!day) return;

        const period = Number(row.period);
        if (!period || period < 1 || period > 8) return;

        const subject =
          row.subject_name ||
          subjects.find((s) => s.id === row.subject_id)?.name ||
          'Subject';

        const teacher =
          row.teacher_name ||
          formatTeacherName(teachers.find((t) => t.id === row.teacher_id));

        const room = row.room || row.classroom || 'Classroom';

        mapped[day][period] = { subject, teacher, room };
      });

      const subjectCounts = new Set<string>();
      let totalLessons = 0;

      Object.values(mapped).forEach((dayMap) => {
        Object.values(dayMap).forEach((lesson) => {
          subjectCounts.add(lesson.subject);
          totalLessons++;
        });
      });

      const maxPossibleLessons = 5 * 8;

      return {
        classInfo: cls,
        lessons: mapped,
        stats: {
          totalLessons,
          uniqueSubjects: subjectCounts.size,
          completionRate: Math.round((totalLessons / maxPossibleLessons) * 100),
        },
      };
    });
  }, [filteredClasses, allTimetables, subjects, teachers]);

  const globalStats = useMemo(() => {
    const totalClasses = classes.length;
    const totalLessons = allTimetables.length;
    const classesWithTimetable = new Set(allTimetables.map((r) => r.class_id)).size;
    const uniqueTeachers = new Set(
      allTimetables.map((r) => r.teacher_id).filter(Boolean)
    ).size;

    return {
      totalClasses,
      totalLessons,
      classesWithTimetable,
      uniqueTeachers,
      coverage:
        totalClasses > 0
          ? Math.round((classesWithTimetable / totalClasses) * 100)
          : 0,
    };
  }, [classes, allTimetables]);

  const handlePrint = () => window.print();

  /* =========================================================
     RENDER: LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <CalendarDays className="w-7 h-7 text-blue-500 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Loading all timetables
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gathering schedule data across all classes...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     RENDER: MAIN
  ========================================================= */

  return (
    <>
      <style>
        {`
          @media print {
            body { background: white !important; }
            nav, aside, header button, .no-print { display: none !important; }
            .print-container { width: 100% !important; max-width: none !important; padding: 0 !important; margin: 0 !important; }
            .print-card { box-shadow: none !important; border: 1px solid #ddd !important; page-break-inside: avoid; }
            .admin-tt-scroll { max-height: none !important; overflow: visible !important; }
          }
        `}
      </style>

      <div className="print-container space-y-4 pb-8">

        {/* =====================================================
            HEADER + FILTERS (Collapsible)
        ===================================================== */}

        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

          {/* Header bar */}
          <div className="p-5 sm:p-6">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/25">
                  <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>

                <div>
                  <div className="flex items-center gap-2 text-[10px] text-blue-500 dark:text-blue-400 tracking-widest mb-1.5">
                    <Sparkles className="w-3 h-3" />
                    Admin Overview
                  </div>

                  <h1 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white tracking-tight">
                    All Classes Timetable
                  </h1>

                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                    Monitor and review timetables across every class
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 no-print">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-xs flex items-center gap-2 transition-all disabled:opacity-60 text-gray-700 dark:text-gray-300"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>

                <button
                  onClick={handlePrint}
                  className="px-3.5 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>

                <button
                  onClick={() => setCollapsed((v) => !v)}
                  className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-xs flex items-center gap-2 transition-all text-gray-700 dark:text-gray-300"
                  title={collapsed ? 'Expand' : 'Collapse'}
                >
                  {collapsed ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                  {collapsed ? 'Expand' : 'Collapse'}
                </button>
              </div>
            </div>

            {/* GLOBAL STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-5">
              <StatCard
                icon={<GraduationCap className="w-4 h-4" />}
                label="Total Classes"
                value={String(globalStats.totalClasses)}
                iconClass="text-blue-500 dark:text-blue-400"
              />
              <StatCard
                icon={<CalendarCheck2 className="w-4 h-4" />}
                label="Scheduled Lessons"
                value={String(globalStats.totalLessons)}
                iconClass="text-emerald-500 dark:text-emerald-400"
              />
              <StatCard
                icon={<TrendingUp className="w-4 h-4" />}
                label="Coverage"
                value={`${globalStats.coverage}%`}
                iconClass="text-amber-500 dark:text-amber-400"
              />
              <StatCard
                icon={<Users className="w-4 h-4" />}
                label="Active Teachers"
                value={String(globalStats.uniqueTeachers)}
                iconClass="text-purple-500 dark:text-purple-400"
              />
            </div>
          </div>

          {/* =====================================================
              FILTERS
          ===================================================== */}

          {!collapsed && (
            <div className="no-print px-5 sm:px-6 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search class name or code..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    className="pl-10 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
                  >
                    <option value="all">All Levels</option>
                    {levels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                    Day:
                  </span>
                  <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
                    {DAYS.map((day) => {
                      const active = selectedDay === day.key;
                      const today = getCurrentDay() === day.key;

                      return (
                        <button
                          key={day.key}
                          onClick={() => setSelectedDay(day.key)}
                          className={`relative px-3 py-1.5 rounded-lg text-xs transition-all ${
                            active
                              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm font-medium'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          }`}
                        >
                          {day.short}
                          {today && (
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                    title="Grid view"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('compact')}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'compact'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                    title="Compact view"
                  >
                    <Layers3 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {(searchQuery || levelFilter !== 'all') && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] text-gray-400">Active filters:</span>
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-[10px]">
                      Search: &quot;{searchQuery}&quot;
                      <button onClick={() => setSearchQuery('')}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {levelFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 text-[10px]">
                      Level: {levelFilter}
                      <button onClick={() => setLevelFilter('all')}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setLevelFilter('all');
                    }}
                    className="ml-auto text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =====================================================
            SCROLLABLE CONTENT
        ===================================================== */}

        {!collapsed && (
          <>
            {/* Results count */}
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing <span className="text-gray-900 dark:text-white">{filteredClasses.length}</span> of{' '}
                <span className="text-gray-900 dark:text-white">{classes.length}</span> classes
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Viewing: <span className="text-gray-900 dark:text-white capitalize">{selectedDay}</span>
              </p>
            </div>

            {/* EMPTY STATE */}
            {filteredClasses.length === 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h3 className="text-gray-900 dark:text-white mb-1">No classes found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {searchQuery || levelFilter !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'No classes have been created yet.'}
                </p>
              </div>
            )}

            {/*
              SCROLLABLE WRAPPER
              - max-h-[70vh] keeps it contained on desktop
              - overflow-y-auto enables internal scrolling
              - p-1 gives room for focus rings / shadows
            */}
            {filteredClasses.length > 0 && (
              <div className="admin-tt-scroll max-h-[70vh] overflow-y-auto rounded-3xl p-1 -m-1">
                {/* GRID VIEW */}
                {viewMode === 'grid' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {classTimetables.map((ct) => (
                      <ClassTimetableCard
                        key={ct.classInfo.id}
                        data={ct}
                        selectedDay={selectedDay}
                        onExpand={() => setSelectedClassForDetail(ct.classInfo)}
                      />
                    ))}
                  </div>
                )}

                {/* LIST VIEW */}
                {viewMode === 'list' && (
                  <div className="space-y-3">
                    {classTimetables.map((ct) => (
                      <ClassTimetableListRow
                        key={ct.classInfo.id}
                        data={ct}
                        selectedDay={selectedDay}
                        onExpand={() => setSelectedClassForDetail(ct.classInfo)}
                      />
                    ))}
                  </div>
                )}

                {/* COMPACT VIEW */}
                {viewMode === 'compact' && (
                  <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-gray-50 dark:bg-gray-950/80 backdrop-blur">
                            <th className="text-left p-3 text-[10px] tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                              Class
                            </th>
                            <th className="text-left p-3 text-[10px] tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                              Level
                            </th>
                            {PERIODS.map((p) => (
                              <th
                                key={p.period}
                                className="text-center p-2 text-[10px] tracking-wider text-gray-500 dark:text-gray-400 font-medium min-w-[100px]"
                              >
                                P{p.period}
                              </th>
                            ))}
                            <th className="text-center p-3 text-[10px] tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                              View
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {classTimetables.map((ct) => (
                            <tr
                              key={ct.classInfo.id}
                              className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2.5">
                                  <ClassBadge cls={ct.classInfo} size="sm" />
                                  <div>
                                    <p className="text-sm text-gray-900 dark:text-white">
                                      {ct.classInfo.name}
                                    </p>
                                    {ct.classInfo.code && (
                                      <p className="text-[10px] text-gray-400">
                                        {ct.classInfo.code}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                                  {ct.classInfo.level || 'N/A'}
                                </span>
                              </td>
                              {PERIODS.map((p) => {
                                const lesson = ct.lessons[selectedDay]?.[p.period];
                                return (
                                  <td key={p.period} className="p-1.5">
                                    {lesson ? (
                                      <div
                                        className={`rounded-lg border px-2 py-1.5 text-center ${getSubjectColor(
                                          lesson.subject
                                        )}`}
                                      >
                                        <p className="text-[9px] font-medium truncate">
                                          {lesson.subject}
                                        </p>
                                        <p className="text-[8px] opacity-70 truncate">
                                          {lesson.room}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center">
                                        <span className="text-[9px] text-gray-300 dark:text-gray-600">
                                          —
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => setSelectedClassForDetail(ct.classInfo)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-blue-500 transition-colors"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1 text-[10px] text-gray-400">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5" />
            {dayjs().format('dddd, MMMM D, YYYY')}
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5" />
            Admin Overview · {globalStats.totalClasses} Classes
          </div>
        </div>
      </div>

      {/* =====================================================
          DETAIL MODAL
      ===================================================== */}

      <AnimatePresence>
        {selectedClassForDetail && (
          <ClassDetailModal
            classInfo={selectedClassForDetail}
            timetable={
              classTimetables.find(
                (ct) => ct.classInfo.id === selectedClassForDetail.id
              ) || null
            }
            onClose={() => setSelectedClassForDetail(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

/* =========================================================
   STAT CARD
========================================================= */

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  iconClass: string;
}> = ({ icon, label, value, iconClass }) => {
  return (
    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3">
      <div className={`flex items-center gap-1.5 mb-1 ${iconClass}`}>
        {icon}
        <p className="text-[9px] tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </p>
      </div>
      <p className="text-lg font-medium text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
};

/* =========================================================
   CLASS TIMETABLE CARD (Grid view)
========================================================= */

const ClassTimetableCard: React.FC<{
  data: ClassTimetable;
  selectedDay: DayKey;
  onExpand: () => void;
}> = ({ data, selectedDay, onExpand }) => {
  const { classInfo, lessons, stats } = data;
  const dayLessons = lessons[selectedDay] || {};
  const dayPeriodCount = Object.keys(dayLessons).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <ClassBadge cls={classInfo} size="md" />
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {classInfo.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {classInfo.code && (
                  <span className="text-[10px] text-gray-400">
                    {classInfo.code}
                  </span>
                )}
                {classInfo.level && (
                  <span className="px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 text-[9px] capitalize">
                    {classInfo.level}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onExpand}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
            title="View full timetable"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-gray-400 tracking-wider uppercase">
            {selectedDay}
          </span>
          <span className="text-[10px] text-gray-400">
            {dayPeriodCount} period{dayPeriodCount !== 1 ? 's' : ''}
          </span>
        </div>

        {dayPeriodCount === 0 ? (
          <div className="py-6 text-center">
            <CalendarDays className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
            <p className="text-[11px] text-gray-400">
              No lessons scheduled
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {PERIODS.map((p) => {
              const lesson = dayLessons[p.period];
              if (!lesson) return null;

              return (
                <div
                  key={p.period}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${getSubjectColor(
                    lesson.subject
                  )}`}
                >
                  <span className="text-[9px] opacity-60 w-5 flex-shrink-0">
                    P{p.period}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">
                      {lesson.subject}
                    </p>
                    <p className="text-[9px] opacity-70 truncate">
                      {lesson.room}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {stats.totalLessons}
            </p>
            <p className="text-[9px] text-gray-400">Lessons</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {stats.uniqueSubjects}
            </p>
            <p className="text-[9px] text-gray-400">Subjects</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {stats.completionRate}%
            </p>
            <p className="text-[9px] text-gray-400">Filled</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* =========================================================
   CLASS TIMETABLE LIST ROW (List view)
========================================================= */

const ClassTimetableListRow: React.FC<{
  data: ClassTimetable;
  selectedDay: DayKey;
  onExpand: () => void;
}> = ({ data, selectedDay, onExpand }) => {
  const { classInfo, lessons, stats } = data;
  const dayLessons = lessons[selectedDay] || {};
  const dayPeriodCount = Object.keys(dayLessons).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-3 lg:w-64 flex-shrink-0">
            <ClassBadge cls={classInfo} size="md" />
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {classInfo.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {classInfo.code && (
                  <span className="text-[10px] text-gray-400">
                    {classInfo.code}
                  </span>
                )}
                {classInfo.level && (
                  <span className="px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 text-[9px] capitalize">
                    {classInfo.level}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {dayPeriodCount === 0 ? (
              <p className="text-xs text-gray-400 py-2">
                No lessons scheduled for {selectedDay}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {PERIODS.map((p) => {
                  const lesson = dayLessons[p.period];
                  if (!lesson) return null;

                  return (
                    <div
                      key={p.period}
                      className={`rounded-lg border px-2 py-1.5 ${getSubjectColor(
                        lesson.subject
                      )}`}
                    >
                      <p className="text-[9px] opacity-60">P{p.period}</p>
                      <p className="text-[10px] font-medium truncate max-w-[100px]">
                        {lesson.subject}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 lg:flex-shrink-0">
            <div className="flex items-center gap-4 text-center">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats.totalLessons}
                </p>
                <p className="text-[9px] text-gray-400">Lessons</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats.uniqueSubjects}
                </p>
                <p className="text-[9px] text-gray-400">Subjects</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats.completionRate}%
                </p>
                <p className="text-[9px] text-gray-400">Filled</p>
              </div>
            </div>

            <button
              onClick={onExpand}
              className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
              title="View full timetable"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* =========================================================
   CLASS DETAIL MODAL
========================================================= */

const ClassDetailModal: React.FC<{
  classInfo: ClassRow;
  timetable: ClassTimetable | null;
  onClose: () => void;
}> = ({ classInfo, timetable, onClose }) => {
  const [activeDay, setActiveDay] = useState<DayKey>(getCurrentDay());

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-print"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Modal header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <ClassBadge cls={classInfo} size="md" />
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {classInfo.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                {classInfo.code && (
                  <span className="text-xs text-gray-400">
                    {classInfo.code}
                  </span>
                )}
                {classInfo.level && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 text-[10px] capitalize">
                    {classInfo.level}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Day tabs */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-800 overflow-x-auto flex-shrink-0">
          <div className="flex gap-2 min-w-max">
            {DAYS.map((day) => {
              const active = activeDay === day.key;
              const today = getCurrentDay() === day.key;

              return (
                <button
                  key={day.key}
                  onClick={() => setActiveDay(day.key)}
                  className={`px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 ${
                    active
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {day.label}
                  {today && (
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded ${
                        active
                          ? 'bg-white/20'
                          : 'bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      TODAY
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {!timetable ? (
            <div className="py-12 text-center">
              <CalendarDays className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No timetable data available
              </p>
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 tracking-wider">
                    TOTAL LESSONS
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white mt-1">
                    {timetable.stats.totalLessons}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 tracking-wider">
                    UNIQUE SUBJECTS
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white mt-1">
                    {timetable.stats.uniqueSubjects}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 tracking-wider">
                    COMPLETION
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white mt-1">
                    {timetable.stats.completionRate}%
                  </p>
                </div>
              </div>

              {/* Day timetable */}
              <div className="space-y-2">
                {PERIODS.map((p) => {
                  const lesson = timetable.lessons[activeDay]?.[p.period];

                  return (
                    <div key={p.period} className="flex items-stretch gap-3">
                      <div className="w-24 flex-shrink-0 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3">
                        <p className="text-[10px] text-gray-400 tracking-wider">
                          PERIOD {p.period}
                        </p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">
                          {p.label}
                        </p>
                      </div>

                      <div className="flex-1">
                        {lesson ? (
                          <div
                            className={`rounded-xl border p-3 h-full ${getSubjectColor(
                              lesson.subject
                            )}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {lesson.subject}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                  <div className="flex items-center gap-1.5 text-[10px] opacity-75">
                                    <User className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">
                                      {lesson.teacher}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] opacity-75">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">
                                      {lesson.room}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="w-9 h-9 rounded-lg bg-white/70 dark:bg-black/20 flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                                {getSubjectInitials(lesson.subject)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-3 h-full flex items-center justify-center">
                            <p className="text-[11px] text-gray-400">
                              No lesson scheduled
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminTimetableOverview;
