import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { Eye, Package, CalendarDays, User, HandHelping, Box, ChevronRight, School, PenTool, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';

// Dashboard Components
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

// Admin Assistant Components
import StatsGrid from '../adminAsst/components/StatsGrid';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    students: 0,
    classes: 0,
    sessions: 0,
    collections: 0,
    inventory: 0,
  });
  const [activeStudents, setActiveStudents] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [pendingAdmissions, setPendingAdmissions] = useState(0);
  
  // Modal state
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedStudentCollections, setSelectedStudentCollections] = useState<any[]>([]);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  const branchId = user?.branch_id || '11111111-1111-1111-1111-111111111111';

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, [branchId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStudents(),
        fetchCollections(),
        fetchInventory(),
        fetchClasses(),
        fetchSessions(),
        fetchUsers(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, class_id, current_status, admission_status, gender')
        .eq('branch_id', branchId);

      if (error) throw error;
      
      const studentsData = data || [];
      setStudents(studentsData);
      setActiveStudents(studentsData.filter((s: any) => s.current_status === 'active').length || 0);
      setPendingAdmissions(studentsData.filter((s: any) => s.admission_status === 'pending').length || 0);
      
      setStats(prev => ({
        ...prev,
        students: studentsData.length,
      }));
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          students (
            first_name,
            last_name,
            class_id
          )
        `)
        .order('collection_date', { ascending: false });

      if (error) {
        console.error('Error fetching collections:', error);
        return;
      }
      
      const formattedCollections = (data || []).map((collection: any) => ({
        ...collection,
        student_name: collection.students 
          ? `${collection.students.first_name} ${collection.students.last_name}`
          : 'Unknown Student',
        class_at_collection: collection.class_at_collection || 'N/A',
        recorded_by_name: collection.recorded_by || 'System',
      }));

      setCollections(formattedCollections);
      setStats(prev => ({
        ...prev,
        collections: formattedCollections.length,
      }));
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('item_name', { ascending: true });

      if (error) {
        console.error('Error fetching inventory:', error);
        return;
      }
      
      const inventoryData = data || [];
      setInventory(inventoryData);
      
      const lowStock = inventoryData.filter(
        (item: any) => (item.quantity_added || 0) - (item.quantity_distributed || 0) <= (item.minimum_stock || 0)
      ).length;
      setLowStockItems(lowStock);
      
      setStats(prev => ({
        ...prev,
        inventory: inventoryData.length,
      }));
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, code, level')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      
      const classesData = data || [];
      setClasses(classesData);
      setStats(prev => ({
        ...prev,
        classes: classesData.length,
      }));
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('id, session_name, term_name, is_current')
        .eq('branch_id', branchId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      
      const sessionsData = data || [];
      setSessions(sessionsData);
      setStats(prev => ({
        ...prev,
        sessions: sessionsData.length,
      }));
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('branch_id', branchId);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // View collection details - gets all collections for a student
  const handleViewStudentCollections = async (studentId: string, studentName: string) => {
    try {
      // Fetch all collections for this student
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          students (
            first_name,
            last_name,
            class_id
          )
        `)
        .eq('student_id', studentId)
        .order('collection_date', { ascending: false });

      if (error) {
        console.error('Error fetching student collections:', error);
        toast.error('Failed to load collection details');
        return;
      }

      // Get student details including class
      const student = students.find(s => s.id === studentId);
      const className = student ? classes.find(c => c.id === student.class_id)?.name || 'N/A' : 'N/A';

      const formattedCollections = (data || []).map((collection: any) => ({
        ...collection,
        student_name: collection.students 
          ? `${collection.students.first_name} ${collection.students.last_name}`
          : studentName,
        class_at_collection: collection.class_at_collection || className || 'N/A',
      }));

      setSelectedStudent({
        id: studentId,
        name: studentName,
        class: className,
      });
      setSelectedStudentCollections(formattedCollections);
      setShowCollectionModal(true);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load collection details');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Group collections by student for display
  const groupedCollections = collections.reduce((acc: any, curr: any) => {
    const key = curr.student_id;
    if (!acc[key]) {
      acc[key] = {
        student_id: curr.student_id,
        student_name: curr.student_name,
        class_at_collection: curr.class_at_collection,
        items: [],
        collection_date: curr.collection_date,
        term_name: curr.term_name,
        session_name: curr.session_name,
        signature_url: curr.signature_url,
        status: curr.status || 'completed',
        total_items: 0,
        recorded_by: curr.recorded_by_name,
      };
    }
    acc[key].items.push({
      item_name: curr.item_name,
      quantity: curr.quantity,
      collection_date: curr.collection_date,
      term_name: curr.term_name,
      session_name: curr.session_name,
      status: curr.status || 'completed',
      remarks: curr.remarks,
      signature_url: curr.signature_url,
    });
    acc[key].total_items += curr.quantity || 0;
    return acc;
  }, {});

  const groupedCollectionsList = Object.values(groupedCollections);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <HeroBanner />

      <StatsGrid 
        stats={stats}
        studentsCount={students.length}
        activeStudents={activeStudents}
        lowStockItems={lowStockItems}
        pendingAdmissions={pendingAdmissions}
      />

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
          
          {/* Collections List - Compact & Responsive */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <HandHelping className="w-4 h-4 text-teal-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Collections</h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">({groupedCollectionsList.length})</span>
            </div>

            {groupedCollectionsList.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">No collections recorded</div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {groupedCollectionsList.slice(0, 5).map((collection: any) => (
                  <div
                    key={collection.student_id}
                    onClick={() => handleViewStudentCollections(collection.student_id, collection.student_name)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-600 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {collection.student_name?.[0] || 'S'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {collection.student_name || 'Unknown'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="truncate">{collection.items.length} item(s)</span>
                          <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                          <span>{collection.class_at_collection || 'N/A'}</span>
                          <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                          <span className="text-[10px] text-gray-400">{collection.term_name || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {dayjs(collection.collection_date).format('MMM D')}
                      </span>
                      <Eye className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventory List - Compact & Responsive */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Box className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Inventory</h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">({inventory.length})</span>
              {lowStockItems > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {lowStockItems} low
                </span>
              )}
            </div>

            {inventory.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">No inventory items</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                {inventory.slice(0, 6).map((item: any) => {
                  const remaining = (item.quantity_added || 0) - (item.quantity_distributed || 0);
                  const isLow = remaining <= (item.minimum_stock || 0);
                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border transition-all ${
                        isLow 
                          ? 'border-red-200 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Package className={`w-4 h-4 flex-shrink-0 ${isLow ? 'text-red-500' : 'text-orange-500'}`} />
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.item_name}</p>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Remaining:</span>
                        <span className={`font-semibold ${isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {remaining}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                        <span>{item.category || 'General'}</span>
                        {isLow && (
                          <span className="flex items-center gap-0.5 text-red-500">
                            ⚠️ Low stock
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Birthdays />
          <TopPerformingClasses />
          <Tasks />
        </div>
      </div>

      {/* Collection Detail Modal - Comprehensive with Class and Term */}
      <CollectionDetailModal
        open={showCollectionModal}
        onClose={() => {
          setShowCollectionModal(false);
          setSelectedStudent(null);
          setSelectedStudentCollections([]);
        }}
        student={selectedStudent}
        collections={selectedStudentCollections}
      />
    </motion.div>
  );
};

// ============================================
// COLLECTION DETAIL MODAL - Comprehensive with Class & Term
// ============================================
const CollectionDetailModal: React.FC<{
  open: boolean;
  onClose: () => void;
  student: any;
  collections: any[];
}> = ({ open, onClose, student, collections }) => {
  if (!open || !student) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Group collections by session and term
  const groupedBySession = collections.reduce((acc: any, curr: any) => {
    const key = `${curr.session_name || 'N/A'} - ${curr.term_name || 'N/A'}`;
    if (!acc[key]) {
      acc[key] = {
        session: curr.session_name || 'N/A',
        term: curr.term_name || 'N/A',
        items: [],
      };
    }
    acc[key].items.push({
      item_name: curr.item_name,
      quantity: curr.quantity,
      date: curr.collection_date,
      signature: curr.signature_url,
      remarks: curr.remarks,
      status: curr.status || 'completed',
      class_at_collection: curr.class_at_collection || 'N/A',
    });
    return acc;
  }, {});

  const groupedList = Object.values(groupedBySession);

  const totalItems = collections.reduce((sum, c) => sum + (c.quantity || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header - Student Info with Class */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {student.name?.[0] || 'S'}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {student.name || 'Unknown Student'}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <School className="w-4 h-4" />
                  <span>{student.class || 'N/A'}</span>
                  <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                  <span>{collections.length} collection(s)</span>
                  <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                  <span>{totalItems} total items</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {groupedList.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No collections found for this student
            </div>
          ) : (
            groupedList.map((group: any, groupIndex: number) => (
              <div key={groupIndex} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                {/* Session/Term Header */}
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {group.session}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{group.term}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {group.items.length} item(s)
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {group.items.map((item: any, itemIndex: number) => (
                    <div key={itemIndex} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {item.item_name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300">×{item.quantity}</span>
                              </span>
                              <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                              <span>{dayjs(item.date).format('MMM D, YYYY')}</span>
                              {item.class_at_collection && item.class_at_collection !== 'N/A' && (
                                <>
                                  <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                                  <span className="text-gray-400">{item.class_at_collection}</span>
                                </>
                              )}
                              {item.remarks && (
                                <>
                                  <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                                  <span className="text-gray-400 italic truncate max-w-[100px]">{item.remarks}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            {item.status || 'Completed'}
                          </span>
                          {item.signature && (
                            <PenTool className="w-3.5 h-3.5 text-teal-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Summary Footer */}
          {collections.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total Collections</span>
              <span className="font-semibold text-gray-900 dark:text-white">{collections.length}</span>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium hover:opacity-90 transition-all text-sm"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;