import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Coins, 
  Search, 
  Plus, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Archive,
  BookOpen,
  Calendar,
  Users,
  Gift,
  Shield,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Receipt,
  Tag,
  User as UserIcon
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface Fee {
  id: string;
  fee_id: string;
  branch_id: string;
  class_id: string | null;
  category: string;
  name: string;
  description: string;
  amount: number;
  due_date: string | null;
  late_fee_amount: number;
  installment_allowed: boolean;
  number_of_installments: number;
  is_mandatory: boolean;
  is_optional: boolean;
  is_recurring: boolean;
  recurrence_period: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  metadata: any;
  class_name?: string;
  branch_name?: string;
  term: string | null;
  session: string | null;
  academic_session_id: string | null;
  total_payments?: number;
  total_amount_paid?: number;
  total_students_paid?: number;
  target_type?: string;
  target_ids?: string[];
  total_waived_amount?: number;
  total_waived_students?: number;
  waiver_history?: WaiverRecord[];
  fee_breakdown?: {
    items: any[];
    total_amount: number;
  };
}

interface WaiverRecord {
  student_name: string;
  student_id?: string;
  amount: number;
  breakdown_item?: string;
  breakdown_item_id?: string;
  type?: string;
  applied_at?: string;
  student_id_number?: string;
}

const categoryLabels: Record<string, string> = {
  school_fees: 'School Fees',
  books: 'Books',
  uniform: 'Uniform',
  sportswear: 'Sportswear',
  bus: 'Bus',
  pta: 'PTA',
  examination: 'Examination',
  medical: 'Medical',
  graduation: 'Graduation',
  development_levy: 'Development Levy',
  identity_card: 'Identity Card',
  excursion: 'Excursion',
  hostel: 'Hostel',
  laboratory: 'Laboratory',
  lesson_fee: 'Lesson Fee',
  extra_classes: 'Extra Classes',
  custom: 'Custom',
};

const TERM_ORDER = ['First Term', 'Second Term', 'Third Term'];

