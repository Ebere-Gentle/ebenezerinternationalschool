import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  Info,
  Loader2,
  Save,
  Users,
  Plus,
  X,
  CheckCircle2,
  Circle,
  AlertCircle
} from 'lucide-react';

// Zod Schema
const feeSchema = z.object({
  name: z.string().min(2, 'Fee name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  amount: z.number().min(0, 'Amount must be greater than 0'),
  class_ids: z.array(z.string()).optional().default([]),
  due_date: z.string().optional().nullable(),
  late_fee_amount: z.number().min(0, 'Late fee cannot be negative').default(0),
  installment_allowed: z.boolean().default(false),
  number_of_installments: z.number().min(1).max(12).default(1),
  is_mandatory: z.boolean().default(true),
  is_optional: z.boolean().default(false),
  is_recurring: z.boolean().default(false),
  recurrence_period: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
});

type FeeFormData = z.infer<typeof feeSchema>;

const CreateFee: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; code: string; level: string }>>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [branchId, setBranchId] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [showAllClassesSelected, setShowAllClassesSelected] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FeeFormData>({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      status: 'active',
      is_mandatory: true,
      is_optional: false,
      is_recurring: false,
      installment_allowed: false,
      number_of_installments: 1,
      late_fee_amount: 0,
      class_ids: [],
    },
  });

  const isRecurring = watch('is_recurring');
  const installmentAllowed = watch('installment_allowed');

  // Load user branch and classes
  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from('users')
          .select('branch_id')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setBranchId(data.branch_id);
          loadClasses(data.branch_id);
        }
      }
    };
    loadData();
  }, [user]);

  const loadClasses = async (branchId: string) => {
    setLoadingClasses(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, code, level')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      console.error('Error loading classes:', error);
      toast.error(error.message || 'Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClasses(prev => {
      const newSelection = prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId];
      setValue('class_ids', newSelection);
      setShowAllClassesSelected(false);
      return newSelection;
    });
  };

  // Clear all class selections
  const clearAllClasses = () => {
    setSelectedClasses([]);
    setValue('class_ids', []);
    setShowAllClassesSelected(false);
  };

  // Select all classes
  const selectAllClasses = () => {
    const allClassIds = classes.map(c => c.id);
    setSelectedClasses(allClassIds);
    setValue('class_ids', allClassIds);
    setShowAllClassesSelected(false);
  };

  // Quick selection for "All Classes"
  const applyToAllClasses = () => {
    setSelectedClasses([]);
    setValue('class_ids', []);
    setShowAllClassesSelected(true);
  };

  // Check if all classes are selected
  const allClassesSelected = selectedClasses.length === classes.length && classes.length > 0;

  const generateFeeId = async () => {
    try {
      const year = dayjs().format('YYYY');
      const { count, error } = await supabase
        .from('fees')
        .select('id', { count: 'exact', head: true })
        .like('fee_id', `FEE-${year}%`);

      if (error) throw error;
      const sequence = (count || 0) + 1;
      return `FEE-${year}-${String(sequence).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating fee ID:', error);
      return `FEE-${dayjs().format('YYYY')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    }
  };

  const onSubmit = async (data: FeeFormData) => {
    if (!branchId) {
      toast.error('No branch assigned. Please contact administrator.');
      return;
    }

    setSubmitting(true);
    try {
      const feeId = await generateFeeId();

      const feeData = {
        fee_id: feeId,
        branch_id: branchId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        category: data.category,
        amount: data.amount,
        class_id: data.class_ids && data.class_ids.length > 0 ? data.class_ids[0] : null,
        due_date: data.due_date || null,
        late_fee_amount: data.late_fee_amount || 0,
        installment_allowed: data.installment_allowed,
        number_of_installments: data.installment_allowed ? data.number_of_installments : 1,
        is_mandatory: data.is_mandatory,
        is_optional: data.is_optional,
        is_recurring: data.is_recurring,
        recurrence_period: data.is_recurring ? data.recurrence_period : null,
        status: data.status,
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          created_by: user?.email || 'System',
          branch: branchId,
          class_ids: data.class_ids || [],
        },
      };

      const { error } = await supabase
        .from('fees')
        .insert([feeData]);

      if (error) throw error;

      const message = showAllClassesSelected || selectedClasses.length === 0 
        ? `Fee created successfully and applied to ALL classes! ID: ${feeId}`
        : `Fee created successfully for ${selectedClasses.length} class${selectedClasses.length > 1 ? 'es' : ''}! ID: ${feeId}`;

      toast.success(message);
      navigate('/fees');
    } catch (error: any) {
      console.error('Error creating fee:', error);
      toast.error(error.message || 'Failed to create fee');
    } finally {
      setSubmitting(false);
    }
  };

  // Fee categories from the enum
  const feeCategories = [
    { value: 'school_fees', label: 'School Fees' },
    { value: 'books', label: 'Books' },
    { value: 'uniform', label: 'Uniform' },
    { value: 'sportswear', label: 'Sportswear' },
    { value: 'bus', label: 'Bus' },
    { value: 'pta', label: 'PTA' },
    { value: 'examination', label: 'Examination' },
    { value: 'medical', label: 'Medical' },
    { value: 'graduation', label: 'Graduation' },
    { value: 'development_levy', label: 'Development Levy' },
    { value: 'identity_card', label: 'Identity Card' },
    { value: 'excursion', label: 'Excursion' },
    { value: 'hostel', label: 'Hostel' },
    { value: 'laboratory', label: 'Laboratory' },
    { value: 'lesson_fee', label: 'Lesson Fee' },
    { value: 'extra_classes', label: 'Extra Classes' },
    { value: 'custom', label: 'Custom' },
  ];

  // Get selected class names for display
  const getSelectedClassNames = () => {
    if (showAllClassesSelected || selectedClasses.length === 0) {
      return 'All Classes';
    }
    const selectedNames = classes
      .filter(c => selectedClasses.includes(c.id))
      .map(c => c.name)
      .join(', ');
    
    if (selectedNames.length > 30) {
      return `${selectedNames.substring(0, 30)}...`;
    }
    return selectedNames;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/fees')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Fee</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Create a new fee structure
            </p>
          </div>
        </div>
      </div>

      {/* Fee Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Fee Name *
                  </label>
                  <input
                    {...register('name')}
                    className={`w-full px-4 py-2.5 rounded-xl border ${
                      errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                    } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                    placeholder="e.g., Termly School Fees"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Category *
                  </label>
                  <select
                    {...register('category')}
                    className={`w-full px-4 py-2.5 rounded-xl border ${
                      errors.category ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                    } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                  >
                    <option value="">Select Category</option>
                    {feeCategories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-500">{errors.category.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  placeholder="Detailed description of the fee..."
                />
              </div>
            </div>

            {/* Financial Details */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financial Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Amount *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      {...register('amount', { valueAsNumber: true })}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                        errors.amount ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                      } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-500">{errors.amount.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Late Fee
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      {...register('late_fee_amount', { valueAsNumber: true })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    {...register('due_date')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Class Assignment - Enhanced UI */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Class Assignment</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Select specific classes or apply to all
                  </p>
                </div>
                {selectedClasses.length > 0 && !showAllClassesSelected && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {selectedClasses.length} selected
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={applyToAllClasses}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    showAllClassesSelected
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                      : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {showAllClassesSelected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Applied to All Classes
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4" />
                        Apply to All Classes
                      </>
                    )}
                  </span>
                </button>

                {!showAllClassesSelected && classes.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={selectAllClasses}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 transition-all"
                    >
                      Select All {classes.length}
                    </button>
                    {selectedClasses.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllClasses}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 transition-all"
                      >
                        Clear All
                      </button>
                    )}
                  </>
                )}

                {showAllClassesSelected && (
                  <button
                    type="button"
                    onClick={clearAllClasses}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 transition-all"
                  >
                    Select Specific Classes
                  </button>
                )}
              </div>

              {/* Selected Classes Summary */}
              {(selectedClasses.length > 0 || showAllClassesSelected) && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <Info className="w-4 h-4" />
                    <span>
                      <strong>Fee will be applied to:</strong>{' '}
                      {showAllClassesSelected ? (
                        <span className="font-semibold">ALL {classes.length} classes</span>
                      ) : (
                        <span className="font-semibold">{getSelectedClassNames()}</span>
                      )}
                      {selectedClasses.length === 0 && !showAllClassesSelected && (
                        <span className="text-gray-500 dark:text-gray-400 ml-2">
                          (No classes selected - will apply to ALL classes)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Class List */}
              {!showAllClassesSelected && (
                <>
                  {loadingClasses ? (
                    <div className="flex items-center gap-2 text-gray-500 py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading classes...
                    </div>
                  ) : classes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No classes available</p>
                      <p className="text-sm">Create classes first before assigning fees</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {classes.map((cls) => (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => handleClassToggle(cls.id)}
                          className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                            selectedClasses.includes(cls.id)
                              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-600 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{cls.name}</span>
                            {selectedClasses.includes(cls.id) ? (
                              <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 ml-1" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300 flex-shrink-0 ml-1" />
                            )}
                          </div>
                          <span className="text-xs text-gray-400">{cls.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Help Text */}
              <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <span className="font-medium">Pro Tip:</span> Leave all classes unselected or click 
                  "Apply to All Classes" to apply this fee to every class in the branch. 
                  This is perfect for school-wide fees like development levy or PTA fees.
                </p>
              </div>
            </div>

            {/* Settings */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('is_mandatory')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Mandatory Fee</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('is_optional')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Optional Fee</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('is_recurring')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Recurring Fee</span>
                  </label>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('installment_allowed')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Allow Installments</span>
                  </label>
                  {installmentAllowed && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Number of Installments
                      </label>
                      <select
                        {...register('number_of_installments', { valueAsNumber: true })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      >
                        {[2, 3, 4, 6, 12].map((num) => (
                          <option key={num} value={num}>{num} installments</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {isRecurring && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Recurrence Period
                      </label>
                      <select
                        {...register('recurrence_period')}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      >
                        <option value="">Select Period</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="termly">Termly</option>
                        <option value="annually">Annually</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status</h3>
              <div>
                <select
                  {...register('status')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Info Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p>• Fee ID will be generated automatically.</p>
                <p>• Select multiple classes or use "Apply to All" for school-wide fees.</p>
                <p>• Set fee as mandatory or optional based on requirements.</p>
                <p>• Installments allow students to pay in parts.</p>
                <p>• Recurring fees repeat automatically.</p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate('/fees')}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Fee
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default CreateFee;