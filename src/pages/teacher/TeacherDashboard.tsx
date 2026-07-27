import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Users, Calendar, ClipboardList } from 'lucide-react';

const TeacherDashboard: React.FC = () => {
  const stats = [
    { label: 'My Classes', value: '5', icon: BookOpen, color: 'blue' },
    { label: 'Total Students', value: '156', icon: Users, color: 'green' },
    { label: 'Today\'s Schedule', value: '4', icon: Calendar, color: 'purple' },
    { label: 'Assignments', value: '12', icon: ClipboardList, color: 'orange' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Teacher Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your classes and students
          </p>
        </div>
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
          <GraduationCap className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 bg-${stat.color}-100 dark:bg-${stat.color}-900/20 rounded-xl`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Today's Classes
        </h2>
        <div className="space-y-3">
          {[
            { subject: 'Mathematics', time: '8:00 - 9:00', class: 'SSS 3A' },
            { subject: 'Physics', time: '9:00 - 10:00', class: 'SSS 2B' },
            { subject: 'Chemistry', time: '10:30 - 11:30', class: 'SSS 3B' },
            { subject: 'Biology', time: '12:00 - 1:00', class: 'SSS 1A' },
          ].map((cls, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{cls.subject}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{cls.class}</p>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">{cls.time}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default TeacherDashboard;
