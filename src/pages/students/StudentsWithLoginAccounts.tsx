import React, { useEffect, useState } from 'react';
import { Download, KeyRound, Loader2, ShieldCheck, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import StudentsList from './StudentsList';
import { supabase } from '../../config/supabase/client';

type Credential = {
  role?: 'student' | 'parent';
  student_id?: string;
  parent_id?: string;
  student_name?: string;
  name?: string;
  admission_number?: string;
  email?: string;
  temporary_password?: string;
  password?: string;
};

const StudentsWithLoginAccounts: React.FC = () => {
  const [creating, setCreating] = useState(false);
  const [missingStudentCount, setMissingStudentCount] = useState<number | null>(null);
  const [missingParentCount, setMissingParentCount] = useState<number | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [showCredentials, setShowCredentials] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadMissingCounts = async () => {
    try {
      const { data: historicalStudents, error: studentError } = await supabase
        .from('students')
        .select('id, parent_id')
        .eq('metadata->>source', 'new_historical_student_import')
        .is('user_id', null)
        .not('email', 'is', null);

      if (studentError) throw studentError;

      const students = historicalStudents ?? [];
      setMissingStudentCount(students.length);

      const parentIds = [...new Set(students.map((student) => student.parent_id).filter(Boolean))];

      if (!parentIds.length) {
        setMissingParentCount(0);
        return;
      }

      const { count, error: parentError } = await supabase
        .from('parents')
        .select('id', { count: 'exact', head: true })
        .in('id', parentIds)
        .is('user_id', null)
        .not('email', 'is', null);

      if (parentError) throw parentError;
      setMissingParentCount(count ?? 0);
    } catch (error) {
      console.error('Error checking login accounts:', error);
    }
  };

  useEffect(() => {
    loadMissingCounts();
  }, []);

  const extractCredentials = (payload: any, role: 'student' | 'parent'): Credential[] => {
    if (Array.isArray(payload?.credentials)) {
      return payload.credentials.map((item: Credential) => ({ ...item, role }));
    }

    if (Array.isArray(payload?.results)) {
      return payload.results
        .filter((item: Credential) => item.temporary_password || item.password)
        .map((item: Credential) => ({ ...item, role }));
    }

    return [];
  };

  const createAllLoginAccounts = async () => {
    if (creating) return;

    const studentCount = missingStudentCount ?? 0;
    const parentCount = missingParentCount ?? 0;

    if (studentCount === 0 && parentCount === 0) {
      toast.success('All eligible historical student and parent login accounts are already linked.');
      return;
    }

    const confirmed = window.confirm(
      `Create ${studentCount} student and ${parentCount} parent login account${studentCount + parentCount === 1 ? '' : 's'} now?\n\nOnly the imported historical students and their linked parents will be processed. Existing accounts will not be replaced.`
    );
    if (!confirmed) return;

    setCreating(true);
    setCredentials([]);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!sessionData.session?.access_token) {
        toast.error('Your admin session has expired. Please sign in again.');
        return;
      }

      // Get the exact historical student records. We deliberately pass IDs to
      // the Edge Function so this button cannot create accounts for unrelated students.
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, parent_id')
        .eq('metadata->>source', 'new_historical_student_import')
        .is('user_id', null)
        .not('email', 'is', null);

      if (studentsError) throw studentsError;

      const studentIds = (students ?? []).map((student) => student.id);
      const parentIds = [
        ...new Set((students ?? []).map((student) => student.parent_id).filter(Boolean)),
      ];

      const allCredentials: Credential[] = [];
      const failures: string[] = [];

      if (studentIds.length) {
        const { data: studentData, error: studentAuthError } = await supabase.functions.invoke(
          'batch-student-auth',
          { body: { student_ids: studentIds } }
        );

        if (studentAuthError) {
          const detail = studentAuthError?.context?.body?.error || studentAuthError.message;
          failures.push(`Students: ${detail}`);
        } else {
          allCredentials.push(...extractCredentials(studentData, 'student'));

          const failed = Number(studentData?.failed ?? 0);
          if (failed > 0) failures.push(`Students: ${failed} account${failed === 1 ? '' : 's'} failed.`);
        }
      }

      // Parent IDs come from the exact imported student set above. This prevents
      // the existing batch-parent-auth function from touching unrelated parents.
      if (parentIds.length) {
        const { data: parentData, error: parentAuthError } = await supabase.functions.invoke(
          'batch-parent-auth',
          { body: { parent_ids: parentIds } }
        );

        if (parentAuthError) {
          const detail = parentAuthError?.context?.body?.error || parentAuthError.message;
          failures.push(`Parents: ${detail}`);
        } else {
          allCredentials.push(...extractCredentials(parentData, 'parent'));

          const failed = Number(parentData?.failed ?? 0);
          if (failed > 0) failures.push(`Parents: ${failed} account${failed === 1 ? '' : 's'} failed.`);
        }
      }

      setCredentials(allCredentials);
      setShowCredentials(allCredentials.length > 0);
      setRefreshKey((value) => value + 1);
      await loadMissingCounts();

      if (failures.length) {
        toast.error(failures.join(' '));
      } else {
        toast.success(
          `Student and parent login account creation completed: ${allCredentials.length} new credential${allCredentials.length === 1 ? '' : 's'} generated.`
        );
      }
    } catch (error: any) {
      console.error('Error creating student and parent login accounts:', error);
      const message =
        error?.context?.body?.error ||
        error?.context?.body?.message ||
        error?.message ||
        'Failed to create login accounts.';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const downloadCredentials = () => {
    if (!credentials.length) return;

    const escapeCsv = (value: unknown) => {
      const text = String(value ?? '');
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const header = ['Account Type', 'Name', 'Student ID', 'Parent ID', 'Admission Number', 'Email', 'Temporary Password'];
    const rows = credentials.map((item) => [
      item.role || '',
      item.student_name || item.name || '',
      item.student_id || '',
      item.parent_id || '',
      item.admission_number || '',
      item.email || '',
      item.temporary_password || item.password || '',
    ]);

    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_parent_login_credentials_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Credentials downloaded as CSV.');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold">Student & Parent Login Accounts</h2>
              <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl">
                Create and securely link Supabase Auth accounts for the imported historical students and their linked parents.
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs sm:text-sm">
                <span className="inline-flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {missingStudentCount === null ? 'Checking students…' : `${missingStudentCount} student${missingStudentCount === 1 ? '' : 's'} without login`}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {missingParentCount === null ? 'Checking parents…' : `${missingParentCount} parent${missingParentCount === 1 ? '' : 's'} without login`}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={createAllLoginAccounts}
            disabled={creating || (missingStudentCount === 0 && missingParentCount === 0)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {creating ? 'Creating Accounts…' : 'Create All Student & Parent Accounts'}
          </button>
        </div>
      </div>

      {showCredentials && credentials.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">New Student & Parent Login Credentials</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Save these credentials now. Temporary passwords are only returned for accounts created in this operation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCredentials(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close credentials"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-auto max-h-[65vh]">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-semibold">{credentials.length}</span> new account credential{credentials.length === 1 ? '' : 's'} generated.
                </div>
                <button
                  type="button"
                  onClick={downloadCredentials}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Admission</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Temporary Password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {credentials.map((item, index) => (
                      <tr key={`${item.role || 'account'}-${item.student_id || item.parent_id || item.email || 'record'}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200 capitalize">{item.role || '—'}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{item.student_name || item.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.student_id || item.parent_id || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.admission_number || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.email || '—'}</td>
                        <td className="px-4 py-3 font-mono text-gray-900 dark:text-white whitespace-nowrap">{item.temporary_password || item.password || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowCredentials(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <StudentsList key={refreshKey} />
    </div>
  );
};

export default StudentsWithLoginAccounts;
