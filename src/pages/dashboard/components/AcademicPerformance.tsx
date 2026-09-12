import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  GraduationCap,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import ChartCard from './ChartCard';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

interface AcademicPerformanceProps {
  branchId?: string | null;
}

interface SessionRow {
  id: string;
  session_name: string;
  term_name: string | null;
  term_number: number | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  branch_id: string | null;
}

interface TermRow {
  id: string;
  branch_id: string | null;
  session: string | null;
  term: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  is_closed: boolean;
}

interface ClassRow {
  id: string;
  name: string;
  code: string | null;
  branch_id: string | null;
  status: string | null;
}

interface SubjectRow {
  id: string;
  name: string;
  code: string | null;
  branch_id: string | null;
}

interface BatchRow {
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
  assessment_date: string | null;
  status: string;
}

interface EntryRow {
  batch_id: string;
  score: number | null;
  percentage: number | null;
}

interface ChartPoint {
  label: string;
  [key: string]: string | number | null;
}

type ViewMode = 'subjects' | 'classes';
type ComparisonMode = 'current' | 'terms' | 'sessions';

const LINE_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#059669',
  '#dc2626',
  '#d97706',
  '#0891b2',
  '#db2777',
  '#4f46e5',
  '#65a30d',
  '#9333ea',
];

const normalise = (value: string | null | undefined) =>
  String(value || '')
    .trim()
    .toLowerCase();

const getTermNumber = (term: TermRow | null) => {
  if (!term?.term) return null;

  const value = normalise(term.term);

  if (
    value.includes('first') ||
    value.includes('1st') ||
    value === '1' ||
    value.includes('term 1')
  ) {
    return 1;
  }

  if (
    value.includes('second') ||
    value.includes('2nd') ||
    value === '2' ||
    value.includes('term 2')
  ) {
    return 2;
  }

  if (
    value.includes('third') ||
    value.includes('3rd') ||
    value === '3' ||
    value.includes('term 3')
  ) {
    return 3;
  }

  return null;
};

const getTermLabel = (term: TermRow | null) => {
  if (!term) return 'Term';
  return term.term || 'Term';
};

const getAssessmentOrder = (batch: BatchRow) => {
  const type = normalise(batch.assessment_type);
  const title = normalise(batch.title);

  if (
    type.includes('first') ||
    title.includes('test 1') ||
    title.includes('first')
  ) {
    return 1;
  }

  if (
    type.includes('second') ||
    title.includes('test 2') ||
    title.includes('second')
  ) {
    return 2;
  }

  if (type.includes('continuous') || title.includes('ca')) {
    return 3;
  }

  if (type.includes('exam') || title.includes('exam')) {
    return 4;
  }

  if (type.includes('test')) {
    return 5;
  }

  return 10;
};

const getAssessmentLabel = (batch: BatchRow) => {
  const title = String(batch.title || '').trim();
  if (title) return title;

  const type = normalise(batch.assessment_type);

  if (type.includes('first')) return 'Test 1';
  if (type.includes('second')) return 'Test 2';
  if (type.includes('continuous')) return 'CA';
  if (type.includes('exam')) return 'Exam';

  return 'Assessment';
};

