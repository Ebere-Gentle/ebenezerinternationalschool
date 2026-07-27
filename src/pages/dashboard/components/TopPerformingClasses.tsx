import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';
import toast from 'react-hot-toast';

interface ClassPerformance {
  rank: number;
  id: string;
  name: string;
  percentage: number;
  trend: number;
  students: number;
  paid: number;
  outstanding: number;
}

const TopPerformingClasses: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassPerformance[]>([]);
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
            await fetchClassPerformance(branchId);
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

  const fetchClassPerformance = async (branchId: string) => {
    setLoading(true);
    try {
      // Get all classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('branch_id', branchId)
        .order('name');

      if (classesError) throw classesError;

      if (!classesData || classesData.length === 0) {
        setClasses([]);
        setLoading(false);
        return;
      }

      // Get students per class
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, class_id')
        .eq('branch_id', branchId)
        .eq('current_status', 'active');

      if (studentsError) throw studentsError;

      // Get payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('student_id, amount_paid, status')
        .eq('branch_id', branchId)
        .in('status', ['completed', 'paid']);

      if (paymentsError) throw paymentsError;

      // Calculate performance per class
      const classPerformance = classesData.map(cls => {
        const students = studentsData?.filter(s => s.class_id === cls.id) || [];
        const studentIds = students.map(s => s.id);
        
        // Get payments for students in this class
        const classPayments = paymentsData?.filter(p => 
          studentIds.includes(p.student_id)
        ) || [];

        const totalPaid = classPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
        const studentCount = students.length;
        const paidStudents = new Set(classPayments.map(p => p.student_id)).size;

        // Calculate collection percentage
        const percentage = studentCount > 0 ? (paidStudents / studentCount) * 100 : 0;

        // Calculate trend (mock - compare with previous month)
        const trend = Math.round((Math.random() * 10) - 3); // -3 to +7 for demo

        return {
          rank: 0,
          id: cls.id,
          name: cls.name || 'Unknown',
          percentage: Math.round(percentage),
          trend: trend,
          students: studentCount,
          paid: paidStudents,
          outstanding: studentCount - paidStudents,
        };
      });

      // Sort by percentage descending and assign ranks
      const sorted = classPerformance
        .filter(c => c.students > 0)
        .sort((a, b) => b.percentage - a.percentage)
        .map((cls, index) => ({
          ...cls,
          rank: index + 1
        }));

      setClasses(sorted.slice(0, 5));
    } catch (error: any) {
      console.error('Error fetching class performance:', error);
      toast.error(error.message || 'Failed to load class performance');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 p-2">
            <Award className="h-5 w-5 text-white" />
          </div>
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 p-2">
          <Award className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Classes</h3>
        <span className="ml-auto text-xs text-gray-400">Collection Rate</span>
      </div>

      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-gray-100 p-4 dark:bg-gray-700/50">
            <Award className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">No classes found</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add classes to see performance</p>
        </div>
      ) : (
        <div className="space-y-2">
          {classes.map((cls) => (
            <div 
              key={cls.id} 
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                cls.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-yellow-500' :
                cls.rank === 2 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                cls.rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                'bg-gray-400'
              }`}>
                {cls.rank}
              </div>
              <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
                {cls.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {cls.percentage}%
                </span>
                <span className={`flex items-center gap-0.5 text-xs ${
                  cls.trend > 0 ? 'text-green-600' : cls.trend < 0 ? 'text-red-600' : 'text-gray-400'
                }`}>
                  {cls.trend > 0 && <TrendingUp className="h-3 w-3" />}
                  {cls.trend < 0 && <TrendingDown className="h-3 w-3" />}
                  {cls.trend !== 0 && Math.abs(cls.trend)}%
                </span>
              </div>
              <div className="hidden sm:block text-xs text-gray-400">
                <span className="text-green-600">{cls.paid}</span>/{cls.students}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default TopPerformingClasses;
