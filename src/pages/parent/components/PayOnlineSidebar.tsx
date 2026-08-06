// src/pages/parent/components/PayOnlineSidebar.tsx

import React from 'react';
import { ShieldCheck, CreditCard, Clock as ClockIcon, Smartphone } from 'lucide-react';
import payOnlineImage from '../../../assets/payonline.jpg';

interface PayOnlineSidebarProps {
  assignments: any[];
  onPayNow: (assignment: any) => void;
}

const PayOnlineSidebar: React.FC<PayOnlineSidebarProps> = ({
  assignments,
  onPayNow,
}) => {
  const firstUnpaid = assignments.find(a => 
    a.balance > 0 && 
    a.payment_status !== 'paid' && 
    a.payment_status !== 'pending' && 
    a.payment_status !== 'waived'
  );

  return (
    <div className="lg:w-64 xl:w-72 flex-shrink-0">
      <div className="sticky top-4">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl overflow-hidden border border-blue-200 dark:border-blue-800 shadow-lg">
          <div className="relative">
            {payOnlineImage ? (
              <img 
                src={payOnlineImage} 
                alt="Pay Online" 
                className="w-full h-auto object-cover"
              />
            ) : (
              <div className="p-8 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-12 h-12 text-white" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Pay Online</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Secure & Convenient</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent flex items-end">
              <div className="p-4 text-white w-full">
                <h4 className="text-sm font-bold">Pay Online</h4>
                <p className="text-xs opacity-80">Fast, Secure & Convenient</p>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>256-bit SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <CreditCard className="w-4 h-4 text-blue-500" />
              <span>Multiple Payment Methods</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <ClockIcon className="w-4 h-4 text-purple-500" />
              <span>24/7 Payment Support</span>
            </div>
            <button
              onClick={() => {
                if (firstUnpaid) {
                  onPayNow(firstUnpaid);
                }
              }}
              className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!firstUnpaid}
            >
              {firstUnpaid ? 'Pay Now' : 'All Paid ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayOnlineSidebar;
