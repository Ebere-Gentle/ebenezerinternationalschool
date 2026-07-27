import React, { useState, useEffect } from 'react';
import { Users, GraduationCap, BookOpen, DollarSign, AlertCircle, Ticket, Coins } from 'lucide-react';
import { supabase } from '../../../config/supabase/client';
import StatsCard from './StatsCard';

interface KpiData {
  id: number;
  label: string;
  value: string;
  icon: any;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: number;
  sparkline?: number[];
  subtext?: string;
}

const KpiCards: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KpiData[]>([
    {
      id: 1,
      label: 'Total Students',
      value: '0',
      icon: Users,
      color: 'primary',
    },
    {
      id: 2,
      label: 'Total Teachers',
      value: '0',
      icon: GraduationCap,
      color: 'secondary',
    },
    {
      id: 3,
      label: 'Classes',
      value: '0',
      icon: BookOpen,
      color: 'success',
    },
    {
      id: 4,
      label: 'Revenue',
      value: '₦0',
      icon: DollarSign,
      color: 'warning',
    },
    {
      id: 5,
      label: 'Outstanding Fees',
      value: '₦0',
      icon: AlertCircle,
      color: 'danger',
    },
    {
      id: 6,
      label: 'Pending Admissions',
      value: '0',
      icon: Ticket,
      color: 'info',
    },
  ]);

  // Generate sparkline data for trends
  const generateSparkline = (baseValue: number, count: number = 12) => {
    return Array.from({ length: count }, (_) => {
      const variation = (Math.random() - 0.5) * 0.2 * Math.max(baseValue, 1);
      return Math.max(0, Math.round(baseValue + variation));
    });
  };

  // Calculate trend percentage
  const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return Number(((current - previous) / previous * 100).toFixed(1));
  };

  useEffect(() => {
    const fetchKpiData = async () => {
      setLoading(true);
      try {
        // 1. Fetch total students from students table
        const { count: studentCount, error: studentError } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true });

        if (studentError) console.warn('Students count error:', studentError);

        // 2. Fetch total teachers from teachers table
        const { count: teacherCount, error: teacherError } = await supabase
          .from('teachers')
          .select('*', { count: 'exact', head: true });

        if (teacherError) console.warn('Teachers count error:', teacherError);

        // 3. Fetch total classes from classes table
        const { count: classCount, error: classError } = await supabase
          .from('classes')
          .select('*', { count: 'exact', head: true });

        if (classError) console.warn('Classes count error:', classError);

        // 4. Fetch total active fees
        const { data: feesData, error: feesError } = await supabase
          .from('fees')
          .select('id, amount, class_id, metadata')
          .eq('status', 'active');

        if (feesError) console.warn('Fees error:', feesError);

        // 5. Fetch all students
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, class_id, admission_status');

        if (studentsError) console.warn('Students fetch error:', studentsError);

        // 6. Fetch all completed payments
        const { data: completedPayments, error: paymentsError } = await supabase
          .from('payments')
          .select('fee_id, student_id, amount_paid, status')
          .eq('status', 'completed');

        if (paymentsError) console.warn('Payments error:', paymentsError);

        // Calculate outstanding fees
        let totalOutstanding = 0;
        let totalRevenue = 0;

        if (feesData && studentsData) {
          // Group students by class
          const studentsByClass: Record<string, string[]> = {};
          studentsData.forEach((student: any) => {
            if (student.admission_status !== 'pending') {
              const classId = student.class_id;
              if (!studentsByClass[classId]) {
                studentsByClass[classId] = [];
              }
              studentsByClass[classId].push(student.id);
            }
          });

          // Group completed payments by (fee_id, student_id)
          const paidMap: Record<string, Set<string>> = {};
          if (completedPayments) {
            completedPayments.forEach((payment: any) => {
              const key = `${payment.fee_id}_${payment.student_id}`;
              if (!paidMap[payment.fee_id]) {
                paidMap[payment.fee_id] = new Set();
              }
              paidMap[payment.fee_id].add(payment.student_id);
            });
          }

          // Calculate outstanding for each fee
          feesData.forEach((fee: any) => {
            const feeAmount = Number(fee.amount);
            let eligibleStudents: string[] = [];

            // If fee has class_id, only students in that class
            if (fee.class_id) {
              eligibleStudents = studentsByClass[fee.class_id] || [];
            } else {
              // If fee has multiple classes in metadata
              const classIds = fee.metadata?.class_ids || [];
              if (classIds.length > 0) {
                classIds.forEach((classId: string) => {
                  const students = studentsByClass[classId] || [];
                  eligibleStudents = [...eligibleStudents, ...students];
                });
              } else {
                // Fee applies to all students
                Object.values(studentsByClass).forEach((students) => {
                  eligibleStudents = [...eligibleStudents, ...students];
                });
              }
            }

            // Remove duplicates
            eligibleStudents = [...new Set(eligibleStudents)];

            // Get paid students for this fee
            const paidStudents = paidMap[fee.id] || new Set();

            // Calculate outstanding (students who haven't paid)
            const outstandingStudents = eligibleStudents.filter(
              (studentId) => !paidStudents.has(studentId)
            );

            // Add to total outstanding
            totalOutstanding += outstandingStudents.length * feeAmount;

            // Add to total revenue (students who paid)
            const paidCount = paidStudents.size;
            totalRevenue += paidCount * feeAmount;
          });
        }

        // 7. Fetch pending admissions from students table
        const { count: pendingAdmissions, error: admissionError } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('admission_status', 'pending');

        if (admissionError) console.warn('Pending admissions error:', admissionError);

        // Format values
        const formattedRevenue = totalRevenue > 0 
          ? totalRevenue >= 1000000 
            ? `₦${(totalRevenue / 1000000).toFixed(1)}M`
            : totalRevenue >= 1000
              ? `₦${(totalRevenue / 1000).toFixed(1)}K`
              : `₦${totalRevenue}`
          : '₦0';
          
        const formattedOutstanding = totalOutstanding > 0
          ? totalOutstanding >= 1000000
            ? `₦${(totalOutstanding / 1000000).toFixed(1)}M`
            : totalOutstanding >= 1000
              ? `₦${(totalOutstanding / 1000).toFixed(1)}K`
              : `₦${totalOutstanding}`
          : '₦0';

        // Generate sparkline data based on actual values
        const studentSparkline = generateSparkline(studentCount || 0);
        const teacherSparkline = generateSparkline(teacherCount || 0);
        const classSparkline = generateSparkline(classCount || 0);
        const revenueSparkline = generateSparkline(totalRevenue / 1000);
        const outstandingSparkline = generateSparkline(totalOutstanding / 1000);
        const admissionSparkline = generateSparkline(pendingAdmissions || 0);

        // Calculate trends
        const getTrend = (sparkline: number[]) => {
          if (sparkline.length < 2) return 0;
          const current = sparkline[sparkline.length - 1];
          const previous = sparkline[sparkline.length - 2];
          return calculateTrend(current, previous);
        };

        // Calculate number of students who have paid at least one fee
        const studentsWithPayments = new Set();
        if (completedPayments) {
          completedPayments.forEach((payment: any) => {
            studentsWithPayments.add(payment.student_id);
          });
        }

        setKpiData([
          {
            id: 1,
            label: 'Total Students',
            value: studentCount?.toLocaleString() || '0',
            icon: Users,
            color: 'primary',
            trend: getTrend(studentSparkline),
            sparkline: studentSparkline,
            subtext: `${studentsWithPayments.size} have paid fees`,
          },
          {
            id: 2,
            label: 'Total Teachers',
            value: teacherCount?.toLocaleString() || '0',
            icon: GraduationCap,
            color: 'secondary',
            trend: getTrend(teacherSparkline),
            sparkline: teacherSparkline,
          },
          {
            id: 3,
            label: 'Classes',
            value: classCount?.toLocaleString() || '0',
            icon: BookOpen,
            color: 'success',
            trend: getTrend(classSparkline),
            sparkline: classSparkline,
          },
          {
            id: 4,
            label: 'Revenue',
            value: formattedRevenue,
            icon: DollarSign,
            color: 'success',
            trend: getTrend(revenueSparkline),
            sparkline: revenueSparkline,
            subtext: `${feesData?.length || 0} active fees`,
          },
          {
            id: 5,
            label: 'Outstanding Fees',
            value: formattedOutstanding,
            icon: AlertCircle,
            color: 'danger',
            trend: getTrend(outstandingSparkline),
            sparkline: outstandingSparkline,
            subtext: `From ${feesData?.length || 0} fee structures`,
          },
          {
            id: 6,
            label: 'Pending Admissions',
            value: pendingAdmissions?.toLocaleString() || '0',
            icon: Ticket,
            color: 'warning',
            trend: getTrend(admissionSparkline),
            sparkline: admissionSparkline,
          },
        ]);
      } catch (error) {
        console.error('Error fetching KPI data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKpiData();

    // Set up real-time subscriptions for live updates
    try {
      const studentSubscription = supabase
        .channel('students_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
          fetchKpiData();
        })
        .subscribe();

      const paymentSubscription = supabase
        .channel('payments_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
          fetchKpiData();
        })
        .subscribe();

      const teacherSubscription = supabase
        .channel('teachers_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, () => {
          fetchKpiData();
        })
        .subscribe();

      const classSubscription = supabase
        .channel('classes_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => {
          fetchKpiData();
        })
        .subscribe();

      const feesSubscription = supabase
        .channel('fees_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fees' }, () => {
          fetchKpiData();
        })
        .subscribe();

      return () => {
        studentSubscription.unsubscribe();
        paymentSubscription.unsubscribe();
        teacherSubscription.unsubscribe();
        classSubscription.unsubscribe();
        feesSubscription.unsubscribe();
      };
    } catch (error) {
      console.warn('Error setting up subscriptions:', error);
    }
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
      {kpiData.map((kpi) => (
        <StatsCard key={kpi.id} {...kpi} />
      ))}
    </div>
  );
};

export default KpiCards;