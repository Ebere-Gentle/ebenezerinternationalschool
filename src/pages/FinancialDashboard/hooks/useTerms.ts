import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabase/client';
import type { Term } from '../types';
import toast from 'react-hot-toast';

export const useTerms = (branchId: string | null) => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);

  useEffect(() => {
    if (branchId) {
      fetchTerms();
    }
  }, [branchId]);

  const fetchTerms = async () => {
    if (!branchId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('terms')
        .select('*')
        .eq('branch_id', branchId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setTerms(data || []);
      
      const active = data?.find(t => t.is_active);
      if (active) {
        setActiveTerm(active);
      } else if (data && data.length > 0) {
        setActiveTerm(data[0]);
      }
    } catch (error: any) {
      console.error('Error fetching terms:', error);
      toast.error(error.message || 'Failed to fetch terms');
    } finally {
      setLoading(false);
    }
  };

  return { terms, loading, activeTerm, setActiveTerm, refetch: fetchTerms };
};
