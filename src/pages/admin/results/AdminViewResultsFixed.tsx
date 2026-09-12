
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Filter,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  Table2,
  Users,
} from 'lucide-react';
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
  status?: string | null;
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

type AssessmentType =
  | 'first_test'
  | 'second_test'
  | 'ca'
  | 'exam';

const normaliseTerm = (
  v: string | null | undefined
) =>
  String(v || '')
    .trim()
    .toLowerCase()
    .replace('first', '1st')
    .replace('second', '2nd')
    .replace('third', '3rd');

const batchType = (v: AssessmentType) =>
  v === 'ca' ? 'continuous_assessment' : v;

const label = (v: AssessmentType) =>
  ({
    first_test: 'Test 1',
    second_test: 'Test 2',
    ca: 'CA',
    exam: 'Exam',
  })[v];

const AdminViewResultsFixed: React.FC = () => {
  const { user } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);

  const [sessionId, setSessionId] = useState('');
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [assessmentType, setAssessmentType] =
    useState<AssessmentType>('first_test');

  const [maxScore, setMaxScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [query, setQuery] = useState('');

  const session = sessions.find(
    (x) => x.id === sessionId
  );

  const cls = classes.find(
    (x) => x.id === classId
  );

  const subject = subjects.find(
    (x) => x.id === subjectId
  );

  useEffect(() => {
    if (user?.id) {
      void loadContext();
    }
  }, [user?.id]);

  useEffect(() => {
    if (session) {
      void loadTerms(session);
    }
  }, [sessionId]);

  useEffect(() => {
    if (classId) {
      void loadSubjects(classId);
    } else {
      setSubjects([]);
      setSubjectId('');
    }
  }, [classId]);

  useEffect(() => {
    if (
      sessionId &&
      termId &&
      classId &&
      subjectId
    ) {
      void loadMaximum();
    } else {
      setMaxScore(0);
    }
  }, [
    sessionId,
    termId,
    classId,
    subjectId,
    assessmentType,
  ]);

  async function loadContext() {
    setLoading(true);

    try {
      const {
        data: u,
        error: ue,
      } = await supabase
        .from('users')
        .select('role,branch_id')
        .eq('id', user!.id)
        .single();

      if (ue) throw ue;

      const role = String(
        u?.role || ''
      ).toLowerCase();

      if (
        ![
          'admin',
          'super_admin',
          'director',
        ].includes(role)
      ) {
        throw new Error(
          'You do not have permission to view administrative results.'
        );
      }

      const [
        {
          data: s,
          error: se,
        },
        {
          data: c,
          error: ce,
        },
      ] = await Promise.all([
        supabase
          .from('academic_sessions')
          .select(
            'id,session_name,term_name,is_current,branch_id,start_date,end_date'
          )
          .order('start_date', {
            ascending: false,
          }),

        supabase
          .from('classes')
          .select(
            'id,name,code,level,department,branch_id,status'
          )
          .eq('status', 'active')
          .order('name'),
      ]);

      if (se) throw se;
      if (ce) throw ce;

      const ss = (s || []) as Session[];

      setSessions(ss);
      setClasses(
        (c || []) as ClassItem[]
      );

      const current =
        ss.find(
          (x) => x.is_current
        ) || ss[0];

      if (current) {
        setSessionId(current.id);
      } else {
        toast.error(
          'No academic sessions have been configured.'
        );
      }
    } catch (e: any) {
      console.error(e);

      toast.error(
        e.message ||
          'Failed to load results filters'
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadTerms(
    s: Session
  ) {
    setTermId('');
    setTerms([]);
    setResults([]);
    setSubjectId('');
    setSubjects([]);

    const {
      data,
      error,
    } = await supabase
      .from('terms')
      .select(
        'id,session,term,is_active,is_closed,start_date,end_date'
      )
      .eq(
        'branch_id',
        s.branch_id
      )
      .eq(
        'session',
        s.session_name
      )
      .order('start_date', {
        ascending: false,
      });

    if (error) {
      toast.error(error.message);
      return;
    }

    const tt = (data || []) as Term[];

    setTerms(tt);

    const match = tt.find(
      (x) =>
        normaliseTerm(x.term) ===
        normaliseTerm(s.term_name)
    );

    setTermId(
      match?.id ||
        tt[0]?.id ||
        ''
    );
  }

  async function loadSubjects(
    id: string
  ) {
    setSubjects([]);
    setSubjectId('');

    try {
      const {
        data,
        error,
      } = await supabase
        .from('class_subjects')
        .select(
          'subject_id,subjects:subject_id(id,name,code)'
        )
        .eq(
          'class_id',
          id
        )
        .eq(
          'status',
          'active'
        );

      if (error) throw error;

      const a =
        (data || [])
          .map(
            (x: any) =>
              x.subjects
          )
          .filter(Boolean) as SubjectItem[];

      if (a.length) {
        setSubjects(
          a.sort(
            (x, y) =>
              x.name.localeCompare(
                y.name
              )
          )
        );

        return;
      }

      const c = classes.find(
        (x) => x.id === id
      );

      const {
        data: f,
        error: fe,
      } = await supabase
        .from('subjects')
        .select(
          'id,name,code'
        )
        .eq(
          'branch_id',
          c?.branch_id || ''
        )
        .order('name');

      if (fe) throw fe;

      setSubjects(
        (f || []) as SubjectItem[]
      );
    } catch (e: any) {
      toast.error(
        e.message ||
          'Failed to load subjects'
      );
    }
  }

  function resolveGroup(
    c: ClassItem | undefined
  ) {
    const n = String(
      c?.name || ''
    ).toLowerCase();

    const level = String(
      c?.level || ''
    ).toLowerCase();

    if (
      n.includes(
        'kg silver'
      )
    ) {
      return 'kg_silver';
    }

    if (
      n.includes(
        'kg gold'
      )
    ) {
      return 'kg_gold';
    }

    if (
      n.includes(
        'transition'
      ) ||
      n.includes(
        'grader'
      )
    ) {
      return 'transition_grader';
    }

    if (
      /\bjss\s*[1-9]/i.test(n)
    ) {
      return 'jss';
    }

    if (
      level === 'junior'
    ) {
      return 'jss';
    }

    if (
      /^grade\s*[1-9]/i.test(n) ||
      level === 'primary'
    ) {
      return 'primary';
    }

    if (
      level === 'senior' ||
      /\bss\s*[1-3]/i.test(n) ||
      n.includes('graduate')
    ) {
      return 'ss';
    }

    return 'nursery';
  }

  async function loadMaximum() {
    const {
      data,
      error,
    } = await supabase
      .from(
        'result_assessment_configs'
      )
      .select(
        'components,total_max,first_test_max,second_test_max,exam_max'
      )
      .eq(
        'academic_session_id',
        sessionId
      )
      .eq(
        'term_id',
        termId
      )
      .eq(
        'academic_group',
        resolveGroup(cls)
      )
      .eq(
        'status',
        'active'
      )
      .maybeSingle();

    if (error) {
      setMaxScore(0);
      return;
    }

    const c =
      Array.isArray(
        data?.components
      )
        ? data.components.find(
            (x: any) =>
              x.key ===
              assessmentType
          )
        : null;

    const fallback =
      assessmentType ===
      'first_test'
        ? data?.first_test_max
        : assessmentType ===
            'second_test'
          ? data?.second_test_max
          : assessmentType ===
              'exam'
            ? data?.exam_max
            : 0;

    setMaxScore(
      Number(
        c?.max_score ??
          fallback ??
          0
      )
    );
  }

  async function fetchResults() {
    if (
      !sessionId ||
      !termId ||
      !classId ||
      !subjectId
    ) {
      toast.error(
        'Select session, term, class and subject first.'
      );
      return;
    }

    setLoadingResults(true);

    try {
      const type =
        batchType(
          assessmentType
        );

      const {
        data: b,
        error: be,
      } = await supabase
        .from(
          'result_batches'
        )
        .select(
          'id,max_score,status,title,assessment_type,assessment_date'
        )
        .eq(
          'academic_session_id',
          sessionId
        )
        .eq(
          'term_id',
          termId
        )
        .eq(
          'class_id',
          classId
        )
        .eq(
          'subject_id',
          subjectId
        )
        .eq(
          'assessment_type',
          type
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        );

      if (be) throw be;

      const batch = b?.[0];

      if (!batch) {
        setResults([]);

        toast(
          `No ${label(
            assessmentType
          )} has been entered for this selection.`
        );

        return;
      }

      const resolvedMax =
        Number(
          batch.max_score ||
            maxScore ||
            0
        );

      setMaxScore(
        resolvedMax
      );

      const {
        data: e,
        error: ee,
      } = await supabase
        .from(
          'result_entries'
        )
        .select(
          'id,student_id,score,percentage,grade,remark,position'
        )
        .eq(
          'batch_id',
          batch.id
        )
        .order(
          'position',
          {
            ascending: true,
            nullsFirst: false,
          }
        );

      if (ee) throw ee;

      const rows =
        (e || []) as any[];

      const ids =
        Array.from(
          new Set(
            rows
              .map(
                (x) =>
                  x.student_id
              )
              .filter(Boolean)
          )
        );

      let map =
        new Map<
          string,
          any
        >();

      if (ids.length) {
        const {
          data: students,
          error: se,
        } = await supabase
          .from('students')
          .select(
            'id,first_name,middle_name,last_name,admission_number'
          )
          .in(
            'id',
            ids
          );

        if (se) throw se;

        map =
          new Map(
            (students || []).map(
              (x: any) => [
                x.id,
                x,
              ]
            )
          );
      }

      setResults(
        rows.map(
          (r) => ({
            ...r,
            student:
              map.get(
                r.student_id
              ) || null,
          })
        ) as ResultRow[]
      );
    } catch (e: any) {
      console.error(e);

      toast.error(
        e.message ||
          'Failed to load results'
      );

      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  }

  const visibleClasses =
    classes.filter((c) => {
      const q =
        query
          .trim()
          .toLowerCase();

      return (
        !q ||
        [
          c.name,
          c.code,
          c.level,
          c.department,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    });

  const selectedResultTitle =
    cls?.name ||
    'No class selected';

  const selectedResultSubtitle = [
    subject?.name,
    label(assessmentType),
    session?.session_name,
    terms.find(
      (t) => t.id === termId
    )?.term,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="min-h-full bg-slate-50/60 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* PAGE HEADER */}
        <motion.div
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              <BarChart3 className="h-4 w-4" />
              Results administration
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              View Results
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Review academic results by session, term, class,
              subject and assessment component.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/results/broadsheet"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Table2 className="h-4 w-4" />
              Class Broadsheet
            </Link>

            <button
              onClick={() =>
                void loadContext()
              }
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading
                    ? 'animate-spin'
                    : ''
                }`}
              />
              Refresh
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
              <p className="text-sm text-slate-500">
                Loading result filters...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* TWO COLUMN CONTROL AREA */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
              {/* LEFT: FILTER SECTION */}
              <motion.section
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                      <Filter className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Result filters
                      </h2>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Choose the academic context and assessment
                        you want to review.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 p-5 sm:p-6">
                  {/* ACADEMIC PERIOD */}
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-indigo-600" />

                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Academic period
                      </h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Session

                        <select
                          value={
                            sessionId
                          }
                          onChange={(e) =>
                            setSessionId(
                              e.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                          <option value="">
                            Select session
                          </option>

                          {sessions.map(
                            (s) => (
                              <option
                                key={
                                  s.id
                                }
                                value={
                                  s.id
                                }
                              >
                                {
                                  s.session_name
                                }
                                {s.is_current
                                  ? ' — Current'
                                  : ''}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Term

                        <select
                          value={
                            termId
                          }
                          onChange={(e) =>
                            setTermId(
                              e.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                          <option value="">
                            Select term
                          </option>

                          {terms.map(
                            (t) => (
                              <option
                                key={
                                  t.id
                                }
                                value={
                                  t.id
                                }
                              >
                                {t.term}
                                {t.is_closed
                                  ? ' — Closed'
                                  : t.is_active
                                    ? ' — Active'
                                    : ''}
                              </option>
                            )
                          )}
                        </select>
                      </label>
                    </div>
                  </div>

                  {/* CLASS & SUBJECT */}
                  <div className="border-t border-slate-100 pt-6 dark:border-slate-800">
                    <div className="mb-3 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-indigo-600" />

                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Class & subject
                      </h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Class

                        <div className="relative mt-2">
                          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />

                          <input
                            value={
                              query
                            }
                            onChange={(e) =>
                              setQuery(
                                e.target.value
                              )
                            }
                            placeholder="Search classes..."
                            className="mb-2 w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />

                          <select
                            value={
                              classId
                            }
                            onChange={(e) =>
                              setClassId(
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          >
                            <option value="">
                              Select class (
                              {
                                visibleClasses.length
                              }{' '}
                              available)
                            </option>

                            {visibleClasses.map(
                              (c) => (
                                <option
                                  key={
                                    c.id
                                  }
                                  value={
                                    c.id
                                  }
                                >
                                  {c.name}
                                  {c.code
                                    ? ` (${c.code})`
                                    : ''}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </label>

                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Subject

                        <select
                          value={
                            subjectId
                          }
                          onChange={(e) =>
                            setSubjectId(
                              e.target.value
                            )
                          }
                          disabled={
                            !classId
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
                        >
                          <option value="">
                            Select subject
                          </option>

                          {subjects.map(
                            (s) => (
                              <option
                                key={
                                  s.id
                                }
                                value={
                                  s.id
                                }
                              >
                                {s.name}
                              </option>
                            )
                          )}
                        </select>
                      </label>
                    </div>
                  </div>

                  {/* ASSESSMENT */}
                  <div className="border-t border-slate-100 pt-6 dark:border-slate-800">
                    <div className="mb-3 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-indigo-600" />

                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Assessment
                      </h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Assessment component

                        <select
                          value={
                            assessmentType
                          }
                          onChange={(e) =>
                            setAssessmentType(
                              e.target
                                .value as AssessmentType
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                          <option value="first_test">
                            Test 1
                          </option>

                          <option value="second_test">
                            Test 2
                          </option>

                          <option value="ca">
                            CA
                          </option>

                          <option value="exam">
                            Exam
                          </option>
                        </select>
                      </label>

                      <div className="flex items-end">
                        <button
                          onClick={() =>
                            void fetchResults()
                          }
                          disabled={
                            loadingResults
                          }
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loadingResults ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <BarChart3 className="h-4 w-4" />
                          )}

                          {loadingResults
                            ? 'Loading results...'
                            : 'Load results'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* RIGHT: SUMMARY */}
              <motion.div
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.08,
                }}
                className="space-y-6"
              >
                {/* CURRENT SELECTION */}
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />

                      <h2 className="font-bold text-slate-900 dark:text-white">
                        Current selection
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Class
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {cls?.name ||
                          'Not selected'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                        <p className="text-xs text-slate-400">
                          Subject
                        </p>

                        <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {subject?.name ||
                            'Not selected'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                        <p className="text-xs text-slate-400">
                          Assessment
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {label(
                            assessmentType
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                        <p className="text-xs text-slate-400">
                          Session
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {session?.session_name ||
                            '—'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                        <p className="text-xs text-slate-400">
                          Term
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {terms.find(
                            (t) =>
                              t.id ===
                              termId
                          )?.term ||
                            '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* CONFIGURED MAXIMUM */}
                <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white p-6 shadow-sm dark:border-indigo-950/60 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
                        Configured maximum
                      </p>

                      <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {maxScore ||
                          '—'}
                      </p>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Maximum score for{' '}
                        {label(
                          assessmentType
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-indigo-600 p-3 text-white shadow-sm">
                      <BookOpen className="h-5 w-5" />
                    </div>
                  </div>
                </section>

                {/* RESULT COUNT */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Loaded entries
                      </p>

                      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                        {results.length}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Student result records
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                </section>
              </motion.div>
            </div>

            {/* RESULTS SECTION */}
            <motion.section
              initial={{
                opacity: 0,
                y: 12,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.12,
              }}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-indigo-600" />

                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Result entries
                      </h2>
                    </div>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {selectedResultTitle}
                      {selectedResultSubtitle
                        ? ` · ${selectedResultSubtitle}`
                        : ''}
                    </p>
                  </div>

                  <div className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                    <Users className="h-4 w-4" />
                    {results.length} entries
                  </div>
                </div>
              </div>

              {results.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
                  <div className="rounded-2xl bg-slate-100 p-4 text-slate-400 dark:bg-slate-800">
                    <BarChart3 className="h-8 w-8" />
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-200">
                    No results loaded
                  </h3>

                  <p className="mt-1 max-w-md text-sm text-slate-500">
                    Select a session, term, class, subject and
                    assessment component, then click Load results.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left dark:bg-slate-950">
                      <tr>
                        <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          Pos.
                        </th>

                        <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          Student
                        </th>

                        <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          Admission No.
                        </th>

                        <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          Score / {maxScore || '—'}
                        </th>

                        <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          %
                        </th>

                        <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          Grade
                        </th>

                        <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          Remark
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {results.map(
                        (r, index) => (
                          <tr
                            key={
                              r.id
                            }
                            className="border-t border-slate-100 transition hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/50"
                          >
                            <td className="px-5 py-4">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {r.position ??
                                  index +
                                    1}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {[
                                  r
                                    .student
                                    ?.first_name,
                                  r
                                    .student
                                    ?.middle_name,
                                  r
                                    .student
                                    ?.last_name,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    ' '
                                  ) ||
                                  'Unknown Student'}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                              {r
                                .student
                                ?.admission_number ||
                                '—'}
                            </td>

                            <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                              {Number(
                                r.score
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {r.percentage ==
                              null
                                ? '—'
                                : Number(
                                    r.percentage
                                  ).toFixed(
                                    1
                                  )}
                            </td>

                            <td className="px-5 py-4">
                              <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                {r.grade ||
                                  '—'}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                              {r.remark ||
                                '—'}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.section>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminViewResultsFixed;
