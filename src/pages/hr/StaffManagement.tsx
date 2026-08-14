import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Building,
  CheckCircle,
  Clock,
  Shield,
  Edit,
  Trash2,
  Filter,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: 'Academic' | 'Bursary / Finance' | 'Administration' | 'Security & Facility';
  email: string;
  phone: string;
  status: 'active' | 'on_leave' | 'probation';
  join_date: string;
  salary_scale: string;
}

const SAMPLE_STAFF: StaffMember[] = [
  {
    id: 'st-01',
    name: 'Femi Bakare, FCA',
    role: 'Bursar General & Head of Finance',
    department: 'Bursary / Finance',
    email: 'finance@ebenezer.sch.ng',
    phone: '+234 803 111 2233',
    status: 'active',
    join_date: 'Sep 2021',
    salary_scale: 'Grade Level 14 / Senior Executive'
  },
  {
    id: 'st-02',
    name: 'Mrs. Folashade Adeyemi',
    role: 'Senior STEM Teacher & Grade 10 Lead',
    department: 'Academic',
    email: 'f.adeyemi@ebenezer.sch.ng',
    phone: '+234 802 334 5566',
    status: 'active',
    join_date: 'Jan 2022',
    salary_scale: 'Grade Level 10 / Step 4'
  },
  {
    id: 'st-03',
    name: 'Aminat Bello',
    role: 'Senior Registrar & Student Record Officer',
    department: 'Administration',
    email: 'records@ebenezer.sch.ng',
    phone: '+234 805 778 9900',
    status: 'active',
    join_date: 'Nov 2023',
    salary_scale: 'Grade Level 09 / Step 2'
  },
  {
    id: 'st-04',
    name: 'Dr. Joseph Okoro',
    role: 'Principal & Chief Academic Officer',
    department: 'Academic',
    email: 'principal@ebenezer.sch.ng',
    phone: '+234 809 445 6677',
    status: 'active',
    join_date: 'Aug 2019',
    salary_scale: 'Director Level 16'
  }
];

export const StaffManagement: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>(SAMPLE_STAFF);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const filtered = staffList.filter(s => {
    const matchDept = deptFilter === 'all' || s.department === deptFilter;
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Human Capital & Staff Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Staff & Personnel Management
          </h1>
          <p className="text-blue-100 text-sm max-w-xl">
            Manage academic instructors, bursary officers, administrative personnel, and payroll scales.
          </p>
        </div>

        <button
          onClick={() => toast.success('Add staff modal opened')}
          className="px-5 py-3 rounded-2xl bg-white text-indigo-700 font-bold text-sm hover:bg-blue-50 shadow-lg transition-all flex items-center justify-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff by name, role, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            <option value="all">All Departments</option>
            <option value="Academic">Academic</option>
            <option value="Bursary / Finance">Bursary / Finance</option>
            <option value="Administration">Administration</option>
          </select>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {filtered.map(member => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-5 shadow-sm space-y-4 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-md">
                  {member.name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                    {member.name}
                  </h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {member.role}
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {member.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl space-y-0.5">
                <span className="text-gray-400 block text-[10px]">Department</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{member.department}</span>
              </div>

              <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl space-y-0.5">
                <span className="text-gray-400 block text-[10px]">Salary Scale</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{member.salary_scale}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {member.email}
                </span>
              </div>

              <span className="text-[11px] text-gray-400">Joined {member.join_date}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default StaffManagement;
