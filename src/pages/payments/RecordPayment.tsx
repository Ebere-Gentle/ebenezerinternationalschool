import React, { useState, useEffect, useRef } from 'react';
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
  CreditCard,
  User,
  DollarSign,
  Building,
  Banknote,
  Smartphone,
  Wallet,
  Loader2,
  CheckCircle,
  Info,
  X,
  Save,
  Upload,
  Image,
  File,
  Eye
} from 'lucide-react';

// Types
interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
}

interface Fee {
  id: string;
  name: string;
  amount: number;
  category: string;
  description: string;
}

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'uploading' | 'uploaded' | 'error';
  url?: string;
  name: string;
  size: number;
  type: string;
}

// Zod Schema
const paymentSchema = z.object({
  student_id: z.string().min(1, 'Please select a student'),
  fee_id: z.string().min(1, 'Please select a fee'),
  amount_paid: z.number().min(1, 'Amount must be greater than 0'),
  payment_method: z.string().min(1, 'Please select a payment method'),
  payment_date: z.string().min(1, 'Payment date is required'),
  due_date: z.string().optional(),
  transaction_reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const RecordPayment: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [feesLoading, setFeesLoading] = useState(false);
  const [branchId, setBranchId] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_date: dayjs().format('YYYY-MM-DD'),
      due_date: dayjs().add(30, 'days').format('YYYY-MM-DD'),
      payment_method: 'cash',
    },
  });

  const watchedStudentId = watch('student_id');
  const watchedFeeId = watch('fee_id');
  const watchedAmount = watch('amount_paid');

  // Load user branch
  useEffect(() => {
    const getBranch = async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from('users')
          .select('branch_id')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setBranchId(data.branch_id);
          loadStudents(data.branch_id);
          loadFees(data.branch_id);
        }
      }
    };
    getBranch();
  }, [user]);

  // Load students
  const loadStudents = async (branchId: string) => {
    setStudentLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          admission_number,
          classes!fk_students_class (name)
        `)
        .eq('branch_id', branchId)
        .eq('current_status', 'active')
        .order('first_name');

      if (error) throw error;

      const formattedStudents = data?.map((item: any) => ({
        ...item,
        class_name: item.classes?.name || 'N/A',
      })) || [];

      setStudents(formattedStudents);
    } catch (error: any) {
      console.error('Error loading students:', error);
      toast.error(error.message || 'Failed to load students');
    } finally {
      setStudentLoading(false);
    }
  };

  // Load fees
  const loadFees = async (branchId: string) => {
    setFeesLoading(true);
    try {
      const { data, error } = await supabase
        .from('fees')
        .select('id, name, amount, category, description')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setFees(data || []);
    } catch (error: any) {
      console.error('Error loading fees:', error);
      toast.error(error.message || 'Failed to load fees');
    } finally {
      setFeesLoading(false);
    }
  };

  // Handle student selection
  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setValue('student_id', student.id);
    setShowStudentDropdown(false);
    setSearchStudent(`${student.first_name} ${student.last_name} (${student.admission_number})`);
  };

  // Handle fee selection
  const handleFeeSelect = (fee: Fee) => {
    setSelectedFee(fee);
    setValue('fee_id', fee.id);
    setValue('amount_paid', fee.amount);
  };

  // Filter students based on search
  const filteredStudents = students.filter(student =>
    `${student.first_name} ${student.last_name} ${student.admission_number}`
      .toLowerCase()
      .includes(searchStudent.toLowerCase())
  );

  // Generate receipt number
  const generateReceiptNumber = async () => {
    try {
      const year = dayjs().format('YYYY');
      const { count, error } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .like('receipt_number', `REC-${year}%`);

      if (error) throw error;
      const sequence = (count || 0) + 1;
      return `REC-${year}-${String(sequence).padStart(5, '0')}`;
    } catch (error) {
      console.error('Error generating receipt number:', error);
      return `REC-${dayjs().format('YYYY')}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
    }
  };

  // Generate payment ID
  const generatePaymentId = async () => {
    try {
      const year = dayjs().format('YYYY');
      const { count, error } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .like('payment_id', `PAY-${year}%`);

      if (error) throw error;
      const sequence = (count || 0) + 1;
      return `PAY-${year}-${String(sequence).padStart(5, '0')}`;
    } catch (error) {
      console.error('Error generating payment ID:', error);
      return `PAY-${dayjs().format('YYYY')}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
    }
  };

  // Handle file upload
  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'uploading',
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Upload files to Supabase Storage
    newFiles.forEach((fileData) => {
      uploadFileToStorage(fileData);
    });
  };

  const uploadFileToStorage = async (fileData: UploadedFile) => {
    try {
      const filePath = `payments/${branchId}/${fileData.id}/${fileData.file.name}`;
      
      const { data, error } = await supabase.storage
        .from('payment_proofs')
        .upload(filePath, fileData.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('payment_proofs')
        .getPublicUrl(filePath);

      // Update file status
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileData.id
            ? { ...f, status: 'uploaded', url: urlData.publicUrl, progress: 100 }
            : f
        )
      );

      toast.success(`File uploaded: ${fileData.file.name}`);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileData.id ? { ...f, status: 'error' } : f
        )
      );
      toast.error(`Failed to upload: ${fileData.file.name}`);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Submit handler
  const onSubmit = async (data: PaymentFormData) => {
    if (!branchId) {
      toast.error('No branch assigned. Please contact administrator.');
      return;
    }

    // Check if any files are still uploading
    const uploadingFiles = uploadedFiles.filter(f => f.status === 'uploading');
    if (uploadingFiles.length > 0) {
      toast.error('Please wait for files to finish uploading');
      return;
    }

    setSubmitting(true);
    try {
      const receiptNumber = await generateReceiptNumber();
      const paymentId = await generatePaymentId();

      // Get the selected fee amount
      const fee = fees.find(f => f.id === data.fee_id);
      const feeAmount = fee?.amount || data.amount_paid;

      // Calculate balance
      const balance = feeAmount - data.amount_paid;

      // Get uploaded file URLs
      const fileUrls = uploadedFiles
        .filter(f => f.status === 'uploaded' && f.url)
        .map(f => f.url);

      const paymentData = {
        payment_id: paymentId,
        receipt_number: receiptNumber,
        student_id: data.student_id,
        fee_id: data.fee_id,
        amount: feeAmount,
        amount_paid: data.amount_paid,
        balance: balance,
        payment_method: data.payment_method,
        payment_date: data.payment_date,
        due_date: data.due_date || null,
        status: balance === 0 ? 'completed' : 'pending',
        transaction_reference: data.transaction_reference || null,
        payment_proof_url: fileUrls.length > 0 ? fileUrls.join(',') : null,
        branch_id: branchId,
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          notes: data.notes || null,
          created_by: user?.email || 'System',
          files: uploadedFiles.map(f => ({
            name: f.name,
            size: f.size,
            type: f.type,
            url: f.url,
          })),
        },
      };

      const { error } = await supabase
        .from('payments')
        .insert([paymentData]);

      if (error) throw error;

      toast.success(`Payment recorded successfully! Receipt: ${receiptNumber}`);
      
      // Clean up file previews
      uploadedFiles.forEach(f => URL.revokeObjectURL(f.preview));
      
      reset();
      setSelectedStudent(null);
      setSelectedFee(null);
      setSearchStudent('');
      setUploadedFiles([]);
      navigate('/payments');
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: Banknote },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: Building },
    { value: 'card', label: 'Card', icon: CreditCard },
    { value: 'pos', label: 'POS', icon: Smartphone },
    { value: 'wallet', label: 'Wallet', icon: Wallet },
  ];

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
            onClick={() => navigate('/payments')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Record Payment</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Record a new payment from a student
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              reset();
              setSelectedStudent(null);
              setSelectedFee(null);
              setSearchStudent('');
              setUploadedFiles([]);
            }}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <X className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Payment Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Student Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Student *
              </label>
              <div className="relative">
                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all bg-white dark:bg-gray-900">
                  <User className="w-5 h-5 ml-3 text-gray-400" />
                  <input
                    type="text"
                    value={searchStudent}
                    onChange={(e) => {
                      setSearchStudent(e.target.value);
                      setShowStudentDropdown(true);
                      if (!e.target.value) {
                        setSelectedStudent(null);
                        setValue('student_id', '');
                      }
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    placeholder="Search student by name or admission number..."
                    className="w-full px-3 py-2.5 bg-transparent focus:outline-none dark:text-white"
                    disabled={studentLoading}
                  />
                  {studentLoading && (
                    <Loader2 className="w-5 h-5 mr-3 text-gray-400 animate-spin" />
                  )}
                  {selectedStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(null);
                        setSearchStudent('');
                        setValue('student_id', '');
                      }}
                      className="mr-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>

                {/* Student Dropdown */}
                {showStudentDropdown && searchStudent && !studentLoading && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {filteredStudents.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No students found
                      </div>
                    ) : (
                      filteredStudents.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => handleStudentSelect(student)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {student.admission_number} • {student.class_name}
                            </p>
                          </div>
                          {watchedStudentId === student.id && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {errors.student_id && (
                <p className="mt-1 text-sm text-red-500">{errors.student_id.message}</p>
              )}
              {selectedStudent && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Selected: <span className="font-semibold">{selectedStudent.first_name} {selectedStudent.last_name}</span>
                    <span className="ml-2 text-gray-500">({selectedStudent.admission_number})</span>
                  </p>
                </div>
              )}
            </div>

            {/* Fee Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Fee *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <select
                    {...register('fee_id')}
                    onChange={(e) => {
                      const fee = fees.find(f => f.id === e.target.value);
                      if (fee) handleFeeSelect(fee);
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl border ${
                      errors.fee_id ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                    } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                    disabled={feesLoading}
                  >
                    <option value="">{feesLoading ? 'Loading fees...' : 'Select Fee'}</option>
                    {fees.map((fee) => (
                      <option key={fee.id} value={fee.id}>
                        {fee.name} - ₦{fee.amount.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {errors.fee_id && (
                    <p className="mt-1 text-sm text-red-500">{errors.fee_id.message}</p>
                  )}
                  {fees.length === 0 && !feesLoading && (
                    <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                      No active fees found. Please create a fee first.
                    </p>
                  )}
                </div>
                {selectedFee && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fee Details</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedFee.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Amount: ₦{selectedFee.amount.toLocaleString()}
                    </p>
                    {selectedFee.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedFee.description}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Amount Paid *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    {...register('amount_paid', { valueAsNumber: true })}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                      errors.amount_paid ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                    } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount_paid && (
                  <p className="mt-1 text-sm text-red-500">{errors.amount_paid.message}</p>
                )}
                {selectedFee && watchedAmount && watchedAmount > selectedFee.amount && (
                  <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                    Amount exceeds fee amount. Balance will be negative.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Balance
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={selectedFee && watchedAmount ? 
                      `₦${(selectedFee.amount - watchedAmount).toLocaleString()}` : 
                      '₦0'
                    }
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed dark:text-white"
                  />
                </div>
                {selectedFee && watchedAmount && (
                  <p className={`mt-1 text-sm ${
                    selectedFee.amount - watchedAmount === 0 ? 'text-green-600' :
                    selectedFee.amount - watchedAmount < 0 ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {selectedFee.amount - watchedAmount === 0 ? '✅ Fully paid' :
                     selectedFee.amount - watchedAmount < 0 ? '⚠️ Overpayment' :
                     `${(selectedFee.amount - watchedAmount).toLocaleString()} remaining`}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Method & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Payment Method *
                </label>
                <select
                  {...register('payment_method')}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    errors.payment_method ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
                {errors.payment_method && (
                  <p className="mt-1 text-sm text-red-500">{errors.payment_method.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Payment Date *
                </label>
                <input
                  type="date"
                  {...register('payment_date')}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    errors.payment_date ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                />
                {errors.payment_date && (
                  <p className="mt-1 text-sm text-red-500">{errors.payment_date.message}</p>
                )}
              </div>
            </div>

            {/* Due Date & Reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Transaction Reference
                </label>
                <input
                  type="text"
                  {...register('transaction_reference')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  placeholder="Enter transaction reference"
                />
              </div>
            </div>

            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Payment Proof / Documents
              </label>
              
              {/* Upload Zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Drag & drop files here or click to browse
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Supports: Images, PDF, Word, Excel (Max 10MB each)
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                >
                  Browse Files
                </button>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file) => {
                    const FileIcon = getFileIcon(file.type);
                    const isUploading = file.status === 'uploading';
                    const isError = file.status === 'error';
                    const isUploaded = file.status === 'uploaded';

                    return (
                      <div
                        key={file.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border ${
                          isError
                            ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                            : isUploaded
                            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                            : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${
                          isError
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : isUploaded
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          {file.type.startsWith('image/') ? (
                            <img
                              src={file.preview}
                              alt={file.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <FileIcon className={`w-6 h-6 ${
                              isError
                                ? 'text-red-500'
                                : isUploaded
                                ? 'text-green-500'
                                : 'text-gray-500'
                            }`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)}
                            {isUploading && ' • Uploading...'}
                            {isError && ' • Upload failed'}
                            {isUploaded && ' • Uploaded ✓'}
                          </p>
                          {isUploading && (
                            <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {isUploaded && file.url && (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all"
                              title="View file"
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-all text-red-500"
                            disabled={isUploading}
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Notes
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                placeholder="Additional notes about this payment..."
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p>• Receipt number and payment ID will be generated automatically.</p>
                <p>• Payment status will be set to "Completed" if full amount is paid.</p>
                <p>• Partial payments will be marked as "Pending".</p>
                <p>• Upload payment proof or receipt for verification.</p>
                <p>• All payments are recorded in the selected branch.</p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate('/payments')}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedStudent || !selectedFee}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Record Payment
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

export default RecordPayment;
