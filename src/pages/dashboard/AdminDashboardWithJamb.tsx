import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Database,
  Loader2,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import AdminDashboard from './AdminDashboard';

interface JambStats {
  registrations: number;
  attempts: number;
  questions: number;
  averageScore: number;
}

const AdminDashboardWithJamb: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<JambStats>({
    registrations: 0,
    attempts: 0,
    questions: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadJambStats = async () => {
      setLoading(true);
      try {
        const [registrations, attempts, questions] = await Promise.all([
          supabase
            .from('jamb_registrations')
            .select('id', { count: 'exact', head: true }),
          supabase
            .from('jamb_attempts')
            .select('id, score'),
          supabase
            .from('jamb_questions')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true),
        ]);

        if (cancelled) return;

        if (registrations.error) {
          console.error('JAMB registrations:', registrations.error);
        }
        if (attempts.error) {
          console.error('JAMB attempts:', attempts.error);
        }
        if (questions.error) {
          console.error('JAMB questions:', questions.error);
        }

        const scores = (attempts.data || [])
          .map((item: any) => Number(item.score))
          .filter((score: number) => Number.isFinite(score));

        setStats({
          registrations: registrations.count || 0,
          attempts: attempts.data?.length || 0,
          questions: questions.count || 0,
          averageScore: scores.length
            ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
            : 0,
        });
      } catch (error) {
        console.error('Failed to load JAMB dashboard statistics:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (user?.id) loadJambStats();
    else setLoading(false);

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <AdminDashboard />

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-xl dark:border-slate-700 sm:p-7"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100">
              <Target className="h-3.5 w-3.5" />
              JAMB CBT PREPARATION
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">JAMB CBT Management</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Manage student registrations, authorized practice questions, CBT attempts and performance from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/jamb-cbt"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Link>
            <Link
              to="/admin/jamb-cbt/questions"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <Database className="h-4 w-4" />
              Question Bank
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Registered Students', value: stats.registrations, icon: Users },
            { label: 'CBT Attempts', value: stats.attempts, icon: ClipboardList },
            { label: 'Active Questions', value: stats.questions, icon: BookOpen },
            { label: 'Average Score', value: `${stats.averageScore}%`, icon: Trophy },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <Icon className="h-5 w-5 text-blue-200" />
                  {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                </div>
                <p className="mt-3 text-2xl font-bold">{item.value}</p>
                <p className="mt-1 text-xs text-slate-400">{item.label}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Link
            to="/admin/jamb-cbt"
            className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition hover:bg-white/[0.11]"
          >
            <div>
              <p className="font-semibold">Performance Analytics</p>
              <p className="mt-1 text-xs text-slate-400">Scores and subject performance</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1" />
          </Link>
          <Link
            to="/admin/jamb-cbt/questions"
            className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition hover:bg-white/[0.11]"
          >
            <div>
              <p className="font-semibold">Question Bank</p>
              <p className="mt-1 text-xs text-slate-400">Import and manage questions</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1" />
          </Link>
          <Link
            to="/admin/jamb-cbt"
            className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition hover:bg-white/[0.11]"
          >
            <div>
              <p className="font-semibold">CBT Control Centre</p>
              <p className="mt-1 text-xs text-slate-400">Monitor the JAMB preparation system</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </motion.section>
    </div>
  );
};

export default AdminDashboardWithJamb;
