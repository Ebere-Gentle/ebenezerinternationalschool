import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase/client';
import type{ Budget } from '../types';
import toast from 'react-hot-toast';

export const useBudgets = (branchId: string | null, session: string) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBudget, setTotalBudget] = useState(0);

  const fetchBudgets = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('budget')
        .select('*')
        .eq('branch_id', branchId)
        .eq('fiscal_year', session.split('/')[0]);

      if (error) throw error;
      setBudgets(data || []);
      setTotalBudget(data?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0);
    } catch (error: any) {
      console.error('Error fetching budgets:', error);
      toast.error(error.message || 'Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  }, [branchId, session]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const addBudget = async (budgetData: Partial<Budget>) => {
    try {
      const { data, error } = await supabase
        .from('budget')
        .insert([budgetData])
        .select()
        .single();

      if (error) throw error;
      await fetchBudgets();
      toast.success('Budget added successfully');
      return data;
    } catch (error: any) {
      console.error('Error adding budget:', error);
      toast.error(error.message || 'Failed to add budget');
      return null;
    }
  };

  const updateBudget = async (id: string, updates: Partial<Budget>) => {
    try {
      const { data, error } = await supabase
        .from('budget')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchBudgets();
      toast.success('Budget updated successfully');
      return data;
    } catch (error: any) {
      console.error('Error updating budget:', error);
      toast.error(error.message || 'Failed to update budget');
      return null;
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      const { error } = await supabase
        .from('budget')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchBudgets();
      toast.success('Budget deleted successfully');
      return true;
    } catch (error: any) {
      console.error('Error deleting budget:', error);
      toast.error(error.message || 'Failed to delete budget');
      return false;
    }
  };

  return {
    budgets,
    loading,
    totalBudget,
    addBudget,
    updateBudget,
    deleteBudget,
    refetch: fetchBudgets,
  };
};
