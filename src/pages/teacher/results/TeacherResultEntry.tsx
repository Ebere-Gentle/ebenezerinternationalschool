import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Loader2, Save, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';
import { resolveAssessmentGroup, type AssessmentGroup } from '../../../utils/results/assessmentGroups';

type AssessmentType = 'first_test' | 'second_test' | 'ca' | 'exam';
type Assignment = { class_id: string; subject_id: string; class_name: string; subject_name: string; level?: string | null; department?: string | null };
type Student = { id: string; first_name: string; last_name: string; admission_number: string | null };
type Config = { maximum: number; total_max: number };
const labels: Record<AssessmentType, string> = { first_test: 'Test 1', second_test: 'Test 2', ca: 'CA', exam: 'Exam' };
const normalizeTerm = (v: string) => v.toLowerCase().replace('first', '1st').replace('second', '2nd').replace('third', '3rd');

export default function TeacherResultEntry({ assessmentType }: { assessmentType: AssessmentType }) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [session, setSession] = useState('');
  const [term, setTerm] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [assessmentGroup, setAssessmentGroup] = useState<AssessmentGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const availableClasses = useMemo(() => Array.from(new Map(assignments.map(x => [x.class_id, x])).values()), [assignments]);
  const availableSubjects = useMemo(() => Array.from(new Map(assignments.filter(x => x.class_id === classId).map(x => [x.subject_id, x])).values()), [assignments, classId]);
  const selected = assignments.find(x => x.class_id === classId && x.subject_id === subjectId);
  const maximum = config?.maximum || 0;

  useEffect(() => { void loadContext(); }, [user?.id]);
  useEffect(() => { if (sessionId && termId && classId) void loadConfig(); else { setConfig(null); setAssessmentGroup(null); } }, [sessionId, termId, classId, assessmentType]);
  useEffect(() => { if (classId && subjectId && sessionId) void loadStudents(); else setStudents([]); }, [classId, subjectId, sessionId, termId, assessmentType]);

  async function loadContext() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [{ data: academic, error: ae }, { data: teacher, error: te }] = await Promise.all([
        supabase.from('academic_sessions').select('id,session_name,term_name').eq('is_current', true).maybeSingle(),
        supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle()
      ]);
      if (ae) throw ae; if (te) throw te;
      if (!academic?.id || !teacher?.id) throw new Error('Current academic session or teacher profile is not configured.');
      const { data: terms, error: termError } = await supabase.from('terms').select('id,session,term,is_active,is_closed').eq('session', academic.session_name).eq('is_active', true).order('start_date', { ascending: false });
      if (termError) throw termError;
      const currentTerm = terms?.find(x => normalizeTerm(x.term) === normalizeTerm(academic.term_name || '')) || terms?.[0];
      if (!currentTerm) throw new Error(`No active term is configured for ${academic.session_name}.`);
      setSessionId(academic.id); setSession(academic.session_name); setTermId(currentTerm.id); setTerm(currentTerm.term);
      const { data, error } = await supabase.from('teacher_subjects').select('class_id,subject_id,classes(id,name,level,department),subjects(id,name)').eq('teacher_id', teacher.id).not('class_id', 'is', null);
      if (error) throw error;
      setAssignments((data || []).flatMap((x: any) => x.classes?.id && x.subjects?.id ? [{ class_id: x.classes.id, subject_id: x.subjects.id, class_name: x.classes.name, subject_name: x.subjects.name, level: x.classes.level, department: x.classes.department }] : []));
    } catch (e: any) { toast.error(e.message || 'Unable to load teacher result context.'); }
    finally { setLoading(false); }
  }

  async function loadConfig() {
    const selectedClass = assignments.find(item => item.class_id === classId);
    if (!selectedClass) return;
    const group = resolveAssessmentGroup({ id: selectedClass.class_id, name: selectedClass.class_name, level: selectedClass.level, department: selectedClass.department });
    setAssessmentGroup(group);
    const { data, error } = await supabase.from('result_assessment_configs').select('components,total_max,first_test_max,second_test_max,exam_max').eq('academic_session_id', sessionId).eq('term_id', termId).eq('academic_group', group).eq('status', 'active').maybeSingle();
    if (error) { toast.error(error.message); setConfig(null); return; }
    if (!data) { setConfig(null); return; }
    const components = Array.isArray(data.components) ? data.components : [];
    const fallback: Record<string, number> = { first_test: Number(data.first_test_max || 0), second_test: Number(data.second_test_max || 0), ca: 0, exam: Number(data.exam_max || 0) };
    const maximumFor = (key: string) => Number(components.find((item: any) => item?.key === key)?.max_score ?? fallback[key] ?? 0);
    setConfig({ maximum: maximumFor(assessmentType), total_max: Number(data.total_max || 0) });
  }

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('students').select('id,first_name,last_name,admission_number').eq('class_id', classId).eq('session_id', sessionId).eq('current_status', 'active').order('last_name').order('first_name');
      if (error) throw error;
      setStudents((data || []) as Student[]);
      const batchType = assessmentType === 'ca' ? 'continuous_assessment' : assessmentType;
      const { data: batch } = await supabase.from('result_batches').select('id').eq('academic_session_id', sessionId).eq('term_id', termId).eq('class_id', classId).eq('subject_id', subjectId).eq('assessment_type', batchType).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (batch?.id) { const { data: entries } = await supabase.from('result_entries').select('student_id,score').eq('batch_id', batch.id); setScores(Object.fromEntries((entries || []).map((x: any) => [x.student_id, x.score == null ? '' : String(x.score)]))); } else setScores({});
    } catch (e: any) { toast.error(e.message || 'Unable to load class register.'); }
    finally { setLoading(false); }
  }, [classId, subjectId, sessionId, termId, assessmentType]);

  async function save() {
    if (!selected || !maximum || !students.length) return toast.error('Select one of your assigned class and subject combinations and ensure the component maximum is configured.');
    for (const student of students) {
      const raw = scores[student.id];
      if (raw === undefined || raw === '') return toast.error(`${student.first_name} ${student.last_name} needs a score. Minimum score is 1.`);
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 1 || n > maximum) return toast.error(`${student.first_name} ${student.last_name}: score must be between 1 and ${maximum}.`);
    }
    setSaving(true);
    try {
      const { data: cls, error: ce } = await supabase.from('classes').select('branch_id').eq('id', classId).single();
      if (ce) throw ce;
      const batchType = assessmentType === 'ca' ? 'continuous_assessment' : assessmentType;
      const { data: existing, error: be } = await supabase.from('result_batches').select('id,status').eq('academic_session_id', sessionId).eq('term_id', termId).eq('class_id', classId).eq('subject_id', subjectId).eq('assessment_type', batchType).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (be) throw be;
      if (existing?.status === 'locked' || existing?.status === 'published') return toast.error('This result component is locked or published.');
      let batchId = existing?.id;
      if (!batchId) {
        const { data: batch, error } = await supabase.from('result_batches').insert({ branch_id: cls.branch_id, academic_session_id: sessionId, term_id: termId, class_id: classId, subject_id: subjectId, assessment_type: batchType, title: labels[assessmentType], max_score: maximum, weight: maximum, assessment_date: new Date().toISOString().slice(0, 10), entered_by: user?.id, status: 'draft' }).select('id').single();
        if (error) throw error;
        batchId = batch.id;
      } else {
        const { error } = await supabase.from('result_batches').update({ max_score: maximum, weight: maximum, updated_at: new Date().toISOString() }).eq('id', batchId);
        if (error) throw error;
      }
      const rows = students.map(student => { const value = Number(scores[student.id]); const percentage = maximum ? value / maximum * 100 : 0; return { batch_id: batchId, student_id: student.id, score: value, percentage, grade: percentage >= 75 ? 'A' : percentage >= 65 ? 'B' : percentage >= 55 ? 'C' : percentage >= 45 ? 'D' : percentage >= 40 ? 'E' : 'F', remark: percentage >= 75 ? 'Excellent' : percentage >= 65 ? 'Very Good' : percentage >= 55 ? 'Good' : percentage >= 45 ? 'Fair' : percentage >= 40 ? 'Pass' : 'Needs Improvement', entered_by: user?.id, updated_by: user?.id }; });
      const { error } = await supabase.from('result_entries').upsert(rows, { onConflict: 'batch_id,student_id' });
      if (error) throw error;
      toast.success(`${labels[assessmentType]} saved for ${selected.subject_name}.`);
    } catch (e: any) { toast.error(e.message || 'Unable to save results.'); }
    finally { setSaving(false); }
  }

  if (loading && !assignments.length) return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-emerald-600" /></div>;
  return <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]"><div><p className="text-xs uppercase tracking-[0.2em] text-emerald-600">Teacher Assessment Workspace</p><h1 className="mt-1 text-3xl">{labels[assessmentType]} Broadsheet</h1><p className="mt-2 text-slate-500">Enter marks only for subjects and classes assigned to you. Every required mark must be between 1 and the configured maximum.</p></div><div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-emerald-600" /> Academic Context</div><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><span className="text-slate-400">Session</span><p>{session || '—'}</p></div><div><span className="text-slate-400">Term</span><p>{term || '—'}</p></div></div></div></div>
    <section className="grid gap-4 lg:grid-cols-[1fr_1fr_280px]"><label className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">Assigned Class<select value={classId} onChange={e => { setClassId(e.target.value); setSubjectId(''); }} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"><option value="">Select class</option>{availableClasses.map(x => <option key={x.class_id} value={x.class_id}>{x.class_name}</option>)}</select></label><label className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">Assigned Subject<select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId} className="mt-2 w-full rounded-xl border px-3 py-3 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900"><option value="">Select subject</option>{availableSubjects.map(x => <option key={x.subject_id} value={x.subject_id}>{x.subject_name}</option>)}</select></label><div className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-sky-50 p-4 shadow-sm dark:border-slate-700 dark:from-emerald-950/30 dark:to-sky-950/30"><p className="text-xs uppercase text-slate-500">Maximum</p><p className="mt-1 text-3xl">{maximum || '—'}</p><p className="text-xs text-slate-500">{assessmentGroup ? `${assessmentGroup.replace('_', ' ')} scheme` : 'Select a class'}</p></div></section>
    {!config && classId && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No active assessment scheme is configured for this class group. Ask an administrator/director to configure it.</div>}
    <section className="overflow-hidden rounded-3xl border bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"><div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700"><div><div className="flex items-center gap-2"><Users className="h-5 w-5 text-emerald-600" /> Student Mark Sheet</div><p className="text-sm text-slate-500">{students.length} student(s) · valid range 1–{maximum || '—'}</p></div><button onClick={save} disabled={saving || loading || !students.length || !maximum} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save marks'}</button></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr className="bg-slate-900 text-white"><th className="p-3 text-left">#</th><th className="p-3 text-left">Student</th><th className="p-3 text-left">Admission No.</th><th className="p-3">Mark / {maximum || '—'}</th><th className="p-3">%</th><th className="p-3">Grade</th><th className="p-3">Status</th></tr></thead><tbody>{students.map((s, i) => { const raw = scores[s.id] ?? ''; const value = Number(raw); const p = raw === '' || !maximum ? 0 : value / maximum * 100; const valid = raw !== '' && value >= 1 && value <= maximum; const grade = raw === '' ? '—' : p >= 75 ? 'A' : p >= 65 ? 'B' : p >= 55 ? 'C' : p >= 45 ? 'D' : p >= 40 ? 'E' : 'F'; return <tr key={s.id} className="border-t dark:border-slate-700"><td className="p-3 text-slate-400">{i + 1}</td><td className="p-3">{s.last_name} {s.first_name}</td><td className="p-3 text-slate-500">{s.admission_number || '—'}</td><td className="p-2"><input aria-label={`${s.first_name} mark`} type="number" min="1" max={maximum || undefined} step="0.01" value={raw} onChange={e => setScores(cur => ({ ...cur, [s.id]: e.target.value }))} className={`w-28 rounded-lg border px-3 py-2 ${raw === '' || valid ? 'dark:border-slate-600' : 'border-red-500'} dark:bg-slate-900`} /></td><td className="p-3 text-center">{raw === '' ? '—' : `${p.toFixed(1)}%`}</td><td className="p-3 text-center">{grade}</td><td className="p-3 text-center">{raw === '' ? 'Pending' : valid ? 'Ready' : 'Invalid'}</td></tr>; })}</tbody></table></div></section>
  </div>;
}
