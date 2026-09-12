import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flag,
  Loader2,
  Send,
  Sparkles,
  ChevronDown,
  LayoutGrid,
  Eye,
  ShieldCheck,
  Timer,
  Hash,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jambCbtService } from '../../services/jamb/jambCbt.service';
import type { JambQuestion, JambSubject } from '../../services/jamb/jambCbt.service';

const TEST_MINUTES = 45;
const QUESTION_BATCH = 40;

const JambCbtTest: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<JambSubject | null>(null);
  const [questions, setQuestions] = useState<JambQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
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
        const found = subjects.find((s) => s.id === subjectId) || null;
        setSubject(found);
        if (!found) throw new Error('Subject not found.');

        const student = await jambCbtService.getStudent();
        const registration = await jambCbtService.getRegistration(student.id);
        if (!registration) {
          throw new Error('Complete your JAMB subject registration first.');
        }

        const registered = (registration.jamb_registration_subjects || []).some(
          (s) => s.subject_id === subjectId,
        );
        if (!registered) {
          throw new Error('This subject is not part of your JAMB registration.');
        }

        // ---- 48-hour cooldown gate ----
        const cooldown = await jambCbtService.getCooldownInfo(registration.id, subjectId);
        if (!cooldown.canStart && cooldown.nextAvailableAt) {
          const hrs = Math.ceil(
            (cooldown.nextAvailableAt.getTime() - Date.now()) / 3_600_000,
          );
          toast.error(
            `You can retake this subject in about ${hrs} hour${hrs === 1 ? '' : 's'}.`,
          );
          navigate('/student/jamb-cbt');
          return;
        }

        // ---- Fetch unseen questions ----
        const totalAvailable = await jambCbtService.getTotalActiveQuestions(subjectId);
        if (!totalAvailable) {
          throw new Error(
            'No questions are available for this subject yet. An administrator needs to load the question bank.',
          );
        }

        const usedIds = await jambCbtService.getUsedQuestionIds(registration.id, subjectId);
        let pool = await jambCbtService.getUnseenQuestions(
          subjectId,
          usedIds,
          QUESTION_BATCH,
        );

        // Pool exhausted → reset and start fresh cycle
        if (pool.length === 0) {
          await jambCbtService.resetQuestionPool(registration.id, subjectId);
          pool = await jambCbtService.getUnseenQuestions(subjectId, [], QUESTION_BATCH);
          toast(
            'You have completed every available question for this subject. Starting a fresh cycle.',
            { icon: '🔄' },
          );
        }

        if (!pool.length) {
          throw new Error('No questions available for this subject.');
        }

        const servedIds = pool.map((q) => q.id);
        const attempt = await jambCbtService.startAttempt(
          registration.id,
          subjectId,
          servedIds,
        );
        await jambCbtService.setAttemptQuestionCount(attempt.id, pool.length);

        setAttemptId(attempt.id);
        setQuestions(pool);
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
    const timer = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearInterval(timer);
  }, [loading, result, questions.length, secondsLeft]);

  const timeLabel = useMemo(
    () =>
      `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(
        secondsLeft % 60,
      ).padStart(2, '0')}`,
    [secondsLeft],
  );

  const progressPct = questions.length ? (answeredCount / questions.length) * 100 : 0;
  const timePct = (secondsLeft / (TEST_MINUTES * 60)) * 100;
  const isLowTime = secondsLeft <= 300;
  const isCriticalTime = secondsLeft <= 60;

  if (loading)
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );

  if (result) {
    const score = Number(result.score);
    const tone =
      score >= 70
        ? { text: 'text-green-600', bg: 'from-emerald-500 to-green-600', label: 'Excellent' }
        : score >= 50
        ? { text: 'text-amber-600', bg: 'from-amber-500 to-orange-500', label: 'Good effort' }
        : { text: 'text-red-600', bg: 'from-red-500 to-rose-600', label: 'Keep practising' };

    return (
      <div className="max-w-3xl mx-auto py-8 space-y-5">
        <div className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 shadow-xl overflow-hidden">
          <div className={`relative bg-gradient-to-br ${tone.bg} p-8 text-white text-center`}>
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 text-white/90 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                CBT Completed
              </div>
              <p className="text-sm font-semibold mt-3">{subject?.name}</p>
              <p className="text-6xl md:text-7xl font-black mt-2 leading-none">
                {score.toFixed(1)}%
              </p>
              <p className="mt-3 text-white/90 font-bold">{tone.label}</p>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 p-4 text-center">
                <CheckCircle2 className="w-5 h-5 mx-auto text-green-600" />
                <b className="block text-2xl text-green-700 dark:text-green-400 mt-2">
                  {result.correct}
                </b>
                <p className="text-xs text-green-700 dark:text-green-500 font-bold">Correct</p>
              </div>
              <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 p-4 text-center">
                <XCircle className="w-5 h-5 mx-auto text-red-600" />
                <b className="block text-2xl text-red-700 dark:text-red-400 mt-2">
                  {result.wrong}
                </b>
                <p className="text-xs text-red-700 dark:text-red-500 font-bold">Wrong</p>
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 p-4 text-center">
                <HelpCircle className="w-5 h-5 mx-auto text-gray-500" />
                <b className="block text-2xl text-gray-700 dark:text-gray-300 mt-2">
                  {result.unanswered}
                </b>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">Unanswered</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border dark:border-gray-700 p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Your progress has been saved. Your next attempt for this subject unlocks in 48 hours.
              </p>
            </div>

            <button
              onClick={() => navigate('/student/jamb-cbt')}
              className="mt-7 w-full px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to JAMB Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion)
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="mx-auto text-amber-500" />
        <p className="mt-3">No CBT questions available.</p>
      </div>
    );

  return (
    <div className="space-y-5 pb-10">
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/student/jamb-cbt')}
            className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>

          <div className="text-center min-w-0">
            <p className="font-black text-gray-900 dark:text-white truncate">
              {subject?.name}
            </p>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">
              Question {current + 1} of {questions.length}
            </p>
          </div>

          <div
            className={`flex items-center gap-2 font-black px-3 py-2 rounded-xl border-2 transition ${
              isCriticalTime
                ? 'text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20 animate-pulse'
                : isLowTime
                ? 'text-red-600 border-red-200 bg-red-50/60 dark:bg-red-900/10'
                : 'text-indigo-600 border-indigo-100 bg-indigo-50/60 dark:bg-indigo-900/10'
            }`}
          >
            <Clock3 className="w-4 h-4" />
            <span className="tabular-nums">{timeLabel}</span>
          </div>
        </div>

        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-indigo-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className={`absolute inset-y-0 right-0 w-1 transition-all ${
              isLowTime ? 'bg-red-500' : 'bg-transparent'
            }`}
            style={{ left: `${timePct}%` }}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_300px] gap-5 px-4">
        <section className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-6 md:px-8 py-4 border-b dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full">
                <Sparkles className="w-3 h-3" />
                JAMB CBT Practice
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
                <Hash className="w-3 h-3" />
                Q{current + 1}
              </span>
            </div>

            <button
              onClick={() =>
                setFlagged((prev) => {
                  const next = new Set(prev);
                  next.has(currentQuestion.id)
                    ? next.delete(currentQuestion.id)
                    : next.add(currentQuestion.id);
                  return next;
                })
              }
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition ${
                flagged.has(currentQuestion.id)
                  ? 'text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-900/20'
                  : 'text-gray-500 border-transparent hover:border-gray-200 dark:hover:border-gray-600'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              {flagged.has(currentQuestion.id) ? 'Flagged' : 'Flag for review'}
            </button>
          </div>

          <div className="p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold leading-relaxed text-gray-900 dark:text-white">
              {currentQuestion.question_text}
            </h2>

            <div className="space-y-3 mt-7">
              {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                const text =
                  currentQuestion[
                    `option_${letter.toLowerCase()}` as
                      | 'option_a'
                      | 'option_b'
                      | 'option_c'
                      | 'option_d'
                  ];
                const active = answers[currentQuestion.id] === letter;
                return (
                  <button
                    key={letter}
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: letter }))
                    }
                    className={`w-full text-left flex gap-4 items-start p-4 rounded-2xl border-2 transition-all ${
                      active
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-gray-50 dark:hover:bg-gray-900/30'
                    }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-black shrink-0 transition ${
                        active
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="pt-1.5 text-gray-800 dark:text-gray-100 leading-relaxed">
                      {text}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t dark:border-gray-700">
              <button
                disabled={current === 0}
                onClick={() => setCurrent((c) => c - 1)}
                className="px-5 py-3 rounded-xl border dark:border-gray-700 disabled:opacity-30 flex items-center gap-2 font-bold hover:bg-gray-50 dark:hover:bg-gray-900/30 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>

              {current === questions.length - 1 ? (
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 font-bold disabled:opacity-50 transition shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      Submit CBT
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setCurrent((c) => c + 1)}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 font-bold transition shadow-sm"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 h-fit">
          <div className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Timer className="w-4 h-4 text-indigo-600" />
                Progress
              </h3>
              <span className="text-xs font-black text-indigo-600 tabular-nums">
                {answeredCount}/{questions.length}
              </span>
            </div>

            <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  Answered
                </p>
                <p className="text-lg font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
                  {answeredCount}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Flagged
                </p>
                <p className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">
                  {flagged.size}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Clock3 className="w-3 h-3" />
                Time left
              </span>
              <span
                className={`text-sm font-black tabular-nums ${
                  isLowTime ? 'text-red-600' : 'text-gray-900 dark:text-white'
                }`}
              >
                {timeLabel}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-indigo-600" />
                Navigator
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {questions.length} Qs
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 max-h-[280px] overflow-y-auto pr-1">
              {questions.map((q, i) => {
                const isCurrent = current === i;
                const isAnswered = !!answers[q.id];
                const isFlagged = flagged.has(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrent(i)}
                    className={`relative h-9 rounded-lg text-xs font-black transition-all ${
                      isCurrent
                        ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-gray-800'
                        : ''
                    } ${
                      isAnswered
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : isFlagged
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {i + 1}
                    {isFlagged && !isAnswered && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <span className="inline-block w-3 h-3 rounded bg-indigo-600" />
                <span className="font-bold">Answered</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <span className="inline-block w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/40" />
                <span className="font-bold">Flagged for review</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <span className="inline-block w-3 h-3 rounded bg-gray-100 dark:bg-gray-700" />
                <span className="font-bold">Unanswered</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 p-5">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-black text-sm">
              <Eye className="w-4 h-4" />
              Exam tips
            </div>
            <ul className="mt-3 space-y-2 text-xs text-indigo-900/80 dark:text-indigo-100/80">
              <li className="flex gap-2">
                <ChevronDown className="w-3 h-3 mt-0.5 flex-shrink-0 -rotate-90" />
                Answer every question — there is no negative marking.
              </li>
              <li className="flex gap-2">
                <ChevronDown className="w-3 h-3 mt-0.5 flex-shrink-0 -rotate-90" />
                Flag tricky questions and return to them later.
              </li>
              <li className="flex gap-2">
                <ChevronDown className="w-3 h-3 mt-0.5 flex-shrink-0 -rotate-90" />
                Each subject can only be retaken every 48 hours.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default JambCbtTest;