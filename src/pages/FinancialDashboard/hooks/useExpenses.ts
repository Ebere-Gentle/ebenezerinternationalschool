import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase/client';
import type{ Expense } from '../types';
import toast from 'react-hot-toast';

export const useExpenses = (branchId: string | null, termId: string | null, term: any) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const fetchExpenses = useCallback(async () => {
    if (!branchId || !termId || !term) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('branch_id', branchId);

      if (term) {
        query = query
          .gte('expense_date', term.start_date)
          .lte('expense_date', term.end_date);
      }

      const { data, error } = await query.order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
      setTotalExpenses(data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0);
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      toast.error(error.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, [branchId, termId, term]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpense = async (expenseData: Partial<Expense>) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single();

      if (error) throw error;
      await fetchExpenses();
      toast.success('Expense added successfully');
      return data;
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast.error(error.message || 'Failed to add expense');
      return null;
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchExpenses();
      toast.success('Expense updated successfully');
      return data;
    } catch (error: any) {
      console.error('Error updating expense:', error);
      toast.error(error.message || 'Failed to update expense');
      return null;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchExpenses();
      toast.success('Expense deleted successfully');
      return true;
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      toast.error(error.message || 'Failed to delete expense');
      return false;
    }
  };

  const approveExpense = async (id: string, approvedBy: string) => {
    return updateExpense(id, {
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    });
  };

  const rejectExpense = async (id: string) => {
    return updateExpense(id, { status: 'rejected' });
  };

  const markAsPaid = async (id: string) => {
    return updateExpense(id, { status: 'paid' });
  };

  return {
    expenses,
    loading,
    totalExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    approveExpense,
    rejectExpense,
    markAsPaid,
    refetch: fetchExpenses,
  };
};
