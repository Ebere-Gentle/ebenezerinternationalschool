import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Loader2, Save, Users, BookOpen, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

type AssessmentType = 'first_test' | 'second_test' | 'exam';
type Props = { assessmentType: AssessmentType };

type Session = { id: string; session_name: string; term_name: string | null; is_current: boolean };
type Term = { id: string; session: string; term: string; is_active: boolean; is_closed: boolean };
type ClassRow = { id: string; name: string; branch_id: string | null; academic_session: string | null };
type Subject = { id: string; name: string; code?: string | null };
type Student = { id: string; first_name: string; last_name: string; admission_number: string | null; class_id: string };
type Config = { first_test_max: number; second_test_max: number; exam_max: number; total_max: number };

const grade = (percentage: number) => {
  if (percentage >= 75) return 'A';
  if (percentage >= 65) return 'B';
  if (percentage >= 55) return 'C';
  if (percentage >= 45) return 'D';
  if (percentage >= 40) return 'E';
  return 'F';
};

const assessmentLabel = (type: AssessmentType) => ({ first_test: 'Test 1', second_test: 'Test 2', exam: 'Exam' }[type]);
const configKey = (type: AssessmentType): keyof Config => ({ first_test: 'first_test_max', second_test: 'second_test_max', exam: 'exam_max' }[type]);

