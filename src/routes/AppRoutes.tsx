import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Landing from '../pages/landing/Landing';
import ProtectedRoute from '../components/common/ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import DashboardRouter from '../components/common/DashboardRouter';
import FeeEdit from '../pages/fees/FeeEdit';
import AdminDashboard from '../pages/dashboard/AdminDashboard';
import TeacherDashboard from '../pages/teacher/TeacherDashboard';
import StudentDashboard from '../pages/student/StudentDashboard';
import FeeDetail from '../pages/fees/FeeDetail';
import ParentDashboard from '../pages/parent/ParentDashboard';
import StudentsList from '../pages/students/StudentsList';
import StudentDetails from '../pages/students/StudentDetails';
import SubjectsManagement from '../pages/Subjects/SubjectsManagement';
import EditStudent from '../pages/students/EditStudent';
import RegisterStudent from '../pages/students/RegisterStudent';
import TeachersList from '../pages/teachers/TeachersList';
import PaymentsList from '../pages/payments/PaymentsList';
import RecordPayment from '../pages/payments/RecordPayment';
import FeesList from '../pages/fees/FeesList';
import CreateFee from '../pages/fees/CreateFee';
import ClassesList from '../pages/classes/ClassesList';
import BranchesList from '../pages/branches/BranchesList';
import ReportsDashboard from '../pages/reports/ReportsDashboard';
import Settings from '../pages/settings/Settings';
import Profile from '../pages/profile/Profile';
import NotFound from '../pages/error/NotFound';
import AddTeacher from '../pages/teachers/AddTeacher';
import ViewTeacher from '../pages/teachers/viewTeacher';
import StudentPayBill from '../pages/student/StudentPayBill';
import StudentProfile from '../pages/student/StudentProfile';
import StudentPayments from '../pages/student/StudentPayments';
import ParentManagement from '../pages/parents/createParent';
import ParentPayBill from '../pages/parent/ParentPayBill';
import MyChildren from '../pages/parent/MyChildren';
import ParentPaymentHistory from '../pages/parent/ParentPaymentHistory';
import { ParentProfile } from '../pages/parent';

// AdminAsst imports
import AdminAsst from '../pages/adminAsst';
import AdminAsstProfile from '../pages/adminAsst/AdminAsstProfile';
import AdminAsstPayment from '../pages/adminAsst/AdminAsstPayment';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* ============================================ */}
      {/* PUBLIC ROUTES */}
      {/* ============================================ */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/404" element={<NotFound />} />

      {/* ============================================ */}
      {/* STUDENT ROUTES - MOST SPECIFIC FIRST */}
      {/* ============================================ */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="payments" element={<StudentPayments />} />
        <Route path="paybill" element={<StudentPayBill />} />
        {/* Catch any other student routes */}
        <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
      </Route>

      {/* ============================================ */}
      {/* TEACHER ROUTES */}
      {/* ============================================ */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route index element={<Navigate to="/teacher/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
      </Route>

      {/* ============================================ */}
      {/* PARENT ROUTES */}
      {/* ============================================ */}
      <Route
        path="/parent"
        element={
          <ProtectedRoute allowedRoles={['parent']}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<ParentDashboard />} />
        <Route index element={<Navigate to="/parent/dashboard" replace />} />
        <Route path="pay-bill/:studentId" element={<ParentPayBill />} />
        <Route path="pay-bill" element={<ParentPayBill />} />
        <Route path="children" element={<MyChildren />} />
        <Route path="profile" element={<ParentProfile />} />
        <Route path="payment/:studentId" element={<ParentPaymentHistory />} />
        <Route path="payment" element={<ParentPaymentHistory />} />
        <Route path="*" element={<Navigate to="/parent/dashboard" replace />} />
      </Route>

      {/* ============================================ */}
      {/* ADMIN ASSISTANT ROUTES - BEFORE ADMIN */}
      {/* ============================================ */}
      <Route
        path="/admin-asst"
        element={
          <ProtectedRoute allowedRoles={['admin', 'director', 'admin_asst', 'record_keeper']}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminAsst />} />
        <Route path="students" element={<AdminAsst />} />
        <Route path="classes" element={<AdminAsst />} />
        <Route path="sessions" element={<AdminAsst />} />
        <Route path="collections" element={<AdminAsst />} />
        <Route path="inventory" element={<AdminAsst />} />
        <Route path="reports" element={<AdminAsst />} />
        <Route path="activity" element={<AdminAsst />} />
        <Route path="payment" element={<AdminAsstPayment />} />
        <Route path="settings" element={<AdminAsst />} />
        <Route path="profile" element={<AdminAsstProfile />} />
        <Route index element={<Navigate to="/admin-asst/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/admin-asst/dashboard" replace />} />
      </Route>

      {/* ============================================ */}
      {/* ADMIN ROUTES */}
      {/* ============================================ */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin', 'director', 'super_admin', 'finance']}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      {/* ============================================ */}
      {/* SHARED ROUTES - LEAST SPECIFIC, COMES LAST */}
      {/* ============================================ */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* REMOVED: <Route path="dashboard" element={<AdminDashboard />} /> */}
        {/* This was the cause of the bug! */}
        
        {/* Shared routes - accessible by multiple roles */}
        <Route path="students" element={<StudentsList />} />
        <Route path="students/:id" element={<StudentDetails />} />
        <Route path="students/edit/:id" element={<EditStudent />} />
        <Route path="students/register" element={<RegisterStudent />} />
        
        <Route path="teachers" element={<TeachersList />} />
        <Route path="teachers/add" element={<AddTeacher />} />
        <Route path="teachers/:id" element={<ViewTeacher />} />
        <Route path="teachers/edit/:id" element={<AddTeacher />} />
        
        <Route path="subjects" element={<SubjectsManagement />} />
        
        <Route path="payments" element={<PaymentsList />} />
        <Route path="payments/record" element={<RecordPayment />} />
        
        <Route path="fees" element={<FeesList />} />
        <Route path="fees/:id" element={<FeeDetail />} />
        <Route path="fees/edit/:id" element={<FeeEdit />} />
        <Route path="fees/create" element={<CreateFee />} />
        
        <Route path="classes" element={<ClassesList />} />
        <Route path="parents/create" element={<ParentManagement />} />
        <Route path="branches" element={<BranchesList />} />
        <Route path="reports" element={<ReportsDashboard />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
        
        {/* Use DashboardRouter to redirect to the correct dashboard based on role */}
        <Route index element={<DashboardRouter />} />
        
        {/* Catch any other routes and redirect to dashboard router */}
        <Route path="*" element={<DashboardRouter />} />
      </Route>

      {/* ============================================ */}
      {/* CATCH ALL - 404 */}
      {/* ============================================ */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

export default AppRoutes;