const FeesList: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [termFilter, setTermFilter] = useState<string>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [processing, setProcessing] = useState(false);
  const [sessionOptions, setSessionOptions] = useState<string[]>([]);
  const [termOptions, setTermOptions] = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [classMap, setClassMap] = useState<Record<string, string>>({});
  const [expandedFee, setExpandedFee] = useState<string | null>(null);

  const pageSize = 10;

  // ==================== Load class map ====================
  useEffect(() => {
    const loadClassMap = async () => {
      if (!user?.branch_id) return;
      
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('id, name')
          .eq('branch_id', user.branch_id)
          .eq('status', 'active');

        if (error) throw error;

        const map: Record<string, string> = {};
        (data || []).forEach(cls => {
          map[cls.id] = cls.name;
        });
        setClassMap(map);
      } catch (error) {
        console.error('Error loading class map:', error);
      }
    };

    loadClassMap();
  }, [user?.branch_id]);

  // ==================== Wait for auth to load ====================
  useEffect(() => {
    if (authLoading) {
      console.log("⏳ Auth is still loading, waiting...");
      return;
    }

    if (!user) {
      console.warn("⚠️ No user found after auth loading completed");
      setLoadingFilters(false);
      return;
    }

    if (!user.branch_id) {
      console.warn("⚠️ User has no branch_id:", user);
      setLoadingFilters(false);
      return;
    }

    console.log("✅ Auth ready, fetching filters...");
    fetchFilterOptions();
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.branch_id && !authLoading) {
      fetchFees();
    }
  }, [currentPage, searchTerm, statusFilter, categoryFilter, sessionFilter, termFilter, user, authLoading]);

  const fetchFilterOptions = async () => {
    if (!user) {
      console.warn("❌ fetchFilterOptions: No user found");
      setLoadingFilters(false);
      return;
    }

    if (!user.branch_id) {
      console.warn("❌ fetchFilterOptions: No branch_id found on user");
      setLoadingFilters(false);
      return;
    }

    console.log("📊 fetchFilterOptions: Loading filters for branch:", user.branch_id);
    
    setLoadingFilters(true);
    try {
      const { data, error } = await supabase
        .from("fees")
        .select("id, fee_id, session, term, branch_id")
        .eq("branch_id", user.branch_id);

      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }

      console.log(`📊 Found ${data?.length || 0} fees`);

      const sessions = [
        ...new Set(
          (data || [])
            .map(x => x.session)
            .filter(Boolean)
        )
      ].sort().reverse();

      const allTerms = [
        ...new Set(
          (data || [])
            .map(x => x.term)
            .filter(Boolean)
        )
      ];

      const orderedTerms = TERM_ORDER.filter(term => allTerms.includes(term));

      console.log("📊 Sessions:", sessions);
      console.log("📊 Terms:", orderedTerms);

      setSessionOptions(sessions);
      setTermOptions(orderedTerms);

      if (sessions.length > 0) {
        setSessionFilter(sessions[0]);
      } else {
        setSessionFilter('all');
      }

      if (orderedTerms.length > 0) {
        setTermFilter(orderedTerms[0]);
      } else {
        setTermFilter('all');
      }

    } catch (error) {
      console.error("❌ Error in fetchFilterOptions:", error);
      toast.error('Failed to load filter options');
    } finally {
      setLoadingFilters(false);
    }
  };

  const fetchTermsForSession = async (session: string) => {
    if (!user?.branch_id) {
      console.warn("❌ fetchTermsForSession: No branch_id found");
      return;
    }

    try {
      let query = supabase
        .from('fees')
        .select('term')
        .eq('branch_id', user.branch_id)
        .not('term', 'is', null)
        .not('term', 'eq', '');

      if (session !== 'all') {
        query = query.eq('session', session);
      }

      const { data, error } = await query;

      if (error) throw error;

      const allTerms = [
        ...new Set(
          (data || [])
            .map(item => item.term)
            .filter(Boolean)
        )
      ];

      const orderedTerms = TERM_ORDER.filter(term => allTerms.includes(term));
      setTermOptions(orderedTerms);
      setTermFilter('all');

    } catch (error) {
      console.error("❌ Error fetching terms:", error);
    }
  };

  // ==================== Get class name from target_ids ====================
  const getFeeClassName = (fee: Fee): string => {
    if (fee.class_id && classMap[fee.class_id]) {
      return classMap[fee.class_id];
    }

    if (fee.target_type === 'class' && fee.target_ids && fee.target_ids.length > 0) {
      const classNames = fee.target_ids
        .map(id => classMap[id])
        .filter(Boolean);
      
      if (classNames.length === 1) {
        return classNames[0];
      } else if (classNames.length > 1) {
        return `${classNames.length} classes`;
      }
    }

    if (fee.metadata?.class_name) {
      return fee.metadata.class_name;
    }

    return fee.class_name || 'All Classes';
  };

  // ==================== Get breakdown items ====================
  const getBreakdownItems = (fee: Fee): any[] => {
    if (fee.metadata?.fee_breakdown?.items) {
      return fee.metadata.fee_breakdown.items;
    }
    if (fee.metadata?.fee_breakdown_items) {
      return fee.metadata.fee_breakdown_items;
    }
    return [];
  };

  // ==================== Get waiver info with proper formatting ====================
  const getWaiverInfo = (fee: Fee): { totalWaived: number; studentCount: number; waiverRecords: WaiverRecord[] } => {
    let totalWaived = 0;
    const waiverRecords: WaiverRecord[] = [];
    const seen = new Set<string>();

    // Helper to add waiver record with deduplication
    const addWaiverRecord = (record: WaiverRecord) => {
      const key = `${record.student_name}-${record.breakdown_item || 'full'}-${record.amount}`;
      if (!seen.has(key)) {
        seen.add(key);
        waiverRecords.push(record);
        totalWaived += record.amount;
      }
    };

    // Check metadata for waiver history
    if (fee.metadata?.waiver_history && Array.isArray(fee.metadata.waiver_history)) {
      fee.metadata.waiver_history.forEach((w: any) => {
        // Get breakdown item name
        let breakdownItem = 'Full Fee';
        if (w.breakdown_items && w.breakdown_items.length > 0) {
          // If breakdown_items is an array of objects with item_name
          if (typeof w.breakdown_items[0] === 'object' && w.breakdown_items[0].item_name) {
            breakdownItem = w.breakdown_items.map((item: any) => item.item_name).join(', ');
          } else if (typeof w.breakdown_items[0] === 'string') {
            breakdownItem = w.breakdown_items.join(', ');
          }
        } else if (w.breakdown_item) {
          breakdownItem = w.breakdown_item;
        } else if (w.item_name) {
          breakdownItem = w.item_name;
        }

        addWaiverRecord({
          student_name: w.student_name || 'Unknown Student',
          student_id: w.student_id,
          amount: w.amount || 0,
          breakdown_item: breakdownItem,
          breakdown_item_id: w.breakdown_item_id,
          type: w.type || 'waiver',
          applied_at: w.applied_at,
          student_id_number: w.student_id_number
        });
      });
    }

    // Check assignment-level waivers
    if (fee.metadata?.waiver_applied) {
      const w = fee.metadata.waiver_applied;
      if (!waiverRecords.some(r => r.applied_at === w.applied_at)) {
        let breakdownItem = 'Full Fee';
        if (w.breakdown_items && w.breakdown_items.length > 0) {
          if (typeof w.breakdown_items[0] === 'object' && w.breakdown_items[0].item_name) {
            breakdownItem = w.breakdown_items.map((item: any) => item.item_name).join(', ');
          } else if (typeof w.breakdown_items[0] === 'string') {
            breakdownItem = w.breakdown_items.join(', ');
          }
        } else if (w.breakdown_item) {
          breakdownItem = w.breakdown_item;
        } else if (w.item_name) {
          breakdownItem = w.item_name;
        }

        addWaiverRecord({
          student_name: w.student_name || 'Unknown Student',
          student_id: w.student_id,
          amount: w.amount || 0,
          breakdown_item: breakdownItem,
          breakdown_item_id: w.breakdown_item_id,
          type: w.type || 'waiver',
          applied_at: w.applied_at,
          student_id_number: w.student_id_number
        });
      }
    }

    return {
      totalWaived,
      studentCount: waiverRecords.length,
      waiverRecords
    };
  };

  // ==================== Get student initials ====================
  const getInitials = (name: string): string => {
    if (!name) return 'S';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const fetchFees = async () => {
    if (!user?.branch_id) {
      console.warn("❌ fetchFees: No branch_id found");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('fees')
        .select(`
          *,
          classes:class_id (
            name
          ),
          branches:branch_id (
            school_name
          )
        `, { count: 'exact' });

      query = query.eq('branch_id', user.branch_id);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (sessionFilter !== 'all') {
        query = query.eq('session', sessionFilter);
      }

      if (termFilter !== 'all') {
        query = query.eq('term', termFilter);
      }

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,` +
          `description.ilike.%${searchTerm}%,` +
          `fee_id.ilike.%${searchTerm}%`
        );
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      const feesWithStats = await Promise.all(
        (data || []).map(async (fee: any) => {
          const { data: paymentData, error: paymentError } = await supabase
            .from('payments')
            .select('amount_paid, status, student_id, payment_method')
            .eq('fee_id', fee.id)
            .in('status', ['completed', 'paid', 'approved']);

          if (paymentError) {
            return {
              ...fee,
              class_name: fee.classes?.name || 'All Classes',
              branch_name: fee.branches?.school_name || 'N/A',
              total_payments: 0,
              total_amount_paid: 0,
              total_students_paid: 0,
              target_type: fee.target_type || 'all',
              target_ids: fee.target_ids || [],
            };
          }

          const uniqueStudents = new Set(paymentData?.map(p => p.student_id) || []);
          
          // Get waiver info with proper formatting
          const { totalWaived, studentCount, waiverRecords } = getWaiverInfo(fee);
          
          return {
            ...fee,
            class_name: fee.classes?.name || 'All Classes',
            branch_name: fee.branches?.school_name || 'N/A',
            total_payments: paymentData?.length || 0,
            total_amount_paid: paymentData?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0,
            total_students_paid: uniqueStudents.size,
            target_type: fee.target_type || 'all',
            target_ids: fee.target_ids || [],
            total_waived_amount: totalWaived,
            total_waived_students: studentCount,
            waiver_history: waiverRecords,
            fee_breakdown: fee.metadata?.fee_breakdown || null,
          };
        })
      );

      setFees(feesWithStats);
      setTotalCount(count || 0);
      
    } catch (error: any) {
      console.error('Error fetching fees:', error);
      toast.error(error.message || 'Failed to fetch fees');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFee = async () => {
    if (!selectedFee) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('fees')
        .delete()
        .eq('id', selectedFee.id);

      if (error) throw error;

      toast.success('Fee deleted successfully');
      setShowDeleteModal(false);
      setSelectedFee(null);
      fetchFees();
      fetchFilterOptions();
    } catch (error: any) {
      console.error('Error deleting fee:', error);
      toast.error(error.message || 'Failed to delete fee');
    } finally {
      setProcessing(false);
    }
  };

  const toggleFeeStatus = async (fee: Fee) => {
    setProcessing(true);
    try {
      const newStatus = fee.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('fees')
        .update({ status: newStatus })
        .eq('id', fee.id);

      if (error) throw error;

      toast.success(`Fee ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchFees();
    } catch (error: any) {
      console.error('Error toggling fee status:', error);
      toast.error(error.message || 'Failed to update fee status');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewFee = (fee: Fee) => {
    navigate(`/fees/${fee.id}`);
  };

  const handleEditFee = (fee: Fee) => {
    navigate(`/fees/edit/${fee.id}`);
  };

  const toggleExpandFee = (feeId: string) => {
    setExpandedFee(expandedFee === feeId ? null : feeId);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      deleted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return styles[status] || styles.inactive;
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      school_fees: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      books: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      uniform: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      sportswear: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
      bus: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      pta: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      examination: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      medical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      graduation: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      development_levy: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
      identity_card: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      excursion: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
      hostel: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
      laboratory: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
      lesson_fee: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      extra_classes: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      custom: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[category] || styles.custom;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportFees = () => {
    toast.success('Export started. Download will begin shortly.');
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const categoryOptions = Object.keys(categoryLabels).map(key => ({
    value: key,
    label: categoryLabels[key],
  }));

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSessionFilter(value);
    setCurrentPage(1);
    
    if (value !== 'all') {
      fetchTermsForSession(value);
    } else {
      fetchTermsForSession('all');
    }
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
    
    if (sessionOptions.length > 0) {
      setSessionFilter(sessionOptions[0]);
      fetchTermsForSession(sessionOptions[0]);
    } else {
      setSessionFilter('all');
      setTermFilter('all');
    }
  };

  const totalFees = fees.length;
  const activeFees = fees.filter(f => f.status === 'active').length;
  const inactiveFees = fees.filter(f => f.status === 'inactive').length;
  const recurringFees = fees.filter(f => f.is_recurring).length;
  const totalAmount = fees.reduce((sum, f) => sum + f.amount, 0);
  const totalCollected = fees.reduce((sum, f) => sum + (f.total_amount_paid || 0), 0);
  const totalWaived = fees.reduce((sum, f) => sum + (f.total_waived_amount || 0), 0);
  const totalWaivedStudents = fees.reduce((sum, f) => sum + (f.total_waived_students || 0), 0);

  // ==================== SHOW LOADING WHILE AUTH IS INITIALIZING ====================
  if (authLoading || loadingFilters) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
        <Loader2 className="w-12 h-12 text-gray-400 mb-3" />
        <p className="text-gray-500 dark:text-gray-400 mt-1">Loading invoice data...</p>
      </div>
    );
  }

  if (!user.branch_id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Branch Assigned</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Please contact your administrator</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Fee Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage fee structures and track collections
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportFees}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => navigate('/fees/create')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            Create Fee
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Fees</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalFees}</p>
          <p className="text-xs text-gray-400">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeFees}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Inactive</p>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{inactiveFees}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Recurring</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{recurringFees}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Collected</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalCollected)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Waived</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(totalWaived)}</p>
          <p className="text-xs text-gray-400">{totalWaivedStudents} students</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Collection Rate</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {totalAmount > 0 ? Math.round((totalCollected / totalAmount) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search fees by name, description, or ID..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
          >
            <option value="all">All Categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <select
            value={sessionFilter}
            onChange={handleSessionChange}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
          >
            <option value="all">All Sessions</option>
            {sessionOptions.map((session) => (
              <option key={session} value={session}>
                {session}
              </option>
            ))}
          </select>
          <select
            value={termFilter}
            onChange={(e) => {
              setTermFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
          >
            <option value="all">All Terms</option>
            {termOptions.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
          <button
            onClick={handleResetFilters}
            className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            title="Reset Filters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fees Table with Expandable Rows */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fee Name
                </th>
                <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Session
                </th>
                <th className="hidden xl:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Term
                </th>
                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Class
                </th>
                <th className="hidden xl:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Payments
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                  </td>
                </tr>
              ) : fees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <Coins className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-lg font-medium">No fees found</p>
                    <p className="text-sm mt-1">Create your first fee structure</p>
                    <button
                      onClick={() => navigate('/fees/create')}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Create Fee
                    </button>
                  </td>
                </tr>
              ) : (
                fees.map((fee) => {
                  const breakdownItems = getBreakdownItems(fee);
                  const hasBreakdown = breakdownItems.length > 0;
                  const hasWaiver = (fee.total_waived_amount || 0) > 0 || (fee.total_waived_students || 0) > 0;
                  const isExpanded = expandedFee === fee.id;
                  const waiverRecords = fee.waiver_history || [];
                  
                  return (
                    <React.Fragment key={fee.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                        <td className="px-4 sm:px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{fee.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{fee.fee_id}</p>
                            {fee.is_recurring && (
                              <span className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                                <Clock className="w-3 h-3" />
                                {fee.recurrence_period || 'Recurring'}
                              </span>
                            )}
                            {hasWaiver && (
                              <span className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 ml-2">
                                <Gift className="w-3 h-3" />
                                Waiver: {formatCurrency(fee.total_waived_amount || 0)}
                              </span>
                            )}
                            {hasBreakdown && (
                              <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 ml-2">
                                <ListChecks className="w-3 h-3" />
                                {breakdownItems.length} items
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-4 sm:px-6 py-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadge(fee.category)}`}>
                            {categoryLabels[fee.category] || fee.category}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(fee.amount)}
                            </p>
                            {fee.late_fee_amount > 0 && (
                              <p className="text-xs text-red-500">Late: {formatCurrency(fee.late_fee_amount)}</p>
                            )}
                            {fee.total_amount_paid > 0 && (
                              <p className="text-xs text-green-500">Collected: {formatCurrency(fee.total_amount_paid)}</p>
                            )}
                            {fee.total_waived_amount > 0 && (
                              <p className="text-xs text-purple-500">Waived: {formatCurrency(fee.total_waived_amount)}</p>
                            )}
                          </div>
                        </td>
                        <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                          <p className="text-sm text-gray-600 dark:text-gray-300">{fee.session || 'N/A'}</p>
                        </td>
                        <td className="hidden xl:table-cell px-4 sm:px-6 py-4">
                          <p className="text-sm text-gray-600 dark:text-gray-300">{fee.term || 'N/A'}</p>
                        </td>
                        <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {getFeeClassName(fee)}
                          </p>
                          {fee.target_type === 'class' && fee.target_ids && fee.target_ids.length > 1 && (
                            <p className="text-xs text-gray-400">
                              {fee.target_ids.length} classes
                            </p>
                          )}
                          {fee.target_type === 'all' && (
                            <p className="text-xs text-gray-400">All Classes</p>
                          )}
                        </td>
                        <td className="hidden xl:table-cell px-4 sm:px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {fee.total_payments || 0}
                            </p>
                            <p className="text-xs text-gray-400">
                              {fee.total_students_paid || 0} students paid
                            </p>
                            {fee.total_waived_students > 0 && (
                              <p className="text-xs text-purple-400">
                                {fee.total_waived_students} waived
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(fee.status)}`}>
                            {fee.status === 'active' ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : fee.status === 'inactive' ? (
                              <XCircle className="w-3 h-3" />
                            ) : (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => toggleExpandFee(fee.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-gray-500 dark:text-gray-400"
                              title="Expand Details"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleViewFee(fee)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditFee(fee)}
                              className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all text-yellow-600 dark:text-yellow-400"
                              title="Edit Fee"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleFeeStatus(fee)}
                              disabled={processing}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-gray-500 dark:text-gray-400"
                              title={fee.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              {fee.status === 'active' ? (
                                <Archive className="w-4 h-4" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedFee(fee);
                                setShowDeleteModal(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-600 dark:text-red-400"
                              title="Delete Fee"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row - Shows Breakdown and Waiver Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-700/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Breakdown Items */}
                              {hasBreakdown && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-indigo-500" />
                                    Fee Breakdown
                                    <span className="text-xs text-gray-400">({breakdownItems.length} items)</span>
                                  </h4>
                                  <div className="space-y-2">
                                    {breakdownItems.map((item: any, index: number) => (
                                      <div key={index} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-1">
                                        <span className="text-gray-600 dark:text-gray-300">{item.item_name || 'Item'}</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.amount || 0)}</span>
                                      </div>
                                    ))}
                                    <div className="flex items-center justify-between text-sm font-bold pt-2 border-t-2 border-gray-200 dark:border-gray-600">
                                      <span className="text-gray-900 dark:text-white">Total</span>
                                      <span className="text-indigo-600 dark:text-indigo-400">
                                        {formatCurrency(breakdownItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0))}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Waiver Details - With Student Name and Item */}
                              {hasWaiver && waiverRecords.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Gift className="w-4 h-4 text-purple-500" />
                                    Waiver Details
                                    <span className="text-xs text-gray-400">({waiverRecords.length} student{waiverRecords.length > 1 ? 's' : ''})</span>
                                  </h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm pb-2 border-b border-gray-100 dark:border-gray-700">
                                      <span className="text-gray-500 dark:text-gray-400">Total Waived Amount</span>
                                      <span className="font-bold text-purple-600 dark:text-purple-400">
                                        {formatCurrency(fee.total_waived_amount || 0)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm pb-2 border-b border-gray-100 dark:border-gray-700">
                                      <span className="text-gray-500 dark:text-gray-400">Waived Students</span>
                                      <span className="font-medium text-gray-900 dark:text-white">{waiverRecords.length}</span>
                                    </div>
                                    <div className="mt-2 pt-2">
                                      <p className="text-xs text-gray-400 mb-2">Recent Waivers</p>
                                      <div className="space-y-2">
                                        {waiverRecords.slice(0, 5).map((waiver: WaiverRecord, index: number) => (
                                          <div key={index} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-medium text-xs flex-shrink-0">
                                                  {getInitials(waiver.student_name)}
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate">
                                                    {waiver.student_name || 'Unknown Student'}
                                                  </p>
                                                  <div className="flex items-center gap-1">
                                                    <Tag className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium truncate">
                                                      {waiver.breakdown_item || 'Full Fee'}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                              <span className="font-semibold text-purple-600 dark:text-purple-400 flex-shrink-0 ml-2 text-sm">
                                                -{formatCurrency(waiver.amount || 0)}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                        {waiverRecords.length > 5 && (
                                          <p className="text-xs text-gray-400 mt-1 text-center">
                                            + {waiverRecords.length - 5} more waivers
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* No Breakdown and No Waiver */}
                              {!hasBreakdown && !hasWaiver && (
                                <div className="col-span-2 text-center py-4 text-gray-500 dark:text-gray-400">
                                  <p className="text-sm">No additional details available for this fee</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Fee</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">{selectedFee.name}</span>? This action cannot be undone.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Fee ID:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedFee.fee_id}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedFee.amount)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500 dark:text-gray-400">Category:</span>
                <span className="font-medium text-gray-900 dark:text-white">{categoryLabels[selectedFee.category] || selectedFee.category}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500 dark:text-gray-400">Class:</span>
                <span className="font-medium text-gray-900 dark:text-white">{getFeeClassName(selectedFee)}</span>
              </div>
              {selectedFee.total_waived_amount > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500 dark:text-gray-400">Waived:</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">{formatCurrency(selectedFee.total_waived_amount)}</span>
                </div>
              )}
              {selectedFee.session && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500 dark:text-gray-400">Session:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedFee.session}</span>
                </div>
              )}
              {selectedFee.term && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500 dark:text-gray-400">Term:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedFee.term}</span>
                </div>
              )}
              {(selectedFee.total_payments || 0) > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500 dark:text-gray-400">Payments:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedFee.total_payments} payments</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedFee(null);
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFee}
                disabled={processing}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default FeesList;