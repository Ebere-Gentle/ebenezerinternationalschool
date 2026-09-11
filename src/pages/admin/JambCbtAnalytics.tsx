import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, RefreshCw, Users, Target, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabase/client';

const JambCbtAnalytics: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('jamb_attempts').select('id,registration_id,subject_id,question_count,correct_count,wrong_count,unanswered_count,score,duration_seconds,submitted_at,subject:jamb_subjects(id,name,code),registration:jamb_registrations(id,student_id,session_name,student:students(id,student_id,first_name,last_name,class_id,branch_id))').eq('status','submitted').order('submitted_at',{ascending:false}).limit(1000);
      if (error) throw error;
      setRows(data || []);
    } catch (e: any) { toast.error(e?.message || 'Unable to load analytics.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const uniqueStudents = new Set(rows.map(r => r.registration?.student_id).filter(Boolean)).size;
    const average = rows.length ? rows.reduce((s,r)=>s+Number(r.score||0),0)/rows.length : 0;
    const best = rows.length ? Math.max(...rows.map(r=>Number(r.score||0))) : 0;
    const subjects = new Map<string,{name:string,total:number,count:number}>();
    rows.forEach(r=>{const key=r.subject_id; const item=subjects.get(key)||{name:r.subject?.name||'Unknown',total:0,count:0}; item.total+=Number(r.score||0); item.count++; subjects.set(key,item);});
    return {uniqueStudents,average,best,subjects:Array.from(subjects.values()).sort((a,b)=>(b.total/b.count)-(a.total/a.count))};
  }, [rows]);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><RefreshCw className="animate-spin text-indigo-600" /></div>;
  return <div className="space-y-6 pb-10">
    <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 p-7 text-white"><p className="text-indigo-200 text-sm font-semibold">ACADEMIC ANALYTICS</p><h1 className="text-3xl font-black mt-1">JAMB CBT Performance</h1><p className="text-indigo-100 mt-2">School-wide practice activity and subject performance.</p></div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[[Users,'Students Practising',stats.uniqueStudents],[BarChart3,'Tests Completed',rows.length],[Target,'Average Score',`${stats.average.toFixed(1)}%`],[Trophy,'Best Score',`${stats.best.toFixed(1)}%`]].map(([Icon,label,value]:any)=><div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5"><Icon className="w-5 h-5 text-indigo-600 mb-3"/><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-black mt-1">{value}</p></div>)}</div>
    <section className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 overflow-hidden"><div className="p-6 border-b dark:border-gray-700"><h2 className="font-black text-lg">Subject Performance</h2></div>{stats.subjects.length===0?<div className="p-8 text-center text-gray-500">No submitted CBT attempts yet.</div>:<div className="divide-y dark:divide-gray-700">{stats.subjects.map(s=>{const avg=s.total/s.count;return <div key={s.name} className="p-5 flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-black">{s.name.slice(0,2).toUpperCase()}</div><div className="flex-1"><div className="flex justify-between gap-3"><span className="font-bold">{s.name}</span><span className="font-black">{avg.toFixed(1)}%</span></div><div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-indigo-600 rounded-full" style={{width:`${Math.min(100,Math.max(0,avg))}%`}}/></div><p className="text-xs text-gray-500 mt-1">{s.count} completed attempt{s.count===1?'':'s'}</p></div></div>})}</div>}</section>
  </div>;
};
export default JambCbtAnalytics;
