import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

type AssessmentType = 'test' | 'exam' | 'cbt';
type Props = { assessmentType: AssessmentType };
type Student = { id: string; first_name: string; last_name: string; admission_number: string | null };

const label = (type: AssessmentType) => type === 'cbt' ? 'CBT / Assignment' : type[0].toUpperCase() + type.slice(1);
const grade = (percentage: number) => percentage >= 75 ? 'A' : percentage >= 65 ? 'B' : percentage >= 55 ? 'C' : percentage >= 45 ? 'D' : percentage >= 40 ? 'E' : 'F';

export default function AdminResultEntry({ assessmentType }: Props) {
  const { user } = useAuth();
  const branchId = user?.branch_id;
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState(`${label(assessmentType)} assessment`);
  const [maxScore, setMaxScore] = useState('100');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTitle(`${label(assessmentType)} assessment`); }, [assessmentType]);

  useEffect(() => {
    if (!branchId) return;
    void (async () => {
      const { data, error } = await supabase.from('classes').select('id,name').eq('branch_id', branchId).eq('status', 'active').order('name');
      if (error) return toast.error(error.message);
      setClasses(data || []);
      setLoading(false);
    })();
  }, [branchId]);

  const loadRegister = useCallback(async () => {
    if (!branchId || !classId) { setStudents([]); setSubjects([]); return; }
    setLoading(true);
    try {
      const [{ data: studentData, error: studentError }, { data: assignmentData, error: assignmentError }] = await Promise.all([
        supabase.from('students').select('id,first_name,last_name,admission_number').eq('branch_id', branchId).eq('class_id', classId).eq('current_status', 'active').order('last_name'),
        supabase.from('class_subjects').select('subject_id,subjects(id,name)').eq('branch_id', branchId).eq('class_id', classId).eq('status', 'active'),
      ]);
      if (studentError) throw studentError;
      if (assignmentError) throw assignmentError;
      setStudents((studentData || []) as Student[]);
      setScores({});
      setSubjects((assignmentData || []).flatMap((item: any) => item.subjects ? [item.subjects] : []));
    } catch (error: any) { toast.error(error.message || 'Unable to load the class register'); }
    finally { setLoading(false); }
  }, [branchId, classId]);

  useEffect(() => { void loadRegister(); }, [loadRegister]);

  const save = async () => {
    const maximum = Number(maxScore);
    if (!branchId || !classId || !subjectId || !title.trim() || !students.length) return toast.error('Complete the assessment details and select a class with students.');
    if (!Number.isFinite(maximum) || maximum <= 0) return toast.error('Maximum score must be greater than zero.');
    const invalid = students.some((student) => { const score = Number(scores[student.id] || 0); return !Number.isFinite(score) || score < 0 || score > maximum; });
    if (invalid) return toast.error(`Each score must be between 0 and ${maximum}.`);
    setSaving(true);
    try {
      const { data: batch, error: batchError } = await supabase.from('result_batches').insert({ branch_id: branchId, title: title.trim(), assessment_type: assessmentType, class_id: classId, subject_id: subjectId, max_score: maximum, weight: 100, assessment_date: new Date().toISOString().slice(0, 10), entered_by: user?.id, status: 'draft' }).select('id').single();
      if (batchError) throw batchError;
      const rows = students.map((student) => { const score = Number(scores[student.id] || 0); const percentage = (score / maximum) * 100; return { batch_id: batch.id, student_id: student.id, score, grade: grade(percentage), remark: percentage >= 40 ? 'Pass' : 'Needs improvement', entered_by: user?.id, updated_by: user?.id }; });
      const { error: entryError } = await supabase.from('result_entries').upsert(rows, { onConflict: 'batch_id,student_id' });
      if (entryError) throw entryError;
      const { error: submitError } = await supabase.from('result_batches').update({ status: 'submitted' }).eq('id', batch.id);
      if (submitError) throw submitError;
      toast.success(`${label(assessmentType)} saved for review.`);
      setScores({});
    } catch (error: any) { toast.error(error.message || 'Unable to save results'); }
    finally { setSaving(false); }
  };

  return <div className="mx-auto max-w-6xl space-y-6 p-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Administrator result entry</p><h1 className="text-3xl font-bold text-slate-900 dark:text-white">Enter {label(assessmentType)} Results</h1></div><section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-4 dark:bg-slate-800"><input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl border px-3 py-2.5 md:col-span-2" placeholder="Assessment title" /><select value={classId} onChange={(event) => { setClassId(event.target.value); setSubjectId(''); }} className="rounded-xl border px-3 py-2.5"><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="rounded-xl border px-3 py-2.5"><option value="">Select subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><label className="text-sm font-medium md:col-span-1">Maximum score<input type="number" min="1" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label></section><section className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-800"><div className="flex items-center justify-between border-b p-5"><h2 className="font-semibold">Class register</h2><button onClick={save} disabled={saving || loading || !students.length} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save for review'}</button></div>{loading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-4">Student</th><th className="p-4">Admission no.</th><th className="p-4">Score / {maxScore || '—'}</th><th className="p-4">Grade</th></tr></thead><tbody>{students.map((student) => { const percentage = (Number(scores[student.id] || 0) / Number(maxScore || 1)) * 100; return <tr key={student.id} className="border-t"><td className="p-4 font-medium">{student.last_name} {student.first_name}</td><td className="p-4 text-slate-500">{student.admission_number || '—'}</td><td className="p-4"><input type="number" min="0" max={maxScore} value={scores[student.id] || ''} onChange={(event) => setScores((current) => ({ ...current, [student.id]: event.target.value }))} className="w-28 rounded-lg border px-3 py-2" /></td><td className="p-4 font-bold">{grade(percentage)}</td></tr>; })}{!students.length && <tr><td colSpan={4} className="p-10 text-center text-slate-500">Select a class to load its active students.</td></tr>}</tbody></table></div>}</section></div>;
}
