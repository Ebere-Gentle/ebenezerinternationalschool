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
  Eye,
  AlertTriangle,
  Calendar,
  Clock
} from 'lucide-react';

// Types
interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
}

interface FeeAssignment {
  id: string;
  fee_id: string;
  fee_name: string;
  fee_category: string;
  fee_description: string;
  original_amount: number;
  discount_amount: number;
  amount_due: number;
  amount_paid: number;
  balance: number;
  payment_status: string;
  due_date: string;
  is_active: boolean;
  session_id?: string;
  term_id?: string;
  session_name?: string;
  term_name?: string;
  academic_session?: string;
  academic_term?: string;
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
  storage_path?: string;
}

// Zod Schema
const paymentSchema = z.object({
  student_id: z.string().min(1, 'Please select a student'),
  assignment_id: z.string().min(1, 'Please select a fee to pay'),
  amount_paid: z.number().min(1, 'Amount must be greater than 0'),
  payment_method: z.string().min(1, 'Please select a payment method'),
  payment_date: z.string().min(1, 'Payment date is required'),
  transaction_reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface RecordPaymentProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  redirectTo?: string;
}

const RecordPayment: React.FC<RecordPaymentProps> = ({ 
  onSuccess, 
  onCancel,
  redirectTo = '/payments'
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<FeeAssignment[]>([]);
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<FeeAssignment | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [branchId, setBranchId] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
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
      payment_method: 'cash',
    },
  });

  const watchedStudentId = watch('student_id');
  const watchedAssignmentId = watch('assignment_id');
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
          classes:class_id (name)
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

  // Load student's fee assignments - ONLY UNPAID OR PARTIALLY PAID
  const loadStudentAssignments = async (studentId: string) => {
    setAssignmentsLoading(true);
    setAssignments([]);
    setSelectedAssignment(null);
    setValue('assignment_id', '');
    
    try {
      const { data, error } = await supabase
        .from('student_fee_assignments')
        .select(`
          id,
          fee_id,
          original_amount,
          discount_amount,
          amount_due,
          amount_paid,
          balance,
          payment_status,
          due_date,
          is_active,
          term,
          session,
          academic_session_id,
          fees!inner (
            id,
            name,
            category,
            description
          )
        `)
        .eq('student_id', studentId)
        .eq('is_active', true)
        .neq('payment_status', 'paid')
        .order('due_date', { ascending: true });

      if (error) throw error;

      const formattedAssignments = (data || []).map((item: any) => {
        const sessionName = item.session || 'N/A';
        const termName = item.term || 'N/A';
        
        return {
          id: item.id,
          fee_id: item.fee_id,
          fee_name: item.fees?.name || 'Unknown Fee',
          fee_category: item.fees?.category || 'N/A',
          fee_description: item.fees?.description || '',
          original_amount: item.original_amount,
          discount_amount: item.discount_amount || 0,
          amount_due: item.amount_due,
          amount_paid: item.amount_paid || 0,
          balance: item.balance,
          payment_status: item.payment_status,
          due_date: item.due_date,
          is_active: item.is_active,
          session_id: item.academic_session_id,
          term_id: null,
          session_name: sessionName,
          term_name: termName,
          academic_session: sessionName,
          academic_term: termName,
        };
      });

      setAssignments(formattedAssignments);
      
      if (formattedAssignments.length === 0) {
        toast('No outstanding fee assignments found for this student. All fees are paid!');
      }
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      toast.error(error.message || 'Failed to load fee assignments');
    } finally {
      setAssignmentsLoading(false);
    }
  };

  // Handle student selection
  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setValue('student_id', student.id);
    setShowStudentDropdown(false);
    setSearchStudent(`${student.first_name} ${student.last_name} (${student.admission_number})`);
    loadStudentAssignments(student.id);
  };

  // Handle assignment selection
  const handleAssignmentSelect = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      setSelectedAssignment(assignment);
      setValue('assignment_id', assignmentId);
      setValue('amount_paid', assignment.balance);
    }
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
      const { data, error } = await supabase.rpc('generate_receipt_number', {
        p_prefix: 'REC',
        p_year: year
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating receipt number:', error);
      const timestamp = Date.now().toString(36).toUpperCase();
      return `REC-${dayjs().format('YYYY')}-${timestamp}`;
    }
  };

  // Generate payment ID
  const generatePaymentId = async () => {
    try {
      const year = dayjs().format('YYYY');
      const { data, error } = await supabase.rpc('generate_payment_id', {
        p_prefix: 'PAY',
        p_year: year
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating payment ID:', error);
      const timestamp = Date.now().toString(36).toUpperCase();
      return `PAY-${dayjs().format('YYYY')}-${timestamp}`;
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

    newFiles.forEach((fileData) => {
      uploadFileToStorage(fileData);
    });
  };

  const uploadFileToStorage = async (fileData: UploadedFile) => {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session user:', session?.user?.email);
      console.log('Session user ID:', session?.user?.id);
      
      if (!session) {
        toast.error('You must be logged in to upload files');
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id ? { ...f, status: 'error' } : f
          )
        );
        return;
      }

      const timestamp = Date.now();
      const sanitizedName = fileData.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `payments/${branchId}/${fileData.id}/${timestamp}_${sanitizedName}`;
      
      console.log('Uploading file to bucket:', 'payment-proofs');
      console.log('File path:', filePath);
      console.log('File size:', fileData.file.size);
      console.log('File type:', fileData.file.type);

      // DO NOT try to create the bucket - it already exists!
      // Just upload directly to the bucket
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, fileData.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: fileData.file.type,
        });

      if (error) {
        console.error('Upload error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        let errorMessage = 'Upload failed: ';
        if (error.message?.includes('bucket not found')) {
          errorMessage += 'Storage bucket "payment-proofs" not found.';
        } else if (error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
          errorMessage += 'Permission denied. Please check storage policies.';
        } else if (error.message?.includes('duplicate')) {
          errorMessage += 'File already exists. Please try again with a different name.';
        } else {
          errorMessage += error.message;
        }
        
        toast.error(errorMessage);
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id ? { ...f, status: 'error' } : f
          )
        );
        return;
      }

      console.log('Upload success:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      console.log('Public URL:', urlData.publicUrl);

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileData.id
            ? { 
                ...f, 
                status: 'uploaded', 
                url: urlData.publicUrl,
                storage_path: filePath,
                progress: 100 
              }
            : f
        )
      );

      toast.success(`File uploaded: ${fileData.file.name}`);
    } catch (error: any) {
      console.error('Error in uploadFileToStorage:', error);
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileData.id ? { ...f, status: 'error' } : f
        )
      );
      toast.error(`Failed to upload: ${fileData.file.name} - ${error.message}`);
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
    const file = uploadedFiles.find(f => f.id === fileId);
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
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

  // Reset form function
  const resetForm = () => {
    reset();
    setSelectedStudent(null);
    setSelectedAssignment(null);
    setSearchStudent('');
    setAssignments([]);
    uploadedFiles.forEach(f => URL.revokeObjectURL(f.preview));
    setUploadedFiles([]);
  };

  // Submit handler
  const onSubmit = async (data: PaymentFormData) => {
    if (!branchId) {
      toast.error('No branch assigned. Please contact administrator.');
      return;
    }

    const uploadingFiles = uploadedFiles.filter(f => f.status === 'uploading');
    if (uploadingFiles.length > 0) {
      toast.error('Please wait for files to finish uploading');
      return;
    }

    if (selectedAssignment && data.amount_paid > selectedAssignment.balance) {
      toast.error(`Amount cannot exceed remaining balance of ₦${selectedAssignment.balance.toLocaleString()}`);
      return;
    }

    setSubmitting(true);
    try {
      let receiptNumber = '';
      let paymentId = '';
      let retries = 3;
      let success = false;

      while (retries > 0 && !success) {
        try {
          receiptNumber = await generateReceiptNumber();
          paymentId = await generatePaymentId();
          success = true;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const uploadedFilesData = uploadedFiles
        .filter(f => f.status === 'uploaded' && f.url)
        .map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
          url: f.url,
          storage_path: f.storage_path,
        }));

      const newBalance = (selectedAssignment?.balance || 0) - data.amount_paid;
      const isFullyPaid = newBalance <= 0;

      const paymentData = {
        payment_id: paymentId,
        receipt_number: receiptNumber,
        student_id: data.student_id,
        fee_id: selectedAssignment?.fee_id || null,
        assignment_id: data.assignment_id,
        amount: selectedAssignment?.amount_due || data.amount_paid,
        amount_paid: data.amount_paid,
        balance: Math.max(newBalance, 0),
        payment_method: data.payment_method,
        payment_date: data.payment_date,
        due_date: selectedAssignment?.due_date || null,
        status: isFullyPaid ? 'completed' : 'pending',
        transaction_reference: data.transaction_reference || null,
        payment_proof_url: uploadedFilesData.length > 0 ? uploadedFilesData.map(f => f.url).join(',') : null,
        receipt_url: uploadedFilesData.length > 0 ? uploadedFilesData[0].url : null,
        branch_id: branchId,
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          notes: data.notes || null,
          created_by: user?.email || 'System',
          files: uploadedFilesData,
          session: selectedAssignment?.session_name || null,
          term: selectedAssignment?.term_name || null,
          session_id: selectedAssignment?.session_id || null,
          term_id: selectedAssignment?.term_id || null,
        },
      };

      console.log('Inserting payment data:', paymentData);

      const { data: insertedData, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select();

      if (error) {
        console.error('Insert error:', error);
        
        if (error.code === '23505') {
          const newReceipt = await generateReceiptNumber();
          const newPaymentId = await generatePaymentId();
          
          paymentData.receipt_number = newReceipt;
          paymentData.payment_id = newPaymentId;
          
          const { error: retryError } = await supabase
            .from('payments')
            .insert([paymentData]);
            
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      const { error: updateError } = await supabase
        .from('student_fee_assignments')
        .update({
          amount_paid: (selectedAssignment?.amount_paid || 0) + data.amount_paid,
          balance: Math.max(newBalance, 0),
          payment_status: isFullyPaid ? 'paid' : 'partial',
        })
        .eq('id', data.assignment_id);

      if (updateError) {
        console.error('Error updating assignment:', updateError);
        toast.warning('Payment recorded but fee assignment update failed. Please check the balance manually.');
      }

      toast.success(`Payment recorded successfully! Receipt: ${receiptNumber}`);
      
      uploadedFiles.forEach(f => URL.revokeObjectURL(f.preview));
      resetForm();

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(redirectTo);
      }
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'partial':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'unpaid':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
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
          {(onCancel || redirectTo !== '/payments') && (
            <button
              onClick={() => {
                if (onCancel) {
                  onCancel();
                } else {
                  navigate(redirectTo);
                }
              }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Record Payment</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Record a payment against a student's outstanding fee
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetForm}
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
                        setAssignments([]);
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
                        setAssignments([]);
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
            </div>

            {/* Fee Assignment Selection */}
            {selectedStudent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Select Fee to Pay *
                </label>
                {assignmentsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="ml-3 text-gray-500">Loading assignments...</span>
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center">
                    <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
                    <p className="text-green-700 dark:text-green-300">
                      No outstanding fees! 🎉
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      This student has no unpaid or partially paid fees.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select
                      {...register('assignment_id')}
                      onChange={(e) => handleAssignmentSelect(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border ${
                        errors.assignment_id ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                      } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                    >
                      <option value="">Select a fee to pay</option>
                      {assignments.map((assignment) => (
                        <option key={assignment.id} value={assignment.id}>
                          {assignment.fee_name} - ₦{assignment.balance.toLocaleString()} remaining 
                          ({assignment.payment_status}) - {assignment.session_name} • {assignment.term_name}
                        </option>
                      ))}
                    </select>

                    {/* Selected Assignment Details */}
                    {selectedAssignment && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Fee</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {selectedAssignment.fee_name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Category</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {selectedAssignment.fee_category}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 border-t border-gray-200 dark:border-gray-600 pt-2">
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Session
                            </span>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {selectedAssignment.session_name || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Term
                            </span>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {selectedAssignment.term_name || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Original Amount</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            ₦{selectedAssignment.original_amount.toLocaleString()}
                          </span>
                        </div>
                        {selectedAssignment.discount_amount > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Discount</span>
                            <span className="text-sm text-green-600">
                              -₦{selectedAssignment.discount_amount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Amount Paid</span>
                          <span className="text-sm text-green-600">
                            ₦{selectedAssignment.amount_paid.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Remaining Balance</span>
                          <span className="text-lg font-bold text-blue-600">
                            ₦{selectedAssignment.balance.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedAssignment.payment_status)}`}>
                            {selectedAssignment.payment_status.charAt(0).toUpperCase() + selectedAssignment.payment_status.slice(1)}
                          </span>
                        </div>
                        {selectedAssignment.due_date && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Due Date</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {dayjs(selectedAssignment.due_date).format('MMM D, YYYY')}
                            </span>
                          </div>
                        )}
                        {selectedAssignment.fee_description && (
                          <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{selectedAssignment.fee_description}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {errors.assignment_id && (
                  <p className="mt-1 text-sm text-red-500">{errors.assignment_id.message}</p>
                )}
              </div>
            )}

            {/* Amount */}
            {selectedAssignment && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Amount to Pay *
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
                      max={selectedAssignment.balance}
                    />
                  </div>
                  {errors.amount_paid && (
                    <p className="mt-1 text-sm text-red-500">{errors.amount_paid.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum: ₦{selectedAssignment.balance.toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    New Balance After Payment
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={watchedAmount ? 
                        `₦${Math.max(selectedAssignment.balance - watchedAmount, 0).toLocaleString()}` : 
                        `₦${selectedAssignment.balance.toLocaleString()}`
                      }
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed dark:text-white"
                    />
                  </div>
                  {watchedAmount && (
                    <p className={`mt-1 text-sm ${
                      selectedAssignment.balance - watchedAmount === 0 ? 'text-green-600' :
                      selectedAssignment.balance - watchedAmount < 0 ? 'text-red-600' :
                      'text-blue-600'
                    }`}>
                      {selectedAssignment.balance - watchedAmount === 0 ? '✅ Fee will be fully paid' :
                       selectedAssignment.balance - watchedAmount < 0 ? '⚠️ Overpayment' :
                       `₦${(selectedAssignment.balance - watchedAmount).toLocaleString()} remaining after payment`}
                    </p>
                  )}
                </div>
              </div>
            )}

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

            {/* Transaction Reference */}
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

            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Payment Proof / Documents
              </label>
              
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
                <p>• Only shows outstanding fees (unpaid or partially paid).</p>
                <p>• Each fee assignment is linked to a session and term.</p>
                <p>• Payment status will update automatically based on the remaining balance.</p>
                <p>• Upload payment proof or receipt for verification.</p>
                <p>• All payments are recorded in the selected branch.</p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  if (onCancel) {
                    onCancel();
                  } else {
                    navigate(redirectTo);
                  }
                }}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedStudent || !selectedAssignment}
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