import React from 'react';
import { ResultForm } from '../../../components/results/shared/ResultForm';

const AdminEnterCBT: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <ResultForm type="cbt" />
    </div>
  );
};

export default AdminEnterCBT;
