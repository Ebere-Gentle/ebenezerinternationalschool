import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, Check, ChevronRight, Loader2, Plus, Save, Settings2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';
import { ASSESSMENT_GROUPS, type AssessmentGroup } from '../../../utils/results/assessmentGroups';

type Session = { id: string; session_name: string; term_name: string; is_current: boolean | null };
type Term = { id: string; session: string; term: string; is_active: boolean | null; is_closed: boolean | null };
type Component = {
  key: string;
  name: string;
  max_score: string;
  counts_for_ca: boolean;
  counts_for_total: boolean;
  display_order: number;
};
type Scheme = {
  id?: string;
  academic_group: Exclude<AssessmentGroup, 'custom'>;
  total_max: string;
  components: Component[];
  notes: string;
};

const makeComponent = (key: string, name: string, max: string, order: number): Component => ({
  key,
  name,
  max_score: max,
  counts_for_ca: key !== 'exam',
  counts_for_total: true,
  display_order: order,
});

const emptyScheme = (group: Exclude<AssessmentGroup, 'custom'>): Scheme => ({
  academic_group: group,
  total_max: '',
  components: [
    makeComponent('first_test', 'Test 1', '', 1),
    makeComponent('second_test', 'Test 2', '', 2),
    makeComponent('exam', 'Exam', '', 3),
  ],
  notes: '',
});

const normaliseTerm = (value: string) => value.toLowerCase().replace('first', '1st').replace('second', '2nd').replace('third', '3rd').trim();

