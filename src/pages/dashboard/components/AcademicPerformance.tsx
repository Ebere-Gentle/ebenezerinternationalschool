import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react';
import ChartCard from './ChartCard';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

interface AcademicPerformanceProps {
  branchId?: string | null;
}

interface BatchRow {
  id: string;
  subject_id: string | null;
  max_score: number | null;
  weight: number | null;
  classes?: { branch_id: string | null } | null;
}

interface EntryRow {
  batch_id: string;
  score: number | null;
  percentage: number | null;
}

interface SubjectRow {
  id: string;
  name: string;
}

interface ChartItem {
  subject: string;
  score: number;
}

const AcademicPerformance: React.FC<AcademicPerformanceProps> = ({ branchId: branchIdProp }) => {
  const { user } = useAuth();
  const branchId = branchIdProp ?? user?.branch_id ?? null;

  const [data, setData] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAcademicPerformance = async () => {
      setLoading(true);
      setError(null);

      try {
        let batchQuery = supabase
          .from('result_batches')
          .select(`
            id,
            subject_id,
            max_score,
            weight,
            classes!inner(branch_id)
          `)
          .eq('status', 'published');

        if (branchId) {
          batchQuery = batchQuery.eq('classes.branch_id', branchId);
        }

        const { data: batches, error: batchError } = await batchQuery;

        if (batchError) throw batchError;

        const publishedBatches = (batches || []) as BatchRow[];

        if (publishedBatches.length === 0) {
          if (!cancelled) setData([]);
          return;
        }

        const batchIds = publishedBatches.map(batch => batch.id);
        const subjectIds = [
          ...new Set(
            publishedBatches
              .map(batch => batch.subject_id)
              .filter((id): id is string => Boolean(id))
          ),
        ];

        const [entriesResult, subjectsResult] = await Promise.all([
          supabase
            .from('result_entries')
            .select('batch_id, score, percentage')
            .in('batch_id', batchIds),
          supabase
            .from('subjects')
            .select('id, name')
            .in('id', subjectIds),
        ]);

        if (entriesResult.error) throw entriesResult.error;
        if (subjectsResult.error) throw subjectsResult.error;

        const entries = (entriesResult.data || []) as EntryRow[];
        const subjects = (subjectsResult.data || []) as SubjectRow[];
        const subjectMap = new Map(subjects.map(subject => [subject.id, subject.name]));

        const batchMap = new Map(publishedBatches.map(batch => [batch.id, batch]));
        const subjectTotals = new Map<string, { weightedScore: number; totalWeight: number }>();

        for (const batch of publishedBatches) {
          const batchEntries = entries.filter(entry => entry.batch_id === batch.id);
          if (batchEntries.length === 0 || !batch.subject_id) continue;

          const percentages = batchEntries
            .map(entry => {
              if (entry.percentage !== null && Number.isFinite(Number(entry.percentage))) {
                return Number(entry.percentage);
              }

              const score = Number(entry.score);
              const maxScore = Number(batch.max_score);

              if (Number.isFinite(score) && maxScore > 0) {
                return (score / maxScore) * 100;
              }

              return null;
            })
            .filter((value): value is number => value !== null && Number.isFinite(value));

          if (percentages.length === 0) continue;

          const batchAverage = percentages.reduce((sum, value) => sum + value, 0) / percentages.length;
          const weight = Number(batch.weight) > 0 ? Number(batch.weight) : 1;

          const current = subjectTotals.get(batch.subject_id) || {
            weightedScore: 0,
            totalWeight: 0,
          };

          current.weightedScore += batchAverage * weight;
          current.totalWeight += weight;
          subjectTotals.set(batch.subject_id, current);
        }

        const chartData = Array.from(subjectTotals.entries())
          .map(([subjectId, totals]) => ({
            subject: subjectMap.get(subjectId) || 'Subject',
            score: Math.round((totals.weightedScore / totals.totalWeight) * 10) / 10,
          }))
          .filter(item => Number.isFinite(item.score))
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);

        if (!cancelled) setData(chartData);
      } catch (fetchError) {
        console.error('Error fetching academic performance:', fetchError);
        if (!cancelled) {
          setError('Unable to load published academic results.');
          setData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchAcademicPerformance();

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const overallAverage = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.round((data.reduce((sum, item) => sum + item.score, 0) / data.length) * 10) / 10;
  }, [data]);

  return (
    <ChartCard title="Academic Performance" icon={GraduationCap}>
      <div className="h-full min-h-[280px] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Published results</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? '—' : `${overallAverage}%`}
            </p>
          </div>
          {!loading && data.length > 0 && (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900">
              {data.length} subject{data.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <AlertCircle className="w-7 h-7 text-amber-500 mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <GraduationCap className="w-9 h-9 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No published results yet</p>
            <p className="text-xs text-gray-400 mt-1">Academic performance will appear here after results are published.</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={220}>
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 18, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={value => `${value}%`} stroke="#9ca3af" />
                <YAxis dataKey="subject" type="category" stroke="#9ca3af" width={78} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Average']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  }}
                />
                <Bar dataKey="score" radius={[0, 5, 5, 0]}>
                  {data.map(item => (
                    <Cell key={item.subject} fill="#7c3aed" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </ChartCard>
  );
};

export default AcademicPerformance;
