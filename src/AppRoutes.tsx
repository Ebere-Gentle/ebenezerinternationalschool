import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Landing from './pages/landing/Landing';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import DashboardRouter from './components/common/DashboardRouter';
import FeeEdit from './pages/fees/FeeEdit';
import AdminDashboardWithJamb from './pages/dashboard/AdminDashboardWithJamb';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import FeeDetail from './pages/fees/FeeDetail';
import ParentDashboard from './pages/parent/ParentDashboard';
import StudentsWithLoginAccounts from './pages/students/StudentsWithLoginAccounts';
import StudentDetails from './pages/students/StudentDetails';
import SubjectsManagement from './pages/Subjects/SubjectsManagement';
import EditStudent from './pages/students/EditStudent';
import RegisterStudent from './pages/students/RegisterStudent';
import TeachersList from './pages/teachers/TeachersList';
import PaymentsList from './pages/payments/PaymentsList';
import RecordPayment from './pages/payments/RecordPayment';
import FeesList from './pages/fees/FeesList';
import CreateFee from './pages/fees/CreateFee';
import ClassesList from './pages/classes/ClassesList';
import BranchesList from './pages/branches/BranchesList';
import ReportsDashboard from './pages/reports/ReportsDashboard';
import Settings from './pages/settings/Settings';
import Profile from './pages/profile/Profile';
import NotFound from './pages/error/NotFound';
import AddTeacher from './pages/teachers/AddTeacher';
import ViewTeacher from './pages/teachers/viewTeacher';
import StudentPayBill from './pages/student/StudentPayBill';
import StudentProfile from './pages/student/StudentProfile';
import StudentPayments from './pages/student/StudentPayments';
import ParentManagement from './pages/parents/createParent';
import ParentPayBill from './pages/parent/ParentPayBill';
import MyChildren from './pages/parent/MyChildren';
import ParentPaymentHistory from './pages/parent/ParentPaymentHistory';
import { ParentProfile } from './pages/parent';
import MessagePage from './pages/communication/MessagesPage';
import UserMessagePage from './pages/communication/UsersMessagePage';
import AdminAsst from './pages/adminAsst';
import AdminAsstProfile from './pages/adminAsst/AdminAsstProfile';
import AdminAsstPayment from './pages/adminAsst/AdminAsstPayment';
import AttendanceManagement from './pages/academic/AttendanceManagement';
import StudentViewTest from './pages/student/results/StudentViewTest';
import StudentViewExam from './pages/student/results/StudentViewExam';
import StudentViewCBT from './pages/student/results/StudentViewCBT';
import StudentResultSummary from './pages/student/results/StudentResultSummary';
import ParentViewTest from './pages/parent/results/ParentViewTest';
import ParentViewExam from './pages/parent/results/ParentViewExam';
import ParentViewCBT from './pages/parent/results/ParentViewCBT';
import ParentResultSummary from './pages/parent/results/ParentResultSummary';
import AdminEnterTest from './pages/admin/results/AdminEnterTest';
import AdminEnterExam from './pages/admin/results/AdminEnterExam';
import AdminEnterCBT from './pages/admin/results/AdminEnterCBT';
import AdminViewResults from './pages/admin/results/AdminViewResults';
import AdminResultSummary from './pages/admin/results/AdminResultSummary';
import TeacherEnterTest from './pages/teacher/results/TeacherEnterTest';
import TeacherEnterExam from './pages/teacher/results/TeacherEnterExam';
import TeacherEnterCBT from './pages/teacher/results/TeacherEnterCBT';
import TeacherViewResults from './pages/teacher/results/TeacherViewResults';
import TeacherResultSummary from './pages/teacher/results/TeacherResultSummary';
import JambCbt from './pages/student/JambCbt';
import JambCbtTest from './pages/student/JambCbtTest';
import JambCbtProgress from './pages/parent/JambCbtProgress';
import JambCbtAnalytics from './pages/admin/JambCbtAnalytics';
import JambQuestionBank from './pages/admin/JambQuestionBank';

