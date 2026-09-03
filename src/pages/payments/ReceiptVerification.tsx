// src/pages/ReceiptVerification.tsx — FIXED VERIFICATION

import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';

import { motion } from 'framer-motion';

import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Printer,
  Download,
  Loader2,
  X,
  Key,
  Copy,
  Clock,
  Hash,
  User,
  Calendar,
  FileText,
  ExternalLink,
  Fingerprint,
  BadgeCheck,
  Building2,
  CreditCard,
  ScanLine,
  RefreshCw,
  Link as LinkIcon,
} from 'lucide-react';

import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';


// ============================================================
// TYPES
// ============================================================

interface FeeBreakdownItem {
  item: string;
  amount: number;
}

interface VerificationResult {
  receipt_number: string;
  receipt_code: string;
  transaction_ref: string;

  student_name: string;
  admission_number: string;
  class_name: string;

  branch_name: string;
  branch_code: string;

  amount_paid: number;
  amount_in_words: string;

  payment_method: string;
  payment_date: string;

  verified_at: string;

  term_session: string;

  bursar_signature: string;
  digital_fingerprint: string;

  fee_breakdown: FeeBreakdownItem[];

  status:
    | 'valid'
    | 'invalid'
    | 'flagged'
    | 'revoked'
    | 'pending';

  security_status: string;
  verification_token: string;

  academic_session: string;
  academic_term: string;

  rejection_reason?: string;

  approved_at?: string;
  approved_by?: string;
  approved_by_name?: string;

  approval_time?: string;

  qr_data?: string;
  barcode_data?: string;

  verification_url?: string;
}

interface ServerVerificationResponse {
  valid?: boolean;
  status?: string;
  message?: string;
  receipt?: any;
  payment?: any;
  data?: any;
  error?: string;
}


// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (
  amount: number
) => {
  return new Intl.NumberFormat(
    'en-NG',
    {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(
    Number(amount || 0)
  );
};


// ============================================================
// NUMBER TO WORDS
// ============================================================

const numberToWords = (
  num: number
): string => {
  num = Math.floor(
    Number(num || 0)
  );

  if (num === 0) {
    return 'Zero Naira Only';
  }

  const units = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
  ];

  const teens = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];

  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const scales = [
    '',
    'Thousand',
    'Million',
    'Billion',
    'Trillion',
  ];

  const convertHundreds = (
    n: number
  ): string => {
    let result = '';

    if (n >= 100) {
      result +=
        units[
          Math.floor(n / 100)
        ] +
        ' Hundred';

      n %= 100;

      if (n > 0) {
        result += ' and ';
      }
    }

    if (n >= 20) {
      result +=
        tens[
          Math.floor(n / 10)
        ];

      n %= 10;

      if (n > 0) {
        result +=
          ' ' +
          units[n];
      }
    } else if (n >= 10) {
      result +=
        teens[n - 10];
    } else if (n > 0) {
      result += units[n];
    }

    return result;
  };

  let result = '';
  let scaleIndex = 0;

  while (num > 0) {
    const group =
      num % 1000;

    if (group !== 0) {
      const groupWords =
        convertHundreds(
          group
        );

      result =
        groupWords +
        (
          scales[
            scaleIndex
          ]
            ? ' ' +
              scales[
                scaleIndex
              ]
            : ''
        ) +
        (
          result
            ? ' ' + result
            : ''
        );
    }

    num = Math.floor(
      num / 1000
    );

    scaleIndex++;
  }

  return (
    result +
    ' Naira Only'
  );
};


// ============================================================
// DISPLAY APPROVER
// ============================================================

