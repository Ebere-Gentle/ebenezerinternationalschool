import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import RecordPayment from '../../pages/payments/RecordPayment';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  Users,
  GraduationCap,
  Box,
  HandHelping,
  School,
  Calendar,
  FileText,
  History,
  Bell,
  RefreshCw,
  UserPlus,
  BookOpen,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Menu,
  MoreVertical,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  Shield,
  UserCheck,
  UserX,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  MessageSquare,
  Heart,
  Stethoscope,
  Bus,
  Home,
  Award,
  BadgeCheck,
  ClipboardCheck,
  Coffee,
  Gift,
  Rocket,
  Target,
  Globe,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Headphones,
  Upload,
  File,
  Trash2 as TrashIcon,
  PenTool,
  Camera,
  Image,
  Save,
  Download,
  Printer,
  ChevronRight,
  ChevronLeft,
  Star,
  Sparkles,
  Crown,
  Zap,
  Coffee as CoffeeIcon,
  List,
  Grid,
  PlusCircle,
  MinusCircle,
  Filter,
  Sliders,
  ChevronsDown,
  ChevronsUp,
  Maximize2,
  Minimize2,
  Settings2,
  UserRound,
  Package,
  Layers,
  FolderTree,
  Tag,
  CalendarDays,
  ClockArrowUp,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  CreditCard,
} from 'lucide-react';

// Recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

// Components
import StudentsList from '../students/StudentsList';
import ClassesList from '../classes/ClassesList';
import ReportsDashboard from '../reports/ReportsDashboard';
import Settings from '../settings/Settings';
import Profile from '../profile/Profile';
import NotificationPanel from './components/NotificationPanel';
import StudentProfileModal from './components/StudentProfileModal';

// Hooks
import { useAdminData } from './hooks/useAdminData';
import { useNotifications } from './hooks/useNotifications';

// Import success image
import successImage from '../../assets/transfer.png';

type Page = 'dashboard' | 'students' | 'classes' | 'sessions' | 'collections' | 'inventory' | 'reports' | 'activity' | 'settings' | 'profile' | 'payment';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4'];

