import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Users } from 'lucide-react';
import ChartCard from './ChartCard';

const data = [
  { name: 'Present', value: 85, color: '#22c55e' },
  { name: 'Absent', value: 10, color: '#ef4444' },
  { name: 'Late', value: 5, color: '#f59e0b' },
];

const AttendanceChart: React.FC = () => {
  return (
    <ChartCard title="Attendance Rate" icon={Users}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${value}%`, '']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default AttendanceChart;
