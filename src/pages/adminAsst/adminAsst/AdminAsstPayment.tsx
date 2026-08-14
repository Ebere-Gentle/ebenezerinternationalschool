// pages/adminAsst/AdminAsstPayment.tsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import RecordPayment from '../payments/RecordPayment';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminAsstPayment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we came from a successful payment
  useEffect(() => {
    if (location.state?.paymentSuccess) {
      toast.success('Payment recorded successfully!');
      // Clear the state after showing the toast
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handlePaymentSuccess = () => {
    // Stay on the same page - just reload with success state
    navigate('/admin-asst/payment', { 
      state: { paymentSuccess: true },
      replace: true 
    });
  };

  const handleCancel = () => {
    navigate('/admin-asst/dashboard');
  };

  const handleBack = () => {
    navigate('/admin-asst/dashboard');
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Payment Component with callbacks */}
      <RecordPayment 
        onSuccess={handlePaymentSuccess}
        onCancel={handleCancel}
        redirectTo="/admin-asst/payment"
      />
    </div>
  );
};

export default AdminAsstPayment;