import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Loader2,
  User,
  Users,
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  class_id: string | null;
  branch_id: string;
}

interface SchoolClass {
  id: string;
  name: string;
  code: string;
  level: string;
  department?: string | null;
}

interface SessionRow {
  id: string;
  session_name: string;
  term_name: string;
  term_number: number;
}

interface TermRow {
  id: string;
  branch_id: string;
  session: string;
  term: string;
  start_date: string;
  end_date: string;
  is_active?: boolean | null;
  is_closed?: boolean | null;
}

interface SubjectRow {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  teacher?: string | null;
  teacherPhoto?: string | null;
  compulsory: boolean;
}

interface SchemeRow {
  id: string;
  subject_id: string;
  week_number: number;
  topic: string;
  sub_topic?: string | null;
  objectives?: string | null;
  activities?: string | null;
  resources?: string | null;
  assessment?: string | null;
  duration?: string | null;
}

const MIN_YEAR = 2019;
const MAX_YEAR = 2026;
const DEFAULT_SESSION = '2026/2027';
const DEFAULT_TERM = 'First Term';

const allowedSessions = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => {
  const year = MIN_YEAR + i;
  return `${year}/${year + 1}`;
});

const normalizeTerm = (value?: string | null) =>
  String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const termNumber = (value?: string | null) => {
  const v = normalizeTerm(value);
  if (v === '1' || v.includes('first') || v.includes('1st')) return 1;
  if (v === '2' || v.includes('second') || v.includes('2nd')) return 2;
  if (v === '3' || v.includes('third') || v.includes('3rd')) return 3;
  const match = v.match(/[123]/);
  return match ? Number(match[0]) : 0;
};

