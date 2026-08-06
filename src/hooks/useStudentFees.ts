import { useState, useEffect } from 'react';
import feeService from '../services/feeService';
import { FeeWithStatus, PaymentRecord, AcademicPeriod } from '../types/fee.types';
import { getAcademicPeriod } from '../utils/date';
import toast from 'react-hot-toast';

export const useStudentFees = (studentId?: string, classId?: string, branchId?: string) => {
  const [fees, setFees] = useState<FeeWithStatus[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicPeriod, setAcademicPeriod] = useState<AcademicPeriod>({
    session: '',
    term: ''
  });

  useEffect(() => {
    if (studentId && branchId) {
      fetchAllData();
    }
  }, [studentId, branchId, classId]);

  const fetchAllData = async () => {
    if (!studentId || !branchId) return;
    
    setLoading(true);
    try {
      // Get academic period
      const period = getAcademicPeriod();
      setAcademicPeriod(period);

      // Fetch fees, payments, and recent payments in parallel
      const [feesData, paymentsData, recentData] = await Promise.all([
        feeService.getStudentFees(studentId, { session: period.session, term: period.term }),
        feeService.getStudentPayments(studentId),
        feeService.getRecentPayments(studentId, 5)
      ]);

      setFees(feesData || []);
      setPayments(paymentsData || []);
      setRecentPayments(recentData || []);
    } catch (err: any) {
      console.error('Error fetching student fees:', err);
      toast.error(err.message || 'Failed to load fees');
    } finally {
      setLoading(false);
    }
  };

  const getUnpaidFees = () => {
    return fees.filter(f => f.payment_status === 'unpaid' || f.payment_status === 'pending');
  };

  const getTotalOutstanding = () => {
    return getUnpaidFees().reduce((sum, fee) => sum + fee.amount_due, 0);
  };

  const getTotalPaid = () => {
    return payments
      .filter(p => p.status === 'completed' || p.status === 'paid' || p.status === 'approved')
      .reduce((sum, p) => sum + p.amount_paid, 0);
  };

  const getPendingApproval = () => {
    return payments.filter(p => p.status === 'pending').length;
  };

  const getExemptedFees = () => {
    return fees.filter(f => f.payment_status === 'exempted');
  };

  const getCompletionRate = () => {
    const totalPaid = getTotalPaid();
    const totalOutstanding = getTotalOutstanding();
    return totalPaid + totalOutstanding > 0 ? (totalPaid / (totalPaid + totalOutstanding)) * 100 : 0;
  };

  return {
    fees,
    payments,
    recentPayments,
    loading,
    academicPeriod,
    unpaidFees: getUnpaidFees(),
    totalOutstanding: getTotalOutstanding(),
    totalPaid: getTotalPaid(),
    pendingApproval: getPendingApproval(),
    exemptedFees: getExemptedFees(),
    completionRate: getCompletionRate(),
    refetch: fetchAllData
  };
};
