// // src/components/fees/CreateFee.tsx

// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { supabase } from '../../config/supabase/client';
// import { useAuth } from '../../hooks/useAuth';
// import toast from 'react-hot-toast';
// import dayjs from 'dayjs';
// import { ArrowLeft, Loader2, Save, Users, GraduationCap, Search, X, Plus, Layers, Target } from 'lucide-react';

// // Schema
// const feeSchema = z.object({
//   name: z.string().min(2, 'Fee name is required'),
//   description: z.string().optional(),
//   category: z.string().min(1, 'Category is required'),
//   amount: z.number().min(0, 'Amount must be greater than 0'),
//   due_date: z.string().optional().nullable(),
//   late_fee_amount: z.number().min(0).default(0),
//   installment_allowed: z.boolean().default(false),
//   number_of_installments: z.number().min(1).max(12).default(1),
//   is_mandatory: z.boolean().default(true),
//   is_optional: z.boolean().default(false),
//   is_recurring: z.boolean().default(false),
//   status: z.enum(['active', 'inactive']).default('active'),
//   payment_frequency: z.enum(['one_time', 'termly', 'sessionally', 'monthly', 'yearly']).default('termly'),
//   student_eligibility: z.enum([
//     'all_students',
//     'new_students_only',
//     'old_students_only',
//     'unadmitted_only'
//   ]).default('all_students'),
//   target_type: z.enum(['all', 'class', 'group', 'student']).default('all'),
//   target_ids: z.array(z.string()).default([]),
//   apply_to_future_students: z.boolean().default(true),
// });

// type FeeFormData = z.infer<typeof feeSchema>;

// interface Class {
//   id: string;
//   name: string;
//   code: string;
//   student_count: number;
// }

// interface FeeGroup {
//   id: string;
//   name: string;
//   totalStudents: number;
// }

// const CreateFee: React.FC = () => {
//   const navigate = useNavigate();
//   const { user } = useAuth();
//   const [submitting, setSubmitting] = useState(false);
//   const [classes, setClasses] = useState<Class[]>([]);
//   const [feeGroups, setFeeGroups] = useState<FeeGroup[]>([]);
//   const [branchId, setBranchId] = useState<string>('');
//   const [currentSession, setCurrentSession] = useState<string>('');
//   const [currentTerm, setCurrentTerm] = useState<string>('');
//   const [academicSessionId, setAcademicSessionId] = useState<string | null>(null);
//   const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
//   const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
//   const [loading, setLoading] = useState(false);

//   const {
//     register,
//     handleSubmit,
//     watch,
//     setValue,
//     formState: { errors },
//   } = useForm<FeeFormData>({
//     resolver: zodResolver(feeSchema),
//     defaultValues: {
//       status: 'active',
//       is_mandatory: true,
//       is_optional: false,
//       is_recurring: false,
//       installment_allowed: false,
//       number_of_installments: 1,
//       late_fee_amount: 0,
//       payment_frequency: 'termly',
//       student_eligibility: 'all_students',
//       target_type: 'all',
//       target_ids: [],
//       apply_to_future_students: true,
//     },
//   });

//   const isRecurring = watch('is_recurring');
//   const targetType = watch('target_type');

//   // Load data
//   useEffect(() => {
//     const loadData = async () => {
//       if (!user?.id) return;

//       try {
//         const { data: userData } = await supabase
//           .from('users')
//           .select('branch_id')
//           .eq('id', user.id)
//           .single();

//         if (userData) {
//           setBranchId(userData.branch_id);
//           await Promise.all([
//             loadAcademicInfo(userData.branch_id),
//             loadClasses(userData.branch_id),
//             loadFeeGroups(userData.branch_id),
//           ]);
//         }
//       } catch (error) {
//         console.error('Error loading data:', error);
//         toast.error('Failed to load data');
//       }
//     };
//     loadData();
//   }, [user]);

//   const loadAcademicInfo = async (branchId: string) => {
//     try {
//       const { data } = await supabase
//         .from('branches')
//         .select('academic_session, current_term, academic_session_id')
//         .eq('id', branchId)
//         .single();

//       if (data) {
//         setCurrentSession(data.academic_session || '');
//         setCurrentTerm(data.current_term || '');
//         setAcademicSessionId(data.academic_session_id || null);
//       } else {
//         const year = dayjs().year();
//         setCurrentSession(`${year}/${year + 1}`);
//         setCurrentTerm('First Term');
//       }
//     } catch (error) {
//       const year = dayjs().year();
//       setCurrentSession(`${year}/${year + 1}`);
//       setCurrentTerm('First Term');
//     }
//   };

//   const loadClasses = async (branchId: string) => {
//     setLoading(true);
//     try {
//       const { data } = await supabase
//         .from('classes')
//         .select('id, name, code')
//         .eq('branch_id', branchId)
//         .eq('status', 'active')
//         .order('name');

//       const classesWithCount = await Promise.all(
//         (data || []).map(async (cls) => {
//           const { count } = await supabase
//             .from('students')
//             .select('id', { count: 'exact', head: true })
//             .eq('class_id', cls.id)
//             .eq('current_status', 'active');
//           return { ...cls, student_count: count || 0 };
//         })
//       );
//       setClasses(classesWithCount);
//     } catch (error) {
//       console.error('Error loading classes:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadFeeGroups = async (branchId: string) => {
//     try {
//       const { data: groups } = await supabase
//         .from('fee_groups')
//         .select('id, name')
//         .eq('branch_id', branchId)
//         .eq('is_active', true);

//       const groupsWithCount = await Promise.all(
//         (groups || []).map(async (group) => {
//           const { data: members } = await supabase
//             .from('fee_group_members')
//             .select('entity_type, entity_id')
//             .eq('group_id', group.id);

//           let totalStudents = 0;

//           const classIds = members?.filter(m => m.entity_type === 'class').map(m => m.entity_id) || [];
//           if (classIds.length > 0) {
//             const { count } = await supabase
//               .from('students')
//               .select('id', { count: 'exact', head: true })
//               .in('class_id', classIds)
//               .eq('current_status', 'active');
//             totalStudents += count || 0;
//           }

//           const studentIds = members?.filter(m => m.entity_type === 'student').map(m => m.entity_id) || [];
//           if (studentIds.length > 0) {
//             const { count } = await supabase
//               .from('students')
//               .select('id', { count: 'exact', head: true })
//               .in('id', studentIds)
//               .eq('current_status', 'active');
//             totalStudents += count || 0;
//           }

//           return { ...group, totalStudents };
//         })
//       );

//       setFeeGroups(groupsWithCount);
//     } catch (error) {
//       console.error('Error loading fee groups:', error);
//     }
//   };

//   const generateTemplateId = async (): Promise<string> => {
//     try {
//       const { data } = await supabase
//         .from('fee_templates')
//         .select('template_id')
//         .order('template_id', { ascending: false })
//         .limit(1);

//       let nextNumber = 1;
//       if (data && data.length > 0 && data[0].template_id) {
//         const match = data[0].template_id.match(/FT-(\d+)/);
//         if (match) nextNumber = parseInt(match[1]) + 1;
//       }
//       return `FT-${String(nextNumber).padStart(5, '0')}`;
//     } catch {
//       return `FT-${Date.now().toString().slice(-5)}`;
//     }
//   };

//   const generateFeeId = (): string => {
//     return crypto.randomUUID?.() || `fee-${Date.now()}`;
//   };

//   // ============================================
//   // UPDATED: Single RPC that respects target_type
//   // ============================================
//   const callAssignFeesToAllStudents = async (feeId: string): Promise<number> => {
//     const { data, error } = await supabase.rpc('assign_fees_to_all_students', {
//       p_fee_id: feeId
//     });
//     if (error) throw error;
//     return data || 0;
//   };

//   // ============================================
//   // UPDATED: onSubmit with unified workflow
//   // ============================================
//   const onSubmit = async (data: FeeFormData) => {
//     if (!branchId) {
//       toast.error('No branch assigned. Please contact administrator.');
//       return;
//     }

//     if (data.target_type !== 'all' && data.target_ids.length === 0) {
//       toast.error('Please select at least one target');
//       return;
//     }

//     setSubmitting(true);

//     try {
//       let templateDatabaseId: string | null = null;

//       // ============================================
//       // STEP 1: CREATE TEMPLATE IF RECURRING
//       // ============================================
//       if (data.is_recurring) {
//         const templateId = await generateTemplateId();

//         const templateData = {
//           template_id: templateId,
//           branch_id: branchId,
//           name: data.name.trim(),
//           description: data.description?.trim() || null,
//           category: data.category,
//           base_amount: data.amount,
//           late_fee_amount: data.late_fee_amount || 0,
//           installment_allowed: data.installment_allowed,
//           number_of_installments: data.installment_allowed ? data.number_of_installments : 1,
//           is_mandatory: data.is_mandatory,
//           is_optional: data.is_optional,
//           class_ids: data.target_type === 'class' ? data.target_ids : null,
//           applies_to_all_classes: data.target_type === 'all',
//           student_eligibility: data.student_eligibility,
//           payment_frequency: data.payment_frequency,
//           recurrence_pattern: data.payment_frequency,
//           is_active: data.status === 'active',
//           created_by: user?.id,
//           metadata: {
//             target_type: data.target_type,
//             target_ids: data.target_ids,
//             apply_to_future_students: data.apply_to_future_students,
//           },
//         };

//         const { data: insertedTemplate, error: templateError } = await supabase
//           .from('fee_templates')
//           .insert([templateData])
//           .select('id')
//           .single();

//         if (templateError) throw templateError;

//         templateDatabaseId = insertedTemplate.id;
//       }

//       // ============================================
//       // STEP 2: CREATE CURRENT FEE
//       // ============================================
//       const feeUuid = generateFeeId();

//       const feeData = {
//         fee_id: feeUuid,
//         branch_id: branchId,
//         category: data.category,
//         name: data.name.trim(),
//         description: data.description?.trim() || null,
//         amount: data.amount,
//         due_date: data.due_date || null,
//         late_fee_amount: data.late_fee_amount || 0,
//         installment_allowed: data.installment_allowed,
//         number_of_installments: data.installment_allowed ? data.number_of_installments : 1,
//         is_mandatory: data.is_mandatory,
//         is_optional: data.is_optional,
//         is_recurring: data.is_recurring,
//         status: data.status,
//         created_by: user?.id,
//         session: currentSession,
//         term: currentTerm,
//         academic_session_id: academicSessionId,
//         payment_frequency: data.payment_frequency,
//         student_eligibility: data.student_eligibility,
//         target_type: data.target_type,
//         target_ids: data.target_ids || [],
//         applies_to_groups: [],
//         apply_to_future_students: data.apply_to_future_students,
//         created_for_session: currentSession,
//         is_template_instance: false,
//         fee_template_id: templateDatabaseId,
//         metadata: {},
//       };

//       const { data: insertedFee, error: feeError } = await supabase
//         .from('fees')
//         .insert([feeData])
//         .select('id')
//         .single();

//       if (feeError) throw feeError;

//       // ============================================
//       // STEP 3: ASSIGN STUDENTS
//       // ============================================
//       const assignmentCount = await callAssignFeesToAllStudents(insertedFee.id);

//       // ============================================
//       // STEP 4: SUCCESS MESSAGE
//       // ============================================
//       if (data.is_recurring) {
//         toast.success(
//           `✅ Recurring fee created successfully!\n` +
//           `📋 Template saved\n` +
//           `👨‍🎓 Assigned to ${assignmentCount} students`
//         );
//       } else {
//         toast.success(
//           `✅ Fee created successfully!\n` +
//           `👨‍🎓 Assigned to ${assignmentCount} students`
//         );
//       }

//       navigate('/fees');

