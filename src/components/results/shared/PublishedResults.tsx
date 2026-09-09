import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

type AssessmentType =
  | 'test'
  | 'exam'
  | 'cbt'
  | 'assignment'
  | 'continuous_assessment';

type Student = {
  id: string;
  first_name: string;
  last_name: string;
};

type ResultRow = {
  id: string;
  title: string;
  assessment_date: string | null;
  max_score: number;
  score: number;
  grade: string | null;
  remark: string | null;
  subject_name: string;
  class_name: string;
  student_id: string;
};

type Props = {
  assessmentType: AssessmentType;
  audience: 'student' | 'parent';
};

const labelFor = (type: AssessmentType) =>
  type === 'cbt' ? 'CBT / Assignment' : type.replace('_', ' ');

export function PublishedResults({ assessmentType, audience }: Props) {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStudents = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('students')
        .select('id,first_name,last_name')
        .order('last_name')
        .order('first_name');

      if (audience === 'student') {
        query = query.eq('user_id', user.id);
      } else {
        const { data: parent, error: parentError } = await supabase
          .from('parents')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (parentError) throw parentError;
        if (!parent?.id) {
          setStudents([]);
          setStudentId('');
          return;
        }

        query = query.eq('parent_id', parent.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const nextStudents = (data || []) as Student[];
      setStudents(nextStudents);
      setStudentId((current) =>
        nextStudents.some((student) => student.id === current)
          ? current
          : nextStudents[0]?.id || '',
      );
    } catch (error: any) {
      console.error('Unable to load result students:', error);
      toast.error(error?.message || 'Unable to load results');
    } finally {
      setLoading(false);
    }
  }, [audience, user?.id]);

  const loadResults = useCallback(async () => {
    if (!studentId || !user?.branch_id) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const { data: batches, error: batchError } = await supabase
        .from('result_batches')
        .select('id,title,assessment_date,max_score,classes(name),subjects(name)')
        .eq('branch_id', user.branch_id)
        .eq('assessment_type', assessmentType)
        .eq('status', 'published')
        .order('assessment_date', { ascending: false });

      if (batchError) throw batchError;

      const batchIds = (batches || []).map((batch: any) => batch.id);
      if (!batchIds.length) {
        setRows([]);
        return;
      }

      const { data: entries, error: entryError } = await supabase
        .from('result_entries')
        .select('batch_id,student_id,score,grade,remark')
        .eq('student_id', studentId)
        .in('batch_id', batchIds);

      if (entryError) throw entryError;

      const batchById = new Map(
        (batches || []).map((batch: any) => [batch.id, batch]),
      );

      setRows(
        (entries || []).flatMap((entry: any) => {
          const batch = batchById.get(entry.batch_id);
          if (!batch) return [];

          return [{
            id: `${entry.batch_id}:${entry.student_id}`,
            title: batch.title,
            assessment_date: batch.assessment_date,
            max_score: Number(batch.max_score),
            score: Number(entry.score),
            grade: entry.grade,
            remark: entry.remark,
            subject_name: batch.subjects?.name || 'Subject',
            class_name: batch.classes?.name || 'Class',
            student_id: entry.student_id,
          }];
        }),
      );
    } catch (error: any) {
      console.error('Unable to load published results:', error);
      toast.error(error?.message || 'Unable to load published results');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [assessmentType, studentId, user?.branch_id]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  const average = useMemo(() => {
    if (!rows.length) return null;
    return rows.reduce((sum, row) => sum + (row.score / row.max_score) * 100, 0) / rows.length;
  }, [rows]);

  const heading = audience === 'student' ? `My ${labelFor(assessmentType)} Results` : `${labelFor(assessmentType)} Results`;

  return (
    <div className="container mx-auto space-y-6 p-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Published assessments</p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{heading}</h1>
      </div>

      {audience === 'parent' && students.length > 0 && (
        <label className="block max-w-md">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Child</span>
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900">
            {students.map((student) => <option key={student.id} value={student.id}>{student.last_name} {student.first_name}</option>)}
          </select>
        </label>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-800">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <p className="font-medium text-slate-700 dark:text-slate-200">No published {labelFor(assessmentType).toLowerCase()} results yet.</p>
          <p className="mt-1 text-sm text-slate-500">Results appear here once the school publishes them.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-700">
            <p className="font-semibold text-slate-900 dark:text-white">{rows.length} published assessment{rows.length === 1 ? '' : 's'}</p>
            {average !== null && <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">Average: {average.toFixed(1)}%</p>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-900/50 dark:text-slate-300"><tr><th className="p-4">Assessment</th><th className="p-4">Subject</th><th className="p-4">Class</th><th className="p-4">Date</th><th className="p-4">Score</th><th className="p-4">Grade</th><th className="p-4">Remark</th></tr></thead>
              <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-slate-100 dark:border-slate-700"><td className="p-4 font-medium text-slate-900 dark:text-white">{row.title}</td><td className="p-4">{row.subject_name}</td><td className="p-4">{row.class_name}</td><td className="p-4">{row.assessment_date ? new Date(`${row.assessment_date}T00:00:00`).toLocaleDateString() : '—'}</td><td className="p-4 font-semibold">{row.score} / {row.max_score} <span className="text-slate-500">({((row.score / row.max_score) * 100).toFixed(1)}%)</span></td><td className="p-4 font-bold">{row.grade || '—'}</td><td className="p-4">{row.remark || '—'}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
