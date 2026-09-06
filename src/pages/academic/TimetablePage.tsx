
// src/pages/academic/TimetablePage.tsx


import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Download,
  Edit3,
  Grid3X3,
  Loader2,
  MapPin,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';

type DayKey =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday';

type TimetableRow = {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  day: DayKey;
  period: number;
  room: string | null;
  notes: string | null;
  is_break?: boolean;
};

type SchoolClass = {
  id: string;
  name: string;
  code: string | null;
  level: string | null;
  branch_id: string | null;
};

type Subject = {
  id: string;
  name: string;
  code: string | null;
  class_id?: string | null;
  branch_id?: string | null;
};

type Teacher = {
  id: string;
  name: string;
  user_id?: string | null;
};

type DisplayEntry = {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  day: DayKey;
  period: number;
  room: string | null;
  notes: string | null;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
};

type ScheduleSlot = {
  period: number;
  start: string;
  end: string;
  type: 'lesson' | 'break';
  breakLabel?: string;
};

const DAYS: DayKey[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

const LESSON_DURATION_MINUTES = 40;

/*
 * Break durations were not specified.
 * We use 20 minutes for each break.
 *
 * Change this to 15, 25, etc. if the school
 * uses a different break duration.
 */
const BREAK_DURATION_MINUTES = 20;

const SCHOOL_START_HOUR = 8;
const SCHOOL_START_MINUTE = 10;

const BREAK_AFTER_PERIOD_1 = 3;
const BREAK_AFTER_PERIOD_2 = 5;

const getMinutes = (
  hour: number,
  minute: number
): number => hour * 60 + minute;

const formatTime = (totalMinutes: number): string => {
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  const period = hour24 >= 12 ? 'PM' : 'AM';

  const hour12 =
    hour24 % 12 === 0 ? 12 : hour24 % 12;

  return `${String(hour12).padStart(2, '0')}:${String(
    minute
  ).padStart(2, '0')} ${period}`;
};

const buildSchedule = (): ScheduleSlot[] => {
  const slots: ScheduleSlot[] = [];

  let cursor = getMinutes(
    SCHOOL_START_HOUR,
    SCHOOL_START_MINUTE
  );

  for (let period = 1; period <= 8; period++) {
    const start = cursor;
    const end =
      start + LESSON_DURATION_MINUTES;

    slots.push({
      period,
      start: formatTime(start),
      end: formatTime(end),
      type: 'lesson',
    });

    cursor = end;

    if (
      period === BREAK_AFTER_PERIOD_1 ||
      period === BREAK_AFTER_PERIOD_2
    ) {
      const breakEnd =
        cursor + BREAK_DURATION_MINUTES;

      slots.push({
        period: period + 0.5,
        start: formatTime(cursor),
        end: formatTime(breakEnd),
        type: 'break',
        breakLabel:
          period === BREAK_AFTER_PERIOD_1
            ? 'First Break'
            : 'Second Break',
      });

      cursor = breakEnd;
    }
  }

  return slots;
};

const SCHEDULE = buildSchedule();

const LESSON_SLOTS = SCHEDULE.filter(
  (slot) => slot.type === 'lesson'
);

const DAY_SHORT: Record<DayKey, string> = {
  Monday: 'MON',
  Tuesday: 'TUE',
  Wednesday: 'WED',
  Thursday: 'THU',
  Friday: 'FRI',
};

const normalizeDay = (
  value: unknown
): DayKey | null => {
  const normalized = String(
    value || ''
  )
    .trim()
    .toLowerCase();

  const map: Record<string, DayKey> = {
    mon: 'Monday',
    monday: 'Monday',
    tue: 'Tuesday',
    tues: 'Tuesday',
    tuesday: 'Tuesday',
    wed: 'Wednesday',
    wednesday: 'Wednesday',
    thu: 'Thursday',
    thur: 'Thursday',
    thurs: 'Thursday',
    thursday: 'Thursday',
    fri: 'Friday',
    friday: 'Friday',
  };

  return map[normalized] || null;
};

const normalizePeriod = (
  value: unknown
): number | null => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  const rounded = Math.round(number);

  if (rounded < 1 || rounded > 8) {
    return null;
  }

  return rounded;
};

const getTeacherDisplayName = (
  teacher: any
): string => {
  if (!teacher) return '';

  if (teacher.full_name) {
    return String(teacher.full_name);
  }

  if (teacher.name) {
    return String(teacher.name);
  }

  const full = [
    teacher.first_name,
    teacher.middle_name,
    teacher.last_name,
  ]
    .filter(Boolean)
    .join(' ');

  return full;
};

const escapeCsv = (
  value: unknown
): string => {
  const text = String(value ?? '');

  return `"${text.replace(/"/g, '""')}"`;
};

const TimetablePage: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [classes, setClasses] =
    useState<SchoolClass[]>([]);

  const [subjects, setSubjects] =
    useState<Subject[]>([]);

  const [teachers, setTeachers] =
    useState<Teacher[]>([]);

  const [entries, setEntries] =
    useState<TimetableRow[]>([]);

  const [selectedClassId, setSelectedClassId] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [showEditor, setShowEditor] =
    useState(false);

  const [editingEntry, setEditingEntry] =
    useState<DisplayEntry | null>(null);

  const [selectedDay, setSelectedDay] =
    useState<DayKey>('Monday');

  const [selectedPeriod, setSelectedPeriod] =
    useState(1);

  const [selectedSubjectId, setSelectedSubjectId] =
    useState('');

  const [selectedTeacherId, setSelectedTeacherId] =
    useState('');

  const [room, setRoom] =
    useState('');

  const [notes, setNotes] =
    useState('');

  const [showGenerateModal, setShowGenerateModal] =
    useState(false);

  const [generating, setGenerating] =
    useState(false);

  const [generateMode, setGenerateMode] =
    useState<'balanced' | 'sequential'>(
      'balanced'
    );

  const branchId =
    (user as any)?.branch_id ||
    (user as any)?.branchId ||
    null;

  /*
   * ---------------------------------------------------------
   * LOAD CLASSES
   * ---------------------------------------------------------
   */

  const loadClasses = useCallback(async () => {
    let query = supabase
      .from('classes')
      .select(
        'id, name, code, level, branch_id'
      )
      .order('name', {
        ascending: true,
      });

    if (branchId) {
      query = query.eq(
        'branch_id',
        branchId
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        'Unable to load classes:',
        error
      );

      throw error;
    }

    const mapped: SchoolClass[] = (
      data || []
    ).map((item: any) => ({
      id: item.id,
      name:
        item.name ||
        item.class_name ||
        'Unnamed Class',
      code:
        item.code ||
        item.class_code ||
        null,
      level: item.level || null,
      branch_id:
        item.branch_id || null,
    }));

    setClasses(mapped);

    if (
      mapped.length > 0 &&
      !selectedClassId
    ) {
      setSelectedClassId(mapped[0].id);
    }
  }, [branchId, selectedClassId]);

  /*
   * ---------------------------------------------------------
   * LOAD SUBJECTS
   * ---------------------------------------------------------
   */

  const loadSubjects = useCallback(async () => {
    let query = supabase
      .from('subjects')
      .select(
        'id, name, code, class_id, branch_id'
      )
      .order('name', {
        ascending: true,
      });

    if (branchId) {
      query = query.eq(
        'branch_id',
        branchId
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        'Unable to load subjects:',
        error
      );

      /*
       * Some installations may not have
       * branch_id/class_id on subjects.
       *
       * Retry with only the columns that
       * exist in the common schema.
       */
      const fallback =
        await supabase
          .from('subjects')
          .select(
            'id, name, code'
          )
          .order('name', {
            ascending: true,
          });

      if (fallback.error) {
        throw error;
      }

      setSubjects(
        (fallback.data || []).map(
          (item: any) => ({
            id: item.id,
            name:
              item.name ||
              'Unnamed Subject',
            code: item.code || null,
          })
        )
      );

      return;
    }

    setSubjects(
      (data || []).map(
        (item: any) => ({
          id: item.id,
          name:
            item.name ||
            item.subject_name ||
            'Unnamed Subject',
          code:
            item.code ||
            item.subject_code ||
            null,
          class_id:
            item.class_id ||
            null,
          branch_id:
            item.branch_id ||
            null,
        })
      )
    );
  }, [branchId]);

  /*
   * ---------------------------------------------------------
   * LOAD TEACHERS
   * ---------------------------------------------------------
   */

  const loadTeachers = useCallback(async () => {
    let query = supabase
      .from('teachers')
      .select('*')
      .order('first_name', {
        ascending: true,
      });

    if (branchId) {
      query = query.eq(
        'branch_id',
        branchId
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        'Unable to load teachers:',
        error
      );

      /*
       * Teachers are optional for timetable
       * display, so don't break the entire
       * timetable if teacher data cannot load.
       */
      setTeachers([]);
      return;
    }

    setTeachers(
      (data || []).map(
        (item: any) => ({
          id: item.id,
          name:
            getTeacherDisplayName(item) ||
            item.email ||
            'Teacher',
          user_id:
            item.user_id || null,
        })
      )
    );
  }, [branchId]);

  /*
   * ---------------------------------------------------------
   * LOAD TIMETABLE
   * ---------------------------------------------------------
   */

  const loadTimetable = useCallback(
    async () => {
      let query = supabase
        .from('timetables')
        .select('*')
        .order('day', {
          ascending: true,
        })
        .order('period', {
          ascending: true,
        });

      if (selectedClassId) {
        query = query.eq(
          'class_id',
          selectedClassId
        );
      }

      const { data, error } =
        await query;

      if (error) {
        /*
         * If the table does not exist, show
         * an empty timetable instead of
         * crashing the page.
         */
        if (
          error.code === 'PGRST205' ||
          error.message
            ?.toLowerCase()
            .includes('timetables')
        ) {
          console.warn(
            'Timetables table was not found.'
          );

          setEntries([]);
          return;
        }

        console.error(
          'Unable to load timetable:',
          error
        );

        throw error;
      }

      const normalized: TimetableRow[] =
        (data || [])
          .map((item: any) => {
            const day = normalizeDay(
              item.day ||
                item.day_of_week ||
                item.week_day
            );

            const period =
              normalizePeriod(
                item.period ||
                  item.period_number ||
                  item.lesson_period
              );

            if (!day || !period) {
              return null;
            }

            return {
              id: item.id,
              class_id:
                item.class_id ||
                item.classId,
              subject_id:
                item.subject_id ||
                item.subjectId,
              teacher_id:
                item.teacher_id ||
                item.teacherId ||
                null,
              day,
              period,
              room:
                item.room ||
                item.room_number ||
                item.location ||
                null,
              notes:
                item.notes ||
                item.description ||
                null,
              is_break: false,
            } as TimetableRow;
          })
          .filter(Boolean) as TimetableRow[];

      setEntries(normalized);
    },
    [selectedClassId]
  );

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */

  const loadAll = useCallback(async () => {
    setLoading(true);

    try {
      await Promise.all([
        loadClasses(),
        loadSubjects(),
        loadTeachers(),
      ]);
    } catch (error: any) {
      console.error(
        'Timetable initial load error:',
        error
      );

      toast.error(
        error?.message ||
          'Unable to load timetable data.'
      );
    } finally {
      setLoading(false);
    }
  }, [
    loadClasses,
    loadSubjects,
    loadTeachers,
  ]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedClassId) {
      setEntries([]);
      return;
    }

    loadTimetable();
  }, [
    selectedClassId,
    loadTimetable,
  ]);

  /*
   * ---------------------------------------------------------
   * LOOKUPS
   * ---------------------------------------------------------
   */

  const subjectMap = useMemo(() => {
    const map = new Map<
      string,
      Subject
    >();

    subjects.forEach((subject) => {
      map.set(subject.id, subject);
    });

    return map;
  }, [subjects]);

  const teacherMap = useMemo(() => {
    const map = new Map<
      string,
      Teacher
    >();

    teachers.forEach((teacher) => {
      map.set(teacher.id, teacher);
    });

    return map;
  }, [teachers]);

  const displayEntries =
    useMemo<DisplayEntry[]>(() => {
      return entries.map((entry) => {
        const subject =
          subjectMap.get(
            entry.subject_id
          );

        const teacher =
          entry.teacher_id
            ? teacherMap.get(
                entry.teacher_id
              )
            : null;

        return {
          ...entry,
          subjectName:
            subject?.name ||
            'Unknown Subject',
          subjectCode:
            subject?.code || '',
          teacherName:
            teacher?.name || '',
        };
      });
    }, [
      entries,
      subjectMap,
      teacherMap,
    ]);

  const selectedClass =
    useMemo(
      () =>
        classes.find(
          (item) =>
            item.id === selectedClassId
        ) || null,
      [classes, selectedClassId]
    );

  const classSubjects =
    useMemo(() => {
      if (!selectedClassId) {
        return subjects;
      }

      const linked = subjects.filter(
        (subject) =>
          !subject.class_id ||
          subject.class_id ===
            selectedClassId
      );

      return linked;
    }, [
      selectedClassId,
      subjects,
    ]);

  const filteredSubjects =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      if (!term) {
        return classSubjects;
      }

      return classSubjects.filter(
        (subject) =>
          subject.name
            .toLowerCase()
            .includes(term) ||
          subject.code
            ?.toLowerCase()
            .includes(term)
      );
    }, [
      classSubjects,
      search,
    ]);

  /*
   * ---------------------------------------------------------
   * GRID HELPERS
   * ---------------------------------------------------------
   */

  const getEntry = (
    day: DayKey,
    period: number
  ): DisplayEntry | null => {
    return (
      displayEntries.find(
        (entry) =>
          entry.day === day &&
          entry.period === period
      ) || null
    );
  };

  const getSlot = (
    period: number
  ): ScheduleSlot => {
    return (
      LESSON_SLOTS.find(
        (slot) =>
          slot.period === period
      ) || LESSON_SLOTS[0]
    );
  };

  /*
   * ---------------------------------------------------------
   * EDITOR
   * ---------------------------------------------------------
   */

  const resetEditor = () => {
    setEditingEntry(null);
    setSelectedDay('Monday');
    setSelectedPeriod(1);
    setSelectedSubjectId('');
    setSelectedTeacherId('');
    setRoom('');
    setNotes('');
  };

  const openCreateEditor = (
    day: DayKey,
    period: number
  ) => {
    resetEditor();

    setSelectedDay(day);
    setSelectedPeriod(period);

    setShowEditor(true);
  };

  const openEditEditor = (
    entry: DisplayEntry
  ) => {
    setEditingEntry(entry);

    setSelectedDay(entry.day);
    setSelectedPeriod(entry.period);
    setSelectedSubjectId(
      entry.subject_id
    );
    setSelectedTeacherId(
      entry.teacher_id || ''
    );
    setRoom(entry.room || '');
    setNotes(entry.notes || '');

    setShowEditor(true);
  };

  /*
   * ---------------------------------------------------------
   * SAVE ENTRY
   * ---------------------------------------------------------
   */

  const saveEntry = async () => {
    if (!selectedClassId) {
      toast.error(
        'Please select a class.'
      );
      return;
    }

    if (!selectedSubjectId) {
      toast.error(
        'Please select a subject.'
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        class_id: selectedClassId,
        subject_id:
          selectedSubjectId,
        teacher_id:
          selectedTeacherId || null,
        day: selectedDay,
        period: selectedPeriod,
        room:
          room.trim() || null,
        notes:
          notes.trim() || null,
      };

      /*
       * Update existing entry.
       */
      if (editingEntry) {
        const { error } =
          await supabase
            .from('timetables')
            .update(payload)
            .eq(
              'id',
              editingEntry.id
            );

        if (error) {
          throw error;
        }

        toast.success(
          'Timetable entry updated.'
        );
      } else {
        /*
         * Prevent duplicate class/day/period.
         */
        const existing =
          getEntry(
            selectedDay,
            selectedPeriod
          );

        if (existing) {
          toast.error(
            'This period already has a lesson. Edit the existing lesson instead.'
          );

          setSaving(false);
          return;
        }

        const { error } =
          await supabase
            .from('timetables')
            .insert(payload);

        if (error) {
          throw error;
        }

        toast.success(
          'Timetable entry added.'
        );
      }

      setShowEditor(false);
      resetEditor();

      await loadTimetable();
    } catch (error: any) {
      console.error(
        'Save timetable entry error:',
        error
      );

      toast.error(
        error?.message ||
          'Unable to save timetable entry.'
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * DELETE ENTRY
   * ---------------------------------------------------------
   */

  const deleteEntry = async (
    entry: DisplayEntry
  ) => {
    const confirmed =
      window.confirm(
        `Remove "${entry.subjectName}" from ${entry.day}, Period ${entry.period}?`
      );

    if (!confirmed) return;

    try {
      const { error } =
        await supabase
          .from('timetables')
          .delete()
          .eq('id', entry.id);

      if (error) {
        throw error;
      }

      toast.success(
        'Timetable entry removed.'
      );

      await loadTimetable();
    } catch (error: any) {
      console.error(
        'Delete timetable entry error:',
        error
      );

      toast.error(
        error?.message ||
          'Unable to delete timetable entry.'
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * GENERATE TIMETABLE
   * ---------------------------------------------------------
   *
   * Generates 8 periods x 5 days using
   * the available subjects.
   *
   * We deliberately do NOT invent teacher
   * assignments.
   */

  const generateTimetable = async () => {
    if (!selectedClassId) {
      toast.error(
        'Please select a class first.'
      );
      return;
    }

    if (classSubjects.length === 0) {
      toast.error(
        'No subjects are available for this class.'
      );
      return;
    }

    setGenerating(true);

    try {
      /*
       * Build a balanced subject list.
       *
       * balanced:
       * Tries not to repeat a subject on
       * the same day.
       *
       * sequential:
       * Simply cycles through subjects.
       */
      const generated: Array<{
        class_id: string;
        subject_id: string;
        teacher_id: string | null;
        day: DayKey;
        period: number;
        room: string | null;
        notes: string | null;
      }> = [];

      let subjectIndex = 0;

      for (
        let dayIndex = 0;
        dayIndex < DAYS.length;
        dayIndex++
      ) {
        const day = DAYS[dayIndex];

        const subjectsUsedToday =
          new Set<string>();

        for (
          let period = 1;
          period <= 8;
          period++
        ) {
          let chosen:
            | Subject
            | undefined;

          if (
            generateMode ===
            'balanced'
          ) {
            /*
             * Find the next subject not
             * already used today.
             */
            for (
              let attempt = 0;
              attempt <
              classSubjects.length;
              attempt++
            ) {
              const candidate =
                classSubjects[
                  (subjectIndex +
                    attempt) %
                    classSubjects.length
                ];

              if (
                !subjectsUsedToday.has(
                  candidate.id
                )
              ) {
                chosen = candidate;

                subjectIndex =
                  (subjectIndex +
                    attempt +
                    1) %
                  classSubjects.length;

                break;
              }
            }

            /*
             * If the number of periods is
             * greater than subjects, allow
             * repetition.
             */
            if (!chosen) {
              chosen =
                classSubjects[
                  subjectIndex %
                    classSubjects.length
                ];

              subjectIndex =
                (subjectIndex + 1) %
                classSubjects.length;
            }
          } else {
            chosen =
              classSubjects[
                subjectIndex %
                  classSubjects.length
              ];

            subjectIndex =
              (subjectIndex + 1) %
              classSubjects.length;
          }

          if (!chosen) continue;

          subjectsUsedToday.add(
            chosen.id
          );

          generated.push({
            class_id:
              selectedClassId,
            subject_id: chosen.id,
            teacher_id: null,
            day,
            period,
            room: null,
            notes:
              'Generated timetable',
          });
        }
      }

      /*
       * Ask before replacing existing
       * timetable records.
       */
      const shouldReplace =
        entries.length > 0
          ? window.confirm(
              'This class already has timetable entries. Generate a new timetable and replace the existing entries?'
            )
          : true;

      if (!shouldReplace) {
        setGenerating(false);
        return;
      }

      /*
       * Delete existing entries for
       * selected class.
       */
      if (entries.length > 0) {
        const { error: deleteError } =
          await supabase
            .from('timetables')
            .delete()
            .eq(
              'class_id',
              selectedClassId
            );

        if (deleteError) {
          throw deleteError;
        }
      }

      /*
       * Insert generated records.
       */
      const { error: insertError } =
        await supabase
          .from('timetables')
          .insert(generated);

      if (insertError) {
        throw insertError;
      }

      toast.success(
        `Timetable generated for ${selectedClass?.name || 'class'}.`
      );

      setShowGenerateModal(false);

      await loadTimetable();
    } catch (error: any) {
      console.error(
        'Generate timetable error:',
        error
      );

      toast.error(
        error?.message ||
          'Unable to generate timetable.'
      );
    } finally {
      setGenerating(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * EXPORT CSV
   * ---------------------------------------------------------
   */

  const exportCsv = () => {
    if (!selectedClass) {
      toast.error(
        'Please select a class.'
      );
      return;
    }

    const rows: string[] = [];

    rows.push(
      [
        'Class',
        'Day',
        'Period',
        'Start',
        'End',
        'Subject',
        'Subject Code',
        'Teacher',
        'Room',
        'Notes',
      ]
        .map(escapeCsv)
        .join(',')
    );

    for (const day of DAYS) {
      for (const slot of LESSON_SLOTS) {
        const entry = getEntry(
          day,
          slot.period
        );

        rows.push(
          [
            selectedClass.name,
            day,
            `Period ${slot.period}`,
            slot.start,
            slot.end,
            entry?.subjectName || '',
            entry?.subjectCode || '',
            entry?.teacherName || '',
            entry?.room || '',
            entry?.notes || '',
          ]
            .map(escapeCsv)
            .join(',')
        );
      }
    }

    const blob = new Blob(
      [rows.join('\n')],
      {
        type: 'text/csv;charset=utf-8;',
      }
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement('a');

    anchor.href = url;

    anchor.download = `${(
      selectedClass.name || 'class'
    )
      .replace(
        /[^a-z0-9]+/gi,
        '-'
      )
      .toLowerCase()}-timetable.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);

    toast.success(
      'Timetable exported.'
    );
  };

  /*
   * ---------------------------------------------------------
   * PRINT
   * ---------------------------------------------------------
   */

  const printTimetable = () => {
    window.print();
  };

  /*
   * ---------------------------------------------------------
   * STATISTICS
   * ---------------------------------------------------------
   */

  const totalLessons =
    displayEntries.length;

  const totalSlots =
    DAYS.length * 8;

  const filledPercentage =
    totalSlots > 0
      ? Math.round(
          (totalLessons /
            totalSlots) *
            100
        )
      : 0;

  const uniqueSubjects =
    new Set(
      displayEntries.map(
        (entry) =>
          entry.subject_id
      )
    ).size;

  const uniqueTeachers =
    new Set(
      displayEntries
        .map(
          (entry) =>
            entry.teacher_id
        )
        .filter(Boolean)
    ).size;

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1600px] px-4 py-8">
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                <Loader2
                  className="animate-spin text-slate-500"
                  size={24}
                />
              </div>

              <p className="mt-4 text-sm font-medium text-slate-600">
                Loading timetable...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * PAGE
   * ---------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 print:max-w-none print:px-4 print:py-0">

        {/* ===================================================
            TOOLBAR
        =================================================== */}

        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays
                size={20}
                className="text-slate-600"
              />

              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Timetable
              </h1>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Manage the weekly academic timetable
              for every class.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                loadTimetable()
              }
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <Download size={15} />
              CSV
            </button>

            <button
              type="button"
              onClick={printTimetable}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <Printer size={15} />
              Print
            </button>

            <button
              type="button"
              onClick={() =>
                setShowGenerateModal(
                  true
                )
              }
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Grid3X3 size={15} />
              Generate
            </button>

            <button
              type="button"
              onClick={() =>
                openCreateEditor(
                  'Monday',
                  1
                )
              }
              className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-600"
            >
              <Plus size={15} />
              Add lesson
            </button>
          </div>
        </div>

        {/* ===================================================
            FILTER BAR
        =================================================== */}

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
          <div className="grid gap-4 lg:grid-cols-[minmax(250px,1fr)_minmax(260px,1fr)_auto]">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Class
              </label>

              <div className="relative">
                <Users
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  value={
                    selectedClassId
                  }
                  onChange={(event) =>
                    setSelectedClassId(
                      event.target.value
                    )
                  }
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="">
                    Select a class
                  </option>

                  {classes.map(
                    (schoolClass) => (
                      <option
                        key={
                          schoolClass.id
                        }
                        value={
                          schoolClass.id
                        }
                      >
                        {schoolClass.name}
                        {schoolClass.code
                          ? ` — ${schoolClass.code}`
                          : ''}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Find subject
              </label>

              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search subjects..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            <div className="flex items-end">
              <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Academic day
                </p>

                <p className="mt-0.5 text-sm font-semibold text-slate-700">
                  8 periods · 08:10–14:10
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================
            SUMMARY CARDS
        =================================================== */}

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4 print:hidden">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Scheduled lessons
              </span>

              <Clock3
                size={16}
                className="text-slate-400"
              />
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totalLessons}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              of {totalSlots} weekly slots
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Coverage
              </span>

              <Check
                size={16}
                className="text-slate-400"
              />
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {filledPercentage}%
            </p>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-700 transition-all"
                style={{
                  width: `${filledPercentage}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Subjects
              </span>

              <BookIcon />
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {uniqueSubjects}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              represented in timetable
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Teachers
              </span>

              <User
                size={16}
                className="text-slate-400"
              />
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {uniqueTeachers}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              assigned to lessons
            </p>
          </div>
        </div>

        {/* ===================================================
            PRINT TITLE
        =================================================== */}

        <div className="mb-5 hidden print:block">
          <div className="border-b border-slate-300 pb-4">
            <h1 className="text-2xl font-bold text-slate-900">
              Weekly Timetable
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              {selectedClass?.name ||
                'Class'}
              {selectedClass?.code
                ? ` (${selectedClass.code})`
                : ''}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Lessons begin at 08:10 AM ·
              Each lesson is 40 minutes
            </p>
          </div>
        </div>

        {/* ===================================================
            EMPTY CLASS STATE
        =================================================== */}

        {!selectedClassId ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <CalendarDays size={25} />
            </div>

            <h2 className="mt-5 text-base font-semibold text-slate-900">
              Select a class
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Choose a class above to view,
              create or manage its weekly
              timetable.
            </p>
          </div>
        ) : (
          <>
            {/* =================================================
                MAIN TIMETABLE
            ================================================= */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="sticky left-0 z-20 w-[155px] border-b border-r border-slate-200 bg-slate-50 p-3 text-left">
                        <div className="flex items-center gap-2">
                          <Clock3
                            size={15}
                            className="text-slate-400"
                          />

                          <div>
                            <p className="text-xs font-semibold text-slate-700">
                              Period
                            </p>

                            <p className="text-[10px] font-normal text-slate-400">
                              Time
                            </p>
                          </div>
                        </div>
                      </th>

                      {DAYS.map((day) => (
                        <th
                          key={day}
                          className="min-w-[215px] border-b border-r border-slate-200 p-3 text-left last:border-r-0"
                        >
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            {day}
                          </p>

                          <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                            {DAY_SHORT[day]}
                          </p>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {LESSON_SLOTS.map(
                      (slot) => (
                        <React.Fragment
                          key={
                            slot.period
                          }
                        >
                          <tr>
                            <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white p-3 align-top">
                              <div className="flex items-start gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                                  {
                                    slot.period
                                  }
                                </div>

                                <div>
                                  <p className="text-xs font-semibold text-slate-700">
                                    Period{' '}
                                    {
                                      slot.period
                                    }
                                  </p>

                                  <p className="mt-1 whitespace-nowrap text-[10px] text-slate-400">
                                    {
                                      slot.start
                                    }
                                  </p>

                                  <p className="text-[10px] text-slate-400">
                                    {
                                      slot.end
                                    }
                                  </p>
                                </div>
                              </div>
                            </td>

                            {DAYS.map(
                              (day) => {
                                const entry =
                                  getEntry(
                                    day,
                                    slot.period
                                  );

                                return (
                                  <td
                                    key={`${day}-${slot.period}`}
                                    className="border-b border-r border-slate-200 p-2 align-top last:border-r-0"
                                  >
                                    {entry ? (
                                      <TimetableCell
                                        entry={
                                          entry
                                        }
                                        onEdit={
                                          openEditEditor
                                        }
                                        onDelete={
                                          deleteEntry
                                        }
                                      />
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openCreateEditor(
                                            day,
                                            slot.period
                                          )
                                        }
                                        className="group flex min-h-[105px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center transition hover:border-slate-300 hover:bg-slate-50"
                                      >
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-300 shadow-sm transition group-hover:text-slate-600">
                                          <Plus
                                            size={
                                              17
                                            }
                                          />
                                        </span>

                                        <span className="mt-2 text-[11px] font-medium text-slate-400 group-hover:text-slate-600">
                                          Add lesson
                                        </span>
                                      </button>
                                    )}
                                  </td>
                                );
                              }
                            )}
                          </tr>

                          {slot.period ===
                            BREAK_AFTER_PERIOD_1 && (
                            <BreakRow label="First Break" />
                          )}

                          {slot.period ===
                            BREAK_AFTER_PERIOD_2 && (
                            <BreakRow label="Second Break" />
                          )}
                        </React.Fragment>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* =================================================
                SUBJECT DIRECTORY
            ================================================= */}

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Subjects available
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      All subjects available for{' '}
                      {selectedClass?.name}.
                    </p>
                  </div>

                  <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {classSubjects.length}{' '}
                    subjects
                  </span>
                </div>

                <div className="p-5">
                  {filteredSubjects.length ===
                  0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm font-medium text-slate-600">
                        No subjects found.
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Add subjects to the
                        school subject list first.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {filteredSubjects.map(
                        (
                          subject
                        ) => {
                          const count =
                            displayEntries.filter(
                              (entry) =>
                                entry.subject_id ===
                                subject.id
                            ).length;

                          return (
                            <div
                              key={
                                subject.id
                              }
                              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-700">
                                  {
                                    subject.name
                                  }
                                </p>

                                {subject.code && (
                                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                                    {
                                      subject.code
                                    }
                                  </p>
                                )}
                              </div>

                              <span className="ml-3 shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                                {count}x
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* =================================================
                  SCHOOL DAY INFORMATION
              ================================================= */}

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-900">
                    School day
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Standard timetable timing.
                  </p>
                </div>

                <div className="p-5">
                  <div className="space-y-4">
                    <InfoLine
                      icon={
                        <Clock3
                          size={15}
                        />
                      }
                      label="Start"
                      value="08:10 AM"
                    />

                    <InfoLine
                      icon={
                        <Clock3
                          size={15}
                        />
                      }
                      label="Lesson duration"
                      value="40 minutes"
                    />

                    <InfoLine
                      icon={
                        <Grid3X3
                          size={15}
                        />
                      }
                      label="Lessons"
                      value="8 periods"
                    />

                    <InfoLine
                      icon={
                        <CalendarDays
                          size={15}
                        />
                      }
                      label="Teaching days"
                      value="Monday – Friday"
                    />

                    <InfoLine
                      icon={
                        <Clock3
                          size={15}
                        />
                      }
                      label="First break"
                      value="After Period 3"
                    />

                    <InfoLine
                      icon={
                        <Clock3
                          size={15}
                        />
                      }
                      label="Second break"
                      value="After Period 5"
                    />
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>

      {/* =====================================================
          EDITOR MODAL
      ===================================================== */}

      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {editingEntry
                    ? 'Edit lesson'
                    : 'Add lesson'}
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedClass?.name ||
                    'Selected class'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowEditor(false);
                  resetEditor();
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* Day */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Day
                </label>

                <select
                  value={selectedDay}
                  onChange={(event) =>
                    setSelectedDay(
                      event.target
                        .value as DayKey
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  {DAYS.map(
                    (day) => (
                      <option
                        key={day}
                        value={day}
                      >
                        {day}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Period */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Period
                </label>

                <select
                  value={
                    selectedPeriod
                  }
                  onChange={(event) =>
                    setSelectedPeriod(
                      Number(
                        event.target
                          .value
                      )
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  {LESSON_SLOTS.map(
                    (slot) => (
                      <option
                        key={
                          slot.period
                        }
                        value={
                          slot.period
                        }
                      >
                        Period{' '}
                        {
                          slot.period
                        }{' '}
                        —{' '}
                        {
                          slot.start
                        }{' '}
                        to{' '}
                        {
                          slot.end
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Subject */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Subject
                </label>

                <select
                  value={
                    selectedSubjectId
                  }
                  onChange={(event) =>
                    setSelectedSubjectId(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="">
                    Select subject
                  </option>

                  {classSubjects.map(
                    (subject) => (
                      <option
                        key={
                          subject.id
                        }
                        value={
                          subject.id
                        }
                      >
                        {subject.name}
                        {subject.code
                          ? ` (${subject.code})`
                          : ''}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Teacher */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Teacher
                  <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">
                    optional
                  </span>
                </label>

                <select
                  value={
                    selectedTeacherId
                  }
                  onChange={(event) =>
                    setSelectedTeacherId(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="">
                    No teacher assigned
                  </option>

                  {teachers.map(
                    (teacher) => (
                      <option
                        key={
                          teacher.id
                        }
                        value={
                          teacher.id
                        }
                      >
                        {
                          teacher.name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Room */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Room
                  <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">
                    optional
                  </span>
                </label>

                <div className="relative">
                  <MapPin
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={room}
                    onChange={(event) =>
                      setRoom(
                        event.target
                          .value
                      )
                    }
                    placeholder="e.g. Room 12"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              {/* Notes */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Notes
                  <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">
                    optional
                  </span>
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target
                        .value
                    )
                  }
                  rows={3}
                  placeholder="Additional timetable information..."
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditor(false);
                  resetEditor();
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveEntry}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Check size={16} />
                )}

                {editingEntry
                  ? 'Save changes'
                  : 'Add lesson'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          GENERATE MODAL
      ===================================================== */}

      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Generate timetable
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Automatically distribute the available subjects across the week.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowGenerateModal(
                    false
                  )
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <Grid3X3
                    size={18}
                    className="mt-0.5 text-slate-500"
                  />

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {selectedClass?.name ||
                        'Selected class'}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {classSubjects.length}{' '}
                      subjects will be distributed across{' '}
                      {DAYS.length * 8}{' '}
                      lesson slots.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Distribution method
                </p>

                <div className="space-y-2">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
                    <input
                      type="radio"
                      name="generateMode"
                      checked={
                        generateMode ===
                        'balanced'
                      }
                      onChange={() =>
                        setGenerateMode(
                          'balanced'
                        )
                      }
                      className="mt-1"
                    />

                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Balanced
                      </p>

                      <p className="mt-0.5 text-xs leading-5 text-slate-500">
                        Avoid repeating the same subject on a day where possible.
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
                    <input
                      type="radio"
                      name="generateMode"
                      checked={
                        generateMode ===
                        'sequential'
                      }
                      onChange={() =>
                        setGenerateMode(
                          'sequential'
                        )
                      }
                      className="mt-1"
                    />

                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Sequential
                      </p>

                      <p className="mt-0.5 text-xs leading-5 text-slate-500">
                        Cycle continuously through the subject list.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-800">
                  Important
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  Generating a new timetable will replace the existing timetable for this class. Teacher assignments are left empty so the system does not invent staff assignments.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() =>
                  setShowGenerateModal(
                    false
                  )
                }
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={generating}
                onClick={
                  generateTimetable
                }
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Grid3X3
                    size={16}
                  />
                )}

                Generate timetable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          PRINT CSS
      ===================================================== */}

      <style>
        {`
          @media print {
            @page {
              size: landscape;
              margin: 8mm;
            }

            body {
              background: white !important;
            }

            .print\\\\:hidden {
              display: none !important;
            }

            table {
              page-break-inside: auto;
            }

            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }

            th,
            td {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}
      </style>
    </div>
  );
};

/*
 * ===========================================================
 * TIMETABLE CELL
 * ===========================================================
 */

const TimetableCell: React.FC<{
  entry: DisplayEntry;
  onEdit: (
    entry: DisplayEntry
  ) => void;
  onDelete: (
    entry: DisplayEntry
  ) => void;
}> = ({
  entry,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="group relative min-h-[105px] rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-800">
            {entry.subjectName}
          </p>

          {entry.subjectCode && (
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              {entry.subjectCode}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 print:hidden">
          <button
            type="button"
            onClick={() =>
              onEdit(entry)
            }
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            title="Edit"
          >
            <Edit3 size={13} />
          </button>

          <button
            type="button"
            onClick={() =>
              onDelete(entry)
            }
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {entry.teacherName && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
          <User
            size={12}
            className="shrink-0 text-slate-400"
          />

          <span className="truncate">
            {entry.teacherName}
          </span>
        </div>
      )}

      {entry.room && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
          <MapPin
            size={12}
            className="shrink-0 text-slate-400"
          />

          <span className="truncate">
            {entry.room}
          </span>
        </div>
      )}

      {!entry.teacherName &&
        !entry.room && (
          <p className="mt-3 text-[10px] text-slate-400">
            Teacher not assigned
          </p>
        )}

      {entry.notes && (
        <p className="mt-2 line-clamp-1 text-[9px] italic text-slate-400">
          {entry.notes}
        </p>
      )}
    </div>
  );
};

/*
 * ===========================================================
 * BREAK ROW
 * ===========================================================
 */

const BreakRow: React.FC<{
  label: string;
}> = ({ label }) => {
  return (
    <tr>
      <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <Clock3
            size={13}
            className="text-slate-400"
          />

          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </span>
        </div>
      </td>

      {DAYS.map((day) => (
        <td
          key={day}
          className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 last:border-r-0"
        >
          <div className="flex items-center justify-center">
            <span className="text-[10px] font-medium text-slate-400">
              Break
            </span>
          </div>
        </td>
      ))}
    </tr>
  );
};

/*
 * ===========================================================
 * INFO LINE
 * ===========================================================
 */

const InfoLine: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          {icon}
        </span>

        <span className="text-xs font-medium text-slate-500">
          {label}
        </span>
      </div>

      <span className="text-right text-xs font-semibold text-slate-700">
        {value}
      </span>
    </div>
  );
};

/*
 * Small neutral book icon without adding
 * another dependency.
 */
const BookIcon: React.FC = () => {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </svg>
    </span>
  );
};

export default TimetablePage;
