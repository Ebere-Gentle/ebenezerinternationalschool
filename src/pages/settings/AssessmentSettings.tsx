import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2, Plus, Save, Settings2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { ASSESSMENT_GROUPS, type AssessmentGroup, resolveAssessmentGroup } from '../../utils/results/assessmentGroups';

type Session = { id: string; session_name: string; term_name: string; is_current: boolean; branch_id: string };
type Term = { id: string; session: string; term: string; is_active: boolean; is_closed: boolean };
type ClassItem = { id: string; name: string; level: string | null; department: string | null };
type Component = { key: string; name: string; max_score: string; counts_for_ca: boolean; counts_for_total: boolean; display_order: number };
type Scheme = { id?: string; academic_group: Exclude<AssessmentGroup, 'custom'>; total_max: string; components: Component[]; notes: string };

const makeComponent = (key: string, name: string, order: number): Component => ({ key, name, max_score: '', counts_for_ca: key !== 'exam', counts_for_total: true, display_order: order });
const emptyScheme = (group: Exclude<AssessmentGroup, 'custom'>): Scheme => ({
  academic_group: group,
  total_max: '',
  components: [makeComponent('first_test', 'Test 1', 1), makeComponent('second_test', 'Test 2', 2), makeComponent('exam', 'Exam', 3)],
  notes: '',
});
const normaliseTerm = (value: string | null | undefined) => String(value || '').trim().toLowerCase().replace('first', '1st').replace('second', '2nd').replace('third', '3rd');

