import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, BarChart3, CheckCircle2, ClipboardCheck, Loader2, RefreshCw, Save, Users, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

type Session = { id: string; session_name: string; term_name: string | null };
type Term = { id: string; session: string; term: string; is_active: boolean; is_closed: boolean };
type ClassRow = { id: string; name: string; branch_id: string | null };
type Student = { id: string; first_name: string; last_name: string; admission_number: string | null };
type Batch = { id: string; subject_id: string; assessment_type: 'first_test' | 'second_test' | 'exam'; max_score: number; subject?: { name?: string | null } | null };
type Entry = { batch_id: string; student_id: string; score: number | null };
type StudentSummary = { student: Student; total: number; subjectCount: number; average: number; grade: string; remark: string; position?: number; published?: boolean };

const normalise = (value: string | null | undefined) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const grade = (value: number) => value >= 75 ? 'A' : value >= 65 ? 'B' : value >= 55 ? 'C' : value >= 45 ? 'D' : value >= 40 ? 'E' : 'F';
const remark = (value: number) => value >= 75 ? 'Excellent' : value >= 65 ? 'Very Good' : value >= 55 ? 'Good' : value >= 45 ? 'Fair' : value >= 40 ? 'Pass' : 'Needs Improvement';

export default function AdminResultSummary() {
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [term, setTerm] = useState<Term | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedCount, setPublishedCount] = useState(0);

  const selectedClass = useMemo(() => classes.find((item) => item.id === classId) || null, [classes, classId]);

  const loadContext = useCallback(async () => {
    setLoading(true);
    try {
      const { data: currentSession, error: sessionError } = await supabase.from('academic_sessions').select('id,session_name,term_name').eq('is_current', true).order('start_date', { ascending: false }).limit(1).maybeSingle();
      if (sessionError) throw sessionError;
      if (!currentSession) throw new Error('No current academic session is configured.');
      setSession(currentSession);

      const { data: terms, error: termError } = await supabase.from('terms').select('id,session,term,is_active,is_closed').eq('is_active', true).eq('is_closed', false).order('start_date', { ascending: false });
      if (termError) throw termError;
      const currentTerm = (terms || []).find((item) => normalise(item.session) === normalise(currentSession.session_name) && normalise(item.term) === normalise(currentSession.term_name));
      if (!currentTerm) throw new Error(`No active term matches ${currentSession.session_name} / ${currentSession.term_name || 'current term'}.`);
      setTerm(currentTerm);

      const { data: classData, error: classError } = await supabase.from('classes').select('id,name,branch_id,academic_session').eq('status', 'active').order('name');
      if (classError) throw classError;
      setClasses((classData || []).filter((item: any) => !item.academic_session || normalise(item.academic_session) === normalise(currentSession.session_name)));
    } catch (error: any) {
      toast.error(error.message || 'Unable to load result context.');
      setSession(null);
      setTerm(null);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadContext(); }, [loadContext]);

  const generate = useCallback(async () => {
    if (!session || !term || !selectedClass) {
      toast.error('Select a class first.');
      return;
    }
    setGenerating(true);
    try {
      const [{ data: studentData, error: studentError }, { data: batchData, error: batchError }] = await Promise.all([
        supabase.from('students').select('id,first_name,last_name,admission_number').eq('class_id', selectedClass.id).eq('session_id', session.id).eq('current_status', 'active').order('last_name').order('first_name'),
        supabase.from('result_batches').select('id,subject_id,assessment_type,max_score,subjects:subject_id(name)').eq('academic_session_id', session.id).eq('term_id', term.id).eq('class_id', selectedClass.id).in('assessment_type', ['first_test', 'second_test', 'exam']),
      ]);
      if (studentError) throw studentError;
      if (batchError) throw batchError;
      const activeStudents = (studentData || []) as Student[];
      const currentBatches = (batchData || []) as any as Batch[];
      setBatches(currentBatches);
      if (!activeStudents.length) {
        setStudents([]);
        toast.info('There are no active students in this class for the current session.');
        return;
      }
      if (!currentBatches.length) {
        setStudents([]);
        toast.info('No Test 1, Test 2 or Exam batches have been entered for this class yet.');
        return;
      }

      const batchIds = currentBatches.map((item) => item.id);
      const { data: entryData, error: entryError } = await supabase.from('result_entries').select('batch_id,student_id,score').in('batch_id', batchIds);
      if (entryError) throw entryError;
      const entries = (entryData || []) as Entry[];
      const entryMap = new Map(entries.map((entry) => [`${entry.student_id}:${entry.batch_id}`, entry.score == null ? null : Number(entry.score)]));

      const computed = activeStudents.map((student) => {
        const subjectIds = new Set(currentBatches.map((batch) => batch.subject_id));
        let total = 0;
        let subjectCount = 0;
        subjectIds.forEach((subjectId) => {
          const subjectBatches = currentBatches.filter((batch) => batch.subject_id === subjectId);
          const hasAny = subjectBatches.some((batch) => entryMap.get(`${student.id}:${batch.id}`) != null);
          if (!hasAny) return;
          const subjectTotal = subjectBatches.reduce((sum, batch) => sum + Number(entryMap.get(`${student.id}:${batch.id}`) || 0), 0);
          total += subjectTotal;
          subjectCount += 1;
        });
        const average = subjectCount ? total / subjectCount : 0;
        return { student, total, subjectCount, average, grade: grade(average), remark: remark(average) };
      }).filter((item) => item.subjectCount > 0).sort((a, b) => b.average - a.average || b.total - a.total || `${a.student.last_name} ${a.student.first_name}`.localeCompare(`${b.student.last_name} ${b.student.first_name}`));

      let previousAverage: number | null = null;
      let currentPosition = 0;
      const ranked = computed.map((item, index) => {
        if (previousAverage === null || item.average < previousAverage) currentPosition = index + 1;
        previousAverage = item.average;
        return { ...item, position: currentPosition };
      });

      const existingIds = ranked.map((item) => item.student.id);
      const { data: existingSummaries } = await supabase.from('result_summaries').select('id,student_id,published').eq('class_id', selectedClass.id).eq('session', session.session_name).eq('term', term.term).in('student_id', existingIds);
      const existingMap = new Map((existingSummaries || []).map((item: any) => [item.student_id, item]));
      setStudents(ranked.map((item) => ({ ...item, published: existingMap.get(item.student.id)?.published || false })));
      setPublishedCount((existingSummaries || []).filter((item: any) => item.published).length);
    } catch (error: any) {
      toast.error(error.message || 'Unable to generate the cumulative summary.');
      setStudents([]);
    } finally {
      setGenerating(false);
    }
  }, [session, term, selectedClass]);

  useEffect(() => { if (classId) void generate(); else { setStudents([]); setBatches([]); } }, [classId, generate]);

  const saveSummaries = async () => {
    if (!user?.id || !session || !term || !selectedClass || !students.length) return;
    setGenerating(true);
    try {
      const existing = await supabase.from('result_summaries').select('id,student_id').eq('class_id', selectedClass.id).eq('session', session.session_name).eq('term', term.term);
      if (existing.error) throw existing.error;
      const ids = new Map((existing.data || []).map((item: any) => [item.student_id, item.id]));
      const rows = students.map((item) => ({
        ...(ids.get(item.student.id) ? { id: ids.get(item.student.id) } : {}),
        branch_id: selectedClass.branch_id,
        student_id: item.student.id,
        class_id: selectedClass.id,
        term: term.term,
        session: session.session_name,
        total_subjects: item.subjectCount,
        total_score: item.total,
        total_max_score: item.subjectCount * 100,
        average_percentage: item.average,
        grade: item.grade,
        position: item.position,
        remark: item.remark,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('result_summaries').upsert(rows);
      if (error) throw error;
      toast.success(`Saved ${rows.length} cumulative result summaries.`);
      await generate();
    } catch (error: any) {
      toast.error(error.message || 'Unable to save result summaries.');
    } finally {
      setGenerating(false);
    }
  };

  const publish = async () => {
    if (!session || !term || !selectedClass || !students.length) return;
    setPublishing(true);
    try {
      const { error } = await supabase.from('result_summaries').update({ published: true, published_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('class_id', selectedClass.id).eq('session', session.session_name).eq('term', term.term);
      if (error) throw error;
      toast.success('Official result summaries published for this class.');
      await generate();
    } catch (error: any) {
      toast.error(error.message || 'Unable to publish summaries.');
    } finally {
      setPublishing(false);
    }
  };

  const stats = useMemo(() => {
    const values = students.map((item) => item.average);
    return { count: students.length, average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0, highest: values.length ? Math.max(...values) : 0, lowest: values.length ? Math.min(...values) : 0 };
  }, [students]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-800 p-6 text-white shadow-xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">Academic Results Control</p>
          <h1 className="mt-2 text-3xl font-black md:text-4xl">Cumulative Result Summary</h1>
          <p className="mt-2 max-w-2xl text-sm text-indigo-100">Generate positions and official summaries from Test 1, Test 2 and Exam entries for the current academic session. No historical session or branch is hardcoded.</p>
        </section>
        <section className="grid grid-cols-2 gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-500">Current session</p><p className="mt-1 font-black">{session?.session_name || '—'}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-500">Current term</p><p className="mt-1 font-black">{term?.term || '—'}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-500">Students with results</p><p className="mt-1 font-black">{stats.count}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-500">Published</p><p className="mt-1 font-black">{publishedCount}</p></div>
        </section>
      </div>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_auto_auto] dark:border-slate-700 dark:bg-slate-800">
        <label className="text-sm font-semibold">Class<select value={classId} onChange={(event) => setClassId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-600 dark:bg-slate-900"><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <button onClick={() => void generate()} disabled={!classId || generating} className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 font-bold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} /> Refresh</button>
        <button onClick={() => void saveSummaries()} disabled={!students.length || generating} className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" /> Save summaries</button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Users />} label="Students" value={stats.count} />
        <Stat icon={<BarChart3 />} label="Class average" value={`${stats.average.toFixed(1)}%`} />
        <Stat icon={<Award />} label="Highest" value={`${stats.highest.toFixed(1)}%`} />
        <Stat icon={<ClipboardCheck />} label="Lowest" value={`${stats.lowest.toFixed(1)}%`} />
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-700"><div><h2 className="text-lg font-black">Class Ranking</h2><p className="text-sm text-slate-500">{selectedClass?.name || 'Select a class'} • {batches.length} assessment batches loaded</p></div><button onClick={() => void publish()} disabled={!students.length || publishing} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />{publishing ? 'Publishing…' : 'Publish official results'}</button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50 text-left dark:bg-slate-900"><tr><th className="p-4">Position</th><th className="p-4">Student</th><th className="p-4">Admission No.</th><th className="p-4">Subjects</th><th className="p-4">Total</th><th className="p-4">Average</th><th className="p-4">Grade</th><th className="p-4">Remark</th><th className="p-4">Published</th></tr></thead><tbody>{students.map((item) => <tr key={item.student.id} className="border-t border-slate-100 dark:border-slate-700"><td className="p-4 font-black">{item.position}</td><td className="p-4 font-semibold">{item.student.last_name} {item.student.first_name}</td><td className="p-4 text-slate-500">{item.student.admission_number || '—'}</td><td className="p-4">{item.subjectCount}</td><td className="p-4 font-bold">{item.total.toFixed(1)}</td><td className="p-4 font-black">{item.average.toFixed(1)}%</td><td className="p-4 font-black">{item.grade}</td><td className="p-4">{item.remark}</td><td className="p-4">{item.published ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-slate-300" />}</td></tr>)}{!students.length && <tr><td colSpan={9} className="p-16 text-center text-slate-500">Select a class to generate its current-session cumulative result.</td></tr>}</tbody></table></div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30">{React.cloneElement(icon as React.ReactElement, { className: 'h-5 w-5' })}</div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>; }