export default function ResultAssessmentSettings() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [termId, setTermId] = useState('');
  const [activeGroup, setActiveGroup] = useState<Exclude<AssessmentGroup, 'custom'>>('jss');
  const [schemes, setSchemes] = useState<Record<string, Scheme>>({});
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedSession = sessions.find(item => item.id === sessionId);
  const selectedTerm = terms.find(item => item.id === termId);
  const currentScheme = schemes[activeGroup] || emptyScheme(activeGroup);
  const componentTotal = useMemo(
    () => currentScheme.components.reduce((sum, component) => sum + (Number(component.max_score) || 0), 0),
    [currentScheme.components],
  );
  const totalMax = Number(currentScheme.total_max) || 0;
  const isBalanced = componentTotal > 0 && totalMax > 0 && Math.abs(componentTotal - totalMax) < 0.0001;

  useEffect(() => { void loadContext(); }, []);
  useEffect(() => {
    if (sessionId && termId) void loadSchemes();
  }, [sessionId, termId]);

  async function loadContext() {
    setLoading(true);
    try {
      const [{ data: sessionData, error: sessionError }, { data: termData, error: termError }, { data: classes, error: classError }] = await Promise.all([
        supabase.from('academic_sessions').select('id,session_name,term_name,is_current').order('start_date', { ascending: false }),
        supabase.from('terms').select('id,session,term,is_active,is_closed').order('start_date', { ascending: false }),
        supabase.from('classes').select('id,name,level,department').neq('status', 'inactive'),
      ]);
      if (sessionError) throw sessionError;
      if (termError) throw termError;
      if (classError) throw classError;

      const nextSessions = (sessionData || []) as Session[];
      const nextTerms = (termData || []) as Term[];
      setSessions(nextSessions);
      setTerms(nextTerms);

      const counts: Record<string, number> = {};
      for (const cls of classes || []) {
        const name = String(cls.name || '').toLowerCase();
        const level = String(cls.level || '').toLowerCase();
        const department = String(cls.department || '').toLowerCase();
        const group = name.includes('kg silver')
          ? 'kg_silver'
          : name.includes('kg gold')
            ? 'kg_gold'
            : name.includes('transition')
              ? 'transition_grader'
              : level === 'junior' || /^jss\s*[123]/i.test(name)
                ? 'jss'
                : level === 'senior' || /^ss\s*[123]/i.test(name) || name.includes('graduate')
                  ? 'ss'
                  : name.includes('nursery') || level === 'nursery' || department === 'nursery'
                    ? 'nursery'
                    : level === 'primary' || /^grade\s*[1-9]/i.test(name)
                      ? 'primary'
                      : 'custom';
        counts[group] = (counts[group] || 0) + 1;
      }
      setClassCounts(counts);

      const current = nextSessions.find(item => item.is_current) || nextSessions[0];
      if (!current) throw new Error('No academic session exists. Configure Academic Sessions first.');
      setSessionId(current.id);
      const matching = nextTerms.filter(item => item.session === current.session_name && item.is_active && !item.is_closed);
      const term = matching.find(item => normaliseTerm(item.term) === normaliseTerm(current.term_name || '')) || matching[0];
      if (!term) throw new Error(`No active term is configured for ${current.session_name}.`);
      setTermId(term.id);
    } catch (error: any) {
      toast.error(error.message || 'Unable to load assessment settings');
    } finally {
      setLoading(false);
    }
  }

  async function loadSchemes() {
    try {
      const { data, error } = await supabase
        .from('result_assessment_configs')
        .select('id,academic_group,total_max,components,first_test_max,second_test_max,exam_max,notes,status')
        .eq('academic_session_id', sessionId)
        .eq('term_id', termId)
        .eq('status', 'active');
      if (error) throw error;

      const next: Record<string, Scheme> = {};
      for (const group of ASSESSMENT_GROUPS) next[group.key] = emptyScheme(group.key);
      for (const row of data || []) {
        if (!row.academic_group || !next[row.academic_group]) continue;
        const components = Array.isArray(row.components) && row.components.length
          ? row.components.map((item: any, index: number) => ({
              key: String(item.key || `component_${index + 1}`),
              name: String(item.name || `Component ${index + 1}`),
              max_score: String(item.max_score ?? ''),
              counts_for_ca: Boolean(item.counts_for_ca),
              counts_for_total: item.counts_for_total !== false,
              display_order: Number(item.display_order || index + 1),
            }))
          : [
              makeComponent('first_test', 'Test 1', String(row.first_test_max ?? ''), 1),
              makeComponent('second_test', 'Test 2', String(row.second_test_max ?? ''), 2),
              makeComponent('exam', 'Exam', String(row.exam_max ?? ''), 3),
            ];
        next[row.academic_group] = {
          id: row.id,
          academic_group: row.academic_group,
          total_max: String(row.total_max ?? ''),
          components,
          notes: String(row.notes || ''),
        };
      }
      setSchemes(next);
    } catch (error: any) {
      toast.error(error.message || 'Unable to load assessment schemes');
    }
  }

  function updateScheme(patch: Partial<Scheme>) {
    setSchemes(current => ({
      ...current,
      [activeGroup]: { ...(current[activeGroup] || emptyScheme(activeGroup)), ...patch },
    }));
  }

  function updateComponent(index: number, patch: Partial<Component>) {
    const scheme = currentScheme;
    updateScheme({ components: scheme.components.map((component, itemIndex) => itemIndex === index ? { ...component, ...patch } : component) });
  }

  function addComponent() {
    const nextOrder = currentScheme.components.length + 1;
    updateScheme({ components: [...currentScheme.components, makeComponent(`component_${Date.now()}`, `Assessment ${nextOrder}`, '', nextOrder)] });
  }

  function removeComponent(index: number) {
    if (currentScheme.components.length <= 1) return toast.error('Keep at least one assessment component.');
    updateScheme({ components: currentScheme.components.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, display_order: itemIndex + 1 })) });
  }

  async function save() {
    if (!sessionId || !termId) return toast.error('Select an academic session and term.');
    if (!currentScheme.components.length) return toast.error('Add at least one assessment component.');
    if (!totalMax || totalMax <= 0) return toast.error('Enter a valid total maximum score.');
    if (currentScheme.components.some(item => !item.name.trim() || !Number.isFinite(Number(item.max_score)) || Number(item.max_score) <= 0)) return toast.error('Every assessment component needs a name and a maximum score greater than zero.');
    if (!isBalanced) return toast.error(`Component maximums total ${componentTotal}, but the configured total is ${totalMax}. They must match.`);

    setSaving(true);
    try {
      const first = Number(currentScheme.components.find(item => item.key === 'first_test')?.max_score || 0);
      const second = Number(currentScheme.components.find(item => item.key === 'second_test')?.max_score || 0);
      const exam = Number(currentScheme.components.find(item => item.key === 'exam')?.max_score || 0);
      const payload = {
        academic_session_id: sessionId,
        term_id: termId,
        academic_group: activeGroup,
        first_test_max: first,
        second_test_max: second,
        exam_max: exam,
        total_max: totalMax,
        components: currentScheme.components,
        notes: currentScheme.notes,
        status: 'active',
        updated_by: user?.id || null,
        ...(currentScheme.id ? {} : { created_by: user?.id || null }),
      };
      const { data, error } = await supabase
        .from('result_assessment_configs')
        .upsert(payload, { onConflict: 'academic_session_id,term_id,academic_group' })
        .select('id')
        .single();
      if (error) throw error;
      updateScheme({ id: data.id });
      toast.success(`${ASSESSMENT_GROUPS.find(item => item.key === activeGroup)?.label} assessment scheme saved.`);
      await loadSchemes();
    } catch (error: any) {
      toast.error(error.message || 'Unable to save assessment scheme');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !sessions.length) {
    return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6">
      <header className="grid gap-5 lg:grid-cols-[1fr_390px]">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-600"><Settings2 className="h-4 w-4" /> Results administration</div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">Assessment Schemes</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Configure maximum marks independently for Nursery, KG Silver, KG Gold, Transition / Grader, Primary, JSS and SS. Teachers inherit the scheme from the class they are assigned to.</p>
        </div>
        <div className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2 font-black"><CalendarDays className="h-5 w-5 text-indigo-600" /> Academic context</div>
          <p className="mt-3 text-2xl font-black">{selectedSession?.session_name || '—'}</p>
          <p className="text-sm text-slate-500">{selectedTerm?.term || selectedSession?.term_name || '—'}</p>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <label className="rounded-2xl border bg-white p-4 font-bold shadow-sm dark:border-slate-700 dark:bg-slate-800">Academic Session
          <select value={sessionId} onChange={event => { setSessionId(event.target.value); setTermId(''); }} className="mt-2 w-full rounded-xl border px-3 py-3 font-medium dark:border-slate-600 dark:bg-slate-900">
            <option value="">Select session</option>
            {sessions.map(item => <option key={item.id} value={item.id}>{item.session_name} — {item.term_name}</option>)}
          </select>
        </label>
        <label className="rounded-2xl border bg-white p-4 font-bold shadow-sm dark:border-slate-700 dark:bg-slate-800">Term
          <select value={termId} onChange={event => setTermId(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 font-medium dark:border-slate-600 dark:bg-slate-900">
            <option value="">Select term</option>
            {terms.filter(item => !selectedSession || item.session === selectedSession.session_name).map(item => <option key={item.id} value={item.id}>{item.term}{item.is_active ? ' · Active' : ''}</option>)}
          </select>
        </label>
      </section>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="rounded-3xl border bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="px-3 pb-2 pt-2 text-xs font-black uppercase tracking-wider text-slate-400">Academic groups</p>
          <div className="space-y-1">
            {ASSESSMENT_GROUPS.map(group => {
              const selected = group.key === activeGroup;
              const configured = Boolean(schemes[group.key]?.id);
              return <button key={group.key} onClick={() => setActiveGroup(group.key)} className={`flex w-full items-center justify-between rounded-2xl p-3 text-left transition ${selected ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-50 dark:hover:bg-slate-700/60'}`}>
                <span><span className="block font-black">{group.label}</span><span className={`text-xs ${selected ? 'text-indigo-100' : 'text-slate-400'}`}>{classCounts[group.key] || 0} class(es)</span></span>
                <span className="flex items-center gap-1">{configured && <Check className="h-4 w-4" />}<ChevronRight className="h-4 w-4 opacity-50" /></span>
              </button>;
            })}
          </div>
        </aside>

        <main className="space-y-5">
          <section className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Current scheme</p>
                <h2 className="mt-1 text-2xl font-black">{ASSESSMENT_GROUPS.find(item => item.key === activeGroup)?.label}</h2>
                <p className="mt-1 text-sm text-slate-500">{ASSESSMENT_GROUPS.find(item => item.key === activeGroup)?.description}. Configuration is stored for the selected session and term.</p>
              </div>
              <div className={`rounded-2xl px-4 py-3 text-right ${isBalanced ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'}`}>
                <p className="text-xs font-bold uppercase">Configured total</p><p className="text-2xl font-black">{totalMax || '—'}</p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border dark:border-slate-700">
              <div className="hidden grid-cols-[1.4fr_150px_150px_130px_55px] gap-3 bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-wide text-white md:grid">
                <span>Assessment component</span><span>Maximum</span><span>Counts for CA</span><span>Counts for total</span><span />
              </div>
              <div className="divide-y dark:divide-slate-700">
                {currentScheme.components.map((component, index) => <div key={component.key} className="grid gap-3 p-4 md:grid-cols-[1.4fr_150px_150px_130px_55px] md:items-center">
                  <label className="font-bold">Name<input value={component.name} onChange={event => updateComponent(index, { name: event.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-medium dark:border-slate-600 dark:bg-slate-900" /></label>
                  <label className="font-bold">Maximum<input type="number" min="0.01" step="0.01" value={component.max_score} onChange={event => updateComponent(index, { max_score: event.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-black dark:border-slate-600 dark:bg-slate-900" /></label>
                  <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={component.counts_for_ca} onChange={event => updateComponent(index, { counts_for_ca: event.target.checked })} className="h-4 w-4 rounded" /> CA</label>
                  <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={component.counts_for_total} onChange={event => updateComponent(index, { counts_for_total: event.target.checked })} className="h-4 w-4 rounded" /> Total</label>
                  <button onClick={() => removeComponent(index)} title="Remove component" className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="mx-auto h-4 w-4" /></button>
                </div>)}
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_180px]">
              <button onClick={addComponent} className="flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 font-bold text-indigo-600 hover:bg-indigo-50 dark:border-slate-600 dark:hover:bg-slate-700"><Plus className="h-4 w-4" /> Add assessment component</button>
              <label className="font-bold">Total maximum<input type="number" min="0.01" step="0.01" value={currentScheme.total_max} onChange={event => updateScheme({ total_max: event.target.value })} className="mt-1 w-full rounded-xl border px-3 py-3 text-xl font-black dark:border-slate-600 dark:bg-slate-900" /></label>
            </div>

            <label className="mt-4 block font-bold">Administrator notes<textarea value={currentScheme.notes} onChange={event => updateScheme({ notes: event.target.value })} rows={3} placeholder="Optional notes about this scoring scheme…" className="mt-1 w-full rounded-xl border px-3 py-3 font-medium dark:border-slate-600 dark:bg-slate-900" /></label>
          </section>

          <section className={`rounded-3xl border p-5 ${isBalanced ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3"><div className="rounded-xl bg-white p-2 shadow-sm"><AlertCircle className="h-5 w-5 text-indigo-600" /></div><div><p className="font-black">Score validation</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Components: <strong>{componentTotal || 0}</strong> · Configured total: <strong>{totalMax || 0}</strong>. These must match before activation.</p></div></div>
              <button onClick={save} disabled={saving || !isBalanced || !sessionId || !termId} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save & activate'}{isBalanced && <Check className="h-4 w-4" />}</button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
