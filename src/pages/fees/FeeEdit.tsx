
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  Coins,
  CreditCard,
  Edit3,
  GraduationCap,
  Info,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  UserRound,
  X,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../config/supabase/client';
import { toast } from 'react-hot-toast';

type TargetType = 'all' | 'class' | 'student';
type PaymentFrequency =
  | 'one_time'
  | 'termly'
  | 'sessionally'
  | 'monthly'
  | 'yearly';

type Eligibility =
  | 'all_students'
  | 'new_students_only'
  | 'old_students_only'
  | 'unadmitted_only'
  | 'new_and_unadmitted';

type AmountChangeMode = 'new_only' | 'existing';

interface BreakdownItem {
  id: string;
  item_name: string;
  description: string;
  amount: number;
  is_mandatory: boolean;
  is_optional: boolean;
  percentage_of_total?: number;
}

interface FeeRecord {
  id: string;
  fee_id?: string | null;
  branch_id: string;
  class_id?: string | null;
  category: string;
  name: string;
  description?: string | null;
  amount: number;
  due_date?: string | null;
  late_fee_amount?: number | null;
  installment_allowed?: boolean | null;
  number_of_installments?: number | null;
  is_mandatory?: boolean | null;
  is_optional?: boolean | null;
  is_recurring?: boolean | null;
  recurrence_period?: string | null;
  status?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, any> | null;
  term?: string | null;
  session?: string | null;
  payment_frequency?: PaymentFrequency | null;
  student_eligibility?: Eligibility | null;
  fee_template_id?: string | null;
  is_template_instance?: boolean | null;
  instance_session?: string | null;
  instance_term?: string | null;
  academic_session_id?: string | null;
  target_type?: TargetType | null;
  target_ids?: string[] | null;
  apply_to_future_students?: boolean | null;
  applies_to_groups?: string[] | null;
  created_for_session?: string | null;
}

interface ClassRecord {
  id: string;
  name: string;
  code?: string | null;
  level?: string | null;
  branch_id?: string | null;
}

interface StudentRecord {
  id: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  admission_number?: string | null;
  student_id?: string | null;
  class_id?: string | null;
  branch_id?: string | null;
  current_status?: string | null;
  admission_status?: string | null;
}

interface AssignmentRecord {
  id: string;
  assignment_id: string;
  student_id: string;
  fee_id: string;
  original_amount: number;
  discount_amount: number;
  amount_due: number;
  amount_paid: number;
  balance: number;
  payment_status:
    | 'unpaid'
    | 'partial'
    | 'paid'
    | 'overdue'
    | 'waived'
    | 'inactive';
  due_date?: string | null;
  is_active?: boolean | null;
}

interface AssignmentHealth {
  active: number;
  paid: number;
  currentDue: number;
  balance: number;
}

const BRANCH_OWO = '11111111-1111-1111-1111-111111111111';