// ============================================
// MAIN ADMIN ASST COMPONENT
// ============================================
const AdminAsst: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timeGreeting, setTimeGreeting] = useState('Good morning');
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [activeChart, setActiveChart] = useState<'bar' | 'pie' | 'line'>('bar');

  // Collection Modal State
  const [showAddCollectionModal, setShowAddCollectionModal] = useState(false);
  const [selectedStudentForCollection, setSelectedStudentForCollection] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [collectionDate, setCollectionDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [remarks, setRemarks] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isSubmittingCollection, setIsSubmittingCollection] = useState(false);

  // Signature Modal State
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  // Inventory Modal State
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({
    item_name: '',
    category: 'Books',
    quantity_added: 10,
    minimum_stock: 5,
    description: '',
  });
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Collection View State
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'current' | 'previous'>('all');
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  // Students with class names
  const [studentsWithClasses, setStudentsWithClasses] = useState<any[]>([]);
  const [groupedCollections, setGroupedCollections] = useState<any[]>([]);

  const {
    students,
    classes,
    sessions,
    collections,
    inventory,
    activityLogs,
    stats,
    loading,
    refreshData,
    fetchStudents,
    fetchClasses,
    fetchSessions,
    fetchCollections,
    fetchInventory,
    fetchActivityLogs,
  } = useAdminData();

  const {
    notifications,
    unreadCount,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();

  // Load students with class names
  useEffect(() => {
    const loadStudentsWithClasses = async () => {
      if (students && students.length > 0) {
        const mapped = students.map((student: any) => {
          const classObj = classes?.find((c: any) => c.id === student.class_id);
          return {
            ...student,
            class_name: classObj?.name || 'Not Assigned',
            class_code: classObj?.code || 'N/A',
          };
        });
        setStudentsWithClasses(mapped);
      }
    };
    loadStudentsWithClasses();
  }, [students, classes]);

  // Group collections by student
  useEffect(() => {
    if (collections && collections.length > 0) {
      const grouped = collections.reduce((acc: any, curr: any) => {
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
          };
        }
        acc[key].items.push({
          item_name: curr.item_name,
          quantity: curr.quantity,
        });
        return acc;
      }, {});

      // Apply filters
      let filtered = Object.values(grouped);
      
      if (collectionFilter === 'current') {
        filtered = filtered.filter((g: any) => {
          const currentSession = sessions?.find((s: any) => s.is_current);
          return g.session_name === currentSession?.session_name;
        });
      } else if (collectionFilter === 'previous') {
        filtered = filtered.filter((g: any) => {
          const currentSession = sessions?.find((s: any) => s.is_current);
          return g.session_name !== currentSession?.session_name;
        });
      }

      if (selectedTermFilter !== 'all') {
        filtered = filtered.filter((g: any) => g.term_name === selectedTermFilter);
      }

      if (selectedClassFilter !== 'all') {
        filtered = filtered.filter((g: any) => g.class_at_collection === selectedClassFilter);
      }

      setGroupedCollections(filtered);
    } else {
      setGroupedCollections([]);
    }
  }, [collections, collectionFilter, selectedTermFilter, selectedClassFilter, sessions]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeGreeting('Good morning');
    else if (hour < 17) setTimeGreeting('Good afternoon');
    else setTimeGreeting('Good evening');
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/students')) setCurrentPage('students');
    else if (path.includes('/classes')) setCurrentPage('classes');
    else if (path.includes('/sessions')) setCurrentPage('sessions');
    else if (path.includes('/collections')) setCurrentPage('collections');
    else if (path.includes('/inventory')) setCurrentPage('inventory');
    else if (path.includes('/reports')) setCurrentPage('reports');
    else if (path.includes('/activity')) setCurrentPage('activity');
    else if (path.includes('/settings')) setCurrentPage('settings');
    else if (path.includes('/profile')) setCurrentPage('profile');
    else if (path.includes('/payment')) setCurrentPage('payment');
    else setCurrentPage('dashboard');
  }, [location.pathname]);

  const handleRefresh = async () => {
    toast.loading('Refreshing data...', { id: 'refresh' });
    await refreshData();
    toast.success('Data refreshed!', { id: 'refresh' });
  };

  // ============================================
  // handleViewStudent - UPDATED to handle different student data structures
  // ============================================
  const handleViewStudent = (student: any) => {
    console.log('🔍 Viewing student:', student);
    
    // If the student is from the recent collections list, it might have a different structure
    // Make sure we pass the full student object with all fields
    const studentData = {
      id: student.student_id || student.id,
      student_id: student.student_id || student.id,
      first_name: student.first_name || student.student_name?.split(' ')[0] || 'N/A',
      last_name: student.last_name || student.student_name?.split(' ').slice(1).join(' ') || 'N/A',
      full_name: student.student_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'N/A',
      class_name: student.class_name || student.class_at_collection || 'Not Assigned',
      current_class: student.class_name || student.class_at_collection || 'Not Assigned',
      current_status: student.current_status || student.status || 'active',
      status: student.status || student.current_status || 'active',
      gender: student.gender || 'N/A',
      email: student.email || 'N/A',
      phone_number: student.phone_number || student.phone || 'N/A',
      date_of_birth: student.date_of_birth || 'N/A',
      home_address: student.home_address || student.address || 'N/A',
      admission_number: student.admission_number || student.student_id || 'N/A',
      ...student // Keep any other fields
    };
    
    setSelectedStudent(studentData);
    setShowStudentModal(true);
  };

  const handleAddStudent = () => {
    navigate('/students/register?returnTo=admin-asst');
  };

  // ============================================
  // SIGNATURE UPLOAD TO BUCKET
  // ============================================
  const uploadSignatureToBucket = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `signature_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading signature:', error);
      toast.error('Failed to upload signature. Please try again.');
      return null;
    }
  };

  // ============================================
  // COLLECTION WORKFLOW
  // ============================================
  const openCollectionModal = () => {
    const currentSession = sessions?.find((s: any) => s.is_current);
    setSelectedStudentForCollection(null);
    setSelectedItems([]);
    setCurrentItem(null);
    setQuantity(1);
    setCollectionDate(dayjs().format('YYYY-MM-DD'));
    setRemarks('');
    setSelectedTerm(currentSession);
    setSelectedSession(currentSession);
    setShowAddCollectionModal(true);
  };

  const addItemToCollection = () => {
    if (!currentItem) {
      toast.error('Please select an item');
      return;
    }
    if (quantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    const remaining = (currentItem.quantity_added || 0) - (currentItem.quantity_distributed || 0);
    if (quantity > remaining) {
      toast.error(`Only ${remaining} ${currentItem.item_name} available!`);
      return;
    }

    setSelectedItems([...selectedItems, { ...currentItem, quantity: quantity }]);
    setCurrentItem(null);
    setQuantity(1);
    toast.success(`${currentItem.item_name} added`);
  };

  const removeItemFromCollection = (itemId: string) => {
    setSelectedItems(selectedItems.filter((i) => i.id !== itemId));
  };

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    const item = selectedItems.find((i) => i.id === itemId);
    if (item) {
      const remaining = (item.quantity_added || 0) - (item.quantity_distributed || 0);
      if (newQuantity > remaining) {
        toast.error(`Only ${remaining} ${item.item_name} available!`);
        return;
      }
      setSelectedItems(selectedItems.map((i) => 
        i.id === itemId ? { ...i, quantity: newQuantity } : i
      ));
    }
  };

  const handleSubmitCollection = async () => {
    if (!selectedStudentForCollection) {
      toast.error('Please select a student');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setShowAddCollectionModal(false);
    setShowSignatureModal(true);
    setSignatureData(null);
    setSignatureFile(null);
  };

  const handleSaveSignature = async () => {
    const canvas = canvasRef.current;
    let signatureUrl = null;

    try {
      if (signatureFile) {
        const uploaded = await uploadSignatureToBucket(signatureFile);
        if (uploaded) {
          signatureUrl = uploaded;
        } else {
          toast.error('Failed to upload signature');
          return;
        }
      } else if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `signature_${Date.now()}.png`, { type: 'image/png' });
        const uploaded = await uploadSignatureToBucket(file);
        if (uploaded) {
          signatureUrl = uploaded;
        } else {
          toast.error('Failed to upload signature');
          return;
        }
      }

      if (!signatureUrl) {
        toast.error('Please draw or upload a signature');
        return;
      }

      await saveCollectionWithSignature(signatureUrl);
    } catch (error) {
      console.error('Error saving signature:', error);
      toast.error('Failed to save signature');
    }
  };

  const saveCollectionWithSignature = async (signatureUrl: string) => {
    setIsSubmittingCollection(true);
    try {
      const session = selectedSession || sessions?.find((s: any) => s.is_current);

      const collectionPromises = selectedItems.map(async (item) => {
        const { data, error } = await supabase
          .from('collections')
          .insert([{
            student_id: selectedStudentForCollection.id,
            student_name: `${selectedStudentForCollection.first_name} ${selectedStudentForCollection.last_name}`,
            item_name: item.item_name,
            quantity: item.quantity,
            class_at_collection: selectedStudentForCollection.class_name || 'Not Assigned',
            collection_date: collectionDate,
            remarks: remarks || null,
            signature_url: signatureUrl,
            term_id: session?.id || null,
            term_name: session?.term_name || null,
            session_id: session?.id || null,
            session_name: session?.session_name || null,
            recorded_by: user?.id || null,
            status: 'completed',
          }])
          .select()
          .single();

        if (error) throw error;

        const newDistributed = (item.quantity_distributed || 0) + item.quantity;
        await supabase
          .from('inventory_items')
          .update({
            quantity_distributed: newDistributed,
            quantity_remaining: (item.quantity_added || 0) - newDistributed,
          })
          .eq('id', item.id);

        return data;
      });

      await Promise.all(collectionPromises);

      setSuccessData({
        student: `${selectedStudentForCollection.first_name} ${selectedStudentForCollection.last_name}`,
        items: selectedItems.map((i) => ({ name: i.item_name, quantity: i.quantity })),
        totalItems: selectedItems.length,
        date: collectionDate,
      });

      setShowSignatureModal(false);
      setShowSuccessModal(true);
      
      toast.success(`${selectedItems.length} item(s) recorded!`);
      await fetchCollections();
      await fetchInventory();
    } catch (error: any) {
      console.error('Error saving collection:', error);
      toast.error(error.message || 'Failed to save collection');
    } finally {
      setIsSubmittingCollection(false);
    }
  };

  // ============================================
  // SIGNATURE CANVAS FUNCTIONS
  // ============================================
  useEffect(() => {
    if (showSignatureModal) {
      setTimeout(initCanvas, 300);
    }
  }, [showSignatureModal]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 400;
    canvas.height = 150;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1E40AF';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
    setSignatureFile(null);
  };

  const handleSignatureFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      e.target.value = '';
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, WEBP, or SVG image');
      e.target.value = '';
      return;
    }

    setSignatureFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setSignatureData(canvas.toDataURL('image/png'));
        toast.success('Signature image loaded!');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ============================================
  // INVENTORY FUNCTIONS
  // ============================================
  const handleAddInventory = async () => {
    if (!inventoryForm.item_name || inventoryForm.quantity_added < 1) {
      toast.error('Please fill all required fields');
      return;
    }

    setInventoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([{
          item_name: inventoryForm.item_name,
          category: inventoryForm.category,
          description: inventoryForm.description || null,
          quantity_added: inventoryForm.quantity_added,
          quantity_distributed: 0,
          quantity_remaining: inventoryForm.quantity_added,
          minimum_stock: inventoryForm.minimum_stock || 5,
          branch_id: user?.branch_id || '11111111-1111-1111-1111-111111111111',
          created_by: user?.id || null,
        }])
        .select();

      if (error) throw error;

      toast.success('Inventory item added!');
      setShowAddInventoryModal(false);
      setInventoryForm({
        item_name: '',
        category: 'Books',
        quantity_added: 10,
        minimum_stock: 5,
        description: '',
      });
      await fetchInventory();
    } catch (error: any) {
      console.error('Error adding inventory:', error);
      toast.error(error.message || 'Failed to add item');
    } finally {
      setInventoryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  const currentSession = sessions?.find((s: any) => s.is_current);
  const totalStudents = students?.length || 0;
  const totalCollections = collections?.length || 0;
  const totalItems = inventory?.length || 0;
  const totalClasses = classes?.length || 0;
  const activeStudents = students?.filter((s: any) => s.current_status === 'active').length || 0;
  const pendingAdmissions = students?.filter((s: any) => s.admission_status === 'pending').length || 0;
  const lowStockItems = inventory?.filter((i: any) => {
    const remaining = (i.quantity_added || 0) - (i.quantity_distributed || 0);
    return remaining <= (i.minimum_stock || 0);
  }).length || 0;
  const recentCollections = collections?.slice(0, 5) || [];
  const maleStudents = students?.filter((s: any) => s.gender === 'male').length || 0;
  const femaleStudents = students?.filter((s: any) => s.gender === 'female').length || 0;

  const classData = classes?.map((cls: any) => ({
    name: cls.name || 'Unknown',
    collections: collections?.filter((c: any) => c.class_at_collection === cls.name).length || 0,
  })) || [];

  const itemData = inventory?.slice(0, 6).map((item: any) => ({
    name: item.item_name || 'Unknown',
    value: item.quantity_distributed || 0,
  })) || [];

  const weeklyData = [
    { day: 'Mon', collections: collections?.filter((c: any) => dayjs(c.collection_date).day() === 1).length || 0 },
    { day: 'Tue', collections: collections?.filter((c: any) => dayjs(c.collection_date).day() === 2).length || 0 },
    { day: 'Wed', collections: collections?.filter((c: any) => dayjs(c.collection_date).day() === 3).length || 0 },
    { day: 'Thu', collections: collections?.filter((c: any) => dayjs(c.collection_date).day() === 4).length || 0 },
    { day: 'Fri', collections: collections?.filter((c: any) => dayjs(c.collection_date).day() === 5).length || 0 },
  ];

  const mobileNavItems = [
    { id: 'dashboard', label: 'Home', icon: School },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'classes', label: 'Classes', icon: GraduationCap },
    { id: 'collections', label: 'Items', icon: HandHelping },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'inventory', label: 'Inventory', icon: Box },
    { id: 'activity', label: 'Activity', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-3 pb-20 sm:pb-0">
      {/* Mobile Header */}
      <div className="flex items-center justify-between gap-2 sm:hidden">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{currentPage}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleRefresh} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setNotificationsOpen(true)} className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="sm:hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2"
          >
            <div className="grid grid-cols-4 gap-1">
              {mobileNavItems.slice(0, 8).map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(`/admin-asst/${item.id === 'dashboard' ? 'dashboard' : item.id}`);
                    }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                      isActive ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[8px] font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentPage === 'dashboard' && (
                <DashboardContent
                  stats={stats}
                  students={students}
                  collections={collections}
                  inventory={inventory}
                  classes={classes}
                  sessions={sessions}
                  currentSession={currentSession}
                  timeGreeting={timeGreeting}
                  user={user}
                  totalStudents={totalStudents}
                  totalCollections={totalCollections}
                  totalItems={totalItems}
                  totalClasses={totalClasses}
                  activeStudents={activeStudents}
                  pendingAdmissions={pendingAdmissions}
                  lowStockItems={lowStockItems}
                  recentCollections={recentCollections}
                  maleStudents={maleStudents}
                  femaleStudents={femaleStudents}
                  classData={classData}
                  itemData={itemData}
                  weeklyData={weeklyData}
                  activeChart={activeChart}
                  onChartChange={setActiveChart}
                  onViewStudent={handleViewStudent}
                  onAddStudent={handleAddStudent}
                  onRefresh={handleRefresh}
                  onAddCollection={openCollectionModal}
                  onAddInventory={() => setShowAddInventoryModal(true)}
                />
              )}
              {currentPage === 'collections' && (
                <CollectionsPage
                  groupedCollections={groupedCollections}
                  collectionFilter={collectionFilter}
                  selectedTermFilter={selectedTermFilter}
                  selectedClassFilter={selectedClassFilter}
                  sessions={sessions}
                  classes={classes}
                  onFilterChange={(filter: any) => setCollectionFilter(filter)}
                  onTermFilterChange={(term: string) => setSelectedTermFilter(term)}
                  onClassFilterChange={(cls: string) => setSelectedClassFilter(cls)}
                  onAddCollection={openCollectionModal}
                  onViewStudent={handleViewStudent}
                />
              )}
              {currentPage === 'payment' && <RecordPayment />}
              {currentPage === 'inventory' && (
                <InventoryPage
                  inventory={inventory}
                  onAddInventory={() => setShowAddInventoryModal(true)}
                  onDeleteItem={async (id) => {
                    if (confirm('Delete this item?')) {
                      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
                      if (error) {
                        toast.error(error.message);
                      } else {
                        await fetchInventory();
                        toast.success('Item deleted');
                      }
                    }
                  }}
                />
              )}
              {currentPage === 'students' && <StudentsList />}
              {currentPage === 'classes' && <ClassesList />}
              {currentPage === 'sessions' && <SessionsList sessions={sessions} onSetActive={async (id) => {
                await supabase.from('academic_sessions').update({ is_current: false }).neq('id', id);
                await supabase.from('academic_sessions').update({ is_current: true }).eq('id', id);
                await fetchSessions();
                toast.success('Session activated');
              }} />}
              {currentPage === 'reports' && <ReportsDashboard />}
              {currentPage === 'activity' && <ActivityLog logs={activityLogs} />}
              {currentPage === 'settings' && <Settings />}
              {currentPage === 'profile' && <Profile />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Sidebar - UPDATED with proper student data passing */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <RightSidebar
            user={user}
            totalStudents={totalStudents}
            activeStudents={activeStudents}
            pendingAdmissions={pendingAdmissions}
            lowStockItems={lowStockItems}
            totalCollections={totalCollections}
            maleStudents={maleStudents}
            femaleStudents={femaleStudents}
            recentCollections={recentCollections}
            onViewStudent={handleViewStudent}
          />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 sm:hidden shadow-lg">
        <div className="flex items-center justify-around px-1 py-1">
          {mobileNavItems.slice(0, 6).map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(`/admin-asst/${item.id === 'dashboard' ? 'dashboard' : item.id}`)}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all min-w-[44px] ${
                  isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[8px] font-medium">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all min-w-[44px] ${
              mobileMenuOpen ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[8px] font-medium">More</span>
          </button>
        </div>
      </div>

      {/* ============================================
          ADD COLLECTION MODAL
          ============================================ */}
      <AnimatePresence>
        {showAddCollectionModal && (
          <AddCollectionModal
            onClose={() => setShowAddCollectionModal(false)}
            students={studentsWithClasses}
            inventory={inventory}
            sessions={sessions}
            selectedStudent={selectedStudentForCollection}
            setSelectedStudent={setSelectedStudentForCollection}
            selectedItems={selectedItems}
            currentItem={currentItem}
            setCurrentItem={setCurrentItem}
            quantity={quantity}
            setQuantity={setQuantity}
            collectionDate={collectionDate}
            setCollectionDate={setCollectionDate}
            remarks={remarks}
            setRemarks={setRemarks}
            selectedTerm={selectedTerm}
            setSelectedTerm={setSelectedTerm}
            selectedSession={selectedSession}
            setSelectedSession={setSelectedSession}
            onAddItem={addItemToCollection}
            onRemoveItem={removeItemFromCollection}
            onUpdateQuantity={updateItemQuantity}
            onSubmit={handleSubmitCollection}
          />
        )}
      </AnimatePresence>

      {/* ============================================
          SIGNATURE MODAL
          ============================================ */}
      <AnimatePresence>
        {showSignatureModal && (
          <SignatureModal
            onClose={() => setShowSignatureModal(false)}
            canvasRef={canvasRef}
            isDrawing={isDrawing}
            startDrawing={startDrawing}
            draw={draw}
            stopDrawing={stopDrawing}
            clearCanvas={clearCanvas}
            onFileUpload={handleSignatureFileUpload}
            onSave={handleSaveSignature}
            isLoading={isSubmittingCollection}
          />
        )}
      </AnimatePresence>

      {/* ============================================
          SUCCESS MODAL
          ============================================ */}
      <AnimatePresence>
        {showSuccessModal && (
          <SuccessModal
            successData={successData}
            onDone={() => {
              setShowSuccessModal(false);
              setSelectedStudentForCollection(null);
              setSelectedItems([]);
              setCurrentItem(null);
              setQuantity(1);
              setRemarks('');
              setSignatureData(null);
              setSignatureFile(null);
            }}
            onRecordAnother={() => {
              setShowSuccessModal(false);
              setSelectedStudentForCollection(null);
              setSelectedItems([]);
              setCurrentItem(null);
              setQuantity(1);
              setRemarks('');
              setSignatureData(null);
              setSignatureFile(null);
              openCollectionModal();
            }}
          />
        )}
      </AnimatePresence>

      {/* ============================================
          ADD INVENTORY MODAL
          ============================================ */}
      <AnimatePresence>
        {showAddInventoryModal && (
          <AddInventoryModal
            onClose={() => setShowAddInventoryModal(false)}
            form={inventoryForm}
            setForm={setInventoryForm}
            onSubmit={handleAddInventory}
            loading={inventoryLoading}
          />
        )}
      </AnimatePresence>

      {/* ============================================
          STUDENT PROFILE MODAL - With full student details
          ============================================ */}
      <StudentProfileModal
        open={showStudentModal}
        onClose={() => {
          setShowStudentModal(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        collections={collections}
      />

      <NotificationPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={markAllAsRead}
        onClear={clearNotifications}
        onNotificationClick={(notification) => {
          setNotificationsOpen(false);
          if (notification.link) {
            navigate(`/admin-asst/${notification.link}`);
          }
        }}
      />
    </div>
  );
};

// ============================================
// RIGHT SIDEBAR - UPDATED with proper student data
// ============================================
const RightSidebar: React.FC<any> = ({
  user,
  totalStudents,
  activeStudents,
  pendingAdmissions,
  lowStockItems,
  totalCollections,
  maleStudents,
  femaleStudents,
  recentCollections,
  onViewStudent,
}) => {
  return (
    <div className="space-y-4 sticky top-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Admin Assistant
            </p>
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Quick Stats</h4>
        <div className="space-y-2.5">
          <QuickStatItem icon={Users} label="Students" value={totalStudents} color="blue" />
          <QuickStatItem icon={UserCheck} label="Active" value={activeStudents} color="green" />
          <QuickStatItem icon={ClockIcon} label="Pending" value={pendingAdmissions} color="yellow" />
          <QuickStatItem icon={AlertTriangle} label="Low Stock" value={lowStockItems} color="red" />
          <QuickStatItem icon={HandHelping} label="Collections" value={totalCollections} color="purple" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Gender</h4>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">👨 Male</span>
              <span className="font-medium text-gray-900 dark:text-white">{maleStudents}</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-0.5">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${maleStudents + femaleStudents > 0 ? (maleStudents / (maleStudents + femaleStudents)) * 100 : 0}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">👩 Female</span>
              <span className="font-medium text-gray-900 dark:text-white">{femaleStudents}</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-0.5">
              <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${maleStudents + femaleStudents > 0 ? (femaleStudents / (maleStudents + femaleStudents)) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Recent</h4>
        <div className="space-y-2">
          {recentCollections.slice(0, 4).map((collection: any) => (
            <div 
              key={collection.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
              onClick={() => {
                // Create a student object with all available data
                const studentData = {
                  id: collection.student_id,
                  student_id: collection.student_id,
                  student_name: collection.student_name,
                  first_name: collection.student_name?.split(' ')[0] || 'N/A',
                  last_name: collection.student_name?.split(' ').slice(1).join(' ') || 'N/A',
                  full_name: collection.student_name || 'N/A',
                  class_name: collection.class_at_collection || 'Not Assigned',
                  class_at_collection: collection.class_at_collection,
                  current_status: 'active',
                  status: 'active',
                };
                onViewStudent(studentData);
              }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">
                {collection.student_name?.[0] || 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{collection.student_name || 'Unknown'}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{collection.item_name} ×{collection.quantity}</p>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{dayjs(collection.collection_date).format('MMM D')}</span>
            </div>
          ))}
          {recentCollections.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// QUICK STAT ITEM
// ============================================
const QuickStatItem: React.FC<{
  icon: React.FC<any>;
  label: string;
  value: number | string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink';
}> = ({ icon: Icon, label, value, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    pink: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
  };

  return (
    <div className="flex items-center gap-2.5">
      <div className={`p-1.5 rounded-lg ${colors[color]}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
      </div>
      <p className="text-sm font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
};

