import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import {
Users,
UserPlus,
User,
Search,
X,
Loader2,
UserCheck,
Eye,
EyeOff,
Copy,
RefreshCw,
ChevronDown,
ChevronUp,
Trash2,
Save,
AlertCircle,
CheckCircle,
Unlink,
Key,
Users as UsersIcon,
BarChart3,
Edit2,
RefreshCcw,
} from 'lucide-react';

// Types
interface Student {
id: string;
student_id: string;
first_name: string;
last_name: string;
middle_name: string;
email: string;
phone_number: string;
class_id: string;
class_name?: string;
admission_date: string;
current_status: string;
parent_id: string | null;
parent: Parent | null;
has_parent: boolean;
parent_has_login: boolean;
parent_user_confirmed: boolean;
}

interface Parent {
id: string;
parent_id: string;
user_id: string | null;
first_name: string;
last_name: string;
middle_name: string | null;
email: string;
phone_number: string;
address: string | null;
occupation: string | null;
employer: string | null;
is_guardian: boolean;
is_primary_contact: boolean;
branch_id: string;
created_at: string;
updated_at: string;
created_by: string | null;
metadata: any;
user_email?: string;
user_is_active?: boolean;
has_login?: boolean;
children?: Student[];
child_count?: number;
pending_auth?: boolean;
}

const ParentManagement: React.FC = () => {
const navigate = useNavigate();
const { user } = useAuth();
const [loading, setLoading] = useState(true);
const [parents, setParents] = useState<Parent[]>([]);
const [filteredParents, setFilteredParents] = useState<Parent[]>([]);
const [students, setStudents] = useState<Student[]>([]);
const [searchTerm, setSearchTerm] = useState('');
const [filterStatus, setFilterStatus] = useState<'all' | 'has_login' | 'no_login' | 'pending_auth'>('all');
const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
const [showCreateModal, setShowCreateModal] = useState(false);
const [showViewModal, setShowViewModal] = useState(false);
const [showEditModal, setShowEditModal] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const [loadingAction, setLoadingAction] = useState(false);
const [branchId, setBranchId] = useState('');
const [expandedParent, setExpandedParent] = useState<string | null>(null);
const [refreshKey, setRefreshKey] = useState(0);
const [showLoginModal, setShowLoginModal] = useState(false);
const [loginPassword, setLoginPassword] = useState('');
const [showLoginPassword, setShowLoginPassword] = useState(false);
const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
const [showRetryAuthModal, setShowRetryAuthModal] = useState(false);
const [retryPassword, setRetryPassword] = useState('');
const [showRetryPassword, setShowRetryPassword] = useState(false);

// Form state
const [formData, setFormData] = useState({
first_name: '',
last_name: '',
middle_name: '',
email: '',
phone_number: '',
address: '',
occupation: '',
employer: '',
is_guardian: false,
is_primary_contact: true,
password: '',
confirm_password: '',
student_ids: [],
});

const [editFormData, setEditFormData] = useState<Partial<any>>({
first_name: '',
last_name: '',
middle_name: '',
email: '',
phone_number: '',
address: '',
occupation: '',
employer: '',
is_guardian: false,
is_primary_contact: true,
student_ids: [],
});

const [formErrors, setFormErrors] = useState<Record<string, string>>({});

// Load data
useEffect(() => {
if (user?.id) {
loadBranch();
}
}, [user]);

useEffect(() => {
if (branchId) {
loadData();
}
}, [branchId, refreshKey]);

const loadBranch = async () => {
try {
const { data, error } = await supabase
.from('users')
.select('branch_id')
.eq('id', user?.id)
.single();

      if (error) throw error;
      if (data) {
        setBranchId(data.branch_id);
      }
} catch (error) {
  console.error('Error loading branch:', error);
  toast.error('Failed to load branch');
}
};

// Load data without nested relationship
const loadData = async () => {
setLoading(true);
try {
// 1. Load all parents
const { data: parentsData, error: parentsError } = await supabase
.from('parents')
.select('*')
.eq('branch_id', branchId)
.order('created_at', { ascending: false });

    if (parentsError) throw parentsError;

    // 2. Load all students
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select(`
        *,
        class:class_id (
          name
        )
      `)
      .eq('branch_id', branchId)
      .eq('current_status', 'active')
      .order('first_name');

    if (studentsError) throw studentsError;

    // 3. Get user info for parents (for login status)
    const userIds = [...new Set((parentsData || []).map(p => p.user_id).filter(Boolean))];
    let userMap: Record<string, { email: string; is_active: boolean }> = {};
    
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, is_active')
        .in('id', userIds);
      
      if (usersData) {
        userMap = usersData.reduce((acc, u) => ({ 
          ...acc, 
          [u.id]: { email: u.email, is_active: u.is_active } 
        }), {});
      }
    }

    // 4. Map students with class names
    const studentsWithClass = (studentsData || []).map((s: any) => ({
      ...s,
      class_name: s.class?.name || 'Not Assigned',
      has_parent: !!s.parent_id,
      parent: null,
      parent_has_login: false,
      parent_user_confirmed: false,
    }));

    setStudents(studentsWithClass);

    // 5. Combine parent data with student count
    const parentsWithDetails = (parentsData || []).map((p: any) => {
      const userInfo = p.user_id ? userMap[p.user_id] : null;
      
      // Count children for this parent
      const childrenCount = studentsWithClass.filter(s => s.parent_id === p.id).length;
      
      // Check if parent has pending auth
      const pendingAuth = p.metadata?.pending_auth === true;
      
      return {
        ...p,
        child_count: childrenCount,
        user_email: userInfo?.email || null,
        user_is_active: userInfo?.is_active || false,
        has_login: !!p.user_id,
        pending_auth: pendingAuth,
      };
    });

    setParents(parentsWithDetails);
    setFilteredParents(parentsWithDetails);

} catch (error: any) {
  console.error('Error loading data:', error);
  toast.error(error.message || 'Failed to load data');
} finally {
  setLoading(false);
}
};

