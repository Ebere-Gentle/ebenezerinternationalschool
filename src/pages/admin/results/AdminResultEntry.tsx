import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardList, Loader2, Save, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';
import { resolveAssessmentGroup, type AssessmentGroup } from '../../../utils/results/assessmentGroups';

type AssessmentType = 'first_test' | 'second_test' | 'exam';
type Props = { assessmentType: AssessmentType };
type Session = { id: string; session_name: string; term_name: string | null; is_current: boolean };
type Term = { id: string; session: string; term: string; is_active: boolean; is_closed: boolean };
type ClassRow = { id: string; name: string; branch_id: string | null; academic_session: string | null; level: string | null; department: string | null };
type Subject = { id: string; name: string; code?: string | null };
type Student = { id: string; first_name: string; last_name: string; admission_number: string | null; class_id: string };
type Config = { first_test_max: number; second_test_max: number; exam_max: number; total_max: number };

const labels: Record<AssessmentType, string> = { first_test: 'Test 1', second_test: 'Test 2', exam: 'Exam' };
const configKey = (type: AssessmentType): keyof Config => ({ first_test: 'first_test_max', second_test: 'second_test_max', exam: 'exam_max' }[type]);
const grade = (percentage: number) => percentage >= 75 ? 'A' : percentage >= 65 ? 'B' : percentage >= 55 ? 'C' : percentage >= 45 ? 'D' : percentage >= 40 ? 'E' : 'F';
const normalise = (value: string | null | undefined) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

