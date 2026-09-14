
// src/pages/announcements/AnnouncementsPage.tsx
// Fully integrated with the announcements table schema.
// Uses is_published (NOT is_active).

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  Plus,
  Search,
  Pin,
  Calendar,
  Users,
  Bell,
  CheckCircle2,
  Trash2,
  Edit,
  Send,
  Eye,
  AlertCircle,
  X,
  Loader2,
  Clock,
  User,
  Building2,
  Tag,
  RefreshCw,
  AlertTriangle,
  Shield,
  Globe,
  Users as UsersIcon,
  GraduationCap,
  Briefcase,
  Link,
} from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';

// ============================================================
// TYPES
// ============================================================

export type UserRole =
  | 'admin'
  | 'super_admin'
  | 'director'
  | 'finance'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'record_keeper'
  | 'admin_asst';

export interface Announcement {
  id: string;
  announcement_id: string;
  branch_id: string | null;
  title: string;
  content: string;
  category: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'normal';
  target_roles: UserRole[] | null;
  target_branches: string[] | null;
  start_date: string | null;
  end_date: string | null;
  is_published: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;

  // Joined/display fields
  branch_name?: string;
  creator_name?: string;
}

interface AnnouncementStats {
  total: number;
  published: number;
  drafts: number;
  expired: number;
  urgent: number;
}

// ============================================================
// CONSTANTS
// ============================================================

const ADMIN_ROLES: UserRole[] = [
  'admin',
  'super_admin',
  'director',
  'finance',
  'record_keeper',
  'admin_asst',
];

