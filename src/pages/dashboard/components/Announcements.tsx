
import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone,
  Calendar,
  Users,
  AlertCircle,
  Info,
  Bell,
  Clock,
  User,
  Building2,
  Tag,
  ChevronRight,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  BookOpen,
  Wallet,
  CreditCard,
  Shield,
  Heart,
  Bus,
  ClipboardCheck,
  Star,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../config/supabase/client';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useNavigate } from 'react-router-dom';

dayjs.extend(relativeTime);

interface Announcement {
  id: string;
  announcement_id: string;
  branch_id: string | null;
  title: string;
  content: string;
  category: string | null;
  priority:
    | 'low'
    | 'medium'
    | 'high'
    | 'urgent'
    | 'normal';
  target_roles: string[] | null;
  target_branches: string[] | null;
  start_date: string | null;
  end_date: string | null;
  is_published: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;

  branch_name?: string;
  creator_name?: string;
}

interface UserRecord {
  id: string;
  user_id: string;
  role: string;
  branch_id: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface BranchRecord {
  id: string;
  branch_id: string;
  school_name: string | null;
}

const Announcements: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [announcements, setAnnouncements] = useState<
    Announcement[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<string>('');
  const [userBranchId, setUserBranchId] =
    useState<string | null>(null);

  /*
   * ==========================================================
   * RESOLVE CURRENT USER
   * ==========================================================
   */
  useEffect(() => {
    let cancelled = false;

    const getUserData = async () => {
      if (!user?.id) return;

      try {
        let role =
          (user as typeof user & {
            role?: string;
          }).role || '';

        let branchId =
          (user as typeof user & {
            branch_id?: string | null;
          }).branch_id || null;

        if (role && branchId) {
          if (!cancelled) {
            setUserRole(role);
            setUserBranchId(branchId);
          }

          return;
        }

        const { data: userByUserId, error: userIdError } =
          await supabase
            .from('users')
            .select(
              `
              id,
              user_id,
              role,
              branch_id,
              first_name,
              last_name
            `
            )
            .eq('user_id', user.id)
            .maybeSingle();

        let userData =
          userByUserId as UserRecord | null;

        if (!userData && userIdError) {
          console.warn(
            'Primary users.user_id lookup failed:',
            userIdError.message
          );
        }

        if (!userData) {
          const { data: userById, error: idError } =
            await supabase
              .from('users')
              .select(
                `
                id,
                user_id,
                role,
                branch_id,
                first_name,
                last_name
              `
              )
              .eq('id', user.id)
              .maybeSingle();

          if (idError) {
            console.warn(
              'Fallback users.id lookup failed:',
              idError.message
            );
          }

          userData = userById as UserRecord | null;
        }

        if (!cancelled) {
          setUserRole(
            role ||
              userData?.role ||
              'student'
          );

          setUserBranchId(
            branchId ||
              userData?.branch_id ||
              null
          );
        }
      } catch (err) {
        console.error(
          'Error resolving announcement user:',
          err
        );

        if (!cancelled) {
          setUserRole('student');
          setUserBranchId(null);
        }
      }
    };

    getUserData();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /*
   * ==========================================================
   * CHECK WHETHER ANNOUNCEMENT IS CURRENTLY ACTIVE
   * ==========================================================
   */
  const isCurrentlyActive = useCallback(
    (announcement: Announcement) => {
      const now = dayjs();

      if (
        announcement.start_date &&
        dayjs(announcement.start_date).isAfter(now)
      ) {
        return false;
      }

      if (
        announcement.end_date &&
        dayjs(announcement.end_date).isBefore(now)
      ) {
        return false;
      }

      return true;
    },
    []
  );

  /*
   * ==========================================================
   * CHECK ROLE TARGET
   * ==========================================================
   */
  const isForUserRole = useCallback(
    (announcement: Announcement) => {
      const roles = announcement.target_roles || [];

      if (roles.length === 0) {
        return true;
      }

      if (!userRole) {
        return false;
      }

      const normalizedUserRole =
        userRole.toLowerCase().trim();

      return roles.some(
        (role) =>
          String(role).toLowerCase().trim() ===
          normalizedUserRole
      );
    },
    [userRole]
  );

  /*
   * ==========================================================
   * CHECK BRANCH TARGET
   * ==========================================================
   */
  const isForUserBranch = useCallback(
    (announcement: Announcement) => {
      const targetBranches =
        announcement.target_branches || [];

      if (targetBranches.length > 0) {
        if (!userBranchId) {
          return false;
        }

        return targetBranches.some(
          (branch) =>
            String(branch) ===
            String(userBranchId)
        );
      }

      if (!announcement.branch_id) {
        return true;
      }

      if (!userBranchId) {
        return false;
      }

      return (
        String(announcement.branch_id) ===
        String(userBranchId)
      );
    },
    [userBranchId]
  );

  /*
   * ==========================================================
   * GET CREATOR DETAILS
   * ==========================================================
   */
  const getCreatorDetails = async (
    creatorId: string | null
  ) => {
    if (!creatorId) {
      return 'System';
    }

    let { data, error } = await supabase
      .from('users')
      .select(
        `
        first_name,
        last_name
        `
      )
      .eq('id', creatorId)
      .maybeSingle();

    if (!data && error) {
      const fallback = await supabase
        .from('users')
        .select(
          `
          first_name,
          last_name
          `
        )
        .eq('user_id', creatorId)
        .maybeSingle();

      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data) {
      return 'System';
    }

    const fullName = [
      data.first_name,
      data.last_name,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return fullName || 'System';
  };

  /*
   * ==========================================================
   * GET BRANCH DETAILS
   * ==========================================================
   */
  const getBranchDetails = async (
    branchId: string | null
  ) => {
    if (!branchId) {
      return undefined;
    }

    const { data, error } = await supabase
      .from('branches')
      .select(
        `
        id,
        branch_id,
        school_name
        `
      )
      .eq('id', branchId)
      .maybeSingle();

    if (error || !data) {
      const fallback = await supabase
        .from('branches')
        .select(
          `
          id,
          branch_id,
          school_name
          `
        )
        .eq('branch_id', branchId)
        .maybeSingle();

      if (fallback.data) {
        return (
          fallback.data.school_name ||
          undefined
        );
      }

      return undefined;
    }

    return data.school_name || undefined;
  };

  /*
   * ==========================================================
   * FETCH ANNOUNCEMENTS
   * ==========================================================
   */
  const fetchAnnouncements = useCallback(
    async () => {
      if (!user?.id) {
        setAnnouncements([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('announcements')
          .select(
            `
            id,
            announcement_id,
            branch_id,
            title,
            content,
            category,
            priority,
            target_roles,
            target_branches,
            start_date,
            end_date,
            is_published,
            published_at,
            created_by,
            created_at,
            updated_at,
            metadata
            `
          )
          .eq('is_published', true)
          .order('created_at', {
            ascending: false,
          })
          .limit(100);

        if (userBranchId) {
          query = query.or(
            `branch_id.eq.${userBranchId},branch_id.is.null`
          );
        }

        const {
          data,
          error: fetchError,
        } = await query;

        if (fetchError) {
          throw fetchError;
        }

        const rows =
          (data || []) as Announcement[];

        const filteredData = rows.filter(
          (announcement) =>
            isForUserRole(announcement) &&
            isForUserBranch(announcement) &&
            isCurrentlyActive(announcement)
        );

        const limitedData =
          filteredData.slice(0, 5);

        const announcementsWithDetails =
          await Promise.all(
            limitedData.map(async (announcement) => {
              const [creatorName, branchName] =
                await Promise.all([
                  getCreatorDetails(
                    announcement.created_by
                  ),
                  getBranchDetails(
                    announcement.branch_id
                  ),
                ]);

              return {
                ...announcement,
                creator_name: creatorName,
                branch_name: branchName,
              };
            })
          );

        setAnnouncements(
          announcementsWithDetails
        );
      } catch (err: unknown) {
        console.error(
          'Error fetching announcements:',
          err
        );

        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load announcements';

        setError(message);
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    },
    [
      user?.id,
      userRole,
      userBranchId,
      isForUserRole,
      isForUserBranch,
      isCurrentlyActive,
    ]
  );

  /*
   * ==========================================================
   * INITIAL FETCH
   * ==========================================================
   */
  useEffect(() => {
    if (
      user?.id &&
      userRole &&
      userBranchId !== undefined
    ) {
      fetchAnnouncements();
    }
  }, [
    user?.id,
    userRole,
    userBranchId,
    fetchAnnouncements,
  ]);

  /*
   * ==========================================================
   * MANUAL REFRESH
   * ==========================================================
   */
  const refreshAnnouncements = async () => {
    if (refreshing) return;

    setRefreshing(true);

    try {
      await fetchAnnouncements();

      toast.success(
        'Announcements refreshed!'
      );
    } finally {
      setRefreshing(false);
    }
  };

  /*
   * ==========================================================
   * REAL-TIME ANNOUNCEMENTS
   * ==========================================================
   */
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(
        `announcements-dashboard-${user.id}`
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
        },
        async (payload) => {
          if (
            payload.eventType === 'INSERT' ||
            payload.eventType === 'UPDATE'
          ) {
            await fetchAnnouncements();

            if (
              payload.eventType === 'INSERT' &&
              payload.new
            ) {
              const announcement =
                payload.new as Announcement;

              if (
                announcement.is_published &&
                isForUserRole(announcement) &&
                isForUserBranch(announcement) &&
                isCurrentlyActive(announcement)
              ) {
                toast(announcement.title, {
                  icon: '📢',
                  duration: 5000,
                  position: 'top-right',
                });
              }
            }

            return;
          }

          if (
            payload.eventType === 'DELETE'
          ) {
            const deleted =
              payload.old as Announcement;

            setAnnouncements((previous) =>
              previous.filter(
                (announcement) =>
                  announcement.id !== deleted.id
              )
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(
            'Announcements realtime channel error'
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    user?.id,
    fetchAnnouncements,
    isForUserRole,
    isForUserBranch,
    isCurrentlyActive,
  ]);

  /*
   * ==========================================================
   * PRIORITY STYLING
   * ==========================================================
   */
  const getPriorityStyles = (
    priority: string
  ) => {
    const styles = {
      urgent: {
        border: 'border-red-400',
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-700 dark:text-red-300',
        icon: AlertTriangle,
        label: 'URGENT',
        dot: 'bg-red-500',
      },

      high: {
        border: 'border-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-700 dark:text-orange-300',
        icon: AlertCircle,
        label: 'HIGH',
        dot: 'bg-orange-500',
      },

      medium: {
        border: 'border-yellow-400',
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        text: 'text-yellow-700 dark:text-yellow-300',
        icon: Bell,
        label: 'MEDIUM',
        dot: 'bg-yellow-500',
      },

      low: {
        border: 'border-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-300',
        icon: Info,
        label: 'LOW',
        dot: 'bg-blue-500',
      },

      normal: {
        border: 'border-gray-400',
        bg: 'bg-gray-50 dark:bg-gray-700/30',
        text: 'text-gray-700 dark:text-gray-300',
        icon: Info,
        label: 'NORMAL',
        dot: 'bg-gray-500',
      },
    };

    return (
      styles[
        priority as keyof typeof styles
      ] || styles.normal
    );
  };

  /*
   * ==========================================================
   * CATEGORY ICON
   * ==========================================================
   */
  const getCategoryIcon = (
    category: string | null
  ) => {
    const icons: Record<
      string,
      React.ElementType
    > = {
      Academic: BookOpen,
      Fees: Wallet,
      Sports: Sparkles,
      PTA: Users,
      Teachers: User,
      Finance: CreditCard,
      Security: Shield,
      Health: Heart,
      Library: BookOpen,
      Transport: Bus,
      STEM: Zap,
      'Campus Life': Star,
      Exams: ClipboardCheck,
      Emergency: AlertTriangle,
    };

    return (
      icons[category || ''] ||
      Megaphone
    );
  };

  const isExpired = (
    announcement: Announcement
  ) => {
    if (!announcement.end_date) {
      return false;
    }

    return dayjs(
      announcement.end_date
    ).isBefore(dayjs());
  };

  const formatDate = (date: string) => {
    return dayjs(date).fromNow();
  };

  /*
   * ==========================================================
   * ERROR STATE
   * ==========================================================
   */
  if (error && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900 dark:bg-gray-800"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-red-50 p-2 dark:bg-red-900/20">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Unable to load announcements
            </h3>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {error}
            </p>

            <button
              onClick={refreshAnnouncements}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  /*
   * ==========================================================
   * LOADING STATE
   * ==========================================================
   */
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />

          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            Loading announcements...
          </span>
        </div>
      </div>
    );
  }

  /*
   * ==========================================================
   * MAIN UI
   * ==========================================================
   */
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.3,
      }}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-2">
            <Megaphone className="h-5 w-5 text-white" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Announcements
            </h3>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {announcements.length}{' '}
              active announcement
              {announcements.length !== 1
                ? 's'
                : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshAnnouncements}
            disabled={refreshing}
            aria-label="Refresh announcements"
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </button>

          {/* VIEW ALL */}
          <button
            type="button"
            onClick={() => navigate('/announcements')}
            className="flex items-center gap-1 text-sm text-blue-600 transition hover:text-blue-700 dark:text-blue-400"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ANNOUNCEMENTS */}
      {announcements.length === 0 ? (
        <div className="py-8 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No announcements
          </p>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Check back later for updates
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(
            (announcement) => {
              const priorityStyle =
                getPriorityStyles(
                  announcement.priority
                );

              const CategoryIcon =
                getCategoryIcon(
                  announcement.category
                );

              const expired =
                isExpired(announcement);

              return (
                <div
                  key={announcement.id}
                  className={`flex items-start gap-3 rounded-xl border-l-4 p-3 transition-all hover:shadow-md ${
                    expired
                      ? 'opacity-60'
                      : ''
                  } ${
                    priorityStyle.border
                  } ${
                    priorityStyle.bg
                  }`}
                >
                  <div className="rounded-lg bg-white/50 p-1.5 dark:bg-white/10">
                    <CategoryIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {announcement.title}
                      </h4>

                      {!expired && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${priorityStyle.text}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${priorityStyle.dot}`}
                          />

                          {
                            priorityStyle.label
                          }
                        </span>
                      )}

                      {expired && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-[8px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          EXPIRED
                        </span>
                      )}

                      {announcement.category && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[8px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                          <Tag className="h-3 w-3" />

                          {
                            announcement.category
                          }
                        </span>
                      )}
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                      {announcement.content}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />

                        {formatDate(
                          announcement.created_at
                        )}
                      </span>

                      {announcement.creator_name && (
                        <span className="flex items-center gap-0.5">
                          <User className="h-3 w-3" />

                          {
                            announcement.creator_name
                          }
                        </span>
                      )}

                      {announcement.branch_id &&
                        announcement.branch_name && (
                          <span className="flex items-center gap-0.5">
                            <Building2 className="h-3 w-3" />

                            {
                              announcement.branch_name
                            }
                          </span>
                        )}

                      {announcement.target_roles &&
                        announcement
                          .target_roles
                          .length > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Users className="h-3 w-3" />

                            {announcement.target_roles.join(
                              ', '
                            )}
                          </span>
                        )}

                      {announcement.start_date && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />

                          {dayjs(
                            announcement.start_date
                          ).format(
                            'DD MMM YYYY'
                          )}
                        </span>
                      )}

                      {announcement.announcement_id && (
                        <span className="font-mono text-[8px]">
                          #
                          {
                            announcement.announcement_id
                          }
                        </span>
                      )}
                    </div>
                  </div>

                  {announcement.priority ===
                    'urgent' &&
                    !expired && (
                      <div className="flex-shrink-0 animate-pulse">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      </div>
                    )}
                </div>
              );
            }
          )}
        </div>
      )}

      {/* FOOTER */}
      {announcements.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
          <button
            type="button"
            onClick={() =>
              navigate('/announcements')
            }
            className="flex items-center gap-1 text-xs text-blue-600 transition hover:text-blue-700 dark:text-blue-400"
          >
            View all announcements
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default Announcements;
