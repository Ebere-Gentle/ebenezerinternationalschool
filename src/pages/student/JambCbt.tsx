import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Lock,
  Play,
  RefreshCw,
  Target,
  Trophy,
  Sparkles,
  GraduationCap,
  TrendingUp,
  Award,
  Flame,
  BarChart3,
  ChevronRight,
  ShieldCheck,
  Zap,
  Calendar,
  Hash,
  Activity,
  AlertTriangle,
  Lightbulb,
  Brain,
  LineChart,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jambCbtService } from '../../services/jamb/jambCbt.service';
import type { JambAttempt, JambRegistration, JambSubject } from '../../services/jamb/jambCbt.service';

const Sparkline: React.FC<{ values: number[]; color?: string; height?: number }> = ({
  values,
  color = '#4f46e5',
  height = 48,
}) => {
  if (!values.length) {
    return (
      <div className="h-12 flex items-center justify-center text-xs text-gray-400">
        No data
      </div>
    );
  }

  const w = 240;
  const h = height;
  const pad = 4;
  const max = Math.max(100, ...values);
  const min = 0;
  const stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');

  const area =
    `M ${pad} ${h - pad} ` +
    points.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') +
    ` L ${(pad + (values.length - 1) * stepX).toFixed(1)} ${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
      ))}
    </svg>
  );
};

const BarMeter: React.FC<{ value: number; tone?: 'good' | 'warn' | 'bad' }> = ({
  value,
  tone = 'good',
}) => {
  const color =
    tone === 'good' ? 'bg-emerald-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-500`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
};

type CooldownEntry = {
  canStart: boolean;
  nextAvailableAt: Date | null;
  remainingMs: number;
};

const JambCbt: React.FC = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [subjects, setSubjects] = useState<JambSubject[]>([]);
  const [registration, setRegistration] = useState<JambRegistration | null>(null);
  const [attempts, setAttempts] = useState<JambAttempt[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [cooldowns, setCooldowns] = useState<Record<string, CooldownEntry>>({});

  const load = async () => {
    try {
      setLoading(true);
      const [s, allSubjects] = await Promise.all([
        jambCbtService.getStudent(),
        jambCbtService.getSubjects(),
      ]);
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

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!registration) return;
    let cancelled = false;

    const loadCooldowns = async () => {
      const entries = await Promise.all(
        (registration.jamb_registration_subjects || []).map(async (s) => {
          try {
            const info = await jambCbtService.getCooldownInfo(registration.id, s.subject_id);
            const remainingMs = info.nextAvailableAt
              ? Math.max(0, info.nextAvailableAt.getTime() - Date.now())
              : 0;
            return [
              s.subject_id,
              {
                canStart: info.canStart,
                nextAvailableAt: info.nextAvailableAt,
                remainingMs,
              },
            ] as const;
          } catch {
            return [
              s.subject_id,
              { canStart: true, nextAvailableAt: null, remainingMs: 0 },
            ] as const;
          }
        }),
      );
      if (!cancelled) setCooldowns(Object.fromEntries(entries));
    };

    loadCooldowns();
    const ticker = window.setInterval(loadCooldowns, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(ticker);
    };
  }, [registration]);

  const registeredIds = useMemo(
    () => new Set((registration?.jamb_registration_subjects || []).map((s) => s.subject_id)),
    [registration],
  );
  const average = attempts.length
    ? attempts.reduce((sum, a) => sum + Number(a.score || 0), 0) / attempts.length
    : 0;
  const best = attempts.length ? Math.max(...attempts.map((a) => Number(a.score || 0))) : 0;

  const toggleSubject = (id: string) => {
    if (registration) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev,
    );
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

  const passRate = attempts.length
    ? (attempts.filter((a) => Number(a.score) >= 50).length / attempts.length) * 100
    : 0;

  const totalMinutes = attempts.reduce(
    (sum, a) => sum + Number(a.duration_seconds || 0) / 60,
    0,
  );

  const streak = attempts.length
    ? attempts.slice(0, 5).filter((a) => Number(a.score) >= 50).length
    : 0;

  const subjectStats = useMemo(() => {
    if (!registration?.jamb_registration_subjects) return [];
    return registration.jamb_registration_subjects.map((item) => {
      const subjAttempts = attempts.filter((a) => a.subject?.id === item.subject_id);
      const avg = subjAttempts.length
        ? subjAttempts.reduce((sum, a) => sum + Number(a.score || 0), 0) / subjAttempts.length
        : 0;
      const bestScore = subjAttempts.length
        ? Math.max(...subjAttempts.map((a) => Number(a.score || 0)))
        : 0;
      return {
        ...item,
        attempts: subjAttempts.length,
        avg,
        best: bestScore,
      };
    });
  }, [registration, attempts]);

  const chronological = useMemo(
    () =>
      [...attempts].sort(
        (a, b) =>
          new Date(a.submitted_at || a.started_at).getTime() -
          new Date(b.submitted_at || b.started_at).getTime(),
      ),
    [attempts],
  );

  const scoreTrend = useMemo(
    () => chronological.map((a) => Number(a.score || 0)),
    [chronological],
  );

  const trendDelta = useMemo(() => {
    if (chronological.length < 2) return 0;
    const mid = Math.max(1, Math.floor(chronological.length / 2));
    const older = chronological.slice(0, mid);
    const newer = chronological.slice(mid);
    const olderAvg = older.reduce((s, a) => s + Number(a.score || 0), 0) / older.length;
    const newerAvg = newer.reduce((s, a) => s + Number(a.score || 0), 0) / newer.length;
    return newerAvg - olderAvg;
  }, [chronological]);

  const topicStats = useMemo(() => {
    type Bucket = { topic: string; subject: string; correct: number; total: number };
    const map = new Map<string, Bucket>();

    chronological.forEach((a: any) => {
      const breakdown = a.topic_breakdown || a.topics || a.topic_stats;
      if (Array.isArray(breakdown)) {
        breakdown.forEach((t: any) => {
          const topic = String(t.topic || t.name || 'Untagged').trim();
          const subject = String(a.subject?.name || 'Subject');
          const key = `${subject}::${topic}`;
          const bucket = map.get(key) || { topic, subject, correct: 0, total: 0 };
          bucket.correct += Number(t.correct ?? t.correct_count ?? 0);
          bucket.total += Number(t.total ?? t.question_count ?? t.count ?? 0);
          map.set(key, bucket);
        });
      } else if (Array.isArray(a.answers)) {
        a.answers.forEach((ans: any) => {
          const topic = String(ans.topic || ans.question?.topic || 'Untagged').trim();
          const subject = String(a.subject?.name || 'Subject');
          const key = `${subject}::${topic}`;
          const bucket = map.get(key) || { topic, subject, correct: 0, total: 0 };
          bucket.total += 1;
          if (ans.is_correct || ans.correct) bucket.correct += 1;
          map.set(key, bucket);
        });
      }
    });

    return Array.from(map.values())
      .map((b) => ({
        ...b,
        accuracy: b.total ? (b.correct / b.total) * 100 : 0,
      }))
      .filter((b) => b.total > 0);
  }, [chronological]);

  const weakTopics = useMemo(
    () =>
      [...topicStats]
        .filter((t) => t.total >= 2)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 5),
    [topicStats],
  );

  const strongTopics = useMemo(
    () =>
      [...topicStats]
        .filter((t) => t.total >= 2)
        .sort((a, b) => b.accuracy - a.accuracy)
        .slice(0, 3),
    [topicStats],
  );

  const weakestSubject = useMemo(() => {
    const withAttempts = subjectStats.filter((s) => s.attempts > 0);
    if (!withAttempts.length) return null;
    return [...withAttempts].sort((a, b) => a.avg - b.avg)[0];
  }, [subjectStats]);

  const recommendations = useMemo(() => {
    const recs: { tone: 'warn' | 'good' | 'info'; text: string }[] = [];

    if (weakTopics.length) {
      recs.push({
        tone: 'warn',
        text: `Focus on "${weakTopics[0].topic}" in ${weakTopics[0].subject} — accuracy is only ${weakTopics[0].accuracy.toFixed(0)}%.`,
      });
    }
    if (weakestSubject) {
      recs.push({
        tone: 'warn',
        text: `Your lowest-performing subject is ${weakestSubject.subject.name} at ${weakestSubject.avg.toFixed(0)}%. Schedule 2 extra practice sessions this week.`,
      });
    }
    if (trendDelta > 3) {
      recs.push({
        tone: 'good',
        text: `You're trending up +${trendDelta.toFixed(1)}% across recent attempts. Keep the momentum going.`,
      });
    } else if (trendDelta < -3) {
      recs.push({
        tone: 'warn',
        text: `Your recent scores dipped ${trendDelta.toFixed(1)}%. Review mistakes before the next attempt.`,
      });
    }
    if (attempts.length > 0 && attempts.length < 5) {
      recs.push({
        tone: 'info',
        text: 'Complete at least 5 attempts to unlock stable analytics for each subject.',
      });
    }
    if (!weakTopics.length && attempts.length > 0) {
      recs.push({
        tone: 'info',
        text: 'Topic-level insights will appear once your attempts include per-topic breakdowns.',
      });
    }

    return recs.slice(0, 4);
  }, [weakTopics, weakestSubject, trendDelta, attempts.length]);

  const subjectBars = useMemo(
    () =>
      subjectStats.map((s) => ({
        id: s.subject_id,
        name: s.subject.name,
        avg: s.avg,
        attempts: s.attempts,
      })),
    [subjectStats],
  );

  const PractiseButton: React.FC<{
    subjectId: string;
    variant?: 'primary' | 'amber';
  }> = ({ subjectId, variant = 'primary' }) => {
    const cd = cooldowns[subjectId];
    const locked = cd && !cd.canStart && cd.remainingMs > 0;

    if (locked) {
      const hrs = Math.floor(cd.remainingMs / 3_600_000);
      const mins = Math.floor((cd.remainingMs % 3_600_000) / 60_000);
      return (
        <div className="mt-4 w-full">
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 py-2.5 font-bold cursor-not-allowed"
          >
            <Clock3 className="w-4 h-4" />
            Available in {hrs}h {mins}m
          </button>
          <p className="text-[10px] text-gray-500 text-center mt-1.5">
            Next: {cd.nextAvailableAt?.toLocaleString()}
          </p>
        </div>
      );
    }

    const styles =
      variant === 'amber'
        ? 'bg-amber-600 hover:bg-amber-700 text-white'
        : 'bg-indigo-600 hover:bg-indigo-700 text-white';

    return (
      <button
        onClick={() => navigate(`/student/jamb-cbt/test/${subjectId}`)}
        className={`mt-4 w-full flex items-center justify-center gap-2 rounded-xl ${styles} py-2.5 font-bold transition`}
      >
        <Play className="w-4 h-4" />
        Practise
      </button>
    );
  };

  if (loading)
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <RefreshCw className="animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6 pb-10">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-72 h-72 rounded-full bg-violet-400/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              myEIS • JAMB Preparation
            </div>
            <h1 className="text-2xl md:text-3xl font-black mt-2">
              JAMB CBT Preparation
            </h1>
            <p className="text-indigo-100 mt-2 max-w-2xl text-sm md:text-base">
              Register once, practise past-question sets, take timed CBTs and track your improvement throughout the session.
            </p>

            {registration && (
              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Registration locked
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15">
                  <Flame className="w-3.5 h-3.5" />
                  {streak} of last 5 passed
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15">
                  <Activity className="w-3.5 h-3.5" />
                  {passRate.toFixed(0)}% pass rate
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15">
                  {trendDelta > 1 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-300" />
                  ) : trendDelta < -1 ? (
                    <ArrowDownRight className="w-3.5 h-3.5 text-red-300" />
                  ) : (
                    <Minus className="w-3.5 h-3.5" />
                  )}
                  {trendDelta >= 0 ? '+' : ''}
                  {trendDelta.toFixed(1)}% trend
                </span>
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center justify-center w-24 h-24 rounded-3xl bg-white/10 backdrop-blur border border-white/15">
            <GraduationCap className="w-12 h-12 text-white/70" />
          </div>
        </div>
      </div>

      {!registration ? (
        <div className="grid lg:grid-cols-[1fr_340px] gap-5">
          <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 md:p-7">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  JAMB Subject Registration
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  English Language and Mathematics are compulsory. Select two additional subjects.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold">
                {selected.length}/4
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {subjects.map((subject) => {
                const active = selected.includes(subject.id);
                const locked = subject.is_compulsory;
                return (
                  <button
                    key={subject.id}
                    onClick={() => toggleSubject(subject.id)}
                    className={`group text-left rounded-2xl border-2 p-4 transition-all ${
                      active
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 dark:text-white truncate">
                          {subject.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {subject.code || 'JAMB Subject'}
                        </div>
                      </div>
                      {active ? (
                        <CheckCircle2 className="text-indigo-600 flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 group-hover:border-indigo-400 flex-shrink-0" />
                      )}
                    </div>
                    {locked && (
                      <span className="inline-flex items-center gap-1 mt-3 text-[11px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                        <Lock className="w-3 h-3" />
                        Compulsory
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5">
              <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                Selection summary
              </h3>

              <div className="mt-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => {
                  const id = selected[i];
                  const subject = subjects.find((s) => s.id === id);
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border p-3 flex items-center gap-3 ${
                        subject
                          ? 'border-indigo-200 bg-indigo-50/60 dark:bg-indigo-900/10'
                          : 'border-dashed border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                          subject
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                        }`}
                      >
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-bold truncate ${
                            subject ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                          }`}
                        >
                          {subject?.name || 'Empty slot'}
                        </p>
                        {subject && (
                          <p className="text-[10px] text-gray-500">
                            {subject.is_compulsory ? 'Compulsory' : 'Elective'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                disabled={registering || selected.length !== 4}
                onClick={register}
                className="mt-5 w-full px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-40 hover:bg-indigo-700 transition inline-flex items-center justify-center gap-2"
              >
                {registering ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Registering…
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Confirm & Lock Registration
                  </>
                )}
              </button>

              <p className="text-[11px] text-gray-500 text-center mt-3 leading-relaxed">
                Once confirmed, your subject combination is locked for this academic session.
              </p>
            </div>

            <div className="rounded-3xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 p-5">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-black text-sm">
                <Zap className="w-4 h-4" />
                Tips for choosing
              </div>
              <ul className="mt-3 space-y-2 text-xs text-indigo-900/80 dark:text-indigo-100/80">
                <li className="flex gap-2">
                  <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Pick subjects aligned with your intended course of study.
                </li>
                <li className="flex gap-2">
                  <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  English and Mathematics are required for most programmes.
                </li>
                <li className="flex gap-2">
                  <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Choose subjects you can dedicate consistent practice time to.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_340px] gap-5">
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Average Score', value: `${average.toFixed(1)}%`, Icon: Target, tint: 'text-indigo-600' },
                { label: 'Best Score', value: `${best.toFixed(1)}%`, Icon: Trophy, tint: 'text-amber-500' },
                { label: 'Tests Completed', value: String(attempts.length), Icon: CheckCircle2, tint: 'text-emerald-600' },
                { label: 'Registration', value: 'Locked', Icon: Lock, tint: 'text-gray-400' },
              ].map(({ label, value, Icon, tint }) => (
                <div
                  key={label}
                  className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4"
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-5 h-5 ${tint}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {label}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5 md:p-7">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-indigo-600" />
                    Performance trend
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Score progression across your last {scoreTrend.length} attempt
                    {scoreTrend.length === 1 ? '' : 's'}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full ${
                    trendDelta > 1
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : trendDelta < -1
                      ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {trendDelta > 1 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : trendDelta < -1 ? (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  ) : (
                    <Minus className="w-3.5 h-3.5" />
                  )}
                  {trendDelta >= 0 ? '+' : ''}
                  {trendDelta.toFixed(1)}%
                </span>
              </div>

              {scoreTrend.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  Take your first CBT to unlock the performance graph.
                </div>
              ) : (
                <>
                  <Sparkline
                    values={scoreTrend}
                    color={trendDelta >= 0 ? '#10b981' : '#ef4444'}
                    height={64}
                  />

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                        First
                      </p>
                      <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">
                        {scoreTrend[0].toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                        Latest
                      </p>
                      <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">
                        {scoreTrend[scoreTrend.length - 1].toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                        Peak
                      </p>
                      <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">
                        {Math.max(...scoreTrend).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5 md:p-7">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  Subject performance
                </h2>
                <span className="text-xs text-gray-500 font-bold">
                  Avg score per subject
                </span>
              </div>

              {subjectBars.every((s) => s.attempts === 0) ? (
                <p className="text-sm text-gray-500">
                  No attempts recorded yet. Start practising to see per-subject analytics.
                </p>
              ) : (
                <div className="space-y-4">
                  {subjectBars.map((s) => {
                    const tone = s.avg >= 70 ? 'good' : s.avg >= 50 ? 'warn' : 'bad';
                    return (
                      <div key={s.id}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {s.name}
                          </span>
                          <span
                            className={`text-xs font-black ${
                              tone === 'good'
                                ? 'text-emerald-600'
                                : tone === 'warn'
                                ? 'text-amber-600'
                                : 'text-red-600'
                            }`}
                          >
                            {s.attempts ? `${s.avg.toFixed(0)}%` : '—'}
                          </span>
                        </div>
                        <BarMeter value={s.attempts ? s.avg : 0} tone={tone} />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5 md:p-7">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Weak topics &amp; areas to improve
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Topics where your accuracy is lowest. These are your highest-impact study areas.
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                  <Brain className="w-3 h-3" />
                  Focus
                </span>
              </div>

              {weakTopics.length === 0 ? (
                <div className="rounded-2xl border border-dashed dark:border-gray-700 p-6 text-center">
                  <PieChart className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-500">
                    No weak-topic data yet
                  </p>
                  <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                    Topic-level insights appear once your CBT attempts include per-topic answer breakdowns.
                    Keep practising to build this profile.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {weakTopics.map((t, i) => {
                    const tone =
                      t.accuracy >= 70 ? 'good' : t.accuracy >= 50 ? 'warn' : 'bad';
                    return (
                      <div
                        key={`${t.subject}-${t.topic}-${i}`}
                        className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hover:border-amber-300 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                              {t.topic}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {t.subject} · {t.correct}/{t.total} correct
                            </p>
                          </div>
                          <span
                            className={`text-sm font-black flex-shrink-0 ${
                              tone === 'good'
                                ? 'text-emerald-600'
                                : tone === 'warn'
                                ? 'text-amber-600'
                                : 'text-red-600'
                            }`}
                          >
                            {t.accuracy.toFixed(0)}%
                          </span>
                        </div>

                        <div className="mt-3">
                          <BarMeter value={t.accuracy} tone={tone} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {strongTopics.length > 0 && (
                <div className="mt-6 pt-5 border-t dark:border-gray-700">
                  <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Your strongest topics
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {strongTopics.map((t, i) => (
                      <span
                        key={`${t.subject}-${t.topic}-${i}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-3 py-1.5 rounded-full"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {t.topic} · {t.accuracy.toFixed(0)}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5 md:p-7">
              <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-indigo-600" />
                Recommended next steps
              </h2>

              <div className="space-y-3">
                {recommendations.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Complete a few CBT attempts to receive personalised recommendations.
                  </p>
                )}

                {recommendations.map((r, i) => {
                  const palette =
                    r.tone === 'warn'
                      ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'
                      : r.tone === 'good'
                      ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
                      : 'border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300';
                  const Icon =
                    r.tone === 'warn'
                      ? AlertTriangle
                      : r.tone === 'good'
                      ? TrendingUp
                      : Lightbulb;
                  return (
                    <div
                      key={i}
                      className={`rounded-2xl border p-4 flex items-start gap-3 ${palette}`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p className="text-sm leading-relaxed">{r.text}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5 md:p-7">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Your Four Subjects
                  </h2>
                  <p className="text-sm text-gray-500">
                    Registration is locked for this academic session.
                  </p>
                </div>
                <Lock className="text-gray-400" />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {subjectStats.map((item) => {
                  const pct = Math.min(100, item.avg);
                  return (
                    <div
                      key={item.subject_id}
                      className="group rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 hover:border-indigo-300 hover:shadow-sm transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white truncate">
                            {item.subject.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.is_compulsory ? 'Compulsory' : 'Selected subject'}
                          </p>
                        </div>

                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-full flex-shrink-0">
                          {item.attempts} {item.attempts === 1 ? 'test' : 'tests'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4 text-center">
                        <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 py-2">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Avg</p>
                          <p
                            className={`text-sm font-black mt-0.5 ${
                              item.avg >= 70
                                ? 'text-green-600'
                                : item.avg >= 50
                                ? 'text-amber-600'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {item.attempts ? `${item.avg.toFixed(0)}%` : '—'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 py-2">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Best</p>
                          <p className="text-sm font-black mt-0.5 text-gray-900 dark:text-white">
                            {item.attempts ? `${item.best.toFixed(0)}%` : '—'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 transition-all"
                          style={{ width: `${item.attempts ? Math.max(6, pct) : 0}%` }}
                        />
                      </div>

                      <PractiseButton subjectId={item.subject_id} variant="primary" />
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-5 border-b dark:border-gray-700 flex items-center justify-between">
                <h2 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Performance History
                </h2>
                {attempts.length > 0 && (
                  <span className="text-xs text-gray-500 font-bold">
                    Last {Math.min(20, attempts.length)} attempts
                  </span>
                )}
              </div>

              {attempts.length === 0 ? (
                <div className="p-10 text-center">
                  <BarChart3 className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-bold">No CBT attempts yet.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Choose a subject above to start practising.
                  </p>
                </div>
              ) : (
                <div className="divide-y dark:divide-gray-700">
                  {attempts.slice(0, 20).map((a) => {
                    const score = Number(a.score);
                    const tone =
                      score >= 70
                        ? 'text-green-600'
                        : score >= 50
                        ? 'text-amber-600'
                        : 'text-red-600';
                    return (
                      <div
                        key={a.id}
                        className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {a.subject?.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="w-3 h-3" />
                              {new Date(a.submitted_at || a.started_at).toLocaleString()}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span>
                              {a.correct_count}/{a.question_count} correct
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-4 md:text-right">
                          <div>
                            <p className={`text-2xl font-black ${tone}`}>
                              {score.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500">
                              {Math.round(Number(a.duration_seconds || 0) / 60)} min
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 p-5 text-white shadow-lg">
              <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                Overall performance
              </div>

              <div className="mt-4 flex items-end gap-2">
                <p className="text-4xl font-black leading-none">
                  {average.toFixed(1)}
                </p>
                <span className="text-lg font-bold text-indigo-200 mb-1">%</span>
              </div>
              <p className="text-xs text-indigo-100 mt-1">Average across all attempts</p>

              <div className="mt-4 h-2 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{ width: `${Math.min(100, average)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-5">
                <div className="rounded-xl bg-white/10 backdrop-blur border border-white/10 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-indigo-200 font-bold">Pass rate</p>
                  <p className="text-lg font-black mt-1">{passRate.toFixed(0)}%</p>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur border border-white/10 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-indigo-200 font-bold">Total time</p>
                  <p className="text-lg font-black mt-1">{Math.round(totalMinutes)}m</p>
                </div>
              </div>

              {scoreTrend.length > 1 && (
                <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] uppercase tracking-wider text-indigo-200 font-bold">
                      Recent trend
                    </p>
                    <span className="text-[10px] font-black text-white">
                      {trendDelta >= 0 ? '+' : ''}
                      {trendDelta.toFixed(1)}%
                    </span>
                  </div>
                  <Sparkline
                    values={scoreTrend}
                    color={trendDelta >= 0 ? '#6ee7b7' : '#fca5a5'}
                    height={40}
                  />
                </div>
              )}
            </div>

            {weakestSubject && weakestSubject.attempts > 0 && (
              <div className="rounded-3xl border border-amber-200 dark:border-amber-900/40 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-5">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-black uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  Priority focus
                </div>
                <p className="text-lg font-black text-amber-900 dark:text-amber-200 mt-3">
                  {weakestSubject.subject.name}
                </p>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1">
                  Lowest average at {weakestSubject.avg.toFixed(0)}% across {weakestSubject.attempts} attempt
                  {weakestSubject.attempts === 1 ? '' : 's'}.
                </p>
                <PractiseButton subjectId={weakestSubject.subject_id} variant="amber" />
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5">
              <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                Momentum
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Your last 5 CBT attempts
              </p>

              <div className="mt-4 flex items-center gap-1.5">
                {attempts.slice(0, 5).map((a, i) => {
                  const score = Number(a.score);
                  const passed = score >= 50;
                  return (
                    <div
                      key={a.id || i}
                      className={`flex-1 h-12 rounded-lg flex items-center justify-center text-xs font-black ${
                        passed
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                      title={`${score.toFixed(1)}%`}
                    >
                      {score.toFixed(0)}
                    </div>
                  );
                })}
                {attempts.length === 0 && (
                  <p className="text-sm text-gray-400">No attempts yet</p>
                )}
              </div>

              {attempts.length > 0 && (
                <p className="text-xs text-gray-500 mt-3">
                  <b className="text-gray-900 dark:text-white">{streak}</b> of last{' '}
                  {Math.min(5, attempts.length)} passed
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h3 className="font-black text-gray-900 dark:text-white">
                  Personal best
                </h3>
              </div>

              <p className="text-3xl font-black text-gray-900 dark:text-white mt-3">
                {best.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Highest score achieved so far
              </p>

              <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  Session locked &amp; active
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Hash className="w-3.5 h-3.5" />
                  {attempts.length} attempt{attempts.length === 1 ? '' : 's'} recorded
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5">
              <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Quick jump
              </h3>

              <div className="space-y-2">
                {subjectStats.map((item) => {
                  const cd = cooldowns[item.subject_id];
                  const locked = cd && !cd.canStart && cd.remainingMs > 0;
                  const hrs = locked ? Math.floor(cd.remainingMs / 3_600_000) : 0;
                  const mins = locked
                    ? Math.floor((cd.remainingMs % 3_600_000) / 60_000)
                    : 0;

                  return (
                    <button
                      key={item.subject_id}
                      disabled={locked}
                      onClick={() => navigate(`/student/jamb-cbt/test/${item.subject_id}`)}
                      className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition text-left ${
                        locked
                          ? 'border-gray-100 dark:border-gray-700 opacity-60 cursor-not-allowed'
                          : 'border-gray-100 dark:border-gray-700 hover:border-indigo-300 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10'
                      }`}
                    >
                      <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {item.subject.name}
                      </span>
                      {locked ? (
                        <span className="text-[10px] font-black text-gray-500 flex-shrink-0">
                          {hrs}h {mins}m
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default JambCbt;