import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  CreditCard,
  UserCheck,
  LogIn,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  Download,
  Clock,
  User,
  FileCheck,
  X,
  Radio,
  ArrowUpRight,
  Database,
  Globe,
  Smartphone,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import toast from 'react-hot-toast';

import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';

dayjs.extend(relativeTime);

/* ============================================================
   DATABASE TYPES
============================================================ */

interface ActivityLogRow {
  id: string;
  log_id: string | null;
  user_id: string | null;
  action: string | null;
  resource_type: string | null;
  resource_id: string | null;
  resource_name: string | null;
  changes: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  branch_id: string | null;
  created_at: string;
}

interface UserRow {
  id: string;
  user_id?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  role?: string | null;
  branch_id?: string | null;
}

interface BranchRow {
  id: string;
  school_name?: string | null;
  branch_code?: string | null;
}

/* ============================================================
   UI TYPE
============================================================ */

interface ActivityEvent {
  id: string;
  type: 'payment' | 'auth' | 'student' | 'approval' | 'security' | 'other';

  title: string;
  description: string;

  actor_name: string;
  actor_role: string;
  actor_email?: string;

  target?: string;

  amount?: number;
  currency?: string;

  status: 'success' | 'pending' | 'warning' | 'failed';

  ip_address: string;
  device: string;
  location: string;

  timestamp: string;

  metadata?: Record<string, any>;

  branch_id?: string | null;
}

/* ============================================================
   HELPERS
============================================================ */

