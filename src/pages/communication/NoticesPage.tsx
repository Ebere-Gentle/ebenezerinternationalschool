import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Search,
  Download,
  Printer,
  Calendar,
  Building,
  CheckCircle,
  Clock,
  ShieldCheck,
  Share2,
  ExternalLink,
  Award,
  Plus,
  X,
  Save,
  Archive,
  Eye,
  EyeOff,
  BarChart3,
  Users,
  Megaphone,
  RefreshCw,
  Filter,
  ChevronRight,
  AlertCircle,
  CircleCheck,
  Layers,
  TrendingUp,
  BookOpen,
  ReceiptText,
  GraduationCap,
  Bus,
  Settings2
} from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabase/client';

interface NoticeItem {
  id: string;
  branch_id: string | null;
  reference_no: string;
  title: string;
  category:
    | 'Academic Bulletin'
    | 'Fee Schedule'
    | 'Examination'
    | 'General Notice'
    | 'Admissions'
    | 'Finance'
    | 'Transport'
    | 'Policy';
  summary: string;
  content: string | null;
  issued_by: string;
  issued_by_user_id: string | null;
  issue_date: string;
  effective_date: string | null;
  is_official_gazette: boolean;
  status: 'draft' | 'published' | 'archived';
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
  updated_at: string;
}

interface BranchItem {
  id: string;
  school_name: string;
  branch_code: string;
}

interface UserItem {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string;
  role: string;
  branch_id: string | null;
  is_active: boolean | null;
}

interface NoticeRead {
  id: string;
  notice_id: string;
  user_id: string;
  read_at: string;
}

type NoticeCategory = NoticeItem['category'];

const CATEGORIES: NoticeCategory[] = [
  'Academic Bulletin',
  'Fee Schedule',
  'Examination',
  'General Notice',
  'Admissions',
  'Finance',
  'Transport',
  'Policy'
];

const CATEGORY_ICONS: Record<NoticeCategory, React.ElementType> = {
  'Academic Bulletin': BookOpen,
  'Fee Schedule': ReceiptText,
  Examination: GraduationCap,
  'General Notice': Megaphone,
  Admissions: Users,
  Finance: ReceiptText,
  Transport: Bus,
  Policy: Settings2
};

const CATEGORY_CLASSES: Record<NoticeCategory, string> = {
  'Academic Bulletin':
    'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  'Fee Schedule':
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  Examination:
    'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  'General Notice':
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  Admissions:
    'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  Finance:
    'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  Transport:
    'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
  Policy:
    'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
};

const MANAGEMENT_ROLES = [
  'super_admin',
  'branch_admin',
  'director',
  'principal'
];

const formatDate = (value: string | null) => {
  if (!value) return 'Not specified';

  return dayjs(value).isValid()
    ? dayjs(value).format('DD MMM YYYY')
    : value;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return 'EIS';

  return parts
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
};

