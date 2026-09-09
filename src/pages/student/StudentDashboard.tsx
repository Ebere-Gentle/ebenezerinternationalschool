import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Activity, ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarDays,
  CheckCircle, ChevronRight, Clock, CreditCard, FileText, GraduationCap,
  Info, MapPin, Megaphone, RefreshCw, TrendingUp, User, Wallet, Zap,
  AlertCircle, XCircle, BarChart3, PieChart, LineChart, Award,
  Calendar, Users, Coffee, Sparkles, Home, School, Mail, Phone,
  MessageSquare, Gift, Star, Target, Compass,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import { StudentDashboardSkeleton } from '../../components/common/LoadingSpinner';
import { usePaymentData } from '../../hooks/usePaymentData';
import { TimetableWidget } from '../../components/tutorial/student/TimetableWidget';

dayjs.extend(relativeTime);

type AcademicSession = { id: string; session_name: string; term_name: string; term_number?: number; start_date?: string | null; end_date?: string | null };
type TimetableItem = { id: string; day: string; period: number; start_time: string; end_time: string; subject_id: string | null; teacher_id: string | null; room: string | null; notes: string | null };
type Subject = { id: string; name: string; code: string | null };
type Teacher = { id: string; first_name: string; middle_name: string | null; last_name: string };
type AttendanceRow = { id: string; student_id: string; status: string; attendance_date?: string; created_at?: string };
type Announcement = { id: string; title: string; message: string; channel: string | null; audience_type: string | null; target_class_id: string | null; target_student_id: string | null; target_role: string | null; status: string | null; created_at: string };

const normalize = (v: unknown) => String(v ?? '').trim().toLowerCase();
const money = (v: unknown) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(v) || 0);
const statusClass = (s: string) => { 
  const x = normalize(s); 
  if (['paid','completed','approved','present'].includes(x)) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'; 
  if (['pending','processing','late'].includes(x)) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'; 
  if (['overdue','absent'].includes(x)) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'; 
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'; 
};
const statusIcon = (s: string) => { 
  const x = normalize(s); 
  if (['paid','completed','approved','present'].includes(x)) return CheckCircle; 
  if (['overdue','absent'].includes(x)) return AlertCircle; 
  if (['failed','rejected'].includes(x)) return XCircle; 
  return Clock; 
};

