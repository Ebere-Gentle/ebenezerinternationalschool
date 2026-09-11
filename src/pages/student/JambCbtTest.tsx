import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock3, Flag, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { jambCbtService } from '../../services/jamb/jambCbt.service';
import type { JambQuestion, JambSubject } from '../../services/jamb/jambCbt.service';

const TEST_MINUTES = 45;

const JambCbtTest: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<JambSubject | null>(null);
  const [questions, setQuestions] = useState<JambQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TEST_MINUTES * 60);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!subjectId) return;
      try {
        const subjects = await jambCbtService.getSubjects();
        const found = subjects.find(s => s.id === subjectId) || null;
        setSubject(found);
        if (!found) throw new Error('Subject not found.');
        const student = await jambCbtService.getStudent();
        const registration = await jambCbtService.getRegistration(student.id);
        if (!registration) throw new Error('Complete your JAMB subject registration first.');
        const registered = (registration.jamb_registration_subjects || []).some(s => s.subject_id === subjectId);
        if (!registered) throw new Error('This subject is not part of your JAMB registration.');
        const attempt = await jambCbtService.startAttempt(registration.id, subjectId);
        const qs = await jambCbtService.getQuestions(subjectId, 40);
        if (!qs.length) {
          await supabaseCleanup(attempt.id);
          throw new Error('No questions are available for this subject yet. An administrator needs to load the question bank.');
        }
        await jambCbtService.setAttemptQuestionCount(attempt.id, qs.length);
        setAttemptId(attempt.id);
        setQuestions(qs);
        setStartedAt(Date.now());
      } catch (error: any) {
        toast.error(error?.message || 'Unable to start CBT.');
        navigate('/student/jamb-cbt');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [subjectId, navigate]);

  const answeredCount = Object.keys(answers).length;
  const currentQuestion = questions[current];

  const submit = async () => {
    if (!attemptId || submitting) return;
    try {
      setSubmitting(true);
      const duration = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const data = await jambCbtService.submitAttempt(attemptId, answers, duration);
      setResult(data);
    } catch (error: any) {
      toast.error(error?.message || 'Unable to submit CBT.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (loading || result || !questions.length) return;
    if (secondsLeft <= 0) {
      submit();
      return;
    }
    const timer = window.setInterval(() => setSecondsLeft(s => s - 1), 1000);
    return () => window.clearInterval(timer);
  }, [loading, result, questions.length, secondsLeft]);

  const timeLabel = useMemo(() => `${String(Math.floor(secondsLeft / 60)).padStart(2,'0')}:${String(secondsLeft % 60).padStart(2,'0')}`, [secondsLeft]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  if (result) return <div className="max-w-2xl mx-auto py-10"><div className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 shadow-xl p-8 text-center"><CheckCircle2 className="w-16 h-16 mx-auto text-green-500" /><p className="text-sm font-semibold text-gray-500 mt-5">{subject?.name} • CBT Completed</p><h1 className="text-6xl font-black text-indigo-700 mt-2">{Number(result.score).toFixed(1)}%</h1><div className="grid grid-cols-3 gap-3 mt-8"><div className="rounded-2xl bg-green-50 p-4"><b className="text-xl text-green-700">{result.correct}</b><p className="text-xs text-green-700">Correct</p></div><div className="rounded-2xl bg-red-50 p-4"><b className="text-xl text-red-700">{result.wrong}</b><p className="text-xs text-red-700">Wrong</p></div><div className="rounded-2xl bg-gray-50 p-4"><b className="text-xl text-gray-700">{result.unanswered}</b><p className="text-xs text-gray-700">Unanswered</p></div></div><p className="text-sm text-gray-500 mt-6">Your progress has been saved. Your parent and school staff can see your performance according to their myEIS permissions.</p><button onClick={() => navigate('/student/jamb-cbt')} className="mt-7 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold">Back to JAMB Dashboard</button></div></div>;

  if (!currentQuestion) return <div className="p-8 text-center"><AlertTriangle className="mx-auto text-amber-500" /><p className="mt-3">No CBT questions available.</p></div>;

  return (
    <div className="space-y-5 pb-10">
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b dark:border-gray-700 py-3">
        <div className="flex items-center justify-between gap-3"><button onClick={() => navigate('/student/jamb-cbt')} className="flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="w-4 h-4" /> Exit</button><div className="text-center"><p className="font-black text-gray-900 dark:text-white">{subject?.name}</p><p className="text-xs text-gray-500">Question {current + 1} of {questions.length}</p></div><div className={`flex items-center gap-2 font-black ${secondsLeft <= 300 ? 'text-red-600' : 'text-indigo-600'}`}><Clock3 className="w-5 h-5" />{timeLabel}</div></div>
      </div>

      <div className="max-w-5xl mx-auto grid lg:grid-cols-[1fr_250px] gap-5">
        <section className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 shadow-sm p-6 md:p-8">
          <div className="flex items-start justify-between gap-4"><span className="text-xs font-bold uppercase tracking-wider text-indigo-600">JAMB CBT Practice</span><button onClick={() => setFlagged(prev => { const next = new Set(prev); next.has(currentQuestion.id) ? next.delete(currentQuestion.id) : next.add(currentQuestion.id); return next; })} className={`flex items-center gap-1 text-xs font-bold ${flagged.has(currentQuestion.id) ? 'text-amber-600' : 'text-gray-400'}`}><Flag className="w-4 h-4" /> Flag</button></div>
          <h2 className="text-xl md:text-2xl font-bold leading-relaxed text-gray-900 dark:text-white mt-6">{currentQuestion.question_text}</h2>
          <div className="space-y-3 mt-7">
            {(['A','B','C','D'] as const).map(letter => { const text = currentQuestion[`option_${letter.toLowerCase()}` as 'option_a'|'option_b'|'option_c'|'option_d']; const active = answers[currentQuestion.id] === letter; return <button key={letter} onClick={() => setAnswers(prev => ({...prev,[currentQuestion.id]:letter}))} className={`w-full text-left flex gap-4 items-start p-4 rounded-2xl border-2 transition ${active ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'}`}><span className={`w-9 h-9 rounded-full flex items-center justify-center font-black shrink-0 ${active ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200'}`}>{letter}</span><span className="pt-1 text-gray-800 dark:text-gray-100">{text}</span></button>; })}
          </div>
          <div className="flex items-center justify-between gap-3 mt-8"><button disabled={current === 0} onClick={() => setCurrent(c => c - 1)} className="px-5 py-3 rounded-xl border disabled:opacity-30 flex items-center gap-2 font-bold"><ArrowLeft className="w-4 h-4" /> Previous</button>{current === questions.length - 1 ? <button onClick={submit} disabled={submitting} className="px-5 py-3 rounded-xl bg-green-600 text-white flex items-center gap-2 font-bold disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit CBT'} <Send className="w-4 h-4" /></button> : <button onClick={() => setCurrent(c => c + 1)} className="px-5 py-3 rounded-xl bg-indigo-600 text-white flex items-center gap-2 font-bold">Next <ArrowRight className="w-4 h-4" /></button>}</div>
        </section>

        <aside className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 p-5 h-fit lg:sticky lg:top-20"><div className="flex justify-between items-center"><h3 className="font-bold">Question Navigator</h3><span className="text-xs text-gray-500">{answeredCount}/{questions.length}</span></div><div className="grid grid-cols-5 gap-2 mt-4">{questions.map((q,i) => <button key={q.id} onClick={() => setCurrent(i)} className={`h-9 rounded-lg text-xs font-bold ${current === i ? 'ring-2 ring-indigo-500' : ''} ${answers[q.id] ? 'bg-indigo-600 text-white' : flagged.has(q.id) ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200'}`}>{i+1}</button>)}</div><div className="mt-5 text-xs text-gray-500 space-y-2"><p><span className="inline-block w-3 h-3 rounded bg-indigo-600 mr-2" />Answered</p><p><span className="inline-block w-3 h-3 rounded bg-amber-100 mr-2" />Flagged</p></div></aside>
      </div>
    </div>
  );
};

const supabaseCleanup = async (_attemptId: string) => {
  // Attempts remain auditable. The attempt is left in progress and can be ignored by analytics.
};

export default JambCbtTest;