// Filter parents
useEffect(() => {
let filtered = parents;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(term) ||
        p.parent_id.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term)
      );
    }

    if (filterStatus === 'has_login') {
      filtered = filtered.filter(p => p.has_login);
    } else if (filterStatus === 'no_login') {
      filtered = filtered.filter(p => !p.has_login && !p.pending_auth);
    } else if (filterStatus === 'pending_auth') {
      filtered = filtered.filter(p => p.pending_auth);
    }

    setFilteredParents(filtered);

}, [searchTerm, filterStatus, parents]);

const checkEmailExists = async (email: string): Promise<boolean> => {
try {
// Check in parents table
const { data: parentData } = await supabase
.from('parents')
.select('email')
.eq('email', email.trim())
.maybeSingle();
if (parentData) return true;

    // Check in users table (auth users)
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.trim())
      .maybeSingle();
    if (userData) return true;

    // Check in students table
    const { data: studentData } = await supabase
      .from('students')
      .select('email')
      .eq('email', email.trim())
      .maybeSingle();
    if (studentData) return true;

    return false;
} catch (error) {
  console.error('Error checking email:', error);
  return false;
}
};

const generateParentId = async (): Promise<string> => {
const { data: existingParents } = await supabase
.from('parents')
.select('parent_id')
.eq('branch_id', branchId)
.order('parent_id', { ascending: false })
.limit(1);

    let nextNumber = 1;
    if (existingParents && existingParents.length > 0) {
      const lastId = existingParents[0].parent_id;
      const match = lastId.match(/PAR-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `PAR-${String(nextNumber).padStart(4, '0')}`;
};

const validateForm = (): boolean => {
const errors: Record<string, string> = {};

    if (!formData.first_name.trim()) errors.first_name = 'First name is required';
    if (!formData.last_name.trim()) errors.last_name = 'Last name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    if (!formData.phone_number.trim()) errors.phone_number = 'Phone number is required';
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    if (formData.student_ids.length === 0) {
      errors.student_ids = 'Please select at least one student';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
};

// Generate random password for fallback
const generateRandomPassword = (length: number = 12): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// ============================================================
// CREATE PARENT USING EDGE FUNCTION
// ============================================================

const createParent = async () => {
  if (!validateForm()) return;

  const emailExists = await checkEmailExists(formData.email);
  if (emailExists) {
    setFormErrors({ ...formErrors, email: 'This email is already registered' });
    toast.error('This email is already registered');
    return;
  }

  setLoadingAction(true);
  try {
    // Call the Edge Function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-parent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        middle_name: formData.middle_name.trim() || null,
        phone_number: formData.phone_number.trim(),
        address: formData.address.trim() || null,
        occupation: formData.occupation.trim() || null,
        employer: formData.employer.trim() || null,
        is_guardian: formData.is_guardian,
        is_primary_contact: formData.is_primary_contact,
        branch_id: branchId,
        created_by: user?.id,
        student_ids: formData.student_ids,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Edge Function error:', result);
      toast.error(result.error || 'Failed to create parent account');
      setLoadingAction(false);
      return;
    }

    if (!result.success) {
      toast.error(result.message || 'Failed to create parent account');
      setLoadingAction(false);
      return;
    }

    const studentNames = formData.student_ids.map(id => {
      const student = students.find(s => s.id === id);
      return student ? `${student.first_name} ${student.last_name}` : '';
    }).filter(Boolean).join(', ');

    toast.success(
      `✅ Parent account created successfully!\n\n` +
      `Name: ${formData.first_name} ${formData.last_name}\n` +
      `Email: ${formData.email}\n` +
      `Password: ${formData.password}\n` +
      `Linked to: ${studentNames}\n\n` +
      `💡 The parent can now log in with their email and password.`,
      { duration: 8000 }
    );

    resetForm();
    setShowCreateModal(false);
    setRefreshKey(prev => prev + 1);

  } catch (error: any) {
    console.error('Error creating parent:', error);
    toast.error(error.message || 'Failed to create parent account. Please try again.');
  } finally {
    setLoadingAction(false);
  }
};

// ============================================================
// UPDATE PARENT
// ============================================================

const updateParent = async () => {
if (!selectedParent) return;
if (!editFormData.first_name?.trim()) {
toast.error('First name is required');
return;
}

    setLoadingAction(true);
    try {
      // 1. Update parent record
      const { error: parentError } = await supabase
        .from('parents')
        .update({
          first_name: editFormData.first_name.trim(),
          last_name: editFormData.last_name.trim(),
          middle_name: editFormData.middle_name?.trim() || null,
          phone_number: editFormData.phone_number?.trim(),
          address: editFormData.address?.trim() || null,
          occupation: editFormData.occupation?.trim() || null,
          employer: editFormData.employer?.trim() || null,
          is_guardian: editFormData.is_guardian || false,
          is_primary_contact: editFormData.is_primary_contact !== false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedParent.id);

      if (parentError) throw parentError;

      // 2. Update student links - remove all current links
      await supabase
        .from('students')
        .update({ parent_id: null })
        .eq('parent_id', selectedParent.id);

      // 3. Link selected students
      if (editFormData.student_ids && editFormData.student_ids.length > 0) {
        const { error: linkError } = await supabase
          .from('students')
          .update({ parent_id: selectedParent.id })
          .in('id', editFormData.student_ids);

        if (linkError) throw linkError;
      }

      toast.success('Parent updated successfully!');
      setShowEditModal(false);
      setSelectedParent(null);
      setRefreshKey(prev => prev + 1);

    } catch (error: any) {
      console.error('Error updating parent:', error);
      toast.error(error.message || 'Failed to update parent');
    } finally {
      setLoadingAction(false);
    }
};

// ============================================================
// CREATE PARENT LOGIN USING EDGE FUNCTION
// ============================================================

const createParentLogin = async () => {
  if (!selectedParent) {
    toast.error('No parent selected');
    return;
  }

  if (!loginPassword || loginPassword.length < 6) {
    toast.error('Password must be at least 6 characters');
    return;
  }

  setLoadingAction(true);
  try {
    const parent = selectedParent;

    // Call the Edge Function to create auth for existing parent
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-parent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email: parent.email,
        password: loginPassword,
        first_name: parent.first_name,
        last_name: parent.last_name,
        middle_name: parent.middle_name || null,
        phone_number: parent.phone_number,
        address: parent.address || null,
        occupation: parent.occupation || null,
        employer: parent.employer || null,
        is_guardian: parent.is_guardian,
        is_primary_contact: parent.is_primary_contact,
        branch_id: branchId,
        created_by: user?.id,
        existing_parent_id: parent.id,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Edge Function error:', result);
      toast.error(result.error || 'Failed to create login');
      setLoadingAction(false);
      return;
    }

    if (!result.success) {
      toast.error(result.message || 'Failed to create login');
      setLoadingAction(false);
      return;
    }

    toast.success(
      `✅ Login created successfully!\n\n` +
      `Email: ${parent.email}\n` +
      `Password: ${loginPassword}`,
      { duration: 8000 }
    );

    setShowLoginModal(false);
    setLoginPassword('');
    setRefreshKey(prev => prev + 1);

  } catch (error: any) {
    console.error('Error creating login:', error);
    toast.error(error.message || 'Failed to create login. Please try again.');
  } finally {
    setLoadingAction(false);
  }
};

// ============================================================
// RETRY AUTH CREATION USING EDGE FUNCTION
// ============================================================

const retryAuthCreation = async () => {
  if (!selectedParent) {
    toast.error('No parent selected');
    return;
  }

  if (!retryPassword || retryPassword.length < 6) {
    toast.error('Password must be at least 6 characters');
    return;
  }

  setLoadingAction(true);
  try {
    const parent = selectedParent;

    // Call the Edge Function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-parent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email: parent.email,
        password: retryPassword,
        first_name: parent.first_name,
        last_name: parent.last_name,
        middle_name: parent.middle_name || null,
        phone_number: parent.phone_number,
        address: parent.address || null,
        occupation: parent.occupation || null,
        employer: parent.employer || null,
        is_guardian: parent.is_guardian,
        is_primary_contact: parent.is_primary_contact,
        branch_id: branchId,
        created_by: user?.id,
        existing_parent_id: parent.id,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Edge Function error:', result);
      toast.error(result.error || 'Failed to create auth');
      setLoadingAction(false);
      return;
    }

    if (!result.success) {
      toast.error(result.message || 'Failed to create auth');
      setLoadingAction(false);
      return;
    }

    toast.success(
      `✅ Login created successfully!\n\n` +
      `Email: ${parent.email}\n` +
      `Password: ${retryPassword}`,
      { duration: 8000 }
    );

    setShowRetryAuthModal(false);
    setRetryPassword('');
    setRefreshKey(prev => prev + 1);

  } catch (error: any) {
    console.error('Error creating auth:', error);
    toast.error(error.message || 'Failed to create auth. Please try again.');
  } finally {
    setLoadingAction(false);
  }
};

// ============================================================
// UNLINK ALL CHILDREN
// ============================================================

const unlinkAllChildren = async (parentId: string) => {
if (!confirm('Are you sure you want to unlink ALL children from this parent?')) return;

    setLoadingAction(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ parent_id: null })
        .eq('parent_id', parentId);

      if (error) throw error;

      toast.success('All children unlinked successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error unlinking children:', error);
      toast.error(error.message || 'Failed to unlink children');
    } finally {
      setLoadingAction(false);
    }
};