// ============================================
// DASHBOARD CONTENT
// ============================================
const DashboardContent: React.FC<any> = ({
  user,
  timeGreeting,
  currentSession,
  totalStudents,
  totalClasses,
  totalCollections,
  totalItems,
  activeStudents,
  pendingAdmissions,
  lowStockItems,
  recentCollections,
  maleStudents,
  femaleStudents,
  classData,
  itemData,
  weeklyData,
  activeChart,
  onChartChange,
  onViewStudent,
  onAddStudent,
  onRefresh,
  onAddCollection,
  onAddInventory,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-3">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 p-4 sm:p-5 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <span>{timeGreeting} 👋</span>
              <span className="hidden sm:inline text-sm font-normal opacity-80">{user?.first_name || 'Admin'}</span>
            </h2>
            <p className="text-xs sm:text-sm opacity-80">Here's what's happening today</p>
          </div>
          <div className="flex items-center gap-2">
            {currentSession && (
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1 text-xs">
                <span className="opacity-80">Session:</span> <span className="font-semibold">{currentSession.session_name}</span>
              </div>
            )}
            <button onClick={handleRefresh} disabled={isRefreshing} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <CompactStatCard icon={<Users className="w-4 h-4" />} label="Students" value={totalStudents} subValue={`${activeStudents} active`} color="blue" />
        <CompactStatCard icon={<GraduationCap className="w-4 h-4" />} label="Classes" value={totalClasses} subValue="Total" color="purple" />
        <CompactStatCard icon={<HandHelping className="w-4 h-4" />} label="Collections" value={totalCollections} subValue="Recorded" color="green" />
        <CompactStatCard icon={<Box className="w-4 h-4" />} label="Items" value={totalItems} subValue={`${lowStockItems} low`} color="orange" />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <QuickActionSmall icon={<UserPlus className="w-4 h-4" />} label="Add Student" color="blue" onClick={onAddStudent} />
        <QuickActionSmall icon={<HandHelping className="w-4 h-4" />} label="Collection" color="green" onClick={onAddCollection} />
        <QuickActionSmall icon={<Box className="w-4 h-4" />} label="Add Item" color="orange" onClick={onAddInventory} />
        <QuickActionSmall icon={<CreditCard className="w-4 h-4" />} label="Payment" color="purple" onClick={() => window.location.href = '/admin-asst/payment'} />
        <QuickActionSmall icon={<BookOpen className="w-4 h-4" />} label="Add Class" color="pink" onClick={() => {}} />
        <QuickActionSmall icon={<FileText className="w-4 h-4" />} label="Reports" color="red" onClick={() => {}} />
      </div>

      {/* Charts */}
      <div className="space-y-3">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-fit">
          <button onClick={() => onChartChange('bar')} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${activeChart === 'bar' ? 'bg-white dark:bg-gray-800 shadow' : 'text-gray-500 dark:text-gray-400'}`}>Bar</button>
          <button onClick={() => onChartChange('pie')} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${activeChart === 'pie' ? 'bg-white dark:bg-gray-800 shadow' : 'text-gray-500 dark:text-gray-400'}`}>Pie</button>
          <button onClick={() => onChartChange('line')} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${activeChart === 'line' ? 'bg-white dark:bg-gray-800 shadow' : 'text-gray-500 dark:text-gray-400'}`}>Line</button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="h-48 sm:h-56">
            {activeChart === 'bar' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classData.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 8 }} />
                  <Tooltip contentStyle={{ fontSize: 10, background: 'rgba(255,255,255,0.9)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 8 }} />
                  <Bar dataKey="collections" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {activeChart === 'pie' && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={itemData.slice(0, 6)} cx="50%" cy="50%" innerRadius={20} outerRadius={60} paddingAngle={2} dataKey="value">
                    {itemData.slice(0, 6).map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 10, background: 'rgba(255,255,255,0.9)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {activeChart === 'line' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                  <XAxis dataKey="day" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 8 }} />
                  <Tooltip contentStyle={{ fontSize: 10, background: 'rgba(255,255,255,0.9)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 8 }} />
                  <Line type="monotone" dataKey="collections" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            {activeChart === 'bar' && 'Collections by Class'}
            {activeChart === 'pie' && 'Most Distributed Items'}
            {activeChart === 'line' && 'Weekly Collections Trend'}
          </p>
        </div>
      </div>

      {/* Recent Collections - UPDATED with proper student data passing */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <HandHelping className="w-4 h-4 text-teal-500" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Recent</h3>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">Latest</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {recentCollections.slice(0, 4).map((collection: any) => (
            <div 
              key={collection.id} 
              className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors" 
              onClick={() => {
                const studentData = {
                  id: collection.student_id,
                  student_id: collection.student_id,
                  student_name: collection.student_name,
                  first_name: collection.student_name?.split(' ')[0] || 'N/A',
                  last_name: collection.student_name?.split(' ').slice(1).join(' ') || 'N/A',
                  full_name: collection.student_name || 'N/A',
                  class_name: collection.class_at_collection || 'Not Assigned',
                  class_at_collection: collection.class_at_collection,
                  current_status: 'active',
                  status: 'active',
                };
                onViewStudent(studentData);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{collection.student_name || 'Unknown'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{collection.item_name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">×{collection.quantity}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[8px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{collection.class_at_collection || 'N/A'}</span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">{dayjs(collection.collection_date).format('MMM D')}</span>
              </div>
            </div>
          ))}
          {recentCollections.length === 0 && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">No collections recorded yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPACT STAT CARD
// ============================================
const CompactStatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subValue?: string;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'red';
}> = ({ icon, label, value, subValue, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    pink: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center gap-2.5">
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{label}</p>
          {subValue && <p className="text-[8px] text-gray-400 dark:text-gray-500 truncate">{subValue}</p>}
        </div>
      </div>
    </div>
  );
};

// ============================================
// QUICK ACTION SMALL
// ============================================
const QuickActionSmall: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'pink';
  onClick: () => void;
}> = ({ icon, label, color, onClick }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400',
    green: 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400',
    orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400',
    red: 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400',
    pink: 'bg-pink-50 text-pink-600 hover:bg-pink-100 dark:bg-pink-900/20 dark:text-pink-400',
  };

  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${colors[color]} whitespace-nowrap text-[10px] font-medium`}>
      {icon}
      {label}
    </button>
  );
};

