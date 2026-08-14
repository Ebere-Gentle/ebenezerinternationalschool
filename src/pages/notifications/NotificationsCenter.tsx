// src/pages/notifications/NotificationsCenter.tsx
// Full database integration with role-based notifications

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  CreditCard,
  FileCheck,
  ShieldCheck,
  Calendar,
  Trash2,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  MessageSquare,
  AlertTriangle,
  Info,
  Megaphone,
  User,
  Building2,
  Link as LinkIcon,
  ExternalLink,
  MoreVertical,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';

// Extend dayjs with relative time
dayjs.extend(relativeTime);

// ============================================================
// TYPES
// ============================================================

export type NotificationType = 'fee' | 'payment' | 'approval' | 'system' | 'message' | 'announcement' | 'alert' | 'reminder';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  link?: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    sender_name?: string;
    sender_role?: string;
    priority?: 'low' | 'medium' | 'high';
    action_url?: string;
    action_label?: string;
    reference_id?: string;
    reference_type?: string;
    icon?: string;
  };
}

interface NotificationStats {
  total: number;
  unread: number;
  today: number;
  thisWeek: number;
  byType: Record<NotificationType, number>;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'fee':
      return <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    case 'payment':
      return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />;
    case 'approval':
      return <FileCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case 'system':
      return <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    case 'message':
      return <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    case 'announcement':
      return <Megaphone className="w-4 h-4 text-pink-600 dark:text-pink-400" />;
    case 'alert':
      return <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />;
    case 'reminder':
      return <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
    default:
      return <Bell className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
  }
};

