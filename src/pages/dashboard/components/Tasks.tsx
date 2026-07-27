import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Users, Receipt, UserPlus, Calendar, AlertCircle} from 'lucide-react';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface Task {
  id: string;
  label: string;
  count: number;
  progress: number;
  icon: React.ElementType;
  color: string;
  items: any[];
}

const Tasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserBranch = async () => {
      if (user?.id) {
        try {
          let branchId = user.branch_id;
          
          if (!branchId) {
            const { data, error } = await supabase
              .from('users')
              .select('branch_id')
              .eq('id', user.id)
              .single();
            
            if (!error && data) {
              branchId = data.branch_id;
            }
          }
          
          if (branchId) {
            setUserBranchId(branchId);
            await fetchTasks(branchId);
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error('Error fetching user branch:', error);
          setLoading(false);
        }
      }
    };
    
    fetchUserBranch();
  }, [user]);

  const fetchTasks = async (branchId: string) => {
    setLoading(true);
    try {
      // 1. Pending Admissions (students with pending admission_status)
      const { data: pendingAdmissions, count: admissionCount } = await supabase
        .from('students')
        .select('id', { count: 'exact' })
        .eq('branch_id', branchId)
        .eq('admission_status', 'pending');

      // 2. Pending Payments (payments with pending status)
      const { data: pendingPayments, count: paymentCount } = await supabase
        .from('payments')
        .select('id', { count: 'exact' })
        .eq('branch_id', branchId)
        .eq('status', 'pending');

      // 3. Overdue Payments (payments with due date passed and still pending)
      const today = dayjs().format('YYYY-MM-DD');
      const { data: overduePayments, count: overdueCount } = await supabase
        .from('payments')
        .select('id', { count: 'exact' })
        .eq('branch_id', branchId)
        .eq('status', 'pending')
        .lt('due_date', today);

      // 4. Inactive Students (students with inactive status)
      const { data: inactiveStudents, count: inactiveCount } = await supabase
        .from('students')
        .select('id', { count: 'exact' })
        .eq('branch_id', branchId)
        .eq('current_status', 'inactive');

      // 5. Pending Approvals (payments pending approval - same as pending payments)
      const pendingApprovals = pendingPayments || [];

      // 6. New Admissions Today
      const todayStart = dayjs().startOf('day').format('YYYY-MM-DD');
      const { data: newAdmissions, count: newAdmissionCount } = await supabase
        .from('students')
        .select('id', { count: 'exact' })
        .eq('branch_id', branchId)
        .gte('created_at', todayStart);

      // Calculate progress percentages (mock progress based on counts)
      const maxCount = Math.max(
        admissionCount || 0,
        paymentCount || 0,
        overdueCount || 0,
        inactiveCount || 0,
        newAdmissionCount || 0,
        1
      );

      const taskList: Task[] = [
        {
          id: 'admissions',
          label: 'Pending Admissions',
          count: admissionCount || 0,
          progress: admissionCount ? Math.min(Math.round((admissionCount / maxCount) * 100), 100) : 0,
          icon: UserPlus,
          color: 'from-blue-500 to-cyan-500',
          items: pendingAdmissions || [],
        },
        {
          id: 'payments',
          label: 'Pending Payments',
          count: paymentCount || 0,
          progress: paymentCount ? Math.min(Math.round((paymentCount / maxCount) * 100), 100) : 0,
          icon: Receipt,
          color: 'from-yellow-500 to-orange-500',
          items: pendingPayments || [],
        },
        {
          id: 'overdue',
          label: 'Overdue Payments',
          count: overdueCount || 0,
          progress: overdueCount ? Math.min(Math.round((overdueCount / maxCount) * 100), 100) : 0,
          icon: AlertCircle,
          color: 'from-red-500 to-rose-500',
          items: overduePayments || [],
        },
        {
          id: 'inactive',
          label: 'Inactive Students',
          count: inactiveCount || 0,
          progress: inactiveCount ? Math.min(Math.round((inactiveCount / maxCount) * 100), 100) : 0,
          icon: Users,
          color: 'from-gray-500 to-slate-500',
          items: inactiveStudents || [],
        },
        {
          id: 'approvals',
          label: 'Pending Approvals',
          count: pendingApprovals?.length || 0,
          progress: pendingApprovals?.length ? Math.min(Math.round((pendingApprovals.length / maxCount) * 100), 100) : 0,
          icon: CheckSquare,
          color: 'from-purple-500 to-violet-500',
          items: pendingApprovals || [],
        },
        {
          id: 'new',
          label: 'New Today',
          count: newAdmissionCount || 0,
          progress: newAdmissionCount ? Math.min(Math.round((newAdmissionCount / maxCount) * 100), 100) : 0,
          icon: Calendar,
          color: 'from-green-500 to-emerald-500',
          items: newAdmissions || [],
        },
      ];

      setTasks(taskList);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast.error(error.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress > 80) return 'from-green-500 to-emerald-500';
    if (progress > 50) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-2">
            <CheckSquare className="h-5 w-5 text-white" />
          </div>
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="ml-auto h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  const totalPending = tasks.reduce((acc, t) => acc + t.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-2">
          <CheckSquare className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tasks</h3>
        <span className="ml-auto rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          {totalPending} pending
        </span>
      </div>

      {tasks.every(t => t.count === 0) ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/30">
            <CheckSquare className="h-8 w-8 text-green-500 dark:text-green-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">All caught up! 🎉</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">No pending tasks at the moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const Icon = task.icon;
            const progressColor = getProgressColor(task.progress);
            const isUrgent = task.id === 'overdue' && task.count > 0;
            const isHigh = task.id === 'payments' && task.count > 5;

            return (
              <div key={task.id} className="group">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${task.count > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${
                      isUrgent ? 'text-red-600 dark:text-red-400' :
                      isHigh ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-gray-700 dark:text-gray-300'
                    }`}>
                      {task.label}
                    </span>
                    {isUrgent && (
                      <span className="animate-pulse text-xs font-medium text-red-500">⚠️</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${
                      task.count > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                    }`}>
                      {task.count} items
                    </span>
                    <span className="text-xs text-gray-400">{task.progress}%</span>
                  </div>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${task.progress}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r ${progressColor}`}
                  />
                  {task.count > 0 && (
                    <div className="absolute right-0 top-0 h-full w-1 bg-white/20 rounded-full" />
                  )}
                </div>
                {task.id === 'overdue' && task.count > 0 && (
                  <p className="mt-1 text-xs text-red-500">
                    {task.count} overdue payment{task.count > 1 ? 's' : ''} require attention
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default Tasks;