const ADMIN_ROLES = ['admin', 'branch_admin', 'director', 'super_admin', 'principal', 'record_keeper', 'finance'] as const;
const ACADEMIC_ADMIN_ROLES = ['admin', 'branch_admin', 'director', 'super_admin', 'principal'] as const;
const ATTENDANCE_ADMIN_ROLES = ['admin', 'branch_admin', 'director', 'super_admin', 'principal', 'record_keeper', 'finance'] as const;

const LayoutRoute: React.FC<{
  allowedRoles: string[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => (
  <ProtectedRoute allowedRoles={allowedRoles as any}>
    <MainLayout>{children}</MainLayout>
  </ProtectedRoute>
);

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/404" element={<NotFound />} />

    {/* =========================================================
        ADMIN / DIRECTOR DASHBOARD
        Keep the dashboard route isolated from feature routes.
       ========================================================= */}
    <Route
      path="/admin/dashboard"
      element={
        <ProtectedRoute allowedRoles={ADMIN_ROLES as any}>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<AdminDashboardWithJamb />} />
    </Route>

    {/* Admin communication / attendance */}
    <Route
      path="/admin/messages"
      element={
        <ProtectedRoute allowedRoles={ADMIN_ROLES as any}>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<MessagePage />} />
      <Route path=":conversationId" element={<MessagePage />} />
    </Route>

    <Route
      path="/admin/attendance"
      element={
        <ProtectedRoute allowedRoles={ATTENDANCE_ADMIN_ROLES as any}>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<AttendanceManagement />} />
    </Route>

    {/* =========================================================
        ADMIN JAMB CBT
        These are deliberately separate from /admin so a bad
        child route cannot fall through to the dashboard route.
       ========================================================= */}
    <Route
      path="/admin/jamb-cbt"
      element={
        <ProtectedRoute allowedRoles={ACADEMIC_ADMIN_ROLES as any}>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<JambCbtAnalytics />} />
    </Route>

    <Route
      path="/admin/jamb-cbt/questions"
      element={
        <ProtectedRoute allowedRoles={ACADEMIC_ADMIN_ROLES as any}>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<JambQuestionBank />} />
    </Route>

    {/* =========================================================
        ADMIN RESULTS
       ========================================================= */}
    <Route path="/admin/results/enter-test" element={<LayoutRoute allowedRoles={[...ACADEMIC_ADMIN_ROLES]}><AdminEnterTest /></LayoutRoute>} />
    <Route path="/admin/results/enter-exam" element={<LayoutRoute allowedRoles={[...ACADEMIC_ADMIN_ROLES]}><AdminEnterExam /></LayoutRoute>} />
    <Route path="/admin/results/enter-cbt" element={<LayoutRoute allowedRoles={[...ACADEMIC_ADMIN_ROLES]}><AdminEnterCBT /></LayoutRoute>} />
    <Route path="/admin/results/view" element={<LayoutRoute allowedRoles={[...ACADEMIC_ADMIN_ROLES]}><AdminViewResults /></LayoutRoute>} />
    <Route path="/admin/results/summary" element={<LayoutRoute allowedRoles={[...ACADEMIC_ADMIN_ROLES]}><AdminResultSummary /></LayoutRoute>} />

    {/* =========================================================
        STUDENT
       ========================================================= */}
    <Route
      path="/student/dashboard"
      element={
        <ProtectedRoute allowedRoles={['student']}>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<StudentDashboard />} />
    </Route>

    <Route path="/student/profile" element={<LayoutRoute allowedRoles={['student']}><StudentProfile /></LayoutRoute>} />
    <Route path="/student/payments" element={<LayoutRoute allowedRoles={['student']}><StudentPayments /></LayoutRoute>} />
    <Route path="/student/paybill" element={<LayoutRoute allowedRoles={['student']}><StudentPayBill /></LayoutRoute>} />
    <Route path="/student/attendance" element={<LayoutRoute allowedRoles={['student']}><AttendanceManagement /></LayoutRoute>} />

    <Route path="/student/jamb-cbt" element={<LayoutRoute allowedRoles={['student']}><JambCbt /></LayoutRoute>} />
    <Route path="/student/jamb-cbt/test/:subjectId" element={<LayoutRoute allowedRoles={['student']}><JambCbtTest /></LayoutRoute>} />

    <Route path="/student/results/test" element={<LayoutRoute allowedRoles={['student']}><StudentViewTest /></LayoutRoute>} />
    <Route path="/student/results/exam" element={<LayoutRoute allowedRoles={['student']}><StudentViewExam /></LayoutRoute>} />
    <Route path="/student/results/cbt" element={<LayoutRoute allowedRoles={['student']}><StudentViewCBT /></LayoutRoute>} />
    <Route path="/student/results/summary" element={<LayoutRoute allowedRoles={['student']}><StudentResultSummary /></LayoutRoute>} />

    {/* =========================================================
        TEACHER
       ========================================================= */}
    <Route path="/teacher/dashboard" element={<LayoutRoute allowedRoles={['teacher']}><TeacherDashboard /></LayoutRoute>} />
    <Route path="/teacher/attendance" element={<LayoutRoute allowedRoles={['teacher']}><AttendanceManagement /></LayoutRoute>} />
    <Route path="/teacher/jamb-cbt" element={<LayoutRoute allowedRoles={['teacher']}><JambCbtAnalytics /></LayoutRoute>} />
    <Route path="/teacher/results/enter-test" element={<LayoutRoute allowedRoles={['teacher']}><TeacherEnterTest /></LayoutRoute>} />
    <Route path="/teacher/results/enter-exam" element={<LayoutRoute allowedRoles={['teacher']}><TeacherEnterExam /></LayoutRoute>} />
    <Route path="/teacher/results/enter-cbt" element={<LayoutRoute allowedRoles={['teacher']}><TeacherEnterCBT /></LayoutRoute>} />
    <Route path="/teacher/results/view" element={<LayoutRoute allowedRoles={['teacher']}><TeacherViewResults /></LayoutRoute>} />
    <Route path="/teacher/results/summary" element={<LayoutRoute allowedRoles={['teacher']}><TeacherResultSummary /></LayoutRoute>} />

    {/* =========================================================
        PARENT
       ========================================================= */}
    <Route path="/parent/dashboard" element={<LayoutRoute allowedRoles={['parent']}><ParentDashboard /></LayoutRoute>} />
    <Route path="/parent/pay-bill/:studentId" element={<LayoutRoute allowedRoles={['parent']}><ParentPayBill /></LayoutRoute>} />
    <Route path="/parent/pay-bill" element={<LayoutRoute allowedRoles={['parent']}><ParentPayBill /></LayoutRoute>} />
    <Route path="/parent/children" element={<LayoutRoute allowedRoles={['parent']}><MyChildren /></LayoutRoute>} />
    <Route path="/parent/jamb-cbt" element={<LayoutRoute allowedRoles={['parent']}><JambCbtProgress /></LayoutRoute>} />
    <Route path="/parent/profile" element={<LayoutRoute allowedRoles={['parent']}><ParentProfile /></LayoutRoute>} />
    <Route path="/parent/payment/:studentId" element={<LayoutRoute allowedRoles={['parent']}><ParentPaymentHistory /></LayoutRoute>} />
    <Route path="/parent/payment" element={<LayoutRoute allowedRoles={['parent']}><ParentPaymentHistory /></LayoutRoute>} />
    <Route path="/parent/results/test" element={<LayoutRoute allowedRoles={['parent']}><ParentViewTest /></LayoutRoute>} />
    <Route path="/parent/results/exam" element={<LayoutRoute allowedRoles={['parent']}><ParentViewExam /></LayoutRoute>} />
    <Route path="/parent/results/cbt" element={<LayoutRoute allowedRoles={['parent']}><ParentViewCBT /></LayoutRoute>} />
    <Route path="/parent/results/summary" element={<LayoutRoute allowedRoles={['parent']}><ParentResultSummary /></LayoutRoute>} />

    {/* User messages remain an independent protected area. */}
    <Route
      path="/user-messages"
      element={
        <ProtectedRoute allowedRoles={['student', 'parent', 'teacher', 'record_keeper', 'admin_asst']}>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<UserMessagePage />} />
      <Route path=":conversationId" element={<UserMessagePage />} />
    </Route>

    {/* Admin assistant */}
    <Route
      path="/admin-asst"
      element={<ProtectedRoute allowedRoles={['admin', 'director', 'admin_asst', 'record_keeper']}><MainLayout /></ProtectedRoute>}
    >
      <Route index element={<Navigate to="/admin-asst/dashboard" replace />} />
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
    </Route>

    {/* =========================================================
        SHARED ADMIN RESOURCE ROUTES
        These remain under the existing root layout, but are
        isolated from /admin dashboard routing.
       ========================================================= */}
    <Route path="/students" element={<LayoutRoute allowedRoles={[...ADMIN_ROLES]}><StudentsWithLoginAccounts /></LayoutRoute>} />
    <Route path="/students/:id" element={<LayoutRoute allowedRoles={[...ADMIN_ROLES]}><StudentDetails /></LayoutRoute>} />
    <Route path="/students/edit/:id" element={<LayoutRoute allowedRoles={[...ADMIN_ROLES]}><EditStudent /></LayoutRoute>} />
    <Route path="/students/register" element={<LayoutRoute allowedRoles={[...ADMIN_ROLES]}><RegisterStudent /></LayoutRoute>} />
    <Route path="/teachers" element={<LayoutRoute allowedRoles={[...ACADEMIC_ADMIN_ROLES]}><TeachersList /></LayoutRoute>} />
    <Route path="/teachers/add" element={<LayoutRoute allowedRoles={[...ACADEMIC_ADMIN_ROLES]}><AddTeacher /></LayoutRoute>} />
    <Route path="/teachers/:id" element={<LayoutRoute allowedRoles={[...ACADEMIC_ADMIN_ROLES]}><ViewTeacher /></LayoutRoute>} />
    <Route path="/teachers/edit/:id" element={<LayoutRoute allowedRoles={[...ACADEMIC_ADMIN_ROLES]}><AddTeacher /></LayoutRoute>} />
    <Route path="/subjects" element={<LayoutRoute allowedRoles={[...ACADEMIC_ADMIN_ROLES]}><SubjectsManagement /></LayoutRoute>} />
    <Route path="/payments" element={<LayoutRoute allowedRoles={[...ADMIN_ROLES]}><PaymentsList /></LayoutRoute>} />
    <Route path="/payments/record" element={<LayoutRoute allowedRoles={[...ADMIN_ROLES]}><RecordPayment /></LayoutRoute>} />
    <Route path="/fees" element={<LayoutRoute allowedRoles={[...ADMIN_ROLES]}><FeesList /></LayoutRoute>} />
    <Route path="/fees/:id" element={<LayoutRoute allowedRoles={[...ADMIN_ROLES]}><FeeDetail /></LayoutRoute>} />
    <Route path="/fees/edit/:id" element={<LayoutRoute allowedRoles={[...ADMIN_ROLES]}><FeeEdit /></LayoutRoute>} />
    <Route path="/fees/create" element={<LayoutRoute allowedRoles={[...ADMIN_ROLES]}><CreateFee /></LayoutRoute>} />
    <Route path="/classes" element={<LayoutRoute allowedRoles={[...ACADEMIC_ADMIN_ROLES]}><ClassesList /></LayoutRoute>} />
    <Route path="/parents/create" element={<LayoutRoute allowedRoles={[...ACADEMIC_ADMIN_ROLES]}><ParentManagement /></LayoutRoute>} />
    <Route path="/branches" element={<LayoutRoute allowedRoles={[...ACADEMIC_ADMIN_ROLES]}><BranchesList /></LayoutRoute>} />
    <Route path="/reports" element={<LayoutRoute allowedRoles={[...ADMIN_ROLES]}><ReportsDashboard /></LayoutRoute>} />
    <Route path="/settings" element={<LayoutRoute allowedRoles={[...ADMIN_ROLES, 'teacher', 'parent', 'student', 'admin_asst']}><Settings /></LayoutRoute>} />
    <Route path="/profile" element={<LayoutRoute allowedRoles={[...ADMIN_ROLES]}><Profile /></LayoutRoute>} />

    {/* Only the exact root is allowed to use DashboardRouter. */}
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute allowedRoles={ADMIN_ROLES as any}>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<DashboardRouter />} />
    </Route>

    <Route path="*" element={<Navigate to="/404" replace />} />
  </Routes>
);

export default AppRoutes;
