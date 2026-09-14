import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, ImagePlus, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { ASSESSMENT_GROUPS, type AssessmentGroup, resolveAssessmentGroup } from '../../utils/results/assessmentGroups';

type Group = Exclude<AssessmentGroup, 'custom'>;
type Session = { id: string; session_name: string; term_name: string; is_current: boolean; branch_id: string };
type Term = { id: string; session: string; term: string; is_active: boolean; is_closed: boolean };
type ClassItem = { id: string; name: string; level: string | null; department: string | null; branch_id: string; status?: string | null };
type Component = { key: string; name: string; max_score: string; display_order: number };
type GradeBand = { grade: string; min: string; max: string; remark: string };

type Scheme = {
  academic_group: Group;
  total_max: string;
  components: Component[];
  grading_system: GradeBand[];
  remarks: string[];
  director_comment_templates: string[];
  next_term_begins: string;
  notes: string;
};

const defaultGrades: GradeBand[] = [
  { grade: 'A', min: '75', max: '100', remark: 'Excellent' },
  { grade: 'B', min: '65', max: '74.99', remark: 'Very Good' },
  { grade: 'C', min: '55', max: '64.99', remark: 'Good' },
  { grade: 'D', min: '45', max: '54.99', remark: 'Fair' },
  { grade: 'E', min: '40', max: '44.99', remark: 'Pass' },
  { grade: 'F', min: '0', max: '39.99', remark: 'Needs Improvement' },
];

const make = (key: string, name: string, order: number, max = ''): Component => ({ key, name, max_score: max, display_order: order });
const blank = (group: Group): Scheme => ({
  academic_group: group,
  total_max: '100',
  components: [make('first_test', 'Test 1', 1, '20'), make('second_test', 'Test 2', 2, '20'), make('ca', 'CA', 3, '20'), make('exam', 'Exam', 4, '40')],
  grading_system: defaultGrades.map(x => ({ ...x })),
  remarks: defaultGrades.map(x => x.remark),
  director_comment_templates: [],
  next_term_begins: '',
  notes: 'CA is teacher-assessed continuous assessment. The teacher decides what contributes to CA, such as classwork, note taking, assignments, participation, practical work or other approved classroom activities.'
});

const norm = (v: string) => v.toLowerCase().trim().replace('first', '1st').replace('second', '2nd').replace('third', '3rd');

