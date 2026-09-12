import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Filter, Loader2, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

interface Session { id:string; session_name:string; term_name:string; is_current:boolean; branch_id:string; start_date:string; end_date:string; }
interface Term { id:string; session:string; term:string; is_active:boolean; is_closed:boolean; start_date:string; end_date:string; }
interface ClassItem { id:string; name:string; code:string|null; level:string|null; department:string|null; branch_id:string; status?:string|null; }
interface SubjectItem { id:string; name:string; code:string|null; }
interface ResultRow { id:string; student_id:string; score:number; percentage:number|null; grade:string|null; remark:string|null; position:number|null; student:{first_name:string|null;middle_name:string|null;last_name:string|null;admission_number:string|null}|null; }

const normaliseTerm=(v:string|null|undefined)=>String(v||'').trim().toLowerCase().replace('first','1st').replace('second','2nd').replace('third','3rd');
const label=(v:string)=>({first_test:'Test 1',second_test:'Test 2',exam:'Exam'}[v]||v);

const AdminViewResultsFixed:React.FC=()=>{
 const {user}=useAuth();
 const [sessions,setSessions]=useState<Session[]>([]); const [terms,setTerms]=useState<Term[]>([]); const [classes,setClasses]=useState<ClassItem[]>([]); const [subjects,setSubjects]=useState<SubjectItem[]>([]); const [results,setResults]=useState<ResultRow[]>([]);
 const [sessionId,setSessionId]=useState(''); const [termId,setTermId]=useState(''); const [classId,setClassId]=useState(''); const [subjectId,setSubjectId]=useState(''); const [assessmentType,setAssessmentType]=useState<'first_test'|'second_test'|'exam'>('first_test'); const [maxScore,setMaxScore]=useState(0); const [loading,setLoading]=useState(true); const [loadingResults,setLoadingResults]=useState(false); const [query,setQuery]=useState('');
 const session=sessions.find(x=>x.id===sessionId); const cls=classes.find(x=>x.id===classId); const subject=subjects.find(x=>x.id===subjectId);
 useEffect(()=>{if(user?.id) void loadContext();},[user?.id]);
 useEffect(()=>{if(session) void loadTerms(session);},[sessionId]);
 useEffect(()=>{if(classId) void loadSubjects(classId); else {setSubjects([]);setSubjectId('');}},[classId]);
 useEffect(()=>{if(sessionId&&termId&&classId&&subjectId) void loadMaximum(); else setMaxScore(0);},[sessionId,termId,classId,subjectId,assessmentType]);
 async function loadContext(){
  setLoading(true);
  try{
   const {data:u,error:ue}=await supabase.from('users').select('role,branch_id').eq('id',user!.id).single(); if(ue) throw ue;
   const role=String(u?.role||'').toLowerCase(); if(!['admin','super_admin','director'].includes(role)) throw new Error('You do not have permission to view all administrative results.');
   const [{data:s,error:se},{data:c,error:ce}]=await Promise.all([
    supabase.from('academic_sessions').select('id,session_name,term_name,is_current,branch_id,start_date,end_date').order('start_date',{ascending:false}),
    supabase.from('classes').select('id,name,code,level,department,branch_id,status').order('name',{ascending:true})
   ]); if(se) throw se; if(ce) throw ce;
   const ss=(s||[]) as Session[]; const cc=(c||[]) as ClassItem[]; setSessions(ss); setClasses(cc);
   const current=ss.find(x=>x.is_current)||ss[0]; if(current) setSessionId(current.id); else toast.error('No academic sessions have been configured.');
  }catch(e:any){console.error(e);toast.error(e.message||'Failed to load results filters');}finally{setLoading(false);}
 }
 async function loadTerms(s:Session){
  setTermId(''); setTerms([]); setResults([]); setSubjectId(''); setSubjects([]);
  const {data,error}=await supabase.from('terms').select('id,session,term,is_active,is_closed,start_date,end_date').eq('branch_id',s.branch_id).eq('session',s.session_name).order('start_date',{ascending:false});
  if(error){toast.error(error.message);return;} const tt=(data||[]) as Term[]; setTerms(tt); const match=tt.find(x=>normaliseTerm(x.term)===normaliseTerm(s.term_name)); setTermId(match?.id||tt[0]?.id||'');
 }
 async function loadSubjects(id:string){
  setSubjects([]); setSubjectId('');
  try{const {data,error}=await supabase.from('class_subjects').select('subject_id,subjects:subject_id(id,name,code)').eq('class_id',id).order('created_at',{ascending:true}); if(error) throw error; const a=(data||[]).map((x:any)=>x.subjects).filter(Boolean) as SubjectItem[]; if(a.length){setSubjects(a.sort((x,y)=>x.name.localeCompare(y.name)));return;} const c=classes.find(x=>x.id===id); const {data:f,error:fe}=await supabase.from('subjects').select('id,name,code').eq('branch_id',c?.branch_id||'').order('name'); if(fe) throw fe; setSubjects((f||[]) as SubjectItem[]);}catch(e:any){toast.error(e.message||'Failed to load subjects');}
 }
 function resolveGroup(c:ClassItem|undefined){const n=String(c?.name||'').toLowerCase();const level=String(c?.level||'').toLowerCase(); if(n.includes('kg silver'))return'kg_silver'; if(n.includes('kg gold'))return'kg_gold'; if(n.includes('transition')||n.includes('grader'))return'transition_grader'; if(/^grade\s*[1-9]/i.test(String(c?.name||''))||level==='primary')return'primary'; if(level==='junior'||/\bjss\b/i.test(n))return'jss'; if(level==='senior'||/\bss\b/i.test(n)||n.includes('graduate'))return'ss'; return'nursery';}
 async function loadMaximum(){
  const {data,error}=await supabase.from('result_assessment_configs').select('components,total_max,first_test_max,second_test_max,exam_max').eq('academic_session_id',sessionId).eq('term_id',termId).eq('academic_group',resolveGroup(cls)).maybeSingle();
  if(error){console.error(error);setMaxScore(0);return;} const c=Array.isArray(data?.components)?data.components.find((x:any)=>x.key===assessmentType):null; const fallback=assessmentType==='first_test'?data?.first_test_max:assessmentType==='second_test'?data?.second_test_max:data?.exam_max; setMaxScore(Number(c?.max_score??fallback??0));
 }
 async function fetchResults(){
  if(!sessionId||!termId||!classId||!subjectId){toast.error('Select session, term, class and subject first.');return;} setLoadingResults(true);
  try{const {data:b,error:be}=await supabase.from('result_batches').select('id,max_score,status,title,assessment_type,assessment_date').eq('academic_session_id',sessionId).eq('term_id',termId).eq('class_id',classId).eq('subject_id',subjectId).eq('assessment_type',assessmentType).order('created_at',{ascending:false}); if(be) throw be; const batch=b?.[0]; if(!batch){setResults([]);toast(`No ${label(assessmentType)} has been entered for this selection.`);return;} setMaxScore(Number(batch.max_score||maxScore||0)); const {data:e,error:ee}=await supabase.from('result_entries').select('id,student_id,score,percentage,grade,remark,position,students:student_id(first_name,middle_name,last_name,admission_number)').eq('batch_id',batch.id).order('position',{ascending:true,nullsFirst:false}); if(ee) throw ee; setResults((e||[]) as unknown as ResultRow[]);}catch(e:any){console.error(e);toast.error(e.message||'Failed to load results');setResults([]);}finally{setLoadingResults(false);}
 }
 const visibleClasses=classes.filter(c=>{const q=query.trim().toLowerCase();return !q||[c.name,c.code,c.level,c.department,c.branch_id].filter(Boolean).join(' ').toLowerCase().includes(q);});
 return <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6">
  <motion.div initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-indigo-600"><BarChart3 className="h-4 w-4"/> Results administration</div><h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">View Results</h1><p className="mt-2 text-sm text-slate-500">Directors and administrators can review results across every branch, class, session and term.</p></div><button onClick={()=>void loadContext()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold shadow-sm dark:border-slate-700 dark:bg-slate-800"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/> Refresh</button></motion.div>
  {loading?<div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-indigo-600"/></div>:<>
   <section className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6"><div className="mb-5 flex items-center gap-2"><Filter className="h-5 w-5 text-indigo-600"/><div><h2 className="font-black">Result filters</h2><p className="text-xs text-slate-500">All classes are available to admin/director accounts.</p></div></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
    <label className="text-sm font-bold">Session<select value={sessionId} onChange={e=>setSessionId(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 font-medium dark:border-slate-600 dark:bg-slate-900"><option value="">Select session</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.session_name}{s.is_current?' — Current':''}</option>)}</select></label>
    <label className="text-sm font-bold">Term<select value={termId} onChange={e=>setTermId(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 font-medium dark:border-slate-600 dark:bg-slate-900"><option value="">Select term</option>{terms.map(t=><option key={t.id} value={t.id}>{t.term}{t.is_closed?' — Closed':t.is_active?' — Active':''}</option>)}</select></label>
    <label className="text-sm font-bold xl:col-span-2">Class<div className="relative mt-2"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search all classes…" className="mb-2 w-full rounded-xl border py-3 pl-9 pr-3 dark:border-slate-600 dark:bg-slate-900"/><select value={classId} onChange={e=>setClassId(e.target.value)} className="w-full rounded-xl border px-3 py-3 font-medium dark:border-slate-600 dark:bg-slate-900"><option value="">Select class ({visibleClasses.length} available)</option>{visibleClasses.map(c=><option key={c.id} value={c.id}>{c.name}{c.code?` (${c.code})`:''} — Branch ${c.branch_id.slice(0,8)}</option>)}</select></div></label>
    <label className="text-sm font-bold">Subject<select value={subjectId} onChange={e=>setSubjectId(e.target.value)} disabled={!classId} className="mt-2 w-full rounded-xl border px-3 py-3 font-medium disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900"><option value="">Select subject</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   </div><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Assessment<select value={assessmentType} onChange={e=>setAssessmentType(e.target.value as any)} className="mt-2 w-full rounded-xl border px-3 py-3 font-medium dark:border-slate-600 dark:bg-slate-900"><option value="first_test">Test 1</option><option value="second_test">Test 2</option><option value="exam">Exam</option></select></label><div className="rounded-xl border bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"><div className="text-xs font-bold uppercase text-slate-500">Configured maximum</div><div className="mt-1 text-2xl font-black">{maxScore || '—'}</div></div></div><button onClick={()=>void fetchResults()} disabled={loadingResults} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-black text-white disabled:opacity-50">{loadingResults?<Loader2 className="h-4 w-4 animate-spin"/>:<BarChart3 className="h-4 w-4"/>} Load results</button></section>
   <section className="rounded-3xl border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="flex flex-col gap-2 border-b p-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black">{cls?.name||'Results'}</h2><p className="text-sm text-slate-500">{subject?.name||'Select a subject'} · {label(assessmentType)} · {session?.session_name||'—'} · {terms.find(t=>t.id===termId)?.term||'—'}</p></div><div className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-black text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">{results.length} entries</div></div>{results.length===0?<div className="p-10 text-center text-sm text-slate-500">No results loaded. Select the filters and click Load results.</div>:<div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left dark:bg-slate-900"><tr><th className="px-5 py-3">Pos.</th><th className="px-5 py-3">Student</th><th className="px-5 py-3">Admission No.</th><th className="px-5 py-3">Score</th><th className="px-5 py-3">%</th><th className="px-5 py-3">Grade</th><th className="px-5 py-3">Remark</th></tr></thead><tbody>{results.map(r=><tr key={r.id} className="border-t dark:border-slate-700"><td className="px-5 py-3 font-bold">{r.position??'—'}</td><td className="px-5 py-3 font-bold">{[r.student?.first_name,r.student?.middle_name,r.student?.last_name].filter(Boolean).join(' ')||'Unknown'}</td><td className="px-5 py-3">{r.student?.admission_number||'—'}</td><td className="px-5 py-3 font-black">{r.score}</td><td className="px-5 py-3">{r.percentage??'—'}</td><td className="px-5 py-3 font-bold">{r.grade||'—'}</td><td className="px-5 py-3">{r.remark||'—'}</td></tr>)}</tbody></table></div>}</section>
  </>}
 </div>;
};
export default AdminViewResultsFixed;
