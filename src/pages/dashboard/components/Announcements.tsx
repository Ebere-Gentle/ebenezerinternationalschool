// src/components/dashboard/Announcements.tsx
// Fully integrated with announcements table, real-time updates, and role-based filtering

import React, { useState, useEffect, useCallback } from 'react';
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
  Crown,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Wallet,
  CreditCard,
  Shield,
  Heart,
  Bus,
  ClipboardCheck,
  Pin,
  Star,
  Zap
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../config/supabase/client';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Extend dayjs with relative time
dayjs.extend(relativeTime);

interface Announcement {
  id: string;
  announcement_id: string;
  branch_id: string | null;
  title: string;
  content: string;
  category: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'normal';
  target_roles: string[];
  target_branches: string[] | null;
  start_date: string | null;
  end_date: string | null;
  is_published: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
  // Joined fields
  branch_name?: string;
  creator_name?: string;
}

const Announcements: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [userBranchId, setUserBranchId] = useState<string | null>(null);

  // Get user role and branch
  useEffect(() => {
    const getUserData = async () => {
      if (!user?.id) return;

      try {
        let role = user?.role || 'student';
        let branchId = user?.branch_id || null;

        // If branch_id not in user object, fetch from users table
        if (!branchId) {
          const { data: userData } = await supabase
            .from('users')
            .select('branch_id, role')
            .eq('id', user.id)
            .single();

          if (userData) {
            branchId = userData.branch_id;
            if (userData.role) role = userData.role;
          }
        }

        setUserRole(role);
        setUserBranchId(branchId);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    getUserData();
  }, [user]);

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(5);

      // Filter by branch if user has one
      if (userBranchId) {
        query = query.or(`branch_id.eq.${userBranchId},branch_id.is.null`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        // Filter by user role
        const filteredData = data.filter(ann => {
          // If no target roles specified, show to everyone
          if (!ann.target_roles || ann.target_roles.length === 0) return true;
          // Check if user's role is in target_roles
          return ann.target_roles.includes(userRole);
        });

        // Get creator names
        const announcementsWithDetails = await Promise.all(
          filteredData.map(async (ann) => {
            let creatorName: string | undefined;

            if (ann.created_by) {
              const { data: creatorData } = await supabase
                .from('users')
                .select('first_name, last_name')
                .eq('id', ann.created_by)
                .single();

              if (creatorData) {
                creatorName = `${creatorData.first_name || ''} ${creatorData.last_name || ''}`.trim();
              }
            }

            return {
              ...ann,
              creator_name: creatorName || 'System',
            };
          })
        );

        setAnnouncements(announcementsWithDetails);
      } else {
        setAnnouncements([]);
      }
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      setError(error.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [user?.id, userRole, userBranchId]);

  // Refresh announcements
  const refreshAnnouncements = async () => {
    setRefreshing(true);
    await fetchAnnouncements();
    setRefreshing(false);
    toast.success('Announcements refreshed!');
  };

  // Initial fetch
  useEffect(() => {
    if (user?.id && userRole) {
      fetchAnnouncements();
    }
  }, [user?.id, userRole, fetchAnnouncements]);

  // Real-time subscription for new announcements
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('announcements_dashboard_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
          filter: `is_published=eq.true`
        },
        (payload) => {
          const newAnnouncement = payload.new as Announcement;
          
          // Check if this announcement is for the current user
          const targetRoles = newAnnouncement.target_roles || [];
          const isForUser = targetRoles.length === 0 || targetRoles.includes(userRole);
          
          // Check branch
          const isForBranch = !newAnnouncement.branch_id || newAnnouncement.branch_id === userBranchId;

          if (isForUser && isForBranch) {
            setAnnouncements(prev => {
              // Avoid duplicates
              if (prev.some(a => a.id === newAnnouncement.id)) return prev;
              return [{
                ...newAnnouncement,
                creator_name: 'System'
              }, ...prev].slice(0, 5);
            });

            // Show toast notification
            toast(newAnnouncement.title, {
              icon: '📢',
              duration: 5000,
              position: 'top-right',
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, userRole, userBranchId]);

  // Get priority styling
  const getPriorityStyles = (priority: string) => {
    const styles = {
      urgent: {
        border: 'border-red-400',
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-700 dark:text-red-300',
        icon: AlertTriangle,
        label: 'URGENT',
        dot: 'bg-red-500'
      },
      high: {
        border: 'border-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-700 dark:text-orange-300',
        icon: AlertCircle,
        label: 'HIGH',
        dot: 'bg-orange-500'
      },
      medium: {
        border: 'border-yellow-400',
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        text: 'text-yellow-700 dark:text-yellow-300',
        icon: Bell,
        label: 'MEDIUM',
        dot: 'bg-yellow-500'
      },
      low: {
        border: 'border-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-300',
        icon: Info,
        label: 'LOW',
        dot: 'bg-blue-500'
      },
      normal: {
        border: 'border-gray-400',
        bg: 'bg-gray-50 dark:bg-gray-700/30',
        text: 'text-gray-700 dark:text-gray-300',
        icon: Info,
        label: 'NORMAL',
        dot: 'bg-gray-500'
      }
    };
    return styles[priority as keyof typeof styles] || styles.normal;
  };

  // Get category icon
  const getCategoryIcon = (category: string | null) => {
    const icons: Record<string, any> = {
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
    const Icon = icons[category || ''] || Megaphone;
    return Icon;
  };

  // Check if announcement is expired
  const isExpired = (announcement: Announcement): boolean => {
    if (!announcement.end_date) return false;
    return dayjs(announcement.end_date).isBefore(dayjs());
  };

  // Format date
  const formatDate = (date: string) => {
    return dayjs(date).fromNow();
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-gray-500">Loading announcements...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-2">
            <Megaphone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Announcements</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {announcements.length} active announcement{announcements.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshAnnouncements}
            disabled={refreshing}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1">
            View all <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="py-8 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No announcements</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Check back later for updates</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => {
            const priorityStyle = getPriorityStyles(announcement.priority);
            const PriorityIcon = priorityStyle.icon;
            const CategoryIcon = getCategoryIcon(announcement.category);
            const expired = isExpired(announcement);

            return (
              <div
                key={announcement.id}
                className={`flex items-start gap-3 rounded-xl border-l-4 p-3 transition-all hover:shadow-md ${
                  expired ? 'opacity-60' : ''
                } ${priorityStyle.border} ${priorityStyle.bg}`}
              >
                <div className="rounded-lg bg-white/50 p-1.5 dark:bg-white/10">
                  <CategoryIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {announcement.title}
                    </h4>
                    {!expired && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${priorityStyle.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${priorityStyle.dot}`} />
                        {priorityStyle.label}
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
                        {announcement.category}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {announcement.content}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {formatDate(announcement.created_at)}
                    </span>
                    {announcement.creator_name && (
                      <span className="flex items-center gap-0.5">
                        <User className="h-3 w-3" />
                        {announcement.creator_name}
                      </span>
                    )}
                    {announcement.branch_id && announcement.branch_name && (
                      <span className="flex items-center gap-0.5">
                        <Building2 className="h-3 w-3" />
                        {announcement.branch_name}
                      </span>
                    )}
                    {announcement.target_roles && announcement.target_roles.length > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Users className="h-3 w-3" />
                        {announcement.target_roles.join(', ')}
                      </span>
                    )}
                    {announcement.announcement_id && (
                      <span className="font-mono text-[8px]">
                        #{announcement.announcement_id}
                      </span>
                    )}
                  </div>
                </div>
                {announcement.priority === 'urgent' && !expired && (
                  <div className="flex-shrink-0 animate-pulse">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {announcements.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
          <button className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1">
            View all announcements
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default Announcements;