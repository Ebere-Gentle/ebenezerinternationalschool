import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase/client';

import toast from 'react-hot-toast';
import type { FinancialSummary } from '../types';

export const useFinancialSummary = (branchId: string | null, term: any, session: string) => {
  const [summary, setSummary] = useState<FinancialSummary>({
    openingBalance: 0,
    closingBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    outstandingFees: 0,
    expectedRevenue: 0,
    budgetUtilization: 0,
    collectionRate: 0,
    cashAvailable: 0,
    bankBalance: 0,
    pendingApprovals: 0,
    totalBudget: 0,
    totalVariance: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!branchId || !term) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch opening balance - simple query without joins
      const { data: openingData, error: openingError } = await supabase
        .from('opening_balances')
        .select('amount')
        .eq('branch_id', branchId)
        .eq('academic_session', session)
        .eq('academic_term', term.term)
        .maybeSingle();

      if (openingError && openingError.code !== 'PGRST116') {
        console.error('Error fetching opening balance:', openingError);
      }

      const openingBalance = openingData?.amount || 0;

      // Fetch payments - simple query
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount_paid, status')
        .eq('branch_id', branchId)
        .gte('payment_date', term.start_date)
        .lte('payment_date', term.end_date);

      if (paymentsError) throw paymentsError;

      const totalIncome = payments?.filter(p => p.status === 'completed' || p.status === 'paid')
        .reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;

      const outstandingFees = payments?.filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;

      // Fetch expenses - simple query
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, status')
        .eq('branch_id', branchId)
        .gte('expense_date', term.start_date)
        .lte('expense_date', term.end_date);

      if (expensesError) throw expensesError;

      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const pendingApprovals = expenses?.filter(e => e.status === 'pending').length || 0;

      // Fetch budget - simple query
      const { data: budgets, error: budgetsError } = await supabase
        .from('budget')
        .select('amount')
        .eq('branch_id', branchId)
        .eq('fiscal_year', session.split('/')[0]);

      if (budgetsError) throw budgetsError;

      const totalBudget = budgets?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;
      const expectedRevenue = totalIncome + outstandingFees;

      setSummary({
        openingBalance,
        closingBalance: openingBalance + totalIncome - totalExpenses,
        totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
        outstandingFees,
        expectedRevenue,
        budgetUtilization: totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0,
        collectionRate: expectedRevenue > 0 ? (totalIncome / expectedRevenue) * 100 : 0,
        cashAvailable: openingBalance + totalIncome - totalExpenses,
        bankBalance: openingBalance + totalIncome - totalExpenses,
        pendingApprovals,
        totalBudget,
        totalVariance: totalBudget - totalExpenses,
      });

    } catch (error: any) {
      console.error('Error fetching financial summary:', error);
      toast.error(error.message || 'Failed to fetch financial summary');
    } finally {
      setLoading(false);
    }
  }, [branchId, term, session]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, refetch: fetchSummary };
};
