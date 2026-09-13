import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileCheck2,
  FileText,
  Filter,
  HeartPulse,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  User,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabase/client';

type LeaveType =
  | 'annual'
  | 'sick'
  | 'maternity'
  | 'paternity'
  | 'compassionate'
  | 'study'
  | 'unpaid'
  | 'official';

type LeaveStatus =
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'cancelled';

interface StaffUser {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  email?: string | null;
  role: string;
  branch_id?: string | null;
  is_active?: boolean | null;
  profile_image_url?: string | null;
}

interface LeaveRequest {
  id: string;
  branch_id?: string | null;
  applicant_user_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  medical_certificate_url?: string | null;
  medical_certificate_name?: string | null;
  relief_teacher_user_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  reviewer_notes?: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

interface LeaveBalance {
  id: string;
  branch_id?: string | null;
  user_id: string;
  leave_type: LeaveType;
  leave_year: number;
  entitlement_days: number;
  carried_forward_days: number;
  used_days: number;
  notes?: string | null;
}

interface LeaveForm {
  applicant_user_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  relief_teacher_user_id: string;
  medical_certificate_url: string;
  medical_certificate_name: string;
  reviewer_notes: string;
}

const LEAVE_TYPES: {
  value: LeaveType;
  label: string;
  description: string;
}[] = [
  {
    value: 'annual',
    label: 'Annual Leave',
    description:
      'Scheduled annual vacation and personal rest.',
  },
  {
    value: 'sick',
    label: 'Sick Leave',
    description:
      'Medical illness, treatment or recovery.',
  },
  {
    value: 'maternity',
    label: 'Maternity Leave',
    description:
      'Maternity-related absence.',
  },
  {
    value: 'paternity',
    label: 'Paternity Leave',
    description:
      'Paternity-related absence.',
  },
  {
    value: 'compassionate',
    label: 'Compassionate Leave',
    description:
      'Bereavement or serious family circumstances.',
  },
  {
    value: 'study',
    label: 'Study Leave',
    description:
      'Approved academic or professional development.',
  },
  {
    value: 'official',
    label: 'Official Leave',
    description:
      'Official school assignment or duty.',
  },
  {
    value: 'unpaid',
    label: 'Unpaid Leave',
    description:
      'Approved absence without paid leave entitlement.',
  },
];

const DEFAULT_ENTITLEMENTS: Record<
  LeaveType,
  number
> = {
  annual: 20,
  sick: 10,
  maternity: 90,
  paternity: 14,
  compassionate: 5,
  study: 10,
  official: 0,
  unpaid: 0,
};

const STAFF_ROLES = [
  'super_admin',
  'branch_admin',
  'director',
  'principal',
  'admissions_officer',
  'accountant',
  'record_keeper',
  'teacher',
];

const EMPTY_FORM: LeaveForm = {
  applicant_user_id: '',
  leave_type: 'annual',
  start_date: '',
  end_date: '',
  days: 0,
  reason: '',
  relief_teacher_user_id: '',
  medical_certificate_url: '',
  medical_certificate_name: '',
  reviewer_notes: '',
};

const formatName = (
  user?: StaffUser | null,
) => {
  if (!user) return 'Unknown staff';

  return [
    user.first_name,
    user.middle_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(' ');
};

const formatRole = (
  role?: string,
) => {
  if (!role) return 'Staff';

  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
};

const formatLeaveType = (
  type: LeaveType,
) => {
  const item = LEAVE_TYPES.find(
    (leave) =>
      leave.value === type,
  );

  return (
    item?.label ||
    type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase(),
      )
  );
};

const formatDate = (
  value?: string | null,
) => {
  if (!value) return '—';

  const date = new Date(
    `${value}T00:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-NG',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(date);
};

const formatDateTime = (
  value?: string | null,
) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-NG',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date);
};

const calculateDays = (
  start: string,
  end: string,
) => {
  if (!start || !end) return 0;

  const startDate = new Date(
    `${start}T00:00:00`,
  );

  const endDate = new Date(
    `${end}T00:00:00`,
  );

  if (
    Number.isNaN(
      startDate.getTime(),
    ) ||
    Number.isNaN(
      endDate.getTime(),
    )
  ) {
    return 0;
  }

  const difference =
    endDate.getTime() -
    startDate.getTime();

  if (difference < 0) return 0;

  return (
    Math.floor(
      difference /
        (1000 * 60 * 60 * 24),
    ) + 1
  );
};

const isTodayWithinLeave = (
  start: string,
  end: string,
) => {
  const today = new Date();

  const todayString = [
    today.getFullYear(),
    String(
      today.getMonth() + 1,
    ).padStart(2, '0'),
    String(
      today.getDate(),
    ).padStart(2, '0'),
  ].join('-');

  return (
    start <= todayString &&
    end >= todayString
  );
};

const getStatusClasses = (
  status: LeaveStatus,
) => {
  switch (status) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900';

    case 'rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900';

    case 'cancelled':
      return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

    default:
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
  }
};

const getLeaveTypeClasses = (
  type: LeaveType,
) => {
  switch (type) {
    case 'sick':
      return 'bg-rose-50 text-rose-600';

    case 'maternity':
      return 'bg-pink-50 text-pink-600';

    case 'paternity':
      return 'bg-blue-50 text-blue-600';

    case 'compassionate':
      return 'bg-violet-50 text-violet-600';

    case 'study':
      return 'bg-indigo-50 text-indigo-600';

    case 'official':
      return 'bg-cyan-50 text-cyan-600';

    case 'unpaid':
      return 'bg-slate-100 text-slate-600';

    default:
      return 'bg-emerald-50 text-emerald-600';
  }
};

const LeaveRequests: React.FC = () => {
  const [
    leaves,
    setLeaves,
  ] = useState<LeaveRequest[]>([]);

  const [
    staff,
    setStaff,
  ] = useState<StaffUser[]>([]);

  const [
    balances,
    setBalances,
  ] = useState<LeaveBalance[]>([]);

  const [
    currentUser,
    setCurrentUser,
  ] = useState<StaffUser | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    actionId,
    setActionId,
  ] = useState<string | null>(
    null,
  );

  const [
    showModal,
    setShowModal,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    'all' | LeaveStatus
  >('all');

  const [
    typeFilter,
    setTypeFilter,
  ] = useState<
    'all' | LeaveType
  >('all');

  const [
    form,
    setForm,
  ] = useState<LeaveForm>(
    EMPTY_FORM,
  );

  const loadData = useCallback(
    async (
      showRefresh = false,
    ) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const {
          data: authData,
        } =
          await supabase.auth.getUser();

        const authUser =
          authData.user;

        let profile: StaffUser | null =
          null;

        if (authUser?.id) {
          const {
            data: profileData,
          } = await supabase
            .from('users')
            .select(
              'id, first_name, last_name, middle_name, email, role, branch_id, is_active, profile_image_url',
            )
            .eq(
              'id',
              authUser.id,
            )
            .maybeSingle();

          if (profileData) {
            profile =
              profileData as StaffUser;
          }
        }

        setCurrentUser(profile);

        const [
          staffResult,
          leavesResult,
          balancesResult,
        ] = await Promise.all([
          supabase
            .from('users')
            .select(
              'id, first_name, last_name, middle_name, email, role, branch_id, is_active, profile_image_url',
            )
            .in(
              'role',
              STAFF_ROLES,
            )
            .order(
              'first_name',
              {
                ascending: true,
              },
            ),

          supabase
            .from('leave_requests')
            .select(
              'id, branch_id, applicant_user_id, leave_type, start_date, end_date, days, reason, status, medical_certificate_url, medical_certificate_name, relief_teacher_user_id, approved_by, approved_at, rejection_reason, reviewer_notes, submitted_at, created_at, updated_at',
            )
            .order(
              'submitted_at',
              {
                ascending: false,
              },
            ),

          supabase
            .from(
              'staff_leave_balances',
            )
            .select(
              'id, branch_id, user_id, leave_type, leave_year, entitlement_days, carried_forward_days, used_days, notes',
            )
            .eq(
              'leave_year',
              new Date().getFullYear(),
            ),
        ]);

        if (staffResult.error) {
          throw staffResult.error;
        }

        if (leavesResult.error) {
          throw leavesResult.error;
        }

        if (
          balancesResult.error
        ) {
          throw balancesResult.error;
        }

        const activeStaff =
          (staffResult.data ||
            []) as StaffUser[];

        setStaff(
          activeStaff.filter(
            (user) =>
              user.is_active !==
                false &&
              STAFF_ROLES.includes(
                user.role,
              ),
          ),
        );

        setLeaves(
          (leavesResult.data ||
            []) as LeaveRequest[],
        );

        setBalances(
          (balancesResult.data ||
            []) as LeaveBalance[],
        );

        if (
          profile &&
          !form.applicant_user_id
        ) {
          setForm((prev) => ({
            ...prev,
            applicant_user_id:
              profile!.id,
          }));
        }
      } catch (error: any) {
        console.error(
          'Leave management load error:',
          error,
        );

        toast.error(
          error?.message ||
            'Unable to load leave management data.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [form.applicant_user_id],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const staffMap = useMemo(() => {
    return new Map(
      staff.map((user) => [
        user.id,
        user,
      ]),
    );
  }, [staff]);

  const canManageAll =
    currentUser
      ? [
          'super_admin',
          'branch_admin',
          'director',
          'principal',
          'accountant',
        ].includes(
          currentUser.role,
        )
      : false;

  const visibleLeaves =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return leaves.filter(
        (leave) => {
          const applicant =
            staffMap.get(
              leave.applicant_user_id,
            );

          const applicantName =
            formatName(
              applicant,
            ).toLowerCase();

          const applicantEmail =
            applicant?.email
              ?.toLowerCase() ||
            '';

          const matchesSearch =
            !query ||
            applicantName.includes(
              query,
            ) ||
            applicantEmail.includes(
              query,
            ) ||
            leave.reason
              .toLowerCase()
              .includes(query) ||
            formatLeaveType(
              leave.leave_type,
            )
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter === 'all' ||
            leave.status ===
              statusFilter;

          const matchesType =
            typeFilter === 'all' ||
            leave.leave_type ===
              typeFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesType
          );
        },
      );
    }, [
      leaves,
      search,
      staffMap,
      statusFilter,
      typeFilter,
    ]);

  const stats = useMemo(() => {
    const pending =
      leaves.filter(
        (leave) =>
          leave.status ===
          'pending',
      ).length;

    const approved =
      leaves.filter(
        (leave) =>
          leave.status ===
          'approved',
      );

    const rejected =
      leaves.filter(
        (leave) =>
          leave.status ===
          'rejected',
      ).length;

    const approvedDays =
      approved.reduce(
        (sum, leave) =>
          sum + Number(leave.days),
        0,
      );

    const currentlyAway =
      approved.filter(
        (leave) =>
          isTodayWithinLeave(
            leave.start_date,
            leave.end_date,
          ),
      ).length;

    return {
      total: leaves.length,
      pending,
      approved: approved.length,
      rejected,
      approvedDays,
      currentlyAway,
    };
  }, [leaves]);

  const applicantOptions =
    useMemo(() => {
      if (canManageAll) {
        return staff;
      }

      if (currentUser) {
        return [currentUser];
      }

      return [];
    }, [
      canManageAll,
      currentUser,
      staff,
    ]);

  const reliefOptions =
    useMemo(() => {
      return staff.filter(
        (user) =>
          user.id !==
          form.applicant_user_id,
      );
    }, [
      staff,
      form.applicant_user_id,
    ]);

  const selectedApplicant =
    staffMap.get(
      form.applicant_user_id,
    );

  const selectedApplicantBalances =
    useMemo(() => {
      if (
        !form.applicant_user_id
      ) {
        return [];
      }

      return balances.filter(
        (balance) =>
          balance.user_id ===
          form.applicant_user_id,
      );
    }, [
      balances,
      form.applicant_user_id,
    ]);

  const getBalance = (
    userId: string,
    type: LeaveType,
  ) => {
    const balance =
      balances.find(
        (item) =>
          item.user_id ===
            userId &&
          item.leave_type ===
            type,
      );

    if (balance) {
      return balance;
    }

    return {
      entitlement_days:
        DEFAULT_ENTITLEMENTS[type],
      carried_forward_days: 0,
      used_days: 0,
    };
  };

  const openCreateModal =
    () => {
      setForm({
        ...EMPTY_FORM,
        applicant_user_id:
          currentUser?.id ||
          '',
      });

      setShowModal(true);
    };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setForm(EMPTY_FORM);
  };

  const updateForm = <
    K extends keyof LeaveForm,
  >(
    field: K,
    value: LeaveForm[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDateChange = (
    field:
      | 'start_date'
      | 'end_date',
    value: string,
  ) => {
    setForm((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };

      next.days =
        calculateDays(
          next.start_date,
          next.end_date,
        );

      return next;
    });
  };

  const ensureBalance = async (
    userId: string,
    leaveType: LeaveType,
    branchId?: string | null,
  ) => {
    const year =
      new Date().getFullYear();

    const existing =
      balances.find(
        (balance) =>
          balance.user_id ===
            userId &&
          balance.leave_type ===
            leaveType &&
          balance.leave_year ===
            year,
      );

    if (existing) {
      return existing;
    }

    const entitlement =
      DEFAULT_ENTITLEMENTS[
        leaveType
      ];

    const {
      data,
      error,
    } = await supabase
      .from(
        'staff_leave_balances',
      )
      .insert({
        user_id: userId,
        branch_id:
          branchId || null,
        leave_type:
          leaveType,
        leave_year: year,
        entitlement_days:
          entitlement,
        carried_forward_days: 0,
        used_days: 0,
      })
      .select(
        'id, branch_id, user_id, leave_type, leave_year, entitlement_days, carried_forward_days, used_days, notes',
      )
      .single();

    if (error) {
      throw error;
    }

    if (data) {
      setBalances((prev) => [
        ...prev,
        data as LeaveBalance,
      ]);
    }

    return data as LeaveBalance;
  };

  const updateUsedBalance =
    async (
      leave: LeaveRequest,
    ) => {
      const balance =
        await ensureBalance(
          leave.applicant_user_id,
          leave.leave_type,
          leave.branch_id,
        );

      if (!balance) return;

      const nextUsed =
        Number(
          balance.used_days,
        ) + Number(leave.days);

      const {
        data,
        error,
      } = await supabase
        .from(
          'staff_leave_balances',
        )
        .update({
          used_days:
            nextUsed,
        })
        .eq(
          'id',
          balance.id,
        )
        .select(
          'id, branch_id, user_id, leave_type, leave_year, entitlement_days, carried_forward_days, used_days, notes',
        )
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setBalances((prev) =>
          prev.map((item) =>
            item.id ===
            data.id
              ? (data as LeaveBalance)
              : item,
          ),
        );
      }
    };

  const handleCreate =
    async (
      event: React.FormEvent,
    ) => {
      event.preventDefault();

      if (!form.applicant_user_id) {
        toast.error(
          'Select a staff member.',
        );
        return;
      }

      if (!form.start_date) {
        toast.error(
          'Select the leave start date.',
        );
        return;
      }

      if (!form.end_date) {
        toast.error(
          'Select the leave end date.',
        );
        return;
      }

      if (
        form.days <= 0
      ) {
        toast.error(
          'The leave end date must be on or after the start date.',
        );
        return;
      }

      if (
        !form.reason.trim()
      ) {
        toast.error(
          'Enter the reason for the leave.',
        );
        return;
      }

      setSaving(true);

      try {
        const applicant =
          staffMap.get(
            form.applicant_user_id,
          );

        const {
          data: inserted,
          error,
        } = await supabase
          .from('leave_requests')
          .insert({
            branch_id:
              applicant?.branch_id ||
              null,
            applicant_user_id:
              form.applicant_user_id,
            leave_type:
              form.leave_type,
            start_date:
              form.start_date,
            end_date:
              form.end_date,
            days: form.days,
            reason:
              form.reason.trim(),
            status: 'pending',
            medical_certificate_url:
              form.medical_certificate_url.trim() ||
              null,
            medical_certificate_name:
              form.medical_certificate_name.trim() ||
              null,
            relief_teacher_user_id:
              form.relief_teacher_user_id ||
              null,
            reviewer_notes:
              form.reviewer_notes.trim() ||
              null,
          })
          .select(
            'id, branch_id, applicant_user_id, leave_type, start_date, end_date, days, reason, status, medical_certificate_url, medical_certificate_name, relief_teacher_user_id, approved_by, approved_at, rejection_reason, reviewer_notes, submitted_at, created_at, updated_at',
          )
          .single();

        if (error) {
          throw error;
        }

        if (inserted) {
          setLeaves((prev) => [
            inserted as LeaveRequest,
            ...prev,
          ]);
        }

        toast.success(
          'Leave application submitted successfully.',
        );

        closeModal();
      } catch (error: any) {
        console.error(
          'Create leave error:',
          error,
        );

        toast.error(
          error?.message ||
            'Unable to submit leave application.',
        );
      } finally {
        setSaving(false);
      }
    };

  const handleApprove = async (
    leave: LeaveRequest,
  ) => {
    if (
      leave.status !==
      'pending'
    ) {
      return;
    }

    setActionId(leave.id);

    try {
      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const reviewerId =
        authData.user?.id ||
        null;

      const {
        data,
        error,
      } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by:
            reviewerId,
          approved_at:
            new Date().toISOString(),
          rejection_reason:
            null,
        })
        .eq(
          'id',
          leave.id,
        )
        .eq(
          'status',
          'pending',
        )
        .select(
          'id, branch_id, applicant_user_id, leave_type, start_date, end_date, days, reason, status, medical_certificate_url, medical_certificate_name, relief_teacher_user_id, approved_by, approved_at, rejection_reason, reviewer_notes, submitted_at, created_at, updated_at',
        )
        .single();

      if (error) {
        throw error;
      }

      await updateUsedBalance(
        leave,
      );

      if (
        leave.relief_teacher_user_id
      ) {
        const {
          error:
            reliefError,
        } =
          await supabase
            .from(
              'leave_relief_assignments',
            )
            .insert({
              branch_id:
                leave.branch_id ||
                null,
              leave_request_id:
                leave.id,
              relief_user_id:
                leave.relief_teacher_user_id,
              start_date:
                leave.start_date,
              end_date:
                leave.end_date,
              status:
                'scheduled',
              created_by:
                reviewerId,
            });

        if (
          reliefError
        ) {
          console.error(
            'Relief assignment error:',
            reliefError,
          );

          toast.error(
            'Leave approved, but the relief assignment could not be created.',
          );
        }
      }

      if (data) {
        setLeaves((prev) =>
          prev.map((item) =>
            item.id ===
            data.id
              ? (data as LeaveRequest)
              : item,
          ),
        );
      }

      toast.success(
        'Leave application approved.',
      );
    } catch (error: any) {
      console.error(
        'Approve leave error:',
        error,
      );

      toast.error(
        error?.message ||
          'Unable to approve leave.',
      );
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (
    leave: LeaveRequest,
  ) => {
    if (
      leave.status !==
      'pending'
    ) {
      return;
    }

    const reason =
      window.prompt(
        'Enter the reason for declining this leave application:',
        '',
      );

    if (
      reason === null
    ) {
      return;
    }

    if (
      !reason.trim()
    ) {
      toast.error(
        'A rejection reason is required.',
      );
      return;
    }

    setActionId(leave.id);

    try {
      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const {
        data,
        error,
      } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          approved_by:
            authData.user?.id ||
            null,
          approved_at:
            new Date().toISOString(),
          rejection_reason:
            reason.trim(),
        })
        .eq(
          'id',
          leave.id,
        )
        .eq(
          'status',
          'pending',
        )
        .select(
          'id, branch_id, applicant_user_id, leave_type, start_date, end_date, days, reason, status, medical_certificate_url, medical_certificate_name, relief_teacher_user_id, approved_by, approved_at, rejection_reason, reviewer_notes, submitted_at, created_at, updated_at',
        )
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setLeaves((prev) =>
          prev.map((item) =>
            item.id ===
            data.id
              ? (data as LeaveRequest)
              : item,
          ),
        );
      }

      toast.success(
        'Leave application declined.',
      );
    } catch (error: any) {
      console.error(
        'Reject leave error:',
        error,
      );

      toast.error(
        error?.message ||
          'Unable to decline leave.',
      );
    } finally {
      setActionId(null);
    }
  };

  const handleCancel =
    async (
      leave: LeaveRequest,
    ) => {
      if (
        leave.status !==
        'pending'
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          'Cancel this pending leave application?',
        );

      if (!confirmed) {
        return;
      }

      setActionId(leave.id);

      try {
        const {
          data,
          error,
        } = await supabase
          .from(
            'leave_requests',
          )
          .update({
            status:
              'cancelled',
          })
          .eq(
            'id',
            leave.id,
          )
          .select(
            'id, branch_id, applicant_user_id, leave_type, start_date, end_date, days, reason, status, medical_certificate_url, medical_certificate_name, relief_teacher_user_id, approved_by, approved_at, rejection_reason, reviewer_notes, submitted_at, created_at, updated_at',
          )
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setLeaves((prev) =>
            prev.map((item) =>
              item.id ===
              data.id
                ? (data as LeaveRequest)
                : item,
            ),
          );
        }

        toast.success(
          'Leave application cancelled.',
        );
      } catch (error: any) {
        toast.error(
          error?.message ||
            'Unable to cancel leave application.',
        );
      } finally {
        setActionId(null);
      }
    };

  const balanceCards =
    useMemo(() => {
      if (
        !form.applicant_user_id
      ) {
        return [];
      }

      return LEAVE_TYPES.filter(
        (type) =>
          type.value !==
            'unpaid' &&
          type.value !==
            'official',
      ).map((type) => {
        const balance =
          getBalance(
            form.applicant_user_id,
            type.value,
          );

        const available =
          Math.max(
            0,
            Number(
              balance.entitlement_days,
            ) +
              Number(
                balance.carried_forward_days ||
                  0,
              ) -
              Number(
                balance.used_days,
              ),
          );

        return {
          ...type,
          available,
          entitlement:
            Number(
              balance.entitlement_days,
            ),
          used: Number(
            balance.used_days,
          ),
        };
      });
    }, [
      balances,
      form.applicant_user_id,
    ]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <div className="h-56 animate-pulse rounded-3xl bg-slate-200" />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-[600px] animate-pulse rounded-3xl bg-white lg:col-span-2" />
          <div className="h-[600px] animate-pulse rounded-3xl bg-white" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-blue-700 to-violet-800 p-6 text-white shadow-xl sm:p-8">
          <div className="absolute -right-24 -top-32 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-blue-300/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <BriefcaseBusiness className="h-3.5 w-3.5" />
                Staff HR Management
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Leave Requests & Approvals
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                Manage staff leave applications, approvals, entitlements, medical documentation and relief assignments from one workspace.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                  {stats.total} Requests
                </span>

                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                  {stats.pending} Pending
                </span>

                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                  {stats.currentlyAway} Away Today
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  loadData(true)
                }
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing
                      ? 'animate-spin'
                      : ''
                  }`}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={
                  openCreateModal
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
              >
                <Plus className="h-4 w-4" />
                Apply for Leave
              </button>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FileText className="h-5 w-5" />
              </div>

              <span className="text-xs font-bold text-slate-400">
                TOTAL
              </span>
            </div>

            <p className="mt-4 text-2xl font-extrabold text-slate-900">
              {stats.total}
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">
              Leave applications
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>

              <span className="text-xs font-bold text-amber-600">
                REVIEW
              </span>
            </div>

            <p className="mt-4 text-2xl font-extrabold text-slate-900">
              {stats.pending}
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">
              Awaiting approval
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <span className="text-xs font-bold text-emerald-600">
                APPROVED
              </span>
            </div>

            <p className="mt-4 text-2xl font-extrabold text-slate-900">
              {stats.approved}
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">
              {stats.approvedDays} approved days
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Users className="h-5 w-5" />
              </div>

              <span className="text-xs font-bold text-blue-600">
                TODAY
              </span>
            </div>

            <p className="mt-4 text-2xl font-extrabold text-slate-900">
              {stats.currentlyAway}
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">
              Staff currently away
            </p>
          </div>
        </div>

        {/* TWO COLUMN WORKSPACE */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT / MAIN */}
          <div className="space-y-5 lg:col-span-2">
            {/* FILTERS */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Search staff, leave type or reason..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />

                    <select
                      value={
                        statusFilter
                      }
                      onChange={(event) =>
                        setStatusFilter(
                          event.target
                            .value as
                            | 'all'
                            | LeaveStatus,
                        )
                      }
                      className="appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-9 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                    >
                      <option value="all">
                        All Status
                      </option>
                      <option value="pending">
                        Pending
                      </option>
                      <option value="approved">
                        Approved
                      </option>
                      <option value="rejected">
                        Rejected
                      </option>
                      <option value="cancelled">
                        Cancelled
                      </option>
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  </div>

                  <div className="relative">
                    <select
                      value={
                        typeFilter
                      }
                      onChange={(event) =>
                        setTypeFilter(
                          event.target
                            .value as
                            | 'all'
                            | LeaveType,
                        )
                      }
                      className="appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-9 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                    >
                      <option value="all">
                        All Leave Types
                      </option>

                      {LEAVE_TYPES.map(
                        (type) => (
                          <option
                            key={
                              type.value
                            }
                            value={
                              type.value
                            }
                          >
                            {
                              type.label
                            }
                          </option>
                        ),
                      )}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* REQUEST LIST */}
            <div className="space-y-4">
              {visibleLeaves.length ===
              0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                    <Calendar className="h-7 w-7" />
                  </div>

                  <h3 className="mt-5 text-lg font-extrabold text-slate-900">
                    No leave requests found
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    There are no leave applications matching the current search and filters.
                  </p>

                  <button
                    type="button"
                    onClick={
                      openCreateModal
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" />
                    Create Leave Request
                  </button>
                </div>
              ) : (
                visibleLeaves.map(
                  (
                    item,
                    index,
                  ) => {
                    const applicant =
                      staffMap.get(
                        item.applicant_user_id,
                      );

                    const relief =
                      item.relief_teacher_user_id
                        ? staffMap.get(
                            item.relief_teacher_user_id,
                          )
                        : null;

                    const busy =
                      actionId ===
                      item.id;

                    return (
                      <motion.div
                        key={
                          item.id
                        }
                        initial={{
                          opacity: 0,
                          y: 8,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          delay:
                            index *
                            0.03,
                        }}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                      >
                        <div className="flex flex-col gap-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600">
                                {applicant?.profile_image_url ? (
                                  <img
                                    src={
                                      applicant.profile_image_url
                                    }
                                    alt={formatName(
                                      applicant,
                                    )}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <User className="h-5 w-5" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="truncate text-sm font-extrabold text-slate-900 sm:text-base">
                                    {formatName(
                                      applicant,
                                    )}
                                  </h3>

                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                    {formatRole(
                                      applicant?.role,
                                    )}
                                  </span>
                                </div>

                                <p className="mt-1 truncate text-xs text-slate-500">
                                  {applicant?.email ||
                                    'No email available'}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${getStatusClasses(
                                item.status,
                              )}`}
                            >
                              {item.status ===
                              'approved' ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : item.status ===
                                'rejected' ? (
                                <XCircle className="h-3 w-3" />
                              ) : item.status ===
                                'pending' ? (
                                <Clock className="h-3 w-3" />
                              ) : (
                                <AlertCircle className="h-3 w-3" />
                              )}

                              {item.status}
                            </span>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Leave Type
                              </p>

                              <div className="mt-1.5 flex items-center gap-2">
                                <span
                                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${getLeaveTypeClasses(
                                    item.leave_type,
                                  )}`}
                                >
                                  {item.leave_type ===
                                  'sick' ? (
                                    <Stethoscope className="h-3.5 w-3.5" />
                                  ) : (
                                    <Calendar className="h-3.5 w-3.5" />
                                  )}
                                </span>

                                <span className="text-xs font-extrabold text-slate-800">
                                  {formatLeaveType(
                                    item.leave_type,
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Duration
                              </p>

                              <p className="mt-1.5 text-xs font-extrabold text-slate-800">
                                {item.days}{' '}
                                {item.days ===
                                1
                                  ? 'day'
                                  : 'days'}
                              </p>

                              <p className="mt-1 text-[10px] font-medium text-slate-500">
                                {formatDate(
                                  item.start_date,
                                )}{' '}
                                →{' '}
                                {formatDate(
                                  item.end_date,
                                )}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Submitted
                              </p>

                              <p className="mt-1.5 text-xs font-extrabold text-slate-800">
                                {formatDateTime(
                                  item.submitted_at,
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-100 bg-white p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Reason
                            </p>

                            <p className="mt-1 text-sm leading-6 text-slate-700">
                              {item.reason}
                            </p>
                          </div>

                          {(relief ||
                            item.medical_certificate_url ||
                            item.medical_certificate_name ||
                            item.rejection_reason) && (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {relief && (
                                <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
                                  <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />

                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500">
                                      Relief Staff
                                    </p>

                                    <p className="mt-1 text-xs font-extrabold text-slate-800">
                                      {formatName(
                                        relief,
                                      )}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {(item.medical_certificate_url ||
                                item.medical_certificate_name) && (
                                <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/60 p-3">
                                  <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />

                                  <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-rose-500">
                                      Medical Certificate
                                    </p>

                                    {item.medical_certificate_url ? (
                                      <a
                                        href={
                                          item.medical_certificate_url
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-1 block truncate text-xs font-extrabold text-rose-700 hover:underline"
                                      >
                                        {item.medical_certificate_name ||
                                          'View certificate'}
                                      </a>
                                    ) : (
                                      <p className="mt-1 truncate text-xs font-extrabold text-slate-800">
                                        {
                                          item.medical_certificate_name
                                        }
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {item.rejection_reason && (
                                <div className="sm:col-span-2 rounded-xl border border-rose-100 bg-rose-50 p-3">
                                  <p className="text-[10px] font-bold uppercase tracking-wide text-rose-500">
                                    Rejection Reason
                                  </p>

                                  <p className="mt-1 text-xs font-medium leading-5 text-rose-800">
                                    {
                                      item.rejection_reason
                                    }
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {item.status ===
                            'pending' && (
                            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                <Clock className="h-3.5 w-3.5" />
                                Awaiting management review
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {!canManageAll &&
                                  item.applicant_user_id ===
                                    currentUser?.id && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCancel(
                                          item,
                                        )
                                      }
                                      disabled={
                                        busy
                                      }
                                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                  )}

                                {canManageAll && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleReject(
                                          item,
                                        )
                                      }
                                      disabled={
                                        busy
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                                    >
                                      {busy ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <XCircle className="h-3.5 w-3.5" />
                                      )}
                                      Decline
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleApprove(
                                          item,
                                        )
                                      }
                                      disabled={
                                        busy
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                      {busy ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      )}
                                      Approve Leave
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {item.status ===
                            'approved' && (
                            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                Approved{' '}
                                {item.approved_at
                                  ? `on ${formatDateTime(
                                      item.approved_at,
                                    )}`
                                  : ''}
                              </div>

                              {relief && (
                                <div className="flex items-center gap-1.5 font-semibold text-violet-600">
                                  <UserCheck className="h-3.5 w-3.5" />
                                  Relief assigned
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  },
                )
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="space-y-5">
            {/* USER CARD */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white text-indigo-600 shadow-sm">
                    {currentUser?.profile_image_url ? (
                      <img
                        src={
                          currentUser.profile_image_url
                        }
                        alt={formatName(
                          currentUser,
                        )}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-500">
                      Signed In
                    </p>

                    <p className="truncate text-sm font-extrabold text-slate-900">
                      {formatName(
                        currentUser,
                      )}
                    </p>

                    <p className="text-xs font-medium text-slate-500">
                      {formatRole(
                        currentUser?.role,
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">
                    Access
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                      canManageAll
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {canManageAll
                      ? 'MANAGER'
                      : 'STAFF'}
                  </span>
                </div>
              </div>
            </div>

            {/* LEAVE BALANCES */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Leave Entitlements
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {selectedApplicant
                      ? formatName(
                          selectedApplicant,
                        )
                      : 'Select staff when applying'}
                  </p>
                </div>

                <ShieldCheck className="h-5 w-5 text-indigo-500" />
              </div>

              {selectedApplicantBalances.length ===
                0 &&
              !form.applicant_user_id ? (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-center">
                  <p className="text-xs font-medium leading-5 text-slate-500">
                    Select a staff member when creating a leave request to view their entitlement.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {(
                    balanceCards.length
                      ? balanceCards
                      : LEAVE_TYPES.slice(
                          0,
                          5,
                        ).map(
                          (type) => ({
                            ...type,
                            available:
                              DEFAULT_ENTITLEMENTS[
                                type.value
                              ],
                            entitlement:
                              DEFAULT_ENTITLEMENTS[
                                type.value
                              ],
                            used: 0,
                          }),
                        )
                  ).map(
                    (balance) => {
                      const percentage =
                        balance.entitlement >
                        0
                          ? Math.min(
                              100,
                              (balance.used /
                                balance.entitlement) *
                                100,
                            )
                          : 0;

                      return (
                        <div
                          key={
                            balance.value
                          }
                          className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-bold text-slate-700">
                              {
                                balance.label
                              }
                            </span>

                            <span className="text-xs font-extrabold text-indigo-600">
                              {
                                balance.available
                              }{' '}
                              left
                            </span>
                          </div>

                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all"
                              style={{
                                width: `${percentage}%`,
                              }}
                            />
                          </div>

                          <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
                            <span>
                              Used:{' '}
                              {
                                balance.used
                              }
                            </span>

                            <span>
                              Entitlement:{' '}
                              {
                                balance.entitlement
                              }
                            </span>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>

            {/* QUICK ACTION */}
            <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                <Plus className="h-5 w-5" />
              </div>

              <h2 className="mt-4 text-sm font-extrabold text-slate-900">
                New Leave Application
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Submit a staff leave request and optionally assign relief staff or attach medical certificate details.
              </p>

              <button
                type="button"
                onClick={
                  openCreateModal
                }
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700"
              >
                Start Application
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* SYSTEM INFO */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>

                <div>
                  <h3 className="text-xs font-extrabold text-slate-900">
                    Leave workflow
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Pending requests can be reviewed by authorised management. Approved requests update the staff leave balance and create a relief assignment when one is selected.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* CREATE LEAVE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.97,
              y: 10,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                  <Calendar className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    New Leave Application
                  </h2>

                  <p className="text-xs font-medium text-slate-500">
                    Create a new staff leave request.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={
                handleCreate
              }
              className="overflow-y-auto"
            >
              <div className="space-y-5 p-5 sm:p-6">
                {/* APPLICANT + TYPE */}
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-600">
                      Staff Member
                    </label>

                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />

                      <select
                        value={
                          form.applicant_user_id
                        }
                        onChange={(event) =>
                          updateForm(
                            'applicant_user_id',
                            event
                              .target
                              .value,
                          )
                        }
                        disabled={
                          !canManageAll
                        }
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-100"
                      >
                        <option value="">
                          Select staff member
                        </option>

                        {applicantOptions.map(
                          (user) => (
                            <option
                              key={
                                user.id
                              }
                              value={
                                user.id
                              }
                            >
                              {formatName(
                                user,
                              )}{' '}
                              —{' '}
                              {formatRole(
                                user.role,
                              )}
                            </option>
                          ),
                        )}
                      </select>

                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>

                    {!canManageAll &&
                      currentUser && (
                        <p className="mt-1.5 text-[10px] font-medium text-slate-400">
                          Staff members can submit leave for themselves.
                        </p>
                      )}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-600">
                      Leave Type
                    </label>

                    <div className="relative">
                      <BriefcaseBusiness className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />

                      <select
                        value={
                          form.leave_type
                        }
                        onChange={(event) =>
                          updateForm(
                            'leave_type',
                            event
                              .target
                              .value as LeaveType,
                          )
                        }
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      >
                        {LEAVE_TYPES.map(
                          (type) => (
                            <option
                              key={
                                type.value
                              }
                              value={
                                type.value
                              }
                            >
                              {
                                type.label
                              }
                            </option>
                          ),
                        )}
                      </select>

                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* DATES */}
                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-600">
                      Start Date
                    </label>

                    <input
                      type="date"
                      value={
                        form.start_date
                      }
                      onChange={(event) =>
                        handleDateChange(
                          'start_date',
                          event
                            .target
                            .value,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-600">
                      End Date
                    </label>

                    <input
                      type="date"
                      value={
                        form.end_date
                      }
                      min={
                        form.start_date ||
                        undefined
                      }
                      onChange={(event) =>
                        handleDateChange(
                          'end_date',
                          event
                            .target
                            .value,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-500">
                      Calculated Duration
                    </p>

                    <p className="mt-1 text-2xl font-extrabold text-indigo-700">
                      {form.days}
                    </p>

                    <p className="text-[10px] font-semibold text-indigo-500">
                      {form.days ===
                      1
                        ? 'calendar day'
                        : 'calendar days'}
                    </p>
                  </div>
                </div>

                {/* BALANCE */}
                {form.applicant_user_id && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">
                          Current entitlement
                        </p>

                        <p className="mt-1 text-[10px] text-slate-500">
                          {
                            formatLeaveType(
                              form.leave_type,
                            )
                          }{' '}
                          for{' '}
                          {formatName(
                            selectedApplicant,
                          )}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        {(() => {
                          const balance =
                            getBalance(
                              form.applicant_user_id,
                              form.leave_type,
                            );

                          const available =
                            Number(
                              balance.entitlement_days,
                            ) +
                            Number(
                              balance.carried_forward_days ||
                                0,
                            ) -
                            Number(
                              balance.used_days,
                            );

                          return (
                            <>
                              <p className="text-lg font-extrabold text-indigo-700">
                                {
                                  available
                                }{' '}
                                days
                              </p>

                              <p className="text-[10px] font-medium text-slate-400">
                                available
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* REASON */}
                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-600">
                    Reason
                  </label>

                  <textarea
                    value={
                      form.reason
                    }
                    onChange={(event) =>
                      updateForm(
                        'reason',
                        event
                          .target
                          .value,
                      )
                    }
                    rows={4}
                    placeholder="Explain the reason for this leave application..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                {/* RELIEF */}
                <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-violet-600" />

                    <div>
                      <p className="text-xs font-extrabold text-violet-900">
                        Relief Teacher / Staff
                      </p>

                      <p className="text-[10px] font-medium text-violet-600">
                        Optional. The system will create a relief assignment when the leave is approved.
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <select
                      value={
                        form.relief_teacher_user_id
                      }
                      onChange={(event) =>
                        updateForm(
                          'relief_teacher_user_id',
                          event
                            .target
                            .value,
                        )
                      }
                      className="w-full appearance-none rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                    >
                      <option value="">
                        No relief staff assigned
                      </option>

                      {reliefOptions.map(
                        (user) => (
                          <option
                            key={
                              user.id
                            }
                            value={
                              user.id
                            }
                          >
                            {formatName(
                              user,
                            )}{' '}
                            —{' '}
                            {formatRole(
                              user.role,
                            )}
                          </option>
                        ),
                      )}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* MEDICAL CERTIFICATE */}
                <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-rose-600" />

                    <div>
                      <p className="text-xs font-extrabold text-rose-900">
                        Medical Certificate
                      </p>

                      <p className="text-[10px] font-medium text-rose-600">
                        Add the certificate details for sick or medical leave.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                        Certificate Name
                      </label>

                      <input
                        value={
                          form.medical_certificate_name
                        }
                        onChange={(event) =>
                          updateForm(
                            'medical_certificate_name',
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="e.g. Medical Certificate - John Doe"
                        className="w-full rounded-xl border border-rose-100 bg-white px-4 py-3 text-xs font-semibold text-slate-800 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                        Certificate URL
                      </label>

                      <input
                        type="url"
                        value={
                          form.medical_certificate_url
                        }
                        onChange={(event) =>
                          updateForm(
                            'medical_certificate_url',
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="https://..."
                        className="w-full rounded-xl border border-rose-100 bg-white px-4 py-3 text-xs font-semibold text-slate-800 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10"
                      />
                    </div>
                  </div>
                </div>

                {/* NOTES */}
                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-600">
                    Management Notes
                  </label>

                  <textarea
                    value={
                      form.reviewer_notes
                    }
                    onChange={(event) =>
                      updateForm(
                        'reviewer_notes',
                        event
                          .target
                          .value,
                      )
                    }
                    rows={3}
                    placeholder="Optional internal notes..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <div className="flex gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                    <p className="text-[11px] font-medium leading-5 text-blue-800">
                      The request will be stored in the EIS leave-management database with a pending status. Authorised management users can approve or decline it.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Submit Leave Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default LeaveRequests;
