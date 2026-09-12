import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardCheck, FileText, ListChecks, PenLine } from 'lucide-react';

type Tab = { label: string; path: string; icon: React.FC<any> };

const tabs: Tab[] = [
  { label: 'Test 1', path: '/admin/results/enter-test', icon: FileText },
  { label: 'Test 2', path: '/admin/results/enter-second-test', icon: FileText },
  { label: 'CA', path: '/admin/results/enter-ca', icon: PenLine },
  { label: 'Exam', path: '/admin/results/enter-exam', icon: ClipboardCheck },
];

export default function AdminResultAssessmentTabs({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const active = tabs.find(tab => location.pathname === tab.path)?.path || tabs[0].path;

  return (
    <div className="mx-auto max-w-[1500px] px-4 pt-4 md:px-6">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex min-w-max gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const selected = active === tab.path;
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => navigate(tab.path)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${selected ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
