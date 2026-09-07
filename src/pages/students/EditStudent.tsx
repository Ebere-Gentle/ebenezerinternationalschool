import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

/**
 * EditStudent
 *
 * IMPORTANT: This page deliberately performs a PATCH-style update.
 * Identity/history fields are never sent from form state, so an incomplete
 * form cannot accidentally null out student_id, branch, session, parent,
 * user/auth linkage, creator, or metadata.
 */
const EDITABLE_FIELDS = [
  'first_name', 'last_name', 'middle_name', 'other_names', 'gender',
  'date_of_birth', 'place_of_birth', 'nationality', 'state_of_origin',
  'lga', 'religion', 'blood_group', 'genotype', 'email', 'phone_number',
  'home_address', 'residential_address', 'department', 'class_id',
  'class_arm', 'house_id', 'club_id', 'admission_date', 'admission_status',
  'current_status', 'previous_school', 'transfer_status',
  'transportation_status', 'pickup_location', 'bus_route_id', 'doctor_name',
  'hospital_name', 'allergies', 'medical_conditions', 'special_needs',
  'qr_code_data', 'barcode_data', 'guardian_info', 'emergency_contact',
  'medical_info', 'documents', 'passport_url'
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

const nullable = (value: unknown) => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  return value;
};

const uuidOrNull = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return String(value);
};