export const NoticesPage: React.FC = () => {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [reads, setReads] = useState<NoticeRead[]>([]);

  const [currentUser, setCurrentUser] = useState<UserItem | null>(null);
  const [currentAuthId, setCurrentAuthId] = useState<string | null>(null);

  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | NoticeCategory>(
    'all'
  );
  const [statusFilter, setStatusFilter] = useState<
    'all' | NoticeItem['status']
  >('published');
  const [branchFilter, setBranchFilter] = useState('all');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [form, setForm] = useState({
    reference_no: '',
    title: '',
    category: 'General Notice' as NoticeCategory,
    summary: '',
    content: '',
    issued_by: '',
    issue_date: dayjs().format('YYYY-MM-DD'),
    effective_date: '',
    is_official_gazette: false,
    status: 'published' as NoticeItem['status'],
    branch_id: '',
    attachment_url: '',
    attachment_name: ''
  });

  const canManage = MANAGEMENT_ROLES.includes(currentUser?.role || '');

  const loadData = async () => {
    setLoading(true);

    try {
      const {
        data: { user: authUser },
        error: authError
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (authUser) {
        setCurrentAuthId(authUser.id);
      }

      const [
        noticesResponse,
        usersResponse,
        branchesResponse,
        readsResponse
      ] = await Promise.all([
        supabase
          .from('notices')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('users')
          .select(
            'id, first_name, last_name, middle_name, email, role, branch_id, is_active'
          )
          .order('first_name', { ascending: true }),

        supabase
          .from('branches')
          .select('id, school_name, branch_code')
          .order('school_name', { ascending: true }),

        supabase
          .from('notice_reads')
          .select('id, notice_id, user_id, read_at')
      ]);

      if (noticesResponse.error) throw noticesResponse.error;
      if (usersResponse.error) throw usersResponse.error;
      if (branchesResponse.error) throw branchesResponse.error;
      if (readsResponse.error) throw readsResponse.error;

      const loadedUsers = (usersResponse.data || []) as UserItem[];

      setNotices((noticesResponse.data || []) as NoticeItem[]);
      setUsers(loadedUsers);
      setBranches((branchesResponse.data || []) as BranchItem[]);
      setReads((readsResponse.data || []) as NoticeRead[]);

      if (authUser) {
        const profile =
          loadedUsers.find(user => user.id === authUser.id) || null;

        setCurrentUser(profile);
      }
    } catch (error: any) {
      console.error('NOTICE PAGE LOAD ERROR:', error);
      toast.error(error?.message || 'Unable to load school notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return 'All branches';

    const branch = branches.find(item => item.id === branchId);

    return branch?.school_name || branch?.branch_code || 'Branch';
  };

  const getApplicantName = (userId: string | null) => {
    if (!userId) return 'School Administration';

    const user = users.find(item => item.id === userId);

    if (!user) return 'School Administration';

    return [user.first_name, user.middle_name, user.last_name]
      .filter(Boolean)
      .join(' ');
  };

  const isNoticeRead = (noticeId: string) => {
    if (!currentAuthId) return false;

    return reads.some(
      read => read.notice_id === noticeId && read.user_id === currentAuthId
    );
  };

  const markAsRead = async (notice: NoticeItem) => {
    if (!currentAuthId) return;

    if (isNoticeRead(notice.id)) return;

    const { data, error } = await supabase
      .from('notice_reads')
      .insert({
        notice_id: notice.id,
        user_id: currentAuthId
      })
      .select('id, notice_id, user_id, read_at')
      .single();

    if (error) {
      if (!error.message.toLowerCase().includes('duplicate')) {
        console.error('NOTICE READ ERROR:', error);
      }

      return;
    }

    if (data) {
      setReads(previous => [...previous, data as NoticeRead]);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notices.filter(notice => {
      const matchesSearch =
        !query ||
        notice.title.toLowerCase().includes(query) ||
        notice.reference_no.toLowerCase().includes(query) ||
        notice.category.toLowerCase().includes(query) ||
        notice.issued_by.toLowerCase().includes(query) ||
        notice.summary.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === 'all' || notice.category === categoryFilter;

      const matchesStatus =
        statusFilter === 'all' || notice.status === statusFilter;

      const matchesBranch =
        branchFilter === 'all' ||
        notice.branch_id === branchFilter ||
        notice.branch_id === null;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesBranch
      );
    });
  }, [
    notices,
    search,
    categoryFilter,
    statusFilter,
    branchFilter
  ]);

  useEffect(() => {
    if (!selectedNotice && filtered.length) {
      setSelectedNotice(filtered[0]);
    }

    if (
      selectedNotice &&
      filtered.length &&
      !filtered.some(notice => notice.id === selectedNotice.id)
    ) {
      setSelectedNotice(filtered[0]);
    }

    if (!filtered.length) {
      setSelectedNotice(null);
    }
  }, [filtered, selectedNotice]);

  const statistics = useMemo(() => {
    const published = notices.filter(
      notice => notice.status === 'published'
    );

    const drafts = notices.filter(notice => notice.status === 'draft');

    const archived = notices.filter(
      notice => notice.status === 'archived'
    );

    const gazetted = notices.filter(
      notice => notice.is_official_gazette
    );

    const totalPublishedReads = reads.filter(read =>
      published.some(notice => notice.id === read.notice_id)
    ).length;

    const uniqueReaders = new Set(
      reads
        .filter(read =>
          published.some(notice => notice.id === read.notice_id)
        )
        .map(read => read.user_id)
    ).size;

    const expectedAudience = users.filter(
      user => user.is_active !== false
    ).length;

    const readRate =
      published.length && expectedAudience
        ? Math.min(
            100,
            Math.round(
              (uniqueReaders / expectedAudience) * 100
            )
          )
        : 0;

    const categoryCounts = CATEGORIES.map(category => ({
      category,
      count: notices.filter(
        notice =>
          notice.category === category &&
          notice.status === 'published'
      ).length
    })).filter(item => item.count > 0);

    const recent = [...published]
      .sort(
        (a, b) =>
          dayjs(b.issue_date).valueOf() -
          dayjs(a.issue_date).valueOf()
      )
      .slice(0, 5);

    return {
      total: notices.length,
      published: published.length,
      drafts: drafts.length,
      archived: archived.length,
      gazetted: gazetted.length,
      totalPublishedReads,
      uniqueReaders,
      expectedAudience,
      readRate,
      categoryCounts,
      recent
    };
  }, [notices, reads, users]);

  const selectedReadCount = selectedNotice
    ? reads.filter(read => read.notice_id === selectedNotice.id).length
    : 0;

  const selectedReadRate =
    selectedNotice && users.length
      ? Math.min(
          100,
          Math.round((selectedReadCount / users.length) * 100)
        )
      : 0;

  const resetForm = () => {
    setForm({
      reference_no: '',
      title: '',
      category: 'General Notice',
      summary: '',
      content: '',
      issued_by: '',
      issue_date: dayjs().format('YYYY-MM-DD'),
      effective_date: '',
      is_official_gazette: false,
      status: 'published',
      branch_id: '',
      attachment_url: '',
      attachment_name: ''
    });
  };

  const openCreateModal = () => {
    resetForm();

    setForm(previous => ({
      ...previous,
      issued_by: currentUser
        ? [currentUser.first_name, currentUser.last_name]
            .filter(Boolean)
            .join(' ')
        : ''
    }));

    setShowCreateModal(true);
  };

  const createNotice = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!form.reference_no.trim()) {
      toast.error('Reference number is required');
      return;
    }

    if (!form.title.trim()) {
      toast.error('Notice title is required');
      return;
    }

    if (!form.summary.trim()) {
      toast.error('Notice summary is required');
      return;
    }

    if (!form.issued_by.trim()) {
      toast.error('Issuing authority is required');
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('notices')
        .insert({
          reference_no: form.reference_no.trim(),
          title: form.title.trim(),
          category: form.category,
          summary: form.summary.trim(),
          content: form.content.trim() || null,
          issued_by: form.issued_by.trim(),
          issued_by_user_id: currentAuthId,
          issue_date: form.issue_date,
          effective_date: form.effective_date || null,
          is_official_gazette: form.is_official_gazette,
          status: form.status,
          branch_id: form.branch_id || null,
          attachment_url: form.attachment_url.trim() || null,
          attachment_name: form.attachment_name.trim() || null
        })
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        setNotices(previous => [
          data as NoticeItem,
          ...previous
        ]);

        setSelectedNotice(data as NoticeItem);
      }

      toast.success(
        form.status === 'published'
          ? 'Notice published successfully'
          : 'Notice saved successfully'
      );

      setShowCreateModal(false);
      resetForm();
    } catch (error: any) {
      console.error('CREATE NOTICE ERROR:', error);
      toast.error(
        error?.message || 'Unable to create the notice'
      );
    } finally {
      setSaving(false);
    }
  };

  const updateNoticeStatus = async (
    notice: NoticeItem,
    status: NoticeItem['status']
  ) => {
    if (!canManage) return;

    const { data, error } = await supabase
      .from('notices')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', notice.id)
      .select('*')
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data) {
      const updated = data as NoticeItem;

      setNotices(previous =>
        previous.map(item =>
          item.id === updated.id ? updated : item
        )
      );

      setSelectedNotice(updated);

      toast.success(
        status === 'archived'
          ? 'Notice archived'
          : status === 'published'
          ? 'Notice published'
          : 'Notice moved to draft'
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!selectedNotice?.attachment_url) {
      toast.error('This notice has no attached document');
      return;
    }

    window.open(
      selectedNotice.attachment_url,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleShare = async () => {
    if (!selectedNotice) return;

    const shareText = `${selectedNotice.title} — ${selectedNotice.reference_no}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: selectedNotice.title,
          text: shareText,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(
          `${shareText}\n${window.location.href}`
        );

        toast.success('Notice link copied');
      }
    } catch {
      // User cancelled native sharing.
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('published');
    setBranchFilter('all');
  };

  const getCategoryIcon = (category: NoticeCategory) => {
    return CATEGORY_ICONS[category] || FileText;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs mb-2">
              <FileText className="w-3.5 h-3.5" />
              <span>Digital Notice Board & Gazettes</span>
            </div>

            <h1 className="text-2xl sm:text-3xl tracking-tight">
              Official School Notices & Gazettes
            </h1>

            <p className="text-blue-100 text-sm max-w-2xl mt-2">
              Publish, distribute, monitor and archive official
              school communications from one central notice board.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAnalytics(previous => !previous)}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm transition-all flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>

            {canManage && (
              <button
                onClick={openCreateModal}
                className="px-5 py-3 rounded-2xl bg-white text-indigo-800 text-sm hover:bg-indigo-50 shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Notice
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Analytics */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-[10px] text-gray-400">
                    TOTAL
                  </span>
                </div>
                <div className="text-2xl text-gray-900 dark:text-white mt-3">
                  {statistics.total}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  All notices
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <CircleCheck className="w-5 h-5 text-emerald-600" />
                  <span className="text-[10px] text-gray-400">
                    LIVE
                  </span>
                </div>
                <div className="text-2xl text-gray-900 dark:text-white mt-3">
                  {statistics.published}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Published notices
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="text-[10px] text-gray-400">
                    DRAFTS
                  </span>
                </div>
                <div className="text-2xl text-gray-900 dark:text-white mt-3">
                  {statistics.drafts}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Awaiting publication
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                  <span className="text-[10px] text-gray-400">
                    GAZETTES
                  </span>
                </div>
                <div className="text-2xl text-gray-900 dark:text-white mt-3">
                  {statistics.gazetted}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Officially sealed
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <span className="text-[10px] text-gray-400">
                    REACH
                  </span>
                </div>
                <div className="text-2xl text-gray-900 dark:text-white mt-3">
                  {statistics.readRate}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Unique audience reached
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm text-gray-900 dark:text-white">
                      Publication mix
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Published notices by category
                    </p>
                  </div>
                  <Layers className="w-5 h-5 text-indigo-500" />
                </div>

                <div className="space-y-3">
                  {statistics.categoryCounts.length === 0 ? (
                    <div className="text-xs text-gray-500">
                      No published notices yet.
                    </div>
                  ) : (
                    statistics.categoryCounts.map(item => {
                      const percentage =
                        statistics.published > 0
                          ? Math.round(
                              (item.count /
                                statistics.published) *
                                100
                            )
                          : 0;

                      const Icon = getCategoryIcon(
                        item.category
                      );

                      return (
                        <div key={item.category}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                              <Icon className="w-3.5 h-3.5" />
                              {item.category}
                            </span>
                            <span className="text-gray-500">
                              {item.count}
                            </span>
                          </div>

                          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all"
                              style={{
                                width: `${percentage}%`
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm text-gray-900 dark:text-white">
                      Audience engagement
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Notice reading activity
                    </p>
                  </div>
                  <Users className="w-5 h-5 text-blue-500" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                    <div className="text-lg text-gray-900 dark:text-white">
                      {statistics.uniqueReaders}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Unique readers
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                    <div className="text-lg text-gray-900 dark:text-white">
                      {statistics.totalPublishedReads}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Total reads
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                    <div className="text-lg text-gray-900 dark:text-white">
                      {statistics.expectedAudience}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Active users
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-500">
                      Overall audience reach
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {statistics.readRate}%
                    </span>
                  </div>

                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"
                      style={{
                        width: `${statistics.readRate}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-5 space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-600" />
                <span className="text-sm text-gray-900 dark:text-white">
                  Notice directory
                </span>
              </div>

              <button
                onClick={clearFilters}
                className="text-[11px] text-gray-500 hover:text-indigo-600 transition-colors"
              >
                Clear filters
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                placeholder="Search reference, title, authority..."
                value={search}
                onChange={event =>
                  setSearch(event.target.value)
                }
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <select
                value={categoryFilter}
                onChange={event =>
                  setCategoryFilter(
                    event.target.value as
                      | 'all'
                      | NoticeCategory
                  )
                }
                className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All categories</option>

                {CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={event =>
                  setStatusFilter(
                    event.target.value as
                      | 'all'
                      | NoticeItem['status']
                  )
                }
                className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {branches.length > 0 && (
              <select
                value={branchFilter}
                onChange={event =>
                  setBranchFilter(event.target.value)
                }
                className="w-full mt-2 px-3 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All branches</option>

                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.school_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Notice count */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-500">
              {filtered.length} notice
              {filtered.length === 1 ? '' : 's'} found
            </span>

            <button
              onClick={loadData}
              disabled={loading}
              className="text-gray-500 hover:text-indigo-600 transition-colors disabled:opacity-50"
              title="Refresh notices"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  loading ? 'animate-spin' : ''
                }`}
              />
            </button>
          </div>

          {/* List */}
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse"
                >
                  <div className="h-3 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
                  <div className="h-4 w-4/5 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
                  <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
                <FileText className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-700" />

                <p className="text-sm text-gray-700 dark:text-gray-300 mt-4">
                  No notices found
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Try changing the filters or publish a new
                  notice.
                </p>

                {canManage && (
                  <button
                    onClick={openCreateModal}
                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs hover:bg-indigo-700 transition-colors"
                  >
                    Create first notice
                  </button>
                )}
              </div>
            ) : (
              filtered.map(notice => {
                const Icon = getCategoryIcon(
                  notice.category
                );

                const active =
                  selectedNotice?.id === notice.id;

                const read = isNoticeRead(notice.id);

                return (
                  <motion.div
                    key={notice.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      setSelectedNotice(notice);
                      markAsRead(notice);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-sm'
                        : 'bg-white dark:bg-gray-900 border-gray-200/80 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          CATEGORY_CLASSES[
                            notice.category
                          ]
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                            {notice.reference_no}
                          </span>

                          {!read &&
                            notice.status ===
                              'published' && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            )}
                        </div>

                        <h4 className="text-sm text-gray-900 dark:text-white line-clamp-2 mt-1">
                          {notice.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400 mt-2">
                          <span>
                            {formatDate(notice.issue_date)}
                          </span>

                          <span>
                            {notice.issued_by}
                          </span>

                          {notice.is_official_gazette && (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Gazetted
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        className={`w-4 h-4 shrink-0 mt-2 transition-transform ${
                          active
                            ? 'text-blue-600 translate-x-0.5'
                            : 'text-gray-300'
                        }`}
                      />
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-7">
          {selectedNotice ? (
            <motion.div
              key={selectedNotice.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden"
            >
              {/* Document header */}
              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
                  <div className="min-w-0">
                    <span className="text-xs font-mono text-blue-600 dark:text-blue-400 block mb-2">
                      {selectedNotice.reference_no}
                    </span>

                    <h2 className="text-xl sm:text-2xl text-gray-900 dark:text-white tracking-tight">
                      {selectedNotice.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] ${
                          CATEGORY_CLASSES[
                            selectedNotice.category
                          ]
                        }`}
                      >
                        {selectedNotice.category}
                      </span>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] ${
                          selectedNotice.status ===
                          'published'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : selectedNotice.status ===
                              'draft'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {selectedNotice.status}
                      </span>

                      {selectedNotice.is_official_gazette && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          GAZETTED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                    <span className="text-gray-400 block text-[10px]">
                      Issue date
                    </span>
                    <span className="text-xs text-gray-900 dark:text-white flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      {formatDate(
                        selectedNotice.issue_date
                      )}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                    <span className="text-gray-400 block text-[10px]">
                      Effective
                    </span>
                    <span className="text-xs text-gray-900 dark:text-white flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      {formatDate(
                        selectedNotice.effective_date
                      )}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                    <span className="text-gray-400 block text-[10px]">
                      Coverage
                    </span>
                    <span className="text-xs text-gray-900 dark:text-white flex items-center gap-1.5 mt-1">
                      <Building className="w-3.5 h-3.5 text-purple-500" />
                      {getBranchName(
                        selectedNotice.branch_id
                      )}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                    <span className="text-gray-400 block text-[10px]">
                      Read count
                    </span>
                    <span className="text-xs text-gray-900 dark:text-white flex items-center gap-1.5 mt-1">
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      {selectedReadCount}
                    </span>
                  </div>
                </div>

                {/* Document body */}
                <div className="mt-7 space-y-5">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                      Executive summary
                    </div>

                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedNotice.summary}
                    </p>
                  </div>

                  {selectedNotice.content && (
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                        Official communication
                      </div>

                      <div className="text-sm text-gray-700 dark:text-gray-300 leading-7 whitespace-pre-line">
                        {selectedNotice.content}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-200/80 dark:border-gray-800">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </div>

                      <div>
                        <div className="text-xs text-gray-900 dark:text-white">
                          Official publication
                        </div>

                        <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
                          This notice is recorded in the
                          school's digital notice registry.
                          Publication status, reference number,
                          issuing authority and readership are
                          retained for administrative audit.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Authority */}
                <div className="mt-6 p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center text-xs shrink-0">
                        {getInitials(
                          selectedNotice.issued_by
                        )}
                      </div>

                      <div className="min-w-0">
                        <span className="text-[10px] text-gray-400 block">
                          Issuing authority
                        </span>

                        <span className="text-sm text-gray-900 dark:text-white truncate block">
                          {selectedNotice.issued_by}
                        </span>
                      </div>
                    </div>

                    {selectedNotice.attachment_url && (
                      <button
                        onClick={handleDownload}
                        className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5 hover:underline shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Attachment
                      </button>
                    )}
                  </div>
                </div>

                {/* Read analytics */}
                <div className="mt-4 p-4 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs text-gray-800 dark:text-gray-200">
                        Audience engagement
                      </span>
                    </div>

                    <span className="text-xs text-indigo-700 dark:text-indigo-300">
                      {selectedReadRate}% reached
                    </span>
                  </div>

                  <div className="h-1.5 bg-indigo-100 dark:bg-indigo-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{
                        width: `${selectedReadRate}%`
                      }}
                    />
                  </div>

                  <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                    <span>
                      {selectedReadCount} recorded reader
                      {selectedReadCount === 1 ? '' : 's'}
                    </span>
                    <span>
                      {users.length} registered users
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="px-6 sm:px-8 py-4 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-200/80 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>

                  {selectedNotice.attachment_url && (
                    <button
                      onClick={handleDownload}
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  )}

                  <button
                    onClick={handleShare}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>
                </div>

                {canManage && (
                  <div className="flex items-center gap-2">
                    {selectedNotice.status !==
                      'published' && (
                      <button
                        onClick={() =>
                          updateNoticeStatus(
                            selectedNotice,
                            'published'
                          )
                        }
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Publish
                      </button>
                    )}

                    {selectedNotice.status ===
                      'published' && (
                      <button
                        onClick={() =>
                          updateNoticeStatus(
                            selectedNotice,
                            'archived'
                          )
                        }
                        className="px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-800 text-white text-xs flex items-center gap-1.5"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Archive
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center min-h-[500px] flex items-center justify-center">
              <div>
                <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700" />

                <p className="text-sm text-gray-700 dark:text-gray-300 mt-4">
                  Select a notice to view its official record
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Published communications will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create notice modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onMouseDown={event => {
              if (event.target === event.currentTarget) {
                setShowCreateModal(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800"
            >
              <div className="sticky top-0 z-10 px-6 py-5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg text-gray-900 dark:text-white">
                      Create official notice
                    </h2>
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    Publish an official school communication.
                  </p>
                </div>

                <button
                  onClick={() =>
                    setShowCreateModal(false)
                  }
                  className="w-9 h-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <form
                onSubmit={createNotice}
                className="p-6 space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1.5">
                      Reference number
                    </label>

                    <input
                      value={form.reference_no}
                      onChange={event =>
                        setForm(previous => ({
                          ...previous,
                          reference_no:
                            event.target.value
                        }))
                      }
                      placeholder="EIS/CIRC/2026/09-01"
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1.5">
                      Category
                    </label>

                    <select
                      value={form.category}
                      onChange={event =>
                        setForm(previous => ({
                          ...previous,
                          category:
                            event.target.value as NoticeCategory
                        }))
                      }
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    >
                      {CATEGORIES.map(category => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1.5">
                    Notice title
                  </label>

                  <input
                    value={form.title}
                    onChange={event =>
                      setForm(previous => ({
                        ...previous,
                        title: event.target.value
                      }))
                    }
                    placeholder="Enter the official notice title"
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1.5">
                      Issue date
                    </label>

                    <input
                      type="date"
                      value={form.issue_date}
                      onChange={event =>
                        setForm(previous => ({
                          ...previous,
                          issue_date:
                            event.target.value
                        }))
                      }
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1.5">
                      Effective date
                    </label>

                    <input
                      type="date"
                      value={form.effective_date}
                      onChange={event =>
                        setForm(previous => ({
                          ...previous,
                          effective_date:
                            event.target.value
                        }))
                      }
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1.5">
                      Branch
                    </label>

                    <select
                      value={form.branch_id}
                      onChange={event =>
                        setForm(previous => ({
                          ...previous,
                          branch_id:
                            event.target.value
                        }))
                      }
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    >
                      <option value="">
                        All branches
                      </option>

                      {branches.map(branch => (
                        <option
                          key={branch.id}
                          value={branch.id}
                        >
                          {branch.school_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1.5">
                    Issuing authority
                  </label>

                  <input
                    value={form.issued_by}
                    onChange={event =>
                      setForm(previous => ({
                        ...previous,
                        issued_by: event.target.value
                      }))
                    }
                    placeholder="Directorate / Principal / Bursary / Academic Council"
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1.5">
                    Summary
                  </label>

                  <textarea
                    rows={3}
                    value={form.summary}
                    onChange={event =>
                      setForm(previous => ({
                        ...previous,
                        summary: event.target.value
                      }))
                    }
                    placeholder="Short executive summary of the notice"
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1.5">
                    Full communication
                  </label>

                  <textarea
                    rows={7}
                    value={form.content}
                    onChange={event =>
                      setForm(previous => ({
                        ...previous,
                        content: event.target.value
                      }))
                    }
                    placeholder="Enter the complete official communication..."
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1.5">
                      Attachment name
                    </label>

                    <input
                      value={form.attachment_name}
                      onChange={event =>
                        setForm(previous => ({
                          ...previous,
                          attachment_name:
                            event.target.value
                        }))
                      }
                      placeholder="2026 Academic Calendar.pdf"
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1.5">
                      Attachment URL
                    </label>

                    <input
                      type="url"
                      value={form.attachment_url}
                      onChange={event =>
                        setForm(previous => ({
                          ...previous,
                          attachment_url:
                            event.target.value
                        }))
                      }
                      placeholder="https://..."
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <input
                      type="checkbox"
                      checked={form.is_official_gazette}
                      onChange={event =>
                        setForm(previous => ({
                          ...previous,
                          is_official_gazette:
                            event.target.checked
                        }))
                      }
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />

                    <div>
                      <div className="text-sm text-gray-800 dark:text-gray-200">
                        Official gazette
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Mark as formally gazetted
                      </div>
                    </div>
                  </label>

                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1.5">
                      Publication status
                    </label>

                    <select
                      value={form.status}
                      onChange={event =>
                        setForm(previous => ({
                          ...previous,
                          status:
                            event.target.value as NoticeItem['status']
                        }))
                      }
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    >
                      <option value="draft">
                        Save as draft
                      </option>
                      <option value="published">
                        Publish immediately
                      </option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowCreateModal(false)
                    }
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm flex items-center gap-2"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}

                    {saving
                      ? 'Saving...'
                      : form.status === 'published'
                      ? 'Publish notice'
                      : 'Save draft'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NoticesPage;