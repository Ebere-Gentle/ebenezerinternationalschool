import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase/client';
import type{ Payment, IncomeSource } from '../types';
import toast from 'react-hot-toast';

export const useIncome = (branchId: string | null, term: any) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [outstandingFees, setOutstandingFees] = useState(0);

  const fetchIncome = useCallback(async () => {
    if (!branchId || !term) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch payments without nested select
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('branch_id', branchId)
        .gte('payment_date', term.start_date)
        .lte('payment_date', term.end_date);

      if (paymentsError) throw paymentsError;

      const completedPayments = paymentsData?.filter(p => p.status === 'completed' || p.status === 'paid') || [];
      const pendingPayments = paymentsData?.filter(p => p.status === 'pending') || [];

      const totalCollected = completedPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
      const totalOutstanding = pendingPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);

      // Fetch student names separately for display
      const studentIds = [...new Set(paymentsData?.map(p => p.student_id).filter(Boolean) || [])];
      let studentNames: Record<string, string> = {};
      
      if (studentIds.length > 0) {
        const { data: studentsData } = await supabase
          .from('students')
          .select('id, first_name, last_name, admission_number')
          .in('id', studentIds);
        
        if (studentsData) {
          studentNames = studentsData.reduce((acc, s) => {
            acc[s.id] = `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown Student';
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Fetch fee names separately
      const feeIds = [...new Set(paymentsData?.map(p => p.fee_id).filter(Boolean) || [])];
      let feeNames: Record<string, string> = {};
      
      if (feeIds.length > 0) {
        const { data: feesData } = await supabase
          .from('fees')
          .select('id, name, category')
          .in('id', feeIds);
        
        if (feesData) {
          feeNames = feesData.reduce((acc, f) => {
            acc[f.id] = f.name || 'N/A';
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Combine data
      const paymentsWithDetails = (paymentsData || []).map(p => ({
        ...p,
        student_name: studentNames[p.student_id] || 'Unknown Student',
        fee_name: feeNames[p.fee_id] || 'N/A',
      }));

      setPayments(paymentsWithDetails);
      setTotalIncome(totalCollected);
      setOutstandingFees(totalOutstanding);

      // Generate income sources
      const sources: IncomeSource[] = [
        { id: 'school_fees', name: 'School Fees', category: 'Tuition', expected: 0, collected: 0, outstanding: 0, collectionRate: 0, studentsPaid: 0, studentsOwing: 0 },
        { id: 'admission', name: 'Admission Fees', category: 'Registration', expected: 0, collected: 0, outstanding: 0, collectionRate: 0, studentsPaid: 0, studentsOwing: 0 },
        { id: 'hostel', name: 'Hostel Fees', category: 'Accommodation', expected: 0, collected: 0, outstanding: 0, collectionRate: 0, studentsPaid: 0, studentsOwing: 0 },
        { id: 'transport', name: 'Transport Fees', category: 'Services', expected: 0, collected: 0, outstanding: 0, collectionRate: 0, studentsPaid: 0, studentsOwing: 0 },
        { id: 'books', name: 'Books & Materials', category: 'Academic', expected: 0, collected: 0, outstanding: 0, collectionRate: 0, studentsPaid: 0, studentsOwing: 0 },
        { id: 'uniform', name: 'Uniform Fees', category: 'Academic', expected: 0, collected: 0, outstanding: 0, collectionRate: 0, studentsPaid: 0, studentsOwing: 0 },
        { id: 'cafeteria', name: 'Cafeteria', category: 'Services', expected: 0, collected: 0, outstanding: 0, collectionRate: 0, studentsPaid: 0, studentsOwing: 0 },
        { id: 'examination', name: 'Examination Fees', category: 'Academic', expected: 0, collected: 0, outstanding: 0, collectionRate: 0, studentsPaid: 0, studentsOwing: 0 },
        { id: 'other', name: 'Other Income', category: 'Miscellaneous', expected: 0, collected: 0, outstanding: 0, collectionRate: 0, studentsPaid: 0, studentsOwing: 0 },
      ];

      // Calculate source totals from payments
      completedPayments.forEach(p => {
        // Try to determine category from fee or use a default
        let category = 'other';
        if (p.fee_id && feeNames[p.fee_id]) {
          // You would need a mapping from fee name to category
          // For now, use a simple mapping based on fee name
          const feeName = feeNames[p.fee_id]?.toLowerCase() || '';
          if (feeName.includes('school') || feeName.includes('tuition')) category = 'school_fees';
          else if (feeName.includes('admission')) category = 'admission';
          else if (feeName.includes('hostel')) category = 'hostel';
          else if (feeName.includes('transport')) category = 'transport';
          else if (feeName.includes('book') || feeName.includes('material')) category = 'books';
          else if (feeName.includes('uniform')) category = 'uniform';
          else if (feeName.includes('cafeteria') || feeName.includes('food')) category = 'cafeteria';
          else if (feeName.includes('exam')) category = 'examination';
        }
        
        const source = sources.find(s => s.id === category);
        if (source) {
          source.collected += p.amount_paid || 0;
          source.studentsPaid += 1;
        }
      });

      pendingPayments.forEach(p => {
        let category = 'other';
        if (p.fee_id && feeNames[p.fee_id]) {
          const feeName = feeNames[p.fee_id]?.toLowerCase() || '';
          if (feeName.includes('school') || feeName.includes('tuition')) category = 'school_fees';
          else if (feeName.includes('admission')) category = 'admission';
          else if (feeName.includes('hostel')) category = 'hostel';
          else if (feeName.includes('transport')) category = 'transport';
          else if (feeName.includes('book') || feeName.includes('material')) category = 'books';
          else if (feeName.includes('uniform')) category = 'uniform';
          else if (feeName.includes('cafeteria') || feeName.includes('food')) category = 'cafeteria';
          else if (feeName.includes('exam')) category = 'examination';
        }
        
        const source = sources.find(s => s.id === category);
        if (source) {
          source.outstanding += p.amount_paid || 0;
          source.studentsOwing += 1;
        }
      });

      // Calculate rates and set expected
      sources.forEach(s => {
        s.expected = s.collected + s.outstanding;
        s.collectionRate = s.expected > 0 ? (s.collected / s.expected) * 100 : 0;
      });

      setIncomeSources(sources);

    } catch (error: any) {
      console.error('Error fetching income:', error);
      toast.error(error.message || 'Failed to fetch income data');
    } finally {
      setLoading(false);
    }
  }, [branchId, term]);

  useEffect(() => {
    fetchIncome();
  }, [fetchIncome]);

  return {
    payments,
    loading,
    totalIncome,
    outstandingFees,
    incomeSources,
    refetch: fetchIncome,
  };
};
