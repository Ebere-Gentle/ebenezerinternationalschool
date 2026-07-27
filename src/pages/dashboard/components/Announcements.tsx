import React from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Calendar, Users, AlertCircle, Info } from 'lucide-react';

const announcements = [
  {
    id: 1,
    title: 'School Resumption Date',
    content: 'The school will resume for the second term on January 20, 2026.',
    priority: 'high',
    icon: Calendar,
    time: '2 hours ago',
  },
  {
    id: 2,
    title: 'PTA Meeting',
    content: 'There will be a PTA meeting on January 25, 2026 at 10:00 AM.',
    priority: 'medium',
    icon: Users,
    time: '5 hours ago',
  },
  {
    id: 3,
    title: 'Sports Day Announcement',
    content: 'Annual sports day has been scheduled for February 1, 2026.',
    priority: 'low',
    icon: Megaphone,
    time: '1 day ago',
  },
];

const Announcements: React.FC = () => {
  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
      medium: 'border-yellow-400 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20',
      low: 'border-blue-400 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const getPriorityIcon = (priority: string) => {
    const icons = {
      high: AlertCircle,
      medium: Info,
      low: Info,
    };
    return icons[priority as keyof typeof icons] || Info;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-2">
            <Megaphone className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Announcements</h3>
        </div>
        <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">View all →</button>
      </div>

      <div className="space-y-3">
        {announcements.map((announcement) => {
          const PriorityIcon = getPriorityIcon(announcement.priority);
          return (
            <div
              key={announcement.id}
              className={`flex items-start gap-3 rounded-xl border-l-4 p-3 transition-all hover:shadow-md ${getPriorityColor(announcement.priority)}`}
            >
              <div className="rounded-lg bg-white/50 p-1.5 dark:bg-white/10">
                <announcement.icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">{announcement.title}</h4>
                  <PriorityIcon className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{announcement.content}</p>
                <span className="mt-1 text-xs text-gray-400">{announcement.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default Announcements;
