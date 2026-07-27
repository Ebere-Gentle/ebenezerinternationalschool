import React from 'react';
import { motion } from 'framer-motion';
import { Users, CreditCard, Bell, School, Calendar, BarChart3 } from 'lucide-react';

const ParentDashboard: React.FC = () => {
  const stats = [
    { label: 'Children', value: '3', icon: Users, color: 'blue' },
    { label: 'Fees Paid', value: '₦120K', icon: CreditCard, color: 'green' },
    { label: 'Pending Fees', value: '₦45K', icon: Bell, color: 'orange' },
    { label: 'Attendance', value: '95%', icon: Calendar, color: 'purple' },
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
            Parent Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitor your children's progress
          </p>
        </div>
        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
          <School className="w-6 h-6 text-orange-600 dark:text-orange-400" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Children's Performance
          </h2>
          <div className="space-y-4">
            {[
              { name: 'Chidi Okonkwo', class: 'SSS 3A', performance: 85, attendance: 92 },
              { name: 'Amara Okonkwo', class: 'JSS 2B', performance: 78, attendance: 88 },
              { name: 'Kelechi Okonkwo', class: 'Primary 5', performance: 92, attendance: 95 },
            ].map((child, idx) => (
              <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{child.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{child.class}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Performance</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{child.performance}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Attendance</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{child.attendance}%</p>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full"
                    style={{ width: `${child.performance}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Payments
          </h2>
          <div className="space-y-3">
            {[
              { description: 'Tuition Fee - Term 2', amount: '₦45,000', date: 'Jan 15, 2026', status: 'Paid' },
              { description: 'Sports Fee', amount: '₦5,000', date: 'Jan 10, 2026', status: 'Paid' },
              { description: 'Library Fee', amount: '₦3,000', date: 'Jan 5, 2026', status: 'Pending' },
            ].map((payment, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{payment.description}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{payment.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{payment.amount}</p>
                  <span className={`text-xs ${
                    payment.status === 'Paid' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ParentDashboard;
