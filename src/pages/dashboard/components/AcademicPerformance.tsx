import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GraduationCap } from 'lucide-react';
import ChartCard from './ChartCard';

const data = [
  { subject: 'Math', score: 85 },
  { subject: 'English', score: 78 },
  { subject: 'Science', score: 92 },
  { subject: 'History', score: 70 },
  { subject: 'Art', score: 88 },
];

const AcademicPerformance: React.FC = () => {
  return (
    <ChartCard title="Academic Performance" icon={GraduationCap}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" stroke="#9ca3af" domain={[0, 100]} />
          <YAxis dataKey="subject" type="category" stroke="#9ca3af" width={70} />
          <Tooltip
            formatter={(value: number) => [`${value}%`, 'Score']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="score" fill="#7c3aed" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default AcademicPerformance;