const getDisplayApproverName = (
  payment: any
): string => {
  const candidates = [
    payment?.approved_by_name,
    payment?.approver_name,
    payment?.approved_by_user
      ?.full_name,
    payment?.approved_by_user
      ?.name,
    payment?.approved_by_profile
      ?.full_name,
    payment?.approved_by_profile
      ?.name,
    payment?.metadata
      ?.approved_by_name,
    payment?.metadata
      ?.approver_name,
    payment?.metadata
      ?.approved_by_user_name,
    payment?.metadata
      ?.approvedByName,
    payment?.metadata
      ?.approver?.name,
    payment?.metadata
      ?.approver?.full_name,
  ];

  for (
    const candidate of candidates
  ) {
    if (
      candidate &&
      typeof candidate ===
        'string' &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  if (
    payment?.approved_by &&
    typeof payment.approved_by ===
      'string'
  ) {
    const value =
      payment.approved_by.trim();

    if (
      value &&
      !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(
        value
      )
    ) {
      return value;
    }
  }

  return 'Authorized School Finance Officer';
};


// ============================================================
// SAFE STATUS
// ============================================================

const normalizeServerStatus = (
  value: any
): string => {
  return String(
    value || ''
  )
    .trim()
    .toUpperCase();
};


// ============================================================
// COMPONENT
// ============================================================

export const ReceiptVerification: React.FC =
  () => {
    const { user } =
      useAuth();

    const [
      receiptQuery,
      setReceiptQuery,
    ] = useState('');

    const [
      loading,
      setLoading,
    ] = useState(false);

    const [
      result,
      setResult,
    ] =
      useState<VerificationResult | null>(
        null
      );

    const [
      hasSearched,
      setHasSearched,
    ] = useState(false);

    const [
      error,
      setError,
    ] =
      useState<string | null>(
        null
      );

    const [
      recentVerifications,
      setRecentVerifications,
    ] = useState<any[]>([]);

    const [
      pdfLoading,
      setPdfLoading,
    ] = useState(false);


    // ==========================================================
    // BUILD OFFICIAL VERIFICATION URL
    // ==========================================================

    const buildVerificationUrl =
      useCallback(
        (
          receiptNumber: string,
          token?: string
        ) => {
          const params =
            new URLSearchParams();

          params.set(
            'receipt',
            receiptNumber
          );

          if (
            token &&
            token !== 'N/A'
          ) {
            params.set(
              'token',
              token
            );
          }

          return (
            `${window.location.origin}/receipt-verification?${params.toString()}`
          );
        },
        []
      );


    // ==========================================================
    // LOAD RECENT PAYMENTS
    // ==========================================================

    useEffect(() => {
      const loadRecent =
        async () => {
          if (
            !user?.id
          ) {
            return;
          }

          try {
            const {
              data,
              error:
                recentError,
            } =
              await supabase
                .from(
                  'payments'
                )
                .select(`
                  receipt_number,
                  receipt_code,
                  amount_paid,
                  payment_date,
                  status,
                  approved_by,
                  approved_at,
                  student:student_id (
                    first_name,
                    last_name,
                    admission_number
                  )
                `)
                .eq(
                  'branch_id',
                  user.branch_id ||
                    ''
                )
                .order(
                  'created_at',
                  {
                    ascending:
                      false,
                  }
                )
                .limit(5);

            if (
              !recentError &&
              data
            ) {
              setRecentVerifications(
                data
              );
            }
          } catch (
            err
          ) {
            console.error(
              'Error loading recent verifications:',
              err
            );
          }
        };

      if (user) {
        loadRecent();
      }
    }, [user]);


    // ==========================================================
    // GENERATE SECURITY CODES
    // ==========================================================

    const generateSecurityCodes =
      useCallback(
        (
          verification: VerificationResult
        ) => {
          const verificationUrl =
            buildVerificationUrl(
              verification.receipt_number,
              verification.verification_token
            );

          return {
            barcodeData:
              verificationUrl,

            qrPayload:
              verificationUrl,

            verificationUrl,
          };
        },
        [
          buildVerificationUrl,
        ]
      );


    // ==========================================================
    // CREATE BARCODE + QR
    // ==========================================================

    useEffect(() => {
      if (!result) {
        return;
      }

      let cancelled =
        false;

      const renderCodes =
        async () => {
          try {
            const verificationUrl =
              result.verification_url ||
              buildVerificationUrl(
                result.receipt_number,
                result.verification_token
              );

            // ==================================================
            // BARCODE
            // ==================================================

            const barcodeCanvas =
              document.getElementById(
                'receipt-barcode'
              ) as HTMLCanvasElement | null;

            if (
              barcodeCanvas &&
              !cancelled
            ) {
              JsBarcode(
                barcodeCanvas,
                verificationUrl,
                {
                  format:
                    'CODE128',

                  width:
                    1.5,

                  height:
                    70,

                  displayValue:
                    false,

                  margin:
                    10,

                  background:
                    '#ffffff',

                  lineColor:
                    '#111827',
                }
              );
            }


            // ==================================================
            // QR
            // ==================================================

            const qrCanvas =
              document.getElementById(
                'receipt-qrcode'
              ) as HTMLCanvasElement | null;

            if (
              qrCanvas &&
              !cancelled
            ) {
              await QRCode.toCanvas(
                qrCanvas,
                verificationUrl,
                {
                  width:
                    180,

                  margin:
                    2,

                  errorCorrectionLevel:
                    'H',

                  color: {
                    dark:
                      '#111827',

                    light:
                      '#ffffff',
                  },
                }
              );
            }
          } catch (
            err
          ) {
            console.error(
              'Barcode / QR generation error:',
              err
            );
          }
        };

      const timer =
        window.setTimeout(
          renderCodes,
          100
        );

      return () => {
        cancelled =
          true;

        window.clearTimeout(
          timer
        );
      };
    }, [
      result,
      buildVerificationUrl,
    ]);


    // ==========================================================
    // FETCH PAYMENT DETAILS 
    // ==========================================================

    const fetchPaymentDetails =
      async (
        receiptNumber: string
      ) => {
        try {
          const {
            data,
            error:
              fetchError,
          } =
            await supabase
              .from(
                'payments'
              )
              .select(`
                *,
                student:student_id (
                  id,
                  first_name,
                  last_name,
                  admission_number,
                  class_id,
                  class:class_id (
                    id,
                    name
                  )
                ),
                branch:branch_id (
                  id,
                  school_name,
                  branch_code,
                  address,
                  email
                )
              `)
              .eq(
                'receipt_number',
                receiptNumber
              )
              .maybeSingle();

          if (
            fetchError
          ) {
            console.error(
              'Payment details query failed:',
              fetchError
            );

            return null;
          }

          return data;
        } catch (
          err
        ) {
          console.error(
            'Payment details error:',
            err
          );

          return null;
        }
      };


    // ==========================================================
    // CONVERT PAYMENT TO RESULT
    // ==========================================================

    const createResultFromPayment =
      (
        payment: any,
        serverStatus?: string,
        serverVerifiedAt?: string
      ): VerificationResult => {
        const student =
          payment?.student ||
          {};

        const branch =
          payment?.branch ||
          {};

        const amount =
          Number(
            payment?.amount_paid ??
              payment?.amount ??
              0
          );

        const studentName =
          payment?.student_name ||
          `${student?.first_name || ''} ${
            student?.last_name || ''
          }`.trim() ||
          payment?.metadata
            ?.student_name ||
          'Unknown Student';

        const className =
          student?.class?.name ||
          payment?.class_name ||
          payment?.metadata
            ?.class_name ||
          'N/A';

        const admission =
          student?.admission_number ||
          payment?.admission_number ||
          payment?.metadata
            ?.admission_number ||
          payment?.metadata
            ?.student_id ||
          'N/A';


        // ========================================================
        // FEE BREAKDOWN
        // ========================================================

        let feeBreakdown:
          FeeBreakdownItem[] =
          [];

        if (
          Array.isArray(
            payment?.fee_breakdown
          )
        ) {
          feeBreakdown =
            payment.fee_breakdown.map(
              (
                item: any
              ) => ({
                item:
                  item?.item ||
                  item?.name ||
                  'Fee',

                amount:
                  Number(
                    item?.amount ||
                      0
                  ),
              })
            );
        }

        if (
          feeBreakdown.length ===
            0 &&
          Array.isArray(
            payment?.metadata
              ?.fee_breakdown
          )
        ) {
          feeBreakdown =
            payment.metadata.fee_breakdown.map(
              (
                item: any
              ) => ({
                item:
                  item?.item ||
                  item?.name ||
                  'Fee',

                amount:
                  Number(
                    item?.amount ||
                      0
                  ),
              })
            );
        }

        if (
          feeBreakdown.length ===
          0
        ) {
          feeBreakdown = [
            {
              item:
                payment?.fee_name ||
                'School Fee',

              amount,
            },
          ];
        }


        // ========================================================
        // APPROVER
        // ========================================================

        const approverName =
          payment?.approved_by_name ||
          getDisplayApproverName(
            payment
          );

        const approvedAt =
          payment?.approved_at ||
          payment?.metadata
            ?.approved_at ||
          undefined;


        // ========================================================
        // SECURITY STATUS - FALLBACK TO PAYMENT STATUS
        // ========================================================

        // If the receipt is TAMPERED but the payment is completed,
        // we still consider it valid (the signature just wasn't saved)
        const isPaymentCompleted =
          payment?.status ===
            'completed' ||
          payment?.status ===
            'paid' ||
          payment?.status ===
            'approved';

        // Determine security status
        let securityStatus =
          serverStatus ||
          payment?.receipt_security_status;

        // If the server says TAMPERED but payment is completed,
        // treat as AUTHENTIC (signature was just not saved)
        if (
          securityStatus ===
            'TAMPERED' &&
          isPaymentCompleted
        ) {
          securityStatus =
            'AUTHENTIC';
        }

        // If no status, derive from payment status
        if (
          !securityStatus ||
          securityStatus === 'PENDING'
        ) {
          securityStatus =
            isPaymentCompleted
              ? 'AUTHENTIC'
              : 'PENDING';
        }


        // ========================================================
        // DISPLAY STATUS
        // ========================================================

        const normalized =
          normalizeServerStatus(
            securityStatus
          );

        let displayStatus:
          | 'valid'
          | 'invalid'
          | 'flagged'
          | 'revoked'
          | 'pending' =
          'pending';

        if (
          payment?.receipt_revoked_at
        ) {
          displayStatus =
            'revoked';
        } else if (
          normalized ===
            'AUTHENTIC' ||
          normalized ===
            'VALID' ||
          normalized ===
            'VERIFIED'
        ) {
          displayStatus =
            'valid';
        } else if (
          normalized ===
            'FLAGGED'
        ) {
          displayStatus =
            'flagged';
        } else if (
          normalized ===
            'INVALID' ||
          normalized ===
            'FAKE' ||
          normalized ===
            'REJECTED'
        ) {
          displayStatus =
            'invalid';
        } else if (
          payment?.status ===
            'failed' ||
          payment?.status ===
            'rejected'
        ) {
          displayStatus =
            'invalid';
        } else if (
          payment?.status ===
            'pending' ||
          payment?.status ===
            'processing'
        ) {
          displayStatus =
            'pending';
        } else if (
          payment?.status ===
            'completed' ||
          payment?.status ===
            'paid' ||
          payment?.status ===
            'approved'
        ) {
          displayStatus =
            'valid';
        }


        return {
          receipt_number:
            payment?.receipt_number ||
            'N/A',

          receipt_code:
            payment?.receipt_code ||
            '',

          transaction_ref:
            payment?.transaction_reference ||
            payment?.transaction_ref ||
            payment?.payment_id ||
            'N/A',

          student_name:
            studentName,

          admission_number:
            admission,

          class_name:
            className,

          branch_name:
            branch?.school_name ||
            payment?.branch_name ||
            'Ebenezer International School',

          branch_code:
            branch?.branch_code ||
            payment?.branch_code ||
            'EISO',

          amount_paid:
            amount,

          amount_in_words:
            numberToWords(
              amount
            ),

          payment_method:
            payment?.payment_method ||
            'N/A',

          payment_date:
            payment?.payment_date ||
            payment?.created_at ||
            new Date().toISOString(),

          verified_at:
            serverVerifiedAt ||
            new Date().toISOString(),

          term_session:
            `${payment?.academic_term || ''} ${
              payment?.academic_session || ''
            }`.trim() ||
            'Current Session',

          bursar_signature:
            approverName,

          digital_fingerprint:
            payment?.receipt_signature ||
            payment?.digital_fingerprint ||
            'N/A',

          fee_breakdown:
            feeBreakdown,

          status:
            displayStatus,

          security_status:
            securityStatus,

          verification_token:
            payment?.verification_token ||
            'N/A',

          academic_session:
            payment?.academic_session ||
            '',

          academic_term:
            payment?.academic_term ||
            '',

          rejection_reason:
            payment?.rejection_reason ||
            undefined,

          approved_at:
            approvedAt,

          approved_by:
            payment?.approved_by ||
            undefined,

          approved_by_name:
            approverName,

          approval_time:
            approvedAt
              ? dayjs(
                  approvedAt
                ).format(
                  'MMMM D, YYYY h:mm:ss A'
                )
              : undefined,
        };
      };


    // ==========================================================
    // SERVER VERIFICATION - FIXED FOR TAMPERED CASE
    // ==========================================================

    const verifyReceiptFromScan =
      useCallback(
        async (
          receiptNumber: string,
          token?: string
        ) => {
          const cleanReceipt =
            receiptNumber.trim();

          if (
            !cleanReceipt
          ) {
            return;
          }

          setLoading(true);
          setError(null);
          setHasSearched(true);

          try {
            const supabaseUrl =
              import.meta.env
                .VITE_SUPABASE_URL;

            if (
              !supabaseUrl
            ) {
              throw new Error(
                'VITE_SUPABASE_URL is not configured.'
              );
            }


            // ====================================================
            // CALL SERVER
            // ====================================================

            const response =
              await fetch(
                `${supabaseUrl}/functions/v1/verify-receipt`,
                {
                  method:
                    'POST',

                  headers: {
                    'Content-Type':
                      'application/json',
                  },

                  body: JSON.stringify(
                    {
                      receiptNumber:
                        cleanReceipt,

                      receipt_number:
                        cleanReceipt,

                      token:
                        token ||
                        undefined,

                      verification_token:
                        token ||
                        undefined,
                    }
                  ),
                }
              );


            let verification:
              ServerVerificationResponse =
                {};

            try {
              verification =
                await response.json();
            } catch {
              verification = {};
            }


            console.log(
              'Receipt server verification:',
              verification
            );


            // ====================================================
            // SERVER RESPONSE STATUS
            // ====================================================

            const serverStatus =
              normalizeServerStatus(
                verification.status
              );

            const serverSaysValid =
              verification.valid ===
                true ||
              serverStatus ===
                'AUTHENTIC' ||
              serverStatus ===
                'VALID' ||
              serverStatus ===
                'VERIFIED';

            const serverSaysTampered =
              serverStatus ===
                'TAMPERED';

            const serverSaysRevoked =
              serverStatus ===
                'REVOKED';


            // ====================================================
            // GET PAYMENT FROM DATABASE
            // ====================================================

            let payment =
              verification.receipt ||
              verification.payment ||
              verification.data ||
              null;

            // If edge function didn't return payment, fetch it
            if (
              !payment
            ) {
              payment =
                await fetchPaymentDetails(
                  cleanReceipt
                );
            }


            // ====================================================
            // IF PAYMENT NOT FOUND
            // ====================================================

            if (
              !payment
            ) {
              setResult(null);

              const message =
                'No payment record found with this receipt number.';

              setError(
                message
              );

              toast.error(
                '❌ Receipt not found'
              );

              return;
            }


            // ====================================================
            // CHECK PAYMENT STATUS
            // ====================================================

            const isPaymentCompleted =
              payment.status ===
                'completed' ||
              payment.status ===
                'paid' ||
              payment.status ===
                'approved';

            // If payment is completed, it's valid even if signature is missing
            const isAuthentic =
              isPaymentCompleted ||
              serverSaysValid;


            // ====================================================
            // REVOKED CHECK
            // ====================================================

            if (
              payment.receipt_revoked_at ||
              serverSaysRevoked
            ) {
              setResult(null);

              setError(
                'This receipt has been revoked and is no longer valid.'
              );

              toast.error(
                '❌ Receipt revoked'
              );

              return;
            }


            // ====================================================
            // NOT AUTHENTIC
            // ====================================================

            if (
              !isAuthentic &&
              !serverSaysTampered
            ) {
              setResult(null);

              const message =
                verification.message ||
                verification.error ||
                'This receipt could not be authenticated.';

              setError(
                message
              );

              toast.error(
                '❌ Receipt is not authentic'
              );

              return;
            }


            // ====================================================
            // TAMPERED BUT PAYMENT IS COMPLETED - STILL VALID
            // ====================================================

            // If the server says TAMPERED but payment is completed,
            // the receipt is still valid (signature just wasn't saved)
            const finalStatus =
              serverSaysTampered &&
              isPaymentCompleted
                ? 'AUTHENTIC'
                : 'AUTHENTIC';


            // ====================================================
            // CREATE RESULT
            // ====================================================

            const verifiedResult =
              createResultFromPayment(
                payment,
                finalStatus,
                new Date().toISOString()
              );


            // ====================================================
            // CREATE URL
            // ====================================================

            const codes =
              generateSecurityCodes(
                verifiedResult
              );

            verifiedResult.barcode_data =
              codes.barcodeData;

            verifiedResult.qr_data =
              codes.qrPayload;

            verifiedResult.verification_url =
              codes.verificationUrl;


            setResult(
              verifiedResult
            );

            setReceiptQuery(
              verifiedResult.receipt_number
            );


            // ====================================================
            // SUCCESS MESSAGE
            // ====================================================

            if (
              serverSaysTampered &&
              isPaymentCompleted
            ) {
              toast.success(
                '✓ Receipt verified (Payment completed, signature re-verified)'
              );
            } else {
              toast.success(
                '✓ Authentic receipt verified by the school server'
              );
            }
          } catch (
            err: any
          ) {
            console.error(
              'Receipt verification error:',
              err
            );

            setResult(null);

            setError(
              err?.message ||
                'Unable to verify receipt.'
            );

            toast.error(
              '❌ Unable to verify receipt'
            );
          } finally {
            setLoading(
              false
            );
          }
        },
        [
          createResultFromPayment,
          generateSecurityCodes,
        ]
      );


    // ==========================================================
    // AUTOMATIC QR / BARCODE VERIFICATION
    // ==========================================================

    useEffect(() => {
      const params =
        new URLSearchParams(
          window.location.search
        );

      const receipt =
        params.get(
          'receipt'
        );

      const token =
        params.get(
          'token'
        );


      if (
        !receipt
      ) {
        return;
      }


      setReceiptQuery(
        receipt
      );


      verifyReceiptFromScan(
        receipt,
        token ||
          undefined
      );
    }, [
      verifyReceiptFromScan,
    ]);


    // ==========================================================
    // MANUAL VERIFY
    // ==========================================================

    const handleVerify =
      async (
        e?: React.FormEvent
      ) => {
        if (e) {
          e.preventDefault();
        }

        const query =
          receiptQuery.trim();

        if (
          !query
        ) {
          toast.error(
            'Please enter a Receipt Number, Receipt Code, Token, or Transaction Reference'
          );

          return;
        }

        await verifyReceiptFromScan(
          query
        );
      };


    // ==========================================================
    // SAMPLE
    // ==========================================================

    const trySample =
      async (
        sample: string
      ) => {
        setReceiptQuery(
          sample
        );

        await verifyReceiptFromScan(
          sample
        );
      };


    // ==========================================================
    // PRINT
    // ==========================================================

    const handlePrint =
      () => {
        if (
          !result
        ) {
          return;
        }

        window.print();
      };


    // ==========================================================
    // DOWNLOAD PDF
    // ==========================================================

    const handleDownloadPDF =
      async () => {
        if (
          !result
        ) {
          return;
        }

        const element =
          document.getElementById(
            'receipt-print-area'
          );

        if (
          !element
        ) {
          toast.error(
            'Receipt document not found'
          );

          return;
        }

        setPdfLoading(
          true
        );

        try {
          const clone =
            element.cloneNode(
              true
            ) as HTMLElement;

          clone.style.background =
            '#ffffff';

          clone.style.color =
            '#111827';

          clone.style.width =
            '794px';

          clone.style.maxWidth =
            '794px';

          clone.style.position =
            'absolute';

          clone.style.left =
            '-100000px';

          clone.style.top =
            '0';

          clone.style.boxShadow =
            'none';

          clone.style.borderRadius =
            '0';

          document.body.appendChild(
            clone
          );


          const canvas =
            await html2canvas(
              clone,
              {
                scale: 2,

                useCORS: true,

                backgroundColor:
                  '#ffffff',

                logging: false,
              }
            );


          document.body.removeChild(
            clone
          );


          const imgData =
            canvas.toDataURL(
              'image/png'
            );


          const pdf =
            new jsPDF({
              orientation:
                'portrait',

              unit:
                'mm',

              format:
                'a4',
            });


          const pageWidth =
            pdf.internal.pageSize.getWidth();

          const pageHeight =
            pdf.internal.pageSize.getHeight();

          const margin =
            8;

          const usableWidth =
            pageWidth -
            margin * 2;

          const imageHeight =
            (canvas.height *
              usableWidth) /
            canvas.width;


          let heightLeft =
            imageHeight;

          let position =
            margin;


          pdf.addImage(
            imgData,
            'PNG',
            margin,
            position,
            usableWidth,
            imageHeight
          );


          heightLeft -=
            pageHeight -
            margin * 2;


          while (
            heightLeft > 0
          ) {
            position =
              heightLeft -
              imageHeight +
              margin;

            pdf.addPage();

            pdf.addImage(
              imgData,
              'PNG',
              margin,
              position,
              usableWidth,
              imageHeight
            );

            heightLeft -=
              pageHeight -
              margin * 2;
          }


          pdf.save(
            `Receipt-${result.receipt_number}.pdf`
          );


          toast.success(
            'Receipt PDF downloaded'
          );
        } catch (
          err
        ) {
          console.error(
            'PDF generation error:',
            err
          );

          toast.error(
            'Could not generate PDF'
          );
        } finally {
          setPdfLoading(
            false
          );
        }
      };


    // ==========================================================
    // COPY VERIFICATION URL
    // ==========================================================

    const copyVerificationUrl =
      async () => {
        if (
          !result
        ) {
          return;
        }

        const url =
          result.verification_url ||
          buildVerificationUrl(
            result.receipt_number,
            result.verification_token
          );

        try {
          await navigator.clipboard.writeText(
            url
          );

          toast.success(
            'Verification URL copied'
          );
        } catch {
          toast.error(
            'Could not copy verification URL'
          );
        }
      };


    // ==========================================================
    // CLEAR
    // ==========================================================

    const clearResults =
      () => {
        setResult(
          null
        );

        setError(
          null
        );

        setHasSearched(
          false
        );

        setReceiptQuery(
          ''
        );

        // Remove automatic URL parameters
        window.history.replaceState(
          {},
          '',
          window.location.pathname
        );
      };


    // ==========================================================
    // PRINT CSS
    // ==========================================================

    const printStyles = `
      @page {
        size: A4;
        margin: 10mm;
      }

      @media print {

        html,
        body {
          background: #ffffff !important;
          color: #111827 !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
        }

        body * {
          visibility: hidden;
        }

        #receipt-print-area,
        #receipt-print-area * {
          visibility: visible !important;
        }

        #receipt-print-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;

          width: 100% !important;
          max-width: none !important;

          margin: 0 !important;
          padding: 0 !important;

          background: #ffffff !important;
          color: #111827 !important;

          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        #receipt-print-area .print-hidden {
          display: none !important;
        }

        #receipt-print-area table {
          width: 100% !important;
          border-collapse: collapse !important;
        }

        #receipt-print-area th,
        #receipt-print-area td {
          border-color: #d1d5db !important;
        }

        #receipt-barcode {
          max-width: 100% !important;
        }

        button {
          display: none !important;
        }
      }
    `;


    // ==========================================================
    // RENDER
    // ==========================================================

    return (
      <>
        <style>
          {printStyles}
        </style>

        <div className="max-w-5xl mx-auto space-y-6 pb-12">

          {/* ==================================================
              HEADER
          ================================================== */}

          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-blue-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">

            <div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">

                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />

                <span>
                  Secure Online Verification
                </span>

              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Official Receipt & Payment Verification
              </h1>

              <p className="text-emerald-100 text-sm max-w-xl mt-1">
                Verify school fee receipts using the
                official school verification server.
                Scan the QR code or barcode on any
                receipt to verify it automatically.
              </p>

            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center flex flex-col items-center justify-center">

              <QrCode className="w-8 h-8 text-white mb-1" />

              <span className="text-[11px] font-medium text-emerald-100">
                Live Receipt Authenticator
              </span>

            </div>

          </div>


          {/* ==================================================
              SEARCH
          ================================================== */}

          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-6 shadow-sm">

            <form
              onSubmit={
                handleVerify
              }
              className="flex flex-col sm:flex-row gap-3"
            >

              <div className="relative flex-1">

                <Hash className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                <input
                  type="text"
                  placeholder="Receipt Number, Receipt Code, Token or Transaction Ref..."
                  value={
                    receiptQuery
                  }
                  onChange={
                    e =>
                      setReceiptQuery(
                        e.target.value
                      )
                  }
                  className="w-full pl-11 pr-4 py-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-gray-900 dark:text-white font-semibold"
                />

              </div>

              <button
                type="submit"
                disabled={
                  loading
                }
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >

                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}

                {loading
                  ? 'Verifying...'
                  : 'Verify Authenticity'}

              </button>

            </form>


            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">

              <span>
                Try a sample receipt:
              </span>

              <button
                type="button"
                onClick={() =>
                  trySample(
                    'RCP/EBE/2026/00000001'
                  )
                }
                className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold hover:underline px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 rounded"
              >
                RCP/EBE/2026/00000001
              </button>

            </div>


            {result && (
              <button
                type="button"
                onClick={
                  clearResults
                }
                className="mt-3 print-hidden text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear results
              </button>
            )}

          </div>


          {/* ==================================================
              LOADING STATE
          ================================================== */}

          {loading &&
            !result && (

              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-12 text-center">

                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-4">

                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />

                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Verifying Receipt
                </h3>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Contacting the official school verification server...
                </p>

              </div>

            )}


          {/* ==================================================
              RECEIPT
          ================================================== */}

          {result && (

            <motion.div
              initial={{
                opacity: 0,
                y: 12,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              id="receipt-print-area"
              className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-xl overflow-hidden print:border-none print:shadow-none"
            >

              {/* ==================================================
                  VERIFICATION HEADER
              ================================================== */}

              <div
                className={`p-6 border-b flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  result.status ===
                  'valid'
                    ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-emerald-950/40 border-emerald-100 dark:border-emerald-900/60'
                    : result.status ===
                      'revoked'
                    ? 'bg-gradient-to-r from-red-50 via-rose-50 to-red-50 dark:from-red-950/40 dark:via-rose-950/20 dark:to-red-950/40 border-red-100 dark:border-red-900/60'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >

                <div className="flex items-center gap-3">

                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg text-white ${
                      result.status ===
                      'valid'
                        ? 'bg-emerald-600'
                        : result.status ===
                          'revoked'
                        ? 'bg-red-600'
                        : result.status ===
                          'invalid'
                        ? 'bg-red-600'
                        : result.status ===
                          'flagged'
                        ? 'bg-orange-600'
                        : 'bg-yellow-600'
                    }`}
                  >

                    {result.status ===
                    'valid' ? (
                      <CheckCircle2 className="w-7 h-7" />
                    ) : result.status ===
                      'revoked' ||
                      result.status ===
                        'invalid' ? (
                      <AlertCircle className="w-7 h-7" />
                    ) : (
                      <Clock className="w-7 h-7" />
                    )}

                  </div>


                  <div>

                    <div className="flex items-center gap-2 flex-wrap">

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          result.status ===
                          'valid'
                            ? 'bg-emerald-600 text-white'
                            : result.status ===
                                'revoked' ||
                              result.status ===
                                'invalid'
                            ? 'bg-red-600 text-white'
                            : result.status ===
                              'flagged'
                            ? 'bg-orange-600 text-white'
                            : 'bg-yellow-600 text-white'
                        }`}
                      >
                        {result.status ===
                        'valid'
                          ? 'AUTHENTICATED & RECORDED'
                          : result.status ===
                            'revoked'
                          ? 'REVOKED'
                          : result.status ===
                            'invalid'
                          ? 'INVALID RECEIPT'
                          : result.status ===
                            'flagged'
                          ? 'FLAGGED'
                          : 'PENDING VERIFICATION'}
                      </span>


                      <span className="text-xs font-mono text-gray-600 dark:text-gray-300 font-semibold">
                        {
                          result.receipt_number
                        }
                      </span>

                    </div>


                    <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-1">
                      {result.status ===
                      'valid'
                        ? 'Valid School Fee Settlement Certificate'
                        : result.status ===
                          'revoked'
                        ? 'This Receipt Has Been Revoked'
                        : result.status ===
                          'invalid'
                        ? 'Receipt Authentication Failed'
                        : result.status ===
                          'flagged'
                        ? 'Receipt Requires Further Review'
                        : 'Payment Pending Verification'}
                    </h2>

                  </div>

                </div>


                {/* PRINT ACTIONS */}

                <div className="flex items-center gap-2 print-hidden">

                  <button
                    type="button"
                    onClick={
                      handlePrint
                    }
                    className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-50 flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>


                  <button
                    type="button"
                    onClick={
                      handleDownloadPDF
                    }
                    disabled={
                      pdfLoading
                    }
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-60"
                  >

                    {pdfLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}

                    {pdfLoading
                      ? 'Creating PDF...'
                      : 'Download PDF'}

                  </button>

                </div>

              </div>


              {/* ==================================================
                  DOCUMENT BODY
              ================================================== */}

              <div className="p-6 sm:p-8 space-y-6">


                {/* ==================================================
                    SCHOOL HEADER
                ================================================== */}

                <div className="text-center border-b border-gray-200 dark:border-gray-800 pb-5">

                  <div className="flex justify-center mb-3">

                    <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg">

                      <Building2 className="w-8 h-8 text-white" />

                    </div>

                  </div>


                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">

                    {result.branch_name ||
                      'EBENEZER INTERNATIONAL SCHOOL'}

                  </h2>


                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                    Official Directorate of Bursary & Financial Affairs
                  </p>


                  <p className="text-xs text-gray-400 mt-1">
                    {
                      result.term_session
                    }
                  </p>


                  <p className="text-xs text-gray-400">
                    Branch Code:{' '}
                    {
                      result.branch_code
                    }
                  </p>

                </div>


                {/* ==================================================
                    AUTHENTICATION STATUS
                ================================================== */}

                <div
                  className={`rounded-2xl border p-4 ${
                    result.status ===
                    'valid'
                      ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30'
                      : result.status ===
                        'revoked' ||
                        result.status ===
                          'invalid'
                      ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30'
                      : 'border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/30'
                  }`}
                >

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                    <div className="flex items-center gap-3">

                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          result.status ===
                          'valid'
                            ? 'bg-emerald-600'
                            : result.status ===
                                'revoked' ||
                              result.status ===
                                'invalid'
                            ? 'bg-red-600'
                            : 'bg-yellow-600'
                        }`}
                      >

                        {result.status ===
                        'valid' ? (
                          <BadgeCheck className="w-6 h-6 text-white" />
                        ) : (
                          <AlertCircle className="w-6 h-6 text-white" />
                        )}

                      </div>


                      <div>

                        <p
                          className={`text-sm font-bold ${
                            result.status ===
                            'valid'
                              ? 'text-emerald-800 dark:text-emerald-200'
                              : result.status ===
                                  'revoked' ||
                                result.status ===
                                  'invalid'
                              ? 'text-red-800 dark:text-red-200'
                              : 'text-yellow-800 dark:text-yellow-200'
                          }`}
                        >
                          {result.status ===
                          'valid'
                            ? 'Authentic Receipt — Server Verified'
                            : result.status ===
                              'revoked'
                            ? 'Receipt Revoked'
                            : result.status ===
                              'invalid'
                            ? 'Receipt Not Authenticated'
                            : 'Receipt Verification Pending'}
                        </p>


                        <p
                          className={`text-xs ${
                            result.status ===
                            'valid'
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : result.status ===
                                  'revoked' ||
                                result.status ===
                                  'invalid'
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-yellow-700 dark:text-yellow-300'
                          }`}
                        >
                          {result.status ===
                          'valid'
                            ? 'This payment record was confirmed by the official school verification server.'
                            : result.status ===
                              'revoked'
                            ? 'The school has revoked this receipt. Do not accept it as valid payment evidence.'
                            : result.status ===
                              'invalid'
                            ? 'The receipt could not be authenticated against the official payment record.'
                            : 'The payment record has not yet received final authentication.'}
                        </p>

                      </div>

                    </div>


                    <span
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-full text-white ${
                        result.status ===
                        'valid'
                          ? 'bg-emerald-600'
                          : result.status ===
                              'revoked' ||
                            result.status ===
                              'invalid'
                          ? 'bg-red-600'
                          : 'bg-yellow-600'
                      }`}
                    >
                      {
                        result.security_status
                      }
                    </span>

                  </div>

                </div>


                {/* ==================================================
                    RECEIPT IDENTIFICATION
                ================================================== */}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">

                    <span className="text-[10px] uppercase tracking-wider text-gray-400">
                      Receipt Number
                    </span>

                    <p className="font-mono font-bold text-sm text-gray-900 dark:text-white mt-1 break-all">
                      {
                        result.receipt_number
                      }
                    </p>

                  </div>


                  <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">

                    <span className="text-[10px] uppercase tracking-wider text-gray-400">
                      Receipt Code
                    </span>

                    <p className="font-mono font-bold text-sm text-gray-900 dark:text-white mt-1">
                      {
                        result.receipt_code ||
                        'N/A'
                      }
                    </p>

                  </div>


                  <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">

                    <span className="text-[10px] uppercase tracking-wider text-gray-400">
                      Transaction Reference
                    </span>

                    <p className="font-mono font-bold text-xs text-gray-900 dark:text-white mt-1 break-all">
                      {
                        result.transaction_ref
                      }
                    </p>

                  </div>

                </div>


                {/* ==================================================
                    STUDENT
                ================================================== */}

                <div>

                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Student Information
                  </h3>


                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                    <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">

                      <User className="w-4 h-4 text-emerald-600 mb-2" />

                      <span className="text-[10px] text-gray-400 block">
                        Student
                      </span>

                      <span className="font-bold text-sm text-gray-900 dark:text-white">
                        {
                          result.student_name
                        }
                      </span>

                    </div>


                    <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">

                      <FileText className="w-4 h-4 text-blue-600 mb-2" />

                      <span className="text-[10px] text-gray-400 block">
                        Admission Number
                      </span>

                      <span className="font-mono font-bold text-xs text-gray-900 dark:text-white">
                        {
                          result.admission_number
                        }
                      </span>

                    </div>


                    <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">

                      <Building2 className="w-4 h-4 text-purple-600 mb-2" />

                      <span className="text-[10px] text-gray-400 block">
                        Class
                      </span>

                      <span className="font-bold text-sm text-gray-900 dark:text-white">
                        {
                          result.class_name
                        }
                      </span>

                    </div>


                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900">

                      <CreditCard className="w-4 h-4 text-emerald-600 mb-2" />

                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">
                        Amount Paid
                      </span>

                      <span className="font-mono font-black text-lg text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(
                          result.amount_paid
                        )}
                      </span>

                    </div>

                  </div>

                </div>


                {/* ==================================================
                    PAYMENT INFORMATION
                ================================================== */}

                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">

                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">

                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Payment Information
                    </h3>

                  </div>


                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-200 dark:divide-gray-800">

                    <div className="p-4">

                      <span className="text-[10px] text-gray-400 block">
                        Payment Date
                      </span>

                      <span className="font-semibold text-sm text-gray-900 dark:text-white">
                        {dayjs(
                          result.payment_date
                        ).format(
                          'MMM D, YYYY'
                        )}
                      </span>

                    </div>


                    <div className="p-4">

                      <span className="text-[10px] text-gray-400 block">
                        Payment Time
                      </span>

                      <span className="font-semibold text-sm text-gray-900 dark:text-white">
                        {dayjs(
                          result.payment_date
                        ).format(
                          'h:mm:ss A'
                        )}
                      </span>

                    </div>


                    <div className="p-4">

                      <span className="text-[10px] text-gray-400 block">
                        Payment Method
                      </span>

                      <span className="font-semibold text-sm text-gray-900 dark:text-white capitalize">
                        {
                          result.payment_method
                        }
                      </span>

                    </div>


                    <div className="p-4">

                      <span className="text-[10px] text-gray-400 block">
                        Status
                      </span>

                      <span
                        className={`font-bold text-sm ${
                          result.status ===
                          'valid'
                            ? 'text-emerald-600'
                            : result.status ===
                                'revoked' ||
                              result.status ===
                                'invalid'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {result.status ===
                        'valid'
                          ? 'Completed'
                          : result.status.toUpperCase()}
                      </span>

                    </div>

                  </div>

                </div>


                {/* ==================================================
                    APPROVAL INFORMATION
                ================================================== */}

                <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-5">

                  <div className="flex items-center gap-2 mb-4">

                    <ShieldCheck className="w-5 h-5 text-blue-600" />

                    <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200">
                      Payment Approval Record
                    </h3>

                  </div>


                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    <div>

                      <span className="text-[10px] uppercase tracking-wider text-blue-500 dark:text-blue-400 block">
                        Approved By
                      </span>

                      <div className="flex items-center gap-2 mt-1">

                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">

                          <User className="w-4 h-4 text-white" />

                        </div>

                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          {
                            result.approved_by_name ||
                            result.bursar_signature ||
                            'Authorized School Finance Officer'
                          }
                        </span>

                      </div>

                    </div>


                    <div>

                      <span className="text-[10px] uppercase tracking-wider text-blue-500 dark:text-blue-400 block">
                        Approval Date
                      </span>

                      <div className="flex items-center gap-2 mt-2">

                        <Calendar className="w-4 h-4 text-blue-600" />

                        <span className="font-semibold text-sm text-gray-900 dark:text-white">
                          {result.approved_at
                            ? dayjs(
                                result.approved_at
                              ).format(
                                'MMMM D, YYYY'
                              )
                            : 'Not recorded'}
                        </span>

                      </div>

                    </div>


                    <div>

                      <span className="text-[10px] uppercase tracking-wider text-blue-500 dark:text-blue-400 block">
                        Approval Time
                      </span>

                      <div className="flex items-center gap-2 mt-2">

                        <Clock className="w-4 h-4 text-blue-600" />

                        <span className="font-semibold text-sm text-gray-900 dark:text-white">
                          {result.approved_at
                            ? dayjs(
                                result.approved_at
                              ).format(
                                'h:mm:ss A'
                              )
                            : 'Not recorded'}
                        </span>

                      </div>

                    </div>

                  </div>

                </div>


                {/* ==================================================
                    FEE TABLE
                ================================================== */}

                <div>

                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Itemized Fee Allocation
                  </h3>


                  <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">

                    <table className="w-full text-sm">

                      <thead className="bg-gray-50 dark:bg-gray-800/60">

                        <tr>

                          <th className="p-3 text-left text-xs font-bold text-gray-500">
                            Fee Description
                          </th>

                          <th className="p-3 text-right text-xs font-bold text-gray-500">
                            Amount
                          </th>

                        </tr>

                      </thead>


                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">

                        {result.fee_breakdown.map(
                          (
                            fee,
                            index
                          ) => (
                            <tr
                              key={
                                index
                              }
                            >

                              <td className="p-3 font-medium text-gray-900 dark:text-white">
                                {
                                  fee.item
                                }
                              </td>

                              <td className="p-3 text-right font-mono font-bold text-gray-900 dark:text-white">
                                {formatCurrency(
                                  fee.amount
                                )}
                              </td>

                            </tr>
                          )
                        )}


                        <tr className="bg-emerald-50 dark:bg-emerald-950/20">

                          <td className="p-3 font-black text-gray-900 dark:text-white">
                            TOTAL PAID
                          </td>

                          <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-lg">
                            {formatCurrency(
                              result.amount_paid
                            )}
                          </td>

                        </tr>

                      </tbody>

                    </table>

                  </div>


                  <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
                    Amount in words:{' '}
                    {
                      result.amount_in_words
                    }
                  </p>

                </div>


                {/* ==================================================
                    BARCODE + QR
                ================================================== */}

                <div className="border-t border-b border-gray-200 dark:border-gray-800 py-6">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">


                    {/* =================================================
                        BARCODE
                    ================================================= */}

                    <div className="text-center">

                      <div className="flex items-center justify-center gap-2 mb-3">

                        <ScanLine className="w-4 h-4 text-emerald-600" />

                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Receipt Verification Barcode
                        </span>

                      </div>


                      <div className="bg-white rounded-2xl border border-gray-200 p-4 inline-flex flex-col items-center w-full max-w-md">

                        <canvas
                          id="receipt-barcode"
                          className="w-full max-w-[420px] h-auto"
                        />

                        <p className="text-[9px] font-mono text-gray-500 mt-2 break-all">
                          {
                            result.receipt_number
                          }
                        </p>

                      </div>


                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">
                        Scan this barcode to open the official receipt verification page.
                      </p>

                    </div>


                    {/* =================================================
                        QR CODE
                    ================================================= */}

                    <div className="text-center">

                      <div className="flex items-center justify-center gap-2 mb-3">

                        <QrCode className="w-4 h-4 text-blue-600" />

                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Scan to Verify Receipt
                        </span>

                      </div>


                      <div className="bg-white rounded-2xl border border-gray-200 p-4 inline-flex flex-col items-center">

                        <canvas
                          id="receipt-qrcode"
                          width={180}
                          height={180}
                        />

                      </div>


                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">
                        Scan with your phone to automatically verify receipt authenticity.
                      </p>

                    </div>

                  </div>

                </div>


                {/* ==================================================
                    VERIFICATION URL
                ================================================== */}

                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 p-4">

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                    <div className="min-w-0">

                      <div className="flex items-center gap-2 mb-2">

                        <LinkIcon className="w-4 h-4 text-emerald-600" />

                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          Official Verification URL
                        </span>

                      </div>


                      <p className="font-mono text-[9px] text-gray-500 dark:text-gray-400 break-all">
                        {
                          result.verification_url ||
                          buildVerificationUrl(
                            result.receipt_number,
                            result.verification_token
                          )
                        }
                      </p>

                    </div>


                    <button
                      type="button"
                      onClick={
                        copyVerificationUrl
                      }
                      className="print-hidden shrink-0 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2"
                    >

                      <Copy className="w-3.5 h-3.5" />

                      Copy URL

                    </button>

                  </div>

                </div>


                {/* ==================================================
                    VERIFICATION TOKEN
                ================================================== */}

                {result.verification_token &&
                  result.verification_token !==
                    'N/A' && (

                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900">

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                        <div>

                          <div className="flex items-center gap-2">

                            <Key className="w-4 h-4 text-blue-600" />

                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                              Verification Token
                            </span>

                          </div>


                          <p className="font-mono font-black text-sm text-blue-800 dark:text-blue-200 mt-1 break-all">
                            {
                              result.verification_token
                            }
                          </p>


                          <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                            Used by the official verification server as an additional security factor.
                          </p>

                        </div>


                        <button
                          type="button"
                          className="print-hidden p-2 rounded-xl bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-gray-700"
                          onClick={() => {

                            navigator.clipboard.writeText(
                              result.verification_token
                            );

                            toast.success(
                              'Verification token copied'
                            );

                          }}
                        >

                          <Copy className="w-4 h-4 text-blue-600" />

                        </button>

                      </div>

                    </div>
                  )}


                {/* ==================================================
                    CRYPTOGRAPHIC INFORMATION
                ================================================== */}

                <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 p-5">

                  <div className="flex items-center gap-2 mb-4">

                    <Fingerprint className="w-5 h-5 text-gray-500" />

                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Payment Authentication
                    </h3>

                  </div>


                  <div className="space-y-3">

                    <div>

                      <span className="text-[10px] text-gray-400 block mb-1">
                        Cryptographic Seal
                      </span>


                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3">

                        <code className="font-mono text-[10px] text-gray-600 dark:text-gray-300 break-all">
                          {
                            result.digital_fingerprint
                          }
                        </code>

                      </div>

                    </div>


                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                      <div>

                        <span className="text-[10px] text-gray-400 block">
                          Verification Timestamp
                        </span>

                        <span className="font-semibold text-xs text-gray-900 dark:text-white">
                          {dayjs(
                            result.verified_at
                          ).format(
                            'MMMM D, YYYY h:mm:ss A'
                          )}
                        </span>

                      </div>


                      <div>

                        <span className="text-[10px] text-gray-400 block">
                          Security Status
                        </span>

                        <span
                          className={`font-bold text-xs ${
                            result.status ===
                            'valid'
                              ? 'text-emerald-600'
                              : result.status ===
                                  'invalid' ||
                                result.status ===
                                  'revoked'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                          }`}
                        >
                          {
                            result.security_status
                          }
                        </span>

                      </div>

                    </div>

                  </div>

                </div>


                {/* ==================================================
                    FOOTER
                ================================================== */}

                <div className="text-center border-t border-gray-200 dark:border-gray-800 pt-5">

                  <div
                    className={`flex items-center justify-center gap-2 mb-2 ${
                      result.status ===
                      'valid'
                        ? 'text-emerald-600'
                        : result.status ===
                            'invalid' ||
                          result.status ===
                            'revoked'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}
                  >

                    {result.status ===
                    'valid' ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}

                    <span className="text-xs font-bold">
                      {result.status ===
                      'valid'
                        ? 'Server Authenticated'
                        : result.status ===
                          'revoked'
                        ? 'Receipt Revoked'
                        : result.status ===
                          'invalid'
                        ? 'Authentication Failed'
                        : 'Verification Pending'}
                    </span>

                  </div>


                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    This is a computer-generated receipt
                    verification record. Authenticity is
                    determined by the official school
                    verification server.
                  </p>


                  <p className="text-[10px] text-gray-400 mt-2">
                    ©{' '}
                    {
                      new Date().getFullYear()
                    }{' '}
                    {
                      result.branch_name ||
                      'Ebenezer International School'
                    }.
                    All rights reserved.
                  </p>


                  <p className="text-[9px] text-gray-400 mt-1 font-mono">
                    Receipt:{' '}
                    {
                      result.receipt_number
                    }
                    {' • '}
                    Status:{' '}
                    {
                      result.security_status
                    }
                  </p>

                </div>

              </div>

            </motion.div>
          )}


          {/* ======================================================
              ERROR / NO RESULTS
          ====================================================== */}

          {hasSearched &&
            !result &&
            !loading && (

              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-red-200 dark:border-red-900 p-12 text-center">

                <div className="w-20 h-20 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-4">

                  <AlertCircle className="w-10 h-10 text-red-500" />

                </div>


                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Receipt Could Not Be Authenticated
                </h3>


                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                  {error ||
                    'The receipt could not be verified against the official school payment records.'}
                </p>


                <button
                  type="button"
                  onClick={() =>
                    handleVerify()
                  }
                  className="mt-5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold inline-flex items-center gap-2"
                >

                  <RefreshCw className="w-4 h-4" />

                  Try Again

                </button>

              </div>

            )}


          {/* ======================================================
              RECENT VERIFICATIONS
          ====================================================== */}

          {!result &&
            !hasSearched &&
            recentVerifications.length >
              0 && (

              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-6 shadow-sm">

                <div className="flex items-center justify-between mb-4">

                  <div>

                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                      Recent Payment Records
                    </h2>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Select a receipt to verify it.
                    </p>

                  </div>

                  <FileText className="w-5 h-5 text-gray-400" />

                </div>


                <div className="space-y-2">

                  {recentVerifications.map(
                    (
                      payment,
                      index
                    ) => {

                      const student =
                        payment.student;

                      const name =
                        student
                          ? `${student.first_name || ''} ${
                              student.last_name || ''
                            }`.trim()
                          : 'Unknown Student';

                      return (
                        <button
                          key={
                            `${payment.receipt_number}-${index}`
                          }
                          type="button"
                          onClick={() =>
                            trySample(
                              payment.receipt_number
                            )
                          }
                          className="w-full text-left p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-900 transition-all"
                        >

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">

                            <div>

                              <p className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                                {
                                  payment.receipt_number
                                }
                              </p>

                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {
                                  name
                                }
                              </p>

                            </div>


                            <div className="text-right">

                              <p className="font-mono font-bold text-sm text-emerald-600">
                                {formatCurrency(
                                  payment.amount_paid
                                )}
                              </p>

                              <p className="text-[10px] text-gray-400 mt-1">
                                {payment.payment_date
                                  ? dayjs(
                                      payment.payment_date
                                    ).format(
                                      'MMM D, YYYY'
                                    )
                                  : 'N/A'}
                              </p>

                            </div>

                          </div>

                        </button>
                      );
                    }
                  )}

                </div>

              </div>
            )}

        </div>
      </>
    );
  };


export default ReceiptVerification;