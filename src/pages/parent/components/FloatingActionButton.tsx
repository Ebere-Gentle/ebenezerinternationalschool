// src/pages/parent/components/FloatingActionButton.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard } from 'lucide-react';

interface FloatingActionButtonProps {
  assignments: any[];
  paymentGateway: boolean;
  onPayNow: (assignment: any) => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  assignments,
  paymentGateway,
  onPayNow,
}) => {
  const firstUnpaid = assignments.find(a => 
    a.balance > 0 && 
    a.payment_status !== 'paid' && 
    a.payment_status !== 'pending' && 
    a.payment_status !== 'waived'
  );

  if (!firstUnpaid || !paymentGateway) return null;

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.5, type: 'spring' }}
      className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full shadow-2xl shadow-green-500/30 flex items-center justify-center hover:scale-110 transition-all z-40"
      onClick={() => onPayNow(firstUnpaid)}
    >
      <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
    </motion.button>
  );
};

export default FloatingActionButton;
