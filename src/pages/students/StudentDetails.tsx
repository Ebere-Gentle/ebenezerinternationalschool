import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  BookOpen, 
  GraduationCap,
  CreditCard,
  Edit,
  Download,
  Printer,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  Building2,
  Globe,
  Heart,
  FileText,
  AlertTriangle,
  MessageSquare,
  School,
  Bus,
  Home,
  UserCheck,
  UserX,
  UserCog,
  QrCode,
  Barcode,
  File,
  PlusCircle,
  Shield,
  Award,
  Info,
  Clipboard,
  Stethoscope,
  Pill,
  HelpCircle,
  Smartphone,
  CalendarDays,
  Landmark,
  BadgeCheck,
  Notebook,
  UserRound,
  BusFront,
  Upload,
  X,
  Eye,
  Trash2,
  FileCheck,
  FileWarning,
  FolderOpen,
  CloudUpload,
  Check,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Save,
  ChevronDown,
  ChevronUp,
  FileJson,
  Table,
} from 'lucide-react';
import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface Student {
  id: string;
  student_id: string;
  admission_number: string;
  user_id: string | null;
  branch_id: string;
  session_id: string | null;
  parent_id: string | null;
  created_by: string | null;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  other_names: string | null;
  gender: string;
  passport_url: string | null;
  date_of_birth: string;
  place_of_birth: string | null;
  nationality: string;
  state_of_origin: string | null;
  lga: string | null;
  religion: string | null;
  blood_group: string | null;
  genotype: string | null;
  email: string | null;
  phone_number: string | null;
  home_address: string;
  residential_address: string | null;
  department: string | null;
  class_id: string | null;
  class_arm: string | null;
  house_id: string | null;
  club_id: string | null;
  admission_date: string;
  admission_status: string;
  current_status: string;
  previous_school: string | null;
  transfer_status: boolean;
  transportation_status: boolean;
  pickup_location: string | null;
  bus_route_id: string | null;
  doctor_name: string | null;
  hospital_name: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  special_needs: string | null;
  medical_info: any;
  guardian_info: any;
  emergency_contact: any;
  documents: any[];
  metadata: any;
  qr_code_data: string | null;
  barcode_data: string | null;
  created_at: string;
  updated_at: string;
  class_name?: string;
  class_code?: string;
  class_level?: string;
  branch_name?: string;
  house_name?: string;
  club_name?: string;
  bus_route_name?: string;
  parent_names?: string;
  created_by_name?: string;
  user_email?: string;
}

interface Document {
  id: string;
  student_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string | null;
  uploaded_at: string;
  status: 'pending' | 'approved' | 'rejected';
  metadata: any;
}

interface Payment {
  id: string;
  receipt_number: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  status: string;
  fee_name?: string;
  transaction_reference?: string;
}

interface House {
  id: string;
  name: string;
  color: string;
  motto: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  teacher?: string;
  score?: number;
  grade?: string;
}

const StudentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [houseDetails, setHouseDetails] = useState<{ id: string; name: string; color: string; motto: string } | null>(null);
  const [documentsEnabled, setDocumentsEnabled] = useState(true);
  const [allHouses, setAllHouses] = useState<House[]>([]);
  const [editingHouse, setEditingHouse] = useState(false);
  const [selectedHouseId, setSelectedHouseId] = useState<string>('');
  const [savingHouse, setSavingHouse] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicHistory, setAcademicHistory] = useState<any[]>([]);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);

  // Mobile tab state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    personal: true,
    contact: true,
    academic: true,
    medical: true,
    parent: true,
    guardian: true,
    emergency: true,
  });

  useEffect(() => {
    if (id) {
      fetchStudentDetails(id);
      fetchAllHouses();
      fetchAcademicData(id);
    }
  }, [id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDownloadDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchAllHouses = async () => {
    try {
      const { data, error } = await supabase
        .from('houses')
        .select('id, name, color, motto')
        .order('name');

      if (!error && data) {
        setAllHouses(data);
      }
    } catch (error) {
      console.error('Error fetching houses:', error);
    }
  };

  const fetchAcademicData = async (studentId: string) => {
    try {
      // Try to fetch student subjects/enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select(`
          *,
          subjects (
            id,
            name,
            code
          )
        `)
        .eq('student_id', studentId);

      if (!enrollError && enrollments) {
        const formattedSubjects = enrollments.map((e: any) => ({
          id: e.subjects?.id || e.subject_id,
          name: e.subjects?.name || 'Unknown Subject',
          code: e.subjects?.code || 'N/A',
          teacher: e.teacher_name || 'Not Assigned',
          score: e.score || null,
          grade: e.grade || null,
        }));
        setSubjects(formattedSubjects);
      }

      // Fetch academic history
      const { data: history, error: histError } = await supabase
        .from('academic_history')
        .select('*')
        .eq('student_id', studentId)
        .order('session_year', { ascending: false });

      if (!histError && history) {
        setAcademicHistory(history);
      }
    } catch (error) {
      console.error('Error fetching academic data:', error);
      // Set empty arrays to prevent undefined
      setSubjects([]);
      setAcademicHistory([]);
    }
  };

  const fetchStudentDetails = async (studentId: string) => {
    setLoading(true);
    try {
      console.log('🔍 Fetching student details for ID:', studentId);
      
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          classes!fk_students_class (
            id,
            name,
            code,
            level,
            class_code
          ),
          branches!fk_students_branch (
            id,
            school_name,
            branch_code,
            address
          ),
          houses!fk_students_house (
            id,
            name,
            color,
            motto
          ),
          clubs!fk_students_club (
            id,
            name
          ),
          bus_routes!fk_students_bus_route (
            id,
            name
          ),
          users!students_created_by_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', studentId)
        .single();

      if (error) throw error;

      if (data) {
        console.log('✅ Student data fetched:', data.first_name, data.last_name);

        if (data.houses) {
          setHouseDetails({
            id: data.houses.id,
            name: data.houses.name,
            color: data.houses.color || '#6B7280',
            motto: data.houses.motto || ''
          });
          setSelectedHouseId(data.houses.id);
        } else if (data.house_id) {
          const { data: houseData } = await supabase
            .from('houses')
            .select('id, name, color, motto')
            .eq('id', data.house_id)
            .single();
          
          if (houseData) {
            setHouseDetails({
              id: houseData.id,
              name: houseData.name,
              color: houseData.color || '#6B7280',
              motto: houseData.motto || ''
            });
            setSelectedHouseId(houseData.id);
          } else {
            setHouseDetails(null);
          }
        } else {
          setHouseDetails(null);
        }

        let parentNames = null;
        if (data.parent_id) {
          const { data: parentData, error: parentError } = await supabase
            .from('parents')
            .select('first_name, last_name, phone_number, email')
            .eq('id', data.parent_id)
            .single();

          if (!parentError && parentData) {
            parentNames = `${parentData.first_name} ${parentData.last_name}`;
          }
        }

        let guardianInfo = data.guardian_info;
        let emergencyContact = data.emergency_contact;

        if (typeof guardianInfo === 'string') {
          try { guardianInfo = JSON.parse(guardianInfo); } catch (e) { guardianInfo = {}; }
        }
        if (typeof emergencyContact === 'string') {
          try { emergencyContact = JSON.parse(emergencyContact); } catch (e) { emergencyContact = {}; }
        }

        const formattedStudent: Student = {
          ...data,
          class_name: data.classes?.name || 'Not Assigned',
          class_code: data.classes?.class_code || data.classes?.code || 'N/A',
          class_level: data.classes?.level || 'N/A',
          branch_name: data.branches?.school_name || 'N/A',
          house_name: data.houses?.name || null,
          club_name: data.clubs?.name || null,
          bus_route_name: data.bus_routes?.name || null,
          parent_names: parentNames || 'Not Assigned',
          created_by_name: data.users ? `${data.users.first_name} ${data.users.last_name}` : null,
          user_email: data.users?.email || null,
          guardian_info: guardianInfo,
          emergency_contact: emergencyContact,
        };

        setStudent(formattedStudent);

        await Promise.all([
          fetchDocuments(studentId),
          fetchPayments(studentId)
        ]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching student:', error);
      toast.error(error.message || 'Failed to fetch student details');
      navigate('/students');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // DOWNLOAD FUNCTIONS
  // ============================================
  
  const handleDownloadStudentData = () => {
    if (!student) return;
    
    try {
      // Create a clean copy of student data without circular references
      const cleanData = JSON.parse(JSON.stringify(student));
      
      // Create a blob with the data
      const blob = new Blob(
        [JSON.stringify(cleanData, null, 2)],
        { type: 'application/json' }
      );
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student_${student.first_name}_${student.last_name}_${student.admission_number || student.student_id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Student data downloaded successfully!');
      setShowDownloadDropdown(false);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download student data');
    }
  };

  const handleDownloadCSV = () => {
    if (!student) return;
    
    try {
      // Define the fields you want to export
      const fields = [
        'student_id', 'admission_number', 'first_name', 'last_name', 
        'gender', 'date_of_birth', 'email', 'phone_number', 
        'home_address', 'admission_status', 'current_status', 'class_name'
      ];
      
      // Create CSV header
      let csv = fields.join(',') + '\n';
      
      // Create CSV row
      const row = fields.map(field => {
        let value = student[field as keyof Student];
        // Handle null/undefined values
        if (value === null || value === undefined) return '';
        // Format date
        if (field === 'date_of_birth' && value) {
          value = dayjs(value).format('YYYY-MM-DD');
        }
        // Escape strings with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csv += row.join(',') + '\n';
      
      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student_${student.first_name}_${student.last_name}_${student.admission_number || student.student_id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('CSV downloaded successfully!');
      setShowDownloadDropdown(false);
    } catch (error) {
      console.error('CSV download error:', error);
      toast.error('Failed to download CSV');
    }
  };

  // ============================================
  // PRINT FUNCTION
  // ============================================
  
  const handlePrintStudent = () => {
    if (!student) return;
    
    // Create a printable version of the student data
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student Profile - ${student.first_name} ${student.last_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
          .section-title { font-weight: bold; color: #1a56db; margin-bottom: 10px; font-size: 16px; }
          .field { display: flex; padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
          .field-label { font-weight: 600; width: 180px; color: #4b5563; }
          .field-value { flex: 1; color: #1f2937; }
          .photo { max-width: 150px; border-radius: 8px; margin: 10px 0; }
          .badge { 
            display: inline-block; 
            padding: 2px 10px; 
            border-radius: 9999px; 
            font-size: 12px; 
            font-weight: 600;
          }
          .badge-active { background: #d1fae5; color: #065f46; }
          .badge-inactive { background: #f3f4f6; color: #374151; }
          .badge-transferred { background: #fef3c7; color: #92400e; }
          .badge-suspended { background: #fee2e2; color: #991b1b; }
          .badge-pending { background: #dbeafe; color: #1e40af; }
          .badge-admitted { background: #d1fae5; color: #065f46; }
          @media print {
            .no-print { display: none; }
            .section { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${student.passport_url ? `<img src="${student.passport_url}" class="photo" alt="Student Photo" />` : ''}
          <h1>${student.first_name} ${student.last_name}</h1>
          <p><strong>Admission Number:</strong> ${student.admission_number || 'N/A'}</p>
          <p><strong>Student ID:</strong> ${student.student_id || 'N/A'}</p>
          <p><strong>Branch:</strong> ${student.branch_name || 'N/A'}</p>
          <p>
            <span class="badge badge-${student.current_status}">${student.current_status}</span>
            <span class="badge badge-${student.admission_status}">${student.admission_status}</span>
          </p>
        </div>
        
        <div class="section">
          <div class="section-title">Personal Information</div>
          <div class="field"><span class="field-label">First Name:</span><span class="field-value">${student.first_name || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Middle Name:</span><span class="field-value">${student.middle_name || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Last Name:</span><span class="field-value">${student.last_name || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Other Names:</span><span class="field-value">${student.other_names || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Gender:</span><span class="field-value">${student.gender || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Date of Birth:</span><span class="field-value">${student.date_of_birth ? dayjs(student.date_of_birth).format('MMMM D, YYYY') : 'N/A'}</span></div>
          <div class="field"><span class="field-label">Place of Birth:</span><span class="field-value">${student.place_of_birth || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Nationality:</span><span class="field-value">${student.nationality || 'N/A'}</span></div>
          <div class="field"><span class="field-label">State of Origin:</span><span class="field-value">${student.state_of_origin || 'N/A'}</span></div>
          <div class="field"><span class="field-label">LGA:</span><span class="field-value">${student.lga || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Religion:</span><span class="field-value">${student.religion || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Blood Group:</span><span class="field-value">${student.blood_group || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Genotype:</span><span class="field-value">${student.genotype || 'N/A'}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">Contact Information</div>
          <div class="field"><span class="field-label">Email:</span><span class="field-value">${student.email || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Phone:</span><span class="field-value">${student.phone_number || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Home Address:</span><span class="field-value">${student.home_address || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Residential Address:</span><span class="field-value">${student.residential_address || 'N/A'}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">Academic Information</div>
          <div class="field"><span class="field-label">Class:</span><span class="field-value">${student.class_name || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Class Code:</span><span class="field-value">${student.class_code || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Class Level:</span><span class="field-value">${student.class_level || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Class Arm:</span><span class="field-value">${student.class_arm || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Department:</span><span class="field-value">${student.department || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Admission Date:</span><span class="field-value">${student.admission_date ? dayjs(student.admission_date).format('MMMM D, YYYY') : 'N/A'}</span></div>
          <div class="field"><span class="field-label">Admission Status:</span><span class="field-value"><span class="badge badge-${student.admission_status}">${student.admission_status}</span></span></div>
          <div class="field"><span class="field-label">Current Status:</span><span class="field-value"><span class="badge badge-${student.current_status}">${student.current_status}</span></span></div>
          <div class="field"><span class="field-label">Previous School:</span><span class="field-value">${student.previous_school || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Transfer Status:</span><span class="field-value">${student.transfer_status ? 'Yes' : 'No'}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">House & Club</div>
          <div class="field"><span class="field-label">House:</span><span class="field-value">${houseDetails?.name || student.house_name || 'N/A'}${houseDetails?.motto ? ` (${houseDetails.motto})` : ''}</span></div>
          <div class="field"><span class="field-label">Club:</span><span class="field-value">${student.club_name || 'N/A'}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">Parent / Guardian Information</div>
          <div class="field"><span class="field-label">Parent:</span><span class="field-value">${student.parent_names || 'Not Assigned'}</span></div>
          ${student.guardian_info?.father_name ? `<div class="field"><span class="field-label">Father:</span><span class="field-value">${student.guardian_info.father_name}${student.guardian_info.father_phone ? ` (${student.guardian_info.father_phone})` : ''}</span></div>` : ''}
          ${student.guardian_info?.mother_name ? `<div class="field"><span class="field-label">Mother:</span><span class="field-value">${student.guardian_info.mother_name}${student.guardian_info.mother_phone ? ` (${student.guardian_info.mother_phone})` : ''}</span></div>` : ''}
          ${student.guardian_info?.guardian_name ? `<div class="field"><span class="field-label">Guardian:</span><span class="field-value">${student.guardian_info.guardian_name}${student.guardian_info.guardian_phone ? ` (${student.guardian_info.guardian_phone})` : ''}</span></div>` : ''}
          ${student.guardian_info?.relationship ? `<div class="field"><span class="field-label">Relationship:</span><span class="field-value">${student.guardian_info.relationship}</span></div>` : ''}
        </div>
        
        ${student.emergency_contact?.name ? `
        <div class="section">
          <div class="section-title">Emergency Contact</div>
          <div class="field"><span class="field-label">Name:</span><span class="field-value">${student.emergency_contact.name}</span></div>
          <div class="field"><span class="field-label">Phone:</span><span class="field-value">${student.emergency_contact.phone || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Relationship:</span><span class="field-value">${student.emergency_contact.relationship || 'N/A'}</span></div>
        </div>
        ` : ''}
        
        <div class="section">
          <div class="section-title">Medical Information</div>
          <div class="field"><span class="field-label">Doctor's Name:</span><span class="field-value">${student.doctor_name || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Hospital:</span><span class="field-value">${student.hospital_name || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Allergies:</span><span class="field-value">${student.allergies || 'None'}</span></div>
          <div class="field"><span class="field-label">Medical Conditions:</span><span class="field-value">${student.medical_conditions || 'None'}</span></div>
          <div class="field"><span class="field-label">Special Needs:</span><span class="field-value">${student.special_needs || 'None'}</span></div>
        </div>
        
        ${student.transportation_status ? `
        <div class="section">
          <div class="section-title">Transportation</div>
          <div class="field"><span class="field-label">Transportation:</span><span class="field-value">Yes</span></div>
          <div class="field"><span class="field-label">Pickup Location:</span><span class="field-value">${student.pickup_location || 'N/A'}</span></div>
          <div class="field"><span class="field-label">Bus Route:</span><span class="field-value">${student.bus_route_name || 'N/A'}</span></div>
        </div>
        ` : `
        <div class="section">
          <div class="section-title">Transportation</div>
          <div class="field"><span class="field-label">Transportation:</span><span class="field-value">No</span></div>
        </div>
        `}
        
        ${student.student_bio ? `
        <div class="section">
          <div class="section-title">Bio</div>
          <p style="margin: 10px 0; line-height: 1.6;">${student.student_bio}</p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 40px; color: #6b7280; font-size: 12px;">
          Printed on ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      toast.error('Please allow popups to print');
    }
  };

  const handleSaveHouse = async () => {
    if (!student) return;
    setSavingHouse(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ 
          house_id: selectedHouseId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', student.id);

      if (error) throw error;

      toast.success('House updated successfully!');
      setEditingHouse(false);
      await fetchStudentDetails(student.id);
    } catch (error: any) {
      console.error('Error updating house:', error);
      toast.error(error.message || 'Failed to update house');
    } finally {
      setSavingHouse(false);
    }
  };

  const fetchDocuments = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('student_documents')
        .select('*')
        .eq('student_id', studentId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          console.log('student_documents table not found, disabling documents feature');
          setDocumentsEnabled(false);
          setDocuments([]);
          return;
        }
        throw error;
      }
      setDocuments(data || []);
      setDocumentsEnabled(true);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    }
  };

  const fetchPayments = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false })
        .limit(10);

      if (error) {
        console.log('Error fetching payments:', error);
        setPayments([]);
        return;
      }

      const paymentsWithFees = await Promise.all(
        (data || []).map(async (payment) => {
          let feeName = 'N/A';
          if (payment.fee_id) {
            const { data: feeData } = await supabase
              .from('fees')
              .select('name')
              .eq('id', payment.fee_id)
              .single();
            if (feeData) feeName = feeData.name;
          }
          return {
            ...payment,
            fee_name: feeName,
          };
        })
      );

      setPayments(paymentsWithFees);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const uploadDocument = async () => {
    if (!selectedFile || !documentType || !student) {
      toast.error('Please select a file and document type');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${student.id}/${Date.now()}-${selectedFile.name}`;
      const filePath = `student-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        if (uploadError.message?.includes('bucket')) {
          toast.error('Storage bucket not configured. Please contact admin.');
        } else {
          toast.error(uploadError.message || 'Failed to upload file');
        }
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('student-documents')
        .getPublicUrl(filePath);

      const { data: docData, error: docError } = await supabase
        .from('student_documents')
        .insert([{
          student_id: student.id,
          document_type: documentType,
          file_name: selectedFile.name,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          uploaded_by: user?.id || null,
          uploaded_at: new Date().toISOString(),
          status: 'pending',
          metadata: {
            description: documentDescription || '',
            uploaded_by_name: user?.email || 'System',
            uploaded_by_id: user?.id || null
          }
        }])
        .select()
        .single();

      if (docError) {
        console.error('Database insert error:', docError);
        await supabase.storage.from('student-documents').remove([filePath]);
        toast.error('Failed to save document record');
        setUploading(false);
        return;
      }

      toast.success('Document uploaded successfully!');
      setShowUploadModal(false);
      setSelectedFile(null);
      setDocumentType('');
      setDocumentDescription('');
      setUploadProgress(0);
      
      await fetchDocuments(student.id);
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const approveDocument = async (docId: string) => {
    setApproving(true);
    try {
      const { error } = await supabase
        .from('student_documents')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString(),
          metadata: {
            ...documents.find(d => d.id === docId)?.metadata,
            approved_by: user?.id,
            approved_by_name: user?.email || 'Admin',
            approved_at: new Date().toISOString()
          }
        })
        .eq('id', docId);

      if (error) throw error;

      toast.success('Document approved successfully!');
      await fetchDocuments(student!.id);
    } catch (error: any) {
      console.error('Error approving document:', error);
      toast.error(error.message || 'Failed to approve document');
    } finally {
      setApproving(false);
    }
  };

  const rejectDocument = async (docId: string) => {
    setApproving(true);
    try {
      const { error } = await supabase
        .from('student_documents')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString(),
          metadata: {
            ...documents.find(d => d.id === docId)?.metadata,
            rejected_by: user?.id,
            rejected_by_name: user?.email || 'Admin',
            rejected_at: new Date().toISOString()
          }
        })
        .eq('id', docId);

      if (error) throw error;

      toast.success('Document rejected');
      await fetchDocuments(student!.id);
    } catch (error: any) {
      console.error('Error rejecting document:', error);
      toast.error(error.message || 'Failed to reject document');
    } finally {
      setApproving(false);
    }
  };

  const deleteDocument = async (docId: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    setDeleting(true);
    try {
      const { error: storageError } = await supabase.storage
        .from('student-documents')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      const { error: dbError } = await supabase
        .from('student_documents')
        .delete()
        .eq('id', docId);

      if (dbError) throw dbError;

      toast.success('Document deleted successfully');
      await fetchDocuments(student!.id);
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error(error.message || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      transferred: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      admitted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      withdrawn: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return styles[status] || styles.active;
  };

  const getDocumentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return styles[status] || styles.pending;
  };

  const getDocumentTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      'birth_certificate': FileCheck,
      'nin': Shield,
      'medical_cert': Stethoscope,
      'passport': User,
      'transcript': BookOpen,
      'transfer_letter': FileText,
      'report_card': Clipboard,
      'other': File,
    };
    const Icon = icons[type] || File;
    return <Icon className="w-5 h-5" />;
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'birth_certificate': 'Birth Certificate',
      'nin': 'NIN',
      'medical_cert': 'Medical Certificate',
      'passport': 'Passport',
      'transcript': 'Transcript',
      'transfer_letter': 'Transfer Letter',
      'report_card': 'Report Card',
      'other': 'Other Document',
    };
    return labels[type] || type;
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return styles[status] || styles.pending;
  };

  const isAdminOrDirector = () => {
    const userRole = user?.role || 'student';
    return userRole === 'admin' || userRole === 'director';
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Mobile tab labels
  const mobileTabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'academic', label: 'Academic', icon: BookOpen },
    { id: 'parents', label: 'Parents', icon: Users },
    { id: 'guardian', label: 'Guardian', icon: Shield },
    { id: 'medical', label: 'Medical', icon: Stethoscope },
    { id: 'transport', label: 'Transport', icon: Bus },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    ...(documentsEnabled ? [{ id: 'documents', label: 'Documents', icon: FileText }] : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12 px-4">
        <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Student not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">The student you're looking for doesn't exist.</p>
        <Link to="/students" className="inline-block mt-4 text-blue-600 hover:text-blue-700">
          Back to Students
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-4 sm:space-y-6 px-2 sm:px-0 pb-20 sm:pb-0"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/students"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
              Student Profile
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {student.first_name} {student.last_name} • {student.admission_number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Download Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDownloadDropdown(!showDownloadDropdown);
              }}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline">Export</span>
              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            
            {showDownloadDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-10">
                <button
                  onClick={handleDownloadStudentData}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  <FileJson className="w-4 h-4" />
                  Download JSON
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  <Table className="w-4 h-4" />
                  Download CSV
                </button>
              </div>
            )}
          </div>
          
          {/* Print Button */}
          <button 
            onClick={handlePrintStudent}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden xs:inline">Print</span>
          </button>
          
          {/* Edit Button */}
          <Link
            to={`/students/edit/${student.id}`}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25"
          >
            <Edit className="w-4 h-4" />
            <span className="hidden xs:inline">Edit Profile</span>
            <span className="xs:hidden">Edit</span>
          </Link>
        </div>
      </div>

      {/* Profile Card - Mobile Optimized */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold flex-shrink-0">
                {student.passport_url ? (
                  <img src={student.passport_url} alt={student.first_name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  `${student.first_name[0]}${student.last_name[0]}`
                )}
              </div>
              <div className="absolute -bottom-1 -right-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(student.current_status)}`}>
                  {student.current_status}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {student.first_name} {student.middle_name || ''} {student.last_name}
              </h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 mt-2">
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Admission:</span> {student.admission_number}
                </span>
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Class:</span> {student.class_name}
                </span>
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Branch:</span> {student.branch_name}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 mt-2">
                {student.email && (
                  <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate max-w-[150px] sm:max-w-none">
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </span>
                )}
                {student.phone_number && (
                  <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                    {student.phone_number}
                  </span>
                )}
                
                {/* House Display with Edit - Mobile Optimized */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {editingHouse ? (
                    <div className="flex items-center gap-1 sm:gap-2">
                      <select
                        value={selectedHouseId}
                        onChange={(e) => setSelectedHouseId(e.target.value)}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 max-w-[100px] sm:max-w-none"
                      >
                        <option value="">No House</option>
                        {allHouses.map((house) => (
                          <option key={house.id} value={house.id}>
                            {house.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleSaveHouse}
                        disabled={savingHouse}
                        className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                      >
                        {savingHouse ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <Save className="w-3 h-3 sm:w-4 sm:h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingHouse(false);
                          setSelectedHouseId(houseDetails?.id || '');
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  ) : houseDetails ? (
                    <span 
                      className="flex items-center gap-1 text-xs sm:text-sm font-medium px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: houseDetails.color ? `${houseDetails.color}20` : '#6B728020',
                        color: houseDetails.color || '#6B7280'
                      }}
                    >
                      <Home className="w-3 h-3" />
                      {houseDetails.name}
                      {isAdminOrDirector() && (
                        <button
                          onClick={() => {
                            setEditingHouse(true);
                            setSelectedHouseId(houseDetails.id);
                          }}
                          className="ml-0.5 sm:ml-1 p-0.5 hover:bg-white/20 rounded transition-all"
                        >
                          <Pencil className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </button>
                      )}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs sm:text-sm font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      <Home className="w-3 h-3" />
                      No House
                      {isAdminOrDirector() && (
                        <button
                          onClick={() => {
                            setEditingHouse(true);
                            setSelectedHouseId('');
                          }}
                          className="ml-0.5 sm:ml-1 p-0.5 hover:bg-white/20 rounded transition-all"
                        >
                          <Pencil className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </button>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tabs - Horizontal Scroll */}
      <div className="sm:hidden border-b border-gray-200 dark:border-gray-700 -mx-2 px-2">
        <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden sm:block border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6 overflow-x-auto">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium capitalize transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content - Mobile Optimized */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Personal Information - Mobile Collapsible */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('personal')}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all"
                >
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    Personal Information
                  </h3>
                  {expandedSections.personal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.personal && (
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Full Name</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white text-right">
                        {student.first_name} {student.middle_name || ''} {student.last_name}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Gender</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white capitalize">{student.gender || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Date of Birth</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                        {student.date_of_birth ? dayjs(student.date_of_birth).format('MMMM D, YYYY') : 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Nationality</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{student.nationality || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">State of Origin</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{student.state_of_origin || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Blood Group</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{student.blood_group || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Genotype</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{student.genotype || 'N/A'}</dd>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Information - Mobile Collapsible */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('contact')}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all"
                >
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    Contact & Academic
                  </h3>
                  {expandedSections.contact ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.contact && (
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Email</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white text-right break-all max-w-[60%]">{student.email || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Phone</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{student.phone_number || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Class</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{student.class_name}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Class Arm</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{student.class_arm || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Department</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white capitalize">{student.department || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Admission Date</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                        {student.admission_date ? dayjs(student.admission_date).format('MMMM D, YYYY') : 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Admission Status</dt>
                      <dd className="text-xs sm:text-sm font-medium">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(student.admission_status)}`}>
                          {student.admission_status}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Current Status</dt>
                      <dd className="text-xs sm:text-sm font-medium">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(student.current_status)}`}>
                          {student.current_status}
                        </span>
                      </dd>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Academic Tab - Now with Content */}
          {activeTab === 'academic' && (
            <div className="space-y-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('academic')}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all"
                >
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    Academic Information
                  </h3>
                  {expandedSections.academic ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.academic && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Class</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{student.class_name}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Class Code</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{student.class_code || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Class Level</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{student.class_level || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Class Arm</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{student.class_arm || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Department</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{student.department || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Previous School</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{student.previous_school || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Subjects */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Enrolled Subjects</h4>
                      {subjects.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No subjects enrolled</p>
                      ) : (
                        <div className="space-y-2">
                          {subjects.map((subject) => (
                            <div key={subject.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{subject.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Code: {subject.code}</p>
                              </div>
                              <div className="text-right">
                                {subject.teacher && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{subject.teacher}</p>
                                )}
                                {subject.score !== null && (
                                  <span className={`text-sm font-medium ${
                                    subject.score >= 70 ? 'text-green-600' :
                                    subject.score >= 50 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {subject.score}% {subject.grade && `(${subject.grade})`}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Academic History */}
                    {academicHistory.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Academic History</h4>
                        <div className="space-y-2">
                          {academicHistory.map((record, index) => (
                            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {record.session_year || 'N/A'} - {record.term || 'N/A'}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Class: {record.class_name || 'N/A'} • GPA: {record.gpa || 'N/A'}
                                  </p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  record.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {record.status || 'Pending'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parents Tab - Now with Content */}
          {activeTab === 'parents' && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('parent')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all"
              >
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  Parent Information
                </h3>
                {expandedSections.parent ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.parent && (
                <div className="p-4 space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="w-5 h-5 text-purple-600" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Parent/Guardian</p>
                    </div>
                    <div className="space-y-2 ml-8">
                      <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600">
                        <dt className="text-xs text-gray-500 dark:text-gray-400">Name</dt>
                        <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{student.parent_names || 'Not Assigned'}</dd>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600">
                        <dt className="text-xs text-gray-500 dark:text-gray-400">Relationship</dt>
                        <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          {student.guardian_info?.relationship || 'Parent'}
                        </dd>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600">
                        <dt className="text-xs text-gray-500 dark:text-gray-400">Phone</dt>
                        <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          {student.guardian_info?.phone || student.emergency_contact?.phone || 'N/A'}
                        </dd>
                      </div>
                      <div className="flex justify-between py-1">
                        <dt className="text-xs text-gray-500 dark:text-gray-400">Email</dt>
                        <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-all max-w-[60%] text-right">
                          {student.guardian_info?.email || student.emergency_contact?.email || 'N/A'}
                        </dd>
                      </div>
                    </div>
                  </div>

                  {student.guardian_info && Object.keys(student.guardian_info).length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">Additional Guardian Info</h4>
                      <div className="space-y-1 text-xs sm:text-sm text-blue-600 dark:text-blue-300">
                        {student.guardian_info.occupation && (
                          <p>Occupation: {student.guardian_info.occupation}</p>
                        )}
                        {student.guardian_info.address && (
                          <p>Address: {student.guardian_info.address}</p>
                        )}
                        {student.guardian_info.office_address && (
                          <p>Office: {student.guardian_info.office_address}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Guardian Tab - Now with Content */}
          {activeTab === 'guardian' && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('guardian')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all"
              >
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                  Guardian & Emergency Contact
                </h3>
                {expandedSections.guardian ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.guardian && (
                <div className="p-4 space-y-4">
                  {/* Emergency Contact */}
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                    <h4 className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4" />
                      Emergency Contact
                    </h4>
                    {student.emergency_contact && Object.keys(student.emergency_contact).length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex justify-between py-1 border-b border-red-200 dark:border-red-800">
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Name</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            {student.emergency_contact.name || 'N/A'}
                          </dd>
                        </div>
                        <div className="flex justify-between py-1 border-b border-red-200 dark:border-red-800">
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Relationship</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            {student.emergency_contact.relationship || 'N/A'}
                          </dd>
                        </div>
                        <div className="flex justify-between py-1 border-b border-red-200 dark:border-red-800">
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Phone</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            {student.emergency_contact.phone || 'N/A'}
                          </dd>
                        </div>
                        <div className="flex justify-between py-1">
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Address</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white text-right max-w-[60%]">
                            {student.emergency_contact.address || 'N/A'}
                          </dd>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No emergency contact information available</p>
                    )}
                  </div>

                  {/* Guardian Info - if different from parent */}
                  {student.guardian_info && Object.keys(student.guardian_info).length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-3">
                        <User className="w-4 h-4" />
                        Guardian Details
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between py-1 border-b border-blue-200 dark:border-blue-800">
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Name</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            {student.guardian_info.name || 'N/A'}
                          </dd>
                        </div>
                        <div className="flex justify-between py-1 border-b border-blue-200 dark:border-blue-800">
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Relationship</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            {student.guardian_info.relationship || 'N/A'}
                          </dd>
                        </div>
                        <div className="flex justify-between py-1 border-b border-blue-200 dark:border-blue-800">
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Phone</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            {student.guardian_info.phone || 'N/A'}
                          </dd>
                        </div>
                        <div className="flex justify-between py-1">
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Email</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-all max-w-[60%] text-right">
                            {student.guardian_info.email || 'N/A'}
                          </dd>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Medical Tab - Now with Content */}
          {activeTab === 'medical' && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('medical')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all"
              >
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  Medical Information
                </h3>
                {expandedSections.medical ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.medical && (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Blood Group</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{student.blood_group || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Genotype</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{student.genotype || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Doctor's Name</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{student.doctor_name || 'N/A'}</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Hospital</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{student.hospital_name || 'N/A'}</p>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                    <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Allergies
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{student.allergies || 'No known allergies'}</p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-2">
                      <Pill className="w-4 h-4" />
                      Medical Conditions
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{student.medical_conditions || 'No known medical conditions'}</p>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <h4 className="text-sm font-medium text-purple-700 dark:text-purple-400 flex items-center gap-2 mb-2">
                      <HelpCircle className="w-4 h-4" />
                      Special Needs
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{student.special_needs || 'No special needs identified'}</p>
                  </div>

                  {student.medical_info && Object.keys(student.medical_info).length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <h4 className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4" />
                        Additional Medical Info
                      </h4>
                      <div className="space-y-1 text-xs sm:text-sm text-green-600 dark:text-green-300">
                        {Object.entries(student.medical_info).map(([key, value]) => (
                          <p key={key}><span className="capitalize">{key.replace(/_/g, ' ')}</span>: {String(value)}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Transport Tab */}
          {activeTab === 'transport' && (
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Bus className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                Transportation Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2 text-sm">
                    <BusFront className="w-4 h-4 text-blue-500" />
                    Transport Information
                  </h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Transportation</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                        {student.transportation_status ? 
                          <span className="text-green-600 dark:text-green-400">Yes</span> : 
                          <span className="text-red-600 dark:text-red-400">No</span>
                        }
                      </dd>
                    </div>
                    {student.transportation_status && (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Pickup Location</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white text-right max-w-[60%]">{student.pickup_location || 'N/A'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Bus Route</dt>
                          <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{student.bus_route_name || 'N/A'}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-green-500" />
                    House & Club
                  </h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-500 dark:text-gray-400">House</dt>
                      <dd className="text-xs sm:text-sm font-medium">
                        {houseDetails ? (
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: houseDetails.color ? `${houseDetails.color}20` : '#6B728020',
                              color: houseDetails.color || '#6B7280'
                            }}
                          >
                            {houseDetails.name}
                            {houseDetails.motto && ` - ${houseDetails.motto}`}
                          </span>
                        ) : student.house_name ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            {student.house_name}
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">N/A</span>
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Club</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{student.club_name || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                Payment History
              </h3>
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No payment records found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{payment.receipt_number}</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{payment.fee_name}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {dayjs(payment.payment_date).format('MMM D, YYYY')}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          ₦{payment.amount_paid.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {documentsEnabled && activeTab === 'documents' && (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Student Documents
                </h3>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {isAdminOrDirector() && documents.filter(d => d.status === 'pending').length > 0 && (
                    <button 
                      onClick={async () => {
                        const pendingDocs = documents.filter(d => d.status === 'pending');
                        if (pendingDocs.length === 0) {
                          toast.info('No pending documents to approve');
                          return;
                        }
                        try {
                          await Promise.all(pendingDocs.map(d => approveDocument(d.id)));
                          toast.success(`Approved ${pendingDocs.length} documents`);
                          await fetchDocuments(student!.id);
                        } catch (error) {
                          toast.error('Failed to approve documents');
                        }
                      }}
                      className="flex items-center gap-1 sm:gap-2 px-3 py-2 bg-green-600 text-white rounded-xl text-xs sm:text-sm font-medium hover:bg-green-700 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      Approve All ({documents.filter(d => d.status === 'pending').length})
                    </button>
                  )}
                  <button 
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-1 sm:gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-xs sm:text-sm font-medium hover:opacity-90 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>
                </div>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No documents uploaded</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Upload documents like NIN, Birth Certificate, Medical records, etc.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className={`bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border ${
                      doc.status === 'pending' ? 'border-yellow-200 dark:border-yellow-800' :
                      doc.status === 'approved' ? 'border-green-200 dark:border-green-800' :
                      'border-red-200 dark:border-red-800'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          doc.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30' :
                          doc.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30' :
                          'bg-yellow-100 dark:bg-yellow-900/30'
                        }`}>
                          {getDocumentTypeIcon(doc.document_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {doc.file_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {getDocumentTypeLabel(doc.document_type)}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {(doc.file_size / 1024 / 1024).toFixed(2)} MB • {dayjs(doc.uploaded_at).format('MMM D, YYYY')}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDocumentStatusBadge(doc.status)}`}>
                              {doc.status === 'pending' ? '⏳ Pending' :
                               doc.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                            </span>
                            <div className="flex items-center gap-1">
                              {isAdminOrDirector() && doc.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => approveDocument(doc.id)}
                                    disabled={approving}
                                    className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-all"
                                    title="Approve Document"
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5 text-green-500" />
                                  </button>
                                  <button
                                    onClick={() => rejectDocument(doc.id)}
                                    disabled={approving}
                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                                    title="Reject Document"
                                  >
                                    <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                                  </button>
                                </>
                              )}
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                                title="View Document"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-500" />
                              </a>
                              <a
                                href={doc.file_url}
                                download={doc.file_name}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                                title="Download Document"
                              >
                                <Download className="w-3.5 h-3.5 text-green-500" />
                              </a>
                              {isAdminOrDirector() && (
                                <button
                                  onClick={() => deleteDocument(doc.id, doc.file_path)}
                                  disabled={deleting}
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                                  title="Delete Document"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {doc.metadata?.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 truncate">
                          {doc.metadata.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Document Modal - Mobile Optimized */}
      <AnimatePresence>
        {showUploadModal && documentsEnabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowUploadModal(false);
                setSelectedFile(null);
                setDocumentType('');
                setDocumentDescription('');
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <CloudUpload className="w-5 h-5 text-blue-600" />
                    Upload Document
                  </h3>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFile(null);
                      setDocumentType('');
                      setDocumentDescription('');
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Document Type *
                    </label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm"
                    >
                      <option value="">Select Document Type</option>
                      <option value="birth_certificate">Birth Certificate</option>
                      <option value="nin">National Identification Number (NIN)</option>
                      <option value="medical_cert">Medical Certificate</option>
                      <option value="passport">Passport Photo</option>
                      <option value="transcript">Transcript</option>
                      <option value="transfer_letter">Transfer Letter</option>
                      <option value="report_card">Report Card</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Select File *
                    </label>
                    <div 
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-500 transition-all cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {selectedFile ? (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                          <FileCheck className="w-8 h-8 text-green-500" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                            }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">PDF, JPG, PNG (Max 10MB)</p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Description (Optional)
                    </label>
                    <textarea
                      value={documentDescription}
                      onChange={(e) => setDocumentDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white text-sm"
                      placeholder="Add a description for this document..."
                    />
                  </div>

                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
                        <span className="text-gray-600 dark:text-gray-400">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setShowUploadModal(false);
                        setSelectedFile(null);
                        setDocumentType('');
                        setDocumentDescription('');
                      }}
                      className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={uploadDocument}
                      disabled={!selectedFile || !documentType || uploading}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StudentDetails;