export default function AssessmentSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [termId, setTermId] = useState('');
  const [group, setGroup] = useState<Exclude<AssessmentGroup, 'custom'>>('jss');
  const [schemes, setSchemes] = useState<Record<string, Scheme>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentScheme = schemes[group] || emptyScheme(group);
  const selectedSession = sessions.find(item => item.id === sessionId);
  const selectedTerm = terms.find(item => item.id === termId);
  const groupClasses = useMemo(() => classes.filter(item => resolveAssessmentGroup(item) === group), [classes, group]);
  const componentTotal = currentScheme.components.reduce((sum, item) => sum + (Number(item.max_score) || 0), 0);
  const totalMax = Number(currentScheme.total_max) || 0;
  const balanced = componentTotal > 0 && totalMax > 0 && componentTotal === totalMax;

  useEffect(() => { void loadContext(); }, [user?.id]);
  useEffect(() => { if (sessionId && termId) void loadSchemes(); }, [sessionId, termId]);
  useEffect(() => { if (sessionId) void loadTerms(); }, [sessionId]);

  async function loadContext() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.from('users').select('branch_id,role').eq('id', user.id).single();
      if (userError) throw userError;
      if (!['admin', 'director', 'super_admin'].includes(String(userData?.role || '').toLowerCase())) throw new Error('Only administrators and directors can configure assessment schemes.');
      if (!userData.branch_id) throw new Error('Your account has no branch assigned.');

      const [{ data: sessionData, error: sessionError }, { data: classData, error: classError }] = await Promise.all([
        supabase.from('academic_sessions').select('id,session_name,term_name,is_current,branch_id').eq('branch_id', userData.branch_id).order('start_date', { ascending: false }),
        supabase.from('classes').select('id,name,level,department').eq('branch_id', userData.branch_id).eq('status', 'active').order('name'),
      ]);
      if (sessionError) throw sessionError;
      if (classError) throw classError;
      setSessions((sessionData || []) as Session[]);
      setClasses((classData || []) as ClassItem[]);

      const current = (sessionData || []).find((item: Session) => item.is_current) || sessionData?.[0];
      if (current) setSessionId(current.id);
    } catch (error: any) {
      toast.error(error.message || 'Unable to load assessment settings');
    } finally {
      setLoading(false);
    }
  }

  async function loadTerms() {
    const session = sessions.find(item => item.id === sessionId);
    if (!session) return;
    const { data, error } = await supabase.from('terms').select('id,session,term,is_active,is_closed').eq('branch_id', session.branch_id).eq('session', session.session_name).order('start_date', { ascending: false });
    if (error) { toast.error(error.message); return; }
    const loaded = (data || []) as Term[];
    setTerms(loaded);
    const matching = loaded.find(item => normaliseTerm(item.term) === normaliseTerm(session.term_name));
    setTermId(current => matching?.id || current || loaded[0]?.id || '');
  }

  async function loadSchemes() {
    const { data, error } = await supabase.from('result_assessment_configs').select('id,academic_group,total_max,components,first_test_max,second_test_max,exam_max,notes,status').eq('academic_session_id', sessionId).eq('term_id', termId).eq('status', 'active');
    if (error) { toast.error(error.message || 'Unable to load assessment schemes'); return; }
    const next: Record<string, Scheme> = {};
    for (const item of ASSESSMENT_GROUPS) next[item.key] = emptyScheme(item.key);
    for (const row of data || []) {
      if (!row.academic_group || !next[row.academic_group]) continue;
      const components = Array.isArray(row.components) && row.components.length ? row.components.map((item: any, index: number) => ({
        key: String(item.key || `component_${index + 1}`),
        name: String(item.name || `Assessment ${index + 1}`),
        max_score: String(item.max_score ?? ''),
        counts_for_ca: Boolean(item.counts_for_ca),
        counts_for_total: item.counts_for_total !== false,
        display_order: Number(item.display_order || index + 1),
      })) : [
        { ...makeComponent('first_test', 'Test 1', 1), max_score: String(row.first_test_max ?? '') },
        { ...makeComponent('second_test', 'Test 2', 2), max_score: String(row.second_test_max ?? '') },
        { ...makeComponent('exam', 'Exam', 3), max_score: String(row.exam_max ?? '') },
      ];
      next[row.academic_group] = { id: row.id, academic_group: row.academic_group, total_max: String(row.total_max ?? ''), components, notes: String(row.notes || '') };
    }
    setSchemes(next);
  }

  function updateScheme(patch: Partial<Scheme>) { setSchemes(current => ({ ...current, [group]: { ...(current[group] || emptyScheme(group)), ...patch } })); }
  function updateComponent(index: number, patch: Partial<Component>) { updateScheme({ components: currentScheme.components.map((item, i) => i === index ? { ...item, ...patch } : item) }); }
  function addComponent() { updateScheme({ components: [...currentScheme.components, { key: `component_${Date.now()}`, name: `Assessment ${currentScheme.components.length + 1}`, max_score: '', counts_for_ca: true, counts_for_total: true, display_order: currentScheme.components.length + 1 }] }); }
  function removeComponent(index: number) { if (currentScheme.components.length <= 1) return toast.error('Keep at least one assessment component.'); updateScheme({ components: currentScheme.components.filter((_, i) => i !== index).map((item, i) => ({ ...item, display_order: i + 1 })) }); }

  async function saveScheme() {
    if (!sessionId || !termId) return toast.error('Select an academic session and term.');
    if (!currentScheme.total_max || currentScheme.components.some(item => !item.name.trim() || Number(item.max_score) <= 0)) return toast.error('Every component needs a name and a positive maximum score.');
    if (!balanced) return toast.error(`Component maximums total ${componentTotal}, but the configured total is ${totalMax}. They must match.`);
    setSaving(true);
    try {
      const first = Number(currentScheme.components.find(item => item.key === 'first_test')?.max_score || 0);
      const second = Number(currentScheme.components.find(item => item.key === 'second_test')?.max_score || 0);
      const exam = Number(currentScheme.components.find(item => item.key === 'exam')?.max_score || 0);
      const payload = { academic_session_id: sessionId, term_id: termId, academic_group: group, first_test_max: first, second_test_max: second, exam_max: exam, total_max: totalMax, components: currentScheme.components, notes: currentScheme.notes, status: 'active', updated_by: user?.id || null, ...(currentScheme.id ? {} : { created_by: user?.id || null }) };
      const { error } = await supabase.from('result_assessment_configs').upsert(payload, { onConflict: 'academic_session_id,term_id,academic_group' });
      if (error) throw error;
      toast.success(`${ASSESSMENT_GROUPS.find(item => item.key === group)?.label} assessment scheme saved.`);
      await loadSchemes();
    } catch (error: any) {
      toast.error(error.message || 'Unable to save assessment scheme');
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></div>;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button onClick={() => navigate('/settings')} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700"><ArrowLeft className="h-4 w-4" /> Back to Settings</button>
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-600"><Settings2 className="h-4 w-4" /> Academic results</div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">Assessment Configuration</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Configure maximum marks independently for each academic level. Teachers inherit the scheme from the class they are assigned to.</p>
        </div>
        <div className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2 text-sm font-black"><CalendarDays className="h-5 w-5 text-indigo-600" /> Academic context</div>
          <div className="mt-2 text-xl font-black">{selectedSession?.session_name || '—'}</div>
          <div className="text-sm text-slate-500">{selectedTerm?.term || selectedSession?.term_name || '—'}</div>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <label className="rounded-2xl border bg-white p-4 text-sm font-black shadow-sm dark:border-slate-700 dark:bg-slate-800">Academic Session
          <select value={sessionId} onChange={e => { setSessionId(e.target.value); setTermId(''); }} className="mt-2 w-full rounded-xl border px-3 py-3 font-medium dark:border-slate-600 dark:bg-slate-900">
            {sessions.map(item => <option key={item.id} value={item.id}>{item.session_name} — {item.term_name}{item.is_current ? ' — Current' : ''}</option>)}
          </select>
        </label>
        <label className="rounded-2xl border bg-white p-4 text-sm font-black shadow-sm dark:border-slate-700 dark:bg-slate-800">Term
          <select value={termId} onChange={e => setTermId(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 font-medium dark:border-slate-600 dark:bg-slate-900">
            <option value="">Select term</option>
            {terms.map(item => <option key={item.id} value={item.id}>{item.term}{item.is_closed ? ' — Closed' : item.is_active ? ' — Active' : ''}</option>)}
          </select>
        </label>
      </section>

      <section className="grid gap-2 rounded-3xl border bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {ASSESSMENT_GROUPS.map(item => {
          const active = item.key === group;
          const count = classes.filter(cls => resolveAssessmentGroup(cls) === item.key).length;
          return <button key={item.key} onClick={() => setGroup(item.key)} className={`rounded-2xl px-3 py-3 text-left transition ${active ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-slate-700/60'}`}>
            <div className="font-black">{item.label}</div><div className={`mt-1 text-xs ${active ? 'text-indigo-100' : 'text-slate-500'}`}>{count} class{count === 1 ? '':'es'}</div>
          </button>;
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-black">{ASSESSMENT_GROUPS.find(item => item.key === group)?.label} scheme</h2><p className="text-sm text-slate-500">Set the exact maximum score for every component.</p></div>
            <button onClick={addComponent} className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"><Plus className="h-4 w-4" /> Add component</button>
          </div>

          <div className="mt-6 space-y-3">
            {currentScheme.components.map((item, index) => <div key={item.key} className="grid gap-3 rounded-2xl border p-4 dark:border-slate-700 md:grid-cols-[1fr_150px_140px_40px] md:items-end">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">Component<input value={item.name} onChange={e => updateComponent(index, { name: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-bold dark:border-slate-600 dark:bg-slate-900" /></label>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">Maximum<input type="number" min="0" step="0.01" value={item.max_score} onChange={e => updateComponent(index, { max_score: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-bold dark:border-slate-600 dark:bg-slate-900" /></label>
              <div className="space-y-2 text-xs font-bold"><label className="flex items-center gap-2"><input type="checkbox" checked={item.counts_for_ca} onChange={e => updateComponent(index, { counts_for_ca: e.target.checked })} /> Counts for CA</label><label className="flex items-center gap-2"><input type="checkbox" checked={item.counts_for_total} onChange={e => updateComponent(index, { counts_for_total: e.target.checked })} /> Counts for total</label></div>
              <button onClick={() => removeComponent(index)} className="rounded-xl p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button>
            </div>)}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><div className="text-xs font-black uppercase text-slate-500">Components total</div><div className="mt-1 text-2xl font-black">{componentTotal}</div></div>
            <label className="rounded-2xl border p-4 dark:border-slate-700"><div className="text-xs font-black uppercase text-slate-500">Total maximum</div><input type="number" min="1" value={currentScheme.total_max} onChange={e => updateScheme({ total_max: e.target.value })} className="mt-1 w-full bg-transparent text-2xl font-black outline-none" /></label>
            <div className={`rounded-2xl p-4 ${balanced ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'}`}><div className="flex items-center gap-2 text-xs font-black uppercase">{balanced && <CheckCircle2 className="h-4 w-4" />} {balanced ? 'Balanced' : 'Needs adjustment'}</div><div className="mt-1 text-sm font-bold">Maximums must equal the total.</div></div>
          </div>

          <label className="mt-5 block text-sm font-black">Notes<textarea value={currentScheme.notes} onChange={e => updateScheme({ notes: e.target.value })} rows={3} placeholder="Optional notes for administrators and teachers" className="mt-2 w-full rounded-xl border px-3 py-3 font-medium dark:border-slate-600 dark:bg-slate-900" /></label>

          <button onClick={() => void saveScheme()} disabled={saving || !balanced} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save assessment scheme'}</button>
        </div>

        <aside className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="font-black">Classes using this level</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">These are the active classes detected from the database. The assessment scheme applies to these classes automatically.</p>
          <div className="mt-4 space-y-2">
            {groupClasses.length ? groupClasses.map(cls => <div key={cls.id} className="rounded-xl border px-3 py-3 text-sm font-bold dark:border-slate-700"><div>{cls.name}</div><div className="mt-1 text-xs font-medium text-slate-500">{cls.level || '—'} · {cls.department || '—'}</div></div>) : <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900">No active classes detected for this group.</div>}
          </div>
        </aside>
      </section>
    </div>
  );
}
