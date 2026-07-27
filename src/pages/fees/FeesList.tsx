import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Coins, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  DollarSign,
  Calendar,
  Building,
  Tag,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Archive,
  FileText
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
}

// Category labels mapping
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

const FeesList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [processing, setProcessing] = useState(false);

  const pageSize = 10;

  useEffect(() => {
    fetchFees();
  }, [currentPage, searchTerm, statusFilter, categoryFilter]);

  const fetchFees = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('fees')
        .select(`
          *,
          classes!fk_fees_class (
            name
          ),
          branches!fk_fees_branch (
            school_name
          )
        `, { count: 'exact' });

      if (user?.branch_id) {
        query = query.eq('branch_id', user.branch_id);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
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

      const formattedFees = data?.map((item: any) => ({
        ...item,
        class_name: item.classes?.name || 'All Classes',
        branch_name: item.branches?.school_name || 'N/A',
      })) || [];

      setFees(formattedFees);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fee Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage fee structures and categories
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Fees</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {fees.filter(f => f.status === 'active').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Inactive</p>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {fees.filter(f => f.status === 'inactive').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Recurring</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {fees.filter(f => f.is_recurring).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
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
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => {
              setStatusFilter('all');
              setCategoryFilter('all');
              setSearchTerm('');
            }}
            className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fees Table */}
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
                  Class
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                  </td>
                </tr>
              ) : fees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
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
                fees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
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
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-300">{fee.class_name}</p>
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
                    <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {fee.due_date ? dayjs(fee.due_date).format('MMM D, YYYY') : 'N/A'}
                      </p>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
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
                ))
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesList;
