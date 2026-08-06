import api from './api';
import type { Fee, StudentFeeAssignment, FeeExemption } from '../types/fee.types';

const feeService = {
  // Create a new fee
  createFee: async (feeData: Partial<Fee>) => {
    const response = await api.post('/fees', feeData);
    return response.data;
  },

  // Get all fees
  getFees: async (params?: { branchId?: string; status?: string }) => {
    const response = await api.get('/fees', { params });
    return response.data;
  },

  // Get a single fee by ID
  getFee: async (id: string) => {
    const response = await api.get(`/fees/${id}`);
    return response.data;
  },

  // Update a fee
  updateFee: async (id: string, feeData: Partial<Fee>) => {
    const response = await api.put(`/fees/${id}`, feeData);
    return response.data;
  },

  // Delete a fee
  deleteFee: async (id: string) => {
    const response = await api.delete(`/fees/${id}`);
    return response.data;
  },

  // Create student fee assignments
  createAssignments: async (assignments: Partial<StudentFeeAssignment>[]) => {
    const response = await api.post('/fees/assignments', { assignments });
    return response.data;
  },

  // Create fee exemptions
  createExemptions: async (exemptions: Partial<FeeExemption>[]) => {
    const response = await api.post('/fees/exemptions', { exemptions });
    return response.data;
  },

  // Get fee with assignments
  getFeeWithAssignments: async (feeId: string) => {
    const response = await api.get(`/fees/${feeId}/assignments`);
    return response.data;
  },

  // Get student fees
  getStudentFees: async (studentId: string, params?: { session?: string; term?: string }) => {
    const response = await api.get(`/students/${studentId}/fees`, { params });
    return response.data;
  },

  // Get student payments
  getStudentPayments: async (studentId: string, params?: { limit?: number }) => {
    const response = await api.get(`/students/${studentId}/payments`, { params });
    return response.data;
  },

  // Get recent payments
  getRecentPayments: async (studentId: string, limit: number = 5) => {
    const response = await api.get(`/students/${studentId}/payments/recent`, { params: { limit } });
    return response.data;
  },

  // Get student exemptions
  getStudentExemptions: async (studentId: string) => {
    const response = await api.get(`/students/${studentId}/exemptions`);
    return response.data;
  },
};

export default feeService;