const PAYMENT_FREQUENCIES: {
  value: PaymentFrequency;
  label: string;
}[] = [
  { value: 'one_time', label: 'One time' },
  { value: 'termly', label: 'Termly' },
  { value: 'sessionally', label: 'Sessionally' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const ELIGIBILITY_OPTIONS: {
  value: Eligibility;
  label: string;
}[] = [
  { value: 'all_students', label: 'All students' },
  { value: 'new_students_only', label: 'New students only' },
  { value: 'old_students_only', label: 'Old students only' },
  { value: 'unadmitted_only', label: 'Unadmitted students only' },
  {
    value: 'new_and_unadmitted',
    label: 'New and unadmitted students',
  },
];

const TERM_OPTIONS = [
  'First Term',
  'Second Term',
  'Third Term',
];

const CATEGORY_OPTIONS = [
  'School Fees',
  'Tuition',
  'Books',
  'Uniform',
  'Transport',
  'Examination',
  'Laboratory',
  'ICT',
  'Other',
];

const SESSION_OPTIONS = Array.from({ length: 8 }, (_, index) => {
  const start = 2024 + index;
  return `${start}/${start + 1}`;
});

const money = (value: number) =>
  `₦${new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)}`;

const numberValue = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: number) =>
  Math.round((numberValue(value) + Number.EPSILON) * 100) / 100;

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getStudentName = (student: StudentRecord) =>
  [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Unnamed Student';

const getClassName = (
  classId: string | null | undefined,
  classes: ClassRecord[],
) =>
  classes.find((item) => item.id === classId)?.name ||
  'Not Assigned';

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'ST';

const normaliseTargetType = (value: any): TargetType => {
  const target = String(value || '').toLowerCase();

  if (target === 'student' || target === 'students') return 'student';
  if (target === 'class' || target === 'classes') return 'class';

  return 'all';
};

const normaliseEligibility = (value: any): Eligibility => {
  const valid = ELIGIBILITY_OPTIONS.some(
    (item) => item.value === value,
  );

  return valid ? value : 'all_students';
};

const normaliseFrequency = (value: any): PaymentFrequency => {
  const valid = PAYMENT_FREQUENCIES.some(
    (item) => item.value === value,
  );

  return valid ? value : 'termly';
};

const extractBreakdown = (
  metadata: Record<string, any> | null | undefined,
  feeAmount: number,
): BreakdownItem[] => {
  const raw = metadata?.fee_breakdown;

  if (raw?.items && Array.isArray(raw.items)) {
    return raw.items.map((item: any, index: number) => ({
      id: String(item.id || makeId()),
      item_name: String(
        item.item_name || item.name || `Item ${index + 1}`,
      ),
      description: String(item.description || ''),
      amount: numberValue(item.amount),
      is_mandatory:
        item.is_mandatory !== false &&
        item.is_optional !== true,
      is_optional:
        item.is_optional === true ||
        item.is_mandatory === false,
      percentage_of_total: numberValue(
        item.percentage_of_total,
      ),
    }));
  }

  if (feeAmount > 0) {
    return [
      {
        id: makeId(),
        item_name: 'Fee Amount',
        description: '',
        amount: feeAmount,
        is_mandatory: true,
        is_optional: false,
        percentage_of_total: 100,
      },
    ];
  }

  return [
    {
      id: makeId(),
      item_name: '',
      description: '',
      amount: 0,
      is_mandatory: true,
      is_optional: false,
      percentage_of_total: 0,
    },
  ];
};

const calculateBreakdownTotal = (items: BreakdownItem[]) =>
  roundMoney(
    items.reduce(
      (total, item) => total + numberValue(item.amount),
      0,
    ),
  );

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100';

const cardClass =
  'rounded-2xl border border-slate-200 bg-white shadow-sm';

const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50';

const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50';

export default function FeeEdit() {
  const navigate = useNavigate();
  const params = useParams();

  const feeRouteId =
    params.id ||
    params.feeId ||
    params.fee_id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fee, setFee] = useState<FeeRecord | null>(null);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);

  const [feeName, setFeeName] = useState('');
  const [category, setCategory] = useState('School Fees');
  const [frequency, setFrequency] =
    useState<PaymentFrequency>('termly');
  const [session, setSession] = useState('');
  const [term, setTerm] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lateFee, setLateFee] = useState('0');
  const [description, setDescription] = useState('');

  const [eligibility, setEligibility] =
    useState<Eligibility>('all_students');

  const [mandatory, setMandatory] = useState(true);
  const [optional, setOptional] = useState(false);
  const [installments, setInstallments] = useState(false);
  const [numberOfInstallments, setNumberOfInstallments] =
    useState('1');

  const [targetType, setTargetType] =
    useState<TargetType>('all');

  const [selectedClassIds, setSelectedClassIds] = useState<
    string[]
  >([]);

  const [selectedStudentIds, setSelectedStudentIds] =
    useState<string[]>([]);

  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);

  const [amountChangeMode, setAmountChangeMode] =
    useState<AmountChangeMode>('new_only');

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  const [showAllStudents, setShowAllStudents] =
    useState(false);

  const [showClassPicker, setShowClassPicker] =
    useState(false);

  const [showStudentPicker, setShowStudentPicker] =
    useState(false);

  const fetchFee = useCallback(async () => {
    if (!feeRouteId) {
      toast.error('Fee ID is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let feeData: FeeRecord | null = null;
      let feeError: any = null;

      const firstQuery = await supabase
        .from('fees')
        .select('*')
        .eq('id', feeRouteId)
        .maybeSingle();

      feeData = firstQuery.data as FeeRecord | null;
      feeError = firstQuery.error;

      if (!feeData && !feeError) {
        const fallback = await supabase
          .from('fees')
          .select('*')
          .eq('fee_id', feeRouteId)
          .maybeSingle();

        feeData = fallback.data as FeeRecord | null;
        feeError = fallback.error;
      }

      if (feeError) throw feeError;

      if (!feeData) {
        throw new Error('Fee could not be found.');
      }

      setFee(feeData);

      setFeeName(feeData.name || '');
      setCategory(feeData.category || 'School Fees');
      setFrequency(
        normaliseFrequency(feeData.payment_frequency),
      );
      setSession(feeData.session || '');
      setTerm(feeData.term || '');
      setDueDate(feeData.due_date || '');
      setLateFee(
        String(numberValue(feeData.late_fee_amount)),
      );
      setDescription(feeData.description || '');

      setEligibility(
        normaliseEligibility(
          feeData.student_eligibility ||
            feeData.metadata?.student_eligibility,
        ),
      );

      setMandatory(
        feeData.is_mandatory !== false &&
          feeData.is_optional !== true,
      );

      setOptional(
        feeData.is_optional === true ||
          feeData.is_mandatory === false,
      );

      setInstallments(
        feeData.installment_allowed === true,
      );

      setNumberOfInstallments(
        String(
          Math.max(
            1,
            numberValue(feeData.number_of_installments) ||
              1,
          ),
        ),
      );

      const resolvedTargetType = normaliseTargetType(
        feeData.target_type ||
          feeData.metadata?.target_type,
      );

      const metadataTargetIds =
        Array.isArray(feeData.metadata?.target_ids)
          ? feeData.metadata.target_ids
          : [];

      const databaseTargetIds = Array.isArray(
        feeData.target_ids,
      )
        ? feeData.target_ids
        : [];

      const resolvedTargetIds =
        databaseTargetIds.length > 0
          ? databaseTargetIds
          : metadataTargetIds;

      setTargetType(resolvedTargetType);

      if (resolvedTargetType === 'class') {
        setSelectedClassIds(resolvedTargetIds);
        setSelectedStudentIds([]);
      } else if (resolvedTargetType === 'student') {
        setSelectedStudentIds(resolvedTargetIds);
        setSelectedClassIds([]);
      } else {
        setSelectedClassIds([]);
        setSelectedStudentIds([]);
      }

      setBreakdown(
        extractBreakdown(
          feeData.metadata,
          numberValue(feeData.amount),
        ),
      );

      const [classesResult, studentsResult, assignmentsResult] =
        await Promise.all([
          supabase
            .from('classes')
            .select('id,name,code,level,branch_id')
            .eq('branch_id', feeData.branch_id)
            .order('name', { ascending: true }),

          supabase
            .from('students')
            .select(
              `
                id,
                first_name,
                middle_name,
                last_name,
                admission_number,
                student_id,
                class_id,
                branch_id,
                current_status,
                admission_status
              `,
            )
            .eq('branch_id', feeData.branch_id)
            .order('first_name', { ascending: true }),

          supabase
            .from('student_fee_assignments')
            .select(
              `
                id,
                assignment_id,
                student_id,
                fee_id,
                original_amount,
                discount_amount,
                amount_due,
                amount_paid,
                balance,
                payment_status,
                due_date,
                is_active
              `,
            )
            .eq('fee_id', feeData.id),
        ]);

      if (classesResult.error) {
        console.warn(
          'Could not load classes:',
          classesResult.error,
        );
      }

      if (studentsResult.error) {
        console.warn(
          'Could not load students:',
          studentsResult.error,
        );
      }

      if (assignmentsResult.error) {
        console.warn(
          'Could not load assignments:',
          assignmentsResult.error,
        );
      }

      setClasses(
        (classesResult.data || []) as ClassRecord[],
      );

      setStudents(
        (studentsResult.data || []) as StudentRecord[],
      );

      setAssignments(
        (assignmentsResult.data ||
          []) as AssignmentRecord[],
      );
    } catch (error: any) {
      console.error('FeeEdit load error:', error);
      toast.error(
        error?.message || 'Failed to load fee.',
      );
      setFee(null);
    } finally {
      setLoading(false);
    }
  }, [feeRouteId]);

  useEffect(() => {
    fetchFee();
  }, [fetchFee]);

  const breakdownTotal = useMemo(
    () => calculateBreakdownTotal(breakdown),
    [breakdown],
  );

  const databaseAmount = useMemo(
    () => numberValue(fee?.amount),
    [fee],
  );

  const amountDifference = useMemo(
    () => roundMoney(breakdownTotal - databaseAmount),
    [breakdownTotal, databaseAmount],
  );

  const hasAmountMismatch =
    Math.abs(amountDifference) > 0.009;

  const activeAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) => assignment.is_active !== false,
      ),
    [assignments],
  );

  const assignmentHealth = useMemo<AssignmentHealth>(() => {
    let paid = 0;
    let currentDue = 0;
    let balance = 0;

    for (const assignment of activeAssignments) {
      paid += numberValue(assignment.amount_paid);
      currentDue += numberValue(assignment.amount_due);
      balance += Math.max(
        0,
        numberValue(assignment.balance),
      );
    }

    return {
      active: activeAssignments.length,
      paid: roundMoney(paid),
      currentDue: roundMoney(currentDue),
      balance: roundMoney(balance),
    };
  }, [activeAssignments]);

  const finalAmount = breakdownTotal;

  const targetCount = useMemo(() => {
    if (targetType === 'all') {
      return students.length;
    }

    if (targetType === 'class') {
      const selected = new Set(selectedClassIds);

      return students.filter((student) =>
        selected.has(student.class_id || ''),
      ).length;
    }

    const selected = new Set(selectedStudentIds);

    return students.filter((student) =>
      selected.has(student.id),
    ).length;
  }, [
    targetType,
    students,
    selectedClassIds,
    selectedStudentIds,
  ]);

  const filteredClasses = useMemo(() => {
    const termSearch = search.trim().toLowerCase();

    return classes.filter((item) => {
      if (!termSearch) return true;

      return (
        item.name?.toLowerCase().includes(termSearch) ||
        item.code?.toLowerCase().includes(termSearch) ||
        item.level?.toLowerCase().includes(termSearch)
      );
    });
  }, [classes, search]);

  const filteredStudents = useMemo(() => {
    const termSearch = search.trim().toLowerCase();

    return students.filter((student) => {
      const studentClass =
        getClassName(student.class_id, classes);

      const matchesSearch =
        !termSearch ||
        getStudentName(student)
          .toLowerCase()
          .includes(termSearch) ||
        String(student.admission_number || '')
          .toLowerCase()
          .includes(termSearch) ||
        String(student.student_id || '')
          .toLowerCase()
          .includes(termSearch) ||
        studentClass.toLowerCase().includes(termSearch);

      const matchesClass =
        classFilter === 'all' ||
        student.class_id === classFilter;

      return matchesSearch && matchesClass;
    });
  }, [students, classes, search, classFilter]);

  const displayedStudents = useMemo(
    () =>
      showAllStudents
        ? filteredStudents
        : filteredStudents.slice(0, 80),
    [filteredStudents, showAllStudents],
  );

  const selectedTargetLabels = useMemo(() => {
    if (targetType === 'all') {
      return ['All Students'];
    }

    if (targetType === 'class') {
      return selectedClassIds.map(
        (id) =>
          classes.find((item) => item.id === id)?.name ||
          'Unknown Class',
      );
    }

    return selectedStudentIds.map(
      (id) =>
        students.find((item) => item.id === id)
          ? getStudentName(
              students.find(
                (item) => item.id === id,
              ) as StudentRecord,
            )
          : 'Unknown Student',
    );
  }, [
    targetType,
    selectedClassIds,
    selectedStudentIds,
    classes,
    students,
  ]);

  const currentStudentsInTarget = useMemo(() => {
    if (targetType === 'all') return students;

    if (targetType === 'class') {
      const selected = new Set(selectedClassIds);

      return students.filter((student) =>
        selected.has(student.class_id || ''),
      );
    }

    const selected = new Set(selectedStudentIds);

    return students.filter((student) =>
      selected.has(student.id),
    );
  }, [
    targetType,
    selectedClassIds,
    selectedStudentIds,
    students,
  ]);

  const toggleClass = (classId: string) => {
    setSelectedClassIds((current) =>
      current.includes(classId)
        ? current.filter((id) => id !== classId)
        : [...current, classId],
    );
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  };

  const removeTarget = (id: string) => {
    if (targetType === 'class') {
      setSelectedClassIds((current) =>
        current.filter((item) => item !== id),
      );
    }

    if (targetType === 'student') {
      setSelectedStudentIds((current) =>
        current.filter((item) => item !== id),
      );
    }
  };

  const addBreakdownItem = () => {
    setBreakdown((current) => [
      ...current,
      {
        id: makeId(),
        item_name: '',
        description: '',
        amount: 0,
        is_mandatory: true,
        is_optional: false,
        percentage_of_total: 0,
      },
    ]);
  };

  const updateBreakdownItem = (
    id: string,
    changes: Partial<BreakdownItem>,
  ) => {
    setBreakdown((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...changes,
              amount:
                changes.amount !== undefined
                  ? numberValue(changes.amount)
                  : item.amount,
            }
          : item,
      ),
    );
  };

  const removeBreakdownItem = (id: string) => {
    setBreakdown((current) => {
      if (current.length <= 1) {
        return [
          {
            id: makeId(),
            item_name: '',
            description: '',
            amount: 0,
            is_mandatory: true,
            is_optional: false,
            percentage_of_total: 0,
          },
        ];
      }

      return current.filter((item) => item.id !== id);
    });
  };

  const markBreakdownMandatory = (
    id: string,
    value: boolean,
  ) => {
    updateBreakdownItem(id, {
      is_mandatory: value,
      is_optional: !value,
    });
  };

  const selectTargetType = (type: TargetType) => {
    setTargetType(type);

    if (type === 'all') {
      setSelectedClassIds([]);
      setSelectedStudentIds([]);
    }

    if (type === 'class') {
      setSelectedStudentIds([]);
    }

    if (type === 'student') {
      setSelectedClassIds([]);
    }
  };

  const validateBeforeSave = () => {
    if (!fee) {
      toast.error('Fee information is unavailable.');
      return false;
    }

    if (!feeName.trim()) {
      toast.error('Enter a fee name.');
      return false;
    }

    if (finalAmount <= 0) {
      toast.error(
        'The fee breakdown must contain a payable amount greater than ₦0.',
      );
      return false;
    }

    const emptyItem = breakdown.find(
      (item) =>
        !item.item_name.trim() &&
        numberValue(item.amount) > 0,
    );

    if (emptyItem) {
      toast.error(
        'Give every breakdown item a name.',
      );
      return false;
    }

    if (
      targetType === 'class' &&
      selectedClassIds.length === 0
    ) {
      toast.error(
        'Select at least one class for class targeting.',
      );
      return false;
    }

    if (
      targetType === 'student' &&
      selectedStudentIds.length === 0
    ) {
      toast.error(
        'Select at least one student for student targeting.',
      );
      return false;
    }

    if (
      installments &&
      Math.max(1, Number(numberOfInstallments)) < 2
    ) {
      toast.error(
        'Choose at least 2 installments when installments are enabled.',
      );
      return false;
    }

    return true;
  };

  const saveAssignmentsForAmountChange = async (
    newAmount: number,
  ) => {
    if (amountChangeMode !== 'existing') {
      return;
    }

    if (activeAssignments.length === 0) {
      return;
    }

    const updates = activeAssignments.map(
      (assignment) => {
        const paid = Math.max(
          0,
          numberValue(assignment.amount_paid),
        );

        const discount = Math.max(
          0,
          numberValue(assignment.discount_amount),
        );

        const newDue = Math.max(
          0,
          roundMoney(newAmount - discount),
        );

        const newBalance = Math.max(
          0,
          roundMoney(newDue - paid),
        );

        let status:
          | 'unpaid'
          | 'partial'
          | 'paid'
          | 'overdue' = 'unpaid';

        if (paid >= newDue && newDue > 0) {
          status = 'paid';
        } else if (newDue <= 0) {
          status = 'paid';
        } else if (paid > 0) {
          status = 'partial';
        } else if (
          assignment.due_date &&
          new Date(
            assignment.due_date,
          ).getTime() <
            new Date().setHours(0, 0, 0, 0)
        ) {
          status = 'overdue';
        }

        return {
          id: assignment.id,
          original_amount: newAmount,
          amount_due: newDue,
          balance: newBalance,
          payment_status: status,
          updated_at: new Date().toISOString(),
        };
      },
    );

    for (const update of updates) {
      const { error } = await supabase
        .from('student_fee_assignments')
        .update({
          original_amount: update.original_amount,
          amount_due: update.amount_due,
          balance: update.balance,
          payment_status: update.payment_status,
          updated_at: update.updated_at,
        })
        .eq('id', update.id);

      if (error) {
        throw error;
      }
    }
  };

  const deactivateRemovedAssignments = async () => {
    if (!fee) return;

    const desiredStudentIds = new Set(
      currentStudentsInTarget.map(
        (student) => student.id,
      ),
    );

    const activeAssignmentsToDeactivate =
      activeAssignments.filter(
        (assignment) =>
          !desiredStudentIds.has(
            assignment.student_id,
          ),
      );

    if (
      activeAssignmentsToDeactivate.length === 0
    ) {
      return;
    }

    for (const assignment of activeAssignmentsToDeactivate) {
      const { error } = await supabase
        .from('student_fee_assignments')
        .update({
          is_active: false,
          payment_status: 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignment.id);

      if (error) {
        throw error;
      }
    }
  };

  const reactivateOrCreateAssignments = async () => {
    if (!fee) return;

    /*
     * We deliberately do not blindly delete fee assignments.
     * Existing payment history must remain intact.
     */

    const desiredStudentIds = new Set(
      currentStudentsInTarget.map(
        (student) => student.id,
      ),
    );

    if (desiredStudentIds.size === 0) return;

    const existingByStudent = new Map<
      string,
      AssignmentRecord
    >();

    for (const assignment of assignments) {
      existingByStudent.set(
        assignment.student_id,
        assignment,
      );
    }

    for (const studentId of desiredStudentIds) {
      const existing =
        existingByStudent.get(studentId);

      if (existing) {
        if (existing.is_active === false) {
          const paid = Math.max(
            0,
            numberValue(existing.amount_paid),
          );

          const discount = Math.max(
            0,
            numberValue(existing.discount_amount),
          );

          const due = Math.max(
            0,
            roundMoney(finalAmount - discount),
          );

          const balance = Math.max(
            0,
            roundMoney(due - paid),
          );

          let status:
            | 'unpaid'
            | 'partial'
            | 'paid'
            | 'overdue' = 'unpaid';

          if (due <= 0 || paid >= due) {
            status = 'paid';
          } else if (paid > 0) {
            status = 'partial';
          } else if (
            dueDate &&
            new Date(dueDate).getTime() <
              new Date().setHours(0, 0, 0, 0)
          ) {
            status = 'overdue';
          }

          const { error } = await supabase
            .from('student_fee_assignments')
            .update({
              original_amount: finalAmount,
              amount_due: due,
              balance,
              due_date: dueDate || null,
              is_active: true,
              payment_status: status,
              session: session || null,
              term: term || null,
              payment_frequency: frequency,
              updated_at:
                new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (error) throw error;
        }

        continue;
      }

      /*
       * The existing database function handles assignment
       * generation and student eligibility safely.
       *
       * We call the student-specific function only for students
       * newly included in the fee target.
       */
      const { error } = await supabase.rpc(
        'assign_fees_to_student',
        {
          p_student_id: studentId,
        },
      );

      if (error) {
        /*
         * Do not fail the entire save merely because a student
         * could not be assigned by the generic eligibility
         * function. The fee itself has already been saved.
         */
        console.warn(
          `Could not auto-assign fee to student ${studentId}:`,
          error,
        );
      }
    }
  };

  const saveFee = async () => {
    if (!validateBeforeSave() || !fee) {
      return;
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();

      const existingMetadata =
        fee.metadata || {};

      const cleanItems = breakdown.map(
        (item, index) => ({
          id: item.id || makeId(),
          item_name:
            item.item_name.trim() ||
            `Item ${index + 1}`,
          description:
            item.description?.trim() || '',
          amount: roundMoney(item.amount),
          is_optional:
            item.is_optional === true,
          is_mandatory:
            item.is_mandatory !== false &&
            item.is_optional !== true,
          percentage_of_total:
            finalAmount > 0
              ? roundMoney(
                  (numberValue(item.amount) /
                    finalAmount) *
                    100,
                )
              : 0,
        }),
      );

      const metadata = {
        ...existingMetadata,

        target_type: targetType,
        target_ids:
          targetType === 'class'
            ? selectedClassIds
            : targetType === 'student'
              ? selectedStudentIds
              : [],

        class_ids:
          targetType === 'class'
            ? selectedClassIds
            : [],

        student_ids:
          targetType === 'student'
            ? selectedStudentIds
            : [],

        group_ids:
          existingMetadata.group_ids || [],

        fee_breakdown: {
          items: cleanItems,
          total_amount: finalAmount,
        },

        payment_frequency: frequency,
        student_eligibility: eligibility,
        apply_to_future_students:
          fee.apply_to_future_students !== false,

        recurrence:
          existingMetadata.recurrence ?? null,

        recurrence_label:
          frequency === 'termly'
            ? term
              ? `${term} Only`
              : 'Termly'
            : frequency,

        last_editor_change: now,
        edited_by_premium_fee_editor: true,

        amount_change_behavior:
          amountChangeMode,

        previous_amount: databaseAmount,
        new_amount: finalAmount,
      };

      /*
       * IMPORTANT:
       * `student_eligibility` receives only valid database
       * eligibility values. Targeting remains in target_type
       * and target_ids.
       */
      const updatePayload = {
        name: feeName.trim(),
        category,
        description:
          description.trim() || null,
        amount: finalAmount,
        due_date: dueDate || null,
        late_fee_amount:
          Math.max(0, numberValue(lateFee)),
        installment_allowed:
          installments,
        number_of_installments: installments
          ? Math.max(
              2,
              Math.floor(
                numberValue(
                  numberOfInstallments,
                ),
              ),
            )
          : 1,
        is_mandatory:
          mandatory && !optional,
        is_optional:
          optional,
        payment_frequency:
          frequency,
        student_eligibility:
          eligibility,

        term: term || null,
        session: session || null,

        target_type:
          targetType,
        target_ids:
          targetType === 'class'
            ? selectedClassIds
            : targetType === 'student'
              ? selectedStudentIds
              : [],

        apply_to_future_students:
          fee.apply_to_future_students !== false,

        metadata,

        updated_at: now,
      };

      const { error } = await supabase
        .from('fees')
        .update(updatePayload)
        .eq('id', fee.id);

      if (error) {
        throw error;
      }

      /*
       * If the administrator selected "Update existing
       * assignments", update the current assignments without
       * touching their payment history.
       */
      if (amountChangeMode === 'existing') {
        await saveAssignmentsForAmountChange(
          finalAmount,
        );
      }

      /*
       * Preserve payment history when targets change.
       * Removed students become inactive rather than deleted.
       */
      await deactivateRemovedAssignments();

      /*
       * Existing inactive assignments can be restored.
       * Newly targeted students are passed through the existing
       * database assignment function.
       */
      await reactivateOrCreateAssignments();

      toast.success(
        'Fee updated successfully.',
      );

      await fetchFee();
    } catch (error: any) {
      console.error(
        'Fee save error:',
        error,
      );

      toast.error(
        error?.message ||
          'Failed to save fee changes.',
      );
    } finally {
      setSaving(false);
    }
  };

  const resetBreakdownToDatabaseAmount = () => {
    setBreakdown([
      {
        id: makeId(),
        item_name: 'Fee Amount',
        description: '',
        amount: databaseAmount,
        is_mandatory: true,
        is_optional: false,
        percentage_of_total: 100,
      },
    ]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100">
              <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
            </div>

            <div className="text-center">
              <p className="font-semibold text-slate-800">
                Loading fee configuration
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Preparing targets, assignments and
                breakdown...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!fee) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className={`${cardClass} p-8 text-center`}>
            <CircleAlert className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              Fee not found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              The requested fee could not be loaded.
            </p>

            <button
              type="button"
              onClick={() => navigate('/fees')}
              className={`${primaryButtonClass} mt-6`}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Fees
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => navigate('/fees')}
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                title="Back to fees"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                    Edit Fee
                  </h1>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {fee.status || 'active'}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Configure amount, breakdown, targets and
                  assignment behavior
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchFee}
                disabled={saving}
                className={secondaryButtonClass}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <button
                type="button"
                onClick={saveFee}
                disabled={saving}
                className={primaryButtonClass}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Top summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={`${cardClass} p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Current Fee
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {money(finalAmount)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Database amount before this save
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Coins className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className={`${cardClass} p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Breakdown Total
                </p>

                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {money(breakdownTotal)}
                </p>

                <p
                  className={`mt-1 text-xs font-medium ${
                    hasAmountMismatch
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {hasAmountMismatch
                    ? `Difference: ${money(
                        Math.abs(amountDifference),
                      )}`
                    : 'Amount is balanced'}
                </p>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  hasAmountMismatch
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                <Calculator className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className={`${cardClass} p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Active Assignments
                </p>

                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {assignmentHealth.active}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Outstanding: {money(
                    assignmentHealth.balance,
                  )}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <ClipboardList className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className={`${cardClass} p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Target
                </p>

                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {targetType === 'all'
                    ? 'All Students'
                    : targetType === 'class'
                      ? 'Specific Classes'
                      : 'Specific Students'}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {targetCount} available/selected
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          {/* LEFT */}
          <div className="space-y-6">
            {/* Fee Information */}
            <section className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <BookOpen className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Fee Information
                    </h2>
                    <p className="text-xs text-slate-500">
                      Core details shown to students and
                      parents
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fee name
                  </span>

                  <input
                    value={feeName}
                    onChange={(event) =>
                      setFeeName(event.target.value)
                    }
                    className={inputClass}
                    placeholder="e.g. School Fees Science SS1"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Category
                  </span>

                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(event.target.value)
                    }
                    className={inputClass}
                  >
                    {!CATEGORY_OPTIONS.includes(
                      category,
                    ) && (
                      <option value={category}>
                        {category}
                      </option>
                    )}

                    {CATEGORY_OPTIONS.map((item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Payment frequency
                  </span>

                  <select
                    value={frequency}
                    onChange={(event) =>
                      setFrequency(
                        event.target
                          .value as PaymentFrequency,
                      )
                    }
                    className={inputClass}
                  >
                    {PAYMENT_FREQUENCIES.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Academic session
                  </span>

                  <select
                    value={session}
                    onChange={(event) =>
                      setSession(event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">
                      Select session
                    </option>

                    {!SESSION_OPTIONS.includes(
                      session,
                    ) &&
                      session && (
                        <option value={session}>
                          {session}
                        </option>
                      )}

                    {SESSION_OPTIONS.map((item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Term
                  </span>

                  <select
                    value={term}
                    onChange={(event) =>
                      setTerm(event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">
                      Not specified
                    </option>

                    {TERM_OPTIONS.map((item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Due date
                  </span>

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) =>
                      setDueDate(event.target.value)
                    }
                    className={inputClass}
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Late fee
                  </span>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      ₦
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={lateFee}
                      onChange={(event) =>
                        setLateFee(
                          event.target.value,
                        )
                      }
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </label>

                <label className="md:col-span-2">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </span>

                  <textarea
                    rows={3}
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value,
                      )
                    }
                    className={`${inputClass} resize-none`}
                    placeholder="Optional description..."
                  />
                </label>
              </div>
            </section>

            {/* Breakdown */}
            <section className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                      <Calculator className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="font-semibold text-slate-900">
                        Fee Breakdown
                      </h2>
                      <p className="text-xs text-slate-500">
                        The breakdown total becomes the final
                        payable amount
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addBreakdownItem}
                    className={secondaryButtonClass}
                  >
                    <Plus className="h-4 w-4" />
                    Add item
                  </button>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {hasAmountMismatch && (
                  <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-amber-900">
                          Amount mismatch detected
                        </p>

                        <p className="mt-1 text-sm leading-6 text-amber-800">
                          The existing database amount is{' '}
                          <strong>
                            {money(databaseAmount)}
                          </strong>
                          , while the breakdown totals{' '}
                          <strong>
                            {money(breakdownTotal)}
                          </strong>
                          . Saving this fee will use{' '}
                          <strong>
                            {money(breakdownTotal)}
                          </strong>{' '}
                          as the authoritative fee amount.
                        </p>

                        <button
                          type="button"
                          onClick={
                            resetBreakdownToDatabaseAmount
                          }
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Reset breakdown to database amount
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {breakdown.map(
                    (item, index) => {
                      const percentage =
                        finalAmount > 0
                          ? (numberValue(
                              item.amount,
                            ) /
                              finalAmount) *
                            100
                          : 0;

                      return (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                        >
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[42px_minmax(0,1fr)_180px_42px] lg:items-center">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-200">
                              {String(
                                index + 1,
                              ).padStart(2, '0')}
                            </div>

                            <div>
                              <input
                                value={
                                  item.item_name
                                }
                                onChange={(event) =>
                                  updateBreakdownItem(
                                    item.id,
                                    {
                                      item_name:
                                        event.target
                                          .value,
                                    },
                                  )
                                }
                                className={`${inputClass} bg-white`}
                                placeholder="Item name e.g. Tuition"
                              />

                              <input
                                value={
                                  item.description
                                }
                                onChange={(event) =>
                                  updateBreakdownItem(
                                    item.id,
                                    {
                                      description:
                                        event.target
                                          .value,
                                    },
                                  )
                                }
                                className="mt-2 w-full border-0 bg-transparent px-1 text-xs text-slate-500 outline-none placeholder:text-slate-400"
                                placeholder="Optional description"
                              />
                            </div>

                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                                ₦
                              </span>

                              <input
                                type="number"
                                min="0"
                                value={
                                  item.amount
                                }
                                onChange={(event) =>
                                  updateBreakdownItem(
                                    item.id,
                                    {
                                      amount:
                                        numberValue(
                                          event.target
                                            .value,
                                        ),
                                    },
                                  )
                                }
                                className={`${inputClass} bg-white pl-8`}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeBreakdownItem(
                                  item.id,
                                )
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              title="Remove item"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                              <input
                                type="checkbox"
                                checked={
                                  item.is_mandatory
                                }
                                onChange={(event) =>
                                  markBreakdownMandatory(
                                    item.id,
                                    event.target
                                      .checked,
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                              />
                              Required
                            </label>

                            <span className="text-xs font-medium text-slate-400">
                              {percentage.toFixed(1)}% of
                              total
                            </span>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium text-sky-700">
                      Net Fee Payable
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-sky-950">
                      {money(finalAmount)}
                    </p>
                  </div>

                  <div className="text-right text-xs text-sky-700">
                    <p>
                      {breakdown.length}{' '}
                      {breakdown.length === 1
                        ? 'breakdown item'
                        : 'breakdown items'}
                    </p>

                    <p className="mt-1">
                      Base items:{' '}
                      {money(breakdownTotal)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Targets */}
            <section className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <Users className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Fee Targets
                    </h2>
                    <p className="text-xs text-slate-500">
                      Choose who this fee applies to
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {[
                    {
                      type: 'all' as TargetType,
                      icon: Users,
                      title: 'All Students',
                      description:
                        'School-wide targeting',
                    },
                    {
                      type: 'class' as TargetType,
                      icon: GraduationCap,
                      title: 'Specific Classes',
                      description:
                        'Select one or more classes',
                    },
                    {
                      type: 'student' as TargetType,
                      icon: UserRound,
                      title: 'Specific Students',
                      description:
                        'Select individual students',
                    },
                  ].map((option) => {
                    const Icon = option.icon;
                    const active =
                      targetType === option.type;

                    return (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() =>
                          selectTargetType(
                            option.type,
                          )
                        }
                        className={`relative rounded-2xl border p-4 text-left transition ${
                          active
                            ? 'border-sky-400 bg-sky-50 ring-4 ring-sky-100'
                            : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50'
                        }`}
                      >
                        {active && (
                          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}

                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            active
                              ? 'bg-white text-sky-600'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <p className="mt-3 text-sm font-semibold text-slate-900">
                          {option.title}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {targetType === 'all' && (
                  <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-sky-600" />

                      <div>
                        <p className="text-sm font-semibold text-sky-900">
                          School-wide targeting
                        </p>

                        <p className="mt-1 text-sm leading-6 text-sky-800">
                          This fee targets all students in
                          the same branch. Student
                          eligibility rules are applied
                          independently.
                        </p>

                        <p className="mt-2 text-xs font-semibold text-sky-700">
                          {students.length} students
                          available
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {targetType === 'class' && (
                  <div className="mt-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Selected classes
                        </p>
                        <p className="text-xs text-slate-500">
                          {selectedClassIds.length}{' '}
                          selected
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setShowClassPicker(
                            (value) => !value,
                          )
                        }
                        className={secondaryButtonClass}
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        Choose Classes
                        <ChevronDown
                          className={`h-4 w-4 transition ${
                            showClassPicker
                              ? 'rotate-180'
                              : ''
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedClassIds.length ===
                      0 ? (
                        <span className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">
                          No classes selected
                        </span>
                      ) : (
                        selectedClassIds.map(
                          (id) => (
                            <span
                              key={id}
                              className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800"
                            >
                              {getClassName(
                                id,
                                classes,
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  removeTarget(id)
                                }
                                className="rounded-full hover:bg-sky-100"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ),
                        )
                      )}
                    </div>

                    {showClassPicker && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                          <input
                            value={search}
                            onChange={(event) =>
                              setSearch(
                                event.target
                                  .value,
                              )
                            }
                            className={`${inputClass} pl-9`}
                            placeholder="Search classes..."
                          />
                        </div>

                        <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                          {filteredClasses.map(
                            (item) => {
                              const selected =
                                selectedClassIds.includes(
                                  item.id,
                                );

                              return (
                                <button
                                  type="button"
                                  key={item.id}
                                  onClick={() =>
                                    toggleClass(
                                      item.id,
                                    )
                                  }
                                  className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                                    selected
                                      ? 'border-sky-300 bg-sky-50'
                                      : 'border-slate-200 bg-white hover:border-sky-200'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-800">
                                      {item.name}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                      {item.level ||
                                        item.code ||
                                        ''}
                                    </p>
                                  </div>

                                  <span
                                    className={`ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                      selected
                                        ? 'bg-sky-600 text-white'
                                        : 'bg-slate-100 text-slate-400'
                                    }`}
                                  >
                                    {selected ? (
                                      <Check className="h-3.5 w-3.5" />
                                    ) : (
                                      <Plus className="h-3.5 w-3.5" />
                                    )}
                                  </span>
                                </button>
                              );
                            },
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {targetType === 'student' && (
                  <div className="mt-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Selected students
                        </p>
                        <p className="text-xs text-slate-500">
                          {selectedStudentIds.length}{' '}
                          selected
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setShowStudentPicker(
                            (value) => !value,
                          )
                        }
                        className={secondaryButtonClass}
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        Choose Students
                        <ChevronDown
                          className={`h-4 w-4 transition ${
                            showStudentPicker
                              ? 'rotate-180'
                              : ''
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedStudentIds.length ===
                      0 ? (
                        <span className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">
                          No students selected
                        </span>
                      ) : (
                        selectedStudentIds
                          .slice(0, 20)
                          .map((id) => {
                            const student =
                              students.find(
                                (item) =>
                                  item.id === id,
                              );

                            if (!student)
                              return null;

                            return (
                              <span
                                key={id}
                                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800"
                              >
                                {getStudentName(
                                  student,
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeTarget(
                                      id,
                                    )
                                  }
                                  className="rounded-full hover:bg-sky-100"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </span>
                            );
                          })
                      )}

                      {selectedStudentIds.length >
                        20 && (
                        <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
                          +
                          {selectedStudentIds.length -
                            20}{' '}
                          more
                        </span>
                      )}
                    </div>

                    {showStudentPicker && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_190px]">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <input
                              value={search}
                              onChange={(event) =>
                                setSearch(
                                  event.target
                                    .value,
                                )
                              }
                              className={`${inputClass} pl-9`}
                              placeholder="Search student, admission number or class..."
                            />
                          </div>

                          <select
                            value={classFilter}
                            onChange={(event) =>
                              setClassFilter(
                                event.target
                                  .value,
                              )
                            }
                            className={inputClass}
                          >
                            <option value="all">
                              All classes
                            </option>

                            {classes.map(
                              (item) => (
                                <option
                                  key={item.id}
                                  value={item.id}
                                >
                                  {item.name}
                                </option>
                              ),
                            )}
                          </select>
                        </div>

                        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                          {displayedStudents.map(
                            (student) => {
                              const selected =
                                selectedStudentIds.includes(
                                  student.id,
                                );

                              return (
                                <button
                                  type="button"
                                  key={student.id}
                                  onClick={() =>
                                    toggleStudent(
                                      student.id,
                                    )
                                  }
                                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                                    selected
                                      ? 'border-sky-300 bg-sky-50'
                                      : 'border-slate-200 bg-white hover:border-sky-200'
                                  }`}
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-600">
                                    {getInitials(
                                      getStudentName(
                                        student,
                                      ),
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-800">
                                      {getStudentName(
                                        student,
                                      )}
                                    </p>

                                    <p className="mt-0.5 truncate text-xs text-slate-400">
                                      {student.admission_number ||
                                        student.student_id ||
                                        'No admission number'}{' '}
                                      •{' '}
                                      {getClassName(
                                        student.class_id,
                                        classes,
                                      )}
                                    </p>
                                  </div>

                                  <span
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                      selected
                                        ? 'bg-sky-600 text-white'
                                        : 'bg-slate-100 text-slate-400'
                                    }`}
                                  >
                                    {selected ? (
                                      <Check className="h-4 w-4" />
                                    ) : (
                                      <Plus className="h-4 w-4" />
                                    )}
                                  </span>
                                </button>
                              );
                            },
                          )}
                        </div>

                        {filteredStudents.length >
                          80 && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowAllStudents(
                                (value) =>
                                  !value,
                              )
                            }
                            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            {showAllStudents
                              ? 'Show fewer students'
                              : `Show all ${filteredStudents.length} students`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Eligibility */}
            <section className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Eligibility & Payment Rules
                    </h2>
                    <p className="text-xs text-slate-500">
                      Database-safe eligibility configuration
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Student eligibility
                  </span>

                  <select
                    value={eligibility}
                    onChange={(event) =>
                      setEligibility(
                        event.target
                          .value as Eligibility,
                      )
                    }
                    className={inputClass}
                  >
                    {ELIGIBILITY_OPTIONS.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      ),
                    )}
                  </select>

                  <span className="mt-2 block text-xs leading-5 text-slate-500">
                    This field controls student eligibility.
                    Specific classes or students are
                    controlled separately above.
                  </span>
                </label>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMandatory(true);
                      setOptional(false);
                    }}
                    className={`rounded-2xl border p-4 text-left ${
                      mandatory && !optional
                        ? 'border-sky-300 bg-sky-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                          mandatory && !optional
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <BadgeCheck className="h-4 w-4" />
                      </span>

                      <span className="text-sm font-semibold text-slate-800">
                        Mandatory fee
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Students are expected to pay this
                      fee.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMandatory(false);
                      setOptional(true);
                    }}
                    className={`rounded-2xl border p-4 text-left ${
                      optional
                        ? 'border-sky-300 bg-sky-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                          optional
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Info className="h-4 w-4" />
                      </span>

                      <span className="text-sm font-semibold text-slate-800">
                        Optional fee
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Students may choose whether to pay
                      this fee.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setInstallments(
                        (value) => !value,
                      )
                    }
                    className={`rounded-2xl border p-4 text-left ${
                      installments
                        ? 'border-sky-300 bg-sky-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                          installments
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <CreditCard className="h-4 w-4" />
                      </span>

                      <span className="text-sm font-semibold text-slate-800">
                        Allow installments
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Allow the fee to be paid in multiple
                      installments.
                    </p>
                  </button>
                </div>

                {installments && (
                  <div className="max-w-xs">
                    <label>
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Number of installments
                      </span>

                      <input
                        type="number"
                        min="2"
                        max="24"
                        value={
                          numberOfInstallments
                        }
                        onChange={(event) =>
                          setNumberOfInstallments(
                            event.target.value,
                          )
                        }
                        className={inputClass}
                      />
                    </label>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <aside className="space-y-6 xl:sticky xl:top-[96px] xl:self-start">
            {/* Live Preview */}
            <section className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <Sparkles className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Live Preview
                    </h2>
                    <p className="text-xs text-slate-500">
                      How the fee will appear
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {feeName ||
                          'Untitled Fee'}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {term || 'No term'} •{' '}
                        {session || 'No session'}
                      </p>
                    </div>

                    <span className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                      {category}
                    </span>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs text-slate-400">
                      Total payable
                    </p>

                    <p className="mt-1 text-3xl font-semibold tracking-tight">
                      {money(finalAmount)}
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Frequency
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-200">
                        {
                          PAYMENT_FREQUENCIES.find(
                            (item) =>
                              item.value ===
                              frequency,
                          )?.label
                        }
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Target
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-200">
                        {targetType === 'all'
                          ? 'All Students'
                          : targetType === 'class'
                            ? `${selectedClassIds.length} Classes`
                            : `${selectedStudentIds.length} Students`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      Eligibility
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-200">
                      {
                        ELIGIBILITY_OPTIONS.find(
                          (item) =>
                            item.value ===
                            eligibility,
                        )?.label
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-xs text-slate-500">
                    Breakdown items
                  </span>

                  <span className="text-sm font-semibold text-slate-800">
                    {breakdown.length}
                  </span>
                </div>
              </div>
            </section>

            {/* Amount behavior */}
            <section className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Edit3 className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Amount Change Behavior
                    </h2>
                    <p className="text-xs text-slate-500">
                      Choose carefully when changing a fee with
                      existing student assignments.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-5">
                <button
                  type="button"
                  onClick={() =>
                    setAmountChangeMode(
                      'new_only',
                    )
                  }
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    amountChangeMode ===
                    'new_only'
                      ? 'border-sky-400 bg-sky-50 ring-4 ring-sky-100'
                      : 'border-slate-200 bg-white hover:border-sky-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        amountChangeMode ===
                        'new_only'
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {amountChangeMode ===
                        'new_only' && (
                        <Check className="h-3 w-3" />
                      )}
                    </span>

                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        New assignments only
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Update the fee itself but preserve
                        existing student assignment amounts
                        and payment history.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAmountChangeMode(
                      'existing',
                    )
                  }
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    amountChangeMode ===
                    'existing'
                      ? 'border-sky-400 bg-sky-50 ring-4 ring-sky-100'
                      : 'border-slate-200 bg-white hover:border-sky-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        amountChangeMode ===
                        'existing'
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {amountChangeMode ===
                        'existing' && (
                        <Check className="h-3 w-3" />
                      )}
                    </span>

                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Update existing assignments
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Recalculate active assignments using the
                        new fee amount while preserving payments
                        already made.
                      </p>
                    </div>
                  </div>
                </button>

                {amountChangeMode ===
                  'existing' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-start gap-2">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                      <p className="text-xs leading-5 text-amber-800">
                        This will change the amount due for{' '}
                        <strong>
                          {assignmentHealth.active}
                        </strong>{' '}
                        active assignments. Payments already
                        recorded will not be deleted.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Assignment health */}
            <section className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <ClipboardList className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Assignment Health
                    </h2>
                    <p className="text-xs text-slate-500">
                      Current database state
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-slate-200">
                <div className="bg-white p-4">
                  <p className="text-xs text-slate-400">
                    Active
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {assignmentHealth.active}
                  </p>
                </div>

                <div className="bg-white p-4">
                  <p className="text-xs text-slate-400">
                    Paid
                  </p>
                  <p className="mt-1 text-lg font-semibold text-emerald-600">
                    {money(
                      assignmentHealth.paid,
                    )}
                  </p>
                </div>

                <div className="bg-white p-4">
                  <p className="text-xs text-slate-400">
                    Current Due
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {money(
                      assignmentHealth.currentDue,
                    )}
                  </p>
                </div>

                <div className="bg-white p-4">
                  <p className="text-xs text-slate-400">
                    Balance
                  </p>
                  <p className="mt-1 text-lg font-semibold text-amber-600">
                    {money(
                      assignmentHealth.balance,
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* Selected targets */}
            <section className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Users className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Target Summary
                    </h2>
                    <p className="text-xs text-slate-500">
                      Current selection
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Selected
                  </span>

                  <span className="text-sm font-semibold text-slate-800">
                    {targetCount}
                  </span>
                </div>

                <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto">
                  {selectedTargetLabels.length ===
                  0 ? (
                    <span className="text-xs text-slate-400">
                      No targets selected
                    </span>
                  ) : (
                    selectedTargetLabels
                      .slice(0, 30)
                      .map((label, index) => (
                        <span
                          key={`${label}-${index}`}
                          className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600"
                        >
                          {label}
                        </span>
                      ))
                  )}

                  {selectedTargetLabels.length >
                    30 && (
                    <span className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700">
                      +
                      {selectedTargetLabels.length -
                        30}{' '}
                      more
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* Save impact */}
            <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                  <Save className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="font-semibold text-sky-950">
                    Save Fee Changes
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-sky-800">
                    The database fee amount will become{' '}
                    <strong>
                      {money(finalAmount)}
                    </strong>
                    . Existing payment records are preserved.
                  </p>

                  {targetType !== 'all' && (
                    <p className="mt-2 text-xs leading-5 text-sky-700">
                      Targeting will be stored separately from
                      student eligibility, preventing invalid
                      values such as "classes" or "students"
                      from entering the eligibility field.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={saveFee}
                disabled={saving}
                className={`${primaryButtonClass} mt-5 w-full`}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving
                  ? 'Saving Fee...'
                  : 'Save Fee Changes'}
              </button>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
