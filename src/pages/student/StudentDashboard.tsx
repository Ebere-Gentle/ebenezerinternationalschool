import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Activity, ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarDays,
  CheckCircle, ChevronRight, Clock, CreditCard, FileText, GraduationCap,
  Info, MapPin, Megaphone, RefreshCw, TrendingUp, User, Wallet, Zap,
  AlertCircle, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import { StudentDashboardSkeleton } from '../../components/common/LoadingSpinner';
import { usePaymentData } from '../../hooks/usePaymentData';

dayjs.extend(relativeTime);

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

type AcademicSession = { id: string; session_name: string; term_name: string; term_number?: number; start_date?: string | null; end_date?: string | null };
type TimetableItem = { id: string; day: string; period: number; start_time: string; end_time: string; subject_id: string | null; teacher_id: string | null; room: string | null; notes: string | null };
type Subject = { id: string; name: string; code: string | null };
type Teacher = { id: string; first_name: string; middle_name: string | null; last_name: string };
type AttendanceRow = { id: string; student_id: string; status: string; attendance_date?: string; created_at?: string };
type Announcement = { id: string; title: string; message: string; channel: string | null; audience_type: string | null; target_class_id: string | null; target_student_id: string | null; target_role: string | null; status: string | null; created_at: string };

const normalize = (v: unknown) => String(v ?? '').trim().toLowerCase();
const money = (v: unknown) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(v) || 0);
const time = (v?: string | null) => { if (!v) return ''; const [h, m] = v.slice(0, 5).split(':'); let hour = Number(h); if (Number.isNaN(hour)) return v; const ap = hour >= 12 ? 'PM' : 'AM'; if (hour === 0) hour = 12; if (hour > 12) hour -= 12; return `${hour}:${m} ${ap}`; };
const statusClass = (s: string) => { const x = normalize(s); if (['paid','completed','approved','present'].includes(x)) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'; if (['pending','processing','late'].includes(x)) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'; if (['overdue','absent'].includes(x)) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'; return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'; };
const statusIcon = (s: string) => { const x = normalize(s); if (['paid','completed','approved','present'].includes(x)) return CheckCircle; if (['overdue','absent'].includes(x)) return AlertCircle; if (['failed','rejected'].includes(x)) return XCircle; return Clock; };

