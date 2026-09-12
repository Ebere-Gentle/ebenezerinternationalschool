import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Filter, Loader2, Printer, RefreshCw, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { resolveAssessmentGroup } from '../../../utils/results/assessmentGroups';

type Session = { id: string; session_name: string; term_name: string | null; is_current: boolean; };
type Term = { id: string; session: string; term: string; is_active: boolean; is_closed: boolean; };
type ClassRow = { id: string; name: string; code: string | null; level: string | null; department: string | null; branch_id: string; status?: string | null };
type Student = { id: string; first_name: string | null; middle_name: string | null; last_name: string | null; admission_number: string | null; class_id: string };
type Batch = { id: string; class_id: string; subject_id: string; assessment_type: string; max_score: number; created_at: string; subject?: { name?: string | null } | null };
type SubjectCell = { score: number; max: number; percentage: number; grade: string };
type BoardRow = Student & { total: number; max: number; percentage: number; grade: string; position: number; subjects: Record<string, SubjectCell> };

const gradeFrom = (p: number) => p >= 75 ? 'A' : p >= 65 ? 'B' : p >= 55 ? 'C' : p >= 45 ? 'D' : p >= 40 ? 'E' : 'F';
const remarkFrom = (p: number) => p >= 75 ? 'Excellent' : p >= 65 ? 'Very Good' : p >= 55 ? 'Good' : p >= 45 ? 'Fair' : p >= 40 ? 'Pass' : 'Needs Improvement';
const assessmentTypes = ['first_test', 'second_test', 'continuous_assessment', 'ca', 'exam'];
const typeScore = (type: string) => type === 'continuous_assessment' || type === 'ca' ? 'ca' : type;
const scopeFor = (c: ClassRow) => resolveAssessmentGroup({ id: c.id, name: c.name, level: c.level, department: c.department });

export default function AdminClassBroadsheet() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [termId, setTermId] = useState('');
  const [scope, setScope] = useState('whole_school');
  const [classId, setClassId] = useState('');
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const session = sessions.find(x => x.id === sessionId);
  const term = terms.find(x => x.id === termId);
  const availableClasses = useMemo(() => {
    if (scope === 'whole_school') return classes;
    return classes.filter(c => scopeFor(c) === scope);
  }, [classes, scope]);

  const filteredClasses = useMemo(() => {
    if (!classId) return availableClasses;
    return availableClasses.filter(c => c.id === classId);
  }, [availableClasses, classId]);

  const loadContext = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: s, error: se }, { data: c, error: ce }] = await Promise.all([
        supabase.from('academic_sessions').select('id,session_name,term_name,is_current').order('start_date', { ascending: false }),
        supabase.from('classes').select('id,name,code,level,department,branch_id,status').eq('status', 'active').order('name'),
      ]);
      if (se) throw se;
      if (ce) throw ce;
      const sessionsData = (s || []) as Session[];
      setSessions(sessionsData);
      setClasses((c || []) as ClassRow[]);
      const current = sessionsData.find(x => x.is_current) || sessionsData[0];
      if (current) setSessionId(current.id);
    } catch (e: any) {
      toast.error(e.message || 'Unable to load broadsheet context.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadContext(); }, [loadContext]);

  useEffect(() => {
    if (!sessionId) return;
    setTermId('');
    void (async () => {
      const currentSession = sessions.find(x => x.id === sessionId);
      if (!currentSession) return;
      const { data, error } = await supabase.from('terms').select('id,session,term,is_active,is_closed').eq('session', currentSession.session_name).order('start_date', { ascending: false });
      if (error) { toast.error(error.message); return; }
      const list = (data || []) as Term[];
      setTerms(list);
      const wanted = String(currentSession.term_name || '').toLowerCase().replace('first', '1st').replace('second', '2nd').replace('third', '3rd');
      setTermId(list.find(x => x.term.toLowerCase().replace('first', '1st').replace('second', '2nd').replace('third', '3rd') === wanted)?.id || list.find(x => x.is_active)?.id || list[0]?.id || '');
    })();
  }, [sessionId, sessions]);

  useEffect(() => { setClassId(''); }, [scope]);

  const generate = useCallback(async () => {
    if (!sessionId || !termId || !filteredClasses.length) { setRows([]); setSubjects([]); return; }
    setWorking(true);
    try {
      const classIds = filteredClasses.map(c => c.id);
      const [{ data: students, error: studentError }, { data: batches, error: batchError }] = await Promise.all([
        supabase.from('students').select('id,first_name,middle_name,last_name,admission_number,class_id').in('class_id', classIds).eq('current_status', 'active').order('last_name').order('first_name'),
        supabase.from('result_batches').select('id,class_id,subject_id,assessment_type,max_score,created_at,subjects:subject_id(name)').eq('academic_session_id', sessionId).eq('term_id', termId).in('class_id', classIds).in('assessment_type', assessmentTypes).order('created_at', { ascending: false }),
      ]);
      if (studentError) throw studentError;
      if (batchError) throw batchError;
      const studentList = (students || []) as Student[];
      const batchList = (batches || []) as Batch[];
      const batchIds = batchList.map(b => b.id);
      const { data: entries, error: entryError } = batchIds.length ? await supabase.from('result_entries').select('batch_id,student_id,score').in('batch_id', batchIds) : { data: [], error: null };
      if (entryError) throw entryError;

      const latest = new Map<string, Batch>();
      for (const b of batchList) {
        const key = `${b.class_id}:${b.subject_id}:${typeScore(b.assessment_type)}`;
        if (!latest.has(key)) latest.set(key, b);
      }
      const entryMap = new Map((entries || []).map((e: any) => [`${e.student_id}:${e.batch_id}`, Number(e.score)]));
      const subjectMap = new Map<string, string>();
      latest.forEach(b => subjectMap.set(b.subject_id, b.subject?.name || 'Subject'));
      const nextRows: BoardRow[] = [];

      for (const student of studentList) {
        const bySubject = new Map<string, SubjectCell>();
        for (const b of latest.values()) {
          if (b.class_id !== student.class_id) continue;
          const score = entryMap.get(`${student.id}:${b.id}`);
          if (score == null) continue;
          const existing = bySubject.get(b.subject_id) || { score: 0, max: 0, percentage: 0, grade: '—' };
          existing.score += score;
          existing.max += Number(b.max_score || 0);
          existing.percentage = existing.max ? existing.score / existing.max * 100 : 0;
          existing.grade = gradeFrom(existing.percentage);
          bySubject.set(b.subject_id, existing);
        }
        let total = 0; let max = 0;
        bySubject.forEach(v => { total += v.score; max += v.max; });
        const percentage = max ? total / max * 100 : 0;
        nextRows.push({ ...student, total, max, percentage, grade: gradeFrom(percentage), position: 0, subjects: Object.fromEntries(bySubject) });
      }
      nextRows.sort((a, b) => b.percentage - a.percentage || b.total - a.total || `${a.last_name || ''} ${a.first_name || ''}`.localeCompare(`${b.last_name || ''} ${b.first_name || ''}`));
      let position = 0; let previous = -1;
      nextRows.forEach((row, index) => { if (index === 0 || row.percentage < previous) position = index + 1; row.position = position; previous = row.percentage; });
      setRows(nextRows);
      setSubjects(Array.from(subjectMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Unable to generate broadsheet.');
      setRows([]); setSubjects([]);
    } finally { setWorking(false); }
  }, [sessionId, termId, filteredClasses]);

  useEffect(() => { if (sessionId && termId) void generate(); }, [sessionId, termId, generate]);

  const overallBest = rows[0];
  const subjectLeaders = useMemo(() => subjects.map(subject => {
    const candidates = rows.map(row => ({ row, cell: row.subjects[subject.id] })).filter(x => x.cell);
    candidates.sort((a, b) => b.cell.percentage - a.cell.percentage);
    return { subject, leader: candidates[0] || null };
  }), [rows, subjects]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return <div className="mx-auto max-w-[1800px] space-y-5 p-4 sm:p-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-xs uppercase tracking-[0.2em] text-indigo-600">Results analytics</p><h1 className="mt-2 text-3xl text-slate-900 dark:text-white">Class Broadsheet</h1><p className="mt-2 text-sm text-slate-500">A ranked view of students, subject performance, percentages, grades and positions.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800"><Printer className="h-4 w-4" /> Print</button><button onClick={() => void generate()} disabled={working} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${working ? 'animate-spin' : ''}`} /> Refresh</button></div>
    </div>

    <section className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="mb-4 flex items-center gap-2 text-sm"><Filter className="h-4 w-4 text-indigo-600" /> Filter broadsheet</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><label className="text-sm">Session<select value={sessionId} onChange={e => setSessionId(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900">{sessions.map(s => <option key={s.id} value={s.id}>{s.session_name}{s.is_current ? ' — Current' : ''}</option>)}</select></label><label className="text-sm">Term<select value={termId} onChange={e => setTermId(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900">{terms.map(t => <option key={t.id} value={t.id}>{t.term}{t.is_active ? ' — Active' : t.is_closed ? ' — Closed' : ''}</option>)}</select></label><label className="text-sm">School section<select value={scope} onChange={e => setScope(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"><option value="whole_school">Whole School</option><option value="nursery">Nursery</option><option value="kg_silver">KG Silver</option><option value="kg_gold">KG Gold</option><option value="transition_grader">Transition / Grader</option><option value="primary">Primary / Grade 1–5</option><option value="jss">JSS</option><option value="ss">SS</option></select></label><label className="text-sm">Class<select value={classId} onChange={e => setClassId(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"><option value="">All classes in section</option>{availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>)}</select></label></div></section>

    <section className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-800"><div className="text-xs uppercase tracking-wide text-slate-500">Students ranked</div><div className="mt-2 text-3xl text-slate-900 dark:text-white">{rows.length}</div></div><div className="rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-800"><div className="text-xs uppercase tracking-wide text-slate-500">Overall best</div><div className="mt-2 text-lg text-slate-900 dark:text-white">{overallBest ? `${overallBest.first_name || ''} ${overallBest.last_name || ''}`.trim() : '—'}</div><div className="text-sm text-indigo-600">{overallBest ? `${overallBest.percentage.toFixed(1)}% · Position ${overallBest.position}` : ''}</div></div><div className="rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-800"><div className="text-xs uppercase tracking-wide text-slate-500">Scope</div><div className="mt-2 text-lg text-slate-900 dark:text-white">{classId ? classes.find(c => c.id === classId)?.name : scope === 'whole_school' ? 'Whole School' : scope.replace('_', ' ')}</div><div className="text-sm text-slate-500">{session?.session_name} · {term?.term}</div></div></section>

    {subjectLeaders.length > 0 && <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="mb-4 flex items-center gap-2 text-slate-900 dark:text-white"><Trophy className="h-5 w-5 text-amber-500" /> Subject overall best</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{subjectLeaders.map(({ subject, leader }) => <div key={subject.id} className="rounded-xl border p-3 dark:border-slate-700"><div className="text-sm text-slate-500">{subject.name}</div><div className="mt-1 text-sm text-slate-900 dark:text-white">{leader ? `${leader.row.first_name || ''} ${leader.row.last_name || ''}`.trim() : 'No score'}</div><div className="text-xs text-indigo-600">{leader ? `${leader.cell.score}/${leader.cell.max} · ${leader.cell.percentage.toFixed(1)}% · ${leader.cell.grade}` : '—'}</div></div>)}</div></section>}

    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between border-b p-5 dark:border-slate-700"><div><h2 className="text-lg text-slate-900 dark:text-white">Ranked student broadsheet</h2><p className="text-xs text-slate-500">Students are ordered from position 1 downward. Each subject shows total score, percentage and grade.</p></div><BarChart3 className="h-5 w-5 text-indigo-600" /></div>{!rows.length ? <div className="p-10 text-center text-sm text-slate-500">No scored students were found for this selection.</div> : <div className="overflow-auto"><table className="min-w-[1400px] w-full text-xs"><thead className="bg-slate-900 text-white"><tr><th className="sticky left-0 z-10 bg-slate-900 px-3 py-3 text-left">Pos.</th><th className="sticky left-12 z-10 bg-slate-900 px-3 py-3 text-left">Student</th><th className="px-3 py-3">Admission</th>{subjects.map(s => <th key={s.id} className="min-w-[120px] px-3 py-3 text-left">{s.name}</th>)}<th className="px-3 py-3">Total</th><th className="px-3 py-3">%</th><th className="px-3 py-3">Grade</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t dark:border-slate-700"><td className="sticky left-0 z-10 bg-white px-3 py-3 dark:bg-slate-800">{row.position}</td><td className="sticky left-12 z-10 bg-white px-3 py-3 text-slate-900 dark:bg-slate-800 dark:text-white">{[row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ')}</td><td className="px-3 py-3">{row.admission_number || '—'}</td>{subjects.map(subject => { const cell = row.subjects[subject.id]; return <td key={subject.id} className="px-3 py-3">{cell ? <><div>{cell.score}/{cell.max}</div><div className="text-slate-500">{cell.percentage.toFixed(1)}% · {cell.grade}</div></> : '—'}</td>; })}<td className="px-3 py-3">{row.total}/{row.max}</td><td className="px-3 py-3">{row.percentage.toFixed(1)}%</td><td className="px-3 py-3">{row.grade}</td></tr>)}</tbody></table></div>}</section>
    <div className="text-xs text-slate-500">{overallBest ? `Overall best in this filter: ${[overallBest.first_name, overallBest.last_name].filter(Boolean).join(' ')} (${overallBest.percentage.toFixed(1)}%).` : ''} Remarks are derived from the configured grading bands.</div>
  </div>;
}
