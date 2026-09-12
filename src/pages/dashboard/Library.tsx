import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Search,
  Plus,
  LibraryBig,
  Users,
  Clock3,
  CheckCircle2,
  BookMarked,
  ArrowUpRight,
  Filter,
  MoreHorizontal,
} from 'lucide-react';

interface LibraryBook {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  copies: number;
  available: number;
  shelf: string;
}

interface LibraryLoan {
  id: string;
  student: string;
  book: string;
  className: string;
  borrowed: string;
  due: string;
  status: 'On loan' | 'Due soon' | 'Overdue';
}

const books: LibraryBook[] = [
  { id: '1', title: 'New General Mathematics', author: 'M. A. S. Abdul', category: 'Mathematics', isbn: '9780582238768', copies: 18, available: 12, shelf: 'M-04' },
  { id: '2', title: 'Essential Biology', author: 'A. O. Adebayo', category: 'Science', isbn: '9789785200195', copies: 15, available: 9, shelf: 'S-02' },
  { id: '3', title: 'New School Physics', author: 'M. W. Anyakoha', category: 'Physics', isbn: '9789785200348', copies: 12, available: 7, shelf: 'P-01' },
  { id: '4', title: 'Oxford English Grammar Course', author: 'Michael Swan', category: 'English', isbn: '9780194420872', copies: 20, available: 15, shelf: 'E-03' },
  { id: '5', title: 'Computer Studies for Schools', author: 'S. O. Ojukwu', category: 'ICT', isbn: '9789785201000', copies: 10, available: 8, shelf: 'I-01' },
  { id: '6', title: 'African Short Stories', author: 'Various Authors', category: 'Literature', isbn: '9789785202220', copies: 14, available: 11, shelf: 'L-05' },
];

const loans: LibraryLoan[] = [
  { id: '1', student: 'Student Record', book: 'New General Mathematics', className: 'SS2 Science', borrowed: '10 Sep 2026', due: '17 Sep 2026', status: 'On loan' },
  { id: '2', student: 'Student Record', book: 'Essential Biology', className: 'SS1 Science', borrowed: '09 Sep 2026', due: '16 Sep 2026', status: 'Due soon' },
  { id: '3', student: 'Student Record', book: 'African Short Stories', className: 'JSS3', borrowed: '01 Sep 2026', due: '08 Sep 2026', status: 'Overdue' },
  { id: '4', student: 'Student Record', book: 'New School Physics', className: 'SS3 Science', borrowed: '11 Sep 2026', due: '18 Sep 2026', status: 'On loan' },
];

const categories = ['All', ...Array.from(new Set(books.map((book) => book.category)))];

const Library: React.FC = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const filteredBooks = useMemo(() => {
    const term = query.trim().toLowerCase();
    return books.filter((book) => {
      const matchesCategory = category === 'All' || book.category === category;
      const matchesSearch = !term || [book.title, book.author, book.category, book.isbn, book.shelf].some((value) => value.toLowerCase().includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [query, category]);

  return (
    <div className="min-h-full w-full min-w-0 bg-slate-50/70 dark:bg-slate-950 p-3 sm:p-5 lg:p-6">
      <div className="mx-auto w-full max-w-[1600px] min-w-0 space-y-5">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-900 p-5 sm:p-7 text-white shadow-xl">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur">
                <LibraryBig className="h-4 w-4" /> EIS Library
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Library Management</h1>
              <p className="mt-1 max-w-2xl text-sm text-white/75">Manage books, discover resources and monitor student loans from one place.</p>
            </div>
            <button className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-lg transition hover:-translate-y-0.5">
              <Plus className="h-4 w-4" /> Add book
            </button>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Total books', '89', BookOpen],
            ['Available', '62', CheckCircle2],
            ['On loan', '27', BookMarked],
            ['Overdue', '3', Clock3],
          ].map(([label, value, Icon]) => {
            const StatIcon = Icon as React.ComponentType<{ className?: string }>;
            return (
              <div key={String(label)} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                  </div>
                  <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"><StatIcon className="h-5 w-5" /></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.85fr)]">
          <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-4 sm:p-5 dark:border-slate-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><h2 className="font-semibold text-slate-900 dark:text-white">Book catalogue</h2><p className="text-xs text-slate-400">Search and browse library resources</p></div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, author, ISBN..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-indigo-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
              </div>
              <div className="mt-4 flex min-w-0 gap-2 overflow-x-auto pb-1">
                <Filter className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${category === item ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>{item}</button>)}
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 2xl:grid-cols-3">
              {filteredBooks.map((book, index) => (
                <motion.article key={book.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="group min-w-0 rounded-2xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-800">
                  <div className="flex gap-3">
                    <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-700 text-white shadow-sm"><BookOpen className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2"><h3 className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{book.title}</h3><button className="shrink-0 text-slate-400"><MoreHorizontal className="h-4 w-4" /></button></div>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{book.author}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 text-[11px]">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{book.category}</span>
                    <span className={book.available > 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-500'}>{book.available}/{book.copies} available</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400 dark:border-slate-800"><span>ISBN {book.isbn}</span><span>Shelf {book.shelf}</span></div>
                </motion.article>
              ))}
              {filteredBooks.length === 0 && <div className="col-span-full py-12 text-center text-sm text-slate-400">No books match your search.</div>}
            </div>
          </section>

          <aside className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-4 sm:p-5 dark:border-slate-800"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900 dark:text-white">Active loans</h2><p className="text-xs text-slate-400">Recent student borrowing activity</p></div><div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"><Users className="h-5 w-5" /></div></div></div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {loans.map((loan) => (
                <div key={loan.id} className="p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><BookMarked className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{loan.book}</p><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300" /></div>
                      <p className="mt-1 text-xs text-slate-500">{loan.student} · {loan.className}</p>
                      <div className="mt-3 flex items-center justify-between gap-2 text-[10px]"><span className="text-slate-400">Due {loan.due}</span><span className={`rounded-full px-2 py-1 font-semibold ${loan.status === 'Overdue' ? 'bg-red-50 text-red-600 dark:bg-red-950/40' : loan.status === 'Due soon' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'}`}>{loan.status}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4"><button className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">View all loans</button></div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Library;
