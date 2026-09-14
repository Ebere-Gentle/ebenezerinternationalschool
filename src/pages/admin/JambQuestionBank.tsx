import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from '../../config/supabase/client';
import {
  AlertTriangle,
  Atom,
  Beaker,
  BookOpen,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  FileUp,
  Filter,
  FlaskConical,
  Globe2,
  HeartPulse,
  Landmark,
  Languages,
  Leaf,
  Laptop2,
  Loader2,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Sigma,
  Trash2,
  Upload,
  X,
  Dna,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Subject = {
  id: string;
  name: string;
  code: string | null;
  is_compulsory: boolean;
  is_active: boolean;
  sort_order: number;
};

type Question = {
  id: string;
  subject_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  topic: string | null;
  year: number | null;
  source: string | null;
  difficulty: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subject?: Subject;
};

type Form = {
  subject_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  topic: string;
  year: string;
  source: string;
  difficulty: string;
  is_active: boolean;
};

const emptyForm: Form = {
  subject_id: '',
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A',
  explanation: '',
  topic: '',
  year: '',
  source: 'EIS JAMB CBT',
  difficulty: 'medium',
  is_active: true,
};

const PAGE_SIZE = 15;

/**
 * Supabase REST responses are commonly capped at 1000 rows.
 * We therefore load the question bank in batches.
 */
const FETCH_BATCH_SIZE = 1000;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }

    if (ch === '"') {
      quoted = !quoted;
      continue;
    }

    if (ch === ',' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') {
        i += 1;
      }

      row.push(cell);
      cell = '';

      if (row.some((value) => value.trim() !== '')) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    cell += ch;
  }

  if (cell.length || row.length) {
    row.push(cell);

    if (row.some((value) => value.trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

const normaliseHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const csvTemplate = `subject_code,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,topic,year,source,difficulty,is_active
PHY,"A body of mass 2 kg accelerates at 3 m/s². What is the force?","2 N","5 N","6 N","9 N","C","F = ma = 2 × 3 = 6 N.",Mechanics,2025,"Authorized practice bank",medium,true`;

const subjectColorPalette = [
  {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    icon: 'text-blue-600 dark:text-blue-400',
    bar: 'bg-blue-500',
  },
  {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  },
  {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    icon: 'text-purple-600 dark:text-purple-400',
    bar: 'bg-purple-500',
  },
  {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    icon: 'text-orange-600 dark:text-orange-400',
    bar: 'bg-orange-500',
  },
  {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    icon: 'text-pink-600 dark:text-pink-400',
    bar: 'bg-pink-500',
  },
  {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    icon: 'text-cyan-600 dark:text-cyan-400',
    bar: 'bg-cyan-500',
  },
  {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    icon: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
  },
  {
    bg: 'bg-red-100 dark:bg-red-900/30',
    icon: 'text-red-600 dark:text-red-400',
    bar: 'bg-red-500',
  },
  {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    icon: 'text-violet-600 dark:text-violet-400',
    bar: 'bg-violet-500',
  },
  {
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    icon: 'text-teal-600 dark:text-teal-400',
    bar: 'bg-teal-500',
  },
  {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: 'text-indigo-600 dark:text-indigo-400',
    bar: 'bg-indigo-500',
  },
  {
    bg: 'bg-lime-100 dark:bg-lime-900/30',
    icon: 'text-lime-600 dark:text-lime-400',
    bar: 'bg-lime-500',
  },
];

const getSubjectColors = (index: number) =>
  subjectColorPalette[
    ((index % subjectColorPalette.length) +
      subjectColorPalette.length) %
      subjectColorPalette.length
  ];

const getSubjectIcon = (name: string) => {
  const subject = name.toLowerCase();

  if (
    subject.includes('physics') ||
    subject.includes('physical')
  ) {
    return Atom;
  }

  if (
    subject.includes('chemistry') ||
    subject.includes('chemical')
  ) {
    return FlaskConical;
  }

  if (
    subject.includes('biology') ||
    subject.includes('biological')
  ) {
    return Dna;
  }

  if (
    subject.includes('mathematics') ||
    subject.includes('maths') ||
    subject === 'math'
  ) {
    return Calculator;
  }

  if (
    subject.includes('english') ||
    subject.includes('language')
  ) {
    return Languages;
  }

  if (
    subject.includes('government') ||
    subject.includes('civic') ||
    subject.includes('political')
  ) {
    return Landmark;
  }

  if (
    subject.includes('economics') ||
    subject.includes('commerce')
  ) {
    return TrendingUp;
  }

  if (subject.includes('geography')) {
    return Globe2;
  }

  if (
    subject.includes('agric') ||
    subject.includes('crop') ||
    subject.includes('animal husbandry')
  ) {
    return Leaf;
  }

  if (
    subject.includes('computer') ||
    subject.includes('ict') ||
    subject.includes('data processing')
  ) {
    return Laptop2;
  }

  if (
    subject.includes('health') ||
    subject.includes('physical education') ||
    subject.includes('pe')
  ) {
    return HeartPulse;
  }

  if (
    subject.includes('literature') ||
    subject.includes('book')
  ) {
    return BookOpen;
  }

  if (
    subject.includes('religious') ||
    subject.includes('crs') ||
    subject.includes('irs')
  ) {
    return BookOpen;
  }

  if (
    subject.includes('account') ||
    subject.includes('accounting')
  ) {
    return Sigma;
  }

  if (
    subject.includes('law') ||
    subject.includes('legal')
  ) {
    return Scale;
  }

  if (
    subject.includes('technical') ||
    subject.includes('technology')
  ) {
    return Beaker;
  }

  return BookOpen;
};

const getSubjectCode = (subject: Subject) => {
  if (subject.code) {
    return subject.code.toUpperCase();
  }

  return subject.name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();
};

const JambQuestionBank: React.FC = () => {
  const fileRef = useRef<HTMLInputElement>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] =
    useState('all');
  const [difficultyFilter, setDifficultyFilter] =
    useState('all');
  const [statusFilter, setStatusFilter] =
    useState('active');
  const [page, setPage] = useState(1);

  const [editing, setEditing] =
    useState<Question | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] =
    useState<Form>(emptyForm);

  const [importRows, setImportRows] =
    useState<Record<string, string>[]>([]);
  const [importErrors, setImportErrors] =
    useState<string[]>([]);
  const [showImport, setShowImport] =
    useState(false);
  const [importing, setImporting] =
    useState(false);

  /**
   * FIX:
   * Load ALL questions instead of relying on a single
   * Supabase response, which is normally capped at 1000.
   */
  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data: subjectData, error: subjectError } =
        await supabase
          .from('jamb_subjects')
          .select('*')
          .order('sort_order');

      if (subjectError) {
        throw subjectError;
      }

      const allQuestions: Question[] = [];
      let offset = 0;

      while (true) {
        const {
          data: batch,
          error: questionError,
        } = await supabase
          .from('jamb_questions')
          .select(
            '*,subject:jamb_subjects(id,name,code,is_compulsory,is_active,sort_order)'
          )
          .order('created_at', {
            ascending: false,
          })
          .order('id', {
            ascending: false,
          })
          .range(
            offset,
            offset + FETCH_BATCH_SIZE - 1
          );

        if (questionError) {
          throw questionError;
        }

        const currentBatch =
          (batch || []) as Question[];

        allQuestions.push(...currentBatch);

        if (
          currentBatch.length <
          FETCH_BATCH_SIZE
        ) {
          break;
        }

        offset += FETCH_BATCH_SIZE;
      }

      setSubjects(
        (subjectData || []) as Subject[]
      );

      setQuestions(allQuestions);
    } catch (e: any) {
      console.error(
        'JAMB QUESTION BANK LOAD ERROR:',
        e
      );

      toast.error(
        e?.message ||
          'Unable to load question bank.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      questions.filter((q) => {
        const text =
          `${q.question_text} ${
            q.topic || ''
          } ${q.source || ''}`.toLowerCase();

        return (
          (!search ||
            text.includes(
              search.toLowerCase()
            )) &&
          (subjectFilter === 'all' ||
            q.subject_id === subjectFilter) &&
          (difficultyFilter === 'all' ||
            q.difficulty === difficultyFilter) &&
          (statusFilter === 'all' ||
            (statusFilter === 'active'
              ? q.is_active
              : !q.is_active))
        );
      }),
    [
      questions,
      search,
      subjectFilter,
      difficultyFilter,
      statusFilter,
    ]
  );

  useEffect(() => {
    setPage(1);
  }, [
    search,
    subjectFilter,
    difficultyFilter,
    statusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filtered.length / PAGE_SIZE
    )
  );

  const visible = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const activeCount = questions.filter(
    (q) => q.is_active
  ).length;

  const bySubject = useMemo(
    () =>
      subjects.map((s) => ({
        ...s,
        count: questions.filter(
          (q) => q.subject_id === s.id
        ).length,
      })),
    [subjects, questions]
  );

  const openCreate = () => {
    setEditing(null);

    setForm({
      ...emptyForm,
      subject_id:
        subjects[0]?.id || '',
    });

    setShowForm(true);
  };

  const openEdit = (q: Question) => {
    setEditing(q);

    setForm({
      subject_id: q.subject_id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      explanation: q.explanation || '',
      topic: q.topic || '',
      year: q.year
        ? String(q.year)
        : '',
      source: q.source || '',
      difficulty: q.difficulty,
      is_active: q.is_active,
    });

    setShowForm(true);
  };

  const validate = (f: Form) => {
    if (
      !f.subject_id ||
      !f.question_text.trim() ||
      !f.option_a.trim() ||
      !f.option_b.trim() ||
      !f.option_c.trim() ||
      !f.option_d.trim()
    ) {
      return 'Subject, question and all four options are required.';
    }

    if (
      !['A', 'B', 'C', 'D'].includes(
        f.correct_option
      )
    ) {
      return 'Correct option must be A, B, C or D.';
    }

    if (
      !['easy', 'medium', 'hard'].includes(
        f.difficulty
      )
    ) {
      return 'Invalid difficulty.';
    }

    if (
      f.year &&
      (!/^\d{4}$/.test(f.year) ||
        Number(f.year) < 1980 ||
        Number(f.year) >
          new Date().getFullYear() + 1)
    ) {
      return 'Enter a valid question year.';
    }

    return null;
  };

  const save = async () => {
    const error = validate(form);

    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);

    try {
      const payload = {
        subject_id: form.subject_id,
        question_text:
          form.question_text.trim(),
        option_a: form.option_a.trim(),
        option_b: form.option_b.trim(),
        option_c: form.option_c.trim(),
        option_d: form.option_d.trim(),
        correct_option:
          form.correct_option,
        explanation:
          form.explanation.trim() || null,
        topic:
          form.topic.trim() || null,
        year: form.year
          ? Number(form.year)
          : null,
        source:
          form.source.trim() || null,
        difficulty: form.difficulty,
        is_active: form.is_active,
      };

      const result = editing
        ? await supabase
            .from('jamb_questions')
            .update(payload)
            .eq('id', editing.id)
        : await supabase
            .from('jamb_questions')
            .insert(payload);

      if (result.error) {
        throw result.error;
      }

      toast.success(
        editing
          ? 'Question updated.'
          : 'Question added.'
      );

      setShowForm(false);

      await load();
    } catch (e: any) {
      toast.error(
        e?.message ||
          'Unable to save question.'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (q: Question) => {
    const { error } = await supabase
      .from('jamb_questions')
      .update({
        is_active: !q.is_active,
      })
      .eq('id', q.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      q.is_active
        ? 'Question deactivated.'
        : 'Question activated.'
    );

    await load();
  };

  const remove = async (q: Question) => {
    if (
      !window.confirm(
        'Delete this question permanently?'
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from('jamb_questions')
      .delete()
      .eq('id', q.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Question deleted.');

    await load();
  };

  const downloadTemplate = () => {
    const blob = new Blob(
      [csvTemplate],
      {
        type: 'text/csv;charset=utf-8',
      }
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement('a');

    a.href = url;
    a.download =
      'jamb_question_bank_template.csv';
    a.click();

    URL.revokeObjectURL(url);
  };

  const prepareImport = async (
    file: File
  ) => {
    try {
      const rows = parseCsv(
        await file.text()
      );

      if (rows.length < 2) {
        throw new Error(
          'The CSV has no data rows.'
        );
      }

      const headers =
        rows[0].map(normaliseHeader);

      const required = [
        'subject_code',
        'question_text',
        'option_a',
        'option_b',
        'option_c',
        'option_d',
        'correct_option',
      ];

      const missing = required.filter(
        (h) => !headers.includes(h)
      );

      if (missing.length) {
        throw new Error(
          `Missing CSV columns: ${missing.join(
            ', '
          )}`
        );
      }

      const subjectByCode =
        new Map(
          subjects.map((s) => [
            (s.code || '').toUpperCase(),
            s,
          ])
        );

      const mapped: Record<
        string,
        string
      >[] = [];

      const errors: string[] = [];

      rows
        .slice(1)
        .forEach((values, index) => {
          const row: Record<
            string,
            string
          > = {};

          headers.forEach((h, i) => {
            row[h] = (
              values[i] || ''
            ).trim();
          });

          const line = index + 2;

          const subject =
            subjectByCode.get(
              (
                row.subject_code ||
                ''
              ).toUpperCase()
            );

          if (!subject) {
            errors.push(
              `Row ${line}: unknown subject code "${row.subject_code}".`
            );
          }

          if (
            !row.question_text ||
            !row.option_a ||
            !row.option_b ||
            !row.option_c ||
            !row.option_d
          ) {
            errors.push(
              `Row ${line}: question and options A-D are required.`
            );
          }

          if (
            ![
              'A',
              'B',
              'C',
              'D',
            ].includes(
              (
                row.correct_option ||
                ''
              ).toUpperCase()
            )
          ) {
            errors.push(
              `Row ${line}: correct_option must be A, B, C or D.`
            );
          }

          const difficulty = (
            row.difficulty ||
            'medium'
          ).toLowerCase();

          if (
            ![
              'easy',
              'medium',
              'hard',
            ].includes(difficulty)
          ) {
            errors.push(
              `Row ${line}: difficulty must be easy, medium or hard.`
            );
          }

          if (
            row.year &&
            !/^\d{4}$/.test(row.year)
          ) {
            errors.push(
              `Row ${line}: year must be a four-digit number.`
            );
          }

          const hasRowError =
            errors.some((e) =>
              e.startsWith(
                `Row ${line}:`
              )
            );

          if (
            !hasRowError &&
            subject
          ) {
            mapped.push({
              ...row,
              subject_id:
                subject.id,
              difficulty,
            });
          }
        });

      setImportRows(mapped);
      setImportErrors(errors);
      setShowImport(true);
    } catch (e: any) {
      toast.error(
        e?.message ||
          'Unable to read CSV.'
      );
    } finally {
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    }
  };

  const importQuestions = async () => {
    if (
      !importRows.length ||
      importErrors.length
    ) {
      return;
    }

    setImporting(true);

    try {
      const payload =
        importRows.map((r) => ({
          subject_id: r.subject_id,
          question_text:
            r.question_text,
          option_a: r.option_a,
          option_b: r.option_b,
          option_c: r.option_c,
          option_d: r.option_d,
          correct_option:
            r.correct_option.toUpperCase(),
          explanation:
            r.explanation || null,
          topic: r.topic || null,
          year: r.year
            ? Number(r.year)
            : null,
          source:
            r.source ||
            'Authorized practice bank',
          difficulty:
            r.difficulty || 'medium',
          is_active: r.is_active
            ? r.is_active.toLowerCase() !==
              'false'
            : true,
        }));

      for (
        let i = 0;
        i < payload.length;
        i += 250
      ) {
        const {
          error,
        } = await supabase
          .from('jamb_questions')
          .insert(
            payload.slice(
              i,
              i + 250
            )
          );

        if (error) {
          throw error;
        }
      }

      toast.success(
        `${payload.length} questions imported successfully.`
      );

      setShowImport(false);
      setImportRows([]);
      setImportErrors([]);

      await load();
    } catch (e: any) {
      toast.error(
        e?.message ||
          'Import failed. No further batches were processed.'
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-sm">
            <BookOpen className="w-5 h-5" />
            <span>JAMB CBT</span>
          </div>

          <h1 className="text-2xl md:text-3xl text-gray-900 dark:text-white mt-1">
            Question Bank
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage authorized JAMB practice
            content and prepare CBT sessions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadTemplate}
            className="px-4 py-2.5 rounded-xl border dark:border-gray-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            CSV Template
          </button>

          <button
            onClick={() =>
              fileRef.current?.click()
            }
            className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>

          <button
            onClick={openCreate}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const file =
                e.target.files?.[0];

              if (file) {
                prepareImport(file);
              }
            }}
          />
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">
            Total questions
          </p>

          <p className="text-2xl mt-1">
            {questions.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">
            Active
          </p>

          <p className="text-2xl text-emerald-600 mt-1">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">
            Subjects covered
          </p>

          <p className="text-2xl mt-1">
            {
              subjects.filter((s) =>
                questions.some(
                  (q) =>
                    q.subject_id ===
                    s.id
                )
              ).length
            }
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">
            Matching filters
          </p>

          <p className="text-2xl text-indigo-600 mt-1">
            {filtered.length}
          </p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4">
          {/* FILTERS */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-4 grid md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search questions, topics..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border dark:border-gray-700 bg-transparent"
              />
            </div>

            <select
              value={subjectFilter}
              onChange={(e) =>
                setSubjectFilter(
                  e.target.value
                )
              }
              className="rounded-xl border dark:border-gray-700 bg-transparent px-3"
            >
              <option value="all">
                All subjects
              </option>

              {subjects.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                >
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={difficultyFilter}
              onChange={(e) =>
                setDifficultyFilter(
                  e.target.value
                )
              }
              className="rounded-xl border dark:border-gray-700 bg-transparent px-3"
            >
              <option value="all">
                All difficulty
              </option>
              <option value="easy">
                Easy
              </option>
              <option value="medium">
                Medium
              </option>
              <option value="hard">
                Hard
              </option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
              className="rounded-xl border dark:border-gray-700 bg-transparent px-3"
            >
              <option value="active">
                Active
              </option>
              <option value="inactive">
                Inactive
              </option>
              <option value="all">
                All status
              </option>
            </select>
          </div>

          {/* QUESTION LIST */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />

                <p className="text-sm text-gray-500">
                  Loading all JAMB questions...
                </p>
              </div>
            ) : visible.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />

                <p>
                  No questions match the
                  current filters.
                </p>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-700">
                {visible.map((q) => (
                  <div
                    key={q.id}
                    className="p-5 hover:bg-gray-50 dark:hover:bg-gray-900/30"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs">
                            {q.subject?.name ||
                              'Subject'}
                          </span>

                          <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs">
                            {q.difficulty}
                          </span>

                          {q.year && (
                            <span className="text-xs text-gray-500">
                              {q.year}
                            </span>
                          )}

                          <span
                            className={`text-xs ${
                              q.is_active
                                ? 'text-emerald-600'
                                : 'text-gray-400'
                            }`}
                          >
                            {q.is_active
                              ? 'Active'
                              : 'Inactive'}
                          </span>
                        </div>

                        <p className="text-gray-900 dark:text-white leading-relaxed">
                          {q.question_text}
                        </p>

                        <div className="grid md:grid-cols-2 gap-2 mt-3 text-sm text-gray-600 dark:text-gray-300">
                          <div>
                            A. {q.option_a}
                          </div>

                          <div>
                            B. {q.option_b}
                          </div>

                          <div>
                            C. {q.option_c}
                          </div>

                          <div>
                            D. {q.option_d}
                          </div>
                        </div>

                        <div className="mt-3 text-xs text-gray-500">
                          Correct:{' '}
                          <span className="text-indigo-600">
                            {q.correct_option}
                          </span>

                          {q.topic && (
                            <>
                              {' '}
                              · Topic:{' '}
                              {q.topic}
                            </>
                          )}

                          {q.source && (
                            <>
                              {' '}
                              · Source:{' '}
                              {q.source}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-2">
                        <button
                          onClick={() =>
                            openEdit(q)
                          }
                          className="p-2 rounded-lg border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() =>
                            toggle(q)
                          }
                          className="p-2 rounded-lg border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Toggle"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() =>
                            remove(q)
                          }
                          className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PAGINATION */}
            {filtered.length >
              PAGE_SIZE && (
              <div className="p-4 border-t dark:border-gray-700 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Showing{' '}
                  {(page - 1) *
                    PAGE_SIZE +
                    1}{' '}
                  -
                  {Math.min(
                    page * PAGE_SIZE,
                    filtered.length
                  )}{' '}
                  of {filtered.length}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 mr-2">
                    Page {page} of{' '}
                    {totalPages}
                  </span>

                  <button
                    disabled={page === 1}
                    onClick={() =>
                      setPage(
                        (p) => p - 1
                      )
                    }
                    className="p-2 rounded-lg border disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    disabled={
                      page ===
                      totalPages
                    }
                    onClick={() =>
                      setPage(
                        (p) => p + 1
                      )
                    }
                    className="p-2 rounded-lg border disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COVERAGE */}
        <aside className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 h-fit">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg text-gray-900 dark:text-white">
                Coverage
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                Questions by subject
              </p>
            </div>

            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>

          <div className="space-y-5 mt-6">
            {bySubject.map(
              (s, index) => {
                const Icon =
                  getSubjectIcon(
                    s.name
                  );

                const code =
                  getSubjectCode(s);

                const colors =
                  getSubjectColors(
                    index
                  );

                const pct =
                  questions.length
                    ? (s.count /
                        questions.length) *
                      100
                    : 0;

                return (
                  <div
                    key={s.id}
                    className="group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105`}
                        >
                          <Icon
                            className={`w-6 h-6 ${colors.icon}`}
                            strokeWidth={2}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                            {s.name}
                          </p>

                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                            {code}
                          </p>
                        </div>
                      </div>

                      <span className="text-sm text-gray-500 flex-shrink-0">
                        {s.count}
                      </span>
                    </div>

                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 mt-2.5 overflow-hidden">
                      <div
                        className={`h-full ${colors.bar} transition-all duration-500`}
                        style={{
                          width: s.count
                            ? `${Math.min(
                                100,
                                Math.max(
                                  8,
                                  pct
                                )
                              )}%`
                            : '0%',
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </aside>
      </div>

      {/* QUESTION FORM */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-3xl shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 p-5 flex justify-between items-center">
              <div>
                <h2 className="text-xl">
                  {editing
                    ? 'Edit question'
                    : 'Add question'}
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  Correct answers are stored
                  server-side and never
                  returned to students.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowForm(false)
                }
              >
                <X />
              </button>
            </div>

            <div className="p-5 grid gap-4">
              <div className="grid md:grid-cols-3 gap-3">
                <label className="text-sm md:col-span-2">
                  Subject

                  <select
                    value={
                      form.subject_id
                    }
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        subject_id:
                          e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border p-3 bg-transparent"
                  >
                    {subjects.map(
                      (s) => (
                        <option
                          key={s.id}
                          value={s.id}
                        >
                          {s.name}{' '}
                          {s.is_compulsory
                            ? '(Compulsory)'
                            : ''}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="text-sm">
                  Year

                  <input
                    value={form.year}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        year: e.target.value,
                      }))
                    }
                    placeholder="2025"
                    className="mt-1 w-full rounded-xl border p-3 bg-transparent"
                  />
                </label>
              </div>

              <label className="text-sm">
                Question

                <textarea
                  rows={4}
                  value={
                    form.question_text
                  }
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      question_text:
                        e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border p-3 bg-transparent"
                />
              </label>

              <div className="grid md:grid-cols-2 gap-3">
                {(
                  [
                    'a',
                    'b',
                    'c',
                    'd',
                  ] as const
                ).map((letter) => (
                  <label
                    key={letter}
                    className="text-sm"
                  >
                    Option{' '}
                    {letter.toUpperCase()}

                    <input
                      value={
                        form[
                          `option_${letter}`
                        ]
                      }
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          [`option_${letter}`]:
                            e.target
                              .value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border p-3 bg-transparent"
                    />
                  </label>
                ))}
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <label className="text-sm">
                  Correct option

                  <select
                    value={
                      form.correct_option
                    }
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        correct_option:
                          e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border p-3 bg-transparent"
                  >
                    <option>A</option>
                    <option>B</option>
                    <option>C</option>
                    <option>D</option>
                  </select>
                </label>

                <label className="text-sm">
                  Difficulty

                  <select
                    value={
                      form.difficulty
                    }
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        difficulty:
                          e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border p-3 bg-transparent"
                  >
                    <option value="easy">
                      Easy
                    </option>
                    <option value="medium">
                      Medium
                    </option>
                    <option value="hard">
                      Hard
                    </option>
                  </select>
                </label>

                <label className="text-sm">
                  Topic

                  <input
                    value={form.topic}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        topic: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border p-3 bg-transparent"
                  />
                </label>
              </div>

              <label className="text-sm">
                Explanation

                <textarea
                  rows={3}
                  value={
                    form.explanation
                  }
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      explanation:
                        e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border p-3 bg-transparent"
                />
              </label>

              <label className="text-sm">
                Source

                <input
                  value={form.source}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      source:
                        e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border p-3 bg-transparent"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={
                    form.is_active
                  }
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      is_active:
                        e.target.checked,
                    }))
                  }
                />

                Active and available
                for CBT practice
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="px-5 py-3 rounded-xl border"
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  onClick={save}
                  className="px-5 py-3 rounded-xl bg-indigo-600 text-white flex items-center gap-2"
                >
                  {saving && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}

                  <Check className="w-4 h-4" />

                  Save Question
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT PREVIEW */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-3xl shadow-2xl">
            <div className="p-5 border-b dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl">
                  CSV Import Preview
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  {importRows.length}{' '}
                  valid rows ready
                  for import.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowImport(false)
                }
              >
                <X />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {importErrors.length >
                0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="flex gap-2 text-red-700">
                    <AlertTriangle className="w-5 h-5" />

                    <span>
                      Fix these CSV
                      errors before
                      importing
                    </span>
                  </div>

                  <div className="mt-2 max-h-48 overflow-auto text-sm text-red-700 space-y-1">
                    {importErrors
                      .slice(0, 100)
                      .map(
                        (
                          error,
                          index
                        ) => (
                          <p
                            key={
                              index
                            }
                          >
                            {error}
                          </p>
                        )
                      )}

                    {importErrors.length >
                      100 && (
                      <p>
                        …and{' '}
                        {importErrors.length -
                          100}{' '}
                        more.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!importErrors.length && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 flex items-center gap-2">
                  <Check className="w-5 h-5" />

                  <span>
                    CSV validation
                    passed.{' '}
                    {
                      importRows.length
                    }{' '}
                    questions are
                    ready.
                  </span>
                </div>
              )}

              <div className="overflow-auto border rounded-xl">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left p-3">
                        #
                      </th>

                      <th className="text-left p-3">
                        Subject
                      </th>

                      <th className="text-left p-3">
                        Question
                      </th>

                      <th className="text-left p-3">
                        Answer
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {importRows
                      .slice(0, 25)
                      .map(
                        (
                          row,
                          index
                        ) => (
                          <tr
                            key={
                              index
                            }
                            className="border-t dark:border-gray-700"
                          >
                            <td className="p-3">
                              {index +
                                1}
                            </td>

                            <td className="p-3">
                              {
                                row.subject_code
                              }
                            </td>

                            <td className="p-3 max-w-md">
                              {
                                row.question_text
                              }
                            </td>

                            <td className="p-3">
                              {
                                row.correct_option
                              }
                            </td>
                          </tr>
                        )
                      )}
                  </tbody>
                </table>
              </div>

              {importRows.length >
                25 && (
                <p className="text-xs text-gray-500">
                  Showing first 25
                  of{' '}
                  {
                    importRows.length
                  }{' '}
                  rows.
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() =>
                    setShowImport(false)
                  }
                  className="px-5 py-3 rounded-xl border"
                >
                  Cancel
                </button>

                <button
                  disabled={
                    !!importErrors.length ||
                    !importRows.length ||
                    importing
                  }
                  onClick={
                    importQuestions
                  }
                  className="px-5 py-3 rounded-xl bg-emerald-600 text-white flex items-center gap-2 disabled:opacity-40"
                >
                  {importing && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}

                  <FileUp className="w-4 h-4" />

                  Import{' '}
                  {
                    importRows.length
                  }{' '}
                  Questions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JambQuestionBank;