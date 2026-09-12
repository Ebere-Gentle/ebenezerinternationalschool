import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Clock3, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

type AssessmentType = 'test' | 'first_test' | 'second_test' | 'ca' | 'continuous_assessment' | 'exam' | 'cbt' | 'assignment';
type StoredAssessmentType = 'first_test' | 'second_test' | 'ca' | 'exam' | 'cbt' | 'assignment';
type Student = { id: string; first_name: string; last_name: string; class_id?: string | null };
type ResultRow = { id: string; title: string; assessment_type: StoredAssessmentType; assessment_date: string | null; max_score: number; score: number; grade: string | null; remark: string | null; subject_name: string; class_name: string; student_id: string; status: string };
type Props = { assessmentType: AssessmentType; audience: 'student' | 'parent' };

const normalizeAssessmentType = (type: AssessmentType): StoredAssessmentType => {
  switch (type) {
    case 'test':
    case 'first_test':
      return 'first_test';
    case 'second_test':
      return 'second_test';
    case 'ca':
    case 'continuous_assessment':
      return 'ca';
    case 'assignment':
      return 'assignment';
    case 'exam':
      return 'exam';
    case 'cbt':
    default:
      return 'cbt';
  }
};

const labelFor = (type: AssessmentType) => {
  switch (normalizeAssessmentType(type)) {
    case 'first_test': return 'First Periodic Test';
    case 'second_test': return 'Second Periodic Test';
    case 'ca': return 'CA';
    case 'exam': return 'Exam';
    case 'assignment': return 'Assignment';
    case 'cbt': return 'CBT';
  }
};

export function PublishedResults({ assessmentType, audience }: Props) {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [hasPendingPublication, setHasPendingPublication] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadStudents = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('students')
        .select('id,first_name,last_name,class_id')
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
    if (!studentId) {
      setRows([]);
      setHasPendingPublication(false);
      return;
    }

    setLoading(true);
    setHasPendingPublication(false);

    try {
      const storedType = normalizeAssessmentType(assessmentType);
      const currentStudent = students.find((student) => student.id === studentId);

      // The authoritative result relationship is:
      // result_batches -> result_entries.student_id.
      // Do not depend on the student's session_id or a legacy result table.
      let batchQuery = supabase
        .from('result_batches')
        .select('id,title,assessment_type,assessment_date,max_score,status,academic_session_id,term_id,class_id,classes(name),subjects(name)')
        .eq('assessment_type', storedType)
        .order('assessment_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (user?.branch_id) batchQuery = batchQuery.eq('branch_id', user.branch_id);
      if (currentStudent?.class_id) batchQuery = batchQuery.eq('class_id', currentStudent.class_id);

      const { data: batches, error: batchError } = await batchQuery;
      if (batchError) throw batchError;

      const batchIds = (batches || []).map((batch: any) => batch.id);
      if (!batchIds.length) {
        setRows([]);
        return;
      }

      const { data: entries, error: entryError } = await supabase
        .from('result_entries')
        .select('batch_id,student_id,score,percentage,grade,remark')
        .eq('student_id', studentId)
        .in('batch_id', batchIds);
      if (entryError) throw entryError;

      const batchById = new Map((batches || []).map((batch: any) => [batch.id, batch]));
      const studentEntries = (entries || []) as any[];

      // A saved draft is still a real student result record. Show it to the
      // student with an explicit publication state instead of pretending that
      // no record exists. Published records are shown normally.
      setHasPendingPublication(
        audience === 'student' &&
        studentEntries.some((entry) => batchById.get(entry.batch_id)?.status !== 'published'),
      );

      const nextRows = studentEntries
        .flatMap((entry: any) => {
          const batch = batchById.get(entry.batch_id);
          if (!batch) return [];

          const maxScore = Number(batch.max_score || 0);
          if (maxScore <= 0) return [];

          return [{
            id: `${entry.batch_id}:${entry.student_id}`,
            title: batch.title || labelFor(assessmentType),
            assessment_type: storedType,
            assessment_date: batch.assessment_date,
            max_score: maxScore,
            score: Number(entry.score),
            grade: entry.grade,
            remark: entry.remark,
            subject_name: batch.subjects?.name || 'Subject',
            class_name: batch.classes?.name || 'Class',
            student_id: entry.student_id,
            status: batch.status || 'draft',
          }];
        })
        .sort((a, b) => {
          const dateA = a.assessment_date ? new Date(a.assessment_date).getTime() : 0;
          const dateB = b.assessment_date ? new Date(b.assessment_date).getTime() : 0;
          return dateB - dateA;
        });

      setRows(nextRows);
    } catch (error: any) {
      console.error('Unable to load student result entries:', error);
      toast.error(error?.message || 'Unable to load student results');
      setRows([]);
      setHasPendingPublication(false);
    } finally {
      setLoading(false);
    }
  }, [assessmentType, audience, studentId, students, user?.branch_id]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  const average = useMemo(
    () => !rows.length
      ? null
      : rows.reduce((sum, row) => sum + (row.score / row.max_score) * 100, 0) / rows.length,
    [rows],
  );

  const heading = audience === 'student'
    ? `My ${labelFor(assessmentType)} Results`
    : `${labelFor(assessmentType)} Results`;

  return (
    <div className="container mx-auto space-y-6 p-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Results</p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{heading}</h1>
      </div>

      {audience === 'parent' && students.length > 0 && (
        <label className="block max-w-md">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Child</span>
          <select
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900"
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.last_name} {student.first_name}
              </option>
            ))}
          </select>
        </label>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-800">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <p className="font-medium text-slate-700 dark:text-slate-200">
            No {labelFor(assessmentType)} record was found for this student.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            The page checks result_batches and result_entries using this student&apos;s exact student ID and class.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-700">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {rows.length} saved assessment{rows.length === 1 ? '' : 's'}
              </p>
              {hasPendingPublication && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  <Clock3 className="h-3.5 w-3.5" />
                  Some records are awaiting publication
                </div>
              )}
            </div>
            {average !== null && (
              <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                Average: {average.toFixed(1)}%
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                <tr>
                  <th className="p-4">Assessment</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Score</th>
                  <th className="p-4">Grade</th>
                  <th className="p-4">Remark</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{row.title}</td>
                    <td className="p-4">{row.subject_name}</td>
                    <td className="p-4">{row.class_name}</td>
                    <td className="p-4">{row.assessment_date ? new Date(`${row.assessment_date}T00:00:00`).toLocaleDateString() : '—'}</td>
                    <td className="p-4 font-semibold">
                      {row.score} / {row.max_score}{' '}
                      <span className="text-slate-500">({((row.score / row.max_score) * 100).toFixed(1)}%)</span>
                    </td>
                    <td className="p-4 font-bold">{row.grade || '—'}</td>
                    <td className="p-4">{row.remark || '—'}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.status === 'published' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'}`}>
                        {row.status === 'published' ? 'Published' : 'Saved'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