//     } catch (error: any) {
//       console.error('Error:', error);
//       toast.error(error.message || 'Failed to create fee');
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const toggleClass = (classId: string) => {
//     setSelectedClassIds(prev => {
//       const newSelection = prev.includes(classId)
//         ? prev.filter(id => id !== classId)
//         : [...prev, classId];
//       setValue('target_ids', newSelection);
//       setValue('target_type', 'class');
//       return newSelection;
//     });
//   };

//   const toggleGroup = (groupId: string) => {
//     setSelectedGroupIds(prev => {
//       const newSelection = prev.includes(groupId)
//         ? prev.filter(id => id !== groupId)
//         : [...prev, groupId];
//       setValue('target_ids', newSelection);
//       setValue('target_type', 'group');
//       return newSelection;
//     });
//   };

//   const getTotalRecipients = () => {
//     if (targetType === 'all') {
//       return classes.reduce((sum, c) => sum + c.student_count, 0);
//     }
//     if (targetType === 'class') {
//       return selectedClassIds.reduce((sum, id) => {
//         const cls = classes.find(c => c.id === id);
//         return sum + (cls?.student_count || 0);
//       }, 0);
//     }
//     if (targetType === 'group') {
//       return feeGroups.reduce((sum, g) => {
//         if (selectedGroupIds.includes(g.id)) return sum + g.totalStudents;
//         return sum;
//       }, 0);
//     }
//     return 0;
//   };

//   return (
//     <div className="max-w-4xl mx-auto p-6">
//       {/* Header */}
//       <div className="flex items-center gap-4 mb-6">
//         <button
//           onClick={() => navigate('/fees')}
//           className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
//         >
//           <ArrowLeft className="w-5 h-5" />
//         </button>
//         <div>
//           <h1 className="text-2xl font-bold">
//             {isRecurring ? 'Create Recurring Fee Template' : 'Create Fee'}
//           </h1>
//           <p className="text-gray-500 text-sm">
//             {currentTerm} {currentSession}
//             {isRecurring && ' • Template will auto-assign on rollover'}
//           </p>
//         </div>
//       </div>

//       {/* Form */}
//       <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-6 space-y-6">
//         {/* Basic Info */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-sm font-medium mb-1">Fee Name *</label>
//             <input
//               {...register('name')}
//               className={`w-full px-4 py-2 rounded-lg border ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
//               placeholder="e.g., School Fees"
//             />
//             {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
//           </div>

//           <div>
//             <label className="block text-sm font-medium mb-1">Category *</label>
//             <select
//               {...register('category')}
//               className="w-full px-4 py-2 rounded-lg border border-gray-300"
//             >
//               <option value="">Select Category</option>
//               <option value="school_fees">School Fees</option>
//               <option value="pta">PTA Levy</option>
//               <option value="books">Books</option>
//               <option value="uniform">Uniform</option>
//               <option value="examination">Examination</option>
//               <option value="development_levy">Development Levy</option>
//               <option value="other">Other</option>
//             </select>
//           </div>
//         </div>

//         <div>
//           <label className="block text-sm font-medium mb-1">Description</label>
//           <textarea
//             {...register('description')}
//             rows={2}
//             className="w-full px-4 py-2 rounded-lg border border-gray-300"
//             placeholder="Optional description..."
//           />
//         </div>

//         {/* Amount */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <div>
//             <label className="block text-sm font-medium mb-1">Amount (₦) *</label>
//             <input
//               type="number"
//               step="100"
//               {...register('amount', { valueAsNumber: true })}
//               className={`w-full px-4 py-2 rounded-lg border ${errors.amount ? 'border-red-500' : 'border-gray-300'}`}
//               placeholder="0.00"
//             />
//             {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
//           </div>

//           <div>
//             <label className="block text-sm font-medium mb-1">Late Fee (₦)</label>
//             <input
//               type="number"
//               step="100"
//               {...register('late_fee_amount', { valueAsNumber: true })}
//               className="w-full px-4 py-2 rounded-lg border border-gray-300"
//               placeholder="0.00"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium mb-1">Payment Frequency</label>
//             <select
//               {...register('payment_frequency')}
//               className="w-full px-4 py-2 rounded-lg border border-gray-300"
//             >
//               <option value="one_time">One-Time</option>
//               <option value="termly">Termly</option>
//               <option value="sessionally">Per Session</option>
//               <option value="monthly">Monthly</option>
//               <option value="yearly">Yearly</option>
//             </select>
//           </div>
//         </div>

//         {/* Due Date */}
//         <div>
//           <label className="block text-sm font-medium mb-1">Due Date</label>
//           <input
//             type="date"
//             {...register('due_date')}
//             className="w-full md:w-1/2 px-4 py-2 rounded-lg border border-gray-300"
//           />
//         </div>

//         {/* Recurring Toggle */}
//         <div className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200">
//           <label className="flex items-center gap-3 cursor-pointer">
//             <input
//               type="checkbox"
//               {...register('is_recurring')}
//               className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
//             />
//             <div>
//               <p className="font-medium text-purple-700 dark:text-purple-300">
//                 🔄 Recurring Fee Template
//               </p>
//               <p className="text-sm text-purple-600 dark:text-purple-400">
//                 {isRecurring 
//                   ? 'Will be stored as template and auto-assigned on rollover' 
//                   : 'One-time fee - assigned immediately to students'}
//               </p>
//             </div>
//           </label>
//           {isRecurring && (
//             <span className="ml-auto px-3 py-1 bg-purple-500 text-white text-xs rounded-full font-medium">
//               Template Mode
//             </span>
//           )}
//         </div>

//         {/* Targeting */}
//         <div className="border rounded-lg p-4">
//           <h3 className="font-semibold flex items-center gap-2 mb-3">
//             <Target className="w-4 h-4" />
//             Targeting
//             <span className="ml-auto text-sm text-gray-500">
//               {getTotalRecipients()} students
//             </span>
//           </h3>

//           <div className="flex gap-2 mb-4 flex-wrap">
//             {['all', 'class', 'group'].map((type) => (
//               <button
//                 key={type}
//                 type="button"
//                 onClick={() => {
//                   setValue('target_type', type as any);
//                   if (type === 'all') {
//                     setValue('target_ids', []);
//                     setSelectedClassIds([]);
//                     setSelectedGroupIds([]);
//                   }
//                 }}
//                 className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
//                   targetType === type
//                     ? 'bg-purple-500 text-white'
//                     : 'bg-gray-100 hover:bg-gray-200'
//                 }`}
//               >
//                 {type === 'all' && 'All Students'}
//                 {type === 'class' && 'Classes'}
//                 {type === 'group' && 'Groups'}
//               </button>
//             ))}
//           </div>

//           {targetType === 'class' && (
//             <div className="space-y-2 max-h-48 overflow-y-auto">
//               {classes.map((cls) => (
//                 <button
//                   key={cls.id}
//                   type="button"
//                   onClick={() => toggleClass(cls.id)}
//                   className={`w-full px-3 py-2 rounded-lg border text-left flex justify-between ${
//                     selectedClassIds.includes(cls.id)
//                       ? 'border-purple-500 bg-purple-50'
//                       : 'border-gray-300 hover:bg-gray-50'
//                   }`}
//                 >
//                   <span>{cls.name}</span>
//                   <span className="text-gray-500 text-sm">{cls.student_count} students</span>
//                 </button>
//               ))}
//             </div>
//           )}

//           {targetType === 'group' && (
//             <div className="space-y-2">
//               {feeGroups.map((group) => (
//                 <button
//                   key={group.id}
//                   type="button"
//                   onClick={() => toggleGroup(group.id)}
//                   className={`w-full px-3 py-2 rounded-lg border text-left flex justify-between ${
//                     selectedGroupIds.includes(group.id)
//                       ? 'border-purple-500 bg-purple-50'
//                       : 'border-gray-300 hover:bg-gray-50'
//                   }`}
//                 >
//                   <span>{group.name}</span>
//                   <span className="text-gray-500 text-sm">{group.totalStudents} students</span>
//                 </button>
//               ))}
//             </div>
//           )}

//           {targetType === 'all' && (
//             <div className="text-sm text-gray-500 p-2">
//               All active students will receive this fee
//             </div>
//           )}
//         </div>

//         {/* Student Eligibility */}
//         <div>
//           <label className="block text-sm font-medium mb-1">Student Eligibility</label>
//           <select
//             {...register('student_eligibility')}
//             className="w-full md:w-1/2 px-4 py-2 rounded-lg border border-gray-300"
//           >
//             <option value="all_students">All Students</option>
//             <option value="new_students_only">New Students Only</option>
//             <option value="old_students_only">Old Students Only</option>
//             <option value="unadmitted_only">Unadmitted Only</option>
//           </select>
//         </div>

//         {/* Installments */}
//         <div className="flex items-center gap-4">
//           <label className="flex items-center gap-2 cursor-pointer">
//             <input
//               type="checkbox"
//               {...register('installment_allowed')}
//               className="w-4 h-4"
//             />
//             <span className="text-sm">Allow Installments</span>
//           </label>

//           {watch('installment_allowed') && (
//             <div>
//               <label className="text-sm mr-2">Installments:</label>
//               <input
//                 type="number"
//                 min="1"
//                 max="12"
//                 {...register('number_of_installments', { valueAsNumber: true })}
//                 className="w-20 px-2 py-1 rounded border border-gray-300"
//               />
//             </div>
//           )}
//         </div>

//         {/* Mandatory/Optional */}
//         <div className="flex gap-4">
//           <label className="flex items-center gap-2 cursor-pointer">
//             <input type="checkbox" {...register('is_mandatory')} className="w-4 h-4" />
//             <span className="text-sm">Mandatory</span>
//           </label>
//           <label className="flex items-center gap-2 cursor-pointer">
//             <input type="checkbox" {...register('is_optional')} className="w-4 h-4" />
//             <span className="text-sm">Optional</span>
//           </label>
//         </div>

//         {/* Future Students */}
//         <div>
//           <label className="flex items-center gap-2 cursor-pointer">
//             <input
//               type="checkbox"
//               {...register('apply_to_future_students')}
//               className="w-4 h-4"
//             />
//             <span className="text-sm">Apply to future students</span>
//           </label>
//         </div>

//         {/* Status */}
//         <div>
//           <label className="block text-sm font-medium mb-1">Status</label>
//           <select
//             {...register('status')}
//             className="w-full md:w-1/2 px-4 py-2 rounded-lg border border-gray-300"
//           >
//             <option value="active">Active</option>
//             <option value="inactive">Inactive</option>
//           </select>
//         </div>

//         {/* Submit */}
//         <div className="flex justify-end gap-3 pt-4 border-t">
//           <button
//             type="button"
//             onClick={() => navigate('/fees')}
//             className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
//           >
//             Cancel
//           </button>
//           <button
//             type="submit"
//             disabled={submitting}
//             className={`px-8 py-2 text-white rounded-lg font-medium flex items-center gap-2 ${
//               isRecurring
//                 ? 'bg-purple-500 hover:bg-purple-600'
//                 : 'bg-blue-500 hover:bg-blue-600'
//             } disabled:opacity-50`}
//           >
//             {submitting ? (
//               <>
//                 <Loader2 className="w-4 h-4 animate-spin" />
//                 {isRecurring ? 'Creating Template...' : 'Creating...'}
//               </>
//             ) : (
//               <>
//                 <Save className="w-4 h-4" />
//                 {isRecurring ? 'Create Template' : 'Create Fee'}
//               </>
//             )}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default CreateFee;

// src/components/fees/CreateFee.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Info,
  Loader2,
  Save,
  Users,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  UserPlus,
  User,
  GraduationCap,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
  UserCheck,
  Settings as SettingsIcon,
  Lightbulb,
  Gift,
  Layers,
  Brain,
  Shield as ShieldIcon,
  School,
  Book,
  Bus,
  HeartHandshake,
  Building2,
  TrendingUp,
  Calendar,
  Repeat,
  Star,
  Zap,
  FileText,
  Tag,
  AlertTriangle,
  HelpCircle,
  Globe,
  Users as UsersIcon,
  Home,
  Grid,
  List,
  Filter,
  RefreshCw,
  Copy,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Link,
  Unlink,
  Check,
  ChevronRight,
  Target,
  Menu
} from 'lucide-react';

