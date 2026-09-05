import React from 'react';
import { ResultForm } from '../../../components/results/shared/ResultForm';

const AdminEnterTest: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <ResultForm type="test" />
    </div>
  );
};

export default AdminEnterTest;
