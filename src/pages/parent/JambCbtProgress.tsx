import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, RefreshCw, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import jambCbtService from '../../services/jamb/jambCbt.service';

const JambCbtProgress: React.FC = () => {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setLoading(true); setAttempts(await jambCbtService.getParentAttempts()); }
    catch (e: any) { toast.error(e?.message || 'Unable to load JAMB progress.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const byStudent = useMemo(() => {
    const map = new Map<string, any[]>();
    attempts.forEach(a => { const id = a.student?.id || 'unknown'; map.set(id, [...(map.get(id) || []), a]); });
    return Array.from(map.entries());
  }, [attempts]);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><RefreshCw className="animate-spin text-indigo-600" /></div>;

  return <div className="space-y-6 pb-10">
    <div className="rounded-3xl bg-gradient-to-br from-indigo-950 to-indigo-700 p-7 text-white"><p className="text-indigo-200 text-sm font-semibold">PARENT • ACADEMIC MONITORING</p><h1 className="text-3xl font-black mt-1">JAMB CBT Progress</h1><p className="text-indigo-100 mt-2">Monitor each child's practice activity, scores and improvement.</p></div>
    {byStudent.length === 0 ? <div className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 p-10 text-center text-gray-500">No JAMB CBT activity is available yet.</div> : byStudent.map(([studentId, rows]) => {
      const avg = rows.reduce((s,a) => s + Number(a.score || 0),0) / rows.length;
      const best = Math.max(...rows.map(a => Number(a.score || 0)));
      return <section key={studentId} className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 overflow-hidden"><div className="p-6 border-b dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><h2 className="text-xl font-black text-gray-900 dark:text-white">{rows[0]?.student?.first_name} {rows[0]?.student?.last_name}</h2><p className="text-sm text-gray-500">{rows[0]?.student?.student_id || ''}</p></div><div className="flex gap-3"><div className="rounded-xl bg-indigo-50 px-4 py-2"><p className="text-xs text-indigo-600">Average</p><b className="text-xl text-indigo-700">{avg.toFixed(1)}%</b></div><div className="rounded-xl bg-green-50 px-4 py-2"><p className="text-xs text-green-600">Best</p><b className="text-xl text-green-700">{best.toFixed(1)}%</b></div></div></div><div className="p-6"><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{rows.slice(0,12).map(a => <div key={a.id} className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 p-4"><div className="flex justify-between gap-2"><span className="font-bold text-sm">{a.subject?.name}</span><TrendingUp className={`w-4 h-4 ${Number(a.score)>=70?'text-green-600':'text-amber-500'}`} /></div><p className="text-2xl font-black mt-2">{Number(a.score).toFixed(1)}%</p><p className="text-xs text-gray-500 mt-1">{a.correct_count}/{a.question_count} correct</p></div>)}</div></div></section>;
    })}
    <div className="flex items-center gap-2 text-sm text-gray-500"><BarChart3 className="w-4 h-4" /> Results are automatically recorded after each submitted CBT.</div>
  </div>;
};
export default JambCbtProgress;
