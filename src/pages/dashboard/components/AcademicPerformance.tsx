
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import ChartCard from './ChartCard';
import { supabase } from '../../../config/supabase/client';

/* =========================================================
   TYPES
========================================================= */

type ResultStatus = 'draft' | 'published' | string;

interface UserRecord {
  id: string;
  role: string | null;
  branch_id: string | null;
}

interface StudentRecord {
  id: string;
  user_id: string | null;
  branch_id: string | null;
  class_id: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface AcademicSession {
  id: string;
  session_name: string | null;
  term_name: string | null;
  term_number: number | null;
  is_current: boolean | null;
  branch_id: string | null;
}

interface TermRecord {
  id: string;
  branch_id: string | null;
  session: string | null;
  term: string | null;
  is_active: boolean | null;
}

interface ResultBatch {
  id: string;
  branch_id: string | null;
  academic_session_id: string | null;
  term_id: string | null;
  class_id: string | null;
  subject_id: string | null;
  assessment_type: string | null;
  title: string | null;
  max_score: number | null;
  weight: number | null;
  status: ResultStatus | null;
  published_by: string | null;
  published_at: string | null;
}

interface ResultEntry {
  id: string;
  batch_id: string;
  student_id: string;
  score: number | null;
  percentage: number | null;
  grade: string | null;
}

interface SubjectRecord {
  id: string;
  name: string | null;
  code: string | null;
}

interface PerformanceRow {
  subject: string;
  score: number;
  count: number;
}

/* =========================================================
   CONSTANTS
========================================================= */

const PUBLISHABLE_ROLES = new Set([
  'admin',
  'administrator',
  'director',
  'super_admin',
  'superadmin',
  'teacher',
  'head_teacher',
  'headteacher',
  'record_keeper',
]);

/* =========================================================
   HELPERS
========================================================= */

const normalizeRole = (value: unknown): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const isPublished = (status: unknown): boolean =>
  normalizeRole(status) === 'published';

const getPercentage = (
  entry: ResultEntry,
  batch?: ResultBatch | null,
): number => {
  if (
    typeof entry.percentage === 'number' &&
    Number.isFinite(entry.percentage)
  ) {
    return Math.max(0, Math.min(100, entry.percentage));
  }

  if (
    typeof entry.score === 'number' &&
    Number.isFinite(entry.score) &&
    typeof batch?.max_score === 'number' &&
    batch.max_score > 0
  ) {
    return Math.max(
      0,
      Math.min(100, (entry.score / batch.max_score) * 100),
    );
  }

  return 0;
};

const getScoreBarColor = (score: number): string => {
  if (score >= 75) return 'from-emerald-400 to-emerald-500';
  if (score >= 60) return 'from-blue-400 to-blue-500';
  if (score >= 50) return 'from-amber-400 to-amber-500';
  if (score >= 40) return 'from-orange-400 to-orange-500';
  return 'from-red-400 to-red-500';
};

const getScoreTextColor = (score: number): string => {
  if (score >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-blue-600 dark:text-blue-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  if (score >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

const getGradeFromScore = (score: number): string => {
  if (score >= 75) return 'A';
  if (score >= 65) return 'B';
  if (score >= 55) return 'C';
  if (score >= 45) return 'D';
  if (score >= 40) return 'E';
  return 'F';
};

/* =========================================================
   COMPONENT
========================================================= */

const AcademicPerformance: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [applicationUser, setApplicationUser] =
    useState<UserRecord | null>(null);

  const [student, setStudent] = useState<StudentRecord | null>(null);

  const [session, setSession] = useState<AcademicSession | null>(null);
  const [term, setTerm] = useState<TermRecord | null>(null);

  const [batches, setBatches] = useState<ResultBatch[]>([]);
  const [entries, setEntries] = useState<ResultEntry[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);

  /* ---------------------------------------------------------
     LOAD
  --------------------------------------------------------- */

  const loadPerformance = useCallback(async () => {
    try {
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error('You are not authenticated.');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, role, branch_id')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) {
        throw new Error(
          'Your application user record could not be found.',
        );
      }

      const currentUser: UserRecord = {
        id: userData.id,
        role: userData.role ?? null,
        branch_id: userData.branch_id ?? null,
      };

      setApplicationUser(currentUser);

      const role = normalizeRole(currentUser.role);
      const isStaff = PUBLISHABLE_ROLES.has(role);

      const { data: sessionData, error: sessionError } = await supabase
        .from('academic_sessions')
        .select(
          'id, session_name, term_name, term_number, is_current, branch_id',
        )
        .eq('is_current', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) throw sessionError;

      if (!sessionData) {
        setSession(null);
        setTerm(null);
        setStudent(null);
        setBatches([]);
        setEntries([]);
        setSubjects([]);
        return;
      }

      const currentSession: AcademicSession = {
        id: sessionData.id,
        session_name: sessionData.session_name ?? null,
        term_name: sessionData.term_name ?? null,
        term_number: sessionData.term_number ?? null,
        is_current: sessionData.is_current ?? null,
        branch_id: sessionData.branch_id ?? null,
      };

      setSession(currentSession);

      let termQuery = supabase
        .from('terms')
        .select('id, branch_id, session, term, is_active')
        .eq('is_active', true)
        .order('id', { ascending: false })
        .limit(1);

      if (currentUser.branch_id) {
        termQuery = termQuery.eq('branch_id', currentUser.branch_id);
      }

      const { data: termData, error: termError } =
        await termQuery.maybeSingle();

      if (termError) throw termError;

      const currentTerm: TermRecord | null = termData
        ? {
            id: termData.id,
            branch_id: termData.branch_id ?? null,
            session: termData.session ?? null,
            term: termData.term ?? null,
            is_active: termData.is_active ?? null,
          }
        : null;

      setTerm(currentTerm);

      let studentRecord: StudentRecord | null = null;

      if (!isStaff) {
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select(
            'id, user_id, branch_id, class_id, first_name, last_name',
          )
          .eq('user_id', user.id)
          .maybeSingle();

        if (studentError) throw studentError;

        studentRecord = studentData
          ? {
              id: studentData.id,
              user_id: studentData.user_id ?? null,
              branch_id: studentData.branch_id ?? null,
              class_id: studentData.class_id ?? null,
              first_name: studentData.first_name ?? null,
              last_name: studentData.last_name ?? null,
            }
          : null;

        setStudent(studentRecord);

        if (!studentRecord) {
          setBatches([]);
          setEntries([]);
          setSubjects([]);
          return;
        }
      } else {
        setStudent(null);
      }

      let batchQuery = supabase
        .from('result_batches')
        .select(
          `
            id,
            branch_id,
            academic_session_id,
            term_id,
            class_id,
            subject_id,
            assessment_type,
            title,
            max_score,
            weight,
            status,
            published_by,
            published_at
          `,
        )
        .eq('academic_session_id', currentSession.id);

      if (currentUser.branch_id) {
        batchQuery = batchQuery.eq('branch_id', currentUser.branch_id);
      }

      if (currentTerm?.id) {
        batchQuery = batchQuery.eq('term_id', currentTerm.id);
      }

      if (!isStaff && studentRecord?.class_id) {
        batchQuery = batchQuery.eq('class_id', studentRecord.class_id);
        batchQuery = batchQuery.eq('status', 'published');
      }

      const { data: batchData, error: batchError } =
        await batchQuery.order('created_at', { ascending: false });

      if (batchError) throw batchError;

      const loadedBatches: ResultBatch[] = (batchData || []).map(
        (item) => ({
          id: item.id,
          branch_id: item.branch_id ?? null,
          academic_session_id: item.academic_session_id ?? null,
          term_id: item.term_id ?? null,
          class_id: item.class_id ?? null,
          subject_id: item.subject_id ?? null,
          assessment_type: item.assessment_type ?? null,
          title: item.title ?? null,
          max_score:
            typeof item.max_score === 'number'
              ? item.max_score
              : item.max_score != null
                ? Number(item.max_score)
                : null,
          weight:
            typeof item.weight === 'number'
              ? item.weight
              : item.weight != null
                ? Number(item.weight)
                : null,
          status: item.status ?? null,
          published_by: item.published_by ?? null,
          published_at: item.published_at ?? null,
        }),
      );

      setBatches(loadedBatches);

      if (loadedBatches.length === 0) {
        setEntries([]);
        setSubjects([]);
        return;
      }

      const batchIds = loadedBatches.map((batch) => batch.id);

      let entryQuery = supabase
        .from('result_entries')
        .select('id, batch_id, student_id, score, percentage, grade')
        .in('batch_id', batchIds);

      if (!isStaff && studentRecord?.id) {
        entryQuery = entryQuery.eq('student_id', studentRecord.id);
      }

      const { data: entryData, error: entryError } = await entryQuery;
      if (entryError) throw entryError;

      const loadedEntries: ResultEntry[] = (entryData || []).map(
        (item) => ({
          id: item.id,
          batch_id: item.batch_id,
          student_id: item.student_id,
          score:
            typeof item.score === 'number'
              ? item.score
              : item.score != null
                ? Number(item.score)
                : null,
          percentage:
            typeof item.percentage === 'number'
              ? item.percentage
              : item.percentage != null
                ? Number(item.percentage)
                : null,
          grade: item.grade ?? null,
        }),
      );

      setEntries(loadedEntries);

      const subjectIds = Array.from(
        new Set(
          loadedBatches
            .map((batch) => batch.subject_id)
            .filter(Boolean) as string[],
        ),
      );

      if (subjectIds.length === 0) {
        setSubjects([]);
        return;
      }

      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('id, name, code')
        .in('id', subjectIds);

      if (subjectError) throw subjectError;

      setSubjects(
        (subjectData || []).map((item) => ({
          id: item.id,
          name: item.name ?? null,
          code: item.code ?? null,
        })),
      );
    } catch (err) {
      console.error('AcademicPerformance load error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load academic performance.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPerformance();
  }, [loadPerformance]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPerformance();
  };

  /* ---------------------------------------------------------
     COMPUTED
  --------------------------------------------------------- */

  const canPublish = useMemo(() => {
    if (!applicationUser) return false;
    return PUBLISHABLE_ROLES.has(
      normalizeRole(applicationUser.role),
    );
  }, [applicationUser]);

  const unpublishedBatches = useMemo(
    () => batches.filter((batch) => !isPublished(batch.status)),
    [batches],
  );

  const publishedBatches = useMemo(
    () => batches.filter((batch) => isPublished(batch.status)),
    [batches],
  );

  const performanceData = useMemo<PerformanceRow[]>(() => {
    const batchMap = new Map(batches.map((batch) => [batch.id, batch]));
    const subjectMap = new Map(
      subjects.map((subject) => [subject.id, subject]),
    );

    const grouped = new Map<
      string,
      { total: number; count: number }
    >();

    entries.forEach((entry) => {
      const batch = batchMap.get(entry.batch_id);
      if (!batch || !isPublished(batch.status)) return;
      if (!batch.subject_id) return;

      const percentage = getPercentage(entry, batch);

      const current = grouped.get(batch.subject_id) || {
        total: 0,
        count: 0,
      };

      current.total += percentage;
      current.count += 1;

      grouped.set(batch.subject_id, current);
    });

    return Array.from(grouped.entries())
      .map(([subjectId, values]) => {
        const subject = subjectMap.get(subjectId);

        return {
          subject:
            subject?.name ||
            subject?.code ||
            'Unknown Subject',
          score:
            values.count > 0
              ? Math.round((values.total / values.count) * 10) / 10
              : 0,
          count: values.count,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [batches, entries, subjects]);

  /* ---------------------------------------------------------
     PUBLISH
  --------------------------------------------------------- */

  const publishResults = async () => {
    if (!canPublish) {
      setError('You do not have permission to publish results.');
      return;
    }

    if (unpublishedBatches.length === 0) return;

    try {
      setPublishing(true);
      setError(null);

      const batchIds = unpublishedBatches.map((batch) => batch.id);

      const { data: updatedRows, error: publishError } = await supabase
        .from('result_batches')
        .update({
          status: 'published',
          published_by: applicationUser?.id,
          published_at: new Date().toISOString(),
        })
        .in('id', batchIds)
        .select('id, status, published_by, published_at');

      if (publishError) throw publishError;

      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(
          'No result batches were updated. Your database policies may not allow publishing.',
        );
      }

      await loadPerformance();
    } catch (err) {
      console.error('Publish results error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to publish results.',
      );
    } finally {
      setPublishing(false);
    }
  };

  const sessionLabel =
    session?.session_name || 'Current Academic Session';
  const termLabel =
    session?.term_name || term?.term || 'Current Term';

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */

  return (
    <ChartCard title="Academic Performance" icon={GraduationCap}>
      <div className="w-full min-w-0">
        {/* Header / Status */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {sessionLabel} · {termLabel}
          </p>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex h-[220px] items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
              <Loader2 className="h-7 w-7 animate-spin" />
              <span className="text-sm">
                Loading academic performance...
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* No student record */}
            {!canPublish && !student && (
              <div className="flex h-[220px] items-center justify-center">
                <div className="max-w-sm text-center">
                  <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
                  <p className="font-medium text-gray-700 dark:text-gray-200">
                    No student record is linked to this account.
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Please contact the school administrator to link your
                    student account.
                  </p>
                </div>
              </div>
            )}

            {/* Staff publish panel */}
            {canPublish && (
              <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-2">
                    {unpublishedBatches.length > 0 ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    )}

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {unpublishedBatches.length > 0
                          ? `${unpublishedBatches.length} result batch${
                              unpublishedBatches.length === 1
                                ? ''
                                : 'es'
                            } awaiting publication`
                          : 'All current results are published'}
                      </p>

                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {publishedBatches.length} published ·{' '}
                        {batches.length} total
                      </p>
                    </div>
                  </div>

                  {unpublishedBatches.length > 0 && (
                    <button
                      type="button"
                      onClick={publishResults}
                      disabled={publishing}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {publishing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Publish Results
                        </>
                      )}
                    </button>
                  )}
                </div>

                {unpublishedBatches.length > 0 && (
                  <div className="mt-2 max-h-[80px] overflow-y-auto pr-1">
                    <div className="space-y-1">
                      {unpublishedBatches.map((batch) => (
                        <div
                          key={batch.id}
                          className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300"
                        >
                          <Lock className="h-3 w-3 shrink-0 text-gray-400" />

                          <span className="min-w-0 truncate">
                            {batch.title ||
                              batch.assessment_type ||
                              'Result Batch'}
                          </span>

                          <span className="ml-auto shrink-0 text-gray-400">
                            {batch.max_score != null
                              ? `/${batch.max_score}`
                              : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Performance list (replaces Recharts bar chart) */}
            {performanceData.length > 0 ? (
              <div
                className="space-y-2.5 overflow-y-auto pr-1"
                style={{
                  maxHeight: '260px',
                  scrollbarGutter: 'stable',
                }}
              >
                {performanceData.map((row) => {
                  const grade = getGradeFromScore(row.score);

                  return (
                    <div key={row.subject} className="min-w-0">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[10px] font-bold dark:bg-gray-800 ${getScoreTextColor(
                              row.score,
                            )}`}
                          >
                            {grade}
                          </span>

                          <span className="truncate text-xs font-medium text-gray-700 dark:text-gray-200">
                            {row.subject}
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {row.count}{' '}
                            {row.count === 1 ? 'entry' : 'entries'}
                          </span>

                          <span
                            className={`text-xs font-semibold ${getScoreTextColor(
                              row.score,
                            )}`}
                          >
                            {row.score.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${getScoreBarColor(
                            row.score,
                          )} transition-all duration-500`}
                          style={{
                            width: `${Math.max(2, row.score)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-[220px] items-center justify-center">
                <div className="max-w-sm text-center">
                  <GraduationCap className="mx-auto mb-3 h-9 w-9 text-gray-300 dark:text-gray-600" />

                  <p className="font-medium text-gray-600 dark:text-gray-300">
                    No published results yet
                  </p>

                  <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                    Subject performance will appear here once results
                    have been published.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ChartCard>
  );
};

export default AcademicPerformance;