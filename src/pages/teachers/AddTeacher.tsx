import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Banknote,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  CircleUserRound,
  Clock,
  GraduationCap,
  HeartPulse,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Search,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';

/* =========================================================
   TYPES
========================================================= */

type UUID = string;

type TeacherRecord = {
  id: UUID;
  branch_id: UUID;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  gender: string;
  date_of_birth: string | null;
  phone_number: string;
  email: string | null;
  address: string | null;
  nationality: string | null;
  state_of_origin: string | null;
  lga: string | null;
  religion: string | null;
  photo_url: string | null;
  photo_public_id: string | null;
  qualification: string | null;
  specialization: string | null;
  department: string;
  position: string;
  is_class_teacher: boolean | null;
  staff_number: string | null;
  teacher_id: string | null;
  years_of_experience: number | null;
  previous_school: string | null;
  highest_qualification: string | null;
  teaching_certificate: string | null;
  certificate_number: string | null;
  certificate_issue_date: string | null;
  certificate_expiry_date: string | null;
  trcn_number: string | null;
  trcn_status: string | null;
  subjects_taught: string[] | null;
  class_assigned: string[] | null;
  salary: number | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  pension_company: string | null;
  pension_number: string | null;
  insurance_company: string | null;
  insurance_number: string | null;
  employment_date: string | null;
  contract_type: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  probation_end_date: string | null;
  confirmation_date: string | null;
  status: string | null;
  availability: string | null;
  working_hours: string | null;
  work_schedule: {
    start?: string;
    end?: string;
    days?: string[];
  } | null;
  biometrics_enrolled: boolean | null;
  biometrics_data: Record<string, unknown> | null;
  emergency_contact: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    relationship?: string;
  } | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: UUID | null;
  updated_by: UUID | null;
};

type Subject = {
  id: UUID;
  subject_id: string;
  branch_id: UUID | null;
  name: string;
  code: string;
  description: string | null;
};

type SchoolClass = {
  id: UUID;
  branch_id: UUID;
  class_id: string;
  name: string;
  code: string;
  level: string;
  department: string | null;
  status: string | null;
  academic_session: string | null;
};

type TeacherAssignment = {
  id: UUID;
  teacher_id: UUID;
  subject_id: UUID;
  class_id: UUID | null;
};

type TeacherFormData = {
  first_name: string;
  last_name: string;
  middle_name: string;

  gender: string;
  date_of_birth: string;

  phone_number: string;
  email: string;
  address: string;
  nationality: string;
  state_of_origin: string;
  lga: string;
  religion: string;

  photo_url: string;
  photo_public_id: string;

  qualification: string;
  specialization: string;
  department: string;
  position: string;

  is_class_teacher: boolean;

  staff_number: string;
  teacher_id: string;

  years_of_experience: string;
  previous_school: string;
  highest_qualification: string;

  teaching_certificate: string;
  certificate_number: string;
  certificate_issue_date: string;
  certificate_expiry_date: string;

  trcn_number: string;
  trcn_status: string;

  subjects_taught: string[];
  class_assigned: string[];

  salary: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;

  pension_company: string;
  pension_number: string;

  insurance_company: string;
  insurance_number: string;

  employment_date: string;
  contract_type: string;
  contract_start_date: string;
  contract_end_date: string;
  probation_end_date: string;
  confirmation_date: string;

  status: string;
  availability: string;
  working_hours: string;

  work_schedule_start: string;
  work_schedule_end: string;
  work_schedule_days: string[];

  biometrics_enrolled: boolean;

  emergency_name: string;
  emergency_email: string;
  emergency_phone: string;
  emergency_address: string;
  emergency_relationship: string;
};

type SectionKey =
  | 'personal'
  | 'contact'
  | 'professional'
  | 'assignment'
  | 'employment'
  | 'financial'
  | 'emergency'
  | 'biometric';

/* =========================================================
   PROPS
========================================================= */

interface AddTeacherProps {
  branchId?: string;
  teacherId?: string;
  onSuccess?: (teacher: TeacherRecord) => void;
  onCancel?: () => void;
}

/* =========================================================
   CONSTANTS
========================================================= */

const BRANCH_ID_FALLBACK_KEYS = [
  'active_branch_id',
  'branch_id',
  'current_branch_id',
  'selected_branch_id',
];

const DEPARTMENTS = [
  'Academics',
  'Administration',
  'Arts',
  'Basic',
  'Business',
  'Early Years',
  'ICT',
  'Languages',
  'Science',
  'Sports',
  'Technical',
  'Vocational',
];

const POSITIONS = [
  'Teacher',
  'Senior Teacher',
  'Head Teacher',
  'Assistant Head Teacher',
  'Head of Department',
  'Vice Principal',
  'Principal',
  'Director',
  'Counselor',
  'Librarian',
  'Sports Coordinator',
  'ICT Officer',
  'Administrator',
];

const GENDERS = ['Male', 'Female'];

const RELIGIONS = [
  'Christianity',
  'Islam',
  'Traditional',
  'Other',
  'Prefer not to say',
];

const QUALIFICATIONS = [
  'NCE',
  'OND',
  'HND',
  'B.Ed',
  'B.Sc',
  'B.A',
  'B.Tech',
  'PGDE',
  'M.Ed',
  'M.Sc',
  'M.A',
  'Ph.D',
  'Other',
];

const CONTRACT_TYPES = [
  'permanent',
  'contract',
  'temporary',
  'part-time',
  'internship',
];

const TEACHING_CERTIFICATES = [
  'TRCN',
  'NCE',
  'PGDE',
  'B.Ed',
  'Other',
  'None',
];

const TRCN_STATUSES = [
  'Valid',
  'Pending',
  'Expired',
  'Not Registered',
];

const TEACHER_STATUSES = [
  'active',
  'inactive',
  'suspended',
  'resigned',
  'terminated',
  'retired',
];

const AVAILABILITY_OPTIONS = [
  'available',
  'unavailable',
  'on_leave',
];

const WORKING_HOURS_OPTIONS = [
  'Full-time',
  'Part-time',
  'Flexible',
];

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/* =========================================================
   DEFAULT FORM
========================================================= */

const DEFAULT_FORM: TeacherFormData = {
  first_name: '',
  last_name: '',
  middle_name: '',

  gender: '',
  date_of_birth: '',

  phone_number: '',
  email: '',
  address: '',
  nationality: 'Nigerian',
  state_of_origin: '',
  lga: '',
  religion: '',

  photo_url: '',
  photo_public_id: '',

  qualification: '',
  specialization: '',
  department: 'Academics',
  position: 'Teacher',

  is_class_teacher: false,

  staff_number: '',
  teacher_id: '',

  years_of_experience: '0',
  previous_school: '',
  highest_qualification: '',

  teaching_certificate: '',
  certificate_number: '',
  certificate_issue_date: '',
  certificate_expiry_date: '',

  trcn_number: '',
  trcn_status: 'Not Registered',

  subjects_taught: [],
  class_assigned: [],

  salary: '',
  bank_name: '',
  bank_account_number: '',
  bank_account_name: '',

  pension_company: '',
  pension_number: '',

  insurance_company: '',
  insurance_number: '',

  employment_date: '',
  contract_type: 'permanent',
  contract_start_date: '',
  contract_end_date: '',
  probation_end_date: '',
  confirmation_date: '',

  status: 'active',
  availability: 'available',
  working_hours: 'Full-time',

  work_schedule_start: '08:00',
  work_schedule_end: '16:00',
  work_schedule_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],

  biometrics_enrolled: false,

  emergency_name: '',
  emergency_email: '',
  emergency_phone: '',
  emergency_address: '',
  emergency_relationship: '',
};

/* =========================================================
   HELPERS
========================================================= */

const toNullableString = (value: string | undefined | null) => {
  const trimmed = String(value ?? '').trim();
  return trimmed === '' ? null : trimmed;
};