// Fee Groups based on class levels
const FEE_GROUPS = [
  { value: 'NURSERY', label: 'Nursery', icon: 'Star', levels: ['Nursery 1', 'Nursery 2', 'Nursery 3'] },
  { value: 'PRIMARY', label: 'Primary', icon: 'Book', levels: ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'] },
  { value: 'JUNIOR_SECONDARY', label: 'Junior Secondary', icon: 'GraduationCap', levels: ['JSS1', 'JSS2', 'JSS3'] },
  { value: 'SENIOR_SECONDARY', label: 'Senior Secondary', icon: 'School', levels: ['SS1', 'SS2', 'SS3'] },
  { value: 'ALL', label: 'All Students', icon: 'Users' },
];

// Zod Schema for Fee Form
const feeSchema = z.object({
  name: z.string().min(2, 'Fee name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  amount: z.number().min(0, 'Amount must be greater than 0'),
  due_date: z.string().optional().nullable(),
  late_fee_amount: z.number().min(0, 'Late fee cannot be negative').default(0),
  installment_allowed: z.boolean().default(false),
  number_of_installments: z.number().min(1).max(12).default(1),
  is_mandatory: z.boolean().default(true),
  is_optional: z.boolean().default(false),
  is_recurring: z.boolean().default(false),
  recurrence_period: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  payment_frequency: z.enum(['one_time', 'termly', 'sessionally', 'monthly', 'yearly']).default('termly'),
  includes_waiver: z.boolean().default(false),
  waiver_percentage: z.number().min(0).max(100).default(0),
  sibling_discount: z.boolean().default(false),
  sibling_discount_percentage: z.number().min(0).max(100).default(10),
  early_payment_discount: z.boolean().default(false),
  early_payment_days: z.number().min(0).default(0),
  early_payment_percentage: z.number().min(0).max(100).default(5),
  prorate_for_new_students: z.boolean().default(false),
  prorate_cutoff_date: z.string().optional().nullable(),
  student_eligibility: z.enum([
    'all_students',
    'new_students_only',
    'old_students_only',
    'unadmitted_only',
    'new_and_unadmitted'
  ]).default('all_students'),
  
  // Targeting fields
  target_type: z.enum(['all', 'class', 'group', 'student', 'section']).default('all'),
  target_ids: z.array(z.string()).default([]),
  applies_to_groups: z.array(z.string()).default([]),
  apply_to_future_students: z.boolean().default(true),
  
  auto_assign_on_admission: z.boolean().default(true),
  auto_assign_on_rollover: z.boolean().default(true),
  enable_exemptions: z.boolean().default(false),
  exempt_students: z.array(z.object({
    student_id: z.string(),
    exemption_type: z.enum(['staff_child', 'orphan', 'scholarship', 'other']),
    waiver_percentage: z.number().min(0).max(100).default(100),
    exemption_reason: z.string().optional(),
  })).default([]),
});

type FeeFormData = z.infer<typeof feeSchema>;

// Interfaces
interface Class {
  id: string;
  name: string;
  code: string;
  level: string;
  student_count: number;
}

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  class_id: string;
  class_name?: string;
  admission_date: string;
  admission_status: string;
}

interface FeeGroup {
  id: string;
  name: string;
  description: string;
  group_type: 'class' | 'section' | 'custom' | 'activity';
  member_count: number;
  is_active: boolean;
  branch_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface FeeGroupMember {
  id: string;
  group_id: string;
  entity_type: 'class' | 'student' | 'section';
  entity_id: string;
  created_at: string;
  student?: Student;
  class?: Class;
}

interface FeeGroupWithDetails extends FeeGroup {
  classes: Class[];
  students: Student[];
  totalStudents: number;
  members?: FeeGroupMember[];
}

interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  default_frequency: string;
  is_mandatory: boolean;
  is_optional: boolean;
  is_recurring: boolean;
  requires_class_assignment: boolean;
  apply_to_new_students: boolean;
  sibling_discount_eligible: boolean;
  waiver_eligible: boolean;
  early_payment_eligible: boolean;
  suggested_amount_min: number | null;
  suggested_amount_max: number | null;
}

interface FeeHistory {
  category: string;
  amount: number;
  payment_frequency: string;
  term: string;
  session: string;
  created_at: string;
  student_count: number;
}

interface SchoolPattern {
  category: string;
  average_amount: number;
  min_amount: number;
  max_amount: number;
  total_fees: number;
  frequency: string;
  is_mandatory: boolean;
  sibling_discount: boolean;
  early_payment: boolean;
  waiver: boolean;
  common_terms: string[];
  student_count: number;
}

const CreateFee: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [branchId, setBranchId] = useState<string>('');
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [feeHistory, setFeeHistory] = useState<FeeHistory[]>([]);
  const [schoolPatterns, setSchoolPatterns] = useState<SchoolPattern[]>([]);
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [assignmentEventType, setAssignmentEventType] = useState<'admission' | 'rollover' | 'manual'>('manual');
  
  // Fee groups
  const [feeGroups, setFeeGroups] = useState<FeeGroupWithDetails[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FeeGroupWithDetails | null>(null);
  
  // Fee assignment mode
  const [assignmentMode, setAssignmentMode] = useState<'classes' | 'groups' | 'students' | 'sections'>('classes');
  
  // Selected items
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<FeeGroupWithDetails[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  
  // Current term/session info
  const [currentSession, setCurrentSession] = useState<string>('');
  const [currentTerm, setCurrentTerm] = useState<string>('');
  const [academicInfo, setAcademicInfo] = useState<{ session: string; term: string } | null>(null);
  const [academicSessionId, setAcademicSessionId] = useState<string | null>(null);
  
  // AI Suggestions
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // UI states
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    financial: true,
    discounts: false,
    exemptions: false,
    targeting: true,
    eligibility: true,
    settings: true,
    insights: true,
  });

  // New group creation state
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    group_type: 'custom' as 'class' | 'section' | 'custom' | 'activity',
    selectedClasses: [] as string[],
    selectedStudents: [] as string[],
  });

  // Edit group state
  const [editGroupData, setEditGroupData] = useState({
    name: '',
    description: '',
    group_type: 'custom' as 'class' | 'section' | 'custom' | 'activity',
    selectedClasses: [] as string[],
    selectedStudents: [] as string[],
    existingMembers: [] as FeeGroupMember[],
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
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
      payment_frequency: 'termly',
      includes_waiver: false,
      waiver_percentage: 0,
      sibling_discount: false,
      sibling_discount_percentage: 10,
      early_payment_discount: false,
      early_payment_days: 0,
      early_payment_percentage: 5,
      prorate_for_new_students: false,
      student_eligibility: 'all_students',
      target_type: 'all',
      target_ids: [],
      applies_to_groups: [],
      apply_to_future_students: true,
      auto_assign_on_admission: true,
      auto_assign_on_rollover: true,
      enable_exemptions: false,
      exempt_students: [],
    },
  });

  const isRecurring = watch('is_recurring');
  const installmentAllowed = watch('installment_allowed');
  const paymentFrequency = watch('payment_frequency');
  const selectedCategory = watch('category');
  const includesWaiver = watch('includes_waiver');
  const siblingDiscount = watch('sibling_discount');
  const earlyPaymentDiscount = watch('early_payment_discount');
  const studentEligibility = watch('student_eligibility');
  const enableExemptions = watch('enable_exemptions');
  const targetType = watch('target_type');
  const targetIds = watch('target_ids');
  const applyToFutureStudents = watch('apply_to_future_students');
  const autoAssignOnAdmission = watch('auto_assign_on_admission');
  const autoAssignOnRollover = watch('auto_assign_on_rollover');

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('branch_id')
            .eq('id', user.id)
            .single();

          if (userError) throw userError;
          
          if (userData) {
            setBranchId(userData.branch_id);
            await Promise.all([
              loadAcademicInfo(userData.branch_id),
              loadClasses(userData.branch_id),
              loadCustomCategories(userData.branch_id),
              loadFeeHistory(userData.branch_id),
              loadFeeGroups(userData.branch_id),
            ]);
          }
        } catch (error) {
          console.error('Error loading data:', error);
          toast.error('Failed to load data');
        }
      }
    };
    loadData();
  }, [user]);

  // Analyze fee history when loaded
  useEffect(() => {
    if (feeHistory.length > 0) {
      analyzeSchoolPatterns();
    }
  }, [feeHistory]);

  // Generate suggestions when category changes
  useEffect(() => {
    if (selectedCategory) {
      generateSuggestions(selectedCategory);
    }
  }, [selectedCategory, currentTerm, currentSession, schoolPatterns]);

  const loadAcademicInfo = async (branchId: string) => {
    try {
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('academic_session, current_term, academic_session_id')
        .eq('id', branchId)
        .single();

      if (branchError) {
        const { data: schoolData, error: schoolError } = await supabase
          .from('school_info')
          .select('academic_session, current_term')
          .limit(1)
          .single();

        if (!schoolError && schoolData) {
          setCurrentSession(schoolData.academic_session || '');
          setCurrentTerm(schoolData.current_term || '');
          setAcademicInfo({
            session: schoolData.academic_session || '',
            term: schoolData.current_term || '',
          });
          return;
        }
        
        const year = dayjs().year();
        const defaultSession = `${year}/${year + 1}`;
        const defaultTerm = 'First Term';
        
        setCurrentSession(defaultSession);
        setCurrentTerm(defaultTerm);
        setAcademicInfo({
          session: defaultSession,
          term: defaultTerm,
        });
        return;
      }

      if (branchData) {
        setCurrentSession(branchData.academic_session || '');
        setCurrentTerm(branchData.current_term || '');
        setAcademicSessionId(branchData.academic_session_id || null);
        setAcademicInfo({
          session: branchData.academic_session || '',
          term: branchData.current_term || '',
        });
      }
    } catch (error) {
      console.error('Error loading academic info:', error);
      const year = dayjs().year();
      setCurrentSession(`${year}/${year + 1}`);
      setCurrentTerm('First Term');
      setAcademicInfo({
        session: `${year}/${year + 1}`,
        term: 'First Term',
      });
    }
  };

  const loadCustomCategories = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('fee_categories')
        .select('*')
        .eq('branch_id', branchId)
        .order('name');

      if (error) throw error;
      setCustomCategories(data || []);
    } catch (error) {
      console.error('Error loading custom categories:', error);
    }
  };

  const loadFeeHistory = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('fees')
        .select('category, amount, payment_frequency, term, session, created_at, metadata->>student_count as student_count')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const formattedData = (data || []).map(fee => ({
        ...fee,
        student_count: parseInt(fee.student_count) || 0,
      }));
      
      setFeeHistory(formattedData);
    } catch (error) {
      console.error('Error loading fee history:', error);
    }
  };

  // Load fee groups with details
  const loadFeeGroups = async (branchId: string) => {
    setLoadingGroups(true);
    try {
      // Get all groups
      const { data: groups, error: groupsError } = await supabase
        .from('fee_groups')
        .select(`
          *,
          members:fee_group_members(count)
        `)
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('name');

      if (groupsError) throw groupsError;

      const groupsWithDetails: FeeGroupWithDetails[] = [];

      for (const group of (groups || [])) {
        // Get group members
        const { data: members } = await supabase
          .from('fee_group_members')
          .select('*')
          .eq('group_id', group.id);

        // Get classes from group
        const classIds = members?.filter(m => m.entity_type === 'class').map(m => m.entity_id) || [];
        const studentIds = members?.filter(m => m.entity_type === 'student').map(m => m.entity_id) || [];

        // Get class details with student counts
        const classDetails: Class[] = [];
        let totalStudents = 0;

        if (classIds.length > 0) {
          const { data: classData } = await supabase
            .from('classes')
            .select('*')
            .in('id', classIds);

          if (classData) {
            for (const cls of classData) {
              const { count } = await supabase
                .from('students')
                .select('id', { count: 'exact', head: true })
                .eq('class_id', cls.id)
                .eq('current_status', 'active');

              const classWithCount = {
                ...cls,
                student_count: count || 0,
              };
              classDetails.push(classWithCount);
              totalStudents += count || 0;
            }
          }
        }

        // Get student details
        const studentDetails: Student[] = [];
        if (studentIds.length > 0) {
          const { data: studentData } = await supabase
            .from('students')
            .select(`
              *,
              classes!inner (
                name
              )
            `)
            .in('id', studentIds);

          if (studentData) {
            studentDetails.push(...studentData.map(s => ({
              ...s,
              class_name: s.classes?.name || 'Unknown',
            })));
            totalStudents += studentData.length;
          }
        }

        groupsWithDetails.push({
          ...group,
          member_count: group.members?.[0]?.count || 0,
          classes: classDetails,
          students: studentDetails,
          totalStudents: totalStudents,
          members: members || [],
        });
      }

      setFeeGroups(groupsWithDetails);
    } catch (error: any) {
      console.error('Error loading fee groups:', error);
      toast.error(error.message || 'Failed to load fee groups');
    } finally {
      setLoadingGroups(false);
    }
  };

  // Create fee group
  const handleCreateFeeGroup = async () => {
    if (!newGroupData.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    if (newGroupData.selectedClasses.length === 0 && newGroupData.selectedStudents.length === 0) {
      toast.error('Please select at least one class or student');
      return;
    }

    setLoadingGroups(true);
    try {
      // Create group
      const { data: group, error: groupError } = await supabase
        .from('fee_groups')
        .insert([{
          name: newGroupData.name.trim(),
          description: newGroupData.description || '',
          group_type: newGroupData.group_type,
          branch_id: branchId,
          created_by: user?.id,
          is_active: true,
          metadata: {},
        }])
        .select()
        .single();

      if (groupError) throw groupError;

      // Add members
      const members = [
        ...newGroupData.selectedClasses.map(classId => ({
          group_id: group.id,
          entity_type: 'class' as const,
          entity_id: classId,
        })),
        ...newGroupData.selectedStudents.map(studentId => ({
          group_id: group.id,
          entity_type: 'student' as const,
          entity_id: studentId,
        })),
      ];

      if (members.length > 0) {
        const { error: membersError } = await supabase
          .from('fee_group_members')
          .insert(members);

        if (membersError) throw membersError;
      }

      toast.success(`Fee group "${newGroupData.name}" created with ${members.length} members`);
      setShowCreateGroupModal(false);
      setNewGroupData({
        name: '',
        description: '',
        group_type: 'custom',
        selectedClasses: [],
        selectedStudents: [],
      });
      await loadFeeGroups(branchId);
    } catch (error: any) {
      console.error('Error creating fee group:', error);
      toast.error(error.message || 'Failed to create fee group');
    } finally {
      setLoadingGroups(false);
    }
  };

  // Edit fee group
  const handleEditFeeGroup = async () => {
    if (!editingGroup) return;
    if (!editGroupData.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    setLoadingGroups(true);
    try {
      // Update group
      const { error: updateError } = await supabase
        .from('fee_groups')
        .update({
          name: editGroupData.name.trim(),
          description: editGroupData.description || '',
          group_type: editGroupData.group_type,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingGroup.id);

      if (updateError) throw updateError;

      // Get existing members
      const existingClassIds = editGroupData.existingMembers
        .filter(m => m.entity_type === 'class')
        .map(m => m.entity_id);
      
      const existingStudentIds = editGroupData.existingMembers
        .filter(m => m.entity_type === 'student')
        .map(m => m.entity_id);

      // Find members to add
      const classesToAdd = editGroupData.selectedClasses.filter(id => !existingClassIds.includes(id));
      const studentsToAdd = editGroupData.selectedStudents.filter(id => !existingStudentIds.includes(id));

      // Find members to remove
      const classesToRemove = existingClassIds.filter(id => !editGroupData.selectedClasses.includes(id));
      const studentsToRemove = existingStudentIds.filter(id => !editGroupData.selectedStudents.includes(id));

      // Add new members
      if (classesToAdd.length > 0 || studentsToAdd.length > 0) {
        const newMembers = [
          ...classesToAdd.map(classId => ({
            group_id: editingGroup.id,
            entity_type: 'class' as const,
            entity_id: classId,
          })),
          ...studentsToAdd.map(studentId => ({
            group_id: editingGroup.id,
            entity_type: 'student' as const,
            entity_id: studentId,
          })),
        ];

        const { error: addError } = await supabase
          .from('fee_group_members')
          .insert(newMembers);

        if (addError) throw addError;
      }

      // Remove members
      if (classesToRemove.length > 0 || studentsToRemove.length > 0) {
        const removeIds = [
          ...editGroupData.existingMembers
            .filter(m => 
              (m.entity_type === 'class' && classesToRemove.includes(m.entity_id)) ||
              (m.entity_type === 'student' && studentsToRemove.includes(m.entity_id))
            )
            .map(m => m.id)
        ];

        if (removeIds.length > 0) {
          const { error: removeError } = await supabase
            .from('fee_group_members')
            .delete()
            .in('id', removeIds);

          if (removeError) throw removeError;
        }
      }

      toast.success(`Fee group "${editGroupData.name}" updated successfully`);
      setShowEditGroupModal(false);
      setEditingGroup(null);
      await loadFeeGroups(branchId);
    } catch (error: any) {
      console.error('Error updating fee group:', error);
      toast.error(error.message || 'Failed to update fee group');
    } finally {
      setLoadingGroups(false);
    }
  };

  // Open edit modal
  const openEditGroupModal = (group: FeeGroupWithDetails) => {
    setEditingGroup(group);
    
    const classIds = group.members?.filter(m => m.entity_type === 'class').map(m => m.entity_id) || [];
    const studentIds = group.members?.filter(m => m.entity_type === 'student').map(m => m.entity_id) || [];

    setEditGroupData({
      name: group.name,
      description: group.description || '',
      group_type: group.group_type,
      selectedClasses: classIds,
      selectedStudents: studentIds,
      existingMembers: group.members || [],
    });

    setShowEditGroupModal(true);
  };

  // Delete fee group
  const handleDeleteFeeGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this fee group? This action cannot be undone.')) return;

    setLoadingGroups(true);
    try {
      const { error } = await supabase
        .from('fee_groups')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId);

      if (error) throw error;

      toast.success('Fee group deleted successfully');
      await loadFeeGroups(branchId);
    } catch (error: any) {
      console.error('Error deleting fee group:', error);
      toast.error(error.message || 'Failed to delete fee group');
    } finally {
      setLoadingGroups(false);
    }
  };

  const analyzeSchoolPatterns = () => {
    const patterns: Record<string, SchoolPattern> = {};
    
    feeHistory.forEach(fee => {
      if (!patterns[fee.category]) {
        patterns[fee.category] = {
          category: fee.category,
          average_amount: 0,
          min_amount: Infinity,
          max_amount: 0,
          total_fees: 0,
          frequency: fee.payment_frequency || 'termly',
          is_mandatory: true,
          sibling_discount: false,
          early_payment: false,
          waiver: false,
          common_terms: [],
          student_count: 0,
        };
      }
      
      const pattern = patterns[fee.category];
      pattern.average_amount += fee.amount;
      pattern.min_amount = Math.min(pattern.min_amount, fee.amount);
      pattern.max_amount = Math.max(pattern.max_amount, fee.amount);
      pattern.total_fees += 1;
      pattern.student_count += fee.student_count || 0;
      if (fee.term && !pattern.common_terms.includes(fee.term)) {
        pattern.common_terms.push(fee.term);
      }
    });
    
    Object.keys(patterns).forEach(key => {
      const pattern = patterns[key];
      pattern.average_amount = pattern.average_amount / pattern.total_fees;
      if (pattern.min_amount === Infinity) pattern.min_amount = 0;
    });
    
    setSchoolPatterns(Object.values(patterns));
  };

  const generateSuggestions = (category: string) => {
    const pattern = schoolPatterns.find(p => p.category === category);
    const categoryInfo = getAllCategories().find(c => c.value === category);
    
    const newSuggestions: string[] = [];
    
    if (pattern) {
      newSuggestions.push(`📊 Based on ${pattern.total_fees} previous fees, the average is ${formatNaira(pattern.average_amount)}`);
      newSuggestions.push(`📈 Amount range: ${formatNaira(pattern.min_amount)} - ${formatNaira(pattern.max_amount)}`);
      newSuggestions.push(`👥 Typically applies to ${pattern.student_count} students`);
      
      if (pattern.common_terms.length > 0) {
        newSuggestions.push(`📅 Usually created in: ${pattern.common_terms.join(', ')}`);
      }
    }
    
    if (categoryInfo) {
      const freqMap = {
        'one_time': 'once',
        'termly': 'per term (3 times per session)',
        'sessionally': 'once per academic session',
        'monthly': 'monthly',
        'yearly': 'yearly'
      };
      newSuggestions.push(`💡 This fee is usually paid ${freqMap[categoryInfo.default_frequency as keyof typeof freqMap] || 'termly'}`);
      
      if (categoryInfo.requires_class_assignment) {
        newSuggestions.push('📚 This fee typically varies by class/level');
      } else {
        newSuggestions.push('👕 This fee is usually the same for all students');
      }
      
      if (categoryInfo.apply_to_new_students) {
        newSuggestions.push('🆕 This fee applies to new students');
      } else {
        newSuggestions.push('📌 This fee is for existing students only');
      }
    }
    
    if (category === 'uniform' || category === 'identity_card') {
      newSuggestions.push('💡 These are one-time fees for new students only');
    }
    
    if (category === 'school_fees' || category === 'pta') {
      newSuggestions.push('💡 Consider offering 5-10% sibling discount on this fee');
    }
    
    if (category === 'development_levy' || category === 'books') {
      newSuggestions.push('💡 This is typically collected once per academic session');
    }
    
    if (!pattern) {
      newSuggestions.push('🆕 New category for this school - use the settings below to define its behavior');
      newSuggestions.push('💡 Create a custom category if this is a unique fee type for your school');
    }
    
    setSuggestions(newSuggestions);
  };

  const loadClasses = async (branchId: string) => {
    setLoadingClasses(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          code,
          level
        `)
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('level', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      
      const classesWithCount = await Promise.all(
        (data || []).map(async (cls) => {
          const { count, error: countError } = await supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('current_status', 'active');
          
          return {
            ...cls,
            student_count: countError ? 0 : (count || 0)
          };
        })
      );
      
      setClasses(classesWithCount);
    } catch (error: any) {
      console.error('Error loading classes:', error);
      toast.error(error.message || 'Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadStudents = async (branchId: string, classIds?: string[]) => {
    setLoadingStudents(true);
    try {
      let query = supabase
        .from('students')
        .select(`
          id,
          student_id,
          first_name,
          last_name,
          class_id,
          admission_date,
          admission_status,
          classes!inner (
            name
          )
        `)
        .eq('branch_id', branchId)
        .eq('current_status', 'active');

      if (classIds && classIds.length > 0) {
        query = query.in('class_id', classIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const studentsData = (data || []).map(s => ({
        ...s,
        class_name: s.classes?.name || 'Unknown'
      }));
      
      setStudents(studentsData);
      setFilteredStudents(studentsData);
    } catch (error: any) {
      console.error('Error loading students:', error);
      toast.error(error.message || 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Get students from selected groups
  const getStudentsFromGroups = async (groupIds: string[]) => {
    const allStudentIds = new Set<string>();
    
    for (const groupId of groupIds) {
      const group = feeGroups.find(g => g.id === groupId);
      if (group) {
        // Get students from classes
        for (const cls of group.classes) {
          const { data: students } = await supabase
            .from('students')
            .select('id')
            .eq('class_id', cls.id)
            .eq('current_status', 'active');
          
          if (students) {
            students.forEach(s => allStudentIds.add(s.id));
          }
        }
        
        // Get individual students
        for (const student of group.students) {
          allStudentIds.add(student.id);
        }
      }
    }
    
    return Array.from(allStudentIds);
  };

  const toggleClass = (classId: string) => {
    setSelectedClassIds(prev => {
      const newSelection = prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId];
      
      setValue('target_ids', newSelection);
      setValue('target_type', 'class');
      
      if (assignmentMode === 'students') {
        setAssignmentMode('classes');
        setSelectedStudentIds([]);
        setSelectedStudents([]);
      }
      
      return newSelection;
    });
  };

  const selectAllClasses = () => {
    const allIds = classes.map(c => c.id);
    setSelectedClassIds(allIds);
    setValue('target_ids', allIds);
    setValue('target_type', 'class');
    if (assignmentMode === 'students') {
      setAssignmentMode('classes');
      setSelectedStudentIds([]);
      setSelectedStudents([]);
    }
  };

  const clearAllClasses = () => {
    setSelectedClassIds([]);
    setValue('target_ids', []);
  };

  // Group selection with details
  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev => {
      const newSelection = prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId];
      
      setValue('target_ids', newSelection);
      setValue('target_type', 'group');
      
      // Load students from selected groups
      if (newSelection.length > 0) {
        loadStudentsFromGroups(newSelection);
      }
      
      if (assignmentMode === 'students' || assignmentMode === 'classes') {
        setAssignmentMode('groups');
        setSelectedStudentIds([]);
        setSelectedStudents([]);
        setSelectedClassIds([]);
      }
      
      return newSelection;
    });
  };

  const loadStudentsFromGroups = async (groupIds: string[]) => {
    const studentIds = await getStudentsFromGroups(groupIds);
    if (studentIds.length > 0) {
      const { data: studentsData } = await supabase
        .from('students')
        .select(`
          *,
          classes!inner (
            name
          )
        `)
        .in('id', studentIds);
      
      if (studentsData) {
        const studentsWithClass = studentsData.map(s => ({
          ...s,
          class_name: s.classes?.name || 'Unknown'
        }));
        setStudents(studentsWithClass);
        setFilteredStudents(studentsWithClass);
      }
    } else {
      setStudents([]);
      setFilteredStudents([]);
    }
  };

  const selectAllGroups = () => {
    const allIds = feeGroups.map(g => g.id);
    setSelectedGroupIds(allIds);
    setValue('target_ids', allIds);
    setValue('target_type', 'group');
    loadStudentsFromGroups(allIds);
  };

  const clearAllGroups = () => {
    setSelectedGroupIds([]);
    setValue('target_ids', []);
    setStudents([]);
    setFilteredStudents([]);
  };

  const toggleStudent = (student: Student) => {
    setSelectedStudents(prev => {
      const exists = prev.some(s => s.id === student.id);
      const newSelection = exists
        ? prev.filter(s => s.id !== student.id)
        : [...prev, student];
      
      setSelectedStudentIds(newSelection.map(s => s.id));
      setValue('target_ids', newSelection.map(s => s.id));
      setValue('target_type', 'student');
      
      if (assignmentMode === 'classes' || assignmentMode === 'groups') {
        setAssignmentMode('students');
        setSelectedClassIds([]);
        setSelectedGroupIds([]);
      }
      
      return newSelection;
    });
  };

  const handleStudentSearch = (query: string) => {
    setStudentSearchQuery(query);
    const filtered = students.filter(s => 
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(query.toLowerCase()) ||
      s.student_id.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredStudents(filtered);
  };

  const toggleExemption = (studentId: string) => {
    const currentExemptions = getValues('exempt_students') || [];
    const existingIndex = currentExemptions.findIndex(e => e.student_id === studentId);
    
    if (existingIndex >= 0) {
      const newExemptions = currentExemptions.filter((_, i) => i !== existingIndex);
      setValue('exempt_students', newExemptions);
    } else {
      const student = students.find(s => s.id === studentId);
      if (student) {
        const newExemption = {
          student_id: studentId,
          exemption_type: 'staff_child' as const,
          waiver_percentage: 100,
          exemption_reason: '',
        };
        setValue('exempt_students', [...currentExemptions, newExemption]);
      }
    }
  };

  const updateExemption = (studentId: string, field: string, value: any) => {
    const currentExemptions = getValues('exempt_students') || [];
    const updatedExemptions = currentExemptions.map(e => {
      if (e.student_id === studentId) {
        return { ...e, [field]: value };
      }
      return e;
    });
    setValue('exempt_students', updatedExemptions);
  };

  const handleCreateCategory = async (data: any) => {
    try {
      const categoryData = {
        ...data,
        branch_id: branchId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('fee_categories')
        .insert([categoryData]);

      if (error) throw error;
      
      toast.success('Category created successfully!');
      setShowCustomCategoryModal(false);
      await loadCustomCategories(branchId);
      
      setValue('category', data.name);
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast.error(error.message || 'Failed to create category');
    }
  };

  const generateTemplateId = async (): Promise<string> => {
    try {
      const { data } = await supabase
        .from('fee_templates')
        .select('template_id')
        .order('template_id', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (data && data.length > 0 && data[0].template_id) {
        const match = data[0].template_id.match(/FT-(\d+)/);
        if (match) nextNumber = parseInt(match[1]) + 1;
      }
      return `FT-${String(nextNumber).padStart(5, '0')}`;
    } catch {
      return `FT-${Date.now().toString().slice(-5)}`;
    }
  };

  const generateFeeId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const callAssignFeesToAllStudents = async (feeId: string): Promise<number> => {
    const { data, error } = await supabase.rpc('assign_fees_to_all_students', {
      p_fee_id: feeId
    });
    if (error) throw error;
    return data || 0;
  };

  const onSubmit = async (data: FeeFormData) => {
    if (!branchId) {
      toast.error('No branch assigned. Please contact administrator.');
      return;
    }

    // Validate targeting
    if (data.target_type !== 'all' && data.target_ids.length === 0) {
      toast.error('Please select at least one target (class, group, or student)');
      return;
    }

    setSubmitting(true);
    
    try {
      let templateDatabaseId: string | null = null;

      // ============================================
      // STEP 1: CREATE TEMPLATE IF RECURRING
      // ============================================
      if (data.is_recurring) {
        const templateId = await generateTemplateId();

        const templateData = {
          template_id: templateId,
          branch_id: branchId,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          category: data.category,
          base_amount: data.amount,
          late_fee_amount: data.late_fee_amount || 0,
          installment_allowed: data.installment_allowed,
          number_of_installments: data.installment_allowed ? data.number_of_installments : 1,
          is_mandatory: data.is_mandatory,
          is_optional: data.is_optional,
          class_ids: data.target_type === 'class' ? data.target_ids : null,
          applies_to_all_classes: data.target_type === 'all',
          student_eligibility: data.student_eligibility,
          payment_frequency: data.payment_frequency,
          recurrence_pattern: data.payment_frequency,
          is_active: data.status === 'active',
          created_by: user?.id,
          metadata: {
            target_type: data.target_type,
            target_ids: data.target_ids,
            apply_to_future_students: data.apply_to_future_students,
          },
        };

        const { data: insertedTemplate, error: templateError } = await supabase
          .from('fee_templates')
          .insert([templateData])
          .select('id')
          .single();

        if (templateError) throw templateError;

        templateDatabaseId = insertedTemplate.id;
      }

      // ============================================
      // STEP 2: CREATE CURRENT FEE
      // ============================================
      const feeUuid = generateFeeId();

      const feeData = {
        fee_id: feeUuid,
        branch_id: branchId,
        category: data.category,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        amount: data.amount,
        due_date: data.due_date || null,
        late_fee_amount: data.late_fee_amount || 0,
        installment_allowed: data.installment_allowed,
        number_of_installments: data.installment_allowed ? data.number_of_installments : 1,
        is_mandatory: data.is_mandatory,
        is_optional: data.is_optional,
        is_recurring: data.is_recurring,
        status: data.status,
        created_by: user?.id,
        session: currentSession,
        term: currentTerm,
        academic_session_id: academicSessionId,
        payment_frequency: data.payment_frequency,
        student_eligibility: data.student_eligibility,
        target_type: data.target_type,
        target_ids: data.target_ids || [],
        applies_to_groups: [],
        apply_to_future_students: data.apply_to_future_students,
        created_for_session: currentSession,
        is_template_instance: false,
        fee_template_id: templateDatabaseId,
        metadata: {},
      };

      const { data: insertedFee, error: feeError } = await supabase
        .from('fees')
        .insert([feeData])
        .select('id')
        .single();

      if (feeError) throw feeError;

      // ============================================
      // STEP 3: ASSIGN STUDENTS
      // ============================================
      const assignmentCount = await callAssignFeesToAllStudents(insertedFee.id);

      // ============================================
      // STEP 4: SUCCESS MESSAGE
      // ============================================
      if (data.is_recurring) {
        toast.success(
          `✅ Recurring fee created successfully!\n` +
          `📋 Template saved\n` +
          `👨‍🎓 Assigned to ${assignmentCount} students`
        );
      } else {
        toast.success(
          `✅ Fee created successfully!\n` +
          `👨‍🎓 Assigned to ${assignmentCount} students`
        );
      }

      navigate('/fees');

    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to create fee');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getTotalRecipients = () => {
    if (targetType === 'class') {
      const total = selectedClassIds.reduce((sum, id) => {
        const cls = classes.find(c => c.id === id);
        return sum + (cls?.student_count || 0);
      }, 0);
      return total;
    }
    if (targetType === 'group') {
      let total = 0;
      selectedGroupIds.forEach(groupId => {
        const group = feeGroups.find(g => g.id === groupId);
        if (group) {
          total += group.totalStudents || 0;
        }
      });
      return total;
    }
    if (targetType === 'student') {
      return selectedStudents.length;
    }
    if (targetType === 'all') {
      return classes.reduce((sum, c) => sum + c.student_count, 0);
    }
    return 0;
  };

  const getAllCategories = () => {
    const predefined = preDefinedCategories.map(c => ({
      ...c,
      is_custom: false,
    }));
    
    const custom = customCategories.map(c => ({
      value: c.name,
      label: c.name,
      icon: c.icon || 'BookOpen',
      color: c.color || 'gray',
      description: c.description || '',
      default_frequency: c.default_frequency || 'termly',
      is_mandatory: c.is_mandatory || false,
      is_optional: c.is_optional || true,
      is_recurring: c.is_recurring || false,
      requires_class_assignment: c.requires_class_assignment !== false,
      apply_to_new_students: c.apply_to_new_students !== false,
      sibling_discount_eligible: c.sibling_discount_eligible || false,
      waiver_eligible: c.waiver_eligible || false,
      early_payment_eligible: c.early_payment_eligible || false,
      is_custom: true,
      suggested_amount_min: c.suggested_amount_min || undefined,
      suggested_amount_max: c.suggested_amount_max || undefined,
    }));
    
    return [...predefined, ...custom];
  };

  const getCategoryInfo = (value: string) => {
    return getAllCategories().find(cat => cat.value === value);
  };

  const formatNaira = (amount: number): string => {
    return `₦${amount.toLocaleString()}`;
  };

  const eligibilityLabels: Record<string, { label: string; icon: any; description: string; color: string }> = {
    all_students: {
      label: 'All Students',
      icon: Users,
      description: 'Both new and old students',
      color: 'blue'
    },
    new_students_only: {
      label: 'New Students Only',
      icon: UserPlus,
      description: 'Recently admitted students',
      color: 'green'
    },
    old_students_only: {
      label: 'Old Students Only',
      icon: UserCheck,
      description: 'Returning/existing students',
      color: 'purple'
    },
    unadmitted_only: {
      label: 'Unadmitted Only',
      icon: User,
      description: 'Prospective students',
      color: 'orange'
    },
    new_and_unadmitted: {
      label: 'New + Unadmitted',
      icon: Users,
      description: 'New and prospective students',
      color: 'yellow'
    }
  };

  const targetTypeLabels: Record<string, { label: string; icon: any; description: string }> = {
    'all': {
      label: 'All Students',
      icon: Globe,
      description: 'Apply to every student in this session'
    },
    'class': {
      label: 'Specific Classes',
      icon: GraduationCap,
      description: 'Apply to students in selected classes'
    },
    'group': {
      label: 'Fee Groups',
      icon: Layers,
      description: 'Apply to students in selected fee groups'
    },
    'student': {
      label: 'Individual Students',
      icon: User,
      description: 'Apply to specific students'
    },
    'section': {
      label: 'Sections',
      icon: Grid,
      description: 'Apply to students in selected sections'
    }
  };

  // Pre-defined categories
  const preDefinedCategories = [
    { 
      value: 'school_fees', 
      label: 'School Fees',
      icon: 'School',
      color: 'blue',
      description: 'Main tuition fees - usually termly',
      default_frequency: 'termly',
      is_mandatory: true,
      is_optional: false,
      is_recurring: true,
      requires_class_assignment: true,
      apply_to_new_students: true,
      sibling_discount_eligible: true,
      waiver_eligible: true,
      early_payment_eligible: true,
    },
    { 
      value: 'books', 
      label: 'Books & Stationery',
      icon: 'Book',
      color: 'green',
      description: 'Textbooks and stationery - per session',
      default_frequency: 'sessionally',
      is_mandatory: true,
      is_optional: false,
      is_recurring: false,
      requires_class_assignment: true,
      apply_to_new_students: true,
      sibling_discount_eligible: true,
      waiver_eligible: false,
      early_payment_eligible: false,
    },
    { 
      value: 'uniform', 
      label: 'School Uniform',
      icon: 'Shield',
      color: 'purple',
      description: 'Complete uniform set - same price for all classes',
      default_frequency: 'one_time',
      is_mandatory: true,
      is_optional: false,
      is_recurring: false,
      requires_class_assignment: false,
      apply_to_new_students: true,
      sibling_discount_eligible: true,
      waiver_eligible: true,
      early_payment_eligible: false,
    },
    { 
      value: 'sportswear', 
      label: 'Sports Wear',
      icon: 'TrendingUp',
      color: 'orange',
      description: 'PE kits and sports jerseys - same price for all classes',
      default_frequency: 'one_time',
      is_mandatory: false,
      is_optional: true,
      is_recurring: false,
      requires_class_assignment: false,
      apply_to_new_students: true,
      sibling_discount_eligible: false,
      waiver_eligible: false,
      early_payment_eligible: false,
    },
    { 
      value: 'bus', 
      label: 'School Bus',
      icon: 'Bus',
      color: 'yellow',
      description: 'Transportation service - optional',
      default_frequency: 'termly',
      is_mandatory: false,
      is_optional: true,
      is_recurring: true,
      requires_class_assignment: false,
      apply_to_new_students: true,
      sibling_discount_eligible: true,
      waiver_eligible: false,
      early_payment_eligible: false,
    },
    { 
      value: 'pta', 
      label: 'PTA Levy',
      icon: 'HeartHandshake',
      color: 'red',
      description: 'Parent-Teacher Association contribution',
      default_frequency: 'termly',
      is_mandatory: true,
      is_optional: false,
      is_recurring: true,
      requires_class_assignment: false,
      apply_to_new_students: true,
      sibling_discount_eligible: true,
      waiver_eligible: false,
      early_payment_eligible: false,
    },
    { 
      value: 'examination', 
      label: 'Examination Fees',
      icon: 'FileText',
      color: 'indigo',
      description: 'Terminal and promotional exams',
      default_frequency: 'termly',
      is_mandatory: true,
      is_optional: false,
      is_recurring: true,
      requires_class_assignment: true,
      apply_to_new_students: true,
      sibling_discount_eligible: false,
      waiver_eligible: false,
      early_payment_eligible: false,
    },
    { 
      value: 'development_levy', 
      label: 'Development Levy',
      icon: 'Building2',
      color: 'gray',
      description: 'Infrastructure development - per session',
      default_frequency: 'sessionally',
      is_mandatory: true,
      is_optional: false,
      is_recurring: false,
      requires_class_assignment: false,
      apply_to_new_students: true,
      sibling_discount_eligible: true,
      waiver_eligible: true,
      early_payment_eligible: false,
    },
    { 
      value: 'identity_card', 
      label: 'Identity Card',
      icon: 'User',
      color: 'teal',
      description: 'Student ID card - one-time fee for new students',
      default_frequency: 'one_time',
      is_mandatory: true,
      is_optional: false,
      is_recurring: false,
      requires_class_assignment: false,
      apply_to_new_students: false,
      sibling_discount_eligible: false,
      waiver_eligible: false,
      early_payment_eligible: false,
    },
    { 
      value: 'hostel', 
      label: 'Hostel/Boarding',
      icon: 'Building2',
      color: 'pink',
      description: 'Accommodation for boarders',
      default_frequency: 'termly',
      is_mandatory: false,
      is_optional: true,
      is_recurring: true,
      requires_class_assignment: false,
      apply_to_new_students: true,
      sibling_discount_eligible: true,
      waiver_eligible: false,
      early_payment_eligible: false,
    },
    { 
      value: 'ict', 
      label: 'ICT / Computer',
      icon: 'Book',
      color: 'cyan',
      description: 'Computer lab and ICT resources',
      default_frequency: 'termly',
      is_mandatory: true,
      is_optional: false,
      is_recurring: true,
      requires_class_assignment: true,
      apply_to_new_students: true,
      sibling_discount_eligible: false,
      waiver_eligible: false,
      early_payment_eligible: false,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 space-y-4 sm:space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/fees')}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
              Create Fee
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              {currentTerm} {currentSession}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex px-3 py-1.5 sm:px-4 sm:py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl items-center gap-2">
            <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
            <span className="text-xs sm:text-sm text-green-700 dark:text-green-300 font-medium">
              {schoolPatterns.length} patterns
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowCustomCategoryModal(true)}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium hover:bg-purple-100 transition-all dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800 flex items-center gap-1 sm:gap-2"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">New Category</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreateGroupModal(true)}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium hover:bg-blue-100 transition-all dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 flex items-center gap-1 sm:gap-2"
          >
            <Layers className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">New Group</span>
          </button>
        </div>
      </div>

      {/* AI Insights Panel */}
      {schoolPatterns.length > 0 && expandedSections.insights && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl sm:rounded-2xl p-3 sm:p-4"
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex-shrink-0">
              <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm sm:text-base text-indigo-800 dark:text-indigo-300 truncate">
                  📊 {schoolPatterns.length} patterns learned
                </h4>
                <button
                  type="button"
                  onClick={() => setExpandedSections(prev => ({ ...prev, insights: !prev.insights }))}
                  className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 flex-shrink-0 ml-2"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 mt-2 sm:mt-3">
                {schoolPatterns.slice(0, 4).map((pattern, index) => (
                  <div key={index} className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-1.5 sm:p-3">
                    <p className="font-medium text-xs sm:text-sm text-gray-700 dark:text-gray-300 capitalize truncate">{pattern.category.replace('_', ' ')}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                      Avg: {formatNaira(pattern.average_amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Suggestions Panel */}
      {showSuggestions && suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-xl sm:rounded-2xl p-3 sm:p-4"
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex-shrink-0">
              <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm sm:text-base text-amber-800 dark:text-amber-300">💡 Suggestions</h4>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(false)}
                  className="text-amber-500 hover:text-amber-700 dark:text-amber-400 flex-shrink-0 ml-2"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
              <ul className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <li key={index} className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 flex items-start gap-1 sm:gap-2">
                    <span className="mt-0.5">{suggestion.split(' ')[0]}</span>
                    <span className="truncate">{suggestion.split(' ').slice(1).join(' ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Fee Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-3 sm:p-4 md:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            {/* Basic Information */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('basic')}
                className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                    <Info className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">Basic Info</h3>
                  {selectedCategory && (
                    <span className="hidden xs:inline text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full truncate max-w-[80px] sm:max-w-[120px]">
                      {getCategoryInfo(selectedCategory)?.label || selectedCategory}
                    </span>
                  )}
                </div>
                {expandedSections.basic ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ml-2" />}
              </button>
              <AnimatePresence>
                {expandedSections.basic && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Fee Name *
                        </label>
                        <input
                          {...register('name')}
                          className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border text-sm sm:text-base ${
                            errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                          } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                          placeholder="e.g., Termly School Fees"
                        />
                        {errors.name && (
                          <p className="mt-1 text-xs sm:text-sm text-red-500">{errors.name.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Category *
                        </label>
                        <select
                          {...register('category')}
                          onChange={(e) => {
                            setValue('category', e.target.value);
                            const categoryInfo = getCategoryInfo(e.target.value);
                            if (categoryInfo) {
                              setValue('payment_frequency', categoryInfo.default_frequency as any);
                              setValue('is_mandatory', categoryInfo.is_mandatory);
                              setValue('is_optional', categoryInfo.is_optional);
                              setValue('is_recurring', categoryInfo.is_recurring);
                            }
                          }}
                          className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border text-sm sm:text-base ${
                            errors.category ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                          } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                        >
                          <option value="">Select Category</option>
                          <optgroup label="📚 Standard">
                            {preDefinedCategories.slice(0, 6).map((cat) => (
                              <option key={cat.value} value={cat.value}>
                                {cat.label}
                              </option>
                            ))}
                          </optgroup>
                          {customCategories.length > 0 && (
                            <optgroup label="⭐ Custom">
                              {customCategories.slice(0, 3).map((cat) => (
                                <option key={cat.id} value={cat.name}>
                                  {cat.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-4">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        {...register('description')}
                        rows={2}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm sm:text-base"
                        placeholder="Detailed description of the fee..."
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Financial Details */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('financial')}
                className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Financial</h3>
                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full hidden xs:inline">
                    ₦
                  </span>
                </div>
                {expandedSections.financial ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <AnimatePresence>
                {expandedSections.financial && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Amount (₦) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₦</span>
                          <input
                            type="number"
                            step="100"
                            {...register('amount', { valueAsNumber: true })}
                            className={`w-full pl-7 sm:pl-8 pr-3 sm:pr-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border text-sm sm:text-base ${
                              errors.amount ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                            } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white`}
                            placeholder="0.00"
                          />
                        </div>
                        {errors.amount && (
                          <p className="mt-1 text-xs sm:text-sm text-red-500">{errors.amount.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Late Fee (₦)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₦</span>
                          <input
                            type="number"
                            step="100"
                            {...register('late_fee_amount', { valueAsNumber: true })}
                            className="w-full pl-7 sm:pl-8 pr-3 sm:pr-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm sm:text-base"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Frequency
                        </label>
                        <select
                          {...register('payment_frequency')}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm sm:text-base"
                        >
                          <option value="one_time">One-Time</option>
                          <option value="termly">Termly</option>
                          <option value="sessionally">Per Session</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-4">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        {...register('due_date')}
                        className="w-full sm:w-1/2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm sm:text-base"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Targeting Section */}
            <div className="border-2 border-purple-200 dark:border-purple-800 rounded-lg sm:rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 sm:p-4 border-b border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-purple-500 rounded-lg">
                      <Target className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Targeting</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden xs:block">Who should receive this?</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-medium">
                      {getTotalRecipients()} students
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                {/* Target Type Selection */}
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
                  {Object.entries(targetTypeLabels).map(([key, value]) => {
                    const Icon = value.icon;
                    const isSelected = targetType === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setValue('target_type', key as any);
                          if (key === 'all') {
                            setValue('target_ids', []);
                            setSelectedClassIds([]);
                            setSelectedGroupIds([]);
                            setSelectedStudents([]);
                          }
                        }}
                        className={`p-1.5 sm:p-3 rounded-lg sm:rounded-xl border-2 text-center transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                      >
                        <Icon className={`w-3 h-3 sm:w-5 sm:h-5 mx-auto ${isSelected ? 'text-purple-500' : 'text-gray-400'}`} />
                        <p className={`text-[8px] xs:text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1 ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-600 dark:text-gray-400'}`}>
                          {value.label}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* All Students */}
                {targetType === 'all' && (
                  <div className="p-2 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg sm:rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-green-700 dark:text-green-300">
                      <Globe className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span>
                        Applies to <strong>all active students</strong>
                      </span>
                    </div>
                  </div>
                )}

                {/* Class Selection */}
                {targetType === 'class' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      <button
                        type="button"
                        onClick={selectAllClasses}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-100"
                      >
                        Select All
                      </button>
                      {selectedClassIds.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllClasses}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-100"
                        >
                          Clear
                        </button>
                      )}
                      <span className="ml-auto text-xs sm:text-sm text-gray-500">
                        {selectedClassIds.length} / {classes.length}
                      </span>
                    </div>

                    {loadingClasses ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2 max-h-48 sm:max-h-60 overflow-y-auto">
                        {classes.slice(0, 8).map((cls) => (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => toggleClass(cls.id)}
                            className={`px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-medium transition-all text-left ${
                              selectedClassIds.includes(cls.id)
                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate text-xs sm:text-sm">{cls.name}</span>
                              {selectedClassIds.includes(cls.id) ? (
                                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0 ml-1" />
                              ) : (
                                <Circle className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300 flex-shrink-0 ml-1" />
                              )}
                            </div>
                            <div className="text-[10px] sm:text-xs text-gray-400">
                              {cls.student_count} students
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {classes.length > 8 && (
                      <p className="text-center text-xs text-gray-400">+ {classes.length - 8} more classes</p>
                    )}
                  </div>
                )}

                {/* Group Selection */}
                {targetType === 'group' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      <button
                        type="button"
                        onClick={selectAllGroups}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs sm:text-sm font-medium hover:bg-purple-100"
                      >
                        Select All
                      </button>
                      {selectedGroupIds.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllGroups}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-100"
                        >
                          Clear
                        </button>
                      )}
                      <span className="ml-auto text-xs sm:text-sm text-gray-500">
                        {selectedGroupIds.length} / {feeGroups.length}
                      </span>
                    </div>

                    {loadingGroups ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                      </div>
                    ) : feeGroups.length === 0 ? (
                      <div className="text-center py-4 sm:py-8 text-gray-500">
                        <Layers className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-2 text-gray-300" />
                        <p className="text-xs sm:text-sm">No fee groups yet</p>
                        <button
                          type="button"
                          onClick={() => setShowCreateGroupModal(true)}
                          className="mt-1 sm:mt-2 text-purple-600 hover:text-purple-700 text-xs sm:text-sm font-medium"
                        >
                          Create group
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                        {feeGroups.slice(0, 5).map((group) => {
                          const isSelected = selectedGroupIds.includes(group.id);
                          return (
                            <div
                              key={group.id}
                              className={`border rounded-lg sm:rounded-xl transition-all ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                              }`}
                            >
                              <div className="p-2 sm:p-3 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => toggleGroup(group.id)}
                                  className="flex-1 text-left"
                                >
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                      <Layers className="w-3 h-3 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                                        {group.name}
                                      </p>
                                      <p className="text-[10px] sm:text-xs text-gray-500">
                                        {group.totalStudents} students
                                      </p>
                                    </div>
                                  </div>
                                </button>
                                {isSelected ? (
                                  <CheckCircle2 className="w-3 h-3 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" />
                                ) : (
                                  <Circle className="w-3 h-3 sm:w-5 sm:h-5 text-gray-300 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {feeGroups.length > 5 && (
                      <p className="text-center text-xs text-gray-400">+ {feeGroups.length - 5} more groups</p>
                    )}
                  </div>
                )}

                {/* Student Selection */}
                {targetType === 'student' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            loadStudents(branchId, [e.target.value]);
                          }
                        }}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm bg-white dark:bg-gray-900"
                      >
                        <option value="">Filter Class</option>
                        {classes.slice(0, 5).map(cls => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name} ({cls.student_count})
                          </option>
                        ))}
                      </select>

                      <div className="flex-1 min-w-[100px] relative">
                        <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={studentSearchQuery}
                          onChange={(e) => handleStudentSearch(e.target.value)}
                          className="w-full pl-7 sm:pl-9 pr-2 sm:pr-4 py-1 sm:py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {selectedStudents.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudents([]);
                            setSelectedStudentIds([]);
                            setValue('target_ids', []);
                          }}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-100"
                        >
                          Clear ({selectedStudents.length})
                        </button>
                      )}
                    </div>

                    {loadingStudents ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="text-center py-4 sm:py-8 text-gray-500">
                        <User className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-2 text-gray-300" />
                        <p className="text-xs sm:text-sm">No students found</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xs:grid-cols-2 gap-1.5 max-h-48 sm:max-h-64 overflow-y-auto">
                        {filteredStudents.slice(0, 10).map((student) => (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => toggleStudent(student)}
                            className={`px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-medium transition-all text-left flex items-center justify-between ${
                              selectedStudents.some(s => s.id === student.id)
                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                              <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-[8px] sm:text-xs flex-shrink-0">
                                {student.first_name?.[0]}{student.last_name?.[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs sm:text-sm">{student.first_name} {student.last_name}</p>
                                <p className="text-[8px] sm:text-xs text-gray-400 truncate">{student.student_id}</p>
                              </div>
                            </div>
                            {selectedStudents.some(s => s.id === student.id) ? (
                              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0 ml-1" />
                            ) : (
                              <Circle className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300 flex-shrink-0 ml-1" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {filteredStudents.length > 10 && (
                      <p className="text-center text-xs text-gray-400">+ {filteredStudents.length - 10} more students</p>
                    )}
                  </div>
                )}

                {/* Future Students Toggle */}
                <div className="mt-2 sm:mt-4 p-2 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700">
                  <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('apply_to_future_students')}
                      className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Include Future Students</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">New students later will receive this fee</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Student Eligibility */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('eligibility')}
                className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                    <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Eligibility</h3>
                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full truncate max-w-[80px] sm:max-w-[120px]">
                    {eligibilityLabels[studentEligibility]?.label || 'All'}
                  </span>
                </div>
                {expandedSections.eligibility ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <AnimatePresence>
                {expandedSections.eligibility && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
                      {Object.entries(eligibilityLabels).slice(0, 4).map(([key, value]) => {
                        const Icon = value.icon;
                        const isSelected = studentEligibility === key;
                        return (
                          <div
                            key={key}
                            className={`p-1.5 sm:p-3 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? `border-${value.color}-500 bg-${value.color}-50 dark:bg-${value.color}-900/20`
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                            onClick={() => setValue('student_eligibility', key as any)}
                          >
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Icon className={`w-3 h-3 sm:w-4 sm:h-4 text-${value.color}-500 flex-shrink-0`} />
                              <span className="text-[8px] xs:text-[10px] sm:text-xs font-medium truncate">{value.label}</span>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className={`w-3 h-3 sm:w-4 sm:h-4 text-${value.color}-500 mt-0.5 sm:mt-1`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Discounts & Waivers */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('discounts')}
                className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Gift className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Discounts</h3>
                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hidden xs:inline">
                    Optional
                  </span>
                </div>
                {expandedSections.discounts ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <AnimatePresence>
                {expandedSections.discounts && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="p-2 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg sm:rounded-xl">
                        <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register('includes_waiver')}
                            className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Waiver</span>
                        </label>
                        {includesWaiver && (
                          <div className="mt-2 sm:mt-3">
                            <label className="block text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">%</label>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                {...register('waiver_percentage', { valueAsNumber: true })}
                                className="w-16 sm:w-32 px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 transition-all text-sm dark:text-white"
                              />
                              <span className="text-xs sm:text-sm text-gray-500">%</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-2 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg sm:rounded-xl">
                        <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register('sibling_discount')}
                            className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Sibling</span>
                        </label>
                        {siblingDiscount && (
                          <div className="mt-2 sm:mt-3">
                            <label className="block text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">%</label>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                {...register('sibling_discount_percentage', { valueAsNumber: true })}
                                className="w-16 sm:w-32 px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 transition-all text-sm dark:text-white"
                              />
                              <span className="text-xs sm:text-sm text-gray-500">%</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-2 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg sm:rounded-xl sm:col-span-2">
                        <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register('early_payment_discount')}
                            className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 rounded focus:ring-green-500"
                          />
                          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Early Payment</span>
                        </label>
                        {earlyPaymentDiscount && (
                          <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-2 sm:mt-3">
                            <div>
                              <label className="block text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Days</label>
                              <input
                                type="number"
                                min="0"
                                {...register('early_payment_days', { valueAsNumber: true })}
                                className="w-full px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 transition-all text-sm dark:text-white"
                                placeholder="30"
                              />
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">%</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                {...register('early_payment_percentage', { valueAsNumber: true })}
                                className="w-full px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 transition-all text-sm dark:text-white"
                                placeholder="5"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Additional Settings */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('settings')}
                className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <SettingsIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Settings</h3>
                </div>
                {expandedSections.settings ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <AnimatePresence>
                {expandedSections.settings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
                      <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg sm:rounded-xl">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register('is_mandatory')}
                            className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 rounded"
                          />
                          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Mandatory</span>
                        </label>
                      </div>
                      <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg sm:rounded-xl">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register('is_optional')}
                            className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 rounded"
                          />
                          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Optional</span>
                        </label>
                      </div>
                      <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg sm:rounded-xl">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register('is_recurring')}
                            className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 rounded"
                          />
                          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Recurring</span>
                        </label>
                        {isRecurring && (
                          <div className="mt-2">
                            <select
                              {...register('recurrence_period')}
                              className="w-full px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs sm:text-sm"
                            >
                              <option value="termly">Every Term</option>
                              <option value="sessionally">Every Session</option>
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg sm:rounded-xl">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register('installment_allowed')}
                            className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 rounded"
                          />
                          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Installments</span>
                        </label>
                        {watch('installment_allowed') && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="12"
                              {...register('number_of_installments', { valueAsNumber: true })}
                              className="w-12 sm:w-20 px-1 sm:px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs sm:text-sm"
                            />
                            <span className="text-[10px] sm:text-xs text-gray-500">installments</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-4">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status
                      </label>
                      <select
                        {...register('status')}
                        className="w-full sm:w-1/2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 transition-all text-sm dark:text-white"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit */}
            <div className="flex flex-col-reverse xs:flex-row items-center justify-end gap-2 sm:gap-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate('/fees')}
                className="w-full xs:w-auto px-4 sm:px-6 py-2 sm:py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full xs:w-auto px-6 sm:px-8 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg sm:rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 text-sm sm:text-base"
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

      {/* Custom Category Modal */}
      <AnimatePresence>
        {showCustomCategoryModal && (
          <CustomCategoryModal
            onClose={() => setShowCustomCategoryModal(false)}
            onCreate={handleCreateCategory}
            branchId={branchId}
          />
        )}
      </AnimatePresence>

      {/* Create Fee Group Modal */}
      <AnimatePresence>
        {showCreateGroupModal && (
          <CreateFeeGroupModal
            onClose={() => {
              setShowCreateGroupModal(false);
              setNewGroupData({
                name: '',
                description: '',
                group_type: 'custom',
                selectedClasses: [],
                selectedStudents: [],
              });
            }}
            onCreate={handleCreateFeeGroup}
            classes={classes}
            students={students}
            newGroupData={newGroupData}
            setNewGroupData={setNewGroupData}
            loading={loadingGroups}
            branchId={branchId}
          />
        )}
      </AnimatePresence>

      {/* Edit Fee Group Modal */}
      <AnimatePresence>
        {showEditGroupModal && editingGroup && (
          <EditFeeGroupModal
            onClose={() => {
              setShowEditGroupModal(false);
              setEditingGroup(null);
            }}
            onEdit={handleEditFeeGroup}
            classes={classes}
            students={students}
            editGroupData={editGroupData}
            setEditGroupData={setEditGroupData}
            loading={loadingGroups}
            groupName={editingGroup.name}
            branchId={branchId}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================
// Custom Category Modal Component
// ============================================

interface CustomCategoryModalProps {
  onClose: () => void;
  onCreate: (data: any) => void;
  branchId: string;
}

const CustomCategoryModal: React.FC<CustomCategoryModalProps> = ({ onClose, onCreate, branchId }) => {
  const [formData, setFormData] = useState({
    name: '',
    icon: 'BookOpen',
    color: 'blue',
    description: '',
    default_frequency: 'termly',
    is_mandatory: true,
    is_optional: false,
    is_recurring: false,
    requires_class_assignment: true,
    apply_to_new_students: true,
    sibling_discount_eligible: false,
    waiver_eligible: false,
    early_payment_eligible: false,
    suggested_amount_min: null as number | null,
    suggested_amount_max: null as number | null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
            Create Custom Category
          </h3>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-sm sm:text-base"
              placeholder="e.g., Science Lab Fee"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Icon
              </label>
              <select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-sm sm:text-base"
              >
                <option value="BookOpen">📖 Book</option>
                <option value="School">🏫 School</option>
                <option value="GraduationCap">🎓 Graduation</option>
                <option value="Users">👥 Users</option>
                <option value="User">👤 User</option>
                <option value="Shield">🛡️ Shield</option>
                <option value="TrendingUp">📈 Trending</option>
                <option value="Bus">🚌 Bus</option>
                <option value="HeartHandshake">🤝 Hands</option>
                <option value="Building2">🏢 Building</option>
                <option value="Book">📚 Books</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Color
              </label>
              <select
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-sm sm:text-base"
              >
                <option value="blue">🔵 Blue</option>
                <option value="green">🟢 Green</option>
                <option value="purple">🟣 Purple</option>
                <option value="orange">🟠 Orange</option>
                <option value="red">🔴 Red</option>
                <option value="indigo">🔷 Indigo</option>
                <option value="gray">⚪ Gray</option>
                <option value="teal">🟦 Teal</option>
                <option value="pink">🩷 Pink</option>
                <option value="cyan">🩵 Cyan</option>
                <option value="yellow">🟡 Yellow</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-sm sm:text-base"
              placeholder="Describe this fee category..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Frequency
              </label>
              <select
                value={formData.default_frequency}
                onChange={(e) => setFormData({ ...formData, default_frequency: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-sm sm:text-base"
              >
                <option value="one_time">One-Time</option>
                <option value="termly">Termly</option>
                <option value="sessionally">Sessionally</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Suggested Amount Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={formData.suggested_amount_min || ''}
                  onChange={(e) => setFormData({ ...formData, suggested_amount_min: e.target.value ? Number(e.target.value) : null })}
                  className="w-1/2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-sm"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={formData.suggested_amount_max || ''}
                  onChange={(e) => setFormData({ ...formData, suggested_amount_max: e.target.value ? Number(e.target.value) : null })}
                  className="w-1/2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg sm:rounded-xl">
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <input
                type="checkbox"
                checked={formData.is_mandatory}
                onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 rounded"
              />
              Mandatory
            </label>
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <input
                type="checkbox"
                checked={formData.is_optional}
                onChange={(e) => setFormData({ ...formData, is_optional: e.target.checked })}
                className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 rounded"
              />
              Optional
            </label>
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <input
                type="checkbox"
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 rounded"
              />
              Recurring
            </label>
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <input
                type="checkbox"
                checked={formData.requires_class_assignment}
                onChange={(e) => setFormData({ ...formData, requires_class_assignment: e.target.checked })}
                className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 rounded"
              />
              Class-specific
            </label>
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <input
                type="checkbox"
                checked={formData.apply_to_new_students}
                onChange={(e) => setFormData({ ...formData, apply_to_new_students: e.target.checked })}
                className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 rounded"
              />
              New students
            </label>
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <input
                type="checkbox"
                checked={formData.sibling_discount_eligible}
                onChange={(e) => setFormData({ ...formData, sibling_discount_eligible: e.target.checked })}
                className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 rounded"
              />
              Sibling discount
            </label>
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <input
                type="checkbox"
                checked={formData.waiver_eligible}
                onChange={(e) => setFormData({ ...formData, waiver_eligible: e.target.checked })}
                className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 rounded"
              />
              Waiver eligible
            </label>
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <input
                type="checkbox"
                checked={formData.early_payment_eligible}
                onChange={(e) => setFormData({ ...formData, early_payment_eligible: e.target.checked })}
                className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 rounded"
              />
              Early payment
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-2.5 bg-purple-500 text-white rounded-lg sm:rounded-xl font-medium hover:bg-purple-600 transition-all shadow-lg shadow-purple-500/20 text-sm sm:text-base"
            >
              Create Category
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

// ============================================
// Create Fee Group Modal Component
// ============================================

interface CreateFeeGroupModalProps {
  onClose: () => void;
  onCreate: () => void;
  classes: Class[];
  students: Student[];
  newGroupData: any;
  setNewGroupData: (data: any) => void;
  loading: boolean;
  branchId: string;
}

const CreateFeeGroupModal: React.FC<CreateFeeGroupModalProps> = ({
  onClose,
  onCreate,
  classes,
  students: initialStudents,
  newGroupData,
  setNewGroupData,
  loading,
  branchId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [activeTab, setActiveTab] = useState<'classes' | 'students'>('classes');

  useEffect(() => {
    loadAllStudents();
  }, [branchId]);

  const loadAllStudents = async () => {
    setLoadingStudents(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          first_name,
          last_name,
          class_id,
          admission_date,
          admission_status,
          classes!inner (
            name
          )
        `)
        .eq('branch_id', branchId)
        .eq('current_status', 'active')
        .order('first_name');

      if (error) throw error;

      const studentsWithClass = (data || []).map(s => ({
        ...s,
        class_name: s.classes?.name || 'Unknown',
      }));

      setAllStudents(studentsWithClass);
      setFilteredStudents(studentsWithClass);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    const filtered = allStudents.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [searchQuery, allStudents]);

  const toggleClassForGroup = (classId: string) => {
    setNewGroupData((prev: any) => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(classId)
        ? prev.selectedClasses.filter((id: string) => id !== classId)
        : [...prev.selectedClasses, classId],
    }));
  };

  const toggleStudentForGroup = (studentId: string) => {
    setNewGroupData((prev: any) => ({
      ...prev,
      selectedStudents: prev.selectedStudents.includes(studentId)
        ? prev.selectedStudents.filter((id: string) => id !== studentId)
        : [...prev.selectedStudents, studentId],
    }));
  };

  const selectedClasses = classes.filter(c => newGroupData.selectedClasses.includes(c.id));
  const totalStudentsInClasses = selectedClasses.reduce((sum, c) => sum + (c.student_count || 0), 0);
  const totalMembers = totalStudentsInClasses + newGroupData.selectedStudents.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
              Create Fee Group
            </h3>
            <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroupData.name}
                  onChange={(e) => setNewGroupData((prev: any) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-sm sm:text-base"
                  placeholder="e.g., Bus Group A"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Group Type
                </label>
                <select
                  value={newGroupData.group_type}
                  onChange={(e) => setNewGroupData((prev: any) => ({ ...prev, group_type: e.target.value }))}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-sm sm:text-base"
                >
                  <option value="class">Class Group</option>
                  <option value="section">Section Group</option>
                  <option value="custom">Custom Group</option>
                  <option value="activity">Activity Group</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newGroupData.description}
                onChange={(e) => setNewGroupData((prev: any) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-sm sm:text-base"
                placeholder="Describe this group..."
              />
            </div>

            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('classes')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all border-b-2 ${
                  activeTab === 'classes'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-2">
                  <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
                  Classes
                  {newGroupData.selectedClasses.length > 0 && (
                    <span className="px-1.5 sm:px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-[10px] sm:text-xs">
                      {newGroupData.selectedClasses.length}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all border-b-2 ${
                  activeTab === 'students'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-2">
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  Students
                  {newGroupData.selectedStudents.length > 0 && (
                    <span className="px-1.5 sm:px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-[10px] sm:text-xs">
                      {newGroupData.selectedStudents.length}
                    </span>
                  )}
                </span>
              </button>
            </div>

            {activeTab === 'classes' && (
              <div className="max-h-40 sm:max-h-60 overflow-y-auto space-y-1.5 sm:space-y-2">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => toggleClassForGroup(cls.id)}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border text-left transition-all flex items-center justify-between ${
                      newGroupData.selectedClasses.includes(cls.id)
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium text-[10px] sm:text-sm">
                        {cls.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">{cls.name}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                          {cls.student_count || 0} students
                        </p>
                      </div>
                    </div>
                    {newGroupData.selectedClasses.includes(cls.id) ? (
                      <CheckCircle2 className="w-3 h-3 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-3 h-3 sm:w-5 sm:h-5 text-gray-300 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'students' && (
              <div className="space-y-2 sm:space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl text-xs sm:text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="max-h-40 sm:max-h-60 overflow-y-auto space-y-1">
                  {loadingStudents ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-4 sm:py-8 text-gray-500">
                      <User className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-2 text-gray-300" />
                      <p className="text-xs sm:text-sm">No students found</p>
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => toggleStudentForGroup(student.id)}
                        className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-left transition-all flex items-center justify-between ${
                          newGroupData.selectedStudents.includes(student.id)
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium text-[8px] sm:text-xs flex-shrink-0">
                            {student.first_name?.[0]}{student.last_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                              {student.student_id}
                            </p>
                          </div>
                        </div>
                        {newGroupData.selectedStudents.includes(student.id) ? (
                          <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300 flex-shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
              <span className="font-medium text-gray-700 dark:text-gray-300">{totalMembers}</span> total members
              {newGroupData.selectedClasses.length > 0 && (
                <span className="ml-1 sm:ml-2">
                  ({newGroupData.selectedClasses.length} classes)
                </span>
              )}
              {newGroupData.selectedStudents.length > 0 && (
                <span className="ml-1 sm:ml-2">
                  + {newGroupData.selectedStudents.length} students
                </span>
              )}
            </div>
            <div className="flex w-full sm:w-auto gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreate}
                disabled={loading || (!newGroupData.selectedClasses.length && !newGroupData.selectedStudents.length)}
                className="flex-1 sm:flex-none px-6 sm:px-8 py-2 sm:py-2.5 bg-purple-500 text-white rounded-lg sm:rounded-xl font-medium hover:bg-purple-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 text-sm sm:text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Group
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// Edit Fee Group Modal Component
// ============================================

interface EditFeeGroupModalProps {
  onClose: () => void;
  onEdit: () => void;
  classes: Class[];
  students: Student[];
  editGroupData: any;
  setEditGroupData: (data: any) => void;
  loading: boolean;
  groupName: string;
  branchId: string;
}

const EditFeeGroupModal: React.FC<EditFeeGroupModalProps> = ({
  onClose,
  onEdit,
  classes,
  students: initialStudents,
  editGroupData,
  setEditGroupData,
  loading,
  groupName,
  branchId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [activeTab, setActiveTab] = useState<'classes' | 'students'>('classes');

  useEffect(() => {
    loadAllStudents();
  }, [branchId]);

  const loadAllStudents = async () => {
    setLoadingStudents(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          first_name,
          last_name,
          class_id,
          admission_date,
          admission_status,
          classes!inner (
            name
          )
        `)
        .eq('branch_id', branchId)
        .eq('current_status', 'active')
        .order('first_name');

      if (error) throw error;

      const studentsWithClass = (data || []).map(s => ({
        ...s,
        class_name: s.classes?.name || 'Unknown',
      }));

      setAllStudents(studentsWithClass);
      setFilteredStudents(studentsWithClass);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    const filtered = allStudents.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [searchQuery, allStudents]);

  const toggleClassForGroup = (classId: string) => {
    setEditGroupData((prev: any) => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(classId)
        ? prev.selectedClasses.filter((id: string) => id !== classId)
        : [...prev.selectedClasses, classId],
    }));
  };

  const toggleStudentForGroup = (studentId: string) => {
    setEditGroupData((prev: any) => ({
      ...prev,
      selectedStudents: prev.selectedStudents.includes(studentId)
        ? prev.selectedStudents.filter((id: string) => id !== studentId)
        : [...prev.selectedStudents, studentId],
    }));
  };

  const selectedClasses = classes.filter(c => editGroupData.selectedClasses.includes(c.id));
  const totalStudentsInClasses = selectedClasses.reduce((sum, c) => sum + (c.student_count || 0), 0);
  const totalMembers = totalStudentsInClasses + editGroupData.selectedStudents.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Edit className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
              Edit Group: {groupName}
            </h3>
            <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={editGroupData.name}
                  onChange={(e) => setEditGroupData((prev: any) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-sm sm:text-base"
                  placeholder="Group name"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Group Type
                </label>
                <select
                  value={editGroupData.group_type}
                  onChange={(e) => setEditGroupData((prev: any) => ({ ...prev, group_type: e.target.value }))}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-sm sm:text-base"
                >
                  <option value="class">Class Group</option>
                  <option value="section">Section Group</option>
                  <option value="custom">Custom Group</option>
                  <option value="activity">Activity Group</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={editGroupData.description}
                onChange={(e) => setEditGroupData((prev: any) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 transition-all dark:text-white text-sm sm:text-base"
                placeholder="Describe this group..."
              />
            </div>

            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('classes')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all border-b-2 ${
                  activeTab === 'classes'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-2">
                  <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
                  Classes
                  {editGroupData.selectedClasses.length > 0 && (
                    <span className="px-1.5 sm:px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-[10px] sm:text-xs">
                      {editGroupData.selectedClasses.length}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all border-b-2 ${
                  activeTab === 'students'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-2">
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  Students
                  {editGroupData.selectedStudents.length > 0 && (
                    <span className="px-1.5 sm:px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-[10px] sm:text-xs">
                      {editGroupData.selectedStudents.length}
                    </span>
                  )}
                </span>
              </button>
            </div>

            {activeTab === 'classes' && (
              <div className="max-h-40 sm:max-h-60 overflow-y-auto space-y-1.5 sm:space-y-2">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => toggleClassForGroup(cls.id)}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border text-left transition-all flex items-center justify-between ${
                      editGroupData.selectedClasses.includes(cls.id)
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium text-[10px] sm:text-sm">
                        {cls.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">{cls.name}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                          {cls.student_count || 0} students
                        </p>
                      </div>
                    </div>
                    {editGroupData.selectedClasses.includes(cls.id) ? (
                      <CheckCircle2 className="w-3 h-3 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-3 h-3 sm:w-5 sm:h-5 text-gray-300 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'students' && (
              <div className="space-y-2 sm:space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl text-xs sm:text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="max-h-40 sm:max-h-60 overflow-y-auto space-y-1">
                  {loadingStudents ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-4 sm:py-8 text-gray-500">
                      <User className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-2 text-gray-300" />
                      <p className="text-xs sm:text-sm">No students found</p>
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => toggleStudentForGroup(student.id)}
                        className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-left transition-all flex items-center justify-between ${
                          editGroupData.selectedStudents.includes(student.id)
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium text-[8px] sm:text-xs flex-shrink-0">
                            {student.first_name?.[0]}{student.last_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                              {student.student_id}
                            </p>
                          </div>
                        </div>
                        {editGroupData.selectedStudents.includes(student.id) ? (
                          <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300 flex-shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
              <span className="font-medium text-gray-700 dark:text-gray-300">{totalMembers}</span> total members
              {editGroupData.selectedClasses.length > 0 && (
                <span className="ml-1 sm:ml-2">
                  ({editGroupData.selectedClasses.length} classes)
                </span>
              )}
              {editGroupData.selectedStudents.length > 0 && (
                <span className="ml-1 sm:ml-2">
                  + {editGroupData.selectedStudents.length} students
                </span>
              )}
            </div>
            <div className="flex w-full sm:w-auto gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onEdit}
                disabled={loading || (!editGroupData.selectedClasses.length && !editGroupData.selectedStudents.length)}
                className="flex-1 sm:flex-none px-6 sm:px-8 py-2 sm:py-2.5 bg-purple-500 text-white rounded-lg sm:rounded-xl font-medium hover:bg-purple-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 text-sm sm:text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CreateFee;