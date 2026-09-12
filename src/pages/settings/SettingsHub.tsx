import React, { useState } from 'react';
import { BarChart3, Settings as SettingsIcon } from 'lucide-react';
import Settings from './Settings';
import AssessmentSettingsAdmin from './AssessmentSettingsAdmin';

const SettingsHub: React.FC = () => {
  const [tab, setTab] = useState<'general' | 'assessment'>('general');

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 border-b bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-2">
          <button onClick={() => setTab('general')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${tab === 'general' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
            <SettingsIcon className="h-4 w-4" /> General Settings
          </button>
          <button onClick={() => setTab('assessment')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${tab === 'assessment' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
            <BarChart3 className="h-4 w-4" /> Assessment Configuration
          </button>
        </div>
      </div>
      {tab === 'general' ? <Settings /> : <AssessmentSettingsAdmin />}
    </div>
  );
};

export default SettingsHub;
