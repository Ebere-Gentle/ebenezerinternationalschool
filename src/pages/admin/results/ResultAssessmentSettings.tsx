import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Loader2, Save, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

type Session = { id: string; session_name: string; term_name: string; is_current: boolean | null };
type Term = { id: string; session: string; term: string; is_active: boolean | null; is_closed: boolean | null };
type Config = { id?: string; first_test_max: string; second_test_max: string; exam_max: string };
const emptyConfig: Config = { first_test_max: '20', second_test_max: '20', exam_max: '60' };
const normalizeTerm = (v: string) => v.toLowerCase().replace('first', '1st').replace('second', '2nd').replace('third', '3rd');

export default function ResultAssessmentSettings() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]), [terms, setTerms] = useState<Term[]>([]);
  const [sessionId, setSessionId] = useState(''), [termId, setTermId] = useState(''), [config, setConfig] = useState<Config>(emptyConfig);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const total = useMemo(() => Number(config.first_test_max || 0) + Number(config.second_test_max || 0) + Number(config.exam_max || 0), [config]);
  const selectedSession = sessions.find(x => x.id === sessionId);
  const filteredTerms = terms.filter(x => !selectedSession || x.session === selectedSession.session_name);

  useEffect(() => { void loadContext(); }, []);
  useEffect(() => { if (sessionId && termId) void loadConfig(sessionId, termId); }, [sessionId, termId]);

  async function loadContext() {
    setLoading(true);
    try {
      const [{ data: sessionData, error: se }, { data: termData, error: te }] = await Promise.all([
        supabase.from('academic_sessions').select('id,session_name,term_name,is_current').order('start_date', { ascending: false }),
        supabase.from('terms').select('id,session,term,is_active,is_closed').order('start_date', { ascending: false }),
      ]);
      if (se) throw se; if (te) throw te;
      const ss = (sessionData || []) as Session[], tt = (termData || []) as Term[]; setSessions(ss); setTerms(tt);
      const current = ss.find(x => x.is_current) || ss[0];
      if (!current) throw new Error('No academic session exists. Configure it in Academic Sessions first.');
      setSessionId(current.id);
      const matching = tt.filter(x => x.session === current.session_name && x.is_active && !x.is_closed);
      const term = matching.find(x => normalizeTerm(x.term) === normalizeTerm(current.term_name || '')) || matching[0];
      if (term) setTermId(term.id); else throw new Error(`No active term is configured for ${current.session_name}.`);
    } catch (e: any) { toast.error(e.message || 'Unable to load academic context'); } finally { setLoading(false); }
  }

  async function loadConfig(sid: string, tid: string) {
    try {
      const { data, error } = await supabase.from('result_assessment_configs').select('id,first_test_max,second_test_max,exam_max').eq('academic_session_id', sid).eq('term_id', tid).maybeSingle();
      if (error) throw error;
      setConfig(data ? { id: data.id, first_test_max: String(data.first_test_max), second_test_max: String(data.second_test_max), exam_max: String(data.exam_max) } : emptyConfig);
    } catch (e: any) { toast.error(e.message || 'Unable to load assessment configuration'); }
  }

  async function save() {
    const first = Number(config.first_test_max), second = Number(config.second_test_max), exam = Number(config.exam_max);
    if (!sessionId || !termId) return toast.error('Select an academic session and term.');
    if (![first, second, exam].every(Number.isFinite) || [first, second, exam].some(x => x <= 0)) return toast.error('All three maximum marks must be greater than zero.');
    if (first + second + exam !== 100) return toast.error(`The three components must total 100. Current total is ${first + second + exam}.`);
    setSaving(true);
    try {
      const { error } = await supabase.from('result_assessment_configs').upsert({ academic_session_id: sessionId, term_id: termId, first_test_max: first, second_test_max: second, exam_max: exam, total_max: 100, status: 'active', updated_by: user?.id || null, ...(config.id ? {} : { created_by: user?.id || null }) }, { onConflict: 'academic_session_id,term_id' });
      if (error) throw error; toast.success('Assessment configuration saved.'); await loadConfig(sessionId, termId);
    } catch (e: any) { toast.error(e.message || 'Unable to save configuration'); } finally { setSaving(false); }
  }

  if (loading && !sessions.length) return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></div>;
  return <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]"><div><div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-600"><Settings2 className="h-4 w-4" /> Result configuration</div><h1 className="text-3xl font-black text-slate-900 dark:text-white">Assessment Components</h1><p className="mt-2 text-slate-500">Set the marks teachers will use. The configuration follows the Academic Sessions record; it is not branch-driven.</p></div><div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center gap-2 font-bold"><CalendarDays className="h-4 w-4 text-indigo-600" /> Current academic context</div><p className="mt-3 text-xl font-black">{selectedSession?.session_name || '—'}</p><p className="text-sm text-slate-500">{selectedSession?.term_name || '—'}</p></div></div>
    <section className="grid gap-4 lg:grid-cols-2"><label className="rounded-2xl border bg-white p-4 font-semibold shadow-sm dark:border-slate-700 dark:bg-slate-800">Academic Session<select value={sessionId} onChange={e => { setSessionId(e.target.value); setTermId(''); }} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"><option value="">Select session</option>{sessions.map(x => <option key={x.id} value={x.id}>{x.session_name} — {x.term_name}</option>)}</select></label><label className="rounded-2xl border bg-white p-4 font-semibold shadow-sm dark:border-slate-700 dark:bg-slate-800">Term<select value={termId} onChange={e => setTermId(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"><option value="">Select term</option>{filteredTerms.map(x => <option key={x.id} value={x.id}>{x.term}{x.is_active ? ' · Active' : ''}</option>)}</select></label></section>
    <section className="grid gap-4 lg:grid-cols-3"><ComponentCard label="Test 1" value={config.first_test_max} onChange={v => setConfig(x => ({ ...x, first_test_max: v }))} /><ComponentCard label="Test 2" value={config.second_test_max} onChange={v => setConfig(x => ({ ...x, second_test_max: v }))} /><ComponentCard label="Exam" value={config.exam_max} onChange={v => setConfig(x => ({ ...x, exam_max: v }))} /></section>
    <section className={`grid gap-5 rounded-3xl border p-5 lg:grid-cols-[1fr_auto] ${total === 100 ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'}`}><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Final calculation</p><div className="mt-2 flex flex-wrap items-end gap-3"><span className="text-3xl font-black">{config.first_test_max || 0}</span><span>+</span><span className="text-3xl font-black">{config.second_test_max || 0}</span><span>+</span><span className="text-3xl font-black">{config.exam_max || 0}</span><span>=</span><span className="text-4xl font-black text-emerald-700">{total}</span><span className="pb-1 text-sm font-bold text-slate-500">/ 100</span></div><p className="mt-2 text-sm text-slate-600">CA on the student result sheet will automatically be Test 1 + Test 2.</p></div><button onClick={save} disabled={saving || total !== 100 || !sessionId || !termId} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save configuration'} {total === 100 && <Check className="h-4 w-4" />}</button></section>
  </div>;
}
function ComponentCard({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <div className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p className="text-sm font-black uppercase tracking-wide text-slate-500">{label}</p><div className="mt-4 flex items-center gap-3"><input type="number" min="0.01" step="0.01" value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border px-4 py-4 text-2xl font-black dark:border-slate-600 dark:bg-slate-900" /><span className="font-bold text-slate-400">marks</span></div></div>; }
