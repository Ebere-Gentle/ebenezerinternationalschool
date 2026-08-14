// src/pages/adminAsst/hooks/useAdminData.ts

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../config/supabase/client';

export interface Student {
  id: string;
  student_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  gender: string;
  passport_url: string | null;
  date_of_birth: string;
  current_class: string;
  current_session: string;
  status: string;
  email: string | null;
  phone_number: string | null;
  parent_id: string | null;
  created_at: string;
  class_name?: string;
  class_id?: string;
  blood_group?: string;
  genotype?: string;
  home_address?: string;
  class_at_collection?: string;
  state_of_origin?: string;
  nationality?: string;
  lga?: string;
  religion?: string;
  department?: string;
  class_arm?: string;
  residential_address?: string;
  current_status?: string;
  admission_status?: string;
  admission_number?: string;
}

export interface Class {
  id: string;
  name: string;
  code: string;
  level: string;
  department: string | null;
  capacity: number;
  current_students: number;
  status: string;
}

export interface Session {
  id: string;
  session_name: string;
  term_name: string;
  term_number: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface Collection {
  id: string;
  student_id: string;
  student_name: string;
  item_name: string;
  quantity: number;
  class_at_collection: string;
  session_name: string;
  term_name: string;
  collection_date: string;
  remarks: string | null;
  signature_data: string | null;
  signature_url: string | null;
  status: string;
  term_id: string | null;
  session_id: string | null;
}

export interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  quantity_added: number;
  quantity_distributed: number;
  quantity_remaining: number;
  minimum_stock: number;
}

export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  created_at: string;
}

export const useAdminData = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const stats = {
    students: students.length,
    classes: classes.length,
    sessions: sessions.length,
    collections: collections.length,
    inventory: inventory.length,
  };

  const fetchStudents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          classes:class_id (
            id,
            name,
            code,
            level
          )
        `)
        .order('first_name')
        .limit(200);

      if (error) throw error;
      
      const mappedStudents = data?.map((student: any) => ({
        ...student,
        class_name: student.classes?.name || 'Not Assigned',
        class_code: student.classes?.code || 'N/A',
        class_id: student.class_id,
      })) || [];
      
      setStudents(mappedStudents);
      return mappedStudents;
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');

      if (error) throw error;
      setClasses(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching classes:', error);
      return [];
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  }, []);

  const fetchCollections = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('collection_date', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching collections:', error);
      setCollections([]);
      return [];
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('item_name');

      if (error) throw error;
      setInventory(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setInventory([]);
      return [];
    }
  }, []);

  const fetchActivityLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivityLogs(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      setActivityLogs([]);
      return [];
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStudents(),
        fetchClasses(),
        fetchSessions(),
        fetchCollections(),
        fetchInventory(),
        fetchActivityLogs(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchStudents, fetchClasses, fetchSessions, fetchCollections, fetchInventory, fetchActivityLogs]);

  useEffect(() => {
    refreshData();
  }, []);

  return {
    students,
    classes,
    sessions,
    collections,
    inventory,
    activityLogs,
    stats,
    loading,
    refreshData,
    fetchStudents,
    fetchClasses,
    fetchSessions,
    fetchCollections,
    fetchInventory,
    fetchActivityLogs,
  };
};
