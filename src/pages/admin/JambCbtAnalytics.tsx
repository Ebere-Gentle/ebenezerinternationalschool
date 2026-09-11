import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, BookOpen, ClipboardList, RefreshCw, Users, Target, Trophy, Upload, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabase/client';

const JambCbtAnalytics: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jamb_attempts')
        .select('id,registration_id,subject_id,question_count,correct_count,wrong_count,unanswered_count,score,duration_seconds,submitted_at,subject:jamb_subjects(id,name,code),registration:jamb_registrations(id,student_id,session_name,student:students(id,student_id,first_name,last_name,class_id,branch_id))')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      setRows(data || []);
    } catch (e: any) {
      toast.error(e?.message || 'Unable to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const uniqueStudents = new Set(rows.map(r => r.registration?.student_id).filter(Boolean)).size;
    const average = rows.length ? rows.reduce((s, r) => s + Number(r.score || 0), 0) / rows.length : 0;
    const best = rows.length ? Math.max(...rows.map(r => Number(r.score || 0))) : 0;
    const subjects = new Map<string, { name: string; total: number; count: number }>();
    rows.forEach(r => {
      const key = r.subject_id;
      const item = subjects.get(key) || { name: r.subject?.name || 'Unknown', total: 0, count: 0 };
      item.total += Number(r.score || 0);
      item.count += 1;
      subjects.set(key, item);
    });
    return {
      uniqueStudents,
      average,
      best,
      subjects: Array.from(subjects.values()).sort((a, b) => (b.total / b.count) - (a.total / a.count)),
    };
  }, [rows]);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center"><RefreshCw className="animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 p-6 md:p-7 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-indigo-200 text-sm font-semibold tracking-wide">ACADEMIC ANALYTICS • JAMB CBT</p>
            <h1 className="text-2xl md:text-3xl font-black mt-1">JAMB CBT Performance</h1>
            <p className="text-indigo-100 mt-2 max-w-2xl">Monitor practice activity, subject performance and the question bank from one administration hub.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/jamb-cbt/questions" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-800 font-bold hover:bg-indigo-50 transition">
              <ClipboardList className="w-4 h-4" /> Question Bank <ChevronRight className="w-4 h-4" />
            </Link>
            <Link to="/admin/jamb-cbt/questions" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-bold hover:bg-white/20 transition">
              <Upload className="w-4 h-4" /> Import Questions
            </Link>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          [Users, 'Students Practising', stats.uniqueStudents],
          [BarChart3, 'Tests Completed', rows.length],
          [Target, 'Average Score', `${stats.average.toFixed(1)}%`],
          [Trophy, 'Best Score', `${stats.best.toFixed(1)}%`],
        ].map(([Icon, label, value]: any) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <Icon className="w-5 h-5 text-indigo-600 mb-3" />
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-black mt-1 text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link to="/admin/jamb-cbt/questions" className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:border-indigo-300 hover:shadow-md transition">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-black text-gray-900 dark:text-white">Question Bank</h2>
              <p className="text-sm text-gray-500 mt-1">Create, edit, activate or bulk-import authorized questions.</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition" />
          </div>
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 dark:text-white">CBT Engine</h2>
              <p className="text-sm text-gray-500 mt-1">Students register four subjects, practise and receive server-graded results.</p>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-lg text-gray-900 dark:text-white">Subject Performance</h2>
              <p className="text-sm text-gray-500 mt-1">Average submitted practice score by subject.</p>
            </div>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {stats.subjects.length === 0 ? (
          <div className="p-10 text-center">
            <BookOpen className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="font-semibold text-gray-700 dark:text-gray-300">No submitted CBT attempts yet.</p>
            <p className="text-sm text-gray-500 mt-1">Once students complete practice tests, performance will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {stats.subjects.map(s => {
              const avg = s.total / s.count;
              return (
                <div key={s.name} className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-black">
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-3">
                      <span className="font-bold text-gray-900 dark:text-white">{s.name}</span>
                      <span className="font-black text-gray-900 dark:text-white">{avg.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(100, Math.max(0, avg))}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{s.count} completed attempt{s.count === 1 ? '' : 's'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default JambCbtAnalytics;
