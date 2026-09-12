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
const componentKey = (type: AssessmentType) => type === 'ca' ? 'ca' : type;

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
  const selectedClass = useMemo(() => classes.find(item => item.id === classId) || null, [classes, classId]);
  const selectedSubject = useMemo(() => subjects.find(item => item.id === subjectId) || null, [subjects, subjectId]);
  const maximum = config?.maximum || 0;

  const loadContext = useCallback(async () => {
    setLoading(true);
    try {
      const { data: currentSession, error: sessionError } = await supabase.from('academic_sessions').select('id,session_name,term_name,is_current').eq('is_current', true).order('start_date', { ascending: false }).limit(1).maybeSingle();
      if (sessionError) throw sessionError;
      if (!currentSession) throw new Error('No current academic session is configured.');
      setSession(currentSession);
      const { data: activeTerms, error: termError } = await supabase.from('terms').select('id,session,term,is_active,is_closed').eq('is_active', true).order('start_date', { ascending: false });
      if (termError) throw termError;
      const currentTerm = (activeTerms || []).find(item => normalise(item.session) === normalise(currentSession.session_name) && normalise(item.term).replace('first', '1st').replace('second', '2nd').replace('third', '3rd') === normalise(currentSession.term_name).replace('first', '1st').replace('second', '2nd').replace('third', '3rd'));
      if (!currentTerm) throw new Error(`No active term matches ${currentSession.session_name} / ${currentSession.term_name}.`);
      setTerm(currentTerm);
      const { data: classData, error: classError } = await supabase.from('classes').select('id,name,branch_id,academic_session,level,department').eq('status', 'active').order('name');
      if (classError) throw classError;
      const classOrder = (name: string) => {
        const value = normalise(name);

        if (value.includes('nursery')) return 10;
        if (value.includes('kg silver')) return 20;
        if (value.includes('kg gold')) return 30;
        if (value.includes('transition') || value.includes('grader')) return 40;

        const grade = value.match(/(?:grade|primary)\s*(\d+)/);
        if (grade) return 50 + Number(grade[1]);

        const jss = value.match(/jss\s*(\d+)/);
        if (jss) return 60 + Number(jss[1]);

        const ss = value.match(/ss\s*(\d+)/);
        if (ss) return 70 + Number(ss[1]);

        if (value.includes('graduate')) return 100;

        return 90;
      };

      const allActiveClasses = (classData || []) as ClassRow[];

      setClasses(
        allActiveClasses.sort((a, b) => {
          const orderDifference = classOrder(a.name) - classOrder(b.name);
          return orderDifference !== 0
            ? orderDifference
            : a.name.localeCompare(b.name);
        })
      );
    } catch (error: any) {
      toast.error(error.message || 'Unable to load result context.');
    } finally { setLoading(false); }
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
      setConfig({ maximum: maximumFor(componentKey(assessmentType)), total_max: Number(data.total_max || 0), components });
    })();
  }, [assessmentType, selectedClass, session, term]);

  const loadRegister = useCallback(async () => {
    if (!session || !term || !classId) { setStudents([]); setSubjects([]); setScores({}); return; }
    try {
      const [studentResult, assignmentResult] = await Promise.all([
        supabase.from('students').select('id,first_name,last_name,admission_number,class_id').eq('class_id', classId).eq('session_id', session.id).eq('current_status', 'active').order('last_name').order('first_name'),
        supabase.from('class_subjects').select('subject_id,subjects(id,name,code)').eq('class_id', classId).eq('status', 'active')
      ]);
      if (studentResult.error) throw studentResult.error;
      if (assignmentResult.error) throw assignmentResult.error;
      setStudents((studentResult.data || []) as Student[]);
      setSubjects((assignmentResult.data || []).flatMap((item: any) => item.subjects ? [item.subjects] : []));
      setSubjectId(''); setScores({});
    } catch (error: any) { toast.error(error.message || 'Unable to load class register.'); }
  }, [classId, session, term]);

  useEffect(() => { void loadRegister(); }, [loadRegister]);

  useEffect(() => {
    if (!session || !term || !classId || !subjectId) return;
    void (async () => {
      const { data: batch, error } = await supabase.from('result_batches').select('id').eq('academic_session_id', session.id).eq('term_id', term.id).eq('class_id', classId).eq('subject_id', subjectId).eq('assessment_type', assessmentType === 'ca' ? 'continuous_assessment' : assessmentType).order('created_at', { ascending: false }).limit(1).maybeSingle();
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
    const invalid = students.find(student => {
      const raw = scores[student.id];
      if (raw === '' || raw == null) return false;
      const value = Number(raw);
      return !Number.isFinite(value) || value < 1 || value > maximum;
    });
    if (invalid) return toast.error(`Scores must be between 1 and ${maximum}. Zero is not accepted.`);
    const missing = students.some(student => scores[student.id] === '' || scores[student.id] == null);
    if (missing) return toast.error('Every student must receive a score before the component is saved. Minimum score is 1.');
    setSaving(true);
    try {
      const batchType = assessmentType === 'ca' ? 'continuous_assessment' : assessmentType;
      const { data: existing, error: lookupError } = await supabase.from('result_batches').select('id,status').eq('academic_session_id', session.id).eq('term_id', term.id).eq('class_id', selectedClass.id).eq('subject_id', selectedSubject.id).eq('assessment_type', batchType).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing?.status === 'locked' || existing?.status === 'published') return toast.error('This result component is locked or published.');
      let batchId = existing?.id;
      if (batchId) {
        const { error } = await supabase.from('result_batches').update({ branch_id: selectedClass.branch_id, title: `${labels[assessmentType]} — ${selectedSubject.name}`, max_score: maximum, weight: maximum, updated_at: new Date().toISOString() }).eq('id', batchId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase.from('result_batches').insert({ branch_id: selectedClass.branch_id, academic_session_id: session.id, term_id: term.id, class_id: selectedClass.id, subject_id: selectedSubject.id, assessment_type: batchType, title: `${labels[assessmentType]} — ${selectedSubject.name}`, max_score: maximum, weight: maximum, assessment_date: new Date().toISOString().slice(0, 10), entered_by: user.id, status: 'draft' }).select('id').single();
        if (error) throw error;
        batchId = created.id;
      }
      const rows = students.map(student => {
        const score = Number(scores[student.id]);
        const percentage = maximum ? score / maximum * 100 : 0;
        return { batch_id: batchId, student_id: student.id, score, percentage, grade: percentage >= 75 ? 'A' : percentage >= 65 ? 'B' : percentage >= 55 ? 'C' : percentage >= 45 ? 'D' : percentage >= 40 ? 'E' : 'F', remark: percentage >= 75 ? 'Excellent' : percentage >= 65 ? 'Very Good' : percentage >= 55 ? 'Good' : percentage >= 45 ? 'Fair' : percentage >= 40 ? 'Pass' : 'Needs Improvement', entered_by: user.id, updated_by: user.id };
      });
      const { error } = await supabase.from('result_entries').upsert(rows, { onConflict: 'batch_id,student_id' });
      if (error) throw error;
      toast.success(`${labels[assessmentType]} saved for ${selectedSubject.name}.`);
    } catch (error: any) { toast.error(error.message || 'Unable to save results.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></div>;
  return <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-6">
    <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Administrator · Result Entry</p><h1 className="mt-2 text-3xl md:text-4xl">{labels[assessmentType]} Results</h1><p className="mt-2 text-sm text-indigo-100">Enter marks using the configured scheme. Scores are restricted to the configured maximum and cannot be zero.</p></div><ClipboardList className="hidden h-12 w-12 opacity-30 sm:block" /></div></div>
      <div className="grid grid-cols-2 gap-3 rounded-3xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><CalendarDays className="mb-2 h-5 w-5 text-indigo-600" /><p className="text-xs text-slate-500">Session</p><p>{session?.session_name || '—'}</p></div><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" /><p className="text-xs text-slate-500">Term</p><p>{term?.term || session?.term_name || '—'}</p></div></div>
    </section>
    <section className="grid gap-4 lg:grid-cols-[1fr_1fr_260px]">
      <label className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">Class<select value={classId} onChange={event => { setClassId(event.target.value); setSubjectId(''); }} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"><option value="">Select class</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">Subject<select value={subjectId} onChange={event => setSubjectId(event.target.value)} disabled={!classId} className="mt-2 w-full rounded-xl border px-3 py-3 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900"><option value="">Select subject</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div className="rounded-2xl border bg-gradient-to-br from-indigo-50 to-violet-50 p-4 shadow-sm dark:border-slate-700 dark:from-indigo-950/30 dark:to-violet-950/30"><p className="text-xs uppercase text-slate-500">Maximum</p><p className="mt-1 text-3xl">{maximum || '—'}</p><p className="text-xs text-slate-500">{assessmentGroup ? `${assessmentGroup.replace('_', ' ')} scheme` : 'Select a class'}</p></div>
    </section>
    {!config && classId && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No active assessment scheme is configured for this class group.</div>}
    <section className="overflow-hidden rounded-3xl border bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700"><div><div className="flex items-center gap-2"><Users className="h-5 w-5 text-indigo-600" /> Student Mark Sheet</div><p className="text-sm text-slate-500">{students.length} student(s) · valid range 1–{maximum || '—'}</p></div><button onClick={save} disabled={saving || !students.length || !maximum} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save marks'}</button></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead><tr className="bg-slate-900 text-white"><th className="p-3 text-left">#</th><th className="p-3 text-left">Student</th><th className="p-3 text-left">Admission No.</th><th className="p-3">Mark / {maximum || '—'}</th><th className="p-3">%</th><th className="p-3">Grade</th><th className="p-3">Status</th></tr></thead><tbody>{students.map((student, index) => { const raw = scores[student.id] ?? ''; const value = Number(raw); const percentage = raw === '' || !maximum ? 0 : value / maximum * 100; const valid = raw === '' || (value >= 1 && value <= maximum); const grade = percentage >= 75 ? 'A' : percentage >= 65 ? 'B' : percentage >= 55 ? 'C' : percentage >= 45 ? 'D' : percentage >= 40 ? 'E' : raw === '' ? '—' : 'F'; return <tr key={student.id} className="border-t dark:border-slate-700"><td className="p-3 text-slate-400">{index + 1}</td><td className="p-3">{student.last_name} {student.first_name}</td><td className="p-3 text-slate-500">{student.admission_number || '—'}</td><td className="p-2"><input aria-label={`${student.first_name} mark`} type="number" min="1" max={maximum || undefined} step="0.01" value={raw} onChange={event => setScores(current => ({ ...current, [student.id]: event.target.value }))} className={`w-28 rounded-lg border px-3 py-2 ${valid ? 'dark:border-slate-600' : 'border-red-500'} dark:bg-slate-900`} /></td><td className="p-3 text-center">{raw === '' ? '—' : `${percentage.toFixed(1)}%`}</td><td className="p-3 text-center">{grade}</td><td className="p-3 text-center">{raw === '' ? 'Pending' : valid ? 'Ready' : 'Invalid'}</td></tr>; })}</tbody></table></div>
    </section>
  </div>;
}