// ============================================================
// DELETE PARENT
// ============================================================

const deleteParent = async (parentId: string) => {
if (!confirm('Are you sure you want to delete this parent account? This action cannot be undone.')) return;

    setLoadingAction(true);
    try {
      // First unlink all children
      await supabase
        .from('students')
        .update({ parent_id: null })
        .eq('parent_id', parentId);

      // Then delete the parent
      const { error } = await supabase
        .from('parents')
        .delete()
        .eq('id', parentId);

      if (error) throw error;

      toast.success('Parent account deleted successfully');
      setRefreshKey(prev => prev + 1);
      setShowViewModal(false);
      setSelectedParent(null);
    } catch (error: any) {
      console.error('Error deleting parent:', error);
      toast.error(error.message || 'Failed to delete parent');
    } finally {
      setLoadingAction(false);
    }
};

// ============================================================
// RESET FORM
// ============================================================

const resetForm = () => {
setFormData({
first_name: '',
last_name: '',
middle_name: '',
email: '',
phone_number: '',
address: '',
occupation: '',
employer: '',
is_guardian: false,
is_primary_contact: true,
password: '',
confirm_password: '',
student_ids: [],
});
setFormErrors({});
};

// ============================================================
// MODAL HANDLERS
// ============================================================

const openCreateModal = () => {
setSelectedStudents([]);
setFormData({
...formData,
student_ids: [],
});
setShowCreateModal(true);
};

