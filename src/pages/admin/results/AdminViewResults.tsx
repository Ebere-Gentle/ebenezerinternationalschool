import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CalendarDays, Filter, Loader2, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

interface Session {
  id: string;
  session_name: string;
  term_name: string;
  is_current: boolean;
  branch_id: string;
  start_date: string;
  end_date: string;
}

interface Term {
  id: string;
  session: string;
  term: string;
  is_active: boolean;
  is_closed: boolean;
  start_date: string;
  end_date: string;
}

interface ClassItem {
  id: string;
  name: string;
  code: string | null;
  level: string | null;
  department: string | null;
  branch_id: string;
}

interface SubjectItem {
  id: string;
  name: string;
  code: string | null;
}

interface ResultRow {
  id: string;
  student_id: string;
  score: number;
  percentage: number | null;
  grade: string | null;
  remark: string | null;
  position: number | null;
  student: {
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    admission_number: string | null;
  } | null;
}

const normaliseTerm = (value: string | null | undefined) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace('first', '1st')
    .replace('second', '2nd')
    .replace('third', '3rd');

const assessmentLabels: Record<string, string> = {
  first_test: 'Test 1',
  second_test: 'Test 2',
  exam: 'Exam',
};

const AdminViewResults: React.FC = () => {
  const { user } = useAuth();
  const [branchId, setBranchId] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [assessmentType, setAssessmentType] = useState<'first_test' | 'second_test' | 'exam'>('first_test');
  const [maxScore, setMaxScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);

  const selectedSession = sessions.find(item => item.id === selectedSessionId);
  const selectedTerm = terms.find(item => item.id === selectedTermId);
  const selectedClass = classes.find(item => item.id === classId);
  const selectedSubject = subjects.find(item => item.id === subjectId);

  const visibleSessions = useMemo(() => sessions, [sessions]);

  useEffect(() => {
    if (!user?.id) return;
    void loadContext();
  }, [user?.id]);

  useEffect(() => {
    if (!selectedSessionId || !selectedSession) return;
    void loadTerms(selectedSession);
  }, [selectedSessionId]);

  useEffect(() => {
    if (!classId) {
      setSubjects([]);
      setSubjectId('');
      return;
    }
    void loadSubjects(classId);
  }, [classId]);

  useEffect(() => {
    if (selectedSessionId && selectedTermId && classId && subjectId) {
      void loadAssessmentMaximum();
    } else {
      setMaxScore(0);
    }
  }, [selectedSessionId, selectedTermId, classId, subjectId, assessmentType]);

  async function loadContext() {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('branch_id')
        .eq('id', user.id)
        .single();
      if (userError) throw userError;
      if (!userData?.branch_id) throw new Error('Your account is not linked to a school branch.');

      const currentBranchId = userData.branch_id;
      setBranchId(currentBranchId);

      const [{ data: sessionData, error: sessionError }, { data: classData, error: classError }] = await Promise.all([
        supabase
          .from('academic_sessions')
          .select('id,session_name,term_name,is_current,branch_id,start_date,end_date')
          .eq('branch_id', currentBranchId)
          .order('start_date', { ascending: false }),
        supabase
          .from('classes')
          .select('id,name,code,level,department,branch_id')
          .eq('branch_id', currentBranchId)
          .eq('status', 'active')
          .order('name'),
      ]);

      if (sessionError) throw sessionError;
      if (classError) throw classError;

      const loadedSessions = (sessionData || []) as Session[];
      const loadedClasses = (classData || []) as ClassItem[];
      setSessions(loadedSessions);
      setClasses(loadedClasses);

      const current = loadedSessions.find(item => item.is_current) || loadedSessions[0];
      if (current) {
        setSelectedSessionId(current.id);
      } else {
        toast.error('No academic sessions have been configured. Go to Settings → Sessions.');
      }

      if (loadedClasses.length === 0) {
        toast.error('No active classes were found for your branch.');
      }
    } catch (error: any) {
      console.error('Error loading results context:', error);
      toast.error(error.message || 'Failed to load results filters');
    } finally {
      setLoading(false);
    }
  }

  async function loadTerms(session: Session) {
    setSelectedTermId('');
    setTerms([]);
    setResults([]);
    setSubjectId('');
    setSubjects([]);

    const { data, error } = await supabase
      .from('terms')
      .select('id,session,term,is_active,is_closed,start_date,end_date')
      .eq('branch_id', branchId)
      .eq('session', session.session_name)
      .order('start_date', { ascending: false });

    if (error) {
      toast.error(error.message || 'Failed to load terms');
      return;
    }

    const loadedTerms = (data || []) as Term[];
    setTerms(loadedTerms);

    const matching = loadedTerms.find(item => normaliseTerm(item.term) === normaliseTerm(session.term_name));
    setSelectedTermId(matching?.id || loadedTerms[0]?.id || '');
  }

  async function loadSubjects(selectedClassId: string) {
    setSubjects([]);
    setSubjectId('');

    try {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('class_subjects')
        .select('subject_id, subjects:subject_id(id,name,code)')
        .eq('class_id', selectedClassId)
        .eq('status', 'active');

      if (assignmentError) throw assignmentError;

      const assigned = (assignmentData || [])
        .map((row: any) => row.subjects)
        .filter(Boolean) as SubjectItem[];

      if (assigned.length > 0) {
        setSubjects(assigned.sort((a, b) => a.name.localeCompare(b.name)));
        return;
      }

      const { data: fallback, error: fallbackError } = await supabase
        .from('subjects')
        .select('id,name,code')
        .eq('branch_id', branchId)
        .order('name');
      if (fallbackError) throw fallbackError;
      setSubjects((fallback || []) as SubjectItem[]);
    } catch (error: any) {
      console.error('Error loading class subjects:', error);
      toast.error(error.message || 'Failed to load subjects for this class');
    }
  }

  async function loadAssessmentMaximum() {
    if (!selectedSessionId || !selectedTermId) return;

    const { data, error } = await supabase
      .from('result_assessment_configs')
      .select('components,total_max,first_test_max,second_test_max,exam_max')
      .eq('academic_session_id', selectedSessionId)
      .eq('term_id', selectedTermId)
      .maybeSingle();

    if (error) {
      console.error('Assessment config error:', error);
      setMaxScore(0);
      return;
    }

    const component = Array.isArray(data?.components)
      ? data.components.find((item: any) => item.key === assessmentType)
      : null;

    const fallback = assessmentType === 'first_test'
      ? data?.first_test_max
      : assessmentType === 'second_test'
        ? data?.second_test_max
        : data?.exam_max;

    setMaxScore(Number(component?.max_score ?? fallback ?? 0));
  }

  async function fetchResults() {
    if (!selectedSessionId || !selectedTermId || !classId || !subjectId) {
      toast.error('Select session, term, class and subject first.');
      return;
    }

    setLoadingResults(true);
    try {
      const { data: batches, error: batchError } = await supabase
        .from('result_batches')
        .select('id,max_score,status,title,assessment_type,assessment_date')
        .eq('academic_session_id', selectedSessionId)
        .eq('term_id', selectedTermId)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('assessment_type', assessmentType)
        .order('created_at', { ascending: false });

      if (batchError) throw batchError;

      const batch = batches?.[0];
      if (!batch) {
        setResults([]);
        toast.info(`No ${assessmentLabels[assessmentType]} has been entered for this selection.`);
        return;
      }

      setMaxScore(Number(batch.max_score || maxScore || 0));

      const { data: entryData, error: entryError } = await supabase
        .from('result_entries')
        .select(`
          id,
          student_id,
          score,
          percentage,
          grade,
          remark,
          position,
          students:student_id(first_name,middle_name,last_name,admission_number)
        `)
        .eq('batch_id', batch.id)
        .order('position', { ascending: true, nullsFirst: false });

      if (entryError) throw entryError;
      setResults((entryData || []) as unknown as ResultRow[]);
    } catch (error: any) {
      console.error('Error fetching results:', error);
      toast.error(error.message || 'Failed to load results');
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
            <BarChart3 className="h-4 w-4" /> Results administration
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">View Results</h1>
          <p className="mt-2 text-sm text-slate-500">Review results from the current or any previous academic session and term.</p>
        </div>
        <button onClick={() => void loadContext()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh filters
        </button>
      </motion.div>

      <section className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <Filter className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="font-black text-slate-900 dark:text-white">Result filters</h2>
            <p className="text-xs text-slate-500">All options are loaded from your school database.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[180px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Session
              <select value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 font-medium dark:border-slate-600 dark:bg-slate-900">
                <option value="">Select session</option>
                {visibleSessions.map(session => <option key={session.id} value={session.id}>{session.session_name}{session.is_current ? ' — Current' : ''}</option>)}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Term
              <select value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)} disabled={!selectedSessionId} className="mt-2 w-full rounded-xl border px-3 py-3 font-medium disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900">
                <option value="">Select term</option>
                {terms.map(term => <option key={term.id} value={term.id}>{term.term}{term.is_closed ? ' — Closed' : term.is_active ? ' — Active' : ''}</option>)}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Class
              <select value={classId} onChange={e => setClassId(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 font-medium dark:border-slate-600 dark:bg-slate-900">
                <option value="">Select class</option>
                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Subject
              <select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId} className="mt-2 w-full rounded-xl border px-3 py-3 font-medium disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900">
                <option value="">Select subject</option>
                {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Assessment
              <select value={assessmentType} onChange={e => setAssessmentType(e.target.value as typeof assessmentType)} className="mt-2 w-full rounded-xl border px-3 py-3 font-medium dark:border-slate-600 dark:bg-slate-900">
                <option value="first_test">Test 1</option>
                <option value="second_test">Test 2</option>
                <option value="exam">Exam</option>
              </select>
            </label>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            {selectedSession?.session_name || 'No session'} · {selectedTerm?.term || 'No term'} · {selectedClass?.name || 'No class'} · {selectedSubject?.name || 'No subject'}
            {maxScore > 0 && <span className="ml-2 font-bold text-indigo-600">Max: {maxScore}</span>}
          </div>
          <button onClick={() => void fetchResults()} disabled={loadingResults || !classId || !subjectId || !selectedTermId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50">
            {loadingResults ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            View Results
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-2 border-b p-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-black text-slate-900 dark:text-white">{assessmentLabels[assessmentType]} — {selectedSubject?.name || 'Subject'}</h2>
            <p className="text-xs text-slate-500">{selectedClass?.name || 'Class'} · {selectedSession?.session_name || 'Session'} · {selectedTerm?.term || 'Term'}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">{results.length} student{results.length === 1 ? '' : 's'}</span>
        </div>

        {loadingResults ? (
          <div className="flex min-h-[250px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
        ) : results.length === 0 ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center">
            <CalendarDays className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-bold text-slate-600 dark:text-slate-300">No result entries found</p>
            <p className="mt-1 max-w-md text-sm text-slate-500">Choose a session, term, class, subject and assessment, then click View Results.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr>
                  <th className="px-4 py-3 text-left font-black">Position</th>
                  <th className="px-4 py-3 text-left font-black">Admission No.</th>
                  <th className="px-4 py-3 text-left font-black">Student</th>
                  <th className="px-4 py-3 text-right font-black">Score / {maxScore || '—'}</th>
                  <th className="px-4 py-3 text-right font-black">%</th>
                  <th className="px-4 py-3 text-left font-black">Grade</th>
                  <th className="px-4 py-3 text-left font-black">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {results.map((row, index) => {
                  const name = [row.student?.first_name, row.student?.middle_name, row.student?.last_name].filter(Boolean).join(' ') || 'Unknown Student';
                  const percentage = row.percentage ?? (maxScore ? (Number(row.score) / maxScore) * 100 : 0);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                      <td className="px-4 py-3 font-bold">{row.position || index + 1}</td>
                      <td className="px-4 py-3 font-medium">{row.student?.admission_number || '—'}</td>
                      <td className="px-4 py-3 font-bold">{name}</td>
                      <td className="px-4 py-3 text-right font-black">{Number(row.score).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{Number(percentage).toFixed(1)}%</td>
                      <td className="px-4 py-3 font-black">{row.grade || '—'}</td>
                      <td className="px-4 py-3">{row.remark || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminViewResults;
