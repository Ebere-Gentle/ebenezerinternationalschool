import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, Printer, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import OfficialResultSheet from '../../../components/results/shared/OfficialResultSheet';
import { resolveAssessmentGroup } from '../../../utils/results/assessmentGroups';

type Session = { id: string; session_name: string; term_name: string | null; is_current: boolean; };
type Term = { id: string; session: string; term: string; is_active: boolean; is_closed: boolean; };
type ClassRow = { id: string; name: string; level: string | null; department: string | null; branch_id: string; };
type Student = { id: string; user_id?: string | null; first_name: string | null; middle_name: string | null; last_name: string | null; admission_number: string | null; gender: string | null; date_of_birth: string | null; passport_url: string | null; class_id: string; branch_id: string; };

type AssessmentRow = { subject: string; test1: number | null; test2: number | null; ca: number | null; exam: number | null; total: number; percentage: number; grade: string; remark: string; };
const gradeFrom = (p: number) => p >= 75 ? 'A' : p >= 65 ? 'B' : p >= 55 ? 'C' : p >= 45 ? 'D' : p >= 40 ? 'E' : 'F';
const remarkFrom = (p: number) => p >= 75 ? 'Excellent' : p >= 65 ? 'Very Good' : p >= 55 ? 'Good' : p >= 45 ? 'Fair' : p >= 40 ? 'Pass' : 'Needs Improvement';
const normalise = (v: string | null | undefined) => String(v || '').trim().toLowerCase().replace('first', '1st').replace('second', '2nd').replace('third', '3rd');

