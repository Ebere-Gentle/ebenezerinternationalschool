
import React, { useEffect, useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Users, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import ChartCard from './ChartCard';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../contexts/AuthContext';

interface AttendanceRecord {
  status: string | null;
}

interface AttendanceSession {
  id: string;
}

interface ChartItem {
  name: string;
  value: number;
  color: string;
  icon: React.ElementType;
}

const AttendanceChart: React.FC = () => {
  const { user } = useAuth();

  const [counts, setCounts] = useState({
    present: 0,
    absent: 0,
    late: 0,
  });

  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let userRecord: {
        branch_id: string | null;
      } | null = null;

      const { data: byUserId } = await supabase
        .from('users')
        .select('branch_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (byUserId) {
        userRecord = byUserId;
      } else {
        const { data: byId } = await supabase
          .from('users')
          .select('branch_id')
          .eq('id', user.id)
          .maybeSingle();

        userRecord = byId;
      }

      const branchId = userRecord?.branch_id;

      if (!branchId) {
        setCounts({
          present: 0,
          absent: 0,
          late: 0,
        });
        return;
      }

      const { data: sessions, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('branch_id', branchId);

      if (sessionError) throw sessionError;

      const sessionIds = (sessions || []).map(
        (session: AttendanceSession) => session.id
      );

      if (sessionIds.length === 0) {
        setCounts({
          present: 0,
          absent: 0,
          late: 0,
        });
        return;
      }

      const { data: records, error: recordError } = await supabase
        .from('attendance_records')
        .select('status')
        .in('session_id', sessionIds);

      if (recordError) throw recordError;

      const nextCounts = {
        present: 0,
        absent: 0,
        late: 0,
      };

      (records || []).forEach((record: AttendanceRecord) => {
        const status = String(record.status || '')
          .toLowerCase()
          .trim();

        if (status === 'present') {
          nextCounts.present++;
        } else if (status === 'absent') {
          nextCounts.absent++;
        } else if (status === 'late') {
          nextCounts.late++;
        }
      });

      setCounts(nextCounts);
    } catch (error) {
      console.error('AttendanceChart error:', error);

      setCounts({
        present: 0,
        absent: 0,
        late: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();

    if (!user?.id) return;

    const channel = supabase
      .channel('attendance-chart')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
        },
        () => {
          fetchAttendance();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_sessions',
        },
        () => {
          fetchAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const data = useMemo<ChartItem[]>(
    () => [
      {
        name: 'Present',
        value: counts.present,
        color: '#22c55e',
        icon: CheckCircle2,
      },
      {
        name: 'Absent',
        value: counts.absent,
        color: '#ef4444',
        icon: XCircle,
      },
      {
        name: 'Late',
        value: counts.late,
        color: '#f59e0b',
        icon: Clock3,
      },
    ],
    [counts]
  );

  const total =
    counts.present +
    counts.absent +
    counts.late;

  const attendanceRate =
    total > 0
      ? Math.round((counts.present / total) * 100)
      : 0;

  const chartData = data.filter(
    (item) => item.value > 0
  );

  return (
    <ChartCard title="Attendance Rate" icon={Users}>
      <div className="h-full w-full overflow-hidden">
        {loading ? (
          <div className="flex h-[220px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
              <p className="mt-2 text-xs text-gray-400">
                Loading attendance...
              </p>
            </div>
          </div>
        ) : total === 0 ? (
          <div className="flex h-[220px] flex-col items-center justify-center">
            <Users className="h-8 w-8 text-gray-300" />

            <p className="mt-2 text-sm font-semibold text-gray-600">
              No attendance data
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Attendance will appear here once recorded.
            </p>
          </div>
        ) : (
          <div className="flex h-[220px] flex-col">
            {/* Donut */}
            <div className="relative h-[155px] w-full shrink-0">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={64}
                    paddingAngle={4}
                    cornerRadius={5}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={3}
                    animationDuration={600}
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value: any, name: any) => {
                      const num = Number(value) || 0;
                      return [
                        `${num} ${num === 1 ? 'record' : 'records'}`,
                        name,
                      ];
                    }}
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      boxShadow:
                        '0 8px 20px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold leading-none text-gray-900">
                    {attendanceRate}%
                  </div>

                  <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                    Present
                  </div>
                </div>
              </div>
            </div>

            {/* Compact stats */}
            <div className="grid grid-cols-3 gap-2 px-1">
              {data.map((item) => {
                const Icon = item.icon;

                const percentage =
                  total > 0
                    ? Math.round(
                        (item.value / total) * 100
                      )
                    : 0;

                return (
                  <div
                    key={item.name}
                    className="flex min-w-0 items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5"
                  >
                    <Icon
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: item.color }}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-gray-800">
                          {item.value}
                        </span>

                        <span className="text-[9px] text-gray-400">
                          {percentage}%
                        </span>
                      </div>

                      <div className="truncate text-[9px] text-gray-500">
                        {item.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ChartCard>
  );
};

export default AttendanceChart;