const normalise = (value: string | null | undefined) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

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
  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [saving, setSaving] = useState(false);

  const maximum = config ? Number(config[configKey(assessmentType)]) : 0;
  const selectedClass = useMemo(() => classes.find((item) => item.id === classId) || null, [classes, classId]);
  const selectedSubject = useMemo(() => subjects.find((item) => item.id === subjectId) || null, [subjects, subjectId]);

  const loadContext = useCallback(async () => {
    setLoadingContext(true);
    try {
      const { data: currentSession, error: sessionError } = await supabase
        .from('academic_sessions')
        .select('id,session_name,term_name,is_current')
        .eq('is_current', true)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sessionError) throw sessionError;
      if (!currentSession) throw new Error('No current academic session is configured. Set one session as current first.');
      setSession(currentSession);

      const { data: activeTerms, error: termError } = await supabase
        .from('terms')
        .select('id,session,term,is_active,is_closed')
        .eq('is_active', true)
        .eq('is_closed', false)
        .order('term');
      if (termError) throw termError;
      const currentTerm = (activeTerms || []).find((item) => normalise(item.session) === normalise(currentSession.session_name) && normalise(item.term) === normalise(currentSession.term_name));
      if (!currentTerm) throw new Error(`No active term matches ${currentSession.session_name} / ${currentSession.term_name || 'current term'}.`);
      setTerm(currentTerm);

      const { data: savedConfig, error: configError } = await supabase
        .from('result_assessment_configs')
        .select('first_test_max,second_test_max,exam_max,total_max')
        .eq('academic_session_id', currentSession.id)
        .eq('term_id', currentTerm.id)
        .maybeSingle();
      if (configError) throw configError;
      if (!savedConfig) throw new Error('Assessment components are not configured for the current session and term.');
      setConfig(savedConfig);

      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id,name,branch_id,academic_session')
        .eq('status', 'active')
        .order('name');
      if (classError) throw classError;
      setClasses((classData || []).filter((item) => !item.academic_session || normalise(item.academic_session) === normalise(currentSession.session_name)));
    } catch (error: any) {
      setSession(null);
      setTerm(null);
      setConfig(null);
      setClasses([]);
      toast.error(error.message || 'Unable to load the current academic context.');
    } finally {
      setLoadingContext(false);
    }
  }, []);

  useEffect(() => { void loadContext(); }, [loadContext]);

  const loadRegister = useCallback(async () => {
    if (!session || !term || !classId) {
      setStudents([]);
      setSubjects([]);
      return;
    }
    setLoadingRegister(true);
    try {
      const [{ data: studentData, error: studentError }, { data: assignmentData, error: assignmentError }] = await Promise.all([
        supabase.from('students').select('id,first_name,last_name,admission_number,class_id').eq('class_id', classId).eq('session_id', session.id).eq('current_status', 'active').order('last_name').order('first_name'),
        supabase.from('class_subjects').select('subject_id,subjects(id,name,code)').eq('class_id', classId).eq('status', 'active'),
      ]);
      if (studentError) throw studentError;
      if (assignmentError) throw assignmentError;
      setStudents((studentData || []) as Student[]);
      setSubjects((assignmentData || []).flatMap((item: any) => item.subjects ? [item.subjects] : []));
      setScores({});
      setSubjectId('');
    } catch (error: any) {
      setStudents([]);
      setSubjects([]);
      toast.error(error.message || 'Unable to load the class register.');
    } finally {
      setLoadingRegister(false);
    }
  }, [classId, session, term]);

  useEffect(() => { void loadRegister(); }, [loadRegister]);

  const loadExistingScores = useCallback(async () => {
    if (!session || !term || !classId || !subjectId) return;
    const { data: batch } = await supabase
      .from('result_batches')
      .select('id')
      .eq('academic_session_id', session.id)
      .eq('term_id', term.id)
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .eq('assessment_type', assessmentType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!batch) { setScores({}); return; }
    const { data: entries } = await supabase.from('result_entries').select('student_id,score').eq('batch_id', batch.id);
    const next: Record<string, string> = {};
    (entries || []).forEach((entry: any) => { next[entry.student_id] = entry.score == null ? '' : String(entry.score); });
    setScores(next);
  }, [assessmentType, classId, session, subjectId, term]);

  useEffect(() => { void loadExistingScores(); }, [loadExistingScores]);

  const save = async () => {
    if (!user?.id || !session || !term || !config || !selectedClass || !selectedSubject || !students.length) {
      toast.error('Complete the current session, class, subject and register first.');
      return;
    }
    if (!maximum || maximum <= 0) {
      toast.error(`${assessmentLabel(assessmentType)} maximum mark is not configured.`);
      return;
    }

    const invalid = students.find((student) => {
      const raw = scores[student.id];
      if (raw === '' || raw == null) return false;
      const value = Number(raw);
      return !Number.isFinite(value) || value < 0 || value > maximum;
    });
    if (invalid) {
      toast.error(`Scores must be between 0 and ${maximum}.`);
      return;
    }

    setSaving(true);
    try {
      const { data: existingBatch, error: batchLookupError } = await supabase
        .from('result_batches')
        .select('id')
        .eq('academic_session_id', session.id)
        .eq('term_id', term.id)
        .eq('class_id', selectedClass.id)
        .eq('subject_id', selectedSubject.id)
        .eq('assessment_type', assessmentType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (batchLookupError) throw batchLookupError;

      let batchId = existingBatch?.id;
      if (batchId) {
        const { error } = await supabase.from('result_batches').update({
          branch_id: selectedClass.branch_id,
          title: `${assessmentLabel(assessmentType)} — ${selectedSubject.name}`,
          max_score: maximum,
          weight: maximum,
          status: 'submitted',
          entered_by: user.id,
          updated_at: new Date().toISOString(),
        }).eq('id', batchId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase.from('result_batches').insert({
          branch_id: selectedClass.branch_id,
          academic_session_id: session.id,
          term_id: term.id,
          class_id: selectedClass.id,
          subject_id: selectedSubject.id,
          assessment_type: assessmentType,
          title: `${assessmentLabel(assessmentType)} — ${selectedSubject.name}`,
          max_score: maximum,
          weight: maximum,
          assessment_date: new Date().toISOString().slice(0, 10),
          status: 'submitted',
          entered_by: user.id,
        }).select('id').single();
        if (error) throw error;
        batchId = created.id;
      }

      const rows = students.map((student) => {
        const raw = scores[student.id];
        const score = raw === '' || raw == null ? null : Number(raw);
        const percentage = score == null ? null : (score / maximum) * 100;
        return {
          batch_id: batchId,
          student_id: student.id,
          score,
          percentage,
          grade: percentage == null ? null : grade(percentage),
          remark: percentage == null ? null : percentage >= 40 ? 'Pass' : 'Needs improvement',
          entered_by: user.id,
          updated_by: user.id,
        };
      });

      const { error: entryError } = await supabase.from('result_entries').upsert(rows, { onConflict: 'batch_id,student_id' });
      if (entryError) throw entryError;
      toast.success(`${assessmentLabel(assessmentType)} saved for ${selectedSubject.name}.`);
    } catch (error: any) {
      toast.error(error.message || 'Unable to save results.');
    } finally {
      setSaving(false);
    }
  };

  const enteredCount = students.filter((student) => scores[student.id] !== '' && scores[student.id] != null).length;
  const averageEntered = enteredCount ? students.reduce((sum, student) => sum + Number(scores[student.id] || 0), 0) / enteredCount : 0;

  if (loadingContext) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">Administrator • Result Entry</p>
              <h1 className="text-3xl font-black md:text-4xl">{assessmentLabel(assessmentType)} Results</h1>
              <p className="mt-2 max-w-2xl text-sm text-indigo-100">Enter the selected assessment component only. The official result sheet combines Test 1, Test 2, CA, Exam and the final total automatically.</p>
            </div>
            <ClipboardList className="hidden h-12 w-12 opacity-30 sm:block" />
          </div>
        </section>
        <section className="grid grid-cols-2 gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><CalendarDays className="mb-2 h-5 w-5 text-indigo-600" /><p className="text-xs text-slate-500">Current session</p><p className="font-bold">{session?.session_name}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><BookOpen className="mb-2 h-5 w-5 text-violet-600" /><p className="text-xs text-slate-500">Current term</p><p className="font-bold">{term?.term || session?.term_name}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" /><p className="text-xs text-slate-500">Configured total</p><p className="font-bold">{config?.total_max ?? 0} marks</p></div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><Users className="mb-2 h-5 w-5 text-amber-600" /><p className="text-xs text-slate-500">Register</p><p className="font-bold">{students.length} students</p></div>
        </section>
      </div>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_1fr_auto] dark:border-slate-700 dark:bg-slate-800">
        <label className="text-sm font-semibold">Class<select value={classId} onChange={(event) => setClassId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-600 dark:bg-slate-900"><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Subject<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} disabled={!classId} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900"><option value="">Select subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}{item.code ? ` (${item.code})` : ''}</option>)}</select></label>
        <div className="rounded-2xl bg-indigo-50 p-3 dark:bg-indigo-950/30"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{assessmentLabel(assessmentType)} maximum</p><p className="mt-1 text-2xl font-black text-indigo-700 dark:text-indigo-300">{maximum || '—'}</p><p className="text-xs text-slate-500">Configured from Result Settings</p></div>
        <button onClick={save} disabled={saving || loadingRegister || !students.length || !subjectId} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save results'}</button>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-700"><div><h2 className="text-lg font-bold">Student broadsheet</h2><p className="text-sm text-slate-500">{selectedClass?.name || 'Select a class'}{selectedSubject ? ` • ${selectedSubject.name}` : ''}</p></div><div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold dark:bg-slate-900">{enteredCount}/{students.length} entered</div></div>
          {loadingRegister ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left dark:bg-slate-900"><tr><th className="sticky left-0 bg-slate-50 p-4 dark:bg-slate-900">#</th><th className="p-4">Student</th><th className="p-4">Admission No.</th><th className="p-4">Score / {maximum || '—'}</th><th className="p-4">%</th><th className="p-4">Grade</th><th className="p-4">Status</th></tr></thead><tbody>{students.map((student, index) => { const raw = scores[student.id]; const value = raw === '' || raw == null ? null : Number(raw); const percentage = value == null || !maximum ? null : (value / maximum) * 100; return <tr key={student.id} className="border-t border-slate-100 dark:border-slate-700"><td className="sticky left-0 bg-white p-4 font-semibold dark:bg-slate-800">{index + 1}</td><td className="p-4 font-semibold">{student.last_name} {student.first_name}</td><td className="p-4 text-slate-500">{student.admission_number || '—'}</td><td className="p-4"><input aria-label={`Score for ${student.first_name} ${student.last_name}`} type="number" min="0" max={maximum} step="0.01" value={raw ?? ''} onChange={(event) => setScores((current) => ({ ...current, [student.id]: event.target.value }))} disabled={!subjectId} className="w-32 rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-semibold outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900" /></td><td className="p-4 font-semibold">{percentage == null ? '—' : `${percentage.toFixed(1)}%`}</td><td className="p-4 font-black">{percentage == null ? '—' : grade(percentage)}</td><td className="p-4">{value == null ? <span className="text-slate-400">Pending</span> : <span className="font-semibold text-emerald-600">Entered</span>}</td></tr>)}{!students.length && <tr><td colSpan={7} className="p-14 text-center text-slate-500">Select a class and subject to load the current session register.</td></tr>}</tbody></table></div>}
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Entry overview</p><div className="mt-4 space-y-4"><div><p className="text-xs text-slate-500">Assessment</p><p className="font-bold">{assessmentLabel(assessmentType)}</p></div><div><p className="text-xs text-slate-500">Maximum mark</p><p className="text-2xl font-black">{maximum || '—'}</p></div><div><p className="text-xs text-slate-500">Students entered</p><p className="text-2xl font-black">{enteredCount}</p></div><div><p className="text-xs text-slate-500">Average entered score</p><p className="text-2xl font-black">{enteredCount ? averageEntered.toFixed(1) : '—'}</p></div></div></section>
          <section className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/30"><p className="font-bold text-indigo-800 dark:text-indigo-200">Result calculation</p><ul className="mt-3 space-y-2 text-sm text-indigo-900/80 dark:text-indigo-100/80"><li>• Test 1 + Test 2 = CA</li><li>• CA + Exam = Total / 100</li><li>• Grade and remark are generated automatically.</li><li>• Official result sheet also includes attendance, affective and psychomotor records.</li></ul></section>
        </aside>
      </div>
    </div>
  );
}
