import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock3, Lock, Play, RefreshCw, Target, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { jambCbtService } from '../../services/jamb/jambCbt.service';
import type { JambAttempt, JambRegistration, JambSubject } from '../../services/jamb/jambCbt.service';

const JambCbt: React.FC = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [subjects, setSubjects] = useState<JambSubject[]>([]);
  const [registration, setRegistration] = useState<JambRegistration | null>(null);
  const [attempts, setAttempts] = useState<JambAttempt[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [s, allSubjects] = await Promise.all([jambCbtService.getStudent(), jambCbtService.getSubjects()]);
      setStudent(s);
      setSubjects(allSubjects);
      const reg = await jambCbtService.getRegistration(s.id);
      setRegistration(reg);
      if (reg) setAttempts(await jambCbtService.getAttempts(reg.id));
    } catch (error: any) {
      toast.error(error?.message || 'Unable to load JAMB CBT.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const registeredIds = useMemo(() => new Set((registration?.jamb_registration_subjects || []).map(s => s.subject_id)), [registration]);
  const average = attempts.length ? attempts.reduce((sum, a) => sum + Number(a.score || 0), 0) / attempts.length : 0;
  const best = attempts.length ? Math.max(...attempts.map(a => Number(a.score || 0))) : 0;

  const toggleSubject = (id: string) => {
    if (registration) return;
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  };

  const register = async () => {
    if (selected.length !== 4) return toast.error('Select exactly four subjects.');
    try {
      setRegistering(true);
      const reg = await jambCbtService.register(student.id, selected);
      setRegistration(reg);
      toast.success('JAMB CBT registration completed and locked.');
    } catch (error: any) {
      toast.error(error?.message || 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><RefreshCw className="animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 p-6 md:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wider">myEIS • JAMB Preparation</p>
            <h1 className="text-2xl md:text-3xl font-black mt-1">JAMB CBT Preparation</h1>
            <p className="text-indigo-100 mt-2 max-w-2xl">Register once, practise past-question sets, take timed CBTs and track your improvement throughout the session.</p>
          </div>
          <BookOpen className="w-16 h-16 text-white/20" />
        </div>
      </div>

      {!registration ? (
        <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 md:p-7">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">JAMB Subject Registration</h2><p className="text-sm text-gray-500 mt-1">English Language and Mathematics are compulsory. Select two additional subjects.</p></div>
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold">{selected.length}/4</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map(subject => {
              const active = selected.includes(subject.id);
              return <button key={subject.id} onClick={() => toggleSubject(subject.id)} className={`text-left rounded-2xl border-2 p-4 transition ${active ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'}`}>
                <div className="flex items-center justify-between"><div><div className="font-bold text-gray-900 dark:text-white">{subject.name}</div><div className="text-xs text-gray-500 mt-1">{subject.code || 'JAMB Subject'}</div></div>{active && <CheckCircle2 className="text-indigo-600" />}</div>
                {subject.is_compulsory && <span className="inline-block mt-3 text-[11px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Compulsory</span>}
              </button>;
            })}
          </div>
          <button disabled={registering || selected.length !== 4} onClick={register} className="mt-6 w-full md:w-auto px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-40">{registering ? 'Registering…' : 'Confirm & Lock Registration'}</button>
        </section>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ['Average Score', `${average.toFixed(1)}%`, Target],
              ['Best Score', `${best.toFixed(1)}%`, Trophy],
              ['Tests Completed', String(attempts.length), CheckCircle2],
              ['Registration', 'Locked', Lock],
            ].map(([label, value, Icon]: any) => <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5"><Icon className="w-5 h-5 text-indigo-600 mb-3" /><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{value}</p></div>)}
          </div>

          <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5 md:p-7">
            <div className="flex items-center justify-between mb-5"><div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Four Subjects</h2><p className="text-sm text-gray-500">Registration is locked for this academic session.</p></div><Lock className="text-gray-400" /></div>
            <div className="grid md:grid-cols-4 gap-3">
              {(registration.jamb_registration_subjects || []).map(item => <div key={item.subject_id} className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 p-4"><p className="font-bold text-gray-900 dark:text-white">{item.subject.name}</p><p className="text-xs text-gray-500 mt-1">{item.is_compulsory ? 'Compulsory' : 'Selected subject'}</p><button onClick={() => navigate(`/student/jamb-cbt/test/${item.subject_id}`)} className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white py-2.5 font-bold"><Play className="w-4 h-4" /> Practise</button></div>)}
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b dark:border-gray-700"><h2 className="font-bold text-lg text-gray-900 dark:text-white">Performance History</h2></div>
            {attempts.length === 0 ? <div className="p-8 text-center text-gray-500">No CBT attempts yet. Choose a subject above to start.</div> : <div className="divide-y dark:divide-gray-700">{attempts.slice(0,20).map(a => <div key={a.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><p className="font-bold text-gray-900 dark:text-white">{a.subject?.name}</p><p className="text-xs text-gray-500 mt-1"><Clock3 className="inline w-3 h-3 mr-1" />{new Date(a.submitted_at || a.started_at).toLocaleString()} • {a.correct_count}/{a.question_count} correct</p></div><div className="text-left md:text-right"><p className={`text-2xl font-black ${Number(a.score) >= 70 ? 'text-green-600' : Number(a.score) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{Number(a.score).toFixed(1)}%</p><p className="text-xs text-gray-500">{Math.round(Number(a.duration_seconds || 0) / 60)} min</p></div></div>)}</div>}
          </section>
        </>
      )}
    </div>
  );
};

export default JambCbt;
