// src/pages/adminAsst/components/StudentProfileModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  X, User, Mail, Phone, MapPin, Calendar, BookOpen, Users, 
  Heart, Bus, Home, GraduationCap, UserCheck, AlertCircle, 
  Stethoscope, BusFront, Shield, HandHelping, Clock, 
  CheckCircle, XCircle, AlertTriangle, Info, Package,
  CalendarDays, Filter, ChevronDown, ChevronUp, Search,
  Layers, FolderTree, Tag, List, Grid, User as UserIcon,
  CreditCard, Wallet, Receipt, Award, Star, Zap, Coffee,
  Download, Printer, FileText, FileCheck, Share2, Eye,
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  UserRound, Briefcase, Building2, Globe, Flag,
  Award as AwardIcon, BadgeCheck, ClipboardCheck,
  School, BookMarked, UsersRound, CalendarRange,
  Loader2, Building, School as SchoolIcon,
  PenTool, Signature, Image as ImageIcon
} from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../../../../config/supabase/client';
import schoolLogo from '../../../../assets/school-logo.png';

interface StudentProfileModalProps {
  open: boolean;
  onClose: () => void;
  student: any;
  collections: any[];
}

const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  open,
  onClose,
  student,
  collections,
}) => {
  const [filterTerm, setFilterTerm] = useState<string>('all');
  const [filterSession, setFilterSession] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [studentCollections, setStudentCollections] = useState<any[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch full student details from students table when modal opens
  useEffect(() => {
    if (open && student) {
      fetchStudentData();
      fetchSchoolInfo();
      fetchStudentCollections();
    }
  }, [open, student]);

  const fetchSchoolInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('school_info')
        .select('*')
        .limit(1)
        .single();

      if (!error && data) {
        setSchoolInfo(data);
      }
    } catch (error) {
      console.error('Error fetching school info:', error);
    }
  };

  const fetchStudentCollections = async () => {
    try {
      const studentId = student?.id || student?.student_id;
      if (!studentId) return;

      // If collections are passed as prop, use them
      if (collections && collections.length > 0) {
        const filtered = collections.filter((c: any) => 
          c.student_id === studentId || c.student_id === student?.id
        );
        setStudentCollections(filtered);
        return;
      }

      // Otherwise fetch from database
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('student_id', studentId)
        .order('collection_date', { ascending: false });

      if (!error && data) {
        setStudentCollections(data);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const fetchStudentData = async () => {
    setLoadingStudent(true);
    try {
      const studentId = student?.id || student?.student_id;
      
      if (!studentId) {
        console.error('No student ID found');
        setLoadingStudent(false);
        return;
      }

      // First try to get from students table
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          classes:class_id (
            id,
            name,
            code,
            level
          )
        `)
        .eq('id', studentId)
        .single();

      if (error) {
        console.error('Error fetching student:', error);
        // Use the passed student data as fallback
        setStudentData({
          ...student,
          class_name: student.class_name || student.current_class || 'Not Assigned',
          full_name: student.full_name || student.student_name || 
            `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'N/A',
        });
      } else if (data) {
        // Get class name from the joined data or from the student object
        const className = data.classes?.name || data.current_class || student.class_name || 'Not Assigned';
        const fullName = `${data.first_name || ''} ${data.middle_name || ''} ${data.last_name || ''}`.trim() || 
                         student.full_name || student.student_name || 'N/A';
        setStudentData({
          ...data,
          class_name: className,
          class_code: data.classes?.code || 'N/A',
          full_name: fullName,
        });
      } else {
        setStudentData({
          ...student,
          full_name: student.full_name || student.student_name || 
            `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'N/A',
        });
      }
    } catch (error) {
      console.error('Error in fetchStudentData:', error);
      setStudentData({
        ...student,
        full_name: student.full_name || student.student_name || 
          `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'N/A',
      });
    } finally {
      setLoadingStudent(false);
    }
  };

  if (!open || !student) return null;

  const currentStudent = studentData || student;

  // Use the fetched collections or the passed collections
  const displayCollections = studentCollections.length > 0 ? studentCollections : (collections || []);

  const fullName = currentStudent.full_name || currentStudent.student_name ||
    `${currentStudent.first_name || ''} ${currentStudent.middle_name || ''} ${currentStudent.last_name || ''}`.trim() || 
    'N/A';

  const uniqueTerms = [...new Set(displayCollections.map((c: any) => c.term_name).filter(Boolean))];
  const uniqueSessions = [...new Set(displayCollections.map((c: any) => c.session_name).filter(Boolean))];

  const filteredCollections = displayCollections.filter((c: any) => {
    const matchesTerm = filterTerm === 'all' || c.term_name === filterTerm;
    const matchesSession = filterSession === 'all' || c.session_name === filterSession;
    const matchesSearch = c.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.student_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTerm && matchesSession && matchesSearch;
  });

  const totalItems = filteredCollections.reduce((sum, c) => sum + (c.quantity || 0), 0);
  const uniqueItems = [...new Set(filteredCollections.map((c: any) => c.item_name))];

  const toggleExpand = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      graduated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    return statusMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return dayjs(date).format('MMM D, YYYY');
  };

  if (loadingStudent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading student details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl"
      >
        {/* School Header */}
        <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 p-4 sm:p-6 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {schoolLogo ? (
                <img src={schoolLogo} alt="School Logo" className="w-12 h-12 rounded-lg object-cover bg-white/20 p-1" />
              ) : (
                <SchoolIcon className="w-12 h-12" />
              )}
              <div>
                <h2 className="text-xl font-bold">{schoolInfo?.school_name || 'Ebenezer International School'}</h2>
                <p className="text-sm opacity-80">{schoolInfo?.address || 'Owo, Ondo State, Nigeria'}</p>
                <p className="text-xs opacity-70">{schoolInfo?.phone_number || '+234 800 000 0000'} | {schoolInfo?.email || 'info@ebenezer.edu.ng'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setIsGeneratingPDF(true);
                  toast.loading('Generating PDF...', { id: 'pdf-generation' });
                  try {
                    const schoolData = {
                      name: schoolInfo?.school_name || 'Ebenezer International School',
                      email: schoolInfo?.email || 'info@ebenezer.edu.ng',
                      phone: schoolInfo?.phone_number || '+234 800 000 0000',
                      address: schoolInfo?.address || 'Owo, Ondo State, Nigeria',
                      motto: schoolInfo?.motto || 'Excellence through Knowledge'
                    };

                    let logoData = '';
                    try {
                      const response = await fetch(schoolLogo);
                      const blob = await response.blob();
                      logoData = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                      });
                    } catch (e) {}

                    const pdfDiv = document.createElement('div');
                    pdfDiv.style.width = '800px';
                    pdfDiv.style.padding = '40px';
                    pdfDiv.style.fontFamily = 'Times New Roman, Georgia, serif';
                    pdfDiv.style.background = '#ffffff';
                    pdfDiv.style.borderRadius = '12px';
                    pdfDiv.style.position = 'absolute';
                    pdfDiv.style.left = '-9999px';
                    pdfDiv.style.top = '0';
                    pdfDiv.style.zIndex = '9999';

                    const collectionsHtml = filteredCollections.map((c: any) => `
                      <tr>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e5e5;">${c.item_name}</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e5e5; text-align: center;">${c.quantity}</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e5e5;">${c.class_at_collection || 'N/A'}</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e5e5;">${dayjs(c.collection_date).format('MMM D, YYYY')}</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e5e5;">${c.term_name || 'N/A'}</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e5e5; text-align: center;">${c.signature_url ? '✓' : '—'}</td>
                      </tr>
                    `).join('');

                    pdfDiv.innerHTML = `
                      <div style="text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 20px;">
                        ${logoData ? `<img src="${logoData}" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 8px;" />` : ''}
                        <div style="font-size: 24px; font-weight: 700; letter-spacing: 1px; color: #1a1a1a;">${schoolData.name}</div>
                        <div style="font-style: italic; color: #6b7280; font-size: 13px; margin-top: 2px;">"${schoolData.motto}"</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                          ${schoolData.address} <br/>
                          ${schoolData.phone} | ${schoolData.email}
                        </div>
                      </div>

                      <div style="text-align: center; margin: 16px 0 20px 0;">
                        <h2 style="font-size: 20px; color: #1a1a1a; font-weight: 700;">Student Collections Report</h2>
                        <div style="font-size: 16px; font-weight: 600; color: #1a1a1a;">${fullName || 'Student'}</div>
                        <div style="font-size: 12px; color: #6b7280;">${currentStudent.student_id || currentStudent.id || ''}</div>
                        <div style="font-size: 12px; color: #6b7280;">Class: ${currentStudent.class_name || currentStudent.current_class || 'Not Assigned'}</div>
                      </div>

                      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e5e5; font-size: 11px;">
                        <div><strong>Student ID:</strong> ${currentStudent.student_id || 'N/A'}</div>
                        <div><strong>Gender:</strong> ${currentStudent.gender || 'N/A'}</div>
                        <div><strong>Status:</strong> ${currentStudent.status || currentStudent.current_status || 'Active'}</div>
                        <div><strong>Total Items:</strong> ${totalItems}</div>
                      </div>

                      ${filteredCollections.length > 0 ? `
                        <h4 style="font-size: 14px; font-weight: 700; margin: 12px 0 8px; color: #1a1a1a;">Collection History</h4>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                          <thead>
                            <tr style="background: #f1f5f9;">
                              <th style="padding: 6px 8px; text-align: left; border-bottom: 2px solid #1a1a1a;">Item</th>
                              <th style="padding: 6px 8px; text-align: center; border-bottom: 2px solid #1a1a1a;">Qty</th>
                              <th style="padding: 6px 8px; text-align: left; border-bottom: 2px solid #1a1a1a;">Class</th>
                              <th style="padding: 6px 8px; text-align: left; border-bottom: 2px solid #1a1a1a;">Date</th>
                              <th style="padding: 6px 8px; text-align: left; border-bottom: 2px solid #1a1a1a;">Term</th>
                              <th style="padding: 6px 8px; text-align: center; border-bottom: 2px solid #1a1a1a;">Signed</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${collectionsHtml}
                          </tbody>
                        </table>
                      ` : `
                        <div style="text-align: center; padding: 20px; color: #6b7280;">No collections recorded for this student</div>
                      `}

                      <div style="margin-top: 20px; padding-top: 16px; border-top: 2px solid #1a1a1a; text-align: center; color: #6b7280; font-size: 10px;">
                        <p>This is a computer-generated report. No signature required.</p>
                        <p style="margin-top: 2px;">© ${dayjs().year()} ${schoolData.name}. All rights reserved.</p>
                        <p style="margin-top: 4px;">Generated on ${dayjs().format('MMMM D, YYYY h:mm:ss A')}</p>
                      </div>
                    `;

                    document.body.appendChild(pdfDiv);
                    const canvas = await html2canvas(pdfDiv, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', allowTaint: true });
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                    pdf.save(`student-collections-${currentStudent.student_id || currentStudent.id || 'student'}.pdf`);
                    toast.success('PDF downloaded successfully!', { id: 'pdf-generation' });
                    document.body.removeChild(pdfDiv);
                  } catch (error) {
                    console.error('PDF generation error:', error);
                    toast.error('Failed to generate PDF. Please try again.', { id: 'pdf-generation' });
                  } finally {
                    setIsGeneratingPDF(false);
                  }
                }}
                disabled={isGeneratingPDF}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all flex items-center gap-1.5 text-sm"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </>
                )}
              </button>
              <button
                onClick={() => window.print()}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all flex items-center gap-1.5 text-sm"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Student Profile Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {fullName !== 'N/A' ? fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {fullName}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">{currentStudent.student_id || currentStudent.admission_number || 'N/A'}</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span>{currentStudent.class_name || 'No Class'}</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(currentStudent.current_status || currentStudent.status || 'active')}`}>
                  {currentStudent.current_status || currentStudent.status || 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Student Info Grid */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-500" />
              Personal Information
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
              <InfoRow label="Student ID" value={currentStudent.student_id || currentStudent.admission_number || 'N/A'} />
              <InfoRow label="Admission" value={currentStudent.admission_number || currentStudent.student_id || 'N/A'} />
              <InfoRow label="Full Name" value={fullName} />
              <InfoRow label="Gender" value={currentStudent.gender || 'N/A'} />
              <InfoRow label="Date of Birth" value={currentStudent.date_of_birth ? formatDate(currentStudent.date_of_birth) : 'N/A'} />
              <InfoRow label="Class" value={currentStudent.class_name || currentStudent.current_class || 'Not Assigned'} />
              <InfoRow label="Class Arm" value={currentStudent.class_arm || 'N/A'} />
              <InfoRow label="Department" value={currentStudent.department || 'N/A'} />
              <InfoRow label="Phone" value={currentStudent.phone_number || currentStudent.phone || 'N/A'} />
              <InfoRow label="Email" value={currentStudent.email || 'N/A'} />
              <InfoRow label="Address" value={currentStudent.home_address || currentStudent.residential_address || currentStudent.address || 'N/A'} />
              <InfoRow label="Status" value={currentStudent.status || currentStudent.current_status || 'Active'} />
              <InfoRow label="Nationality" value={currentStudent.nationality || 'N/A'} />
              <InfoRow label="State/Origin" value={currentStudent.state_of_origin || 'N/A'} />
              <InfoRow label="LGA" value={currentStudent.lga || 'N/A'} />
              <InfoRow label="Blood Group" value={currentStudent.blood_group || 'N/A'} />
              <InfoRow label="Genotype" value={currentStudent.genotype || 'N/A'} />
              <InfoRow label="Religion" value={currentStudent.religion || 'N/A'} />
            </div>
          </div>

          {/* Collections Summary */}
          {displayCollections.length > 0 && (
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-teal-200 dark:border-teal-800">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-center">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Collections</p>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{filteredCollections.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Items</p>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{totalItems}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Unique Items</p>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{uniqueItems.length}</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Terms</p>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{uniqueTerms.length}</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sessions</p>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{uniqueSessions.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          {displayCollections.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[120px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search items..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm dark:text-white"
                />
              </div>
              {uniqueTerms.length > 0 && (
                <select
                  value={filterTerm}
                  onChange={(e) => setFilterTerm(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm dark:text-white"
                >
                  <option value="all">All Terms</option>
                  {uniqueTerms.map((term) => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              )}
              {uniqueSessions.length > 0 && (
                <select
                  value={filterSession}
                  onChange={(e) => setFilterSession(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm dark:text-white"
                >
                  <option value="all">All Sessions</option>
                  {uniqueSessions.map((session) => (
                    <option key={session} value={session}>{session}</option>
                  ))}
                </select>
              )}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow' : 'text-gray-400'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 shadow' : 'text-gray-400'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Collections Display with Signatures */}
          {filteredCollections.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {displayCollections.length === 0 ? 'No collections recorded yet' : 'No collections match your filters'}
              </p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filteredCollections.map((c: any, index: number) => {
                const isExpanded = expandedItem === c.id;
                return (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(c.id)}>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-teal-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {c.item_name}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">×{c.quantity}</span>
                          {c.signature_url && (
                            <span className="text-[10px] text-teal-600 dark:text-teal-400 flex items-center gap-0.5">
                              <CheckCircle className="w-3 h-3" />
                              Signed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {dayjs(c.collection_date).format('MMM D, YYYY')}
                          </span>
                          {c.term_name && (
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {c.term_name}
                            </span>
                          )}
                          {c.class_at_collection && (
                            <span className="px-1.5 py-0.5 rounded-full text-[8px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {c.class_at_collection}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {c.signature_url && (
                          <button
                            onClick={() => toggleExpand(c.id)}
                            className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                          >
                            <Eye className="w-4 h-4 text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Signature Image - Expandable */}
                    {isExpanded && c.signature_url && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-start gap-3">
                          <PenTool className="w-4 h-4 text-teal-500 flex-shrink-0 mt-1" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Signature</p>
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-2 max-w-[200px]">
                              <img 
                                src={c.signature_url} 
                                alt="Signature" 
                                className="max-h-16 object-contain w-full"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                              Signed on {dayjs(c.collection_date).format('MMM D, YYYY')}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
              {filteredCollections.map((c: any, index: number) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start gap-2">
                    <Package className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{c.item_name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">×{c.quantity}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {dayjs(c.collection_date).format('MMM D')}
                      </p>
                      {c.class_at_collection && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[8px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {c.class_at_collection}
                        </span>
                      )}
                      {c.signature_url && (
                        <div className="mt-1">
                          <span className="text-[8px] text-teal-600 dark:text-teal-400 flex items-center gap-0.5">
                            <CheckCircle className="w-3 h-3" />
                            Signed
                          </span>
                          <div className="mt-1 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 p-1 max-h-12 overflow-hidden">
                            <img 
                              src={c.signature_url} 
                              alt="Signature" 
                              className="max-h-10 object-contain w-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// INFO ROW COMPONENT
// ============================================
const InfoRow: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => {
  return (
    <div className="py-1.5 border-b border-gray-100 dark:border-gray-700/50">
      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{value}</p>
    </div>
  );
};

export default StudentProfileModal;