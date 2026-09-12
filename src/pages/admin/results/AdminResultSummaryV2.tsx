import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Save, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { resolveAssessmentGroup } from '../../../utils/results/assessmentGroups';

type Session = { id: string; session_name: string; term_name: string | null; branch_id: string };
type Term = { id: string; session: string; term: string; is_active: boolean; is_closed: boolean };
type ClassRow = { id: string; name: string; branch_id: string; level: string | null; department: string | null; academic_session: string | null };
type Student = { id: string; first_name: string; last_name: string; admission_number: string | null };
type Batch = { id: string; subject_id: string; assessment_type: string; max_score: number; subject?: { name?: string | null } | null };
type Row = Student & { total: number; max: number; percentage: number; grade: string; remark: string; position: number; attendance: any };

const normalise = (v: string | null | undefined) => (v || '').trim().toLowerCase().replace(/\s+/g, ' ');
const gradeFrom = (p: number, bands: any[]) => { const hit = bands.find(x => p >= Number(x.min) && p <= Number(x.max)); return hit?.grade || (p >= 75 ? 'A' : p >= 65 ? 'B' : p >= 55 ? 'C' : p >= 45 ? 'D' : p >= 40 ? 'E' : 'F'); };
const remarkFrom = (p: number, bands: any[]) => bands.find(x => p >= Number(x.min) && p <= Number(x.max))?.remark || (p >= 75 ? 'Excellent' : p >= 65 ? 'Very Good' : p >= 55 ? 'Good' : p >= 45 ? 'Fair' : p >= 40 ? 'Pass' : 'Needs Improvement');

export default function AdminResultSummaryV2() {
  const [session, setSession] = useState<Session | null>(null);
  const [term, setTerm] = useState<Term | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const selectedClass = useMemo(() => classes.find(x => x.id === classId) || null, [classes, classId]);

  const loadContext = useCallback(async () => {
    setLoading(true);
    try {
      const { data: s, error: se } = await supabase.from('academic_sessions').select('id,session_name,term_name,branch_id').eq('is_current', true).order('start_date', { ascending: false }).limit(1).maybeSingle();
      if (se) throw se; if (!s) throw new Error('No current academic session is configured.');
      setSession(s as Session);
      const { data: terms, error: te } = await supabase.from('terms').select('id,session,term,is_active,is_closed').eq('session', s.session_name).order('start_date', { ascending: false });
      if (te) throw te;
      const current = (terms || []).find(t => t.is_active && normalise(t.term) === normalise(s.term_name)) || (terms || []).find(t => t.is_active) || terms?.[0];
      if (!current) throw new Error('No term is configured for the current session.');
      setTerm(current as Term);
      const { data: c, error: ce } = await supabase.from('classes').select('id,name,branch_id,level,department,academic_session').eq('status', 'active').order('name');
      if (ce) throw ce;
      setClasses(((c || []) as ClassRow[]).filter(x => !x.academic_session || normalise(x.academic_session) === normalise(s.session_name)));
    } catch (e: any) { toast.error(e.message || 'Unable to load result summary context.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadContext(); }, [loadContext]);

  const generate = useCallback(async () => {
    if (!session || !term || !selectedClass) return;
    setWorking(true);
    try {
      const [{ data: students, error: studentError }, { data: batches, error: batchError }] = await Promise.all([
        supabase.from('students').select('id,first_name,last_name,admission_number').eq('class_id', selectedClass.id).eq('session_id', session.id).eq('current_status', 'active').order('last_name').order('first_name'),
        supabase.from('result_batches').select('id,subject_id,assessment_type,max_score,subjects:subject_id(name)').eq('academic_session_id', session.id).eq('term_id', term.id).eq('class_id', selectedClass.id).in('assessment_type', ['test','first_test','second_test','continuous_assessment','exam','cbt','assignment']).order('created_at', { ascending: false })
      ]);
      if (studentError) throw studentError; if (batchError) throw batchError;
      const list = (students || []) as Student[]; const allBatches = (batches || []) as any as Batch[];
      if (!list.length) { setRows([]); return; }
      const ids = allBatches.map(x => x.id);
      const { data: entries, error: entryError } = ids.length ? await supabase.from('result_entries').select('batch_id,student_id,score').in('batch_id', ids) : { data: [], error: null };
      if (entryError) throw entryError;
      const map = new Map((entries || []).map((x: any) => [`${x.student_id}:${x.batch_id}`, Number(x.score)]));
      const group = resolveAssessmentGroup({ id: selectedClass.id, name: selectedClass.name, level: selectedClass.level, department: selectedClass.department });
      const { data: config } = await supabase.from('result_assessment_configs').select('grading_system,total_max').eq('academic_session_id', session.id).eq('term_id', term.id).eq('academic_group', group).eq('status', 'active').maybeSingle();
      const bands = Array.isArray(config?.grading_system) ? config.grading_system : [];
      const latest = new Map<string, Batch>();
      for (const b of allBatches) { const key = `${b.subject_id}:${b.assessment_type}`; if (!latest.has(key)) latest.set(key, b); }
      const bySubject = new Map<string, Batch[]>();
      latest.forEach(b => { const listForSubject = bySubject.get(b.subject_id) || []; listForSubject.push(b); bySubject.set(b.subject_id, listForSubject); });
      const calculated: Row[] = [];
      for (const student of list) {
        let total = 0; let max = 0;
        bySubject.forEach(subjectBatches => subjectBatches.forEach(b => { max += Number(b.max_score || 0); total += Number(map.get(`${student.id}:${b.id}`) || 0); }));
        const percentage = max ? total / max * 100 : 0;
        const attendanceResult = await supabase.rpc('get_student_term_attendance', { p_student_id: student.id, p_academic_session_id: session.id, p_term_id: term.id });
        calculated.push({ ...student, total, max, percentage, grade: gradeFrom(percentage, bands), remark: remarkFrom(percentage, bands), position: 0, attendance: attendanceResult.data || {} });
      }
      calculated.sort((a, b) => b.percentage - a.percentage || b.total - a.total || `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));
      let previous: number | null = null; let position = 0;
      calculated.forEach((r, i) => { if (previous === null || r.percentage < previous) position = i + 1; r.position = position; previous = r.percentage; });
      setRows(calculated);
    } catch (e: any) { toast.error(e.message || 'Unable to generate result summaries.'); setRows([]); }
    finally { setWorking(false); }
  }, [session, term, selectedClass]);

  useEffect(() => { if (classId) void generate(); else setRows([]); }, [classId, generate]);

  async function save() {
    if (!session || !term || !selectedClass || !rows.length) return;
    setWorking(true);
    try {
      const payload = rows.map(r => ({ branch_id: selectedClass.branch_id, student_id: r.id, class_id: selectedClass.id, term: term.term, session: session.session_name, total_subjects: 0, total_score: r.total, total_max_score: r.max, average_percentage: r.percentage, grade: r.grade, position: r.position, remark: r.remark, attendance: r.attendance, generated_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
      const { error } = await supabase.from('result_summaries').upsert(payload, { onConflict: 'student_id,class_id,session,term' });
      if (error) throw error;
      toast.success(`Saved ${payload.length} official result summaries. Attendance and director comments were generated automatically.`);
      await generate();
    } catch (e: any) { toast.error(e.message || 'Unable to save result summaries.'); }
    finally { setWorking(false); }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  return <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-6">
    <section className="rounded-3xl bg-gradient-to-br from-indigo-700 to-violet-700 p-6 text-white"><p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Results control</p><h1 className="mt-2 text-3xl">Official Result Summary</h1><p className="mt-2 text-sm text-indigo-100">Test 1, Test 2, CA and Exam are combined using the configured maximums. Attendance, grading and director comments are generated automatically when summaries are saved.</p></section>
    <section className="grid gap-4 rounded-3xl border bg-white p-5 shadow-sm md:grid-cols-[1fr_auto_auto] dark:border-slate-700 dark:bg-slate-800"><label>Class<select value={classId} onChange={e => setClassId(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"><option value="">Select class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button onClick={() => void generate()} disabled={!classId || working} className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl border px-5 disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Refresh</button><button onClick={() => void save()} disabled={!rows.length || working} className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-white disabled:opacity-50"><Save className="h-4 w-4" /> Save official summaries</button></section>
    <section className="overflow-hidden rounded-3xl border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center gap-2 border-b p-5"><Users className="h-5 w-5 text-indigo-600" /><div><div>Student performance</div><p className="text-sm text-slate-500">{selectedClass?.name || 'Select a class'} · {session?.session_name || '—'} · {term?.term || '—'}</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead><tr className="bg-slate-900 text-white"><th className="p-3 text-left">Pos.</th><th className="p-3 text-left">Student</th><th className="p-3">Score / Max</th><th className="p-3">%</th><th className="p-3">Grade</th><th className="p-3">Remark</th><th className="p-3">Days Opened</th><th className="p-3">Present</th><th className="p-3">Absent</th><th className="p-3">Attendance</th></tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-t dark:border-slate-700"><td className="p-3">{r.position}</td><td className="p-3">{r.last_name} {r.first_name}<div className="text-xs text-slate-500">{r.admission_number || '—'}</div></td><td className="p-3 text-center">{r.total.toFixed(1)} / {r.max.toFixed(1)}</td><td className="p-3 text-center">{r.percentage.toFixed(1)}%</td><td className="p-3 text-center">{r.grade}</td><td className="p-3">{r.remark}</td><td className="p-3 text-center">{r.attendance?.school_days_opened ?? 0}</td><td className="p-3 text-center">{r.attendance?.days_present ?? 0}</td><td className="p-3 text-center">{r.attendance?.days_absent ?? 0}</td><td className="p-3 text-center">{Number(r.attendance?.attendance_percentage || 0).toFixed(1)}%</td></tr>)}</tbody></table></div></section>
  </div>;
}
