import { useState, useEffect } from 'react';
import feeService from '../services/feeService';
import { Fee, FeeWithStatus, PaymentRecord } from '../types/fee.types';
import toast from 'react-hot-toast';

export const useFees = (branchId?: string) => {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branchId) {
      fetchFees();
    }
  }, [branchId]);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const data = await feeService.getFees({ branchId });
      setFees(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch fees');
      toast.error('Failed to load fees');
    } finally {
      setLoading(false);
    }
  };

  const createFee = async (feeData: any) => {
    try {
      const result = await feeService.createFee(feeData);
      await fetchFees();
      return result;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create fee');
      throw err;
    }
  };

  const updateFee = async (id: string, feeData: any) => {
    try {
      const result = await feeService.updateFee(id, feeData);
      await fetchFees();
      return result;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update fee');
      throw err;
    }
  };

  const deleteFee = async (id: string) => {
    try {
      await feeService.deleteFee(id);
      await fetchFees();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete fee');
      throw err;
    }
  };

  return { fees, loading, error, createFee, updateFee, deleteFee, refetch: fetchFees };
};
