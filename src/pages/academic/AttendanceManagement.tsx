import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  FileCheck2,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Unlock,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'half_day';
type ViewMode = 'manage' | 'student';

interface ClassRow {
  id: string;
  name: string;
  code?: string | null;
  class_teacher_id?: string | null;
}

interface StudentRow {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  admission_number?: string | null;
  passport_url?: string | null;
}

interface AttendanceRow {
  student: StudentRow;
  status: AttendanceStatus;
  check_in_at: string | null;
  remarks: string;
  record_id?: string;
  date?: string;
}

interface SessionRow {
  id: string;
  class_id: string;
  attendance_date: string;
  status: 'open' | 'submitted' | 'locked';
  submitted_at?: string | null;
}

const MANAGER_ROLES = ['admin', 'branch_admin', 'super_admin', 'director', 'principal', 'record_keeper'];
const STATUS_OPTIONS: AttendanceStatus[] = ['present', 'late', 'absent', 'excused', 'half_day'];

const statusMeta: Record<AttendanceStatus, { label: string; className: string; icon: React.FC<any> }> = {
  present: { label: 'Present', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
  late: { label: 'Late', className: 'bg-amber-50 text-amber-700 ring-amber-200', icon: Clock3 },
  absent: { label: 'Absent', className: 'bg-rose-50 text-rose-700 ring-rose-200', icon: XCircle },
  excused: { label: 'Excused', className: 'bg-sky-50 text-sky-700 ring-sky-200', icon: ShieldCheck },
  half_day: { label: 'Half day', className: 'bg-violet-50 text-violet-700 ring-violet-200', icon: AlertCircle },
};

const isoToday = () => new Date().toISOString().slice(0, 10);

const formatTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-NG', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    : '—';

const displayName = (student: StudentRow) =>
  [student.last_name, student.first_name, student.middle_name].filter(Boolean).join(' ');

export default function AttendanceManagement() {
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase();
  const isManager = MANAGER_ROLES.includes(role);
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const viewMode: ViewMode = isStudent ? 'student' : 'manage';

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(isoToday());
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [rows, setRows] = useState<Record<string, AttendanceRow>>({});
  const [session, setSession] = useState<SessionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [teacherProfileId, setTeacherProfileId] = useState('');
  const [studentHistory, setStudentHistory] = useState<AttendanceRow[]>([]);
  const [historyDays, setHistoryDays] = useState(30);

  const loadTeacherProfile = useCallback(async () => {
    if (!user?.id || !isTeacher) return '';
    const byUser = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
    if (byUser.data?.id) {
      setTeacherProfileId(byUser.data.id);
      return byUser.data.id;
    }
    if (user.email) {
      const byEmail = await supabase.from('teachers').select('id').ilike('email', user.email).maybeSingle();
      if (byEmail.data?.id) {
        setTeacherProfileId(byEmail.data.id);
        return byEmail.data.id;
      }
    }
    return '';
  }, [isTeacher, user?.email, user?.id]);

  const loadClasses = useCallback(async () => {
    if (!user?.branch_id || viewMode === 'student') return;
    setLoading(true);
    try {
      let teacherId = teacherProfileId;
      if (isTeacher && !teacherId) teacherId = await loadTeacherProfile();

      let query = supabase
        .from('classes')
        .select('id,name,code,class_teacher_id')
        .eq('branch_id', user.branch_id)
        .eq('status', 'active')
        .order('name');

      if (isTeacher) {
        if (!teacherId) {
          setClasses([]);
          setSelectedClassId('');
          return;
        }
        query = query.eq('class_teacher_id', teacherId);
      }

      const { data, error } = await query;
      if (error) throw error;
      const nextClasses = (data || []) as ClassRow[];
      setClasses(nextClasses);
      setSelectedClassId(current => current && nextClasses.some(c => c.id === current) ? current : (nextClasses[0]?.id || ''));
    } catch (error: any) {
      toast.error(error?.message || 'Unable to load classes');
    } finally {
      setLoading(false);
    }
  }, [isTeacher, loadTeacherProfile, teacherProfileId, user?.branch_id, viewMode]);

  const loadRegister = useCallback(async () => {
    if (!user?.branch_id || !selectedClassId || viewMode === 'student') return;
    setLoading(true);
    try {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id,first_name,last_name,middle_name,admission_number,passport_url')
        .eq('branch_id', user.branch_id)
        .eq('class_id', selectedClassId)
        .eq('current_status', 'active')
        .order('last_name')
        .order('first_name');
      if (studentError) throw studentError;

      const nextStudents = (studentData || []) as StudentRow[];
      setStudents(nextStudents);

      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('id,class_id,attendance_date,status,submitted_at')
        .eq('branch_id', user.branch_id)
        .eq('class_id', selectedClassId)
        .eq('attendance_date', selectedDate)
        .eq('session_type', 'daily')
        .maybeSingle();
      if (sessionError && sessionError.code !== 'PGRST116') throw sessionError;

      const nextSession = (sessionData || null) as SessionRow | null;
      setSession(nextSession);

      const nextRows: Record<string, AttendanceRow> = {};
      nextStudents.forEach(student => {
        nextRows[student.id] = { student, status: 'present', check_in_at: null, remarks: '' };
      });

      if (nextSession) {
        const { data: recordData, error: recordError } = await supabase
          .from('attendance_records')
          .select('id,student_id,status,check_in_at,remarks')
          .eq('session_id', nextSession.id);
        if (recordError) throw recordError;
        (recordData || []).forEach((record: any) => {
          if (nextRows[record.student_id]) {
            nextRows[record.student_id] = {
              ...nextRows[record.student_id],
              record_id: record.id,
              status: record.status as AttendanceStatus,
              check_in_at: record.check_in_at,
              remarks: record.remarks || '',
            };
          }
        });
      }
      setRows(nextRows);
    } catch (error: any) {
      toast.error(error?.message || 'Unable to load attendance register');
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedDate, user?.branch_id, viewMode]);

  const loadStudentHistory = useCallback(async () => {
    if (!user?.id || !user?.branch_id || !isStudent) return;
    setLoading(true);
    try {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id,first_name,last_name,middle_name,admission_number,passport_url,class_id')
        .eq('user_id', user.id)
        .eq('branch_id', user.branch_id)
        .maybeSingle();
      if (studentError) throw studentError;
      if (!student) {
        setStudentHistory([]);
        return;
      }

      const from = new Date();
      from.setDate(from.getDate() - historyDays);
      const fromDate = from.toISOString().slice(0, 10);

      const { data: sessions, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('id,attendance_date,class_id,status')
        .eq('branch_id', user.branch_id)
        .gte('attendance_date', fromDate)
        .lte('attendance_date', selectedDate)
        .order('attendance_date', { ascending: false });
      if (sessionError) throw sessionError;
      const sessionIds = (sessions || []).map((item: any) => item.id);
      if (!sessionIds.length) {
        setStudentHistory([]);
        return;
      }

      const { data: records, error: recordError } = await supabase
        .from('attendance_records')
        .select('id,session_id,status,check_in_at,remarks')
        .eq('student_id', student.id)
        .in('session_id', sessionIds);
      if (recordError) throw recordError;

      const sessionMap = new Map((sessions || []).map((item: any) => [item.id, item]));
      const history = (records || []).map((record: any) => ({
        student,
        record_id: record.id,
        status: record.status as AttendanceStatus,
        check_in_at: record.check_in_at,
        remarks: record.remarks || '',
        date: sessionMap.get(record.session_id)?.attendance_date || '',
      })) as AttendanceRow[];
      setStudentHistory(history);
    } catch (error: any) {
      toast.error(error?.message || 'Unable to load your attendance');
    } finally {
      setLoading(false);
    }
  }, [historyDays, isStudent, selectedDate, user?.branch_id, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (viewMode === 'student') loadStudentHistory();
    else loadClasses();
  }, [loadClasses, loadStudentHistory, user?.id, viewMode]);

  useEffect(() => {
    if (viewMode === 'manage' && selectedClassId) loadRegister();
  }, [loadRegister, selectedClassId, selectedDate, viewMode]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    if (session?.status === 'locked' && !isManager) {
      toast.error('This attendance session is locked');
      return;
    }
    setRows(previous => ({
      ...previous,
      [studentId]: {
        ...previous[studentId],
        status,
        check_in_at: status === 'present' || status === 'late' ? (previous[studentId].check_in_at || new Date().toISOString()) : null,
      },
    }));
  };

  const setRemark = (studentId: string, remarks: string) => {
    setRows(previous => ({ ...previous, [studentId]: { ...previous[studentId], remarks } }));
  };

  const markAll = (status: AttendanceStatus) => {
    const timestamp = status === 'present' || status === 'late' ? new Date().toISOString() : null;
    setRows(previous => Object.fromEntries(Object.entries(previous).map(([id, row]) => [id, { ...row, status, check_in_at: timestamp }])));
  };

  const saveAttendance = async () => {
    if (!user?.id || !user?.branch_id || !selectedClassId || !students.length) return;
    if (session?.status === 'locked') return toast.error('This attendance session is locked');
    setSaving(true);
    try {
      let sessionId = session?.id;
      if (!sessionId) {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .insert({ branch_id: user.branch_id, class_id: selectedClassId, teacher_id: teacherProfileId || null, attendance_date: selectedDate, session_type: 'daily', status: 'open', created_by: user.id })
          .select('id,class_id,attendance_date,status,submitted_at')
          .single();
        if (error) throw error;
        sessionId = data.id;
        setSession(data as SessionRow);
      }

      const payload = students.map(student => ({
        session_id: sessionId,
        student_id: student.id,
        teacher_id: teacherProfileId || null,
        status: rows[student.id]?.status || 'present',
        check_in_at: rows[student.id]?.check_in_at || null,
        remarks: rows[student.id]?.remarks || null,
        marked_by: user.id,
      }));

      const { error: recordError } = await supabase.from('attendance_records').upsert(payload, { onConflict: 'session_id,student_id' });
      if (recordError) throw recordError;

      const { data: updatedSession, error: sessionError } = await supabase
        .from('attendance_sessions')
        .update({ status: 'submitted', submitted_by: user.id, submitted_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select('id,class_id,attendance_date,status,submitted_at')
        .single();
      if (sessionError) throw sessionError;
      setSession(updatedSession as SessionRow);
      toast.success('Attendance saved and securely audited');
      await loadRegister();
    } catch (error: any) {
      toast.error(error?.message || 'Unable to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const lockSession = async () => {
    if (!session?.id || !isManager || !user?.id) return;
    const nextLocked = session.status !== 'locked';
    const { data, error } = await supabase.from('attendance_sessions').update({ status: nextLocked ? 'locked' : 'submitted' }).eq('id', session.id).select('id,class_id,attendance_date,status,submitted_at').single();
    if (error) return toast.error(error.message);
    setSession(data as SessionRow);
    toast.success(nextLocked ? 'Attendance session locked' : 'Attendance session reopened');
  };

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return Object.values(rows).filter(row => {
      const matchesSearch = !term || displayName(row.student).toLowerCase().includes(term) || String(row.student.admission_number || '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const counts = useMemo(() => {
    const values = Object.values(rows);
    return {
      total: values.length,
      present: values.filter(row => row.status === 'present').length,
      late: values.filter(row => row.status === 'late').length,
      absent: values.filter(row => row.status === 'absent').length,
      excused: values.filter(row => row.status === 'excused').length,
      halfDay: values.filter(row => row.status === 'half_day').length,
    };
  }, [rows]);

  const studentCounts = useMemo(() => {
    const total = studentHistory.length;
    const present = studentHistory.filter(row => row.status === 'present').length;
    const late = studentHistory.filter(row => row.status === 'late').length;
    const absent = studentHistory.filter(row => row.status === 'absent').length;
    const excused = studentHistory.filter(row => row.status === 'excused').length;
    return { total, present, late, absent, excused, rate: total ? Math.round(((present + late + excused) / total) * 100) : 0 };
  }, [studentHistory]);

  const exportCsv = () => {
    const data = viewMode === 'manage' ? filteredRows : studentHistory;
    const header = ['Date', 'Admission No', 'Student', 'Status', 'Check In', 'Remarks'];
    const lines = data.map(row => [row.date || selectedDate, row.student.admission_number || '', displayName(row.student), row.status, formatTime(row.check_in_at), row.remarks || ''].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `attendance-${selectedDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (viewMode === 'student') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6">
        <header className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold uppercase tracking-wider"><ShieldCheck size={16} /> My Attendance</div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-2">
            <div><h1 className="text-3xl font-black text-slate-900 dark:text-white">Attendance Passport</h1><p className="text-slate-500 mt-1">Your attendance record, punctuality and absence history.</p></div>
            <div className="flex items-center gap-2"><select value={historyDays} onChange={e => setHistoryDays(Number(e.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value={30}>Last 30 days</option><option value={60}>Last 60 days</option><option value={90}>Last 90 days</option><option value={180}>Last 6 months</option></select><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"><Download size={16} /> Export</button></div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              ['Attendance rate', `${studentCounts.rate}%`, 'text-indigo-600'],
              ['Present', studentCounts.present, 'text-emerald-600'],
              ['Late', studentCounts.late, 'text-amber-600'],
              ['Absent', studentCounts.absent, 'text-rose-600'],
              ['Excused', studentCounts.excused, 'text-sky-600'],
            ].map(([label, value, color]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-1 text-2xl font-black ${color}`}>{value}</p></div>)}
          </div>
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800"><div><h2 className="font-black text-slate-900 dark:text-white">Attendance history</h2><p className="text-xs text-slate-500 mt-1">Only your own attendance records are visible.</p></div><CalendarDays className="text-indigo-500" size={20} /></div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {studentHistory.map(row => { const meta = statusMeta[row.status]; const Icon = meta.icon; return <div key={row.record_id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4"><div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center dark:bg-slate-800"><CalendarDays size={18} className="text-slate-500" /></div><div className="flex-1"><p className="font-bold text-slate-900 dark:text-white">{new Date(`${row.date}T00:00:00`).toLocaleDateString('en-NG',{weekday:'long',day:'numeric',month:'short',year:'numeric'})}</p><p className="text-xs text-slate-500">Check-in: {formatTime(row.check_in_at)} {row.remarks ? `• ${row.remarks}` : ''}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${meta.className}`}><Icon size={14} /> {meta.label}</span></div>; })}
              {!loading && !studentHistory.length && <div className="p-12 text-center text-slate-400">No attendance records found for this period.</div>}
              {loading && <div className="p-12 text-center text-slate-400">Loading attendance history…</div>}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6">
      <header className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold uppercase tracking-wider"><Clock3 size={16} /> Premium Roll Call</div>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mt-2">
          <div><h1 className="text-3xl font-black text-slate-900 dark:text-white">Attendance Command Centre</h1><p className="text-slate-500 mt-1">Secure daily registers with role-based access, audit history and parent-alert readiness.</p></div>
          <div className="flex gap-2"><button onClick={exportCsv} disabled={!filteredRows.length} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm disabled:opacity-50"><Download size={16} /> Export CSV</button><button onClick={() => loadRegister()} disabled={!selectedClassId || loading} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button></div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Class {isTeacher && <span className="text-indigo-500">• Class teacher only</span>}</span><div className="relative"><select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 pr-9 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">Select class</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}{item.code ? ` (${item.code})` : ''}</option>)}</select><ChevronDown className="absolute right-3 top-3.5 text-slate-400" size={16} /></div></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Register date</span><input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
            <div className="flex items-end gap-2"><button onClick={() => markAll('present')} className="flex-1 rounded-xl bg-emerald-50 px-3 py-3 text-xs font-black text-emerald-700">Mark all present</button><button onClick={() => markAll('absent')} className="flex-1 rounded-xl bg-rose-50 px-3 py-3 text-xs font-black text-rose-700">Mark all absent</button></div>
          </div>
        </section>
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            ['Students', counts.total, Users, 'text-slate-700'],
            ['Present', counts.present, UserCheck, 'text-emerald-600'],
            ['Late', counts.late, Clock3, 'text-amber-600'],
            ['Absent', counts.absent, UserX, 'text-rose-600'],
            ['Excused', counts.excused, ShieldCheck, 'text-sky-600'],
            ['Half day', counts.halfDay, AlertCircle, 'text-violet-600'],
          ].map(([label, value, Icon, color]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-500">{label}</p>{React.createElement(Icon as React.FC<any>, { size: 17, className: color })}</div><p className={`mt-1 text-2xl font-black ${color}`}>{value}</p></div>)}
        </section>
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col xl:flex-row xl:items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
            <div className="relative flex-1"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student or admission number…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950" /></div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | AttendanceStatus)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950"><option value="all">All statuses</option>{STATUS_OPTIONS.map(status => <option key={status} value={status}>{statusMeta[status].label}</option>)}</select>
            <button onClick={saveAttendance} disabled={saving || !selectedClassId || !students.length || session?.status === 'locked'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"><FileCheck2 size={17} />{saving ? 'Saving…' : 'Save & Submit'}</button>
            {isManager && session && <button onClick={lockSession} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-950">{session.status === 'locked' ? <Unlock size={16} /> : <Lock size={16} />}{session.status === 'locked' ? 'Reopen' : 'Lock'}</button>}
          </div>
          {session && <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-2.5 text-xs dark:bg-slate-950"><span className="font-semibold text-slate-500">Session: <b className="text-slate-800 dark:text-white">{session.status}</b>{session.submitted_at ? ` • submitted ${formatTime(session.submitted_at)}` : ''}</span><span className="text-slate-400">{filteredRows.length} of {students.length} students</span></div>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-950"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Admission No.</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Check-in</th><th className="px-4 py-3">Remarks</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.map(row => <tr key={row.student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="h-10 w-10 overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center dark:bg-slate-800">{row.student.passport_url ? <img src={row.student.passport_url} alt="" className="h-full w-full object-cover" /> : <Users size={17} className="text-slate-400" />}</div><div><p className="font-bold text-slate-900 dark:text-white">{displayName(row.student)}</p><p className="text-xs text-slate-400">{row.student.middle_name || 'Student'}</p></div></div></td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.student.admission_number || '—'}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">{STATUS_OPTIONS.map(status => { const active = row.status === status; const meta = statusMeta[status]; return <button key={status} onClick={() => setStatus(row.student.id, status)} disabled={session?.status === 'locked'} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black transition ${active ? `${meta.className} ring-1` : 'bg-slate-100 text-slate-500 dark:bg-slate-800'} disabled:cursor-not-allowed`}>{meta.label}</button>; })}</div></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"><Clock3 size={14} />{formatTime(row.check_in_at)}</span></td>
                  <td className="px-4 py-3"><input value={row.remarks} onChange={e => setRemark(row.student.id, e.target.value)} disabled={session?.status === 'locked'} placeholder="Optional remark…" className="w-full rounded-lg border border-transparent bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-300 dark:bg-slate-950" /></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {!selectedClassId && <div className="p-14 text-center"><Users className="mx-auto text-slate-300" size={38} /><p className="mt-3 font-bold text-slate-500">Select a class to open the register.</p><p className="text-xs text-slate-400 mt-1">Teachers only see classes where they are assigned as class teacher.</p></div>}
          {selectedClassId && !loading && !filteredRows.length && <div className="p-14 text-center text-slate-400">No students match the current filters.</div>}
          {loading && <div className="p-14 text-center text-slate-400">Loading secure attendance register…</div>}
        </section>
      </main>
    </div>
  );
}