const openEditModal = (parent: Parent) => {
const children = students.filter(s => s.parent_id === parent.id);
const childIds = children.map(c => c.id);

    setSelectedParent(parent);
    setEditFormData({
      first_name: parent.first_name,
      last_name: parent.last_name,
      middle_name: parent.middle_name || '',
      email: parent.email,
      phone_number: parent.phone_number,
      address: parent.address || '',
      occupation: parent.occupation || '',
      employer: parent.employer || '',
      is_guardian: parent.is_guardian,
      is_primary_contact: parent.is_primary_contact,
      student_ids: childIds,
    });
    setShowEditModal(true);
};

const viewParentDetails = (parent: Parent) => {
setSelectedParent(parent);
setShowViewModal(true);
};

const openLoginModal = (parent: Parent) => {
setSelectedParent(parent);
setLoginPassword('');
setShowLoginModal(true);
};

const openRetryAuthModal = (parent: Parent) => {
setSelectedParent(parent);
setRetryPassword('');
setShowRetryAuthModal(true);
};

// ============================================================
// TOGGLE FUNCTIONS
// ============================================================

const toggleStudentSelection = (studentId: string, isEdit = false) => {
if (isEdit) {
setEditFormData(prev => ({
...prev,
student_ids: prev.student_ids?.includes(studentId)
? prev.student_ids.filter(id => id !== studentId)
: [...(prev.student_ids || []), studentId],
}));
} else {
setFormData(prev => ({
...prev,
student_ids: prev.student_ids.includes(studentId)
? prev.student_ids.filter(id => id !== studentId)
: [...prev.student_ids, studentId],
}));
}
};

const toggleExpand = (parentId: string) => {
setExpandedParent(expandedParent === parentId ? null : parentId);
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const getChildrenForParent = (parentId: string) => {
return students.filter(s => s.parent_id === parentId);
};

const copyToClipboard = (text: string) => {
navigator.clipboard.writeText(text);
toast.success('Copied to clipboard!');
};

const getStatusBadge = (parent: Parent) => {
if (parent.has_login) {
return {
label: 'Has Login',
color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
icon: CheckCircle,
};
} else if (parent.pending_auth) {
return {
label: 'Pending Auth',
color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
icon: AlertCircle,
};
} else {
return {
label: 'No Login',
color: 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-400',
icon: AlertCircle,
};
}
};

// ============================================================
// STATS CARDS
// ============================================================

const StatsCards = () => {
const total = parents.length;
const hasLogin = parents.filter(p => p.has_login).length;
const pendingAuth = parents.filter(p => p.pending_auth).length;
const totalChildren = students.filter(s => s.parent_id).length;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Parents</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Has Login</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{hasLogin}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Auth</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingAuth}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Children</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalChildren}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>
      </div>
    );
};

// ============================================================
// LOADING STATE
// ============================================================

if (loading) {
return (
<div className="flex items-center justify-center min-h-[60vh]">
<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
</div>
);
}

// ============================================================
// RENDER
// ============================================================

return (
<div className="space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Parent Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage parent accounts and link them to students
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
          >
            <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Add Parent
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <StatsCards />

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search parents by name, ID or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white"
            >
              <option value="all">All Parents</option>
              <option value="has_login">Has Login</option>
              <option value="no_login">No Login</option>
              <option value="pending_auth">Pending Auth</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Parent List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Parent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Children</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredParents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No parents match your search' : 'No parents found'}
                  </td>
                </tr>
              ) : (
                filteredParents.map((parent, index) => {
                  const status = getStatusBadge(parent);
                  const StatusIcon = status.icon;
                  const isExpanded = expandedParent === parent.id;
                  const children = getChildrenForParent(parent.id);

                  return (
                    <React.Fragment key={parent.id}>
                      <motion.tr
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                              {parent.first_name?.[0]}{parent.last_name?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {parent.first_name} {parent.last_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{parent.parent_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="text-gray-700 dark:text-gray-300">{parent.email}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{parent.phone_number}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <UsersIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {parent.child_count || 0} child{parent.child_count !== 1 ? 'ren' : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => viewParentDetails(parent)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-all"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(parent)}
                              className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 transition-all"
                              title="Edit parent"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {parent.pending_auth && (
                              <button
                                onClick={() => openRetryAuthModal(parent)}
                                className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 transition-all"
                                title="Retry auth creation"
                              >
                                <RefreshCcw className="w-4 h-4" />
                              </button>
                            )}
                            {!parent.has_login && !parent.pending_auth && (
                              <button
                                onClick={() => openLoginModal(parent)}
                                className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 transition-all"
                                title="Create login"
                              >
                                <Key className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => toggleExpand(parent.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </td>
                      </motion.tr>

                      {/* Expanded Row */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <td colSpan={5} className="px-4 py-4 bg-gray-50 dark:bg-gray-700/30">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
                                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Parent Details</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><span className="text-gray-500">ID:</span> {parent.parent_id}</p>
                                    <p><span className="text-gray-500">Email:</span> {parent.email}</p>
                                    <p><span className="text-gray-500">Phone:</span> {parent.phone_number}</p>
                                    <p><span className="text-gray-500">Address:</span> {parent.address || 'N/A'}</p>
                                    <p><span className="text-gray-500">Occupation:</span> {parent.occupation || 'N/A'}</p>
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
                                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Children ({children.length})</h4>
                                  {children.length === 0 ? (
                                    <p className="text-sm text-gray-400">No children linked</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {children.map((child) => (
                                        <div key={child.id} className="flex items-center justify-between text-sm">
                                          <span className="text-gray-700 dark:text-gray-300">
                                            {child.first_name} {child.last_name}
                                          </span>
                                          <span className="text-xs text-gray-500">{child.student_id}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
                                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quick Actions</h4>
                                  <div className="space-y-2">
                                    {parent.pending_auth && (
                                      <button
                                        onClick={() => openRetryAuthModal(parent)}
                                        className="w-full px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-all flex items-center justify-center gap-2"
                                      >
                                        <RefreshCcw className="w-4 h-4" />
                                        Retry Auth
                                      </button>
                                    )}
                                    {!parent.has_login && !parent.pending_auth && (
                                      <button
                                        onClick={() => openLoginModal(parent)}
                                        className="w-full px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-all flex items-center justify-center gap-2"
                                      >
                                        <Key className="w-4 h-4" />
                                        Create Login
                                      </button>
                                    )}
                                    <button
                                      onClick={() => unlinkAllChildren(parent.id)}
                                      className="w-full px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
                                    >
                                      <Unlink className="w-4 h-4" />
                                      Unlink All Children
                                    </button>
                                    <button
                                      onClick={() => deleteParent(parent.id)}
                                      className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete Parent
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          Showing {filteredParents.length} of {parents.length} parents
        </div>
      </motion.div>

      {/* Create Parent Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-purple-500" />
                    Create Parent Account
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Create a parent account and link to students
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                    setSelectedParent(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <form onSubmit={(e) => { e.preventDefault(); createParent(); }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className={`w-full px-4 py-2.5 rounded-xl border ${
                          formErrors.first_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                        } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white`}
                      />
                      {formErrors.first_name && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.first_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className={`w-full px-4 py-2.5 rounded-xl border ${
                          formErrors.last_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                        } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white`}
                      />
                      {formErrors.last_name && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.last_name}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={formData.middle_name}
                      onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border ${
                        formErrors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                      } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white`}
                      placeholder="parent@example.com"
                    />
                    {formErrors.email && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border ${
                        formErrors.phone_number ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                      } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white`}
                      placeholder="08012345678"
                    />
                    {formErrors.phone_number && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.phone_number}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Occupation
                      </label>
                      <input
                        type="text"
                        value={formData.occupation}
                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Employer
                      </label>
                      <input
                        type="text"
                        value={formData.employer}
                        onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className={`w-full px-4 py-2.5 rounded-xl border ${
                            formErrors.password ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                          } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white pr-10`}
                          placeholder="Min 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {formErrors.password && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.password}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirm_password}
                        onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                        className={`w-full px-4 py-2.5 rounded-xl border ${
                          formErrors.confirm_password ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                        } bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white`}
                      />
                      {formErrors.confirm_password && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.confirm_password}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Link Students *
                    </label>
                    <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-2">
                      {students.filter(s => !s.parent_id).length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          All students already have parents
                        </p>
                      ) : (
                        students.filter(s => !s.parent_id).map((student) => (
                          <label
                            key={student.id}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-all"
                          >
                            <input
                              type="checkbox"
                              checked={formData.student_ids.includes(student.id)}
                              onChange={() => toggleStudentSelection(student.id)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {student.first_name} {student.last_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {student.student_id} • {student.class_name || 'No Class'}
                              </p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                    {formErrors.student_ids && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.student_ids}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_guardian}
                        onChange={(e) => setFormData({ ...formData, is_guardian: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Is Guardian</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_primary_contact}
                        onChange={(e) => setFormData({ ...formData, is_primary_contact: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Primary Contact</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetForm();
                        setSelectedParent(null);
                      }}
                      className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loadingAction}
                      className="flex-1 px-8 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loadingAction ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Create Parent Account
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Parent Modal */}
      <AnimatePresence>
        {showEditModal && selectedParent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-green-500" />
                    Edit Parent
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedParent.first_name} {selectedParent.last_name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedParent(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={editFormData.first_name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.last_name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.middle_name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, middle_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editFormData.phone_number || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={editFormData.address || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Occupation
                      </label>
                      <input
                        type="text"
                        value={editFormData.occupation || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, occupation: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Employer
                      </label>
                      <input
                        type="text"
                        value={editFormData.employer || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, employer: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Link Students
                    </label>
                    <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-2">
                      {students.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No students available</p>
                      ) : (
                        students.map((student) => (
                          <label
                            key={student.id}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-all"
                          >
                            <input
                              type="checkbox"
                              checked={editFormData.student_ids?.includes(student.id) || false}
                              onChange={() => toggleStudentSelection(student.id, true)}
                              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {student.first_name} {student.last_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {student.student_id} • {student.class_name || 'No Class'}
                                {student.parent_id && student.parent_id !== selectedParent.id && (
                                  <span className="ml-2 text-yellow-600">(Linked to another parent)</span>
                                )}
                              </p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFormData.is_guardian || false}
                        onChange={(e) => setEditFormData({ ...editFormData, is_guardian: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Is Guardian</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFormData.is_primary_contact !== false}
                        onChange={(e) => setEditFormData({ ...editFormData, is_primary_contact: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Primary Contact</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedParent(null);
                      }}
                      className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updateParent}
                      disabled={loadingAction}
                      className="flex-1 px-8 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loadingAction ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Parent Modal */}
      <AnimatePresence>
        {showViewModal && selectedParent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-500" />
                    Parent Details
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedParent.first_name} {selectedParent.last_name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedParent(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    {selectedParent.first_name?.[0]}{selectedParent.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedParent.first_name} {selectedParent.last_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedParent.parent_id}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedParent.has_login 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : selectedParent.pending_auth
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-400'
                      }`}>
                        {selectedParent.has_login ? '✅ Has Login' : selectedParent.pending_auth ? '⏳ Pending Auth' : '❌ No Login'}
                      </span>
                      {selectedParent.is_guardian && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          Guardian
                        </span>
                      )}
                      {selectedParent.is_primary_contact && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Primary Contact
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {selectedParent.child_count || 0} Children
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1 break-all">
                      {selectedParent.email}
                      <button
                        onClick={() => copyToClipboard(selectedParent.email)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all flex-shrink-0"
                      >
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedParent.phone_number || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 col-span-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedParent.address || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Occupation</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedParent.occupation || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Employer</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedParent.employer || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Children List */}
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Children ({getChildrenForParent(selectedParent.id).length})
                  </p>
                  {getChildrenForParent(selectedParent.id).length === 0 ? (
                    <p className="text-sm text-gray-400">No children linked</p>
                  ) : (
                    <div className="space-y-1">
                      {getChildrenForParent(selectedParent.id).map((child) => (
                        <div key={child.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">
                            {child.first_name} {child.last_name}
                          </span>
                          <span className="text-xs text-gray-500">{child.student_id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      openEditModal(selectedParent);
                    }}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  {selectedParent.pending_auth && (
                    <button
                      onClick={() => {
                        setShowViewModal(false);
                        openRetryAuthModal(selectedParent);
                      }}
                      className="flex-1 px-4 py-2.5 bg-yellow-600 text-white rounded-xl font-medium hover:bg-yellow-700 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      Retry Auth
                    </button>
                  )}
                  {!selectedParent.has_login && !selectedParent.pending_auth && (
                    <button
                      onClick={() => {
                        setShowViewModal(false);
                        openLoginModal(selectedParent);
                      }}
                      className="flex-1 px-4 py-2.5 bg-yellow-600 text-white rounded-xl font-medium hover:bg-yellow-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      Create Login
                    </button>
                  )}
                  <button
                    onClick={() => deleteParent(selectedParent.id)}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Login Modal */}
      <AnimatePresence>
        {showLoginModal && selectedParent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-green-500" />
                    Create Parent Login
                  </h3>
                  <button
                    onClick={() => {
                      setShowLoginModal(false);
                      setLoginPassword('');
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Creating login for: <strong>{selectedParent.first_name} {selectedParent.last_name}</strong>
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Email: {selectedParent.email}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white pr-10"
                        placeholder="Min 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setShowLoginModal(false);
                        setLoginPassword('');
                      }}
                      className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createParentLogin}
                      disabled={loadingAction || loginPassword.length < 6}
                      className="flex-1 px-8 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loadingAction ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          Create Login
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Retry Auth Modal */}
      <AnimatePresence>
        {showRetryAuthModal && selectedParent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <RefreshCcw className="w-5 h-5 text-yellow-500" />
                    Retry Auth Creation
                  </h3>
                  <button
                    onClick={() => {
                      setShowRetryAuthModal(false);
                      setRetryPassword('');
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Creating login for: <strong>{selectedParent.first_name} {selectedParent.last_name}</strong>
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      Email: {selectedParent.email}
                    </p>
                    <p className="text-xs text-yellow-500 dark:text-yellow-500 mt-1">
                      ⚠️ This parent was created but auth failed. Retry to create their login.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showRetryPassword ? 'text' : 'password'}
                        value={retryPassword}
                        onChange={(e) => setRetryPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all dark:text-white pr-10"
                        placeholder="Min 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRetryPassword(!showRetryPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showRetryPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setShowRetryAuthModal(false);
                        setRetryPassword('');
                      }}
                      className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={retryAuthCreation}
                      disabled={loadingAction || retryPassword.length < 6}
                      className="flex-1 px-8 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loadingAction ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <RefreshCcw className="w-4 h-4" />
                          Create Auth
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ParentManagement;