const AUDIENCE_ROLES: UserRole[] = [
  'student',
  'parent',
  'teacher',
  'admin',
  'director',
  'finance',
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const generateAnnouncementId = (): string => {
  const prefix = 'ANN';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${prefix}-${timestamp}-${random}`;
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';

    case 'high':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';

    case 'medium':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';

    case 'low':
      return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400';

    default:
      return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400';
  }
};

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <AlertCircle className="w-3.5 h-3.5" />;

    case 'high':
      return <AlertTriangle className="w-3.5 h-3.5" />;

    case 'medium':
      return <Clock className="w-3.5 h-3.5" />;

    default:
      return <Bell className="w-3.5 h-3.5" />;
  }
};

const getAudienceLabel = (roles: UserRole[] | null): string => {
  if (!roles || roles.length === 0) {
    return 'Everyone';
  }

  if (roles.includes('admin') || roles.includes('super_admin')) {
    return 'Administrators';
  }

  if (roles.includes('director')) {
    return 'Directors';
  }

  if (roles.includes('finance')) {
    return 'Finance Team';
  }

  if (roles.includes('teacher')) {
    return 'Teachers';
  }

  if (roles.includes('student')) {
    return 'Students';
  }

  if (roles.includes('parent')) {
    return 'Parents';
  }

  if (
    roles.includes('record_keeper') ||
    roles.includes('admin_asst')
  ) {
    return 'Admin Staff';
  }

  return roles
    .map(role => role.charAt(0).toUpperCase() + role.slice(1))
    .join(', ');
};

const getAudienceIcon = (roles: UserRole[] | null) => {
  if (!roles || roles.length === 0) {
    return <Globe className="w-3.5 h-3.5" />;
  }

  if (roles.includes('student')) {
    return <GraduationCap className="w-3.5 h-3.5" />;
  }

  if (roles.includes('parent')) {
    return <UsersIcon className="w-3.5 h-3.5" />;
  }

  if (roles.includes('teacher')) {
    return <Briefcase className="w-3.5 h-3.5" />;
  }

  if (
    roles.includes('admin') ||
    roles.includes('super_admin')
  ) {
    return <Shield className="w-3.5 h-3.5" />;
  }

  return <Users className="w-3.5 h-3.5" />;
};

const isAnnouncementExpired = (
  announcement: Announcement
): boolean => {
  if (!announcement.end_date) {
    return false;
  }

  return dayjs(announcement.end_date).isBefore(dayjs());
};

const isAnnouncementActive = (
  announcement: Announcement
): boolean => {
  if (!announcement.is_published) {
    return false;
  }

  if (isAnnouncementExpired(announcement)) {
    return false;
  }

  if (
    announcement.start_date &&
    dayjs(announcement.start_date).isAfter(dayjs())
  ) {
    return false;
  }

  return true;
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const AnnouncementsPage: React.FC = () => {
  const { user } = useAuth();

  // ============================================================
  // STATE
  // ============================================================

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAudience, setFilterAudience] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const [filterStatus, setFilterStatus] = useState<
    'all' | 'published' | 'draft' | 'expired'
  >('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);

  const [stats, setStats] = useState<AnnouncementStats>({
    total: 0,
    published: 0,
    drafts: 0,
    expired: 0,
    urgent: 0,
  });

  const [userRole, setUserRole] =
    useState<UserRole>('student');

  const [userBranchId, setUserBranchId] =
    useState<string | null>(null);

  const [isAdminOrStaff, setIsAdminOrStaff] =
    useState(false);

  // ============================================================
  // FORM STATE
  // ============================================================

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('');

  const [formPriority, setFormPriority] = useState<
    'low' | 'medium' | 'high' | 'urgent'
  >('medium');

  const [formTargetRoles, setFormTargetRoles] =
    useState<UserRole[]>([]);

  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  const [formIsPublished, setFormIsPublished] =
    useState(true);

  const [formSubmitting, setFormSubmitting] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  // ============================================================
  // FETCH USER DATA
  // ============================================================

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) {
        return;
      }

      try {
        let role: UserRole = 'student';
        let branchId: string | null = null;

        if (user.role) {
          role = user.role as UserRole;
        }

        const { data: userData, error: userError } =
          await supabase
            .from('users')
            .select('role, branch_id')
            .eq('id', user.id)
            .single();

        if (!userError && userData) {
          if (userData.role) {
            role = userData.role as UserRole;
          }

          if (userData.branch_id) {
            branchId = userData.branch_id;
          }
        }

        setUserRole(role);
        setUserBranchId(branchId);
        setIsAdminOrStaff(
          ADMIN_ROLES.includes(role)
        );
      } catch (error) {
        console.error(
          'Error fetching user data:',
          error
        );
      }
    };

    fetchUserData();
  }, [user]);

  // ============================================================
  // FETCH ANNOUNCEMENTS
  // ============================================================

  const fetchAnnouncements = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setLoading(true);

    try {
      let query = supabase
        .from('announcements')
        .select('*')
        .order('created_at', {
          ascending: false,
        });

      // --------------------------------------------------------
      // BRANCH FILTER
      // --------------------------------------------------------

      if (userBranchId) {
        query = query.or(
          `branch_id.eq.${userBranchId},branch_id.is.null`
        );
      }

      // --------------------------------------------------------
      // PUBLISHED FILTER
      // IMPORTANT:
      // announcements table uses is_published.
      // There is NO is_active column.
      // --------------------------------------------------------

      if (!isAdminOrStaff) {
        query = query.eq('is_published', true);
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        throw error;
      }

      let filteredData =
        (data || []) as Announcement[];

      // --------------------------------------------------------
      // ROLE FILTER FOR NON-STAFF USERS
      // --------------------------------------------------------

      if (!isAdminOrStaff) {
        filteredData = filteredData.filter(
          announcement => {
            if (
              !announcement.target_roles ||
              announcement.target_roles.length === 0
            ) {
              return true;
            }

            return announcement.target_roles.includes(
              userRole
            );
          }
        );

        // Respect start/end dates for normal users.
        filteredData = filteredData.filter(
          announcement =>
            isAnnouncementActive(announcement)
        );
      }

      // --------------------------------------------------------
      // LOAD BRANCH NAMES IN ONE QUERY
      // --------------------------------------------------------

      const branchIds = Array.from(
        new Set(
          filteredData
            .map(item => item.branch_id)
            .filter(
              (id): id is string => Boolean(id)
            )
        )
      );

      const branchMap =
        new Map<string, string>();

      if (branchIds.length > 0) {
        const {
          data: branches,
          error: branchesError,
        } = await supabase
          .from('branches')
          .select('id, name')
          .in('id', branchIds);

        if (!branchesError && branches) {
          branches.forEach(branch => {
            branchMap.set(
              branch.id,
              branch.name
            );
          });
        }
      }

      // --------------------------------------------------------
      // LOAD CREATOR NAMES IN ONE QUERY
      // --------------------------------------------------------

      const creatorIds = Array.from(
        new Set(
          filteredData
            .map(item => item.created_by)
            .filter(
              (id): id is string => Boolean(id)
            )
        )
      );

      const creatorMap =
        new Map<string, string>();

      if (creatorIds.length > 0) {
        const {
          data: creators,
          error: creatorsError,
        } = await supabase
          .from('users')
          .select(
            'id, first_name, last_name'
          )
          .in('id', creatorIds);

        if (!creatorsError && creators) {
          creators.forEach(creator => {
            const name =
              `${creator.first_name || ''} ${creator.last_name || ''}`
                .trim();

            if (name) {
              creatorMap.set(
                creator.id,
                name
              );
            }
          });
        }
      }

      // --------------------------------------------------------
      // ADD DISPLAY INFORMATION
      // --------------------------------------------------------

      const announcementsWithDetails =
        filteredData.map(announcement => ({
          ...announcement,
          branch_name: announcement.branch_id
            ? branchMap.get(
                announcement.branch_id
              )
            : undefined,
          creator_name: announcement.created_by
            ? creatorMap.get(
                announcement.created_by
              )
            : undefined,
        }));

      setAnnouncements(
        announcementsWithDetails
      );

      // --------------------------------------------------------
      // CALCULATE STATS
      // --------------------------------------------------------

      const total =
        announcementsWithDetails.length;

      const published =
        announcementsWithDetails.filter(
          announcement =>
            announcement.is_published
        ).length;

      const drafts =
        announcementsWithDetails.filter(
          announcement =>
            !announcement.is_published
        ).length;

      const expired =
        announcementsWithDetails.filter(
          announcement =>
            isAnnouncementExpired(
              announcement
            )
        ).length;

      const urgent =
        announcementsWithDetails.filter(
          announcement =>
            announcement.priority === 'urgent'
        ).length;

      setStats({
        total,
        published,
        drafts,
        expired,
        urgent,
      });
    } catch (error: any) {
      console.error(
        'Error fetching announcements:',
        error
      );

      toast.error(
        error?.message ||
          'Failed to load announcements'
      );

      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [
    user?.id,
    userBranchId,
    isAdminOrStaff,
    userRole,
  ]);

  useEffect(() => {
    if (user?.id) {
      fetchAnnouncements();
    }
  }, [
    user?.id,
    fetchAnnouncements,
  ]);

  // ============================================================
  // CREATE / UPDATE ANNOUNCEMENT
  // ============================================================

  const handleSaveAnnouncement = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !formTitle.trim() ||
      !formContent.trim()
    ) {
      toast.error(
        'Please enter announcement title and content'
      );
      return;
    }

    if (!user?.id) {
      toast.error(
        'You must be logged in to save an announcement'
      );
      return;
    }

    setFormSubmitting(true);

    try {
      const now =
        new Date().toISOString();

      if (editingId) {
        // ------------------------------------------------------
        // UPDATE
        // ------------------------------------------------------

        const announcementData = {
          branch_id: userBranchId,
          title: formTitle.trim(),
          content: formContent.trim(),
          category:
            formCategory.trim() || null,
          priority: formPriority,
          target_roles:
            formTargetRoles.length > 0
              ? formTargetRoles
              : null,
          start_date:
            formStartDate || null,
          end_date:
            formEndDate || null,
          is_published:
            formIsPublished,
          published_at:
            formIsPublished
              ? now
              : null,
          updated_at: now,
          metadata: {
            updated_from: 'web_portal',
            user_agent:
              navigator.userAgent,
          },
        };

        const { error } =
          await supabase
            .from('announcements')
            .update(
              announcementData
            )
            .eq('id', editingId);

        if (error) {
          throw error;
        }

        toast.success(
          'Announcement updated successfully!'
        );
      } else {
        // ------------------------------------------------------
        // CREATE
        // ------------------------------------------------------

        const announcementData = {
          announcement_id:
            generateAnnouncementId(),
          branch_id: userBranchId,
          title: formTitle.trim(),
          content: formContent.trim(),
          category:
            formCategory.trim() || null,
          priority: formPriority,
          target_roles:
            formTargetRoles.length > 0
              ? formTargetRoles
              : null,
          start_date:
            formStartDate || null,
          end_date:
            formEndDate || null,
          is_published:
            formIsPublished,
          published_at:
            formIsPublished
              ? now
              : null,
          created_by: user.id,
          created_at: now,
          updated_at: now,
          metadata: {
            created_from: 'web_portal',
            user_agent:
              navigator.userAgent,
          },
        };

        const { error } =
          await supabase
            .from('announcements')
            .insert([
              announcementData,
            ]);

        if (error) {
          throw error;
        }

        toast.success(
          formIsPublished
            ? 'Announcement created and published successfully!'
            : 'Announcement saved as draft!'
        );
      }

      resetForm();
      setShowCreateModal(false);

      await fetchAnnouncements();
    } catch (error: any) {
      console.error(
        'Error saving announcement:',
        error
      );

      toast.error(
        error?.message ||
          'Failed to save announcement'
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  // ============================================================
  // RESET FORM
  // ============================================================

  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormCategory('');
    setFormPriority('medium');
    setFormTargetRoles([]);
    setFormStartDate('');
    setFormEndDate('');
    setFormIsPublished(true);
    setEditingId(null);
  };

  // ============================================================
  // EDIT
  // ============================================================

  const handleEdit = (
    announcement: Announcement
  ) => {
    setEditingId(announcement.id);

    setFormTitle(
      announcement.title
    );

    setFormContent(
      announcement.content
    );

    setFormCategory(
      announcement.category || ''
    );

    setFormPriority(
      announcement.priority === 'normal'
        ? 'medium'
        : announcement.priority
    );

    setFormTargetRoles(
      announcement.target_roles || []
    );

    setFormStartDate(
      announcement.start_date
        ? dayjs(
            announcement.start_date
          ).format(
            'YYYY-MM-DDTHH:mm'
          )
        : ''
    );

    setFormEndDate(
      announcement.end_date
        ? dayjs(
            announcement.end_date
          ).format(
            'YYYY-MM-DDTHH:mm'
          )
        : ''
    );

    setFormIsPublished(
      announcement.is_published
    );

    setShowCreateModal(true);
  };

  // ============================================================
  // PUBLISH / UNPUBLISH
  // ============================================================

  const handleTogglePublish = async (
    id: string,
    currentStatus: boolean
  ) => {
    try {
      const now =
        new Date().toISOString();

      const { error } =
        await supabase
          .from('announcements')
          .update({
            is_published:
              !currentStatus,
            published_at:
              !currentStatus
                ? now
                : null,
            updated_at: now,
          })
          .eq('id', id);

      if (error) {
        throw error;
      }

      toast.success(
        !currentStatus
          ? 'Announcement published!'
          : 'Announcement unpublished.'
      );

      await fetchAnnouncements();
    } catch (error: any) {
      console.error(
        'Error toggling publish:',
        error
      );

      toast.error(
        error?.message ||
          'Failed to update announcement'
      );
    }
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async (
    id: string
  ) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this announcement?'
      )
    ) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from('announcements')
          .delete()
          .eq('id', id);

      if (error) {
        throw error;
      }

      toast.success(
        'Announcement deleted successfully'
      );

      await fetchAnnouncements();
    } catch (error: any) {
      console.error(
        'Error deleting announcement:',
        error
      );

      toast.error(
        error?.message ||
          'Failed to delete announcement'
      );
    }
  };

  // ============================================================
  // FILTER LOGIC
  // ============================================================

  const filteredAnnouncements =
    announcements.filter(announcement => {
      const query =
        searchQuery.toLowerCase();

      const matchesSearch =
        announcement.title
          .toLowerCase()
          .includes(query) ||
        announcement.content
          .toLowerCase()
          .includes(query) ||
        announcement.announcement_id
          ?.toLowerCase()
          .includes(query) ||
        announcement.category
          ?.toLowerCase()
          .includes(query);

      const matchesPriority =
        filterPriority === 'all' ||
        announcement.priority ===
          filterPriority;

      const matchesAudience =
        filterAudience === 'all' ||
        (
          announcement.target_roles &&
          announcement.target_roles.includes(
            filterAudience as UserRole
          )
        );

      const matchesStatus =
        filterStatus === 'all' ||
        (
          filterStatus === 'published' &&
          announcement.is_published
        ) ||
        (
          filterStatus === 'draft' &&
          !announcement.is_published
        ) ||
        (
          filterStatus === 'expired' &&
          isAnnouncementExpired(
            announcement
          )
        );

      return (
        matchesSearch &&
        matchesPriority &&
        matchesAudience &&
        matchesStatus
      );
    });

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />

        <span className="ml-3 text-gray-500">
          Loading announcements...
        </span>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold">
            <Megaphone className="w-3.5 h-3.5" />

            <span>
              School Broadcast & Circulars
            </span>

            {!isAdminOrStaff && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-[10px]">
                {userRole
                  .charAt(0)
                  .toUpperCase() +
                  userRole.slice(1)}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Announcements & Circulars
          </h1>

          <p className="text-blue-100 text-sm max-w-xl">
            Official communications, academic
            calendar updates, and fee notices
          </p>
        </div>

        {isAdminOrStaff && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-5 py-3 rounded-2xl bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 shadow-lg transition-all flex items-center justify-center gap-2 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>
              New Announcement
            </span>
          </button>
        )}
      </div>

      {/* ======================================================
          STATS
      ====================================================== */}

      {isAdminOrStaff && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">

          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-500">
              Total
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {stats.total}
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800 text-center">
            <p className="text-xs text-green-600">
              Published
            </p>
            <p className="text-lg font-bold text-green-700">
              {stats.published}
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 border border-yellow-200 dark:border-yellow-800 text-center">
            <p className="text-xs text-yellow-600">
              Drafts
            </p>
            <p className="text-lg font-bold text-yellow-700">
              {stats.drafts}
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-200 dark:border-red-800 text-center">
            <p className="text-xs text-red-600">
              Expired
            </p>
            <p className="text-lg font-bold text-red-700">
              {stats.expired}
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 border border-purple-200 dark:border-purple-800 text-center">
            <p className="text-xs text-purple-600">
              Urgent
            </p>
            <p className="text-lg font-bold text-purple-700">
              {stats.urgent}
            </p>
          </div>

        </div>
      )}

      {/* ======================================================
          SEARCH / FILTERS
      ====================================================== */}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={e =>
              setSearchQuery(
                e.target.value
              )
            }
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">

          {isAdminOrStaff && (
            <select
              value={filterStatus}
              onChange={e =>
                setFilterStatus(
                  e.target.value as
                    | 'all'
                    | 'published'
                    | 'draft'
                    | 'expired'
                )
              }
              className="px-3 py-1.5 text-xs font-medium rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              <option value="all">
                All Status
              </option>

              <option value="published">
                Published
              </option>

              <option value="draft">
                Drafts
              </option>

              <option value="expired">
                Expired
              </option>
            </select>
          )}

          <select
            value={filterPriority}
            onChange={e =>
              setFilterPriority(
                e.target.value
              )
            }
            className="px-3 py-1.5 text-xs font-medium rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            <option value="all">
              All Priorities
            </option>

            <option value="urgent">
              Urgent
            </option>

            <option value="high">
              High
            </option>

            <option value="medium">
              Medium
            </option>

            <option value="low">
              Low
            </option>
          </select>

          <select
            value={filterAudience}
            onChange={e =>
              setFilterAudience(
                e.target.value
              )
            }
            className="px-3 py-1.5 text-xs font-medium rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            <option value="all">
              All Audiences
            </option>

            <option value="student">
              Students
            </option>

            <option value="parent">
              Parents
            </option>

            <option value="teacher">
              Teachers
            </option>

            <option value="admin">
              Admin
            </option>

            <option value="director">
              Directors
            </option>

            <option value="finance">
              Finance
            </option>
          </select>

          <button
            onClick={() =>
              fetchAnnouncements()
            }
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>

        </div>
      </div>

      {/* ======================================================
          ANNOUNCEMENTS
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {filteredAnnouncements.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800">

            <Megaphone className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />

            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              No Announcements Found
            </h3>

            <p className="text-xs text-gray-500 mt-1">
              Try modifying your search or
              filters
            </p>

          </div>
        ) : (
          filteredAnnouncements.map(
            item => {
              const isExpired =
                isAnnouncementExpired(
                  item
                );

              const isActive =
                isAnnouncementActive(
                  item
                );

              const isDraft =
                !item.is_published;

              return (
                <motion.div
                  key={item.id}
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className={`bg-white dark:bg-gray-900 rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group ${
                    isExpired
                      ? 'border-gray-300 dark:border-gray-700 opacity-70'
                      : isDraft
                      ? 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/30 dark:bg-yellow-950/10'
                      : item.priority ===
                        'urgent'
                      ? 'border-red-300 dark:border-red-800 bg-red-50/20 dark:bg-red-950/10'
                      : item.priority ===
                        'high'
                      ? 'border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10'
                      : 'border-gray-200/80 dark:border-gray-800'
                  }`}
                >

                  <div>

                    <div className="flex items-start justify-between gap-3 mb-2">

                      <div className="flex items-center gap-2 flex-wrap">

                        {isExpired && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            <Clock className="w-3 h-3" />
                            EXPIRED
                          </span>
                        )}

                        {isDraft && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-200 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                            <Edit className="w-3 h-3" />
                            DRAFT
                          </span>
                        )}

                        {!isDraft &&
                          !isExpired && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              <CheckCircle2 className="w-3 h-3" />
                              {isActive
                                ? 'PUBLISHED'
                                : 'SCHEDULED'}
                            </span>
                          )}

                        {item.priority &&
                          item.priority !==
                            'normal' && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getPriorityBadge(
                                item.priority
                              )}`}
                            >
                              {getPriorityIcon(
                                item.priority
                              )}
                              {
                                item.priority
                              }
                            </span>
                          )}

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          {getAudienceIcon(
                            item.target_roles
                          )}

                          {getAudienceLabel(
                            item.target_roles
                          )}
                        </span>

                        {item.category && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Tag className="w-3 h-3" />
                            {item.category}
                          </span>
                        )}

                      </div>

                      {isAdminOrStaff && (
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">

                          <button
                            onClick={() =>
                              handleTogglePublish(
                                item.id,
                                item.is_published
                              )
                            }
                            className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                              item.is_published
                                ? 'text-green-600'
                                : 'text-gray-400'
                            }`}
                            title={
                              item.is_published
                                ? 'Unpublish'
                                : 'Publish'
                            }
                          >
                            {item.is_published ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() =>
                              handleEdit(
                                item
                              )
                            }
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(
                                item.id
                              )
                            }
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      )}

                    </div>

                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed mb-4">
                      {item.content}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500 mb-3">

                      {item.branch_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {item.branch_name}
                        </span>
                      )}

                      {item.creator_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {
                            item.creator_name
                          }
                        </span>
                      )}

                      {item.announcement_id && (
                        <span className="font-mono text-[10px]">
                          #
                          {
                            item.announcement_id
                          }
                        </span>
                      )}

                    </div>

                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">

                    <div className="flex items-center gap-2">

                      <Calendar className="w-3.5 h-3.5" />

                      <span>
                        {dayjs(
                          item.created_at
                        ).format(
                          'MMM D, YYYY'
                        )}
                      </span>

                      {item.end_date && (
                        <>
                          <span className="text-gray-300">
                            •
                          </span>

                          <span
                            className={
                              isExpired
                                ? 'text-red-500'
                                : ''
                            }
                          >
                            Expires:{' '}
                            {dayjs(
                              item.end_date
                            ).format(
                              'MMM D'
                            )}
                          </span>
                        </>
                      )}

                    </div>

                    <button
                      onClick={() =>
                        setSelectedAnnouncement(
                          item
                        )
                      }
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Read More
                    </button>

                  </div>

                </motion.div>
              );
            }
          )
        )}

      </div>

      {/* ======================================================
          CREATE / EDIT MODAL
      ====================================================== */}

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">

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
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >

              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">

                <div className="flex items-center gap-2.5">

                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
                    <Megaphone className="w-5 h-5" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {editingId
                        ? 'Edit Announcement'
                        : 'Publish Announcement'}
                    </h3>

                    <p className="text-xs text-gray-500">
                      {editingId
                        ? 'Update existing announcement'
                        : 'Create a new school announcement'}
                    </p>
                  </div>

                </div>

                <button
                  onClick={() => {
                    setShowCreateModal(
                      false
                    );
                    resetForm();
                  }}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>

              </div>

              <form
                onSubmit={
                  handleSaveAnnouncement
                }
                className="py-4 space-y-4 text-sm"
              >

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Announcement Title *
                  </label>

                  <input
                    type="text"
                    required
                    placeholder="e.g. 1st Term 2025/2026 Resumption & Fee Deadline"
                    value={formTitle}
                    onChange={e =>
                      setFormTitle(
                        e.target.value
                      )
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Message Content *
                  </label>

                  <textarea
                    rows={4}
                    required
                    placeholder="Enter detailed notice, instructions, or deadlines..."
                    value={formContent}
                    onChange={e =>
                      setFormContent(
                        e.target.value
                      )
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>

                    <input
                      type="text"
                      placeholder="e.g. Academic, Fees, Sports"
                      value={formCategory}
                      onChange={e =>
                        setFormCategory(
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>

                    <select
                      value={
                        formPriority
                      }
                      onChange={e =>
                        setFormPriority(
                          e.target.value as
                            | 'low'
                            | 'medium'
                            | 'high'
                            | 'urgent'
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
                    >
                      <option value="low">
                        Low
                      </option>

                      <option value="medium">
                        Medium
                      </option>

                      <option value="high">
                        High
                      </option>

                      <option value="urgent">
                        Urgent
                      </option>
                    </select>
                  </div>

                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Target Audiences
                  </label>

                  <div className="flex flex-wrap gap-2">

                    {AUDIENCE_ROLES.map(
                      role => {
                        const isSelected =
                          formTargetRoles.includes(
                            role
                          );

                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              setFormTargetRoles(
                                previous =>
                                  isSelected
                                    ? previous.filter(
                                        item =>
                                          item !==
                                          role
                                      )
                                    : [
                                        ...previous,
                                        role,
                                      ]
                              );
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            {role
                              .charAt(
                                0
                              )
                              .toUpperCase() +
                              role.slice(
                                1
                              )}
                          </button>
                        );
                      }
                    )}

                    {formTargetRoles.length ===
                      0 && (
                      <span className="text-xs text-gray-400 italic">
                        Everyone (no
                        audience
                        restriction)
                      </span>
                    )}

                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Start Date
                      (Optional)
                    </label>

                    <input
                      type="datetime-local"
                      value={
                        formStartDate
                      }
                      onChange={e =>
                        setFormStartDate(
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      End Date / Expiry
                      (Optional)
                    </label>

                    <input
                      type="datetime-local"
                      value={
                        formEndDate
                      }
                      onChange={e =>
                        setFormEndDate(
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>

                </div>

                <div className="flex items-center gap-3 pt-1">

                  <label className="flex items-center gap-2 cursor-pointer">

                    <input
                      type="checkbox"
                      checked={
                        formIsPublished
                      }
                      onChange={e =>
                        setFormIsPublished(
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                    />

                    <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                      Publish immediately
                    </span>

                  </label>

                  {!formIsPublished && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Saved as draft
                    </span>
                  )}

                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">

                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(
                        false
                      );
                      resetForm();
                    }}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 text-xs"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      formSubmitting
                    }
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {formSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}

                    <span>
                      {editingId
                        ? 'Update'
                        : formIsPublished
                        ? 'Publish'
                        : 'Save Draft'}
                    </span>
                  </button>

                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================
          READ DETAIL MODAL
      ====================================================== */}

      <AnimatePresence>
        {selectedAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">

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
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >

              <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">

                <div>

                  <div className="flex items-center gap-2 mb-2 flex-wrap">

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getPriorityBadge(
                        selectedAnnouncement.priority
                      )}`}
                    >
                      {getPriorityIcon(
                        selectedAnnouncement.priority
                      )}

                      {
                        selectedAnnouncement.priority
                      }{' '}
                      Priority
                    </span>

                    <span className="text-xs text-gray-500">
                      Audience:{' '}
                      <strong className="text-gray-900 dark:text-white capitalize">
                        {getAudienceLabel(
                          selectedAnnouncement.target_roles
                        )}
                      </strong>
                    </span>

                    {selectedAnnouncement.category && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                        #
                        {
                          selectedAnnouncement.category
                        }
                      </span>
                    )}

                    {selectedAnnouncement.branch_name && (
                      <span className="text-xs text-gray-500">
                        <Building2 className="w-3 h-3 inline mr-1" />
                        {
                          selectedAnnouncement.branch_name
                        }
                      </span>
                    )}

                  </div>

                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {
                      selectedAnnouncement.title
                    }
                  </h2>

                </div>

                <button
                  onClick={() =>
                    setSelectedAnnouncement(
                      null
                    )
                  }
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>

              </div>

              <div className="py-6 text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                {
                  selectedAnnouncement.content
                }
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">

                <div>

                  <p>
                    Published by:{' '}
                    <strong className="text-gray-900 dark:text-white">
                      {
                        selectedAnnouncement.creator_name ||
                        'System'
                      }
                    </strong>
                  </p>

                  <p>
                    {dayjs(
                      selectedAnnouncement.created_at
                    ).format(
                      'dddd, MMMM D, YYYY • h:mm A'
                    )}
                  </p>

                  {selectedAnnouncement.announcement_id && (
                    <p className="font-mono text-[10px] text-gray-400">
                      ID:{' '}
                      {
                        selectedAnnouncement.announcement_id
                      }
                    </p>
                  )}

                </div>

                <button
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(
                        window.location.href
                      );

                    toast.success(
                      'Link copied to clipboard'
                    );
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 flex items-center gap-1.5"
                >
                  <Link className="w-3.5 h-3.5" />
                  Share Link
                </button>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AnnouncementsPage;
