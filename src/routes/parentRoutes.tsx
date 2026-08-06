import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ParentDashboard from '../pages/parent/ParentDashboard';
import ParentPayBill from '../pages/parent/ParentPayBill';
import ParentPaymentHistory from '../pages/parent/ParentPaymentHistory';
import ParentProfile from '../pages/parent/ParentProfile';

const ParentRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<ParentLayout />}>
        <Route index element={<Navigate to="/parent/dashboard" replace />} />
        <Route path="dashboard" element={<ParentDashboard />} />
        <Route path="pay-bill" element={<ParentPayBill />} />
        <Route path="pay-bill/:studentId" element={<ParentPayBill />} />
        <Route path="payments" element={<ParentPaymentHistory />} />
        <Route path="payments/:studentId" element={<ParentPaymentHistory />} />
        <Route path="profile" element={<ParentProfile />} />
      </Route>
    </Routes>
  );
};

export default ParentRoutes;