export default function AdminResultEntry({ assessmentType }: Props) {
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null), [term, setTerm] = useState<Term | null>(null), [config, setConfig] = useState<Config | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]), [subjects, setSubjects] = useState<Subject[]>([]), [students, setStudents] = useState<Student[]>([]);
  const [classId, setClassId] = useState(''), [subjectId, setSubjectId] = useState(''), [scores, setScores] = useState<Record<string, string>>({});
  const [assessmentGroup, setAssessmentGroup] = useState<AssessmentGroup | null>(null), [loading, setLoading] = useState(true), [loadingRegister, setLoadingRegister] = useState(false), [saving, setSaving] = useState(false);
  const selectedClass = useMemo(() => classes.find(item => item.id === classId) || null, [classes, classId]);
  const selectedSubject = useMemo(() => subjects.find(item => item.id === subjectId) || null, [subjects, subjectId]);
  const maximum = config ? Number(config[configKey(assessmentType)]) : 0;
  const enteredCount = students.filter(student => scores[student.id] !== '' && scores[student.id] != null).length;

  const loadContext = useCallback(async () => {
    setLoading(true);
    try {
      const { data: currentSession, error: sessionError } = await supabase.from('academic_sessions').select('id,session_name,term_name,is_current').eq('is_current', true).order('start_date', { ascending: false }).limit(1).maybeSingle();
      if (sessionError) throw sessionError;
      if (!currentSession) throw new Error('No current academic session is configured.');
      setSession(currentSession);
      const { data: activeTerms, error: termError } = await supabase.from('terms').select('id,session,term,is_active,is_closed').eq('is_active', true).eq('is_closed', false).order('term');
      if (termError) throw termError;
      const currentTerm = (activeTerms || []).find(item => normalise(item.session) === normalise(currentSession.session_name) && normalise(item.term).replace('first','1st').replace('second','2nd').replace('third','3rd') === normalise(currentSession.term_name).replace('first','1st').replace('second','2nd').replace('third','3rd'));
      if (!currentTerm) throw new Error(`No active term matches ${currentSession.session_name} / ${currentSession.term_name}.`);
      setTerm(currentTerm);
      const { data: classData, error: classError } = await supabase.from('classes').select('id,name,branch_id,academic_session,level,department').eq('status', 'active').order('name');
      if (classError) throw classError;
      setClasses((classData || []).filter(item => !item.academic_session || normalise(item.academic_session) === normalise(currentSession.session_name)) as ClassRow[]);
    } catch (error: any) {
      setSession(null); setTerm(null); setConfig(null); setClasses([]); toast.error(error.message || 'Unable to load result context.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadContext(); }, [loadContext]);

  useEffect(() => {
    if (!selectedClass || !session || !term) { setConfig(null); setAssessmentGroup(null); return; }
    const group = resolveAssessmentGroup({ id: selectedClass.id, name: selectedClass.name, level: selectedClass.level, department: selectedClass.department });
    setAssessmentGroup(group);
    void (async () => {
      const { data, error } = await supabase.from('result_assessment_configs').select('first_test_max,second_test_max,exam_max,total_max,components').eq('academic_session_id', session.id).eq('term_id', term.id).eq('academic_group', group).eq('status', 'active').maybeSingle();
      if (error) { toast.error(error.message); setConfig(null); return; }
      if (!data) { setConfig(null); return; }
      const components = Array.isArray(data.components) ? data.components : [];
      const getMax = (key: string, fallback: number) => Number(components.find((item: any) => item?.key === key)?.max_score ?? fallback);
      setConfig({ first_test_max: getMax('first_test', Number(data.first_test_max)), second_test_max: getMax('second_test', Number(data.second_test_max)), exam_max: getMax('exam', Number(data.exam_max)), total_max: Number(data.total_max || 100) });
    })();
  }, [selectedClass, session, term]);

  const loadRegister = useCallback(async () => {
    if (!session || !term || !classId) { setStudents([]); setSubjects([]); setScores({}); return; }
    setLoadingRegister(true);
    try {
      const [studentResult, assignmentResult] = await Promise.all([
        supabase.from('students').select('id,first_name,last_name,admission_number,class_id').eq('class_id', classId).eq('session_id', session.id).order('last_name').order('first_name'),
        supabase.from('class_subjects').select('subject_id,subjects(id,name,code)').eq('class_id', classId).eq('status', 'active'),
      ]);
      if (studentResult.error) throw studentResult.error;
      if (assignmentResult.error) throw assignmentResult.error;
      setStudents((studentResult.data || []) as Student[]);
      setSubjects((assignmentResult.data || []).flatMap((item: any) => item.subjects ? [item.subjects] : []));
      setSubjectId(''); setScores({});
    } catch (error: any) { setStudents([]); setSubjects([]); toast.error(error.message || 'Unable to load class register.'); }
    finally { setLoadingRegister(false); }
  }, [classId, session, term]);

  useEffect(() => { void loadRegister(); }, [loadRegister]);

  useEffect(() => {
    if (!session || !term || !classId || !subjectId) return;
    void (async () => {
      const { data: batch, error } = await supabase.from('result_batches').select('id').eq('academic_session_id', session.id).eq('term_id', term.id).eq('class_id', classId).eq('subject_id', subjectId).eq('assessment_type', assessmentType).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) return toast.error(error.message);
      if (!batch) return setScores({});
      const { data: entries, error: entryError } = await supabase.from('result_entries').select('student_id,score').eq('batch_id', batch.id);
      if (entryError) return toast.error(entryError.message);
      setScores(Object.fromEntries((entries || []).map((entry: any) => [entry.student_id, entry.score == null ? '' : String(entry.score)])));
    })();
  }, [assessmentType, classId, session, subjectId, term]);

  async function save() {
    if (!user?.id || !session || !term || !config || !selectedClass || !selectedSubject || !students.length) return toast.error('Complete the session, class, subject and register first.');
    if (!maximum || maximum <= 0) return toast.error(`${labels[assessmentType]} maximum is not configured for this class group.`);
    const invalid = students.find(student => { const raw = scores[student.id]; if (raw === '' || raw == null) return false; const value = Number(raw); return !Number.isFinite(value) || value < 0 || value > maximum; });
    if (invalid) return toast.error(`Scores must be between 0 and ${maximum}.`);
    setSaving(true);
    try {
      const { data: existing, error: lookupError } = await supabase.from('result_batches').select('id,status').eq('academic_session_id', session.id).eq('term_id', term.id).eq('class_id', selectedClass.id).eq('subject_id', selectedSubject.id).eq('assessment_type', assessmentType).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing?.status === 'locked' || existing?.status === 'published') return toast.error('This result component is locked or published.');
      let batchId = existing?.id;
      if (batchId) {
        const { error } = await supabase.from('result_batches').update({ branch_id: selectedClass.branch_id, title: `${labels[assessmentType]} — ${selectedSubject.name}`, max_score: maximum, weight: maximum, updated_at: new Date().toISOString() }).eq('id', batchId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase.from('result_batches').insert({ branch_id: selectedClass.branch_id, academic_session_id: session.id, term_id: term.id, class_id: selectedClass.id, subject_id: selectedSubject.id, assessment_type: assessmentType, title: `${labels[assessmentType]} — ${selectedSubject.name}`, max_score: maximum, weight: maximum, assessment_date: new Date().toISOString().slice(0, 10), entered_by: user.id, status: 'draft' }).select('id').single();
        if (error) throw error;
        batchId = created.id;
      }
      const rows = students.filter(student => scores[student.id] !== undefined && scores[student.id] !== '').map(student => { const score = Number(scores[student.id]); const percentage = maximum ? score / maximum * 100 : 0; return { batch_id: batchId, student_id: student.id, score, percentage, grade: grade(percentage), remark: percentage >= 40 ? 'Pass' : 'Needs Improvement', entered_by: user.id, updated_by: user.id }; });
      if (rows.length) { const { error } = await supabase.from('result_entries').upsert(rows, { onConflict: 'batch_id,student_id' }); if (error) throw error; }
      toast.success(`${labels[assessmentType]} saved for ${selectedSubject.name}.`);
    } catch (error: any) { toast.error(error.message || 'Unable to save results.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  return <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-6">
    <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">Administrator • Result Entry</p><h1 className="mt-2 text-3xl font-black md:text-4xl">{labels[assessmentType]} Results</h1><p className="mt-2 text-sm text-indigo-100">Enter marks using the assessment scheme configured for the selected class group.</p></div><ClipboardList className="hidden h-12 w-12 opacity-30 sm:block" /></div></div>
      <div className="grid grid-cols-2 gap-3 rounded-3xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><CalendarDays className="mb-2 h-5 w-5 text-indigo-600" /><p className="text-xs text-slate-500">Session</p><p className="font-bold">{session?.session_name || '—'}</p></div><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" /><p className="text-xs text-slate-500">Term</p><p className="font-bold">{term?.term || session?.term_name || '—'}</p></div></div>
    </section>
    <section className="grid gap-4 lg:grid-cols-[1fr_1fr_260px]">
      <label className="rounded-2xl border bg-white p-4 font-bold shadow-sm dark:border-slate-700 dark:bg-slate-800">Class<select value={classId} onChange={event => { setClassId(event.target.value); setSubjectId(''); }} className="mt-2 w-full rounded-xl border px-3 py-3 font-medium dark:border-slate-600 dark:bg-slate-900"><option value="">Select class</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="rounded-2xl border bg-white p-4 font-bold shadow-sm dark:border-slate-700 dark:bg-slate-800">Subject<select value={subjectId} onChange={event => setSubjectId(event.target.value)} disabled={!classId} className="mt-2 w-full rounded-xl border px-3 py-3 font-medium disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900"><option value="">Select subject</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div className="rounded-2xl border bg-gradient-to-br from-indigo-50 to-violet-50 p-4 shadow-sm dark:border-slate-700 dark:from-indigo-950/30 dark:to-violet-950/30"><p className="text-xs font-bold uppercase text-slate-500">Maximum</p><p className="mt-1 text-3xl font-black">{maximum || '—'}</p><p className="text-xs text-slate-500">{assessmentGroup ? `${assessmentGroup.replace('_', ' ')} scheme` : 'Select a class'}</p></div>
    </section>
    {!config && classId && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No active assessment scheme is configured for this class group. Configure it under Results → Assessment Schemes.</div>}
    <section className="overflow-hidden rounded-3xl border bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"><div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700"><div><div className="flex items-center gap-2 font-black"><Users className="h-5 w-5 text-indigo-600" /> Student Mark Sheet</div><p className="text-sm text-slate-500">{enteredCount}/{students.length} entered · maximum {maximum || '—'}</p></div><button onClick={save} disabled={saving || loadingRegister || !students.length || !maximum} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save marks'}</button></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr className="bg-slate-900 text-white"><th className="p-3 text-left">#</th><th className="p-3 text-left">Student</th><th className="p-3 text-left">Admission No.</th><th className="p-3">Mark / {maximum || '—'}</th><th className="p-3">%</th><th className="p-3">Grade</th><th className="p-3">Status</th></tr></thead><tbody>{students.map((student, index) => { const raw = scores[student.id] || ''; const value = Number(raw); const percentage = maximum && raw !== '' ? value / maximum * 100 : 0; return <tr key={student.id} className="border-t dark:border-slate-700"><td className="p-3 text-slate-400">{index + 1}</td><td className="p-3 font-semibold">{student.last_name} {student.first_name}</td><td className="p-3 text-slate-500">{student.admission_number || '—'}</td><td className="p-2"><input aria-label={`${student.first_name} mark`} type="number" min="0" max={maximum || undefined} step="0.01" value={raw} onChange={event => setScores(current => ({ ...current, [student.id]: event.target.value }))} className="w-28 rounded-lg border px-3 py-2 font-bold focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900" /></td><td className="p-3 text-center">{raw === '' ? '—' : percentage.toFixed(1)}</td><td className="p-3 text-center font-black">{raw === '' ? '—' : grade(percentage)}</td><td className="p-3 text-center">{raw === '' ? <span className="text-slate-400">Pending</span> : <span className="inline-flex items-center gap-1 font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Ready</span>}</td></tr>; })}{!students.length && <tr><td colSpan={7} className="p-12 text-center text-slate-500">Select a class and subject to load students.</td></tr>}</tbody></table></div></section>
  </div>;
}
