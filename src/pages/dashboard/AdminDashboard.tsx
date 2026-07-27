import React from 'react';
import { motion } from 'framer-motion';
import HeroBanner from './components/HeroBanner';
import KpiCards from './components/KpiCards';
import RevenueChart from './components/RevenueChart';
import AttendanceChart from './components/AttendanceChart';
import AcademicPerformance from './components/AcademicPerformance';
import RecentPayments from './components/RecentPayments';
import Announcements from './components/Announcements';
import QuickActions from './components/QuickActions';
import Birthdays from './components/Birthdays';
import TopPerformingClasses from './components/TopPerformingClasses';
import Tasks from './components/Tasks';

const Dashboard: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <HeroBanner />
      <KpiCards />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <RevenueChart />
        <AttendanceChart />
        <AcademicPerformance />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <RecentPayments />
          <Announcements />
        </div>
        <div className="space-y-6">
          <QuickActions />
          <Birthdays />
          <TopPerformingClasses />
          <Tasks />
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
