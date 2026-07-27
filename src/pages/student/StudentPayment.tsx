import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  CreditCard,
  Building2,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Banknote,
  Smartphone,
  FileText,
  Download,
  Printer,
  ArrowLeft,
  ChevronRight,
  Eye,
  Receipt,
  Calendar,
  DollarSign,
  User,
  Mail,
  Phone,
  MapPin,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface Fee {
  id: string;
  fee_id: string;
  name: string;
  description: string;
  amount: number;
  due_date: string;
  category: string;
  status: string;
  late_fee_amount: number;
}

interface PaymentRecord {
  id: string;
  receipt_number: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  status: string;
  balance: number;
  transaction_reference: string;
  payment_proof_url: string;
  fee_id: string;
  fee?: {
    name: string;
  };
}

const StudentPayment: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'offline' | 'online'>('offline');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Bank details for offline payment
  const bankDetails = {
    bankName: 'Zenith Bank',
    accountName: 'Ebeniza International School',
    accountNumber: '1012345678',
    branch: 'Ikeja, Lagos'
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get student's class
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('class_id')
        .eq('id', user?.id)
        .single();

      if (studentError) throw studentError;

      // Fetch fees
      const { data: feesData, error: feesError } = await supabase
        .from('fees')
        .select('*')
        .eq('class_id', student.class_id)
        .eq('status', 'active')
        .order('due_date', { ascending: true });

      if (feesError) throw feesError;
      setFees(feesData || []);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          fee:fee_id (
            name
          )
        `)
        .eq('student_id', user?.id)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const isFeePaid = (feeId: string) => {
    return payments.some(p => p.fee_id === feeId && p.status === 'completed');
  };

  const getFeePayment = (feeId: string) => {
    return payments.find(p => p.fee_id === feeId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return styles[status] || styles.pending;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a JPEG, PNG, or PDF file');
        return;
      }

      setUploadedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOfflinePayment = async () => {
    if (!selectedFee) {
      toast.error('Please select a fee to pay');
      return;
    }

    if (!uploadedFile) {
      toast.error('Please upload payment proof');
      return;
    }

    if (!paymentReference) {
      toast.error('Please enter transaction reference');
      return;
    }

    if (amountPaid <= 0) {
      toast.error('Please enter amount paid');
      return;
    }

    setProcessing(true);
    try {
      // Upload file to storage
      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, uploadedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          student_id: user?.id,
          fee_id: selectedFee.id,
          amount: selectedFee.amount,
          amount_paid: amountPaid,
          balance: selectedFee.amount - amountPaid,
          payment_method: 'bank_transfer',
          payment_date: new Date().toISOString(),
          status: 'pending',
          transaction_reference: paymentReference,
          payment_proof_url: urlData.publicUrl,
          branch_id: user?.branch_id,
          created_by: user?.id,
          metadata: {
            payment_type: 'offline',
            submitted_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      setShowSuccess(true);
      toast.success('Payment submitted for approval');
      
      // Refresh data
      await fetchData();
      
      // Reset form
      setSelectedFee(null);
      setUploadedFile(null);
      setUploadPreview(null);
      setPaymentReference('');
      setAmountPaid(0);
      setShowPaymentModal(false);

    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Failed to submit payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleOnlinePayment = async () => {
    if (!selectedFee) {
      toast.error('Please select a fee to pay');
      return;
    }

    setProcessing(true);
    try {
      // This is where you'd integrate with Remita
      // For now, we'll simulate the payment process
      
      // Generate a reference
      const reference = `REM-${Date.now()}`;
      
      // Create pending payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          student_id: user?.id,
          fee_id: selectedFee.id,
          amount: selectedFee.amount,
          amount_paid: selectedFee.amount,
          balance: 0,
          payment_method: 'remita',
          payment_date: new Date().toISOString(),
          status: 'pending',
          transaction_reference: reference,
          branch_id: user?.branch_id,
          created_by: user?.id,
          metadata: {
            payment_type: 'online',
            gateway: 'remita',
            initiated_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Simulate redirect to Remita
      toast.success('Redirecting to Remita payment gateway...');
      
      // In production, you would redirect to Remita here
      // window.location.href = `https://remita.net/pay?reference=${reference}`;
      
      // For demo, simulate successful payment after 3 seconds
      setTimeout(async () => {
        await supabase
          .from('payments')
          .update({
            status: 'completed',
            metadata: {
              ...paymentData.metadata,
              completed_at: new Date().toISOString(),
              gateway_response: 'Approved'
            }
          })
          .eq('id', paymentData.id);
        
        toast.success('Payment completed successfully!');
        fetchData();
        setShowPaymentModal(false);
        setSelectedFee(null);
      }, 3000);

    } catch (error: any) {
      console.error('Error processing online payment:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success('Copied to clipboard');
  };

  const unpaidFees = fees.filter(fee => !isFeePaid(fee.id));

  if (loading) {
     return (
       <div className="flex items-center justify-center min-h-[60vh]">
         <LoadingSpinner size="lg" text="Loading please wait..." />
       </div>
     );
   }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Make Payment</h1>
          <p className="text-gray-500 dark:text-gray-400">Pay your fees online or offline</p>
        </div>
        <button
          onClick={() => navigate('/student/payments')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          <Eye className="w-4 h-4" />
          View History
        </button>
      </div>

      {/* Payment Method Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
            paymentMethod === 'offline'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
          }`}
          onClick={() => setPaymentMethod('offline')}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Offline Payment</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bank transfer with proof upload</p>
            </div>
          </div>
        </div>

        <div
          className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
            paymentMethod === 'online'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
          }`}
          onClick={() => setPaymentMethod('online')}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Online Payment</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pay with Remita</p>
            </div>
          </div>
        </div>
      </div>

      {/* Unpaid Fees List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Outstanding Fees</h2>
        {unpaidFees.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-lg font-medium text-gray-900 dark:text-white">All fees paid!</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">You have no outstanding fees</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unpaidFees.map((fee) => (
              <div
                key={fee.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedFee?.id === fee.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
                onClick={() => setSelectedFee(fee)}
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{fee.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Due: {dayjs(fee.due_date).format('MMM D, YYYY')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(fee.amount)}</p>
                  <span className="text-xs text-red-500">Unpaid</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Button */}
      {unpaidFees.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              if (!selectedFee) {
                toast.error('Please select a fee to pay');
                return;
              }
              setShowPaymentModal(true);
              setAmountPaid(selectedFee.amount);
            }}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Pay Selected Fee
          </button>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {paymentMethod === 'offline' ? 'Offline Payment' : 'Online Payment'}
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedFee(null);
                  setUploadedFile(null);
                  setUploadPreview(null);
                  setPaymentReference('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Fee Details */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fee Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedFee.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                    <p className="font-bold text-2xl text-gray-900 dark:text-white">
                      {formatCurrency(selectedFee.amount)}
                    </p>
                  </div>
                </div>
              </div>

              {paymentMethod === 'offline' ? (
                /* Offline Payment */
                <div className="space-y-4">
                  {/* Bank Details */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                    <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Bank Transfer Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg">
                        <span className="text-gray-500 dark:text-gray-400">Bank</span>
                        <span className="font-medium text-gray-900 dark:text-white">{bankDetails.bankName}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg">
                        <span className="text-gray-500 dark:text-gray-400">Account Name</span>
                        <span className="font-medium text-gray-900 dark:text-white">{bankDetails.accountName}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg">
                        <span className="text-gray-500 dark:text-gray-400">Account Number</span>
                        <span className="font-medium text-gray-900 dark:text-white font-mono flex items-center gap-2">
                          {bankDetails.accountNumber}
                          <button
                            onClick={() => copyToClipboard(bankDetails.accountNumber)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                          >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Amount Paid (NGN)
                      </label>
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                        min="0"
                        max={selectedFee.amount}
                        step="100"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Balance: {formatCurrency(selectedFee.amount - amountPaid)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Transaction Reference
                      </label>
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="Enter transaction reference from your bank"
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Upload Payment Proof
                      </label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-500 transition-all">
                        {uploadPreview ? (
                          <div className="space-y-3">
                            <img src={uploadPreview} alt="Payment proof" className="max-h-48 mx-auto rounded-lg" />
                            <button
                              onClick={() => {
                                setUploadedFile(null);
                                setUploadPreview(null);
                              }}
                              className="text-sm text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-gray-400">JPEG, PNG, PDF (Max 5MB)</p>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={handleFileUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleOfflinePayment}
                    disabled={processing || !uploadedFile || !paymentReference}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Submit Payment for Approval
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Online Payment - Remita */
                <div className="space-y-4">
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Pay with Remita</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      You will be redirected to Remita secure payment gateway
                    </p>
                    <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Amount to pay</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(selectedFee.amount)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleOnlinePayment}
                    disabled={processing}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="w-5 h-5" />
                        Proceed to Remita
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Payment Submitted!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your payment has been submitted for approval. You will receive a notification once it's confirmed.
            </p>
            <button
              onClick={() => {
                setShowSuccess(false);
                navigate('/student/payments');
              }}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all"
            >
              View Payment Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPayment;