function defaultSchoolDay() {
  const d = dayjs().day();
  return d === 0 || d === 6 ? 'Monday' : dayjs().format('dddd');
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const loadingRef = useRef(false);
  const loadedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [studentClass, setStudentClass] = useState<any>(null);
  const [academicSession, setAcademicSession] = useState<AcademicSession | null>(null);
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(defaultSchoolDay);

  const { assignments = [], loading: paymentLoading } = usePaymentData(studentId, branchId, { autoFetch: Boolean(studentId && branchId) });

  const load = useCallback(async (force = false) => {
    if (!user?.id || loadingRef.current || (loadedRef.current && !force)) return;
    loadingRef.current = true;
    if (force) setRefreshing(true); else setLoading(true);
    try {
      let { data: s, error } = await supabase.from('students').select('*, class:class_id(id,name,code,level)').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (!s && user.email) {
        const r = await supabase.from('students').select('*, class:class_id(id,name,code,level)').eq('email', user.email).maybeSingle();
        if (r.error) throw r.error; s = r.data;
      }
      if (!s) throw new Error('Student profile not found. Please contact administration.');

      const classId = s.class_id || s.class?.id || null;
      const bId = s.branch_id || null;
      setStudent({ ...s, class_name: s.class?.name || 'Not Assigned', class_id: classId });
      setStudentClass(s.class || null);
      setStudentId(s.id);
      setBranchId(bId);

      const sessionQuery = supabase.from('academic_sessions').select('id,session_name,term_name,term_number,start_date,end_date').eq('is_current', true).order('start_date', { ascending: false }).limit(1);
      const sessionResult = bId ? await sessionQuery.eq('branch_id', bId).maybeSingle() : await sessionQuery.maybeSingle();
      if (sessionResult.error) console.warn('Academic session:', sessionResult.error);
      setAcademicSession(sessionResult.data || null);

      const [pay, notes, broad, att, tt, subs, teachersResult] = await Promise.all([
        supabase.from('payments').select('*').eq('student_id', s.id).order('payment_date', { ascending: false }).limit(20),
        supabase.from('notifications').select('*').eq('is_read', false).order('created_at', { ascending: false }).limit(8),
        bId ? supabase.from('broadcasts').select('id,title,message,channel,audience_type,target_class_id,target_student_id,target_role,status,created_at').eq('branch_id', bId).order('created_at', { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
        supabase.from('attendance_records').select('*').eq('student_id', s.id).order('created_at', { ascending: false }).limit(60),
        classId ? supabase.from('timetables').select('id,day,period,start_time,end_time,subject_id,teacher_id,room,notes').eq('class_id', classId).order('period', { ascending: true }) : Promise.resolve({ data: [], error: null }),
        bId ? supabase.from('subjects').select('id,name,code').eq('branch_id', bId) : supabase.from('subjects').select('id,name,code'),
        bId ? supabase.from('teachers').select('id,first_name,middle_name,last_name').eq('branch_id', bId) : supabase.from('teachers').select('id,first_name,middle_name,last_name'),
      ]);

      setPayments(pay.data || []);
      setNotifications(notes.data || []);
      setAttendance((att.data || []) as AttendanceRow[]);
      setTimetable((tt.data || []) as TimetableItem[]);
      setSubjects((subs.data || []) as Subject[]);
      setTeachers((teachersResult.data || []) as Teacher[]);

      const currentClassId = classId;
      const currentStudentId = s.id;
      const visible = ((broad.data || []) as Announcement[]).filter(a => {
        const audience = normalize(a.audience_type); const st = normalize(a.status);
        if (['cancelled','failed','draft','scheduled'].includes(st)) return false;
        if (a.target_student_id && a.target_student_id !== currentStudentId) return false;
        if (a.target_class_id && a.target_class_id !== currentClassId) return false;
        if (!audience || ['all','everyone','school','branch','student','students'].includes(audience)) return true;
        if (['class','classroom'].includes(audience)) return a.target_class_id === currentClassId;
        if (audience.includes('student')) return !a.target_student_id || a.target_student_id === currentStudentId;
        return true;
      });
      setAnnouncements(visible.slice(0, 6));

      // Results are read defensively because the result engine uses separate tables.
      const sessionName = sessionResult.data?.session_name;
      const termName = sessionResult.data?.term_name;
      const resultTables = ['test_results','exam_results','cbt_results'];
      const collected: any[] = [];
      for (const table of resultTables) {
        let q = supabase.from(table).select('*').eq('student_id', s.id).limit(100);
        const r = await q;
        if (!r.error) {
          (r.data || []).forEach((row: any) => collected.push({ ...row, _type: table.replace('_results','') }));
        }
      }
      const filtered = collected.filter(r => {
        const rs = r.session_name || r.academic_session || r.session;
        const rt = r.term_name || r.academic_term || r.term;
        return (!sessionName || !rs || String(rs) === String(sessionName)) && (!termName || !rt || String(rt) === String(termName));
      });
      setResults(filtered);
      loadedRef.current = true;
    } catch (e: any) {
      console.error('Unable to load student dashboard:', e);
      toast.error(e?.message || 'Unable to load dashboard');
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => { void load(); }, [load]);

  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);
  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);
  const selectedTimetable = useMemo(() => timetable.filter(t => normalize(t.day) === normalize(selectedDay)).sort((a,b) => a.period-b.period), [timetable, selectedDay]);
  const today = dayjs().format('dddd');

  const attendanceStats = useMemo(() => {
    const x = { present: 0, absent: 0, late: 0, excused: 0, half_day: 0 };
    attendance.forEach(a => { const k = normalize(a.status) as keyof typeof x; if (k in x) x[k]++; });
    const total = Object.values(x).reduce((a,b) => a+b, 0);
    const rate = total ? ((x.present + x.late + x.half_day * 0.5) / total) * 100 : 0;
    return { ...x, total, rate };
  }, [attendance]);

  const scoreValues = results.map(r => Number(r.score ?? r.total_score ?? r.marks ?? r.percentage)).filter(Number.isFinite);
  const average = scoreValues.length ? scoreValues.reduce((a,b) => a+b, 0) / scoreValues.length : 0;
  const grade = average >= 75 ? 'A' : average >= 65 ? 'B' : average >= 55 ? 'C' : average >= 45 ? 'D' : average >= 40 ? 'E' : 'F';

  const paymentStats = useMemo(() => {
    let due=0, paid=0, balance=0, overdue=0;
    assignments.forEach((a:any) => { due += Number(a.amount_due)||0; paid += Number(a.amount_paid)||0; balance += Number(a.balance)||0; if (normalize(a.payment_status)==='overdue') overdue++; });
    return { due, paid, balance, overdue, progress: due ? Math.min(100, paid/due*100) : 0 };
  }, [assignments]);

  const timetableSubject = (id: string | null) => id ? subjectMap.get(id) : undefined;
  const teacherName = (id: string | null) => { const t = id ? teacherMap.get(id) : undefined; return t ? [t.first_name,t.middle_name,t.last_name].filter(Boolean).join(' ') : ''; };
  const refresh = () => void load(true);

  if (loading || paymentLoading) return <StudentDashboardSkeleton />;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-6 pb-8 overflow-x-hidden">
      <motion.section initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-white/20 flex items-center justify-center text-lg sm:text-2xl font-bold shrink-0">{student?.first_name?.[0]}{student?.last_name?.[0]}</div>
            <div className="min-w-0"><p className="text-xs text-blue-100">Student Portal</p><h1 className="text-xl sm:text-2xl font-bold truncate">Welcome, {student?.first_name || 'Student'}</h1><p className="text-xs sm:text-sm text-blue-100 truncate">{student?.class_name} • {student?.student_id || student?.admission_number || 'Student'}</p></div>
          </div>
          <div className="flex flex-wrap gap-2"><button onClick={refresh} disabled={refreshing} className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${refreshing?'animate-spin':''}`}/> Refresh</button><button onClick={()=>navigate('/student/paybill')} className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold flex items-center gap-2"><Wallet className="w-4 h-4"/> Pay Bill</button></div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] text-blue-100">Academic Session</p><p className="font-bold text-sm">{academicSession?.session_name || 'Not set'}</p><p className="text-[10px] text-blue-100">{academicSession?.term_name || 'Term not set'}</p></div>
          <div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] text-blue-100">Today</p><p className="font-bold text-sm">{dayjs().format('ddd, DD MMM')}</p><p className="text-[10px] text-blue-100">{dayjs().format('YYYY')}</p></div>
          <div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] text-blue-100">Average Score</p><p className="font-bold text-lg">{Math.round(average)}%</p></div>
          <div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] text-blue-100">Attendance</p><p className="font-bold text-lg">{Math.round(attendanceStats.rate)}%</p></div>
        </div>
      </motion.section>

      <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"><div className="flex items-center gap-3"><span className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><Megaphone className="w-5 h-5 text-amber-600"/></span><div><h2 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">School Announcements</h2><p className="text-[11px] text-gray-500">Latest updates from your school</p></div></div><button onClick={()=>navigate('/student/notifications')} className="text-xs font-semibold text-indigo-600 flex items-center gap-1">View all <ArrowUpRight className="w-3.5 h-3.5"/></button></div>
        <div className="p-4 sm:p-5">{announcements.length===0 ? <div className="py-7 text-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700"><Megaphone className="w-8 h-8 mx-auto text-gray-300"/><p className="mt-2 text-sm text-gray-500">No new announcements</p><p className="text-xs text-gray-400">You're up to date.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{announcements.map(a=><article key={a.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700"><div className="flex justify-between gap-2"><Bell className="w-4 h-4 text-indigo-500"/><span className="text-[10px] text-gray-400">{dayjs(a.created_at).fromNow()}</span></div><h3 className="mt-3 text-sm font-bold text-gray-900 dark:text-white line-clamp-2">{a.title || 'School Announcement'}</h3><p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-3 whitespace-pre-line">{a.message}</p></article>)}</div>}</div>
      </section>

      <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-3"><div className="flex items-center justify-between"><div><h2 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2"><CalendarDays className="w-5 h-5 text-blue-500"/> My Timetable</h2><p className="text-[11px] text-gray-500">{selectedDay} • {studentClass?.name || student?.class_name || 'Your class'}</p></div><button onClick={()=>navigate('/student/timetable')} className="text-xs font-semibold text-indigo-600 flex items-center gap-1">Full timetable <ArrowUpRight className="w-3.5 h-3.5"/></button></div><div className="flex gap-1.5 overflow-x-auto pb-1">{DAYS.map(day=><button key={day} onClick={()=>setSelectedDay(day)} className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold ${selectedDay===day?'bg-indigo-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{day.slice(0,3)}</button>)}</div></div>
        <div className="p-4 sm:p-5">{selectedTimetable.length===0 ? <div className="py-8 text-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700"><CalendarDays className="w-9 h-9 mx-auto text-gray-300"/><p className="mt-2 text-sm font-semibold text-gray-500">No classes scheduled for {selectedDay}</p><p className="text-xs text-gray-400">Your school has not published a timetable entry for this day.</p></div> : <div className="space-y-2">{selectedTimetable.map(row=>{const sub=timetableSubject(row.subject_id); return <div key={row.id} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/30 p-3"><div className="w-12 sm:w-16 shrink-0 text-center"><p className="text-[10px] text-gray-400">P{row.period}</p><p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{time(row.start_time)}</p></div><div className="h-10 w-px bg-gray-200 dark:bg-gray-700"/><div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0"><BookOpen className="w-4 h-4 text-blue-600"/></div><div className="min-w-0 flex-1"><p className="text-sm font-bold text-gray-900 dark:text-white truncate">{sub?.name || row.subject_id || 'Subject not assigned'}</p><div className="flex flex-wrap gap-x-3 text-[10px] text-gray-500"><span>{time(row.start_time)} – {time(row.end_time)}</span>{teacherName(row.teacher_id)&&<span className="inline-flex items-center gap-1"><User className="w-3 h-3"/>{teacherName(row.teacher_id)}</span>}{row.room&&<span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3"/>{row.room}</span>}</div></div></div>})}</div>}</div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[['Results',`${Math.round(average)}%`,GraduationCap,'text-indigo-600','bg-indigo-100'],['Attendance',`${Math.round(attendanceStats.rate)}%`,CalendarDays,'text-blue-600','bg-blue-100'],['Subjects',String(new Set(timetable.map(x=>x.subject_id).filter(Boolean)).size || subjects.length),BookOpen,'text-purple-600','bg-purple-100'],['Outstanding',money(paymentStats.balance),Wallet,paymentStats.balance?'text-red-600':'text-green-600',paymentStats.balance?'bg-red-100':'bg-green-100']].map(([label,value,Icon,ic,bg]:any)=><div key={label} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-3 sm:p-4"><div className="flex justify-between gap-2"><div className="min-w-0"><p className="text-[10px] sm:text-xs text-gray-500 truncate">{label}</p><p className="text-base sm:text-xl font-bold text-gray-900 dark:text-white mt-1 truncate">{value}</p></div><span className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}><Icon className={`w-4 h-4 ${ic}`}/></span></div></div>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"><div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between"><h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white"><GraduationCap className="w-5 h-5 text-indigo-500"/> Academic Performance</h3><button onClick={()=>navigate('/student/results/summary')} className="text-xs text-indigo-600">Details</button></div><div className="p-5"><div className="flex items-center gap-5"><div className="h-20 w-20 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center"><span className="text-2xl font-black text-indigo-600">{grade}</span></div><div><p className="text-3xl font-black text-gray-900 dark:text-white">{Math.round(average)}%</p><p className="text-xs text-gray-500">{results.length ? `${results.length} result record${results.length>1?'s':''}` : 'No result data available yet.'}</p></div></div></div></section>
        <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"><div className="p-4 border-b border-gray-200 dark:border-gray-700"><h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white"><Activity className="w-5 h-5 text-green-500"/> Attendance Summary</h3></div><div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-2">{[['Present',attendanceStats.present,'text-green-600'],['Absent',attendanceStats.absent,'text-red-600'],['Late',attendanceStats.late,'text-yellow-600'],['Excused',attendanceStats.excused,'text-blue-600'],['Rate',`${Math.round(attendanceStats.rate)}%`,'text-indigo-600']].map(([l,v,c]:any)=><div key={l} className="rounded-xl bg-gray-50 dark:bg-gray-900/30 p-3 text-center"><p className="text-[10px] text-gray-500">{l}</p><p className={`text-lg font-bold ${c}`}>{v}</p></div>)}</div></section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <section className="lg:col-span-2 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"><div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between"><h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white"><CreditCard className="w-5 h-5 text-green-500"/> Recent Payments</h3><button onClick={()=>navigate('/student/payments')} className="text-xs text-indigo-600 flex items-center gap-1">View all <ChevronRight className="w-4 h-4"/></button></div><div className="divide-y divide-gray-200 dark:divide-gray-700">{payments.length===0?<div className="p-8 text-center text-sm text-gray-500">No payments yet.</div>:payments.slice(0,5).map(p=>{const I=statusIcon(p.status||'completed'); return <div key={p.id} className="p-3 sm:p-4 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{p.fee_name||'Fee Payment'}</p><p className="text-[10px] text-gray-500">{p.payment_date?dayjs(p.payment_date).format('MMM D, YYYY'):''} • {p.payment_method||'Payment'}</p></div><div className="text-right shrink-0"><p className="text-sm font-bold text-green-600">{money(p.amount_paid ?? p.amount)}</p><span className={`text-[9px] px-2 py-1 rounded-full inline-flex items-center gap-1 ${statusClass(p.status||'completed')}`}><I className="w-2.5 h-2.5"/>{p.status||'completed'}</span></div></div>})}</div></section>
        <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5"><h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white"><Zap className="w-5 h-5 text-yellow-500"/> Quick Actions</h3><div className="space-y-2 mt-4">{[['Pay Bill','/student/paybill',Wallet],['My Results','/student/results/summary',GraduationCap],['Attendance','/student/attendance',CalendarDays],['Profile','/student/profile',User]].map(([label,path,Icon]:any)=><button key={label} onClick={()=>navigate(path)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-3 text-left"><Icon className="w-4 h-4 text-indigo-600"/><span className="text-xs font-semibold flex-1 text-gray-700 dark:text-gray-200">{label}</span><ArrowRight className="w-4 h-4 text-gray-400"/></button>)}</div></section>
      </div>

      <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5"><div className="flex items-center justify-between mb-4"><h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white"><Bell className="w-5 h-5 text-yellow-500"/> Notifications {notifications.length>0&&<span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px]">{notifications.length}</span>}</h3></div>{notifications.length===0?<div className="py-6 text-center"><Info className="w-8 h-8 mx-auto text-gray-300"/><p className="text-sm text-gray-500 mt-2">No new notifications</p></div>:<div className="grid grid-cols-1 md:grid-cols-2 gap-2">{notifications.map(n=><div key={n.id} className="rounded-xl bg-gray-50 dark:bg-gray-900/30 p-3"><p className="text-xs font-semibold text-gray-900 dark:text-white">{n.title||'Notification'}</p><p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{n.message}</p></div>)}</div>}</section>

      <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5"><div className="flex items-center justify-between mb-4"><div><h3 className="font-bold text-sm text-gray-900 dark:text-white">Fee Summary</h3><p className="text-[11px] text-gray-500">Current academic payment position</p></div><button onClick={()=>navigate('/student/paybill')} className="text-xs text-indigo-600">View details</button></div><div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full" style={{width:`${paymentStats.progress}%`}}/></div><div className="grid grid-cols-3 gap-2 mt-4 text-center"><div><p className="text-[10px] text-gray-500">Total Due</p><p className="text-sm font-bold text-gray-900 dark:text-white">{money(paymentStats.due)}</p></div><div><p className="text-[10px] text-gray-500">Paid</p><p className="text-sm font-bold text-green-600">{money(paymentStats.paid)}</p></div><div><p className="text-[10px] text-gray-500">Outstanding</p><p className="text-sm font-bold text-red-600">{money(paymentStats.balance)}</p></div></div></section>
    </div>
  );
};

export default StudentDashboard;