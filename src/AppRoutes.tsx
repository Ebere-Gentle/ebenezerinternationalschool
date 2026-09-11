import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Landing from './pages/landing/Landing';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import DashboardRouter from './components/common/DashboardRouter';
import FeeEdit from './pages/fees/FeeEdit';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import FeeDetail from './pages/fees/FeeDetail';
import ParentDashboard from './pages/parent/ParentDashboard';
import StudentsList from './pages/students/StudentsList';
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

const ADMIN_ROLES = ['admin', 'branch_admin', 'director', 'super_admin', 'principal', 'record_keeper', 'finance'];
const ATTENDANCE_ADMIN_ROLES = ['admin', 'branch_admin', 'director', 'super_admin', 'principal', 'record_keeper', 'finance'];

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/404" element={<NotFound />} />

    <Route path="/admin" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><MainLayout /></ProtectedRoute>}>
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route index element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="messages" element={<MessagePage />} />
      <Route path="messages/:conversationId" element={<MessagePage />} />
      <Route path="attendance" element={<AttendanceManagement />} />
      <Route path="jamb-cbt" element={<JambCbtAnalytics />} />
      <Route path="results/enter-test" element={<AdminEnterTest />} />
      <Route path="results/enter-exam" element={<AdminEnterExam />} />
      <Route path="results/enter-cbt" element={<AdminEnterCBT />} />
      <Route path="results/view" element={<AdminViewResults />} />
      <Route path="results/summary" element={<AdminResultSummary />} />
    </Route>

    <Route path="/user-messages" element={<ProtectedRoute allowedRoles={['student', 'parent', 'teacher', 'record_keeper', 'admin_asst']}><MainLayout /></ProtectedRoute>}>
      <Route index element={<UserMessagePage />} />
      <Route path=":conversationId" element={<UserMessagePage />} />
    </Route>

    <Route path="/admin-asst" element={<ProtectedRoute allowedRoles={['admin', 'director', 'admin_asst', 'record_keeper']}><MainLayout /></ProtectedRoute>}>
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
    </Route>

    <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><MainLayout /></ProtectedRoute>}>
      <Route path="dashboard" element={<StudentDashboard />} />
      <Route index element={<Navigate to="/student/dashboard" replace />} />
      <Route path="profile" element={<StudentProfile />} />
      <Route path="payments" element={<StudentPayments />} />
      <Route path="paybill" element={<StudentPayBill />} />
      <Route path="attendance" element={<AttendanceManagement />} />
      <Route path="jamb-cbt" element={<JambCbt />} />
      <Route path="jamb-cbt/test/:subjectId" element={<JambCbtTest />} />
      <Route path="results/test" element={<StudentViewTest />} />
      <Route path="results/exam" element={<StudentViewExam />} />
      <Route path="results/cbt" element={<StudentViewCBT />} />
      <Route path="results/summary" element={<StudentResultSummary />} />
    </Route>

    <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><MainLayout /></ProtectedRoute>}>
      <Route path="dashboard" element={<TeacherDashboard />} />
      <Route index element={<Navigate to="/teacher/dashboard" replace />} />
      <Route path="attendance" element={<AttendanceManagement />} />
      <Route path="jamb-cbt" element={<JambCbtAnalytics />} />
      <Route path="results/enter-test" element={<TeacherEnterTest />} />
      <Route path="results/enter-exam" element={<TeacherEnterExam />} />
      <Route path="results/enter-cbt" element={<TeacherEnterCBT />} />
      <Route path="results/view" element={<TeacherViewResults />} />
      <Route path="results/summary" element={<TeacherResultSummary />} />
    </Route>

    <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent']}><MainLayout /></ProtectedRoute>}>
      <Route path="dashboard" element={<ParentDashboard />} />
      <Route index element={<Navigate to="/parent/dashboard" replace />} />
      <Route path="pay-bill/:studentId" element={<ParentPayBill />} />
      <Route path="pay-bill" element={<ParentPayBill />} />
      <Route path="children" element={<MyChildren />} />
      <Route path="jamb-cbt" element={<JambCbtProgress />} />
      <Route path="profile" element={<ParentProfile />} />
      <Route path="payment/:studentId" element={<ParentPaymentHistory />} />
      <Route path="payment" element={<ParentPaymentHistory />} />
      <Route path="results/test" element={<ParentViewTest />} />
      <Route path="results/exam" element={<ParentViewExam />} />
      <Route path="results/cbt" element={<ParentViewCBT />} />
      <Route path="results/summary" element={<ParentResultSummary />} />
    </Route>

    <Route path="/attendance" element={<ProtectedRoute allowedRoles={[...ATTENDANCE_ADMIN_ROLES, 'teacher']}><MainLayout /></ProtectedRoute>}>
      <Route index element={<AttendanceManagement />} />
    </Route>

    <Route path="/" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><MainLayout /></ProtectedRoute>}>
      <Route path="students" element={<StudentsWithLoginAccounts />} />
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
      <Route index element={<DashboardRouter />} />
    </Route>

    <Route path="*" element={<Navigate to="/404" replace />} />
  </Routes>
);

export default AppRoutes;