// ============================================
// COLLECTIONS PAGE COMPONENT
// ============================================
const CollectionsPage: React.FC<any> = ({
  groupedCollections,
  collectionFilter,
  selectedTermFilter,
  selectedClassFilter,
  sessions,
  classes,
  onFilterChange,
  onTermFilterChange,
  onClassFilterChange,
  onAddCollection,
  onViewStudent,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = groupedCollections.filter((g: any) => {
    if (!searchTerm) return true;
    return g.student_name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const terms = sessions?.map((s: any) => s.term_name).filter((t: string, i: number, arr: string[]) => arr.indexOf(t) === i) || [];
  const classNames = classes?.map((c: any) => c.name) || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HandHelping className="w-5 h-5 text-teal-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Collections</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">({groupedCollections.length} students)</span>
        </div>
        <button
          onClick={onAddCollection}
          className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-teal-500/25"
        >
          <Plus className="w-4 h-4" />
          New Collection
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm dark:text-white"
            />
          </div>

          <select
            value={collectionFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm dark:text-white"
          >
            <option value="all">All Sessions</option>
            <option value="current">Current Session</option>
            <option value="previous">Previous Sessions</option>
          </select>

          <select
            value={selectedTermFilter}
            onChange={(e) => onTermFilterChange(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm dark:text-white"
          >
            <option value="all">All Terms</option>
            {terms.map((term: string) => (
              <option key={term} value={term}>{term}</option>
            ))}
          </select>

          <select
            value={selectedClassFilter}
            onChange={(e) => onClassFilterChange(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm dark:text-white"
          >
            <option value="all">All Classes</option>
            {classNames.map((cls: string) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400' : 'text-gray-400'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400' : 'text-gray-400'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collections Grid/List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <HandHelping className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No collections found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {groupedCollections.length === 0 ? 'No collections recorded yet' : 'Try adjusting your filters'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((collection: any) => (
            <CollectionCard
              key={collection.student_id}
              collection={collection}
              onViewDetails={() => onViewStudent(collection)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400">Student</th>
                  <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400">Items</th>
                  <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400">Class</th>
                  <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400">Term</th>
                  <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((collection: any) => (
                  <tr key={collection.student_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {collection.student_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {collection.items.map((i: any) => `${i.item_name} (×${i.quantity})`).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {collection.class_at_collection}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {dayjs(collection.collection_date).format('MMM D, YYYY')}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {collection.term_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onViewStudent(collection)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// COLLECTION CARD COMPONENT
// ============================================
const CollectionCard: React.FC<{
  collection: any;
  onViewDetails: () => void;
}> = ({ collection, onViewDetails }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)' }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all"
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {collection.student_name?.[0] || 'S'}
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                {collection.student_name || 'Unknown Student'}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {collection.class_at_collection || 'No Class'}
                </span>
                <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {dayjs(collection.collection_date).format('MMM D, YYYY')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-medium ${getStatusColor(collection.status || 'completed')}`}>
              {collection.status || 'Completed'}
            </span>
            <button
              onClick={onViewDetails}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {collection.items?.slice(0, 4).map((item: any, idx: number) => (
            <div key={idx} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{item.item_name}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">×{item.quantity}</p>
            </div>
          ))}
          {collection.items?.length > 4 && (
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center flex items-center justify-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">+{collection.items.length - 4} more</p>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {collection.items?.length || 0} items
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {collection.term_name || 'N/A'}
            </span>
          </div>
          {collection.signature_url && (
            <div className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400">
              <PenTool className="w-3 h-3" />
              Signed
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// INVENTORY PAGE COMPONENT
// ============================================
const InventoryPage: React.FC<any> = ({ inventory, onAddInventory, onDeleteItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = inventory?.map((i: any) => i.category).filter((c: string, i: number, arr: string[]) => arr.indexOf(c) === i) || [];

  const filtered = inventory?.filter((item: any) => {
    const matchesSearch = item.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Inventory</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">({inventory?.length || 0} items)</span>
        </div>
        <button
          onClick={onAddInventory}
          className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/25"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search inventory..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm dark:text-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm dark:text-white"
        >
          <option value="all">All Categories</option>
          {categories.map((cat: string) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <Box className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No items found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add your first inventory item</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item: any) => {
            const remaining = (item.quantity_added || 0) - (item.quantity_distributed || 0);
            const isLow = remaining <= (item.minimum_stock || 0);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border p-4 transition-all hover:shadow-xl ${
                  isLow ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-500" />
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">{item.item_name}</h4>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.category}</p>
                    {isLow && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[8px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        Low Stock
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-500"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Added</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.quantity_added || 0}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Distributed</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.quantity_distributed || 0}</p>
                  </div>
                  <div className={`bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center ${isLow ? 'border-2 border-red-300 dark:border-red-700' : ''}`}>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
                    <p className={`text-sm font-semibold ${isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{remaining}</p>
                  </div>
                </div>

                <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  Min stock: {item.minimum_stock || 0}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================
// ADD COLLECTION MODAL
// ============================================
const AddCollectionModal: React.FC<any> = ({
  onClose,
  students,
  inventory,
  sessions,
  selectedStudent,
  setSelectedStudent,
  selectedItems,
  currentItem,
  setCurrentItem,
  quantity,
  setQuantity,
  collectionDate,
  setCollectionDate,
  remarks,
  setRemarks,
  selectedTerm,
  setSelectedTerm,
  selectedSession,
  setSelectedSession,
  onAddItem,
  onRemoveItem,
  onUpdateQuantity,
  onSubmit,
}) => {
  const currentSession = sessions?.find((s: any) => s.is_current);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <HandHelping className="w-5 h-5 text-teal-500" />
            Record Collection
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Student Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Student <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:border-teal-500 transition-all">
              <Users className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <select
                className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white appearance-none cursor-pointer"
                value={selectedStudent?.id || ''}
                onChange={(e) => {
                  const student = students.find((s: any) => s.id === e.target.value);
                  setSelectedStudent(student || null);
                }}
              >
                <option value="">Select a student...</option>
                {students.map((student: any) => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name} - {student.class_name || 'No Class'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
            {selectedStudent && (
              <div className="mt-2 p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold">
                  {selectedStudent.first_name?.[0]}{selectedStudent.last_name?.[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedStudent.class_name || 'No Class'} • {selectedStudent.student_id || 'N/A'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Session & Term */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session</label>
              <select
                value={selectedSession?.id || currentSession?.id || ''}
                onChange={(e) => {
                  const session = sessions.find((s: any) => s.id === e.target.value);
                  setSelectedSession(session || null);
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
              >
                {sessions.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.session_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Term</label>
              <select
                value={selectedTerm?.id || currentSession?.id || ''}
                onChange={(e) => {
                  const term = sessions.find((s: any) => s.id === e.target.value);
                  setSelectedTerm(term || null);
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
              >
                {sessions.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.term_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Items */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Add Items <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:border-teal-500 transition-all">
                  <Box className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <select
                    className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white appearance-none cursor-pointer"
                    value={currentItem?.id || ''}
                    onChange={(e) => {
                      const item = inventory.find((i: any) => i.id === e.target.value);
                      setCurrentItem(item || null);
                    }}
                  >
                    <option value="">Select an item...</option>
                    {inventory.map((item: any) => {
                      const remaining = (item.quantity_added || 0) - (item.quantity_distributed || 0);
                      return (
                        <option key={item.id} value={item.id}>
                          {item.item_name} ({remaining} available)
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    <MinusCircle className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="w-12 text-center px-1 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={onAddItem}
                  disabled={!currentItem}
                  className="px-3 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
              {currentItem && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Available: {(currentItem.quantity_added || 0) - (currentItem.quantity_distributed || 0)}
                </p>
              )}
            </div>
          </div>

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selected ({selectedItems.length})
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.item_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                      >
                        <MinusCircle className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-all text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date & Remarks */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
              />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add notes..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm">
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!selectedStudent || selectedItems.length === 0}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              <PenTool className="w-4 h-4" />
              Continue ({selectedItems.length})
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// SIGNATURE MODAL
// ============================================
const SignatureModal: React.FC<any> = ({
  onClose,
  canvasRef,
  isDrawing,
  startDrawing,
  draw,
  stopDrawing,
  clearCanvas,
  onFileUpload,
  onSave,
  isLoading,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <PenTool className="w-5 h-5 text-teal-500" />
            Signature
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Draw your signature or upload an image
          </p>

          <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className="w-full h-[150px] touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={clearCanvas} className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
              Clear
            </button>
            <label className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer flex items-center gap-1">
              <Upload className="w-4 h-4" />
              Upload Image
              <input type="file" accept="image/*" className="hidden" onChange={onFileUpload} />
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm">
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save & Record
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// SUCCESS MODAL
// ============================================
const SuccessModal: React.FC<any> = ({ successData, onDone, onRecordAnother }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
      >
        <div className="text-center p-6">
          <div className="flex justify-center mb-4">
            {successImage ? (
              <img src={successImage} alt="Success" className="w-32 h-32 sm:w-40 sm:h-40 object-contain" />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">Collection Recorded! 🎉</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {successData?.totalItems} item(s) recorded successfully
          </p>

          <div className="mt-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Student</span>
              <span className="font-medium text-gray-900 dark:text-white">{successData?.student}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
              <span className="text-gray-500 dark:text-gray-400">Items</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {successData?.items?.map((i: any) => `${i.name} (×${i.quantity})`).join(', ')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total</span>
              <span className="font-medium text-gray-900 dark:text-white">{successData?.totalItems}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Date</span>
              <span className="font-medium text-gray-900 dark:text-white">{dayjs(successData?.date).format('MMMM D, YYYY')}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <button onClick={onDone} className="w-full px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Done
            </button>
            <button onClick={onRecordAnother} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Record Another
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// ADD INVENTORY MODAL
// ============================================
const AddInventoryModal: React.FC<any> = ({
  onClose,
  form,
  setForm,
  onSubmit,
  loading,
}) => {
  const categories = ['Books', 'Uniform', 'Laboratory', 'Sports', 'Stationery', 'Arts', 'Others'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Box className="w-5 h-5 text-orange-500" />
            Add Inventory Item
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              placeholder="e.g., Mathematics Textbook"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.quantity_added}
                onChange={(e) => setForm({ ...form, quantity_added: parseInt(e.target.value) || 0 })}
                min="1"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Stock
              </label>
              <input
                type="number"
                value={form.minimum_stock}
                onChange={(e) => setForm({ ...form, minimum_stock: parseInt(e.target.value) || 5 })}
                min="0"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Add a description..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm">
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={loading || !form.item_name || form.quantity_added < 1}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Box className="w-4 h-4" />}
              Add Item
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// SESSIONS LIST
// ============================================
const SessionsList: React.FC<any> = ({ sessions, onSetActive }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Academic Sessions</h3>
      {sessions?.map((session: any) => (
        <div key={session.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 ${session.is_current ? 'border-teal-500 dark:border-teal-400' : 'border-gray-200 dark:border-gray-700'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{session.session_name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{session.term_name}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500">
                <span>{dayjs(session.start_date).format('MMM D, YYYY')}</span>
                <span>→</span>
                <span>{dayjs(session.end_date).format('MMM D, YYYY')}</span>
              </div>
            </div>
            {session.is_current ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
            ) : (
              <button onClick={() => onSetActive(session.id)} className="px-3 py-1.5 text-xs font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all">
                Set Active
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// ACTIVITY LOG
// ============================================
const ActivityLog: React.FC<any> = ({ logs }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Activity Log</h3>
      {logs?.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">No activity recorded</div>
      ) : (
        <div className="space-y-2">
          {logs?.slice(0, 20).map((log: any) => (
            <div key={log.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  {log.action?.[0] || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">{log.action || 'Unknown action'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{log.details || ''}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {dayjs(log.created_at).format('MMM D, YYYY h:mm A')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAsst;