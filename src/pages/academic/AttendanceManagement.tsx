
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Loader2,
  Lock,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Unlock,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';

type Status =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused'
  | 'half_day';

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  admission_number?: string | null;
  passport_url?: string | null;
  class_id?: string | null;
};

type ClassRow = {
  id: string;
  name: string;
  code?: string | null;
  class_teacher_id?: string | null;
  assistant_teacher_id?: string | null;
};

type Session = {
  id: string;
  class_id: string;
  attendance_date: string;
  status: 'open' | 'submitted' | 'locked';
  submitted_at?: string | null;
};

type AttendanceRecord = {
  student: Student;
  status: Status;
  check_in_at: string | null;
  remarks: string;
  record_id?: string;
};

type Counts = {
  present: number;
  absent: number;
  late: number;
  excused: number;
  half_day: number;
  total: number;
};

type HistoryItem = {
  date: string;
  status: Status;
};

const MANAGER_ROLES = [
  'admin',
  'branch_admin',
  'director',
  'principal',
  'super_admin',
  'record_keeper',
  'finance',
];

const STATUSES: Status[] = [
  'present',
  'late',
  'absent',
  'excused',
  'half_day',
];

const STATUS_META: Record<
  Status,
  {
    label: string;
    short: string;
    classes: string;
  }
> = {
  present: {
    label: 'Present',
    short: 'P',
    classes:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  late: {
    label: 'Late',
    short: 'L',
    classes:
      'border-amber-200 bg-amber-50 text-amber-700',
  },
  absent: {
    label: 'Absent',
    short: 'A',
    classes:
      'border-rose-200 bg-rose-50 text-rose-700',
  },
  excused: {
    label: 'Excused',
    short: 'E',
    classes:
      'border-sky-200 bg-sky-50 text-sky-700',
  },
  half_day: {
    label: 'Half day',
    short: 'H',
    classes:
      'border-violet-200 bg-violet-50 text-violet-700',
  },
};

const getToday = () =>
  new Date().toISOString().slice(0, 10);

const emptyCounts = (): Counts => ({
  present: 0,
  absent: 0,
  late: 0,
  excused: 0,
  half_day: 0,
  total: 0,
});

const attendanceRate = (counts: Counts) => {
  if (!counts.total) return 0;

  return Math.round(
    ((counts.present + counts.late) / counts.total) * 100,
  );
};

const studentName = (student: Student) =>
  [
    student.last_name,
    student.first_name,
    student.middle_name,
  ]
    .filter(Boolean)
    .join(' ');

const initials = (student: Student) =>
  `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`
    .toUpperCase();

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));

const formatTime = (value?: string | null) => {
  if (!value) return '—';

  try {
    return new Intl.DateTimeFormat('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '—';
  }
};

export default function AttendanceManagement() {
  const { user } = useAuth();

  const role = String(user?.role || '').toLowerCase();
  const branchId = user?.branch_id || '';

  const isManager = MANAGER_ROLES.includes(role);
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';

  const canManage = isManager || isTeacher;

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(getToday());

  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<
    Record<string, AttendanceRecord>
  >({});

  const [session, setSession] = useState<Session | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | Status>('all');

  const [sidebarStats, setSidebarStats] = useState<
    Record<string, Counts>
  >({});

  const [studentHistory, setStudentHistory] = useState<
    HistoryItem[]
  >([]);

  const [currentStudent, setCurrentStudent] =
    useState<Student | null>(null);

  const [parentChildren, setParentChildren] = useState<Student[]>(
    [],
  );

  const [selectedChildId, setSelectedChildId] = useState('');

  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);

  const [mobileAnalyticsOpen, setMobileAnalyticsOpen] =
    useState(false);

  /*
   * ============================================================
   * LOAD CLASSES
   * ============================================================
   */

  const loadClasses = useCallback(async () => {
    if (!branchId || !canManage) return;

    setLoading(true);

    try {
      let teacherId = '';

      if (isTeacher && user?.id) {
        const { data, error } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        teacherId = data?.id || '';
      }

      let query = supabase
        .from('classes')
        .select(
          'id,name,code,class_teacher_id,assistant_teacher_id',
        )
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('name');

      if (isTeacher) {
        if (!teacherId) {
          setClasses([]);
          setSelectedClassId('');
          return;
        }

        query = query.or(
          `class_teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId}`,
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      const list = (data || []) as ClassRow[];

      setClasses(list);

      setSelectedClassId((current) => {
        if (current && list.some((item) => item.id === current)) {
          return current;
        }

        return list[0]?.id || '';
      });
    } catch (error: any) {
      console.error('loadClasses:', error);
      toast.error(
        error?.message || 'Unable to load attendance classes',
      );
    } finally {
      setLoading(false);
    }
  }, [
    branchId,
    canManage,
    isTeacher,
    user?.id,
  ]);

  /*
   * ============================================================
   * LOAD PARENT CHILDREN
   * ============================================================
   */

  const loadParentChildren = useCallback(async () => {
    if (!isParent || !user?.id || !branchId) return;

    try {
      const { data: parent, error: parentError } =
        await supabase
          .from('parents')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

      if (parentError) throw parentError;

      if (!parent?.id) {
        setParentChildren([]);
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .select(
          'id,first_name,last_name,middle_name,admission_number,passport_url,class_id',
        )
        .eq('parent_id', parent.id)
        .eq('branch_id', branchId)
        .order('last_name')
        .order('first_name');

      if (error) throw error;

      const children = (data || []) as Student[];

      setParentChildren(children);

      setSelectedChildId((current) => {
        if (
          current &&
          children.some((child) => child.id === current)
        ) {
          return current;
        }

        return children[0]?.id || '';
      });
    } catch (error: any) {
      console.error('loadParentChildren:', error);
      toast.error(
        error?.message || 'Unable to load your children',
      );
    }
  }, [
    branchId,
    isParent,
    user?.id,
  ]);

  /*
   * ============================================================
   * LOAD CLASS REGISTER
   * ============================================================
   */

  const loadRegister = useCallback(async () => {
    if (!branchId || !selectedClassId || !canManage) {
      return;
    }

    setLoading(true);

    try {
      const { data: studentData, error: studentError } =
        await supabase
          .from('students')
          .select(
            'id,first_name,last_name,middle_name,admission_number,passport_url,class_id',
          )
          .eq('branch_id', branchId)
          .eq('class_id', selectedClassId)
          .eq('current_status', 'active')
          .order('last_name')
          .order('first_name');

      if (studentError) throw studentError;

      const studentList = (studentData || []) as Student[];

      setStudents(studentList);

      const { data: sessionData, error: sessionError } =
        await supabase
          .from('attendance_sessions')
          .select(
            'id,class_id,attendance_date,status,submitted_at',
          )
          .eq('branch_id', branchId)
          .eq('class_id', selectedClassId)
          .eq('attendance_date', selectedDate)
          .eq('session_type', 'daily')
          .limit(1)
          .maybeSingle();

      if (
        sessionError &&
        sessionError.code !== 'PGRST116'
      ) {
        throw sessionError;
      }

      const currentSession =
        (sessionData || null) as Session | null;

      setSession(currentSession);

      const nextRecords: Record<
        string,
        AttendanceRecord
      > = {};

      studentList.forEach((student) => {
        nextRecords[student.id] = {
          student,
          status: 'present',
          check_in_at: null,
          remarks: '',
        };
      });

      if (currentSession?.id) {
        const {
          data: recordData,
          error: recordError,
        } = await supabase
          .from('attendance_records')
          .select(
            'id,student_id,status,check_in_at,remarks',
          )
          .eq('session_id', currentSession.id);

        if (recordError) throw recordError;

        (recordData || []).forEach((record: any) => {
          if (!nextRecords[record.student_id]) return;

          nextRecords[record.student_id] = {
            ...nextRecords[record.student_id],
            record_id: record.id,
            status: record.status as Status,
            check_in_at: record.check_in_at,
            remarks: record.remarks || '',
          };
        });
      }

      setRecords(nextRecords);
    } catch (error: any) {
      console.error('loadRegister:', error);

      toast.error(
        error?.message ||
          'Unable to load attendance register',
      );

      setStudents([]);
      setRecords({});
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [
    branchId,
    canManage,
    selectedClassId,
    selectedDate,
  ]);

  /*
   * ============================================================
   * LOAD CLASS SIDEBAR ANALYTICS
   * ============================================================
   */

  const loadSidebarStats = useCallback(async () => {
    if (
      !branchId ||
      !canManage ||
      classes.length === 0
    ) {
      return;
    }

    try {
      const classIds = classes.map((item) => item.id);

      const { data: sessions, error: sessionError } =
        await supabase
          .from('attendance_sessions')
          .select('id,class_id')
          .eq('branch_id', branchId)
          .eq('attendance_date', selectedDate)
          .eq('session_type', 'daily')
          .in('class_id', classIds);

      if (sessionError) throw sessionError;

      if (!sessions?.length) {
        setSidebarStats({});
        return;
      }

      const sessionIds = sessions.map(
        (item) => item.id,
      );

      const {
        data: attendanceRows,
        error: recordError,
      } = await supabase
        .from('attendance_records')
        .select('session_id,status')
        .in('session_id', sessionIds);

      if (recordError) throw recordError;

      const sessionClassMap = new Map<string, string>();

      sessions.forEach((item) => {
        sessionClassMap.set(
          item.id,
          item.class_id,
        );
      });

      const result: Record<string, Counts> = {};

      (attendanceRows || []).forEach((row: any) => {
        const classId = sessionClassMap.get(
          row.session_id,
        );

        if (!classId) return;

        if (!result[classId]) {
          result[classId] = emptyCounts();
        }

        result[classId].total++;

        if (STATUSES.includes(row.status)) {
          result[classId][row.status]++;
        }
      });

      setSidebarStats(result);
    } catch (error) {
      console.warn(
        'Attendance sidebar analytics:',
        error,
      );
    }
  }, [
    branchId,
    canManage,
    classes,
    selectedDate,
  ]);

  /*
   * ============================================================
   * LOAD STUDENT/PARENT ATTENDANCE HISTORY
   * ============================================================
   */

  const loadStudentHistory = useCallback(
    async (studentId: string) => {
      if (!branchId || !studentId) return;

      setLoading(true);

      try {
        const { data: student, error: studentError } =
          await supabase
            .from('students')
            .select(
              'id,first_name,last_name,middle_name,admission_number,passport_url,class_id',
            )
            .eq('id', studentId)
            .eq('branch_id', branchId)
            .maybeSingle();

        if (studentError) throw studentError;

        if (!student) {
          setCurrentStudent(null);
          setStudentHistory([]);
          return;
        }

        setCurrentStudent(student as Student);

        const fromDate = new Date();

        fromDate.setDate(
          fromDate.getDate() - 89,
        );

        const from = fromDate
          .toISOString()
          .slice(0, 10);

        const { data: sessions, error: sessionsError } =
          await supabase
            .from('attendance_sessions')
            .select('id,attendance_date')
            .eq('branch_id', branchId)
            .eq('class_id', student.class_id)
            .eq('session_type', 'daily')
            .gte('attendance_date', from)
            .lte(
              'attendance_date',
              selectedDate,
            )
            .order('attendance_date', {
              ascending: false,
            });

        if (sessionsError) throw sessionsError;

        const sessionIds = (sessions || []).map(
          (item) => item.id,
        );

        if (!sessionIds.length) {
          setStudentHistory([]);
          return;
        }

        const {
          data: attendanceRows,
          error: attendanceError,
        } = await supabase
          .from('attendance_records')
          .select('session_id,status')
          .eq('student_id', studentId)
          .in('session_id', sessionIds);

        if (attendanceError) throw attendanceError;

        const dates = new Map<string, string>();

        (sessions || []).forEach((item) => {
          dates.set(
            item.id,
            item.attendance_date,
          );
        });

        const history = (attendanceRows || [])
          .map((row: any) => ({
            date:
              dates.get(row.session_id) || '',
            status: row.status as Status,
          }))
          .filter(
            (item) => item.date,
          );

        setStudentHistory(history);
      } catch (error: any) {
        console.error(
          'loadStudentHistory:',
          error,
        );

        toast.error(
          error?.message ||
            'Unable to load attendance history',
        );
      } finally {
        setLoading(false);
      }
    },
    [
      branchId,
      selectedDate,
    ],
  );

  /*
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */

  useEffect(() => {
    void loadClasses();
    void loadParentChildren();
  }, [
    loadClasses,
    loadParentChildren,
  ]);

  useEffect(() => {
    void loadRegister();
  }, [loadRegister]);

  useEffect(() => {
    void loadSidebarStats();
  }, [loadSidebarStats]);

  /*
   * ============================================================
   * STUDENT LOGIN VIEW
   * ============================================================
   */

  useEffect(() => {
    if (
      !isStudent ||
      !user?.id ||
      !branchId
    ) {
      return;
    }

    void (async () => {
      const { data, error } =
        await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .eq('branch_id', branchId)
          .maybeSingle();

      if (error) {
        console.error(
          'Student lookup:',
          error,
        );
        return;
      }

      if (data?.id) {
        await loadStudentHistory(
          data.id,
        );
      }
    })();
  }, [
    branchId,
    isStudent,
    loadStudentHistory,
    user?.id,
  ]);

  /*
   * ============================================================
   * PARENT VIEW
   * ============================================================
   */

  useEffect(() => {
    if (
      isParent &&
      selectedChildId
    ) {
      void loadStudentHistory(
        selectedChildId,
      );
    }
  }, [
    isParent,
    selectedChildId,
    loadStudentHistory,
  ]);

  /*
   * ============================================================
   * REGISTER COUNTS
   * ============================================================
   */

  const counts = useMemo(() => {
    const result = emptyCounts();

    Object.values(records).forEach(
      (record) => {
        result.total++;
        result[record.status]++;
      },
    );

    return result;
  }, [records]);

  const visibleRecords = useMemo(() => {
    const query = search
      .toLowerCase()
      .trim();

    return Object.values(records).filter(
      (record) => {
        const searchable =
          `${studentName(
            record.student,
          )} ${
            record.student.admission_number || ''
          }`.toLowerCase();

        const matchesSearch =
          !query ||
          searchable.includes(query);

        const matchesFilter =
          filter === 'all' ||
          record.status === filter;

        return (
          matchesSearch &&
          matchesFilter
        );
      },
    );
  }, [
    filter,
    records,
    search,
  ]);

  /*
   * ============================================================
   * UPDATE STATUS
   * ============================================================
   */

  const setStudentStatus = (
    studentId: string,
    status: Status,
  ) => {
    setRecords((previous) => {
      const existing =
        previous[studentId];

      if (!existing) return previous;

      return {
        ...previous,
        [studentId]: {
          ...existing,
          status,
          check_in_at:
            status === 'late'
              ? existing.check_in_at ||
                new Date().toISOString()
              : existing.check_in_at,
        },
      };
    });
  };

  /*
   * ============================================================
   * UPDATE REMARK
   * ============================================================
   */

  const setRemark = (
    studentId: string,
    remarks: string,
  ) => {
    setRecords((previous) => {
      const existing =
        previous[studentId];

      if (!existing) return previous;

      return {
        ...previous,
        [studentId]: {
          ...existing,
          remarks,
        },
      };
    });
  };

  /*
   * ============================================================
   * MARK ALL
   * ============================================================
   */

  const markAll = (
    status: Status,
  ) => {
    setRecords((previous) =>
      Object.fromEntries(
        Object.entries(previous).map(
          ([studentId, record]) => [
            studentId,
            {
              ...record,
              status,
            },
          ],
        ),
      ),
    );
  };

  /*
   * ============================================================
   * SAVE ATTENDANCE
   *
   * IMPORTANT:
   * This uses the secure Supabase RPC.
   * It does NOT directly insert into attendance_sessions.
   * ============================================================
   */

  const saveAttendance = async () => {
    if (
      !branchId ||
      !selectedClassId ||
      !user?.id ||
      students.length === 0
    ) {
      toast.error(
        'Select a class containing students first.',
      );
      return;
    }

    if (!canManage) {
      toast.error(
        'You do not have permission to manage attendance.',
      );
      return;
    }

    if (
      session?.status === 'locked' &&
      !isManager
    ) {
      toast.error(
        'This attendance register is locked.',
      );
      return;
    }

    setSaving(true);

    try {
      const payload = students.map(
        (student) => {
          const record =
            records[student.id];

          return {
            student_id: student.id,
            status:
              record?.status ||
              'present',
            check_in_at:
              record?.check_in_at ||
              null,
            remarks:
              record?.remarks ||
              null,
          };
        },
      );

      let teacherId: string | null =
        null;

      if (isTeacher) {
        const {
          data,
          error,
        } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        teacherId =
          data?.id || null;
      }

      const {
        data,
        error,
      } = await supabase.rpc(
        'attendance_save_register',
        {
          p_branch_id:
            branchId,
          p_class_id:
            selectedClassId,
          p_attendance_date:
            selectedDate,
          p_records:
            payload,
          p_teacher_id:
            teacherId,
        },
      );

      if (error) {
        console.error(
          'attendance_save_register error:',
          error,
        );

        throw new Error(
          error.message ||
            'Unable to save attendance',
        );
      }

      const saved =
        Number(
          data?.saved ??
            students.length,
        );

      toast.success(
        `Attendance saved for ${saved} student${
          saved === 1 ? '' : 's'
        }.`,
      );

      await loadRegister();
      await loadSidebarStats();
    } catch (error: any) {
      console.error(
        'Full attendance save error:',
        error,
      );

      toast.error(
        error?.message ||
          'Unable to save attendance',
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ============================================================
   * LOCK / REOPEN
   * ============================================================
   */

  const toggleLock = async () => {
    if (
      !isManager ||
      !session?.id
    ) {
      return;
    }

    const nextStatus =
      session.status === 'locked'
        ? 'submitted'
        : 'locked';

    try {
      const {
        data,
        error,
      } = await supabase
        .from('attendance_sessions')
        .update({
          status: nextStatus,
        })
        .eq('id', session.id)
        .select(
          'id,class_id,attendance_date,status,submitted_at',
        )
        .single();

      if (error) throw error;

      setSession(
        data as Session,
      );

      toast.success(
        nextStatus === 'locked'
          ? 'Attendance locked successfully.'
          : 'Attendance reopened successfully.',
      );
    } catch (error: any) {
      console.error(
        'toggleLock:',
        error,
      );

      toast.error(
        error?.message ||
          'Unable to change attendance lock',
      );
    }
  };

  /*
   * ============================================================
   * CSV EXPORT
   * ============================================================
   */

  const exportCsv = () => {
    if (!visibleRecords.length) {
      toast.error(
        'There is no attendance data to export.',
      );
      return;
    }

    const rows = [
      [
        'Student',
        'Admission Number',
        'Status',
        'Check In',
        'Remarks',
      ],
      ...visibleRecords.map(
        (record) => [
          studentName(
            record.student,
          ),
          record.student
            .admission_number || '',
          STATUS_META[
            record.status
          ].label,
          record.check_in_at
            ? formatTime(
                record.check_in_at,
              )
            : '',
          record.remarks || '',
        ],
      ),
    ];

    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(
                value,
              ).replace(
                /"/g,
                '""',
              )}"`,
          )
          .join(','),
      )
      .join('\n');

    const blob =
      new Blob(
        [csv],
        {
          type: 'text/csv;charset=utf-8;',
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        'a',
      );

    link.href = url;
    link.download = `attendance-${selectedDate}.csv`;

    document.body.appendChild(
      link,
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(
      url,
    );
  };

  /*
   * ============================================================
   * PRINT
   * ============================================================
   */

  const printAttendance = () => {
    window.print();
  };

  /*
   * ============================================================
   * SELECTED CLASS
   * ============================================================
   */

  const selectedClass = classes.find(
    (item) =>
      item.id === selectedClassId,
  );

  /*
   * ============================================================
   * STUDENT HISTORY STATS
   * ============================================================
   */

  const historyCounts = useMemo(() => {
    const result =
      emptyCounts();

    studentHistory.forEach(
      (item) => {
        result.total++;

        if (
          STATUSES.includes(
            item.status,
          )
        ) {
          result[item.status]++;
        }
      },
    );

    return result;
  }, [studentHistory]);

  const historyRate =
    attendanceRate(
      historyCounts,
    );

  /*
   * ============================================================
   * LOADING STATE
   * ============================================================
   */

  if (
    loading &&
    !students.length &&
    !currentStudent
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-600">
            Loading attendance...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * STUDENT / PARENT ATTENDANCE PASSPORT
   * ============================================================
   */

  if (
    isStudent ||
    isParent
  ) {
    const displayStudent =
      currentStudent;

    return (
      <div className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-600">
                  <ShieldCheck className="h-4 w-4" />
                  Attendance Passport
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Attendance History
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  View attendance records,
                  punctuality and history.
                </p>
              </div>

              {isParent &&
                parentChildren.length >
                  0 && (
                  <div className="w-full lg:w-72">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Select child
                    </label>

                    <select
                      value={
                        selectedChildId
                      }
                      onChange={(event) =>
                        setSelectedChildId(
                          event.target
                            .value,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      {parentChildren.map(
                        (child) => (
                          <option
                            key={
                              child.id
                            }
                            value={
                              child.id
                            }
                          >
                            {studentName(
                              child,
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                )}
            </div>
          </div>

          {!displayStudent ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <UserX className="mx-auto h-10 w-10 text-slate-400" />

              <h2 className="mt-4 text-lg font-bold text-slate-800">
                No attendance profile found
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your attendance information is
                not available yet.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">
                      Attendance rate
                    </span>

                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                  </div>

                  <div className="mt-3 text-3xl font-bold text-slate-900">
                    {historyRate}%
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Based on recorded sessions
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">
                      Present
                    </span>

                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>

                  <div className="mt-3 text-3xl font-bold text-slate-900">
                    {historyCounts.present}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">
                      Late
                    </span>

                    <Clock3 className="h-5 w-5 text-amber-600" />
                  </div>

                  <div className="mt-3 text-3xl font-bold text-slate-900">
                    {historyCounts.late}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">
                      Absent
                    </span>

                    <UserX className="h-5 w-5 text-rose-600" />
                  </div>

                  <div className="mt-3 text-3xl font-bold text-slate-900">
                    {historyCounts.absent}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-indigo-50 text-lg font-bold text-indigo-700">
                      {displayStudent.passport_url ? (
                        <img
                          src={
                            displayStudent.passport_url
                          }
                          alt={studentName(
                            displayStudent,
                          )}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials(
                          displayStudent,
                        )
                      )}
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {studentName(
                          displayStudent,
                        )}
                      </h2>

                      <p className="text-sm text-slate-500">
                        {displayStudent.admission_number ||
                          'No admission number'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      loadStudentHistory(
                        displayStudent.id,
                      )
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                  <h2 className="font-bold text-slate-900">
                    Recent attendance
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Last 90 days of recorded attendance.
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {studentHistory.length ===
                  0 ? (
                    <div className="p-10 text-center text-sm text-slate-500">
                      No attendance records found.
                    </div>
                  ) : (
                    studentHistory.map(
                      (item, index) => (
                        <div
                          key={`${item.date}-${index}`}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                              <CalendarDays className="h-5 w-5 text-slate-500" />
                            </div>

                            <div>
                              <p className="font-semibold text-slate-800">
                                {formatDate(
                                  item.date,
                                )}
                              </p>

                              <p className="text-xs text-slate-500">
                                Attendance record
                              </p>
                            </div>
                          </div>

                          <span
                            className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold ${STATUS_META[item.status].classes}`}
                          >
                            {
                              STATUS_META[
                                item.status
                              ].label
                            }
                          </span>
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * ACCESS DENIED
   * ============================================================
   */

  if (!canManage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 p-5">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-12 w-12 text-slate-400" />

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Attendance access unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your account does not currently have permission
            to manage attendance.
          </p>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * MAIN ATTENDANCE MANAGEMENT UI
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1800px] p-3 sm:p-5 lg:p-6">
        {/* HEADER */}

        <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-600">
                <ShieldCheck className="h-4 w-4" />
                Attendance Management
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Attendance Command Centre
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Manage daily attendance, monitor class performance,
                record punctuality and maintain a complete attendance
                history.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setMobileSidebarOpen(
                    (value) => !value,
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 lg:hidden"
              >
                <Users className="h-4 w-4" />
                Classes
              </button>

              <button
                type="button"
                onClick={() =>
                  setMobileAnalyticsOpen(
                    (value) => !value,
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 xl:hidden"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </button>

              <button
                type="button"
                onClick={() => {
                  void loadRegister();
                  void loadSidebarStats();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <button
                type="button"
                onClick={printAttendance}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>

              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* CONTROLS */}

        <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search student or admission number..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(event) =>
                setSelectedDate(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />

            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target
                    .value as
                    | 'all'
                    | Status,
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">
                All statuses
              </option>

              {STATUSES.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {
                      STATUS_META[
                        status
                      ].label
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() =>
                markAll('present')
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 sm:flex-none"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark all present
            </button>

            <button
              type="button"
              onClick={() =>
                markAll('absent')
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 sm:flex-none"
            >
              <UserX className="h-4 w-4" />
              Mark all absent
            </button>

            <div className="flex-1 sm:flex-none" />

            {isManager &&
              session && (
                <button
                  type="button"
                  onClick={
                    toggleLock
                  }
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none"
                >
                  {session.status ===
                  'locked' ? (
                    <>
                      <Unlock className="h-4 w-4" />
                      Reopen
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Lock
                    </>
                  )}
                </button>
              )}

            <button
              type="button"
              disabled={
                saving ||
                students.length ===
                  0
              }
              onClick={saveAttendance}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Save & Submit
                </>
              )}
            </button>
          </div>
        </div>

        {/* MAIN THREE COLUMN LAYOUT */}

        <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_320px]">
          {/* LEFT CLASS SIDEBAR */}

          <aside
            className={`min-w-0 ${
              mobileSidebarOpen
                ? 'block'
                : 'hidden lg:block'
            }`}
          >
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Classes
                    </p>

                    <h2 className="mt-1 font-bold text-slate-900">
                      Daily register
                    </h2>
                  </div>

                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                    {classes.length}
                  </span>
                </div>
              </div>

              <div className="max-h-[calc(100vh-280px)] overflow-y-auto p-2">
                {classes.length ===
                0 ? (
                  <div className="p-5 text-center">
                    <Users className="mx-auto h-8 w-8 text-slate-300" />

                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      No classes available
                    </p>

                    {isTeacher && (
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        You must be assigned as
                        a class teacher or
                        assistant teacher.
                      </p>
                    )}
                  </div>
                ) : (
                  classes.map(
                    (classItem) => {
                      const stats =
                        sidebarStats[
                          classItem.id
                        ] ||
                        emptyCounts();

                      const selected =
                        selectedClassId ===
                        classItem.id;

                      return (
                        <button
                          key={
                            classItem.id
                          }
                          type="button"
                          onClick={() => {
                            setSelectedClassId(
                              classItem.id,
                            );
                            setMobileSidebarOpen(
                              false,
                            );
                          }}
                          className={`mb-1 w-full rounded-2xl p-3 text-left transition ${
                            selected
                              ? 'bg-indigo-50 ring-1 ring-indigo-200'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p
                                className={`truncate text-sm font-bold ${
                                  selected
                                    ? 'text-indigo-700'
                                    : 'text-slate-800'
                                }`}
                              >
                                {
                                  classItem.name
                                }
                              </p>

                              {classItem.code && (
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {
                                    classItem.code
                                  }
                                </p>
                              )}
                            </div>

                            <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-500 shadow-sm">
                              {stats.total}
                            </span>
                          </div>

                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{
                                width: `${attendanceRate(
                                  stats,
                                )}%`,
                              }}
                            />
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-500">
                              {attendanceRate(
                                stats,
                              )}
                              % attendance
                            </span>

                            {stats.absent >
                              0 && (
                              <span className="font-bold text-rose-600">
                                {stats.absent}{' '}
                                absent
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    },
                  )
                )}
              </div>
            </div>
          </aside>

          {/* MAIN REGISTER */}

          <main className="min-w-0">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {/* REGISTER HEADER */}

              <div className="border-b border-slate-100 p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900">
                        {selectedClass?.name ||
                          'Select a class'}
                      </h2>

                      {session && (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${
                            session.status ===
                            'locked'
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : session.status ===
                                'submitted'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          {
                            session.status
                          }
                        </span>
                      )}
                    </div>

                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <CalendarDays className="h-4 w-4" />
                      {formatDate(
                        selectedDate,
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-2xl bg-emerald-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                        Present
                      </p>

                      <p className="mt-0.5 text-lg font-bold text-emerald-700">
                        {counts.present}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-amber-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">
                        Late
                      </p>

                      <p className="mt-0.5 text-lg font-bold text-amber-700">
                        {counts.late}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-rose-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-rose-600">
                        Absent
                      </p>

                      <p className="mt-0.5 text-lg font-bold text-rose-700">
                        {counts.absent}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-indigo-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                        Rate
                      </p>

                      <p className="mt-0.5 text-lg font-bold text-indigo-700">
                        {attendanceRate(
                          counts,
                        )}
                        %
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* REGISTER */}

              {students.length ===
              0 ? (
                <div className="p-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-slate-300" />

                  <h3 className="mt-4 font-bold text-slate-800">
                    No active students
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    This class does not currently
                    have active students.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Student
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Status
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Check-in
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Remarks
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {visibleRecords.map(
                        (record) => {
                          const locked =
                            session?.status ===
                              'locked' &&
                            !isManager;

                          return (
                            <tr
                              key={
                                record.student.id
                              }
                              className="hover:bg-slate-50/70"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700">
                                    {record.student
                                      .passport_url ? (
                                      <img
                                        src={
                                          record
                                            .student
                                            .passport_url
                                        }
                                        alt={studentName(
                                          record.student,
                                        )}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      initials(
                                        record.student,
                                      )
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-800">
                                      {studentName(
                                        record.student,
                                      )}
                                    </p>

                                    <p className="mt-0.5 text-xs text-slate-400">
                                      {record.student
                                        .admission_number ||
                                        'No admission number'}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-3 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {STATUSES.map(
                                    (
                                      status,
                                    ) => (
                                      <button
                                        key={
                                          status
                                        }
                                        type="button"
                                        disabled={
                                          locked
                                        }
                                        onClick={() =>
                                          setStudentStatus(
                                            record
                                              .student
                                              .id,
                                            status,
                                          )
                                        }
                                        title={
                                          STATUS_META[
                                            status
                                          ].label
                                        }
                                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                                          record.status ===
                                          status
                                            ? STATUS_META[
                                                status
                                              ].classes
                                            : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                                        } disabled:cursor-not-allowed disabled:opacity-60`}
                                      >
                                        <span className="sm:hidden">
                                          {
                                            STATUS_META[
                                              status
                                            ].short
                                          }
                                        </span>

                                        <span className="hidden sm:inline">
                                          {
                                            STATUS_META[
                                              status
                                            ].label
                                          }
                                        </span>
                                      </button>
                                    ),
                                  )}
                                </div>
                              </td>

                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Clock3 className="h-4 w-4 text-slate-400" />

                                  {formatTime(
                                    record.check_in_at,
                                  )}
                                </div>
                              </td>

                              <td className="px-3 py-3">
                                <input
                                  type="text"
                                  value={
                                    record.remarks
                                  }
                                  disabled={
                                    locked
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    setRemark(
                                      record
                                        .student
                                        .id,
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  placeholder="Optional remark..."
                                  className="w-full min-w-[160px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                                />
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>

                  {visibleRecords.length ===
                    0 && (
                    <div className="p-10 text-center">
                      <Search className="mx-auto h-8 w-8 text-slate-300" />

                      <p className="mt-3 text-sm font-semibold text-slate-600">
                        No students match your search.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* FOOTER */}

              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-500">
                  Showing{' '}
                  <span className="font-bold text-slate-700">
                    {visibleRecords.length}
                  </span>{' '}
                  of{' '}
                  <span className="font-bold text-slate-700">
                    {students.length}
                  </span>{' '}
                  students
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  {session?.status ===
                    'locked' && (
                    <>
                      <Lock className="h-4 w-4 text-rose-500" />
                      Register locked
                    </>
                  )}

                  {session?.submitted_at &&
                    session.status !==
                      'locked' && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Submitted{' '}
                        {formatTime(
                          session.submitted_at,
                        )}
                      </>
                    )}
                </div>
              </div>
            </div>
          </main>

          {/* RIGHT ANALYTICS */}

          <aside
            className={`min-w-0 ${
              mobileAnalyticsOpen
                ? 'block'
                : 'hidden xl:block'
            }`}
          >
            <div className="space-y-5">
              {/* RATE CARD */}

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Class attendance
                    </p>

                    <h2 className="mt-1 font-bold text-slate-900">
                      Daily performance
                    </h2>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50">
                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>

                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold tracking-tight text-slate-900">
                      {attendanceRate(
                        counts,
                      )}
                      %
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      attendance rate
                    </p>
                  </div>

                  <p className="text-sm font-bold text-slate-500">
                    {counts.total} students
                  </p>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all"
                    style={{
                      width: `${attendanceRate(
                        counts,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* STATUS BREAKDOWN */}

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-slate-500" />

                  <h2 className="font-bold text-slate-900">
                    Status breakdown
                  </h2>
                </div>

                <div className="mt-4 space-y-3">
                  {STATUSES.map(
                    (status) => {
                      const value =
                        counts[
                          status
                        ];

                      const percentage =
                        counts.total
                          ? Math.round(
                              (value /
                                counts.total) *
                                100,
                            )
                          : 0;

                      return (
                        <div
                          key={
                            status
                          }
                        >
                          <div className="mb-1.5 flex items-center justify-between">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_META[status].classes}`}
                            >
                              {
                                STATUS_META[
                                  status
                                ].label
                              }
                            </span>

                            <span className="text-xs font-bold text-slate-600">
                              {value}{' '}
                              ·{' '}
                              {percentage}
                              %
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-slate-500 transition-all"
                              style={{
                                width: `${percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>

              {/* SESSION DETAILS */}

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-slate-500" />

                  <h2 className="font-bold text-slate-900">
                    Session details
                  </h2>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                    <span className="text-xs font-medium text-slate-500">
                      Date
                    </span>

                    <span className="text-xs font-bold text-slate-800">
                      {formatDate(
                        selectedDate,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                    <span className="text-xs font-medium text-slate-500">
                      Students
                    </span>

                    <span className="text-xs font-bold text-slate-800">
                      {students.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                    <span className="text-xs font-medium text-slate-500">
                      Status
                    </span>

                    <span className="text-xs font-bold capitalize text-slate-800">
                      {session?.status ||
                        'Not created'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ATTENTION */}

              <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-600" />

                  <h2 className="font-bold text-rose-900">
                    Needs attention
                  </h2>
                </div>

                <p className="mt-2 text-sm leading-6 text-rose-700">
                  {counts.absent ===
                  0
                    ? 'No students are currently marked absent.'
                    : `${counts.absent} student${
                        counts.absent ===
                        1
                          ? ''
                          : 's'
                      } marked absent today.`}
                </p>

                {counts.late >
                  0 && (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    {counts.late}{' '}
                    student
                    {counts.late ===
                    1
                      ? ''
                      : 's'}{' '}
                    marked late.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* PRINT STYLES */}

      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }

            body {
              background: white !important;
            }

            @page {
              size: landscape;
              margin: 10mm;
            }

            table {
              min-width: 100% !important;
            }
          }
        `}
      </style>
    </div>
  );
}