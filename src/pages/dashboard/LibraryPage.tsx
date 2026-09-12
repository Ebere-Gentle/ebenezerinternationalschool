import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Clock3,
  Filter,
  LibraryBig,
  Loader2,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LibraryBook {
  id: string;
  title: string;
  author?: string | null;
  category?: string | null;
  isbn?: string | null;
  available_copies?: number | null;
  total_copies?: number | null;
}

interface LibraryLoan {
  id: string;
  due_date?: string | null;
  borrowed_at?: string | null;
  status?: string | null;
  book_copies?: {
    book?: LibraryBook | LibraryBook[] | null;
  } | null;
}

const normaliseBook = (book: LibraryBook | LibraryBook[] | null | undefined): LibraryBook | null => {
  if (Array.isArray(book)) return book[0] ?? null;
  return book ?? null;
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const getLoanStatus = (loan: LibraryLoan) => {
  if (String(loan.status || '').toLowerCase() !== 'borrowed') return 'Returned';
  if (!loan.due_date) return 'On loan';
  const due = new Date(loan.due_date).getTime();
  const now = Date.now();
  if (due < now) return 'Overdue';
  if (due - now <= 3 * 24 * 60 * 60 * 1000) return 'Due soon';
  return 'On loan';
};

const statusClass = (status: string) => {
  if (status === 'Overdue') return 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300';
  if (status === 'Due soon') return 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300';
  return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300';
};

const LibraryPage: React.FC = () => {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [borrowed, setBorrowed] = useState<LibraryLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  const [error, setError] = useState('');

  const fetchLibrary = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const { data: userResult } = await supabase.auth.getUser();
      const borrowerId = userResult.user?.id;

      const [booksResult, loansResult] = await Promise.all([
        supabase.from('library_books').select('*').limit(20),
        borrowerId
          ? supabase
              .from('library_loans')
              .select('*, book_copies(book:library_books(*))')
              .eq('borrower_id', borrowerId)
              .eq('status', 'borrowed')
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (booksResult.error) throw booksResult.error;
      if (loansResult.error) throw loansResult.error;

      setBooks((booksResult.data ?? []) as LibraryBook[]);
      setBorrowed((loansResult.data ?? []) as LibraryLoan[]);
    } catch (err) {
      console.error('Library fetch failed:', err);
      setError('Unable to load the library right now. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchLibrary();
  }, [fetchLibrary]);

  const categories = useMemo(() => {
    const values = books.map((book) => String(book.category || '').trim()).filter(Boolean);
    return ['All', ...Array.from(new Set(values))];
  }, [books]);

  const filteredBooks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return books.filter((book) => {
      const matchesCategory = category === 'All' || String(book.category || '') === category;
      const searchable = [book.title, book.author, book.category, book.isbn].map((value) => String(value || '').toLowerCase());
      return matchesCategory && (!term || searchable.some((value) => value.includes(term)));
    });
  }, [books, category, searchTerm]);

  const totals = useMemo(() => {
    const total = books.reduce((sum, book) => sum + Number(book.total_copies ?? 0), 0);
    const available = books.reduce((sum, book) => sum + Number(book.available_copies ?? 0), 0);
    const onLoan = Math.max(total - available, 0);
    const overdue = borrowed.filter((loan) => getLoanStatus(loan) === 'Overdue').length;
    return { total, available, onLoan, overdue };
  }, [books, borrowed]);

  return (
    <div className="min-h-full w-full min-w-0 bg-slate-50/70 p-3 dark:bg-slate-950 sm:p-5 lg:p-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-700 via-violet-700 to-slate-950 p-5 text-white shadow-xl sm:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <LibraryBig className="h-4 w-4" /> EIS Library
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Library Management</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/75">Discover books, monitor availability and keep track of your active library loans.</p>
            </div>
            <button type="button" onClick={() => void fetchLibrary(true)} disabled={refreshing} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </section>

        <section className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Total books', totals.total, BookOpen],
            ['Available', totals.available, CheckCircle2],
            ['On loan', totals.onLoan, BookMarked],
            ['Overdue', totals.overdue, Clock3],
          ].map(([label, value, Icon]) => {
            const StatIcon = Icon as React.ComponentType<{ className?: string }>;
            return (
              <div key={String(label)} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{loading ? '—' : value}</p></div>
                  <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"><StatIcon className="h-5 w-5" /></div>
                </div>
              </div>
            );
          })}
        </section>

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

        <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.85fr)]">
          <section className="min-w-0 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="font-semibold text-slate-900 dark:text-white">Book catalogue</h2><p className="text-xs text-slate-400">Search the books currently registered in the library</p></div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search title or ISBN..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-indigo-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800" />
                </div>
              </div>
              <div className="mt-4 flex min-w-0 gap-2 overflow-x-auto pb-1">
                <Filter className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                {categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${category === item ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>{item}</button>)}
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 2xl:grid-cols-3">
              {loading ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />) : filteredBooks.map((book, index) => {
                const available = Number(book.available_copies ?? 0);
                const total = Number(book.total_copies ?? 0);
                return (
                  <motion.article key={book.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }} className="group min-w-0 rounded-2xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-800">
                    <div className="flex gap-3">
                      <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-700 text-white shadow-sm"><BookOpen className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1"><h3 className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{book.title || 'Untitled book'}</h3><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{book.author || 'Author not recorded'}</p></div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2 text-[11px]"><span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{book.category || 'General'}</span><span className={available > 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-500'}>{available}/{total} available</span></div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400 dark:border-slate-800"><span className="truncate">ISBN {book.isbn || 'Not recorded'}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0" /></div>
                  </motion.article>
                );
              })}
              {!loading && filteredBooks.length === 0 && <div className="col-span-full py-14 text-center"><BookOpen className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">No books match your search.</p></div>}
            </div>
          </section>

          <aside className="min-w-0 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-900 dark:text-white">My active loans</h2><p className="text-xs text-slate-400">Books currently borrowed by your account</p></div><div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"><Users className="h-5 w-5" /></div></div></div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="p-4"><div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /></div>) : borrowed.map((loan) => {
                const book = normaliseBook(loan.book_copies?.book);
                const status = getLoanStatus(loan);
                return (
                  <div key={loan.id} className="p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><BookMarked className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{book?.title || 'Library book'}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Borrowed {formatDate(loan.borrowed_at)}</p><div className="mt-3 flex items-center justify-between gap-2"><span className="text-[10px] text-slate-400">Due {formatDate(loan.due_date)}</span><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass(status)}`}>{status}</span></div></div></div>
                  </div>
                );
              })}
              {!loading && borrowed.length === 0 && <div className="px-5 py-14 text-center"><BookMarked className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">No active loans</p><p className="mt-1 text-xs text-slate-400">Books you borrow will appear here.</p></div>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default LibraryPage;
