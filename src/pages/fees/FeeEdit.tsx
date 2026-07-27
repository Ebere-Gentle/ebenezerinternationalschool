import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Save,
  X,
  Coins
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import toast from 'react-hot-toast';

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

const FeeEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Fee>>({
    name: '',
    description: '',
    amount: 0,
    category: '',
    class_id: null,
    due_date: null,
    late_fee_amount: 0,
    installment_allowed: false,
    number_of_installments: 1,
    is_mandatory: true,
    is_optional: false,
    is_recurring: false,
    recurrence_period: null,
    status: 'active',
  });

  useEffect(() => {
    if (id) {
      fetchFee();
    }
  }, [id]);

  const fetchFee = async () => {
    try {
      const { data, error } = await supabase
        .from('fees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        name: data.name,
        description: data.description,
        amount: data.amount,
        category: data.category,
        class_id: data.class_id,
        due_date: data.due_date,
        late_fee_amount: data.late_fee_amount,
        installment_allowed: data.installment_allowed,
        number_of_installments: data.number_of_installments,
        is_mandatory: data.is_mandatory,
        is_optional: data.is_optional,
        is_recurring: data.is_recurring,
        recurrence_period: data.recurrence_period,
        status: data.status,
      });
    } catch (error: any) {
      console.error('Error fetching fee:', error);
      toast.error(error.message || 'Failed to load fee');
      navigate('/fees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('fees')
        .update({
          name: formData.name,
          description: formData.description,
          amount: formData.amount,
          category: formData.category,
          class_id: formData.class_id,
          due_date: formData.due_date,
          late_fee_amount: formData.late_fee_amount,
          installment_allowed: formData.installment_allowed,
          number_of_installments: formData.number_of_installments,
          is_mandatory: formData.is_mandatory,
          is_optional: formData.is_optional,
          is_recurring: formData.is_recurring,
          recurrence_period: formData.recurrence_period,
          status: formData.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Fee updated successfully');
      navigate(`/fees/${id}`);
    } catch (error: any) {
      console.error('Error updating fee:', error);
      toast.error(error.message || 'Failed to update fee');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Fee, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/fees/${id}`)}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Fee</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Update fee structure details
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fee Name *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <select
                value={formData.category || ''}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                required
              >
                <option value="">Select Category</option>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount (NGN) *
              </label>
              <input
                type="number"
                value={formData.amount || 0}
                onChange={(e) => handleChange('amount', parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                required
                min="0"
                step="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Late Fee Amount (NGN)
              </label>
              <input
                type="number"
                value={formData.late_fee_amount || 0}
                onChange={(e) => handleChange('late_fee_amount', parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                min="0"
                step="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date || ''}
                onChange={(e) => handleChange('due_date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status || 'active'}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                placeholder="Describe the fee structure..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={formData.is_mandatory || false}
                onChange={(e) => handleChange('is_mandatory', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Mandatory
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={formData.is_optional || false}
                onChange={(e) => handleChange('is_optional', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Optional
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={formData.is_recurring || false}
                onChange={(e) => handleChange('is_recurring', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Recurring
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={formData.installment_allowed || false}
                onChange={(e) => handleChange('installment_allowed', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Installments
            </label>
          </div>

          {formData.is_recurring && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Recurrence Period
              </label>
              <select
                value={formData.recurrence_period || ''}
                onChange={(e) => handleChange('recurrence_period', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
              >
                <option value="">Select Period</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="termly">Termly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
          )}

          {formData.installment_allowed && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Number of Installments
              </label>
              <input
                type="number"
                value={formData.number_of_installments || 1}
                onChange={(e) => handleChange('number_of_installments', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                min="1"
                max="12"
              />
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate(`/fees/${id}`)}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Update Fee
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeeEdit;