export default function AssessmentSettingsAdmin() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [termId, setTermId] = useState('');
  const [group, setGroup] = useState<Group>('jss');
  const [scheme, setScheme] = useState<Scheme>(blank('jss'));
  const [comments, setComments] = useState<string[]>([]);
  const [stampUrl, setStampUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);

  const selectedSession = sessions.find(x => x.id === sessionId);
  const groupClasses = useMemo(() => classes.filter(c => resolveAssessmentGroup(c) === group), [classes, group]);
  const componentTotal = scheme.components.reduce((n, c) => n + (Number(c.max_score) || 0), 0);
  const total = Number(scheme.total_max) || 0;

  useEffect(() => { void load(); }, [user?.id]);
  useEffect(() => { if (sessionId) void loadTerms(); }, [sessionId]);
  useEffect(() => { if (sessionId && termId) void loadScheme(); }, [sessionId, termId, group]);

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: profile, error: profileError } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profileError) throw profileError;
      if (!['admin', 'director', 'super_admin'].includes(String(profile?.role || '').toLowerCase())) throw new Error('Only administrators and directors can configure assessment schemes.');
      const [{ data: s, error: se }, { data: c, error: ce }, { data: setting }, { data: school }] = await Promise.all([
        supabase.from('academic_sessions').select('id,session_name,term_name,is_current,branch_id').order('start_date', { ascending: false }),
        supabase.from('classes').select('id,name,level,department,branch_id,status').order('name'),
        supabase.from('system_settings').select('setting_value').eq('setting_key', 'result_director_comments').maybeSingle(),
        supabase.from('school_info').select('stamp_url').order('created_at', { ascending: true }).limit(1).maybeSingle(),
      ]);
      if (se) throw se;
      if (ce) throw ce;
      const ss = (s || []) as Session[];
      setSessions(ss);
      setClasses((c || []) as ClassItem[]);
      const seeded = Array.isArray(setting?.setting_value) ? setting.setting_value : [];
      setComments(seeded.map((x: any) => typeof x === 'string' ? x : String(x?.template || x?.comment || '')).filter(Boolean));
      setStampUrl(String(school?.stamp_url || ''));
      const current = ss.find(x => x.is_current) || ss[0];
      if (current) setSessionId(current.id);
    } catch (e: any) {
      toast.error(e.message || 'Unable to load assessment settings');
    } finally { setLoading(false); }
  }

  async function loadTerms() {
    if (!selectedSession) return;
    const { data, error } = await supabase.from('terms').select('id,session,term,is_active,is_closed').eq('branch_id', selectedSession.branch_id).eq('session', selectedSession.session_name).order('start_date', { ascending: false });
    if (error) return toast.error(error.message);
    const list = (data || []) as Term[];
    setTerms(list);
    const match = list.find(t => norm(t.term) === norm(selectedSession.term_name));
    setTermId(match?.id || list[0]?.id || '');
  }

  async function loadScheme() {
    const { data, error } = await supabase.from('result_assessment_configs').select('id,total_max,components,grading_system,remarks,director_comment_templates,next_term_begins,notes,first_test_max,second_test_max,exam_max').eq('academic_session_id', sessionId).eq('term_id', termId).eq('academic_group', group).maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) { setScheme(blank(group)); return; }
    const legacy = [make('first_test', 'Test 1', 1, String(data.first_test_max ?? '')), make('second_test', 'Test 2', 2, String(data.second_test_max ?? '')), make('ca', 'CA', 3, ''), make('exam', 'Exam', 4, String(data.exam_max ?? ''))];
    const comps = Array.isArray(data.components) && data.components.length
      ? data.components.map((c: any, i: number) => ({ key: String(c.key || `component_${i + 1}`), name: String(c.name || `Assessment ${i + 1}`), max_score: String(c.max_score ?? ''), display_order: Number(c.display_order || i + 1) }))
      : legacy;
    const grades = Array.isArray(data.grading_system) && data.grading_system.length ? data.grading_system : defaultGrades;
    setScheme({
      academic_group: group,
      total_max: String(data.total_max ?? comps.reduce((n: number, c: Component) => n + Number(c.max_score || 0), 0)),
      components: comps,
      grading_system: grades.map((x: any) => ({ grade: String(x.grade || ''), min: String(x.min ?? ''), max: String(x.max ?? ''), remark: String(x.remark || '') })),
      remarks: Array.isArray(data.remarks) ? data.remarks.map(String) : grades.map((x: any) => String(x.remark || '')),
      director_comment_templates: Array.isArray(data.director_comment_templates) && data.director_comment_templates.length ? data.director_comment_templates.map(String) : comments,
      next_term_begins: String(data.next_term_begins || ''),
      notes: String(data.notes || '')
    });
  }

  function updateComponent(index: number, patch: Partial<Component>) {
    setScheme(s => ({ ...s, components: s.components.map((c, i) => i === index ? { ...c, ...patch } : c) }));
  }

  function updateGrade(index: number, patch: Partial<GradeBand>) {
    setScheme(s => ({ ...s, grading_system: s.grading_system.map((g, i) => i === index ? { ...g, ...patch } : g) }));
  }

  async function uploadStamp(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file for the school stamp.');
    if (file.size > 3 * 1024 * 1024) return toast.error('School stamp must be 3 MB or smaller.');
    setUploadingStamp(true);
    try {
      const path = `results/school-stamp-${Date.now()}.${file.name.split('.').pop() || 'png'}`;
      const { error } = await supabase.storage.from('school-assets').upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('school-assets').getPublicUrl(path);
      const url = data.publicUrl;
      const { data: school, error: schoolError } = await supabase.from('school_info').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (schoolError) throw schoolError;
      if (!school?.id) throw new Error('School information record was not found.');
      const { error: updateError } = await supabase.from('school_info').update({ stamp_url: url, updated_at: new Date().toISOString() }).eq('id', school.id);
      if (updateError) throw updateError;
      setStampUrl(url);
      toast.success('School stamp uploaded.');
    } catch (e: any) { toast.error(e.message || 'Unable to upload school stamp.'); }
    finally { setUploadingStamp(false); event.target.value = ''; }
  }

  async function save() {
    if (!sessionId || !termId) return toast.error('Select an academic session and term.');
    if (!scheme.components.length || scheme.components.some(c => !c.name.trim() || Number(c.max_score) <= 0)) return toast.error('Every assessment component needs a name and a positive maximum score.');
    if (componentTotal !== total) return toast.error(`Component maximums total ${componentTotal}, but Total is ${total}.`);
    if (scheme.grading_system.some(g => !g.grade.trim() || Number(g.min) < 0 || Number(g.max) > 100 || Number(g.min) > Number(g.max))) return toast.error('Check the grading ranges. Each range must be between 0 and 100.');
    setSaving(true);
    try {
      const first = scheme.components.find(c => c.key === 'first_test');
      const second = scheme.components.find(c => c.key === 'second_test');
      const exam = scheme.components.find(c => c.key === 'exam');
      const payload = {
        academic_session_id: sessionId,
        term_id: termId,
        academic_group: group,
        total_max: total,
        components: scheme.components.map((c, i) => ({ ...c, display_order: i + 1 })),
        grading_system: scheme.grading_system,
        remarks: scheme.grading_system.map(g => g.remark).filter(Boolean),
        director_comment_templates: scheme.director_comment_templates.length ? scheme.director_comment_templates : comments,
        next_term_begins: scheme.next_term_begins || null,
        notes: scheme.notes,
        first_test_max: Number(first?.max_score || 0),
        second_test_max: Number(second?.max_score || 0),
        exam_max: Number(exam?.max_score || 0),
        status: 'active',
        updated_by: user?.id || null,
        created_by: user?.id || null
      };
      const { error } = await supabase.from('result_assessment_configs').upsert(payload, { onConflict: 'academic_session_id,term_id,academic_group' });
      if (error) throw error;
      toast.success('Assessment configuration saved successfully.');
      await loadScheme();
    } catch (e: any) { toast.error(e.message || 'Unable to save assessment configuration.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></div>;

  return <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6">
    <div>
      <div className="text-xs uppercase tracking-[.2em] text-indigo-600">Results settings</div>
      <h1 className="mt-2 text-3xl tracking-tight">Assessment Configuration</h1>
      <p className="mt-2 text-sm text-slate-500">Configure the assessment structure, grading, attendance presentation, comments and official result settings independently for each academic group.</p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <label className="rounded-2xl border bg-white p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800">Academic Session<select value={sessionId} onChange={e => { setSessionId(e.target.value); setTermId(''); }} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900">{sessions.map(s => <option key={s.id} value={s.id}>{s.session_name}{s.is_current ? ' — Current' : ''}</option>)}</select></label>
      <label className="rounded-2xl border bg-white p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800">Term<select value={termId} onChange={e => setTermId(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 dark:border-slate-600 dark:bg-slate-900"><option value="">Select term</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term}{t.is_closed ? ' — Closed' : t.is_active ? ' — Active' : ''}</option>)}</select></label>
    </div>

    <div className="grid gap-2 rounded-3xl border bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {ASSESSMENT_GROUPS.map(g => <button key={g.key} onClick={() => setGroup(g.key)} className={`rounded-2xl px-3 py-3 text-left ${group === g.key ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}><div>{g.label}</div><div className="mt-1 text-xs opacity-70">{classes.filter(c => resolveAssessmentGroup(c) === g.key).length} classes</div></button>)}
    </div>

    <section className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 className="text-xl">{ASSESSMENT_GROUPS.find(g => g.key === group)?.label} assessment scheme</h2><p className="mt-1 text-sm text-slate-500">Test 1, Test 2, CA and Exam are independent teacher-entered components. CA is not calculated from the tests.</p></div>
        <button onClick={() => setScheme(s => ({ ...s, components: [...s.components, make(`component_${Date.now()}`, `Assessment ${s.components.length + 1}`, s.components.length + 1)] }))} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"><Plus className="h-4 w-4" /> Add component</button>
      </div>
      <div className="mt-5 space-y-3">
        {scheme.components.map((c, i) => <div key={c.key} className="grid gap-3 rounded-2xl border p-4 dark:border-slate-700 md:grid-cols-[1fr_170px_auto]">
          <label className="text-xs uppercase text-slate-500">Component<input value={c.name} onChange={e => updateComponent(i, { name: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900" /></label>
          <label className="text-xs uppercase text-slate-500">Maximum score<input type="number" min="1" step="0.01" value={c.max_score} onChange={e => updateComponent(i, { max_score: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900" /></label>
          <button disabled={scheme.components.length <= 1} onClick={() => setScheme(s => ({ ...s, components: s.components.filter((_, j) => j !== i) }))} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border px-3 text-sm text-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /> Remove</button>
        </div>)}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-xs uppercase text-slate-500">Total maximum<input type="number" min="1" value={scheme.total_max} onChange={e => setScheme(s => ({ ...s, total_max: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-3 text-lg dark:border-slate-600 dark:bg-slate-900" /></label>
        <div className={`rounded-xl p-4 ${componentTotal === total && total > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}><div className="text-xs uppercase">Component total</div><div className="mt-1 text-2xl">{componentTotal} / {total || '—'}</div><p className="mt-1 text-xs">The configuration can only be saved when these values match.</p></div>
      </div>
      <label className="mt-4 block text-xs uppercase text-slate-500">CA guidance / notes<textarea value={scheme.notes} onChange={e => setScheme(s => ({ ...s, notes: e.target.value }))} rows={3} className="mt-1 w-full rounded-xl border px-3 py-3 text-sm dark:border-slate-600 dark:bg-slate-900" /></label>
    </section>

    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between"><div><h2 className="text-xl">Grading system</h2><p className="text-sm text-slate-500">Grades are calculated from the final percentage.</p></div><button onClick={() => setScheme(s => ({ ...s, grading_system: [...s.grading_system, { grade: '', min: '', max: '', remark: '' }] }))} className="rounded-xl border p-2"><Plus className="h-4 w-4" /></button></div>
        <div className="mt-4 space-y-2">{scheme.grading_system.map((g, i) => <div key={i} className="grid grid-cols-[70px_1fr_1fr_1.5fr_auto] gap-2"><input value={g.grade} placeholder="A" onChange={e => updateGrade(i, { grade: e.target.value })} className="rounded-lg border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" /><input type="number" min="0" max="100" value={g.min} placeholder="Min %" onChange={e => updateGrade(i, { min: e.target.value })} className="rounded-lg border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" /><input type="number" min="0" max="100" value={g.max} placeholder="Max %" onChange={e => updateGrade(i, { max: e.target.value })} className="rounded-lg border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" /><input value={g.remark} placeholder="Remark" onChange={e => updateGrade(i, { remark: e.target.value })} className="rounded-lg border px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" /><button onClick={() => setScheme(s => ({ ...s, grading_system: s.grading_system.filter((_, j) => j !== i) }))} className="rounded-lg border p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}</div>
      </section>

      <section className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-xl">Result details</h2>
        <p className="mt-1 text-sm text-slate-500">Attendance is pulled automatically from attendance sessions and records. The next resumption date is shown on the official result.</p>
        <label className="mt-4 block text-xs uppercase text-slate-500">Next term resumption date<div className="relative mt-1"><CalendarDays className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input type="date" value={scheme.next_term_begins} onChange={e => setScheme(s => ({ ...s, next_term_begins: e.target.value }))} className="w-full rounded-xl border py-3 pl-10 pr-3 dark:border-slate-600 dark:bg-slate-900" /></div></label>
        <div className="mt-4 rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"><div className="text-sm">Automatic attendance fields</div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4"><span>School days opened</span><span>Present</span><span>Absent</span><span>Attendance %</span></div></div>
        <div className="mt-4 rounded-2xl border p-4 dark:border-slate-700"><div className="flex items-center gap-3"><ImagePlus className="h-5 w-5 text-indigo-600" /><div><div>School stamp</div><p className="text-xs text-slate-500">PNG, JPG or WebP. Maximum 3 MB.</p></div></div><div className="mt-3 flex flex-wrap items-center gap-4"><label className="cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white">{uploadingStamp ? 'Uploading…' : 'Upload stamp'}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadStamp} disabled={uploadingStamp} /></label>{stampUrl && <img src={stampUrl} alt="School stamp" className="h-20 w-28 object-contain" />}</div></div>
      </section>
    </div>

    <section className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl">Director comment library</h2><p className="mt-1 text-sm text-slate-500">{comments.length} performance-aware comments are available. Use {'{student_name}'}, {'{weak_subjects}'}, {'{percentage}'} and {'{max_score}'} as placeholders.</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">{comments.length} templates</span></div>
      <textarea value={scheme.director_comment_templates.join('\n')} onChange={e => setScheme(s => ({ ...s, director_comment_templates: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) }))} rows={8} placeholder="One director comment per line" className="mt-4 w-full rounded-xl border px-3 py-3 text-sm leading-6 dark:border-slate-600 dark:bg-slate-900" />
    </section>

    <aside className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><h2 className="text-lg">Classes in this group</h2><p className="mt-1 text-xs text-slate-500">All classes are loaded for administrators and directors.</p><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{groupClasses.length ? groupClasses.map(c => <div key={c.id} className="rounded-xl border px-3 py-3 dark:border-slate-700"><div>{c.name}</div><div className="text-xs text-slate-500">{c.level || c.department || '—'} · {c.status || 'configured'}</div></div>) : <div className="text-sm text-slate-500">No classes match this group.</div>}</div></aside>

    <div className="sticky bottom-3 z-10 flex items-center justify-between rounded-2xl border bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"><div className="flex items-center gap-3 text-sm"><span className={`flex h-8 w-8 items-center justify-center rounded-full ${componentTotal === total && total > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{componentTotal === total && total > 0 ? <Check className="h-4 w-4" /> : '!'}</span><span>{componentTotal === total && total > 0 ? 'Configuration is ready to save.' : 'Component maximums must equal Total Maximum.'}</span></div><button onClick={() => void save()} disabled={saving || componentTotal !== total || total <= 0} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save Configuration'}</button></div>
  </div>;
}
