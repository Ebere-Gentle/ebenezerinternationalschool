import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase/client';
import { AttendanceRecord, AttendanceStats } from '../types/dashboard.types';

export const useAttendance = (studentId: string) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    total_days: 0,
    attendance_rate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;

    const fetchAttendance = async () => {
      try {
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', studentId)
          .order('date', { ascending: false });

        if (error) throw error;

        setRecords(data || []);
        const total = data?.length || 0;
        const present = data?.filter(a => a.status === 'present').length || 0;
        const absent = data?.filter(a => a.status === 'absent').length || 0;
        const late = data?.filter(a => a.status === 'late').length || 0;
        const excused = data?.filter(a => a.status === 'excused').length || 0;

        setStats({
          present,
          absent,
          late,
          excused,
          total_days: total,
          attendance_rate: total > 0 ? (present / total) * 100 : 0,
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [studentId]);

  return { records, stats, loading, error };
};