const parseInteger = (value: string, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseNumber = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const uniq = <T,>(items: T[]) => Array.from(new Set(items));

const getStoredBranchId = () => {
  for (const key of BRANCH_ID_FALLBACK_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

const cleanObject = <T extends Record<string, unknown>>(object: T): T => {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => {
      if (typeof value === 'string') {
        return [key, toNullableString(value)];
      }

      return [key, value];
    }),
  ) as T;
};

const formatError = (error: unknown) => {
  if (!error) return 'An unexpected error occurred.';

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      message?: string;
      details?: string;
      hint?: string;
    };

    return (
      maybeError.message ||
      maybeError.details ||
      maybeError.hint ||
      'An unexpected error occurred.'
    );
  }

  return 'An unexpected error occurred.';
};

const normalizeText = (value: string | null | undefined) =>
  String(value ?? '').trim().toLowerCase();

/* =========================================================
   COMPONENT
========================================================= */

const AddTeacher: React.FC<AddTeacherProps> = ({
  branchId,
  teacherId,
  onSuccess,
  onCancel,
}) => {
  const isEditing = Boolean(teacherId);

  const [formData, setFormData] =
    useState<TeacherFormData>(DEFAULT_FORM);

  const [resolvedBranchId, setResolvedBranchId] = useState(
    branchId || '',
  );

  const [branchCode, setBranchCode] = useState('STAFF');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [curriculumPairs, setCurriculumPairs] = useState<Set<string>>(
    new Set(),
  );

  const [teacherAssignments, setTeacherAssignments] = useState<
    TeacherAssignment[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');

  const [openSections, setOpenSections] = useState<
    Record<SectionKey, boolean>
  >({
    personal: true,
    contact: true,
    professional: true,
    assignment: true,
    employment: false,
    financial: false,
    emergency: false,
    biometric: false,
  });

  /* =======================================================
     BRANCH RESOLUTION
  ======================================================= */

  const resolveBranch = useCallback(async () => {
    const suppliedBranch = branchId?.trim();

    if (suppliedBranch) {
      setResolvedBranchId(suppliedBranch);
      return suppliedBranch;
    }

    const storedBranch = getStoredBranchId();

    if (storedBranch) {
      setResolvedBranchId(storedBranch);
      return storedBranch;
    }

    const { data, error: branchError } = await supabase
      .from('branches')
      .select('id, branch_code')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (branchError) {
      throw branchError;
    }

    if (!data?.id) {
      throw new Error(
        'No school branch could be resolved. Pass branchId to AddTeacher or set the active branch in localStorage.',
      );
    }

    setResolvedBranchId(data.id);

    return data.id;
  }, [branchId]);

  /* =======================================================
     BRANCH CODE
  ======================================================= */

  const loadBranchCode = useCallback(async (activeBranchId: string) => {
    const { data, error: branchError } = await supabase
      .from('branches')
      .select('branch_code')
      .eq('id', activeBranchId)
      .maybeSingle();

    if (branchError) {
      throw branchError;
    }

    if (data?.branch_code) {
      setBranchCode(
        String(data.branch_code)
          .replace(/[^A-Za-z0-9]/g, '')
          .toUpperCase(),
      );
    } else {
      setBranchCode('STAFF');
    }
  }, []);

  /* =======================================================
     LOAD SUBJECTS
  ======================================================= */

  const loadSubjects = useCallback(async (activeBranchId: string) => {
    const { data, error: subjectError } = await supabase
      .from('subjects')
      .select(
        'id, subject_id, branch_id, name, code, description',
      )
      .or(`branch_id.eq.${activeBranchId},branch_id.is.null`)
      .order('name', { ascending: true });

    if (subjectError) {
      throw subjectError;
    }

    setSubjects((data || []) as Subject[]);
  }, []);

  /* =======================================================
     LOAD CLASSES
  ======================================================= */

  const loadClasses = useCallback(async (activeBranchId: string) => {
    const { data, error: classError } = await supabase
      .from('classes')
      .select(
        'id, branch_id, class_id, name, code, level, department, status, academic_session',
      )
      .eq('branch_id', activeBranchId)
      .neq('status', 'inactive')
      .order('name', { ascending: true });

    if (classError) {
      throw classError;
    }

    setClasses((data || []) as SchoolClass[]);
  }, []);

  /* =======================================================
     LOAD CURRICULUM
  ======================================================= */

  const loadCurriculum = useCallback(
    async (activeBranchId: string) => {
      const { data, error: curriculumError } = await supabase
        .from('class_subjects')
        .select('class_id, subject_id')
        .eq('branch_id', activeBranchId)
        .eq('status', 'active');

      if (curriculumError) {
        throw curriculumError;
      }

      const pairs = new Set<string>();

      (data || []).forEach((row: { class_id: string; subject_id: string }) => {
        pairs.add(`${row.class_id}:${row.subject_id}`);
      });

      setCurriculumPairs(pairs);
    },
    [],
  );

  /* =======================================================
     LOAD TEACHER
  ======================================================= */

  const loadTeacher = useCallback(async (id: string) => {
    const { data, error: teacherError } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', id)
      .single();

    if (teacherError) {
      throw teacherError;
    }

    if (!data) {
      throw new Error('Teacher record was not found.');
    }

    const teacher = data as TeacherRecord;

    const schedule = teacher.work_schedule || {};

    setFormData({
      first_name: teacher.first_name || '',
      last_name: teacher.last_name || '',
      middle_name: teacher.middle_name || '',

      gender: teacher.gender || '',
      date_of_birth: teacher.date_of_birth || '',

      phone_number: teacher.phone_number || '',
      email: teacher.email || '',
      address: teacher.address || '',
      nationality: teacher.nationality || 'Nigerian',
      state_of_origin: teacher.state_of_origin || '',
      lga: teacher.lga || '',
      religion: teacher.religion || '',

      photo_url: teacher.photo_url || '',
      photo_public_id: teacher.photo_public_id || '',

      qualification: teacher.qualification || '',
      specialization: teacher.specialization || '',
      department: teacher.department || 'Academics',
      position: teacher.position || 'Teacher',

      is_class_teacher: Boolean(teacher.is_class_teacher),

      staff_number: teacher.staff_number || '',
      teacher_id: teacher.teacher_id || '',

      years_of_experience: String(
        teacher.years_of_experience ?? 0,
      ),
      previous_school: teacher.previous_school || '',
      highest_qualification: teacher.highest_qualification || '',

      teaching_certificate: teacher.teaching_certificate || '',
      certificate_number: teacher.certificate_number || '',
      certificate_issue_date:
        teacher.certificate_issue_date || '',
      certificate_expiry_date:
        teacher.certificate_expiry_date || '',

      trcn_number: teacher.trcn_number || '',
      trcn_status: teacher.trcn_status || 'Not Registered',

      subjects_taught: teacher.subjects_taught || [],
      class_assigned: teacher.class_assigned || [],

      salary:
        teacher.salary !== null && teacher.salary !== undefined
          ? String(teacher.salary)
          : '',
      bank_name: teacher.bank_name || '',
      bank_account_number: teacher.bank_account_number || '',
      bank_account_name: teacher.bank_account_name || '',

      pension_company: teacher.pension_company || '',
      pension_number: teacher.pension_number || '',

      insurance_company: teacher.insurance_company || '',
      insurance_number: teacher.insurance_number || '',

      employment_date: teacher.employment_date || '',
      contract_type: teacher.contract_type || 'permanent',
      contract_start_date: teacher.contract_start_date || '',
      contract_end_date: teacher.contract_end_date || '',
      probation_end_date: teacher.probation_end_date || '',
      confirmation_date: teacher.confirmation_date || '',

      status: teacher.status || 'active',
      availability: teacher.availability || 'available',
      working_hours: teacher.working_hours || 'Full-time',

      work_schedule_start: schedule.start || '08:00',
      work_schedule_end: schedule.end || '16:00',
      work_schedule_days:
        schedule.days && schedule.days.length > 0
          ? schedule.days
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],

      biometrics_enrolled: Boolean(teacher.biometrics_enrolled),

      emergency_name: teacher.emergency_contact?.name || '',
      emergency_email: teacher.emergency_contact?.email || '',
      emergency_phone: teacher.emergency_contact?.phone || '',
      emergency_address: teacher.emergency_contact?.address || '',
      emergency_relationship:
        teacher.emergency_contact?.relationship || '',
    });

    const { data: assignments, error: assignmentsError } =
      await supabase
        .from('teacher_subjects')
        .select('id, teacher_id, subject_id, class_id')
        .eq('teacher_id', id);

    if (assignmentsError) {
      throw assignmentsError;
    }

    setTeacherAssignments(
      (assignments || []) as TeacherAssignment[],
    );

    const subjectIds = uniq(
      (assignments || [])
        .map((row) => row.subject_id)
        .filter(Boolean),
    );

    const classIds = uniq(
      (assignments || [])
        .map((row) => row.class_id)
        .filter(Boolean) as string[],
    );

    /*
      We intentionally rebuild the normalized selections from
      teacher_subjects because that is the source of truth for
      current teacher assignments.
    */
    setFormData((previous) => ({
      ...previous,
      subjects_taught:
        subjectIds.length > 0
          ? subjectIds
          : previous.subjects_taught,
      class_assigned:
        classIds.length > 0
          ? classIds
          : previous.class_assigned,
    }));
  }, []);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const activeBranchId = await resolveBranch();

        if (!mounted) return;

        await Promise.all([
          loadBranchCode(activeBranchId),
          loadSubjects(activeBranchId),
          loadClasses(activeBranchId),
          loadCurriculum(activeBranchId),
        ]);

        if (teacherId) {
          await loadTeacher(teacherId);
        } else {
          setFormData((previous) => ({
            ...DEFAULT_FORM,
            employment_date:
              previous.employment_date ||
              new Date().toISOString().slice(0, 10),
          }));
        }
      } catch (initializationError) {
        if (!mounted) return;

        setError(formatError(initializationError));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [
    loadBranchCode,
    loadClasses,
    loadCurriculum,
    loadSubjects,
    loadTeacher,
    resolveBranch,
    teacherId,
  ]);

  /* =======================================================
     FORM HANDLERS
  ======================================================= */

  const updateField = <K extends keyof TeacherFormData>(
    field: K,
    value: TeacherFormData[K],
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (error) setError('');
    if (success) setSuccess('');
  };

  const toggleSection = (section: SectionKey) => {
    setOpenSections((previous) => ({
      ...previous,
      [section]: !previous[section],
    }));
  };

  const toggleArrayValue = (
    field: 'subjects_taught' | 'class_assigned' | 'work_schedule_days',
    value: string,
  ) => {
    setFormData((previous) => {
      const current = previous[field];

      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      return {
        ...previous,
        [field]: next,
      };
    });
  };

  /* =======================================================
     FILTERS
  ======================================================= */

  const filteredSubjects = useMemo(() => {
    const query = normalizeText(subjectSearch);

    if (!query) return subjects;

    return subjects.filter((subject) => {
      return (
        normalizeText(subject.name).includes(query) ||
        normalizeText(subject.code).includes(query) ||
        normalizeText(subject.subject_id).includes(query)
      );
    });
  }, [subjectSearch, subjects]);

  const filteredClasses = useMemo(() => {
    const query = normalizeText(classSearch);

    if (!query) return classes;

    return classes.filter((schoolClass) => {
      return (
        normalizeText(schoolClass.name).includes(query) ||
        normalizeText(schoolClass.code).includes(query) ||
        normalizeText(schoolClass.class_id).includes(query)
      );
    });
  }, [classSearch, classes]);

  const selectedSubjects = useMemo(() => {
    return subjects.filter((subject) =>
      formData.subjects_taught.includes(subject.id),
    );
  }, [formData.subjects_taught, subjects]);

  const selectedClasses = useMemo(() => {
    return classes.filter((schoolClass) =>
      formData.class_assigned.includes(schoolClass.id),
    );
  }, [classes, formData.class_assigned]);

  /* =======================================================
     STAFF NUMBER
  ======================================================= */

  const generateStaffNumber = useCallback(async () => {
    if (!resolvedBranchId) {
      throw new Error('School branch is not available.');
    }

    /*
      Format:
      BRANCH/YEAR/MONTH/0001

      Example:
      EISO/2026/09/0001

      We calculate the highest existing sequence rather than using
      count + 1. This avoids duplicates when records have been deleted.
    */

    const now = new Date();

    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const prefix = `${branchCode}/${year}/${month}/`;

    const { data, error: staffError } = await supabase
      .from('teachers')
      .select('staff_number')
      .eq('branch_id', resolvedBranchId)
      .not('staff_number', 'is', null);

    if (staffError) {
      throw staffError;
    }

    let highestSequence = 0;

    (data || []).forEach((row: { staff_number: string | null }) => {
      const value = row.staff_number || '';

      if (!value.startsWith(prefix)) {
        return;
      }

      const sequencePart = value.slice(prefix.length);
      const sequence = Number.parseInt(sequencePart, 10);

      if (Number.isFinite(sequence) && sequence > highestSequence) {
        highestSequence = sequence;
      }
    });

    const nextSequence = String(highestSequence + 1).padStart(
      4,
      '0',
    );

    return `${prefix}${nextSequence}`;
  }, [branchCode, resolvedBranchId]);

  /* =======================================================
     TEACHER ID
  ======================================================= */

  const generateTeacherId = useCallback(async () => {
    if (!resolvedBranchId) {
      throw new Error('School branch is not available.');
    }

    const year = new Date().getFullYear();

    const prefix = `TCH/${year}/`;

    const { data, error: teacherIdError } = await supabase
      .from('teachers')
      .select('teacher_id')
      .eq('branch_id', resolvedBranchId)
      .not('teacher_id', 'is', null);

    if (teacherIdError) {
      throw teacherIdError;
    }

    let highestSequence = 0;

    (data || []).forEach(
      (row: { teacher_id: string | null }) => {
        const value = row.teacher_id || '';

        if (!value.startsWith(prefix)) {
          return;
        }

        const sequence = Number.parseInt(
          value.slice(prefix.length),
          10,
        );

        if (Number.isFinite(sequence) && sequence > highestSequence) {
          highestSequence = sequence;
        }
      },
    );

    return `${prefix}${String(highestSequence + 1).padStart(
      4,
      '0',
    )}`;
  }, [resolvedBranchId]);

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validateForm = () => {
    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    const phone = formData.phone_number.trim();

    if (!firstName) {
      return 'First name is required.';
    }

    if (!lastName) {
      return 'Last name is required.';
    }

    if (!formData.gender) {
      return 'Gender is required.';
    }

    if (!phone) {
      return 'Phone number is required.';
    }

    if (!formData.department.trim()) {
      return 'Department is required.';
    }

    if (!formData.position.trim()) {
      return 'Position is required.';
    }

    if (formData.email.trim()) {
      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(formData.email.trim())) {
        return 'Please enter a valid email address.';
      }
    }

    if (formData.certificate_issue_date &&
        formData.certificate_expiry_date) {
      const issueDate = new Date(
        formData.certificate_issue_date,
      ).getTime();

      const expiryDate = new Date(
        formData.certificate_expiry_date,
      ).getTime();

      if (
        Number.isFinite(issueDate) &&
        Number.isFinite(expiryDate) &&
        expiryDate < issueDate
      ) {
        return 'Certificate expiry date cannot be earlier than the issue date.';
      }
    }

    if (
      formData.contract_start_date &&
      formData.contract_end_date
    ) {
      const startDate = new Date(
        formData.contract_start_date,
      ).getTime();

      const endDate = new Date(
        formData.contract_end_date,
      ).getTime();

      if (
        Number.isFinite(startDate) &&
        Number.isFinite(endDate) &&
        endDate < startDate
      ) {
        return 'Contract end date cannot be earlier than the start date.';
      }
    }

    return '';
  };

  /* =======================================================
     CURRICULUM ASSIGNMENT CALCULATION
  ======================================================= */

  const validTeacherPairs = useMemo(() => {
    const pairs: Array<{
      class_id: string;
      subject_id: string;
    }> = [];

    for (const classId of formData.class_assigned) {
      for (const subjectId of formData.subjects_taught) {
        const key = `${classId}:${subjectId}`;

        if (curriculumPairs.has(key)) {
          pairs.push({
            class_id: classId,
            subject_id: subjectId,
          });
        }
      }
    }

    return pairs;
  }, [
    curriculumPairs,
    formData.class_assigned,
    formData.subjects_taught,
  ]);

  const invalidTeacherPairCount = useMemo(() => {
    const total =
      formData.class_assigned.length *
      formData.subjects_taught.length;

    return Math.max(total - validTeacherPairs.length, 0);
  }, [
    formData.class_assigned.length,
    formData.subjects_taught.length,
    validTeacherPairs.length,
  ]);

  /* =======================================================
     SYNC TEACHER-SUBJECT ASSIGNMENTS
  ======================================================= */

  const syncTeacherAssignments = async (
    savedTeacherId: string,
  ) => {
    /*
      teacher_subjects has a unique class+subject combination.

      We therefore remove this teacher's old rows and recreate
      them from the current selections, but ONLY where the
      school curriculum already permits that class/subject pair.
    */

    const { error: deleteError } = await supabase
      .from('teacher_subjects')
      .delete()
      .eq('teacher_id', savedTeacherId);

    if (deleteError) {
      throw deleteError;
    }

    if (validTeacherPairs.length === 0) {
      setTeacherAssignments([]);
      return;
    }

    /*
      Check whether another teacher is already assigned to any of
      these class/subject combinations.
    */

    const classIds = uniq(
      validTeacherPairs.map((pair) => pair.class_id),
    );

    const subjectIds = uniq(
      validTeacherPairs.map((pair) => pair.subject_id),
    );

    const { data: existingAssignments, error: existingError } =
      await supabase
        .from('teacher_subjects')
        .select('id, teacher_id, subject_id, class_id')
        .in('class_id', classIds)
        .in('subject_id', subjectIds);

    if (existingError) {
      throw existingError;
    }

    const existingByPair = new Map<string, TeacherAssignment>();

    (existingAssignments || []).forEach(
      (assignment: TeacherAssignment) => {
        existingByPair.set(
          `${assignment.class_id}:${assignment.subject_id}`,
          assignment,
        );
      },
    );

    /*
      Important:
      The delete above removes this teacher's rows only, so any
      remaining assignment belongs to another teacher.
    */

    const conflictingPairs = validTeacherPairs.filter(
      (pair) => {
        const existing = existingByPair.get(
          `${pair.class_id}:${pair.subject_id}`,
        );

        return (
          Boolean(existing) &&
          existing.teacher_id !== savedTeacherId
        );
      },
    );

    if (conflictingPairs.length > 0) {
      const conflictNames = conflictingPairs
        .slice(0, 5)
        .map((pair) => {
          const className =
            classes.find((item) => item.id === pair.class_id)
              ?.name || 'Class';

          const subjectName =
            subjects.find((item) => item.id === pair.subject_id)
              ?.name || 'Subject';

          return `${className} — ${subjectName}`;
        });

      throw new Error(
        `Some selected class/subject combinations are already assigned to another teacher: ${conflictNames.join(
          ', ',
        )}${conflictingPairs.length > 5 ? '…' : ''}`,
      );
    }

    const payload = validTeacherPairs.map((pair) => ({
      teacher_id: savedTeacherId,
      subject_id: pair.subject_id,
      class_id: pair.class_id,
    }));

    const { data, error: insertError } = await supabase
      .from('teacher_subjects')
      .insert(payload)
      .select('id, teacher_id, subject_id, class_id');

    if (insertError) {
      throw insertError;
    }

    setTeacherAssignments(
      (data || []) as TeacherAssignment[],
    );
  };

  /* =======================================================
     UPDATE CLASS TEACHER
  ======================================================= */

  const syncClassTeacher = async (
    savedTeacherId: string,
  ) => {
    /*
      A teacher may be marked as class teacher.

      We use the first selected class as the class-teacher class.
      Other selected classes remain normal teaching assignments.
    */

    if (!formData.is_class_teacher) {
      /*
        Do not remove the teacher from every class because an
        existing class might use them as class teacher independently.
        Only clear classes currently pointing directly to this teacher.
      */

      const { error } = await supabase
        .from('classes')
        .update({
          class_teacher_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('branch_id', resolvedBranchId)
        .eq('class_teacher_id', savedTeacherId);

      if (error) {
        throw error;
      }

      return;
    }

    if (formData.class_assigned.length === 0) {
      throw new Error(
        'Select at least one class before marking this teacher as a class teacher.',
      );
    }

    const primaryClassId = formData.class_assigned[0];

    /*
      Remove current teacher from any previous class-teacher
      assignments in this branch.
    */

    const { error: clearOwnError } = await supabase
      .from('classes')
      .update({
        class_teacher_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('branch_id', resolvedBranchId)
      .eq('class_teacher_id', savedTeacherId);

    if (clearOwnError) {
      throw clearOwnError;
    }

    /*
      Assign this teacher to the first selected class.
    */

    const { error: assignError } = await supabase
      .from('classes')
      .update({
        class_teacher_id: savedTeacherId,
        updated_at: new Date().toISOString(),
      })
      .eq('branch_id', resolvedBranchId)
      .eq('id', primaryClassId);

    if (assignError) {
      throw assignError;
    }
  };

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!resolvedBranchId) {
      setError(
        'School branch could not be determined.',
      );
      return;
    }

    setSaving(true);

    try {
      let activeStaffNumber = formData.staff_number.trim();
      let activeTeacherId = formData.teacher_id.trim();

      /*
        Generate identifiers ONLY for new teachers.
      */

      if (!isEditing) {
        if (!activeStaffNumber) {
          activeStaffNumber =
            await generateStaffNumber();
        }

        if (!activeTeacherId) {
          activeTeacherId =
            await generateTeacherId();
        }
      }

      /*
        Ensure staff number is still present.
      */

      if (!activeStaffNumber) {
        activeStaffNumber =
          await generateStaffNumber();
      }

      if (!activeTeacherId) {
        activeTeacherId =
          await generateTeacherId();
      }

      const userResult = await supabase.auth.getUser();
      const currentUserId = userResult.data.user?.id || null;

      const emergencyContact = cleanObject({
        name: formData.emergency_name,
        email: formData.emergency_email,
        phone: formData.emergency_phone,
        address: formData.emergency_address,
        relationship:
          formData.emergency_relationship,
      });

      const workSchedule = {
        start:
          formData.work_schedule_start || '08:00',
        end:
          formData.work_schedule_end || '16:00',
        days:
          formData.work_schedule_days.length > 0
            ? formData.work_schedule_days
            : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      };

      /*
        Human-readable arrays are preserved on teachers table for
        backwards compatibility with existing pages.

        Normalized assignments are stored in teacher_subjects below.
      */

      const subjectNames = selectedSubjects.map(
        (subject) => subject.name,
      );

      const classNames = selectedClasses.map(
        (schoolClass) => schoolClass.name,
      );

      const teacherPayload = {
        branch_id: resolvedBranchId,

        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        middle_name: toNullableString(formData.middle_name),

        gender: formData.gender,
        date_of_birth:
          toNullableString(formData.date_of_birth),

        phone_number: formData.phone_number.trim(),
        email: toNullableString(formData.email),
        address: toNullableString(formData.address),
        nationality:
          toNullableString(formData.nationality) ||
          'Nigerian',
        state_of_origin:
          toNullableString(formData.state_of_origin),
        lga: toNullableString(formData.lga),
        religion: toNullableString(formData.religion),

        photo_url: toNullableString(formData.photo_url),
        photo_public_id: toNullableString(
          formData.photo_public_id,
        ),

        qualification:
          toNullableString(formData.qualification),
        specialization:
          toNullableString(formData.specialization),

        department: formData.department.trim(),
        position: formData.position.trim(),

        is_class_teacher:
          formData.is_class_teacher,

        staff_number: activeStaffNumber,
        teacher_id: activeTeacherId,

        years_of_experience: parseInteger(
          formData.years_of_experience,
          0,
        ),

        previous_school:
          toNullableString(formData.previous_school),

        highest_qualification:
          toNullableString(
            formData.highest_qualification,
          ),

        teaching_certificate:
          toNullableString(
            formData.teaching_certificate,
          ),

        certificate_number:
          toNullableString(
            formData.certificate_number,
          ),

        certificate_issue_date:
          toNullableString(
            formData.certificate_issue_date,
          ),

        certificate_expiry_date:
          toNullableString(
            formData.certificate_expiry_date,
          ),

        trcn_number:
          toNullableString(formData.trcn_number),

        trcn_status:
          toNullableString(formData.trcn_status),

        subjects_taught: subjectNames,
        class_assigned: classNames,

        salary:
          formData.salary.trim() !== ''
            ? parseNumber(formData.salary, 0)
            : 0,

        bank_name:
          toNullableString(formData.bank_name),

        bank_account_number:
          toNullableString(
            formData.bank_account_number,
          ),

        bank_account_name:
          toNullableString(
            formData.bank_account_name,
          ),

        pension_company:
          toNullableString(
            formData.pension_company,
          ),

        pension_number:
          toNullableString(formData.pension_number),

        insurance_company:
          toNullableString(
            formData.insurance_company,
          ),

        insurance_number:
          toNullableString(
            formData.insurance_number,
          ),

        employment_date:
          toNullableString(formData.employment_date),

        contract_type:
          formData.contract_type || 'permanent',

        contract_start_date:
          toNullableString(
            formData.contract_start_date,
          ),

        contract_end_date:
          toNullableString(
            formData.contract_end_date,
          ),

        probation_end_date:
          toNullableString(
            formData.probation_end_date,
          ),

        confirmation_date:
          toNullableString(
            formData.confirmation_date,
          ),

        status: formData.status || 'active',
        availability:
          formData.availability || 'available',

        working_hours:
          formData.working_hours || 'Full-time',

        work_schedule: workSchedule,

        /*
          We do not invent biometric templates in this form.
          If your physical biometric device has already enrolled
          the staff member, this boolean can be switched on.
        */
        biometrics_enrolled:
          formData.biometrics_enrolled,

        biometrics_data:
          formData.biometrics_enrolled
            ? {
                source: 'external_device',
                last_verified: new Date().toISOString(),
              }
            : null,

        emergency_contact: emergencyContact,

        updated_at: new Date().toISOString(),
        updated_by: currentUserId,
      };

      let savedTeacher: TeacherRecord;

      if (isEditing && teacherId) {
        const { data, error: updateError } =
          await supabase
            .from('teachers')
            .update(teacherPayload)
            .eq('id', teacherId)
            .select('*')
            .single();

        if (updateError) {
          /*
            staff_number is unique. Give the user a readable
            message instead of showing a raw Postgres error.
          */

          if (
            String(updateError.message || '')
              .toLowerCase()
              .includes('staff_number')
          ) {
            throw new Error(
              `Staff number "${activeStaffNumber}" is already in use.`,
            );
          }

          throw updateError;
        }

        savedTeacher = data as TeacherRecord;
      } else {
        const { data, error: insertError } =
          await supabase
            .from('teachers')
            .insert({
              ...teacherPayload,
              created_at: new Date().toISOString(),
              created_by: currentUserId,
            })
            .select('*')
            .single();

        if (insertError) {
          /*
            Retry once when another concurrent creation has used
            the generated staff number.
          */

          const isDuplicateStaffNumber =
            String(insertError.message || '')
              .toLowerCase()
              .includes('teachers_employee_number_key') ||
            String(insertError.message || '')
              .toLowerCase()
              .includes('staff_number');

          if (isDuplicateStaffNumber) {
            const retryStaffNumber =
              await generateStaffNumber();

            const { data: retryData, error: retryError } =
              await supabase
                .from('teachers')
                .insert({
                  ...teacherPayload,
                  staff_number: retryStaffNumber,
                  created_at:
                    new Date().toISOString(),
                  created_by: currentUserId,
                })
                .select('*')
                .single();

            if (retryError) {
              throw retryError;
            }

            savedTeacher = retryData as TeacherRecord;
          } else {
            throw insertError;
          }
        } else {
          savedTeacher = data as TeacherRecord;
        }
      }

      /*
        Sync normalized subject/class assignments.
      */

      await syncTeacherAssignments(savedTeacher.id);

      /*
        Sync class teacher assignment.
      */

      await syncClassTeacher(savedTeacher.id);

      /*
        Keep visible form state synchronized with DB.
      */

      setFormData((previous) => ({
        ...previous,
        staff_number:
          savedTeacher.staff_number ||
          activeStaffNumber,
        teacher_id:
          savedTeacher.teacher_id ||
          activeTeacherId,
      }));

      setSuccess(
        isEditing
          ? 'Teacher record updated successfully.'
          : 'Teacher added successfully.',
      );

      onSuccess?.(savedTeacher);
    } catch (saveError) {
      setError(formatError(saveError));
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     RENDER HELPERS
  ======================================================= */

  const SectionHeader: React.FC<{
    section: SectionKey;
    icon: React.ReactNode;
    title: string;
    description?: string;
  }> = ({
    section,
    icon,
    title,
    description,
  }) => {
    const open = openSections[section];

    return (
      <button
        type="button"
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200 bg-white hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            {icon}
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              {title}
            </h2>

            {description && (
              <p className="text-xs text-slate-500 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {open ? (
          <ChevronUp className="w-5 h-5 text-slate-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-500" />
        )}
      </button>
    );
  };

  const FieldLabel: React.FC<{
    children: React.ReactNode;
    required?: boolean;
  }> = ({ children, required }) => (
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      {children}
      {required && (
        <span className="text-red-500 ml-1">*</span>
      )}
    </label>
  );

  const Input = (
    props: React.InputHTMLAttributes<HTMLInputElement>,
  ) => (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
        props.className || ''
      }`}
    />
  );

  const Select = (
    props: React.SelectHTMLAttributes<HTMLSelectElement>,
  ) => (
    <select
      {...props}
      className={`w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
        props.className || ''
      }`}
    />
  );

  const Textarea = (
    props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  ) => (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
        props.className || ''
      }`}
    />
  );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">
            Loading teacher form...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* =====================================================
          TOP HEADER
      ===================================================== */}

      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-[76px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
                  title="Go back"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>

                  <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                      {isEditing
                        ? 'Edit Teacher'
                        : 'Add Teacher'}
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-500">
                      {isEditing
                        ? 'Update teacher information and assignments'
                        : 'Register a new teacher in the school'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-slate-500">
                Branch
              </span>

              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                {branchCode}
              </span>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"
      >
        {/* ===================================================
            ALERTS
        =================================================== */}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />

              <div className="flex-1">
                <p className="font-semibold text-red-900">
                  Unable to save teacher
                </p>

                <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-700" />
              </div>

              <div>
                <p className="font-semibold text-emerald-900">
                  Success
                </p>

                <p className="text-sm text-emerald-700">
                  {success}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            IDENTIFIERS CARD
        =================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-slate-700" />

              <div>
                <h2 className="font-semibold text-slate-900">
                  Staff Identification
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  These identifiers are unique within the school.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel>Staff Number</FieldLabel>

              <Input
                value={formData.staff_number}
                onChange={(event) =>
                  updateField(
                    'staff_number',
                    event.target.value,
                  )
                }
                placeholder="Auto-generated"
                readOnly={!isEditing}
              />

              <p className="text-[11px] text-slate-500 mt-1">
                Format: {branchCode}/YYYY/MM/0001
              </p>
            </div>

            <div>
              <FieldLabel>Teacher ID</FieldLabel>

              <Input
                value={formData.teacher_id}
                onChange={(event) =>
                  updateField(
                    'teacher_id',
                    event.target.value,
                  )
                }
                placeholder="Auto-generated"
                readOnly={!isEditing}
              />

              <p className="text-[11px] text-slate-500 mt-1">
                Unique teacher identifier.
              </p>
            </div>

            <div>
              <FieldLabel>Status</FieldLabel>

              <Select
                value={formData.status}
                onChange={(event) =>
                  updateField(
                    'status',
                    event.target.value,
                  )
                }
              >
                {TEACHER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status
                      .replaceAll('_', ' ')
                      .replace(
                        /\b\w/g,
                        (char) => char.toUpperCase(),
                      )}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* ===================================================
            PERSONAL
        =================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <SectionHeader
            section="personal"
            icon={<CircleUserRound className="w-5 h-5" />}
            title="Personal Information"
            description="Basic identity and demographic information"
          />

          {openSections.personal && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <FieldLabel required>
                  First Name
                </FieldLabel>

                <Input
                  value={formData.first_name}
                  onChange={(event) =>
                    updateField(
                      'first_name',
                      event.target.value,
                    )
                  }
                  placeholder="First name"
                  autoComplete="given-name"
                />
              </div>

              <div>
                <FieldLabel required>
                  Last Name
                </FieldLabel>

                <Input
                  value={formData.last_name}
                  onChange={(event) =>
                    updateField(
                      'last_name',
                      event.target.value,
                    )
                  }
                  placeholder="Last name"
                  autoComplete="family-name"
                />
              </div>

              <div>
                <FieldLabel>Middle Name</FieldLabel>

                <Input
                  value={formData.middle_name}
                  onChange={(event) =>
                    updateField(
                      'middle_name',
                      event.target.value,
                    )
                  }
                  placeholder="Middle name"
                />
              </div>

              <div>
                <FieldLabel required>
                  Gender
                </FieldLabel>

                <Select
                  value={formData.gender}
                  onChange={(event) =>
                    updateField(
                      'gender',
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Select gender
                  </option>

                  {GENDERS.map((gender) => (
                    <option key={gender} value={gender}>
                      {gender}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <FieldLabel>Date of Birth</FieldLabel>

                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(event) =>
                    updateField(
                      'date_of_birth',
                      event.target.value,
                    )
                  }
                />
              </div>

              <div>
                <FieldLabel>Nationality</FieldLabel>

                <Input
                  value={formData.nationality}
                  onChange={(event) =>
                    updateField(
                      'nationality',
                      event.target.value,
                    )
                  }
                />
              </div>

              <div>
                <FieldLabel>State of Origin</FieldLabel>

                <Input
                  value={formData.state_of_origin}
                  onChange={(event) =>
                    updateField(
                      'state_of_origin',
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Rivers"
                />
              </div>

              <div>
                <FieldLabel>LGA</FieldLabel>

                <Input
                  value={formData.lga}
                  onChange={(event) =>
                    updateField(
                      'lga',
                      event.target.value,
                    )
                  }
                  placeholder="Local Government Area"
                />
              </div>

              <div>
                <FieldLabel>Religion</FieldLabel>

                <Select
                  value={formData.religion}
                  onChange={(event) =>
                    updateField(
                      'religion',
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Select religion
                  </option>

                  {RELIGIONS.map((religion) => (
                    <option
                      key={religion}
                      value={religion}
                    >
                      {religion}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <FieldLabel>Photo URL</FieldLabel>

                <Input
                  value={formData.photo_url}
                  onChange={(event) =>
                    updateField(
                      'photo_url',
                      event.target.value,
                    )
                  }
                  placeholder="https://..."
                />

                <p className="text-[11px] text-slate-500 mt-1">
                  Use your existing storage/image provider URL.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================
            CONTACT
        =================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <SectionHeader
            section="contact"
            icon={<Phone className="w-5 h-5" />}
            title="Contact Information"
            description="Phone, email and residential details"
          />

          {openSections.contact && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel required>
                  Phone Number
                </FieldLabel>

                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <Input
                    value={formData.phone_number}
                    onChange={(event) =>
                      updateField(
                        'phone_number',
                        event.target.value,
                      )
                    }
                    placeholder="080..."
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Email</FieldLabel>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      updateField(
                        'email',
                        event.target.value,
                      )
                    }
                    placeholder="teacher@example.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Address</FieldLabel>

                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />

                  <Textarea
                    rows={3}
                    value={formData.address}
                    onChange={(event) =>
                      updateField(
                        'address',
                        event.target.value,
                      )
                    }
                    placeholder="Residential address"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================
            PROFESSIONAL
        =================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <SectionHeader
            section="professional"
            icon={<Briefcase className="w-5 h-5" />}
            title="Professional Information"
            description="Qualification, department and regulatory details"
          />

          {openSections.professional && (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <FieldLabel required>
                    Department
                  </FieldLabel>

                  <Select
                    value={formData.department}
                    onChange={(event) =>
                      updateField(
                        'department',
                        event.target.value,
                      )
                    }
                  >
                    {DEPARTMENTS.map(
                      (department) => (
                        <option
                          key={department}
                          value={department}
                        >
                          {department}
                        </option>
                      ),
                    )}
                  </Select>
                </div>

                <div>
                  <FieldLabel required>
                    Position
                  </FieldLabel>

                  <Select
                    value={formData.position}
                    onChange={(event) =>
                      updateField(
                        'position',
                        event.target.value,
                      )
                    }
                  >
                    {POSITIONS.map((position) => (
                      <option
                        key={position}
                        value={position}
                      >
                        {position}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <FieldLabel>
                    Highest Qualification
                  </FieldLabel>

                  <Select
                    value={
                      formData.highest_qualification
                    }
                    onChange={(event) =>
                      updateField(
                        'highest_qualification',
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Select qualification
                    </option>

                    {QUALIFICATIONS.map(
                      (qualification) => (
                        <option
                          key={qualification}
                          value={qualification}
                        >
                          {qualification}
                        </option>
                      ),
                    )}
                  </Select>
                </div>

                <div>
                  <FieldLabel>
                    Years of Experience
                  </FieldLabel>

                  <Input
                    type="number"
                    min="0"
                    value={
                      formData.years_of_experience
                    }
                    onChange={(event) =>
                      updateField(
                        'years_of_experience',
                        event.target.value,
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>
                    Qualification
                  </FieldLabel>

                  <Select
                    value={formData.qualification}
                    onChange={(event) =>
                      updateField(
                        'qualification',
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Select qualification
                    </option>

                    {QUALIFICATIONS.map(
                      (qualification) => (
                        <option
                          key={qualification}
                          value={qualification}
                        >
                          {qualification}
                        </option>
                      ),
                    )}
                  </Select>
                </div>

                <div>
                  <FieldLabel>
                    Specialization
                  </FieldLabel>

                  <Input
                    value={formData.specialization}
                    onChange={(event) =>
                      updateField(
                        'specialization',
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Mathematics Education"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>
                    Previous School
                  </FieldLabel>

                  <Input
                    value={formData.previous_school}
                    onChange={(event) =>
                      updateField(
                        'previous_school',
                        event.target.value,
                      )
                    }
                    placeholder="Previous institution"
                  />
                </div>

                <div>
                  <FieldLabel>
                    Teaching Certificate
                  </FieldLabel>

                  <Select
                    value={
                      formData.teaching_certificate
                    }
                    onChange={(event) =>
                      updateField(
                        'teaching_certificate',
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Select certificate
                    </option>

                    {TEACHING_CERTIFICATES.map(
                      (certificate) => (
                        <option
                          key={certificate}
                          value={certificate}
                        >
                          {certificate}
                        </option>
                      ),
                    )}
                  </Select>
                </div>

                <div>
                  <FieldLabel>
                    Certificate Number
                  </FieldLabel>

                  <Input
                    value={
                      formData.certificate_number
                    }
                    onChange={(event) =>
                      updateField(
                        'certificate_number',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <FieldLabel>
                    TRCN Number
                  </FieldLabel>

                  <Input
                    value={formData.trcn_number}
                    onChange={(event) =>
                      updateField(
                        'trcn_number',
                        event.target.value,
                      )
                    }
                    placeholder="TRCN number"
                  />
                </div>

                <div>
                  <FieldLabel>
                    TRCN Status
                  </FieldLabel>

                  <Select
                    value={formData.trcn_status}
                    onChange={(event) =>
                      updateField(
                        'trcn_status',
                        event.target.value,
                      )
                    }
                  >
                    {TRCN_STATUSES.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ),
                    )}
                  </Select>
                </div>

                <div>
                  <FieldLabel>
                    Certificate Issue Date
                  </FieldLabel>

                  <Input
                    type="date"
                    value={
                      formData.certificate_issue_date
                    }
                    onChange={(event) =>
                      updateField(
                        'certificate_issue_date',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <FieldLabel>
                    Certificate Expiry Date
                  </FieldLabel>

                  <Input
                    type="date"
                    value={
                      formData.certificate_expiry_date
                    }
                    onChange={(event) =>
                      updateField(
                        'certificate_expiry_date',
                        event.target.value,
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================
            ASSIGNMENTS
        =================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <SectionHeader
            section="assignment"
            icon={<BookOpen className="w-5 h-5" />}
            title="Subjects & Classes"
            description="Assign the teacher to the school's existing curriculum"
          />

          {openSections.assignment && (
            <div className="p-5 space-y-6">
              {/* Class Teacher */}
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  id="is_class_teacher"
                  type="checkbox"
                  checked={
                    formData.is_class_teacher
                  }
                  onChange={(event) =>
                    updateField(
                      'is_class_teacher',
                      event.target.checked,
                    )
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />

                <label
                  htmlFor="is_class_teacher"
                  className="cursor-pointer"
                >
                  <div className="font-medium text-slate-900">
                    Mark as Class Teacher
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    The first selected class will become the
                    teacher's primary class-teacher class.
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* SUBJECTS */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          Subjects
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                          {formData.subjects_taught.length}{' '}
                          selected
                        </p>
                      </div>

                      <div className="text-xs text-slate-500">
                        {subjects.length} available
                      </div>
                    </div>

                    <div className="relative mt-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                      <Input
                        value={subjectSearch}
                        onChange={(event) =>
                          setSubjectSearch(
                            event.target.value,
                          )
                        }
                        placeholder="Search subjects..."
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto p-3 space-y-2">
                    {filteredSubjects.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-500">
                        No subjects found.
                      </div>
                    ) : (
                      filteredSubjects.map(
                        (subject) => {
                          const selected =
                            formData.subjects_taught.includes(
                              subject.id,
                            );

                          return (
                            <label
                              key={subject.id}
                              className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${
                                selected
                                  ? 'border-slate-400 bg-slate-100'
                                  : 'border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() =>
                                  toggleArrayValue(
                                    'subjects_taught',
                                    subject.id,
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm text-slate-900">
                                  {subject.name}
                                </div>

                                <div className="text-[11px] text-slate-500">
                                  {subject.code}
                                  {subject.description
                                    ? ` • ${subject.description}`
                                    : ''}
                                </div>
                              </div>
                            </label>
                          );
                        },
                      )
                    )}
                  </div>
                </div>

                {/* CLASSES */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          Classes
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                          {formData.class_assigned.length}{' '}
                          selected
                        </p>
                      </div>

                      <div className="text-xs text-slate-500">
                        {classes.length} available
                      </div>
                    </div>

                    <div className="relative mt-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                      <Input
                        value={classSearch}
                        onChange={(event) =>
                          setClassSearch(
                            event.target.value,
                          )
                        }
                        placeholder="Search classes..."
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto p-3 space-y-2">
                    {filteredClasses.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-500">
                        No classes found.
                      </div>
                    ) : (
                      filteredClasses.map(
                        (schoolClass) => {
                          const selected =
                            formData.class_assigned.includes(
                              schoolClass.id,
                            );

                          return (
                            <label
                              key={schoolClass.id}
                              className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${
                                selected
                                  ? 'border-slate-400 bg-slate-100'
                                  : 'border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() =>
                                  toggleArrayValue(
                                    'class_assigned',
                                    schoolClass.id,
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm text-slate-900">
                                  {schoolClass.name}
                                </div>

                                <div className="text-[11px] text-slate-500">
                                  {schoolClass.code}
                                  {schoolClass.department
                                    ? ` • ${schoolClass.department}`
                                    : ''}
                                </div>
                              </div>
                            </label>
                          );
                        },
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* ASSIGNMENT STATUS */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-slate-500">
                      Selected Subjects
                    </div>

                    <div className="mt-1 text-xl font-bold text-slate-900">
                      {
                        formData.subjects_taught
                          .length
                      }
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">
                      Selected Classes
                    </div>

                    <div className="mt-1 text-xl font-bold text-slate-900">
                      {
                        formData.class_assigned
                          .length
                      }
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">
                      Valid Curriculum Assignments
                    </div>

                    <div className="mt-1 text-xl font-bold text-emerald-700">
                      {validTeacherPairs.length}
                    </div>
                  </div>
                </div>

                {invalidTeacherPairCount > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />

                      <p className="text-xs text-amber-800">
                        {invalidTeacherPairCount}{' '}
                        selected class/subject combination
                        {invalidTeacherPairCount !== 1
                          ? 's are'
                          : ' is'}{' '}
                        not present in the school's curriculum.
                        Those invalid combinations will not be
                        inserted into teacher assignments.
                      </p>
                    </div>
                  </div>
                )}

                {teacherAssignments.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-slate-700 mb-2">
                      Existing normalized assignments
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {teacherAssignments.map(
                        (assignment) => {
                          const className =
                            classes.find(
                              (item) =>
                                item.id ===
                                assignment.class_id,
                            )?.name ||
                            'Unknown class';

                          const subjectName =
                            subjects.find(
                              (item) =>
                                item.id ===
                                assignment.subject_id,
                            )?.name ||
                            'Unknown subject';

                          return (
                            <span
                              key={assignment.id}
                              className="inline-flex items-center rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-700"
                            >
                              {className} • {subjectName}
                            </span>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===================================================
            EMPLOYMENT
        =================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <SectionHeader
            section="employment"
            icon={<Calendar className="w-5 h-5" />}
            title="Employment & Schedule"
            description="Employment dates, contract and working hours"
          />

          {openSections.employment && (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <FieldLabel>
                    Employment Date
                  </FieldLabel>

                  <Input
                    type="date"
                    value={formData.employment_date}
                    onChange={(event) =>
                      updateField(
                        'employment_date',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <FieldLabel>
                    Contract Type
                  </FieldLabel>

                  <Select
                    value={formData.contract_type}
                    onChange={(event) =>
                      updateField(
                        'contract_type',
                        event.target.value,
                      )
                    }
                  >
                    {CONTRACT_TYPES.map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type
                            .replaceAll(
                              '-',
                              ' ',
                            )
                            .replace(
                              /\b\w/g,
                              (char) =>
                                char.toUpperCase(),
                            )}
                        </option>
                      ),
                    )}
                  </Select>
                </div>

                <div>
                  <FieldLabel>
                    Contract Start
                  </FieldLabel>

                  <Input
                    type="date"
                    value={
                      formData.contract_start_date
                    }
                    onChange={(event) =>
                      updateField(
                        'contract_start_date',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <FieldLabel>
                    Contract End
                  </FieldLabel>

                  <Input
                    type="date"
                    value={
                      formData.contract_end_date
                    }
                    onChange={(event) =>
                      updateField(
                        'contract_end_date',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <FieldLabel>
                    Probation End
                  </FieldLabel>

                  <Input
                    type="date"
                    value={
                      formData.probation_end_date
                    }
                    onChange={(event) =>
                      updateField(
                        'probation_end_date',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <FieldLabel>
                    Confirmation Date
                  </FieldLabel>

                  <Input
                    type="date"
                    value={
                      formData.confirmation_date
                    }
                    onChange={(event) =>
                      updateField(
                        'confirmation_date',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <FieldLabel>
                    Availability
                  </FieldLabel>

                  <Select
                    value={formData.availability}
                    onChange={(event) =>
                      updateField(
                        'availability',
                        event.target.value,
                      )
                    }
                  >
                    {AVAILABILITY_OPTIONS.map(
                      (option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option
                            .replaceAll(
                              '_',
                              ' ',
                            )
                            .replace(
                              /\b\w/g,
                              (char) =>
                                char.toUpperCase(),
                            )}
                        </option>
                      ),
                    )}
                  </Select>
                </div>

                <div>
                  <FieldLabel>
                    Working Hours
                  </FieldLabel>

                  <Select
                    value={formData.working_hours}
                    onChange={(event) =>
                      updateField(
                        'working_hours',
                        event.target.value,
                      )
                    }
                  >
                    {WORKING_HOURS_OPTIONS.map(
                      (option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
                        </option>
                      ),
                    )}
                  </Select>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-slate-600" />

                  <div>
                    <h3 className="font-semibold text-sm text-slate-900">
                      Weekly Work Schedule
                    </h3>

                    <p className="text-xs text-slate-500 mt-1">
                      Select normal working days and hours.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>
                      Start Time
                    </FieldLabel>

                    <Input
                      type="time"
                      value={
                        formData.work_schedule_start
                      }
                      onChange={(event) =>
                        updateField(
                          'work_schedule_start',
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel>
                      End Time
                    </FieldLabel>

                    <Input
                      type="time"
                      value={
                        formData.work_schedule_end
                      }
                      onChange={(event) =>
                        updateField(
                          'work_schedule_end',
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <FieldLabel>
                    Working Days
                  </FieldLabel>

                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((day) => {
                      const selected =
                        formData.work_schedule_days.includes(
                          day,
                        );

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            toggleArrayValue(
                              'work_schedule_days',
                              day,
                            )
                          }
                          className={`rounded-xl px-3 py-2 text-xs font-medium border transition ${
                            selected
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================
            FINANCIAL
        =================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <SectionHeader
            section="financial"
            icon={<Banknote className="w-5 h-5" />}
            title="Financial Information"
            description="Salary, bank, pension and insurance details"
          />

          {openSections.financial && (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <FieldLabel>
                    Salary
                  </FieldLabel>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.salary}
                    onChange={(event) =>
                      updateField(
                        'salary',
                        event.target.value,
                      )
                    }
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <FieldLabel>
                    Bank Name
                  </FieldLabel>

                  <Input
                    value={formData.bank_name}
                    onChange={(event) =>
                      updateField(
                        'bank_name',
                        event.target.value,
                      )
                    }
                    placeholder="Bank"
                  />
                </div>

                <div>
                  <FieldLabel>
                    Account Number
                  </FieldLabel>

                  <Input
                    value={
                      formData.bank_account_number
                    }
                    onChange={(event) =>
                      updateField(
                        'bank_account_number',
                        event.target.value,
                      )
                    }
                    inputMode="numeric"
                  />
                </div>

                <div>
                  <FieldLabel>
                    Account Name
                  </FieldLabel>

                  <Input
                    value={
                      formData.bank_account_name
                    }
                    onChange={(event) =>
                      updateField(
                        'bank_account_name',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <FieldLabel>
                    Pension Company
                  </FieldLabel>

                  <Input
                    value={
                      formData.pension_company
                    }
                    onChange={(event) =>
                      updateField(
                        'pension_company',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <FieldLabel>
                    Pension Number
                  </FieldLabel>

                  <Input
                    value={
                      formData.pension_number
                    }
                    onChange={(event) =>
                      updateField(
                        'pension_number',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <FieldLabel>
                    Insurance Company
                  </FieldLabel>

                  <Input
                    value={
                      formData.insurance_company
                    }
                    onChange={(event) =>
                      updateField(
                        'insurance_company',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <FieldLabel>
                    Insurance Number
                  </FieldLabel>

                  <Input
                    value={
                      formData.insurance_number
                    }
                    onChange={(event) =>
                      updateField(
                        'insurance_number',
                        event.target.value,
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================
            EMERGENCY
        =================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <SectionHeader
            section="emergency"
            icon={<HeartPulse className="w-5 h-5" />}
            title="Emergency Contact"
            description="Person to contact in case of an emergency"
          />

          {openSections.emergency && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>
                  Full Name
                </FieldLabel>

                <Input
                  value={
                    formData.emergency_name
                  }
                  onChange={(event) =>
                    updateField(
                      'emergency_name',
                      event.target.value,
                    )
                  }
                  placeholder="Emergency contact name"
                />
              </div>

              <div>
                <FieldLabel>
                  Relationship
                </FieldLabel>

                <Input
                  value={
                    formData.emergency_relationship
                  }
                  onChange={(event) =>
                    updateField(
                      'emergency_relationship',
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Spouse, Brother"
                />
              </div>

              <div>
                <FieldLabel>
                  Phone Number
                </FieldLabel>

                <Input
                  value={
                    formData.emergency_phone
                  }
                  onChange={(event) =>
                    updateField(
                      'emergency_phone',
                      event.target.value,
                    )
                  }
                  inputMode="tel"
                />
              </div>

              <div>
                <FieldLabel>Email</FieldLabel>

                <Input
                  type="email"
                  value={
                    formData.emergency_email
                  }
                  onChange={(event) =>
                    updateField(
                      'emergency_email',
                      event.target.value,
                    )
                  }
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>
                  Address
                </FieldLabel>

                <Textarea
                  rows={3}
                  value={
                    formData.emergency_address
                  }
                  onChange={(event) =>
                    updateField(
                      'emergency_address',
                      event.target.value,
                    )
                  }
                  placeholder="Emergency contact address"
                />
              </div>
            </div>
          )}
        </div>

        {/* ===================================================
            BIOMETRICS
        =================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <SectionHeader
            section="biometric"
            icon={<ShieldCheck className="w-5 h-5" />}
            title="Biometric Enrollment"
            description="Attendance-device enrollment status"
          />

          {openSections.biometric && (
            <div className="p-5">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    formData.biometrics_enrolled
                  }
                  onChange={(event) =>
                    updateField(
                      'biometrics_enrolled',
                      event.target.checked,
                    )
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />

                <div>
                  <div className="font-medium text-slate-900">
                    Staff already enrolled in biometric device
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    This checkbox records the enrollment status.
                    This form does not generate fake fingerprint,
                    facial, voice or biometric templates.
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* ===================================================
            SUMMARY
        =================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-slate-700" />

              <div>
                <h2 className="font-semibold text-slate-900">
                  Registration Summary
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  Review key information before saving.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">
                Teacher
              </div>

              <div className="font-semibold text-slate-900 mt-1">
                {formData.first_name ||
                formData.last_name
                  ? `${formData.first_name} ${formData.last_name}`.trim()
                  : 'Not provided'}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">
                Staff Number
              </div>

              <div className="font-semibold text-slate-900 mt-1">
                {formData.staff_number ||
                  'Generated on save'}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">
                Subjects
              </div>

              <div className="font-semibold text-slate-900 mt-1">
                {formData.subjects_taught.length}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">
                Classes
              </div>

              <div className="font-semibold text-slate-900 mt-1">
                {formData.class_assigned.length}
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================
            ACTIONS
        =================================================== */}

        <div className="sticky bottom-4 z-20">
          <div className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Users className="w-4 h-4" />

              <span>
                {isEditing
                  ? 'Changes will be applied to this teacher.'
                  : 'Required fields are marked with *.'}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={saving}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEditing
                      ? 'Update Teacher'
                      : 'Save Teacher'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddTeacher;