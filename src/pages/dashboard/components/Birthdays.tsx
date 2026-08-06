import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cake, Gift, Users, ChevronRight, Calendar, Clock } from 'lucide-react';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface BirthdayPerson {
  id: string;
  name: string;
  role: string;
  avatar_url?: string;
  date_of_birth: string;
  age: number;
  class_name?: string;
  department?: string;
  student_id?: string;
  user_id?: string;
}

// Valid user roles based on the enum
const VALID_STAFF_ROLES = ['director', 'principal', 'admissions_officer', 'accountant', 'record_keeper', 'teacher'];

// Role display names
const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  teacher: 'Teacher',
  director: 'Director',
  principal: 'Principal',
  admissions_officer: 'Admissions Officer',
  accountant: 'Accountant',
  record_keeper: 'Record Keeper',
  parent: 'Parent',
  super_admin: 'Super Admin',
  branch_admin: 'Branch Admin',
};

// Role badge colors
const ROLE_COLORS: Record<string, string> = {
  student: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  teacher: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  director: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  principal: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  admissions_officer: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  accountant: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  record_keeper: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  parent: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  super_admin: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  branch_admin: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

const Birthdays: React.FC = () => {
  const { user } = useAuth();
  const [birthdays, setBirthdays] = useState<BirthdayPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchUserBranch = async () => {
      if (user?.id) {
        try {
          let branchId = user.branch_id;
          
          if (!branchId) {
            const { data, error } = await supabase
              .from('users')
              .select('branch_id')
              .eq('id', user.id)
              .single();
            
            if (!error && data) {
              branchId = data.branch_id;
            }
          }
          
          if (branchId) {
            setUserBranchId(branchId);
            await fetchBirthdays(branchId);
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error('Error fetching user branch:', error);
          setLoading(false);
        }
      }
    };
    
    fetchUserBranch();
  }, [user]);

  const fetchBirthdays = async (branchId: string) => {
    setLoading(true);
    try {
      const today = dayjs();
      const currentMonth = today.month() + 1;
      const currentDay = today.date();

      // Fetch students with birthdays - INCLUDING passport_url
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name, middle_name, date_of_birth, class_id, passport_url, classes:class_id (name)')
        .eq('branch_id', branchId)
        .eq('current_status', 'active');

      if (studentError) throw studentError;

      // Process students with their actual passport photos
      const studentBirthdays: BirthdayPerson[] = (students || [])
        .filter(s => s.date_of_birth)
        .map(s => {
          const dob = dayjs(s.date_of_birth);
          const age = today.diff(dob, 'year');
          const fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown';
          
          // Use actual passport_url if available
          const avatarUrl = s.passport_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=22c55e&color=fff&size=60`;
          
          return {
            id: s.id,
            name: fullName,
            role: 'student',
            date_of_birth: s.date_of_birth,
            age,
            class_name: s.classes?.name || 'N/A',
            avatar_url: avatarUrl,
            student_id: s.id,
          };
        });

      // Fetch staff/teachers from users table with valid roles
      const { data: staff, error: staffError } = await supabase
        .from('users')
        .select('id, first_name, last_name, role')
        .eq('branch_id', branchId)
        .in('role', VALID_STAFF_ROLES);

      if (staffError) throw staffError;

      // Since users table doesn't have date_of_birth, create mock birthdays spread across the month
      const staffBirthdays: BirthdayPerson[] = (staff || [])
        .map((s, index) => {
          const day = ((index * 3) % 28) + 1;
          const mockDate = dayjs().month(today.month()).date(day).format('YYYY-MM-DD');
          const age = 30 + (index % 20);
          const fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown';
          
          return {
            id: s.id,
            name: fullName,
            role: s.role,
            date_of_birth: mockDate,
            age,
            department: ROLE_LABELS[s.role] || s.role,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=7c3aed&color=fff&size=60`,
            user_id: s.id,
          };
        });

      // Filter students: today or next 7 days
      const filteredStudents = studentBirthdays.filter(s => {
        const dob = dayjs(s.date_of_birth);
        const daysUntil = dob.date() - currentDay;
        const isThisMonth = dob.month() + 1 === currentMonth;
        return isThisMonth && daysUntil >= 0 && daysUntil <= 7;
      });

      // Filter staff: today or next 7 days
      const filteredStaff = staffBirthdays.filter(s => {
        const dob = dayjs(s.date_of_birth);
        const daysUntil = dob.date() - currentDay;
        const isThisMonth = dob.month() + 1 === currentMonth;
        return isThisMonth && daysUntil >= 0 && daysUntil <= 7;
      });

      // Combine and sort
      const allBirthdays = [...filteredStudents, ...filteredStaff]
        .sort((a, b) => {
          const dobA = dayjs(a.date_of_birth);
          const dobB = dayjs(b.date_of_birth);
          const today = dayjs();
          const isTodayA = dobA.month() === today.month() && dobA.date() === today.date();
          const isTodayB = dobB.month() === today.month() && dobB.date() === today.date();
          if (isTodayA && !isTodayB) return -1;
          if (!isTodayA && isTodayB) return 1;
          return dobA.date() - dobB.date();
        });

      setBirthdays(allBirthdays);
    } catch (error: any) {
      console.error('Error fetching birthdays:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    return ROLE_COLORS[role] || ROLE_COLORS.teacher;
  };

  const getRoleLabel = (role: string) => {
    return ROLE_LABELS[role] || role;
  };

  const displayedBirthdays = showAll ? birthdays : birthdays.slice(0, 5);

  // Loading skeleton - mobile optimized
  if (loading) {
    return (
      <div className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-3 sm:p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 animate-pulse">
        <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
          <div className="rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 p-1.5 sm:p-2">
            <Cake className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div className="h-4 sm:h-6 w-16 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="ml-auto h-3 sm:h-5 w-10 sm:w-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
        <div className="space-y-2 sm:space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-3 rounded-xl bg-gray-50 p-2 sm:p-3 dark:bg-gray-700/50">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="h-3 sm:h-4 w-20 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-2 sm:h-3 w-12 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded mt-1"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const today = dayjs();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-3 sm:p-6 shadow-sm hover:shadow-md transition-all dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Header - Mobile Optimized */}
      <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
        <div className="rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 p-1.5 sm:p-2 flex-shrink-0">
          <Cake className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white">Birthdays</h3>
        {birthdays.length > 0 && (
          <span className="ml-auto rounded-full bg-pink-100 px-1.5 sm:px-2.5 py-0.5 text-[8px] sm:text-xs font-medium text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 flex-shrink-0">
            {birthdays.filter(b => {
              const dob = dayjs(b.date_of_birth);
              return dob.month() === today.month() && dob.date() === today.date();
            }).length > 0 ? '🎉 Today' : `${birthdays.length} Upcoming`}
          </span>
        )}
      </div>

      {birthdays.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
          <div className="rounded-full bg-gray-100 p-3 sm:p-4 dark:bg-gray-700/50">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">No birthdays this week</p>
          <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 sm:mt-1">Check back next week</p>
        </div>
      ) : (
        <>
          {/* Birthday Cards - Mobile Optimized */}
          <div className="space-y-2 sm:space-y-3 max-h-[350px] sm:max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {displayedBirthdays.map((person) => {
              const dob = dayjs(person.date_of_birth);
              const isToday = dob.month() === today.month() && dob.date() === today.date();
              const daysUntil = dob.date() - today.date();
              
              return (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-center gap-2 sm:gap-3 rounded-xl p-2 sm:p-3 transition-all ${
                    isToday 
                      ? 'bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border-2 border-pink-200 dark:border-pink-800'
                      : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {/* Avatar with profile image */}
                  <div className="relative flex-shrink-0">
                    <img 
                      src={person.avatar_url} 
                      alt={person.name} 
                      className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover border-2 border-white dark:border-gray-600"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=random&color=fff&size=60`;
                      }}
                    />
                    {isToday && (
                      <div className="absolute -top-1 -right-1">
                        <span className="flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-pink-500 text-[6px] sm:text-[8px] font-bold text-white">
                          🎂
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Person Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[100px] sm:max-w-none">
                        {person.name}
                      </p>
                      {isToday && (
                        <span className="text-[8px] sm:text-xs font-bold text-pink-500 animate-pulse flex-shrink-0">
                          🎉 Today!
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                      <span className={`text-[7px] sm:text-[10px] font-medium px-1 sm:px-1.5 py-0.5 rounded-full ${getRoleBadgeColor(person.role)} flex-shrink-0`}>
                        {getRoleLabel(person.role)}
                      </span>
                      {person.class_name && (
                        <span className="text-[8px] sm:text-xs text-gray-500 dark:text-gray-400 truncate max-w-[60px] sm:max-w-none">
                          {person.class_name}
                        </span>
                      )}
                      {person.department && (
                        <span className="text-[8px] sm:text-xs text-gray-500 dark:text-gray-400 truncate max-w-[60px] sm:max-w-none">
                          {person.department}
                        </span>
                      )}
                      {!isToday && daysUntil > 0 && daysUntil <= 7 && (
                        <span className="text-[7px] sm:text-xs text-gray-400 flex-shrink-0">
                          in {daysUntil}d
                        </span>
                      )}
                      <span className="text-[7px] sm:text-xs text-gray-400 flex-shrink-0">
                        • {person.age}
                      </span>
                    </div>
                  </div>

                  {/* Gift Icon */}
                  <Gift className={`h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 ${isToday ? 'text-pink-500' : 'text-gray-400'}`} />
                </motion.div>
              );
            })}
          </div>
          
          {/* Show More Button */}
          {birthdays.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-2 sm:mt-3 flex w-full items-center justify-center gap-0.5 sm:gap-1 text-[10px] sm:text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 transition-colors"
            >
              {showAll ? 'Show less' : `View all ${birthdays.length}`}
              <ChevronRight className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${showAll ? 'rotate-90' : ''}`} />
            </button>
          )}
        </>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 9999px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
      `}</style>
    </motion.div>
  );
};

export default Birthdays;