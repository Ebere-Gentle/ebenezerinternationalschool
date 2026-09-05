import React from 'react';
import { ResultForm } from '../../../components/results/shared/ResultForm';

const TeacherEnterExam: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <ResultForm type="exam" />
    </div>
  );
};

export default TeacherEnterExam;
