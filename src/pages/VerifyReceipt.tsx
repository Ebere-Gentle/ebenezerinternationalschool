import React, { useState } from 'react';
import { supabase } from '../config/supabase/client';
import toast from 'react-hot-toast';

const VerifyReceipt: React.FC = () => {
  const [receiptNumber, setReceiptNumber] = useState('');
  const [token, setToken] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!receiptNumber) {
      toast.error('Please enter a receipt number');
      return;
    }

    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/verify-receipt`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiptNumber,
            token: token || undefined,
          }),
        }
      );

      const data = await response.json();
      setResult(data);
      
      if (data.valid) {
        toast.success('✅ Receipt is authentic!');
      } else {
        toast.error('❌ Receipt verification failed');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to verify receipt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Verify Receipt</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Receipt Number</label>
          <input
            type="text"
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
            placeholder="e.g., RCP/EBE/2026/00000001"
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Verification Token (Optional)</label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="e.g., EIS-VFY-SZ7FYNAWYU5C"
            className="w-full px-4 py-2 border rounded-lg"
          />
          <p className="text-xs text-gray-500 mt-1">Found on the receipt under "Verification Token"</p>
        </div>

        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify Receipt'}
        </button>

        {result && (
          <div className={`p-4 rounded-lg ${result.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
            <h3 className={`font-bold ${result.valid ? 'text-green-700' : 'text-red-700'}`}>
              {result.valid ? '✅ Authentic' : '❌ Invalid'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{result.message}</p>
            {result.receipt && (
              <div className="mt-2 text-sm">
                <p><strong>Amount:</strong> ₦{result.receipt.amount}</p>
                <p><strong>Payment Date:</strong> {new Date(result.receipt.payment_date).toLocaleDateString()}</p>
                <p><strong>Status:</strong> {result.receipt.status}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyReceipt;
