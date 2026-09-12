
import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Filter,
  Loader2,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

type Session = {
  id: string;
  session_name: string;
  term_name: string;
  is_current: boolean;
  branch_id: string;
  start_date: string;
  end_date: string;
};

type Term = {
  id: string;
  session: string;
  term: string;
  is_active: boolean;
  is_closed: boolean;
  start_date: string;
  end_date: string;
};

type ClassItem = {
  id: string;
  name: string;
  code: string | null;
  level: string | null;
  department: string | null;
  branch_id: string;
};

type SubjectItem = {
  id: string;
  name: string;
  code: string | null;
};

type ResultRow = {
  id: string;
  student_id: string;
  score: number;
  percentage: number | null;
  grade: string | null;
  remark: string | null;
  position: number | null;
  student: {
    first_name: string | null;
    middle_name?: string | null;
    last_name: string | null;
    admission_number: string | null;
  } | null;
};

type AssessmentType =
  | 'first_test'
  | 'second_test'
  | 'ca'
  | 'exam';

const labels: Record<AssessmentType, string> = {
  first_test: 'Test 1',
  second_test: 'Test 2',
  ca: 'CA',
  exam: 'Exam',
};

const batchType = (
  type: AssessmentType,
) =>
  type === 'ca'
    ? 'continuous_assessment'
    : type;

const normaliseTerm = (
  value: string | null | undefined,
) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace('first', '1st')
    .replace('second', '2nd')
    .replace('third', '3rd');

const AdminViewResults: React.FC = () => {
  const { user } = useAuth();

  const [branchId, setBranchId] =
    useState('');

  const [sessions, setSessions] =
    useState<Session[]>([]);

  const [terms, setTerms] =
    useState<Term[]>([]);

  const [classes, setClasses] =
    useState<ClassItem[]>([]);

  const [subjects, setSubjects] =
    useState<SubjectItem[]>([]);

  const [results, setResults] =
    useState<ResultRow[]>([]);

  const [selectedSessionId, setSelectedSessionId] =
    useState('');

  const [selectedTermId, setSelectedTermId] =
    useState('');

  const [classId, setClassId] =
    useState('');

  const [subjectId, setSubjectId] =
    useState('');

  const [assessmentType, setAssessmentType] =
    useState<AssessmentType>(
      'first_test',
    );

  const [maxScore, setMaxScore] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [loadingResults, setLoadingResults] =
    useState(false);

  const selectedSession =
    sessions.find(
      (x) =>
        x.id ===
        selectedSessionId,
    );

  const selectedTerm =
    terms.find(
      (x) =>
        x.id ===
        selectedTermId,
    );

  const selectedClass =
    classes.find(
      (x) =>
        x.id === classId,
    );

  const selectedSubject =
    subjects.find(
      (x) =>
        x.id === subjectId,
    );

  const visibleSessions =
    useMemo(
      () => sessions,
      [sessions],
    );

  useEffect(() => {
    if (user?.id) {
      void loadContext();
    }
  }, [user?.id]);

  useEffect(() => {
    if (
      selectedSessionId &&
      selectedSession
    ) {
      void loadTerms(
        selectedSession,
      );
    }
  }, [
    selectedSessionId,
  ]);

  useEffect(() => {
    if (classId) {
      void loadSubjects(
        classId,
      );
    } else {
      setSubjects([]);
      setSubjectId('');
    }
  }, [classId]);

  useEffect(() => {
    if (
      selectedSessionId &&
      selectedTermId &&
      classId &&
      subjectId
    ) {
      void loadAssessmentMaximum();
    } else {
      setMaxScore(0);
    }
  }, [
    selectedSessionId,
    selectedTermId,
    classId,
    subjectId,
    assessmentType,
  ]);

  async function loadContext() {
    setLoading(true);

    try {
      const {
        data: userData,
        error: ue,
      } = await supabase
        .from('users')
        .select('branch_id')
        .eq(
          'id',
          user!.id,
        )
        .single();

      if (ue) {
        throw ue;
      }

      if (!userData?.branch_id) {
        throw new Error(
          'Your account is not linked to a school branch.',
        );
      }

      setBranchId(
        userData.branch_id,
      );

      const [
        {
          data: sessionData,
          error: se,
        },
        {
          data: classData,
          error: ce,
        },
      ] = await Promise.all([
        supabase
          .from(
            'academic_sessions',
          )
          .select(
            'id,session_name,term_name,is_current,branch_id,start_date,end_date',
          )
          .eq(
            'branch_id',
            userData.branch_id,
          )
          .order(
            'start_date',
            {
              ascending: false,
            },
          ),

        supabase
          .from('classes')
          .select(
            'id,name,code,level,department,branch_id',
          )
          .eq(
            'branch_id',
            userData.branch_id,
          )
          .eq(
            'status',
            'active',
          )
          .order('name'),
      ]);

      if (se) {
        throw se;
      }

      if (ce) {
        throw ce;
      }

      setSessions(
        (sessionData ||
          []) as Session[],
      );

      setClasses(
        (classData ||
          []) as ClassItem[],
      );

      const current =
        (sessionData || []).find(
          (x: any) =>
            x.is_current,
        ) ||
        sessionData?.[0];

      if (current) {
        setSelectedSessionId(
          current.id,
        );
      } else {
        toast.error(
          'No academic sessions have been configured.',
        );
      }

      if (!classData?.length) {
        toast.error(
          'No active classes were found for your branch.',
        );
      }
    } catch (e: any) {
      console.error(e);

      toast.error(
        e.message ||
          'Failed to load result filters.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadTerms(
    session: Session,
  ) {
    setSelectedTermId('');
    setTerms([]);
    setResults([]);

    const {
      data,
      error,
    } = await supabase
      .from('terms')
      .select(
        'id,session,term,is_active,is_closed,start_date,end_date',
      )
      .eq(
        'branch_id',
        branchId,
      )
      .eq(
        'session',
        session.session_name,
      )
      .order(
        'start_date',
        {
          ascending: false,
        },
      );

    if (error) {
      toast.error(
        error.message,
      );
      return;
    }

    const loaded =
      (data || []) as Term[];

    setTerms(loaded);

    const match =
      loaded.find(
        (x) =>
          normaliseTerm(
            x.term,
          ) ===
          normaliseTerm(
            session.term_name,
          ),
      );

    setSelectedTermId(
      match?.id ||
        loaded[0]?.id ||
        '',
    );
  }

  async function loadSubjects(
    selectedClassId: string,
  ) {
    setSubjects([]);
    setSubjectId('');
    setResults([]);

    try {
      const {
        data,
        error,
      } = await supabase
        .from(
          'class_subjects',
        )
        .select(
          'subject_id,subjects:subject_id(id,name,code)',
        )
        .eq(
          'class_id',
          selectedClassId,
        )
        .eq(
          'status',
          'active',
        );

      if (error) {
        throw error;
      }

      const assigned =
        (data || [])
          .map(
            (x: any) =>
              x.subjects,
          )
          .filter(Boolean) as SubjectItem[];

      if (assigned.length) {
        setSubjects(
          assigned.sort(
            (a, b) =>
              a.name.localeCompare(
                b.name,
              ),
          ),
        );

        return;
      }

      const {
        data: fallback,
        error: fe,
      } = await supabase
        .from('subjects')
        .select(
          'id,name,code',
        )
        .eq(
          'branch_id',
          branchId,
        )
        .order('name');

      if (fe) {
        throw fe;
      }

      setSubjects(
        (fallback ||
          []) as SubjectItem[],
      );
    } catch (e: any) {
      toast.error(
        e.message ||
          'Failed to load subjects.',
      );
    }
  }

  async function loadAssessmentMaximum() {
    const {
      data,
      error,
    } = await supabase
      .from(
        'result_assessment_configs',
      )
      .select(
        'components,total_max,first_test_max,second_test_max,exam_max',
      )
      .eq(
        'academic_session_id',
        selectedSessionId,
      )
      .eq(
        'term_id',
        selectedTermId,
      )
      .maybeSingle();

    if (error) {
      setMaxScore(0);
      return;
    }

    const key =
      assessmentType;

    const component =
      Array.isArray(
        data?.components,
      )
        ? data.components.find(
            (x: any) =>
              x?.key === key,
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
        component?.max_score ??
          fallback ??
          0,
      ),
    );
  }

  async function fetchResults() {
    if (
      !selectedSessionId ||
      !selectedTermId ||
      !classId ||
      !subjectId
    ) {
      toast.error(
        'Select session, term, class and subject first.',
      );

      return;
    }

    setLoadingResults(true);

    try {
      const type =
        batchType(
          assessmentType,
        );

      const {
        data: batches,
        error: be,
      } = await supabase
        .from(
          'result_batches',
        )
        .select(
          'id,max_score,status,title,assessment_type,assessment_date',
        )
        .eq(
          'academic_session_id',
          selectedSessionId,
        )
        .eq(
          'term_id',
          selectedTermId,
        )
        .eq(
          'class_id',
          classId,
        )
        .eq(
          'subject_id',
          subjectId,
        )
        .eq(
          'assessment_type',
          type,
        )
        .order(
          'created_at',
          {
            ascending: false,
          },
        );

      if (be) {
        throw be;
      }

      const batch =
        batches?.[0];

      if (!batch) {
        setResults([]);

        toast.info(
          `No ${labels[assessmentType]} has been entered for this selection.`,
        );

        return;
      }

      const resolvedMax =
        Number(
          batch.max_score ||
            maxScore ||
            0,
        );

      setMaxScore(
        resolvedMax,
      );

      const {
        data: entries,
        error: ee,
      } = await supabase
        .from(
          'result_entries',
        )
        .select(
          'id,student_id,score,percentage,grade,remark,position',
        )
        .eq(
          'batch_id',
          batch.id,
        )
        .order(
          'position',
          {
            ascending: true,
            nullsFirst: false,
          },
        );

      if (ee) {
        throw ee;
      }

      const entryRows =
        (entries ||
          []) as any[];

      const studentIds =
        Array.from(
          new Set(
            entryRows
              .map(
                (x) =>
                  x.student_id,
              )
              .filter(Boolean),
          ),
        );

      let studentMap =
        new Map<
          string,
          any
        >();

      if (
        studentIds.length
      ) {
        const {
          data: students,
          error: se,
        } = await supabase
          .from(
            'students',
          )
          .select(
            'id,first_name,middle_name,last_name,admission_number',
          )
          .in(
            'id',
            studentIds,
          );

        if (se) {
          throw se;
        }

        studentMap =
          new Map(
            (students || []).map(
              (x: any) => [
                x.id,
                x,
              ],
            ),
          );
      }

      setResults(
        entryRows.map(
          (row) => ({
            ...row,
            student:
              studentMap.get(
                row.student_id,
              ) || null,
          }),
        ) as ResultRow[],
      );
    } catch (e: any) {
      console.error(e);

      toast.error(
        e.message ||
          'Failed to load results.',
      );

      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
            <BarChart3 className="h-4 w-4" />
            Results administration
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            View Results
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Review results across the selected session,
            term, class, subject and assessment.
          </p>
        </div>
      </div>

      <section className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-5 flex items-center gap-2">
          <Filter className="h-5 w-5 text-indigo-600" />

          <div>
            <h2 className="font-black">
              Result filters
            </h2>

            <p className="text-xs text-slate-500">
              Test 1, Test 2, CA and Exam are separate result
              components.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="text-sm font-bold">
              Session

              <select
                value={selectedSessionId}
                onChange={(e) =>
                  setSelectedSessionId(
                    e.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"
              >
                <option value="">
                  Select session
                </option>

                {visibleSessions.map(
                  (s) => (
                    <option
                      key={s.id}
                      value={s.id}
                    >
                      {s.session_name}
                      {s.is_current
                        ? ' — Current'
                        : ''}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="text-sm font-bold">
              Term

              <select
                value={selectedTermId}
                onChange={(e) =>
                  setSelectedTermId(
                    e.target.value,
                  )
                }
                disabled={
                  !selectedSessionId
                }
                className="mt-2 w-full rounded-xl border px-3 py-3 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900"
              >
                <option value="">
                  Select term
                </option>

                {terms.map(
                  (t) => (
                    <option
                      key={t.id}
                      value={t.id}
                    >
                      {t.term}
                      {t.is_closed
                        ? ' — Closed'
                        : t.is_active
                          ? ' — Active'
                          : ''}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="text-sm font-bold">
              Class

              <select
                value={classId}
                onChange={(e) =>
                  setClassId(
                    e.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"
              >
                <option value="">
                  Select class
                </option>

                {classes.map(
                  (c) => (
                    <option
                      key={c.id}
                      value={c.id}
                    >
                      {c.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="text-sm font-bold">
              Subject

              <select
                value={subjectId}
                onChange={(e) =>
                  setSubjectId(
                    e.target.value,
                  )
                }
                disabled={!classId}
                className="mt-2 w-full rounded-xl border px-3 py-3 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900"
              >
                <option value="">
                  Select subject
                </option>

                {subjects.map(
                  (s) => (
                    <option
                      key={s.id}
                      value={s.id}
                    >
                      {s.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="text-sm font-bold">
              Assessment

              <select
                value={
                  assessmentType
                }
                onChange={(e) =>
                  setAssessmentType(
                    e.target
                      .value as AssessmentType,
                  )
                }
                className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"
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
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            {selectedSession?.session_name ||
              'No session'}{' '}
            ·{' '}
            {selectedTerm?.term ||
              'No term'}{' '}
            ·{' '}
            {selectedClass?.name ||
              'No class'}{' '}
            ·{' '}
            {selectedSubject?.name ||
              'No subject'}

            {maxScore > 0 && (
              <span className="ml-2 font-bold text-indigo-600">
                Max: {maxScore}
              </span>
            )}
          </div>

          <button
            onClick={() =>
              void fetchResults()
            }
            disabled={
              loadingResults ||
              !classId ||
              !subjectId ||
              !selectedTermId
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {loadingResults ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}

            View Results
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-2 border-b p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <div>
            <h2 className="font-black">
              {labels[assessmentType]} —{' '}
              {selectedSubject?.name ||
                'Subject'}
            </h2>

            <p className="text-xs text-slate-500">
              {selectedClass?.name ||
                'Class'}{' '}
              ·{' '}
              {selectedSession?.session_name ||
                'Session'}{' '}
              ·{' '}
              {selectedTerm?.term ||
                'Term'}
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold dark:bg-slate-700">
            {results.length}{' '}
            student
            {results.length ===
            1
              ? ''
              : 's'}
          </span>
        </div>

        {loadingResults ? (
          <div className="flex min-h-[250px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : results.length ===
          0 ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center">
            <CalendarDays className="mb-3 h-10 w-10 text-slate-300" />

            <p className="font-bold text-slate-600 dark:text-slate-300">
              No result entries found
            </p>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              Choose the assessment component
              and click View Results.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr>
                  <th className="px-4 py-3 text-left">
                    Position
                  </th>

                  <th className="px-4 py-3 text-left">
                    Admission No.
                  </th>

                  <th className="px-4 py-3 text-left">
                    Student
                  </th>

                  <th className="px-4 py-3 text-right">
                    Score /{' '}
                    {maxScore ||
                      '—'}
                  </th>

                  <th className="px-4 py-3 text-right">
                    %
                  </th>

                  <th className="px-4 py-3 text-left">
                    Grade
                  </th>

                  <th className="px-4 py-3 text-left">
                    Remark
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y dark:divide-slate-700">
                {results.map(
                  (
                    row,
                    i,
                  ) => {
                    const name = [
                      row.student
                        ?.first_name,
                      row.student
                        ?.middle_name,
                      row.student
                        ?.last_name,
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(' ') ||
                      'Unknown Student';

                    const percentage =
                      row.percentage ??
                      (maxScore
                        ? (Number(
                            row.score,
                          ) /
                            maxScore) *
                          100
                        : 0);

                    return (
                      <tr
                        key={
                          row.id
                        }
                      >
                        <td className="px-4 py-3 font-bold">
                          {row.position ||
                            i + 1}
                        </td>

                        <td className="px-4 py-3">
                          {row
                            .student
                            ?.admission_number ||
                            '—'}
                        </td>

                        <td className="px-4 py-3 font-bold">
                          {name}
                        </td>

                        <td className="px-4 py-3 text-right font-black">
                          {Number(
                            row.score,
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {Number(
                            percentage,
                          ).toFixed(
                            1,
                          )}
                          %
                        </td>

                        <td className="px-4 py-3 font-black">
                          {row.grade ||
                            '—'}
                        </td>

                        <td className="px-4 py-3">
                          {row.remark ||
                            '—'}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminViewResults;
