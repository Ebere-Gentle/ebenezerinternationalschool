import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Save, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

type Session = { id: string; session_name: string; term_name: string; is_current: boolean | null };
type Term = { id: string; session: string; term: string; is_active: boolean | null; is_closed: boolean | null };
type Config = { id?: string; first_test_max: string; second_test_max: string; exam_max: string };

const emptyConfig: Config = { first_test_max: '20', second_test_max: '20', exam_max: '60' };

export default function ResultAssessmentSettings() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [termId, setTermId] = useState('');
  const [config, setConfig] = useState<Config>(emptyConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const total = useMemo(() => Number(config.first_test_max || 0) + Number(config.second_test_max || 0) + Number(config.exam_max || 0), [config]);

  useEffect(() => { void loadContext(); }, []);
  useEffect(() => { if (sessionId && termId) void loadConfig(sessionId, termId); }, [sessionId, termId]);

  async function loadContext() {
    setLoading(true);
    try {
      const [{ data: sessionData, error: sessionError }, { data: termData, error: termError }] = await Promise.all([
        supabase.from('academic_sessions').select('id,session_name,term_name,is_current').order('start_date', { ascending: false }),
        supabase.from('terms').select('id,session,term,is_active,is_closed').order('start_date', { ascending: false }),
      ]);
      if (sessionError) throw sessionError;
      if (termError) throw termError;
      const nextSessions = (sessionData || []) as Session[];
      const nextTerms = (termData || []) as Term[];
      setSessions(nextSessions); setTerms(nextTerms);
      const currentSession = nextSessions.find((item) => item.is_current) || nextSessions[0];
      const activeTerm = nextTerms.find((item) => item.is_active && !item.is_closed) || nextTerms[0];
      if (currentSession) setSessionId(currentSession.id);
      if (activeTerm) setTermId(activeTerm.id);
    } catch (error: any) { toast.error(error.message || 'Unable to load academic contexts'); }
    finally { setLoading(false); }
  }

  async function loadConfig(nextSessionId: string, nextTermId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('result_assessment_configs').select('id,first_test_max,second_test_max,exam_max').eq('academic_session_id', nextSessionId).eq('term_id', nextTermId).maybeSingle();
      if (error) throw error;
      setConfig(data ? { id: data.id, first_test_max: String(data.first_test_max), second_test_max: String(data.second_test_max), exam_max: String(data.exam_max) } : emptyConfig);
    } catch (error: any) { toast.error(error.message || 'Unable to load assessment configuration'); }
    finally { setLoading(false); }
  }

  async function save() {
    const first = Number(config.first_test_max), second = Number(config.second_test_max), exam = Number(config.exam_max);
    if (!sessionId || !termId) return toast.error('Select an academic session and term.');
    if (![first, second, exam].every((value) => Number.isFinite(value) && value > 0)) return toast.error('All three maximum marks must be greater than zero.');
    if (first + second + exam !== 100) return toast.error(`The three components must total 100. Current total is ${first + second + exam}.`);
    setSaving(true);
    try {
      const payload = { academic_session_id: sessionId, term_id: termId, first_test_max: first, second_test_max: second, exam_max: exam, updated_by: user?.id || null, ...(config.id ? {} : { created_by: user?.id || null }) };
      const { error } = await supabase.from('result_assessment_configs').upsert(payload, { onConflict: 'academic_session_id,term_id' });
      if (error) throw error;
      toast.success('Result assessment configuration saved.');
      await loadConfig(sessionId, termId);
    } catch (error: any) { toast.error(error.message || 'Unable to save configuration'); }
    finally { setSaving(false); }
  }

  if (loading && !sessions.length) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return <div className="mx-auto max-w-5xl space-y-6 p-4">
    <div><div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-indigo-600"><Settings2 className="h-4 w-4" /> Result configuration</div><h1 className="text-3xl font-bold text-slate-900 dark:text-white">Assessment Components</h1><p className="mt-2 max-w-3xl text-slate-500 dark:text-slate-300">Configure the maximum marks teachers will use for First Test, Second Test and Exam. The three components must equal 100.</p></div>
    <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Academic session<select value={sessionId} onChange={(event) => setSessionId(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"><option value="">Select session</option>{sessions.map((item) => <option key={item.id} value={item.id}>{item.session_name}{item.term_name ? ` — ${item.term_name}` : ''}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Term<select value={termId} onChange={(event) => setTermId(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"><option value="">Select term</option>{terms.map((item) => <option key={item.id} value={item.id}>{item.session} — {item.term}{item.is_active ? ' (Active)' : ''}</option>)}</select></label>
    </div></section>
    <section className="grid gap-4 md:grid-cols-3"><ComponentCard label="First Test" value={config.first_test_max} onChange={(value) => setConfig((current) => ({ ...current, first_test_max: value }))} /><ComponentCard label="Second Test" value={config.second_test_max} onChange={(value) => setConfig((current) => ({ ...current, second_test_max: value }))} /><ComponentCard label="Exam" value={config.exam_max} onChange={(value) => setConfig((current) => ({ ...current, exam_max: value }))} /></section>
    <section className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${total === 100 ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'}`}><div><p className="text-sm font-medium text-slate-500">Configured total</p><p className="text-3xl font-bold text-slate-900 dark:text-white">{total} / 100</p></div><div className="flex items-center gap-3">{total === 100 && <span className="flex items-center gap-1 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" /> Valid configuration</span>}<button onClick={save} disabled={saving || total !== 100 || !sessionId || !termId} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save configuration'}</button></div></section>
  </div>;
}

function ComponentCard({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p className="text-sm font-semibold text-slate-500 dark:text-slate-300">{label}</p><div className="mt-3 flex items-center gap-3"><input type="number" min="0.01" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border px-4 py-3 text-xl font-bold dark:border-slate-600 dark:bg-slate-900" /><span className="font-semibold text-slate-400">marks</span></div></div>; }
