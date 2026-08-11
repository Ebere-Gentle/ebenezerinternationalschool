import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Clock,
  Download,
  FileArchive,
  HardDriveDownload,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';

import { supabase } from '../config/supabase/client';
import { useAuth } from '../hooks/useAuth';

interface BackupRecord {
  id: string;
  branch_id: string;
  created_by?: string | null;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  status: 'creating' | 'completed' | 'failed' | string;
  tables_backed_up?: number | null;
  records_backed_up?: number | null;
  storage_files_backed_up?: number | null;
  created_at?: string;
  completed_at?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface BackupResponse {
  success: boolean;
  backup?: {
    id: string;
    branch_id: string;
    school_name: string;
    file_name: string;
    file_path: string;
    file_size: number;
    tables_backed_up: number;
    records_backed_up: number;
    storage_files_backed_up: number;
    status: string;
  };
  download_url?: string;
  expires_in?: number;
  message?: string;
  error?: string;
  backup_id?: string | null;
}

const formatBytes = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) {
    return '0 Bytes';
  }

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(
    index === 0 ? 0 : 2
  )} ${units[index]}`;
};

const formatDate = (date?: string | null) => {
  if (!date) {
    return '—';
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
};

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'completed':
      return {
        label: 'Completed',
        className:
          'bg-emerald-50 text-emerald-700 border-emerald-200',
      };

    case 'creating':
      return {
        label: 'Creating',
        className:
          'bg-blue-50 text-blue-700 border-blue-200',
      };

    case 'failed':
      return {
        label: 'Failed',
        className:
          'bg-red-50 text-red-700 border-red-200',
      };

    default:
      return {
        label: status || 'Unknown',
        className:
          'bg-gray-50 text-gray-700 border-gray-200',
      };
  }
};

/**
 * Extract the REAL error returned by a Supabase Edge Function.
 *
 * Supabase FunctionsHttpError normally only exposes:
 * "Edge Function returned a non-2xx status code"
 *
 * The actual response body can contain:
 * {
 *   success: false,
 *   error: "actual database/storage error"
 * }
 */
const extractFunctionError = async (
  error: unknown
): Promise<string> => {
  if (!error) {
    return 'The backup function failed for an unknown reason.';
  }

  const typedError = error as {
    message?: string;
    context?: Response;
  };

  // Try to read the Edge Function response body.
  if (typedError.context) {
    try {
      const response = typedError.context;

      const clonedResponse = response.clone();

      const contentType =
        clonedResponse.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const body = await clonedResponse.json();

        if (body?.error) {
          return String(body.error);
        }

        if (body?.message) {
          return String(body.message);
        }
      } else {
        const text = await clonedResponse.text();

        if (text?.trim()) {
          return text.trim();
        }
      }
    } catch (responseError) {
      console.warn(
        'Could not read Edge Function error body:',
        responseError
      );
    }
  }

  if (typedError.message) {
    return typedError.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'The backup function failed for an unknown reason.';
};

const SchoolBackup: React.FC = () => {
  const { user } = useAuth();

  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loadingBackups, setLoadingBackups] =
    useState(true);

  const [creatingBackup, setCreatingBackup] =
    useState(false);

  const [showConfirmModal, setShowConfirmModal] =
    useState(false);

  const [showSuccessModal, setShowSuccessModal] =
    useState(false);

  const [showErrorModal, setShowErrorModal] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const [latestBackup, setLatestBackup] =
    useState<BackupResponse['backup'] | null>(null);

  const [latestDownloadUrl, setLatestDownloadUrl] =
    useState<string | null>(null);

  const [downloadingBackupId, setDownloadingBackupId] =
    useState<string | null>(null);

  const [deletingBackupId, setDeletingBackupId] =
    useState<string | null>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  /**
   * =====================================================
   * LOAD BACKUP HISTORY
   * =====================================================
   */
  const fetchBackups = useCallback(async () => {
    if (!user?.id) {
      setBackups([]);
      setLoadingBackups(false);
      return;
    }

    try {
      setLoadingBackups(true);

      const {
        data: userRecord,
        error: userError,
      } = await supabase
        .from('users')
        .select('branch_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userError) {
        throw userError;
      }

      if (!userRecord?.branch_id) {
        setBackups([]);
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from('school_backups')
        .select(`
          id,
          branch_id,
          created_by,
          file_name,
          file_path,
          file_size,
          status,
          tables_backed_up,
          records_backed_up,
          storage_files_backed_up,
          created_at,
          completed_at,
          error_message,
          metadata
        `)
        .eq(
          'branch_id',
          userRecord.branch_id
        )
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setBackups(
        (data as BackupRecord[]) || []
      );
    } catch (error) {
      console.error(
        'Failed to load backup history:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load backup history.'
      );
    } finally {
      setLoadingBackups(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  /**
   * =====================================================
   * REFRESH
   * =====================================================
   */
  const handleRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await fetchBackups();
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * =====================================================
   * CREATE BACKUP
   * =====================================================
   */

  const handleCreateBackup = async () => {
  setShowConfirmModal(false);
  setCreatingBackup(true);
  setErrorMessage('');
  setLatestBackup(null);
  setLatestDownloadUrl(null);

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session?.access_token) {
      throw new Error(
        'Your session has expired. Please sign in again.'
      );
    }

    const { data, error } =
      await supabase.functions.invoke(
        'create-school-backup',
        {
          body: {},
        }
      );

    /*
     * Supabase can return a FunctionsHttpError while
     * the actual Edge Function response contains our
     * JSON error message.
     */
    if (error) {
      console.error(
        'Backup function error:',
        error
      );

      let serverMessage =
        error.message ||
        'The backup server returned an error.';

      /*
       * Try to read the actual response body.
       */
      try {
        const context =
          (
            error as any
          )?.context;

        if (context) {
          let responseData: any = null;

          if (
            typeof context.json ===
            'function'
          ) {
            responseData =
              await context.json();
          } else if (
            typeof context.text ===
            'function'
          ) {
            const text =
              await context.text();

            try {
              responseData =
                JSON.parse(text);
            } catch {
              if (text) {
                serverMessage =
                  text;
              }
            }
          }

          if (
            responseData?.error
          ) {
            serverMessage =
              responseData.error;
          }
        }
      } catch (
        responseError
      ) {
        console.warn(
          'Could not parse Edge Function error response:',
          responseError
        );
      }

      throw new Error(
        serverMessage
      );
    }

    const response =
      data as BackupResponse;

    if (!response) {
      throw new Error(
        'The backup server returned an empty response.'
      );
    }

    if (!response.success) {
      throw new Error(
        response.error ||
          'Backup creation failed.'
      );
    }

    setLatestBackup(
      response.backup || null
    );

    setLatestDownloadUrl(
      response.download_url ||
        null
    );

    await fetchBackups();

    /*
     * Automatically download the newly-created backup.
     */
    if (
      response.download_url
    ) {
      const link =
        document.createElement(
          'a'
        );

      link.href =
        response.download_url;

      link.download =
        response.backup?.file_name ||
        'school-backup.backup';

      link.target = '_blank';

      link.rel =
        'noopener noreferrer';

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );
    }

    setShowSuccessModal(
      true
    );
  } catch (error) {
    console.error(
      'Backup creation failed:',
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    setErrorMessage(
      message ||
        'An unexpected error occurred while creating the backup.'
    );

    setShowErrorModal(
      true
    );

    await fetchBackups();
  } finally {
    setCreatingBackup(
      false
    );
  }
};
 

  /**
   * =====================================================
   * DOWNLOAD EXISTING BACKUP
   * =====================================================
   */
  const handleDownloadBackup = async (
    backup: BackupRecord
  ) => {
    if (
      backup.status !== 'completed' ||
      downloadingBackupId
    ) {
      return;
    }

    setDownloadingBackupId(
      backup.id
    );

    try {
      const {
        data,
        error,
      } = await supabase.storage
        .from('school_backups')
        .createSignedUrl(
          backup.file_path,
          60 * 60
        );

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error(
          'The backup file exists, but a temporary download link could not be created.'
        );
      }

      const link =
        document.createElement('a');

      link.href =
        data.signedUrl;

      link.download =
        backup.file_name;

      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);
    } catch (error) {
      console.error(
        'Download failed:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to download this backup.'
      );

      setShowErrorModal(true);
    } finally {
      setDownloadingBackupId(null);
    }
  };

  /**
   * =====================================================
   * DELETE BACKUP
   * =====================================================
   */
  const handleDeleteBackup = async (
    backup: BackupRecord
  ) => {
    if (deletingBackupId) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${backup.file_name}"?\n\nThis action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingBackupId(
      backup.id
    );

    try {
      /**
       * -------------------------------------------------
       * Delete storage file
       * -------------------------------------------------
       */
      const {
        error: storageError,
      } = await supabase.storage
        .from('school_backups')
        .remove([
          backup.file_path,
        ]);

      if (storageError) {
        throw storageError;
      }

      /**
       * -------------------------------------------------
       * Delete database record
       * -------------------------------------------------
       */
      const {
        error: databaseError,
      } = await supabase
        .from('school_backups')
        .delete()
        .eq(
          'id',
          backup.id
        );

      if (databaseError) {
        throw databaseError;
      }

      setBackups(
        current =>
          current.filter(
            item =>
              item.id !==
              backup.id
          )
      );
    } catch (error) {
      console.error(
        'Failed to delete backup:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete this backup.'
      );

      setShowErrorModal(true);
    } finally {
      setDeletingBackupId(
        null
      );
    }
  };

  /**
   * =====================================================
   * STATISTICS
   * =====================================================
   */
  const completedBackups =
    backups.filter(
      backup =>
        backup.status ===
        'completed'
    );

  const failedBackups =
    backups.filter(
      backup =>
        backup.status ===
        'failed'
    );

  const creatingBackups =
    backups.filter(
      backup =>
        backup.status ===
        'creating'
    );

  const totalBackupSize =
    completedBackups.reduce(
      (total, backup) =>
        total +
        (backup.file_size || 0),
      0
    );

  /**
   * =====================================================
   * RENDER
   * =====================================================
   */
  return (
    <div className="relative min-h-full">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <Archive size={21} />
              </div>

              <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                System Backup
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              School Backup
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500 sm:text-base">
              Create a complete protected copy of your
              school's data and files so the system can
              be restored if something goes wrong.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={
              refreshing ||
              loadingBackups ||
              creatingBackup
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? 'animate-spin'
                  : ''
              }
            />

            Refresh
          </button>
        </div>
      </div>

      {/* =====================================================
          SECURITY NOTICE
      ===================================================== */}

      <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
        <div className="flex gap-3">
          <div className="mt-0.5 shrink-0">
            <ShieldCheck
              size={22}
              className="text-indigo-600"
            />
          </div>

          <div>
            <h3 className="font-semibold text-indigo-950">
              Protected backup
            </h3>

            <p className="mt-1 text-sm leading-6 text-indigo-800">
              Your backup contains school records and
              uploaded documents. The backup is encrypted
              before it is stored and the download link
              is temporary.
            </p>

            <p className="mt-2 text-xs font-medium text-indigo-700">
              Keep downloaded backup files somewhere safe.
              They may be required to restore the school
              after a major system failure.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          STATS
      ===================================================== */}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Completed Backups
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {completedBackups.length}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={21} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Stored Backup Size
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatBytes(
                  totalBackupSize
                )}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <HardDriveDownload size={21} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Failed Backups
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {failedBackups.length}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertCircle size={21} />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          CREATE BACKUP CARD
      ===================================================== */}

      <div className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <FileArchive size={27} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Create a new backup
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  This creates a copy of the school's
                  branch data, records, and supported
                  uploaded files.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    'Database',
                    'Student records',
                    'Financial records',
                    'School files',
                  ].map(label => (
                    <span
                      key={label}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowConfirmModal(true)
              }
              disabled={
                creatingBackup ||
                creatingBackups.length > 0
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingBackup ? (
                <>
                  <Loader2
                    size={19}
                    className="animate-spin"
                  />
                  Creating Backup...
                </>
              ) : (
                <>
                  <Archive size={19} />
                  Create Backup
                </>
              )}
            </button>
          </div>

          {creatingBackup && (
            <div className="mt-7 rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <Loader2
                  size={21}
                  className="mt-0.5 shrink-0 animate-spin text-blue-600"
                />

                <div>
                  <p className="font-semibold text-blue-950">
                    Backup is being created
                  </p>

                  <p className="mt-1 text-sm leading-6 text-blue-800">
                    The server is collecting your school's
                    records and files, creating the backup
                    archive, encrypting it, and preparing
                    your download.
                  </p>

                  <p className="mt-2 text-xs font-medium text-blue-700">
                    Please keep this page open until the
                    process finishes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          BACKUP HISTORY
      ===================================================== */}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <History size={20} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Backup History
              </h2>

              <p className="text-sm text-slate-500">
                Previously created backups for this school
              </p>
            </div>
          </div>

          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {backups.length} backup
            {backups.length === 1
              ? ''
              : 's'}
          </span>
        </div>

        {loadingBackups ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="text-center">
              <Loader2
                size={28}
                className="mx-auto animate-spin text-indigo-600"
              />

              <p className="mt-3 text-sm font-medium text-slate-500">
                Loading backup history...
              </p>
            </div>
          </div>
        ) : backups.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Archive size={29} />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              No backups yet
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
              Create your first school backup. It is
              recommended to keep an external copy in a
              secure location.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Backup
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Created
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Size
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Contents
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {backups.map(backup => {
                    const status =
                      getStatusStyles(
                        backup.status
                      );

                    return (
                      <tr
                        key={backup.id}
                        className="transition hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                              <Archive size={18} />
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[260px] truncate text-sm font-semibold text-slate-900">
                                {backup.file_name}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                ID:{' '}
                                {backup.id.slice(
                                  0,
                                  8
                                )}
                                ...
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-600">
                          {formatDate(
                            backup.created_at
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-5 text-sm font-medium text-slate-700">
                          {formatBytes(
                            backup.file_size
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <div className="text-xs text-slate-600">
                            <p>
                              {backup.tables_backed_up ??
                                0}{' '}
                              tables
                            </p>

                            <p className="mt-1">
                              {(
                                backup.records_backed_up ??
                                0
                              ).toLocaleString()}{' '}
                              records
                            </p>

                            <p className="mt-1">
                              {backup.storage_files_backed_up ??
                                0}{' '}
                              files
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                          >
                            {backup.status ===
                            'completed' ? (
                              <CheckCircle2
                                size={13}
                              />
                            ) : backup.status ===
                              'failed' ? (
                              <AlertCircle
                                size={13}
                              />
                            ) : (
                              <Clock
                                size={13}
                              />
                            )}

                            {status.label}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center justify-end gap-2">
                            {backup.status ===
                              'completed' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadBackup(
                                    backup
                                  )
                                }
                                disabled={
                                  downloadingBackupId ===
                                  backup.id
                                }
                                title="Download backup"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
                              >
                                {downloadingBackupId ===
                                backup.id ? (
                                  <Loader2
                                    size={16}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Download
                                    size={16}
                                  />
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteBackup(
                                  backup
                                )
                              }
                              disabled={
                                deletingBackupId ===
                                backup.id
                              }
                              title="Delete backup"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              {deletingBackupId ===
                              backup.id ? (
                                <Loader2
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={16}
                                />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}

            <div className="divide-y divide-slate-100 md:hidden">
              {backups.map(backup => {
                const status =
                  getStatusStyles(
                    backup.status
                  );

                return (
                  <div
                    key={backup.id}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <Archive size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {backup.file_name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(
                              backup.created_at
                            )}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase text-slate-400">
                          Size
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-700">
                          {formatBytes(
                            backup.file_size
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase text-slate-400">
                          Records
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-700">
                          {(
                            backup.records_backed_up ??
                            0
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase text-slate-400">
                          Files
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-700">
                          {backup.storage_files_backed_up ??
                            0}
                        </p>
                      </div>
                    </div>

                    {backup.status ===
                      'failed' &&
                      backup.error_message && (
                        <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700">
                          <p className="font-semibold">
                            Backup error
                          </p>

                          <p className="mt-1">
                            {backup.error_message}
                          </p>
                        </div>
                      )}

                    <div className="mt-4 flex gap-2">
                      {backup.status ===
                        'completed' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadBackup(
                              backup
                            )
                          }
                          disabled={
                            downloadingBackupId ===
                            backup.id
                          }
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {downloadingBackupId ===
                          backup.id ? (
                            <>
                              <Loader2
                                size={15}
                                className="animate-spin"
                              />
                              Preparing...
                            </>
                          ) : (
                            <>
                              <Download
                                size={15}
                              />
                              Download
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteBackup(
                            backup
                          )
                        }
                        disabled={
                          deletingBackupId ===
                          backup.id
                        }
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        {deletingBackupId ===
                        backup.id ? (
                          <Loader2
                            size={15}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2
                            size={15}
                          />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* =====================================================
          CONFIRM MODAL
      ===================================================== */}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="p-6 sm:p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <Archive size={24} />
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                Create school backup?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                The system will create a protected copy of
                your school's data and supported files.
              </p>

              <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />

                  <p className="text-sm text-slate-600">
                    Your school's branch data will be
                    included.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />

                  <p className="text-sm text-slate-600">
                    Supported school files will be included.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={17}
                    className="mt-0.5 shrink-0 text-indigo-600"
                  />

                  <p className="text-sm text-slate-600">
                    The backup is encrypted before storage.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-3">
                <p className="text-xs leading-5 text-amber-800">
                  The process may take some time if the school
                  has many records or uploaded files. Keep this
                  page open until the backup finishes.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowConfirmModal(false)
                }
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingBackup ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Creating...
                  </>
                ) : (
                  <>
                    <Archive size={17} />
                    Create Backup
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          SUCCESS MODAL
      ===================================================== */}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="p-6 text-center sm:p-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={34} />
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                Backup created successfully
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Your school backup has been created,
                encrypted, and stored securely.
              </p>

              {latestBackup && (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-left">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {latestBackup.file_name}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">
                        Size
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {formatBytes(
                          latestBackup.file_size
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">
                        Records
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {(
                          latestBackup.records_backed_up ??
                          0
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">
                        Tables
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {latestBackup.tables_backed_up}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">
                        Files
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {latestBackup.storage_files_backed_up}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {latestDownloadUrl && (
                <div className="mt-4">
                  <p className="text-xs text-emerald-700">
                    Your download should have started
                    automatically.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      if (!latestDownloadUrl) {
                        return;
                      }

                      window.open(
                        latestDownloadUrl,
                        '_blank',
                        'noopener,noreferrer'
                      );
                    }}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <Download size={15} />
                    Download Again
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 p-5">
              <button
                type="button"
                onClick={() =>
                  setShowSuccessModal(false)
                }
                className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ERROR MODAL
      ===================================================== */}

      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                  <AlertCircle size={25} />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowErrorModal(false)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                Backup could not be completed
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                The system was unable to create the backup.
                Your existing school data has not been
                deleted by this backup operation.
              </p>

              <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-red-500">
                  Server error
                </p>

                <p className="mt-2 break-words text-sm leading-6 text-red-800">
                  {errorMessage ||
                    'An unexpected error occurred.'}
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs leading-5 text-slate-500">
                  This message is the actual error returned
                  by the backup server. If you are debugging
                  the system, copy this message and check the
                  Edge Function logs.
                </p>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-400">
                Your existing school records remain untouched
                by the backup failure.
              </p>
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50 p-5">
              <button
                type="button"
                onClick={() =>
                  setShowErrorModal(false)
                }
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          BACKUP CREATION OVERLAY
      ===================================================== */}

      {creatingBackup && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-slate-950/5" />
      )}
    </div>
  );
};

export default SchoolBackup;