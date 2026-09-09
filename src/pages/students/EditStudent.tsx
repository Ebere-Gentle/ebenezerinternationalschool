
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  HeartPulse,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Upload,
  User,
  Users,
  X,
  GraduationCap,
  ShieldCheck,
  Bus,
  Home,
  Stethoscope,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../../config/supabase/client';

const EDITABLE_FIELDS = [
  'first_name',
  'last_name',
  'middle_name',
  'other_names',
  'gender',
  'date_of_birth',
  'place_of_birth',
  'nationality',
  'state_of_origin',
  'lga',
  'religion',
  'blood_group',
  'genotype',
  'email',
  'phone_number',
  'home_address',
  'residential_address',
  'department',
  'class_id',
  'class_arm',
  'house_id',
  'club_id',
  'admission_date',
  'admission_status',
  'current_status',
  'previous_school',
  'transfer_status',
  'transportation_status',
  'pickup_location',
  'bus_route_id',
  'doctor_name',
  'hospital_name',
  'allergies',
  'medical_conditions',
  'special_needs',
  'qr_code_data',
  'barcode_data',
  'guardian_info',
  'emergency_contact',
  'medical_info',
  'documents',
  'passport_url',
] as const;

const UUID_FIELDS = [
  'class_id',
  'house_id',
  'club_id',
  'bus_route_id',
] as const;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidUUID = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  return UUID_REGEX.test(value.trim());
};

const nullable = (value: unknown): unknown => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  return value;
};

const safeUUID = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();

  if (!trimmed) return null;
  if (!isValidUUID(trimmed)) return undefined;

  return trimmed;
};

const safeDate = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();

  if (!trimmed) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return undefined;
  }

  const [year, month, day] = trimmed.split('-').map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return trimmed;
};

const cleanObject = (object: Record<string, any>) => {
  const result: Record<string, any> = {};

  Object.entries(object).forEach(([key, value]) => {
    if (value !== undefined) {
      result[key] = value;
    }
  });

  return result;
};

const formatDateForInput = (value: unknown): string => {
  if (!value || typeof value !== 'string') return '';

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);

  return match ? match[1] : '';
};

const displayValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return 'Not provided';
  }

  return String(value);
};

/**
 * Normalize gender for PostgreSQL enum.
 *
 * The UI displays "Male" / "Female", while PostgreSQL normally
 * stores enum values as lowercase "male" / "female".
 *
 * This also handles older records containing "Male" / "Female".
 */
const normalizeGender = (value: unknown): string | null => {
  const v = String(value ?? '').trim().toLowerCase();

  if (!v) return null;

  if (v === 'male') return 'male';
  if (v === 'female') return 'female';

  return v;
};

/**
 * Build guardian JSON.
 */
const buildGuardianInfo = (data: any) =>
  cleanObject({
    father_name: nullable(data.father_name),
    father_phone: nullable(data.father_phone),
    father_email: nullable(data.father_email),
    father_occupation: nullable(data.father_occupation),

    mother_name: nullable(data.mother_name),
    mother_phone: nullable(data.mother_phone),
    mother_email: nullable(data.mother_email),
    mother_occupation: nullable(data.mother_occupation),

    guardian_name: nullable(data.guardian_name),
    guardian_phone: nullable(data.guardian_phone),
    guardian_email: nullable(data.guardian_email),
    guardian_address: nullable(data.guardian_address),
    relationship: nullable(data.guardian_relationship),
  });

/**
 * Build emergency contact JSON.
 */
const buildEmergencyContact = (data: any) =>
  cleanObject({
    name: nullable(data.emergency_contact_name),
    phone: nullable(data.emergency_contact_phone),
    relationship: nullable(
      data.emergency_contact_relationship ??
        data.guardian_relationship,
    ),
  });

/**
 * Automatically find the most useful class display name.
 *
 * This allows the page to work with common class schemas such as:
 * name, class_name, className, title, label.
 */
const getClassDisplayName = (classItem: any): string => {
  if (!classItem) return 'Unknown Class';

  const candidates = [
    classItem.name,
    classItem.class_name,
    classItem.className,
    classItem.title,
    classItem.label,
    classItem.display_name,
  ];

  const found = candidates.find(
    (value) =>
      typeof value === 'string' && value.trim().length > 0,
  );

  if (found) return found.trim();

  return classItem.id
    ? `Class ${String(classItem.id).slice(0, 8)}`
    : 'Unknown Class';
};

interface FieldProps {
  label: string;
  name: string;
  value: any;
  onChange: (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  disabled,
  icon,
  className = '',
}: FieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
        {required && (
          <span className="ml-1 text-rose-500">*</span>
        )}
      </label>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-indigo-400">
            {icon}
          </span>
        )}

        <input
          id={name}
          name={name}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 ${
            icon ? 'pl-10' : ''
          }`}
        />
      </div>
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  name: string;
  value: any;
  onChange: (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
  disabled?: boolean;
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  icon,
  disabled,
}: SelectFieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-indigo-400">
            {icon}
          </span>
        )}

        <select
          id={name}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          className={`w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all hover:border-indigo-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 ${
            icon ? 'pl-10' : ''
          }`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  icon,
  children,
  accent = 'indigo',
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: 'indigo' | 'blue' | 'emerald' | 'rose' | 'violet';
}) {
  const styles = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/40">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles[accent]}`}
          >
            {icon}
          </div>

          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export default function EditStudent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [student, setStudent] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const [classes, setClasses] = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    null,
  );

  const [activeTab, setActiveTab] = useState<
    'personal' | 'academic' | 'guardian' | 'medical'
  >('personal');

  /**
   * Load classes.
   *
   * We select * so this works with different class schemas,
   * then automatically determine the display name.
   *
   * The actual UUID remains the option value.
   */
  useEffect(() => {
    let cancelled = false;

    const loadClasses = async () => {
      setClassesLoading(true);

      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .order('name', { ascending: true });

        if (cancelled) return;

        if (error) {
          console.error('Failed to load classes:', error);

          /**
           * Some databases may not have a "name" column.
           * Retry without ordering so we can still load the data.
           */
          const retry = await supabase
            .from('classes')
            .select('*');

          if (!retry.error && retry.data) {
            setClasses(retry.data);
          } else {
            toast.error(
              error.message || 'Failed to load classes.',
            );
          }

          return;
        }

        setClasses(data || []);
      } catch (error: any) {
        console.error('Unexpected class loading error:', error);

        toast.error(
          error?.message || 'Failed to load classes.',
        );
      } finally {
        if (!cancelled) {
          setClassesLoading(false);
        }
      }
    };

    loadClasses();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Load student.
   */
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadStudent = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error('Failed to load student:', error);

          toast.error(
            error.message || 'Failed to load student.',
          );

          setLoading(false);
          return;
        }

        if (!data) {
          toast.error('Student record not found.');
          setLoading(false);
          return;
        }

        setStudent(data);

        const guardian = data.guardian_info || {};
        const emergency = data.emergency_contact || {};

        setFormData({
          ...data,

          /**
           * Normalize gender immediately.
           */
          gender: normalizeGender(data.gender),

          date_of_birth: formatDateForInput(
            data.date_of_birth,
          ),

          admission_date: formatDateForInput(
            data.admission_date,
          ),

          father_name: guardian.father_name ?? '',
          father_phone: guardian.father_phone ?? '',
          father_email: guardian.father_email ?? '',
          father_occupation: guardian.father_occupation ?? '',

          mother_name: guardian.mother_name ?? '',
          mother_phone: guardian.mother_phone ?? '',
          mother_email: guardian.mother_email ?? '',
          mother_occupation: guardian.mother_occupation ?? '',

          guardian_name: guardian.guardian_name ?? '',
          guardian_phone: guardian.guardian_phone ?? '',
          guardian_email: guardian.guardian_email ?? '',
          guardian_address: guardian.guardian_address ?? '',
          guardian_relationship: guardian.relationship ?? '',

          emergency_contact_name: emergency.name ?? '',
          emergency_contact_phone: emergency.phone ?? '',
          emergency_contact_relationship:
            emergency.relationship ?? '',
        });
      } catch (error: any) {
        console.error('Unexpected load error:', error);

        toast.error(
          error?.message || 'Failed to load student.',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadStudent();

    return () => {
      cancelled = true;
    };
  }, [id]);

  /**
   * Revoke preview URL.
   */
  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  /**
   * Class options.
   *
   * IMPORTANT:
   *
   * value = UUID
   * label = human readable class name
   */
  const classOptions = useMemo(() => {
    return [
      {
        value: '',
        label: classesLoading
          ? 'Loading classes...'
          : 'Select class',
      },

      ...classes
        .filter(
          (item) =>
            item?.id &&
            isValidUUID(String(item.id)),
        )
        .map((item) => ({
          value: String(item.id),
          label: getClassDisplayName(item),
        })),
    ];
  }, [classes, classesLoading]);

  /**
   * Current class display name.
   */
  const currentClassName = useMemo(() => {
    const currentId = String(formData.class_id ?? '');

    if (!currentId) return 'Not assigned';

    const found = classes.find(
      (item) => String(item.id) === currentId,
    );

    if (found) {
      return getClassDisplayName(found);
    }

    /**
     * If the class isn't returned by the normal list,
     * show a safe fallback instead of displaying the UUID.
     */
    return 'Current class';
  }, [classes, formData.class_id]);

  /**
   * Build safe PATCH payload.
   */
  const safeEditablePayload = useMemo(() => {
    const payload: Record<string, any> = {};

    for (const field of EDITABLE_FIELDS) {
      if (
        field === 'guardian_info' ||
        field === 'emergency_contact' ||
        field === 'passport_url'
      ) {
        continue;
      }

      if (formData[field] === undefined) {
        continue;
      }

      payload[field] = formData[field];
    }

    /**
     * UUID fields.
     */
    for (const field of UUID_FIELDS) {
      if (!(field in formData)) continue;

      const value = safeUUID(formData[field]);

      if (value !== undefined) {
        payload[field] = value;
      }
    }

    /**
     * Text fields.
     */
    const safeTextFields = [
      'middle_name',
      'other_names',
      'place_of_birth',
      'state_of_origin',
      'lga',
      'religion',
      'blood_group',
      'genotype',
      'email',
      'phone_number',
      'home_address',
      'residential_address',
      'department',
      'class_arm',
      'previous_school',
      'pickup_location',
      'doctor_name',
      'hospital_name',
      'allergies',
      'medical_conditions',
      'special_needs',
      'qr_code_data',
      'barcode_data',
    ];

    for (const field of safeTextFields) {
      if (!(field in formData)) continue;

      payload[field] = nullable(formData[field]);
    }

    /**
     * Date fields.
     */
    if ('date_of_birth' in formData) {
      const value = safeDate(formData.date_of_birth);

      if (value !== undefined) {
        payload.date_of_birth = value;
      }
    }

    if ('admission_date' in formData) {
      const value = safeDate(formData.admission_date);

      if (value !== undefined) {
        payload.admission_date = value;
      }
    }

    /**
     * Gender enum.
     */
    if ('gender' in formData) {
      payload.gender = normalizeGender(formData.gender);
    }

    /**
     * Guardian JSON.
     */
    payload.guardian_info = buildGuardianInfo(formData);

    /**
     * Emergency JSON.
     */
    payload.emergency_contact =
      buildEmergencyContact(formData);

    /**
     * Preserve documents.
     */
    if (Array.isArray(formData.documents)) {
      payload.documents = formData.documents;
    }

    /**
     * Preserve structured medical info.
     */
    if (
      formData.medical_info !== undefined &&
      formData.medical_info !== null &&
      typeof formData.medical_info === 'object' &&
      !Array.isArray(formData.medical_info)
    ) {
      payload.medical_info = formData.medical_info;
    }

    return cleanObject(payload);
  }, [formData]);

  /**
   * Validate before database update.
   */
  const validatePayload = (
    payload: Record<string, any>,
  ): {
    valid: boolean;
    field?: string;
    reason?: string;
  } => {
    for (const field of UUID_FIELDS) {
      if (!(field in payload)) continue;

      const value = payload[field];

      if (
        value !== null &&
        !isValidUUID(value)
      ) {
        return {
          valid: false,
          field,
          reason: `Invalid UUID: ${String(value)}`,
        };
      }
    }

    for (const field of [
      'date_of_birth',
      'admission_date',
    ]) {
      if (!(field in payload)) continue;

      const value = payload[field];

      if (
        value !== null &&
        safeDate(value) === undefined
      ) {
        return {
          valid: false,
          field,
          reason: `Invalid date: ${String(value)}`,
        };
      }
    }

    return { valid: true };
  };

  /**
   * Input handler.
   */
  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = event.target;

    const checked =
      type === 'checkbox'
        ? (event.target as HTMLInputElement).checked
        : undefined;

    setFormData((prev: any) => ({
      ...prev,
      [name]:
        checked !== undefined
          ? checked
          : value,
    }));
  };

  /**
   * Photo preview.
   */
  const handlePhotoChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be 5MB or smaller.');
      return;
    }

    if (photoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);
    setPhotoPreview(
      URL.createObjectURL(file),
    );
  };

  const removeSelectedPhoto = () => {
    if (photoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(null);
    setPhotoPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Submit.
   */
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!id || !student) {
      toast.error('Student record is unavailable.');
      return;
    }

    const firstName = String(
      formData.first_name ?? '',
    ).trim();

    const lastName = String(
      formData.last_name ?? '',
    ).trim();

    if (!firstName) {
      toast.error('First name is required.');
      setActiveTab('personal');
      return;
    }

    if (!lastName) {
      toast.error('Last name is required.');
      setActiveTab('personal');
      return;
    }

    /**
     * Class must either be a valid UUID or null.
     */
    if (
      formData.class_id &&
      !isValidUUID(formData.class_id)
    ) {
      toast.error(
        'Please select a valid class from the class list.',
      );

      setActiveTab('academic');
      return;
    }

    setSaving(true);

    try {
      const payload: Record<string, any> = {
        ...safeEditablePayload,

        first_name: firstName,
        last_name: lastName,

        /**
         * Critical enum fix.
         */
        gender: normalizeGender(
          formData.gender,
        ),

        nationality: nullable(
          formData.nationality,
        ),

        admission_status:
          String(
            formData.admission_status ?? '',
          ).trim() || 'pending',

        current_status:
          String(
            formData.current_status ?? '',
          ).trim() || 'active',

        transfer_status:
          Boolean(formData.transfer_status),

        transportation_status:
          Boolean(
            formData.transportation_status,
          ),

        updated_at:
          new Date().toISOString(),
      };

      /**
       * Dates.
       */
      const dob = safeDate(
        formData.date_of_birth,
      );

      if (dob !== undefined) {
        payload.date_of_birth = dob;
      } else {
        delete payload.date_of_birth;
      }

      const admissionDate = safeDate(
        formData.admission_date,
      );

      if (admissionDate !== undefined) {
        payload.admission_date =
          admissionDate;
      } else {
        delete payload.admission_date;
      }

      /**
       * UUIDs.
       *
       * The visible class dropdown contains names,
       * but this sends the UUID to the database.
       */
      for (const field of UUID_FIELDS) {
        if (!(field in formData)) continue;

        const value = safeUUID(
          formData[field],
        );

        if (value === undefined) {
          delete payload[field];
        } else {
          payload[field] = value;
        }
      }

      /**
       * Protected fields.
       */
      const PROTECTED_FIELDS = [
        'id',
        'student_id',
        'admission_number',
        'secondary_admission_number',
        'parent_id',
        'user_id',
        'branch_id',
        'session_id',
        'created_by',
        'created_at',
        'metadata',
      ];

      for (const field of PROTECTED_FIELDS) {
        delete payload[field];
      }

      /**
       * Remove undefined values.
       */
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      /**
       * Validate.
       */
      const validation =
        validatePayload(payload);

      if (!validation.valid) {
        console.error(
          'Student update validation failed:',
          validation,
        );

        toast.error(
          `Invalid ${validation.field}: ${
            validation.reason ||
            'Please check this field.'
          }`,
        );

        return;
      }

      console.log(
        'Student update payload:',
        payload,
      );

      /**
       * Database update.
       */
      const {
        data: updatedStudent,
        error,
      } = await supabase
        .from('students')
        .update(payload)
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (error) {
        console.error(
          'STUDENT UPDATE ERROR:',
          {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            payload,
          },
        );

        if (error.code === '22P02') {
          toast.error(
            `Invalid database value: ${
              error.message ||
              'Check the form values.'
            }`,
          );
        } else if (error.code === '23505') {
          toast.error(
            'Duplicate value detected. Check email or another unique field.',
          );
        } else if (error.code === '42501') {
          toast.error(
            'Permission denied. Your account cannot update student records.',
          );
        } else if (error.code === '23503') {
          toast.error(
            'A selected class, house, club, or bus route no longer exists.',
          );
        } else if (error.code === '23514') {
          toast.error(
            'One of the values violates a database rule. Check the student status or category.',
          );
        } else {
          toast.error(
            error.message ||
              'Failed to update student record.',
          );
        }

        return;
      }

      if (!updatedStudent) {
        toast.error(
          'No student record was updated. Check your permissions.',
        );

        return;
      }

      setStudent(updatedStudent);

      const guardian =
        updatedStudent.guardian_info || {};

      const emergency =
        updatedStudent.emergency_contact || {};

      setFormData((prev: any) => ({
        ...prev,
        ...updatedStudent,

        gender: normalizeGender(
          updatedStudent.gender,
        ),

        date_of_birth:
          formatDateForInput(
            updatedStudent.date_of_birth,
          ),

        admission_date:
          formatDateForInput(
            updatedStudent.admission_date,
          ),

        father_name:
          guardian.father_name ?? '',

        father_phone:
          guardian.father_phone ?? '',

        father_email:
          guardian.father_email ?? '',

        father_occupation:
          guardian.father_occupation ?? '',

        mother_name:
          guardian.mother_name ?? '',

        mother_phone:
          guardian.mother_phone ?? '',

        mother_email:
          guardian.mother_email ?? '',

        mother_occupation:
          guardian.mother_occupation ?? '',

        guardian_name:
          guardian.guardian_name ?? '',

        guardian_phone:
          guardian.guardian_phone ?? '',

        guardian_email:
          guardian.guardian_email ?? '',

        guardian_address:
          guardian.guardian_address ?? '',

        guardian_relationship:
          guardian.relationship ?? '',

        emergency_contact_name:
          emergency.name ?? '',

        emergency_contact_phone:
          emergency.phone ?? '',

        emergency_contact_relationship:
          emergency.relationship ?? '',
      }));

      toast.success(
        'Student profile updated successfully.',
      );

      if (photoFile) {
        toast(
          'Student details saved. Photo preview is ready, but storage upload is not configured on this page.',
        );
      }

      setTimeout(() => {
        navigate(`/students/${id}`);
      }, 700);
    } catch (error: any) {
      console.error(
        'Unexpected student update error:',
        error,
      );

      toast.error(
        error?.message ||
          'Failed to update student record.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-36 rounded-3xl bg-white shadow-sm" />

            <div className="grid gap-6 lg:grid-cols-4">
              <div className="h-96 rounded-3xl bg-white shadow-sm" />
              <div className="h-96 rounded-3xl bg-white shadow-sm lg:col-span-3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <X className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-xl font-extrabold text-slate-900">
            Student not found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            The student record could not be found or may have been removed.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate('/students')
            }
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to students
          </button>
        </div>
      </div>
    );
  }

  const currentPhoto =
    photoPreview ||
    student.passport_url ||
    student.profile_image_url ||
    null;

  const tabs = [
    {
      id: 'personal' as const,
      label: 'Personal',
      icon: <User className="h-4 w-4" />,
      active:
        'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20',
    },
    {
      id: 'academic' as const,
      label: 'Academic',
      icon: <GraduationCap className="h-4 w-4" />,
      active:
        'bg-blue-600 text-white shadow-lg shadow-blue-500/20',
    },
    {
      id: 'guardian' as const,
      label: 'Guardian',
      icon: <Users className="h-4 w-4" />,
      active:
        'bg-violet-600 text-white shadow-lg shadow-violet-500/20',
    },
    {
      id: 'medical' as const,
      label: 'Medical',
      icon: <HeartPulse className="h-4 w-4" />,
      active:
        'bg-rose-600 text-white shadow-lg shadow-rose-500/20',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-50">
      {/* HEADER */}
      <div className="sticky top-0 z-40 border-b border-white/70 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  navigate(`/students/${id}`)
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                    Edit Student
                  </h1>

                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Protected Update
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Update student information safely without changing protected identity records.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate(`/students/${id}`)
                }
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="edit-student-form"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <form
          id="edit-student-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* STUDENT HERO */}
          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-xl shadow-indigo-100/60">
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-blue-700 to-violet-800 px-6 py-8 sm:px-8">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />

              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[2rem] border-4 border-white/30 bg-white/15 shadow-2xl backdrop-blur">
                    {currentPhoto ? (
                      <img
                        src={currentPhoto}
                        alt={`${student.first_name || ''} ${student.last_name || ''}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-white/80" />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-indigo-800 bg-white text-indigo-700 shadow-xl transition hover:bg-indigo-50"
                    aria-label="Change photo"
                  >
                    <Camera className="h-4 w-4" />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-200">
                    Student Profile
                  </p>

                  <h2 className="mt-1 truncate text-2xl font-extrabold text-white sm:text-3xl">
                    {displayValue(
                      `${student.first_name || ''} ${
                        student.middle_name || ''
                      } ${student.last_name || ''}`,
                    )
                      .replace(/\s+/g, ' ')
                      .trim()}
                  </h2>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {student.student_id && (
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                        ID: {student.student_id}
                      </span>
                    )}

                    {student.admission_number && (
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                        Admission: {student.admission_number}
                      </span>
                    )}

                    <span className="rounded-full bg-emerald-400/20 px-3 py-1.5 text-xs font-bold text-emerald-100">
                      {currentClassName}
                    </span>

                    {student.current_status && (
                      <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold capitalize text-white backdrop-blur">
                        {student.current_status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="hidden rounded-2xl border border-white/10 bg-white/10 p-4 text-right backdrop-blur sm:block">
                  <p className="text-xs font-medium text-indigo-100">
                    Record status
                  </p>

                  <div className="mt-2 flex items-center justify-end gap-2 text-sm font-extrabold text-white">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    Protected
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Upload className="h-4 w-4 text-indigo-500" />
                JPG, PNG or WEBP • Maximum 5MB
              </div>

              {photoFile && (
                <button
                  type="button"
                  onClick={removeSelectedPhoto}
                  className="inline-flex items-center gap-2 text-sm font-bold text-rose-600 hover:text-rose-700"
                >
                  <X className="h-4 w-4" />
                  Remove selected photo
                </button>
              )}
            </div>
          </div>

          {/* TABS */}
          <div className="sticky top-[73px] z-30 -mx-4 border-y border-slate-200/70 bg-slate-50/90 px-4 py-2 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/30 sm:grid-cols-4">
              {tabs.map((tab) => {
                const active =
                  activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setActiveTab(tab.id)
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-extrabold transition-all ${
                      active
                        ? tab.active
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PERSONAL */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <Section
                title="Personal Information"
                description="Basic biographical information for the student."
                icon={
                  <User className="h-5 w-5" />
                }
                accent="indigo"
              >
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <Field
                    label="First Name"
                    name="first_name"
                    value={
                      formData.first_name
                    }
                    onChange={handleChange}
                    required
                    icon={
                      <User className="h-4 w-4" />
                    }
                  />

                  <Field
                    label="Middle Name"
                    name="middle_name"
                    value={
                      formData.middle_name
                    }
                    onChange={handleChange}
                  />

                  <Field
                    label="Last Name"
                    name="last_name"
                    value={
                      formData.last_name
                    }
                    onChange={handleChange}
                    required
                  />

                  <Field
                    label="Other Names"
                    name="other_names"
                    value={
                      formData.other_names
                    }
                    onChange={handleChange}
                  />

                  <SelectField
                    label="Gender"
                    name="gender"
                    value={normalizeGender(
                      formData.gender,
                    )}
                    onChange={handleChange}
                    options={[
                      {
                        value: '',
                        label:
                          'Select gender',
                      },
                      {
                        value: 'male',
                        label: 'Male',
                      },
                      {
                        value: 'female',
                        label: 'Female',
                      },
                    ]}
                  />

                  <Field
                    label="Date of Birth"
                    name="date_of_birth"
                    type="date"
                    value={
                      formData.date_of_birth
                    }
                    onChange={handleChange}
                    icon={
                      <Calendar className="h-4 w-4" />
                    }
                  />

                  <Field
                    label="Place of Birth"
                    name="place_of_birth"
                    value={
                      formData.place_of_birth
                    }
                    onChange={handleChange}
                  />

                  <Field
                    label="Nationality"
                    name="nationality"
                    value={
                      formData.nationality
                    }
                    onChange={handleChange}
                  />

                  <Field
                    label="State of Origin"
                    name="state_of_origin"
                    value={
                      formData.state_of_origin
                    }
                    onChange={handleChange}
                  />

                  <Field
                    label="LGA"
                    name="lga"
                    value={formData.lga}
                    onChange={handleChange}
                  />

                  <Field
                    label="Religion"
                    name="religion"
                    value={
                      formData.religion
                    }
                    onChange={handleChange}
                  />

                  <Field
                    label="Blood Group"
                    name="blood_group"
                    value={
                      formData.blood_group
                    }
                    onChange={handleChange}
                  />

                  <Field
                    label="Genotype"
                    name="genotype"
                    value={
                      formData.genotype
                    }
                    onChange={handleChange}
                  />

                  <Field
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    icon={
                      <Mail className="h-4 w-4" />
                    }
                  />

                  <Field
                    label="Phone Number"
                    name="phone_number"
                    type="tel"
                    value={
                      formData.phone_number
                    }
                    onChange={handleChange}
                    icon={
                      <Phone className="h-4 w-4" />
                    }
                  />
                </div>
              </Section>

              <Section
                title="Address"
                description="Residential and home address information."
                icon={
                  <MapPin className="h-5 w-5" />
                }
                accent="blue"
              >
                <div className="grid gap-5">
                  <div>
                    <label
                      htmlFor="home_address"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Home Address
                    </label>

                    <textarea
                      id="home_address"
                      name="home_address"
                      value={
                        formData.home_address ??
                        ''
                      }
                      onChange={handleChange}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition hover:border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="Enter home address"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="residential_address"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Residential Address
                    </label>

                    <textarea
                      id="residential_address"
                      name="residential_address"
                      value={
                        formData.residential_address ??
                        ''
                      }
                      onChange={handleChange}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition hover:border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="Enter residential address"
                    />
                  </div>
                </div>
              </Section>
            </div>
          )}

          {/* ACADEMIC */}
          {activeTab === 'academic' && (
            <div className="space-y-6">
              <Section
                title="Academic Placement"
                description="Select the student's class by name. The database UUID is handled automatically."
                icon={
                  <GraduationCap className="h-5 w-5" />
                }
                accent="blue"
              >
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {/* HUMAN READABLE CLASS SELECT */}
                  <div className="lg:col-span-2">
                    <SelectField
                      label="Class"
                      name="class_id"
                      value={
                        formData.class_id ?? ''
                      }
                      onChange={handleChange}
                      disabled={
                        classesLoading
                      }
                      icon={
                        <GraduationCap className="h-4 w-4" />
                      }
                      options={classOptions}
                    />

                    <div className="mt-2 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />

                      <p className="text-xs font-semibold text-slate-500">
                        {classesLoading
                          ? 'Loading available classes...'
                          : `${classes.length} class${classes.length === 1 ? '' : 'es'} available`}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                      Current Class
                    </p>

                    <p className="mt-2 text-lg font-extrabold text-slate-900">
                      {currentClassName}
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Select a class from the dropdown above to change placement.
                    </p>
                  </div>

                  <Field
                    label="Class Arm"
                    name="class_arm"
                    value={
                      formData.class_arm
                    }
                    onChange={handleChange}
                    placeholder="e.g. A"
                  />

                  <Field
                    label="Department"
                    name="department"
                    value={
                      formData.department
                    }
                    onChange={handleChange}
                    placeholder="e.g. Science"
                  />

                  <Field
                    label="House ID"
                    name="house_id"
                    value={
                      formData.house_id
                    }
                    onChange={handleChange}
                    placeholder="Valid UUID or leave blank"
                  />

                  <Field
                    label="Club ID"
                    name="club_id"
                    value={
                      formData.club_id
                    }
                    onChange={handleChange}
                    placeholder="Valid UUID or leave blank"
                  />

                  <Field
                    label="Admission Date"
                    name="admission_date"
                    type="date"
                    value={
                      formData.admission_date
                    }
                    onChange={handleChange}
                    icon={
                      <Calendar className="h-4 w-4" />
                    }
                  />

                  <SelectField
                    label="Admission Status"
                    name="admission_status"
                    value={
                      formData.admission_status
                    }
                    onChange={handleChange}
                    options={[
                      {
                        value: 'pending',
                        label: 'Pending',
                      },
                      {
                        value: 'active',
                        label: 'Active',
                      },
                      {
                        value: 'admitted',
                        label: 'Admitted',
                      },
                      {
                        value: 'graduated',
                        label: 'Graduated',
                      },
                      {
                        value: 'withdrawn',
                        label: 'Withdrawn',
                      },
                      {
                        value: 'transferred',
                        label: 'Transferred',
                      },
                    ]}
                  />

                  <SelectField
                    label="Current Status"
                    name="current_status"
                    value={
                      formData.current_status
                    }
                    onChange={handleChange}
                    options={[
                      {
                        value: 'active',
                        label: 'Active',
                      },
                      {
                        value: 'inactive',
                        label: 'Inactive',
                      },
                      {
                        value: 'graduated',
                        label: 'Graduated',
                      },
                      {
                        value: 'withdrawn',
                        label: 'Withdrawn',
                      },
                      {
                        value: 'transferred',
                        label: 'Transferred',
                      },
                    ]}
                  />

                  <Field
                    label="Previous School"
                    name="previous_school"
                    value={
                      formData.previous_school
                    }
                    onChange={handleChange}
                  />
                </div>
              </Section>

              <Section
                title="Transport"
                description="Student transportation and pickup information."
                icon={
                  <Bus className="h-5 w-5" />
                }
                accent="violet"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Bus Route ID"
                    name="bus_route_id"
                    value={
                      formData.bus_route_id
                    }
                    onChange={handleChange}
                    placeholder="Valid UUID or leave blank"
                  />

                  <Field
                    label="Pickup Location"
                    name="pickup_location"
                    value={
                      formData.pickup_location
                    }
                    onChange={handleChange}
                  />
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 transition hover:border-blue-200 hover:bg-blue-50">
                    <input
                      type="checkbox"
                      name="transportation_status"
                      checked={Boolean(
                        formData.transportation_status,
                      )}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />

                    <span>
                      <span className="block text-sm font-extrabold text-slate-800">
                        Uses school transportation
                      </span>

                      <span className="mt-1 block text-xs font-medium text-slate-500">
                        Mark this student as using school transport.
                      </span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4 transition hover:border-violet-200 hover:bg-violet-50">
                    <input
                      type="checkbox"
                      name="transfer_status"
                      checked={Boolean(
                        formData.transfer_status,
                      )}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />

                    <span>
                      <span className="block text-sm font-extrabold text-slate-800">
                        Transfer student
                      </span>

                      <span className="mt-1 block text-xs font-medium text-slate-500">
                        Indicates that this student has a transfer status.
                      </span>
                    </span>
                  </label>
                </div>
              </Section>

              <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                  <div>
                    <h3 className="text-sm font-extrabold text-amber-900">
                      Protected student identity
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      Student ID, admission number, parent linkage,
                      authentication account, branch, session and
                      database history are protected from this form.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        'Student ID',
                        'Admission No.',
                        'Parent',
                        'User Account',
                        'Branch',
                        'Session',
                      ].map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-bold text-amber-800"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GUARDIAN */}
          {activeTab === 'guardian' && (
            <div className="space-y-6">
              <Section
                title="Father / Primary Parent"
                description="Father or primary parent contact details."
                icon={
                  <Users className="h-5 w-5" />
                }
                accent="indigo"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Father's Name"
                    name="father_name"
                    value={
                      formData.father_name
                    }
                    onChange={handleChange}
                    icon={
                      <User className="h-4 w-4" />
                    }
                  />

                  <Field
                    label="Father's Phone"
                    name="father_phone"
                    type="tel"
                    value={
                      formData.father_phone
                    }
                    onChange={handleChange}
                    icon={
                      <Phone className="h-4 w-4" />
                    }
                  />

                  <Field
                    label="Father's Email"
                    name="father_email"
                    type="email"
                    value={
                      formData.father_email
                    }
                    onChange={handleChange}
                    icon={
                      <Mail className="h-4 w-4" />
                    }
                  />

                  <Field
                    label="Father's Occupation"
                    name="father_occupation"
                    value={
                      formData.father_occupation
                    }
                    onChange={handleChange}
                  />
                </div>
              </Section>

              <Section
                title="Mother / Secondary Parent"
                description="Mother or secondary parent contact details."
                icon={
                  <Users className="h-5 w-5" />
                }
                accent="violet"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Mother's Name"
                    name="mother_name"
                    value={
                      formData.mother_name
                    }
                    onChange={handleChange}
                    icon={
                      <User className="h-4 w-4" />
                    }
                  />

                  <Field
                    label="Mother's Phone"
                    name="mother_phone"
                    type="tel"
                    value={
                      formData.mother_phone
                    }
                    onChange={handleChange}
                    icon={
                      <Phone className="h-4 w-4" />
                    }
                  />

                  <Field
                    label="Mother's Email"
                    name="mother_email"
                    type="email"
                    value={
                      formData.mother_email
                    }
                    onChange={handleChange}
                    icon={
                      <Mail className="h-4 w-4" />
                    }
                  />

                  <Field
                    label="Mother's Occupation"
                    name="mother_occupation"
                    value={
                      formData.mother_occupation
                    }
                    onChange={handleChange}
                  />
                </div>
              </Section>

              <Section
                title="Guardian"
                description="Use this section when a guardian is responsible for the student."
                icon={
                  <User className="h-5 w-5" />
                }
                accent="blue"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Guardian Name"
                    name="guardian_name"
                    value={
                      formData.guardian_name
                    }
                    onChange={handleChange}
                  />

                  <Field
                    label="Relationship"
                    name="guardian_relationship"
                    value={
                      formData.guardian_relationship
                    }
                    onChange={handleChange}
                  />

                  <Field
                    label="Guardian Phone"
                    name="guardian_phone"
                    type="tel"
                    value={
                      formData.guardian_phone
                    }
                    onChange={handleChange}
                    icon={
                      <Phone className="h-4 w-4" />
                    }
                  />

                  <Field
                    label="Guardian Email"
                    name="guardian_email"
                    type="email"
                    value={
                      formData.guardian_email
                    }
                    onChange={handleChange}
                    icon={
                      <Mail className="h-4 w-4" />
                    }
                  />

                  <div className="md:col-span-2">
                    <label
                      htmlFor="guardian_address"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Guardian Address
                    </label>

                    <textarea
                      id="guardian_address"
                      name="guardian_address"
                      value={
                        formData.guardian_address ??
                        ''
                      }
                      onChange={handleChange}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition hover:border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>
              </Section>

              <Section
                title="Emergency Contact"
                description="Contact person to use in an emergency."
                icon={
                  <Phone className="h-5 w-5" />
                }
                accent="rose"
              >
                <div className="grid gap-5 md:grid-cols-3">
                  <Field
                    label="Name"
                    name="emergency_contact_name"
                    value={
                      formData.emergency_contact_name
                    }
                    onChange={handleChange}
                  />

                  <Field
                    label="Phone"
                    name="emergency_contact_phone"
                    type="tel"
                    value={
                      formData.emergency_contact_phone
                    }
                    onChange={handleChange}
                  />

                  <Field
                    label="Relationship"
                    name="emergency_contact_relationship"
                    value={
                      formData.emergency_contact_relationship
                    }
                    onChange={handleChange}
                  />
                </div>
              </Section>
            </div>
          )}

          {/* MEDICAL */}
          {activeTab === 'medical' && (
            <div className="space-y-6">
              <Section
                title="Medical Information"
                description="Health and emergency information for school records."
                icon={
                  <Stethoscope className="h-5 w-5" />
                }
                accent="rose"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Doctor's Name"
                    name="doctor_name"
                    value={
                      formData.doctor_name
                    }
                    onChange={handleChange}
                  />

                  <Field
                    label="Hospital Name"
                    name="hospital_name"
                    value={
                      formData.hospital_name
                    }
                    onChange={handleChange}
                  />

                  <div>
                    <label
                      htmlFor="allergies"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Allergies
                    </label>

                    <textarea
                      id="allergies"
                      name="allergies"
                      value={
                        formData.allergies ??
                        ''
                      }
                      onChange={handleChange}
                      rows={4}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition hover:border-rose-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                      placeholder="List known allergies"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="medical_conditions"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Medical Conditions
                    </label>

                    <textarea
                      id="medical_conditions"
                      name="medical_conditions"
                      value={
                        formData.medical_conditions ??
                        ''
                      }
                      onChange={handleChange}
                      rows={4}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition hover:border-rose-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                      placeholder="Known medical conditions"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="special_needs"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Special Needs
                    </label>

                    <textarea
                      id="special_needs"
                      name="special_needs"
                      value={
                        formData.special_needs ??
                        ''
                      }
                      onChange={handleChange}
                      rows={4}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition hover:border-rose-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                      placeholder="Learning, accessibility or other special needs"
                    />
                  </div>
                </div>
              </Section>

              <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 shadow-sm">
                <div className="flex gap-3">
                  <HeartPulse className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                  <div>
                    <h3 className="text-sm font-extrabold text-emerald-900">
                      Medical data protection
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-emerald-800">
                      Only the medical fields shown above are changed by this page. Existing structured medical data is preserved unless explicitly updated.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BOTTOM SAVE */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    Ready to save?
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Class names are displayed to you while the correct UUID is safely stored in the database.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/students/${id}`)
                  }
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Student
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
