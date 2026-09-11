import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

type AssessmentType = 'first_test' | 'second_test' | 'exam';
type Props = { assessmentType: AssessmentType };
type Assignment = { class_id: string; subject_id: string; class_name: string; subject_name: string };
type Student = { id: string; first_name: string; last_name: string; admission_number: string | null };
type Config = { first_test_max: number; second_test_max: number; exam_max: number };

const labels: Record<AssessmentType, string> = { first_test: 'First Test', second_test: 'Second Test', exam: 'Exam' };
const grade = (percentage: number) => percentage >= 75 ? 'A' : percentage >= 65 ? 'B' : percentage >= 55 ? 'C' : percentage >= 45 ? 'D' : percentage >= 40 ? 'E' : 'F';

export default function TeacherResultEntry({ assessmentType }: Props) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedAssignment = useMemo(() => assignments.find((item) => item.class_id === classId && item.subject_id === subjectId), [assignments, classId, subjectId]);
  const maximum = config ? Number(config[assessmentType === 'first_test' ? 'first_test_max' : assessmentType === 'second_test' ? 'second_test_max' : 'exam_max']) : 0;
  const availableSubjects = useMemo(() => { const seen = new Set<string>(); return assignments.filter((item) => item.class_id === classId && !seen.has(item.subject_id) && seen.add(item.subject_id)); }, [assignments, classId]);
  const availableClasses = useMemo(() => { const seen = new Set<string>(); return assignments.filter((item) => !seen.has(item.class_id) && seen.add(item.class_id)); }, [assignments]);

  useEffect(() => { void loadContextAndAssignments(); }, [user?.id]);
  useEffect(() => { if (sessionId && termId) void loadConfig(); }, [sessionId, termId]);
  useEffect(() => { if (classId && subjectId && sessionId) void loadStudents(); else setStudents([]); }, [classId, subjectId, sessionId]);

  async function loadContextAndAssignments() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [{ data: sessionData, error: sessionError }, { data: termData, error: termError }, { data: teacher, error: teacherError }] = await Promise.all([
        supabase.from('academic_sessions').select('id,session_name,is_current').eq('is_current', true).maybeSingle(),
        supabase.from('terms').select('id,is_active,is_closed').eq('is_active', true).eq('is_closed', false).maybeSingle(),
        supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle(),
      ]);
      if (sessionError) throw sessionError; if (termError) throw termError; if (teacherError) throw teacherError;
      if (!sessionData?.id || !termData?.id || !teacher?.id) { setAssignments([]); setLoading(false); return; }
      setSessionId(sessionData.id); setTermId(termData.id);
      const { data, error } = await supabase.from('teacher_subjects').select('class_id,subject_id,classes(id,name),subjects(id,name)').eq('teacher_id', teacher.id).not('class_id', 'is', null);
      if (error) throw error;
      setAssignments((data || []).flatMap((item: any) => item.classes?.id && item.subjects?.id ? [{ class_id: item.classes.id, subject_id: item.subjects.id, class_name: item.classes.name, subject_name: item.subjects.name }] : []));
    } catch (error: any) { toast.error(error.message || 'Unable to load your teaching assignments'); }
    finally { setLoading(false); }
  }

  async function loadConfig() {
    const { data, error } = await supabase.from('result_assessment_configs').select('first_test_max,second_test_max,exam_max').eq('academic_session_id', sessionId).eq('term_id', termId).eq('status', 'active').maybeSingle();
    if (error) { toast.error(error.message); return; }
    setConfig(data ? { first_test_max: Number(data.first_test_max), second_test_max: Number(data.second_test_max), exam_max: Number(data.exam_max) } : null);
  }

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('students').select('id,first_name,last_name,admission_number').eq('class_id', classId).eq('session_id', sessionId).order('last_name').order('first_name');
      if (error) throw error; setStudents((data || []) as Student[]); setScores({});
    } catch (error: any) { toast.error(error.message || 'Unable to load the class register'); }
    finally { setLoading(false); }
  }, [classId, sessionId]);

  async function save() {
    if (!selectedAssignment || !sessionId || !termId || !maximum || !students.length) return toast.error('Select one of your assigned class/subject combinations.');
    const invalid = students.some((student) => { const raw = scores[student.id]; if (raw === undefined || raw === '') return false; const value = Number(raw); return !Number.isFinite(value) || value < 0 || value > maximum; });
    if (invalid) return toast.error(`Scores must be between 0 and ${maximum}.`);
    setSaving(true);
    try {
      const { data: classRow, error: classError } = await supabase.from('classes').select('branch_id').eq('id', classId).single();
      if (classError) throw classError;
      const { data: existingBatch, error: batchLookupError } = await supabase.from('result_batches').select('id,status').eq('academic_session_id', sessionId).eq('term_id', termId).eq('class_id', classId).eq('subject_id', subjectId).eq('assessment_type', assessmentType).maybeSingle();
      if (batchLookupError) throw batchLookupError;
      let batchId = existingBatch?.id;
      if (existingBatch?.status === 'locked' || existingBatch?.status === 'published') return toast.error('This result component is already locked or published.');
      if (!batchId) {
        const { data: batch, error: batchError } = await supabase.from('result_batches').insert({ branch_id: classRow.branch_id, academic_session_id: sessionId, term_id: termId, class_id: classId, subject_id: subjectId, assessment_type: assessmentType, title: labels[assessmentType], max_score: maximum, weight: maximum, assessment_date: new Date().toISOString().slice(0, 10), entered_by: user?.id, status: 'draft' }).select('id').single();
        if (batchError) throw batchError; batchId = batch.id;
      } else {
        const { error: batchUpdateError } = await supabase.from('result_batches').update({ max_score: maximum, weight: maximum, updated_at: new Date().toISOString() }).eq('id', batchId);
        if (batchUpdateError) throw batchUpdateError;
      }
      const rows = students.filter((student) => scores[student.id] !== undefined && scores[student.id] !== '').map((student) => { const score = Number(scores[student.id]); const percentage = maximum ? score / maximum * 100 : 0; return { batch_id: batchId, student_id: student.id, score, percentage, grade: grade(percentage), remark: percentage >= 40 ? 'Pass' : 'Needs improvement', entered_by: user?.id, updated_by: user?.id }; });
      if (rows.length) { const { error: entryError } = await supabase.from('result_entries').upsert(rows, { onConflict: 'batch_id,student_id' }); if (entryError) throw entryError; }
      const { error: submitError } = await supabase.from('result_batches').update({ status: 'submitted' }).eq('id', batchId); if (submitError) throw submitError;
      toast.success(`${labels[assessmentType]} saved for ${selectedAssignment.subject_name} — ${selectedAssignment.class_name}.`);
    } catch (error: any) { toast.error(error.message || 'Unable to save results'); }
    finally { setSaving(false); }
  }

  if (loading && !assignments.length) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return <div className="mx-auto max-w-7xl space-y-6 p-4">
    <div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Teacher result entry</p><h1 className="text-3xl font-bold text-slate-900 dark:text-white">{labels[assessmentType]}</h1><p className="mt-2 text-slate-500 dark:text-slate-300">Only class and subject combinations assigned to you are available.</p></div>
    <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:grid-cols-3"><label className="text-sm font-semibold">Class<select value={classId} onChange={(event) => { setClassId(event.target.value); setSubjectId(''); }} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"><option value="">Select assigned class</option>{availableClasses.map((item) => <option key={item.class_id} value={item.class_id}>{item.class_name}</option>)}</select></label><label className="text-sm font-semibold">Subject<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} disabled={!classId} className="mt-2 w-full rounded-xl border px-3 py-3 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900"><option value="">Select assigned subject</option>{availableSubjects.map((item) => <option key={item.subject_id} value={item.subject_id}>{item.subject_name}</option>)}</select></label><div className="rounded-xl border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-semibold uppercase text-slate-500">Maximum mark</p><p className="mt-1 text-2xl font-bold">{maximum || 'Not configured'}</p><p className="text-xs text-slate-500">Admin configuration · total = 100</p></div></section>
    {!config && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No assessment configuration exists for the current academic session and term. Ask an administrator to configure the three components first.</div>}
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between border-b p-5 dark:border-slate-700"><div><h2 className="font-semibold">Broadsheet entry</h2><p className="text-sm text-slate-500">Enter scores directly in the grid. Blank cells remain unentered.</p></div><button onClick={save} disabled={saving || loading || !students.length || !maximum} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save results'}</button></div>{loading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead className="bg-slate-50 text-left dark:bg-slate-900"><tr><th className="sticky left-0 bg-slate-50 p-3 dark:bg-slate-900">#</th><th className="sticky left-10 bg-slate-50 p-3 dark:bg-slate-900">Student</th><th className="p-3">Admission no.</th><th className="p-3">Score / {maximum || '—'}</th><th className="p-3">%</th><th className="p-3">Grade</th></tr></thead><tbody>{students.map((student, index) => { const value = Number(scores[student.id] || 0); const percentage = maximum ? value / maximum * 100 : 0; return <tr key={student.id} className="border-t dark:border-slate-700"><td className="sticky left-0 bg-white p-3 dark:bg-slate-800">{index + 1}</td><td className="sticky left-10 bg-white p-3 font-medium dark:bg-slate-800">{student.last_name} {student.first_name}</td><td className="p-3 text-slate-500">{student.admission_number || '—'}</td><td className="p-2"><input type="number" min="0" max={maximum || undefined} step="0.01" value={scores[student.id] || ''} onChange={(event) => setScores((current) => ({ ...current, [student.id]: event.target.value }))} className="w-28 rounded-lg border px-3 py-2 font-semibold dark:border-slate-600 dark:bg-slate-900" /></td><td className="p-3">{scores[student.id] === undefined || scores[student.id] === '' ? '—' : percentage.toFixed(1)}</td><td className="p-3 font-bold">{scores[student.id] === undefined || scores[student.id] === '' ? '—' : grade(percentage)}</td></tr>; })}{!students.length && <tr><td colSpan={6} className="p-10 text-center text-slate-500">Select one of your assigned classes and subjects to load the register.</td></tr>}</tbody></table></div>}</section>
  </div>;
}