const buildGuardianInfo = (data: any) => ({
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

const buildEmergencyContact = (data: any) => ({
  name: nullable(data.emergency_contact_name),
  phone: nullable(data.emergency_contact_phone),
  relationship: nullable(data.emergency_contact_relationship ?? data.guardian_relationship),
});

export default function EditStudent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadStudent = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error('Failed to load student:', error);
        toast.error(error.message || 'Failed to load student.');
        setLoading(false);
        return;
      }
      if (!data) {
        toast.error('Student record not found.');
        setLoading(false);
        return;
      }

      setStudent(data);
      setFormData({
        ...data,
        father_name: data.guardian_info?.father_name ?? '',
        father_phone: data.guardian_info?.father_phone ?? '',
        father_email: data.guardian_info?.father_email ?? '',
        father_occupation: data.guardian_info?.father_occupation ?? '',
        mother_name: data.guardian_info?.mother_name ?? '',
        mother_phone: data.guardian_info?.mother_phone ?? '',
        mother_email: data.guardian_info?.mother_email ?? '',
        mother_occupation: data.guardian_info?.mother_occupation ?? '',
        guardian_name: data.guardian_info?.guardian_name ?? '',
        guardian_phone: data.guardian_info?.guardian_phone ?? '',
        guardian_email: data.guardian_info?.guardian_email ?? '',
        guardian_address: data.guardian_info?.guardian_address ?? '',
        guardian_relationship: data.guardian_info?.relationship ?? '',
        emergency_contact_name: data.emergency_contact?.name ?? '',
        emergency_contact_phone: data.emergency_contact?.phone ?? '',
        emergency_contact_relationship: data.emergency_contact?.relationship ?? '',
      });
      setLoading(false);
    };

    loadStudent();
    return () => { cancelled = true; };
  }, [id]);

  const safeEditablePayload = useMemo(() => {
    const payload: Record<string, any> = {};

    for (const field of EDITABLE_FIELDS) {
      if (field === 'guardian_info' || field === 'emergency_contact' || field === 'passport_url') continue;
      if (formData[field] !== undefined) payload[field] = formData[field];
    }

    // UUID foreign keys: empty form values must become NULL, never invalid UUIDs.
    for (const field of ['class_id', 'house_id', 'club_id', 'bus_route_id'] as const) {
      if (field in formData) payload[field] = uuidOrNull(formData[field]);
    }

    // Normal nullable text/date fields.
    for (const field of [
      'middle_name', 'other_names', 'place_of_birth', 'state_of_origin', 'lga',
      'religion', 'blood_group', 'genotype', 'email', 'phone_number',
      'residential_address', 'department', 'class_arm', 'previous_school',
      'pickup_location', 'doctor_name', 'hospital_name', 'allergies',
      'medical_conditions', 'special_needs', 'qr_code_data', 'barcode_data'
    ] as const) {
      if (field in formData) payload[field] = nullable(formData[field]);
    }

    if (formData.guardian_info !== undefined || student?.guardian_info !== undefined) {
      payload.guardian_info = buildGuardianInfo(formData);
    }
    if (formData.emergency_contact !== undefined || student?.emergency_contact !== undefined) {
      payload.emergency_contact = buildEmergencyContact(formData);
    }
    if (Array.isArray(formData.documents)) payload.documents = formData.documents;
    if (formData.medical_info && typeof formData.medical_info === 'object') {
      payload.medical_info = formData.medical_info;
    }

    return payload;
  }, [formData, student]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    const checked = type === 'checkbox' ? (event.target as HTMLInputElement).checked : undefined;
    setFormData((prev: any) => ({ ...prev, [name]: checked !== undefined ? checked : value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !student) return;
    if (!formData.first_name?.trim() || !formData.last_name?.trim()) {
      toast.error('First name and last name are required.');
      return;
    }

    setSaving(true);
    try {
      // Never accept identity/history fields from the form payload.
      // The database protection trigger also preserves them if a future client
      // accidentally sends NULL, but the frontend should not send them at all.
      const payload = {
        ...safeEditablePayload,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        gender: nullable(formData.gender),
        date_of_birth: nullable(formData.date_of_birth),
        nationality: nullable(formData.nationality),
        home_address: nullable(formData.home_address),
        admission_date: nullable(formData.admission_date),
        admission_status: formData.admission_status || 'pending',
        current_status: formData.current_status || 'active',
        transfer_status: Boolean(formData.transfer_status),
        transportation_status: Boolean(formData.transportation_status),
        updated_at: new Date().toISOString(),
      };

      console.log('Updating student:', id, payload);

      const { data: updatedStudent, error } = await supabase
        .from('students')
        .update(payload)
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Student update failed:', error);
        if (error.code === '23505') {
          toast.error('Duplicate value detected. Check email or another unique field.');
        } else if (error.code === '42501') {
          toast.error('Permission denied. Your account cannot update student records.');
        } else if (error.code === '22P02') {
          toast.error('Invalid data format. Check UUID, date, or other field values.');
        } else {
          toast.error(error.message || 'Failed to update student record.');
        }
        return;
      }

      if (!updatedStudent) {
        toast.error('No student record was updated. Check your permissions.');
        return;
      }

      setStudent(updatedStudent);
      setFormData((prev: any) => ({ ...prev, ...updatedStudent }));
      toast.success('Student updated successfully.');

      // Photo upload is intentionally separate from the profile update.
      // A failed photo upload must never roll back or falsely report a failed
      // student-profile update.
      if (photoFile) {
        try {
          // Keep the existing project upload helper here if your original file
          // exposes one. The profile update above remains successful regardless.
          console.warn('Photo selected but upload helper is not wired in this safe patch.');
          toast('Student details saved. Photo upload can be completed separately.');
        } catch (photoError) {
          console.error('Photo upload failed:', photoError);
          toast.error('Student saved, but photo upload failed.');
        }
      }

      setTimeout(() => navigate(`/students/${id}`), 500);
    } catch (error: any) {
      console.error('Unexpected student update error:', error);
      toast.error(error?.message || 'Failed to update student.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading student data...</div>;
  if (!student) return <div className="p-6 text-center">Student not found.</div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Edit Student</h1>
            <p className="text-sm text-gray-500">{student.first_name} {student.last_name}</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate(`/students/${id}`)} className="px-4 py-2 border rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ['first_name', 'First name'], ['middle_name', 'Middle name'], ['last_name', 'Last name'],
            ['other_names', 'Other names'], ['gender', 'Gender'], ['date_of_birth', 'Date of birth'],
            ['place_of_birth', 'Place of birth'], ['nationality', 'Nationality'], ['state_of_origin', 'State of origin'],
            ['lga', 'LGA'], ['religion', 'Religion'], ['blood_group', 'Blood group'], ['genotype', 'Genotype'],
            ['email', 'Email'], ['phone_number', 'Phone number'], ['home_address', 'Home address'],
            ['residential_address', 'Residential address'], ['class_arm', 'Class arm'], ['admission_date', 'Admission date'],
            ['previous_school', 'Previous school'], ['pickup_location', 'Pickup location'], ['doctor_name', 'Doctor name'],
            ['hospital_name', 'Hospital name'], ['allergies', 'Allergies'], ['medical_conditions', 'Medical conditions'],
            ['special_needs', 'Special needs']
          ].map(([name, label]) => (
            <label key={name} className="space-y-1">
              <span className="text-sm font-medium">{label}</span>
              <input
                name={name}
                value={formData[name] ?? ''}
                onChange={handleChange}
                type={name.includes('date') ? 'date' : name === 'email' ? 'email' : 'text'}
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
          ))}

          <label className="space-y-1">
            <span className="text-sm font-medium">Class</span>
            <input name="class_id" value={formData.class_id ?? ''} onChange={handleChange} className="w-full rounded-lg border px-3 py-2" />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Admission status</span>
            <select name="admission_status" value={formData.admission_status ?? 'pending'} onChange={handleChange} className="w-full rounded-lg border px-3 py-2">
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="graduated">Graduated</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="transferred">Transferred</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Current status</span>
            <select name="current_status" value={formData.current_status ?? 'active'} onChange={handleChange} className="w-full rounded-lg border px-3 py-2">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="transferred">Transferred</option>
            </select>
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" name="transfer_status" checked={Boolean(formData.transfer_status)} onChange={handleChange} />
            <span>Transfer status</span>
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" name="transportation_status" checked={Boolean(formData.transportation_status)} onChange={handleChange} />
            <span>Uses school transportation</span>
          </label>
        </div>

        <div className="border rounded-xl p-4 space-y-4">
          <h2 className="font-semibold">Father / Guardian</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['father_name', 'Father name'], ['father_phone', 'Father phone'], ['father_email', 'Father email'],
              ['father_occupation', 'Father occupation'], ['mother_name', 'Mother name'], ['mother_phone', 'Mother phone'],
              ['mother_email', 'Mother email'], ['mother_occupation', 'Mother occupation'], ['guardian_name', 'Guardian name'],
              ['guardian_phone', 'Guardian phone'], ['guardian_email', 'Guardian email'], ['guardian_address', 'Guardian address'],
              ['guardian_relationship', 'Relationship'], ['emergency_contact_name', 'Emergency contact name'],
              ['emergency_contact_phone', 'Emergency contact phone'], ['emergency_contact_relationship', 'Emergency contact relationship']
            ].map(([name, label]) => (
              <label key={name} className="space-y-1">
                <span className="text-sm font-medium">{label}</span>
                <input name={name} value={formData[name] ?? ''} onChange={handleChange} className="w-full rounded-lg border px-3 py-2" />
              </label>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-500 border-t pt-4">
          Student ID, branch, session, parent linkage, user/auth linkage, creator, metadata and historical identity fields are protected and are not editable from this form.
        </div>
      </form>
    </div>
  );
}
