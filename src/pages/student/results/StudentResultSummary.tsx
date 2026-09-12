import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Printer, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';
import OfficialResultSheet from '../../../components/results/shared/OfficialResultSheet';

type Row = { subject: string; test1: number | null; test2: number | null; exam: number | null; grade: string | null; remark: string | null };
type Context = { session: string; term: string; test1Max: number; test2Max: number; examMax: number; totalMax: number };

const grade = (value: number) => value >= 75 ? 'A' : value >= 65 ? 'B' : value >= 55 ? 'C' : value >= 45 ? 'D' : value >= 40 ? 'E' : 'F';
const remark = (value: number) => value >= 75 ? 'Excellent' : value >= 65 ? 'Very Good' : value >= 55 ? 'Good' : value >= 45 ? 'Fair' : value >= 40 ? 'Pass' : 'Needs Improvement';
const normalizeTerm = (value: string) => value.toLowerCase().replace('first', '1st').replace('second', '2nd').replace('third', '3rd');

export default function StudentResultSummary() {
  const { user } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [className, setClassName] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [context, setContext] = useState<Context | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user?.id) void load(); }, [user?.id]);

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: studentData, error: studentError } = await supabase.from('students').select('id,user_id,first_name,last_name,middle_name,admission_number,gender,date_of_birth,passport_url,class_id,branch_id,session_id').eq('user_id', user.id).maybeSingle();
      if (studentError) throw studentError;
      if (!studentData) throw new Error('Student profile was not found.');
      setStudent(studentData);

      const [{ data: branch }, { data: cls }, { data: session }] = await Promise.all([
        supabase.from('branches').select('school_name,branch_id,address,phone_number,email,website,logo_url').eq('id', studentData.branch_id).maybeSingle(),
        supabase.from('classes').select('name').eq('id', studentData.class_id).maybeSingle(),
        supabase.from('academic_sessions').select('id,session_name,term_name,term_number,is_current').eq('is_current', true).maybeSingle(),
      ]);
      setSchool(branch);
      setClassName(cls?.name || '');
      if (!session?.id) throw new Error('No current academic session is configured in Academic Sessions.');

      const { data: termRows } = await supabase.from('terms').select('id,session,term,is_active,is_closed').eq('session', session.session_name).eq('is_active', true).eq('is_closed', false).order('start_date', { ascending: false });
      const currentTerm = termRows?.find((item) => normalizeTerm(item.term) === normalizeTerm(session.term_name || '')) || termRows?.[0];
      if (!currentTerm) throw new Error(`No active term is configured for ${session.session_name}.`);

      const { data: config, error: configError } = await supabase.from('result_assessment_configs').select('first_test_max,second_test_max,exam_max,total_max').eq('academic_session_id', session.id).eq('term_id', currentTerm.id).eq('status', 'active').maybeSingle();
      if (configError) throw configError;
      if (!config) throw new Error('Assessment components have not been configured for the current academic session and term.');
      setContext({ session: session.session_name, term: currentTerm.term, test1Max: Number(config.first_test_max), test2Max: Number(config.second_test_max), examMax: Number(config.exam_max), totalMax: Number(config.total_max || 100) });

      const { data: batches, error: batchError } = await supabase.from('result_batches').select('id,subject_id,assessment_type,max_score,subjects:subject_id(name)').eq('academic_session_id', session.id).eq('term_id', currentTerm.id).eq('class_id', studentData.class_id).in('assessment_type', ['first_test', 'second_test', 'exam']);
      if (batchError) throw batchError;
      const batchIds = (batches || []).map((batch: any) => batch.id);
      const entries = batchIds.length ? (await supabase.from('result_entries').select('batch_id,student_id,score,grade,remark').eq('student_id', studentData.id).in('batch_id', batchIds)).data || [] : [];
      const bySubject = new Map<string, Row>();
      for (const batch of batches || []) {
        const subjectId = batch.subject_id;
        const existing = bySubject.get(subjectId) || { subject: batch.subjects?.name || 'Subject', test1: null, test2: null, exam: null, grade: null, remark: null };
        const entry: any = entries.find((item: any) => item.batch_id === batch.id);
        if (batch.assessment_type === 'first_test') existing.test1 = entry?.score == null ? null : Number(entry.score);
        if (batch.assessment_type === 'second_test') existing.test2 = entry?.score == null ? null : Number(entry.score);
        if (batch.assessment_type === 'exam') existing.exam = entry?.score == null ? null : Number(entry.score);
        const total = (existing.test1 || 0) + (existing.test2 || 0) + (existing.exam || 0);
        existing.grade = entry?.grade || grade(total);
        existing.remark = entry?.remark || remark(total);
        bySubject.set(subjectId, existing);
      }
      const nextRows = Array.from(bySubject.values()).sort((a, b) => a.subject.localeCompare(b.subject));
      setRows(nextRows);

      const subjectTotals = nextRows.map((item) => (item.test1 || 0) + (item.test2 || 0) + (item.exam || 0));
      const overallTotal = subjectTotals.reduce((sum, value) => sum + value, 0);
      const average = nextRows.length ? overallTotal / nextRows.length : 0;
      const { data: resultSummary } = await supabase.from('result_summaries').select('position,remark,psychomotor,affective,attendance,teacher_comment,principal_comment,next_term_begins').eq('student_id', studentData.id).eq('class_id', studentData.class_id).eq('session', session.session_name).eq('term', currentTerm.term).maybeSingle();
      setSummary({ ...(resultSummary || {}), average, overallGrade: grade(average), overallRemark: resultSummary?.remark || remark(average) });
    } catch (error: any) {
      toast.error(error.message || 'Unable to load result sheet');
      setRows([]);
    } finally { setLoading(false); }
  }

  const overall = useMemo(() => rows.length ? rows.reduce((sum, row) => sum + (row.test1 || 0) + (row.test2 || 0) + (row.exam || 0), 0) / rows.length : 0, [rows]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;
  if (!student || !context) return <div className="mx-auto max-w-5xl p-6"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">No official result sheet is available for the current academic session and term.</div></div>;

  return <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
      <div><p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Academic records</p><h1 className="text-3xl font-black text-slate-900 dark:text-white">Official Result Sheet</h1><p className="mt-1 text-slate-500">Current session and term are read directly from Academic Sessions and the active Term.</p></div>
      <div className="flex gap-2"><button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 font-semibold shadow-sm"><Printer className="h-4 w-4" /> Print</button><button onClick={() => void load()} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white"><RefreshCw className="h-4 w-4" /> Refresh</button></div>
    </div>
    <OfficialResultSheet school={school || {}} student={student} className={className} session={context.session} term={context.term} assessments={rows} test1Max={context.test1Max} test2Max={context.test2Max} examMax={context.examMax} totalMax={context.totalMax} position={summary?.position} average={summary?.average ?? overall} overallGrade={summary?.overallGrade} overallRemark={summary?.overallRemark} attendance={summary?.attendance} psychomotor={summary?.psychomotor || {}} affective={summary?.affective || {}} teacherComment={summary?.teacher_comment} principalComment={summary?.principal_comment} nextTermBegins={summary?.next_term_begins} />
  </div>;
}