const getTypeLabel = (type: NotificationType): string => {
  const labels: Record<NotificationType, string> = {
    fee: 'Fee',
    payment: 'Payment',
    approval: 'Approval',
    system: 'System',
    message: 'Message',
    announcement: 'Announcement',
    alert: 'Alert',
    reminder: 'Reminder'
  };
  return labels[type] || type;
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const NotificationsCenter: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    today: 0,
    thisWeek: 0,
    byType: {} as Record<NotificationType, number>
  });
  const [userRole, setUserRole] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // ============================================================
  // FETCH NOTIFICATIONS
  // ============================================================

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Get user role first
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData) {
        setUserRole(userData.role || '');
      }

      // Fetch notifications for this user
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // If user has no notifications yet, we'll generate some
      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        setNotifications(data);
        calculateStats(data);
      } else {
        // Generate sample notifications for new users
        const sampleNotifs = generateSampleNotifications(user.id, userData?.role || 'student');
        await insertSampleNotifications(sampleNotifs);
        
        // Refetch
        const { data: newData } = await query;
        if (newData) {
          setNotifications(newData);
          calculateStats(newData);
        }
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ============================================================
  // GENERATE SAMPLE NOTIFICATIONS
  // ============================================================

  const generateSampleNotifications = (userId: string, role: string): Partial<NotificationItem>[] => {
    const now = new Date().toISOString();
    const samples: Partial<NotificationItem>[] = [];

    // Base notifications for all users
    samples.push({
      user_id: userId,
      title: '🎉 Welcome to Ebenezer International School',
      message: 'Welcome to the school portal. You can access fee payments, view announcements, and manage your profile.',
      type: 'system',
      is_read: false,
      created_at: now,
      metadata: {
        priority: 'high',
        sender_name: 'System Administrator',
        action_label: 'Get Started',
        action_url: '/dashboard',
      }
    });

    // Role-specific notifications
    if (role === 'student') {
      samples.push({
        user_id: userId,
        title: '📚 1st Term Fee Invoice Generated',
        message: 'Your tuition fee invoice for 1st Term 2025/2026 has been generated. Please complete payment by September 5, 2025.',
        type: 'fee',
        is_read: false,
        created_at: dayjs().subtract(2, 'hours').toISOString(),
        link: '/student/paybill',
        metadata: {
          priority: 'high',
          reference_type: 'invoice',
          action_label: 'Pay Now',
          action_url: '/student/paybill',
        }
      });

      samples.push({
        user_id: userId,
        title: '📢 Academic Calendar Update',
        message: 'Mid-term break scheduled for October 20-24, 2025. Check the academic calendar for more details.',
        type: 'announcement',
        is_read: false,
        created_at: dayjs().subtract(1, 'day').toISOString(),
        link: '/student/dashboard',
        metadata: {
          priority: 'medium',
          sender_name: 'Academic Office',
        }
      });
    }

    if (role === 'parent') {
      samples.push({
        user_id: userId,
        title: '👨‍👩‍👧‍👦 Parent-Teacher Conference Invitation',
        message: 'You are invited to the Parent-Teacher Conference on October 5, 2025 at 2:00 PM. Please confirm your attendance.',
        type: 'reminder',
        is_read: false,
        created_at: dayjs().subtract(1, 'day').toISOString(),
        link: '/parent/dashboard',
        metadata: {
          priority: 'high',
          sender_name: 'Academic Office',
          action_label: 'RSVP Now',
          action_url: '/parent/dashboard',
        }
      });

      samples.push({
        user_id: userId,
        title: '💰 Fee Payment Reminder',
        message: 'Reminder: 1st Term fee payment deadline is approaching. Please settle all outstanding fees by September 5, 2025.',
        type: 'fee',
        is_read: false,
        created_at: dayjs().subtract(3, 'days').toISOString(),
        link: '/parent/pay-bill',
        metadata: {
          priority: 'high',
          action_label: 'Pay Now',
          action_url: '/parent/pay-bill',
        }
      });
    }

    if (role === 'teacher') {
      samples.push({
        user_id: userId,
        title: '📝 Continuous Assessment Upload Reminder',
        message: 'Please ensure all continuous assessment scores for Grade 10-12 are uploaded by September 20, 2025.',
        type: 'reminder',
        is_read: false,
        created_at: dayjs().subtract(6, 'hours').toISOString(),
        link: '/teacher/grades',
        metadata: {
          priority: 'high',
          sender_name: 'Dean of Academics',
          action_label: 'Upload Scores',
          action_url: '/teacher/grades',
        }
      });
    }

    if (['admin', 'director', 'finance', 'super_admin'].includes(role)) {
      samples.push({
        user_id: userId,
        title: '📊 Payment Reconciliation Report Ready',
        message: 'The monthly payment reconciliation report for August 2025 is ready for review.',
        type: 'system',
        is_read: false,
        created_at: dayjs().subtract(1, 'day').toISOString(),
        link: '/reports',
        metadata: {
          priority: 'medium',
          sender_name: 'Finance Department',
          action_label: 'View Report',
          action_url: '/reports',
        }
      });

      samples.push({
        user_id: userId,
        title: '✅ New Payment Approval Required',
        message: 'A new bank transfer payment of ₦150,000 from Fatima Abubakar requires your approval.',
        type: 'approval',
        is_read: false,
        created_at: dayjs().subtract(30, 'minutes').toISOString(),
        link: '/payments',
        metadata: {
          priority: 'urgent',
          sender_name: 'Finance Department',
          reference_type: 'payment',
          action_label: 'Review',
          action_url: '/payments',
        }
      });
    }

    if (role === 'record_keeper' || role === 'admin_asst') {
      samples.push({
        user_id: userId,
        title: '📋 Student Record Update Required',
        message: 'Student records for the new session need to be updated. Please verify all student information.',
        type: 'system',
        is_read: false,
        created_at: dayjs().subtrib(2, 'hours').toISOString(),
        link: '/admin-asst/students',
        metadata: {
          priority: 'medium',
          sender_name: 'Administration',
          action_label: 'Update Records',
          action_url: '/admin-asst/students',
        }
      });
    }

    return samples;
  };

  const insertSampleNotifications = async (samples: Partial<NotificationItem>[]) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert(samples);

      if (error) {
        console.error('Error inserting sample notifications:', error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // ============================================================
  // CALCULATE STATS
  // ============================================================

  const calculateStats = (items: NotificationItem[]) => {
    const now = dayjs();
    const today = now.startOf('day');
    const weekStart = now.startOf('week');

    const byType: Record<NotificationType, number> = {
      fee: 0,
      payment: 0,
      approval: 0,
      system: 0,
      message: 0,
      announcement: 0,
      alert: 0,
      reminder: 0,
    };

    let unread = 0;
    let todayCount = 0;
    let weekCount = 0;

    items.forEach(n => {
      if (!n.is_read) unread++;
      
      const date = dayjs(n.created_at);
      if (date.isAfter(today)) todayCount++;
      if (date.isAfter(weekStart)) weekCount++;
      
      if (n.type in byType) {
        byType[n.type] = (byType[n.type] || 0) + 1;
      }
    });

    setStats({
      total: items.length,
      unread,
      today: todayCount,
      thisWeek: weekCount,
      byType,
    });
  };

  // ============================================================
  // ACTIONS
  // ============================================================

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      calculateStats(notifications.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const toggleRead = async (id: string) => {
    try {
      const notification = notifications.find(n => n.id === id);
      if (!notification) return;

      const newReadStatus = !notification.is_read;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: newReadStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: newReadStatus } : n))
      );
      calculateStats(notifications.map(n => n.id === id ? { ...n, is_read: newReadStatus } : n));
      
      toast.success(newReadStatus ? 'Marked as read' : 'Marked as unread');
    } catch (error: any) {
      console.error('Error toggling read status:', error);
      toast.error('Failed to update notification');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
      calculateStats(notifications.filter(n => n.id !== id));
      toast.success('Notification removed');
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    // Mark as read
    if (!notification.is_read) {
      toggleRead(notification.id);
    }

    // Navigate if link exists
    if (notification.link) {
      // Use window.location or react-router navigate based on your setup
      window.location.href = notification.link;
    } else if (notification.metadata?.action_url) {
      window.location.href = notification.metadata.action_url;
    }
  };

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('notifications_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as NotificationItem;
          setNotifications(prev => [newNotification, ...prev]);
          calculateStats([newNotification, ...notifications]);
          
          // Show toast for real-time notification
          toast(newNotification.title, {
            icon: '🔔',
            duration: 5000,
            position: 'top-right',
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, notifications]);

  // ============================================================
  // FILTER LOGIC
  // ============================================================

  const filteredNotifications = notifications.filter(n => {
    const matchesReadFilter = 
      filter === 'all' ? true :
      filter === 'unread' ? !n.is_read :
      filter === 'read' ? n.is_read : true;
    
    const matchesTypeFilter = typeFilter === 'all' || n.type === typeFilter;
    
    return matchesReadFilter && matchesTypeFilter;
  });

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500">Loading notifications...</span>
      </div>
    );
  }

  const unreadCount = stats.unread;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
            <Bell className="w-3.5 h-3.5" />
            <span>Real-time Alert Hub</span>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                {unreadCount} new
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Notifications Center</h1>
          <p className="text-blue-100 text-sm max-w-lg">
            Stay updated on fee bills, receipt approvals, announcements, and system events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-5 py-2.5 rounded-2xl bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 shadow-md flex items-center gap-2 transition-all"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all text-white"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800 text-center">
          <p className="text-xs text-blue-600">Unread</p>
          <p className="text-lg font-bold text-blue-700">{stats.unread}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800 text-center">
          <p className="text-xs text-green-600">Today</p>
          <p className="text-lg font-bold text-green-700">{stats.today}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 border border-purple-200 dark:border-purple-800 text-center">
          <p className="text-xs text-purple-600">This Week</p>
          <p className="text-lg font-bold text-purple-700">{stats.thisWeek}</p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-4 sm:p-6 shadow-sm space-y-3">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === 'read'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all"
          >
            <Filter className="w-3.5 h-3.5" />
            {showFilters ? 'Hide Types' : 'Filter by Type'}
          </button>
        </div>

        {/* Type Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5 pb-2">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    typeFilter === 'all'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  All Types
                </button>
                {(['fee', 'payment', 'approval', 'announcement', 'reminder', 'system', 'message', 'alert'] as NotificationType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all capitalize ${
                      typeFilter === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {getTypeLabel(type)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications List */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Bell className="w-10 h-10 mx-auto opacity-30 mb-2" />
              <p className="text-sm font-semibold">No notifications found</p>
              <p className="text-xs">Try adjusting your filters</p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`py-4 px-3 rounded-2xl transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  !item.is_read 
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border-l-4 border-l-blue-500' 
                    : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 flex-shrink-0 mt-0.5">
                    {getNotificationIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        {item.title}
                      </h4>
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                      )}
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                        {getTypeLabel(item.type)}
                      </span>
                      {item.metadata?.priority === 'urgent' && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-gray-400">
                        {dayjs(item.created_at).fromNow()}
                      </span>
                      {item.metadata?.sender_name && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <User className="w-2.5 h-2.5" />
                          {item.metadata.sender_name}
                        </span>
                      )}
                      {item.link && (
                        <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                          <LinkIcon className="w-2.5 h-2.5" />
                          View
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRead(item.id);
                    }}
                    className="p-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-all"
                    title={item.is_read ? 'Mark unread' : 'Mark read'}
                  >
                    {item.is_read ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(item.id);
                    }}
                    className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-600 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
            <span>
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsCenter;