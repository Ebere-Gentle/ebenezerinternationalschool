import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Download,
  Printer,
  Calendar,
  Building,
  CheckCircle,
  Clock,
  ShieldCheck,
  Share2,
  ExternalLink,
  Award
} from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

interface NoticeItem {
  id: string;
  reference_no: string;
  title: string;
  category: 'Academic Bulletin' | 'Fee Schedule' | 'Examination' | 'General Notice';
  summary: string;
  issued_by: string;
  issue_date: string;
  effective_date: string;
  is_official_gazette: boolean;
}

const SAMPLE_NOTICES: NoticeItem[] = [
  {
    id: 'not-001',
    reference_no: 'EIS/CIRC/2025/08-01',
    title: 'Approved 2025/2026 Academic Calendar & Term Billing Schedule',
    category: 'Fee Schedule',
    summary: 'Detailed statutory breakdown of tuition fees, co-curricular charges, laboratory consumables, and early-bird settlement incentives for the forthcoming academic year.',
    issued_by: 'Bursar & Academic Council',
    issue_date: 'August 10, 2025',
    effective_date: 'September 1, 2025',
    is_official_gazette: true
  },
  {
    id: 'not-002',
    reference_no: 'EIS/CIRC/2025/08-02',
    title: 'Cambridge IGCSE & WAEC SSCE Candidate Registration Guidelines',
    category: 'Examination',
    summary: 'Guidelines, biometric verification procedures, and passport photograph standards for Grade 12 registered candidates.',
    issued_by: 'Directorate of External Examinations',
    issue_date: 'August 08, 2025',
    effective_date: 'Immediate',
    is_official_gazette: true
  },
  {
    id: 'not-003',
    reference_no: 'EIS/CIRC/2025/07-15',
    title: 'School Bus Transit Routes, Pick-up Points & Safety Protocols',
    category: 'General Notice',
    summary: 'Updated transportation routing for Ikeja, Lekki Phase 1, Victoria Island, and Surulere transit corridors with assigned vehicle captains.',
    issued_by: 'Transport & Logistics Directorate',
    issue_date: 'July 28, 2025',
    effective_date: 'September 8, 2025',
    is_official_gazette: false
  }
];

export const NoticesPage: React.FC = () => {
  const [notices] = useState<NoticeItem[]>(SAMPLE_NOTICES);
  const [search, setSearch] = useState('');
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(SAMPLE_NOTICES[0]);

  const filtered = notices.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.reference_no.toLowerCase().includes(search.toLowerCase()) ||
    n.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-800 via-gray-800 to-zinc-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-2">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Digital Notice Board & Gazettes</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Official School Notices & Gazettes
          </h1>
          <p className="text-gray-300 text-sm max-w-xl">
            Official executive circulars, bursary directives, and gazetted school calendars with verifiable seal.
          </p>
        </div>

        <button
          onClick={() => {
            window.print();
            toast.success('Print dialog opened');
          }}
          className="px-5 py-3 rounded-2xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 shadow-lg transition-all flex items-center justify-center gap-2 self-start md:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print Notice Board</span>
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search reference no, title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            {filtered.map(notice => (
              <div
                key={notice.id}
                onClick={() => setSelectedNotice(notice)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedNotice?.id === notice.id
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-sm'
                    : 'bg-white dark:bg-gray-900 border-gray-200/80 dark:border-gray-800 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                    {notice.reference_no}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {notice.category}
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-2">
                  {notice.title}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
                  <span>{notice.issued_by}</span>
                  <span>{notice.issue_date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Detail Document View */}
        <div className="lg:col-span-7">
          {selectedNotice && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-6 sm:p-8 shadow-sm space-y-6"
            >
              <div className="border-b border-gray-100 dark:border-gray-800 pb-4 flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 block mb-1">
                    {selectedNotice.reference_no}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {selectedNotice.title}
                  </h2>
                </div>
                {selectedNotice.is_official_gazette && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    GAZETTED
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                  <span className="text-gray-400 block text-[10px]">Category</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{selectedNotice.category}</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                  <span className="text-gray-400 block text-[10px]">Issue Date</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{selectedNotice.issue_date}</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                  <span className="text-gray-400 block text-[10px]">Effective</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedNotice.effective_date}</span>
                </div>
              </div>

              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">
                <p>{selectedNotice.summary}</p>
                <p className="text-xs text-gray-500">
                  This document serves as an authoritative publication under the Ebenezer International School Academic and Bursary Regulations. Stamped and sealed digitally.
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-200/80 dark:border-gray-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px]">Authority</span>
                  <span className="font-bold text-gray-900 dark:text-white">{selectedNotice.issued_by}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      window.print();
                      toast.success('Printing gazette');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                  <button
                    onClick={() => toast.success('Notice PDF downloaded')}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoticesPage;