const termLabel = (value?: string | null) => {
  const n = termNumber(value);
  return n === 1 ? 'First Term' : n === 2 ? 'Second Term' : n === 3 ? 'Third Term' : value || 'Term';
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const StudentClassesFixed: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [schemes, setSchemes] = useState<Record<string, SchemeRow[]>>({});
  const [sessionName, setSessionName] = useState(DEFAULT_SESSION);
  const [selectedTerm, setSelectedTerm] = useState(DEFAULT_TERM);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [schemeLoading, setSchemeLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedSessionRows = useMemo(
    () => sessions.filter((row) => row.session_name === sessionName).sort((a, b) => a.term_number - b.term_number),
    [sessions, sessionName],
  );

  const selectedTermRecord = useMemo(
    () => terms.find((row) => normalizeTerm(row.term) === normalizeTerm(selectedTerm)),
    [terms, selectedTerm],
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) throw new Error('Your session has expired. Please sign in again.');

        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id,first_name,last_name,middle_name,class_id,branch_id')
          .eq('user_id', authData.user.id)
          .maybeSingle();
        if (studentError) throw studentError;
        if (!studentData?.class_id || !studentData?.branch_id) throw new Error('Your student class or school branch has not been assigned yet.');

        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id,name,code,level,department')
          .eq('id', studentData.class_id)
          .maybeSingle();
        if (classError) throw classError;
        if (!classData) throw new Error('Your assigned class could not be found.');

        const { data: sessionData, error: sessionError } = await supabase
          .from('academic_sessions')
          .select('id,session_name,term_name,term_number')
          .eq('branch_id', studentData.branch_id)
          .order('start_date', { ascending: false });
        if (sessionError) throw sessionError;

        const validSessions = ((sessionData || []) as SessionRow[])
          .filter((row) => allowedSessions.includes(row.session_name))
          .sort((a, b) => Number(b.session_name.slice(0, 4)) - Number(a.session_name.slice(0, 4)) || a.term_number - b.term_number);

        const { data: classSubjects, error: classSubjectError } = await supabase
          .from('class_subjects')
          .select('subject_id,is_compulsory,status')
          .eq('class_id', studentData.class_id);
        if (classSubjectError) throw classSubjectError;

        const subjectIds = [...new Set((classSubjects || [])
          .filter((row: any) => !row.status || String(row.status).toLowerCase() === 'active')
          .map((row: any) => row.subject_id)
          .filter(Boolean))];

        let subjectRows: any[] = [];
        if (subjectIds.length) {
          const { data, error: subjectError } = await supabase
            .from('subjects')
            .select('id,name,code,description')
            .in('id', subjectIds);
          if (subjectError) throw subjectError;
          subjectRows = data || [];
        }

        const { data: teacherAssignments, error: teacherAssignmentError } = await supabase
          .from('teacher_subjects')
          .select('teacher_id,subject_id,class_id')
          .eq('class_id', studentData.class_id)
          .in('subject_id', subjectIds.length ? subjectIds : ['00000000-0000-0000-0000-000000000000']);
        if (teacherAssignmentError) throw teacherAssignmentError;

        const teacherIds = [...new Set((teacherAssignments || []).map((row: any) => row.teacher_id).filter(Boolean))];
        const teacherMap = new Map<string, any>();
        if (teacherIds.length) {
          const { data: teachers, error: teacherError } = await supabase
            .from('teachers')
            .select('id,first_name,last_name,middle_name,photo_url')
            .in('id', teacherIds);
          if (teacherError) throw teacherError;
          (teachers || []).forEach((teacher: any) => teacherMap.set(teacher.id, teacher));
        }

        const compulsoryMap = new Map((classSubjects || []).map((row: any) => [row.subject_id, Boolean(row.is_compulsory)]));
        const finalSubjects = subjectRows.map((subject: any) => {
          const assignment = (teacherAssignments || []).find((row: any) => row.subject_id === subject.id && row.class_id === studentData.class_id)
            || (teacherAssignments || []).find((row: any) => row.subject_id === subject.id);
          const teacher = assignment ? teacherMap.get(assignment.teacher_id) : null;
          return {
            id: subject.id,
            name: subject.name,
            code: subject.code,
            description: subject.description,
            teacher: teacher ? [teacher.first_name, teacher.middle_name, teacher.last_name].filter(Boolean).join(' ') : null,
            teacherPhoto: teacher?.photo_url || null,
            compulsory: compulsoryMap.get(subject.id) || false,
          } as SubjectRow;
        }).sort((a, b) => a.name.localeCompare(b.name));

        if (!mounted) return;
        setStudent(studentData as Student);
        setSchoolClass(classData as SchoolClass);
        setSessions(validSessions);
        setSubjects(finalSubjects);

        const defaultRows = validSessions.filter((row) => row.session_name === DEFAULT_SESSION);
        const initialRows = defaultRows.length ? defaultRows : validSessions.filter((row) => row.session_name === validSessions[0]?.session_name);
        const initialSession = initialRows[0]?.session_name || DEFAULT_SESSION;
        const initialTerm = initialRows.find((row) => row.term_number === 1)?.term_name || initialRows[0]?.term_name || DEFAULT_TERM;
        setSessionName(initialSession);
        setSelectedTerm(termLabel(initialTerm));
      } catch (err: any) {
        console.error('Student classes loading error:', err);
        if (mounted) setError(err?.message || 'Unable to load your classes.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!sessionName || !student?.branch_id || !schoolClass?.id) return;
    const loadSchemes = async () => {
      setSchemeLoading(true);
      setSchemes({});
      try {
        // The terms table stores the canonical names used by the current database:
        // First Term, Second Term, Third Term. Never convert them to 1st/2nd/3rd.
        const { data: termData, error: termError } = await supabase
          .from('terms')
          .select('id,branch_id,session,term,start_date,end_date,is_active,is_closed')
          .eq('branch_id', student.branch_id)
          .eq('session', sessionName);
        if (termError) throw termError;

        const termRows = ((termData || []) as TermRow[]).sort((a, b) => termNumber(a.term) - termNumber(b.term));
        setTerms(termRows);

        const selected = termRows.find((row) => normalizeTerm(row.term) === normalizeTerm(selectedTerm))
          || termRows.find((row) => termNumber(row.term) === termNumber(selectedTerm))
          || termRows.find((row) => row.is_active)
          || termRows[0];

        if (!selected) return;
        const canonicalLabel = termLabel(selected.term);
        if (canonicalLabel !== selectedTerm) setSelectedTerm(canonicalLabel);

        const { data: schemeData, error: schemeError } = await supabase
          .from('scheme_of_work')
          .select('id,subject_id,week_number,topic,sub_topic,objectives,activities,resources,assessment,duration')
          .eq('class_id', schoolClass.id)
          .eq('term_id', selected.id)
          .order('week_number', { ascending: true });
        if (schemeError) throw schemeError;

        const grouped: Record<string, SchemeRow[]> = {};
        ((schemeData || []) as SchemeRow[]).filter((row) => true).forEach((row) => {
          if (!grouped[row.subject_id]) grouped[row.subject_id] = [];
          grouped[row.subject_id].push(row);
        });
        setSchemes(grouped);
        setExpanded((current) => {
          const next = { ...current };
          subjects.forEach((subject) => { if ((grouped[subject.id] || []).length) next[subject.id] = true; });
          return next;
        });
      } catch (err) {
        console.error('Scheme loading error:', err);
      } finally {
        setSchemeLoading(false);
      }
    };
    void loadSchemes();
  }, [sessionName, selectedTerm, student?.branch_id, schoolClass?.id, subjects]);

  useEffect(() => {
    if (!selectedSessionRows.length) return;
    if (!selectedSessionRows.some((row) => termNumber(row.term_name) === termNumber(selectedTerm))) {
      const first = selectedSessionRows.find((row) => row.term_number === 1) || selectedSessionRows[0];
      setSelectedTerm(termLabel(first.term_name));
    }
  }, [selectedSessionRows, selectedTerm]);

  const sessionOptions = useMemo(
    () => allowedSessions.filter((name) => sessions.some((row) => row.session_name === name)).sort((a, b) => Number(b.slice(0, 4)) - Number(a.slice(0, 4))),
    [sessions],
  );

  const totalSchemeEntries = useMemo(() => Object.values(schemes).reduce((sum, rows) => sum + rows.length, 0), [schemes]);
  const subjectsWithSchemes = subjects.filter((subject) => (schemes[subject.id] || []).length > 0).length;
  const coverage = subjects.length ? Math.round((subjectsWithSchemes / subjects.length) * 100) : 0;

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></div>;
  }

  if (error) {
    return <div className="mx-auto max-w-3xl p-6"><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div></div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <section className="rounded-3xl bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-600 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-blue-100">Academic Classes</p>
            <h1 className="mt-1 text-3xl font-bold">{schoolClass?.name || 'My Class'}</h1>
            <p className="mt-1 text-blue-100">{student ? [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ') : ''}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur"><BookOpen className="mb-2 h-5 w-5" /><div className="text-2xl font-bold">{subjects.length}</div><div className="text-xs text-blue-100">Subjects</div></div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur"><Users className="mb-2 h-5 w-5" /><div className="text-2xl font-bold">{new Set(subjects.map((s) => s.teacher).filter(Boolean)).size}</div><div className="text-xs text-blue-100">Teachers</div></div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur"><CalendarDays className="mb-2 h-5 w-5" /><div className="text-2xl font-bold">{totalSchemeEntries}</div><div className="text-xs text-blue-100">Scheme entries</div></div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur"><CheckCircle2 className="mb-2 h-5 w-5" /><div className="text-2xl font-bold">{coverage}%</div><div className="text-xs text-blue-100">Coverage</div></div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <label className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Academic Session</span>
          <select value={sessionName} onChange={(e) => setSessionName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
            {sessionOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Academic Term</span>
          <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
            {selectedSessionRows.map((row) => <option key={`${row.id}-${row.term_name}`} value={termLabel(row.term_name)}>{termLabel(row.term_name)}</option>)}
          </select>
        </label>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">Current academic period</div>
          <div className="flex items-center gap-3"><GraduationCap className="h-6 w-6 text-indigo-600" /><div><div className="font-semibold text-slate-900 dark:text-white">{termLabel(selectedTerm)}</div><div className="text-xs text-slate-500">{formatDate(selectedTermRecord?.start_date)} — {formatDate(selectedTermRecord?.end_date)}</div></div></div>
        </div>
      </section>

      {schemeLoading && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading scheme of work…</div>}

      <section className="space-y-3">
        {subjects.map((subject) => {
          const rows = schemes[subject.id] || [];
          const open = Boolean(expanded[subject.id]);
          return (
            <article key={subject.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <button type="button" onClick={() => setExpanded((current) => ({ ...current, [subject.id]: !open }))} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"><BookOpen className="h-5 w-5" /></div>
                  <div className="min-w-0"><div className="truncate font-semibold text-slate-900 dark:text-white">{subject.name}</div><div className="flex flex-wrap gap-2 text-xs text-slate-500"><span>{subject.code}</span>{subject.teacher && <span>• {subject.teacher}</span>}{subject.compulsory && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Compulsory</span>}</div></div>
                </div>
                <div className="flex shrink-0 items-center gap-3"><span className="text-xs text-slate-500">{rows.length} scheme {rows.length === 1 ? 'entry' : 'entries'}</span>{open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</div>
              </button>
              {open && <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                {rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No scheme of work has been entered for this subject in {termLabel(selectedTerm)}.</p> : <div className="space-y-3">{rows.map((row) => <div key={row.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60"><div className="flex gap-3"><span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-indigo-600 px-2 text-xs font-bold text-white">W{row.week_number}</span><div className="min-w-0 flex-1"><h3 className="font-semibold text-slate-900 dark:text-white">{row.topic}</h3>{row.sub_topic && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.sub_topic}</p>}<div className="mt-3 grid gap-3 md:grid-cols-2">{row.objectives && <div><div className="text-xs font-semibold uppercase text-slate-400">Objectives</div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.objectives}</p></div>}{row.activities && <div><div className="text-xs font-semibold uppercase text-slate-400">Activities</div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.activities}</p></div>}{row.resources && <div><div className="text-xs font-semibold uppercase text-slate-400">Resources</div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.resources}</p></div>}{row.assessment && <div><div className="text-xs font-semibold uppercase text-slate-400">Assessment</div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.assessment}</p></div>}</div></div></div></div>)}</div>}
              </div>}
            </article>
          );
        })}
      </section>

      {!subjects.length && <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">No subjects are currently assigned to your class.</div>}
    </div>
  );
};

export default StudentClassesFixed;
