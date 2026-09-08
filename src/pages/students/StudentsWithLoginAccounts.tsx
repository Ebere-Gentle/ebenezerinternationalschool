import React, { useEffect, useState } from 'react';
import { Download, KeyRound, Loader2, ShieldCheck, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import StudentsList from './StudentsList';
import { supabase } from '../../config/supabase/client';

type Credential = {
  student_id?: string;
  student_name?: string;
  admission_number?: string;
  email?: string;
  temporary_password?: string;
  password?: string;
};

const StudentsWithLoginAccounts: React.FC = () => {
  const [creating, setCreating] = useState(false);
  const [missingCount, setMissingCount] = useState<number | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [showCredentials, setShowCredentials] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadMissingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .is('user_id', null)
        .not('email', 'is', null);

      if (error) throw error;
      setMissingCount(count ?? 0);
    } catch (error) {
      console.error('Error checking student login accounts:', error);
    }
  };

  useEffect(() => {
    loadMissingCount();
  }, []);

  const createStudentLoginAccounts = async () => {
    if (creating) return;

    const confirmed = window.confirm(
      `Create login accounts for ${missingCount ?? 'all eligible'} students who have an email address but no linked login account?\n\nThe system will securely create the accounts and link them to the correct student records.`
    );
    if (!confirmed) return;

    setCreating(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!sessionData.session?.access_token) {
        toast.error('Your admin session has expired. Please sign in again.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('batch-student-auth', {
        body: {},
      });

      if (error) throw error;

      const payload = data ?? {};
      const returnedCredentials = Array.isArray(payload.credentials)
        ? payload.credentials
        : Array.isArray(payload.results)
          ? payload.results.filter((item: Credential) => item.temporary_password || item.password)
          : [];

      setCredentials(returnedCredentials);
      setShowCredentials(returnedCredentials.length > 0);
      setRefreshKey((value) => value + 1);
      await loadMissingCount();

      const createdCount =
        payload.created_count ??
        (Array.isArray(payload.created) ? payload.created.length : returnedCredentials.length);

      if (createdCount > 0) {
        toast.success(`Created and linked ${createdCount} student login account${createdCount === 1 ? '' : 's'}.`);
      } else {
        toast.success(payload.message || 'Student login accounts are already up to date.');
      }
    } catch (error: any) {
      console.error('Error creating student login accounts:', error);
      const message = error?.context?.body?.message || error?.message || 'Failed to create student login accounts.';
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

    const header = ['Student Name', 'Admission Number', 'Email', 'Temporary Password'];
    const rows = credentials.map((item) => [
      item.student_name || '',
      item.admission_number || '',
      item.email || '',
      item.temporary_password || item.password || '',
    ]);

    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_login_credentials_${new Date().toISOString().slice(0, 10)}.csv`;
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
              <h2 className="text-base sm:text-lg font-semibold">Student Login Accounts</h2>
              <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl">
                Securely create and link Supabase Auth accounts for students who have an email address but no login account.
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm">
                <Users className="w-4 h-4" />
                <span>
                  {missingCount === null ? 'Checking eligible students…' : `${missingCount} eligible student${missingCount === 1 ? '' : 's'} without a login`}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={createStudentLoginAccounts}
            disabled={creating || missingCount === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {creating ? 'Creating Accounts…' : 'Create Student Login Accounts'}
          </button>
        </div>
      </div>

      {showCredentials && credentials.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">New Student Login Credentials</h3>
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
                  <span className="font-semibold">{credentials.length}</span> account{credentials.length === 1 ? '' : 's'} created.
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
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Student</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Admission</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Temporary Password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {credentials.map((item, index) => (
                      <tr key={`${item.student_id || item.email || 'student'}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{item.student_name || '—'}</td>
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
