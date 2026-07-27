import React from 'react';
import { Routes, Route } from 'react-router-dom';
import TeachersList from '../../pages/teachers/TeachersList';
import AddTeacher from '../../pages/teachers/AddTeacher';
import ViewTeacher from '../../pages/teachers/viewTeacher';

const TeacherRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<TeachersList />} />
      <Route path="/add" element={<AddTeacher />} />
      <Route path="/:id" element={<ViewTeacher />} />
      <Route path="/:id/edit" element={<AddTeacher />} />
    </Routes>
  );
};

export default TeacherRoutes;