export default function AdminResultReportsheet() {
  const [sessions, setSessions] = useState<Session[]>([]); const [terms, setTerms] = useState<Term[]>([]); const [classes, setClasses] = useState<ClassRow[]>([]); const [students, setStudents] = useState<Student[]>([]);
  const [sessionId, setSessionId] = useState(''); const [termId, setTermId] = useState(''); const [classId, setClassId] = useState(''); const [studentId, setStudentId] = useState('');
  const [student, setStudent] = useState<Student | null>(null); const [className, setClassName] = useState(''); const [school, setSchool] = useState<any>(null); const [rows, setRows] = useState<AssessmentRow[]>([]); const [summary, setSummary] = useState<any>(null); const [max, setMax] = useState({ test1: 0, test2: 0, ca: 0, exam: 0, total: 0 }); const [loading, setLoading] = useState(true); const [working, setWorking] = useState(false);

  const session = sessions.find(s => s.id === sessionId); const term = terms.find(t => t.id === termId); const selectedClass = classes.find(c => c.id === classId);
  const loadContext = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: s, error: se }, { data: c, error: ce }] = await Promise.all([
        supabase.from('academic_sessions').select('id,session_name,term_name,is_current').order('start_date', { ascending: false }),
        supabase.from('classes').select('id,name,level,department,branch_id').eq('status', 'active').order('name'),
      ]);
      if (se) throw se; if (ce) throw ce;
      const ss = (s || []) as Session[]; setSessions(ss); setClasses((c || []) as ClassRow[]);
      const current = ss.find(x => x.is_current) || ss[0]; if (current) setSessionId(current.id);
    } catch (e: any) { toast.error(e.message || 'Unable to load reportsheet context.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadContext(); }, [loadContext]);

  useEffect(() => {
    if (!session) return;
    void (async () => {
      const { data, error } = await supabase.from('terms').select('id,session,term,is_active,is_closed').eq('session', session.session_name).order('start_date', { ascending: false });
      if (error) { toast.error(error.message); return; }
      const list = (data || []) as Term[]; setTerms(list);
      setTermId(list.find(x => normalise(x.term) === normalise(session.term_name))?.id || list.find(x => x.is_active)?.id || list[0]?.id || '');
    })();
  }, [sessionId, session?.id]);

  useEffect(() => {
    setStudentId(''); setStudents([]); setRows([]);
    if (!classId) return;
    void (async () => {
      const { data, error } = await supabase.from('students').select('id,user_id,first_name,middle_name,last_name,admission_number,gender,date_of_birth,passport_url,class_id,branch_id').eq('class_id', classId).eq('current_status', 'active').order('last_name').order('first_name');
      if (error) { toast.error(error.message); return; }
      setStudents((data || []) as Student[]);
    })();
  }, [classId]);

  const loadReport = useCallback(async () => {
    if (!session || !term || !selectedClass || !studentId) { setRows([]); return; }
    setWorking(true);
    try {
      const st = students.find(x => x.id === studentId); if (!st) throw new Error('Student not found.');
      setStudent(st); setClassName(selectedClass.name);
      const [{ data: branch }, { data: config, error: configError }, { data: batches, error: batchError }] = await Promise.all([
        supabase.from('branches').select('school_name,branch_id,address,phone_number,email,logo_url,stamp_url').eq('id', st.branch_id).maybeSingle(),
        supabase.from('result_assessment_configs').select('first_test_max,second_test_max,exam_max,total_max,components,grading_system').eq('academic_session_id', session.id).eq('term_id', term.id).eq('academic_group', resolveAssessmentGroup({ id: selectedClass.id, name: selectedClass.name, level: selectedClass.level, department: selectedClass.department })).eq('status', 'active').maybeSingle(),
        supabase.from('result_batches').select('id,subject_id,assessment_type,max_score,created_at,subjects:subject_id(name)').eq('academic_session_id', session.id).eq('term_id', term.id).eq('class_id', selectedClass.id).in('assessment_type', ['first_test','second_test','continuous_assessment','ca','exam']).order('created_at', { ascending: false }),
      ]);
      if (configError) throw configError; if (batchError) throw batchError;
      const components = Array.isArray(config?.components) ? config.components : [];
      const componentMax = (key: string, fallback: number) => Number(components.find((x: any) => x?.key === key)?.max_score ?? fallback ?? 0);
      const test1Max = componentMax('first_test', Number(config?.first_test_max || 0)); const test2Max = componentMax('second_test', Number(config?.second_test_max || 0)); const caMax = componentMax('ca', 0); const examMax = componentMax('exam', Number(config?.exam_max || 0)); const totalMax = Number(config?.total_max || test1Max + test2Max + caMax + examMax);
      setMax({ test1: test1Max, test2: test2Max, ca: caMax, exam: examMax, total: totalMax }); setSchool(branch || {});
      const batchList = (batches || []) as any[]; const ids = batchList.map(b => b.id); const { data: entries, error: entryError } = ids.length ? await supabase.from('result_entries').select('batch_id,score,grade,remark').eq('student_id', studentId).in('batch_id', ids) : { data: [], error: null }; if (entryError) throw entryError;
      const entryMap = new Map((entries || []).map((e: any) => [e.batch_id, e])); const latest = new Map<string, any>();
      for (const b of batchList) { const type = b.assessment_type === 'continuous_assessment' ? 'ca' : b.assessment_type; const key = `${b.subject_id}:${type}`; if (!latest.has(key)) latest.set(key, b); }
      const bySubject = new Map<string, AssessmentRow>();
      latest.forEach(b => { const type = b.assessment_type === 'continuous_assessment' ? 'ca' : b.assessment_type; const existing = bySubject.get(b.subject_id) || { subject: b.subjects?.name || 'Subject', test1: null, test2: null, ca: null, exam: null, total: 0, percentage: 0, grade: '—', remark: '—' }; const entry = entryMap.get(b.id); if (type === 'first_test') existing.test1 = entry?.score == null ? null : Number(entry.score); if (type === 'second_test') existing.test2 = entry?.score == null ? null : Number(entry.score); if (type === 'ca') existing.ca = entry?.score == null ? null : Number(entry.score); if (type === 'exam') existing.exam = entry?.score == null ? null : Number(entry.score); existing.total = Number(existing.test1 || 0) + Number(existing.test2 || 0) + Number(existing.ca || 0) + Number(existing.exam || 0); existing.percentage = totalMax ? existing.total / totalMax * 100 : 0; existing.grade = entry?.grade || gradeFrom(existing.percentage); existing.remark = entry?.remark || remarkFrom(existing.percentage); bySubject.set(b.subject_id, existing); });
      setRows(Array.from(bySubject.values()).sort((a, b) => a.subject.localeCompare(b.subject)));
      const { data: resultSummary } = await supabase.from('result_summaries').select('position,remark,psychomotor,affective,attendance,teacher_comment,principal_comment,director_comment,next_term_begins,average_percentage,grade').eq('student_id', studentId).eq('class_id', selectedClass.id).eq('session', session.session_name).eq('term', term.term).maybeSingle();
      setSummary(resultSummary || {});
    } catch (e: any) { toast.error(e.message || 'Unable to load reportsheet.'); setRows([]); }
    finally { setWorking(false); }
  }, [session, term, selectedClass, studentId, students]);
  useEffect(() => { if (studentId) void loadReport(); }, [studentId, loadReport]);

  const average = useMemo(() => rows.length && max.total ? rows.reduce((n, r) => n + r.total, 0) / rows.length / max.total * 100 : 0, [rows, max.total]);
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;
  return <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-emerald-600">Official reports</p><h1 className="mt-2 text-3xl text-slate-900 dark:text-white">Result Reportsheet</h1><p className="mt-2 text-sm text-slate-500">Select a student to generate the complete printable academic report.</p></div><div className="flex gap-2"><button onClick={() => window.print()} disabled={!student} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm disabled:opacity-50"><Printer className="h-4 w-4" /> Print</button><button onClick={() => void loadReport()} disabled={!studentId || working} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${working ? 'animate-spin' : ''}`} /> Refresh</button></div></div>
    <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-4 dark:border-slate-700 dark:bg-slate-800"><label className="text-sm">Session<select value={sessionId} onChange={e => setSessionId(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900">{sessions.map(s => <option key={s.id} value={s.id}>{s.session_name}</option>)}</select></label><label className="text-sm">Term<select value={termId} onChange={e => setTermId(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900">{terms.map(t => <option key={t.id} value={t.id}>{t.term}</option>)}</select></label><label className="text-sm">Class<select value={classId} onChange={e => setClassId(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"><option value="">Select class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="text-sm">Student<select value={studentId} onChange={e => setStudentId(e.target.value)} disabled={!classId} className="mt-2 w-full rounded-xl border px-3 py-3 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900"><option value="">Select student</option>{students.map(s => <option key={s.id} value={s.id}>{[s.last_name,s.first_name,s.middle_name].filter(Boolean).join(' ')}{s.admission_number ? ` — ${s.admission_number}` : ''}</option>)}</select></label></section>
    {!student ? <div className="rounded-2xl border bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800"><FileText className="mx-auto h-10 w-10 text-emerald-600" /><p className="mt-3">Choose a class and student to view the official reportsheet.</p></div> : <OfficialResultSheet school={school || {}} student={student} className={className} session={session?.session_name || ''} term={term?.term || ''} assessments={rows} test1Max={max.test1} test2Max={max.test2} caMax={max.ca} examMax={max.exam} totalMax={max.total} position={summary?.position} average={Number(summary?.average_percentage ?? average)} overallGrade={summary?.grade || gradeFrom(Number(summary?.average_percentage ?? average))} overallRemark={summary?.remark || remarkFrom(Number(summary?.average_percentage ?? average))} attendance={summary?.attendance ? { total: summary.attendance.school_days_opened, present: summary.attendance.days_present, absent: summary.attendance.days_absent, excused: summary.attendance.days_excused, percentage: summary.attendance.attendance_percentage } : undefined} psychomotor={summary?.psychomotor || {}} affective={summary?.affective || {}} teacherComment={summary?.teacher_comment} principalComment={summary?.principal_comment} directorComment={summary?.director_comment} nextTermBegins={summary?.next_term_begins} />}
  </div>;
}