const getUserDisplayName = (user?: UserRow | null) => {
  if (!user) return 'System';

  const name = [
    user.first_name,
    user.middle_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return name || user.email || 'System User';
};

const formatRole = (role?: string | null) => {
  if (!role) return 'system';

  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

const normalizeAction = (action?: string | null) => {
  if (!action) return 'Activity';

  return action
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

const detectEventType = (
  action?: string | null,
  resourceType?: string | null
): ActivityEvent['type'] => {
  const value = `${action || ''} ${resourceType || ''}`.toLowerCase();

  if (
    value.includes('payment') ||
    value.includes('fee') ||
    value.includes('invoice') ||
    value.includes('transaction')
  ) {
    return 'payment';
  }

  if (
    value.includes('login') ||
    value.includes('logout') ||
    value.includes('auth') ||
    value.includes('session')
  ) {
    return 'auth';
  }

  if (
    value.includes('student') ||
    value.includes('pupil') ||
    value.includes('learner')
  ) {
    return 'student';
  }

  if (
    value.includes('approval') ||
    value.includes('approve') ||
    value.includes('verify')
  ) {
    return 'approval';
  }

  if (
    value.includes('security') ||
    value.includes('blocked') ||
    value.includes('failed') ||
    value.includes('attempt')
  ) {
    return 'security';
  }

  return 'other';
};

const detectStatus = (
  action?: string | null,
  changes?: Record<string, any> | null
): ActivityEvent['status'] => {
  const value = `${action || ''}`.toLowerCase();

  if (
    value.includes('fail') ||
    value.includes('error') ||
    value.includes('reject') ||
    value.includes('denied')
  ) {
    return 'failed';
  }

  if (
    value.includes('pending') ||
    value.includes('processing')
  ) {
    return 'pending';
  }

  if (
    value.includes('warning') ||
    value.includes('blocked')
  ) {
    return 'warning';
  }

  if (changes?.status) {
    const status = String(changes.status).toLowerCase();

    if (status === 'failed' || status === 'rejected') {
      return 'failed';
    }

    if (status === 'pending') {
      return 'pending';
    }
  }

  return 'success';
};

const extractAmount = (
  changes?: Record<string, any> | null
): number | undefined => {
  if (!changes) return undefined;

  const possibleKeys = [
    'amount',
    'paid_amount',
    'payment_amount',
    'total_amount',
    'amount_paid',
  ];

  for (const key of possibleKeys) {
    const value = changes[key];

    if (typeof value === 'number') {
      return value;
    }

    if (
      typeof value === 'string' &&
      value.trim() !== '' &&
      !Number.isNaN(Number(value))
    ) {
      return Number(value);
    }
  }

  return undefined;
};

const extractCurrency = (
  changes?: Record<string, any> | null
): string => {
  if (!changes) return 'NGN';

  return (
    changes.currency ||
    changes.currency_code ||
    'NGN'
  );
};

const getDeviceName = (userAgent?: string | null) => {
  if (!userAgent) return 'Unknown Device';

  const ua = userAgent.toLowerCase();

  let browser = 'Browser';

  if (ua.includes('edg/')) {
    browser = 'Microsoft Edge';
  } else if (ua.includes('chrome')) {
    browser = 'Chrome';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('safari')) {
    browser = 'Safari';
  } else if (ua.includes('opera')) {
    browser = 'Opera';
  }

  let platform = 'Unknown OS';

  if (ua.includes('iphone') || ua.includes('ipad')) {
    platform = 'iOS';
  } else if (ua.includes('android')) {
    platform = 'Android';
  } else if (ua.includes('windows')) {
    platform = 'Windows';
  } else if (ua.includes('mac os')) {
    platform = 'macOS';
  } else if (ua.includes('linux')) {
    platform = 'Linux';
  }

  return `${browser} / ${platform}`;
};

const buildDescription = (
  row: ActivityLogRow,
  actorName: string
) => {
  const action = normalizeAction(row.action);
  const resource = row.resource_name || row.resource_type;

  if (resource) {
    return `${action} — ${resource} by ${actorName}`;
  }

  return `${action} performed by ${actorName}`;
};

/* ============================================================
   COMPONENT
============================================================ */

export const LiveActivityLog: React.FC = () => {
  const { user } = useAuth();

  const [logs, setLogs] = useState<ActivityEvent[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedEvent, setSelectedEvent] =
    useState<ActivityEvent | null>(null);

  const [isLiveStreaming, setIsLiveStreaming] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /* ============================================================
     LOAD ACTIVITY LOGS
  ============================================================ */

  const loadActivityLogs = useCallback(async () => {
    try {
      setError(null);

      const branchId =
        user?.branch_id ||
        (user as any)?.branchId ||
        null;

      let query = supabase
        .from('activity_logs')
        .select(`
          id,
          log_id,
          user_id,
          action,
          resource_type,
          resource_id,
          resource_name,
          changes,
          ip_address,
          user_agent,
          branch_id,
          created_at
        `)
        .order('created_at', {
          ascending: false,
        })
        .limit(100);

      /*
       * If the logged-in user has a branch,
       * only load that branch's audit records.
       */
      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const {
        data,
        error: fetchError,
      } = await query;

      if (fetchError) {
        throw fetchError;
      }

      if (!data || data.length === 0) {
        setLogs([]);
        return;
      }

      /*
       * Get all user IDs from the logs.
       */
      const userIds = [
        ...new Set(
          data
            .map(row => row.user_id)
            .filter(Boolean)
        ),
      ];

      /*
       * Fetch corresponding users.
       */
      let usersMap = new Map<string, UserRow>();

      if (userIds.length > 0) {
        const {
          data: usersData,
          error: usersError,
        } = await supabase
          .from('users')
          .select(`
            id,
            user_id,
            email,
            first_name,
            last_name,
            middle_name,
            role,
            branch_id
          `)
          .in('id', userIds);

        if (usersError) {
          console.warn(
            'Could not load audit users:',
            usersError
          );
        }

        if (usersData) {
          usersMap = new Map(
            usersData.map(u => [u.id, u])
          );
        }
      }

      /*
       * Convert database records into the UI model.
       */
      const formattedLogs: ActivityEvent[] =
        data.map((row: ActivityLogRow) => {
          const actor = row.user_id
            ? usersMap.get(row.user_id)
            : null;

          const eventType = detectEventType(
            row.action,
            row.resource_type
          );

          const status = detectStatus(
            row.action,
            row.changes
          );

          const amount = extractAmount(
            row.changes
          );

          const currency = extractCurrency(
            row.changes
          );

          return {
            id: row.id,

            type: eventType,

            title: normalizeAction(
              row.action
            ),

            description: buildDescription(
              row,
              getUserDisplayName(actor)
            ),

            actor_name:
              getUserDisplayName(actor),

            actor_role:
              formatRole(actor?.role),

            actor_email:
              actor?.email || undefined,

            target:
              row.resource_name ||
              row.resource_id ||
              undefined,

            amount,

            currency,

            status,

            ip_address:
              row.ip_address ||
              'Not recorded',

            device:
              getDeviceName(
                row.user_agent
              ),

            location:
              'Not available',

            timestamp:
              row.created_at,

            metadata: {
              log_id: row.log_id,
              resource_type:
                row.resource_type,
              resource_id:
                row.resource_id,
              changes:
                row.changes,
              user_agent:
                row.user_agent,
              branch_id:
                row.branch_id,
            },

            branch_id:
              row.branch_id,
          };
        });

      setLogs(formattedLogs);
    } catch (err: any) {
      console.error(
        'Failed to load activity logs:',
        err
      );

      setError(
        err?.message ||
          'Failed to load activity logs'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    loadActivityLogs();
  }, [loadActivityLogs]);

  /* ============================================================
     REALTIME ACTIVITY LOGS
  ============================================================ */

  useEffect(() => {
    if (!isLiveStreaming) {
      return;
    }

    const branchId =
      user?.branch_id ||
      (user as any)?.branchId ||
      null;

    const channel = supabase
      .channel(
        `activity-logs-${branchId || 'all'}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          ...(branchId
            ? {
                filter: `branch_id=eq.${branchId}`,
              }
            : {}),
        },
        () => {
          /*
           * Re-fetch because we need the related
           * user record to display the actor name.
           */
          loadActivityLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    isLiveStreaming,
    user,
    loadActivityLogs,
  ]);

  /* ============================================================
     REFRESH
  ============================================================ */

  const handleRefresh = async () => {
    setIsRefreshing(true);

    await loadActivityLogs();

    toast.success(
      'Audit logs synchronized with the database'
    );
  };

  /* ============================================================
     EXPORT
  ============================================================ */

  const handleExportAudit = () => {
    if (logs.length === 0) {
      toast.error(
        'There are no audit records to export'
      );
      return;
    }

    const csvHeader =
      'Timestamp,Event Type,Title,Actor,Role,Target,Amount,Status,IP Address,Device\n';

    const csvRows = logs
      .map(log =>
        [
          log.timestamp,
          log.type,
          log.title,
          log.actor_name,
          log.actor_role,
          log.target || '',
          log.amount ?? '',
          log.status,
          log.ip_address,
          log.device,
        ]
          .map(value =>
            `"${String(value).replace(/"/g, '""')}"`
          )
          .join(',')
      )
      .join('\n');

    const blob = new Blob(
      [csvHeader + csvRows],
      {
        type:
          'text/csv;charset=utf-8;',
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;

    link.download =
      `EIS_Audit_Logs_${dayjs().format(
        'YYYYMMDD_HHmm'
      )}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    toast.success(
      'Audit trail exported successfully'
    );
  };

  /* ============================================================
     FILTER
  ============================================================ */

  const filteredLogs = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase();

    return logs.filter(item => {
      const matchesFilter =
        filterType === 'all' ||
        item.type === filterType;

      if (!matchesFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        item.title,
        item.description,
        item.actor_name,
        item.actor_role,
        item.actor_email,
        item.target,
        item.ip_address,
        item.device,
      ]
        .filter(Boolean)
        .some(value =>
          String(value)
            .toLowerCase()
            .includes(query)
        );
    });
  }, [
    logs,
    filterType,
    searchQuery,
  ]);

  /* ============================================================
     ICON
  ============================================================ */

  const getEventIcon = (
    type: ActivityEvent['type']
  ) => {
    switch (type) {
      case 'payment':
        return (
          <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        );

      case 'auth':
        return (
          <LogIn className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        );

      case 'student':
        return (
          <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        );

      case 'approval':
        return (
          <FileCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        );

      case 'security':
        return (
          <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" />
        );

      default:
        return (
          <Database className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        );
    }
  };

  /* ============================================================
     BADGE
  ============================================================ */

  const getEventBadge = (
    type: ActivityEvent['type']
  ) => {
    switch (type) {
      case 'payment':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';

      case 'auth':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';

      case 'student':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';

      case 'approval':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';

      case 'security':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';

      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  /* ============================================================
     STATUS
  ============================================================ */

  const getStatusIcon = (
    status: ActivityEvent['status']
  ) => {
    switch (status) {
      case 'success':
        return (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        );

      case 'warning':
        return (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        );

      case 'failed':
        return (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
        );

      default:
        return (
          <Clock className="w-3.5 h-3.5 text-gray-400" />
        );
    }
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">

      {/* HEADER */}
      <div className="p-4 sm:p-5 border-b border-gray-200/80 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-gray-50/50 via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">

        <div>
          <div className="flex items-center gap-2">

            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
              <Activity className="w-4 h-4" />
            </div>

            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Live Audit & Activity Feed

                {isLiveStreaming && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    LIVE
                  </span>
                )}
              </h2>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Real-time activity from your school database
              </p>
            </div>

          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-2 self-end sm:self-auto">

          <button
            onClick={() =>
              setIsLiveStreaming(
                previous => !previous
              )
            }
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isLiveStreaming
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                isLiveStreaming
                  ? 'animate-pulse text-emerald-600'
                  : ''
              }`}
            />

            <span className="hidden sm:inline">
              {isLiveStreaming
                ? 'Streaming'
                : 'Paused'}
            </span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200/80 dark:border-gray-700 transition-all"
            title="Sync feed"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isRefreshing
                  ? 'animate-spin text-blue-600'
                  : ''
              }`}
            />
          </button>

          <button
            onClick={handleExportAudit}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/80 dark:border-gray-700 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />

            <span className="hidden sm:inline">
              Export Audit
            </span>
          </button>

        </div>
      </div>

      {/* FILTER */}
      <div className="p-3 bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-200/70 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">

          {[
            {
              id: 'all',
              label: 'All Logs',
            },
            {
              id: 'payment',
              label: 'Payments',
            },
            {
              id: 'approval',
              label: 'Approvals',
            },
            {
              id: 'student',
              label: 'Students',
            },
            {
              id: 'auth',
              label: 'Security & Logins',
            },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() =>
                setFilterType(tab.id)
              }
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filterType === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60'
              }`}
            >
              {tab.label}
            </button>
          ))}

        </div>

        <div className="relative flex-1 sm:flex-initial min-w-[200px]">

          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            placeholder="Search audit trail..."
            value={searchQuery}
            onChange={event =>
              setSearchQuery(
                event.target.value
              )
            }
            className="w-full pl-8 pr-3 py-1 rounded-lg text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

        </div>

      </div>

      {/* CONTENT */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800/60 max-h-[380px] overflow-y-auto">

        {isLoading ? (
          <div className="py-12 text-center">

            <RefreshCw className="w-7 h-7 mx-auto mb-2 text-blue-500 animate-spin" />

            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Loading audit trail...
            </p>

          </div>
        ) : error ? (
          <div className="py-12 px-6 text-center">

            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />

            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Could not load audit logs
            </p>

            <p className="text-xs text-gray-500 mt-1 break-words">
              {error}
            </p>

            <button
              onClick={handleRefresh}
              className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              Try Again
            </button>

          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center">

            <Database className="w-8 h-8 mx-auto mb-2 text-gray-400 opacity-60" />

            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {logs.length === 0
                ? 'No audit activity recorded yet'
                : 'No activity matching your search'}
            </p>

            <p className="text-xs text-gray-400 mt-1">
              {logs.length === 0
                ? 'Activity will appear here when actions are recorded in activity_logs.'
                : 'Adjust your filters or search parameters.'}
            </p>

          </div>
        ) : (
          filteredLogs.map(event => (

            <motion.div
              key={event.id}
              initial={{
                opacity: 0,
                y: 4,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              onClick={() =>
                setSelectedEvent(event)
              }
              className="p-3.5 hover:bg-gray-50/90 dark:hover:bg-gray-800/50 transition-colors cursor-pointer flex items-start justify-between gap-3 group"
            >

              <div className="flex items-start gap-3 min-w-0">

                <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 flex-shrink-0 mt-0.5">
                  {getEventIcon(event.type)}
                </div>

                <div className="min-w-0 flex-1">

                  <div className="flex items-center gap-2 flex-wrap">

                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getEventBadge(
                        event.type
                      )}`}
                    >
                      {event.type}
                    </span>

                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {event.title}
                    </h3>

                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                    {event.description}
                  </p>

                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap">

                    <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                      <User className="w-3 h-3 text-gray-400" />
                      {event.actor_name}
                    </span>

                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />

                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {dayjs(
                        event.timestamp
                      ).fromNow()}
                    </span>

                    {event.target && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />

                        <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                          {event.target}
                        </span>
                      </>
                    )}

                  </div>

                </div>

              </div>

              {/* RIGHT SIDE */}
              <div className="text-right flex-shrink-0 flex flex-col items-end justify-between self-stretch">

                {event.amount !== undefined ? (
                  <span className="font-mono font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                    +{event.currency || 'NGN'}
                    {Number(
                      event.amount
                    ).toLocaleString()}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Inspect
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                )}

                <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                  {getStatusIcon(
                    event.status
                  )}

                  {dayjs(
                    event.timestamp
                  ).format('HH:mm:ss')}
                </span>

              </div>

            </motion.div>

          ))
        )}

      </div>

      {/* FOOTER */}
      <div className="p-3 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-200/80 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">

        <span>
          Showing {filteredLogs.length} audit trail records
        </span>

        <span className="font-medium text-gray-700 dark:text-gray-300">
          Database Audit Trail
        </span>

      </div>

      {/* ========================================================
          EVENT DETAILS MODAL
      ======================================================== */}

      <AnimatePresence>

        {selectedEvent && (

          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() =>
              setSelectedEvent(null)
            }
          >

            <motion.div
              initial={{
                scale: 0.95,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              exit={{
                scale: 0.95,
                opacity: 0,
              }}
              onClick={event =>
                event.stopPropagation()
              }
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl overflow-hidden"
            >

              {/* MODAL HEADER */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">

                <div className="flex items-center gap-2">

                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
                    {getEventIcon(
                      selectedEvent.type
                    )}
                  </div>

                  <div>

                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                      Audit Trail Inspection
                    </h3>

                    <p className="text-xs text-gray-500 font-mono">
                      ID: {selectedEvent.id}
                    </p>

                  </div>

                </div>

                <button
                  onClick={() =>
                    setSelectedEvent(null)
                  }
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>

              </div>

              {/* MODAL BODY */}
              <div className="py-4 space-y-3 text-xs">

                <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl space-y-1.5">

                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getEventBadge(
                      selectedEvent.type
                    )}`}
                  >
                    {selectedEvent.type}
                  </span>

                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {selectedEvent.title}
                  </p>

                  <p className="text-gray-600 dark:text-gray-300">
                    {selectedEvent.description}
                  </p>

                </div>

                <div className="grid grid-cols-2 gap-2">

                  <div className="p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-800">

                    <span className="text-gray-400 block text-[10px]">
                      Actor
                    </span>

                    <span className="font-semibold text-gray-900 dark:text-white">
                      {selectedEvent.actor_name}
                    </span>

                    <span className="text-gray-500 block text-[10px]">
                      Role: {selectedEvent.actor_role}
                    </span>

                    {selectedEvent.actor_email && (
                      <span className="text-gray-500 block text-[10px] truncate">
                        {selectedEvent.actor_email}
                      </span>
                    )}

                  </div>

                  <div className="p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-800">

                    <span className="text-gray-400 block text-[10px]">
                      Timestamp
                    </span>

                    <span className="font-semibold text-gray-900 dark:text-white">
                      {dayjs(
                        selectedEvent.timestamp
                      ).format(
                        'MMM D, YYYY HH:mm:ss'
                      )}
                    </span>

                    <span className="text-gray-500 block text-[10px]">
                      {dayjs(
                        selectedEvent.timestamp
                      ).fromNow()}
                    </span>

                  </div>

                </div>

                <div className="grid grid-cols-2 gap-2">

                  <div className="p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-800">

                    <span className="text-gray-400 block text-[10px]">
                      IP Address
                    </span>

                    <span className="font-mono text-gray-800 dark:text-gray-200 break-all">
                      {selectedEvent.ip_address}
                    </span>

                  </div>

                  <div className="p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-800">

                    <span className="text-gray-400 block text-[10px]">
                      Device
                    </span>

                    <span className="text-gray-800 dark:text-gray-200">
                      {selectedEvent.device}
                    </span>

                  </div>

                </div>

                <div className="grid grid-cols-2 gap-2">

                  <div className="p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-800">

                    <span className="text-gray-400 block text-[10px]">
                      Resource Type
                    </span>

                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {selectedEvent.metadata?.resource_type ||
                        '—'}
                    </span>

                  </div>

                  <div className="p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-800">

                    <span className="text-gray-400 block text-[10px]">
                      Resource ID
                    </span>

                    <span className="font-mono text-[10px] text-gray-800 dark:text-gray-200 break-all">
                      {selectedEvent.metadata?.resource_id ||
                        '—'}
                    </span>

                  </div>

                </div>

                {/* METADATA */}
                {selectedEvent.metadata && (
                  <div className="p-3 bg-gray-900 text-gray-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56">

                    <span className="text-gray-400 block text-[10px] mb-1">
                      // Database Audit Payload
                    </span>

                    <pre>
                      {JSON.stringify(
                        selectedEvent.metadata,
                        null,
                        2
                      )}
                    </pre>

                  </div>
                )}

              </div>

              {/* FOOTER */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-end">

                <button
                  onClick={() =>
                    setSelectedEvent(null)
                  }
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold transition-all"
                >
                  Close Inspection
                </button>

              </div>

            </motion.div>

          </div>
        )}

      </AnimatePresence>

    </div>
  );
};

export default LiveActivityLog;