const AcademicPerformance: React.FC<AcademicPerformanceProps> = ({
  branchId: branchIdProp,
}) => {
  const { user } = useAuth();

  const branchId = branchIdProp ?? user?.branch_id ?? null;

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('subjects');
  const [comparisonMode, setComparisonMode] =
    useState<ComparisonMode>('current');

  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState('all');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');

  /* =========================================================
     LOAD DATA
     ========================================================= */
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        let sessionsQuery = supabase
          .from('academic_sessions')
          .select(
            `
              id,
              session_name,
              term_name,
              term_number,
              start_date,
              end_date,
              is_current,
              branch_id
            `,
          )
          .order('start_date', { ascending: false });

        if (branchId) {
          sessionsQuery = sessionsQuery.eq('branch_id', branchId);
        }

        let termsQuery = supabase
          .from('terms')
          .select(
            `
              id,
              branch_id,
              session,
              term,
              start_date,
              end_date,
              is_active,
              is_closed
            `,
          )
          .order('start_date', { ascending: true });

        if (branchId) {
          termsQuery = termsQuery.eq('branch_id', branchId);
        }

        let classesQuery = supabase
          .from('classes')
          .select(
            `
              id,
              name,
              code,
              branch_id,
              status
            `,
          )
          .order('name', { ascending: true });

        if (branchId) {
          classesQuery = classesQuery.eq('branch_id', branchId);
        }

        let subjectsQuery = supabase
          .from('subjects')
          .select(
            `
              id,
              name,
              code,
              branch_id
            `,
          )
          .order('name', { ascending: true });

        if (branchId) {
          subjectsQuery = subjectsQuery.eq('branch_id', branchId);
        }

        let batchesQuery = supabase
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
              assessment_date,
              status
            `,
          )
          .eq('status', 'published');

        if (branchId) {
          batchesQuery = batchesQuery.eq('branch_id', branchId);
        }

        const [
          sessionsResult,
          termsResult,
          classesResult,
          subjectsResult,
          batchesResult,
        ] = await Promise.all([
          sessionsQuery,
          termsQuery,
          classesQuery,
          subjectsQuery,
          batchesQuery,
        ]);

        if (sessionsResult.error) throw sessionsResult.error;
        if (termsResult.error) throw termsResult.error;
        if (classesResult.error) throw classesResult.error;
        if (subjectsResult.error) throw subjectsResult.error;
        if (batchesResult.error) throw batchesResult.error;

        const loadedSessions = (sessionsResult.data || []) as SessionRow[];
        const loadedTerms = (termsResult.data || []) as TermRow[];
        const loadedClasses = (classesResult.data || []) as ClassRow[];
        const loadedSubjects = (subjectsResult.data || []) as SubjectRow[];
        const loadedBatches = (batchesResult.data || []) as BatchRow[];

        const batchIds = loadedBatches.map((batch) => batch.id);

        let loadedEntries: EntryRow[] = [];

        if (batchIds.length > 0) {
          const entriesResult = await supabase
            .from('result_entries')
            .select(
              `
                batch_id,
                score,
                percentage
              `,
            )
            .in('batch_id', batchIds);

          if (entriesResult.error) throw entriesResult.error;

          loadedEntries = (entriesResult.data || []) as EntryRow[];
        }

        if (cancelled) return;

        setSessions(loadedSessions);
        setTerms(loadedTerms);
        setClasses(loadedClasses);
        setSubjects(loadedSubjects);
        setBatches(loadedBatches);
        setEntries(loadedEntries);

        const currentSession =
          loadedSessions.find((session) => session.is_current) ||
          loadedSessions[0];

        const activeTerm =
          loadedTerms.find((term) => term.is_active) || loadedTerms[0];

        setSelectedSessionId(currentSession?.id || '');

        if (currentSession) {
          const matchingActiveTerm = loadedTerms.find(
            (term) =>
              term.is_active &&
              normalise(term.session) ===
                normalise(currentSession.session_name),
          );

          setSelectedTermId(
            matchingActiveTerm?.id || activeTerm?.id || '',
          );
        } else {
          setSelectedTermId(activeTerm?.id || '');
        }
      } catch (loadError) {
        console.error('Error loading academic performance:', loadError);

        if (!cancelled) {
          setError('Unable to load academic performance data.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  /* =========================================================
     CURRENT SESSION
     ========================================================= */
  const currentSession = useMemo(() => {
    return (
      sessions.find((session) => session.is_current) ||
      sessions[0] ||
      null
    );
  }, [sessions]);

  /* =========================================================
     ACTIVE TERM
     ========================================================= */
  const currentActiveTerm = useMemo(() => {
    if (!currentSession) {
      return terms.find((term) => term.is_active) || terms[0] || null;
    }

    return (
      terms.find(
        (term) =>
          term.is_active &&
          normalise(term.session) ===
            normalise(currentSession.session_name),
      ) ||
      terms.find(
        (term) =>
          normalise(term.session) ===
          normalise(currentSession.session_name),
      ) ||
      terms.find((term) => term.is_active) ||
      null
    );
  }, [terms, currentSession]);

  /* =========================================================
     SELECTED SESSION
     ========================================================= */
  const selectedSession = useMemo(() => {
    return (
      sessions.find((session) => session.id === selectedSessionId) ||
      currentSession ||
      null
    );
  }, [sessions, selectedSessionId, currentSession]);

  /* =========================================================
     TERMS IN SELECTED SESSION
     ========================================================= */
  const selectedSessionTerms = useMemo(() => {
    if (!selectedSession) return [];

    return terms
      .filter(
        (term) =>
          normalise(term.session) ===
          normalise(selectedSession.session_name),
      )
      .sort((a, b) => {
        const aNumber = getTermNumber(a) ?? 99;
        const bNumber = getTermNumber(b) ?? 99;
        return aNumber - bNumber;
      });
  }, [terms, selectedSession]);

  /* =========================================================
     SELECTED TERM
     ========================================================= */
  const selectedTerm = useMemo(() => {
    return (
      terms.find((term) => term.id === selectedTermId) ||
      currentActiveTerm ||
      null
    );
  }, [terms, selectedTermId, currentActiveTerm]);

  /* =========================================================
     KEEP TERM SYNCHRONISED
     ========================================================= */
  useEffect(() => {
    if (!selectedSession || comparisonMode === 'sessions') {
      return;
    }

    const activeForSession = selectedSessionTerms.find(
      (term) => term.is_active,
    );

    const firstForSession = selectedSessionTerms[0];

    const belongs = selectedSessionTerms.some(
      (term) => term.id === selectedTermId,
    );

    if (!belongs) {
      setSelectedTermId(
        activeForSession?.id || firstForSession?.id || '',
      );
    }
  }, [
    selectedSession,
    selectedSessionTerms,
    selectedTermId,
    comparisonMode,
  ]);

  /* =========================================================
     MAPS
     ========================================================= */
  const subjectMap = useMemo(
    () =>
      new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  );

  const classMap = useMemo(
    () => new Map(classes.map((item) => [item.id, item])),
    [classes],
  );

  /* =========================================================
     FILTER BATCHES
     ========================================================= */
  const relevantBatches = useMemo(() => {
    let result = batches.filter(
      (batch) =>
        batch.status === 'published' && batch.academic_session_id,
    );

    if (selectedSubjectId !== 'all') {
      result = result.filter(
        (batch) => batch.subject_id === selectedSubjectId,
      );
    }

    if (selectedClassId !== 'all') {
      result = result.filter(
        (batch) => batch.class_id === selectedClassId,
      );
    }

    return result;
  }, [batches, selectedSubjectId, selectedClassId]);

  /* =========================================================
     BATCH AVERAGE
     ========================================================= */
  const getBatchAverage = (batch: BatchRow) => {
    const batchEntries = entries.filter(
      (entry) => entry.batch_id === batch.id,
    );

    if (batchEntries.length === 0) return null;

    const percentages = batchEntries
      .map((entry) => {
        if (
          entry.percentage !== null &&
          Number.isFinite(Number(entry.percentage))
        ) {
          return Number(entry.percentage);
        }

        const score = Number(entry.score);
        const maxScore = Number(batch.max_score);

        if (
          Number.isFinite(score) &&
          Number.isFinite(maxScore) &&
          maxScore > 0
        ) {
          return (score / maxScore) * 100;
        }

        return null;
      })
      .filter(
        (value): value is number =>
          value !== null && Number.isFinite(value),
      );

    if (percentages.length === 0) return null;

    return (
      percentages.reduce((sum, value) => sum + value, 0) /
      percentages.length
    );
  };

  /* =========================================================
     CURRENT TERM DATA
     ========================================================= */
  const currentTermData = useMemo(() => {
    if (!selectedTerm || !selectedSession) {
      return { data: [] as ChartPoint[], seriesIds: [] as string[] };
    }

    let termBatches = relevantBatches.filter(
      (batch) =>
        batch.term_id === selectedTerm.id &&
        batch.academic_session_id === selectedSession.id,
    );

    termBatches = [...termBatches].sort((a, b) => {
      const order =
        getAssessmentOrder(a) - getAssessmentOrder(b);
      if (order !== 0) return order;

      return String(a.assessment_date || '').localeCompare(
        String(b.assessment_date || ''),
      );
    });

    const labels = Array.from(
      new Set(termBatches.map((batch) => getAssessmentLabel(batch))),
    );

    const subjectIds = Array.from(
      new Set(
        termBatches
          .map((batch) => batch.subject_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const data = labels.map((label) => {
      const point: ChartPoint = { label };

      subjectIds.forEach((subjectId) => {
        const matching = termBatches.filter(
          (batch) =>
            batch.subject_id === subjectId &&
            getAssessmentLabel(batch) === label,
        );

        const values = matching
          .map((batch) => getBatchAverage(batch))
          .filter((value): value is number => value !== null);

        point[subjectId] = values.length
          ? Math.round(
              (values.reduce((sum, value) => sum + value, 0) /
                values.length) *
                10,
            ) / 10
          : null;
      });

      return point;
    });

    return { data, seriesIds: subjectIds };
  }, [relevantBatches, selectedTerm, selectedSession, getBatchAverage]);

  /* =========================================================
     CLASS CURRENT TERM DATA
     ========================================================= */
  const classTrendData = useMemo(() => {
    if (!selectedTerm || !selectedSession) {
      return { data: [] as ChartPoint[], seriesIds: [] as string[] };
    }

    const termBatches = relevantBatches.filter(
      (batch) =>
        batch.term_id === selectedTerm.id &&
        batch.academic_session_id === selectedSession.id,
    );

    const labels = Array.from(
      new Set(termBatches.map((batch) => getAssessmentLabel(batch))),
    );

    const classIds = Array.from(
      new Set(
        termBatches
          .map((batch) => batch.class_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const data = labels.map((label) => {
      const point: ChartPoint = { label };

      classIds.forEach((classId) => {
        const matching = termBatches.filter(
          (batch) =>
            batch.class_id === classId &&
            getAssessmentLabel(batch) === label,
        );

        const values = matching
          .map((batch) => getBatchAverage(batch))
          .filter((value): value is number => value !== null);

        point[classId] = values.length
          ? Math.round(
              (values.reduce((sum, value) => sum + value, 0) /
                values.length) *
                10,
            ) / 10
          : null;
      });

      return point;
    });

    return { data, seriesIds: classIds };
  }, [relevantBatches, selectedTerm, selectedSession, getBatchAverage]);

  /* =========================================================
     TERM COMPARISON
     ========================================================= */
  const termComparisonData = useMemo(() => {
    if (!selectedSession) {
      return { data: [] as ChartPoint[], seriesIds: [] as string[] };
    }

    const sessionTerms = selectedSessionTerms;

    const termBatches = relevantBatches.filter(
      (batch) =>
        batch.academic_session_id === selectedSession.id &&
        batch.term_id,
    );

    const subjectIds = Array.from(
      new Set(
        termBatches
          .map((batch) => batch.subject_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const data = sessionTerms.map((term) => {
      const point: ChartPoint = { label: getTermLabel(term) };

      subjectIds.forEach((subjectId) => {
        const matching = termBatches.filter(
          (batch) =>
            batch.term_id === term.id &&
            batch.subject_id === subjectId,
        );

        const values = matching
          .map((batch) => getBatchAverage(batch))
          .filter((value): value is number => value !== null);

        point[subjectId] = values.length
          ? Math.round(
              (values.reduce((sum, value) => sum + value, 0) /
                values.length) *
                10,
            ) / 10
          : null;
      });

      return point;
    });

    return { data, seriesIds: subjectIds };
  }, [
    selectedSession,
    selectedSessionTerms,
    relevantBatches,
    getBatchAverage,
  ]);

  /* =========================================================
     SESSION COMPARISON
     ========================================================= */
  const sessionComparisonData = useMemo(() => {
    const termNumber = getTermNumber(selectedTerm);

    if (termNumber === null) {
      return { data: [] as ChartPoint[], seriesIds: [] as string[] };
    }

    const orderedSessions = [...sessions].sort((a, b) =>
      String(a.start_date || '').localeCompare(
        String(b.start_date || ''),
      ),
    );

    const subjectIds = Array.from(
      new Set(
        relevantBatches
          .map((batch) => batch.subject_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const data = orderedSessions.map((session) => {
      const matchingTerms = terms.filter(
        (term) =>
          normalise(term.session) ===
          normalise(session.session_name),
      );

      const matchingTerm = matchingTerms.find(
        (term) => getTermNumber(term) === termNumber,
      );

      const point: ChartPoint = { label: session.session_name };

      subjectIds.forEach((subjectId) => {
        if (!matchingTerm) {
          point[subjectId] = null;
          return;
        }

        const matchingBatches = relevantBatches.filter(
          (batch) =>
            batch.academic_session_id === session.id &&
            batch.term_id === matchingTerm.id &&
            batch.subject_id === subjectId,
        );

        const values = matchingBatches
          .map((batch) => getBatchAverage(batch))
          .filter((value): value is number => value !== null);

        point[subjectId] = values.length
          ? Math.round(
              (values.reduce((sum, value) => sum + value, 0) /
                values.length) *
                10,
            ) / 10
          : null;
      });

      return point;
    });

    return { data, seriesIds: subjectIds };
  }, [
    sessions,
    terms,
    selectedTerm,
    relevantBatches,
    getBatchAverage,
  ]);

  /* =========================================================
     SELECT CHART DATA
     ========================================================= */
  const chartResult = useMemo(() => {
    if (comparisonMode === 'current') {
      return viewMode === 'classes' ? classTrendData : currentTermData;
    }

    if (comparisonMode === 'terms') {
      return termComparisonData;
    }

    return sessionComparisonData;
  }, [
    comparisonMode,
    viewMode,
    classTrendData,
    currentTermData,
    termComparisonData,
    sessionComparisonData,
  ]);

  /* =========================================================
     SERIES
     ========================================================= */
  const series = useMemo(() => {
    return chartResult.seriesIds.map((id) => ({
      id,
      label:
        viewMode === 'classes'
          ? classMap.get(id)?.name || 'Class'
          : subjectMap.get(id)?.name || 'Subject',
    }));
  }, [chartResult.seriesIds, viewMode, classMap, subjectMap]);

  /* =========================================================
     OVERALL AVERAGE
     ========================================================= */
  const overallAverage = useMemo(() => {
    const values: number[] = [];

    chartResult.data.forEach((point) => {
      chartResult.seriesIds.forEach((id) => {
        const value = point[id];
        if (typeof value === 'number' && Number.isFinite(value)) {
          values.push(value);
        }
      });
    });

    if (!values.length) return 0;

    return (
      Math.round(
        (values.reduce((sum, value) => sum + value, 0) /
          values.length) *
          10,
      ) / 10
    );
  }, [chartResult]);

  /* =========================================================
     TREND
     ========================================================= */
  const trend = useMemo(() => {
    if (chartResult.data.length < 2) {
      return { direction: 'flat' as const, change: 0 };
    }

    const first = chartResult.data[0];
    const last = chartResult.data[chartResult.data.length - 1];

    const firstValues: number[] = [];
    const lastValues: number[] = [];

    chartResult.seriesIds.forEach((id) => {
      const firstValue = first[id];
      const lastValue = last[id];

      if (
        typeof firstValue === 'number' &&
        typeof lastValue === 'number'
      ) {
        firstValues.push(firstValue);
        lastValues.push(lastValue);
      }
    });

    if (!firstValues.length || !lastValues.length) {
      return { direction: 'flat' as const, change: 0 };
    }

    const firstAverage =
      firstValues.reduce((sum, value) => sum + value, 0) /
      firstValues.length;

    const lastAverage =
      lastValues.reduce((sum, value) => sum + value, 0) /
      lastValues.length;

    const change =
      Math.round((lastAverage - firstAverage) * 10) / 10;

    if (change > 0.1) return { direction: 'up' as const, change };
    if (change < -0.1) return { direction: 'down' as const, change };

    return { direction: 'flat' as const, change };
  }, [chartResult]);

  const graphTitle = useMemo(() => {
    if (comparisonMode === 'current') {
      return viewMode === 'subjects'
        ? 'Subject Performance Trend'
        : 'Class Performance Trend';
    }

    if (comparisonMode === 'terms') {
      return 'Term-to-Term Performance';
    }

    return 'Session-to-Session Performance';
  }, [comparisonMode, viewMode]);

  const graphDescription = useMemo(() => {
    if (comparisonMode === 'current') {
      return `${
        selectedSession?.session_name || 'Current session'
      } • ${
        selectedTerm
          ? getTermLabel(selectedTerm)
          : 'Current term'
      }`;
    }

    if (comparisonMode === 'terms') {
      return `${
        selectedSession?.session_name || 'Selected session'
      } • Academic term comparison`;
    }

    const number = getTermNumber(selectedTerm);

    return `${
      number ? `Term ${number}` : 'Selected term'
    } • Academic session comparison`;
  }, [comparisonMode, selectedSession, selectedTerm]);

  /* =========================================================
     RENDER
     ========================================================= */
  return (
    <ChartCard
      title="Academic Performance"
      icon={GraduationCap}
    >
      <div className="w-full min-w-0 max-w-full overflow-hidden flex flex-col">
        {/* SUMMARY */}
        <div className="w-full min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {comparisonMode === 'current'
                ? 'Current academic performance'
                : comparisonMode === 'terms'
                ? 'Term comparison'
                : 'Session comparison'}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '—' : `${overallAverage}%`}
              </p>

              {!loading && chartResult.data.length > 1 && (
                <span
                  className={`
                    inline-flex items-center gap-1
                    text-[10px] sm:text-[11px] font-semibold
                    px-2 py-1 rounded-full
                    ${
                      trend.direction === 'up'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : trend.direction === 'down'
                        ? 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/30 dark:text-red-300'
                        : 'bg-gray-50 text-gray-600 border border-gray-100 dark:bg-gray-800 dark:text-gray-300'
                    }
                  `}
                >
                  {trend.direction === 'up' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : trend.direction === 'down' ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}

                  {trend.direction === 'up'
                    ? `Up ${Math.abs(trend.change)}%`
                    : trend.direction === 'down'
                    ? `Down ${Math.abs(trend.change)}%`
                    : 'Stable'}
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0 sm:text-right">
            <p className="text-[11px] text-gray-400 truncate">
              {selectedSession?.session_name || 'No active session'}
            </p>

            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate">
              {selectedTerm
                ? getTermLabel(selectedTerm)
                : 'No active term'}
            </p>
          </div>
        </div>

        {/* VIEW BUTTONS */}
        <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden scrollbar-thin pb-1 mb-3">
          <div className="flex items-center gap-1.5 min-w-max">
            <button
              type="button"
              onClick={() => setViewMode('subjects')}
              className={`
                shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition
                ${
                  viewMode === 'subjects'
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                }
              `}
            >
              Subjects
            </button>

            <button
              type="button"
              onClick={() => setViewMode('classes')}
              className={`
                shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition
                ${
                  viewMode === 'classes'
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                }
              `}
            >
              Classes
            </button>

            <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0" />

            {(
              [
                ['current', 'Current'],
                ['terms', 'Terms'],
                ['sessions', 'Sessions'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setComparisonMode(value)}
                className={`
                  shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition
                  ${
                    comparisonMode === value
                      ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* FILTERS */}
        <div className="w-full min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
          <select
            value={selectedSessionId}
            onChange={(event) => setSelectedSessionId(event.target.value)}
            className="min-w-0 w-full max-w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-violet-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          >
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.session_name}
                {session.is_current ? ' • Current' : ''}
              </option>
            ))}
          </select>

          <select
            value={selectedTermId}
            onChange={(event) => setSelectedTermId(event.target.value)}
            disabled={comparisonMode === 'sessions'}
            className="min-w-0 w-full max-w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-violet-500 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          >
            {selectedSessionTerms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.term || 'Term'}
                {term.is_active ? ' • Active' : ''}
              </option>
            ))}
          </select>

          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="min-w-0 w-full max-w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-violet-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          >
            <option value="all">All Classes</option>

            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full min-w-0 mb-4">
          <select
            value={selectedSubjectId}
            onChange={(event) => setSelectedSubjectId(event.target.value)}
            className="min-w-0 w-full max-w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-violet-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          >
            <option value="all">All Subjects</option>

            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        {/* LOADING / ERROR / EMPTY */}
        {loading ? (
          <div className="w-full min-w-0 h-[360px] flex items-center justify-center text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
        ) : error ? (
          <div className="w-full min-w-0 h-[360px] flex flex-col items-center justify-center text-center px-4">
            <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />

            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {error}
            </p>
          </div>
        ) : chartResult.data.length === 0 ? (
          <div className="w-full min-w-0 h-[360px] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
            <GraduationCap className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />

            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              No published results for this selection
            </p>

            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              Publish result batches for the selected session, term,
              class or subject and the performance graph will appear
              here.
            </p>
          </div>
        ) : (
          /* CHART — content-fit with vertical overflow control */
          <div className="w-full min-w-0 max-w-full overflow-hidden">
            <div className="w-full min-w-0 mb-2">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                {graphTitle}
              </p>

              <p className="text-[11px] text-gray-400 truncate">
                {graphDescription}
              </p>
            </div>

            {/* Content-fit chart wrapper with vertical overflow control */}
            <div className="relative w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto">
              <div className="w-full min-w-0 h-[280px] sm:h-[320px] lg:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartResult.data}
                    margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="label"
                      stroke="#9ca3af"
                      tick={{ fontSize: 9 }}
                      tickMargin={6}
                      minTickGap={20}
                      interval="preserveStartEnd"
                    />

                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      stroke="#9ca3af"
                      tick={{ fontSize: 9 }}
                      width={38}
                    />

                    <Tooltip
                      formatter={(value, name) => [
                        `${Number(value).toFixed(1)}%`,
                        series.find(
                          (item) => item.id === String(name),
                        )?.label || String(name),
                      ]}
                      contentStyle={{
                        maxWidth: '220px',
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        fontSize: '11px',
                      }}
                    />

                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      height={38}
                      wrapperStyle={{
                        fontSize: '10px',
                        overflow: 'hidden',
                        maxWidth: '100%',
                      }}
                      formatter={(value) =>
                        series.find(
                          (item) => item.id === String(value),
                        )?.label || String(value)
                      }
                    />

                    {series.map((item, index) => (
                      <Line
                        key={item.id}
                        type="monotone"
                        dataKey={item.id}
                        name={item.id}
                        stroke={
                          LINE_COLORS[index % LINE_COLORS.length]
                        }
                        strokeWidth={2.5}
                        dot={{ r: 3, strokeWidth: 1.5 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                        isAnimationActive
                        animationDuration={650}
                        animationEasing="ease-out"
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* FOOTER */}
            <div className="w-full min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-2">
              <p className="text-[10px] text-gray-400 truncate">
                Higher line = stronger performance
              </p>

              <p className="text-[10px] text-gray-400 truncate">
                Published results only
              </p>
            </div>
          </div>
        )}
      </div>
    </ChartCard>
  );
};

export default AcademicPerformance;