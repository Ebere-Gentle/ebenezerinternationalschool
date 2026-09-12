import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardList, Loader2, Save, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';
import { resolveAssessmentGroup, type AssessmentGroup } from '../../../utils/results/assessmentGroups';

type AssessmentType = 'first_test' | 'second_test' | 'ca' | 'exam';
type Props = { assessmentType: AssessmentType };
type Session = { id: string; session_name: string; term_name: string | null; is_current: boolean };
type Term = { id: string; session: string; term: string; is_active: boolean; is_closed: boolean };
type ClassRow = { id: string; name: string; branch_id: string | null; academic_session: string | null; level: string | null; department: string | null };
type Subject = { id: string; name: string; code?: string | null };
type Student = { id: string; first_name: string; last_name: string; admission_number: string | null; class_id: string };
type Config = { maximum: number; total_max: number; components: any[] };

const labels: Record<AssessmentType, string> = { first_test: 'Test 1', second_test: 'Test 2', ca: 'CA', exam: 'Exam' };
const normalise = (value: string | null | undefined) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const batchType = (type: AssessmentType) => type === 'ca' ? 'continuous_assessment' : type;

export default function AdminResultEntry({ assessmentType }: Props) {
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [term, setTerm] = useState<Term | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [assessmentGroup, setAssessmentGroup] = useState<AssessmentGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const selectedClass = useMemo(() => classes.find(x => x.id === classId) || null, [classes, classId]);
  const selectedSubject = useMemo(() => subjects.find(x => x.id === subjectId) || null, [subjects, subjectId]);
  const maximum = config?.maximum || 0;

  const loadContext = useCallback(async () => {
    setLoading(true);
    try {
      const { data: currentSession, error: se } = await supabase.from('academic_sessions').select('id,session_name,term_name,is_current').eq('is_current', true).order('start_date', { ascending: false }).limit(1).maybeSingle();
      if (se) throw se;
      if (!currentSession) throw new Error('No current academic session is configured.');
      setSession(currentSession);
      const { data: activeTerms, error: te } = await supabase.from('terms').select('id,session,term,is_active,is_closed').eq('is_active', true).order('start_date', { ascending: false });
      if (te) throw te;
      const currentTerm = (activeTerms || []).find(x => normalise(x.session) === normalise(currentSession.session_name) && normalise(x.term).replace('first', '1st').replace('second', '2nd').replace('third', '3rd') === normalise(currentSession.term_name).replace('first', '1st').replace('second', '2nd').replace('third', '3rd'));
      if (!currentTerm) throw new Error(`No active term matches ${currentSession.session_name} / ${currentSession.term_name}.`);
      setTerm(currentTerm);
      const { data: classData, error: ce } = await supabase.from('classes').select('id,name,branch_id,academic_session,level,department').eq('status', 'active').order('name');
      if (ce) throw ce;
      const order = (name: string) => { const v = normalise(name); if (v.includes('nursery')) return 10; if (v.includes('kg silver')) return 20; if (v.includes('kg gold')) return 30; if (v.includes('transition') || v.includes('grader')) return 40; const g = v.match(/(?:grade|primary)\s*(\d+)/); if (g) return 50 + Number(g[1]); const j = v.match(/jss\s*(\d+)/); if (j) return 60 + Number(j[1]); const s = v.match(/ss\s*(\d+)/); if (s) return 70 + Number(s[1]); if (v.includes('graduate')) return 100; return 90; };
      setClasses(((classData || []) as ClassRow[]).sort((a, b) => order(a.name) - order(b.name) || a.name.localeCompare(b.name)));
    } catch (e: any) { toast.error(e.message || 'Unable to load result context.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadContext(); }, [loadContext]);

  useEffect(() => {
    if (!selectedClass || !session || !term) { setConfig(null); setAssessmentGroup(null); return; }
    const group = resolveAssessmentGroup({ id: selectedClass.id, name: selectedClass.name, level: selectedClass.level, department: selectedClass.department });
    setAssessmentGroup(group);
    void (async () => {
      const { data, error } = await supabase.from('result_assessment_configs').select('total_max,components,first_test_max,second_test_max,exam_max').eq('academic_session_id', session.id).eq('term_id', term.id).eq('academic_group', group).eq('status', 'active').maybeSingle();
      if (error) { toast.error(error.message); setConfig(null); return; }
      if (!data) { setConfig(null); return; }
      const components = Array.isArray(data.components) ? data.components : [];
      const fallback: Record<string, number> = { first_test: Number(data.first_test_max || 0), second_test: Number(data.second_test_max || 0), ca: 0, exam: Number(data.exam_max || 0) };
      const maximumFor = (key: string) => Number(components.find((item: any) => item?.key === key)?.max_score ?? fallback[key] ?? 0);
      setConfig({ maximum: maximumFor(assessmentType), total_max: Number(data.total_max || 0), components });
    })();
  }, [assessmentType, selectedClass, session, term]);

  const loadRegister = useCallback(async () => {
    if (!classId) { setStudents([]); setSubjects([]); setScores({}); return; }
    try {
      const [studentResult, assignmentResult] = await Promise.all([
        supabase.from('students').select('id,first_name,last_name,admission_number,class_id').eq('class_id', classId).eq('current_status', 'active').order('last_name').order('first_name'),
        supabase.from('class_subjects').select('subject_id,subjects(id,name,code)').eq('class_id', classId).eq('status', 'active')
      ]);
      if (studentResult.error) throw studentResult.error;
      if (assignmentResult.error) throw assignmentResult.error;
      setStudents((studentResult.data || []) as Student[]);
      setSubjects((assignmentResult.data || []).flatMap((x: any) => x.subjects ? [x.subjects] : []));
      setSubjectId(''); setScores({});
    } catch (e: any) { toast.error(e.message || 'Unable to load class register.'); }
  }, [classId]);

  useEffect(() => { void loadRegister(); }, [loadRegister]);

  useEffect(() => {
    if (!session || !term || !classId || !subjectId) return;
    void (async () => {
      const { data: batch, error } = await supabase.from('result_batches').select('id').eq('academic_session_id', session.id).eq('term_id', term.id).eq('class_id', classId).eq('subject_id', subjectId).eq('assessment_type', batchType(assessmentType)).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) return toast.error(error.message);
      if (!batch) return setScores({});
      const { data: entries, error: ee } = await supabase.from('result_entries').select('student_id,score').eq('batch_id', batch.id);
      if (ee) return toast.error(ee.message);
      setScores(Object.fromEntries((entries || []).map((x: any) => [x.student_id, x.score == null ? '' : String(x.score)])));
    })();
  }, [assessmentType, classId, session, subjectId, term]);

  const parseScore = (raw: string) => raw.trim() === '' ? null : Number(raw);
  const validScore = (raw: string, max: number) => { const value = parseScore(raw); return value !== null && Number.isInteger(value) && value >= 1 && value <= max; };

  async function save() {
    if (!user?.id || !session || !term || !config || !selectedClass || !selectedSubject || !students.length) return toast.error('Complete the session, class, subject and register first.');
    if (!Number.isInteger(maximum) || maximum <= 0) return toast.error(`${labels[assessmentType]} maximum must be a positive whole number.`);
    const invalid = students.find(s => !validScore(scores[s.id] ?? '', maximum));
    if (invalid) return toast.error(`${invalid.first_name} ${invalid.last_name}: enter a whole-number score from 1 to ${maximum}. Decimals and zero are not accepted.`);
    setSaving(true);
    try {
      const type = batchType(assessmentType);
      const { data: existing, error: le } = await supabase.from('result_batches').select('id,status').eq('academic_session_id', session.id).eq('term_id', term.id).eq('class_id', selectedClass.id).eq('subject_id', selectedSubject.id).eq('assessment_type', type).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (le) throw le;
      if (existing?.status === 'locked' || existing?.status === 'published') return toast.error('This result component is locked or published.');
      let batchId = existing?.id;
      if (batchId) {
        const { error } = await supabase.from('result_batches').update({ branch_id: selectedClass.branch_id, title: `${labels[assessmentType]} — ${selectedSubject.name}`, max_score: maximum, weight: maximum, updated_at: new Date().toISOString() }).eq('id', batchId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase.from('result_batches').insert({ branch_id: selectedClass.branch_id, academic_session_id: session.id, term_id: term.id, class_id: selectedClass.id, subject_id: selectedSubject.id, assessment_type: type, title: `${labels[assessmentType]} — ${selectedSubject.name}`, max_score: maximum, weight: maximum, assessment_date: new Date().toISOString().slice(0, 10), entered_by: user.id, status: 'draft' }).select('id').single();
        if (error) throw error;
        batchId = created.id;
      }
      const rows = students.map(s => { const score = Number(scores[s.id]); const percentage = score / maximum * 100; return { batch_id: batchId, student_id: s.id, score, percentage, grade: percentage >= 75 ? 'A' : percentage >= 65 ? 'B' : percentage >= 55 ? 'C' : percentage >= 45 ? 'D' : percentage >= 40 ? 'E' : 'F', remark: percentage >= 75 ? 'Excellent' : percentage >= 65 ? 'Very Good' : percentage >= 55 ? 'Good' : percentage >= 45 ? 'Fair' : percentage >= 40 ? 'Pass' : 'Needs Improvement', entered_by: user.id, updated_by: user.id }; });
      const { error } = await supabase.from('result_entries').upsert(rows, { onConflict: 'batch_id,student_id' });
      if (error) throw error;
      toast.success(`${labels[assessmentType]} saved for ${selectedSubject.name}.`);
    } catch (e: any) { toast.error(e.message || 'Unable to save results.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></div>;
  return <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-6">
    <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]"><div className="rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Administrator · Result Entry</p><h1 className="mt-2 text-3xl md:text-4xl">{labels[assessmentType]} Results</h1><p className="mt-2 text-sm text-indigo-100">Whole-number scores only. Minimum 1 and maximum {maximum || 'configured maximum'}.</p></div><ClipboardList className="hidden h-12 w-12 opacity-30 sm:block" /></div></div><div className="grid grid-cols-2 gap-3 rounded-3xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><CalendarDays className="mb-2 h-5 w-5 text-indigo-600" /><p className="text-xs text-slate-500">Session</p><p>{session?.session_name || '—'}</p></div><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" /><p className="text-xs text-slate-500">Term</p><p>{term?.term || session?.term_name || '—'}</p></div></div></section>
    <section className="grid gap-4 lg:grid-cols-[1fr_1fr_260px]"><label className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">Class<select value={classId} onChange={e => { setClassId(e.target.value); setSubjectId(''); }} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"><option value="">Select class</option>{classes.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">Subject<select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId} className="mt-2 w-full rounded-xl border px-3 py-3 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900"><option value="">Select subject</option>{subjects.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><div className="rounded-2xl border bg-gradient-to-br from-indigo-50 to-violet-50 p-4 shadow-sm dark:border-slate-700 dark:from-indigo-950/30 dark:to-violet-950/30"><p className="text-xs uppercase text-slate-500">Maximum</p><p className="mt-1 text-3xl">{maximum || '—'}</p><p className="text-xs text-slate-500">{assessmentGroup ? `${assessmentGroup.replace('_', ' ')} scheme` : 'Select a class'}</p></div></section>
    {!config && classId && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No active assessment scheme is configured for this class group.</div>}
    <section className="overflow-hidden rounded-3xl border bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"><div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700"><div><div className="flex items-center gap-2"><Users className="h-5 w-5 text-indigo-600" /> Student Mark Sheet</div><p className="mt-1 text-sm text-slate-500">{students.length} student(s) · valid whole-number range 1–{maximum || '—'}</p></div><button type="button" onClick={() => void save()} disabled={saving || !subjectId || !students.length || !maximum} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save marks'}</button></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-900"><tr><th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">Student</th><th className="px-4 py-3 text-left">Admission No.</th><th className="px-4 py-3">Mark / {maximum || '—'}</th><th className="px-4 py-3">%</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{students.map((s, i) => { const raw = scores[s.id] ?? ''; const value = raw === '' ? null : Number(raw); const valid = value !== null && Number.isInteger(value) && value >= 1 && value <= maximum; const p = valid ? value! / maximum * 100 : null; const grade = p === null ? '—' : p >= 75 ? 'A' : p >= 65 ? 'B' : p >= 55 ? 'C' : p >= 45 ? 'D' : p >= 40 ? 'E' : 'F'; return <tr key={s.id} className="border-t dark:border-slate-700"><td className="px-4 py-3">{i + 1}</td><td className="px-4 py-3">{s.last_name} {s.first_name}</td><td className="px-4 py-3">{s.admission_number || '—'}</td><td className="px-4 py-3"><input aria-label={`${s.first_name} mark`} type="number" min={1} max={maximum || undefined} step={1} value={raw} onChange={e => { const next = e.target.value; if (next === '' || /^\d+$/.test(next)) setScores(cur => ({ ...cur, [s.id]: next })); }} disabled={!subjectId || !maximum} className={`w-28 rounded-xl border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 ${raw !== '' && !valid ? 'border-red-500 ring-1 ring-red-200' : ''}`} placeholder="1+" inputMode="numeric" /></td><td className="px-4 py-3">{p === null ? '—' : p.toFixed(1)}</td><td className="px-4 py-3">{grade}</td><td className="px-4 py-3">{raw === '' ? 'Pending' : valid ? 'Ready' : 'Invalid — whole number 1 to ' + maximum}</td></tr>; })}</tbody></table>{!students.length && <div className="p-10 text-center text-slate-500">{classId ? 'No active students are assigned to this class.' : 'Select a class to load the student register.'}</div>}</div></section>
  </div>;
}