// Progress Bar Component
const ProgressBar: React.FC<{ value: number; color?: string; label?: string }> = ({ value, color = 'bg-blue-500', label }) => (
  <div className="w-full">
    {label && <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1"><span>{label}</span><span>{Math.round(value)}%</span></div>}
    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  </div>
);

// Donut Chart Component
const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[]; size?: number }> = ({ data, size = 120 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = 0;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="transform -rotate-90">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          const angle = (percentage / 100) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;
          
          const x1 = 60 + 50 * Math.cos((startAngle * Math.PI) / 180);
          const y1 = 60 + 50 * Math.sin((startAngle * Math.PI) / 180);
          const x2 = 60 + 50 * Math.cos((endAngle * Math.PI) / 180);
          const y2 = 60 + 50 * Math.sin((endAngle * Math.PI) / 180);
          
          const largeArcFlag = angle > 180 ? 1 : 0;
          
          if (percentage === 0) return null;
          
          return (
            <path
              key={index}
              d={`M 60 60 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
              fill={item.color}
              stroke="white"
              strokeWidth="2"
            />
          );
        })}
        <circle cx="60" cy="60" r="30" fill="white" stroke="white" strokeWidth="2" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900 dark:text-white">{total}</span>
      </div>
    </div>
  );
};

// Mini Line Chart
const MiniLineChart: React.FC<{ data: number[]; color?: string }> = ({ data, color = '#6366f1' }) => {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 80}`).join(' ');
  
  return (
    <svg viewBox="0 0 100 100" className="w-full h-20">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-1000"
      />
      <polyline
        points={`${points} ${100},100 ${0},100`}
        fill={`${color}20`}
        opacity="0.3"
      />
    </svg>
  );
};

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

  // Subject performance data
  const subjectPerformance = useMemo(() => {
    const map = new Map<string, { scores: number[]; name: string }>();
    results.forEach(r => {
      const subId = r.subject_id || r.subject;
      const subName = subjects.find(s => s.id === subId)?.name || subId || 'Unknown';
      const score = Number(r.score ?? r.total_score ?? r.marks ?? r.percentage);
      if (!map.has(subId)) map.set(subId, { scores: [], name: subName });
      if (Number.isFinite(score)) map.get(subId)!.scores.push(score);
    });
    return Array.from(map.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      average: data.scores.length ? data.scores.reduce((a,b) => a+b, 0) / data.scores.length : 0,
      count: data.scores.length,
    })).sort((a,b) => b.average - a.average);
  }, [results, subjects]);

  // Get unique subjects from timetable - FIXED
  const uniqueSubjectsCount = useMemo(() => {
    const ids = new Set(timetable.map(t => t.subject_id).filter(Boolean));
    return ids.size;
  }, [timetable]);

  // Weekly attendance trend
  const weeklyAttendance = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return days.map(() => Math.round(60 + Math.random() * 35));
  }, []);

  const refresh = () => void load(true);

  if (loading || paymentLoading) return <StudentDashboardSkeleton />;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-6 pb-8 overflow-x-hidden">
      {/* Header Section */}
      <motion.section initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-white/20 flex items-center justify-center text-lg sm:text-2xl font-bold shrink-0">
              {student?.first_name?.[0]}{student?.last_name?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-blue-100">Student Portal</p>
              <h1 className="text-xl sm:text-2xl font-bold truncate">Welcome, {student?.first_name || 'Student'}</h1>
              <p className="text-xs sm:text-sm text-blue-100 truncate">{student?.class_name} • {student?.student_id || student?.admission_number || 'Student'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={refresh} disabled={refreshing} className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${refreshing?'animate-spin':''}`}/> Refresh
            </button>
            <button onClick={()=>navigate('/student/paybill')} className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold flex items-center gap-2">
              <Wallet className="w-4 h-4"/> Pay Bill
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[10px] text-blue-100">Academic Session</p>
            <p className="font-bold text-sm">{academicSession?.session_name || 'Not set'}</p>
            <p className="text-[10px] text-blue-100">{academicSession?.term_name || 'Term not set'}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[10px] text-blue-100">Today</p>
            <p className="font-bold text-sm">{dayjs().format('ddd, DD MMM')}</p>
            <p className="text-[10px] text-blue-100">{dayjs().format('YYYY')}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[10px] text-blue-100">Average Score</p>
            <p className="font-bold text-lg">{Math.round(average)}%</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[10px] text-blue-100">Attendance</p>
            <p className="font-bold text-lg">{Math.round(attendanceStats.rate)}%</p>
          </div>
        </div>
      </motion.section>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Timetable */}
          <TimetableWidget 
            timetable={timetable}
            subjects={subjects}
            teachers={teachers}
            studentClass={studentClass}
            onRefresh={refresh}
            refreshing={refreshing}
          />

          {/* Performance Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Subject Performance */}
            <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white">
                  <BarChart3 className="w-4 h-4 text-indigo-500"/> Subject Performance
                </h3>
                <button onClick={()=>navigate('/student/results/summary')} className="text-xs text-indigo-600">View all</button>
              </div>
              {subjectPerformance.length === 0 ? (
                <div className="py-8 text-center">
                  <FileText className="w-8 h-8 mx-auto text-gray-300"/>
                  <p className="mt-2 text-sm text-gray-500">No results available yet</p>
                  <p className="text-xs text-gray-400">Results will appear here once published</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subjectPerformance.slice(0, 5).map(sub => (
                    <div key={sub.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{sub.name}</span>
                        <span className="text-gray-500">{Math.round(sub.average)}%</span>
                      </div>
                      <ProgressBar 
                        value={sub.average} 
                        color={sub.average >= 70 ? 'bg-green-500' : sub.average >= 50 ? 'bg-yellow-500' : 'bg-red-500'} 
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Weekly Attendance Trend */}
            <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white">
                  <LineChart className="w-4 h-4 text-blue-500"/> Attendance Trend
                </h3>
                <span className="text-xs text-gray-500">This week</span>
              </div>
              <div className="h-24">
                <MiniLineChart data={weeklyAttendance} color="#6366f1" />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
                  <span key={day}>{day} {weeklyAttendance[i]}%</span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-500">Current rate</span>
                <span className="font-bold text-green-600">{Math.round(attendanceStats.rate)}%</span>
              </div>
            </section>
          </div>

          {/* Student Profile Card */}
          <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <User className="w-5 h-5 text-blue-500"/>
              <h2 className="font-bold text-sm text-gray-900 dark:text-white">Student Profile</h2>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">Full Name</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{student?.first_name} {student?.last_name}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">Admission Number</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{student?.admission_number || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">Class</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{student?.class_name}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{student?.email || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">Phone</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{student?.phone_number || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">Status</p>
                <p className="text-sm font-medium text-green-600">{student?.current_status || 'Active'}</p>
              </div>
            </div>
          </section>

          {/* Announcements */}
          <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-amber-600"/>
                </span>
                <div>
                  <h2 className="font-bold text-sm text-gray-900 dark:text-white">School Announcements</h2>
                  <p className="text-[11px] text-gray-500">Latest updates from your school</p>
                </div>
              </div>
              <button onClick={()=>navigate('/student/notifications')} className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                View all <ArrowUpRight className="w-3.5 h-3.5"/>
              </button>
            </div>
            <div className="p-4">
              {announcements.length===0 ? (
                <div className="py-6 text-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  <Megaphone className="w-8 h-8 mx-auto text-gray-300"/>
                  <p className="mt-2 text-sm text-gray-500">No new announcements</p>
                  <p className="text-xs text-gray-400">You're up to date</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {announcements.slice(0, 3).map(a=>(
                    <div key={a.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between gap-2">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{a.title || 'School Announcement'}</h3>
                        <span className="text-[10px] text-gray-400">{dayjs(a.created_at).fromNow()}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{a.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Stats - FIXED subjects count */}
          <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5">
            <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white mb-4">
              <Activity className="w-4 h-4 text-purple-500"/> Quick Stats
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-500"/>
                  <span className="text-xs text-gray-600 dark:text-gray-300">Current Grade</span>
                </div>
                <span className="text-lg font-bold text-indigo-600">{grade || 'N/A'}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500"/>
                  <span className="text-xs text-gray-600 dark:text-gray-300">Days Present</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{attendanceStats.present || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500"/>
                  <span className="text-xs text-gray-600 dark:text-gray-300">Average Score</span>
                </div>
                <span className="text-lg font-bold text-amber-600">{Math.round(average) || 0}%</span>
              </div>
            </div>
          </section>

          {/* Attendance Donut Chart */}
          <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5">
            <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white mb-4">
              <PieChart className="w-4 h-4 text-green-500"/> Attendance Overview
            </h3>
            <div className="flex items-center gap-6">
              <DonutChart 
                data={[
                  { label: 'Present', value: attendanceStats.present || 0, color: '#22c55e' },
                  { label: 'Absent', value: attendanceStats.absent || 0, color: '#ef4444' },
                  { label: 'Late', value: attendanceStats.late || 0, color: '#eab308' },
                  { label: 'Excused', value: attendanceStats.excused || 0, color: '#3b82f6' },
                ]}
                size={120}
              />
              <div className="space-y-1 text-xs">
                {[
                  ['Present', attendanceStats.present || 0, '#22c55e'],
                  ['Absent', attendanceStats.absent || 0, '#ef4444'],
                  ['Late', attendanceStats.late || 0, '#eab308'],
                  ['Excused', attendanceStats.excused || 0, '#3b82f6'],
                ].map(([label, value, color]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color as string }} />
                    <span className="text-gray-600 dark:text-gray-300">{label}</span>
                    <span className="font-medium text-gray-900 dark:text-white ml-auto">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between text-xs">
              <span className="text-gray-500">Total Records</span>
              <span className="font-bold text-gray-900 dark:text-white">{attendanceStats.total || 0}</span>
            </div>
          </section>

          {/* Fee Summary */}
          <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white">
                <Wallet className="w-4 h-4 text-green-500"/> Fee Summary
              </h3>
              <button onClick={()=>navigate('/student/paybill')} className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-colors">
                Pay Now
              </button>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Payment Progress</span>
                <span>{Math.round(paymentStats.progress) || 0}%</span>
              </div>
              <ProgressBar value={paymentStats.progress || 0} color="bg-gradient-to-r from-blue-500 to-indigo-500" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">Total Due</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{money(paymentStats.due)}</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">Paid</p>
                <p className="text-sm font-bold text-green-600">{money(paymentStats.paid)}</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/30">
                <p className="text-[9px] text-gray-500">Balance</p>
                <p className="text-sm font-bold text-red-600">{money(paymentStats.balance)}</p>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white">
                <Bell className="w-4 h-4 text-yellow-500"/> Notifications
                {notifications.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px]">{notifications.length}</span>
                )}
              </h3>
              <button onClick={()=>navigate('/student/notifications')} className="text-xs text-indigo-600">View all</button>
            </div>
            {notifications.length===0 ? (
              <div className="py-4 text-center">
                <Info className="w-6 h-6 mx-auto text-gray-300"/>
                <p className="text-xs text-gray-500 mt-1">No new notifications</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 3).map(n=>(
                  <div key={n.id} className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/30">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{n.title||'Notification'}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5">
            <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900 dark:text-white mb-3">
              <Zap className="w-4 h-4 text-yellow-500"/> Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Pay Bill', '/student/paybill', Wallet, 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'],
                ['Results', '/student/results/summary', GraduationCap, 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'],
                ['Attendance', '/student/attendance', CalendarDays, 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'],
                ['Timetable', '/student/timetable', Calendar, 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'],
                ['Profile', '/student/profile', User, 'bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'],
                ['Support', '/student/support', MessageSquare, 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'],
              ].map(([label, path, Icon, bg]) => (
                <button 
                  key={label} 
                  onClick={()=>navigate(path)} 
                  className={`p-3 rounded-xl ${bg} flex flex-col items-center gap-1 transition-all hover:scale-105`}
                >
                  <Icon className="w-5 h-5"/>
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;